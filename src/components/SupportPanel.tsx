import { SUPPORTS } from "../game/content.ts";
import type { Approach, Support } from "../game/types.ts";
export default function SupportPanel({
  support,
  approach,
  onSupport,
  onApproach,
  canFlank,
  locked,
}: {
  support: Support;
  approach: Approach;
  onSupport: (s: Support) => void;
  onApproach: (a: Approach) => void;
  canFlank: boolean;
  locked: boolean;
}) {
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">03 / COORDINATION</span>
          <h2>작전 지원</h2>
        </div>
      </div>
      <p className="support-note">
        길드 역할을 시험하는 <b>로컬 지원 시뮬레이션</b>입니다.
      </p>
      <div className="support-list">
        {SUPPORTS.map((s, i) => (
          <button
            key={s.id}
            className={`support-card ${support === s.id ? "selected" : ""}`}
            disabled={locked}
            aria-label={s.name}
            aria-pressed={support === s.id}
            onClick={() => onSupport(s.id)}
          >
            <span className="support-icon" aria-hidden="true">
              {["◇", "⌖", "ϟ", "＋"][i]}
            </span>
            <span>
              <strong>{s.name}</strong>
              <small>{s.description}</small>
            </span>
            <span className="selection-dot" aria-hidden="true" />
          </button>
        ))}
      </div>
      <div className="route-heading">
        <h3>접근 경로</h3>
        <span>한 번의 선택, 다른 위험</span>
      </div>
      <div className="route-options">
        <button
          aria-label="직행 항로"
          aria-pressed={approach === "direct"}
          className={approach === "direct" ? "selected" : ""}
          disabled={locked}
          onClick={() => onApproach("direct")}
        >
          ↗ 직행<small>전체 적 · 기본 화물 유지</small>
        </button>
        <button
          aria-label="우회 항로"
          aria-pressed={approach === "flank"}
          className={approach === "flank" ? "selected" : ""}
          disabled={locked || !canFlank}
          onClick={() => onApproach("flank")}
        >
          ⌁ 우회<small>드론 −1 · 기본 화물 −2</small>
        </button>
      </div>
      {!canFlank && (
        <p className="footnote">우회에는 정찰함 또는 정찰 지원이 필요합니다.</p>
      )}
    </>
  );
}
