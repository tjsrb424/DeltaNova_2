// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import GuildPanel from "../src/components/GuildPanel.tsx";
import { GuildApiError } from "../src/guild/api.ts";
import type { GuildApi } from "../src/guild/api.ts";
import { initialGuildState, applyGuildCommand } from "../src/guild/rules.ts";
import type { GuildCommand, GuildSnapshot } from "../src/guild/types.ts";
beforeEach(() => sessionStorage.clear());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
const click = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));
function service() {
  let state = initialGuildState();
  const commands: GuildCommand[] = [];
  const api: GuildApi = {
    read: async () => ({ state: structuredClone(state), serverTime: 1000 }),
    connect: async (pilotId) => ({ pilotId, token: pilotId + "-token" }),
    command: async (session, command) => {
      commands.push(command);
      state = applyGuildCommand(state, session.pilotId, command, 1000);
      return {
        state: structuredClone(state),
        serverTime: 1000,
        receipt: {
          pilotId: session.pilotId,
          commandId: command.commandId,
          revision: state.revision,
        },
        duplicate: false,
      };
    },
  };
  return { api, commands, state: () => state };
}
async function connected(api: GuildApi) {
  render(<GuildPanel api={api} />);
  await screen.findByRole("heading", { name: "도약문 재가동" });
  click("참가자로 연결");
  await screen.findByText("노바 · 연결됨");
}
describe("shared guild screen", () => {
  it("connects, reserves, performs a role and displays earned contribution", async () => {
    const h = service();
    await connected(h.api);
    click("정찰대 예약");
    await screen.findByRole("button", { name: "정찰대 수행" });
    click("역할 추천 편성");
    click("정찰대 수행");
    await screen.findByText("우회 항로 확보");
    expect(h.state().pilots[0].merit).toBe(10);
    expect(screen.getByTestId("guild-merit").textContent).toContain("10");
  });
  it("keeps confirmed progress visible on refresh failure", async () => {
    const h = service();
    await connected(h.api);
    click("정찰대 예약");
    await screen.findByRole("button", { name: "정찰대 수행" });
    h.api.read = async () => {
      throw Error("offline");
    };
    click("상태 새로고침");
    await screen.findByRole("alert");
    expect(screen.getByText("내 예약")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("마지막 확인");
  });
  it("ignores a delayed snapshot older than an accepted command", async () => {
    const h = service();
    await connected(h.api);
    let resolveRead!: (value: GuildSnapshot) => void;
    const old = structuredClone(h.state());
    h.api.read = () =>
      new Promise((resolve) => {
        resolveRead = resolve;
      });
    click("상태 새로고침");
    click("정찰대 예약");
    await screen.findByRole("button", { name: "정찰대 수행" });
    await act(async () => resolveRead({ state: old, serverTime: 999 }));
    expect(screen.getByText("내 예약")).toBeTruthy();
  });
  it("clears an offline warning when the shared server reconnects", async () => {
    const h = service();
    await connected(h.api);
    const read = h.api.read;
    h.api.read = async () => {
      throw Error("offline");
    };
    click("상태 새로고침");
    await screen.findByRole("alert");
    h.api.read = read;
    click("상태 새로고침");
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });
  it("keeps an uncertain command available until its result is resolved", async () => {
    const h = service();
    h.api.command = async () => {
      throw Error("lost");
    };
    await connected(h.api);
    click("정찰대 예약");
    await screen.findByRole("button", { name: "같은 명령 재전송" });
    expect(
      (
        screen.getByRole("button", {
          name: "참가자로 연결",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
  it("retries an ambiguous command with the exact same ID and payload", async () => {
    const h = service();
    let first: GuildCommand | undefined;
    const real = h.api.command;
    h.api.command = async (s, c, signal) => {
      if (!first) {
        first = c;
        throw Error("response lost");
      }
      expect(c).toEqual(first);
      return real(s, c, signal);
    };
    await connected(h.api);
    click("정찰대 예약");
    await screen.findByRole("button", { name: "같은 명령 재전송" });
    click("같은 명령 재전송");
    await screen.findByRole("button", { name: "정찰대 수행" });
    expect(h.state().revision).toBe(1);
  });
  it("clears an expired session while preserving shared state for reconnect", async () => {
    const h = service();
    await connected(h.api);
    h.api.command = async () => {
      throw new GuildApiError(401, "SESSION_EXPIRED", "다시 연결하세요.");
    };
    click("정찰대 예약");
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "참가자로 연결" })).toBeTruthy();
    expect(screen.queryByText("노바 · 연결됨")).toBeNull();
    expect(screen.getByRole("heading", { name: "도약문 재가동" })).toBeTruthy();
  });
  it("does not apply an old session response after a participant changes", async () => {
    const h = service();
    await connected(h.api);
    let resolveRead!: (value: GuildSnapshot) => void;
    const old = structuredClone(h.state());
    h.api.read = () =>
      new Promise((resolve) => {
        resolveRead = resolve;
      });
    click("상태 새로고침");
    const oldRead = resolveRead;
    fireEvent.change(screen.getByLabelText("개발 참가자"), {
      target: { value: "lyra" },
    });
    click("참가자로 연결");
    await screen.findByText("리라 · 연결됨");
    await act(async () =>
      oldRead({ state: { ...old, revision: 999 }, serverTime: 1000 }),
    );
    expect(screen.getByTestId("guild-revision").textContent).not.toContain(
      "999",
    );
  });
});
