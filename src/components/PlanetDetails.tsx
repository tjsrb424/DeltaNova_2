import type { EmpireAction, EmpireState, PlanetState } from "../empire/types.ts";
import { useCallback, useLayoutEffect, useRef } from "react";
import { FACILITY_IDS, FACILITY_NAMES, TECHNOLOGY_IDS, TECHNOLOGY_NAMES } from "../empire/content.ts";
import PlanetActionPanel from "./PlanetActionPanel.tsx";
import type { ActionMode } from "./PlanetActionPanel.tsx";
import EmpireFleetPanel, { EmpireCareerPanel } from "./EmpireFleetPanel.tsx";
import DevelopmentMap from "./DevelopmentMap.tsx";
import FacilityArt from "./FacilityArt.tsx";
import { EmpireIcon } from "./EmpireUI.tsx";
import { capacities, power, productionRates } from "../empire/economy.ts";
export type DetailSection = "fleet" | "construction" | "research" | "career" | "reports";
type Props = { section: DetailSection; state: EmpireState; planet: PlanetState; mode: ActionMode; target: string; inspectionRequest?: number; now: number; locked: boolean; send: (a: EmpireAction) => void; onAction: (mode: ActionMode, target?: string) => void; onTargetChange: (target: string) => void; onCareer: () => void };
export default function PlanetDetails({ section, state, planet, mode, target, inspectionRequest = 0, now, locked, send, onAction, onTargetChange, onCareer }: Props) {
  const inspector = useRef<HTMLDivElement>(null);
  const previousRequest = useRef(0);
  const previousContext = useRef<string | null>(null), context = section + ":" + planet.id;
  const showInspector = useCallback(() => {
    inspector.current?.scrollIntoView?.({ block: "start", behavior: "instant" });
    inspector.current?.focus({ preventScroll: true });
  }, []);
  useLayoutEffect(() => {
    const changed = previousContext.current !== context;
    const requested = inspectionRequest > 0 && previousRequest.current !== inspectionRequest;
    previousContext.current = context;
    previousRequest.current = inspectionRequest;
    if ((changed && target) || requested) showInspector();
  }, [context, target, inspectionRequest, showInspector]);
  function inspect(next: ActionMode, selection?: string) {
    onAction(next, selection);
  }
  const panel = <PlanetActionPanel key={planet.id + ":" + mode} state={state} planet={planet} mode={mode} target={target} onTargetChange={onTargetChange} locked={locked} send={send}/>;
  const actionInspector = <div className="action-inspector" ref={inspector} tabIndex={-1}>{panel}</div>;
  const atlas = <DevelopmentMap state={state} planet={planet} now={now} onInspect={inspect}/>;
  if (section === "construction") {
    const rates = productionRates(planet, state.technologies), cap = capacities(planet), watts = power(planet);
    return <section className="detail-page construction-page">
      <div className="detail-title"><div><p className="section-kicker">PLANET DEVELOPMENT</p><h2>건설 상세</h2></div><div className="mode-tabs"><button aria-pressed={mode !== "defense"} onClick={() => onAction("construction")}>시설 증설</button><button aria-pressed={mode === "defense"} onClick={() => onAction("defense")}>방어망</button><button onClick={() => onAction("research")}>발전지도 →</button></div></div>
      <div className="detail-columns construction-columns"><div className="construction-library"><div className="catalog-heading"><span>행성 시설</span><small>시설을 선택해 증설 효과 확인</small></div><div className="facility-catalog" aria-label="시설 목록">{FACILITY_IDS.map(id => {
        const resource = id === "alloyMine" ? "alloy" : id === "crystalMine" ? "crystal" : id === "fuelRefinery" ? "fuel" : null;
        const caption = resource ? `+${rates[resource]}/분 · 저장 ${cap[resource]}` : id === "powerPlant" ? `공급 ${watts.supplied} · 여유 ${watts.supplied - watts.demanded}` : id === "laboratory" ? "공통 연구의 시설 요건" : "함선 건조의 시설 요건";
        return <button key={id} aria-pressed={(target || "alloyMine") === id && mode !== "defense"} className={(target || "alloyMine") === id && mode !== "defense" ? "selected" : ""} onClick={() => onAction("construction", id)}><FacilityArt facility={id}/><span>{FACILITY_NAMES[id]}<strong>Lv.{planet.facilities[id]}{planet.constructionJob?.target === id && " → " + planet.constructionJob.level}</strong><small>{planet.constructionJob?.target === id ? "건설 중" : planet.facilities[id] >= 5 ? "최대 수준" : caption}</small></span><span className="catalog-arrow" aria-hidden="true">›</span></button>;
      })}</div></div>{panel}</div>
    </section>;
  }
  if (section === "fleet") return <section className="detail-page"><div className="detail-title"><h2>함대 운영·건조</h2><div className="mode-tabs"><button onClick={showInspector}>함선 건조 상세</button><button onClick={onCareer}>개인 작전 편성 →</button></div></div><div className="detail-columns"><EmpireFleetPanel state={state} planet={planet} locked={locked} send={send}/>{actionInspector}</div><details className="growth-disclosure"><summary>발전지도 · 추가 함선 건조 요건</summary>{atlas}</details></section>;
  if (section === "research") return <section className="detail-page"><div className="detail-title"><h2>연구·성장 상세</h2><div className="mode-tabs"><button onClick={showInspector}>기술 연구 상세</button></div></div>{atlas}<div className="detail-columns research-controls"><div className="technology-catalog">{TECHNOLOGY_IDS.map(id => <button key={id} aria-pressed={(target || "industry") === id} className={(target || "industry") === id ? "selected" : ""} onClick={() => inspect("research", id)}><EmpireIcon kind="research"/><span>{TECHNOLOGY_NAMES[id]}<strong>Lv.{state.technologies[id]}</strong><small>{state.researchJob?.target === id ? "연구 중" : "공통 기술 · 모든 행성 적용"}</small></span></button>)}</div>{actionInspector}</div></section>;
  if (section === "career") return <div className="career-detail"><EmpireCareerPanel key={planet.id} state={state} planet={planet} locked={locked} send={send} onResearch={() => onAction("research")}/></div>;
  return <section className="empire-card empire-report-list"><div className="empire-heading"><h2>기지 보고서</h2><EmpireIcon kind="reports"/></div>{state.events.length === 0 ? <p className="empty-jobs">아직 완료한 작업이 없습니다.</p> : state.events.slice().reverse().map(event => <p key={event.id}><strong>{event.title}</strong><span>{state.planets.find(p => p.id === event.planetId)?.name} · {new Date(event.at).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul" })}</span></p>)}</section>;
}
