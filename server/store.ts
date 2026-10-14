import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { initialGuildState } from "../src/guild/rules.ts";
import {
  parseGuildCommand,
  validateGuildState,
} from "../src/guild/validation.ts";
import { GuildError } from "../src/guild/types.ts";
import { upgradeWorld, upgradeGuildReceipt, validateWorld } from "../src/empire/migration.ts";
import { guildView, applyWorldGuildCommand } from "../src/empire/world.ts";
import { projectEmpire } from "../src/empire/rules.ts";
import { parseEmpireCommand, validateEmpire } from "../src/empire/validation.ts";
import { applyPersonalCommand } from "./empire-commands.ts";
import type { WorldState, EmpireCommand, EmpireSnapshot, EmpireReply } from "../src/empire/types.ts";
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
  constructor(path: string, options: { now?: number } = {}) {
    const now = options.now ?? Date.now();
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    try {
      this.db.exec(
        "PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS world (id INTEGER PRIMARY KEY CHECK(id=1), snapshot TEXT NOT NULL); CREATE TABLE IF NOT EXISTS receipts (pilot_id TEXT NOT NULL, command_id TEXT NOT NULL, request TEXT NOT NULL, response TEXT NOT NULL, PRIMARY KEY(pilot_id,command_id)); CREATE TABLE IF NOT EXISTS empire_receipts (pilot_id TEXT NOT NULL, command_id TEXT NOT NULL, request TEXT NOT NULL, response TEXT NOT NULL, PRIMARY KEY(pilot_id,command_id));",
      );
      this.db.exec("BEGIN IMMEDIATE");
      try {
        if (!this.db.prepare("SELECT id FROM world WHERE id=1").get()) {
          if (
            Number(
              this.db.prepare("SELECT ((SELECT count(*) FROM receipts)+(SELECT count(*) FROM empire_receipts)) AS count").get()!
                .count,
            ) !== 0
          )
            throw Error("Missing shared state with existing receipts");
          this.db
            .prepare("INSERT INTO world(id,snapshot) VALUES(1,?)")
            .run(JSON.stringify(upgradeWorld(initialGuildState(now),now)));
        }
        const raw = JSON.parse(
          String(
            this.db.prepare("SELECT snapshot FROM world WHERE id=1").get()!
              .snapshot,
          ),
        );
        if (raw.schemaVersion !== 3) {
          const migrated = upgradeWorld(raw, now);
          this.db
            .prepare("UPDATE world SET snapshot=? WHERE id=1")
            .run(JSON.stringify(migrated));
          for (const row of this.db
            .prepare("SELECT pilot_id,command_id,response FROM receipts")
            .all()) {
            const reply = JSON.parse(String(row.response));
            if (
              reply.receipt?.pilotId !== row.pilot_id ||
              reply.receipt?.commandId !== row.command_id ||
              reply.receipt?.revision !== reply.state?.revision ||
              typeof reply.duplicate !== "boolean"
            )
              throw Error("Invalid legacy receipt");
            const migratedReply = upgradeGuildReceipt(reply, now);
            this.db
              .prepare(
                "UPDATE receipts SET response=? WHERE pilot_id=? AND command_id=?",
              )
              .run(JSON.stringify(migratedReply), row.pilot_id, row.command_id);
          }
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
    return guildView(this.worldSnapshot());
  }
  worldSnapshot(): WorldState {
    const row = this.db.prepare("SELECT snapshot FROM world WHERE id=1").get();
    if (!row) throw new Error("Missing shared state");
    return validateWorld(JSON.parse(String(row.snapshot)));
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
      const state = applyWorldGuildCommand(this.worldSnapshot(), pilotId, command, now);
      validateWorld(state);
      const result: GuildReply = {
        state: guildView(state),
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
  empireSnapshot(pilotId: string,now: number): EmpireSnapshot {
    const actor=this.worldSnapshot().pilots.find(p=>p.id===pilotId);
    if(!actor) throw new GuildError(403,"PILOT_UNKNOWN","알 수 없는 참가자입니다.");
    return {state:projectEmpire(actor.empire,now),serverTime:now};
  }
  executeEmpire(pilotId: string,input: EmpireCommand,now: number): EmpireReply {
    const command=parseEmpireCommand(input),fingerprint=canonical(command);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const previous=this.db.prepare("SELECT request,response FROM empire_receipts WHERE pilot_id=? AND command_id=?").get(pilotId,command.commandId);
      if(previous) {
        if(previous.request!==fingerprint) throw new GuildError(409,"COMMAND_REUSED","같은 명령 ID에 다른 내용을 사용할 수 없습니다.");
        const result=JSON.parse(String(previous.response)) as EmpireReply;
        validateEmpire(result.state);
        if(result.receipt?.pilotId!==pilotId||result.receipt?.commandId!==command.commandId||result.receipt?.revision!==result.state.revision||typeof result.duplicate!=="boolean"||!Number.isSafeInteger(result.serverTime)) throw Error("Invalid empire receipt");
        this.db.exec("COMMIT");return {...result,duplicate:true};
      }
      const world=applyPersonalCommand(this.worldSnapshot(),pilotId,command,now);
      validateWorld(world);
      const state=world.pilots.find(p=>p.id===pilotId)!.empire;
      const result:EmpireReply={state,serverTime:now,receipt:{commandId:command.commandId,pilotId,revision:state.revision},duplicate:false};
      this.db.prepare("UPDATE world SET snapshot=? WHERE id=1").run(JSON.stringify(world));
      this.db.prepare("INSERT INTO empire_receipts(pilot_id,command_id,request,response) VALUES(?,?,?,?)").run(pilotId,command.commandId,fingerprint,JSON.stringify(result));
      this.db.exec("COMMIT");return result;
    } catch(error) {this.db.exec("ROLLBACK");throw error;}
  }
  close() {
    this.db.close();
  }
}
