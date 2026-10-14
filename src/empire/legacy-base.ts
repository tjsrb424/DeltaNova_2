import type { BaseState, BaseAction } from "../base/types.ts";
import type { EmpireState, EmpireAction } from "./types.ts";
import { ownedPlanet, applyEmpireAction } from "./rules.ts";
export function legacyBaseView(s: EmpireState, planetId=s.homePlanetId): BaseState {
  const p=ownedPlanet(s,planetId);
  return {resources:{alloy:p.resources.alloy,supply:p.resources.fuel},facilities:{forge:p.facilities.alloyMine,reactor:p.facilities.fuelRefinery},
    lastProducedAt:Math.min(p.production.alloy.at,p.production.fuel.at),
    productionCarry:{alloy:p.production.alloy.carry,supply:p.production.fuel.carry},
    wear:Object.fromEntries(s.planets.flatMap(p=>p.ships.map(sh=>[sh.id,sh.wear]))),career:structuredClone(s.career)};
}
export function applyLegacyBaseAction(s: EmpireState,a: BaseAction,now: number,id: string): EmpireState {
  const planetId=s.homePlanetId;
  if(a.type==="upgrade-facility") return applyEmpireAction(s,{...a,planetId,facility:a.facility==="forge"?"alloyMine":"fuelRefinery"},now,id);
  return applyEmpireAction(s,{...a,planetId} as EmpireAction,now,id);
}
