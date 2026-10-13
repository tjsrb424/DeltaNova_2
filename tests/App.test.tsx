// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "../src/App.tsx";
import { decodeSave, SAVE_KEY } from "../src/storage/save.ts";
afterEach(cleanup);
function memory(raw: string | null = null) {
  return {
    raw,
    getItem() {
      return this.raw;
    },
    setItem(_key: string, value: string) {
      this.raw = value;
    },
  };
}
const click = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole("button", { name }));
describe("command center", () => {
  it("locks navigation while resolving an operation and allows base access after settlement", () => {
    render(<App storage={memory()} />);
    click("추천 편성 적용");
    click("교란 지원");
    click("작전 출격");
    expect(
      (screen.getByRole("button", { name: "기지 연구" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    click(/화물 \d+개로 귀환/);
    click("기지 연구로 이동");
    expect(
      screen.getByRole("heading", { name: "다음 작전을 바꾸는 연구." }),
    ).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "지휘실" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
  it("requires a fleet and updates command usage from selected ships", () => {
    render(<App storage={memory()} />);
    expect(
      (screen.getByRole("button", { name: "작전 출격" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    click("케스트럴 01 편성");
    expect(screen.getByTestId("command-usage").textContent).toContain("2 / 12");
    click("케스트럴 01 편성");
    expect(screen.getByTestId("command-usage").textContent).toContain("0 / 12");
  });
  it("resets an unsupported flank when recon is deselected", () => {
    render(<App storage={memory()} />);
    click("케스트럴 01 편성");
    click("정찰 지원");
    click("우회 항로");
    expect(
      screen
        .getByRole("button", { name: "우회 항로" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    click("독립 작전");
    expect(
      screen
        .getByRole("button", { name: "직행 항로" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });
  it("plays, settles once, persists and permits retry", () => {
    const storage = memory();
    render(<App storage={storage} />);
    click("추천 편성 적용");
    click("교란 지원");
    click("작전 출격");
    expect(
      screen.getByRole("heading", { name: "다음 명령을 기다립니다" }),
    ).toBeTruthy();
    click(/화물 \d+개로 귀환/);
    expect(screen.getByRole("heading", { name: "작전 보고서" })).toBeTruthy();
    const research = decodeSave(storage.raw!).profile.research;
    expect(research).toBeGreaterThan(0);
    click("편성으로 돌아가기");
    click("작전 출격");
    click(/화물 \d+개로 귀환/);
    expect(decodeSave(storage.raw!).profile.research).toBe(research);
  });
  it("preserves invalid storage until an explicit new practice", () => {
    const storage = memory("broken");
    render(<App storage={storage} />);
    expect(storage.raw).toBe("broken");
    expect(screen.getByRole("alert").textContent).toContain("기존 기록");
    click("새 연습 시작");
    expect(decodeSave(storage.raw!).profile.totalSorties).toBe(0);
  });
  it("warns when persistence fails without disabling memory play", () => {
    render(
      <App
        storage={{
          getItem: () => null,
          setItem() {
            throw Error("quota");
          },
        }}
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "저장하지 못했습니다",
    );
    click("추천 편성 적용");
    expect(
      (screen.getByRole("button", { name: "작전 출격" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
  it("locks commands on external storage changes and explicitly reloads", () => {
    render(<App storage={memory()} />);
    click("추천 편성 적용");
    fireEvent(
      window,
      new StorageEvent("storage", { key: SAVE_KEY, newValue: "external" }),
    );
    expect(screen.getByRole("alert").textContent).toContain("다른 창");
    expect(
      (screen.getByRole("button", { name: "작전 출격" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    click("최신 기록 불러오기");
    expect(
      (screen.getByRole("button", { name: "작전 출격" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
});
