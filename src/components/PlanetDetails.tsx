import type { EmpireAction, EmpireState, PlanetState } from "../empire/types.ts";
import { FACILITY_IDS, FACILITY_NAMES, TECHNOLOGY_IDS, TECHNOLOGY_NAMES } from "../empire/content.ts";
import PlanetActionPanel from "./PlanetActionPanel.tsx";
import type { ActionMode } from "./PlanetActionPanel.tsx";
import EmpireFleetPanel, { EmpireCareerPanel } from "./EmpireFleetPanel.tsx";
import DevelopmentMap from "./DevelopmentMap.tsx";
import FacilityArt from "./FacilityArt.tsx";
import { EmpireIcon } from "./EmpireUI.tsx";
export type DetailSection = "fleet" | "construction" | "research" | "career" | "reports";
type Props = { section: DetailSection; state: EmpireState; planet: PlanetState; mode: ActionMode; target: string; now: number; locked: boolean; send: (a: EmpireAction) => void; onAction: (mode: ActionMode, target?: string) => void; onTargetChange: (target: string) => void; onCareer: () => void };
export default function PlanetDetails({ section, state, planet, mode, target, now, locked, send, onAction, onTargetChange, onCareer }: Props) {
  const panel = <PlanetActionPanel key={planet.id + ":" + mode} state={state} planet={planet} mode={mode} target={target} onTargetChange={onTargetChange} locked={locked} send={send}/>;
  const atlas = <DevelopmentMap state={state} planet={planet} now={now} onInspect={onAction}/>;
  if (section === "construction") return <section className="detail-page">
    <div className="detail-title"><h2>건설 상세</h2><div className="mode-tabs"><button aria-pressed={mode !== "defense"} onClick={() => onAction("construction")}>시설 증설</button><button aria-pressed={mode === "defense"} onClick={() => onAction("defense")}>방어망</button></div></div>
    <div className="detail-columns"><div className="facility-catalog">{FACILITY_IDS.map(id => <button key={id} aria-pressed={(target || "alloyMine") === id && mode !== "defense"} className={(target || "alloyMine") === id && mode !== "defense" ? "selected" : ""} onClick={() => onAction("construction", id)}><FacilityArt facility={id}/><span>{FACILITY_NAMES[id]}<strong>Lv.{planet.facilities[id]}{planet.constructionJob?.target === id && " → " + planet.constructionJob.level}</strong><small>{planet.constructionJob?.target === id ? "건설 중" : planet.facilities[id] >= 5 ? "최대 수준" : "다음 수준 검토 →"}</small></span></button>)}</div>{panel}</div>
    <details className="growth-disclosure"><summary>발전지도 · 다음 함선 건조의 시설·연구 조건</summary>{atlas}</details>
  </section>;
  if (section === "fleet") return <section className="detail-page"><div className="detail-title"><h2>함대 운영·건조</h2><button className="quiet-action" onClick={onCareer}>개인 작전 편성 →</button></div><div className="detail-columns"><EmpireFleetPanel state={state} planet={planet} locked={locked} send={send}/>{panel}</div><details className="growth-disclosure"><summary>발전지도 · 추가 함선 건조 요건</summary>{atlas}</details></section>;
  if (section === "research") return <section className="detail-page">{atlas}<div className="detail-columns research-controls"><div className="technology-catalog">{TECHNOLOGY_IDS.map(id => <button key={id} aria-pressed={(target || "industry") === id} className={(target || "industry") === id ? "selected" : ""} onClick={() => onAction("research", id)}><EmpireIcon kind="research"/><span>{TECHNOLOGY_NAMES[id]}<strong>Lv.{state.technologies[id]}</strong><small>{state.researchJob?.target === id ? "연구 중" : "공통 기술 · 모든 행성 적용"}</small></span></button>)}</div>{panel}</div></section>;
  if (section === "career") return <div className="career-detail"><EmpireCareerPanel key={planet.id} state={state} planet={planet} locked={locked} send={send}/></div>;
  return <section className="empire-card empire-report-list"><div className="empire-heading"><h2>기지 보고서</h2><EmpireIcon kind="reports"/></div>{state.events.length === 0 ? <p className="empty-jobs">아직 완료한 작업이 없습니다.</p> : state.events.slice().reverse().map(event => <p key={event.id}><strong>{event.title}</strong><span>{state.planets.find(p => p.id === event.planetId)?.name} · {new Date(event.at).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul" })}</span></p>)}</section>;
}
