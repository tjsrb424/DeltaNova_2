import type { EmpireCommand, EmpireReply, EmpireSession, EmpireSnapshot } from "./types.ts";
import { request, guildApi } from "../guild/api.ts";
import { validateEmpire, parseEmpireCommand } from "./validation.ts";
export interface EmpireApi {
  read(session:EmpireSession,signal?:AbortSignal):Promise<EmpireSnapshot>;
  connect(pilotId:string,signal?:AbortSignal):Promise<EmpireSession>;
  command(session:EmpireSession,command:EmpireCommand,signal?:AbortSignal):Promise<EmpireReply>;
}
function snapshot(value:{state:unknown;serverTime:unknown},pilotId:string):EmpireSnapshot {
  if(typeof value.serverTime!=="number"||!Number.isSafeInteger(value.serverTime)||value.serverTime<0) throw Error("Invalid server clock");
  const state=validateEmpire(value.state);
  if(state.homePlanetId!==pilotId+"-prime") throw Error("Wrong empire actor");
  return {state,serverTime:value.serverTime};
}
export const empireApi:EmpireApi={
  async read(session,signal) {return snapshot(await request("/api/empire",undefined,session.token,signal),session.pilotId);},
  connect:(pilotId,signal)=>guildApi.connect(pilotId,signal),
  async command(session,command,signal) {
    const data=await request("/api/empire/commands",parseEmpireCommand(command),session.token,signal),value=snapshot(data,session.pilotId);
    if(data.receipt?.pilotId!==session.pilotId||data.receipt?.commandId!==command.commandId||data.receipt?.revision!==value.state.revision||typeof data.duplicate!=="boolean") throw Error("Invalid personal receipt");
    return {...value,receipt:data.receipt,duplicate:data.duplicate};
  },
};
