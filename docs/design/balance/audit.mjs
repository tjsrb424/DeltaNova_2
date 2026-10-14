// Reproducible planning analysis; does not import or modify runtime rules or saved games.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {catalog as c, resourceCost, levelHours, total, byId} from './catalog.mjs';
const output = name => fileURLToPath(new URL(name, import.meta.url));
const fs = byId(c.facilities), rs = byId(c.researches), ss = byId(c.ships);
const fmt = value => Number(value.toFixed(2)).toLocaleString('en-US');
const costText = values => values.map(fmt).join(' / ');
const requirements = value => Object.entries(value).map(([id,l])=>`${rs.get(id)?.name ?? id} ${l}`).join(', ') || '없음';
let checks = 0;
function check(condition, message) {checks++; assert(condition, message);}
const ids = [...c.facilities,...c.researches,...c.ships,...c.defenses].map(v=>v.id);
check(new Set(ids).size===ids.length,'Duplicate content ID');
check(c.facilities.length===24 && c.researches.length===36 && c.ships.length===24 && c.defenses.length===8,'Content coverage');
for(const item of [...c.facilities,...c.researches,...c.ships,...c.defenses]) {
  const price = item.baseCost ?? item.cost;
  check(price.length===3 && price.every(v=>Number.isSafeInteger(v)&&v>=0) && total(price)>0,`Invalid cost ${item.id}`);
  for(const [id,l] of Object.entries(item.prerequisites)) check(rs.has(id)&&l>0&&l<=rs.get(id).maxLevel,`Invalid requirement ${item.id}:${id}`);
  if(item.maxLevel) {
    let previous = [0,0,0], previousTime=0;
    for(let level=1;level<=item.maxLevel;level++) {
      const cost=resourceCost(item,level), time=levelHours(item,level);
      check(cost.every((v,i)=>Number.isSafeInteger(v)&&v>=previous[i]) && total(cost)>total(previous),`Cost curve ${item.id}:${level}`);
      check(time>previousTime && Number.isFinite(time),`Time curve ${item.id}:${level}`);
      previous=cost;previousTime=time;
    }
  }
  if(item.labLevel) check(item.labLevel<=fs.get('laboratory').maxLevel,`Lab requirement ${item.id}`);
  if(item.yardLevel) check(item.yardLevel<=fs.get('shipyard').maxLevel,`Yard requirement ${item.id}`);
  if(item.foundryLevel) check(item.foundryLevel<=fs.get('defense_foundry').maxLevel,`Foundry requirement ${item.id}`);
}
const visiting = new Set(), visited = new Set();
function visit(id) {
  check(!visiting.has(id),`Research cycle ${id}`);
  if(visited.has(id)) return;
  visiting.add(id);for(const dependency of Object.keys(rs.get(id).prerequisites)) visit(dependency);
  visiting.delete(id);visited.add(id);
}
for(const research of c.researches) visit(research.id);
check(visited.size===36,'Unreachable research');
for(const item of c.researches.filter(v=>v.bonus)) check(item.bonus.perLevel*item.maxLevel<=item.bonus.cap+1e-9,`Bonus cap ${item.id}`);

const tables = [];
const reference = '추천 수치의 원본은 [catalog.mjs](catalog.mjs), 계산식·검증 도구는 [audit.mjs](audit.mjs)다. 런타임 가격이나 기존 저장을 변경하지 않는다. 비용 열은 합금 / 결정 / 연료 순서다.';
const construct = ['# 건설·방어 카탈로그 v0.1','',reference,'','시설의 다음 목표 레벨 L 비용은 `ceil(기본 비용 × 비용 성장계수^(L-1))`, 기본 시간은 `기본 시간 × 1.45^(L-1)`이다. 초기 무료 단계는 성장 점수 비용 0이다. 시설 공간은 레벨마다 표의 공간을 소비한다.','',
  '| 시설 | 분류 | 최대 레벨 | L1 기본 비용 | 비용 계수 | L1 시간(h) | 공간/레벨 | 상시 전력/레벨 | 연구 선행 | 기능 |','|---|---|---:|---|---:|---:|---:|---:|---|---|'];
