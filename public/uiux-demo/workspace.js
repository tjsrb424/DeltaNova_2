import {icon as uiIcon} from './icons.js';
import {facilityArt,leadArt} from './visuals.js';
// Read-only workspaces for the independent UI study. No commands or network access.
import { facilityCards, facilityPreview } from './presentation.js';
import { initialGalaxy, renderGalaxy } from './galaxy.js';
import { initialOperations, renderPractice } from './operations.js';
import { initialAlliance } from './alliance.js';
import { initialStrategy,strategySummary } from './strategy-model.js';
import { renderStrategyTargets,renderStrategyCommand,renderStrategyAlliance,renderStrategyOrders,renderStrategyDefense } from './strategy.js';

export const workspaceTitles = Object.freeze({
  home: '행성 관제', construction: '건설 관리', research: '연구 관리', fleet: '함대 현황',
  defense: '방어 현황', evasion: '함대 회피 검토', career: '출격 목표', galaxy: '은하 · 정찰',
  guild: '동맹 · 공동 목표', reports: '활동 보고서', practice: '편성 실험실', more: '제국 메뉴', command:'함대 명령',
  rankings: '랭킹', diplomacy: '외교 · 메시지',
});

const resources = { alloy: '합금', crystal: '결정', fuel: '연료' };
const icon=uiIcon;
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const amount = value => Number(value).toLocaleString('ko-KR');
const next = (view, label, primary = false, facility = '') => `<button class="ws-button${primary ? ' ws-button-primary' : ''}" data-view="${view}"${facility ? ` data-view-facility="${facility}"` : ''}>${label}${icon('arrow')}</button>`;
const panel = (key, label) => `<button class="ws-text-button" data-panel="${key}">${label}${icon('arrow')}</button>`;
const stat = (label, value, note = '') => `<div class="ws-stat"><dt>${label}</dt><dd>${value}</dd>${note ? `<small>${note}</small>` : ''}</div>`;
const tag = (label, tone = '') => `<span class="ws-tag${tone ? ` ws-tag-${tone}` : ''}">${label}</span>`;
const actions = html => `<div class="ws-actions">${html}</div>`;
const command = (label, key, reason = '화면 검토용 데모로 실제 명령은 연결되어 있지 않습니다.') => `<div class="ws-command"><button class="ws-button" disabled aria-describedby="ws-reason-${key}">${label}</button><p id="ws-reason-${key}">${reason}</p></div>`;
const cardHead = (title, note = '') => `<div class="ws-card-heading"><h2>${title}</h2>${note ? `<span>${note}</span>` : ''}</div>`;
const empty = (title, description, symbol = 'reports') => `<div class="ws-empty"><span class="ws-empty-icon">${icon(symbol)}</span><h3>${title}</h3><p>${description}</p></div>`;
const loading = state => `<div class="ws-loading" role="status"><span class="ws-loading-dot"></span><strong>${state?.connection === 'offline' ? '연결을 확인할 수 없습니다' : '예시 정보를 불러오는 중입니다'}</strong><p>${state?.connection === 'offline' ? '상단 연결 상태에서 다시 시도한 뒤 확인하세요.' : '준비되면 이곳에 현재 선택한 행성의 정보를 표시합니다.'}</p></div>`;
const lead = (p, description, view='', state={connection:'ready'}, action='') => `<div class="ws-lead${view?' dn-art-lead':''}">${action}<p>${description}</p>${tag(`${escape(p.name)} · ${escape(p.kind)}`)}${leadArt(view,state,'alloyMine')}</div>`;
const hasJobs = (state, p) => !state.empty && p.id === 'nova';

function job(title, type, time, percent, symbol) {
  return `<div class="ws-job"><span class="ws-job-icon">${icon(symbol)}</span><div class="ws-job-copy"><strong>${title}</strong><span>${type} · 고정 예시</span></div><time>${time}</time><div class="ws-progress" role="progressbar" aria-label="${type} 진행 예시" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><i style="width:${percent}%"></i></div><small>${percent}%</small></div>`;
}

