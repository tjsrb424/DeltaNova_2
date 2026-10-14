import type { EmpireAction, EmpireState, FacilityId, PlanetState, TimedJob } from "../empire/types.ts";
import { FACILITY_IDS, FACILITY_NAMES, RESOURCE_IDS, RESOURCE_NAMES, facilityQuote } from "../empire/content.ts";
import { capacities, power, productionRates, facilitySpace } from "../empire/economy.ts";
import { completionEffect, developmentPreview, fleetReadiness } from "../empire/development.ts";
import type { ActionMode } from "./PlanetActionPanel.tsx";
import { duration, EmpireIcon, costError } from "./EmpireUI.tsx";
import FacilityArt from "./FacilityArt.tsx";
import ShipGlyph from "./ShipGlyph.tsx";
type Props = { state: EmpireState; planet: PlanetState; now: number; locked: boolean; send: (a: EmpireAction) => void; onAction: (mode: ActionMode, target?: string) => void; onReports: () => void };
export default function PlanetOverview({ state, planet: p, now, locked, send, onAction, onReports }: Props) {
  const current = productionRates(p, state.technologies), cap = capacities(p), watts = power(p), future = developmentPreview(state, p), fleet = fleetReadiness(p), space = facilitySpace(p);
  const lanes: { name: string; job: TimedJob | null; mode: ActionMode; caption: string }[] = [
    { name: "시설 개발", job: p.constructionJob, mode: "construction", caption: "생산·전력·개발 기반을 확장하세요." },
    { name: "함선 건조", job: p.shipJob, mode: "shipyard", caption: "현지 함대를 추가로 건조하세요." },
    { name: "공통 연구", job: state.researchJob, mode: "research", caption: "모든 행성에 적용되는 기술입니다." },
  ];
  const labCost = facilityQuote("laboratory", p.facilities.laboratory).cost, labTarget = p.facilities.laboratory + 1;
  return <section className="overview-board" aria-label="전체 현황">
    <section aria-label="개발 완료 효과"><div className="overview-section-heading"><h2>진행 중인 개발이 바꾸는 것</h2><span>현재 투자와 완료 효과</span></div>
      <div className="outcome-grid">{lanes.map(lane => {
        const effect = lane.job ? completionEffect(state, p, lane.job) : null;
        return <article className={"outcome-card " + (lane.job ? "working" : "idle")} key={lane.name}>
          <div className="outcome-art">{lane.job?.kind === "facility" ? <FacilityArt facility={lane.job.target as FacilityId}/> : lane.mode === "shipyard" ? <ShipGlyph role="striker" color="#286675"/> : <EmpireIcon kind={lane.mode === "research" ? "research" : "build"}/>}</div>
          <div><span className="outcome-label">{effect?.title || lane.name + " 대기"}</span><strong className="outcome-value">{effect?.value || "다음 개발을 선택하세요"}</strong><p>{effect?.detail || lane.caption}</p></div>
          <footer>{lane.job ? <><span className="working-dot"/><span>{now >= lane.job.completesAt ? "완료 확인 중" : duration(lane.job.completesAt - now) + " 남음"}</span>{lane.job.kind === "research" && <small>{state.planets.find(planet => planet.id === lane.job!.planetId)?.name}에서 연구</small>}</> : <button className="quiet-action" onClick={() => onAction(lane.mode)}>상세 보기 →</button>}</footer>
        </article>;
      })}</div>
    </section>
    <div className="overview-columns">
      <section className="empire-card operations-ledger"><div className="empire-heading"><h2>지금의 생산·운영 상태</h2><span>진행 중인 개발 완료 기준</span></div>
        <div className="table-scroll"><table aria-label="생산·저장 현황"><thead><tr><th>자원</th><th>보유 / 저장 한도</th><th>생산량 /분</th><th>저장 현황</th><th>완료 후 변화</th></tr></thead><tbody>{RESOURCE_IDS.map(key => <tr key={key}><th scope="row"><span className={"resource-crystal " + key}/>{RESOURCE_NAMES[key]}</th><td>{p.resources[key].toLocaleString("ko-KR")} / {cap[key]}</td><td>+{current[key]}</td><td><div className="storage-meter"><i style={{ width: Math.min(100, p.resources[key] / cap[key] * 100) + "%" }}/></div><small>{Math.floor(p.resources[key] / cap[key] * 100)}%</small></td><td>{current[key] !== future.rates[key] && <strong>+{current[key]} → +{future.rates[key]}/분</strong>}{cap[key] !== future.cap[key] && <span>저장 {cap[key]} → {future.cap[key]}</span>}{current[key] === future.rates[key] && cap[key] === future.cap[key] && <span>유지</span>}</td></tr>)}</tbody></table></div>
        <div className={"power-margin " + (watts.supplied < watts.demanded ? "attention" : "")} aria-label="전력 여유 변화"><EmpireIcon kind="defense"/><span>여유 전력</span><strong>{watts.supplied - watts.demanded} → {future.power.supplied - future.power.demanded}</strong><small>현재 → 개발 완료 후</small></div>
        <p className="action-footnote">완료 후 수치는 진행 중인 현지 건설·공통 연구의 효과입니다. 보유 자원의 미래 잔액을 예측하지 않습니다.</p>
      </section>
      <section className="empire-card next-actions"><div className="empire-heading"><h2>지금 할 일</h2><EmpireIcon kind="build"/></div>
        <article><EmpireIcon kind="fleet"/><div><h3>{fleet.damaged.length ? "함선 " + fleet.damaged.length + "척 수리" : "함대 준비 완료"}</h3><p>{fleet.damaged.length ? "합금 " + fleet.repairCost + " 소모 · 출격 가능 " + fleet.ready + " → " + (fleet.ready + fleet.damaged.length) + "척" : "출격 가능 " + fleet.ready + "척 · 출격 중 " + fleet.deployed + "척"}</p>{fleet.damaged.length > 0 && p.resources.alloy < fleet.repairCost && <p className="action-reason">정비할 합금이 부족합니다.</p>}</div>
          {fleet.damaged.length > 0 ? <button className="empire-primary compact" aria-label={"함선 " + fleet.damaged.length + "척 수리"} disabled={locked || p.resources.alloy < fleet.repairCost} onClick={() => send({ type: "repair-fleet", planetId: p.id, fleetIds: fleet.damaged.map(s => s.id) })}>수리</button> : <button className="empire-secondary compact" onClick={() => onAction("shipyard")}>조선소</button>}
        </article>
        <article><FacilityArt facility="laboratory"/><div><h3>{p.facilities.laboratory >= 5 ? "연구소 최대 수준" : "연구소 Lv." + labTarget}</h3><p>{p.facilities.laboratory >= 5 ? "추가 증설 없이 공통 연구를 진행할 수 있습니다." : p.constructionJob ? "건설 슬롯 사용 중 · " + (now >= p.constructionJob.completesAt ? "완료 확인 중" : duration(p.constructionJob.completesAt - now) + " 남음") : space.used + space.reserved >= space.capacity ? "시설 공간이 부족합니다." : watts.supplied < watts.demanded ? "발전소 증설이 먼저 필요합니다." : costError(p, labCost) || "재료 충족 · 다음 연구 수준의 기반"}</p></div><button className="empire-secondary compact" onClick={() => onAction("construction", "laboratory")}>건설 상세</button></article>
        <article><EmpireIcon kind="research"/><div><h3>산업 기술 Lv.{state.technologies.industry}</h3><p>{state.technologies.industry >= 3 ? "현재 최대 연구 수준에 도달했습니다." : p.facilities.laboratory < state.technologies.industry + 1 ? "연구소 Lv." + (state.technologies.industry + 1) + " 필요" : state.researchJob ? "공통 연구 슬롯 사용 중" : "모든 자원 기본 생산 +1/분"}</p></div><button className="empire-secondary compact" onClick={() => onAction("research", "industry")}>연구 상세</button></article>
      </section>
    </div>
    <section className="empire-card facility-summary"><div className="empire-heading"><h2>시설 현황</h2><button className="quiet-action" onClick={() => onAction("construction")}>생산 시설 →</button></div><div className="facility-summary-grid">{FACILITY_IDS.map(id => <button key={id} className={p.constructionJob?.target === id ? "in-progress" : ""} onClick={() => onAction("construction", id)}><FacilityArt facility={id}/><span>{FACILITY_NAMES[id]}<strong>Lv.{p.facilities[id]}{p.constructionJob?.target === id && " → " + p.constructionJob.level}</strong>{p.constructionJob?.target === id && <small>건설 중</small>}</span></button>)}</div></section>
    <section className="empire-card recent-reports"><div className="empire-heading"><h2>최근 보고서</h2><button className="quiet-action" onClick={onReports}>전체 보기 →</button></div>{state.events.length === 0 ? <p className="empty-jobs">첫 시설 개발이나 함선 건조를 시작해보세요.</p> : state.events.slice(-3).reverse().map(event => <div className="recent-event" key={event.id}><EmpireIcon kind="reports"/><strong>{event.title}</strong><small>{state.planets.find(planet => planet.id === event.planetId)?.name}</small></div>)}</section>
  </section>;
}
