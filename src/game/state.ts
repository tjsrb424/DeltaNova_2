import { MISSIONS, MODULES } from "./content.ts";
import { createFleet, validateFleet } from "./fleet.ts";
import { resolveBattle } from "./combat.ts";
import type { GameAction, GameState, Operation, FleetContext } from "./types.ts";
export function initialState(): GameState {
  return {
    schemaVersion: 1,
    rulesVersion: "command-center-v1",
    profile: {
      research: 0,
      best: { salvage: 0, relay: 0, convoy: 0 },
      unlocked: [],
      active: "none",
      totalSorties: 0,
    },
    operation: null,
    nextOperationId: 1,
    message: null,
  };
}
function settle(state: GameState, reason: string): GameState {
  const op = state.operation!;
  if (op.phase === "result") return state;
  op.phase = "result";
  op.reason = reason;
  op.recovered = op.fleet.reduce((sum, u) => sum + (u.hp > 0 ? u.cargo : 0), 0);
  const score = op.recovered * 10;
  op.gained = Math.max(0, score - (state.profile.best[op.missionId] || 0));
  state.profile.research += op.gained;
  state.profile.best[op.missionId] = Math.max(
    score,
    state.profile.best[op.missionId] || 0,
  );
  return state;
}
function encounter(state: GameState, bonus: boolean): GameState {
  const op = state.operation!,
    mission = MISSIONS.find((m) => m.id === op.missionId)!;
  let enemies = structuredClone(bonus ? mission.bonusEnemies : mission.enemies);
  let loot = bonus ? mission.bonusLoot : mission.loot;
  if (!bonus && op.approach === "flank") {
    const index = enemies.findIndex((e) => e.shipId === "drone");
    if (index >= 0) {
      enemies.splice(index, 1);
      loot = Math.max(0, loot - 2);
    }
  }
  const result = resolveBattle(op.fleet, enemies, {
    support: op.support,
    stage: bonus ? "bonus" : "primary",
    maxRounds: mission.maxRounds,
  });
  op.battles.push(result);
  op.fleet = structuredClone(result.fleet);
  op.cargoLost += result.cargoLost;
  if (result.outcome === "victory") {
    op.cargoOffered += loot;
    let remaining = loot;
    for (const u of [...op.fleet]
      .filter((u) => u.hp > 0)
      .sort((a, b) => b.hp - a.hp || (a.id < b.id ? -1 : 1))) {
      const amount = Math.min(remaining, u.cargoCapacity - u.cargo);
      u.cargo += amount;
      remaining -= amount;
    }
    op.cargoUnloaded += remaining;
    if (bonus) return settle(state, "추가 목표 확보");
    return state;
  }
  return settle(
    state,
    result.outcome === "destroyed"
      ? "함대 구조 · 회수 실패"
      : "교전 기한 초과 · 긴급 귀환",
  );
}
export function reduceGame(previous: GameState, action: GameAction, context?: FleetContext): GameState {
  if (action.type === "clear-message") return { ...previous, message: null };
  const error = (message: string) => ({ ...previous, message });
  if (action.type === "launch") {
    if (previous.operation) return error("진행 중인 작전을 먼저 마무리하세요.");
    const mission = MISSIONS.find((m) => m.id === action.missionId);
    if (!mission) return error("존재하지 않는 작전입니다.");
    const errors = validateFleet(
      action.fleetIds,
      action.support,
      action.approach,
      context,
    );
    if (errors.length) return error(errors[0]);
    if (
      action.approach === "flank" &&
      !mission.enemies.some((e) => e.shipId === "drone")
    )
      return error("우회 가능한 경로가 없습니다.");
    const state = structuredClone(previous);
    state.message = null;
    const op: Operation = {
      id: state.nextOperationId++,
      missionId: mission.id,
      support: action.support,
      approach: action.approach,
      module: state.profile.active,
      phase: "checkpoint",
      fleet: createFleet(action.fleetIds, state.profile.active, context),
      battles: [],
      cargoOffered: 0,
      cargoUnloaded: 0,
      cargoLost: 0,
      recovered: 0,
      gained: 0,
      reason: "",
    };
    state.operation = op;
    state.profile.totalSorties++;
    return encounter(state, false);
  }
  if (action.type === "return" || action.type === "advance") {
    if (!previous.operation || previous.operation.phase === "result")
      return previous;
    const state = structuredClone(previous);
    state.message = null;
    return action.type === "return"
      ? settle(state, "확보한 화물과 함께 귀환")
      : encounter(state, true);
  }
  if (action.type === "dismiss")
    return previous.operation?.phase === "result"
      ? { ...previous, operation: null, message: null }
      : previous;
  if (action.type === "unlock-module" || action.type === "activate-module") {
    if (previous.operation)
      return error("작전 중에는 기지 모듈을 바꿀 수 없습니다.");
    const module = MODULES.find((m) => m.id === action.module);
    if (action.type === "activate-module" && action.module === "none")
      return {
        ...previous,
        profile: { ...previous.profile, active: "none" },
        message: null,
      };
    if (!module) return error("존재하지 않는 모듈입니다.");
    const state = structuredClone(previous);
    state.message = null;
    if (action.type === "unlock-module") {
      if (state.profile.unlocked.includes(module.id)) return previous;
      if (state.profile.research < module.cost)
        return error("연구 데이터가 부족합니다.");
      state.profile.research -= module.cost;
      state.profile.unlocked.push(module.id);
      state.profile.active = module.id;
    } else {
      if (!state.profile.unlocked.includes(module.id))
        return error("먼저 모듈을 해금하세요.");
      state.profile.active = module.id;
    }
    return state;
  }
  return previous;
}
