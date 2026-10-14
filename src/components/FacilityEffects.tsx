import type { EmpireState, FacilityId, PlanetState } from "../empire/types.ts";
import { RESOURCE_IDS, RESOURCE_NAMES, TECHNOLOGY_NAMES, TECHNOLOGY_IDS } from "../empire/content.ts";
import { capacities, facilitySpace, power, productionRates } from "../empire/economy.ts";

export default function FacilityEffects({ state, planet, facility }: { state: EmpireState; planet: PlanetState; facility: FacilityId }) {
  if (planet.facilities[facility] >= 5) return <p className="action-description">현재 최대 시설 수준입니다.</p>;
  const next = { ...planet, facilities: { ...planet.facilities, [facility]: planet.facilities[facility] + 1 } };
  const currentRates = productionRates(planet, state.technologies), nextRates = productionRates(next, state.technologies);
  const currentCap = capacities(planet), nextCap = capacities(next), watts = power(planet), nextWatts = power(next);
  const space = facilitySpace({ ...planet, constructionJob: null }), nextSpace = facilitySpace({ ...next, constructionJob: null });
  const rows: [string, string][] = [];
  for (const key of RESOURCE_IDS) {
    if (currentRates[key] !== nextRates[key]) rows.push([RESOURCE_NAMES[key] + " 생산", `${currentRates[key]} → ${nextRates[key]}/분`]);
    if (currentCap[key] !== nextCap[key]) rows.push([RESOURCE_NAMES[key] + " 저장", `${currentCap[key]} → ${nextCap[key]}`]);
  }
  if (watts.supplied !== nextWatts.supplied) rows.push(["전력 공급", `${watts.supplied} → ${nextWatts.supplied}`]);
  if (facility === "shipyard") rows.push(["조선소 요건", `Lv.${planet.facilities.shipyard} → Lv.${next.facilities.shipyard}`]);
  if (facility === "laboratory") rows.push(["연구소 요건", `Lv.${Math.min(3, planet.facilities.laboratory)} → Lv.${Math.min(3, next.facilities.laboratory)}`]);
  rows.push(["여유 전력", `${watts.supplied - watts.demanded} → ${nextWatts.supplied - nextWatts.demanded}`]);
  rows.push(["시설 공간", `${space.used} → ${nextSpace.used} / ${space.capacity}`]);
  const newlySupported = TECHNOLOGY_IDS.filter(id => state.technologies[id] < 3 && state.technologies[id] + 1 > planet.facilities.laboratory && state.technologies[id] + 1 <= next.facilities.laboratory);
  return <div className="facility-effects"><table aria-label="증설 완료 효과"><caption>증설 완료 효과</caption><tbody>{rows.map(([name, value]) => <tr key={name}><th scope="row">{name}</th><td>{value}</td></tr>)}</tbody></table>
    {facility === "laboratory" && newlySupported.length > 0 && <p>{newlySupported.map(id => TECHNOLOGY_NAMES[id]).join(" · ")}의 다음 수준에 필요한 연구소 요건이 충족됩니다.</p>}
    {facility === "laboratory" && planet.facilities.laboratory >= 3 && <p>공통 연구는 최대 Lv.3입니다. 이번 증설로 추가 연구 수준이 열리지는 않습니다.</p>}
    {facility === "shipyard" && <p>함선별 기술 요건과 건조 비용은 함대 화면에서 확인하세요.</p>}
    <p>선택한 시설 1회 증설 기준 · 다른 진행 중 작업은 제외</p>
  </div>;
}
