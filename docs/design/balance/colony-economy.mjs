import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {catalog as c,total,resourceCost} from './catalog.mjs';
import {STEP,EPS,facilities,ships,zeros,add,subtract,scale,canPay,round,production,capacities,facilityHours,buildHours,tickProduction,pay,makePlanet,voyage} from './economy-model.mjs';
const out=name=>fileURLToPath(new URL(name,import.meta.url));
const tech={automation:2,refining:1,power_efficiency:2,storage:2,construction:2,shipbuilding:2,kinetic:1,chemical_drive:2,ion_drive:1,navigation:2,fuel_efficiency:2,cargo_compression:2,colony_management:1,sensors:2,astrography:2,supply_network:1};
const opening={alloy_mine:4,crystal_mine:4,fuel_refinery:4,power_plant:3,warehouse:6,shipyard:3,laboratory:3,spaceport:2};
const pack=[4000,2500,1000],working=[3000,1500,1000],foundingFleet={colony:1,courier:5};
const foundingCost=Object.entries(foundingFleet).reduce((sum,[id,n])=>add(sum,scale(ships.get(id).cost,n)),zeros());
const sumFleetCost=fleet=>Object.entries(fleet).reduce((sum,[id,n])=>add(sum,scale(ships.get(id).cost,n)),zeros());
const colonizationManifest=add(pack,working);
assert.equal(total(colonizationManifest),13000);
assert(voyage(foundingFleet,1,1,tech).cargo>=total(colonizationManifest),'Founding cargo fits');
let assertions=2;
function simulate({visits=2,distance=3,speed=1,type='heavy_cargo',mode='planned',baseline=false,payloadPolicy='demand',targetProfile='balanced'}){
  const home=makePlanet('home',opening,[50000,35000,18000]), colony=makePlanet('colony',{alloy_mine:1,crystal_mine:1,fuel_refinery:1,power_plant:1,warehouse:1},zeros(),[1.15,1,0.90]);
  const horizon=70*24,dedicated={[type]:2},route=voyage(dedicated,distance,speed,tech),founding=voyage(foundingFleet,distance,1,tech,false),foundersReturn=voyage({courier:5},distance,1,tech,false),foundingFuel=founding.fuel+foundersReturn.fuel,dedicatedCost=sumFleetCost(dedicated);
  const foundingBuild=buildHours('colony',1,home.levels,tech)+buildHours('courier',5,home.levels,tech);
  let establishedAt=baseline?Infinity:foundingBuild+founding.hours,returnFoundersAt=establishedAt+foundersReturn.hours;
  let dedicatedReady=returnFoundersAt+buildHours(type,2,home.levels,tech),established=false;
  let foundingCargo=baseline?zeros():[...colonizationManifest],cargo=zeros(),routeState='home',arrivalAt=Infinity,departures=0;
  let realized=zeros(),fuelExpense=0,factoryValue=0,factoryJob=null,paybackDay=null,overflowVisits=0;
  const journal=new Set();
  if(!baseline){
    const startup=add(add(foundingCost,dedicatedCost),[0,0,foundingFuel]);pay(home,startup);fuelExpense+=foundingFuel;
    assert(canPay(home.cash,foundingCargo));home.cash=subtract(home.cash,foundingCargo);home.movedOut=add(home.movedOut,foundingCargo);
  }
  const investment=baseline?0:total(foundingCost)+total(dedicatedCost)+total(colonizationManifest)+foundingFuel;
  function transferFromPlanet(planet,manifest){assert(canPay(planet.cash,manifest));planet.cash=subtract(planet.cash,manifest);planet.movedOut=add(planet.movedOut,manifest);}
  function deposit(planet,manifest){const caps=capacities(planet.levels,tech),credited=manifest.map((v,i)=>Math.max(0,Math.min(v,caps[i]-planet.cash[i])));planet.cash=add(planet.cash,credited);planet.movedIn=add(planet.movedIn,credited);return {credited,remaining:subtract(manifest,credited)};}
  function processConstruction(t){while(colony.construction[0]&&colony.construction[0].finish<=t+EPS){const job=colony.construction.shift();colony.levels[job.id]=job.level;if(colony.construction[0])colony.construction[0].finish=t+facilityHours(colony.construction[0].id,colony.construction[0].level,tech);}}
  function manageColony(t){const shadow={...colony.levels};for(const job of colony.construction)shadow[job.id]=job.level;
    while(colony.construction.length<3){const p=production(shadow,tech,colony.site),cap=capacities(shadow,tech),mineIds=['alloy_mine','crystal_mine','fuel_refinery'],goals=targetProfile==='alloy'?[6,3,3]:[6,6,6];
      const candidates=[],costs=mineIds.filter((id,i)=>shadow[id]<goals[i]).map(id=>resourceCost(facilities.get(id),shadow[id]+1));
      if(p.rates.some((rate,i)=>cap[i]/rate<36)||costs.some(cost=>cost.some((v,i)=>v>cap[i]*0.90)))candidates.push('warehouse');
      const next=production({...shadow,alloy_mine:shadow.alloy_mine+1},tech,colony.site);if(next.power<next.demand*1.1)candidates.push('power_plant');
      candidates.push(...mineIds.filter((id,i)=>shadow[id]<goals[i]).sort((a,b)=>shadow[a]/goals[mineIds.indexOf(a)]-shadow[b]/goals[mineIds.indexOf(b)]));
      let added=false;for(const id of candidates){const level=shadow[id]+1,cost=resourceCost(facilities.get(id),level);if(!canPay(colony.cash,cost))break;pay(colony,cost);colony.construction.push({id,level,finish:colony.construction.length?Infinity:t+facilityHours(id,level,tech)});shadow[id]=level;added=true;break;}if(!added)break;
    }
  }
  function availableExport(){const p=production(colony.levels,tech,colony.site),reserve=p.rates.map(v=>v*24),available=colony.cash.map((v,i)=>Math.max(0,v-reserve[i])),mineIds=['alloy_mine','crystal_mine','fuel_refinery'],goals=targetProfile==='alloy'?[6,3,3]:[6,6,6];
    const nextCosts=mineIds.filter((id,i)=>colony.levels[id]<goals[i]).map(id=>resourceCost(facilities.get(id),colony.levels[id]+1));
    if(nextCosts.length)for(let i=0;i<3;i++)available[i]=Math.max(0,available[i]-Math.max(...nextCosts.map(cost=>cost[i])));
    if(payloadPolicy==='proportional'){const volume=total(available),ratio=Math.min(1,route.cargo/Math.max(1,volume));return scale(available,ratio).map(Math.floor);}
    const homeRates=production(home.levels,tech).rates,homeCaps=capacities(home.levels,tech),free=homeCaps.map((cap,i)=>Math.max(0,cap-home.cash[i]-homeRates[i]*route.hours));
    const selected=zeros();let remaining=route.cargo;
    for(const i of [0,1,2]){selected[i]=Math.floor(Math.min(remaining,available[i],free[i]));remaining-=selected[i];}
    return selected;
  }
  for(let t=0;t<=horizon;t+=STEP){
    if(!baseline&&!established&&t>=establishedAt){assert(!journal.has('found'));journal.add('found');colony.cash=add(colony.cash,foundingCargo);colony.movedIn=add(colony.movedIn,foundingCargo);pay(colony,pack);foundingCargo=zeros();established=true;establishedAt=t;}
    if(established)processConstruction(t);
    if(factoryJob&&factoryJob.finish<=t+EPS){factoryValue+=factoryJob.value;factoryJob=null;}
    if(arrivalAt<=t+EPS){
      const key=`arrival:${departures}:${routeState}`;assert(!journal.has(key));journal.add(key);
      if(routeState==='to-colony'){
        assert(total(cargo)<EPS,'Route leaves home only empty');const manifest=availableExport();transferFromPlanet(colony,manifest);cargo=manifest;routeState='to-home';arrivalAt=t+route.hours;
      }else if(routeState==='to-home'){routeState='home';arrivalAt=Infinity;}
    }
    if(routeState==='home'&&total(cargo)>EPS){const deposited=deposit(home,cargo);cargo=deposited.remaining;realized=add(realized,deposited.credited);if(total(cargo)>EPS)overflowVisits++;}
    const visit=Number.isInteger(t/(24/visits));
    if(t<horizon&&visit){
      if(established)manageColony(t);
      if(!factoryJob&&(baseline||t>=dedicatedReady)){const price=ships.get('striker').cost,reserve=[8000,6000,4000],n=Math.min(100,...price.map((v,i)=>Math.floor(Math.max(0,home.cash[i]-reserve[i])/v)));if(n>0){pay(home,scale(price,n));factoryJob={value:total(price)*n,finish:t+buildHours('striker',n,home.levels,tech)};}}
    }
    if(!baseline&&established&&t<horizon&&t>=dedicatedReady&&routeState==='home'&&total(cargo)<EPS&&(mode==='planned'||visit)){
      if(total(availableExport())>=route.cargo*0.25&&home.cash[2]>=route.fuel&&t+2*Math.ceil(route.hours/STEP)*STEP<=horizon){pay(home,[0,0,route.fuel]);fuelExpense+=route.fuel;routeState='to-colony';arrivalAt=t+route.hours;departures++;}
    }
    const projectNet=total(realized)-investment-(fuelExpense-(baseline?0:foundingFuel));if(!baseline&&paybackDay===null&&projectNet>=0)paybackDay=t/24+14;
    if(t===horizon)break;tickProduction(home,tech);if(established)tickProduction(colony,tech);
  }
  for(let i=0;i<3;i++){const initial=home.initial[i]+colony.initial[i],produced=home.produced[i]+colony.produced[i],spent=home.spent[i]+colony.spent[i],remaining=home.cash[i]+colony.cash[i]+foundingCargo[i]+cargo[i];assert(Math.abs(initial+produced-spent-remaining)<1e-4,`World conservation ${i}`);assert(home.cash[i]>=-EPS&&colony.cash[i]>=-EPS);assertions+=2;}
  assert(route.command<=100+50*(tech.fleet_command??0));assertions++;
  const fields=Object.entries(colony.levels).reduce((sum,[id,l])=>sum+facilities.get(id).space*l,0);assert(fields<=100);assertions++;
  const localProduced=total(colony.produced),waste=total(colony.wasted);
  return {visits,distance,speed,type,mode,baseline,payloadPolicy,targetProfile,establishedDay:baseline?null:round(14+establishedAt/24),investment,foundingFuel,route,departures,fuelExpense,realized:round(total(realized)),projectNet:round(total(realized)-investment-(fuelExpense-(baseline?0:foundingFuel))),
    paybackDay:paybackDay===null?null:round(paybackDay),colonyLevels:colony.levels,colonyProduced:round(localProduced),colonyWastePercent:localProduced?round(100*waste/(localProduced+waste)):0,colonyStock:colony.cash.map(round),inFlightCargo:cargo.map(round),overflowQuarterHours:overflowVisits,
    homeCash:home.cash.map(round),homeFactoryValue:factoryValue,pendingFactoryValue:factoryJob?.value??0,homeRealizedWealth:round(total(home.cash)+factoryValue),fields};
}
const baseline=[1,2].map(visits=>simulate({visits,baseline:true})),cases=[];
for(const targetProfile of ['balanced','alloy'])for(const type of ['courier','heavy_cargo'])for(const distance of [1,3,8])for(const speed of [0.5,0.75,1])for(const visits of [1,2])for(const mode of ['manual','planned'])cases.push(simulate({targetProfile,type,distance,speed,visits,mode}));
const diagnostics=['courier','heavy_cargo'].map(type=>simulate({type,payloadPolicy:'proportional'}));
const headline=cases.filter(r=>r.speed===1&&r.visits===2&&r.targetProfile==='alloy');
const md=['# 식민지 성장·수송 경제 검증 v0.2','','2026-10-14. `node docs/design/balance/colony-economy.mjs`로 재현한다. [전체 결과](colony-economy-results.json)와 [공유 계산 모델](economy-model.mjs)을 보존한다. 실제 서버·계정·DB에 접속하지 않는다.','',
 '## 고정 조건','', '시즌14일의 동일 중기 기지에서84일까지70일을 비교한다. 본성 생산시설4·발전3·저장6·조선소3·연구소3·우주항2, 비축50,000/35,000/18,000을 공통 제공한다. 공통 기술은 JSON의 fixture에 명시하며 개척·이온·화물·보급 선행을 이미 갖춘 가정이다. 연구 해금 날짜를 이 실험에서 다시 증명하지 않는다. 본성의 같은 타격함 주문 정책을 유지하고 식민지 유무·항로·수송함·운항 속도·접속·계획 수송만 비교한다.','',
 '개척선1+캐러밴5를 실제 비용으로 건조하고 정착꾸러미7,500+초기 현지 비축5,500을 운반한다. 파이오니어 자체 적재3,000만으로13,000화물을 보낼 수 없으므로 동행 수송선이 필요하다. 개척선은 착륙 때 소비되고 현지 생산3·발전·저장1레벨을 설치한다. 물량은 본성에서 빠져 비행 중 화물로 존재한 뒤 현지에 이전된다. 전용 수송함2척의 구입도 투자 비용에 포함한다. 본성 조선소1개의 작업 시간을 중복 사용하지 않도록 개척 편대·전용 수송의 건조와 개척선단 귀환 대기까지 끝난 뒤 타격함 생산을 시작한다. 초기 주문 비용을 먼저 지불하는 보수적인 조건이다.','',
 '식민지는 합금+15%·연료-10% 입지다. 생산시설을6/6/6까지 키우는 균형 경로와6/3/3의 합금 특화 경로를 비교하며 저장36시간·다음 투자 비용·전력을 우선한다. 본성과 현지의 작업·비축·생산을 분리하고 연구만 공유한다. 수송은 현지24시간 생산 예비분과 다음 생산 투자비를 남긴 잉여만 싣는다. 수정한 계획은 본성의 자원별 저장 여유에서 귀환까지의 알려진 생산을 뺀 범위로 화물을 선택한다. 합금 우선·결정·연료 순서이고 없는 수요를 비율 채우기로 대신하지 않는다. 적재25% 이상 준비되고 귀환이 시즌 종료 이전일 때 출항한다. 왕복 연료는 본성에서 실제 지불하고 함선은 도착·귀환 때만 다음 비행에 사용할 수 있다.','',
 'manual은 접속 시 새 비행을 예약한다. planned는 이미 승인한 왕복 정책을 조건 충족 시 서버가 재실행한다. 계획 조건은 선박·연료·잉여·도착 여유이며 새 투자나 새로운 상대를 임의로 고르지 않는다. 목적지 저장 초과분은 선박에 남아 공간이 생길 때까지 대기하고 가용 현지 비축·정산된 지원으로 세지 않는다. 이 대기 상태는 손실 없는 무적 자산으로 만들 수 없으며 실제 세계에서는 노출·반송·중단 선택이 필요하다.','',
 '아래는 하루2회·100%운항·합금 특화 경로다. 균형 경로와50/75% 운항 결과도 JSON에 보존했다.','', '| 전용 수송 | 거리 | 운용 | 편도(h) | 왕복 연료 | 완료 출항 | 본성 수령 | 현금 회수일 | 프로젝트 순회수 | 현지 포화 손실 |','|---|---:|---|---:|---:|---:|---:|---:|---:|---:|'];
