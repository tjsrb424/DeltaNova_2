import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { initialGuildState, applyGuildCommand } from "../src/guild/rules.ts";
import {
  parseGuildCommand,
  validateGuildState,
} from "../src/guild/validation.ts";
import { GuildError } from "../src/guild/types.ts";
import type {
  GuildCommand,
  GuildReply,
  GuildState,
} from "../src/guild/types.ts";
function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ":" + canonical(v))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
export class GuildStore {
  private db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    try {
      this.db.exec(
        "PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS world (id INTEGER PRIMARY KEY CHECK(id=1), snapshot TEXT NOT NULL); CREATE TABLE IF NOT EXISTS receipts (pilot_id TEXT NOT NULL, command_id TEXT NOT NULL, request TEXT NOT NULL, response TEXT NOT NULL, PRIMARY KEY(pilot_id,command_id));",
      );
      this.db.exec("BEGIN IMMEDIATE");
      try {
        if (!this.db.prepare("SELECT id FROM world WHERE id=1").get()) {
          if (
            Number(
              this.db.prepare("SELECT count(*) AS count FROM receipts").get()!
                .count,
            ) !== 0
          )
            throw Error("Missing shared state with existing receipts");
          this.db
            .prepare("INSERT INTO world(id,snapshot) VALUES(1,?)")
            .run(JSON.stringify(initialGuildState()));
        }
        this.snapshot();
        this.db.exec("COMMIT");
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      }
    } catch (error) {
      this.db.close();
      throw error;
    }
  }
  snapshot(): GuildState {
    const row = this.db.prepare("SELECT snapshot FROM world WHERE id=1").get();
    if (!row) throw new Error("Missing shared state");
    return validateGuildState(JSON.parse(String(row.snapshot)));
  }
  execute(pilotId: string, input: GuildCommand, now: number): GuildReply {
    const command = parseGuildCommand(input),
      fingerprint = canonical(command);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const previous = this.db
        .prepare(
          "SELECT request,response FROM receipts WHERE pilot_id=? AND command_id=?",
        )
        .get(pilotId, command.commandId);
      if (previous) {
        if (previous.request !== fingerprint)
          throw new GuildError(
            409,
            "COMMAND_REUSED",
            "같은 명령 ID에 다른 내용을 사용할 수 없습니다.",
          );
        const result = JSON.parse(String(previous.response)) as GuildReply;
        validateGuildState(result.state);
        this.db.exec("COMMIT");
        return { ...result, duplicate: true };
      }
      const state = applyGuildCommand(this.snapshot(), pilotId, command, now);
      validateGuildState(state);
      const result: GuildReply = {
        state,
        receipt: {
          commandId: command.commandId,
          pilotId,
          revision: state.revision,
        },
        duplicate: false,
      };
      this.db
        .prepare("UPDATE world SET snapshot=? WHERE id=1")
        .run(JSON.stringify(state));
      this.db
        .prepare(
          "INSERT INTO receipts(pilot_id,command_id,request,response) VALUES(?,?,?,?)",
        )
        .run(pilotId, command.commandId, fingerprint, JSON.stringify(result));
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  close() {
    this.db.close();
  }
}
