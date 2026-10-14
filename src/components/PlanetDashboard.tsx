import type { EmpireApi } from "../empire/api.ts";
import { useEffect, useMemo, useState } from "react";
import { empireApi } from "../empire/api.ts";
import { useEmpire } from "../empire/useEmpire.ts";
import { RESOURCE_IDS, RESOURCE_NAMES } from "../empire/content.ts";
import { capacities, productionRates, power } from "../empire/economy.ts";
import ParticipantLink from "./ParticipantLink.tsx";
import PlanetScene from "./PlanetScene.tsx";
import PlanetActionPanel from "./PlanetActionPanel.tsx";
import type { ActionMode } from "./PlanetActionPanel.tsx";
import EmpireJobs from "./EmpireJobs.tsx";
import EmpireFleetPanel, { EmpireCareerPanel } from "./EmpireFleetPanel.tsx";
import { EmpireIcon } from "./EmpireUI.tsx";
import "../empire/dashboard.css";
type Section="planet"|"fleet"|"construction"|"research"|"career"|"reports";
const menus:[Section,string,string][]=[["planet","행성","planet"],["fleet","함대","fleet"],["construction","건설","build"],["research","연구","research"],["career","개인 작전","fleet"]];
export default function PlanetDashboard({api=empireApi,onPractice,onGuild,initialSection="planet"}:{api?:EmpireApi;onPractice?:()=>void;onGuild?:()=>void;initialSection?:Section}) {
  const network=useEmpire(api),[section,setSection]=useState<Section>(initialSection),[mode,setMode]=useState<ActionMode>("shipyard"),[selectedPlanet,setSelectedPlanet]=useState<string|null>(null),[tick,setTick]=useState(()=>Date.now());
  useEffect(()=>{const timer=setInterval(()=>setTick(Date.now()),1000);return ()=>clearInterval(timer);},[]);
  const receivedAt=useMemo(()=>Date.now(),[network.data]);
  const state=network.data?.state,planet=state?.planets.find(p=>p.id===(selectedPlanet||state.homePlanetId))||state?.planets[0],locked=network.busy||network.pending||network.blockedByOtherCommand||!network.online;
  const cap=planet?capacities(planet):null,rates=planet&&state?productionRates(planet,state.technologies):null,watts=planet?power(planet):null;
  const now=network.data?network.data.serverTime+(network.online?Math.max(0,tick-receivedAt):0):0;
  function navigate(next:Section) {setSection(next);if(next==="construction") setMode("construction");if(next==="research") setMode("research");}
  const sceneSelection=["fleet","career","reports"].includes(section)?"":mode;
  return <div className="empire-shell"><a href="#empire-main" className="skip-link">본문으로 이동</a>
    <nav className="planet-nav" aria-label="제국 메뉴"><div className="empire-brand"><span aria-hidden="true">Δ</span><strong>DELTA NOVA</strong></div><div className="planet-navigation">{menus.map(([id,name,icon])=><button key={id} aria-current={section===id?"page":undefined} className={section===id?"active":""} onClick={()=>navigate(id)}><EmpireIcon kind={icon}/>{name}</button>)}{onGuild&&<button onClick={onGuild}><EmpireIcon kind="guild"/>동맹</button>}</div><div className="planet-navigation nav-secondary"><button aria-current={section==="reports"?"page":undefined} onClick={()=>navigate("reports")}><EmpireIcon kind="reports"/>보고서</button>{onPractice&&<button onClick={onPractice}><EmpireIcon kind="fleet"/>편성 연습</button>}<p>혼자 성장하고<br/>함께 작전하세요.</p></div></nav>
    <div className="empire-workspace"><header className="empire-hud" aria-label="현지 자원"><div className="hud-context"><strong>{planet?.name||"행성 관제"}</strong><span>현지 자원</span></div>{RESOURCE_IDS.map(key=><div className="hud-resource" key={key}><span className={"resource-crystal "+key} aria-hidden="true"/><div><span>{RESOURCE_NAMES[key]}</span><strong data-testid={"empire-"+key}>{planet?planet.resources[key].toLocaleString("ko-KR"):"—"}<small> / {cap?cap[key].toLocaleString("ko-KR"):"—"}</small></strong><em>{rates?"분당 +"+rates[key]:"연결 후 확인"}</em></div></div>)}<div className="hud-power"><span aria-hidden="true">ϟ</span><div><span>전력</span><strong>{watts?watts.demanded+" / "+watts.supplied:"—"}</strong><em>{watts?(watts.supplied>=watts.demanded?"여유 "+(watts.supplied-watts.demanded):"부족 "+(watts.demanded-watts.supplied)):"연결 후 확인"}</em></div></div></header>
      <div className="empire-connection"><ParticipantLink network={network}/>{network.data&&<p className="connection-freshness">{network.online?"서버 확인됨":"연결 확인 필요"} · 마지막 확인 {new Date(network.data.serverTime).toLocaleTimeString("ko-KR",{timeZone:"Asia/Seoul"})}</p>}</div>
      <main id="empire-main" className="empire-main" tabIndex={-1}>{state&&planet?<><div className="empire-center"><PlanetScene state={state} planet={planet} selected={sceneSelection} onPlanet={setSelectedPlanet} onStation={target=>{setMode(target as ActionMode);setSection("planet");}}/><EmpireJobs state={state} planetId={planet.id} now={now} locked={locked} send={network.send}/></div>
        <aside className="empire-right"><section className="empire-status empire-card" aria-label="행성 운영"><div className="empire-heading"><h2>행성 운영</h2><span className={"operation-status "+(!network.online||watts!.supplied<watts!.demanded?"attention":"")}>{!network.online?"연결 확인":watts!.supplied<watts!.demanded?"전력 부족":"정상"}</span></div><div className="status-grid"><div><EmpireIcon kind="fleet"/><span>주둔</span><strong>보유 {planet.ships.length}척</strong></div><div><EmpireIcon kind="defense"/><span>방어</span><strong>{planet.defenses}기</strong></div><div><span className="resource-crystal crystal"/><span>결정 저장</span><strong>{Math.floor(planet.resources.crystal/cap!.crystal*100)}%</strong></div></div></section>
          {section==="fleet"?<EmpireFleetPanel state={state} planet={planet} locked={locked} send={network.send}/>:section==="career"?<EmpireCareerPanel state={state} planet={planet} locked={locked} send={network.send}/>:section==="reports"?<section className="empire-card empire-report-list"><div className="empire-heading"><h2>기지 보고서</h2><EmpireIcon kind="reports"/></div>{state.events.length===0?<p className="empty-jobs">아직 완료한 작업이 없습니다.</p>:state.events.slice().reverse().map(event=><p key={event.id}><strong>{event.title}</strong><span>{state.planets.find(p=>p.id===event.planetId)?.name}</span></p>)}</section>:<PlanetActionPanel state={state} planet={planet} mode={mode} locked={locked} send={network.send}/>}
          {section!=="reports"&&<section className="empire-card recent-reports"><div className="empire-heading"><h2>최근 보고서</h2><button className="quiet-action" onClick={()=>navigate("reports")}>전체 보기 →</button></div>{state.events.length===0?<p className="empty-jobs">기지의 첫 작업을 시작해보세요.</p>:state.events.slice(-3).reverse().map(event=><div className="recent-event" key={event.id}><EmpireIcon kind="reports"/><strong>{event.title}</strong><small>{state.planets.find(p=>p.id===event.planetId)?.name}</small></div>)}</section>}
        </aside></>:<section className="empire-welcome"><img src="/art/planet-dashboard-scene-v1.png" alt="푸른 본성과 궤도 시설"/><div><p className="scene-kicker">DELTA NOVA</p><h1>당신의 제국이<br/>여기서 시작됩니다.</h1><p>참가자로 연결하면 저장된 행성의 자원·시설·함대를 확인할 수 있습니다.</p></div></section>}</main>
    </div>
  </div>;
}
