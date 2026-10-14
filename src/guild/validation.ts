import { PILOTS, ROLE_IDS } from "./content.ts";
import { GuildError } from "./types.ts";
import type { GuildCommand, GuildState, LegacyGuildState } from "./types.ts";
import { parseBaseAction, validateBase } from "../base/validation.ts";
import { ROSTER, SHIPS, MODULES } from "../game/content.ts";
import type { FleetContext } from "../game/types.ts";
import { replayGuildReport } from "./rules.ts";
const check = (condition: unknown) => {
  if (!condition)
    throw new GuildError(
      400,
      "INVALID_INPUT",
      "명령 또는 저장 기록의 형식이 올바르지 않습니다.",
    );
};
const obj = (v: unknown): Record<string, unknown> => {
  check(v !== null && typeof v === "object" && !Array.isArray(v));
  return v as Record<string, unknown>;
};
const int = (v: unknown, max = Number.MAX_SAFE_INTEGER) => {
  check(typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= max);
};
const text = (v: unknown, max = 250) => {
  check(typeof v === "string" && v.length <= max);
};
const keys = (v: Record<string, unknown>, allowed: string[]) =>
  check(
    Object.keys(v).length === allowed.length &&
      Object.keys(v).every((k) => allowed.includes(k)),
  );
