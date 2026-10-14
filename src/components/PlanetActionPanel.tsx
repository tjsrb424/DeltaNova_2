import { useState } from "react";
import type { EmpireState, PlanetState, EmpireAction, FacilityId, TechnologyId } from "../empire/types.ts";
import { FACILITY_IDS, FACILITY_NAMES, TECHNOLOGY_IDS, TECHNOLOGY_NAMES, TECHNOLOGY_EFFECTS, SHIP_BUILD, facilityQuote, researchQuote, DEFENSE_QUOTE, scaledCost } from "../empire/content.ts";
import { power, facilitySpace } from "../empire/economy.ts";
import { SHIPS } from "../game/content.ts";
import ShipGlyph from "./ShipGlyph.tsx";
import { Cost, costError, duration, EmpireIcon } from "./EmpireUI.tsx";
export type ActionMode="shipyard"|"construction"|"defense"|"research";
export default function PlanetActionPanel({state,planet:p,mode,locked,send,target="",onTargetChange}:{state:EmpireState;planet:PlanetState;mode:ActionMode;locked:boolean;send:(a:EmpireAction)=>void;target?:string;onTargetChange?:(target:string)=>void}) {
  const [choice,setChoice]=useState(target),[quantity,setQuantity]=useState(1),selected=onTargetChange?target:choice;
  const shipId=SHIPS.some(s=>s.id===selected)?selected:"striker",facility=FACILITY_IDS.includes(selected as FacilityId)?selected as FacilityId:"alloyMine",technology=TECHNOLOGY_IDS.includes(selected as TechnologyId)?selected as TechnologyId:"industry";
  const selectTarget=(value:string)=>{setChoice(value);onTargetChange?.(value);};
  const ship=SHIPS.find(s=>s.id===shipId)!,def=SHIP_BUILD[shipId],validQuantity=Number.isSafeInteger(quantity)&&quantity>=1&&quantity<=20;
  const shipCost=scaledCost(def.cost,validQuantity?quantity:1),fQuote=facilityQuote(facility,p.facilities[facility]),rQuote=researchQuote(state.technologies[technology]+1);
  const quote=mode==="shipyard"?{cost:shipCost,seconds:def.seconds*(validQuantity?quantity:1)}:mode==="construction"?fQuote:mode==="research"?rQuote:DEFENSE_QUOTE;
  const watts=power(p),space=facilitySpace(p),powerShort=watts.demanded>watts.supplied&&!(mode==="construction"&&facility==="powerPlant");
  let reason=costError(p,quote.cost);
  if(mode==="shipyard") {
    if(!validQuantity) reason="건조 수량은 1~20 사이의 정수여야 합니다.";
    else if(p.shipJob) reason="이 행성의 함선 건조가 진행 중입니다.";
    else if(p.facilities.shipyard<def.shipyard||(def.technology&&state.technologies[def.technology]<(def.level||1))) reason="필요한 조선소 수준과 연구를 먼저 확보하세요.";
  } else if(mode==="research") {
    if(state.researchJob) reason="제국 연구가 진행 중입니다.";
    else if(state.technologies[technology]>=3) reason="현재 최대 연구 수준3에 도달했습니다.";
    else if(p.facilities.laboratory<state.technologies[technology]+1) reason="다음 수준에 맞는 연구소 증설이 필요합니다.";
  } else {
    if(p.constructionJob) reason="이 행성의 건설이 진행 중입니다.";
    else if(space.used+space.reserved>=space.capacity) reason="시설 공간이 부족합니다.";
    else if(mode==="construction"&&p.facilities[facility]>=5) reason="현재 최대 시설 레벨5에 도달했습니다.";
  }
  if(powerShort) reason="전력이 부족합니다. 발전소를 증설하세요.";
  const title=mode==="shipyard"?"궤도 조선소 Lv."+p.facilities.shipyard:mode==="construction"?FACILITY_NAMES[facility]+" Lv."+p.facilities[facility]:mode==="research"?"제국 공통 연구":"현지 방어 거점";
  const action:EmpireAction=mode==="shipyard"?{type:"build-ships",planetId:p.id,shipId,quantity}:mode==="construction"?{type:"upgrade-facility",planetId:p.id,facility}:mode==="research"?{type:"start-research",planetId:p.id,technology}:{type:"build-defense",planetId:p.id};
  const label=mode==="shipyard"?ship.name+" 건조":mode==="construction"?FACILITY_NAMES[facility]+" 증설":mode==="research"?TECHNOLOGY_NAMES[technology]+" 연구":"방어 포대 건설";
  return <section className="empire-action empire-card"><div className="empire-heading"><h2>{title}</h2><EmpireIcon kind={mode==="research"?"research":mode==="defense"?"defense":mode==="shipyard"?"fleet":"build"}/></div><p className="action-source">{mode==="research"?"비용 출처: ":"현지 투자: "}{p.name}</p>
    {mode==="shipyard"?<>
      <div className="empire-ship-preview"><ShipGlyph role={ship.role} color="#e7e5db"/><div><strong>{ship.name}</strong><span>기본 선체 HP {ship.hp} · 화물 {ship.cargo}</span></div></div>
      <label className="empire-field">건조 함선<select aria-label="건조 함선" value={shipId} onChange={e=>selectTarget(e.target.value)}>{SHIPS.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label>
      <p className="action-description">{ship.description}</p>
      <div className="quantity-control"><span>건조 수량</span><button aria-label="건조 수량 줄이기" disabled={quantity<=1} onClick={()=>setQuantity(Math.max(1,quantity-1))}>−</button><input aria-label="건조 수량" type="number" min={1} max={20} step={1} value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/><button aria-label="건조 수량 늘리기" disabled={quantity>=20} onClick={()=>setQuantity(Math.min(20,quantity+1))}>+</button></div>
      <p className="build-requirement">조선소 {def.shipyard}{def.technology?" · "+TECHNOLOGY_NAMES[def.technology]+" "+(def.level||1):""}</p>
    </>:mode==="construction"?<>
      <label className="empire-field">시설 선택<select aria-label="시설 선택" value={facility} onChange={e=>selectTarget(e.target.value)}>{FACILITY_IDS.map(id=><option key={id} value={id}>{FACILITY_NAMES[id]}</option>)}</select></label>
      <div className="growth-preview"><EmpireIcon kind="build"/><strong>Lv.{p.facilities[facility]} → Lv.{Math.min(5,p.facilities[facility]+1)}</strong></div><p className="action-description">완료 시 시설 수준과 생산·저장 또는 연구·건조 조건이 갱신됩니다.</p><p className="build-requirement">공간 {space.used+space.reserved}/{space.capacity} · 전력 {watts.demanded}/{watts.supplied}</p>
    </>:mode==="research"?<>
      <label className="empire-field">연구 기술<select aria-label="연구 기술" value={technology} onChange={e=>selectTarget(e.target.value)}>{TECHNOLOGY_IDS.map(id=><option key={id} value={id}>{TECHNOLOGY_NAMES[id]}</option>)}</select></label>
      <div className="growth-preview"><EmpireIcon kind="research"/><strong>Lv.{state.technologies[technology]} → Lv.{Math.min(3,state.technologies[technology]+1)}</strong></div><p className="action-description">{TECHNOLOGY_EFFECTS[technology]}</p><p className="build-requirement">모든 행성에 공유 · 연구소 {state.technologies[technology]+1} 필요</p>
    </>:<><div className="growth-preview"><EmpireIcon kind="defense"/><strong>현지 포대 {p.defenses}기</strong></div><p className="action-description">주둔 함대와 함께 사용할 방어망을 준비합니다. 실제 접근 함대 대응은 성계 단계에서 연결됩니다.</p><p className="build-requirement">완료 후 전력 수요 {watts.demanded+2}/{watts.supplied} · 공간 +1</p></>}
    <Cost cost={quote.cost}/><div className="action-time"><EmpireIcon kind="reports"/><span>{mode==="research"?"연구":mode==="shipyard"?"건조":"건설"} 시간</span><strong>{duration(quote.seconds*1000)}</strong></div>
    {reason&&<p className="action-reason" role="status">{reason}</p>}
    <button className="empire-primary" disabled={locked||!!reason} onClick={()=>send(action)}><EmpireIcon kind={mode==="shipyard"?"fleet":mode==="research"?"research":"build"}/>{label}</button>
    <p className="action-footnote">비용은 시작 때 지불합니다. 완료 전 취소 시 80%를 반환합니다.</p>
  </section>;
}
