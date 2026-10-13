// @vitest-environment jsdom
import { beforeEach, afterEach, describe, it, expect } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import BaseOperationsPanel from "../src/components/BaseOperationsPanel.tsx";
import GuildPanel from "../src/components/GuildPanel.tsx";
import { initialGuildState, applyGuildCommand } from "../src/guild/rules.ts";
import type { GuildApi } from "../src/guild/api.ts";
import type { GuildCommand } from "../src/guild/types.ts";
beforeEach(() => sessionStorage.clear());
afterEach(cleanup);
const click = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole("button", { name }));
function service() {
  let state = initialGuildState(1000),
    now = 1000;
  const commands: GuildCommand[] = [];
  const api: GuildApi = {
    read: async () => ({ state: structuredClone(state), serverTime: now }),
    connect: async (pilotId) => ({ pilotId, token: pilotId }),
    command: async (s, c) => {
      commands.push(c);
      state = applyGuildCommand(state, s.pilotId, c, now);
      return {
        state: structuredClone(state),
        serverTime: now,
        receipt: {
          pilotId: s.pilotId,
          commandId: c.commandId,
          revision: state.revision,
        },
        duplicate: false,
      };
    },
  };
  return {
    api,
    commands,
    state: () => state,
    setTime: (n: number) => (now = n),
  };
}
async function connect(api: GuildApi) {
  render(<BaseOperationsPanel api={api} />);
  click("참가자로 연결");
  await screen.findByText("노바 · 연결됨");
  await screen.findByTestId("base-alloy");
}
describe("server base operations", () => {
  it("shows production, collects it and upgrades a facility with server owned costs", async () => {
    const h = service();
    h.setTime(61000);
    await connect(h.api);
    expect(screen.getByTestId("base-alloy").textContent).toContain("126");
    click("생산 수령");
    await waitFor(() =>
      expect(h.state().pilots[0].base.lastProducedAt).toBe(61000),
    );
    click("합금 제조라인 증설");
    await screen.findByText("분당 12 생산");
    expect(h.state().pilots[0].base.resources.alloy).toBe(86);
  });
  it("runs a solo sortie, returns cargo, repairs ships and researches a module", async () => {
    const h = service();
    await connect(h.api);
    click("추천 편성 적용");
    click("교란 지원");
    click("개인 작전 출격");
    await screen.findByRole("button", { name: /화물 6개로 귀환/ });
    click(/화물 6개로 귀환/);
    await screen.findByRole("heading", { name: "작전 보고서" });
    click("편성으로 돌아가기");
    await screen.findByRole("button", { name: "개인 작전 출격" });
    click("손상 함선 일괄 정비");
    await waitFor(() =>
      expect(
        Object.values(h.state().pilots[0].base.wear).every((v) => v === 0),
      ).toBe(true),
    );
    click("확장 화물 연구");
    await waitFor(() =>
      expect(h.state().pilots[0].base.career.profile.active).toBe("cargo"),
    );
    expect(h.state().pilots[0].base.career.profile.research).toBe(40);
  });
  it("shows insufficient supply and disables a departure before sending a command", async () => {
    const h = service();
    h.state().pilots[0].base.resources.supply = 0;
    await connect(h.api);
    click("추천 편성 적용");
    expect(
      (
        screen.getByRole("button", {
          name: "개인 작전 출격",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(screen.getByText(/보급품이 부족/)).toBeTruthy();
    expect(h.commands).toHaveLength(0);
  });
  it("keeps bases distinct when the participant changes", async () => {
    const h = service();
    await connect(h.api);
    click("합금 제조라인 증설");
    await screen.findByText("분당 12 생산");
    fireEvent.change(screen.getByLabelText("개발 참가자"), {
      target: { value: "lyra" },
    });
    click("참가자로 연결");
    await screen.findByText("리라 · 연결됨");
    expect(screen.getByTestId("base-alloy").textContent).toContain("120");
    expect(screen.getByText("분당 6 생산")).toBeTruthy();
  });
  it("allows the same pilot to reserve another role after a completed preparation", async () => {
    const h = service();
    render(<GuildPanel api={h.api} />);
    click("참가자로 연결");
    await screen.findByText("노바 · 연결됨");
    click("정찰대 예약");
    await screen.findByRole("button", { name: "정찰대 수행" });
    click("역할 추천 편성");
    click("정찰대 수행");
    await screen.findByText("우회 항로 확보");
    expect(
      (
        screen.getByRole("button", {
          name: "전자전대 예약",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
    click("전자전대 예약");
    await screen.findByRole("button", { name: "전자전대 수행" });
  });
  it("restores an uncertain base investment after menu reentry and retries the same payload", async () => {
    const h = service(),
      real = h.api.command;
    let original: GuildCommand | undefined;
    h.api.command = async (s, c) => {
      if (!original) {
        original = structuredClone(c);
        throw Error("lost");
      }
      expect(c).toEqual(original);
      return real(s, c);
    };
    await connect(h.api);
    click("합금 제조라인 증설");
    await screen.findByRole("button", { name: "같은 명령 재전송" });
    cleanup();
    render(<BaseOperationsPanel api={h.api} />);
    click("같은 명령 재전송");
    await screen.findByText("분당 12 생산");
    expect(h.state().pilots[0].base.facilities.forge).toBe(2);
  });
});
