import { useLayoutEffect, useRef, useState } from "react";
import type { EmpireState, PlanetState, EmpireAction } from "../empire/types.ts";
import type { Support, Approach } from "../game/types.ts";
import { SHIPS, MISSIONS, SUPPORTS, MODULES } from "../game/content.ts";
import { validateFleet } from "../game/fleet.ts";
import { fleetContext } from "../empire/career.ts";
import ShipGlyph from "./ShipGlyph.tsx";
import OperationPanel from "./OperationPanel.tsx";
import { shipLabel, EmpireIcon } from "./EmpireUI.tsx";
type Props={state:EmpireState;planet:PlanetState;locked:boolean;send:(action:EmpireAction)=>void};
export default function EmpireFleetPanel({planet:p,locked,send}:Props) {
  const damaged=p.ships.filter(sh=>sh.status==="docked"&&sh.wear>0),cost=damaged.reduce((n,sh)=>n+Math.ceil(sh.wear/10),0);
  return <section className="empire-card empire-fleet"><div className="empire-heading"><h2>현지 함대</h2><EmpireIcon kind="fleet"/></div><p className="action-source">{p.name} · 보유 {p.ships.length}척</p>
    <div className="fleet-inventory">{p.ships.map((sh,i)=>{const def=SHIPS.find(s=>s.id===sh.shipId)!;return <div className="inventory-ship" key={sh.id}><ShipGlyph role={def.role} color="#dddcd3" small/><div><strong>{shipLabel(p,i)}</strong><small>{sh.status==="deployed"?"출격 중":sh.wear?"정비 필요 · 손실 HP "+sh.wear:"도킹 · 출격 가능"}</small></div></div>;})}</div>
    {p.ships.length===0&&<p className="empty-jobs">이 행성에 주둔한 함선이 없습니다. 조선소에서 첫 함선을 건조하세요.</p>}
    <button className="empire-primary" disabled={locked||!damaged.length||p.resources.alloy<cost} onClick={()=>send({type:"repair-fleet",planetId:p.id,fleetIds:damaged.map(sh=>sh.id)})}>손상 함선 일괄 정비</button><p className="action-footnote">정비 비용 합금 {cost} · 출격 중인 함선 제외</p>
  </section>;
}
export function EmpireCareerPanel({state,planet:p,locked,send,onResearch}:Props & {onResearch:()=>void}) {
  const [selected,setSelected]=useState<string[]>([]),[missionId,setMissionId]=useState(MISSIONS[0].id),[support,setSupport]=useState<Support>("none"),[approach,setApproach]=useState<Approach>("direct");
  const panel=useRef<HTMLElement>(null),operationKey=state.career.operation?state.career.operation.id+":"+state.career.operation.phase:"";
  const previousOperation=useRef(operationKey);
  useLayoutEffect(()=>{
    const changed=previousOperation.current!==operationKey;
    previousOperation.current=operationKey;
    if(!changed) return;
    const destination=state.career.operation?.phase==="result"?panel.current?.querySelector<HTMLElement>(".decision-panel"):panel.current;
    destination?.scrollIntoView?.({block:"start",behavior:"instant"});
    destination?.focus({preventScroll:true});
  },[operationKey,state.career.operation?.phase]);
  const available=p.ships.filter(sh=>sh.status==="docked"&&sh.wear===0),chosen=selected.filter(id=>available.some(sh=>sh.id===id)),context=fleetContext(p);
  const errors=validateFleet(chosen,support,approach,context),fuel=chosen.reduce((n,id)=>n+SHIPS.find(def=>def.id===p.ships.find(sh=>sh.id===id)!.shipId)!.command,support==="none"?0:2);
  const dispatch=(action:import("../game/types.ts").GameAction)=>send({type:"career-action",planetId:p.id,action});
  if(state.career.operation) return <section className="empire-career-results" ref={panel} tabIndex={-1}><OperationPanel operation={state.career.operation} locked={locked} onAction={dispatch} onBase={()=>{dispatch({type:"dismiss"});onResearch();}} maintenance/></section>;
  function recommend() {let budget=12;const preferred=["striker","striker","guardian","salvage"],ids:string[]=[];for(const type of preferred){const sh=available.find(sh=>sh.shipId===type&&!ids.includes(sh.id));if(sh){const cost=SHIPS.find(d=>d.id===type)!.command;if(cost<=budget){ids.push(sh.id);budget-=cost;}}}setSelected(ids);}
  return <section className="empire-card empire-career" ref={panel} tabIndex={-1}><div className="empire-heading"><h2>개인 작전</h2><EmpireIcon kind="fleet"/></div><p className="action-source">출발지 {p.name} · 비용과 정비를 같은 기지에 반영</p>
    <label className="empire-field">작전 목표<select aria-label="작전 목표" value={missionId} onChange={e=>setMissionId(e.target.value)}>{MISSIONS.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
    <section aria-label="개인 작전 편성" className="career-fleet-picker"><button className="quiet-action" disabled={locked} onClick={recommend}>추천 편성 적용</button>{p.ships.map((sh,i)=><label key={sh.id}><input type="checkbox" aria-label={shipLabel(p,i)+" 편성"} checked={chosen.includes(sh.id)} disabled={locked||sh.status!=="docked"||sh.wear>0} onChange={()=>setSelected(chosen.includes(sh.id)?chosen.filter(id=>id!==sh.id):[...chosen,sh.id])}/><span>{shipLabel(p,i)}</span><small>{sh.status==="deployed"?"출격":sh.wear?"정비":"가용"}</small></label>)}</section>
    <label className="empire-field">지원 종류<select aria-label="지원 종류" value={support} onChange={e=>setSupport(e.target.value as Support)}>{SUPPORTS.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    <label className="empire-field">접근 경로<select aria-label="접근 경로" value={approach} onChange={e=>setApproach(e.target.value as Approach)}><option value="direct">직행 항로</option><option value="flank">우회 항로</option></select></label>
    <p className="action-footnote">기존 임무 한 번의 편성: 최대6척 · 지휘12. 전체 보유량의 상한이 아닙니다.</p><p>출격 연료 {fuel} · 선택 {chosen.length}척</p>
    {errors.length>0&&<p className="action-reason">{errors[0]}</p>}{p.resources.fuel<fuel&&<p className="action-reason">연료가 부족합니다.</p>}
    <button className="empire-primary" disabled={locked||errors.length>0||p.resources.fuel<fuel} onClick={()=>dispatch({type:"launch",missionId,fleetIds:chosen,support,approach})}>개인 작전 출격</button>
    <details className="legacy-modules"><summary>기존 작전 모듈 · 연구 데이터 {state.career.profile.research}</summary>{MODULES.map(m=><div key={m.id}><strong>{m.name}</strong><p>{m.description}</p><button className="empire-secondary" disabled={locked||state.career.profile.active===m.id||(!state.career.profile.unlocked.includes(m.id)&&(state.career.profile.research<m.cost||p.resources.alloy<40))} onClick={()=>dispatch({type:state.career.profile.unlocked.includes(m.id)?"activate-module":"unlock-module",module:m.id})}>{state.career.profile.unlocked.includes(m.id)?m.name+" 적용":m.name+" 해금"}</button></div>)}</details>
  </section>;
}
