import { useEffect, useId, useState } from "react";
import type { EmpireState, EmpireAction, TimedJob } from "../empire/types.ts";
import { SHIPS } from "../game/content.ts";
import { FACILITY_NAMES, TECHNOLOGY_NAMES, scaledCost } from "../empire/content.ts";
import { EmpireIcon, duration, Cost } from "./EmpireUI.tsx";
export function jobName(j:TimedJob) {if(j.kind==="ships") return SHIPS.find(s=>s.id===j.target)!.name+" "+j.quantity+"척 건조";if(j.kind==="facility") return FACILITY_NAMES[j.target as keyof typeof FACILITY_NAMES]+" Lv."+j.level;return j.kind==="research"?TECHNOLOGY_NAMES[j.target as keyof typeof TECHNOLOGY_NAMES]+" Lv."+j.level:"방어 포대 1기";}
export default function EmpireJobs({state,planetId,now,locked,send,onInspect}:{state:EmpireState;planetId:string;now:number;locked:boolean;send:(a:EmpireAction)=>void;onInspect?:(job:TimedJob)=>void}) {
  const [all,setAll]=useState(false),[confirm,setConfirm]=useState<string|null>(null);
  const [expanded,setExpanded]=useState(true), bodyId=useId();
  useEffect(() => {
    const query=window.matchMedia?.("(min-width: 1200px)");
    if(!query) return;
    const sync=()=>setExpanded(query.matches);sync();query.addEventListener("change",sync);
    return ()=>query.removeEventListener("change",sync);
  },[]);
  const jobs=[...state.planets.flatMap(p=>[p.constructionJob,p.shipJob]),state.researchJob].filter((j):j is TimedJob=>j!==null).filter(j=>all||j.planetId===planetId||j.kind==="research");
  function inspect(job: TimedJob) {
    onInspect?.(job);
    if(window.matchMedia && !window.matchMedia("(min-width: 1200px)").matches) setExpanded(false);
  }
  return <section className={"empire-jobs empire-card " + (expanded?"queue-expanded":"queue-folded")} aria-labelledby="jobs-heading"><div className="empire-heading"><h2 id="jobs-heading">진행 중 <small>{jobs.length}건</small></h2><button className="quiet-action queue-toggle" aria-expanded={expanded} aria-controls={bodyId} onClick={()=>setExpanded(!expanded)}>{expanded?"대기열 접기":"대기열 펼치기"}</button></div><div id={bodyId} className="queue-body" hidden={!expanded}><div className="queue-scope"><span>{all?"모든 행성의 작업":"현지 건설·건조와 공통 연구"}</span><button className="quiet-action" aria-pressed={all} onClick={()=>setAll(!all)}>{all?"현지 보기":"전체 보기"} →</button></div>
    {jobs.length===0?<p className="empty-jobs">현재 진행 중인 작업이 없습니다. 시설을 증설하거나 함선을 건조해보세요.</p>:jobs.map(j=>{
      const progress=Math.min(100,Math.max(0,(now-j.startedAt)/(j.completesAt-j.startedAt)*100)),name=jobName(j),refund=scaledCost(j.cost,0.8);Object.keys(refund).forEach(k=>refund[k as keyof typeof refund]=Math.floor(refund[k as keyof typeof refund]));
      return <div className="empire-job" key={j.id}><EmpireIcon kind={j.kind==="ships"?"fleet":j.kind==="research"?"research":"build"}/><div className="job-description"><small>{j.kind==="research"?"제국 연구":"현지 작업"} · {state.planets.find(p=>p.id===j.planetId)!.name}</small>{onInspect?<button className="job-inspect" aria-label={name+" 상세"} onClick={()=>inspect(j)}>{name}<span aria-hidden="true"> →</span></button>:<strong>{name}</strong>}</div><div className="job-progress" role="progressbar" aria-label={name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(progress)}><i style={{width:progress+"%"}}/></div><time>{now>=j.completesAt?"완료 확인 중":duration(j.completesAt-now)}</time><button className="quiet-action" aria-label={name+" 취소"} disabled={locked||now>=j.completesAt} onClick={()=>setConfirm(confirm===j.id?null:j.id)}>취소</button>{confirm===j.id&&<div className="job-refund"><p>원 지불 행성에 80%를 반환합니다. 저장 공간이 부족하면 취소할 수 없습니다.</p><Cost cost={refund}/><button className="empire-secondary" disabled={locked} onClick={()=>{send({type:"cancel-job",planetId:j.planetId,jobId:j.id});setConfirm(null);}}>취소 확정</button></div>}</div>;
    })}
  </div></section>;
}
