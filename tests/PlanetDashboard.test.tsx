// @vitest-environment jsdom
import { it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import PlanetDashboard from "../src/components/PlanetDashboard.tsx";
import App from "../src/App.tsx";
import type { EmpireApi } from "../src/empire/api.ts";
import type { EmpireCommand, EmpireReply } from "../src/empire/types.ts";
import { initialEmpire, projectEmpire, applyEmpireAction } from "../src/empire/rules.ts";
beforeEach(()=>sessionStorage.clear());afterEach(cleanup);
function service(two=false) {
  let state=initialEmpire("nova",0),now=0;const commands:EmpireCommand[]=[];
  if(two) {const p=structuredClone(state.planets[0]);p.id="nova-ceres";p.name="세레스";p.kind="colony";p.ships=[];p.resources.alloy=200;state.planets.push(p);}
  const api:EmpireApi={
    connect:async pilotId=>({pilotId,token:"test"}),
    read:async()=>({state:projectEmpire(state,now),serverTime:now}),
    command:async(session,command)=>{commands.push(structuredClone(command));state=applyEmpireAction(state,command.action,now,"nova-"+command.commandId);return {state:structuredClone(state),serverTime:now,receipt:{pilotId:session.pilotId,commandId:command.commandId,revision:state.revision},duplicate:false};},
  };
  return {api,commands,time:(at:number)=>now=at,state:()=>state};
}
const click=(name:string|RegExp)=>fireEvent.click(screen.getByRole("button",{name}));
async function connected(api:EmpireApi) {render(<PlanetDashboard api={api}/>);click("참가자로 연결");await screen.findByRole("heading",{name:"노바 프라임"});}
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
