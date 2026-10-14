import type { EmpireState, EmpireAction, FleetContext, PlanetState } from "./types.ts";
import { SHIPS } from "../game/content.ts";
import { validateFleet } from "../game/fleet.ts";
import { reduceGame } from "../game/state.ts";
import { capacities } from "./economy.ts";
import { projectEmpire, ownedPlanet, spendResources, empireFail } from "./rules.ts";
export function fleetContext(planet: PlanetState): FleetContext { return {roster:planet.ships.map(sh=>({id:sh.id,shipId:sh.shipId}))}; }
export function applyEmpireCareer(previous: EmpireState,action: EmpireAction,now: number): EmpireState {
  const s=projectEmpire(previous,now),p=ownedPlanet(s,action.planetId); s.revision++;
  if(action.type==="repair-fleet") {
    if(!action.fleetIds.length||new Set(action.fleetIds).size!==action.fleetIds.length) empireFail("FLEET_INVALID","정비할 함선을 확인하세요.");
    const ships=action.fleetIds.map(id=>p.ships.find(sh=>sh.id===id));
    if(ships.some(sh=>!sh||sh.status!=="docked")) empireFail("FLEET_DEPLOYED","현재 행성에 도킹한 함선만 정비할 수 있습니다.");
    spendResources(p,{alloy:ships.reduce((n,sh)=>n+Math.ceil(sh!.wear/10),0),crystal:0,fuel:0});
    ships.forEach(sh=>sh!.wear=0); return s;
  }
  if(action.type!=="career-action") empireFail("CAREER_INVALID","개인 작전 명령을 확인하세요.");
  const command=action.action,previousPhase=s.career.operation?.phase;
  if(command.type==="launch") {
    const context=fleetContext(p),errors=validateFleet(command.fleetIds,command.support,command.approach,context);
    if(errors.length) empireFail("FLEET_INVALID",errors[0]);
    if(s.career.operation) empireFail("FLEET_DEPLOYED","진행 중인 개인 작전을 먼저 마무리하세요.");
    const ships=command.fleetIds.map(id=>p.ships.find(sh=>sh.id===id)!);
    if(ships.some(sh=>sh.status!=="docked"||sh.wear>0)) empireFail("REPAIR_REQUIRED","현지의 정비 완료 함선만 출격할 수 있습니다.");
    const fuel=ships.reduce((n,sh)=>n+SHIPS.find(def=>def.id===sh.shipId)!.command,command.support==="none"?0:2);
    spendResources(p,{alloy:0,crystal:0,fuel});
    ships.forEach(sh=>sh.status="deployed");
    s.careerOriginPlanetId=p.id;
    s.careerFleetContext={roster:ships.map(sh=>({id:sh.id,shipId:sh.shipId}))};
  }
  if(command.type==="unlock-module"&&!s.career.profile.unlocked.includes(command.module)) spendResources(p,{alloy:40,crystal:0,fuel:0});
  const next=reduceGame(s.career,command,s.careerFleetContext||undefined);
  if(next.message) empireFail("CAREER_REJECTED",next.message);
  if(next.operation?.phase==="result"&&previousPhase!=="result") {
    const origin=ownedPlanet(s,s.careerOriginPlanetId!);
    origin.resources.alloy=Math.min(capacities(origin).alloy,origin.resources.alloy+next.operation.recovered*4);
    for(const u of next.operation.fleet) {
      const ship=origin.ships.find(sh=>sh.id===u.id); if(!ship) empireFail("FLEET_MISSING","귀환 함선의 원 재고를 확인할 수 없습니다.");
      ship!.status="docked"; ship!.wear=u.maxHp-u.hp;
    }
  }
  s.career=next;
  if(!next.operation) { s.careerOriginPlanetId=null; s.careerFleetContext=null; }
  return s;
}
