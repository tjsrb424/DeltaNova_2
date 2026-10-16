// Presentation only. All counts and phases come from existing demo snapshots.
import {icon,shipIcon} from './icons.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const facilities=['alloyMine','crystalMine','fuelRefinery','powerPlant','shipyard','laboratory'];
export const facilityArt=key=>facilities.includes(key)?`<span class="dn-facility-art dn-facility-${key}" data-facility-art="${key}" aria-hidden="true"></span>`:'';
export const sigil=(name,tone='cyan')=>`<span class="dn-sigil dn-sigil-${tone}" aria-hidden="true">${icon(name)}</span>`;
export function leadArt(view,state,key='shipyard'){
  if(state.connection!=='ready')return '';
  const names={construction:'build',research:'research',fleet:'fleet',defense:'defense',evasion:'compass',reports:'reports',more:'more',diplomacy:'diplomacy',rankings:'rankings'};
  if(!names[view])return '';
  const localThreat=state.threat?.planetId===state.selected;
  const facility=view==='construction'?key:view==='research'?'laboratory':view==='fleet'?'shipyard':null;
  return `<div class="dn-lead-art dn-lead-${view}${localThreat&&['defense','evasion'].includes(view)?' dn-lead-threat':''}" aria-hidden="true"><span class="dn-lead-grid"></span><span class="dn-lead-orbit"></span>${facility?facilityArt(facility):sigil(names[view],localThreat&&['defense','evasion'].includes(view)?'danger':'cyan')}<span class="dn-lead-scan"></span></div>`;
}
const phaseLabels={waiting:'출발 대기',outbound:'목표로 이동 중',arrived:'목표 도착',deployed:'현지 주둔 중',returning:'귀환 중',complete:'귀환 완료'};
export function neonFlight(order,ships){
  const selected=ships.filter(ship=>order.counts[ship.id]>0);
  if(!selected.length)return '';
  const slots=[[80,50],[50,24],[50,76],[18,8],[18,50],[18,92]];
  const units=selected.flatMap(ship=>Array.from({length:order.counts[ship.id]},()=>ship));
  const formation=units.map((ship,i)=>{const [x,y]=slots[i];return `<span class="dn-flight-unit" data-neon-unit="${ship.id}" style="--unit-x:${x}%;--unit-y:${y}%;--dn-role:${ship.color}">${shipIcon(ship.id)}<i class="dn-unit-thrust"></i></span>`;}).join('');
  return `<div class="dn-neon-flight" data-neon-phase="${order.phase}"><div class="sc-flight-scene" data-phase="${order.phase}" aria-hidden="true"><div class="sc-flight-stars"></div><div class="dn-flight-grid"></div><svg class="dn-trajectory" viewBox="0 0 600 100" preserveAspectRatio="none"><path class="dn-path-shadow" d="M18 64C180 4 390 96 580 40"/><path class="dn-path-signal" d="M18 64C180 4 390 96 580 40"/><circle cx="18" cy="64" r="4"/><circle cx="580" cy="40" r="5"/></svg><span class="dn-departure-port">${icon('station')}</span><div class="dn-flight-formation">${formation}</div><span class="sc-flight-destination"></span><span class="dn-arrival-reticle"><i></i>${icon('compass')}</span><span class="dn-flight-caption">LOCAL TRANSIT · ${phaseLabels[order.phase]}</span></div><div class="dn-neon-manifest"><span>시연 편성</span><ul>${selected.map(ship=>`<li data-neon-ship="${ship.id}" data-neon-count="${order.counts[ship.id]}" style="--dn-role:${ship.color}">${shipIcon(ship.id)}<span>${escape(ship.name)}</span><b>×${order.counts[ship.id]}</b></li>`).join('')}</ul></div></div>`;
}
