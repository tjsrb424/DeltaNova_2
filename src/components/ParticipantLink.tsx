import { useState } from "react";
import { PILOTS } from "../guild/content.ts";
import type { useGuildOperation } from "../guild/useGuildOperation.ts";
import "../guild/guild.css";
import { pendingParticipant } from "../guild/participant-lock.ts";
export default function ParticipantLink({
  network,
}: {
  network: Pick<ReturnType<typeof useGuildOperation>,"session"|"busy"|"error"|"notice"|"pending"|"pendingPilotId"|"connect"|"refresh"|"retry">;
}) {
  const { session, busy, error, notice } = network;
  const [pilotId, setPilotId] = useState(session?.pilotId || "nova");
  const pinned=network.pendingPilotId||pendingParticipant();
  return (
    <>
      <section className="panel guild-connection">
        <div>
          <span className="eyebrow">PARTICIPANT LINK</span>
          <h3>
            {session
              ? `${PILOTS.find((p) => p.id === session.pilotId)?.name} · 연결됨`
              : "기지·공동 작전 참가자 연결"}
          </h3>
          <p className="footnote">
            로컬 서버 공유 모드 · 개발 참가자 선택은 실제 계정 인증이 아닙니다.
          </p>
        </div>
        <div className="pilot-controls">
          <label>
            개발 참가자
            <select
              aria-label="개발 참가자"
              value={pinned || pilotId}
              disabled={busy || !!pinned}
              onChange={(e) => setPilotId(e.target.value)}
            >
              {PILOTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="secondary-button"
            disabled={busy || (network.pending && session !== null)}
              onClick={() => network.connect(pinned || pilotId)}
          >
            참가자로 연결
          </button>
          <button
            className="text-button"
            disabled={busy}
            onClick={network.refresh}
          >
            상태 새로고침
          </button>
        </div>
      </section>
      {error && (
        <div className="storage-notice" role="alert">
          <p>{error}</p>
          {network.pending && (
            <button
              className="secondary-button"
              disabled={busy || !session}
              onClick={network.retry}
            >
              같은 명령 재전송
            </button>
          )}
        </div>
      )}
      {notice && (
        <p className="guild-notice" role="status">
          {notice}
        </p>
      )}
    </>
  );
}