for(const f of c.facilities) construct.push(`| ${f.name} | ${f.group} | ${f.maxLevel} | ${costText(f.baseCost)} | ${f.costGrowth} | ${f.baseHours} | ${f.space} | ${f.idlePowerPerLevel} | ${requirements(f.prerequisites)} | ${f.effect} |`);
construct.push('','## 방어 설비','', '함선과 별도인 현지 방어 건조 라인 1개를 추천한다. 설비 한 기는 공간 1을 차지한다. 포대는 공격 없이 상대를 무상 파괴하지 않으며, 주둔 함대와 공성의 상성 검증을 함께 진행한다.','',
  '| 설비 | 비용 | 선체/방어막 | 장갑 | 화력 | 병기 | 전력 | 제작소 | 연구 선행 | 역할 |','|---|---|---|---:|---:|---|---:|---:|---|---|');
for(const d of c.defenses) construct.push(`| ${d.name} | ${costText(d.cost)} | ${d.hp}/${d.shield} | ${d.armor} | ${d.attack} | ${d.weapon} | ${d.power} | ${d.foundryLevel} | ${requirements(d.prerequisites)} | ${d.role} |`);
tables.push(['CONSTRUCTION_CATALOG.md',construct]);
const fleet = ['# 함대 카탈로그 v0.1','',reference,'','기존 8개 함종 이름과 역할을 계승하되 아래 값은 시즌용 새 제안이다. 현재 src/game/content.ts의 수치와 같다고 해석하지 않는다. 속도는 상대 속도, 연료는 함선 1척·편도 거리 1·100% 운항의 소비량이다.','',
  '| 함종 | 단계/역할 | 크기/병기 | 비용 | HP/방어막 | 장갑 | 공격 | 속도 | 연료 | 적재 | 지휘 | 조선소 | 연구 선행 | 특성 | 약점 |','|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|---|'];
for(const s of c.ships) fleet.push(`| ${s.name} | T${s.tier} ${s.role} | ${s.size}/${s.weapon} | ${costText(s.cost)} | ${s.hp}/${s.shield} | ${s.armor} | ${s.attack} | ${s.speed} | ${s.fuel} | ${s.cargo} | ${s.command} | ${s.yardLevel} | ${requirements(s.prerequisites)} | ${s.trait} | ${s.weakness} |`);
fleet.push('','## 병기와 표적','', 'L은 경량, M은 중형, H는 대형, F는 고정 시설이다. 계수는 기본 화력의 배율이며 명중 확률이 아니다.','', '| 병기 | L | M | H | F |','|---|---:|---:|---:|---:|');
for(const [weapon,values] of Object.entries(c.targeting)) fleet.push(`| ${weapon} | ${values.L} | ${values.M} | ${values.H} | ${values.F} |`);
tables.push(['FLEET_CATALOG.md',fleet]);
const researchDoc = ['# 연구 카탈로그 v0.1','',reference,'','6개 분야 각 6개 연구다. 연구 비용은 `ceil(기본 비용 × 1.8^(목표 레벨-1))`, 기본 시간은 `기본 시간 × 1.5^(목표 레벨-1)`이다. 비용은 시작 행성에서 지불하며 기술은 제국 공통이다.','',
  '| 연구 | 분야 | 최대 레벨 | L1 비용 | L1 시간(h) | 연구소 | 선행 연구 | 효과와 상한 |','|---|---|---:|---|---:|---:|---|---|'];
for(const r of c.researches) researchDoc.push(`| ${r.name} | ${r.branch} | ${r.maxLevel} | ${costText(r.baseCost)} | ${r.baseHours} | ${r.labLevel} | ${requirements(r.prerequisites)} | ${r.effect} |`);
tables.push(['RESEARCH_CATALOG.md',researchDoc]);

