// Presentation-only review fixtures. No commands, storage, timers or game imports.
// Catalog parity is tested against src/empire/content.ts; these are not a second economy.
import {ships} from './operations.js';
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const technologies=freeze([
 {id:'industry',name:'산업 기술',icon:'build',effect:'수준당 모든 자원 기본 생산 +1/분 · 정비함/항모 건조 해금'},
 {id:'propulsion',name:'추진 기술',icon:'fleet',effect:'후속 성계 이동의 선행 기술 · 현재 이동 속도 효과는 미연결'},
 {id:'intelligence',name:'정보 기술',icon:'recon',effect:'교란함 건조 해금 · 정찰 해상도는 성계 단계에서 연결'},
 {id:'defense',name:'방어 기술',icon:'defense',effect:'호위함/공성함 건조 해금'}
]);
export const shipBuild=freeze({
 scout:{cost:{alloy:20,crystal:10,fuel:5},seconds:20,shipyard:1},
 salvage:{cost:{alloy:30,crystal:10,fuel:5},seconds:30,shipyard:1},
 striker:{cost:{alloy:40,crystal:20,fuel:10},seconds:40,shipyard:1},
 support:{cost:{alloy:40,crystal:30,fuel:10},seconds:45,shipyard:1,technology:'industry',level:1},
 jammer:{cost:{alloy:40,crystal:40,fuel:15},seconds:50,shipyard:1,technology:'intelligence',level:1},
 guardian:{cost:{alloy:70,crystal:30,fuel:15},seconds:60,shipyard:2,technology:'defense',level:1},
 siege:{cost:{alloy:80,crystal:30,fuel:20},seconds:70,shipyard:2,technology:'defense',level:1},
 carrier:{cost:{alloy:120,crystal:80,fuel:30},seconds:100,shipyard:3,technology:'industry',level:2}
});
const keys=['alloy','crystal','fuel'],names={alloy:'합금',crystal:'결정',fuel:'연료'};
const scale=(cost,n)=>Object.fromEntries(keys.map(k=>[k,cost[k]*n]));
export const initialDevelopment=()=>({technology:'industry',ship:'striker',quantity:'1',scenario:'snapshot'});
const source=state=>state.planets.find(p=>p.id===state.selected)||state.planets[0];
const common=(state,p,cost)=>{
 const issues=[];
 if(state.connection!=='ready')issues.push('연결 상태를 먼저 확인하세요.');
 if(cost)for(const k of keys)if(p.resources[k]<cost[k])issues.push(names[k]+' '+(cost[k]-p.resources[k])+' 부족');
 const f=p.facilities,demanded=6*f.alloyMine+4*f.crystalMine+6*f.fuelRefinery+8+6+2*p.defenses;
 if(60*f.powerPlant<demanded)issues.push('전력 부족 · 발전소 증설이 필요합니다.');
 return issues;
};
export function researchPlan(state,ui=initialDevelopment()){
 const p=source(state),tech=technologies.find(t=>t.id===ui.technology)||technologies[0];
 const level=ui.scenario==='max'?3:0,next=Math.min(3,level+1);
 const cost=level>=3?null:{alloy:40*next,crystal:30*next,fuel:10*next};
 const issues=common(state,p,cost);
 if(level>=3)issues.push('현재 최대 연구 수준3입니다.');
 if(p.facilities.laboratory<next)issues.push('연구소 Lv.'+next+' 필요 · 현재 Lv.'+p.facilities.laboratory);
 if(!state.empty)issues.push('제국 연구가 진행 중입니다. 현재 작업을 먼저 확인하세요.');
 const unlocks=ships.filter(s=>shipBuild[s.id].technology===tech.id&&shipBuild[s.id].level===next).map(s=>s.name);
 return {kind:'research',source:p,target:tech.id,name:tech.name,effect:tech.effect,level,next,cost,seconds:cost?90*next:null,issues,unlocks};
}
export function shipPlan(state,ui=initialDevelopment()){
 const p=source(state),ship=ships.find(s=>s.id===ui.ship)||ships[0],build=shipBuild[ship.id];
 const raw=String(ui.quantity??''),n=Number(raw),validQuantity=/^\d+$/.test(raw)&&Number.isSafeInteger(n)&&n>=1&&n<=20;
 const cost=validQuantity?scale(build.cost,n):null,issues=common(state,p,cost);
 if(!validQuantity)issues.unshift('건조 수량은 1~20 사이의 정수여야 합니다.');
 if(p.facilities.shipyard<build.shipyard)issues.push('조선소 Lv.'+build.shipyard+' 필요 · 현재 Lv.'+p.facilities.shipyard);
 if(build.technology)issues.push(technologies.find(t=>t.id===build.technology).name+' Lv.'+build.level+' 필요 · 검토 예시 현재 Lv.0');
 if(!state.empty&&p.id==='nova')issues.push('현지 함선 건조가 진행 중입니다. 건조 대기열을 확인하세요.');
 return {kind:'ships',source:p,target:ship.id,name:ship.name,ship,build,quantity:validQuantity?n:null,validQuantity,cost,seconds:validQuantity?build.seconds*n:null,issues};
}
export function cancellationPlan(state,kind,scenario='snapshot',paidOverride){
 const p=kind==='research'?state.planets.find(p=>p.id==='nova'):source(state);
 const exists=p&&!state.empty&&(kind==='research'||p.id==='nova')&&['research','ships','construction'].includes(kind);
 if(!exists)return {job:null,allowed:false,issues:['검토할 진행 작업이 없습니다.']};
 const f=p.facilities.fuelRefinery;
 const paid=paidOverride|| (kind==='research'?{alloy:40,crystal:30,fuel:10}:kind==='ships'?scale(shipBuild.striker.cost,3):{alloy:40*f,crystal:10*f,fuel:10*f});
 const job={kind,name:kind==='research'?'산업 기술 Lv.1':kind==='ships'?'케스트럴 3척':'연료 합성소 Lv.'+(f+1)};
 const completed=scenario==='completed',current={...p.resources};
 if(scenario==='capacity')for(const k of keys)current[k]=p.capacities[k]-1;
 const refund=Object.fromEntries(keys.map(k=>[k,completed?0:Math.floor(paid[k]*.8)]));
 const forfeit=Object.fromEntries(keys.map(k=>[k,paid[k]-refund[k]]));
 const after=Object.fromEntries(keys.map(k=>[k,current[k]+refund[k]])),issues=[];
 if(completed)issues.push('완료 시각에 도달한 작업은 취소할 수 없습니다.');
 else for(const k of keys)if(after[k]>p.capacities[k])issues.push(names[k]+' 저장 공간 '+(after[k]-p.capacities[k])+' 부족');
 if(state.connection!=='ready')issues.push('연결 상태를 먼저 확인하세요.');
 return {job,source:p,paid,refund,forfeit,current,after,capacities:p.capacities,scenario,issues,allowed:!issues.length};
}
