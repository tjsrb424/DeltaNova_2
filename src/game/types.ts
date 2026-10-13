export type Role = 'striker' | 'guardian' | 'siege' | 'support' | 'salvage' | 'scout' | 'jammer' | 'carrier' | 'enemy';
export type Support = 'none' | 'recon' | 'jam' | 'supply';
export type Approach = 'direct' | 'flank';
export type ModuleId = 'none' | 'bulkhead' | 'cargo';
export interface ShipDefinition { id: string; name: string; label: string; role: Role; command: number; hp: number; armor: number; attack: number; cargo: number; description: string; color: string }
export interface CombatUnit { id: string; shipId: string; name: string; role: Role; kind: 'mobile' | 'facility'; maxHp: number; hp: number; armor: number; attack: number; cargoCapacity: number; cargo: number; repairCharges: number }
export interface MissionDefinition { id: string; title: string; tag: string; sector: string; description: string; difficulty: string; enemies: CombatUnit[]; bonusEnemies: CombatUnit[]; loot: number; bonusLoot: number; maxRounds: number; x: number; y: number }
export interface BattleEvent { round: number; type: 'damage' | 'guard' | 'repair' | 'jam' | 'drone' | 'disable' | 'cargo'; actor?: string; target?: string; amount: number; text: string }
export interface BattleOptions { support: Support; stage: 'primary' | 'bonus'; maxRounds: number }
export interface BattleResult { fleet: CombatUnit[]; enemies: CombatUnit[]; outcome: 'victory' | 'repelled' | 'destroyed'; rounds: number; events: BattleEvent[]; cargoLost: number }
export interface Operation { id: number; missionId: string; support: Support; approach: Approach; module: ModuleId; phase: 'checkpoint' | 'result'; fleet: CombatUnit[]; battles: BattleResult[]; cargoOffered: number; cargoUnloaded: number; cargoLost: number; recovered: number; gained: number; reason: string }
export interface Profile { research: number; best: Record<string, number>; unlocked: ModuleId[]; active: ModuleId; totalSorties: number }
export interface GameState { schemaVersion: 1; rulesVersion: 'command-center-v1'; profile: Profile; operation: Operation | null; nextOperationId: number; message: string | null }
export type GameAction = { type: 'launch'; missionId: string; fleetIds: string[]; support: Support; approach: Approach } | { type: 'advance' | 'return' | 'dismiss' | 'clear-message' } | { type: 'unlock-module' | 'activate-module'; module: ModuleId };
