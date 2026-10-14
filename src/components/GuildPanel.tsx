import { useState } from "react";
import { GUILD_ROLES, PILOTS, ROLE_IDS } from "../guild/content.ts";
import { guildApi } from "../guild/api.ts";
import type { GuildApi } from "../guild/api.ts";
import type { GuildRole } from "../guild/types.ts";
import { useGuildOperation } from "../guild/useGuildOperation.ts";
import { validateFleet } from "../game/fleet.ts";
import FleetPanel from "./FleetPanel.tsx";
import ShipGlyph from "./ShipGlyph.tsx";
import ParticipantLink from "./ParticipantLink.tsx";
import { projectBase, sortieCost } from "../base/rules.ts";
import "../base/base.css";
import "../guild/guild.css";
export default function GuildPanel({
  api = guildApi,
  onBase,
}: {
  api?: GuildApi;
  onBase?: () => void;
}) {
  const network = useGuildOperation(api),
    { data, session, busy, online } = network;
  const [role, setRole] = useState<GuildRole>("recon"),
    [fleet, setFleet] = useState<string[]>([]);
  const world = data?.state,
    op = world?.operation,
    definition = GUILD_ROLES.find((r) => r.id === role)!;
  const slot = op?.slots[role],
    now = data?.serverTime || 0;
  const mine = slot?.ownerId === session?.pilotId && session !== null;
  const ready = Boolean(
    mine &&
      !slot?.completed &&
      (slot?.leaseUntil || 0) > now &&
      op?.phase === "preparing",
  );
  const locked = busy || network.pending || network.blockedByOtherCommand || !session || !online;
  const ownRole =
    world && session
      ? ROLE_IDS.find((r) => {
          const s = world.operation.slots[r];
          return (
            s.ownerId === session.pilotId && !s.completed && s.leaseUntil > now
          );
        })
      : undefined;
  const context=world?.pilots.find(p=>p.id===session?.pilotId)?.fleetContext;
  const fleetErrors = validateFleet(fleet, "none", "direct",context);
  const pilot = world?.pilots.find((p) => p.id === session?.pilotId),
    base = pilot && projectBase(pilot.base, now);
  if (base && fleet.some((id) => base.wear[id] > 0))
    fleetErrors.push(
      "정비가 필요합니다. 기지 운영에서 정비하거나 다른 함선을 편성하세요.",
    );
  if (base?.career.operation?.phase === "checkpoint")
    fleetErrors.push("개인 작전 함대가 출격 중입니다. 먼저 귀환하세요.");
  const localFleet=fleet.filter(id=>!context||context.roster.some(r=>r.id===id));
  if (base && base.resources.supply < sortieCost(localFleet,"none",context))
    fleetErrors.push("보급품이 부족합니다. 기지 운영에서 생산을 수령하세요.");
  const report = slot?.report;
  return (
    <div className="guild-screen reveal">
      <section className="guild-banner">
        <div className="gate-art" aria-hidden="true">
          <i />
          <i />
          <i />
          <span>Δ</span>
        </div>
        <div className="guild-banner-copy">
          <span className="eyebrow">NOVA ALLIANCE / SHARED OPERATION</span>
          <h2>도약문 재가동</h2>
          <p>
            항로를 여는 한 척.
            <br />
            신호를 끊는 한 척. 함께 완성하는 작전.
          </p>
          <span className="chip">
            {op?.phase === "complete"
              ? "도약문 복구 완료"
              : `공동 작전 ${op?.id || "—"} · 준비 단계`}
          </span>
        </div>
        <div className="guild-banner-stats">
          <strong>
            {op ? ROLE_IDS.filter((r) => op.slots[r].completed).length : 0}
            <small>/ 4</small>
          </strong>
          <span>완료된 역할</span>
          <b data-testid="guild-revision">REV {world?.revision ?? "—"}</b>
        </div>
      </section>
      <ParticipantLink network={network} />
      {!world && (
        <section className="panel">
          <p className="muted">
            공동 작전 기록을 불러오는 중입니다. 서버가 꺼져 있다면{" "}
            <code>npm run dev</code>로 작전실을 시작하세요.
          </p>
        </section>
      )}
      {world && op && (
        <>
          <section className="guild-base-status">
            <div>
              <p>
                혼자서는 역할을 순서대로 수행하고, 여러 명은 역할을 나눠
                진행합니다.
              </p>
              {base && (
                <p>
                  현지 연료 {base.resources.supply} · 출격 비용{" "}
                  {sortieCost(localFleet,"none",context)} · 합금 {base.resources.alloy}
                </p>
              )}
            </div>
            {onBase && (
              <button className="secondary-button" onClick={onBase}>
                기지 운영·정비로 이동
              </button>
            )}
          </section>
          <div className="guild-roles">
            {GUILD_ROLES.map((r, i) => {
              const s = op.slots[r.id],
                owner = PILOTS.find((p) => p.id === s.ownerId),
                expired = !s.completed && s.leaseUntil <= now,
                available = !s.completed && (!owner || expired),
                isMine = owner?.id === session?.pilotId;
              return (
                <article
                  key={r.id}
                  className={`panel guild-role ${role === r.id ? "chosen" : ""} ${s.completed ? "completed" : ""}`}
                >
                  <button
                    className="role-title-button"
                    aria-label={`${r.name} 보기`}
                    aria-pressed={role === r.id}
                    onClick={() => {
                      setRole(r.id);
                      setFleet([]);
                    }}
                  >
                    <span className="role-number">0{i + 1}</span>
                    <span className="eyebrow">{r.label}</span>
                    <h3>{r.name}</h3>
                  </button>
                  <span
                    className={`role-status ${s.completed ? "success" : ""}`}
                  >
                    {s.completed
                      ? `${owner?.name} · 기여 완료`
                      : available
                        ? "참가자 모집"
                        : isMine
                          ? "내 예약"
                          : `${owner?.name} · 예약 중`}
                  </span>
                  <p>{r.effect}</p>
                  <small>{r.requirement}</small>
                  <button
                    className="secondary-button"
                    aria-label={`${r.name} 예약`}
                    disabled={
                      locked ||
                      !available ||
                      op.phase === "complete" ||
                      Boolean(ownRole && ownRole !== r.id)
                    }
                    onClick={() => {
                      setRole(r.id);
                      setFleet([]);
                      network.send({ type: "claim", role: r.id });
                    }}
                  >
                    {s.completed
                      ? "기여 완료"
                      : !available
                        ? "예약됨"
                        : "역할 예약"}
                  </button>
                </article>
              );
            })}
          </div>
          <div className="guild-workspace">
            <div>
              <section className="panel guild-assignment">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">
                      ROLE BRIEFING / {definition.label}
                    </span>
                    <h2>{definition.name} 임무</h2>
                  </div>
                  <span className="chip">개인 공헌 +10 · 공동 성공 +20</span>
                </div>
                <p className="muted">{definition.description}</p>
                <div className="guild-condition">
                  <span>성공 조건</span>
                  <strong>{definition.requirement}</strong>
                </div>
                {role === "breach" && (
                  <div className="available-supports">
                    {GUILD_ROLES.slice(0, 3).map((r) => (
                      <div
                        key={r.id}
                        className={op.slots[r.id].completed ? "ready" : ""}
                      >
                        <span>
                          {op.slots[r.id].completed ? "✓" : "○"} {r.name}
                        </span>
                        <small>
                          {op.slots[r.id].completed
                            ? r.effect
                            : "기여 미완료 · 지원 없이 출격 가능"}
                        </small>
                      </div>
                    ))}
                    <p className="footnote">
                      출격 시 완료된 지원만 적용됩니다. 외곽과 핵심 시설을 연속
                      공략하며, 실패해도 동료의 확정 기여는 유지됩니다.
                    </p>
                  </div>
                )}
                {ready ? (
                  <div className="guild-role-controls">
                    <button
                      className="text-button"
                      disabled={locked}
                      onClick={() => setFleet(definition.recommended)}
                    >
                      역할 추천 편성
                    </button>
                    <button
                      className="text-button"
                      disabled={locked}
                      onClick={() => network.send({ type: "release", role })}
                    >
                      예약 해제
                    </button>
                  </div>
                ) : (
                  <p className="footnote">
                    {slot?.completed
                      ? "이 역할의 기여가 작전에 보존되어 있습니다."
                      : ownRole && ownRole !== role
                        ? "이미 맡은 역할을 완료하거나 예약을 해제한 뒤 선택할 수 있습니다."
                        : "이 역할을 예약하면 함대를 편성할 수 있습니다."}
                  </p>
                )}
              </section>
              {ready && (
                <>
                  <FleetPanel
                    selected={fleet}
                    onChange={setFleet}
                    recommended={definition.recommended}
                    locked={locked}
                    roster={context?.roster}
                    unavailable={base?Object.fromEntries(Object.entries(base.wear).filter(([,wear])=>wear>0).map(([id])=>[id,"정비 필요"])):undefined}
                  />
                  <div className="guild-sortie-bar">
                    <p>
                      {fleetErrors[0] ||
                        `${fleet.length}척 출격 · ${definition.requirement}`}
                    </p>
                    <button
                      className="primary-button"
                      disabled={locked || fleetErrors.length > 0}
                      onClick={() =>
                        network.send({
                          type: "contribute",
                          role,
                          fleetIds: fleet,
                        })
                      }
                    >
                      {busy ? "서버 확인 중" : `${definition.name} 수행`}{" "}
                      <span aria-hidden="true">↗</span>
                    </button>
                  </div>
                </>
              )}
              {report && (
                <section
                  className="panel guild-report"
                  aria-label="공동 작전 결과"
                >
                  <span className="eyebrow">
                    CONTRIBUTION REPORT /{" "}
                    {PILOTS.find((p) => p.id === report.pilotId)?.name}
                  </span>
                  <h2>{report.summary}</h2>
                  <div className="guild-report-stats">
                    <span>
                      개인 공헌 <strong>+{report.personalMerit}</strong>
                    </span>
                    <span>
                      실제 기여{" "}
                      <strong>
                        {report.contribution}
                        {role === "supply"
                          ? " 화물"
                          : role === "recon"
                            ? " 항로"
                            : role === "jam"
                              ? " 교란 창"
                              : " 거점"}
                      </strong>
                    </span>
                    <span>
                      보급 복구 <strong>{report.supplyHealed} HP</strong>
                    </span>
                  </div>
                  {Object.keys(report.effects).length > 0 && (
                    <p className="footnote">
                      적용된 동료 지원:{" "}
                      {Object.entries(report.effects)
                        .map(
                          ([r, p]) =>
                            `${GUILD_ROLES.find((d) => d.id === r)!.name} ${PILOTS.find((d) => d.id === p)!.name}`,
                        )
                        .join(" · ")}
                    </p>
                  )}
                  <div className="guild-survivors">
                    {report.fleet.map((u) => (
                      <div
                        key={u.id}
                        className={u.hp === 0 ? "disabled-vessel" : ""}
                      >
                        <ShipGlyph role={u.role} small />
                        <strong>{u.name}</strong>
                        <span>
                          {u.hp}/{u.maxHp} HP
                        </span>
                      </div>
                    ))}
                  </div>
                  {report.battles.map((b, i) => (
                    <details key={i}>
                      <summary>
                        {i + 1}차 교전 · {b.rounds}라운드 ·{" "}
                        {b.outcome === "victory"
                          ? "승리"
                          : b.outcome === "destroyed"
                            ? "작전 불능"
                            : "기한 초과"}
                      </summary>
                      <ul className="guild-event-list">
                        {b.events.map((e, j) => (
                          <li key={j} className={`event-${e.type}`}>
                            <span>R{e.round}</span>
                            {e.text}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </section>
              )}
            </div>
            <aside>
              <section className="panel guild-ledger">
                <span className="eyebrow">CONTRIBUTION LEDGER</span>
                <h2>함께 만든 성과</h2>
                <div className="my-merit">
                  <span>내 누적 공헌</span>
                  <strong data-testid="guild-merit">
                    {world.pilots.find((p) => p.id === session?.pilotId)
                      ?.merit ?? "—"}
                  </strong>
                  <small>개인 작전 연구와 별도로 기록됩니다.</small>
                </div>
                {world.pilots.map((p) => (
                  <div className="ledger-row" key={p.id}>
                    <span>
                      {p.name}
                      {p.id === session?.pilotId && <small>YOU</small>}
                    </span>
                    <b>{p.merit}</b>
                  </div>
                ))}
                <p className="footnote">
                  역할 완료 +10, 공동 성공 +20. 피해량이나 재시도 횟수로 보상이
                  증가하지 않습니다. 완료한 기여는 접속을 종료해도 유지됩니다.
                </p>
              </section>
              {op.phase === "complete" && (
                <section className="panel guild-complete">
                  <span className="eyebrow">GATE RESTORED</span>
                  <h2>공동 목표 달성</h2>
                  {op.awards.map((a) => (
                    <p key={a.pilotId}>
                      {PILOTS.find((p) => p.id === a.pilotId)!.name}
                      <b>공동 보상 +{a.amount}</b>
                    </p>
                  ))}
                  <button
                    className="primary-button"
                    disabled={locked}
                    onClick={() => network.send({ type: "next-operation" })}
                  >
                    다음 공동 작전 개설
                  </button>
                </section>
              )}
              <p className="footnote">
                예약은 5분 후 만료됩니다. 현재 표시는 마지막 서버 확인 시각
                기준입니다. 완료 기여에는 만료가 없습니다.
              </p>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
