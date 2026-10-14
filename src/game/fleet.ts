import { ROSTER, SHIPS, SUPPORTS } from "./content.ts";
import type { Approach, CombatUnit, ModuleId, Support, FleetContext } from "./types.ts";
export function validateFleet(
  ids: string[],
  support: Support,
  approach: Approach,
  context?: FleetContext,
): string[] {
  const errors: string[] = [];
  if (!Array.isArray(ids) || !ids.length)
    return ["함선을 한 척 이상 편성하세요."];
  if (ids.length > 6) errors.push("최대 6척까지 편성할 수 있습니다.");
  if (new Set(ids).size !== ids.length)
    errors.push("같은 함선을 중복 편성할 수 없습니다.");
  const entries = ids.map((id) => (context?.roster || ROSTER).find((r) => r.id === id));
  if (entries.some((r) => !r)) errors.push("보유하지 않은 함선입니다.");
  const ships = entries.flatMap((r) =>
    r ? SHIPS.filter((s) => s.id === r.shipId) : [],
  );
  if (ships.reduce((sum, s) => sum + s.command, 0) > 12)
    errors.push("지휘 용량 12를 초과했습니다.");
  if (!SUPPORTS.some((s) => s.id === support))
    errors.push("지원 설정이 올바르지 않습니다.");
  if (!["direct", "flank"].includes(approach))
    errors.push("접근 경로가 올바르지 않습니다.");
  if (
    approach === "flank" &&
    support !== "recon" &&
    !ships.some((s) => s.role === "scout")
  )
    errors.push("우회 항로에는 정찰함 또는 정찰 지원이 필요합니다.");
  return errors;
}
export function createFleet(ids: string[], module: ModuleId, context?: FleetContext): CombatUnit[] {
  return ids
    .map((id) => {
      const roster = (context?.roster || ROSTER).find((r) => r.id === id);
      const def = SHIPS.find((s) => s.id === roster?.shipId);
      if (!def) throw new Error("Unknown ship");
      const maxHp = def.hp + (module === "bulkhead" ? 10 : 0);
      return {
        id,
        shipId: def.id,
        name: def.name,
        role: def.role,
        kind: "mobile" as const,
        maxHp,
        hp: maxHp,
        armor: def.armor,
        attack: def.attack,
        cargoCapacity: def.cargo + (module === "cargo" ? 1 : 0),
        cargo: 0,
        repairCharges: def.role === "support" ? 2 : 0,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id, "en"));
}
