// @vitest-environment jsdom
import { it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, render, screen, act, waitFor, cleanup, fireEvent } from "@testing-library/react";
import PlanetDashboard from "../src/components/PlanetDashboard.tsx";
import GuildPanel from "../src/components/GuildPanel.tsx";
import { useEmpire } from "../src/empire/useEmpire.ts";
import { empireApi } from "../src/empire/api.ts";
import type { EmpireApi } from "../src/empire/api.ts";
import type { EmpireCommand, EmpireReply, EmpireSnapshot } from "../src/empire/types.ts";
import { initialEmpire, applyEmpireAction, projectEmpire } from "../src/empire/rules.ts";
import { GuildApiError } from "../src/guild/api.ts";
import type { GuildApi } from "../src/guild/api.ts";
import type { GuildAction } from "../src/guild/types.ts";
import { useGuildOperation } from "../src/guild/useGuildOperation.ts";
import { initialGuildState } from "../src/guild/rules.ts";
import { upgradeWorld } from "../src/empire/migration.ts";
import { guildView } from "../src/empire/world.ts";
import { PILOTS } from "../src/guild/content.ts";
import { setParticipantPending } from "../src/guild/participant-lock.ts";
beforeEach(()=>{sessionStorage.clear();setParticipantPending("guild",null);setParticipantPending("empire",null);}); afterEach(()=>{cleanup();vi.restoreAllMocks();});
const build={type:"build-ships",planetId:"nova-prime",shipId:"striker",quantity:1} as const;
it.each(["empire","guild"] as const)("disables target-screen commands and names the unresolved %s screen after navigation",async(source)=>{
  const h=service(),original=h.api.command;let attempts=0;
  h.api.command=async(s,c)=>{if(source==="empire"&&++attempts===1) throw Error("lost");return original(s,c);};
  const state=initialGuildState(0);let guildAttempts=0;
  const api:GuildApi={read:async()=>({state,serverTime:0}),connect:async pilotId=>({pilotId,token:"test"}),command:async(s,c)=>{
    if(source==="guild"&&++guildAttempts===1) throw Error("lost");
    return {state,serverTime:0,receipt:{pilotId:s.pilotId,commandId:c.commandId,revision:state.revision},duplicate:false};
  }};
  if(source==="empire") {
    const origin=renderHook(()=>useEmpire(h.api));await connect(origin.result);
    act(()=>origin.result.current.send(build));await waitFor(()=>expect(origin.result.current.pending).toBe(true));origin.unmount();
    render(<GuildPanel api={api}/>);
    await screen.findByText("노바 · 연결됨");
    expect((screen.getByRole("button",{name:"정찰대 예약"}) as HTMLButtonElement).disabled).toBe(true);
    expect(await screen.findByText(/행성·개인 작전 화면에 미확정 명령/)).toBeTruthy();
    const recovery=renderHook(()=>useEmpire(h.api));act(()=>recovery.result.current.retry());await waitFor(()=>expect(recovery.result.current.pending).toBe(false));
    await waitFor(()=>expect((screen.getByRole("button",{name:"정찰대 예약"}) as HTMLButtonElement).disabled).toBe(false));
  } else {
    const origin=renderHook(()=>useGuildOperation(api));act(()=>origin.result.current.connect("nova"));await waitFor(()=>expect(origin.result.current.session).toBeTruthy());
    act(()=>origin.result.current.send({type:"claim",role:"recon"}));await waitFor(()=>expect(origin.result.current.pending).toBe(true));origin.unmount();
    render(<PlanetDashboard api={h.api}/>);await screen.findByRole("heading",{name:"노바 프라임"});
    fireEvent.click(screen.getByRole("button",{name:"함대"}));
    expect((screen.getByRole("button",{name:"케스트럴 건조"}) as HTMLButtonElement).disabled).toBe(true);
    expect(await screen.findByText(/공동 작전 화면에 미확정 명령/)).toBeTruthy();
    const recovery=renderHook(()=>useGuildOperation(api));act(()=>recovery.result.current.retry());await waitFor(()=>expect(recovery.result.current.pending).toBe(false));
    await waitFor(()=>expect((screen.getByRole("button",{name:"케스트럴 건조"}) as HTMLButtonElement).disabled).toBe(false));
  }
});
it.each(["empire","guild"] as const)("blocks other-screen asset commands until the original %s request resolves",async(source)=>{
  const h=service(),empireCommand=h.api.command;let empireAttempt=0,guildAttempt=0,guildCalls=0;
  h.api.command=async(s,c)=>{if(source==="empire"&&++empireAttempt===1) throw Error("lost");return empireCommand(s,c);};
  const old=initialGuildState(0),api:GuildApi={read:async()=>({state:old,serverTime:0}),connect:async pilotId=>({pilotId,token:"test"}),command:async(s,c)=>{
    guildCalls++;if(source==="guild"&&++guildAttempt===1) throw Error("lost");
    return {state:old,serverTime:0,receipt:{pilotId:s.pilotId,commandId:c.commandId,revision:old.revision},duplicate:false};
  }};
  const empire=renderHook(()=>useEmpire(h.api)),guild=renderHook(()=>useGuildOperation(api));await connect(empire.result);
  act(()=>guild.result.current.connect("nova"));await waitFor(()=>expect(guild.result.current.session?.pilotId).toBe("nova"));
  const sharedAction:GuildAction={type:"contribute",role:"recon",fleetIds:["scout-01"]};
  if(source==="empire") {
    act(()=>empire.result.current.send(build));await waitFor(()=>expect(empire.result.current.pending).toBe(true));
    act(()=>guild.result.current.send(sharedAction));expect(guildCalls).toBe(0);
    expect(guild.result.current.blockedByOtherCommand).toBe(true);
    act(()=>empire.result.current.retry());await waitFor(()=>expect(empire.result.current.pending).toBe(false));
    await waitFor(()=>expect(guild.result.current.blockedByOtherCommand).toBe(false));
    act(()=>guild.result.current.send(sharedAction));await waitFor(()=>expect(guildCalls).toBe(1));
  } else {
    act(()=>guild.result.current.send(sharedAction));await waitFor(()=>expect(guild.result.current.pending).toBe(true));
    act(()=>empire.result.current.send(build));expect(h.commands).toHaveLength(0);
    expect(empire.result.current.blockedByOtherCommand).toBe(true);
    act(()=>guild.result.current.retry());await waitFor(()=>expect(guild.result.current.pending).toBe(false));
    await waitFor(()=>expect(empire.result.current.blockedByOtherCommand).toBe(false));
    act(()=>empire.result.current.send(build));await waitFor(()=>expect(h.commands).toHaveLength(1));
  }
});
it("refreshes the live shared inventory after confirming an older duplicate receipt",async()=>{
  const world=upgradeWorld(initialGuildState(0),0),old=guildView(world);
  world.pilots[0].empire=projectEmpire(applyEmpireAction(world.pilots[0].empire,build,0,"built"),40000);
  const live=guildView(world);let calls=0,reads=0;
  const api:GuildApi={read:async()=>{reads++;return {state:calls?live:old,serverTime:calls?40000:0};},connect:async pilotId=>({pilotId,token:"test"}),command:async(s,c)=>{
    if(++calls===1) throw Error("lost");
    return {state:old,serverTime:80000,receipt:{pilotId:s.pilotId,commandId:c.commandId,revision:old.revision},duplicate:true};
  }};
  const hook=renderHook(()=>useGuildOperation(api));act(()=>hook.result.current.connect("nova"));await waitFor(()=>expect(hook.result.current.session).toBeTruthy());
  act(()=>hook.result.current.send({type:"claim",role:"recon"}));await waitFor(()=>expect(hook.result.current.pending).toBe(true));
  act(()=>hook.result.current.refresh());await waitFor(()=>expect(hook.result.current.data?.state.pilots[0].fleetContext?.roster).toHaveLength(10));
  const before=reads;act(()=>hook.result.current.retry());await waitFor(()=>expect(hook.result.current.pending).toBe(false));
  await waitFor(()=>expect(reads).toBeGreaterThan(before));expect(hook.result.current.data?.state.pilots[0].fleetContext?.roster).toHaveLength(10);
});
function service() {
  let state=initialEmpire("nova",0),now=0;const commands:EmpireCommand[]=[],connections:string[]=[];
  const api:EmpireApi={
    connect:async pilotId=>{connections.push(pilotId);return {pilotId,token:pilotId+"-token"};},
    read:async()=>({state:projectEmpire(state,now),serverTime:now}),
    command:async(session,c)=>{commands.push(structuredClone(c));state=applyEmpireAction(state,c.action,now,"nova-"+c.commandId);return {state:structuredClone(state),serverTime:now,receipt:{pilotId:session.pilotId,commandId:c.commandId,revision:state.revision},duplicate:false};},
  };
  return {api,commands,connections,time:(value:number)=>now=value,state:()=>state};
}
async function connect(result:{current:ReturnType<typeof useEmpire>}) {
  act(()=>result.current.connect("nova"));await waitFor(()=>expect(result.current.data?.state.homePlanetId).toBe("nova-prime"));
}
it("sends a token on authenticated GET reads",async()=>{
  const fetcher=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify({state:initialEmpire("nova",0),serverTime:0}),{status:200,headers:{"Content-Type":"application/json"}}));
  await empireApi.read({pilotId:"nova",token:"test-token"});
  expect(fetcher.mock.calls[0][1]?.headers).toEqual({Authorization:"Bearer test-token"});
});
it("connects and sends server commands with a personal revision and explicit source",async()=>{
  const h=service(),{result}=renderHook(()=>useEmpire(h.api));await connect(result);
  act(()=>result.current.send(build));await waitFor(()=>expect(result.current.data?.state.revision).toBe(1));
  expect(h.commands[0]).toMatchObject({expectedEmpireRevision:0,action:build});
  expect("operationId" in h.commands[0]).toBe(false);
});
it("does not let a slow old read overwrite a confirmed command",async()=>{
  const h=service(),{result}=renderHook(()=>useEmpire(h.api));await connect(result);
  let resolve!:(v:EmpireSnapshot)=>void;const stale=await h.api.read({pilotId:"nova",token:"test"});
  h.api.read=()=>new Promise(r=>resolve=r);act(()=>result.current.refresh());
  act(()=>result.current.send(build));await waitFor(()=>expect(result.current.data?.state.revision).toBe(1));
  await act(async()=>resolve(stale));expect(result.current.data?.state.revision).toBe(1);
});
it("retry refreshes after an older receipt and retains the original command across navigation",async()=>{
  const h=service(),original=h.api.command;let receipt:EmpireReply|undefined,attempt=0;
  h.api.command=async(s,c)=>{if(++attempt===1){receipt=await original(s,c);throw Error("lost reply");}h.commands.push(c);return {...receipt!,duplicate:true,serverTime:40000};};
  let hook=renderHook(()=>useEmpire(h.api));await connect(hook.result);
  act(()=>hook.result.current.send(build));await waitFor(()=>expect(hook.result.current.pending).toBe(true));
  h.time(40000);hook.unmount();let reads=0;const read=h.api.read;h.api.read=async(...args)=>{reads++;return read(...args);};
  hook=renderHook(()=>useEmpire(h.api));await waitFor(()=>expect(hook.result.current.data?.state.planets[0].ships).toHaveLength(10));
  const before=reads;act(()=>hook.result.current.retry());
  await waitFor(()=>expect(hook.result.current.pending).toBe(false));await waitFor(()=>expect(reads).toBeGreaterThan(before));
  expect(h.commands[1]).toEqual(h.commands[0]);expect(hook.result.current.data?.state.planets[0].ships).toHaveLength(10);
});
it("preserves pending commands when storage is denied and blocks switching the actor",async()=>{
  vi.spyOn(Storage.prototype,"setItem").mockImplementation(()=>{throw Error("denied");});
  const h=service();h.api.command=async(_s,c)=>{h.commands.push(c);throw Error("network");};
  let hook=renderHook(()=>useEmpire(h.api));await connect(hook.result);
  act(()=>hook.result.current.send(build));await waitFor(()=>expect(hook.result.current.pending).toBe(true));
  hook.unmount();hook=renderHook(()=>useEmpire(h.api));
  expect(hook.result.current.pendingPilotId).toBe("nova");
  act(()=>hook.result.current.connect("lyra"));expect(h.connections).toEqual(["nova"]);
});
it("reconnects an expired session with the same actor before retrying the same command",async()=>{
  const h=service(),original=h.api.command;let attempts=0;
  h.api.command=async(s,c)=>{if(++attempts===1){h.commands.push(c);throw new GuildApiError(401,"SESSION_EXPIRED","다시 연결");}return original(s,c);};
  const {result}=renderHook(()=>useEmpire(h.api));await connect(result);
  act(()=>result.current.send(build));await waitFor(()=>expect(result.current.session).toBeNull());
  expect(result.current.pending).toBe(true);act(()=>result.current.connect("lyra"));expect(h.connections).toEqual(["nova"]);
  act(()=>result.current.connect("nova"));await waitFor(()=>expect(result.current.session?.pilotId).toBe("nova"));
  act(()=>result.current.retry());await waitFor(()=>expect(result.current.pending).toBe(false));expect(h.commands[1]).toEqual(h.commands[0]);
});
it("keeps the last confirmed state after a read failure and blocks new spending",async()=>{
  const h=service(),{result}=renderHook(()=>useEmpire(h.api));await connect(result);
  h.api.read=async()=>{throw Error("offline");};act(()=>result.current.refresh());
  await waitFor(()=>expect(result.current.online).toBe(false));expect(result.current.data?.state.planets[0].resources.alloy).toBe(120);
  act(()=>result.current.send(build));expect(h.commands).toHaveLength(0);expect(result.current.error).toContain("마지막");
});
it("blocks switching the participant in the guild screen while a planet command is unresolved",async()=>{
  const h=service();h.api.command=async()=>{throw Error("lost");};
  const empire=renderHook(()=>useEmpire(h.api));await connect(empire.result);
  act(()=>empire.result.current.send(build));await waitFor(()=>expect(empire.result.current.pending).toBe(true));empire.unmount();
  const connections:string[]=[],api:GuildApi={read:async()=>({state:initialGuildState(),serverTime:0}),connect:async pilotId=>{connections.push(pilotId);return {pilotId,token:"test"};},command:async()=>{throw Error("unused");}};
  const guild=renderHook(()=>useGuildOperation(api));act(()=>guild.result.current.connect(PILOTS[1].id));
  await act(async()=>{});expect(connections).toHaveLength(0);
});
it("blocks switching the participant in the planet screen while a guild command is unresolved",async()=>{
  const api:GuildApi={read:async()=>({state:initialGuildState(),serverTime:0}),connect:async pilotId=>({pilotId,token:"test"}),command:async()=>{throw Error("lost");}};
  const guild=renderHook(()=>useGuildOperation(api));act(()=>guild.result.current.connect("nova"));await waitFor(()=>expect(guild.result.current.session?.pilotId).toBe("nova"));
  act(()=>guild.result.current.send({type:"claim",role:"recon"}));await waitFor(()=>expect(guild.result.current.pending).toBe(true));guild.unmount();
  const h=service(),empire=renderHook(()=>useEmpire(h.api));act(()=>empire.result.current.connect(PILOTS[1].id));
  await act(async()=>{});expect(h.connections).toHaveLength(0);
});
