import { useEffect, useRef, useState } from "react";
import { MISSIONS, MODULES } from "./game/content.ts";
import { initialState, reduceGame } from "./game/state.ts";
import { validateFleet } from "./game/fleet.ts";
import type { Approach, GameAction, Support } from "./game/types.ts";
import { loadGame, saveGame, SAVE_KEY } from "./storage/save.ts";
import type { StoragePort } from "./storage/save.ts";
import FleetPanel from "./components/FleetPanel.tsx";
import MissionPanel from "./components/MissionPanel.tsx";
import SupportPanel from "./components/SupportPanel.tsx";
import BasePanel from "./components/BasePanel.tsx";
import OperationPanel from "./components/OperationPanel.tsx";
import GuildPanel from "./components/GuildPanel.tsx";
import PlanetDashboard from "./components/PlanetDashboard.tsx";

function browserStorage(): StoragePort {
  try {
    return window.localStorage;
  } catch {
    return {
      getItem() {
        throw Error("unavailable");
      },
      setItem() {
        throw Error("unavailable");
      },
    };
  }
}
const NAV = [
  { id: "planet", icon: "◉", name: "행성" },
  { id: "command", icon: "⌘", name: "지휘실" },
  { id: "operations", icon: "⌖", name: "작전 지도" },
  { id: "fleet", icon: "◇", name: "함대 편성" },
  { id: "base", icon: "⬡", name: "기지 연구" },
  { id: "guild", icon: "◎", name: "공동 작전" },
  { id: "career", icon: "▤", name: "기지 운영" },
] as const;
type View = (typeof NAV)[number]["id"];
export default function App({ storage: injected }: { storage?: StoragePort }) {
  const [storage] = useState(() => injected || browserStorage());
  const [loaded] = useState(() => loadGame(storage));
  const [game, setGame] = useState(loaded.state);
  const [invalid, setInvalid] = useState(loaded.status === "invalid");
  const [conflict, setConflict] = useState(false);
  const [warning, setWarning] = useState(
    "reason" in loaded ? loaded.reason : "",
  );
  const [reloadFailure, setReloadFailure] = useState("");
  const [view, setView] = useState<View>("planet");
  const [missionId, setMissionId] = useState(MISSIONS[0].id);
  const [selected, setSelected] = useState<string[]>([]);
  const [support, setSupport] = useState<Support>("none");
  const [approach, setApproach] = useState<Approach>("direct");
  const writeAllowed = useRef(loaded.status !== "invalid");
  const lastSaved = useRef<string | null | undefined>(loaded.snapshot);
  const locked = invalid || conflict;
  const canFlank = support === "recon" || selected.includes("scout-01");
  const mission = MISSIONS.find((m) => m.id === missionId)!;
  const errors = validateFleet(selected, support, approach);
  const serverView = view === "career" || view === "guild";

  useEffect(() => {
    if (!canFlank && approach === "flank") setApproach("direct");
  }, [canFlank, approach]);
  useEffect(() => {
    if (!writeAllowed.current || invalid || conflict) return;
    if (lastSaved.current === undefined) {
      setWarning(
        "기존 저장 기록을 확인하지 못해 저장하지 않습니다. 현재 창에서만 진행됩니다. 기록을 다시 불러오면 이 창의 미저장 진행은 대체됩니다.",
      );
      return;
    }
    const result = saveGame(storage, game, lastSaved.current);
    if (result.ok) {
      lastSaved.current = result.snapshot;
      setWarning("");
    } else if (result.conflict) {
      writeAllowed.current = false;
      setConflict(true);
      setWarning(result.reason);
    } else setWarning(result.reason);
  }, [storage, game, invalid, conflict]);
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === SAVE_KEY || event.key === null) {
        writeAllowed.current = false;
        setConflict(true);
      }
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, []);
  function act(action: GameAction) {
    if (locked || !writeAllowed.current) return;
    try {
      if (
        lastSaved.current !== undefined &&
        storage.getItem(SAVE_KEY) !== lastSaved.current
      ) {
        writeAllowed.current = false;
        setConflict(true);
        return;
      }
    } catch {
      /* Persistence denial still allows play in this window. */
    }
    setGame((current) => reduceGame(current, action));
  }
  function reload() {
    const result = loadGame(storage);
    if (result.status === "invalid" || result.status === "unavailable") {
      writeAllowed.current = false;
      setConflict(true);
      setInvalid(result.status === "invalid");
      if (result.status === "invalid") lastSaved.current = result.snapshot;
      setReloadFailure(
        `불러오기 실패 · ${result.reason} 현재 진행은 그대로 보존했습니다.`,
      );
      return;
    }
    lastSaved.current = result.snapshot;
    setGame(result.state);
    setInvalid(false);
    setConflict(false);
    writeAllowed.current = true;
    setWarning("");
    setReloadFailure("");
  }
  function newPractice() {
    writeAllowed.current = true;
    setInvalid(false);
    setConflict(false);
    setWarning("");
    setReloadFailure("");
    setGame(initialState());
  }
  function goBase() {
    act({ type: "dismiss" });
    setView("base");
  }
  if(view==="planet"||view==="career") return <PlanetDashboard key={view} initialSection={view==="career"?"career":"planet"} onPractice={()=>setView("command")} onGuild={()=>setView("guild")}/>;
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        본문으로 이동
      </a>
      <nav className="nav-rail" aria-label="지휘 메뉴">
        <div className="brand-mark" aria-label="Delta Nova">
          Δ<span>DN</span>
        </div>
        <div className="nav-items">
          {NAV.map((n) => (
            <button
              key={n.id}
              aria-label={n.name}
              disabled={game.operation !== null}
              title={
                game.operation
                  ? "작전 보고서를 마무리한 뒤 이동할 수 있습니다."
                  : n.name
              }
              aria-current={view === n.id ? "page" : undefined}
              className={view === n.id ? "active" : ""}
              onClick={() => setView(n.id)}
            >
              <span aria-hidden="true">{n.icon}</span>
              <small>{n.name}</small>
            </button>
          ))}
        </div>
        <div className="rail-footer">
          <span>V.01</span>
          <i />
        </div>
      </nav>
      <div className="workspace">
        <header className="topbar">
          <div className="wordmark">
            DELTA <b>NOVA</b>
            <span>COMMAND CENTER</span>
          </div>
          <div className="topbar-stats">
            <span className="local-indicator">
              <i /> 로컬 작전실
            </span>
            {!serverView && (
              <span className="data-count">
                ◇ <strong>{game.profile.research}</strong>
                <small>연구 데이터</small>
              </span>
            )}
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <span className="eyebrow">NOVA INITIATIVE / COMMANDER</span>
              <h1>
                {game.operation
                  ? "작전 관제"
                  : NAV.find((n) => n.id === view)!.name}
              </h1>
            </div>
            {!serverView && (
              <div className="base-status">
                <span>기지 모듈</span>
                <strong>
                  {MODULES.find((m) => m.id === game.profile.active)?.name ||
                    "기본 구성"}
                </strong>
              </div>
            )}
          </div>
          {(invalid || conflict || warning) && (
            <div className="storage-notice" role="alert">
              <div>
                <strong>
                  {conflict
                    ? "다른 창에서 진행이 변경되었습니다."
                    : invalid
                      ? "저장 기록 확인이 필요합니다."
                      : "저장 상태 안내"}
                </strong>
                <p>
                  {conflict
                    ? "현재 작전은 그대로 보관하고 조작을 잠갔습니다. 최신 기록을 불러오면 이 창의 미저장 진행은 대체됩니다."
                    : warning}
                </p>
                {reloadFailure && <p>{reloadFailure}</p>}
              </div>
              {conflict ? (
                <div>
                  <button className="secondary-button" onClick={reload}>
                    최신 기록 불러오기
                  </button>
                  {invalid && (
                    <>
                      <p className="footnote">
                        새 연습을 시작하면 현재 진행과 읽을 수 없는 외부 기록을
                        대체합니다.
                      </p>
                      <button
                        className="secondary-button"
                        onClick={newPractice}
                      >
                        새 연습 시작
                      </button>
                    </>
                  )}
                </div>
              ) : invalid ? (
                <div>
                  <p className="footnote">
                    새 연습을 시작하면 읽을 수 없는 기존 기록을 대체합니다.
                  </p>
                  <button className="secondary-button" onClick={newPractice}>
                    새 연습 시작
                  </button>
                </div>
              ) : lastSaved.current === undefined ? (
                <button className="secondary-button" onClick={reload}>
                  저장 기록 다시 확인
                </button>
              ) : null}
            </div>
          )}
          {game.message && (
            <div className="game-notice" role="status">
              {game.message}
              <button
                aria-label="알림 닫기"
                onClick={() => act({ type: "clear-message" })}
              >
                ×
              </button>
            </div>
          )}
          {game.operation ? (
            <OperationPanel
              operation={game.operation}
              onAction={act}
              locked={locked}
              onBase={goBase}
            />
          ) : view === "guild" ? (
            <GuildPanel onBase={() => setView("career")} />
          ) : view === "base" ? (
            <>
              <Hero compact />
              <BasePanel
                profile={game.profile}
                onAction={act}
                locked={locked}
              />
            </>
          ) : (
            <div className="command-layout">
              <div className="main-column">
                {view === "command" && <Hero />}
                {view === "command" && (
                  <section className="panel guild-base-status">
                    <p>
                      기지 운영에서 생산·정비·연구와 저장되는 개인 작전을
                      진행하세요. 이 지휘실은 비용 없이 편성을 시험하는 연습
                      공간입니다.
                    </p>
                    <button
                      className="secondary-button"
                      onClick={() => setView("career")}
                    >
                      기지 운영 시작
                    </button>
                  </section>
                )}
                {view !== "fleet" && (
                  <MissionPanel
                    selected={missionId}
                    onChange={setMissionId}
                    locked={locked}
                  />
                )}
                <FleetPanel
                  selected={selected}
                  onChange={setSelected}
                  locked={locked}
                />
              </div>
              <aside className="right-column">
                <section className="panel briefing-panel">
                  <div className="briefing-top">
                    <span className="eyebrow">MISSION BRIEFING</span>
                    <span className="signal-bars" aria-hidden="true">
                      ▂▄▆
                    </span>
                  </div>
                  <h2>{mission.title}</h2>
                  <p className="muted">{mission.description}</p>
                  <div className="briefing-rewards">
                    <div>
                      <span>기본 목표</span>
                      <strong>
                        {approach === "flank" ? mission.loot - 2 : mission.loot}
                        <small>화물</small>
                      </strong>
                    </div>
                    <div>
                      <span>추가 목표</span>
                      <strong>
                        +{mission.bonusLoot}
                        <small>화물</small>
                      </strong>
                    </div>
                  </div>
                  <div className="divider" />
                  <SupportPanel
                    support={support}
                    approach={approach}
                    onSupport={setSupport}
                    onApproach={setApproach}
                    canFlank={canFlank}
                    locked={locked}
                  />
                  <div className="launch-box">
                    <div>
                      <span className="eyebrow">DEPARTURE STATUS</span>
                      <span className={errors.length ? "muted" : "success"}>
                        {errors.length ? "편성 대기" : "출격 준비 완료"}
                      </span>
                    </div>
                    <p>
                      {errors[0] ||
                        `${selected.length}척 · ${approach === "direct" ? "직행" : "우회"} · ${mission.maxRounds}라운드 내 목표 확보`}
                    </p>
                    <button
                      className="primary-button launch-button"
                      aria-label="작전 출격"
                      disabled={locked || errors.length > 0}
                      onClick={() =>
                        act({
                          type: "launch",
                          missionId,
                          fleetIds: selected,
                          support,
                          approach,
                        })
                      }
                    >
                      작전 출격 <span aria-hidden="true">↗</span>
                    </button>
                    <small>
                      선택한 편성으로 교전을 해결하고 결과를 분석합니다.
                    </small>
                  </div>
                </section>
                <div className="commander-note">
                  <span aria-hidden="true">⌁</span>
                  <p>
                    강한 함대보다,
                    <br />
                    <strong>목적에 맞는 함대.</strong>
                  </p>
                  <small>정찰 · 교란 · 보급 · 회수</small>
                </div>
              </aside>
            </div>
          )}
          <footer className="page-footer">
            <span>
              DELTA NOVA <b> / </b> FIRST CONTACT
            </span>
            <span>개인·공동 작전 · 공개 서비스와 PvP는 개발 예정</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
function Hero({ compact = false }: { compact?: boolean }) {
  return (
    <section
      className={`hero ${compact ? "compact" : ""}`}
      aria-label="델타 노바 궤도 기지"
    >
      <img
        src="/art/orbital-base-v1.png"
        alt="흰 세라믹 장갑과 구리색 구조물을 갖춘 델타 노바 궤도 기지"
      />
      <div className="hero-shade" />
      <div className="hero-copy">
        <span className="eyebrow">YOUR NEXT FRONTIER</span>
        <h2>더 멀리 갈 준비.</h2>
        <p>
          당신의 함대. 서로 다른 역할.
          <br />
          하나의 작전.
        </p>
        <span className="hero-location">
          <i /> NOVA STATION / LOW ORBIT
        </span>
      </div>
      <span className="hero-corner" aria-hidden="true">
        01 / ORIGINAL CONCEPT
      </span>
    </section>
  );
}