const pilot = (v: unknown) => check(PILOTS.some((p) => p.id === v));
const role = (v: unknown) => check(ROLE_IDS.includes(v as never));
export function parseGuildCommand(value: unknown): GuildCommand {
  const c = obj(value);
  keys(c, ["commandId", "expectedRevision", "operationId", "action"]);
  check(
    typeof c.commandId === "string" &&
      /^[a-zA-Z0-9_-]{1,80}$/.test(c.commandId),
  );
  int(c.expectedRevision);
  int(c.operationId);
  check(Number(c.operationId) > 0);
  const a = obj(c.action);
  if (
    [
      "collect-production",
      "upgrade-facility",
      "repair-fleet",
      "career-action",
    ].includes(a.type as string)
  )
    parseBaseAction(a,true);
  else if (a.type === "next-operation") keys(a, ["type"]);
  else {
    check(["claim", "release", "contribute"].includes(a.type as string));
    role(a.role);
    keys(
      a,
      a.type === "contribute" ? (a.planetId===undefined?["type", "role", "fleetIds"]:["type", "role", "fleetIds","planetId"]) : ["type", "role"],
    );
    if (a.type === "contribute") {
      check(
        Array.isArray(a.fleetIds) &&
          a.fleetIds.length >= 1 &&
          a.fleetIds.length <= 6,
      );
      check(
        (a.fleetIds as unknown[]).every((id) =>
          typeof id==="string"&&/^[\w:-]{1,160}$/.test(id),
        ),
      );
      check(
        new Set(a.fleetIds as unknown[]).size ===
          (a.fleetIds as unknown[]).length,
      );
      if(a.planetId!==undefined) check(typeof a.planetId==="string"&&/^[\w:-]{1,160}$/.test(a.planetId));
    }
  }
  return structuredClone(c) as unknown as GuildCommand;
}
function unit(value: unknown) {
  const u = obj(value);
  text(u.id, 160);
  text(u.shipId, 40);
  text(u.name, 80);
  check(
    [
      "striker",
      "guardian",
      "siege",
      "support",
      "salvage",
      "scout",
      "jammer",
      "carrier",
      "enemy",
    ].includes(u.role as string),
  );
  check(u.kind === "mobile" || u.kind === "facility");
  for (const key of [
    "hp",
    "maxHp",
    "armor",
    "attack",
    "cargo",
    "cargoCapacity",
    "repairCharges",
  ])
    int(u[key], 10000);
  check(
    Number(u.hp) <= Number(u.maxHp) &&
      Number(u.maxHp) > 0 &&
      Number(u.cargo) <= Number(u.cargoCapacity),
  );
  check(u.hp !== 0 || u.cargo === 0);
}
function units(value: unknown) {
  check(Array.isArray(value) && value.length >= 1 && value.length <= 10);
  (value as unknown[]).forEach(unit);
  check(
    new Set((value as unknown[]).map((u) => obj(u).id)).size ===
      (value as unknown[]).length,
  );
}
function report(value: unknown) {
  const r = obj(value);
  pilot(r.pilotId);
  role(r.role);
  check(typeof r.success === "boolean");
  units(r.fleet);
  int(r.contribution, 3);
  int(r.personalMerit, 10);
  check(r.personalMerit === (r.success ? 10 : 0));
  int(r.supplyHealed, 120);
  text(r.summary);
  const effects = obj(r.effects);
  check(
    Object.keys(effects).every((k) => ["recon", "jam", "supply"].includes(k)),
  );
  Object.values(effects).forEach(pilot);
  check(
    Array.isArray(r.battles) && r.battles.length >= 1 && r.battles.length <= 2,
  );
  for (const value of r.battles as unknown[]) {
    const b = obj(value);
    units(b.fleet);
    units(b.enemies);
    check(["victory", "repelled", "destroyed"].includes(b.outcome as string));
    int(b.rounds, 6);
    int(b.cargoLost, 100);
    check(Array.isArray(b.events) && b.events.length <= 512);
    for (const event of b.events as unknown[]) {
      const e = obj(event);
      int(e.round, 6);
      int(e.amount, 10000);
      text(e.text);
      check(
        [
          "damage",
          "guard",
          "repair",
          "jam",
          "drone",
          "disable",
          "cargo",
        ].includes(e.type as string),
      );
      if (e.actor !== undefined) text(e.actor, 160);
      if (e.target !== undefined) text(e.target, 160);
    }
  }
  if(r.fleetContext!==undefined) validateContext(r.fleetContext);
  if(r.module!==undefined) check(r.module==="none"||MODULES.some(m=>m.id===r.module));
  const normalize=(v:unknown):unknown=>Array.isArray(v)?v.map(normalize):v&&typeof v==="object"?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,normalize(v)])):v;
  check(JSON.stringify(normalize(r))===JSON.stringify(normalize(replayGuildReport(r as unknown as import("./types.ts").GuildReport))));
}
function validateContext(value: unknown): FleetContext {
  const c=obj(value); keys(c,["roster"]); check(Array.isArray(c.roster)&&c.roster.length>0&&c.roster.length<=10000);
  const roster=c.roster as unknown[];
  check(new Set(roster.map(r=>obj(r).id)).size===roster.length);
  for(const raw of roster) {const r=obj(raw); keys(r,["id","shipId"]);check(typeof r.id==="string"&&/^[\w:-]{1,160}$/.test(r.id)&&SHIPS.some(s=>s.id===r.shipId));}
  return structuredClone(c) as unknown as FleetContext;
}
function validateState(
  value: unknown,
  legacy: boolean,
): GuildState | LegacyGuildState {
  const s = obj(value);
  check(
    legacy
      ? s.schemaVersion === 1 && s.rulesVersion === "guild-v1"
      : s.schemaVersion === 2 && s.rulesVersion === "base-operations-v2",
  );
  int(s.revision);
  check(Array.isArray(s.pilots) && s.pilots.length === 4);
  const p = s.pilots as unknown[];
  check(new Set(p.map((x) => obj(x).id)).size === 4);
  for (const entry of p) {
    const u = obj(entry);
    pilot(u.id);
    check(u.name === PILOTS.find((p) => p.id === u.id)!.name);
    int(u.merit);
    int(u.successfulOperations);
    if (!legacy) validateBase(u.base,u.fleetContext===undefined?undefined:validateContext(u.fleetContext));
  }
  const op = obj(s.operation);
  int(op.id);
  check(Number(op.id) > 0);
  check(["preparing", "complete"].includes(op.phase as string));
  const slots = obj(op.slots);
  keys(slots, ROLE_IDS);
  const completed: string[] = [];
  for (const key of ROLE_IDS) {
    const slot = obj(slots[key]);
    check(typeof slot.completed === "boolean");
    if (slot.ownerId !== null) pilot(slot.ownerId);
    int(slot.leaseUntil);
    int(slot.attempts);
    if (slot.report !== null) {
      report(slot.report);
      check(obj(slot.report).role === key);
    }
    if (slot.completed) {
      pilot(slot.ownerId);
      check(
        slot.report !== null &&
          obj(slot.report).success === true &&
          obj(slot.report).pilotId === slot.ownerId,
      );
      check(slot.leaseUntil === 0);
      completed.push(slot.ownerId as string);
    }
  }
  if (legacy) check(new Set(completed).size === completed.length);
  check((op.phase === "complete") === obj(slots.breach).completed);
  check(Array.isArray(op.awards) && op.awards.length <= 4);
  const awards = op.awards as unknown[];
  check(new Set(awards.map((a) => obj(a).pilotId)).size === awards.length);
  if (op.phase === "preparing") check(awards.length === 0);
  else check(awards.length === new Set(completed).size);
  for (const award of awards) {
    const a = obj(award);
    check(completed.includes(a.pilotId as string));
    check(a.amount === 20);
  }
  return structuredClone(s) as unknown as GuildState;
}
export const validateGuildState = (value: unknown): GuildState =>
  validateState(value, false) as GuildState;
export const validateLegacyGuildState = (value: unknown): LegacyGuildState =>
  validateState(value, true) as LegacyGuildState;
