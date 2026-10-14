// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import PlanetDashboard from "../src/components/PlanetDashboard.tsx";
import { applyEmpireAction, initialEmpire, projectEmpire } from "../src/empire/rules.ts";
import type { EmpireApi } from "../src/empire/api.ts";
import type { EmpireState } from "../src/empire/types.ts";
beforeEach(() => sessionStorage.clear());
afterEach(cleanup);

it("includes required power recovery in the carrier path and exposes the blocker", async () => {
  const state = sample(), p = state.planets[0];
  p.facilities = { alloyMine: 5, crystalMine: 5, fuelRefinery: 5, powerPlant: 1, shipyard: 3, laboratory: 2 };
  p.constructionJob = null; state.researchJob = null; state.technologies.industry = 2;
  await connected(state); click("연구");
  const map = screen.getByRole("region", { name: "발전지도" });
  expect(map.textContent).toContain("현재 전력 34 부족");
  const row = within(screen.getByRole("table", { name: "추가 건조 경로 비용" })).getByRole("row", { name: /합금/ });
  expect(within(row).getAllByRole("cell").map(c => c.textContent)).toEqual(["160", "184", "0"]);
});
it("shows when the remaining facility space cannot fit the chosen development path", async () => {
  const state = sample(), p = state.planets[0];
  p.facilities = { alloyMine: 3, crystalMine: 3, fuelRefinery: 3, powerPlant: 1, shipyard: 1, laboratory: 1 };
  p.defenses = 17; p.constructionJob = null; p.shipJob = null; state.researchJob = null;
  await connected(state); click("연구");
  expect(screen.getByRole("region", { name: "발전지도" }).textContent).toContain("필요 공간 33 / 30");
});
it("describes higher defense research without misreporting propulsion effects", async () => {
  const state = sample();
  state.technologies.defense = 1; state.planets[0].facilities.laboratory = 2;
  state.researchJob = { ...state.researchJob!, target: "defense", level: 2, cost: { alloy: 80, crystal: 60, fuel: 20 } };
  await connected(state);
  const effects = screen.getByRole("region", { name: "개발 완료 효과" });
  expect(effects.textContent).toContain("방어 기술 Lv.1 → 2");
  expect(effects.textContent).not.toContain("추진 기술 기반 확보");
});

