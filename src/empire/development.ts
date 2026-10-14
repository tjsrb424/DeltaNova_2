import type { EmpireState, FacilityId, PlanetState, Resources, TechnologyId, TimedJob } from "./types.ts";
import { FACILITY_NAMES, SHIP_BUILD, TECHNOLOGY_NAMES, facilityQuote, researchQuote } from "./content.ts";
import { capacities, power, productionRates, facilitySpace } from "./economy.ts";
import { SHIPS } from "../game/content.ts";

export function developmentPreview(state: EmpireState, planet: PlanetState, jobs: TimedJob[] = [planet.constructionJob, state.researchJob].filter((j): j is TimedJob => !!j)) {
  const next = { ...planet, facilities: { ...planet.facilities } }, technologies = { ...state.technologies };
  for (const job of jobs) {
    if (job.kind === "research") technologies[job.target as TechnologyId] = job.level;
    else if (job.planetId === planet.id && job.kind === "facility") next.facilities[job.target as FacilityId] = job.level;
    else if (job.planetId === planet.id && job.kind === "defense") next.defenses += job.quantity;
  }
  return { planet: next, technologies, rates: productionRates(next, technologies), cap: capacities(next), power: power(next) };
}
export function completionEffect(state: EmpireState, planet: PlanetState, job: TimedJob) {
  const next = developmentPreview(state, planet, [job]), current = productionRates(planet, state.technologies);
  if (job.kind === "ships") return { title: "보유 함선", value: planet.ships.length + " → " + (planet.ships.length + job.quantity) + "척", detail: SHIPS.find(s => s.id === job.target)!.name + " " + job.quantity + "척 건조" };
  if (job.kind === "defense") return { title: "현지 방어망", value: planet.defenses + " → " + next.planet.defenses + "기", detail: "전력 수요 +" + 2 * job.quantity };
  if (job.kind === "research") {
    const tech = job.target as TechnologyId;
    const ships = SHIPS.filter(s => SHIP_BUILD[s.id].technology === tech && (SHIP_BUILD[s.id].level || 1) > state.technologies[tech] && (SHIP_BUILD[s.id].level || 1) <= job.level);
    return { title: tech === "industry" ? "기본 생산 증가" : "연구 완료 효과", value: tech === "industry" ? "합금 +" + (next.rates.alloy - current.alloy) + " · 결정 +" + (next.rates.crystal - current.crystal) + " · 연료 +" + (next.rates.fuel - current.fuel) : ships.length ? ships.map(s => s.name).join(" · ") : tech === "propulsion" ? "추진 기술 기반 확보" : "Lv." + state.technologies[tech] + " → " + job.level, detail: TECHNOLOGY_NAMES[tech] + " Lv." + state.technologies[tech] + " → " + job.level + (ships.length ? " · 추가 건조의 기술 요건 충족" : tech === "propulsion" ? " · 후속 성계 이동의 선행 기술" : "") };
  }
  const facility = job.target as FacilityId, resource = facility === "alloyMine" ? "alloy" : facility === "crystalMine" ? "crystal" : facility === "fuelRefinery" ? "fuel" : null;
  return { title: resource ? "생산량 변화" : facility === "powerPlant" ? "전력 공급" : "시설 수준", value: resource ? current[resource] + " → " + next.rates[resource] + " /분" : facility === "powerPlant" ? power(planet).supplied + " → " + next.power.supplied : "Lv." + planet.facilities[facility] + " → " + job.level, detail: FACILITY_NAMES[facility] + " Lv." + planet.facilities[facility] + " → " + job.level };
}
export function fleetReadiness(p: PlanetState) {
  const damaged = p.ships.filter(s => s.status === "docked" && s.wear > 0);
  return { damaged, repairCost: damaged.reduce((n, s) => n + Math.ceil(s.wear / 10), 0), ready: p.ships.filter(s => s.status === "docked" && s.wear === 0).length, deployed: p.ships.filter(s => s.status === "deployed").length };
}
export interface DevelopmentStep { id: string; label: string; cost: Resources; mode: "construction" | "research" | "shipyard"; target: string; pending?: TimedJob }
export function developmentPath(state: EmpireState, planet: PlanetState, shipId: string) {
  const definition = SHIP_BUILD[shipId], steps: DevelopmentStep[] = [], cost = { alloy: 0, crystal: 0, fuel: 0 };
  const tech = definition.technology, requiredTech = definition.level || 0;
  const research = tech && state.researchJob?.target === tech ? state.researchJob : null;
  const futureTech = tech ? Math.max(state.technologies[tech], research?.level || 0) : 0;
  const neededLab = requiredTech > futureTech ? requiredTech : 0;
  function add(step: DevelopmentStep) {
    steps.push(step);
    if (!step.pending) { cost.alloy += step.cost.alloy; cost.crystal += step.cost.crystal; cost.fuel += step.cost.fuel; }
  }
  function upgrades(facility: FacilityId, target: number) {
    const pending = planet.constructionJob?.kind === "facility" && planet.constructionJob.target === facility ? planet.constructionJob : null;
    if (pending && planet.facilities[facility] < target) add({ id: pending.id, label: FACILITY_NAMES[facility] + " Lv." + pending.level, cost: pending.cost, mode: "construction", target: facility, pending });
    for (let level = Math.max(planet.facilities[facility], pending?.level || 0); level < target; level++) add({ id: facility + level, label: FACILITY_NAMES[facility] + " Lv." + level + " → " + (level + 1), cost: facilityQuote(facility, level).cost, mode: "construction", target: facility });
  }
  const projected = developmentPreview(state, planet).planet;
  const planned = { ...projected, constructionJob: null, facilities: { ...projected.facilities, laboratory: Math.max(projected.facilities.laboratory, neededLab), shipyard: Math.max(projected.facilities.shipyard, definition.shipyard) } };
  const neededPower = Math.ceil(power(planned).demanded / 60);
  upgrades("powerPlant", neededPower);
  planned.facilities.powerPlant = Math.max(planned.facilities.powerPlant, neededPower);
  const plannedSpace = facilitySpace(planned), currentPower = power(planet);
  upgrades("laboratory", neededLab);
  if (research && tech && state.technologies[tech] < requiredTech) add({ id: research.id, label: TECHNOLOGY_NAMES[tech] + " Lv." + research.level, cost: research.cost, mode: "research", target: tech, pending: research });
  if (tech) for (let level = futureTech; level < requiredTech; level++) add({ id: tech + level, label: TECHNOLOGY_NAMES[tech] + " Lv." + level + " → " + (level + 1), cost: researchQuote(level + 1).cost, mode: "research", target: tech });
  upgrades("shipyard", definition.shipyard);
  add({ id: "ship", label: SHIPS.find(s => s.id === shipId)!.name + " 1척 건조", cost: definition.cost, mode: "shipyard", target: shipId });
  return { steps, cost, neededLab, requiredTech, definition, research, futureTech, neededPower, powerDeficit: Math.max(0, currentPower.demanded - currentPower.supplied), plannedSpace };
}
