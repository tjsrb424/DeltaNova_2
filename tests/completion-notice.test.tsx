// @vitest-environment jsdom
import { useLayoutEffect } from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { empireApi } from "../src/empire/api.ts";
import type { EmpireApi } from "../src/empire/api.ts";
import type { EmpireState } from "../src/empire/types.ts";
import { initialEmpire } from "../src/empire/rules.ts";
import { useCompletionNotice } from "../src/empire/useCompletionNotice.ts";
afterEach(cleanup);
it("does not replay an old completion when returning to an already observed API",()=>{
  const api1={...empireApi},api2={...empireApi},initial=initialEmpire("nova",0),observe=()=>{};
  const view=render(<Notice api={api2} state={initial} observe={observe}/>);
  view.rerender(<Notice api={api1} state={initial} observe={observe}/>);
  const completed={...initial,events:[{id:"completed-on-one",at:40000,planetId:"nova-prime",kind:"completed" as const,title:"함선 건조 1척 완료"}]};
  view.rerender(<Notice api={api1} state={completed} observe={observe}/>);
  expect(screen.getByRole("status").textContent).toContain("함선 건조");
  view.rerender(<Notice api={api2} state={initial} observe={observe}/>);
  expect(screen.getByRole("status").textContent).toBe("");
  view.rerender(<Notice api={api1} state={completed} observe={observe}/>);
  expect(screen.getByRole("status").textContent).toBe("");
});
function Notice({api,state,observe}:{api:EmpireApi;state:EmpireState;observe:(text:string)=>void}) {
  const notice=useCompletionNotice(api,state);
  useLayoutEffect(()=>{observe(notice?.text||"");});
  return <p role="status">{notice?.text}</p>;
}
it.each(["participant","API"] as const)("never renders the previous completion on the first %s change render",kind=>{
  const api={...empireApi},initial=initialEmpire("nova",0),observed:string[]=[];
  const observe=(text:string)=>observed.push(text);
  const view=render(<Notice api={api} state={initial} observe={observe}/>);
  const completed={...initial,events:[{id:"new-ship",at:40000,planetId:"nova-prime",kind:"completed" as const,title:"함선 건조 1척 완료"}]};
  view.rerender(<Notice api={api} state={completed} observe={observe}/>);
  expect(screen.getByRole("status").textContent).toContain("함선 건조 1척 완료");
  observed.length=0;
  const next=initialEmpire(kind==="participant"?"other":"nova",40000);
  view.rerender(<Notice api={kind==="API"?{...empireApi}:api} state={next} observe={observe}/>);
  expect(observed.length).toBeGreaterThan(0);
  expect(observed.every(text=>text==="")).toBe(true);
});