export function renderFacilityDetail(planet, key, { compact = false, loading: unavailable = false, queue = '' } = {}) {
  if (unavailable) return loading({ connection: 'loading' });
  const f = facilityPreview(planet, key);
  return `<div class="ws-facility-detail${compact ? ' ws-compact' : ''}"><div class="ws-detail-title"><span class="ws-facility-symbol">${icon(f.icon)}</span><div><span class="ws-eyebrow">증설 비교 · 예시 값</span><div class="ws-name-level"><h3>${escape(f.name)}</h3>${tag(`Lv.${f.level} → Lv.${f.next}`)}</div></div></div><div class="ws-primary-action">${command('건설 실행 · 미연결', `build-${compact ? 'compact' : 'full'}-${f.key}`)}</div>${queue}<div class="dn-facility-display">${facilityArt(f.key)}</div>
    <div class="ws-effect"><span>${escape(f.effect)}</span><div><div><small>현재 · Lv.${f.level}</small><strong>${escape(f.before)}${f.unit ? `<em>${escape(f.unit)}</em>` : ''}</strong></div><span class="ws-effect-arrow" aria-hidden="true">→</span><div><small>증설 후 · Lv.${f.next}</small><strong>${escape(f.after)}${f.unit ? `<em>${escape(f.unit)}</em>` : ''}</strong></div></div></div>
    <div class="ws-section-heading"><h4>자원 비교</h4>${tag(f.affordable ? '예시 자원 충분' : '예시 자원 부족', f.affordable ? 'success' : 'warning')}</div><div class="ws-table-wrap"><table class="ws-cost-table"><caption class="sr-only">증설 비용과 현재 보유량, 증설 후 예시 잔량</caption><thead><tr><th scope="col">자원</th><th scope="col">현재 보유</th><th scope="col">증설 비용</th><th scope="col">증설 후</th></tr></thead><tbody>${Object.entries(resources).map(([resource, label]) => `<tr><th scope="row"><span>${icon(resource)}${label}</span></th><td>${amount(planet.resources[resource])}</td><td>${amount(f.cost[resource])}</td><td class="${planet.resources[resource] < f.cost[resource] ? 'ws-shortfall' : ''}">${amount(planet.resources[resource] - f.cost[resource])}</td></tr>`).join('')}</tbody></table></div>
    <dl class="ws-duration"><dt>${icon('clock')}예상 소요 · 예시</dt><dd>${escape(f.cost.time)}</dd></dl><div class="ws-prerequisite"><h4>조건 미리보기 · 예시</h4><p>${escape(f.condition)}</p><small>표시된 조건과 비용은 화면 비교용 예시입니다.</small></div><p class="ws-muted">${escape(f.note)}</p></div>`;
}

export function renderConstructionQueue(state,p){
  const unavailable=state.connection!=='ready';
  const queue = unavailable ? loading(state) : hasJobs(state, p) ? job(`연료 합성소 Lv.${facilityPreview(p, 'fuelRefinery').next}`, '건설', '01:24', 62, 'build') : empty('진행 중인 건설 없음', '선택한 시설의 다음 증설 효과와 비용을 비교하세요.', 'build');
  return `<section class="ws-card ws-queue">${cardHead('건설 대기열', '현지 작업')}${queue}</section>`;
}

function construction(state, p, key) {
  const unavailable = state.connection !== 'ready';
  const selected = facilityCards[key] ? key : 'fuelRefinery';
  const queue = renderConstructionQueue(state,p);
  return `<div class="ws-construction-grid"><section class="ws-card ws-facility-list">${cardHead('행성 시설', '6종')}<label class="ws-mobile-picker" for="workspace-facility-select">비교할 시설<select id="workspace-facility-select">${Object.entries(facilityCards).map(([facility, data]) => `<option value="${facility}"${facility === selected ? ' selected' : ''}>${data.name} · ${unavailable ? '—' : `Lv.${p.facilities[facility]}`}</option>`).join('')}</select></label><div class="ws-facility-picker" aria-label="비교할 시설">${Object.entries(facilityCards).map(([facility, data]) => `<button data-workspace-facility="${facility}" aria-pressed="${facility === selected}"><span class="ws-picker-icon">${facilityArt(facility)}</span><span><strong>${data.name}</strong><small>${unavailable ? '정보 확인 중' : p.facilities[facility] ? '다음 증설 비교' : '신규 설치 비교'}</small></span><span class="ws-picker-level">${unavailable ? '—' : `Lv.${p.facilities[facility]}`}</span>${icon('arrow')}</button>`).join('')}</div>${panel('resources', '전체 자원과 생산 보기')}</section><section id="workspace-facility-detail" class="ws-card ws-detail-card" aria-label="선택 시설 증설 비교">${unavailable && state.connection === 'offline' ? loading(state) : renderFacilityDetail(p, selected, { loading: unavailable, queue })}</section></div>${lead(p, '시설을 선택해 전후 변화와 비용·조건을 비교하고, 현재 건설을 확인하세요.', 'construction', state)}`;
}

