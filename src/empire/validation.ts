import type { EmpireState, EmpireCommand, EmpireAction } from "./types.ts";
import { GuildError } from "../guild/types.ts";
import { SHIPS, MISSIONS, MODULES, SUPPORTS } from "../game/content.ts";
import { decodeSave } from "../storage/save.ts";
import { RESOURCE_IDS, FACILITY_IDS, TECHNOLOGY_IDS, SHIP_BUILD, facilityQuote, researchQuote, DEFENSE_QUOTE, scaledCost } from "./content.ts";
import { capacities, facilitySpace } from "./economy.ts";
function check(v: unknown): asserts v { if(!v) throw new GuildError(400,"EMPIRE_INVALID","행성 명령 또는 저장 형식을 확인할 수 없습니다."); }
function object(v: unknown): Record<string,unknown> { check(v!==null&&typeof v==="object"&&!Array.isArray(v)); return v as Record<string,unknown>; }
function exact(v: Record<string,unknown>,fields: string[]) { check(Object.keys(v).length===fields.length&&Object.keys(v).every(k=>fields.includes(k))); }
function integer(v: unknown,max=Number.MAX_SAFE_INTEGER) { check(typeof v==="number"&&Number.isSafeInteger(v)&&v>=0&&v<=max); }
function id(v: unknown) { check(typeof v==="string"&&v.length>0&&v.length<=160&&/^[\w:-]+$/.test(v)); }
function fleetIds(v: unknown) { check(Array.isArray(v)&&v.length>0&&v.length<=256&&new Set(v).size===v.length); v.forEach(id); }
export function parseEmpireAction(value: unknown): EmpireAction {
  const a=object(value); id(a.planetId);
  switch(a.type) {
    case "collect-production": case "build-defense": exact(a,["type","planetId"]); break;
    case "upgrade-facility": exact(a,["type","planetId","facility"]); check(FACILITY_IDS.includes(a.facility as never)); break;
    case "build-ships": exact(a,["type","planetId","shipId","quantity"]); check(Object.hasOwn(SHIP_BUILD,a.shipId as string)); integer(a.quantity,20); check(Number(a.quantity)>0); break;
    case "start-research": exact(a,["type","planetId","technology"]); check(TECHNOLOGY_IDS.includes(a.technology as never)); break;
    case "cancel-job": exact(a,["type","planetId","jobId"]); id(a.jobId); break;
    case "repair-fleet": exact(a,["type","planetId","fleetIds"]); fleetIds(a.fleetIds); break;
    case "career-action": {
      exact(a,["type","planetId","action"]); const c=object(a.action);
      if(c.type==="launch") {
        exact(c,["type","missionId","fleetIds","support","approach"]); check(MISSIONS.some(m=>m.id===c.missionId));
        fleetIds(c.fleetIds); check(SUPPORTS.some(s=>s.id===c.support)); check(c.approach==="direct"||c.approach==="flank");
      } else if(c.type==="unlock-module"||c.type==="activate-module") {
        exact(c,["type","module"]); check(c.module==="none"||MODULES.some(m=>m.id===c.module));
      } else { exact(c,["type"]); check(["advance","return","dismiss","clear-message"].includes(c.type as string)); }
      break;
    }
    default: check(false);
  }
  return structuredClone(a) as unknown as EmpireAction;
}
export function parseEmpireCommand(value: unknown): EmpireCommand {
  const c=object(value); exact(c,["commandId","expectedEmpireRevision","action"]);
  check(typeof c.commandId==="string"&&/^[\w-]{1,64}$/.test(c.commandId)); integer(c.expectedEmpireRevision);
  return {commandId:c.commandId as string,expectedEmpireRevision:c.expectedEmpireRevision as number,action:parseEmpireAction(c.action)};
}
export function validateEmpire(value: unknown): EmpireState {
  const root=object(value); exact(root,["revision","homePlanetId","planets","technologies","researchJob","career","careerOriginPlanetId","careerFleetContext","events","settledAt"]);
  integer(root.revision); integer(root.settledAt); id(root.homePlanetId);
  const tech=object(root.technologies); exact(tech,TECHNOLOGY_IDS); TECHNOLOGY_IDS.forEach(k=>integer(tech[k],3));
  check(Array.isArray(root.planets)&&root.planets.length>0&&root.planets.length<=1000);
  const state=root as unknown as EmpireState,planetIds=new Set<string>(),shipIds=new Set<string>(),jobIds=new Set<string>();
  function job(value: unknown,planetId: string,lane: "construction"|"ships"|"research") {
    if(value===null) return;
    const j=object(value); exact(j,["id","kind","planetId","target","quantity","level","startedAt","completesAt","cost"]);
    id(j.id); check(!jobIds.has(j.id as string)); jobIds.add(j.id as string); check(j.planetId===planetId);
    integer(j.quantity,20); integer(j.level,5); integer(j.startedAt); integer(j.completesAt);
    check(Number(j.startedAt)<=state.settledAt&&Number(j.completesAt)>state.settledAt);
    const p=state.planets.find(p=>p.id===planetId); check(p);
    let quote:{cost:Record<string,number>;seconds:number};
    if(lane==="ships") {
      check(j.kind==="ships"&&typeof j.target==="string"&&Object.hasOwn(SHIP_BUILD,j.target)&&Number(j.quantity)>=1&&j.level===0);
      const def=SHIP_BUILD[j.target as string]; quote={cost:scaledCost(def.cost,Number(j.quantity)),seconds:def.seconds*Number(j.quantity)};
    } else if(lane==="research") {
      check(j.kind==="research"&&TECHNOLOGY_IDS.includes(j.target as never)&&j.quantity===1&&Number(j.level)>=1&&Number(j.level)<=3);
      check(Number(j.level)===Number(tech[j.target as string])+1); quote=researchQuote(Number(j.level));
    } else if(j.kind==="facility") {
      check(FACILITY_IDS.includes(j.target as never)&&j.quantity===1&&Number(j.level)===p.facilities[j.target as keyof typeof p.facilities]+1);
      quote=facilityQuote(j.target as never,Number(j.level)-1);
    } else { check(j.kind==="defense"&&j.target==="battery"&&j.quantity===1&&j.level===0); quote=DEFENSE_QUOTE; }
    const cost=object(j.cost); exact(cost,[...RESOURCE_IDS]); RESOURCE_IDS.forEach(k=>check(cost[k]===quote.cost[k]));
    check(Number(j.completesAt)-Number(j.startedAt)===quote.seconds*1000);
  }
  for(const entry of state.planets) {
    const p=object(entry); exact(p,["id","name","kind","resources","facilities","production","constructionJob","shipJob","defenses","ships"]);
    id(p.id); check(!planetIds.has(p.id as string)); planetIds.add(p.id as string);
    check(typeof p.name==="string"&&p.name.length>0&&p.name.length<=80&&(p.kind==="home"||p.kind==="colony"));
    const f=object(p.facilities); exact(f,FACILITY_IDS); FACILITY_IDS.forEach(k=>{integer(f[k],5);check(Number(f[k])>=1);});
    integer(p.defenses,30); const res=object(p.resources),clocks=object(p.production),cap=capacities(entry);
    exact(res,[...RESOURCE_IDS]); exact(clocks,[...RESOURCE_IDS]);
    for(const key of RESOURCE_IDS) {
      integer(res[key],cap[key]); const clock=object(clocks[key]); exact(clock,["at","carry"]); integer(clock.at);
      check(Number(clock.at)<=state.settledAt&&typeof clock.carry==="number"&&Number.isSafeInteger(clock.carry)&&Math.abs(clock.carry)<=3000000);
    }
    check(Array.isArray(p.ships)&&p.ships.length<=10000);
    for(const rawShip of p.ships) {
      const sh=object(rawShip); exact(sh,["id","shipId","planetId","wear","status"]); id(sh.id);
      check(!shipIds.has(sh.id as string)); shipIds.add(sh.id as string);
      const def=SHIPS.find(s=>s.id===sh.shipId); check(def&&sh.planetId===p.id&&(sh.status==="docked"||sh.status==="deployed")); integer(sh.wear,def!.hp+10);
    }
    job(p.constructionJob,entry.id,"construction"); job(p.shipJob,entry.id,"ships");
    const space=facilitySpace(entry); check(space.used+space.reserved<=space.capacity);
  }
  check(planetIds.has(state.homePlanetId)&&state.planets.filter(p=>p.kind==="home").length===1&&state.planets.find(p=>p.id===state.homePlanetId)?.kind==="home");
  if(state.researchJob!==null) { check(planetIds.has(state.researchJob.planetId)); job(state.researchJob,state.researchJob.planetId,"research"); }
  const career=decodeSave(JSON.stringify(state.career)); check(career.message===null);
  if(career.operation===null) check(state.careerOriginPlanetId===null&&state.careerFleetContext===null);
  else {
    check(typeof state.careerOriginPlanetId==="string"&&planetIds.has(state.careerOriginPlanetId)&&state.careerFleetContext!==null);
    const context=object(state.careerFleetContext); exact(context,["roster"]); check(Array.isArray(context.roster)&&context.roster.length===career.operation.fleet.length);
    const p=state.planets.find(p=>p.id===state.careerOriginPlanetId)!;
    for(const unit of career.operation.fleet) check(p.ships.some(sh=>sh.id===unit.id&&sh.shipId===unit.shipId&&sh.status===(career.operation!.phase==="checkpoint"?"deployed":"docked")));
  }
  check(Array.isArray(state.events)&&state.events.length<=50);
  for(const raw of state.events) {
    const e=object(raw); exact(e,["id","at","planetId","kind","title"]); id(e.id); integer(e.at);
    check(Number(e.at)<=state.settledAt&&planetIds.has(e.planetId as string)&&(e.kind==="completed"||e.kind==="cancelled")&&typeof e.title==="string"&&e.title.length<=200);
  }
  return structuredClone(state);
}
