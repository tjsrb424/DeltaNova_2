import type { EmpireApi } from "../empire/api.ts";
import { useEffect, useMemo, useRef, useState } from "react";
import { empireApi } from "../empire/api.ts";
import { useEmpire } from "../empire/useEmpire.ts";
import { useCompletionNotice } from "../empire/useCompletionNotice.ts";
import { RESOURCE_IDS, RESOURCE_NAMES } from "../empire/content.ts";
import { capacities, productionRates, power, facilitySpace } from "../empire/economy.ts";
import { fleetReadiness } from "../empire/development.ts";
import ParticipantLink from "./ParticipantLink.tsx";
import type { ActionMode } from "./PlanetActionPanel.tsx";
import EmpireJobs from "./EmpireJobs.tsx";
import PlanetOverview from "./PlanetOverview.tsx";
import PlanetDetails from "./PlanetDetails.tsx";
import type { DetailSection } from "./PlanetDetails.tsx";
import { EmpireIcon } from "./EmpireUI.tsx";
import OperationsNav from "./OperationsNav.tsx";
import "../empire/dashboard.css";
import "../empire/operations.css";
type Section = "planet" | DetailSection;
const titles: Record<Section, string> = { planet: "행성 개발 현황", construction: "건설 상세", fleet: "함대 운영·건조", research: "연구·성장 상세", career: "개인 작전", reports: "기지 보고서" };
export default function PlanetDashboard({ api = empireApi, onPractice, onGuild, initialSection = "planet" }: { api?: EmpireApi; onPractice?: () => void; onGuild?: () => void; initialSection?: Section }) {
  const network = useEmpire(api), [section, setSection] = useState<Section>(initialSection), [mode, setMode] = useState<ActionMode>("shipyard"), [target, setTarget] = useState(""), [selectedPlanet, setSelectedPlanet] = useState<string | null>(null), [tick, setTick] = useState(() => Date.now());
  const mainRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [inspectionRequest, setInspectionRequest] = useState(0);
  useEffect(() => { const timer = setInterval(() => setTick(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const receivedAt = useMemo(() => Date.now(), [network.data]);
  const state = network.data?.state, planet = state?.planets.find(p => p.id === (selectedPlanet || state.homePlanetId)) || state?.planets[0], locked = network.busy || network.pending || network.blockedByOtherCommand || !network.online;
  const completionNotice = useCompletionNotice(api, state);
  const cap = planet ? capacities(planet) : null, rates = planet && state ? productionRates(planet, state.technologies) : null, watts = planet ? power(planet) : null, space = planet ? facilitySpace(planet) : null, fleet = planet ? fleetReadiness(planet) : null;
  const now = network.data ? network.data.serverTime + (network.online ? Math.max(0, tick - receivedAt) : 0) : 0;
  function navigate(next: Section) {
    setSection(next); setTarget(""); setInspectionRequest(0);
    setMode(next === "construction" ? "construction" : next === "research" ? "research" : "shipyard");
    mainRef.current?.focus({preventScroll:true});
    if(contentRef.current) contentRef.current.scrollTop=0;
    if(window.scrollY>0) window.scrollTo({top:0,behavior:"instant"});
  }
  function openAction(next: ActionMode, selection = "") {
    const nextSection = next === "shipyard" ? "fleet" : next === "research" ? "research" : "construction";
    setMode(next); setTarget(selection); setSection(nextSection);
    setInspectionRequest(request => nextSection === "construction" ? 0 : request + 1);
    if(nextSection !== section && contentRef.current) contentRef.current.scrollTop=0;
    if(nextSection !== section) mainRef.current?.focus({preventScroll:true});
    if(window.scrollY>0) window.scrollTo({top:0,behavior:"instant"});
  }
  return <div className="empire-shell"><a href="#empire-main" className="skip-link">본문으로 이동</a>
    <OperationsNav active={section} guild={!!onGuild} practice={!!onPractice} onNavigate={next => { if(next === "guild") onGuild?.(); else if(next === "practice") onPractice?.(); else navigate(next); }}/>
    <div className="empire-workspace"><header className="empire-hud" aria-label="현지 자원"><div className="hud-context"><span className="planet-thumbnail"/><div>{planet ? <h1>{planet.name}</h1> : <strong>행성 관제</strong>}<span>{titles[section]}</span></div></div>
      {RESOURCE_IDS.map(key => <div className="hud-resource" key={key}><span className={"resource-crystal " + key} aria-hidden="true"/><div><span>{RESOURCE_NAMES[key]}</span><strong data-testid={"empire-" + key}>{planet ? planet.resources[key].toLocaleString("ko-KR") : "—"}<small> / {cap ? cap[key].toLocaleString("ko-KR") : "—"}</small></strong><em>{rates ? "+" + rates[key] + "/분" : "연결 후 확인"}</em></div></div>)}
      <div className="hud-power"><span aria-hidden="true">ϟ</span><div><span>전력</span><strong>{watts ? watts.demanded + " / " + watts.supplied : "—"}</strong><em>{watts ? "여유 " + (watts.supplied - watts.demanded) : "연결 후 확인"}</em></div></div><div className="hud-space"><EmpireIcon kind="build"/><div><span>시설 공간</span><strong>{space ? (space.used + space.reserved) + " / " + space.capacity : "—"}</strong></div></div>
    </header>
    <div className="empire-connection"><ParticipantLink network={network} compact online={network.online} verifiedAt={network.data?.serverTime}/><p className="guild-notice" role="status" aria-live="polite" aria-atomic="true" aria-label="작업 완료 알림">{completionNotice && <span key={completionNotice.key}>{completionNotice.text}</span>}</p></div>
    <main id="empire-main" className="empire-main" ref={mainRef} tabIndex={-1}>{state && planet ? <>
      <section className="page-readiness" aria-label="행성 운영"><span className={"operation-status " + (!network.online || watts!.supplied < watts!.demanded ? "attention" : "")}>{!network.online ? "연결 확인 필요" : watts!.supplied < watts!.demanded ? "전력 부족" : "정상 가동"}</span><span>보유 {planet.ships.length}척</span><span>출격 가능 {fleet!.ready}</span><span>수리 필요 {fleet!.damaged.length}</span><span>출격 중 {fleet!.deployed}</span><span>방어 {planet.defenses}기</span><div className="overview-planet-picker" aria-label="소유 행성">{state.planets.map(p => <button key={p.id} aria-label={p.name + (p.kind === "home" ? " 본성" : " 식민지")} aria-pressed={p.id === planet.id} onClick={() => { setSelectedPlanet(p.id); setTarget(""); }}><span className={"planet-thumbnail " + p.kind}/><span>{p.name}<small>{p.kind === "home" ? "본성" : "식민지"}</small></span></button>)}</div></section>
      <div className={"management-layout " + (section === "reports" ? "without-queue" : "")}><div className="management-content" ref={contentRef}>
      {section === "planet" ? <PlanetOverview state={state} planet={planet} now={now} locked={locked} send={network.send} onAction={openAction} onReports={() => navigate("reports")}/> : <PlanetDetails section={section} state={state} planet={planet} mode={mode} target={target} inspectionRequest={inspectionRequest} now={now} locked={locked} send={network.send} onAction={openAction} onTargetChange={setTarget} onCareer={() => navigate("career")}/>}
      </div>{section !== "reports" && <aside className="work-queue" aria-label="작업 대기열"><EmpireJobs state={state} planetId={planet.id} now={now} locked={locked} send={network.send} onInspect={job => {setSelectedPlanet(job.planetId);openAction(job.kind === "ships" ? "shipyard" : job.kind === "research" ? "research" : job.kind === "defense" ? "defense" : "construction", job.target);}}/></aside>}</div>
    </> : <section className="empire-card connect-landing"><span className="planet-thumbnail"/><p>PLANET OPERATIONS</p><h1>행성의 다음 개발을 결정하세요.</h1><p>참가자로 연결하면 저장된 생산·시설·함대 상태와 개발 완료 효과를 확인할 수 있습니다.</p><div><span>생산·운영 현황</span><span>시설·연구 성장 조건</span><span>현지 함대와 개인 작전</span></div></section>}</main>
    </div>
  </div>;
}
