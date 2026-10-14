import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {replay,round} from './economy-model.mjs';
const out=name=>fileURLToPath(new URL(name,import.meta.url));
const data=JSON.parse(readFileSync(out('command-plans.json'),'utf8'));
const cases=[];
for(const plan of data.plans)for(const calendar of [true,false])for(const visits of [1,2,4]){
  const result=replay(plan,visits,{calendar});cases.push(result);
  if(calendar&&visits===2){assert.equal(Math.round(result.produced),plan.reference.produced,'Reference plan replay');assert.deepEqual(result.levels,plan.reference.levels);assert.deepEqual(result.research,plan.reference.research);assert.equal(result.fleetValue,plan.reference.fleetValue);}
}
const comparison=[];
for(const plan of data.plans)for(const calendar of [true,false]){
  const selected=cases.filter(r=>r.profile===plan.profile&&r.calendar===calendar),base=selected.find(r=>r.visits===2);
  for(const r of selected)comparison.push({profile:r.profile,calendar,visits:r.visits,productionPercent:round(100*r.produced/base.produced),submittedPercent:round(100*r.submittedCommands/r.planCommands)});
}
const findings=comparison.filter(r=>(r.visits===1&&r.productionPercent<80)||(r.visits===4&&r.productionPercent>115));
const md=['# 동일 투자 계획의 접속 빈도 검증 v0.2','','2026-10-14. 후보 시즌 규칙의 통제 실험이다. 창고6,000이던 v0.1 정책 비교의 군사 하루1회/2회 생산149.3% 역전은 매 접속의 선택·예산 재배정이 달랐기 때문이다. 현재 정책 비교는 [별도 보고서](BALANCE_AUDIT_V0.1.md)에 보존한다. 이 실험은 각 경로의 하루2회 실행에서 건설·연구·함종·수량·큐 사이의 전체 명령 순서까지 추출해 고정했다. 뒤 명령이 앞 명령을 추월하지 않는다.','','`node docs/design/balance/audit.mjs` 후 `node docs/design/balance/controlled-economy.mjs`로 재현한다. 원 명령 계획은 [command-plans.json](command-plans.json), 계산은 [economy-model.mjs](economy-model.mjs), 전체 결과는 [controlled-economy-results.json](controlled-economy-results.json)이다.','',
 '달력 고정 실험은 원 계획의 명령 예정 시각도 고정하고 각 접속에서 밀린 명령을 처리한다. 순서 고정 실험은 예정 시각을 제거하여 같은 투자 목록을 조건·자원·큐가 허용하는 한 빨리 예약한다. 어느 경우도 하루1/4회에 다른 함종이나 연구를 선택하지 않는다. 시작 시각에 최초 접속을 공통 제공한다. 자원은 계획 예약 때 실제 현지 잔고에서 묶고 지급은 완료 때 한다. 15분 간격·본성1개·무전투이며 순수 자원별 보존을 검사했다. 달력 고정 하루2회는 원 시뮬레이션의 생산·레벨·연구·유료 함대 가치를 그대로 재현하는지 별도로 확인했다.','',
 '| 경로 | 통제 | 접속/일 | 누적 실제 생산 | 하루2회 대비 | 포화 전 잠재 생산 | 명령 접수/계획 | 완료 건설/연구/함대 주문 |','|---|---|---:|---:|---:|---:|---:|---|'];
for(const r of cases){const v=comparison.find(x=>x.profile===r.profile&&x.calendar===r.calendar&&x.visits===r.visits);md.push(`| ${r.profile} | ${r.calendar?'달력+순서':'순서'} | ${r.visits} | ${Math.round(r.produced).toLocaleString('en-US')} | ${v.productionPercent.toFixed(2)}% | ${Math.round(r.potential).toLocaleString('en-US')} | ${r.submittedCommands}/${r.planCommands} | ${Object.values(r.completed).join('/')} |`);}
md.push('','## 판단','',...findings.map(r=>`- ${r.profile}/${r.calendar?'달력':'순서'}: 하루${r.visits}회가 기준2회의${r.productionPercent.toFixed(2)}%다. 목표(1회≥80%,4회≤115%)에 미달하여 계획 큐·예약 방식 보정이 필요하다.`));
if(!findings.length)md.push('- 세 고정 투자 경로 모두 정의한 접속 생산 목표(하루1회는2회의80% 이상,4회는115% 이하)를 만족했다. 이는 이 목록·큐·가격·관측 기간에 한정한 결과다.');
md.push('- 유한한 투자 목록을 모두 완료하고 최종 저장량도 같으면 실제 누적 생산은 자원 보존 때문에 같아질 수 있다. 조기 성장·완료 시각·포화 전 잠재 생산까지 동일하다는 뜻이 아니며 JSON에 중간 시점 기록을 보존했다. 잠재 생산은 실제 비축이나 생산 랭킹에 더하지 않는다.','- 최적 플레이·다른 투자 목록·새 플레이어의 실제 행동·접속 빈도의 보편적 우월성을 증명하지 않는다. 예산 정책이 매 접속에서 달라지는 이전 결과와 이 통제 결과는 따로 보존한다.','- 작업 계획과 저장이 접속 공백을 감당하는지 검증하는 자료이며 접속 자체에 생산 보너스를 지급하는 규칙은 없다.','');
writeFileSync(out('controlled-economy-results.json'),JSON.stringify({version:data.version,cases,comparison,findings},null,2)+'\n');writeFileSync(out('CONTROLLED_ECONOMY_V0.2.md'),md.join('\n'));
console.log(JSON.stringify({cases:cases.length,referenceReplays:3,findings,comparison}));
