import { MISSIONS } from "../game/content.ts";
import type { CombatUnit } from "../game/types.ts";
export function enemySummary(enemies: CombatUnit[]): string {
  const counts = new Map<string, number>();
  for (const e of enemies) counts.set(e.name, (counts.get(e.name) || 0) + 1);
  return [...counts].map(([name, n]) => `${name} ${n}`).join(" · ");
}
export default function MissionPanel({
  selected,
  onChange,
  locked,
}: {
  selected: string;
  onChange: (id: string) => void;
  locked: boolean;
}) {
  return (
    <section className="panel mission-panel" aria-labelledby="mission-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">01 / OPERATION THEATER</span>
          <h2 id="mission-title">다음 항로를 선택하세요.</h2>
        </div>
        <span className="chip">3개 작전 신호</span>
      </div>
      <div className="sector-map" aria-label="작전 성계 지도">
        <svg
          viewBox="0 0 800 240"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <ellipse cx="400" cy="120" rx="315" ry="98" />
          <ellipse cx="400" cy="120" rx="200" ry="62" />
          <path d="M0 120H800M400 0V240M232 89 544 67 456 168Z" />
        </svg>
        <span className="map-label">NOVA FRONTIER / LOCAL SECTOR</span>
        <span className="map-coordinates">+042.8 / −018.6</span>
        {MISSIONS.map((m, i) => (
          <button
            key={m.id}
            className={`map-node ${m.id === selected ? "active" : ""}`}
            style={{ left: `${m.x}%`, top: `${m.y}%` }}
            disabled={locked}
            aria-label={`지도에서 ${m.title} 선택`}
            aria-pressed={m.id === selected}
            onClick={() => onChange(m.id)}
          >
            <i />
            <span>
              0{i + 1}
              <small>{m.sector}</small>
            </span>
          </button>
        ))}
      </div>
      <div className="mission-list">
        {MISSIONS.map((m, i) => (
          <button
            key={m.id}
            className={`mission-card ${m.id === selected ? "selected" : ""}`}
            aria-pressed={m.id === selected}
            disabled={locked}
            onClick={() => onChange(m.id)}
          >
            <span className="mission-index">0{i + 1}</span>
            <div className="mission-description">
              <span className="eyebrow">
                {m.tag} / {m.difficulty}
              </span>
              <h3>{m.title}</h3>
              <p>{enemySummary(m.enemies)}</p>
            </div>
            <div className="mission-yield">
              <b>{m.loot}</b>
              <span>기본 화물</span>
              <small>{m.maxRounds}라운드</small>
            </div>
            <span className="selection-dot" aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}
