import { PILOTS } from "./content.ts";
import { useSyncExternalStore } from "react";
import { parseGuildCommand } from "./validation.ts";
import { parseEmpireCommand } from "../empire/validation.ts";
const actors=new Map<"guild"|"empire",string>();
const listeners=new Set<()=>void>();
function subscribe(listener:()=>void) {listeners.add(listener);return ()=>{listeners.delete(listener);};}
export function usePendingParticipant(exclude?:"guild"|"empire") {
  return useSyncExternalStore(subscribe,()=>pendingParticipant(exclude),()=>undefined);
}
export function setParticipantPending(kind:"guild"|"empire",pilotId:string|null) {
  if((actors.get(kind)||null)===pilotId) return;
  if(pilotId) actors.set(kind,pilotId);else actors.delete(kind);
  // Notify after the matching sessionStorage write/removal finishes.
  queueMicrotask(()=>listeners.forEach(listener=>listener()));
}
export function pendingParticipant(exclude?:"guild"|"empire"):string|undefined {
  for(const kind of ["guild","empire"] as const) {
    if(kind===exclude) continue;
    const memory=actors.get(kind);if(memory) return memory;
    try {const v=JSON.parse(sessionStorage.getItem("delta-nova."+kind+"-pending.v1")||"null");
      if(v?.version===1&&PILOTS.some(p=>p.id===v.item?.session?.pilotId)&&typeof v.item.session.token==="string"&&typeof v.item.needsSession==="boolean") {
        if(kind==="guild") parseGuildCommand(v.item.command);else parseEmpireCommand(v.item.command);
        return v.item.session.pilotId;
      }
    } catch{/* unavailable or corrupt storage is not a lock */}
  }
}
