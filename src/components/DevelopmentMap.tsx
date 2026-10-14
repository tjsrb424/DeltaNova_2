import { useState } from "react";
import type { EmpireState, PlanetState } from "../empire/types.ts";
import { RESOURCE_IDS, RESOURCE_NAMES, TECHNOLOGY_NAMES } from "../empire/content.ts";
import { developmentPath } from "../empire/development.ts";
import { SHIPS } from "../game/content.ts";
import type { ActionMode } from "./PlanetActionPanel.tsx";
import FacilityArt from "./FacilityArt.tsx";
import ShipGlyph from "./ShipGlyph.tsx";
import { duration } from "./EmpireUI.tsx";
export default function DevelopmentMap({ state, planet: p, now, onInspect }: { state: EmpireState; planet: PlanetState; now: number; onInspect: (mode: ActionMode, target?: string) => void }) {
  const [shipId, setShipId] = useState("carrier"), ship = SHIPS.find(s => s.id === shipId)!, path = developmentPath(state, p, shipId), tech = path.definition.technology;
  const yardPending = p.constructionJob?.target === "shipyard" ? p.constructionJob : null;
  const labPending = p.constructionJob?.target === "laboratory" ? p.constructionJob : null;
  return <section className="development-atlas" aria-label="발전지도">
    <header className="atlas-heading"><div><p>DEVELOPMENT ATLAS</p><h2>다음 함선 건조까지의 성장 조건</h2></div><label>추가 건조 목표<select aria-label="성장 목표 함선" value={shipId} onChange={e => setShipId(e.target.value)}>{SHIPS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label></header>
    <div className="atlas-layout"><div className="atlas-map">
      <div className="atlas-branch technology-branch">
        {path.neededLab > 0 && <button className={"growth-node " + (p.facilities.laboratory >= path.neededLab ? "ready" : labPending ? "pending" : "")} onClick={() => onInspect("construction", "laboratory")}><FacilityArt facility="laboratory"/><span>연구 기반<strong>연구소 Lv.{p.facilities.laboratory}</strong><small>연구소 Lv.{path.neededLab} 필요{labPending && " · 건설 중"}</small></span></button>}
        {tech ? <button className={"growth-node " + (state.technologies[tech] >= path.requiredTech ? "ready" : path.research ? "pending" : "")} onClick={() => onInspect("research", tech)}><span className="tech-node-symbol" aria-hidden="true">⌬</span><span>{TECHNOLOGY_NAMES[tech]}<strong>Lv.{state.technologies[tech]} / 필요 Lv.{path.requiredTech}</strong><small>{state.technologies[tech] >= path.requiredTech ? "충족" : path.research ? "진행 중 · " + state.planets.find(planet => planet.id === path.research!.planetId)?.name : "선행 시설과 연구 필요"}</small></span></button> : <div className="growth-node ready"><span>추가 기술 연구 없이 건조할 수 있습니다.</span></div>}
      </div>
      <div className="atlas-branch shipyard-branch"><button className={"growth-node " + (p.facilities.shipyard >= path.definition.shipyard ? "ready" : yardPending ? "pending" : "")} onClick={() => onInspect("construction", "shipyard")}><FacilityArt facility="shipyard"/><span>건조 기반<strong>조선소 Lv.{p.facilities.shipyard}</strong><small>필요 Lv.{path.definition.shipyard}{p.facilities.shipyard >= path.definition.shipyard ? " · 충족" : yardPending ? " · 건설 중" : " · 증설 필요"}</small></span></button></div>
      <article className="growth-goal"><span className="goal-kicker">시설 + 기술 요건</span><ShipGlyph role={ship.role} color="#d2ecf2"/><h3>{ship.name} 추가 건조</h3><p>조선소 Lv.{path.definition.shipyard}{tech && " · " + TECHNOLOGY_NAMES[tech] + " Lv." + path.requiredTech}</p><button className="empire-secondary" onClick={() => onInspect("shipyard", shipId)}>함선 건조 상세 →</button></article>
      <p className="atlas-legend"><i/>현재 충족 <i className="pending"/>진행 중 <i className="missing"/>추가 개발 필요</p>
    </div>
    <aside className="atlas-inspector"><h3>남은 개발과 비용</h3><ol>{path.steps.map(step => <li key={step.id}><button onClick={() => onInspect(step.mode, step.target)}>{step.label}</button><small>{step.pending ? "진행 중 · 지불 완료" : step.mode === "shipyard" ? "추가 1척 건조 비용" : "아직 시작하지 않은 개발"}</small></li>)}</ol>
      <div className="table-scroll"><table aria-label="추가 건조 경로 비용"><thead><tr><th>자원</th><th>필요</th><th>보유</th><th>부족</th></tr></thead><tbody>{RESOURCE_IDS.map(key => <tr key={key}><th scope="row">{RESOURCE_NAMES[key]}</th><td>{path.cost[key]}</td><td>{p.resources[key]}</td><td className={path.cost[key] > p.resources[key] ? "shortage" : ""}>{Math.max(0, path.cost[key] - p.resources[key])}</td></tr>)}</tbody></table></div>
      <p>필요한 발전소·연구소·조선소 증설, 미착수 연구와 다음 함선 1척의 합계입니다. 진행 중인 개발에 이미 지불한 비용은 제외합니다.</p>
      {path.powerDeficit > 0 && <p className="atlas-blocker">현재 전력 {path.powerDeficit} 부족 · 발전소 Lv.{path.neededPower} 확보가 먼저 필요합니다. <button className="quiet-action" onClick={() => onInspect("construction", "powerPlant")}>발전소 상세 →</button></p>}
      {path.plannedSpace.used > path.plannedSpace.capacity && <p className="atlas-blocker">시설 공간 부족 · 필요 공간 {path.plannedSpace.used} / {path.plannedSpace.capacity}. 현재 공간으로 이 성장 조건을 모두 충족할 수 없습니다.</p>}
      {p.constructionJob && <p className="atlas-blocker">건설 슬롯 사용 중 · {now >= p.constructionJob.completesAt ? "완료 확인 중" : duration(p.constructionJob.completesAt - now) + " 남음"}</p>}{state.researchJob && <p className="atlas-blocker">공통 연구 슬롯 사용 중 · {state.planets.find(planet => planet.id === state.researchJob!.planetId)?.name}</p>}
    </aside></div>
  </section>;
}
