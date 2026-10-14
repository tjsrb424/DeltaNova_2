import type { BattleResult, CombatUnit, FleetContext, ModuleId } from "../game/types.ts";
import type { BaseState, BaseAction } from "../base/types.ts";
export type GuildRole = "recon" | "jam" | "supply" | "breach";
export type PrepRole = Exclude<GuildRole, "breach">;
export interface GuildPilot {
  id: string;
  name: string;
  merit: number;
  successfulOperations: number;
  base: BaseState;
  fleetContext?: FleetContext;
}
export interface GuildReport {
  pilotId: string;
  role: GuildRole;
  success: boolean;
  fleet: CombatUnit[];
  battles: BattleResult[];
  effects: Partial<Record<PrepRole, string>>;
  contribution: number;
  personalMerit: number;
  supplyHealed: number;
  summary: string;
  module?: ModuleId;
  fleetContext?: FleetContext;
}
export interface GuildSlot {
  ownerId: string | null;
  leaseUntil: number;
  completed: boolean;
  attempts: number;
  report: GuildReport | null;
}
export interface GuildState {
  schemaVersion: 2;
  rulesVersion: "base-operations-v2";
  revision: number;
  pilots: GuildPilot[];
  operation: {
    id: number;
    phase: "preparing" | "complete";
    slots: Record<GuildRole, GuildSlot>;
    awards: { pilotId: string; amount: number }[];
  };
}
export type GuildAction =
  | { type: "claim"; role: GuildRole }
  | { type: "release"; role: GuildRole }
  | { type: "contribute"; role: GuildRole; fleetIds: string[]; planetId?: string }
  | { type: "next-operation" }
  | BaseAction;
export type LegacyGuildState = Omit<
  GuildState,
  "schemaVersion" | "rulesVersion" | "pilots"
> & {
  schemaVersion: 1;
  rulesVersion: "guild-v1";
  pilots: Omit<GuildPilot, "base">[];
};
export interface GuildCommand {
  commandId: string;
  expectedRevision: number;
  operationId: number;
  action: GuildAction;
}
export interface GuildReply {
  state: GuildState;
  receipt: { commandId: string; pilotId: string; revision: number };
  duplicate: boolean;
}
export interface GuildSnapshot {
  state: GuildState;
  serverTime: number;
}
export interface GuildSession {
  pilotId: string;
  token: string;
}
export class GuildError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "GuildError";
    this.status = status;
    this.code = code;
  }
}
