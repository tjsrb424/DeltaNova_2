import type { GameAction, GameState } from "../game/types.ts";
import type { GuildRole, GuildSlot, GuildSession } from "../guild/types.ts";
export type ResourceId = "alloy" | "crystal" | "fuel";
export type Resources = Record<ResourceId, number>;
export type FacilityId = "alloyMine" | "crystalMine" | "fuelRefinery" | "powerPlant" | "shipyard" | "laboratory";
export type TechnologyId = "industry" | "propulsion" | "intelligence" | "defense";
export interface FleetContext { roster: readonly { id: string; shipId: string }[] }
export interface ShipInstance { id: string; shipId: string; planetId: string; wear: number; status: "docked" | "deployed" }
export interface TimedJob {
  id: string; kind: "facility" | "ships" | "defense" | "research"; planetId: string;
  target: string; quantity: number; level: number; startedAt: number; completesAt: number; cost: Resources;
}
export interface PlanetState {
  id: string; name: string; kind: "home" | "colony"; resources: Resources;
  facilities: Record<FacilityId, number>;
  production: Record<ResourceId, { at: number; carry: number }>;
  constructionJob: TimedJob | null; shipJob: TimedJob | null;
  defenses: number; ships: ShipInstance[];
}
export interface EmpireEvent { id: string; at: number; planetId: string; kind: "completed" | "cancelled"; title: string }
export interface EmpireState {
  revision: number; homePlanetId: string; planets: PlanetState[];
  technologies: Record<TechnologyId, number>; researchJob: TimedJob | null;
  career: GameState; careerOriginPlanetId: string | null; careerFleetContext: FleetContext | null;
  events: EmpireEvent[]; settledAt: number;
}
export type EmpireAction =
  | { type: "collect-production"; planetId: string }
  | { type: "upgrade-facility"; planetId: string; facility: FacilityId }
  | { type: "build-defense"; planetId: string }
  | { type: "build-ships"; planetId: string; shipId: string; quantity: number }
  | { type: "start-research"; planetId: string; technology: TechnologyId }
  | { type: "cancel-job"; planetId: string; jobId: string }
  | { type: "repair-fleet"; planetId: string; fleetIds: string[] }
  | { type: "career-action"; planetId: string; action: GameAction };
export interface EmpireCommand { commandId: string; expectedEmpireRevision: number; action: EmpireAction }
export interface EmpireSnapshot { state: EmpireState; serverTime: number }
export interface EmpireReply extends EmpireSnapshot {
  receipt: { commandId: string; pilotId: string; revision: number }; duplicate: boolean;
}
export type EmpireSession = GuildSession;
export interface EmpirePilot { id: string; name: string; merit: number; successfulOperations: number; empire: EmpireState }
export interface WorldState {
  schemaVersion: 3; rulesVersion: "planet-base-v3"; revision: number; pilots: EmpirePilot[];
  operation: { id: number; phase: "preparing" | "complete"; slots: Record<GuildRole, GuildSlot>; awards: { pilotId: string; amount: number }[] };
}