function bonus(research,id) {const definition=rs.get(id);return (research[id]??0)*(definition?.bonus?.perLevel??0);}
function production(levels, research) {
  const mineIds=['alloy_mine','crystal_mine','fuel_refinery'];
  const scale=mineIds.map(id=>(levels[id]??0)*c.economy.productionGrowth**Math.max(0,(levels[id]??0)-1));
  const supply=c.economy.powerBase*(levels.power_plant??0)*c.economy.powerGrowth**Math.max(0,(levels.power_plant??0)-1);
  const demand=scale.reduce((sum,value,i)=>sum+value*c.economy.energyBase[i]*(1-bonus(research,'power_efficiency')),0)+10*(levels.shipyard??0)+12*(levels.laboratory??0);
  const factor=Math.min(1,supply/Math.max(1,demand));
  return {rates:scale.map((value,i)=>value*c.economy.baseHourly[i]*(1+bonus(research,'automation')+(i?bonus(research,'refining'):0))*factor),supply,demand,factor};
}
function capacity(levels,research) {return c.economy.warehouseBase*c.economy.warehouseGrowth**((levels.warehouse??1)-1)*(1+bonus(research,'storage'));}
function duration(definition,level,state,isResearch=false) {
  const speed=isResearch ? 1+0.1*((state.levels.laboratory??1)-1) : 1+bonus(state.research,'construction');
  return levelHours(definition,level)/speed;
}
const pools=['constructionBudget','studyBudget','fleetBudget'];
function canPay(state,cost) {return cost.every((value,i)=>value<=state.resources[i]+1e-6);}
function pay(state,cost,pool) {
  for(let i=0;i<3;i++) {
    state.resources[i]-=cost[i];let remaining=cost[i];
    state.spent[i]+=cost[i];
    for(const source of [pool,...pools.filter(value=>value!==pool)]) {const paid=Math.min(remaining,state[source][i]);state[source][i]-=paid;remaining-=paid;}
    check(remaining<1e-6 && state.resources[i]>=-1e-6 && pools.every(name=>state[name][i]>=-1e-6),'Negative resources or budget');
  }
}
const plans = {
  industry:[['automation',2],['construction',2],['storage',2],['power_efficiency',2],['colony_management',1],['automation',4],['refining',3],['construction',4],['storage',4],['colony_management',2],['automation',6],['power_efficiency',5],['refining',5],['automation',8]],
  military:[['kinetic',2],['armor',2],['chemical_drive',2],['fleet_command',2],['shield',1],['missile',2],['ion_drive',2],['siege_protocol',1],['beam',3],['carrier_ops',1],['missile',4],['armor',4],['fusion_drive',1],['beam',5],['shield',4],['fusion_drive',2],['siege_protocol',5],['carrier_ops',3]],
  science:[['automation',2],['construction',2],['sensors',2],['espionage',3],['navigation',2],['colony_management',1],['shield',3],['ion_drive',3],['power_efficiency',4],['fusion_drive',2],['coordination',3],['electronic_warfare',2],['carrier_ops',3],['terraforming',1]]
};
function nextResearch(id,target,state,shadow,stack=new Set()) {
  if((shadow[id]??0)>=target) return null;
  if(stack.has(id)) throw Error('Cycle in research planner');
  stack.add(id);const r=rs.get(id);
  for(const [dependency,level] of Object.entries(r.prerequisites)) if((shadow[dependency]??0)<level) return nextResearch(dependency,level,state,shadow,stack);
  if((state.levels.laboratory??0)<r.labLevel) return null;
  return {id,level:(shadow[id]??0)+1};
}
function simulate(profile,visits,shock=false) {
  const allocation=profile==='industry'?[0.75,0.20,0.05]:profile==='military'?[0.55,0.20,0.25]:[0.55,0.40,0.05];
  const state={levels:{...c.initialLevels},research:{},resources:[...c.initialResources],produced:[0,0,0],wasted:[0,0,0],spent:[0,0,0],
    construction:[],study:[],ships:[],fleetValue:0,fleetSpent:0,commandPlan:[],
    constructionBudget:c.initialResources.map(v=>v*allocation[0]),studyBudget:c.initialResources.map(v=>v*allocation[1]),fleetBudget:c.initialResources.map(v=>v*allocation[2]),minPower:1,minCoverage:Infinity};
  const hours=c.seasonDays*24, step=0.25, snapshots=[], unlocks={}, shockEvents=[];
  let firstColonyTech=null;
  for(let t=0;t<=hours;t+=step) {
    for(const [queue,isResearch] of [[state.construction,false],[state.study,true]]) {
      while(queue[0] && queue[0].finish<=t+1e-8) {
        const job=queue.shift();(isResearch?state.research:state.levels)[job.id]=job.level;
        if(queue[0]) queue[0].finish=t+duration(isResearch?rs.get(queue[0].id):fs.get(queue[0].id),queue[0].level,state,isResearch);
      }
    }
    while(state.ships[0] && state.ships[0].finish<=t+1e-8) state.fleetValue+=state.ships.shift().value;
    if(state.research.colony_management && firstColonyTech===null) firstColonyTech=t/24;
    for(const s of c.ships) if(!unlocks[s.id] && state.levels.shipyard>=s.yardLevel && Object.entries(s.prerequisites).every(([id,l])=>(state.research[id]??0)>=l)) unlocks[s.id]=Math.max(t/24,0.001);
    const p=production(state.levels,state.research), cap=capacity(state.levels,state.research);
    state.minPower=Math.min(state.minPower,p.factor);state.minCoverage=Math.min(state.minCoverage,...p.rates.map(rate=>cap/rate));
    if(t<hours && Number.isInteger(t/(24/visits))) {
      const shadow={...state.levels};for(const job of state.construction) shadow[job.id]=job.level;
      while(state.construction.length<3) {
        const projected=production(shadow,state.research), projectedCap=capacity(shadow,state.research);
        const stage=t/24<7?2:t/24<14?3:t/24<28?4:t/24<56?5:t/24<70?7:8;
        const candidates=[];
        const nextCoreCosts=['alloy_mine','crystal_mine','fuel_refinery','shipyard','laboratory'].filter(id=>shadow[id]<fs.get(id).maxLevel).map(id=>resourceCost(fs.get(id),shadow[id]+1));
        const nextStudyCosts=plans[profile].map(([id,target])=>nextResearch(id,target,state,state.research)).filter(Boolean).map(job=>resourceCost(rs.get(job.id),job.level));
        const liquidityNeeded=Math.max(...nextCoreCosts.flat(),...nextStudyCosts.flat());
        if(projected.rates.some(rate=>projectedCap/rate<36)||liquidityNeeded>projectedCap*0.9) candidates.push('warehouse');
        const oneMineUp={...shadow,alloy_mine:shadow.alloy_mine+1};
        const powerForecast=production(oneMineUp,state.research);
        if(powerForecast.supply<powerForecast.demand*1.1) candidates.push('power_plant');
        const mineFloor=Math.min(9,3+Math.floor(t/(14*24)));
        const mineIds=['alloy_mine','crystal_mine','fuel_refinery'];
        candidates.push(...mineIds.filter(id=>shadow[id]<mineFloor).sort((a,b)=>shadow[a]-shadow[b]));
        if(shadow.laboratory<stage) candidates.push('laboratory');
        if(shadow.shipyard<stage) candidates.push('shipyard');
        const weights=profile==='industry'?[1.1,1,0.95]:profile==='military'?[1.1,1,1]:[1,1.1,1];
        candidates.push(...['alloy_mine','crystal_mine','fuel_refinery'].sort((a,b)=>shadow[a]/weights[['alloy_mine','crystal_mine','fuel_refinery'].indexOf(a)]-shadow[b]/weights[['alloy_mine','crystal_mine','fuel_refinery'].indexOf(b)]));
        let added=false;
        for(const id of candidates) {
          const f=fs.get(id),level=shadow[id]+1;if(level>f.maxLevel)continue;
          const cost=resourceCost(f,level);
          if(!canPay(state,cost,'constructionBudget')) break;
          pay(state,cost,'constructionBudget');state.commandPlan.push({at:t,kind:'facility',id,level,cost});state.construction.push({id,level,finish:state.construction.length?Infinity:t+duration(f,level,state)});shadow[id]=level;added=true;break;
        }
        if(!added)break;
      }
      const shadowResearch={...state.research};for(const job of state.study)shadowResearch[job.id]=job.level;
      while(state.study.length<3) {
        let selected=null;
        for(const [id,target] of plans[profile]) {
          const job=nextResearch(id,target,state,shadowResearch);if(!job)continue;
          const cost=resourceCost(rs.get(job.id),job.level);
          if(canPay(state,cost,'studyBudget'))selected={...job,cost};
          break;
        }
        if(!selected)break;
        pay(state,selected.cost,'studyBudget');state.commandPlan.push({at:t,kind:'research',id:selected.id,level:selected.level,cost:selected.cost});state.study.push({...selected,finish:state.study.length?Infinity:t+duration(rs.get(selected.id),selected.level,state,true)});shadowResearch[selected.id]=selected.level;
      }
      if(!state.ships.length) {
        const options=['battlecruiser','cruiser','destroyer','striker'].map(id=>ss.get(id)).filter(s=>unlocks[s.id]);
        for(const ship of options) {
          const n=Math.min(10,...ship.cost.map((value,i)=>value===0?Infinity:Math.floor(Math.min(state.resources[i],state.fleetBudget[i])/value)));
          if(n<1)continue;
          const cost=ship.cost.map(v=>v*n);pay(state,cost,'fleetBudget');const value=total(cost);state.fleetSpent+=value;
          state.commandPlan.push({at:t,kind:'ship',id:ship.id,count:n,cost});
          state.ships.push({value,finish:t+ship.buildHours*n/(1+0.12*(state.levels.shipyard-1)+bonus(state.research,'shipbuilding'))});break;
        }
      }
    }
    if(shock && [28*24,56*24].includes(t)) {const lost=state.fleetValue*0.2;state.fleetValue-=lost;shockEvents.push({day:t/24,lost,oldValue:state.fleetValue+lost,recoveredDay:null});}
    for(const event of shockEvents) if(event.recoveredDay===null && state.fleetValue>=event.oldValue) event.recoveredDay=t/24;
    if([1,3,7,14,28,42,56,70,84].includes(t/24)) snapshots.push({day:t/24,levels:{...state.levels},research:{...state.research},hourly:p.rates.map(v=>Number(v.toFixed(2))),fleetValue:Math.round(state.fleetValue)});
    if(t===hours)break;
    for(let i=0;i<3;i++) {const generated=p.rates[i]*step, credited=Math.max(0,Math.min(generated,cap-state.resources[i]));state.resources[i]+=credited;state.produced[i]+=credited;state.wasted[i]+=generated-credited;state.constructionBudget[i]+=credited*allocation[0];state.studyBudget[i]+=credited*allocation[1];state.fleetBudget[i]+=credited*allocation[2];}
  }
  const produced=total(state.produced), wasted=total(state.wasted);
  check(state.resources.every(v=>v>=-1e-6),'Simulation resources');
  for(let i=0;i<3;i++) {
    check(Math.abs(c.initialResources[i]+state.produced[i]-state.spent[i]-state.resources[i])<1e-4,'Resource conservation');
    check(Math.abs(pools.reduce((sum,pool)=>sum+state[pool][i],0)-state.resources[i])<1e-4,'Budget conservation');
  }
  const fields=Object.entries(state.levels).reduce((sum,[id,l])=>sum+fs.get(id).space*l,0);
  check(fields<=c.economy.planetFields,'Core planet field capacity');
  const technologyCost=Object.entries(state.research).reduce((sum,[id,l])=>sum+Array.from({length:l},(_,i)=>total(resourceCost(rs.get(id),i+1))).reduce((a,b)=>a+b,0),0);
  return {profile,visits,shock,firstColonyTech,levels:state.levels,research:state.research,unlocks,produced:Math.round(produced),wastePercent:100*wasted/(produced+wasted),fleetValue:Math.round(state.fleetValue),technologyCost,
    minPower:state.minPower,minCoverage:state.minCoverage,fields,snapshots,shockEvents,commandPlan:state.commandPlan};
}
const runs=[];
for(const profile of ['industry','military','science'])for(const visits of c.sensitivityVisitsPerDay)runs.push(simulate(profile,visits));
runs.push(simulate('military',2,true));
const combatRoles=new Set(['요격','타격','급습','호위','대함','공성','함재 운용','전선 타격','방어막 지원','시설 타격','중장갑 타격','전선 유지','대규모 함재','장기 공성']);
const fighters=c.ships.filter(s=>combatRoles.has(s.role));
const strength=(ship,target)=>(ship.hp+ship.shield)*(1+ship.armor/100)*ship.attack*c.targeting[ship.weapon][target]/total(ship.cost)**2;
const matchups=fighters.map(a=>({id:a.id,name:a.name,wins:0,losses:0,draws:0,counters:[]}));
for(let i=0;i<fighters.length;i++)for(let j=0;j<fighters.length;j++)if(i!==j) {
  const a=fighters[i],b=fighters[j],ratio=strength(a,b.size)/strength(b,a.size);
  if(ratio>1.1)matchups[i].wins++;else if(ratio<1/1.1){matchups[i].losses++;matchups[i].counters.push(b.name);}else matchups[i].draws++;
}
const roi=[];
for(const [i,id] of ['alloy_mine','crystal_mine','fuel_refinery'].entries())for(const level of [2,4,6,8,10,12]) {
  const definition=fs.get(id), before=c.economy.baseHourly[i]*(level-1)*1.1**(level-2),after=c.economy.baseHourly[i]*level*1.1**(level-1);
  roi.push({id,level,cost:total(resourceCost(definition,level)),incrementalHourly:after-before,days:total(resourceCost(definition,level))/(after-before)/24});
}
const findings=[];
for(const profile of ['industry','military','science']) {
  const reference=runs.find(r=>r.profile===profile&&r.visits===2&&!r.shock),daily=runs.find(r=>r.profile===profile&&r.visits===1),four=runs.find(r=>r.profile===profile&&r.visits===4);
  const ratio=daily.produced/reference.produced,extra=four.produced/reference.produced;
  if(ratio<0.8)findings.push(`${profile}: 하루 1회 생산은 2회의 ${(ratio*100).toFixed(1)}%로 목표 80%에 미달. 계획 큐와 저장 정책 재조정 필요.`);
  if(extra>1.15)findings.push(`${profile}: 하루 4회 생산은 2회의 ${(extra*100).toFixed(1)}%로 목표 115%를 초과. 접속 빈도 이점 재검증 필요.`);
  if(ratio>1.2)findings.push(`${profile}: 하루 1회 생산이 2회의 ${(ratio*100).toFixed(1)}%. 정책의 재배정·투자 시점에 따른 순서 역전이며 1회 접속 자체의 우월성 근거로 사용할 수 없음. 빈도만 분리한 결과는 CONTROLLED_ECONOMY_V0.2.md를 따른다.`);
}
if(!runs.some(r=>r.visits<=2&&r.unlocks.battlecruiser))findings.push('하루 1~2회 기본 모델에서 T4 전투순양함이 84일 내 해금되지 않음. 해금 경로·연구 투자 정책 검토 필요.');
for(const result of matchups)if(result.wins/(fighters.length-1)>0.85)findings.push(`${result.name}: 단순 상성 지표에서 비교 상대 85% 이상에 우세. 비용·병기·기동의 추가 조정 필요.`);
const report=['# 시즌 콘텐츠 수치 검증 v0.1','',`규칙 ${c.version}. ${checks}개 구조·수치 조건 확인. 아래 결과는 추천 모델의 결정적 계산이며 런타임 테스트나 실제 PvP 승률이 아니다.`, '',
 '2026-10-14 후속 검증: [동일 명령 계획](CONTROLLED_ECONOMY_V0.2.md), [식민지 수송](COLONY_ECONOMY_V0.2.md), [혼합 전투·약탈](COMBAT_AND_RAID_V0.2.md)을 추가했다. 아래 정책 비교와 연속 수량 지표의 한계는 유지하며 통제 실험의 결론과 혼동하지 않는다.','',
 '## 범위와 재현','', '`node docs/design/balance/audit.mjs`로 재현한다. 외부 의존성·GUI·서버·실제 DB를 사용하지 않는다. 같은 입력은 같은 결과와 카탈로그를 생성한다.', '',
 '모델은 본성 1개, 84일, 15분 간격, 무약탈·무수송·무식민지 생산이다. 최초 명령은 시작 시점에 입력하고, 각 정기 접속에서 유료 계획을 건설/연구 각 최대 3개까지 예약한다. 계획 자원은 예약 때 묶는다. 접속 사이에는 생산과 예약 작업이 진행되고 완료 처리는 다음 15분 경계에서 이루어져 최대 15분의 보수적 지연이 있다. 건설 속도·전력 효율·저장·조선/연구 속도와 기술 해금을 반영한다. 확률·인간의 최적 투자·실제 전투·신규 보호·여러 행성 운영은 모델링하지 않는다.', '',
 '산업·군사·연구 정책은 각각 생산 수입을 건설/연구/함대로 75/20/5%, 55/20/25%, 55/40/5% 배정해 목표 예산을 누적한다. 접속 때마다 잔고 비율을 다시 소비하지 않는다. 건설·연구의 우선 목표를 현재 자원으로 감당할 수 있으면 다른 목표의 미사용 예산을 재배정할 수 있고, 함대는 남은 함대 예산 한도 내에서 건조한다. 재배정은 실제 자원을 늘리지 않는다. 연구는 고정 목표와 선행 순서를 따른다. 건설은 저장·전력 다음으로 기본 광산 성장(처음 레벨3, 14일마다 목표 +1, 최고 목표9)을 우선하고 시기별 연구소/조선소와 추가 생산을 연결한다. 이 목표는 모델의 선택 정책이며 게임의 주차별 해금 조건이 아니다. 저장 상한이 다음 비용을 담을 수 있는지도 검사한다. 자동 최적화와 플레이어의 실제 선택을 재현하지 않으며 예산 구분은 새로운 게임 화폐가 아니다.', '',
 '| 정책 | 접속/일 | 누적 실제 생산 | 포화 손실 | 함대 투자 잔존 가치 | 연구 표준 비용 | 개척 기술 첫 해금(일) | T4 전투순양함 해금(일) | 최저 전력 비율 | 공간 |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|'];
