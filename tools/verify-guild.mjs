import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { createServer } from "vite";
import { startGuildServer } from "../server/main.ts";
import { GUILD_ROLES, PILOTS } from "../src/guild/content.ts";
import { ROSTER } from "../src/game/content.ts";

const dir = await mkdtemp(join(tmpdir(), "delta-nova-guild-"));
let api, vite;
try {
  api = await startGuildServer({ port: 0, path: join(dir, "shared.sqlite") });
  vite = await createServer({
    server: {
      host: "127.0.0.1",
      port: 0,
      open: false,
      proxy: { "/api": { target: api.url, changeOrigin: true } },
    },
  });
  await vite.listen();
  const url = `http://127.0.0.1:${vite.httpServer.address().port}`;
  assert.match(await (await fetch(url)).text(), /<title>DELTA NOVA/);
  async function request(path, body, token) {
    const response = await fetch(url + path, {
      method: body ? "POST" : "GET",
      headers: {
        Origin: "http://127.0.0.1:5173",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    assert.equal(response.status, 200, JSON.stringify(data));
    return data;
  }
  const sessions = await Promise.all(
    PILOTS.map((p) => request("/api/dev/session", { pilotId: p.id })),
  );
  let { state } = await request("/api/guild");
  let lastCommand, lastResult;
  for (const [i, role] of GUILD_ROLES.entries()) {
    for (const action of [
      { type: "claim", role: role.id },
      { type: "contribute", role: role.id, fleetIds: role.recommended },
    ]) {
      const command = {
        commandId: randomUUID(),
        expectedRevision: state.revision,
        operationId: state.operation.id,
        action,
      };
      const result = await request(
        "/api/guild/commands",
        command,
        sessions[i].token,
      );
      state = result.state;
      lastCommand = command;
      lastResult = result;
    }
  }
  assert.equal(state.operation.phase, "complete");
  assert.equal(state.revision, 8);
  assert.deepEqual(
    state.pilots.map((p) => p.merit),
    [30, 30, 30, 30],
  );
  assert.equal(
    Object.keys(state.operation.slots.breach.report.effects).length,
    3,
  );
  assert.ok(state.operation.slots.breach.report.supplyHealed > 0);
  const duplicate = await request(
    "/api/guild/commands",
    lastCommand,
    sessions[3].token,
  );
  assert.equal(duplicate.duplicate, true);
  assert.deepEqual(duplicate.state, lastResult.state);
  const observed = await request("/api/guild");
  assert.deepEqual(observed.state, state);
  async function soloCommand(action) {
    const result = await request(
      "/api/guild/commands",
      {
        commandId: randomUUID(),
        expectedRevision: state.revision,
        operationId: state.operation.id,
        action,
      },
      sessions[0].token,
    );
    state = result.state;
  }
  await soloCommand({ type: "next-operation" });
  await soloCommand({
    type: "repair-fleet",
    fleetIds: ROSTER.map((r) => r.id),
  });
  for (const role of GUILD_ROLES) {
    await soloCommand({ type: "claim", role: role.id });
    await soloCommand({
      type: "contribute",
      role: role.id,
      fleetIds: role.recommended,
    });
    assert.equal(state.operation.slots[role.id].completed, true);
    await soloCommand({ type: "repair-fleet", fleetIds: role.recommended });
  }
  assert.equal(state.operation.phase, "complete");
  assert.deepEqual(state.operation.awards, [{ pilotId: "nova", amount: 20 }]);
  assert.equal(state.pilots[0].merit, 90);
  console.log(
    "Guild/base HTTP/proxy smoke PASS: four-player completion, combined support, duplicate receipt unchanged; one pilot then completes all four roles with supplies and repairs, earns 60 merit and one shared award.",
  );
} finally {
  if (vite) await vite.close();
  if (api) await api.close();
  const target = resolve(dir),
    root = resolve(tmpdir()) + sep;
  if (
    !target.startsWith(root) ||
    !target.slice(root.length).startsWith("delta-nova-guild-")
  )
    throw Error("Unsafe temporary directory");
  await rm(target, { recursive: true, force: true });
}
