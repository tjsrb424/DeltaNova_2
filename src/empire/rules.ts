import { ROSTER } from "../game/content.ts";
import { initialState } from "../game/state.ts";
import type { EmpireState, EmpireAction } from "./types.ts";
import type { PlanetState, Resources, TimedJob } from "./types.ts";
import { GuildError } from "../guild/types.ts";
import { RESOURCE_IDS, RESOURCE_NAMES, FACILITY_NAMES, TECHNOLOGY_NAMES, SHIP_BUILD, facilityQuote, researchQuote, DEFENSE_QUOTE, scaledCost } from "./content.ts";
import { capacities, productionRates, power, facilitySpace } from "./economy.ts";
export function empireFail(code: string, message: string): never { throw new GuildError(400,code,message); }
export function ownedPlanet(state: EmpireState, id: string): PlanetState {
  const p=state.planets.find(p=>p.id===id);
  if(!p) empireFail("PLANET_UNKNOWN","소유한 행성을 선택하세요.");
  return p!;
}
export function spendResources(p: PlanetState, cost: Resources) {
  for(const key of RESOURCE_IDS) if(p.resources[key]<cost[key]) empireFail("RESOURCE_SHORT",RESOURCE_NAMES[key]+"이 부족합니다.");
  for(const key of RESOURCE_IDS) p.resources[key]-=cost[key];
}
export function initialEmpire(pilotId: string, now: number): EmpireState {
  const id = pilotId + "-prime";
  return {
    revision: 0, homePlanetId: id, settledAt: now,
    technologies: { industry: 0, propulsion: 0, intelligence: 0, defense: 0 },
    researchJob: null, career: initialState(), careerOriginPlanetId: null, careerFleetContext: null, events: [],
    planets: [{
      id, name: "노바 프라임", kind: "home", resources: { alloy: 120, crystal: 80, fuel: 80 },
      facilities: { alloyMine: 1, crystalMine: 1, fuelRefinery: 1, powerPlant: 1, shipyard: 1, laboratory: 1 },
      production: { alloy: { at: now, carry: 0 }, crystal: { at: now, carry: 0 }, fuel: { at: now, carry: 0 } },
      constructionJob: null, shipJob: null, defenses: 0,
      ships: ROSTER.map(r => ({ ...r, planetId: id, wear: 0, status: "docked" })),
    }],
  };
}
function jobs(s: EmpireState): TimedJob[] { return [...s.planets.flatMap(p=>[p.constructionJob,p.shipJob]),s.researchJob].filter((j):j is TimedJob=>j!==null); }
function title(job: TimedJob) {
  if(job.kind==="facility") return FACILITY_NAMES[job.target as keyof typeof FACILITY_NAMES]+" Lv."+job.level;
  if(job.kind==="research") return TECHNOLOGY_NAMES[job.target as keyof typeof TECHNOLOGY_NAMES]+" Lv."+job.level;
  return job.kind==="defense" ? "방어 포대 1기" : "함선 건조 "+job.quantity+"척";
}
function finish(s: EmpireState,j: TimedJob) {
  const p=ownedPlanet(s,j.planetId);
  if(j.kind==="research") { s.technologies[j.target as keyof EmpireState["technologies"]]=j.level; s.researchJob=null; }
  else if(j.kind==="ships") {
    for(let i=0;i<j.quantity;i++) p.ships.push({id:j.id+"-ship-"+i,shipId:j.target,planetId:p.id,wear:0,status:"docked"});
    p.shipJob=null;
  } else {
    if(j.kind==="facility") p.facilities[j.target as keyof PlanetState["facilities"]]=j.level;
    else p.defenses++;
    p.constructionJob=null;
  }
  s.events.push({id:j.id,at:j.completesAt,planetId:p.id,kind:"completed",title:title(j)+" 완료"});
  s.events=s.events.slice(-50);
}
export function projectEmpire(previous: EmpireState, now: number): EmpireState {
  if(!Number.isSafeInteger(now)||now<0) empireFail("TIME_INVALID","서버 시각을 확인할 수 없습니다.");
  const s=structuredClone(previous);
  if(now<s.settledAt) return s;
  const budgets=new Map(s.planets.map(p=>[p.id,{alloy:480,crystal:480,fuel:480}]));
  function accrue(at: number) {
    for(const p of s.planets) {
      const rate=productionRates(p,s.technologies),cap=capacities(p),budget=budgets.get(p.id)!;
      for(const key of RESOURCE_IDS) {
        const clock=p.production[key],elapsed=Math.max(0,Math.floor((at-clock.at)/60000)),credit=Math.min(budget[key],elapsed);
        if(elapsed>0) {
          const numerator=credit>0 ? clock.carry+credit*60000*rate[key] : 0;
          p.resources[key]=Math.min(cap[key],p.resources[key]+Math.max(0,Math.floor(numerator/60000)));
          clock.carry=credit===elapsed ? numerator%60000 : 0;
          clock.at+=elapsed*60000; budget[key]-=credit;
        }
        if(p.resources[key]===cap[key]) clock.carry=-Math.max(0,at-clock.at)*rate[key];
      }
    }
  }
  for(const j of jobs(s).filter(j=>j.completesAt<=now).sort((a,b)=>a.completesAt-b.completesAt||a.id.localeCompare(b.id,"en"))) {
    accrue(j.completesAt);
    const rates=s.planets.map(p=>productionRates(p,s.technologies));
    finish(s,j);
    s.planets.forEach((p,i)=>{
      const next=productionRates(p,s.technologies);
      for(const key of RESOURCE_IDS) p.production[key].carry+=(rates[i][key]-next[key])*Math.max(0,j.completesAt-p.production[key].at);
    });
  }
  accrue(now); s.settledAt=now; return s;
}
export function applyEmpireAction(previous: EmpireState, action: EmpireAction, now: number, jobId: string): EmpireState {
  const s=projectEmpire(previous,now),at=Math.max(now,s.settledAt),p=ownedPlanet(s,action.planetId);
  s.revision++;
  if(action.type==="collect-production") return s;
  if(action.type==="cancel-job") {
    const j=jobs(s).find(j=>j.id===action.jobId&&j.planetId===p.id);
    if(!j) empireFail("JOB_UNKNOWN","진행 중인 작업을 확인하세요. 완료된 작업은 취소할 수 없습니다.");
    const refund=scaledCost(j!.cost,0.8),cap=capacities(p);
    for(const key of RESOURCE_IDS) {
      refund[key]=Math.floor(refund[key]);
      if(p.resources[key]+refund[key]>cap[key]) empireFail("REFUND_CAPACITY","환불 받을 "+RESOURCE_NAMES[key]+" 저장 공간이 부족합니다.");
    }
    for(const key of RESOURCE_IDS) p.resources[key]+=refund[key];
    if(j!.kind==="research") s.researchJob=null;
    else if(j!.kind==="ships") p.shipJob=null;
    else p.constructionJob=null;
    s.events.push({id:j!.id,at,planetId:p.id,kind:"cancelled",title:title(j!)+" 취소 · 80% 반환"}); s.events=s.events.slice(-50);
    return s;
  }
  if(action.type==="repair-fleet"||action.type==="career-action") empireFail("CAREER_UNAVAILABLE","개인 작전 연결을 확인하세요.");
  if(power(p).demanded>power(p).supplied&&!(action.type==="upgrade-facility"&&action.facility==="powerPlant")) empireFail("POWER_SHORT","전력이 부족합니다. 발전소를 증설하세요.");
  if(jobs(s).some(j=>j.id===jobId)||s.events.some(e=>e.id===jobId)) empireFail("JOB_REUSED","작업 ID를 다시 사용할 수 없습니다.");
  const make=(kind:TimedJob["kind"],target:string,quantity:number,level:number,quote:{cost:Resources;seconds:number}):TimedJob=>{
    spendResources(p,quote.cost);
    return {id:jobId,kind,target,quantity,level,planetId:p.id,startedAt:at,completesAt:at+quote.seconds*1000,cost:structuredClone(quote.cost)};
  };
  if(action.type==="build-ships") {
    const def=SHIP_BUILD[action.shipId];
    if(!def||!Number.isSafeInteger(action.quantity)||action.quantity<1||action.quantity>20) empireFail("BUILD_INVALID","함종과 건조 수량 1~20을 확인하세요.");
    if(p.shipJob) empireFail("SHIPYARD_BUSY","이 행성의 함선 건조가 진행 중입니다.");
    if(p.facilities.shipyard<def.shipyard||(def.technology&&s.technologies[def.technology]<(def.level||1))) empireFail("TECH_REQUIRED","필요한 조선소 수준과 연구를 먼저 확보하세요.");
    p.shipJob=make("ships",action.shipId,action.quantity,0,{cost:scaledCost(def.cost,action.quantity),seconds:def.seconds*action.quantity});
  } else if(action.type==="start-research") {
    if(!(action.technology in s.technologies)) empireFail("TECH_INVALID","연구 항목을 확인하세요.");
    const level=s.technologies[action.technology]+1;
    if(s.researchJob) empireFail("RESEARCH_BUSY","제국 연구가 진행 중입니다.");
    if(level>3||p.facilities.laboratory<level) empireFail("LAB_REQUIRED","연구소 수준을 올리거나 최대 연구 수준을 확인하세요.");
    s.researchJob=make("research",action.technology,1,level,researchQuote(level));
  } else {
    if(p.constructionJob) empireFail("CONSTRUCTION_BUSY","이 행성의 건설이 진행 중입니다.");
    const space=facilitySpace(p);
    if(space.used+space.reserved>=space.capacity) empireFail("SPACE_SHORT","시설 공간이 부족합니다.");
    if(action.type==="build-defense") p.constructionJob=make("defense","battery",1,0,DEFENSE_QUOTE);
    else {
      const level=p.facilities[action.facility];
      if(!level||level>=5) empireFail("FACILITY_MAX","시설 항목과 최대 레벨5를 확인하세요.");
      p.constructionJob=make("facility",action.facility,1,level+1,facilityQuote(action.facility,level));
    }
  }
  return s;
}
