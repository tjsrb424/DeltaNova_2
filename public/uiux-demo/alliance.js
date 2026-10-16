// Independent memory-only UI study. No guild client, commands, storage or combat engine.
import { ships, operationInventory } from './operations.js';

const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const allianceRoles = freeze([
  {id:'recon',label:'정찰',color:'#91c6e5',headline:'안전한 진입로를 찾습니다',effect:'돌파의 경계 드론 1기를 줄입니다.',need:'정찰함 포함',required:'scout',counts:{striker:1,guardian:1,scout:1}},
  {id:'jam',label:'교란',color:'#b9a5e2',headline:'방어 신호에 틈을 만듭니다',effect:'돌파 첫 라운드의 적 사격을 차단합니다.',need:'전자전함 포함',required:'jammer',counts:{striker:1,guardian:1,jammer:1}},
  {id:'supply',label:'보급',color:'#e1c68d',headline:'다음 교전을 뒷받침합니다',effect:'기본 교전 승리 후 생존 함선을 회복합니다.',need:'회수함 · 화물 공간 3 이상',required:'salvage',counts:{striker:1,guardian:1,salvage:1}},
  {id:'breach',label:'돌파',color:'#8bdbd1',headline:'도약문으로 향하는 길을 엽니다',effect:'확보한 지원을 활용해 두 교전을 준비합니다.',need:'최대 6척 · 지휘 12',counts:{striker:2,guardian:1,siege:1}},
]);
const glyphs = {
  recon:'<circle cx="12" cy="12" r="3"/><path d="M5 5a10 10 0 0 1 14 14M2 12a10 10 0 0 0 10 10M12 2v3M2 12h3m7 0 7-7"/>',
  jam:'<path d="m9 7 6 5-6 5M4 5l-2 7 2 7M20 5l2 7-2 7M6 2l2 3M16 19l2 3"/>',
  supply:'<path d="m12 3 9 5v9l-9 5-9-5V8zM3 8l9 5 9-5M12 13v9M8 5l9 5"/>',
  breach:'<path d="m12 2 8 8-8 12L4 10zM12 7v10M8 11l4-4 4 4"/>',
  arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  check:'<path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="10"/>',
};
export const allianceIcon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyphs[name] || glyphs.breach}</svg>`;
const emblem = '<svg viewBox="0 0 100 100" fill="none" aria-hidden="true"><path d="m50 5 35 20v43L50 95 15 68V25z" stroke="currentColor" opacity=".45"/><path d="m50 15 26 16v32L50 83 24 63V31z" fill="currentColor" opacity=".06"/><path d="m50 24 21 39-21-9-21 9zM50 40v14M30 73h40" stroke="currentColor" stroke-width="1.5"/><circle cx="50" cy="68" r="2" fill="currentColor"/><path d="M9 43v18M91 43v18M44 5h12" stroke="currentColor"/></svg>';
const currentPlanet = state => state.planets.find(p => p.id === state.selected) || state.planets[0];
const roleOf = ui => allianceRoles.find(r => r.id === ui.role) || allianceRoles[3];
export const initialAlliance = () => ({role:'breach',scenario:'preparing',drafts:{},review:null});
export function allianceAssignments(ui) {
  if (ui.scenario === 'complete') return {recon:{pilot:'리라',status:'complete'},jam:{pilot:'오리온',status:'complete'},supply:{pilot:'베가',status:'complete'},breach:{pilot:'노바',status:'complete'}};
  if (ui.scenario === 'ready') return {recon:{pilot:'리라',status:'complete'},jam:{pilot:'오리온',status:'complete'},supply:{pilot:'베가',status:'complete'},breach:{pilot:null,status:'open'}};
  return {recon:{pilot:'리라',status:'complete'},jam:{pilot:null,status:'open'},supply:{pilot:'베가',status:'reserved'},breach:{pilot:null,status:'open'}};
}
export function allianceDraft(ui,p) { return ui.drafts[`${p.id}:${ui.role}`] || 'recommended'; }
export function allianceSummary(ui,p) {
  const role=roleOf(ui), draft=allianceDraft(ui,p), inventory=operationInventory(p);
  const requested=draft==='recommended'?role.counts:draft==='light'?{striker:2}:{};
  const counts=Object.fromEntries(ships.map(s=>[s.id,Math.min(requested[s.id]||0,inventory[s.id]||0)]));
  const total=Object.values(counts).reduce((n,x)=>n+x,0), command=ships.reduce((n,s)=>n+counts[s.id]*s.command,0),cargo=ships.reduce((n,s)=>n+counts[s.id]*s.cargo,0);
  const assignment=allianceAssignments(ui)[ui.role], issues=[];
  if (assignment.status!=='open') issues.push(assignment.status==='complete'?'이미 기여가 완료된 역할입니다. 다른 빈 역할을 살펴보세요.':'베가가 준비 중인 역할입니다. 빈 역할에서 내 준비안을 검토하세요.');
  if (!total) issues.push('편성된 함선이 없습니다. 함선이 있는 행성에서 역할 추천 편성을 선택하세요.');
  if (role.required && !counts[role.required]) issues.push(`${ships.find(s=>s.id===role.required).name} 함선이 필요합니다. 역할 추천 편성을 선택하세요.`);
  if (ui.role==='supply' && cargo<3) issues.push('화물 공간 3 이상이 필요합니다. 회수함을 포함하세요.');
  const supports=allianceRoles.slice(0,3).filter(r=>allianceAssignments(ui)[r.id].status==='complete').map(r=>r.id);
  return {role:ui.role,counts,total,command,cargo,supports,assignment,valid:issues.length===0,issues,draft};
}
export function transitionAlliance(ui,action,p) {
  if (action.type==='reset') return initialAlliance();
  if (action.type==='cancel-review') return ui.review?{...ui,review:null}:ui;
  if (action.type==='role' && allianceRoles.some(r=>r.id===action.id)) return action.id===ui.role?ui:{...ui,role:action.id,review:null};
  if (action.type==='scenario' && ['preparing','ready','complete'].includes(action.value)) return action.value===ui.scenario?ui:{...ui,scenario:action.value,review:null};
  if (!p || !['nova','vesper'].includes(p.id)) return ui;
  if (action.type==='formation' && ['recommended','light','none'].includes(action.value)) return {...ui,drafts:{...ui.drafts,[`${p.id}:${ui.role}`]:action.value},review:null};
  if (action.type==='review') {
    const summary=allianceSummary(ui,p);
    return summary.valid?{...ui,review:freeze({...summary,planet:p.id,planetName:p.name,scenario:ui.scenario})}:ui;
  }
  return ui;
}
const statusLabel = {complete:'기여 완료',reserved:'준비 중',open:'참가 가능'};
const tag = (text,tone='') => `<span class="al-tag ${tone}">${text}</span>`;

export function renderAllianceBoard(state,ui) {
  const assignments=allianceAssignments(ui);
  return `<div class="al-section-heading"><div><span class="ws-eyebrow">COOPERATIVE ROLES</span><h2 id="alliance-roles-title">함께 만드는 네 가지 역할</h2></div><span class="al-muted">역할을 선택해 기여와 준비 조건을 확인하세요.</span></div><div class="al-role-grid" aria-labelledby="alliance-roles-title">${allianceRoles.map((r,i)=>{const a=assignments[r.id];return `<button id="alliance-role-${r.id}" class="al-role-card${ui.role===r.id?' selected':''}" data-alliance-role="${r.id}" aria-pressed="${ui.role===r.id}" aria-controls="alliance-preparation" style="--role-color:${r.color}"><span class="al-role-top"><span class="al-role-icon">${allianceIcon(r.id)}</span>${tag(statusLabel[a.status],a.status)}</span><span class="al-role-name"><small>0${i+1}</small><strong>${r.label}</strong>${ui.role===r.id?'<span class="al-selected-label">선택됨</span>':''}</span><span class="al-role-effect">${r.effect}</span><span class="al-role-owner"><span>${a.pilot || '참가자 없음'}${a.pilot?' · 예시':''}</span>${allianceIcon('arrow')}</span></button>`;}).join('')}</div>`;
}
export function renderAlliancePreparation(state,ui) {
  const p=currentPlanet(state),r=roleOf(ui),s=allianceSummary(ui,p);
  return `<div class="al-prep-heading"><span class="al-role-icon" style="--role-color:${r.color}">${allianceIcon(r.id)}</span><div><span class="ws-eyebrow">내 기여 · 노바</span><h2 id="alliance-preparation-title" tabindex="-1">${r.label} 준비안</h2><p>${r.headline}</p></div>${tag(statusLabel[s.assignment.status],s.assignment.status)}</div><label class="al-field al-role-switch" for="alliance-role-select"><span>검토할 역할</span><select id="alliance-role-select">${allianceRoles.map(role=>`<option value="${role.id}"${ui.role===role.id?' selected':''}>${role.label} · ${statusLabel[allianceAssignments(ui)[role.id].status]}</option>`).join('')}</select></label><div class="al-prep-grid"><div class="al-prep-editor"><label class="al-field" for="alliance-formation"><span>내 편성 · ${escape(p.name)}</span><select id="alliance-formation" aria-describedby="alliance-formation-hint">${[['recommended','역할 추천 편성'],['light','타격함만 비교'],['none','편성 비우기']].map(([v,l])=>`<option value="${v}"${s.draft===v?' selected':''}>${l}</option>`).join('')}</select></label><p class="al-muted" id="alliance-formation-hint">보유 예시 함선에서 구성합니다. 역할 선택은 예약으로 처리되지 않습니다.</p><div class="al-formation-ships">${ships.filter(ship=>s.counts[ship.id]).map(ship=>`<span><i style="color:${ship.color}">${allianceIcon(ship.id==='scout'?'recon':ship.id==='jammer'?'jam':ship.id==='salvage'?'supply':'breach')}</i><strong>${ship.name}</strong><small>${ship.role}</small><b>×${s.counts[ship.id]}</b></span>`).join('') || '<p class="al-empty">이 행성에 편성할 함선이 없습니다.</p>'}</div><dl class="al-metrics"><div><dt>함선</dt><dd>${s.total}<small> / 6척</small></dd></div><div><dt>지휘</dt><dd>${s.command}<small> / 12</small></dd></div><div><dt>화물 공간</dt><dd>${s.cargo}</dd></div></dl><p class="al-muted">${r.need} · 화면 검토용 준비 기준</p></div><div class="al-prep-check"><h3>기여 전 확인</h3><p>${r.id==='breach'?'완료된 지원을 묶어 돌파를 준비합니다. 지원이 모두 없어도 독립 돌파를 검토할 수 있습니다.':r.effect+' 실제 효과는 기여 성공 후 적용됩니다.'}</p><div class="al-supports" aria-label="완료된 준비 지원">${allianceRoles.slice(0,3).map(role=>`<span class="${s.supports.includes(role.id)?'available':''}">${allianceIcon(role.id)}${role.label}<small>${s.supports.includes(role.id)?'확보':'미확보'}</small></span>`).join('')}</div>${s.issues.length?`<ul class="al-issues">${s.issues.map(issue=>`<li>${issue}</li>`).join('')}</ul>`:'<p class="al-ready">'+allianceIcon('check')+'예시 편성의 기본 준비 조건 충족</p>'}<button id="alliance-review" class="ws-button ws-button-primary" data-alliance-action="review" ${s.valid?'':'disabled aria-describedby="alliance-review-reason"'}>내 준비안 검토${allianceIcon('arrow')}</button><p id="alliance-review-reason" class="al-muted">${s.valid?'자원이나 함선을 사용하지 않는 로컬 검토입니다.':'위 안내를 확인한 뒤 다시 검토하세요.'}</p></div></div>`;
}
export function renderAllianceResult(state,ui) {
  const review=ui.review,p=currentPlanet(state);
  if (!review || review.planet!==p.id || review.role!==ui.role || review.scenario!==ui.scenario) return '';
  const r=roleOf(ui);
  return `<section class="al-result" aria-labelledby="alliance-result-title"><span class="al-result-icon">${allianceIcon('check')}</span><div><span class="ws-eyebrow">LOCAL REVIEW</span><h2 id="alliance-result-title" tabindex="-1">${r.label} 준비안을 검토했습니다</h2><p>${escape(review.planetName)} · ${review.total}척 · 지휘 ${review.command} · 화물 ${review.cargo}</p><p>완료 지원 ${review.supports.length}/3 · 예약과 기여는 아직 전송되지 않았습니다.</p><button class="ws-text-button" id="alliance-edit" data-alliance-action="edit">편성 다시 보기 ${allianceIcon('arrow')}</button></div></section>`;
}
export function renderAlliance(state,ui=initialAlliance()) {
  if (state.connection!=='ready') return `<div class="ws-loading" role="status"><strong>${state.connection==='offline'?'연결 오류 상태 예시':'예시 정보를 불러오는 중입니다'}</strong><p>동맹 정보를 표시할 수 없습니다. 시연 설정에서 다시 시도하세요.</p></div>`;
  const a=allianceAssignments(ui),supports=allianceRoles.slice(0,3).filter(r=>a[r.id].status==='complete').length;
  const complete=ui.scenario==='complete';
  return `<div class="al-lead"><p>같은 목표를 향해, 각자의 함대가 할 수 있는 일을 준비하세요.</p>${tag('고정 참가자 · 서버 미연결')}</div><section class="al-alliance ws-card" aria-labelledby="alliance-name"><span class="al-emblem">${emblem}</span><div class="al-identity"><span class="ws-eyebrow">ALLIANCE · AURORA ACCORD</span><h2 id="alliance-name">오로라 협약 <span>[AUR]</span></h2><p>서로의 항로를 열고, 함께 귀환한다.</p></div><dl class="al-alliance-stats"><div><dt>참가자</dt><dd>4<small>명 · 예시</small></dd></div><div><dt>공동 목표</dt><dd>1<small>개</small></dd></div><div><dt>내 신원</dt><dd class="al-pilot">노바<small>고정 예시</small></dd></div></dl></section><section class="al-operation ws-card" aria-labelledby="alliance-operation-title"><div class="al-hero"><img src="./art/alliance-gate-v1.webp" width="1536" height="1024" alt="" decoding="async"><div class="al-hero-copy"><span class="ws-eyebrow">JOINT OPERATION 01 · 리라 성역 L-09</span><h2 id="alliance-operation-title">도약문 재가동</h2><p>닫힌 도약문의 경계를 걷어 내고<br>새로운 공동 항로를 준비합니다.</p><div class="al-hero-actions">${tag(complete?'공동 목표 달성 · 결과 예시':'기여 준비 중 · 상황 예시',complete?'complete':'')}<button id="alliance-prepare-start" class="ws-button ws-button-primary" data-alliance-action="prepare">${complete?'역할 기여 살펴보기':'내 역할 준비'}${allianceIcon('arrow')}</button></div></div><span class="al-art-note">작전 분위기 예시</span></div><div class="al-operation-meta"><div><strong>${complete?'4개 역할 기여 완료':`준비 지원 ${supports}/3 확보`}</strong><p>${complete?'완료 기록과 공동 보상의 표시 방식을 확인하세요.':'정찰·교란·보급의 완료 기여가 돌파를 돕습니다.'}</p></div><label class="al-field" for="alliance-scenario"><span>상황 예시</span><select id="alliance-scenario">${[['preparing','기여 준비 중'],['ready','준비 지원 확보'],['complete','공동 목표 달성']].map(([v,l])=>`<option value="${v}"${ui.scenario===v?' selected':''}>${l}</option>`).join('')}</select></label></div></section><section id="alliance-board">${renderAllianceBoard(state,ui)}</section><section id="alliance-preparation" class="ws-card al-preparation" aria-labelledby="alliance-preparation-title">${renderAlliancePreparation(state,ui)}</section><div id="alliance-review-result">${renderAllianceResult(state,ui)}</div><div class="al-bottom-grid"><section class="ws-card al-members"><div class="al-section-heading"><h2>함께하는 참가자</h2><span class="al-muted">4명 · 고정 예시</span></div><ul>${[['노바','NV','나 · 준비안 검토'],['리라','LY','정찰 기여'],['오리온','OR',ui.scenario==='preparing'?'역할 검토 중':'교란 기여'],['베가','VG',ui.scenario==='preparing'?'보급 준비 중':'보급 기여']].map(([name,code,note])=>`<li><span class="al-avatar">${code}</span><strong>${name}</strong><span>${complete?name==='노바'?'돌파 기여':note:note}</span></li>`).join('')}</ul></section><section class="ws-card al-rewards"><span class="ws-eyebrow">SHARED CONTRIBUTION</span><h2>${complete?'공동 기여 기록':'기여가 이어지는 방식'}</h2><p>준비 기여를 완료하면 지원이 남습니다. 돌파에 실패해도 완료된 준비 기여는 유지됩니다.</p><dl><div><dt>역할 기여 성공</dt><dd>+10<small>공헌 · 예시</small></dd></div><div><dt>공동 목표 성공</dt><dd>+20<small>완료 기여자별 · 예시</small></dd></div></dl><p class="al-muted">${complete?'공동 목표 달성 상태의 예시 기록입니다. 실제 보상은 지급되지 않았습니다.':'보상 수치는 고정 예시이며, 검토만으로 지급되지 않습니다.'}</p></section></div><div class="al-command"><div><strong>실제 공동 작전은 연결되지 않았습니다</strong><p>예약·기여·출격·보상은 이 화면에서 전송하거나 변경하지 않습니다.</p></div><button id="alliance-send" class="ws-button" disabled aria-describedby="alliance-send-reason">기여 전송 · 미연결</button><span id="alliance-send-reason" class="sr-only">서버 미연결 데모로 실제 명령을 실행할 수 없습니다.</span></div>`;
}
