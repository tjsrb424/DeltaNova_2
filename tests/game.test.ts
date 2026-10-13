import { describe, expect, it } from "vitest";
import { createFleet, validateFleet } from "../src/game/fleet.ts";
import { resolveBattle } from "../src/game/combat.ts";
import { initialState, reduceGame } from "../src/game/state.ts";
import type { CombatUnit, GameState } from "../src/game/types.ts";

const unit = (id: string, patch: Partial<CombatUnit> = {}): CombatUnit => ({
  id,
  shipId: "striker",
  name: id,
  role: "striker",
  kind: "mobile",
  maxHp: 40,
  hp: 40,
  attack: 10,
  armor: 0,
  cargoCapacity: 2,
  cargo: 0,
  repairCharges: 0,
  ...patch,
});
const enemy = (patch: Partial<CombatUnit> = {}) =>
  unit("enemy", { role: "enemy", shipId: "drone", ...patch });
const options = {
  support: "none" as const,
  stage: "primary" as const,
  maxRounds: 6,
};
const launch = (state: GameState = initialState()) =>
  reduceGame(state, {
    type: "launch",
    missionId: "salvage",
    fleetIds: [
      "striker-01",
      "striker-02",
      "guardian-01",
      "support-01",
      "salvage-01",
      "scout-01",
    ],
    support: "jam",
    approach: "direct",
  });

