import { mkdirSync, writeFileSync } from 'node:fs';
import { MISSIONS, ROSTER, SUPPORTS } from '../src/game/content.ts';
import { validateFleet } from '../src/game/fleet.ts';
import { initialState, reduceGame } from '../src/game/state.ts';
import type { Approach, Support } from '../src/game/types.ts';

const rows: {mission:string; fleet:string; support:Support; route:Approach; primary:boolean; returned:number; advanced:number; lost:number}[] = [];
for (const mission of MISSIONS) {
  for (let mask = 1; mask < (1 << ROSTER.length); mask++) {
    const fleetIds = ROSTER.filter((_, i) => mask & (1 << i)).map(s => s.id);
    for (const support of SUPPORTS) for (const approach of ['direct','flank'] as const) {
      if (validateFleet(fleetIds, support.id, approach).length) continue;
      const state = reduceGame(initialState(), {type:'launch',missionId:mission.id,fleetIds,support:support.id,approach});
      const returned = reduceGame(state,{type:'return'}).operation!;
      const advanced = reduceGame(state,{type:'advance'}).operation!;
      if (advanced.cargoOffered !== advanced.recovered + advanced.cargoLost + advanced.cargoUnloaded) throw Error('Cargo conservation failed');
      rows.push({mission:mission.id,fleet:fleetIds.join('+'),support:support.id,route:approach,primary:state.operation?.phase==='checkpoint',returned:returned.recovered,advanced:advanced.recovered,lost:advanced.cargoLost});
    }
  }
}
const report = ['# 편성 열거 검증', '', '규칙 command-center-v1. 초기 모듈 없음, 보유 함선 9척의 모든 부분집합에서 지휘 12·최대 6척 조건과 경로 조건을 만족하는 지원/경로 조합을 열거했다. 난수 없음. 승률은 인간 플레이 예측이 아니라 이 열거 집합의 비율이다.', '', `전체 ${rows.length.toLocaleString('en-US')}개 출격 조건. 기본 교전 후 귀환과 추가 진입을 각각 비교했다. 모든 결과에서 화물 보존을 검사했다.`, '', '| 임무 | 조합 | 기본 승리 | 최대 귀환/추가 | 추가 진입 이익/손해/동일 |', '|---|---:|---:|---:|---:|'];
for (const m of MISSIONS) {
  const r=rows.filter(x=>x.mission===m.id);
  report.push(`| ${m.title} | ${r.length} | ${r.filter(x=>x.primary).length} | ${Math.max(...r.map(x=>x.returned))} / ${Math.max(...r.map(x=>x.advanced))} | ${r.filter(x=>x.advanced>x.returned).length} / ${r.filter(x=>x.advanced<x.returned).length} / ${r.filter(x=>x.advanced===x.returned).length} |`);
}
report.push('', '## 지원별 결과', '', '| 임무 | 지원 | 기본 승리 / 출격 | 추가 진입 후 평균 귀환 화물 |', '|---|---|---:|---:|');
for(const m of MISSIONS) for(const s of SUPPORTS) {
 const r=rows.filter(x=>x.mission===m.id&&x.support===s.id);
 report.push(`| ${m.id} | ${s.name} | ${r.filter(x=>x.primary).length} / ${r.length} | ${(r.reduce((sum,x)=>sum+x.advanced,0)/r.length).toFixed(2)} |`);
}
report.push('', '## 목표별 상위 사례', '', '동점 중 첫 3개만 표시. 최적 해의 유일성이나 실제 재미를 주장하지 않는다.');
for(const m of MISSIONS) {
 const r=rows.filter(x=>x.mission===m.id).sort((a,b)=>b.advanced-a.advanced||b.returned-a.returned).slice(0,3);
 report.push('', `### ${m.title}`, '', ...r.map(x=>`- ${x.fleet} / ${x.support} / ${x.route}: 귀환 ${x.returned}, 추가 ${x.advanced}, 손실 ${x.lost}`));
}
report.push('', '## 해석의 한계', '', '- 지원 없음은 기준선이다. 지원 비용과 실제 길드원의 제한은 아직 없어서 지원 선택의 경제적 균형을 입증하지 않는다.', '- 정찰 지원은 우회 가능한 집합을 늘리므로 지원별 전체 평균의 모집단이 다르다. 인과 비교에는 같은 편성·경로를 사용해야 한다.', '- 피해/화물 보존과 진입 위험의 존재를 검증했다. 실제 협동 재미, 장기 경제, PvP 공정성, 인간의 가독성은 별도 플레이테스트가 필요하다.', '- 생성 명령: `npm run simulate`. 전체 행: `balance.csv`.');
mkdirSync('docs/validation',{recursive:true});
writeFileSync('docs/validation/BALANCE_REPORT.md', report.join('\n')+'\n');
writeFileSync('docs/validation/balance.csv', 'mission,fleet,support,route,primary,returned,advanced,lost\n'+rows.map(x=>Object.values(x).join(',')).join('\n')+'\n');
console.log(report.slice(0,12).join('\n'));