for(const r of headline)md.push(`| ${r.type}×2 | ${r.distance} | ${r.mode} | ${r.route.hours.toFixed(2)} | ${r.route.fuel} | ${r.departures} | ${Math.round(r.realized).toLocaleString('en-US')} | ${r.paybackDay===null?'84일 내 미회수':r.paybackDay.toFixed(2)} | ${Math.round(r.projectNet).toLocaleString('en-US')} | ${r.colonyWastePercent.toFixed(2)}% |`);
md.push('','## 해석과 한계','', '- 수정 전의 비율 채우기 수송은 대형 수송선2척·거리3·계획 운용에서 목적지 결정/연료 대기가 합금 운송까지 막았다. 같은 균형 경로의 수정 전후 전체 결과를 diagnostics와cases에 보존했다. 목적지 수요 확인과 자원별 특화가 필요하며 계속 접속하라는 해결책을 기본으로 삼지 않는다.','- 현금 회수일은 본성에 실제 도착한 화물 합계가 개척/정착/초기 비축/수송선의 최초 투자와 추가 왕복 연료를 상쇄한 최초 시점이다. 식민지에 재투자한 생산은 이미 수송 잉여에서 제외되어 다시 비용으로 이중 차감하지 않는다. 소유한 수송선과 현지 자산의 잔존 가치를 회수액에 더하지 않는 보수적인 기준이다.',`- ${cases.length+baseline.length+diagnostics.length}개 시나리오의 세계 자원 보존·적재·지휘·현지 공간을 검사했다. 수령 재고는 항상 실제 자원이며 소멸·복제하지 않는다. 모델의 사건 처리는15분 간격이다.`,'- 초기 항로의 빈 슬롯·동시 개척·방어·수송 피격·제3자 회수·시장 환율은 제외한다. 이것은 전쟁 위험을 반영하지 않은 수송 경제이며 모든 식민지의 수익성 보장이 아니다.','- 결과의 본성 부는 현금+완료된 유료 타격함 가치만 포함한다. 미완료 주문·현지 잔존 자산·비행 중 화물은 별도로 보존한다. 서로 다른 자원 구성을 전부 자유 교환할 수 있다고 가정하지 않는다.','');
writeFileSync(out('colony-economy-results.json'),JSON.stringify({version:c.version,fixture:{tech,opening,initial:[50000,35000,18000],pack,working,foundingFleet,colonySite:[1.15,1,0.90]},baseline,cases,diagnostics,assertions},null,2)+'\n');writeFileSync(out('COLONY_ECONOMY_V0.2.md'),md.join('\n'));
console.log(JSON.stringify({cases:cases.length+baseline.length+diagnostics.length,assertions,headline:headline.map(r=>({type:r.type,d:r.distance,mode:r.mode,net:r.projectNet,payback:r.paybackDay,waste:r.colonyWastePercent}))}));
