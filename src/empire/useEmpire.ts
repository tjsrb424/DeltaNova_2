import type { EmpireApi } from "./api.ts";
import type { EmpireAction, EmpireSession, EmpireSnapshot } from "./types.ts";
import type { EmpireCommand } from "./types.ts";
import { useEffect, useRef, useState } from "react";
import { GuildApiError } from "../guild/api.ts";
import { PILOTS } from "../guild/content.ts";
import { parseEmpireCommand } from "./validation.ts";
import { pendingParticipant, setParticipantPending } from "../guild/participant-lock.ts";
const SESSION_KEY="delta-nova.guild-dev-session.v1",PENDING_KEY="delta-nova.empire-pending.v1";
const READ_ERROR="행성 서버에 연결하지 못했습니다. 마지막 확인 상태를 유지합니다.";
const RETRY_MESSAGE="명령 처리 여부를 확인하지 못했습니다. 같은 명령 재전송으로 결과를 확인하세요.";
const SESSION_MESSAGE="세션이 만료되었습니다. 같은 참가자로 다시 연결한 뒤 원래 명령을 재전송하세요.";
type Pending={session:EmpireSession;command:EmpireCommand;needsSession:boolean};
const pendingMemory=new WeakMap<EmpireApi,Pending|null>();
function loadSession():EmpireSession|null {
  try {const s=JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null");return s&&PILOTS.some(p=>p.id===s.pilotId)&&typeof s.token==="string"?s:null;} catch{return null;}
}
function rememberSession(s:EmpireSession|null) {try {if(s) sessionStorage.setItem(SESSION_KEY,JSON.stringify(s));else sessionStorage.removeItem(SESSION_KEY);} catch{/* retain pending actor in memory */}}
function loadPending(api:EmpireApi):Pending|null {
  if(pendingMemory.has(api)) return pendingMemory.get(api)!;
  try {const v=JSON.parse(sessionStorage.getItem(PENDING_KEY)||"null");
    if(v?.version!==1||!PILOTS.some(p=>p.id===v.item?.session?.pilotId)||typeof v.item.session.token!=="string"||typeof v.item.needsSession!=="boolean") return null;
    return {session:v.item.session,needsSession:v.item.needsSession,command:parseEmpireCommand(v.item.command)};
  } catch{return null;}
}
export function useEmpire(api:EmpireApi) {
  const [pending,setPending]=useState(()=>{const p=loadPending(api);setParticipantPending("empire",p?.session.pilotId||null);return p;}),pendingRef=useRef(pending);
  const [session,setSession]=useState<EmpireSession|null>(()=>pending?(pending.needsSession?null:pending.session):loadSession()),sessionRef=useRef(session);
  const [data,setData]=useState<EmpireSnapshot|null>(null),dataRef=useRef<EmpireSnapshot|null>(null);
  const [busy,setBusy]=useState(false),[online,setOnline]=useState(false),[notice,setNotice]=useState("");
  const [error,setError]=useState(pending?(pending.needsSession?SESSION_MESSAGE:RETRY_MESSAGE):"");
  const mounted=useRef(false),processing=useRef(false),generation=useRef(0),readSequence=useRef(0),activeRead=useRef<{epoch:number;sequence:number}|null>(null);
  function updatePending(item:Pending|null) {
    setParticipantPending("empire",item?.session.pilotId||null);
    pendingRef.current=item;pendingMemory.set(api,item);setPending(item);
    try {if(item) sessionStorage.setItem(PENDING_KEY,JSON.stringify({version:1,item}));else sessionStorage.removeItem(PENDING_KEY);} catch{/* navigation is preserved by the module cache */}
  }
  function accept(value:EmpireSnapshot) {
    const old=dataRef.current;
    if(!old||value.state.revision>old.state.revision||(value.state.revision===old.state.revision&&value.serverTime>=old.serverTime)) {dataRef.current=value;setData(value);}
  }
  async function refresh(signal?:AbortSignal,force=false) {
    const identity=sessionRef.current;
    if(!mounted.current||!identity||(!force&&activeRead.current?.epoch===generation.current)) return;
    const epoch=generation.current,sequence=++readSequence.current;activeRead.current={epoch,sequence};
    try {
      const value=await api.read(identity,signal);
      if(!mounted.current||epoch!==generation.current||sequence!==readSequence.current) return;
      accept(value);setOnline(true);setError(e=>e===READ_ERROR?"":e);
    } catch {
      if(!mounted.current||signal?.aborted||epoch!==generation.current||sequence!==readSequence.current) return;
      setOnline(false);setError(e=>e||READ_ERROR);
    } finally {if(activeRead.current?.sequence===sequence) activeRead.current=null;}
  }
  useEffect(()=>{
    mounted.current=true;const controller=new AbortController();void refresh(controller.signal);
    const timer=setInterval(()=>void refresh(controller.signal),3000);
    return ()=>{mounted.current=false;generation.current++;controller.abort();clearInterval(timer);};
  },[api]);
  async function connect(pilotId:string) {
    const unresolved=pendingRef.current;
    const other=pendingParticipant("empire");if(other&&other!==pilotId&&!unresolved?.needsSession) return;
    if(processing.current||(unresolved&&(!unresolved.needsSession||pilotId!==unresolved.session.pilotId))) return;
    const priorActor=sessionRef.current?.pilotId||unresolved?.session.pilotId;
    const epoch=++generation.current;processing.current=true;setBusy(true);setError("");setNotice("");
    try {
      const next=await api.connect(pilotId);
      if(!mounted.current||epoch!==generation.current) return;
      if(priorActor!==pilotId) {dataRef.current=null;setData(null);}
      sessionRef.current=next;setSession(next);rememberSession(next);
      if(unresolved) {updatePending({...unresolved,session:next,needsSession:false});setError(RETRY_MESSAGE);}
      void refresh(undefined,true);
    } catch {if(mounted.current&&epoch===generation.current) setError("참가자 연결에 실패했습니다. 마지막 기록을 유지합니다.");}
    finally {if(mounted.current&&epoch===generation.current) {processing.current=false;setBusy(false);}}
  }
  async function execute(item:Pending) {
    if(processing.current||item.needsSession) return;
    const epoch=++generation.current;processing.current=true;setBusy(true);setError("");setNotice("");updatePending(item);
    try {
      const reply=await api.command(item.session,item.command);
      if(!mounted.current||epoch!==generation.current) return;
      if(!reply.duplicate) accept(reply);
      setOnline(true);updatePending(null);
      setNotice(reply.duplicate?"이전에 처리한 동일 명령을 확인했습니다.":"기지 상태에 반영했습니다.");
      void refresh(undefined,true);
    } catch(e) {
      if(!mounted.current||epoch!==generation.current) return;
      if(e instanceof GuildApiError&&e.status>=400&&e.status<500) {
        if(e.status===401) {updatePending({...item,needsSession:true});sessionRef.current=null;setSession(null);rememberSession(null);setError(SESSION_MESSAGE);}
        else {updatePending(null);setError(e.message);if(e.status===409) void refresh(undefined,true);}
      } else {setOnline(false);setError(RETRY_MESSAGE);}
    } finally {if(mounted.current&&epoch===generation.current) {processing.current=false;setBusy(false);}}
  }
  function send(action:EmpireAction) {
    const identity=sessionRef.current;
    if(!identity||!dataRef.current||processing.current||pendingRef.current||!online) return;
    void execute({session:identity,command:{commandId:crypto.randomUUID(),expectedEmpireRevision:dataRef.current.state.revision,action:structuredClone(action)},needsSession:false});
  }
  return {data,session,busy,online,error,notice,pending:pending!==null,pendingPilotId:pending?.session.pilotId,
    connect:(id:string)=>void connect(id),refresh:()=>void refresh(undefined,true),send,retry:()=>{if(pendingRef.current) void execute(pendingRef.current);}};
}
