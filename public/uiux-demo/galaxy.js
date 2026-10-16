// Isolated, in-memory design fixtures. No game rules, network, persistence or timers.
export const galaxyTargets = Object.freeze([
  { id: 'nova', name: '노바 프라임', short: '노바', sector: 'lyra', coords: 'L-01 · 01', own: true, kind: '본성', x: 17, y: 35, color: 'blue' },
  { id: 'vesper', name: '베스퍼', short: '베스퍼', sector: 'lyra', coords: 'L-01 · 02', own: true, kind: '식민지', x: 34, y: 73, color: 'violet' },
  { id: 'tarsis', name: '타르시스', short: '타르시스', sector: 'lyra', coords: 'L-01 · 03', own: false, kind: '소속 미확인', x: 50, y: 25, color: 'sand' },
  { id: 'mira', name: '미라', short: '미라', sector: 'lyra', coords: 'L-01 · 04', own: false, observed: true, ally: true, kind: '동맹 거점', x: 82, y: 58, color: 'teal' },
  { id: 'naos', name: '나오스', short: '나오스', sector: 'lyra', coords: 'L-01 · 05', own: false, neutral: true, kind: '중립', x: 84, y: 23, color: 'gray' },
  { id: 'eos', name: '에오스', short: '에오스', sector: 'lyra', coords: 'L-01 · 06', own: false, kind: '소속 미확인', x: 57, y: 83, color: 'rust' },
  { id: 'rigel', name: '리겔', short: '리겔', sector: 'orion', coords: 'O-02 · 01', own: false, kind: '소속 미확인', x: 23, y: 38, color: 'blue' },
  { id: 'saiph', name: '사이프', short: '사이프', sector: 'orion', coords: 'O-02 · 02', own: false, observed: true, kind: '소속 미확인', x: 52, y: 72, color: 'sand' },
  { id: 'bellatrix', name: '벨라트릭스', short: '벨라', sector: 'orion', coords: 'O-02 · 03', own: false, neutral: true, kind: '중립', x: 78, y: 29, color: 'violet' },
].map(target => Object.freeze(target)));

const sectors = { lyra: '리라 성역', orion: '오리온 성역' };
const filters = { all: '전체', own: '내 행성', unknown: '소속 미확인' };
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const normalized = value => String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');
const fixture = id => galaxyTargets.find(target => target.id === id);
const available = state => state?.connection === 'ready';
const hasRecord = (state, ui, target) => Boolean(target && !target.own && (ui.reports[target.id]?.kind === 'simulation' || (!state.empty && target.observed)));
const recordSource = (ui, target) => ui.reports[target.id]?.kind === 'simulation' ? '정찰 보고서' : '사전 관측 · 12분 전';
const status = (ui, target, state) => target.own ? '내 행성' : target.ally ? '동맹 행성' : ui.reports[target.id] ? '관측 기록' : target.observed && !state.empty ? '사전 관측' : target.neutral ? '중립' : '미확인';

export function initialGalaxy() {
  return { sector: 'lyra', target: 'tarsis', filter: 'all', query: '', scan: null, reports: {} };
}

export function visibleGalaxyTargets(ui) {
  const query = normalized(ui.query).toLocaleLowerCase('ko-KR');
  return galaxyTargets.filter(target => target.sector === ui.sector
    && (ui.filter !== 'own' || target.own)
    && (ui.filter !== 'unknown' || (!target.own && !target.neutral && !target.ally))
    && (!query || normalized(`${target.name} ${target.id} ${target.coords} ${sectors[target.sector]}`).toLocaleLowerCase('ko-KR').includes(query)));
}

export function selectedGalaxyTarget(ui) {
  return visibleGalaxyTargets(ui).find(target => target.id === ui.target) || null;
}

const selectVisible = ui => {
  const targets = visibleGalaxyTargets(ui);
  return targets.length && !targets.some(target => target.id === ui.target) ? { ...ui, target: targets[0].id } : ui;
};

