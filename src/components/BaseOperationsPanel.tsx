import { useEffect, useState } from "react";
import { guildApi } from "../guild/api.ts";
import type { GuildApi } from "../guild/api.ts";
import { useGuildOperation } from "../guild/useGuildOperation.ts";
import {
  capacities,
  productionRates,
  projectBase,
  repairCost,
  sortieCost,
} from "../base/rules.ts";
import type { FacilityId } from "../base/types.ts";
import { MISSIONS, MODULES, ROSTER, SHIPS } from "../game/content.ts";
import { validateFleet } from "../game/fleet.ts";
import type { Approach, GameAction, Support } from "../game/types.ts";
import ParticipantLink from "./ParticipantLink.tsx";
import FleetPanel from "./FleetPanel.tsx";
import MissionPanel from "./MissionPanel.tsx";
import SupportPanel from "./SupportPanel.tsx";
import OperationPanel from "./OperationPanel.tsx";
import ShipGlyph from "./ShipGlyph.tsx";
import "../base/base.css";
const FACILITIES = [
  {
    id: "forge" as FacilityId,
    name: "합금 제조라인",
    tag: "FABRICATION",
    resource: "alloy" as const,
    description: "함선 정비와 기지 투자에 쓸 합금을 생산합니다.",
  },
  {
    id: "reactor" as FacilityId,
    name: "보급 합성소",
    tag: "LOGISTICS",
    resource: "supply" as const,
    description: "함대가 작전 지역에 진입할 보급품을 생산합니다.",
  },
];
export default function BaseOperationsPanel({
  api = guildApi,
}: {
  api?: GuildApi;
}) {
  const network = useGuildOperation(api),
    { data, session, busy, online } = network;
  const [fleet, setFleet] = useState<string[]>([]),
    [missionId, setMissionId] = useState("salvage"),
    [support, setSupport] = useState<Support>("none"),
    [approach, setApproach] = useState<Approach>("direct");
  const canFlank = support === "recon" || fleet.includes("scout-01");
  useEffect(() => {
    setFleet([]);
  }, [session?.pilotId]);
  useEffect(() => {
    if (!canFlank && approach === "flank") setApproach("direct");
  }, [canFlank, approach]);
  const pilot = data?.state.pilots.find((p) => p.id === session?.pilotId),
    base = pilot && projectBase(pilot.base, data!.serverTime),
    locked = busy || network.pending || network.blockedByOtherCommand || !session || !online;
  const cap = base && capacities(base),
    rates = base && productionRates(base),
    deployed = base?.career.operation?.phase === "checkpoint";
  const roster=pilot?.fleetContext?.roster||ROSTER;
  const damaged = base
      ? roster.filter((r) => base.wear[r.id] > 0).map((r) => r.id)
      : [],
    repair = base ? repairCost(base, damaged) : 0,
    cost = sortieCost(fleet.filter(id=>roster.some(r=>r.id===id)), support,pilot?.fleetContext);
  const errors = validateFleet(fleet, support, approach,pilot?.fleetContext);
  if (base && fleet.some((id) => base.wear[id] > 0))
    errors.push(
      "선택한 함선에 정비가 필요합니다. 정비하거나 정상 함선을 선택하세요.",
    );
  if (base && base.resources.supply < cost)
    errors.push(`보급품이 부족합니다. 출격에 ${cost}개가 필요합니다.`);
  const careerAction = (action: GameAction) =>
    network.send({ type: "career-action", action });
  return (
    <div className="base-screen reveal">
      <section className="base-hero">
        <img src="/art/orbital-base-v1.png" alt="델타 노바 궤도 기지" />
        <div />
        <article>
          <span className="eyebrow">NOVA STATION / OPERATIONS</span>
          <h2>다음 출격을 만드는 기지.</h2>
          <p>
            생산에 투자하고, 함대를 정비하고,
            <br />
            회수한 성과로 새로운 선택을 엽니다.
          </p>
          <span className="chip">혼자 성장 · 함께 작전</span>
        </article>
      </section>
      <ParticipantLink network={network} />
      {!base && (
        <section className="panel">
          <p className="muted">
            참가자를 연결하면 저장된 기지와 개인 작전을 불러옵니다. 기존
            지휘실에서는 편성 연습을 진행할 수 있습니다.
          </p>
        </section>
      )}
      {base && cap && rates && (
        <>
          <section className="base-resource-strip" aria-label="기지 자원">
            <div>
              <span>합금</span>
              <strong data-testid="base-alloy">
                {base.resources.alloy}
                <small>/ {cap.alloy}</small>
              </strong>
              <p>분당 +{rates.alloy}</p>
            </div>
            <div>
              <span>보급품</span>
              <strong data-testid="base-supply">
                {base.resources.supply}
                <small>/ {cap.supply}</small>
              </strong>
              <p>분당 +{rates.supply}</p>
            </div>
            <div>
              <span>연구 데이터</span>
              <strong data-testid="base-research">
                {base.career.profile.research}
              </strong>
              <p>개인 작전 최고 회수 성과</p>
            </div>
            <button
              className="secondary-button"
              disabled={locked}
              onClick={() => network.send({ type: "collect-production" })}
            >
              생산 수령
            </button>
          </section>
          <p className="footnote base-production-note">
            생산 예상 보유량 · 마지막 서버 확인 시각 기준. 수령이나 유효한
            명령에서 확정합니다. 저장 상한까지 분 단위로 생산하며, 접속 공백은
            최대 8시간 계산합니다.
          </p>
          <div className="base-investments">
            {FACILITIES.map((f) => {
              const level = base.facilities[f.id],
                alloy = 40 * level,
                supply = 10 * level;
              return (
                <section key={f.id} className="panel facility-panel">
                  <span className="eyebrow">{f.tag}</span>
                  <div className="facility-heading">
                    <h3>{f.name}</h3>
                    <b>
                      LV {level}
                      <small>/ 3</small>
                    </b>
                  </div>
                  <div
                    className={`facility-assembly ${f.id}`}
                    aria-hidden="true"
                  >
                    {[1, 2, 3].map((i) => (
                      <i key={i} className={i <= level ? "built" : ""}>
                        <span>0{i}</span>
                      </i>
                    ))}
                  </div>
                  <p className="muted">{f.description}</p>
                  <strong className="facility-rate">
                    분당 {rates[f.resource]} 생산
                  </strong>
                  <p className="footnote">
                    {level < 3
                      ? `증설 비용: 합금 ${alloy} · 보급품 ${supply} / 생산률·저장 상한 증가`
                      : "최대 레벨 시설"}
                  </p>
                  <button
                    className="secondary-button"
                    aria-label={`${f.name} 증설`}
                    disabled={
                      locked ||
                      level >= 3 ||
                      base.resources.alloy < alloy ||
                      base.resources.supply < supply
                    }
                    onClick={() =>
                      network.send({ type: "upgrade-facility", facility: f.id })
                    }
                  >
                    시설 증설 <span aria-hidden="true">↗</span>
                  </button>
                </section>
              );
            })}
            <section className="panel base-research-panel">
              <span className="eyebrow">RESEARCH / FITTING</span>
              <h3>역할을 바꾸는 연구</h3>
              <p className="footnote">
                활성 모듈은 개인·공동 출격에 적용됩니다. 해금에는 연구20과
                합금40이 필요합니다.
              </p>
              {MODULES.map((m) => {
                const known = base.career.profile.unlocked.includes(m.id),
                  active = base.career.profile.active === m.id;
                return (
                  <article key={m.id}>
                    <div>
                      <strong>{m.name}</strong>
                      <small>{m.description}</small>
                    </div>
                    <button
                      className="text-button"
                      aria-label={`${m.name} ${known ? "활성화" : "연구"}`}
                      disabled={
                        locked ||
                        Boolean(base.career.operation) ||
                        active ||
                        (!known &&
                          (base.career.profile.research < 20 ||
                            base.resources.alloy < 40))
                      }
                      onClick={() =>
                        careerAction({
                          type: known ? "activate-module" : "unlock-module",
                          module: m.id,
                        })
                      }
                    >
                      {active ? "적용 중" : known ? "활성화" : "연구"}
                    </button>
                  </article>
                );
              })}
              {base.career.profile.active !== "none" && (
                <button
                  className="text-button"
                  disabled={locked || Boolean(base.career.operation)}
                  onClick={() =>
                    careerAction({ type: "activate-module", module: "none" })
                  }
                >
                  기본 구성 적용
                </button>
              )}
              <p className="footnote">
                길드 기여 없이도 개인 작전만으로 모두 해금할 수 있습니다.
              </p>
            </section>
          </div>
          <section className="panel maintenance-panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">FLEET MAINTENANCE</span>
                <h2>귀환 함대를 다시 준비합니다.</h2>
              </div>
              <button
                className="secondary-button"
                disabled={
                  locked ||
                  deployed ||
                  !damaged.length ||
                  base.resources.alloy < repair
                }
                onClick={() =>
                  network.send({ type: "repair-fleet", fleetIds: damaged })
                }
              >
                손상 함선 일괄 정비
              </button>
            </div>
            <p className="footnote">
              손실 HP10당 합금1 · 함선별 올림. 현재 일괄 정비 비용 합금 {repair}
              .{" "}
              {deployed
                ? "함대 출격 중 · 귀환 후 정비 가능"
                : "무력화된 함선도 복구할 수 있습니다."}
            </p>
            <div className="maintenance-grid">
              {roster.map((r) => {
                const ship = SHIPS.find((s) => s.id === r.shipId)!,
                  wear = base.wear[r.id],
                  inFlight =
                    deployed &&
                    base.career.operation!.fleet.some((u) => u.id === r.id);
                return (
                  <article className={wear ? "needs-repair" : ""} key={r.id}>
                    <ShipGlyph role={ship.role} color={ship.color} small />
                    <div>
                      <strong>
                        {ship.name} {r.id.slice(-2)}
                      </strong>
                      <small>
                        {inFlight
                          ? "출격 중"
                          : wear
                            ? `정비 필요 · 손실 HP ${wear}`
                            : "출격 준비 완료"}
                      </small>
                    </div>
                    <button
                      className="text-button"
                      aria-label={`${ship.name} ${r.id.slice(-2)} 정비`}
                      disabled={
                        locked ||
                        deployed ||
                        !wear ||
                        base.resources.alloy < Math.ceil(wear / 10)
                      }
                      onClick={() =>
                        network.send({ type: "repair-fleet", fleetIds: [r.id] })
                      }
                    >
                      {wear ? `합금 ${Math.ceil(wear / 10)}` : "정상"}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
          {base.career.operation ? (
            <>
              <p className="base-settlement-note">
                {deployed
                  ? "출격 보급은 이미 지불했습니다. 추가 진입에는 보급을 다시 차감하지 않습니다."
                  : `이번 귀환 화물 ${base.career.operation.recovered}개 → 합금 ${base.career.operation.recovered * 4} 지급(저장 상한 적용). 귀환 피해는 위 정비 목록에 반영했습니다.`}
              </p>
              <OperationPanel
                operation={base.career.operation}
                locked={locked}
                maintenance
                onAction={careerAction}
                onBase={() => careerAction({ type: "dismiss" })}
              />
            </>
          ) : (
            <div className="base-sortie-layout">
              <div>
                <MissionPanel
                  selected={missionId}
                  onChange={setMissionId}
                  locked={locked}
                />
                <FleetPanel
                  selected={fleet}
                  onChange={setFleet}
                  locked={locked}
                  roster={roster}
                />
              </div>
              <aside className="panel">
                <span className="eyebrow">PERSONAL OPERATION / DEPARTURE</span>
                <h2>혼자서도 다음 항로로.</h2>
                <p className="muted">
                  목표를 확보하고 돌아오면 화물당 합금4와 최고 성과의 증가분만큼
                  연구 데이터를 얻습니다.
                </p>
                <SupportPanel
                  support={support}
                  approach={approach}
                  onSupport={setSupport}
                  onApproach={setApproach}
                  canFlank={canFlank}
                  locked={locked}
                />
                <div className="base-sortie-cost">
                  <span>출격 보급품</span>
                  <strong>{cost}</strong>
                </div>
                <p className="footnote">
                  {errors[0] ||
                    `${fleet.length}척 준비 · ${MISSIONS.find((m) => m.id === missionId)!.title}`}
                </p>
                <button
                  className="primary-button"
                  disabled={locked || errors.length > 0}
                  aria-label="개인 작전 출격"
                  onClick={() =>
                    careerAction({
                      type: "launch",
                      missionId,
                      fleetIds: fleet,
                      support,
                      approach,
                    })
                  }
                >
                  개인 작전 출격 ↗
                </button>
              </aside>
            </div>
          )}
        </>
      )}
    </div>
  );
}
