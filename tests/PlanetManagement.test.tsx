// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import PlanetDashboard from "../src/components/PlanetDashboard.tsx";
import PlanetActionPanel from "../src/components/PlanetActionPanel.tsx";
import { initialEmpire, applyEmpireAction, projectEmpire } from "../src/empire/rules.ts";
import type { EmpireApi } from "../src/empire/api.ts";

beforeEach(() => sessionStorage.clear());
afterEach(cleanup);

it("shows the selected upgrade's real production, storage, power and space before spending", () => {
  const state = initialEmpire("nova", 0), before = structuredClone(state);
  render(<PlanetActionPanel state={state} planet={state.planets[0]} mode="construction" locked={false} send={() => {}}/>);
  const effects = screen.getByRole("table", { name: "증설 완료 효과" });
  expect(within(effects).getByRole("row", { name: /합금 생산/ }).textContent).toContain("6 → 12/분");
  expect(within(effects).getByRole("row", { name: /합금 저장/ }).textContent).toContain("300 → 400");
  expect(within(effects).getByRole("row", { name: /여유 전력/ }).textContent).toContain("30 → 24");
  expect(within(effects).getByRole("row", { name: /시설 공간/ }).textContent).toContain("6 → 7 / 30");
  expect(state).toEqual(before);
});

it("previews all production recovered by a power upgrade using the current reduced output", () => {
  const state = initialEmpire("nova", 0), p = state.planets[0];
  p.facilities.alloyMine = p.facilities.crystalMine = p.facilities.fuelRefinery = 5;
  render(<PlanetActionPanel state={state} planet={p} mode="construction" target="powerPlant" locked={false} send={() => {}}/>);
  const effects = screen.getByRole("table", { name: "증설 완료 효과" });
  expect(within(effects).getByRole("row", { name: /합금 생산/ }).textContent).toContain("19 → 30/분");
  expect(within(effects).getByRole("row", { name: /결정 생산/ }).textContent).toContain("12 → 20/분");
  expect(within(effects).getByRole("row", { name: /연료 생산/ }).textContent).toContain("12 → 20/분");
});

it("does not promise an extra level or space at the maximum facility level", () => {
  const state = initialEmpire("nova", 0), p = state.planets[0]; p.facilities.alloyMine = 5;
  render(<PlanetActionPanel state={state} planet={p} mode="construction" locked={false} send={() => {}}/>);
  expect(screen.queryByRole("table", { name: "증설 완료 효과" })).toBeNull();
  expect((screen.getByRole("button", { name: "합금 광산 증설" }) as HTMLButtonElement).disabled).toBe(true);
});

it("keeps connection recovery available when participant settings are folded", async () => {
  let state = initialEmpire("nova", 0);
  const api: EmpireApi = {
    connect: async pilotId => ({ pilotId, token: "test" }),
    read: async () => ({ state: projectEmpire(state, 0), serverTime: 0 }),
    command: async () => { throw Error("lost receipt"); },
  };
  render(<PlanetDashboard api={api}/>);
  fireEvent.click(screen.getByRole("button", { name: "참가자로 연결" }));
  await screen.findByRole("heading", { name: "노바 프라임" });
  expect(screen.queryByRole("combobox", { name: "개발 참가자" })).toBeNull();
  expect(screen.getByRole("button", { name: "상태 새로고침" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "건설" }));
  fireEvent.click(screen.getByRole("button", { name: "합금 광산 증설" }));
  await screen.findByRole("button", { name: "같은 명령 재전송" });
  expect(screen.getByRole("alert").textContent).toContain("명령 처리 여부");
  fireEvent.click(screen.getByRole("button", { name: "참가자 설정" }));
  expect((screen.getByRole("combobox", { name: "개발 참가자" }) as HTMLSelectElement).disabled).toBe(true);
});