for(const r of runs)report.push(`| ${r.profile}${r.shock?' + 손실':''} | ${r.visits} | ${fmt(r.produced)} | ${r.wastePercent.toFixed(2)}% | ${fmt(r.fleetValue)} | ${fmt(r.technologyCost)} | ${r.firstColonyTech===null?'미해금':fmt(r.firstColonyTech)} | ${r.unlocks.battlecruiser?fmt(r.unlocks.battlecruiser):'미해금'} | ${(100*r.minPower).toFixed(1)}% | ${r.fields}/120 |`);
report.push('','## 단일 생산시설 투자 회수','', '다른 자원도 1:1로 환산한 표준 비용 / 추가 하루 생산량이다. 발전·저장·연구·건설 대기·행성 보정 비용을 제외한 하한이며 실제 회수 기간으로 단정하지 않는다.','', '| 시설 | 목표 레벨 | 비용 합계 | 추가 생산/h | 회수 하한(일) |','|---|---:|---:|---:|---:|');
for(const r of roi)report.push(`| ${fs.get(r.id).name} | ${r.level} | ${fmt(r.cost)} | ${fmt(r.incrementalHourly)} | ${fmt(r.days)} |`);
report.push('','## 대함 비교 지표','', '동일 총 표준 비용의 연속 수량 근사에서 `(HP+방어막) × (1+장갑/100) × 표적별 화력 / 비용²`를 비교한다. ±10%는 동률 범위다. 유닛 수 내림·집중 사격·지휘·수송·연료·연구·엄호·교란·수리·철수는 제외한다. 함재·공성 병기는 표의 기본 화력에 이미 반영됐다고 가정한다. 이 표는 실전 승률을 나타내지 않는다.','', '| 함종 | 우세 | 열세 | 근접 | 열세 상대 |','|---|---:|---:|---:|---|');
for(const result of matchups)report.push(`| ${result.name} | ${result.wins} | ${result.losses} | ${result.draws} | ${result.counters.join(', ')||'추가 확인 필요'} |`);
report.push('','## 손실 복구와 남은 문제','');
for(const event of runs.find(r=>r.shock).shockEvents)report.push(`- ${event.day}일에 당시 유료 함대 가치 20%(${fmt(event.lost)}자원)를 제거했다. 함대 가치가 손실 전 값으로 돌아온 시점: ${event.recoveredDay===null?'84일 내 미복구':`${fmt(event.recoveredDay)}일, 복구 ${fmt(event.recoveredDay-event.day)}일`}. 기존 건조 큐는 유지한다. 실제 전투·조선 해금·수리·약탈·방어 손실의 검증이 아니다.`);
report.push(...(findings.length?findings.map(value=>`- ${value}`):['- 정의한 생산 빈도·해금·과도한 상성 우위 점검에서 경고 없음. 이 결과만으로 전체 밸런스 완료를 주장하지 않는다.']));
report.push('- 이 도구 밖의 식민지 수송·수요 병목·혼합 편대·시설 공성·약탈은 위 v0.2 계산에서 검증했다. 실제 서버 사건 연결, 정찰 탐지, 자동 철수·복구와 길드 집중 전력은 후속 검증 대상이다.','');
for(const [name,lines] of tables)writeFileSync(output(name),lines.join('\n')+'\n');
const levelCurves=[...c.facilities,...c.researches].map(definition=>{
  const cumulative=[0,0,0];
  const levels=Array.from({length:definition.maxLevel},(_,index)=>{
    const level=index+1,cost=resourceCost(definition,level);
    const free=!!c.initialLevels[definition.id]&&level<=c.initialLevels[definition.id];
    for(let i=0;i<3;i++)if(!free)cumulative[i]+=cost[i];
    return {level,cost,baseHours:levelHours(definition,level),initialFree:free,cumulativeStandardCost:[...cumulative],growthScore:total(cumulative)/10};
  });return {id:definition.id,name:definition.name,levels};
});
writeFileSync(output('catalog.json'),JSON.stringify(c,null,2)+'\n');
writeFileSync(output('level-curves.json'),JSON.stringify({version:c.version,resources:c.resources,curves:levelCurves},null,2)+'\n');
writeFileSync(output('audit-results.json'),JSON.stringify({version:c.version,checks,runs:runs.map(({commandPlan,...result})=>result),roi,matchups,findings},null,2)+'\n');
writeFileSync(output('command-plans.json'),JSON.stringify({version:c.version,referenceVisits:2,plans:runs.filter(r=>r.visits===2&&!r.shock).map(r=>({profile:r.profile,commands:r.commandPlan,reference:{produced:r.produced,levels:r.levels,research:r.research,fleetValue:r.fleetValue}}))},null,2)+'\n');
writeFileSync(output('BALANCE_AUDIT_V0.1.md'),report.join('\n'));
console.log(JSON.stringify({checks,facilities:c.facilities.length,defenses:c.defenses.length,ships:c.ships.length,researches:c.researches.length,runs:runs.length,findings}));
