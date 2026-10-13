import { MISSIONS } from "../game/content.ts";
import { createFleet, validateFleet } from "../game/fleet.ts";
import { resolveBattle } from "../game/combat.ts";
import { GUILD_ROLES, LEASE_MS, PILOTS, ROLE_IDS } from "./content.ts";
import { GuildError } from "./types.ts";
import type {
  GuildCommand,
  GuildReport,
  GuildRole,
  GuildSlot,
  GuildState,
  PrepRole,
} from "./types.ts";
const emptySlot = (): GuildSlot => ({
  ownerId: null,
  leaseUntil: 0,
  completed: false,
  attempts: 0,
  report: null,
});
function operation(id: number): GuildState["operation"] {
  return {
    id,
    phase: "preparing",
    slots: Object.fromEntries(ROLE_IDS.map((r) => [r, emptySlot()])) as Record<
      GuildRole,
      GuildSlot
    >,
    awards: [],
  };
}
export function initialGuildState(): GuildState {
  return {
    schemaVersion: 1,
    rulesVersion: "guild-v1",
    revision: 0,
    pilots: PILOTS.map((p) => ({ ...p, merit: 0, successfulOperations: 0 })),
    operation: operation(1),
  };
}
const fail = (status: number, code: string, message: string): never => {
  throw new GuildError(status, code, message);
};
function perform(
  state: GuildState,
  actor: string,
  role: GuildRole,
  fleetIds: string[],
): GuildReport {
  const errors = validateFleet(fleetIds, "none", "direct");
  if (errors.length) fail(400, "FLEET_INVALID", errors[0]);
  const specialist = {
    recon: "scout",
    jam: "jammer",
    supply: "salvage",
    breach: null,
  }[role];
  let fleet = createFleet(fleetIds, "none");
  if (specialist && !fleet.some((u) => u.shipId === specialist))
    fail(
      400,
      "SPECIALIST_REQUIRED",
      `${GUILD_ROLES.find((r) => r.id === role)!.name}의 전문 함선이 필요합니다.`,
    );
  const salvage = MISSIONS.find((m) => m.id === "salvage")!,
    relay = MISSIONS.find((m) => m.id === "relay")!,
    convoy = MISSIONS.find((m) => m.id === "convoy")!;
  const effects: GuildReport["effects"] = {};
  if (role === "breach")
    for (const support of ["recon", "jam", "supply"] as PrepRole[]) {
      const slot = state.operation.slots[support];
      if (slot.completed) effects[support] = slot.ownerId!;
    }
  let enemies = structuredClone(
    role === "recon"
      ? salvage.enemies.slice(0, 2)
      : role === "jam"
        ? relay.enemies.slice(0, 2)
        : role === "supply"
          ? [...salvage.enemies.slice(0, 2), convoy.enemies[0]]
          : relay.enemies,
  );
  if (effects.recon)
    enemies = enemies.filter(
      (e, i) => i !== enemies.findIndex((u) => u.shipId === "drone"),
    );
  const first = resolveBattle(fleet, enemies, {
    support: effects.jam ? "jam" : "none",
    stage: "primary",
    maxRounds: 6,
  });
  fleet = structuredClone(first.fleet);
  let supplyHealed = 0;
  if (first.outcome === "victory" && effects.supply) {
    for (const u of fleet.filter((u) => u.hp > 0)) {
      const amount = Math.min(20, u.maxHp - u.hp);
      u.hp += amount;
      supplyHealed += amount;
      if (amount)
        first.events.push({
          round: first.rounds,
          type: "repair",
          target: u.id,
          amount,
          text: `보급대 ${PILOTS.find((p) => p.id === effects.supply)!.name} · ${u.name} HP ${amount} 복구`,
        });
    }
    first.fleet = structuredClone(fleet);
  }
  const battles = [first];
  if (role === "breach" && first.outcome === "victory") {
    const second = resolveBattle(fleet, relay.bonusEnemies, {
      support: "none",
      stage: "bonus",
      maxRounds: 6,
    });
    battles.push(second);
    fleet = structuredClone(second.fleet);
  }
  let success =
    battles.every((b) => b.outcome === "victory") &&
    (role !== "breach" || battles.length === 2) &&
    (!specialist || fleet.some((u) => u.shipId === specialist && u.hp > 0));
  let contribution = success ? 1 : 0;
  if (role === "supply" && success) {
    let remaining = 3;
    for (const u of fleet
      .filter((u) => u.hp > 0)
      .sort((a, b) => b.cargoCapacity - a.cargoCapacity)) {
      const amount = Math.min(remaining, u.cargoCapacity);
      u.cargo = amount;
      remaining -= amount;
    }
    contribution = 3 - remaining;
    success = remaining === 0;
  }
  return {
    pilotId: actor,
    role,
    success,
    fleet,
    battles,
    effects,
    contribution: success ? contribution : 0,
    personalMerit: success ? 10 : 0,
    supplyHealed,
    summary: success
      ? {
          recon: "우회 항로 확보",
          jam: "교란 신호 확보",
          supply: "보급 화물 3개 전달",
          breach: "도약문 복구 완료",
        }[role]
      : "목표 미달 · 기여 보상 없음, 편성을 바꿔 재도전할 수 있습니다.",
  };
}
export function applyGuildCommand(
  previous: GuildState,
  actorId: string,
  command: GuildCommand,
  now: number,
): GuildState {
  if (!PILOTS.some((p) => p.id === actorId))
    fail(403, "PILOT_UNKNOWN", "알 수 없는 참가자입니다.");
  if (
    command.expectedRevision !== previous.revision ||
    command.operationId !== previous.operation.id
  )
    fail(
      409,
      "REVISION_CONFLICT",
      "작전 상태가 바뀌었습니다. 최신 상태를 확인하세요.",
    );
  const action = command.action,
    state = structuredClone(previous);
  if (action.type === "next-operation") {
    if (state.operation.phase !== "complete")
      fail(409, "OPERATION_ACTIVE", "현재 공동 작전을 먼저 완료하세요.");
    state.operation = operation(state.operation.id + 1);
  } else {
    if (state.operation.phase === "complete")
      fail(409, "OPERATION_COMPLETE", "이미 완료된 공동 작전입니다.");
    const slot = state.operation.slots[action.role];
    if (action.type === "claim") {
      if (slot.completed || (slot.ownerId && slot.leaseUntil > now))
        fail(409, "ROLE_TAKEN", "이미 다른 참가자가 맡은 역할입니다.");
      if (
        ROLE_IDS.some((r) => {
          const s = state.operation.slots[r];
          return (
            r !== action.role &&
            s.ownerId === actorId &&
            (s.completed || s.leaseUntil > now)
          );
        })
      )
        fail(409, "ROLE_LIMIT", "한 작전에서는 한 역할만 맡을 수 있습니다.");
      Object.assign(slot, emptySlot(), {
        ownerId: actorId,
        leaseUntil: now + LEASE_MS,
      });
    } else {
      if (slot.ownerId !== actorId)
        fail(403, "NOT_OWNER", "자신이 예약한 역할만 변경할 수 있습니다.");
      if (slot.completed)
        fail(409, "ROLE_COMPLETE", "기여를 이미 완료했습니다.");
      if (action.type === "release") Object.assign(slot, emptySlot());
      else {
        if (slot.leaseUntil <= now)
          fail(
            409,
            "LEASE_EXPIRED",
            "예약이 만료되었습니다. 역할을 다시 예약하세요.",
          );
        const report = perform(state, actorId, action.role, action.fleetIds);
        slot.attempts++;
        slot.report = report;
        slot.completed = report.success;
        if (report.success) {
          state.pilots.find((p) => p.id === actorId)!.merit += 10;
          slot.leaseUntil = 0;
        } else if (action.role === "breach") {
          slot.ownerId = null;
          slot.leaseUntil = 0;
        } else slot.leaseUntil = now + LEASE_MS;
        if (action.role === "breach" && report.success) {
          state.operation.phase = "complete";
          for (const r of ROLE_IDS) {
            const ready = state.operation.slots[r];
            if (ready.completed) {
              const pilot = state.pilots.find((p) => p.id === ready.ownerId)!;
              pilot.merit += 20;
              pilot.successfulOperations++;
              state.operation.awards.push({ pilotId: pilot.id, amount: 20 });
            }
          }
        }
      }
    }
  }
  state.revision++;
  return state;
}