function sample() {
  const state = initialEmpire("nova", 32000), p = state.planets[0];
  state.technologies.industry = 1;
  p.facilities.alloyMine = 2;
  p.resources = { alloy: 184, crystal: 96, fuel: 68 };
  p.ships.push({ ...p.ships[0], id: "new-scout" });
  p.ships[0].wear = 10; p.ships[1].wear = 8;
  p.constructionJob = { id: "refinery", kind: "facility", planetId: p.id, target: "fuelRefinery", quantity: 1, level: 2, startedAt: 14000, completesAt: 74000, cost: { alloy: 40, crystal: 10, fuel: 10 } };
  p.shipJob = { id: "striker", kind: "ships", planetId: p.id, target: "striker", quantity: 1, level: 0, startedAt: 10000, completesAt: 50000, cost: { alloy: 40, crystal: 20, fuel: 10 } };
  state.researchJob = { id: "intel", kind: "research", planetId: p.id, target: "intelligence", quantity: 1, level: 1, startedAt: 0, completesAt: 90000, cost: { alloy: 40, crystal: 30, fuel: 10 } };
  return state;
}
async function connected(initial = sample()) {
  let state = initial;
  const api: EmpireApi = {
    connect: async pilotId => ({ pilotId, token: "test" }),
    read: async () => ({ state: projectEmpire(state, 32000), serverTime: 32000 }),
    command: async (session, command) => {
      state = applyEmpireAction(state, command.action, 32000, command.commandId);
      return { state: structuredClone(state), serverTime: 32000, receipt: { pilotId: session.pilotId, commandId: command.commandId, revision: state.revision }, duplicate: false };
    },
  };
  render(<PlanetDashboard api={api}/>);
  fireEvent.click(screen.getByRole("button", { name: "참가자로 연결" }));
  await screen.findByRole("heading", { name: "노바 프라임" });
  return { state: () => state };
}
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
it("keeps the selected facility card and action form synchronized", async () => {
  await connected(); click("건설");
  fireEvent.change(screen.getByRole("combobox", { name: "시설 선택" }), { target: { value: "powerPlant" } });
  expect(screen.getByRole("button", { name: /발전소 Lv/ }).classList.contains("selected")).toBe(true);
  click("대시보드"); click("건설 상세");
  expect((screen.getByRole("combobox", { name: "시설 선택" }) as HTMLSelectElement).value).toBe("laboratory");
});
it("replaces the overview with each category's full detail body and returns home", async () => {
  await connected();
  expect(screen.getByRole("region", { name: "전체 현황" })).toBeTruthy();
  click("건설");
  expect(screen.queryByRole("region", { name: "전체 현황" })).toBeNull();
  expect(screen.getByRole("heading", { name: "건설 상세" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "건설" }).getAttribute("aria-current")).toBe("page");
  click("함대");
  expect(screen.getByRole("heading", { name: "현지 함대" })).toBeTruthy();
  expect(screen.queryByRole("combobox", { name: "시설 선택" })).toBeNull();
  click("연구");
  expect(screen.getByRole("region", { name: "발전지도" })).toBeTruthy();
  click("보고서");
  expect(screen.getByRole("heading", { name: "기지 보고서" })).toBeTruthy();
  expect(screen.queryByRole("region", { name: "발전지도" })).toBeNull();
  click("대시보드");
  expect(screen.getByRole("region", { name: "전체 현황" })).toBeTruthy();
});
it("shows actual current production and completion effects without mutating the server state", async () => {
  const h = await connected(), before = structuredClone(h.state());
  const effects = screen.getByRole("region", { name: "개발 완료 효과" });
  expect(effects.textContent).toContain("5 → 9");
  expect(effects.textContent).toContain("10 → 11");
  expect(effects.textContent).toContain("베일");
  const ledger = screen.getByRole("table", { name: "생산·저장 현황" });
  expect(within(ledger).getByRole("row", { name: /합금/ }).textContent).toContain("184");
  expect(within(ledger).getByRole("row", { name: /연료/ }).textContent).toContain("150 → 200");
  expect(screen.getByLabelText("전력 여유 변화").textContent).toContain("24 → 18");
  expect(h.state()).toEqual(before);
});
it("repairs only the current planet's docked damaged ships from the overview", async () => {
  const h = await connected();
  click("함선 2척 수리");
  await waitFor(() => expect(h.state().planets[0].ships.every(s => s.wear === 0)).toBe(true));
  expect(h.state().planets[0].resources.alloy).toBe(182);
  expect(screen.getByLabelText("행성 운영").textContent).toContain("출격 가능 10");
});
it("derives the carrier's future requirements and material deficits from actual levels", async () => {
  await connected(); click("연구");
  const row = within(screen.getByRole("table", { name: "추가 건조 경로 비용" })).getByRole("row", { name: /합금/ });
  expect(within(row).getAllByRole("cell").map(c => c.textContent)).toEqual(["440", "184", "256"]);
  expect(screen.getByRole("region", { name: "발전지도" }).textContent).toContain("연구소 Lv.2 필요");
});
it("excludes a facility upgrade already paid for from future path costs", async () => {
  const state = sample(), p = state.planets[0];
  p.constructionJob = { ...p.constructionJob!, target: "laboratory" };
  await connected(state); click("연구");
  const row = within(screen.getByRole("table", { name: "추가 건조 경로 비용" })).getByRole("row", { name: /합금/ });
  expect(within(row).getAllByRole("cell").map(c => c.textContent)).toEqual(["380", "184", "196"]);
  expect(screen.getByRole("region", { name: "발전지도" }).textContent).toContain("진행 중 · 지불 완료");
});
it("uses empire-wide pending research without requiring a second local lab upgrade", async () => {
  const state = sample(), other = structuredClone(state.planets[0]);
  other.id = "nova-ceres"; other.name = "세레스"; other.kind = "colony";
  other.constructionJob = null; other.shipJob = null; other.ships = []; other.facilities.laboratory = 2;
  state.planets.push(other);
  state.researchJob = { ...state.researchJob!, planetId: other.id, target: "industry", level: 2, cost: { alloy: 80, crystal: 60, fuel: 20 } };
  await connected(state); click("연구");
  const row = within(screen.getByRole("table", { name: "추가 건조 경로 비용" })).getByRole("row", { name: /합금/ });
  expect(within(row).getAllByRole("cell").map(c => c.textContent)).toEqual(["300", "184", "116"]);
  expect(screen.getByRole("region", { name: "발전지도" }).textContent).toContain("세레스");
});
