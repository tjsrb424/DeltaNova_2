import { describe, it, expect } from "vitest";
import {
  initialBase,
  projectBase,
  applyBaseAction,
  repairCost,
} from "../src/base/rules.ts";
import { initialGuildState, applyGuildCommand } from "../src/guild/rules.ts";
import { GUILD_ROLES } from "../src/guild/content.ts";
import {
  validateGuildState,
  parseGuildCommand,
} from "../src/guild/validation.ts";
import type { GuildState, GuildAction } from "../src/guild/types.ts";
const fleet = ["striker-01", "striker-02", "guardian-01", "salvage-01"];
const launch = {
  type: "career-action",
  action: {
    type: "launch",
    missionId: "salvage",
    fleetIds: fleet,
    support: "jam",
    approach: "direct",
  },
} as const;
const run = (s: GuildState, action: GuildAction, actor = "nova", now = 1000) =>
  applyGuildCommand(
    s,
    actor,
    {
      commandId: `c-${s.revision}`,
      expectedRevision: s.revision,
      operationId: s.operation.id,
      action,
    },
    now,
  );
describe("base economy and independent progress", () => {
  it("preserves old-rate fractions across a near-boundary upgrade", () => {
    const up = applyBaseAction(
      initialBase(0),
      { type: "upgrade-facility", facility: "forge" },
      59999,
    );
    const minute = projectBase(up, 60000);
    expect(minute.resources.alloy).toBe(86);
    expect(projectBase(minute, 120000).resources.alloy).toBe(98);
  });
  it("does not revive partial production discarded by a full warehouse or offline cap", () => {
    const full = initialBase(0);
    full.resources.alloy = 300;
    const up = applyBaseAction(
      full,
      { type: "upgrade-facility", facility: "forge" },
      59999,
    );
    expect(projectBase(up, 60000).resources.alloy).toBe(260);
    const offline = applyBaseAction(
      initialBase(0),
      { type: "upgrade-facility", facility: "forge" },
      9 * 3600000 + 59999,
    );
    expect(projectBase(offline, 9 * 3600000 + 60000).resources.alloy).toBe(260);
  });
  it("accrues complete minutes, preserves fractions and ignores a backward clock", () => {
    const b = initialBase(1000);
    expect(projectBase(b, 60999).resources).toEqual({ alloy: 120, supply: 80 });
    const p = projectBase(b, 91000);
    expect(p.resources).toEqual({ alloy: 126, supply: 84 });
    expect(p.lastProducedAt).toBe(61000);
    expect(projectBase(p, 121000).resources).toEqual({
      alloy: 132,
      supply: 88,
    });
    expect(projectBase(p, 1)).toEqual(p);
    expect(b.resources.alloy).toBe(120);
  });
  it("caps offline production and never banks overflow for an upgrade", () => {
    const b = initialBase(0);
    b.resources = { alloy: 0, supply: 0 };
    const full = projectBase(b, 9 * 3600000);
    expect(full.resources).toEqual({ alloy: 300, supply: 150 });
    const up = applyBaseAction(
      full,
      { type: "upgrade-facility", facility: "forge" },
      9 * 3600000,
    );
    expect(up.resources.alloy).toBe(260);
    expect(up.facilities.forge).toBe(2);
    expect(projectBase(up, 9 * 3600000).resources.alloy).toBe(260);
  });
  it("uses the old production rate before upgrading and refuses excessive levels or overspending", () => {
    const b = initialBase(0),
      up = applyBaseAction(
        b,
        { type: "upgrade-facility", facility: "forge" },
        60000,
      );
    expect(up.resources).toEqual({ alloy: 86, supply: 74 });
    expect(projectBase(up, 120000).resources.alloy).toBe(98);
    const poor = initialBase();
    poor.resources.alloy = 0;
    expect(() =>
      applyBaseAction(poor, { type: "upgrade-facility", facility: "forge" }, 0),
    ).toThrow();
    expect(poor.facilities.forge).toBe(1);
    up.facilities.forge = 3;
    expect(() =>
      applyBaseAction(
        up,
        { type: "upgrade-facility", facility: "forge" },
        60000,
      ),
    ).toThrow();
  });
  it("charges supplies once, keeps ships deployed until return and settles cargo and wear once", () => {
    const b = initialBase(),
      started = applyBaseAction(b, launch as never, 1000);
    expect(started.resources.supply).toBe(70);
    expect(started.career.operation?.phase).toBe("checkpoint");
    expect(() =>
      applyBaseAction(started, { type: "repair-fleet", fleetIds: fleet }, 1000),
    ).toThrow();
    const returned = applyBaseAction(
      started,
      { type: "career-action", action: { type: "return" } },
      1000,
    );
    expect(returned.resources.alloy).toBe(144);
    expect(returned.career.profile.research).toBe(60);
    expect(Object.values(returned.wear).some((n) => n > 0)).toBe(true);
    expect(
      applyBaseAction(
        returned,
        { type: "career-action", action: { type: "return" } },
        1000,
      ),
    ).toEqual(returned);
    const dismissed = applyBaseAction(
      returned,
      { type: "career-action", action: { type: "dismiss" } },
      1000,
    );
    expect(() => applyBaseAction(dismissed, launch as never, 1000)).toThrow();
    const cost = repairCost(dismissed, fleet),
      repaired = applyBaseAction(
        dismissed,
        { type: "repair-fleet", fleetIds: fleet },
        1000,
      );
    expect(repaired.resources.alloy).toBe(144 - cost);
    expect(fleet.every((id) => repaired.wear[id] === 0)).toBe(true);
    expect(
      applyBaseAction(repaired, launch as never, 1000).career.operation,
    ).not.toBeNull();
  });
  it("requires both alloy and personal research, with no guild prerequisite", () => {
    let b = applyBaseAction(initialBase(), launch as never, 1000);
    b = applyBaseAction(
      b,
      { type: "career-action", action: { type: "return" } },
      1000,
    );
    b = applyBaseAction(
      b,
      { type: "career-action", action: { type: "dismiss" } },
      1000,
    );
    const up = applyBaseAction(
      b,
      {
        type: "career-action",
        action: { type: "unlock-module", module: "cargo" },
      },
      1000,
    );
    expect(up.resources.alloy).toBe(b.resources.alloy - 40);
    expect(up.career.profile.research).toBe(40);
    expect(
      applyBaseAction(
        up,
        {
          type: "career-action",
          action: { type: "unlock-module", module: "cargo" },
        },
        1000,
      ).resources,
    ).toEqual(up.resources);
  });
  it("records immediate defeat, charges its sortie and permits full recovery of disabled vessels", () => {
    const b = applyBaseAction(
      initialBase(),
      {
        type: "career-action",
        action: {
          type: "launch",
          missionId: "relay",
          fleetIds: ["salvage-01"],
          support: "none",
          approach: "direct",
        },
      },
      1000,
    );
    expect(b.resources.supply).toBe(79);
    expect(b.career.operation?.phase).toBe("result");
    expect(b.resources.alloy).toBe(120);
    expect(b.wear["salvage-01"]).toBe(70);
    const repaired = applyBaseAction(
      b,
      { type: "repair-fleet", fleetIds: ["salvage-01"] },
      1000,
    );
    expect(repaired.wear["salvage-01"]).toBe(0);
    expect(repaired.resources.alloy).toBe(113);
  });
  it("allows one pilot to complete all roles sequentially and pays shared success only once", () => {
    let s = initialGuildState();
    for (const r of GUILD_ROLES) {
      s = run(s, { type: "claim", role: r.id });
      s = run(s, { type: "contribute", role: r.id, fleetIds: r.recommended });
      expect(s.operation.slots[r.id].completed).toBe(true);
      s = run(s, { type: "repair-fleet", fleetIds: r.recommended });
    }
    expect(s.operation.phase).toBe("complete");
    expect(s.operation.awards).toEqual([{ pilotId: "nova", amount: 20 }]);
    expect(s.pilots[0].merit).toBe(60);
    expect(s.pilots[0].successfulOperations).toBe(1);
    expect(validateGuildState(s)).toEqual(s);
  });
  it("blocks guild departures during a personal sortie and refuses client supplied resources", () => {
    let s = run(initialGuildState(), launch as never);
    s = run(s, { type: "claim", role: "recon" });
    expect(() =>
      run(s, {
        type: "contribute",
        role: "recon",
        fleetIds: GUILD_ROLES[0].recommended,
      }),
    ).toThrow();
    expect(() =>
      parseGuildCommand({
        commandId: "x",
        expectedRevision: 0,
        operationId: 1,
        action: { type: "collect-production", resources: { alloy: 9999 } },
      }),
    ).toThrow();
  });
  it("validates bounds, all roster keys and deterministic personal reports", () => {
    const s = initialGuildState();
    expect(validateGuildState(s)).toEqual(s);
    const bad = structuredClone(s);
    bad.pilots[0].base.resources.supply = -1;
    expect(() => validateGuildState(bad)).toThrow();
    const badWear = structuredClone(s);
    delete badWear.pilots[0].base.wear["scout-01"];
    expect(() => validateGuildState(badWear)).toThrow();
    const badCarry = structuredClone(s);
    badCarry.pilots[0].base.productionCarry.alloy = -400000;
    expect(() => validateGuildState(badCarry)).toThrow();
  });
});