describe("fleet boundary", () => {
  it("rejects empty, unknown, duplicate, over-command fleets and unsupported flank", () => {
    expect(validateFleet([], "none", "direct").length).toBeGreaterThan(0);
    expect(validateFleet(["unknown"], "none", "direct").length).toBeGreaterThan(
      0,
    );
    expect(
      validateFleet(["striker-01", "striker-01"], "none", "direct").length,
    ).toBeGreaterThan(0);
    expect(
      validateFleet(
        ["carrier-01", "siege-01", "guardian-01", "striker-01", "support-01"],
        "none",
        "direct",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      validateFleet(["striker-01"], "none", "flank").length,
    ).toBeGreaterThan(0);
    expect(validateFleet(["striker-01"], "recon", "flank")).toEqual([]);
  });
  it("applies module to departure snapshot, without changing the catalog", () => {
    expect(createFleet(["striker-01"], "bulkhead")[0].hp).toBe(100);
    expect(createFleet(["striker-01"], "none")[0].hp).toBe(90);
  });
});

describe("combat rules", () => {
  it("applies simultaneous destruction and loses cargo once", () => {
    const r = resolveBattle(
      [unit("a", { hp: 10, maxHp: 10, cargo: 2 })],
      [enemy({ hp: 10, maxHp: 10 })],
      options,
    );
    expect(r.outcome).toBe("destroyed");
    expect(r.fleet[0].hp).toBe(0);
    expect(r.enemies[0].hp).toBe(0);
    expect(r.cargoLost).toBe(2);
  });
  it("jams only the first round of the primary encounter", () => {
    const primary = resolveBattle([unit("a")], [enemy({ hp: 20, maxHp: 20 })], {
      ...options,
      support: "jam",
    });
    const bonus = resolveBattle([unit("a")], [enemy({ hp: 20, maxHp: 20 })], {
      ...options,
      support: "jam",
      stage: "bonus",
    });
    expect(primary.fleet[0].hp).toBe(30);
    expect(bonus.fleet[0].hp).toBe(20);
  });
  it("bypasses facility armor for siege and preserves caller inputs", () => {
    const fleet = [unit("lancer", { role: "siege", attack: 46 })];
    const foes = [
      enemy({ hp: 46, maxHp: 46, kind: "facility", armor: 40, attack: 1 }),
    ];
    const r = resolveBattle(fleet, foes, options);
    expect(r.rounds).toBe(1);
    expect(r.outcome).toBe("victory");
    expect(fleet[0].hp).toBe(40);
    expect(foes[0].hp).toBe(46);
  });
  it("redirects half of post-armor damage without applying guardian armor again", () => {
    const r = resolveBattle(
      [
        unit("cargo", { armor: 2, cargo: 1 }),
        unit("guard", { role: "guardian", armor: 9, cargoCapacity: 1 }),
      ],
      [enemy({ hp: 100, maxHp: 100, attack: 12 })],
      { ...options, maxRounds: 1 },
    );
    expect(r.fleet.find((s) => s.id === "cargo")!.hp).toBe(35);
    expect(r.fleet.find((s) => s.id === "guard")!.hp).toBe(35);
  });
  it("adds carrier drone damage and repairs only victorious surviving fleets", () => {
    const r = resolveBattle(
      [unit("ark", { role: "carrier", attack: 18 })],
      [enemy({ hp: 30, maxHp: 30, attack: 1 })],
      options,
    );
    expect(r.outcome).toBe("victory");
    expect(r.rounds).toBe(1);
    const repair = resolveBattle(
      [unit("mender", { role: "support", hp: 20, repairCharges: 2 })],
      [enemy({ hp: 10, maxHp: 10, attack: 5 })],
      options,
    );
    expect(repair.fleet[0].hp).toBe(40);
    expect(repair.fleet[0].repairCharges).toBe(1);
    const failed = resolveBattle(
      [unit("mender", { role: "support", hp: 20, repairCharges: 2 })],
      [enemy({ hp: 100, maxHp: 100, attack: 5 })],
      { ...options, maxRounds: 1 },
    );
    expect(failed.fleet[0].hp).toBe(15);
    expect(failed.fleet[0].repairCharges).toBe(2);
    expect(failed.outcome).toBe("repelled");
  });
  it("supply repairs all survivors only after primary victory", () => {
    const fleet = [unit("a", { hp: 10 })];
    const foes = [enemy({ hp: 1, maxHp: 1, attack: 1 })];
    expect(
      resolveBattle(fleet, foes, { ...options, support: "supply" }).fleet[0].hp,
    ).toBe(29);
    expect(
      resolveBattle(fleet, foes, {
        ...options,
        support: "supply",
        stage: "bonus",
      }).fleet[0].hp,
    ).toBe(9);
  });
  it("replays deterministically independently of input ordering", () => {
    const fleet = [unit("b"), unit("a")];
    const foes = [enemy()];
    expect(resolveBattle(fleet, foes, options)).toEqual(
      resolveBattle([...fleet].reverse(), foes, options),
    );
  });
});

describe("operation state", () => {
  it("refuses invalid launch without spending or starting", () => {
    const r = reduceGame(initialState(), {
      type: "launch",
      missionId: "salvage",
      fleetIds: [],
      support: "none",
      approach: "direct",
    });
    expect(r.operation).toBeNull();
    expect(r.profile.research).toBe(0);
    expect(r.message).toBeTruthy();
  });
  it("can safely return, settle once, and repeat without farming research", () => {
    const started = launch();
    expect(started.operation?.phase).toBe("checkpoint");
    const ended = reduceGame(started, { type: "return" });
    expect(ended.operation?.phase).toBe("result");
    expect(ended.profile.research).toBeGreaterThan(0);
    expect(reduceGame(ended, { type: "return" })).toEqual(ended);
    const retry = launch(reduceGame(ended, { type: "dismiss" }));
    expect(reduceGame(retry, { type: "return" }).profile.research).toBe(
      ended.profile.research,
    );
  });
  it("blocks a second launch and applies recon to enemies and reward", () => {
    const started = launch();
    expect(launch(started).operation?.id).toBe(started.operation?.id);
    const flank = reduceGame(initialState(), {
      type: "launch",
      missionId: "salvage",
      fleetIds: ["striker-01", "striker-02", "salvage-01"],
      support: "recon",
      approach: "flank",
    });
    expect(flank.operation!.battles[0].enemies.length).toBe(2);
    expect(flank.operation!.cargoOffered).toBe(4);
  });
  it("does not allow module purchases or changes during an operation", () => {
    const started = launch();
    expect(
      reduceGame(started, { type: "unlock-module", module: "bulkhead" })
        .profile,
    ).toEqual(started.profile);
  });
  it("allows immediate retry after a failed mission and preserves the owned roster", () => {
    const action = {
      type: "launch" as const,
      missionId: "relay",
      fleetIds: ["salvage-01"],
      support: "none" as const,
      approach: "direct" as const,
    };
    const failed = reduceGame(initialState(), action);
    expect(failed.operation?.phase).toBe("result");
    expect(failed.operation?.recovered).toBe(0);
    const retry = reduceGame(reduceGame(failed, { type: "dismiss" }), action);
    expect(retry.operation?.id).toBe(2);
    expect(retry.operation?.battles).toEqual(failed.operation?.battles);
  });
  it("ends the optional encounter once with cargo conservation", () => {
    const finished = reduceGame(launch(), { type: "advance" });
    const op = finished.operation!;
    expect(op.phase).toBe("result");
    expect(op.battles).toHaveLength(2);
    expect(op.cargoOffered).toBe(
      op.recovered + op.cargoLost + op.cargoUnloaded,
    );
    expect(reduceGame(finished, { type: "advance" })).toEqual(finished);
    expect(reduceGame(finished, { type: "return" })).toEqual(finished);
  });
  it("spends research once and only activates unlocked modules", () => {
    const ready = reduceGame(reduceGame(launch(), { type: "return" }), {
      type: "dismiss",
    });
    const bought = reduceGame(ready, {
      type: "unlock-module",
      module: "cargo",
    });
    expect(bought.profile.research).toBe(ready.profile.research - 20);
    expect(
      reduceGame(bought, { type: "unlock-module", module: "cargo" }),
    ).toEqual(bought);
    expect(
      reduceGame(bought, { type: "activate-module", module: "bulkhead" })
        .profile.active,
    ).toBe("cargo");
  });
});