it("keeps the facility selection after starting work and opens its details from the queue", async () => {
  let state = initialEmpire("nova", 0);
  const api: EmpireApi = {
    connect: async pilotId => ({ pilotId, token: "test" }),
    read: async () => ({ state: projectEmpire(state, 0), serverTime: 0 }),
    command: async (session, command) => {
      state = applyEmpireAction(state, command.action, 0, command.commandId);
      return { state: structuredClone(state), serverTime: 0, receipt: { pilotId: session.pilotId, commandId: command.commandId, revision: state.revision }, duplicate: false };
    },
  };
  render(<PlanetDashboard api={api}/>);
  fireEvent.click(screen.getByRole("button", { name: "참가자로 연결" }));
  await screen.findByRole("heading", { name: "노바 프라임" });
  fireEvent.click(screen.getByRole("button", { name: "건설" }));
  fireEvent.click(screen.getByRole("button", { name: /연료 합성소 Lv/ }));
  fireEvent.click(screen.getByRole("button", { name: "연료 합성소 증설" }));
  await waitFor(() => expect(state.planets[0].constructionJob?.target).toBe("fuelRefinery"));
  expect((screen.getByRole("combobox", { name: "시설 선택" }) as HTMLSelectElement).value).toBe("fuelRefinery");
  fireEvent.click(screen.getByRole("button", { name: "대시보드" }));
  fireEvent.click(screen.getByRole("button", { name: "연료 합성소 Lv.2 상세" }));
  expect(screen.getByRole("button", { name: "건설" }).getAttribute("aria-current")).toBe("page");
  expect((screen.getByRole("combobox", { name: "시설 선택" }) as HTMLSelectElement).value).toBe("fuelRefinery");
});

it("preserves keyboard focus when choosing a facility in the current category", async () => {
  const state = initialEmpire("nova", 0);
  const api: EmpireApi = { connect: async pilotId => ({ pilotId, token: "test" }), read: async () => ({ state, serverTime: 0 }), command: async () => { throw Error("unused"); } };
  render(<PlanetDashboard api={api}/>);
  fireEvent.click(screen.getByRole("button", { name: "참가자로 연결" }));
  await screen.findByRole("heading", { name: "노바 프라임" });
  fireEvent.click(screen.getByRole("button", { name: "건설" }));
  const facility = screen.getByRole("button", { name: /연료 합성소 Lv/ }); facility.focus(); fireEvent.click(facility);
  expect(document.activeElement).toBe(facility);
  expect((screen.getByRole("combobox", { name: "시설 선택" }) as HTMLSelectElement).value).toBe("fuelRefinery");
});

it("opens another planet's job with that planet's facilities and cost source", async () => {
  let state = initialEmpire("nova", 0), other = structuredClone(state.planets[0]);
  other.id = "nova-ceres"; other.name = "세레스"; other.kind = "colony"; other.ships = []; state.planets.push(other);
  state = applyEmpireAction(state, { type: "upgrade-facility", planetId: other.id, facility: "laboratory" }, 0, "other-lab");
  const api: EmpireApi = { connect: async pilotId => ({ pilotId, token: "test" }), read: async () => ({ state, serverTime: 0 }), command: async () => { throw Error("unused"); } };
  render(<PlanetDashboard api={api}/>);
  fireEvent.click(screen.getByRole("button", { name: "참가자로 연결" }));
  await screen.findByRole("heading", { name: "노바 프라임" });
  const queue = screen.getByRole("region", { name: /진행 중/ });
  fireEvent.click(within(queue).getByRole("button", { name: "전체 보기 →" }));
  fireEvent.click(within(queue).getByRole("button", { name: "연구소 Lv.2 상세" }));
  expect(screen.getByRole("heading", { name: "세레스" })).toBeTruthy();
  expect(screen.getByRole("region", { name: "선택한 개발" }).textContent).toContain("현지 투자: 세레스");
  expect((screen.getByRole("combobox", { name: "시설 선택" }) as HTMLSelectElement).value).toBe("laboratory");
});