function research(state, p) {
  if (state.connection !== 'ready') return loading(state);
  return `${lead(p, '진행 중인 공통 연구와 다음 연구소 투자를 확인하세요.', 'research', state,next('construction','연구소와 시설 비교',true,'laboratory'))}<div class="ws-two-columns ws-research-grid"><section class="ws-card ws-research-progress">${cardHead('제국 공통 연구', state.empty ? '대기' : '진행 중 · 예시')}<div class="ws-primary-action">${command('연구 시작 · 미연결','research')}</div>${state.empty ? empty('진행 중인 연구 없음', '현지 연구소의 설치·증설 계획을 먼저 살펴보세요.', 'research') : job('산업 기술 Lv.1', '공통 연구', '03:10', 28, 'research')}<dl class="ws-research-scope"><div><dt>적용 범위</dt><dd>제국 공통</dd></div><div><dt>연구 행성</dt><dd>${state.empty ? '—' : '노바 프라임'}</dd></div></dl><p class="ws-card-note">행성을 바꾸어도 공통 연구의 진행 상태는 유지됩니다.</p></section><section class="ws-card ws-research-foundation">${cardHead('현지 연구소', escape(p.name))}${actions(panel('resources','자원 확인'))}${investment(p,'laboratory')}</section></div>`;
}

function investment(p,key) {
  const f=facilityPreview(p,key);
  return `<div class="ws-investment"><div class="dn-facility-display">${facilityArt(key)}</div><div class="ws-investment-title"><span class="ws-facility-symbol">${icon(f.icon)}</span><div><span class="ws-eyebrow">${f.level ? '다음 증설' : '신규 설치'} · 예시</span><strong>${escape(f.name)}</strong></div>${tag(`Lv.${f.level} → Lv.${f.next}`)}</div><p class="ws-investment-effect"><span>${escape(f.effect)}</span><strong>${escape(f.before)} <i aria-hidden="true">→</i> ${escape(f.after)}</strong></p><div class="ws-section-heading"><h3>${f.level ? '증설' : '설치'} 비용 · 예시</h3>${tag(f.affordable?'자원 충족':'자원 부족',f.affordable?'success':'warning')}</div><dl class="ws-investment-cost">${Object.entries(resources).map(([key,label])=>`<div><dt>${icon(key)}${label}</dt><dd>${f.cost[key]}</dd></div>`).join('')}</dl><p class="ws-investment-time">${icon('clock')} 소요 ${escape(f.cost.time)} <span>· 조건은 건설에서 비교</span></p></div>`;
}

