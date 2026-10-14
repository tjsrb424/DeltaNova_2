import type { Resources, PlanetState } from "../empire/types.ts";
import { RESOURCE_IDS, RESOURCE_NAMES } from "../empire/content.ts";
import { SHIPS } from "../game/content.ts";
export function duration(ms:number) {const seconds=Math.max(0,Math.ceil(ms/1000));return [Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(n=>String(n).padStart(2,"0")).join(":");}
export function shipLabel(p:PlanetState,index:number) {const sh=p.ships[index],def=SHIPS.find(s=>s.id===sh.shipId)!;return def.name+" "+p.ships.slice(0,index+1).filter(s=>s.shipId===sh.shipId).length+"호";}
export function EmpireIcon({kind}:{kind:string}) {
  const paths:Record<string,string>={fleet:"M3 16L12 3L21 16L15 14L12 21L9 14Z",build:"M4 4L10 4L20 14L14 20L4 10Z M3 21L8 16",research:"M9 3H15M10 3V10L4 20H20L14 10V3 M8 15H16",guild:"M5 14V21M19 14V21M12 11V21 M2 21H22 M3 9H7M17 9H21",defense:"M12 2L21 6V12C21 17 12 22 12 22C12 22 3 17 3 12V6Z",reports:"M6 2H16L20 6V22H4V2H6M8 10H16M8 14H16M8 18H13",planet:"M2 12H22M12 2C18 8 18 16 12 22C6 16 6 8 12 2"};
  return <svg className="empire-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{kind==="planet"&&<circle cx="12" cy="12" r="10"/>}<path d={paths[kind]||paths.build}/></svg>;
}
export function Cost({cost}:{cost:Resources}) {return <div className="empire-cost">{RESOURCE_IDS.map(key=><div key={key}><span className={"resource-crystal "+key} aria-hidden="true"/><span>{RESOURCE_NAMES[key]}<strong>{cost[key].toLocaleString("ko-KR")}</strong></span></div>)}</div>;}
export function costError(p:PlanetState,cost:Resources) {const key=RESOURCE_IDS.find(k=>p.resources[k]<cost[k]);return key?(key==="fuel"?"연료가":RESOURCE_NAMES[key]+"이")+" 부족합니다.":"";}
