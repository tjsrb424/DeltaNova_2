import { MODULES } from "../game/content.ts";
import type { GameAction, Profile } from "../game/types.ts";
export default function BasePanel({
  profile,
  onAction,
  locked,
}: {
  profile: Profile;
  onAction: (action: GameAction) => void;
  locked: boolean;
}) {
  return (
    <section className="panel base-panel" aria-labelledby="base-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">04 / ORBITAL ENGINEERING</span>
          <h2 id="base-title">다음 작전을 바꾸는 연구.</h2>
        </div>
        <span className="research-badge">◇ {profile.research} DATA</span>
      </div>
      <p className="muted">
        작전 최고 성과를 갱신해 얻은 연구 데이터로 기지를 강화하세요. 활성
        모듈은 한 번에 하나이며 다음 출격부터 적용됩니다.
      </p>
      <div className="module-grid">
        {MODULES.map((m) => {
          const unlocked = profile.unlocked.includes(m.id),
            active = profile.active === m.id;
          return (
            <article
              className={`module-card ${active ? "selected" : ""}`}
              key={m.id}
            >
              <span className="module-icon" aria-hidden="true">
                {m.id === "cargo" ? "▱" : "⬡"}
              </span>
              <span className="eyebrow">
                {m.id === "cargo" ? "CARGO SYSTEM" : "HULL SYSTEM"}
              </span>
              <h3>{m.name}</h3>
              <p>{m.description}</p>
              <button
                className={active ? "secondary-button" : "primary-button"}
                disabled={
                  locked || active || (!unlocked && profile.research < m.cost)
                }
                onClick={() =>
                  onAction({
                    type: unlocked ? "activate-module" : "unlock-module",
                    module: m.id,
                  })
                }
              >
                {active
                  ? "활성화됨"
                  : unlocked
                    ? "무료 활성화"
                    : `연구 ${m.cost}으로 해금`}
              </button>
            </article>
          );
        })}
      </div>
      {profile.active !== "none" && (
        <button
          className="text-button"
          disabled={locked}
          onClick={() => onAction({ type: "activate-module", module: "none" })}
        >
          기본 구성으로 전환
        </button>
      )}
      <p className="footnote">
        기지 특화·생산·물류는 다음 개발 단계입니다. 현재는 작전에 영향을 주는
        모듈 선택을 시험합니다.
      </p>
    </section>
  );
}
