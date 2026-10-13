import { describe, it, expect } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GuildStore } from "../server/store.ts";
import { createGuildServer } from "../server/http.ts";
import { initialGuildState } from "../src/guild/rules.ts";
import { upgradeGuildState } from "../src/guild/migration.ts";
import type { GuildAction } from "../src/guild/types.ts";
function legacy() {
  const s = initialGuildState();
  return {
    ...s,
    schemaVersion: 1,
    rulesVersion: "guild-v1",
    pilots: s.pilots.map(({ base, ...p }) => p),
  };
}
function seed(path: string, invalid = false) {
  const state = legacy();
  state.revision = 1;
  state.operation.slots.recon.ownerId = "nova";
  state.operation.slots.recon.leaseUntil = 301000;
  const request = {
    commandId: "old",
    expectedRevision: 0,
    operationId: 1,
    action: { role: "recon", type: "claim" },
  };
  const canonical = (v: unknown): string =>
    v && typeof v === "object"
      ? Array.isArray(v)
        ? "[" + v.map(canonical).join(",") + "]"
        : "{" +
          Object.entries(v)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => JSON.stringify(k) + ":" + canonical(v))
            .join(",") +
          "}"
      : JSON.stringify(v);
  const db = new DatabaseSync(path);
  db.exec(
    "CREATE TABLE world(id INTEGER PRIMARY KEY,snapshot TEXT);CREATE TABLE receipts(pilot_id TEXT,command_id TEXT,request TEXT,response TEXT,PRIMARY KEY(pilot_id,command_id));",
  );
  db.prepare("INSERT INTO world VALUES(1,?)").run(JSON.stringify(state));
  db.prepare("INSERT INTO receipts VALUES(?,?,?,?)").run(
    "nova",
    "old",
    canonical(request),
    JSON.stringify({
      state: invalid ? { ...state, rulesVersion: "broken" } : state,
      receipt: { pilotId: "nova", commandId: "old", revision: 1 },
      duplicate: false,
    }),
  );
  db.close();
  return request;
}
describe("base server migration and persistence", () => {
  it("migrates valid legacy state and receipt once without changing ownership or awarding the old command again", () => {
    const dir = mkdtempSync(join(tmpdir(), "nova-base-")),
      path = join(dir, "world.sqlite");
    const command = seed(path);
    try {
      let store = new GuildStore(path, { now: 1000 });
      expect(store.snapshot().operation.slots.recon.ownerId).toBe("nova");
      expect(store.snapshot().pilots[0].base.lastProducedAt).toBe(1000);
      expect(store.execute("nova", command as never, 1000).duplicate).toBe(
        true,
      );
      store.close();
      store = new GuildStore(path, { now: 999000 });
      expect(store.snapshot().pilots[0].base.resources.alloy).toBe(120);
      expect(store.snapshot().pilots[0].base.lastProducedAt).toBe(1000);
      store.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it.each(["trigger", "corrupt"])(
    "rolls back the world and receipts when migration fails: %s",
    (kind) => {
      const dir = mkdtempSync(join(tmpdir(), "nova-base-")),
        path = join(dir, "world.sqlite");
      seed(path, kind === "corrupt");
      const db = new DatabaseSync(path);
      if (kind === "trigger")
        db.exec(
          "CREATE TRIGGER block_receipt BEFORE UPDATE ON receipts BEGIN SELECT RAISE(ABORT,'blocked'); END;",
        );
      const before = String(
          db.prepare("SELECT snapshot FROM world").get()!.snapshot,
        ),
        receipt = String(
          db.prepare("SELECT response FROM receipts").get()!.response,
        );
      db.close();
      try {
        expect(() => new GuildStore(path, { now: 1000 })).toThrow();
        const check = new DatabaseSync(path);
        expect(
          check.prepare("SELECT snapshot FROM world").get()!.snapshot,
        ).toBe(before);
        expect(
          check.prepare("SELECT response FROM receipts").get()!.response,
        ).toBe(receipt);
        check.close();
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  );
  it("rejects an invalid legacy world before adding any base", () => {
    const s = legacy();
    s.pilots[0].merit = -1;
    expect(() => upgradeGuildState(s, 1000)).toThrow();
  });
  it("runs a personal career over HTTP, settles once and retains resources, repairs and research on restart", async () => {
    const dir = mkdtempSync(join(tmpdir(), "nova-base-")),
      path = join(dir, "world.sqlite");
    let store = new GuildStore(path, { now: 1000 });
    const server = createGuildServer(store, { clock: () => 1000 });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    try {
      const session = await (
        await fetch(url + "/api/dev/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pilotId: "nova" }),
        })
      ).json();
      let state = store.snapshot();
      async function send(action: GuildAction) {
        const command = {
          commandId: `id-${state.revision}`,
          expectedRevision: state.revision,
          operationId: state.operation.id,
          action,
        };
        const res = await fetch(url + "/api/guild/commands", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify(command),
        });
        const reply = await res.json();
        expect(res.status).toBe(200);
        state = reply.state;
        return command;
      }
      const fleetIds = [
        "striker-01",
        "striker-02",
        "guardian-01",
        "salvage-01",
      ];
      const start = await send({
        type: "career-action",
        action: {
          type: "launch",
          missionId: "salvage",
          fleetIds,
          support: "jam",
          approach: "direct",
        },
      });
      const end = await send({
        type: "career-action",
        action: { type: "return" },
      });
      const settled = store.snapshot();
      expect(store.execute("nova", start, 1000).duplicate).toBe(true);
      expect(store.execute("nova", end, 1000).duplicate).toBe(true);
      expect(store.snapshot()).toEqual(settled);
      await send({ type: "repair-fleet", fleetIds });
      await send({ type: "career-action", action: { type: "dismiss" } });
      await send({
        type: "career-action",
        action: { type: "unlock-module", module: "cargo" },
      });
      await new Promise<void>((r) => server.close(() => r()));
      store.close();
      store = new GuildStore(path, { now: 9000 });
      expect(store.snapshot()).toEqual(state);
      expect(state.pilots[0].base.career.profile.active).toBe("cargo");
    } finally {
      if (server.listening)
        await new Promise<void>((r) => server.close(() => r()));
      store.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
