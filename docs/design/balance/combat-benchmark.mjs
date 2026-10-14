import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {catalog as c,byId} from './catalog.mjs';
import {DEFAULT_RULES,forceCost,makeForce,fight,raidEconomics} from './combat-model.mjs';
import {jsonReport} from './serialize.mjs';
const out=name=>fileURLToPath(new URL(name,import.meta.url)),ships=byId(c.ships);
const attackControl=process.argv.includes('--attack-control');
if(attackControl)ships.get('striker').attack=65;
const combatIds=['interceptor','striker','raider','guardian','destroyer','siege','carrier','cruiser','shield_ship','bomber','battlecruiser','dreadnought','heavy_carrier','siege_platform'];
const mixed=[
 {id:'early-mixed',name:'초기 혼합',weights:{striker:0.40,interceptor:0.25,courier:0.15,scout:0.05,salvage:0.15}},
 {id:'mobile-mixed',name:'중형 전선',weights:{cruiser:0.35,destroyer:0.25,guardian:0.15,jammer:0.10,heavy_cargo:0.15}},
 {id:'siege-mixed',name:'혼합 공성',weights:{siege:0.40,bomber:0.20,guardian:0.10,jammer:0.10,heavy_cargo:0.20}},
 {id:'heavy-mixed',name:'대형 혼합',weights:{battlecruiser:0.40,dreadnought:0.20,guardian:0.10,jammer:0.10,heavy_cargo:0.20}},
 {id:'carrier-mixed',name:'함재 혼합',weights:{carrier:0.35,heavy_carrier:0.25,guardian:0.10,jammer:0.10,heavy_cargo:0.20}},
 {id:'recovery-mixed',name:'전투·회수',weights:{striker:0.30,destroyer:0.30,guardian:0.15,salvage:0.15,courier:0.10}}
];
const mobile=[...combatIds.map(id=>({id,name:ships.get(id).name,weights:{[id]:1}})),...mixed];
const fortresses=[
 {id:'light-wall',name:'요격 포대',weights:{light_battery:1}},
 {id:'beam-wall',name:'빔 방어',weights:{laser_array:0.50,plasma_turret:0.50}},
 {id:'missile-wall',name:'대함 방어',weights:{missile_silo:0.50,siege_cannon:0.50}},
 {id:'mixed-wall',name:'혼합 방어',weights:{light_battery:0.20,laser_array:0.25,missile_silo:0.20,plasma_turret:0.20,shield_dome:0.15}},
 {id:'support-wall',name:'정보·방어막',weights:{light_battery:0.20,laser_array:0.30,shield_dome:0.30,sensor_net:0.10,decoy_array:0.10}}
];
const garrisons=[
 {id:'screen-garrison',name:'혼합 포대+타격 주둔',fort:fortresses[3],fleet:mixed[0]},
 {id:'siege-garrison',name:'대함 방어+공성 주둔',fort:fortresses[2],fleet:mixed[2]},
 {id:'carrier-garrison',name:'정보 방어+함재 주둔',fort:fortresses[4],fleet:mixed[4]}
];
function defend(defender,budget,tech={}){
 if(defender.fort){const f=makeForce(defender.fort.weights,budget*0.6,{defense:true,fields:80,power:budget*0.002,tech}),m=makeForce(defender.fleet.weights,budget*0.4,{tech});return {...f,ships:m.ships};}
 return makeForce(defender.weights,budget,{defense:defender.fortress,fields:80,command:500,power:defender.fortress?budget*0.002:Infinity,tech});
}
let checks=0;
function checkedFight(a,b,seed=0){const battle=fight(a,b,{seed});assert(battle.rounds<=12);assert(battle.a.every(u=>u.hp>=0)&&battle.b.every(u=>u.hp>=0));assert(battle.ewA<=0.2&&battle.ewB<=0.2);checks+=3;return battle;}
const cases=[],economics=[],stats=Object.fromEntries(mobile.map(v=>[v.id,{id:v.id,name:v.name,legal:0,wins:0,losses:0,held:0}]));
for(const budget of [30000,150000,500000])for(const attacker of mobile){
 const a=makeForce(attacker.weights,budget);if(forceCost(a)===0)continue;
 for(const defender of [...mobile.map(v=>({...v,fortress:false})),...fortresses.map(v=>({...v,fortress:true})),...garrisons.map(v=>({...v,fortress:true}))]){
  const b=defend(defender,budget);if(forceCost(b)===0)continue;
  for(const seed of [0,1]){
   const battle=checkedFight(a,b,seed),result={budget,attacker:attacker.id,defender:defender.id,fortress:defender.fortress,seed,outcome:battle.outcome,rounds:battle.rounds,spentA:forceCost(a),spentB:forceCost(b),survivorsA:battle.survivorsA.length,survivorsB:battle.survivorsB.length};cases.push(result);
   if(!defender.fortress&&seed===0&&attacker.id!==defender.id){const s=stats[attacker.id];s.legal++;if(battle.outcome==='attacker')s.wins++;else if(battle.outcome==='defender')s.losses++;else s.held++;}
   if(seed===0&&defender.fortress)for(const distance of [1,3,8])for(const [stockId,stock]of [['low',[6000,4000,2000]],['medium',[36000,24000,12000]],['high',[180000,120000,60000]]])for(const recoveryRound of ['floor','ceil'])economics.push({...result,distance,stockId,recoveryRound,...raidEconomics(battle,a,{distance,stock,recoveryRound})});
  }
 }
}
const investmentRatios=[];
for(const budget of [30000,150000,500000])for(const attacker of mixed)for(const defender of [...fortresses,...garrisons])for(const ratio of [1,1.5,2]){
 const a=makeForce(attacker.weights,budget*ratio),b=defend({...defender,fortress:true},budget);if(!forceCost(a)||!forceCost(b))continue;
 for(const seed of [0,1]){const battle=checkedFight(a,b,seed);for(const stockId of ['medium','high'])investmentRatios.push({budget,ratio,attacker:attacker.id,defender:defender.id,seed,stockId,spentA:forceCost(a),spentB:forceCost(b),actualRatio:forceCost(a)/forceCost(b),...raidEconomics(battle,a,{stock:stockId==='medium'?[36000,24000,12000]:[180000,120000,60000]})});}
}
const ratioSummary=[1,1.5,2].map(ratio=>{const set=investmentRatios.filter(r=>r.ratio===ratio&&r.seed===0&&r.stockId==='high');return {ratio,cases:set.length,wins:set.filter(r=>r.outcome==='attacker').length,profitable:set.filter(r=>r.profit>0).length,best:Math.max(...set.map(r=>r.profit))};});
const asymmetric=[];
for(const budget of [150000,500000])for(const attacker of mixed)for(const defender of fortresses)for(const advantage of ['attacker','defender']){
 const tech={armor:5,shield:4,kinetic:5,beam:5,missile:5,tracking:3,electronic_warfare:3,counter_ew:3,siege_protocol:4,carrier_ops:3,cargo_compression:3,fuel_efficiency:3},a=makeForce(attacker.weights,budget,{tech:advantage==='attacker'?tech:{}}),b=defend({...defender,fortress:true},budget,advantage==='defender'?tech:{});
 if(!forceCost(a)||!forceCost(b))continue;const battle=checkedFight(a,b);asymmetric.push({budget,attacker:attacker.id,defender:defender.id,advantage,...raidEconomics(battle,a)});
}
const supportSensitivity=[];
for(const guardShare of [0,0.10,0.20,0.30])for(const ewShare of [0,0.05,0.10,0.20]){
 const budget=150000,a=makeForce({siege:1-guardShare-ewShare-0.15,guardian:guardShare,jammer:ewShare,heavy_cargo:0.15},budget),b=defend({...fortresses[3],fortress:true},budget),battle=checkedFight(a,b);
 supportSensitivity.push({guardShare,ewShare,spent:forceCost(a),guardMax:Math.max(0,...battle.guardTrace.map(v=>v[0])),ew:battle.ewA,...raidEconomics(battle,a)});
}
const summary=Object.values(stats).map(s=>({...s,winPercent:s.legal?100*s.wins/s.legal:0})),findings=[];
for(const s of summary)if(s.legal>20&&s.winPercent>80)findings.push(`${s.name}: 고정 표본의 공격 승리 ${s.winPercent.toFixed(1)}%. 기동·연료·약탈·예산별 상성까지 함께 재검토.`);
const shortlist=[];
for(const budget of [30000,150000,500000])for(const defender of fortresses){const set=economics.filter(r=>r.budget===budget&&r.defender===defender.id&&r.distance===3&&r.stockId==='medium'&&r.recoveryRound==='floor').sort((a,b)=>b.profit-a.profit);if(set.length)shortlist.push({...set[0],defenderName:defender.name});}
const md=['# 혼합 편대·방어시설·약탈 순수익 검증 v0.2','','2026-10-14. `node docs/design/balance/combat-benchmark.mjs`로 재현한다. [모델](combat-model.mjs)과 [전체 결과](combat-benchmark-results.json)을 보존한다. 기존 게임 전투 코드를 바꾸거나 실제 플레이어 전투를 실행하지 않는다.','',
 '## 계산 계약','',
 '예산30,000·150,000·500,000의14개 순수 전투 함종·6개 혼합 편대,5개 방어 구성·3개 방어+함선 주둔을 비교한다. 가격은 합금+결정+연료이며 자원별 구매 가능성은 이 전술 실험에서 분리한다. 수량은 정수, 지휘500·방어80공간을 적용한다. 용량 초과 시 모든 역할 비중을 함께 축소한다. 비싼 함종이0척이면 제외하며 작은 예산의 혼합은 가능한 함종만 남는다. 실제 지출은 예산보다 작을 수 있어 spentA/spentB를 보존한다. 방어 가용 전력은 예산×0.002이고 부족하면 방어 화력을 비례 축소한다. 주둔형은 방어60%·기동40%로 배분한다.','',
 '선체·방어막·장갑·표적별 병기·동시 피해·예측 과잉 사격 회피·호위·방어막 지원·전자전·연구를 적용한다. 발사 분할은 L1/M2/H4/F2, 드론은 추가2배 분할이다. 총 공격값을 분할하여 추가 화력을 만들지 않는다. 큰 함선이 한 발로 소형 표적만 과잉 파괴하는 근사 오류를 줄이는 제안이며 실제 엔진의 검증된 메커니즘은 아니다. 동률 사격 순서를 두 가지로 바꾼다.12라운드 뒤 방어자가 남으면 공격 실패다.','',
 '기본 연구 동률0은 함종 해금이 완료됐다는 전술 fixture다. 실제 해금 날짜·경제 병목을 무료로 해결했다는 뜻은 아니다. 비대칭 연구 표본도 계산한다. 호위·방어막 경감15%·교란20%를 검사하며 연구 강화도 실제 지원 투자 비중에 곱한다. 한 지원선과 최고 연구가 편대 전체에 독립 보너스를 주지 않는다.','',
 '약탈 순수익 = 실제 회수 화물 + 실제 회수 잔해 - 왕복 연료 - 생존 선체 수리비 - 공격자의 영구 손실 표준 가치다. 승리한 경우만 보호 자원을 뺀 노출량25% 이내에서 적재만큼 회수한다. 잔해는 합금·결정만이고 살아 있는 회수선의 별도 적재량으로 제한한다. 적재를 중복 사용하지 않는다. 방어60% 복구의 작은 기수 반올림은 floor/ceil 모두 비교하며 작전 불능 복구에도35% 재료를 청구한다. 기지 생산시설·소유권은 파괴하지 않는다.','',
 `총 동률 예산 전투${cases.length}개·약탈 경제${economics.length}개·투자 비율/비축${investmentRatios.length}개·비대칭 연구${asymmetric.length}개·지원 비중${supportSensitivity.length}개. 우세 비율은 실제 승률이 아닌 정의한 결정적 표본의 구성 비율이다.`,'',
 '| 편대 | 대함 비교 | 공격 승리 | 패배 | 미결/상호 손실 | 공격 승리 구성 비율 |','|---|---:|---:|---:|---:|---:|'];