it("opens the chosen research inspector from the overview instead of leaving focus at the growth map", async () => {
  const state = initialEmpire("nova", 0);
  const api: EmpireApi = { connect: async pilotId => ({ pilotId, token: "test" }), read: async () => ({ state, serverTime: 0 }), command: async () => { throw Error("unused"); } };
  render(<PlanetDashboard api={api}/>);
  fireEvent.click(screen.getByRole("button", { name: "참가자로 연결" }));
  await screen.findByRole("heading", { name: "노바 프라임" });
  fireEvent.click(screen.getByRole("button", { name: "연구 상세" }));
  const selected = screen.getByRole("combobox", { name: "연구 기술" }) as HTMLSelectElement;
  expect(selected.value).toBe("industry");
  expect(document.activeElement).toBe(selected.closest(".action-inspector"));
});

it("opens the current research job from the queue without stealing focus on later dropdown edits", async () => {
  const initial = initialEmpire("nova", 0);
  const state = applyEmpireAction(initial, { type: "start-research", planetId: initial.homePlanetId, technology: "industry" }, 0, "research-job");
  const api: EmpireApi = { connect: async pilotId => ({ pilotId, token: "test" }), read: async () => ({ state, serverTime: 0 }), command: async () => { throw Error("unused"); } };
  render(<PlanetDashboard api={api}/>);
  fireEvent.click(screen.getByRole("button", { name: "참가자로 연결" }));
  await screen.findByRole("heading", { name: "노바 프라임" });
  fireEvent.click(screen.getByRole("button", { name: "연구" }));
  fireEvent.click(screen.getByRole("button", { name: "산업 기술 Lv.1 상세" }));
  const selected = screen.getByRole("combobox", { name: "연구 기술" }) as HTMLSelectElement;
  expect(selected.value).toBe("industry");
  expect(document.activeElement).toBe(selected.closest(".action-inspector"));
  selected.focus();
  fireEvent.change(selected, { target: { value: "intelligence" } });
  expect(selected.value).toBe("intelligence");
  expect(document.activeElement).toBe(selected);
  fireEvent.click(screen.getByRole("button", { name: "산업 기술 Lv.1 상세" }));
  expect(document.activeElement).toBe(selected.closest(".action-inspector"));
});

it("focuses the new sortie result and follows the report's research action", async () => {
  let state = initialEmpire("nova", 0);
  const api: EmpireApi = {
    connect: async pilotId => ({ pilotId, token: "test" }),
    read: async () => ({ state, serverTime: 0 }),
    command: async (session, command) => {
      state = applyEmpireAction(state, command.action, 0, command.commandId);
      return { state: structuredClone(state), serverTime: 0, receipt: { pilotId: session.pilotId, commandId: command.commandId, revision: state.revision }, duplicate: false };
    },
  };
  render(<PlanetDashboard api={api}/>);
  fireEvent.click(screen.getByRole("button", { name: "참가자로 연결" }));
  await screen.findByRole("heading", { name: "노바 프라임" });
  fireEvent.click(screen.getByRole("button", { name: "개인 작전" }));
  fireEvent.click(screen.getByRole("button", { name: "추천 편성 적용" }));
  fireEvent.click(screen.getByRole("button", { name: "개인 작전 출격" }));
  const returnButton = await screen.findByRole("button", { name: /^화물 \d+개로 귀환/ });
  expect(document.activeElement?.className).toBe("empire-career-results");
  fireEvent.click(returnButton);
  await screen.findByRole("heading", { name: "작전 보고서" });
  expect(document.activeElement?.classList.contains("decision-panel")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "기지 연구로 이동" }));
  await waitFor(() => expect(state.career.operation).toBeNull());
  expect(screen.getByRole("button", { name: "연구" }).getAttribute("aria-current")).toBe("page");
  expect(screen.getByRole("combobox", { name: "연구 기술" })).toBeTruthy();
});
