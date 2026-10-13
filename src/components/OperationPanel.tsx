import { MISSIONS, SHIPS, SUPPORTS } from "../game/content.ts";
import type { GameAction, Operation } from "../game/types.ts";
import ShipGlyph from "./ShipGlyph.tsx";
import { enemySummary } from "./MissionPanel.tsx";
export default function OperationPanel({
  operation: op,
  onAction,
  locked,
  onBase,
  maintenance = false,
}: {
  operation: Operation;
  onAction: (a: GameAction) => void;
  locked: boolean;
  onBase: () => void;
  maintenance?: boolean;
}) {
  const mission = MISSIONS.find((m) => m.id === op.missionId)!,
    cargo = op.fleet.reduce((s, u) => s + u.cargo, 0),
    survivors = op.fleet.filter((u) => u.hp > 0);
  const free = survivors.reduce((s, u) => s + u.cargoCapacity - u.cargo, 0),
    last = op.battles.at(-1)!;
  return (
    <div className="operation-layout reveal" key={op.id}>
      <section className="panel battle-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              OPERATION {String(op.id).padStart(3, "0")} / {mission.sector}
            </span>
            <h2>{mission.title}</h2>
          </div>
          <span
            className={`chip ${last.outcome === "victory" ? "success" : "danger"}`}
          >
            {last.outcome === "victory"
              ? "교전 승리"
              : last.outcome === "repelled"
                ? "기한 초과"
                : "함대 작전 불능"}
          </span>
        </div>
        <div className="battle-stage">
          <div className="battle-orbit" aria-hidden="true" />
          <span className="battle-stage-label">
            TACTICAL RESOLUTION / {last.rounds} ROUNDS
          </span>
          <div className="battle-formation">
            {op.fleet.map((u) => (
              <div
                key={u.id}
                className={`battle-vessel ${u.hp === 0 ? "disabled-vessel" : ""}`}
              >
                <ShipGlyph
                  role={u.role}
                  color={SHIPS.find((s) => s.id === u.shipId)?.color}
                />
                <strong>{u.name}</strong>
                <div
                  className="hp-bar"
                  role="meter"
                  aria-label={`${u.name} HP`}
                  aria-valuenow={u.hp}
                  aria-valuemin={0}
                  aria-valuemax={u.maxHp}
                >
                  <i style={{ width: `${(u.hp / u.maxHp) * 100}%` }} />
                </div>
                <small>
                  {u.hp} / {u.maxHp} HP
                </small>
                <span>
                  화물 {u.cargo} / {u.cargoCapacity}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="battle-summary">
          <span>
            생존 함선{" "}
            <b>
              {survivors.length} / {op.fleet.length}
            </b>
          </span>
          <span>
            현재 적재 <b>{cargo}</b>
          </span>
          <span>
            추가 적재 가능 <b>{free}</b>
          </span>
        </div>
        <div className="battle-log">
          <h3>결과를 만든 판단</h3>
          <p className="footnote">
            각 라운드의 사격은 동시에 적용됩니다. 무력화된 함선도 해당 라운드의
            사격을 마칩니다.
          </p>
          {op.battles.map((b, i) => (
            <details key={i} open={i === op.battles.length - 1}>
              <summary>
                {i === 0 ? "기본 교전" : "추가 교전"} · {b.rounds}라운드 ·{" "}
                {b.outcome === "victory" ? "승리" : "이탈"}
              </summary>
              {Array.from({ length: b.rounds }, (_, r) => (
                <div className="round-log" key={r}>
                  <span>R{r + 1}</span>
                  <ul>
                    {b.events
                      .filter((e) => e.round === r + 1)
                      .map((e, j) => (
                        <li key={j} className={`event-${e.type}`}>
                          {e.text}
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </details>
          ))}
        </div>
      </section>
      <aside className="panel decision-panel">
        {op.phase === "checkpoint" ? (
          <>
            <span className="eyebrow">DECISION POINT</span>
            <h2>다음 명령을 기다립니다</h2>
            <p className="muted">
              확보한 화물과 함께 귀환하거나, 현재 함대로 추가 목표를 공략하세요.
            </p>
            <div className="cargo-number">
              <strong>{cargo}</strong>
              <span>현재 확보 화물</span>
            </div>
            <div className="next-objective">
              <span className="eyebrow">OPTIONAL OBJECTIVE</span>
              <h3>심부 항로 진입</h3>
              <p>{enemySummary(mission.bonusEnemies)}</p>
              <dl>
                <div>
                  <dt>목표 화물</dt>
                  <dd>+{mission.bonusLoot}</dd>
                </div>
                <div>
                  <dt>남은 적재 공간</dt>
                  <dd>{free}</dd>
                </div>
                <div>
                  <dt>교전 기한</dt>
                  <dd>{mission.maxRounds}라운드</dd>
                </div>
              </dl>
            </div>
            <p className="risk-note">
              무력화된 함선에 실린 화물은 잃습니다. 초과 화물은 적재할 수
              없습니다.
            </p>
            <p className="footnote">
              {SUPPORTS.find((s) => s.id === op.support)!.name} · 기본 교전
              지원은 추가 교전에 재적용되지 않습니다.
            </p>
            <button
              className="primary-button"
              disabled={locked}
              onClick={() => onAction({ type: "return" })}
            >
              화물 {cargo}개로 귀환 <span aria-hidden="true">↙</span>
            </button>
            <button
              className="secondary-button"
              disabled={locked}
              onClick={() => onAction({ type: "advance" })}
            >
              추가 목표 진입 <span aria-hidden="true">↗</span>
            </button>
          </>
        ) : (
          <>
            <span className="eyebrow">MISSION DEBRIEF</span>
            <h2>작전 보고서</h2>
            <p className="muted">{op.reason}</p>
            <div className="cargo-number">
              <strong>{op.recovered}</strong>
              <span>실제 귀환 화물</span>
            </div>
            <div className="settlement">
              <span>새로 얻은 연구 데이터</span>
              <strong>+{op.gained}</strong>
              <small>
                {op.gained > 0
                  ? "임무 최고 성과의 증가분입니다."
                  : "기존 최고 성과를 넘지 않아 추가 지급이 없습니다."}
              </small>
            </div>
            <dl className="result-details">
              <div>
                <dt>화물 성과</dt>
                <dd>{op.recovered * 10}</dd>
              </div>
              <div>
                <dt>무력화로 잃은 화물</dt>
                <dd>{op.cargoLost}</dd>
              </div>
              <div>
                <dt>공간 부족으로 남긴 화물</dt>
                <dd>{op.cargoUnloaded}</dd>
              </div>
            </dl>
            <p className="footnote">
              {maintenance
                ? "귀환한 함선의 피해는 정비 목록에 기록됩니다. 정비하거나 다른 정상 함선으로 다음 출격을 준비하세요."
                : "보유 함선과 기지는 보존됩니다. 편성을 바꿔 즉시 다시 출격할 수 있습니다."}
            </p>
            <button
              className="primary-button"
              disabled={locked}
              onClick={() => onAction({ type: "dismiss" })}
            >
              편성으로 돌아가기
            </button>
            <button
              className="secondary-button"
              disabled={locked}
              onClick={onBase}
            >
              기지 연구로 이동
            </button>
          </>
        )}
      </aside>
    </div>
  );
}