function fleet(state, p, strategyUI=initialStrategy()) {
  if (state.connection !== 'ready') return loading(state);
  const departure = state.departure?.planetId === p.id;
  const approach = state.threat?.planetId === p.id;
  const route = (incoming=false) => `<div class="ws-flight ${incoming?'ws-flight-incoming':'ws-flight-outgoing'}"><span class="ws-flight-icon">${icon(incoming?'warning':'fleet')}</span><div><strong ${incoming?'data-threat-phase':'data-outgoing-phase'}>${incoming?'적 함대 접근':'외부 항로로 출항 중'}</strong><span>${incoming?'외부 항로 → '+escape(p.name):escape(p.name)+' → 외부 항로'}</span></div><div class="ws-flight-time"><small ${incoming?'data-incoming-caption':'data-outgoing-caption'}>${incoming?'외곽 도달까지':'외부 항로까지'}</small><time data-route-eta="${incoming?'incoming':'outgoing'}">${incoming?'02:40':'04:20'}</time></div></div>`;
  return `${lead(p, '현지 함대와 주변 항로를 구분해 확인하세요.', 'fleet', state,next('career','함대 보내기',true))}${renderStrategyOrders(state,strategyUI)}<section class="ws-card ws-fleet-overview">${cardHead('현지 함대', '예시 스냅샷')}<div class="ws-fleet-summary"><span class="ws-fleet-sigil" aria-hidden="true">${icon('fleet')}</span><dl class="ws-stat-grid ws-stat-grid-three">${stat('보유 함선', `${p.ships}<small>척</small>`, escape(p.name))}${stat('시연 가용 함선', `${Object.values(strategySummary(strategyUI,state).available).reduce((n,count)=>n+count,0)}<small>척</small>`, '보낸 시연 함대 제외')}${stat('궤도 조선소', `Lv.${p.facilities.shipyard}`, p.facilities.shipyard?'현지 시설':'미설치')}</dl></div>${!p.ships?'<p class="ws-card-note">아직 배치된 함선이 없습니다. 조선소의 설치 계획을 확인하세요.</p>':''}</section><div class="ws-two-columns ws-fleet-grid"><section class="ws-card ws-movement-card">${cardHead('주변 항로', '위치·시간 시연')}${departure?route():''}${approach?route(true):''}${!departure&&!approach?'<div class="ws-flight-empty">'+icon('fleet')+'<div><h3>표시할 항로 없음</h3><p>출항 시연으로 항로와 남은 시간을 살펴보세요.</p></div></div>':''}${state.threat&&!approach?'<p class="ws-other-threat">노바 프라임에 접근 예시가 있습니다. 상단 위협에서 확인하세요.</p>':''}${actions(`<button class="ws-button" id="fleet-departure-preview" aria-pressed="${departure}">${departure?'시연 경로 지우기':'출항 시연'}${icon('arrow')}</button>`+next('home','행성에서 항로 보기')+(approach?next('evasion','함대 회피 검토'):''))}<p class="ws-card-note">시연 항로는 보유 함선·출격 가능 수량을 바꾸지 않습니다.</p></section><section class="ws-card ws-fleet-foundation">${cardHead('다음 함대 준비')}${actions(next('construction','조선소와 시설 비교',true,'shipyard')+next('practice','편성 실험실'))}${investment(p,'shipyard')}<div class="ws-operation-link">${next('career','함대 보내기')}</div></section></div>${command('함대 명령 · 미연결','fleet')}`;
}

function incoming(state) {
  if (!state.threat) return `${empty('접근 중인 위협 없음', '행성 관제의 상태 시연에서 적 함대 접근을 확인할 수 있습니다.', 'defense')}${actions(next('home', '행성 관제로 이동'))}`;
  return `<div class="ws-threat-header">${icon('warning')}<div><span class="ws-eyebrow">위협 대상 · 시연 이벤트</span><h3 data-threat-target>노바 프라임</h3></div>${tag('접근 예시', 'danger')}</div><dl class="ws-threat-facts"><div><dt>상태</dt><dd data-threat-phase>적 함대 접근</dd></div><div><dt data-incoming-caption>외곽 도달까지</dt><dd><time data-route-eta="incoming">02:40</time></dd></div><div><dt>접근 종점</dt><dd>대기권 밖 대기점</dd></div></dl><p class="ws-card-note">실제 공격이나 방어 결과를 나타내지 않는 항로 시연입니다.</p>${actions(next('evasion', '함대 회피 검토', true) + panel('threat', '접근 상세'))}`;
}

function defense(state, p) {
  if (state.connection !== 'ready') return loading(state);
  return `${lead(p, '현지 방어 자산과 외부 접근 상황을 구분해 확인하세요.', 'defense', state)}<div class="ws-two-columns"><section class="ws-card">${cardHead('선택 행성의 방어')}<dl class="ws-stat-grid">${stat('선택 행성', escape(p.name))}${stat('현지 방어', `<span data-defense-count>${p.defenses}</span><small>기</small>`, '예시 스냅샷')}</dl><div class="ws-inline-note">${p.defenses ? '선택한 행성에 배치된 방어 자산의 예시 수량입니다.' : '이 행성에는 배치된 방어 자산이 없습니다.'}</div>${actions(next('fleet', '현지 함대 확인') + panel('planet', '행성 시설 요약'))}</section><section class="ws-card${state.threat ? ' ws-card-danger' : ''}">${cardHead('외부 접근 상황')}${incoming(state)}</section></div><section class="ws-card ws-next-card">${icon('defense')}<div><h2>대응을 검토하기 전에</h2><p>위협 대상과 현재 선택한 행성이 같은지, 대응할 함대가 어느 행성에 있는지 확인하세요.</p></div>${next('fleet', '함대 확인')}</section>`;
}