export function transitionGalaxy(ui, action) {
  switch (action.type) {
    case 'target': {
      const target = fixture(action.id);
      if (!target) return ui;
      const next = { ...ui, sector: target.sector, target: target.id };
      return selectedGalaxyTarget(next) ? next : { ...next, filter: 'all', query: '' };
    }
    case 'sector': return Object.hasOwn(sectors, action.value) ? selectVisible({ ...ui, sector: action.value, query: '', filter: 'all' }) : ui;
    case 'filter': return Object.hasOwn(filters, action.value) ? selectVisible({ ...ui, filter: action.value }) : ui;
    case 'query': return selectVisible({ ...ui, query: String(action.value ?? '') });
    case 'scan-start': {
      const target = fixture(action.target);
      return ui.scan || !target || target.own || action.token == null ? ui : { ...ui, scan: { target: target.id, token: action.token } };
    }
    case 'scan-complete': return ui.scan && ui.scan.token === action.token
      ? { ...ui, reports: { ...ui.reports, [ui.scan.target]: { kind: 'simulation' } }, scan: null } : ui;
    case 'scan-cancel': return ui.scan ? { ...ui, scan: null } : ui;
    case 'reset': return initialGalaxy();
    default: return ui;
  }
}

function unavailable(state) {
  return `<div class="ws-loading gx-unavailable" role="status"><span class="ws-loading-dot"></span><strong>${state?.connection === 'offline' ? '연결 상태를 확인하세요' : '은하 정보를 불러오는 중입니다'}</strong><p>${state?.connection === 'offline' ? '상단 연결 상태에서 다시 시도한 뒤 탐색하세요.' : '준비되면 성역 지도와 대상 정보를 표시합니다.'}</p></div>`;
}

function toolbar(state, ui) {
  const disabled = available(state) ? '' : ' disabled';
  return `<div class="gx-toolbar" aria-label="은하 탐색 조건"><label class="gx-field gx-sector" for="galaxy-sector-select"><span>탐색 성역</span><select id="galaxy-sector-select"${disabled}>${Object.entries(sectors).map(([key, name]) => `<option value="${key}"${ui.sector === key ? ' selected' : ''}>${name}</option>`).join('')}</select></label><label class="gx-field gx-search" for="galaxy-search"><span>대상 검색</span><input id="galaxy-search" type="search" placeholder="행성 이름 · 좌표" value="${escape(ui.query)}" autocomplete="off"${disabled}></label><div class="gx-filters" role="group" aria-label="대상 분류">${Object.entries(filters).map(([key, label]) => `<button id="galaxy-filter-${key}" data-galaxy-filter="${key}" aria-pressed="${ui.filter === key}"${disabled}>${label}</button>`).join('')}</div><button class="ws-button gx-center" id="galaxy-center-current"${disabled}>현재 행성 찾기</button><span id="galaxy-results-count" class="gx-results" role="status">${available(state) ? `${visibleGalaxyTargets(ui).length}개 대상` : '정보 확인 중'}</span></div>`;
}

const sphere = target => `<span class="gx-sphere gx-sphere-${target.color}" aria-hidden="true"></span>`;