for(const s of summary)md.push(`| ${s.name} | ${s.legal} | ${s.wins} | ${s.losses} | ${s.held} | ${s.winPercent.toFixed(1)}% |`);
md.push('','## 거리3·중간 비축72,000의 표본별 최고 순수익','', '각 예산·방어 구성의 후보 중 최고값이다. 음수이면 가장 나은 후보도 손해다. 실제 지출은 상한 예산과 다르며 상세 JSON에서 확인한다. 전쟁 목표의 가치는 포함하지 않는다.','', '| 예산 | 방어 | 후보 | 결과 | 순수익 | 화물 | 잔해 | 연료 | 손실 | 수리 |','|---|---|---|---|---:|---:|---:|---:|---:|---:|');
for(const r of shortlist)md.push(`| ${r.budget} | ${r.defenderName} | ${mobile.find(v=>v.id===r.attacker).name} | ${r.outcome} | ${r.profit.toFixed(0)} | ${r.loot.toFixed(0)} | ${r.recovered.toFixed(0)} | ${r.fuel} | ${r.permanentLoss} | ${r.repair.toFixed(0)} |`);
md.push('','## 혼합 편대 투자 배율과 순수익','', '거리3·비축360,000·반올림floor·사격 순서0의 비교다. 배율은 상한 예산의 비율이며 실제 지출 비율은 별도 JSON에 있다. 돌파와 흑자 약탈을 따로 센다.','', '| 공격 예산/방어 예산 | 구성 수 | 돌파 | 순수익 양수 | 최고 순수익 |','|---|---:|---:|---:|---:|');
for(const r of ratioSummary)md.push(`| ${r.ratio} | ${r.cases} | ${r.wins} | ${r.profitable} | ${r.best.toFixed(0)} |`);
md.push('','## 판단과 제한','',...findings.map(v=>`- ${v}`));if(!findings.length)md.push('- 정의한 대함 표본에서 공격 승리 비율80% 초과 후보는 없었다. 실전 전쟁 전체의 균형 증명은 아니다.');
md.push('- 정비선의 연속 작전 회복·예인·정찰 탐지·탄약 재장전·귀환 요격·퇴각·제3자 잔해 회수는 실행하지 않는다. 지원 함종의 전체 가치를 한 교전으로 판정하지 않는다.','- 동률 예산에서 방어 돌파가 손해여도 방어의 억제 역할일 수 있다. 공성·주둔·수송의 실제 투자 비율과 비축·거리를 함께 판단한다.','- 같은 숫자와 사격 순서는 같은 결과다. 확률 통계 신뢰구간이나 실제 플레이 승률로 보고하지 않는다.','');
const result={version:c.version,strikerAttack:ships.get('striker').attack,rules:DEFAULT_RULES,mixed,fortresses,garrisons,cases,economics,investmentRatios,ratioSummary,asymmetric,supportSensitivity,summary,findings,shortlist,checks};
if(attackControl)writeFileSync(out('combat-attack-control.json'),JSON.stringify({version:c.version,strikerAttack:65,rules:DEFAULT_RULES,summary,findings,ratioSummary,checks},null,2)+'\n');
else{writeFileSync(out('combat-benchmark-results.json'),jsonReport(result));writeFileSync(out('COMBAT_AND_RAID_V0.2.md'),md.join('\n'));}
console.log(JSON.stringify({control:attackControl,battles:cases.length,economics:economics.length,ratios:investmentRatios.length,asymmetric:asymmetric.length,support:supportSensitivity.length,checks,findings,ratioSummary,striker:summary.find(r=>r.id==='striker')}));