function evasion(state, p) {
  if (state.connection !== 'ready') return loading(state);
  const target = state.planets.find(planet => planet.id === 'nova');
  return `${lead(p, '접근 대상과 이동 준비 정보를 순서대로 검토하세요.', 'evasion', state)}<div class="ws-two-columns"><section class="ws-card${state.threat ? ' ws-card-danger' : ''}">${cardHead('접근 상황')}${state.threat ? `<div class="ws-threat-header">${icon('warning')}<div><span class="ws-eyebrow">위협 대상 · 시연</span><h3 data-threat-target>노바 프라임</h3></div></div><dl class="ws-threat-facts"><div><dt data-incoming-caption>외곽 도달까지</dt><dd><time data-route-eta="incoming">02:40</time></dd></div><div><dt>대상 행성 함대</dt><dd>${target?.ships ?? '—'}척 · 예시</dd></div><div><dt>현재 선택 행성</dt><dd>${escape(p.name)}</dd></div></dl>` : empty('접근 중인 위협 없음', '행성 관제의 위협 시연에서 회피 검토 흐름을 확인할 수 있습니다.', 'defense')}${actions(next('defense', '방어 현황') + next('home', '행성 관제'))}</section><section class="ws-card">${cardHead('이동 전 검토')}<ol class="ws-steps"><li><span>01</span><div><strong>대상 함대 확인</strong><p>선택 행성과 위협 대상 행성의 함대를 구분합니다.</p></div></li><li><span>02</span><div><strong>목적지와 소요량 검토</strong><p>목적지 · 이동 시간 · 연료 비용은 미연결 상태입니다.</p></div></li><li><span>03</span><div><strong>명령 전송 전 확인</strong><p>현재 화면에서는 이동 결과나 회피 성공 여부를 산출하지 않습니다.</p></div></li></ol>${command('함대 이동 확정 · 미연결', 'evasion')}${actions(next('fleet', '함대 현황 확인'))}</section></div>`;
}

function reports(state, p) {
  if (state.connection !== 'ready') return loading(state);
  return `${lead(p, '완료 피드백과 다음 확인할 작업을 살펴보세요.', 'reports', state)}<section class="ws-card">${cardHead('활동 기록', '로컬 화면 예시')}${state.notice ? `<article class="ws-report"><span class="ws-report-mark">✓</span><div><span class="ws-eyebrow">완료 피드백 · 시연</span><h3>${escape(state.notice.text)}</h3><p>완료 메시지의 표시 예시이며 실제 자산 변화는 없습니다.</p></div></article>` : empty('아직 활동 보고서가 없습니다', '진행 상황은 건설과 연구에서, 이동 상태는 함대에서 확인할 수 있습니다.')}<div class="ws-report-links">${next('construction', '건설 진행 확인')}${next('research', '연구 진행 확인')}${next('fleet', '함대 이동 확인')}</div></section>`;
}

const preparedPages = {
  career: { symbol: 'fleet', title: '다음 개인 작전을 준비하세요', description: '보유 함선을 편성해 출격과 귀환, 정비를 검토하는 공간입니다.', empty: '연결된 개인 작전 데이터 없음', hint: '현재 행성의 함대를 확인하고 편성 연습으로 다음 작전을 준비하세요.', links: [['fleet', '보유 함대 확인'], ['practice', '편성 연습']], command: '작전 출격 · 미연결' },
  galaxy: { symbol: 'galaxy', title: '은하와 정찰', description: '주변 상황을 살펴보고 정찰 정보로 다음 탐색을 준비하는 공간입니다.', empty: '연결된 은하 지도 없음', hint: '행성 관제의 궤도 위성에서 정찰 진입과 이동 표현을 확인할 수 있습니다.', links: [['home', '행성 관제로 이동'], ['fleet', '함대 현황']], command: '은하 탐색 · 미연결' },
  guild: { symbol: 'guild', title: '함께 준비하는 공동 작전', description: '정찰 · 교란 · 보급 · 돌파 역할을 나누어 공동 목표를 검토하는 공간입니다.', empty: '연결된 동맹과 공동 작전 없음', hint: '개인 함대와 작전 준비 상태를 먼저 확인할 수 있습니다.', links: [['fleet', '함대 준비 확인'], ['career', '개인 작전']], command: '공동 작전 · 미연결' },
  diplomacy: { symbol: 'diplomacy', title: '외교와 메시지', description: '외교 관계와 대화를 한곳에서 확인하는 공간입니다.', empty: '연결된 외교 관계와 메시지 없음', hint: '동맹 메뉴에서 공동 작전의 진입 흐름을 살펴보세요.', links: [['guild', '동맹 · 공동 작전'], ['more', '제국 메뉴']], command: '메시지 작성 · 미연결' },
  rankings: { symbol: 'rankings', title: '제국의 성장 확인', description: '제국 간 성장 현황을 살펴보는 공간입니다.', empty: '연결된 랭킹 데이터 없음', hint: '현재 행성의 시설과 연구 상황을 확인하며 다음 성장을 검토하세요.', links: [['construction', '시설 투자 비교'], ['research', '연구 현황']], command: '랭킹 조회 · 미연결' },
  practice: { symbol: 'fleet', title: '다음 편성을 차분히 검토하세요', description: '자원을 사용하지 않고 함대 편성과 작전 선택을 연습하는 공간입니다.', empty: '연결된 편성 연습 데이터 없음', hint: '보유 함선을 확인하고 개인 작전으로 다음 준비 단계를 살펴보세요.', links: [['fleet', '보유 함대 확인'], ['career', '개인 작전']], command: '편성 연습 시작 · 미연결' },
};

