import { ROSTER, SHIPS, MODULES, MISSIONS, SUPPORTS } from "../game/content.ts";
import { decodeSave } from "../storage/save.ts";
import { GuildError } from "../guild/types.ts";
import type { BaseState, BaseAction } from "./types.ts";
import type { FleetContext } from "../game/types.ts";
import { capacities, productionRates } from "./rules.ts";
const check = (condition: unknown) => {
  if (!condition)
    throw new GuildError(
      400,
      "BASE_INVALID",
      "기지 명령 또는 저장 형식을 확인할 수 없습니다.",
    );
};
const object = (v: unknown): Record<string, unknown> => {
  check(v && typeof v === "object" && !Array.isArray(v));
  return v as Record<string, unknown>;
};
const exact = (v: Record<string, unknown>, keys: string[]) =>
  check(
    Object.keys(v).length === keys.length &&
      Object.keys(v).every((k) => keys.includes(k)),
  );
const int = (v: unknown, max = Number.MAX_SAFE_INTEGER) =>
  check(typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= max);
function ids(v: unknown, max: number, allowDynamic=false) {
  check(Array.isArray(v) && v.length > 0 && v.length <= max);
  check((v as unknown[]).every((id) => allowDynamic ? typeof id==="string"&&/^[\w:-]{1,160}$/.test(id) : ROSTER.some((r) => r.id === id)));
  check(new Set(v as unknown[]).size === (v as unknown[]).length);
}
export function parseBaseAction(value: unknown, allowDynamic=false): BaseAction {
  const a = object(value);
  if (a.type === "collect-production") exact(a, ["type"]);
  else if (a.type === "upgrade-facility") {
    exact(a, ["type", "facility"]);
    check(a.facility === "forge" || a.facility === "reactor");
  } else if (a.type === "repair-fleet") {
    exact(a, ["type", "fleetIds"]);
    ids(a.fleetIds, allowDynamic?256:ROSTER.length, allowDynamic);
  } else {
    check(a.type === "career-action");
    exact(a, ["type", "action"]);
    const c = object(a.action);
    if (c.type === "launch") {
      exact(c, ["type", "missionId", "fleetIds", "support", "approach"]);
      check(MISSIONS.some((m) => m.id === c.missionId));
      ids(c.fleetIds, 6, allowDynamic);
      check(SUPPORTS.some((s) => s.id === c.support));
      check(c.approach === "direct" || c.approach === "flank");
    } else if (c.type === "unlock-module" || c.type === "activate-module") {
      exact(c, ["type", "module"]);
      check(
        MODULES.some((m) => m.id === c.module) ||
          (c.type === "activate-module" && c.module === "none"),
      );
    } else {
      check(
        ["advance", "return", "dismiss", "clear-message"].includes(
          c.type as string,
        ),
      );
      exact(c, ["type"]);
    }
  }
  return structuredClone(a) as unknown as BaseAction;
}
export function validateBase(value: unknown, context?: FleetContext): BaseState {
  const b = object(value);
  exact(b, [
    "resources",
    "facilities",
    "lastProducedAt",
    "productionCarry",
    "wear",
    "career",
  ]);
  const f = object(b.facilities);
  exact(f, ["forge", "reactor"]);
  for (const v of Object.values(f)) {
    int(v, context?5:3);
    check(Number(v) >= 1);
  }
  const resource = object(b.resources);
  exact(resource, ["alloy", "supply"]);
  const caps = capacities({ facilities: f } as unknown as BaseState);
  int(resource.alloy, caps.alloy);
  int(resource.supply, caps.supply);
  int(b.lastProducedAt);
  const carry = object(b.productionCarry);
  exact(carry, ["alloy", "supply"]);
  const rates = productionRates({ facilities: f } as unknown as BaseState);
  for (const resource of ["alloy", "supply"] as const) {
    const v = carry[resource];
    check(
      typeof v === "number" &&
        Number.isSafeInteger(v) &&
        (context ? Math.abs(v)<=3000000 : v >= -rates[resource] * 59999 && v < 60000),
    );
  }
  const wear = object(b.wear);
  exact(
    wear,
    (context?.roster || ROSTER).map((r) => r.id),
  );
  for (const r of (context?.roster || ROSTER))
    int(wear[r.id], SHIPS.find((s) => s.id === r.shipId)!.hp + 10);
  const career = decodeSave(JSON.stringify(b.career),context);
  if (career.operation?.phase === "checkpoint")
    check(career.operation.fleet.every((u) => wear[u.id] === 0));
  return { ...structuredClone(b), career } as unknown as BaseState;
}
