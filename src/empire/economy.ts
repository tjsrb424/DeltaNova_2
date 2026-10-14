import type { EmpireState, PlanetState, Resources } from "./types.ts";
export function capacities(p: PlanetState): Resources {
  return { alloy: 300 + 100 * (p.facilities.alloyMine - 1), crystal: 200 + 100 * (p.facilities.crystalMine - 1), fuel: 150 + 50 * (p.facilities.fuelRefinery - 1) };
}
export function power(p: PlanetState) {
  return { supplied: 60 * p.facilities.powerPlant, demanded: 6 * p.facilities.alloyMine + 4 * p.facilities.crystalMine + 6 * p.facilities.fuelRefinery + 8 + 6 + 2 * p.defenses };
}
export function productionRates(p: PlanetState, technologies: EmpireState["technologies"]): Resources {
  const watts = power(p), factor = Math.min(1, watts.supplied / watts.demanded), bonus = technologies.industry;
  return { alloy: Math.floor((6 * p.facilities.alloyMine + bonus) * factor), crystal: Math.floor((4 * p.facilities.crystalMine + bonus) * factor), fuel: Math.floor((4 * p.facilities.fuelRefinery + bonus) * factor) };
}
export function facilitySpace(p: PlanetState) {
  return { used: Object.values(p.facilities).reduce((a,b) => a+b,0) + p.defenses, reserved: p.constructionJob ? 1 : 0, capacity: 30 };
}
