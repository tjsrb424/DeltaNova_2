import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Server } from "node:http";
import { GuildStore } from "../server/store.ts";
import { createGuildServer } from "../server/http.ts";
import type { GuildAction, GuildCommand } from "../src/guild/types.ts";
const cleanup: (() => Promise<void> | void)[] = [];
afterEach(async () => {
  for (const fn of cleanup.splice(0).reverse()) await fn();
});
async function setup(path = ":memory:") {
  const store = new GuildStore(path);
  cleanup.push(() => store.close());
  const server: Server = createGuildServer(store, {
    allowedOrigins: ["http://127.0.0.1:5173"],
    clock: () => 1000,
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  cleanup.push(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      ),
  );
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  const post = (
    path: string,
    data: unknown,
    token?: string,
    origin = "http://127.0.0.1:5173",
  ) =>
    fetch(base + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
  const session = async (pilotId: string) =>
    (await (await post("/api/dev/session", { pilotId })).json())
      .token as string;
  const send = (token: string, command: GuildCommand) =>
    post("/api/guild/commands", command, token);
  const command = (
    action: GuildAction,
    commandId = "test-command",
  ): GuildCommand => ({
    commandId,
    expectedRevision: store.snapshot().revision,
    operationId: store.snapshot().operation.id,
    action,
  });
  return { store, server, base, post, session, send, command };
}
describe("guild HTTP and persistence", () => {
  it("lets exactly one of two independent sessions claim a contested role", async () => {
    const h = await setup();
    const [a, b] = await Promise.all([h.session("nova"), h.session("lyra")]);
    const c = h.command({ type: "claim", role: "recon" });
    const responses = await Promise.all([h.send(a, c), h.send(b, c)]);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    const read = await (await fetch(h.base + "/api/guild")).json();
    expect(read.state.revision).toBe(1);
    expect(["nova", "lyra"]).toContain(
      read.state.operation.slots.recon.ownerId,
    );
  });
  it("requires server sessions, refuses other owners and client declared results", async () => {
    const h = await setup();
    const a = await h.session("nova"),
      b = await h.session("lyra");
    expect(
      (await h.send("bad", h.command({ type: "claim", role: "recon" }))).status,
    ).toBe(401);
    await h.send(a, h.command({ type: "claim", role: "recon" }));
    expect(
      (await h.send(b, h.command({ type: "release", role: "recon" }))).status,
    ).toBe(403);
    expect(
      (
        await h.post(
          "/api/guild/commands",
          {
            ...h.command({
              type: "contribute",
              role: "recon",
              fleetIds: ["scout-01"],
            }),
            merit: 999,
          },
          a,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await h.post(
          "/api/dev/session",
          { pilotId: "nova" },
          undefined,
          "https://unrelated.example",
        )
      ).status,
    ).toBe(403);
  });
  it("replays duplicate commands before checking revision and rejects changed payloads", async () => {
    const h = await setup(),
      token = await h.session("nova");
    const c = h.command({ type: "claim", role: "recon" });
    const first = await (await h.send(token, c)).json(),
      again = await (await h.send(token, c)).json();
    expect(again.duplicate).toBe(true);
    expect(again.receipt).toEqual(first.receipt);
    expect(h.store.snapshot().revision).toBe(1);
    expect(
      (await h.send(token, { ...c, action: { type: "claim", role: "jam" } }))
        .status,
    ).toBe(409);
  });
  it("persists exactly-once rewards and receipts across restart", async () => {
    const dir = mkdtempSync(join(tmpdir(), "delta-guild-"));
    cleanup.push(() => rmSync(dir, { recursive: true, force: true }));
    const path = join(dir, "test.sqlite");
    let store = new GuildStore(path);
    const make = (action: GuildAction, id: string) => ({
      commandId: id,
      expectedRevision: store.snapshot().revision,
      operationId: 1,
      action,
    });
    store.execute(
      "lyra",
      make({ type: "claim", role: "recon" }, "claim"),
      1000,
    );
    const c = make(
      {
        type: "contribute",
        role: "recon",
        fleetIds: ["scout-01", "striker-01", "guardian-01"],
      },
      "contribute",
    );
    store.execute("lyra", c, 1000);
    store.close();
    store = new GuildStore(path);
    cleanup.push(() => store.close());
    expect(store.execute("lyra", c, 2000).duplicate).toBe(true);
    expect(store.snapshot().pilots.find((p) => p.id === "lyra")!.merit).toBe(
      10,
    );
    expect(store.snapshot().revision).toBe(2);
  });
  it("rolls back both state and receipt when persistent writes fail", () => {
    const dir = mkdtempSync(join(tmpdir(), "delta-guild-"));
    cleanup.push(() => rmSync(dir, { recursive: true, force: true }));
    const path = join(dir, "test.sqlite"),
      store = new GuildStore(path);
    cleanup.push(() => store.close());
    const db = new DatabaseSync(path);
    cleanup.push(() => db.close());
    db.exec(
      "CREATE TRIGGER reject_receipt BEFORE INSERT ON receipts BEGIN SELECT RAISE(ABORT,'disk simulation'); END;",
    );
    const c = {
      commandId: "retry",
      expectedRevision: 0,
      operationId: 1,
      action: { type: "claim" as const, role: "recon" as const },
    };
    expect(() => store.execute("nova", c, 1000)).toThrow();
    expect(store.snapshot().revision).toBe(0);
    db.exec("DROP TRIGGER reject_receipt");
    expect(store.execute("nova", c, 1000).duplicate).toBe(false);
    expect(store.snapshot().revision).toBe(1);
  });
  it("fails on unsupported persisted state without overwriting it", () => {
    const dir = mkdtempSync(join(tmpdir(), "delta-guild-"));
    cleanup.push(() => rmSync(dir, { recursive: true, force: true }));
    const path = join(dir, "test.sqlite"),
      store = new GuildStore(path);
    store.close();
    const db = new DatabaseSync(path);
    cleanup.push(() => db.close());
    const bad = '{"schemaVersion":99}';
    db.prepare("UPDATE world SET snapshot=? WHERE id=1").run(bad);
    expect(() => new GuildStore(path)).toThrow();
    expect(
      db.prepare("SELECT snapshot FROM world WHERE id=1").get()!.snapshot,
    ).toBe(bad);
  });
  it("executes a real two-pilot support and breach workflow with separate equal awards", async () => {
    const h = await setup(),
      support = await h.session("lyra"),
      breach = await h.session("nova");
    for (const [token, action, id] of [
      [support, { type: "claim", role: "jam" }, "s-claim"],
      [
        support,
        {
          type: "contribute",
          role: "jam",
          fleetIds: ["jammer-01", "siege-01", "striker-01"],
        },
        "s-fly",
      ],
      [breach, { type: "claim", role: "breach" }, "b-claim"],
      [
        breach,
        {
          type: "contribute",
          role: "breach",
          fleetIds: [
            "striker-01",
            "striker-02",
            "siege-01",
            "guardian-01",
            "support-01",
          ],
        },
        "b-fly",
      ],
    ] as [string, GuildAction, string][]) {
      expect((await h.send(token, h.command(action, id))).status).toBe(200);
    }
    expect(h.store.snapshot().operation.phase).toBe("complete");
    expect(
      h.store.snapshot().pilots.filter((p) => p.merit === 30),
    ).toHaveLength(2);
  });
});
