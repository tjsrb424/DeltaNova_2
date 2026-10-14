import type { EmpireState, PlanetState } from "../empire/types.ts";
import { facilitySpace } from "../empire/economy.ts";
import { EmpireIcon } from "./EmpireUI.tsx";
export default function PlanetScene({state,planet,selected,onPlanet,onStation}:{state:EmpireState;planet:PlanetState;selected:string;onPlanet:(id:string)=>void;onStation:(station:string)=>void}) {
  const space=facilitySpace(planet);
  return <section className="planet-scene" aria-label="행성 개요">
    <img className="planet-environment" src="/art/planet-dashboard-scene-v1.png" alt="" />
    <div className="planet-title"><p className="scene-kicker">{planet.kind==="home"?"제국의 중심":"새로운 거점"}</p><h1>{planet.name}</h1><p className="planet-subtitle">{planet.kind==="home"?"본성":"식민지"} · 현지 기지 운영</p>
      <div className="planet-facts"><span><EmpireIcon kind="build"/>시설 공간 <strong>{space.used+space.reserved} / {space.capacity}</strong></span><span><EmpireIcon kind="planet"/>소유 행성 <strong>{state.planets.length}</strong></span></div>
    </div>
    <div className="planet-switcher" aria-label="소유 행성 선택">{state.planets.map(p=><button key={p.id} aria-label={p.name+" "+(p.kind==="home"?"본성":"식민지")} aria-pressed={p.id===planet.id} onClick={()=>onPlanet(p.id)}><span className={"planet-thumbnail "+p.kind}/><strong>{p.name}</strong><small>{p.kind==="home"?"본성":"식민지"}</small></button>)}</div>
    <svg className="station-lines" viewBox="0 0 1672 941" aria-hidden="true"><g className={selected==="construction"?"active":""}><path d="M550 450L440 378H295"/><circle cx="550" cy="450" r="5"/></g><g className={selected==="shipyard"?"active":""}><path d="M1410 560L1470 390H1510"/><circle cx="1410" cy="560" r="5"/></g><g className={selected==="defense"?"active":""}><path d="M640 670L470 735H285"/><circle cx="640" cy="670" r="5"/></g></svg>
    <button className={"station-hotspot production "+(selected==="construction"?"selected":"")} aria-pressed={selected==="construction"} onClick={()=>onStation("construction")}><EmpireIcon kind="build"/>생산 시설</button>
    <button className={"station-hotspot shipyard "+(selected==="shipyard"?"selected":"")} aria-pressed={selected==="shipyard"} onClick={()=>onStation("shipyard")}><EmpireIcon kind="fleet"/>조선소</button>
    <button className={"station-hotspot defense "+(selected==="defense"?"selected":"")} aria-pressed={selected==="defense"} onClick={()=>onStation("defense")}><EmpireIcon kind="defense"/>방어 거점</button>
    <div className="scene-caption">내 기지의 생산과 함대를 성장시키세요.</div>
  </section>;
}
