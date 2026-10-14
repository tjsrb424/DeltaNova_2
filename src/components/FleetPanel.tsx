import { ROSTER, SHIPS } from "../game/content.ts";
import ShipGlyph from "./ShipGlyph.tsx";
export const STARTER_FLEET = [
  "striker-01",
  "striker-02",
  "guardian-01",
  "support-01",
  "salvage-01",
  "scout-01",
];
export default function FleetPanel({
  selected: selection,
  onChange,
  locked,
  recommended = STARTER_FLEET,
  roster = ROSTER,
  unavailable,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  locked: boolean;
  recommended?: string[];
  roster?: readonly {id:string;shipId:string}[];
  unavailable?: Readonly<Record<string,string>>;
}) {
  const selected=selection.filter(id=>roster.some(r=>r.id===id));
  const command = selected.reduce(
    (sum, id) =>
      sum +
      SHIPS.find((s) => s.id === roster.find((r) => r.id === id)?.shipId)!
        .command,
    0,
  );
  return (
    <section className="panel fleet-panel" aria-labelledby="fleet-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">02 / FLEET ASSEMBLY</span>
          <h2 id="fleet-title">임무에 맞는 함대를.</h2>
        </div>
        <button
          className="text-button"
          disabled={locked}
          onClick={() => onChange(recommended.filter(id=>roster.some(r=>r.id===id)&&!unavailable?.[id]))}
        >
          추천 편성 적용 <span aria-hidden="true">↗</span>
        </button>
      </div>
      <div className="fleet-capacity">
        <span>
          출격 함선 <strong>{selected.length} / 6</strong>
        </span>
        <span data-testid="command-usage">
          지휘 용량{" "}
          <strong className={command > 12 ? "danger" : ""}>
            {command} / 12
          </strong>
        </span>
      </div>
      <div className="command-meter" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <i key={i} className={i < command ? "filled" : ""} />
        ))}
      </div>
      <div className="fleet-slots" aria-label="편성 슬롯">
        {Array.from({ length: 6 }, (_, i) => {
          const entry = roster.find((r) => r.id === selected[i]),
            ship = SHIPS.find((s) => s.id === entry?.shipId);
          return (
            <div key={i} className={ship ? "occupied" : ""}>
              {ship ? (
                <>
                  <ShipGlyph role={ship.role} color={ship.color} small />
                  <span>{ship.name}</span>
                </>
              ) : (
                <span className="empty-slot">
                  0{i + 1}
                  <small>EMPTY</small>
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="ship-catalog">
        {roster.map((r,index) => {
          const ship = SHIPS.find((s) => s.id === r.shipId)!,
            chosen = selected.includes(r.id);
          const full =
            !chosen && (selected.length >= 6 || command + ship.command > 12);
          const ordinal=String(roster.slice(0,index+1).filter(s=>s.shipId===r.shipId).length).padStart(2,"0");
          return (
            <button
              key={r.id}
              className={`ship-card ${chosen ? "selected" : ""}`}
              aria-label={`${ship.name} ${ordinal} 편성`}
              aria-pressed={chosen}
              disabled={locked || full || !!unavailable?.[r.id]}
              onClick={() =>
                onChange(
                  chosen
                    ? selected.filter((id) => id !== r.id)
                    : [...selected, r.id],
                )
              }
            >
              <div className="ship-card-top">
                <span>{ship.label}</span>
                <span className="check-mark" aria-hidden="true">
                  {chosen ? "✓" : "+"}
                </span>
              </div>
              <ShipGlyph role={ship.role} color={ship.color} />
              <div className="ship-name">
                <strong>
                  {ship.name} <small>{ordinal}</small>
                </strong>
                <span>지휘 {ship.command}</span>
              </div>
              <p>{ship.description}</p>
              {unavailable?.[r.id]&&<p className="capacity-hint">{unavailable[r.id]}</p>}
              <div className="ship-stats">
                <span>
                  HP <b>{ship.hp}</b>
                </span>
                <span>
                  공격 <b>{ship.attack}</b>
                </span>
                <span>
                  화물 <b>{ship.cargo}</b>
                </span>
              </div>
              {full && (
                <span className="capacity-hint">
                  {selected.length >= 6
                    ? "편성 슬롯 가득 참"
                    : `지휘 용량 ${command + ship.command - 12} 부족`}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="footnote">
        8개 함종 · 9척 보유. 함선 도식은 역할을 구별하기 위한 전술 표시입니다.
      </p>
    </section>
  );
}