function prepared(view, p) {
  const page = preparedPages[view];
  return `${lead(p, page.description)}<section class="ws-card ws-prepared"><span class="ws-prepared-symbol">${icon(page.symbol)}</span><span class="ws-eyebrow">${workspaceTitles[view]}</span><h2>${page.title}</h2><div class="ws-prepared-status"><strong>${page.empty}</strong><p>${page.hint}</p></div>${actions(page.links.map(([key, label], index) => next(key, label, index === 0)).join(''))}${view === 'galaxy' && p.id === 'nova' ? panel('recon', '정찰 위성 S-01 요약') : ''}${command(page.command, view)}</section>`;
}

function more(p,state) {
  const descriptions = { career: '목표를 고르고 함대 보내기', galaxy: '은하 탐색과 정찰', defense: '현지 방어와 외부 접근', guild: '공동 목표와 도착 시각 조율', diplomacy: '관계와 메시지', rankings: '제국의 성장 현황', reports: '활동과 완료 피드백', practice: '선택적으로 함종과 지원 비교' };
  return `${lead(p, '필요한 관리 화면으로 이동하세요.', 'more', state)}<div class="ws-menu-grid">${Object.entries(descriptions).map(([view, description]) => `<button class="ws-menu-card" data-view="${view}"><span class="ws-menu-symbol">${icon(preparedPages[view]?.symbol || view)}</span><span><strong>${workspaceTitles[view]}</strong><small>${description}</small></span>${icon('arrow')}</button>`).join('')}</div><div class="ws-menu-footer"><button class="ws-menu-card" data-panel="settings"><span class="ws-menu-symbol">${icon('settings')}</span><span><strong>화면 설정</strong><small>모션과 시연 재생 설정</small></span>${icon('arrow')}</button><a class="ws-return-game" href="/">기존 게임으로 돌아가기 <span aria-hidden="true">↗</span></a></div>`;
}

export function renderWorkspace(view, state, selectedFacility = 'fuelRefinery', galaxyUI = initialGalaxy(), operationsUI = initialOperations(), allianceUI = initialAlliance(), strategyUI = initialStrategy()) {
  const p = state.planets.find(planet => planet.id === state.selected) || state.planets[0];
  const renderers = { construction, research, fleet, defense, evasion, reports };
  const content = view === 'command' ? renderStrategyCommand(state,strategyUI) : view === 'guild' ? renderStrategyAlliance(state,strategyUI) : view === 'career' ? renderStrategyTargets(state,strategyUI) : view === 'fleet' ? fleet(state,p,strategyUI) : view === 'defense' ? renderStrategyDefense(state,strategyUI)+defense(state,p) : view === 'practice' ? renderPractice(state,operationsUI) : view === 'galaxy' ? renderGalaxy(state,galaxyUI) : view === 'more' ? more(p,state) : preparedPages[view] ? prepared(view, p) : renderers[view] ? renderers[view](state, p, selectedFacility) : `${lead(p, '행성 관제에서 현재 상황과 다음 계획을 확인하세요.')}${actions(next('home', '행성 관제로 이동', true))}`;
  return `<div class="workspace-content ws-view-${escape(view)}">${content}</div>`;
}
