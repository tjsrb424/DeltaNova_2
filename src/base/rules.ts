import { ROSTER, SHIPS } from "../game/content.ts";
import { initialState, reduceGame } from "../game/state.ts";
import { validateFleet } from "../game/fleet.ts";
import type { CombatUnit, Support, FleetContext } from "../game/types.ts";
import { GuildError } from "../guild/types.ts";
import type { BaseState, BaseAction } from "./types.ts";
const fail = (code: string, message: string): never => {
  throw new GuildError(400, code, message);
};
export function initialBase(now = 0): BaseState {
  return {
    resources: { alloy: 120, supply: 80 },
    facilities: { forge: 1, reactor: 1 },
    lastProducedAt: now,
    productionCarry: { alloy: 0, supply: 0 },
    wear: Object.fromEntries(ROSTER.map((r) => [r.id, 0])),
    career: initialState(),
  };
}
export function capacities(base: BaseState) {
  return {
    alloy: 300 + 100 * (base.facilities.forge - 1),
    supply: 150 + 50 * (base.facilities.reactor - 1),
  };
}
export function productionRates(base: BaseState) {
  return {
    alloy: 6 * base.facilities.forge,
    supply: 4 * base.facilities.reactor,
  };
}
export function projectBase(base: BaseState, now: number): BaseState {
  if (now < base.lastProducedAt) return structuredClone(base);
  const next = structuredClone(base),
    elapsed = Math.max(0, Math.floor((now - base.lastProducedAt) / 60000)),
    minutes = Math.min(480, elapsed),
    rates = productionRates(base),
    cap = capacities(base);
  next.lastProducedAt = base.lastProducedAt + elapsed * 60000;
  for (const resource of ["alloy", "supply"] as const) {
    if (elapsed > 0) {
      const numerator =
        base.productionCarry[resource] + minutes * 60000 * rates[resource];
      next.resources[resource] = Math.min(
        cap[resource],
        base.resources[resource] + Math.floor(numerator / 60000),
      );
      next.productionCarry[resource] = numerator % 60000;
    }
    // Overflow, including an unfinished minute, cannot become banked production after spending.
    if (next.resources[resource] === cap[resource])
      next.productionCarry[resource] =
        -(now - next.lastProducedAt) * rates[resource];
  }
  return next;
}
export function sortieCost(ids: string[], support: Support = "none", context?: FleetContext): number {
  return ids.reduce(
    (n, id) => {
      const r = (context?.roster || ROSTER).find((r) => r.id === id);
      if (!r) fail("FLEET_INVALID", "알 수 없는 함선입니다.");
      return n + SHIPS.find((s) => s.id === r!.shipId)!.command;
    },
    support === "none" ? 0 : 2,
  );
}
export function assertDeparture(base: BaseState, ids: string[]): void {
  if (base.career.operation?.phase === "checkpoint")
    fail("FLEET_DEPLOYED", "개인 작전 함대가 출격 중입니다. 먼저 귀환하세요.");
  if (ids.some((id) => base.wear[id] > 0))
    fail(
      "REPAIR_REQUIRED",
      "정비가 필요한 함선입니다. 기지 운영에서 정비하거나 정상 함선을 선택하세요.",
    );
}
export function repairCost(base: BaseState, ids: string[]): number {
  return ids.reduce((n, id) => n + Math.ceil(base.wear[id] / 10), 0);
}
export function recordReturn(base: BaseState, fleet: CombatUnit[]): void {
  for (const u of fleet) base.wear[u.id] = u.maxHp - u.hp;
}
function spend(base: BaseState, alloy: number, supply: number) {
  if (base.resources.alloy < alloy)
    fail(
      "ALLOY_SHORT",
      "합금이 부족합니다. 생산을 수령하거나 개인 작전 화물을 회수하세요.",
    );
  if (base.resources.supply < supply)
    fail(
      "SUPPLY_SHORT",
      "보급품이 부족합니다. 생산을 수령하거나 더 작은 함대를 편성하세요.",
    );
  base.resources.alloy -= alloy;
  base.resources.supply -= supply;
}
export function applyBaseAction(
  previous: BaseState,
  action: BaseAction,
  now: number,
): BaseState {
  const base = projectBase(previous, now);
  if (action.type === "collect-production") return base;
  if (action.type === "upgrade-facility") {
    const level = base.facilities[action.facility];
    if (level >= 3) fail("FACILITY_MAX", "현재 시설은 최대 레벨입니다.");
    const oldRates = productionRates(base);
    spend(base, 40 * level, 10 * level);
    base.facilities[action.facility]++;
    const newRates = productionRates(base),
      fraction = Math.max(0, now - base.lastProducedAt);
    for (const resource of ["alloy", "supply"] as const)
      base.productionCarry[resource] += (oldRates[resource] - newRates[resource]) * fraction;
    return base;
  }
  if (action.type === "repair-fleet") {
    if (base.career.operation?.phase === "checkpoint")
      fail(
        "FLEET_DEPLOYED",
        "출격 중에는 정비할 수 없습니다. 먼저 귀환하세요.",
      );
    if (
      !action.fleetIds.length ||
      new Set(action.fleetIds).size !== action.fleetIds.length ||
      action.fleetIds.some((id) => !ROSTER.some((r) => r.id === id))
    )
      fail("FLEET_INVALID", "정비할 함선을 확인하세요.");
    spend(base, repairCost(base, action.fleetIds), 0);
    for (const id of action.fleetIds) base.wear[id] = 0;
    return base;
  }
  const command = action.action;
  if (command.type === "launch") {
    const errors = validateFleet(
      command.fleetIds,
      command.support,
      command.approach,
    );
    if (errors.length) fail("FLEET_INVALID", errors[0]);
    assertDeparture(base, command.fleetIds);
    spend(base, 0, sortieCost(command.fleetIds, command.support));
  }
  if (
    command.type === "unlock-module" &&
    !base.career.profile.unlocked.includes(command.module)
  )
    spend(base, 40, 0);
  const next = reduceGame(base.career, command);
  if (next.message) fail("CAREER_REJECTED", next.message);
  if (
    next.operation?.phase === "result" &&
    base.career.operation?.phase !== "result"
  ) {
    base.resources.alloy = Math.min(
      capacities(base).alloy,
      base.resources.alloy + next.operation.recovered * 4,
    );
    recordReturn(base, next.operation.fleet);
  }
  base.career = next;
  return base;
}
