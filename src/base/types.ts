import type { GameAction, GameState } from "../game/types.ts";
export type FacilityId = "forge" | "reactor";
export interface BaseState {
  resources: { alloy: number; supply: number };
  facilities: Record<FacilityId, number>;
  lastProducedAt: number;
  wear: Record<string, number>;
  career: GameState;
}
export type BaseAction =
  | { type: "collect-production" }
  | { type: "upgrade-facility"; facility: FacilityId }
  | { type: "repair-fleet"; fleetIds: string[] }
  | { type: "career-action"; action: GameAction };
