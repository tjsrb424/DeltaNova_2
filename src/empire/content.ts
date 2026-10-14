import type { FacilityId, Resources, TechnologyId } from "./types.ts";
export const RESOURCE_IDS = ["alloy", "crystal", "fuel"] as const;
export const RESOURCE_NAMES = { alloy: "합금", crystal: "결정", fuel: "연료" };
export const FACILITY_IDS: FacilityId[] = ["alloyMine", "crystalMine", "fuelRefinery", "powerPlant", "shipyard", "laboratory"];
export const FACILITY_NAMES: Record<FacilityId, string> = { alloyMine: "합금 광산", crystalMine: "결정 채굴소", fuelRefinery: "연료 합성소", powerPlant: "발전소", shipyard: "궤도 조선소", laboratory: "연구소" };
export const TECHNOLOGY_IDS: TechnologyId[] = ["industry", "propulsion", "intelligence", "defense"];
export const TECHNOLOGY_NAMES: Record<TechnologyId, string> = { industry: "산업 기술", propulsion: "추진 기술", intelligence: "정보 기술", defense: "방어 기술" };
export const TECHNOLOGY_EFFECTS: Record<TechnologyId, string> = { industry: "수준당 모든 자원 기본 생산 +1/분 · 정비함/항모 건조 해금", propulsion: "후속 성계 이동의 선행 기술", intelligence: "교란함 건조 해금 · 정찰 해상도는 성계 단계에서 연결", defense: "호위함/공성함 건조 해금" };
export const SHIP_BUILD: Record<string, { cost: Resources; seconds: number; shipyard: number; technology?: TechnologyId; level?: number }> = {
  scout: { cost: { alloy: 20, crystal: 10, fuel: 5 }, seconds: 20, shipyard: 1 },
  salvage: { cost: { alloy: 30, crystal: 10, fuel: 5 }, seconds: 30, shipyard: 1 },
  striker: { cost: { alloy: 40, crystal: 20, fuel: 10 }, seconds: 40, shipyard: 1 },
  support: { cost: { alloy: 40, crystal: 30, fuel: 10 }, seconds: 45, shipyard: 1, technology: "industry", level: 1 },
  jammer: { cost: { alloy: 40, crystal: 40, fuel: 15 }, seconds: 50, shipyard: 1, technology: "intelligence", level: 1 },
  guardian: { cost: { alloy: 70, crystal: 30, fuel: 15 }, seconds: 60, shipyard: 2, technology: "defense", level: 1 },
  siege: { cost: { alloy: 80, crystal: 30, fuel: 20 }, seconds: 70, shipyard: 2, technology: "defense", level: 1 },
  carrier: { cost: { alloy: 120, crystal: 80, fuel: 30 }, seconds: 100, shipyard: 3, technology: "industry", level: 2 },
};
export function facilityQuote(facility: FacilityId, current: number) {
  const advanced = facility === "shipyard" || facility === "laboratory";
  return { cost: { alloy: (advanced ? 60 : 40) * current, crystal: (advanced ? 30 : 10) * current, fuel: 10 * current }, seconds: (advanced ? 90 : 60) * current };
}
export function researchQuote(next: number) { return { cost: { alloy: 40 * next, crystal: 30 * next, fuel: 10 * next }, seconds: 90 * next }; }
export const DEFENSE_QUOTE = { cost: { alloy: 50, crystal: 20, fuel: 5 }, seconds: 60 };
export function scaledCost(cost: Resources, quantity: number): Resources { return { alloy: cost.alloy * quantity, crystal: cost.crystal * quantity, fuel: cost.fuel * quantity }; }
