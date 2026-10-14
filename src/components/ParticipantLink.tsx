import { useState } from "react";
import { PILOTS } from "../guild/content.ts";
import type { useGuildOperation } from "../guild/useGuildOperation.ts";
import "../guild/guild.css";
import { usePendingParticipant } from "../guild/participant-lock.ts";
export default function ParticipantLink({
  network,
  compact = false,
  online = true,
  verifiedAt,
}: {
  network: Pick<ReturnType<typeof useGuildOperation>,"session"|"busy"|"error"|"notice"|"pending"|"pendingPilotId"|"blockedByOtherCommand"|"otherPendingScreen"|"connect"|"refresh"|"retry">;
  compact?: boolean;
  online?: boolean;
  verifiedAt?: number;
}) {
  const { session, busy, error, notice } = network;
  const [pilotId, setPilotId] = useState(session?.pilotId || "nova");
  const [settings, setSettings] = useState(false);
  const participant=usePendingParticipant(),pinned=network.pendingPilotId||participant;
  return (
    <>
      {compact && session && <div className="connection-toolbar"><span className={"connection-state " + (online ? "" : "attention")}><i aria-hidden="true"/>{PILOTS.find(p => p.id === session.pilotId)?.name} · {online ? "연결됨" : "연결 확인 필요"}</span>{verifiedAt !== undefined && <span className="connection-freshness" title={"마지막 서버 확인 " + new Date(verifiedAt).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul" })}>서버 확인 {new Date(verifiedAt).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul" })}</span>}<button className="text-button" aria-expanded={settings} onClick={() => setSettings(!settings)}>참가자 설정</button><button className="text-button" disabled={busy} onClick={network.refresh}>상태 새로고침</button></div>}
      <section className="panel guild-connection" hidden={compact && !!session && !settings}>
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
          {(!compact || !session) && <button
            className="text-button"
            disabled={busy}
            onClick={network.refresh}
          >
            상태 새로고침
          </button>}
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
      {network.blockedByOtherCommand&&<p className="storage-notice" role="status">{network.otherPendingScreen==="empire"?"행성·개인 작전":"공동 작전"} 화면에 미확정 명령이 있어 새 명령을 보낼 수 없습니다. 해당 화면에서 같은 명령을 재전송한 뒤 진행하세요.</p>}
    </>
  );
}