function map(state, ui, targets) {
  return `<section class="ws-card gx-map-card" aria-labelledby="galaxy-map-heading"><div class="gx-card-heading"><div><span class="ws-eyebrow">SECTOR ${ui.sector === 'lyra' ? '01 / LYRA' : '02 / ORION'}</span><h2 id="galaxy-map-heading">${sectors[ui.sector]}</h2></div><span class="ws-tag">행성 위치</span></div><div class="gx-map" aria-label="${sectors[ui.sector]} 행성 선택 지도"><svg class="gx-orbits" viewBox="0 0 600 320" preserveAspectRatio="none" aria-hidden="true"><g transform="rotate(-16 300 160)"><ellipse cx="300" cy="160" rx="115" ry="60"/><ellipse cx="300" cy="160" rx="205" ry="108"/><ellipse cx="300" cy="160" rx="290" ry="150"/></g><path d="M0 160H600M300 0V320" class="gx-map-axis"/></svg><span class="gx-star" aria-hidden="true"></span>${targets.map(target => `<button class="gx-node${target.own ? ' gx-node-own' : ''}" id="galaxy-node-${target.id}" data-galaxy-target="${target.id}" aria-pressed="${ui.target === target.id}" aria-label="${escape(`${target.coords} ${target.name} · ${status(ui, target, state)}`)}" style="--gx-x:${target.x}%;--gx-y:${target.y}%">${sphere(target)}<span class="gx-node-label"><b>${target.coords.split(' · ')[1]}</b><span>${target.short}</span></span></button>`).join('')}</div><div class="gx-map-foot"><div class="gx-legend"><span><i class="gx-dot-own"></i>내 행성</span><span><i></i>외부 대상</span></div><button class="ws-text-button" id="galaxy-map-detail" data-galaxy-focus>${escape(fixture(ui.target)?.name || "선택 대상")} 상세 보기 <span aria-hidden="true">↓</span></button></div></section>`;
}

function targetList(state, ui, targets) {
  return `<section class="ws-card gx-list" aria-labelledby="galaxy-list-heading"><div class="gx-card-heading"><h2 id="galaxy-list-heading">성역 내 대상</h2><span>이름 · 좌표 · 관측 상태</span></div><div class="gx-target-rows">${targets.map(target => `<button id="galaxy-row-${target.id}" class="gx-target-row" data-galaxy-target="${target.id}" aria-pressed="${ui.target === target.id}">${sphere(target)}<span class="gx-row-copy"><strong>${target.name}</strong><small>${target.coords} · ${target.kind}</small></span><span class="gx-row-status">${status(ui, target, state)}</span><span class="gx-row-arrow" aria-hidden="true">↗</span></button>`).join('')}</div><div class="gx-list-foot"><span>선택: ${escape(fixture(ui.target)?.name || "—")}</span><button class="ws-text-button" id="galaxy-list-detail" data-galaxy-focus>선택 대상 상세 보기 <span aria-hidden="true">↑</span></button></div></section>`;
}

function inspector(state, ui, target) {
  const own = target.own;
  const record = hasRecord(state, ui, target);
  const busyTarget = fixture(ui.scan?.target);
  return `<section class="ws-card gx-inspector" aria-labelledby="galaxy-target-title"><div class="gx-inspector-head">${sphere(target)}<div><span class="ws-eyebrow">선택 대상 · ${target.coords}</span><h2 id="galaxy-target-title" tabindex="-1">${target.name}</h2><span class="gx-target-kind">${target.kind}</span></div></div>${busyTarget ? `<p class="gx-scan-status" role="status"><i></i>${busyTarget.name} 정찰 정보 확인 중…</p>` : ''}${own
    ? `<div class="gx-observation"><span class="ws-eyebrow">내 행성</span><p>행성 관제에서 현지 자원과 시설을 확인하세요.</p></div><button class="ws-button ws-button-primary gx-primary" id="galaxy-home-${target.id}" data-galaxy-home="${target.id}">${target.name} 관제로 이동 <span aria-hidden="true">↗</span></button><p class="gx-small-note">대상 선택은 상단의 현재 행성을 바꾸지 않습니다.</p>${target.id!==state.selected?`<button class="ws-button" data-strategy-open="${target.id}" data-strategy-intent="move">이 행성으로 함대 이동 준비</button>`:''}${target.id === 'nova' && state.satellite?.planetId === 'nova' ? '<button class="ws-text-button gx-satellite" data-panel="recon">노바 정찰 위성 S-01 요약 <span aria-hidden="true">↗</span></button>' : ''}`
    : `<div class="gx-observation"><span class="ws-eyebrow">${record ? recordSource(ui, target) : '관측 정보 없음'}</span><p>${record ? '자원 흔적과 시설 신호를 확인할 수 있습니다.' : '대상의 자원·시설·함대는 아직 미확인입니다.'}</p></div><dl class="gx-facts"><div><dt>자원 흔적</dt><dd>${record ? '약한 신호' : '미확인'}</dd></div><div><dt>시설 신호</dt><dd>${record ? '일부 감지' : '미확인'}</dd></div><div><dt>함대 정보</dt><dd>미확인</dd></div></dl><div class="gx-primary-actions"><button class="ws-button ws-button-primary" id="galaxy-scan-preview"${ui.scan ? ' aria-disabled="true"' : ''}>${ui.scan?.target === target.id ? '정찰 정보 확인 중…' : '정찰 정보 미리보기'}<span aria-hidden="true">⌁</span></button>${record ? '<button class="ws-button" id="galaxy-report-open" data-panel="intel">관측 보고서 보기 <span aria-hidden="true">↗</span></button>' : ''}</div><div class="gx-primary-actions">${!target.neutral&&!target.ally?`<button class="ws-button" data-strategy-open="${target.id}" data-strategy-intent="attack">공격 준비</button>`:''}${target.ally?`<button class="ws-button" data-strategy-open="${target.id}" data-strategy-intent="reinforce">증원 준비</button>`:''}<button class="ws-button" data-strategy-open="${target.id}" data-strategy-intent="scout">정찰 함대 편성</button></div><div class="gx-command"><button class="ws-button" disabled aria-describedby="demo-boundary">정찰 시작</button></div>`}</section>`;
}

