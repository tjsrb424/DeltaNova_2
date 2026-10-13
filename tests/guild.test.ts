import { describe, expect, it } from "vitest";
import { initialGuildState, applyGuildCommand } from "../src/guild/rules.ts";
import {
  parseGuildCommand,
  validateGuildState,
} from "../src/guild/validation.ts";
import type { GuildAction, GuildState } from "../src/guild/types.ts";
const fleets = {
  recon: ["scout-01", "striker-01", "guardian-01"],
  jam: ["jammer-01", "siege-01", "striker-01"],
  supply: ["salvage-01", "guardian-01", "striker-01", "striker-02"],
  breach: ["striker-01", "striker-02", "siege-01", "guardian-01", "support-01"],
};
const run = (s: GuildState, pilotId: string, action: GuildAction, now = 1000) =>
  applyGuildCommand(
    s,
    pilotId,
    {
      commandId: `cmd-${s.revision}`,
      expectedRevision: s.revision,
      operationId: s.operation.id,
      action,
    },
    now,
  );
function prepared() {
  let s = initialGuildState();
  for (const [role, pilot] of [
    ["recon", "lyra"],
    ["jam", "orion"],
    ["supply", "vega"],
  ] as const) {
    s = run(s, pilot, { type: "claim", role });
    s = run(s, pilot, { type: "contribute", role, fleetIds: fleets[role] });
  }
  return s;
}
describe("shared guild rules", () => {
  it("enforces one role per pilot and one owner per role without mutating inputs", () => {
    const start = initialGuildState();
    const s = run(start, "nova", { type: "claim", role: "recon" });
    expect(start.operation.slots.recon.ownerId).toBeNull();
    expect(() => run(s, "lyra", { type: "claim", role: "recon" })).toThrow();
    expect(() => run(s, "nova", { type: "claim", role: "jam" })).toThrow();
    expect(() => run(s, "lyra", { type: "release", role: "recon" })).toThrow();
  });
  it("allows expired leases to be reclaimed but rejects late contributions", () => {
    let s = run(initialGuildState(), "nova", { type: "claim", role: "recon" });
    expect(() =>
      run(
        s,
        "nova",
        { type: "contribute", role: "recon", fleetIds: fleets.recon },
        301001,
      ),
    ).toThrow();
    s = run(s, "lyra", { type: "claim", role: "recon" }, 301001);
    expect(s.operation.slots.recon.ownerId).toBe("lyra");
  });
  it("requires a specialist and actual survival, awarding nothing for a failed sortie", () => {
    let s = run(initialGuildState(), "lyra", { type: "claim", role: "recon" });
    expect(() =>
      run(s, "lyra", {
        type: "contribute",
        role: "recon",
        fleetIds: ["striker-01"],
      }),
    ).toThrow();
    s = run(s, "lyra", {
      type: "contribute",
      role: "recon",
      fleetIds: ["scout-01"],
    });
    expect(s.operation.slots.recon.completed).toBe(false);
    expect(s.pilots.find((p) => p.id === "lyra")!.merit).toBe(0);
  });
  it("completes distinct preparations once and keeps completed ownership beyond expiry", () => {
    const s = prepared();
    expect(s.operation.slots.supply.report!.contribution).toBe(3);
    expect(s.pilots.filter((p) => p.merit === 10)).toHaveLength(3);
    expect(() =>
      run(s, "lyra", {
        type: "contribute",
        role: "recon",
        fleetIds: fleets.recon,
      }),
    ).toThrow();
    expect(() =>
      run(s, "nova", { type: "claim", role: "recon" }, 999999),
    ).toThrow();
  });
  it("freezes all available effects, resolves one battle per stage and pays equal success shares once", () => {
    let s = prepared();
    s = run(s, "nova", { type: "claim", role: "breach" });
    s = run(s, "nova", {
      type: "contribute",
      role: "breach",
      fleetIds: fleets.breach,
    });
    const report = s.operation.slots.breach.report!;
    expect(report.success).toBe(true);
    expect(report.battles).toHaveLength(2);
    expect(report.effects).toEqual({
      recon: "lyra",
      jam: "orion",
      supply: "vega",
    });
    expect(report.battles[0].enemies).toHaveLength(2);
    expect(report.battles[0].events.some((e) => e.type === "jam")).toBe(true);
    expect(report.supplyHealed).toBeGreaterThan(0);
    expect(s.operation.phase).toBe("complete");
    expect(s.pilots.map((p) => p.merit)).toEqual([30, 30, 30, 30]);
    expect(() =>
      run(s, "nova", {
        type: "contribute",
        role: "breach",
        fleetIds: fleets.breach,
      }),
    ).toThrow();
  });
  it("retains other people's contributions when breach fails and releases breach for retry", () => {
    let s = prepared();
    s = run(s, "nova", { type: "claim", role: "breach" });
    s = run(s, "nova", {
      type: "contribute",
      role: "breach",
      fleetIds: ["salvage-01"],
    });
    expect(s.operation.phase).toBe("preparing");
    expect(s.operation.slots.breach.ownerId).toBeNull();
    expect(s.operation.slots.recon.completed).toBe(true);
    expect(s.pilots.find((p) => p.id === "lyra")!.merit).toBe(10);
    expect(
      run(s, "nova", { type: "claim", role: "breach" }).operation.slots.breach
        .ownerId,
    ).toBe("nova");
  });
  it("starts the next operation only after success and retains the ledger", () => {
    expect(() =>
      run(initialGuildState(), "nova", { type: "next-operation" }),
    ).toThrow();
    let s = prepared();
    s = run(s, "nova", { type: "claim", role: "breach" });
    s = run(s, "nova", {
      type: "contribute",
      role: "breach",
      fleetIds: fleets.breach,
    });
    const next = run(s, "lyra", { type: "next-operation" });
    expect(next.operation.id).toBe(2);
    expect(next.pilots).toEqual(s.pilots);
    expect(next.operation.slots.recon.ownerId).toBeNull();
  });
  it("rejects stale revisions, unknown actors and client supplied outcomes", () => {
    const s = initialGuildState();
    expect(() =>
      applyGuildCommand(
        s,
        "nova",
        {
          commandId: "a",
          expectedRevision: 99,
          operationId: 1,
          action: { type: "claim", role: "recon" },
        },
        1000,
      ),
    ).toThrow();
    expect(() => run(s, "unknown", { type: "claim", role: "recon" })).toThrow();
    expect(() =>
      parseGuildCommand({
        commandId: "a",
        expectedRevision: 0,
        operationId: 1,
        action: {
          type: "contribute",
          role: "recon",
          fleetIds: fleets.recon,
          success: true,
        },
      }),
    ).toThrow();
  });
  it("validates nested snapshots and preserves valid reports", () => {
    const s = prepared();
    expect(validateGuildState(JSON.parse(JSON.stringify(s)))).toEqual(s);
    expect(() =>
      validateGuildState({ ...s, rulesVersion: "unknown" }),
    ).toThrow();
    const broken = structuredClone(s);
    broken.operation.slots.recon.report!.battles[0].fleet[0].hp = -1;
    expect(() => validateGuildState(broken)).toThrow();
  });
});
