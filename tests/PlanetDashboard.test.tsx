// @vitest-environment jsdom
import { it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within, act } from "@testing-library/react";
import PlanetDashboard from "../src/components/PlanetDashboard.tsx";
import App from "../src/App.tsx";
import type { EmpireApi } from "../src/empire/api.ts";
import type { EmpireCommand, EmpireReply } from "../src/empire/types.ts";
import { initialEmpire, projectEmpire, applyEmpireAction } from "../src/empire/rules.ts";
import { PILOTS } from "../src/guild/content.ts";
beforeEach(()=>sessionStorage.clear());afterEach(cleanup);
function service(two=false) {
  let state=initialEmpire("nova",0),now=0,reads=0;const commands:EmpireCommand[]=[];
  if(two) {const p=structuredClone(state.planets[0]);p.id="nova-ceres";p.name="세레스";p.kind="colony";p.ships=[];p.resources.alloy=200;state.planets.push(p);}
  const api:EmpireApi={
    connect:async pilotId=>({pilotId,token:"test"}),
    read:async()=>{reads++;return {state:projectEmpire(state,now),serverTime:now};},
    command:async(session,command)=>{commands.push(structuredClone(command));state=applyEmpireAction(state,command.action,now,"nova-"+command.commandId);return {state:structuredClone(state),serverTime:now,receipt:{pilotId:session.pilotId,commandId:command.commandId,revision:state.revision},duplicate:false};},
  };
  return {api,commands,time:(at:number)=>now=at,state:()=>state,reads:()=>reads};
}
const click=(name:string|RegExp)=>fireEvent.click(screen.getByRole("button",{name}));
async function connected(api:EmpireApi) {const view=render(<PlanetDashboard api={api}/>);click("참가자로 연결");await screen.findByRole("heading",{name:"노바 프라임"});return view;}
it("starts a polite completion region without announcing historical jobs",async()=>{
  const h=service();h.state().events.push({id:"old-job",at:0,planetId:"nova-prime",kind:"completed",title:"합금 광산 Lv.2 완료"});
  await connected(h.api);const notice=screen.getByRole("status",{name:"작업 완료 알림"});
  expect(notice.getAttribute("aria-live")).toBe("polite");expect(notice.getAttribute("aria-atomic")).toBe("true");expect(notice.textContent).toBe("");
});
it("announces a newly completed ship once and preserves the active input",async()=>{
  const h=service();await connected(h.api);click("케스트럴 건조");await screen.findByRole("progressbar",{name:/케스트럴/});
  const input=screen.getByRole("spinbutton",{name:"건조 수량"});input.focus();h.time(40000);click("상태 새로고침");
  const notice=screen.getByRole("status",{name:"작업 완료 알림"});
  await waitFor(()=>expect(notice.textContent).toContain("노바 프라임 · 함선 건조 1척 완료"));expect(document.activeElement).toBe(input);
  const mutations:MutationRecord[]=[];const observer=new MutationObserver(records=>mutations.push(...records));observer.observe(notice,{childList:true,characterData:true,subtree:true});
  const reads=h.reads();click("상태 새로고침");await waitFor(()=>expect(h.reads()).toBeGreaterThan(reads));await act(async()=>{});
  observer.disconnect();expect(mutations).toHaveLength(0);
});
it("groups newly completed jobs by their real source planets and ignores cancellation",async()=>{
  const h=service(true);await connected(h.api);click("케스트럴 건조");await screen.findByRole("progressbar",{name:/케스트럴/});
  click("세레스 식민지");click("케스트럴 건조");await waitFor(()=>expect(h.commands).toHaveLength(2));
  h.state().events.push({id:"cancelled-job",at:0,planetId:"nova-ceres",kind:"cancelled",title:"방어 포대 취소"});h.time(40000);click("상태 새로고침");
  const notice=screen.getByRole("status",{name:"작업 완료 알림"});
  await waitFor(()=>expect(notice.textContent).toContain("세레스 · 함선 건조 1척 완료"));
  expect(notice.textContent).toContain("노바 프라임 · 함선 건조 1척 완료");expect(notice.textContent).not.toContain("취소");
});
it("announces consecutive identical job titles separately and suppresses replay after remount",async()=>{
  const h=service(),view=await connected(h.api);click("케스트럴 건조");await screen.findByRole("progressbar",{name:/케스트럴/});
  h.time(40000);click("상태 새로고침");const notice=screen.getByRole("status",{name:"작업 완료 알림"});
  await waitFor(()=>expect(notice.textContent).toContain("함선 건조 1척 완료"));const first=notice.firstChild;
  click("케스트럴 건조");await screen.findByRole("progressbar",{name:/케스트럴/});h.time(80000);click("상태 새로고침");
  await waitFor(()=>expect(notice.firstChild).not.toBe(first));expect(notice.textContent).toContain("함선 건조 1척 완료");
  view.unmount();render(<PlanetDashboard api={h.api}/>);await screen.findByRole("heading",{name:"노바 프라임"});
  expect(screen.getByRole("status",{name:"작업 완료 알림"}).textContent).toBe("");
});
it("announces a job completed while away when returning to the same dashboard",async()=>{
  const h=service(),view=await connected(h.api);click("케스트럴 건조");await screen.findByRole("progressbar",{name:/케스트럴/});
  view.unmount();h.time(40000);render(<PlanetDashboard api={h.api}/>);await screen.findByRole("heading",{name:"노바 프라임"});
  await waitFor(()=>expect(screen.getByRole("status",{name:"작업 완료 알림"}).textContent).toContain("노바 프라임 · 함선 건조 1척 완료"));
});
it("clears the previous participant announcement and baselines the next participant history",async()=>{
  const h=service(),read=h.api.read,other=initialEmpire(PILOTS[1].id,0);
  other.events.push({id:"other-old-job",at:0,planetId:other.homePlanetId,kind:"completed",title:"다른 참가자 과거 연구 완료"});
  h.api.read=(session,signal)=>session.pilotId==="nova"?read(session,signal):Promise.resolve({state:projectEmpire(other,40000),serverTime:40000});
  await connected(h.api);click("케스트럴 건조");await screen.findByRole("progressbar",{name:/케스트럴/});h.time(40000);click("상태 새로고침");
  await waitFor(()=>expect(screen.getByRole("status",{name:"작업 완료 알림"}).textContent).toContain("함선 건조"));
  fireEvent.change(screen.getByRole("combobox",{name:"개발 참가자"}),{target:{value:PILOTS[1].id}});click("참가자로 연결");
  await screen.findByText("다른 참가자 과거 연구 완료");expect(screen.getByRole("status",{name:"작업 완료 알림"}).textContent).toBe("");
});
it("starts the application at the planet dashboard and keeps a real practice entry",()=>{
  render(<App storage={{getItem:()=>null,setItem:()=>{}}}/>);
  expect(screen.getByRole("button",{name:"편성 연습"})).toBeTruthy();
  expect(screen.queryByText("연구 데이터")).toBeNull();
});
it("shows actual local assets, one owned planet and no invented hostile fleets",async()=>{
  const h=service();await connected(h.api);
  expect(screen.getByTestId("empire-alloy").textContent).toContain("120");
  expect(screen.getByRole("button",{name:"노바 프라임 본성"})).toBeTruthy();
  expect(screen.queryByRole("button",{name:/아스트라|켈리온/})).toBeNull();
  expect(screen.getByLabelText("행성 운영").textContent).toContain("보유 9척");
  expect(screen.queryByText("적 함대 접근")).toBeNull();
});
it("connects station selection to real facility and shipyard actions",async()=>{
  const h=service();await connected(h.api);click("생산 시설");
  expect(screen.getByRole("heading",{name:/합금 광산/})).toBeTruthy();
  click("합금 광산 증설");await waitFor(()=>expect(h.commands).toHaveLength(1));
  expect(h.commands[0].action).toEqual({type:"upgrade-facility",planetId:"nova-prime",facility:"alloyMine"});
  await screen.findByRole("progressbar",{name:/합금 광산/});
});
it("builds real ships, displays their work and refreshes completed inventory",async()=>{
  const h=service();await connected(h.api);
  expect(screen.getByRole("heading",{name:/조선소/})).toBeTruthy();
  fireEvent.change(screen.getByRole("spinbutton",{name:"건조 수량"}),{target:{value:"1"}});
  click("케스트럴 건조");await screen.findByRole("progressbar",{name:/케스트럴/});
  expect(h.commands[0].action).toEqual({type:"build-ships",planetId:"nova-prime",shipId:"striker",quantity:1});
  expect(screen.getByTestId("empire-alloy").textContent).toContain("80");
  h.time(40000);click("상태 새로고침");
  await waitFor(()=>expect(screen.getByLabelText("행성 운영").textContent).toContain("보유 10척"));
  click("함대");expect(screen.getByRole("heading",{name:"현지 함대"})).toBeTruthy();
});
it("explains insufficient resources and rejects invalid build quantities",async()=>{
  const h=service();await connected(h.api);
  fireEvent.change(screen.getByRole("spinbutton",{name:"건조 수량"}),{target:{value:"20"}});
  expect((screen.getByRole("button",{name:"케스트럴 건조"}) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText(/합금이 부족합니다/)).toBeTruthy();
  fireEvent.change(screen.getByRole("spinbutton",{name:"건조 수량"}),{target:{value:"0"}});
  expect((screen.getByRole("button",{name:"케스트럴 건조"}) as HTMLButtonElement).disabled).toBe(true);
  expect(h.commands).toHaveLength(0);
});
it("uses the selected planet as the cost source and returns cancellation refunds there",async()=>{
  const h=service(true);await connected(h.api);click("세레스 식민지");
  expect(screen.getByTestId("empire-alloy").textContent).toContain("200");
  click("케스트럴 건조");await waitFor(()=>expect(h.commands).toHaveLength(1));
  expect(h.commands[0].action.planetId).toBe("nova-ceres");
  await screen.findByRole("button",{name:/케스트럴.*취소/});click(/케스트럴.*취소/);click("취소 확정");
  await waitFor(()=>expect(h.commands).toHaveLength(2));
  expect(h.state().planets[0].resources.alloy).toBe(120);
  expect(h.state().planets[1].resources.alloy).toBe(192);
});
it("preserves a pending original planet when the display switches before retry",async()=>{
  const h=service(true),original=h.api.command;let receipt:EmpireReply|undefined,attempt=0;
  h.api.command=async(s,c)=>{if(++attempt===1){receipt=await original(s,c);throw Error("lost");}h.commands.push(c);return {...receipt!,duplicate:true};};
  await connected(h.api);click("케스트럴 건조");await screen.findByRole("button",{name:"같은 명령 재전송"});
  click("세레스 식민지");click("같은 명령 재전송");
  await waitFor(()=>expect(h.commands).toHaveLength(2));
  expect(h.commands[1]).toEqual(h.commands[0]);expect(h.commands[1].action.planetId).toBe("nova-prime");
});
it("starts common research with an explicit local cost and exposes personal fleet choices",async()=>{
  const h=service();await connected(h.api);click("연구");click("산업 기술 연구");
  await waitFor(()=>expect(h.commands[0].action).toEqual({type:"start-research",planetId:"nova-prime",technology:"industry"}));
  click("개인 작전");expect(screen.getByRole("heading",{name:"개인 작전"})).toBeTruthy();
  expect(screen.getByRole("button",{name:"개인 작전 출격"})).toBeTruthy();
  const region=screen.getByRole("region",{name:"개인 작전 편성"});expect(within(region).getAllByRole("checkbox")).toHaveLength(9);
});