export function renderGalaxyContent(state, ui) {
  if (!available(state)) return unavailable(state);
  const targets = visibleGalaxyTargets(ui);
  const target = selectedGalaxyTarget(ui);
  if (!target) return `<section class="ws-card gx-no-results"><span class="ws-eyebrow">탐색 결과</span><h2>조건에 맞는 대상이 없습니다</h2><p>행성 이름이나 좌표를 다시 확인하거나 탐색 조건을 초기화하세요.</p><button class="ws-button ws-button-primary" id="galaxy-clear-query">검색·필터 초기화</button></section>`;
  return `<div class="gx-grid">${map(state, ui, targets)}<label class="gx-mobile-picker gx-field" for="galaxy-target-select"><span>선택 대상</span><select id="galaxy-target-select">${targets.map(t => `<option value="${t.id}"${t.id === ui.target ? ' selected' : ''}>${escape(t.name)} · ${t.coords}</option>`).join('')}</select></label>${inspector(state, ui, target)}${targetList(state, ui, targets)}</div>`;
}

export function renderGalaxy(state, ui) {
  return `<div class="gx-workspace"><div class="gx-intro"><p>주변 행성을 살펴보고 필요한 관측 정보를 확인하세요.</p><span>성역 탐색</span></div>${toolbar(state, ui)}<div id="galaxy-content">${renderGalaxyContent(state, ui)}</div></div>`;
}

export function renderGalaxyReport(state, ui, targetId) {
  if (!available(state)) return unavailable(state);
  const target = fixture(targetId);
  if (!hasRecord(state, ui, target)) return `<div class="gx-report"><span class="ws-eyebrow">관측 보고서</span><h3>아직 확인한 정보가 없습니다</h3><p>은하에서 대상을 선택하고 정찰 정보를 확인하세요.</p><button class="ws-button" data-view="galaxy">은하 · 정찰로 이동</button></div>`;
  return `<article class="gx-report"><span class="ws-eyebrow">${recordSource(ui, target)}</span><h3>${target.name}</h3><p class="gx-report-coords">${sectors[target.sector]} · ${target.coords}</p><dl class="gx-facts"><div><dt>자원 흔적</dt><dd>약한 신호</dd></div><div><dt>시설 신호</dt><dd>일부 감지</dd></div><div><dt>함대 구성·수량</dt><dd>미확인</dd></div></dl><p>정확한 자원량·시설 수준·함대 전력은 아직 확인되지 않았습니다.</p><button class="ws-button" data-view="galaxy">은하에서 대상 확인</button></article>`;
}
