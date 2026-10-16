import {shipIcon,icon as uiIcon} from './icons.js';
// Isolated, in-memory preparation study. No game engine, network, timers or storage.
// Summary contract: issues = {code,label,action}; roles = {id,label,count};
// checks = {id,label,pass,detail}; recommendations are non-blocking briefing advice.
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

export const ships = freeze([
  { id: 'striker', name: '케스트럴', role: '타격', label: 'STRIKE FRIGATE', command: 2, cargo: 2, color: '#8bdbd1', description: '기동 표적 대응의 중심' },
  { id: 'guardian', name: '바스티온', role: '호위', label: 'ESCORT CRUISER', command: 3, cargo: 2, color: '#aebedb', description: '회수·지원 함선의 호위' },
  { id: 'siege', name: '랜서', role: '공성', label: 'SIEGE CORVETTE', command: 3, cargo: 1, color: '#e9bc86', description: '고정 시설 대응에 특화' },
  { id: 'support', name: '멘더', role: '수리', label: 'REPAIR TENDER', command: 2, cargo: 2, color: '#a6d9a2', description: '장기 작전을 위한 정비' },
  { id: 'salvage', name: '아틀라스', role: '회수', label: 'RECOVERY VESSEL', command: 1, cargo: 7, color: '#e1c68d', description: '넉넉한 화물 적재 공간' },
  { id: 'scout', name: '위스프', role: '정찰', label: 'PATHFINDER', command: 1, cargo: 2, color: '#91c6e5', description: '우회 접근을 위한 정찰' },
  { id: 'jammer', name: '베일', role: '교란', label: 'ELECTRONIC WARFARE', command: 2, cargo: 1, color: '#b9a5e2', description: '방어 신호에 대응하는 교란' },
  { id: 'carrier', name: '아크', role: '항모', label: 'LIGHT CARRIER', command: 4, cargo: 3, color: '#e7a795', description: '함재기 운용을 위한 전력' },
]);

export const missions = freeze([
  {
    id: 'salvage', title: '고요한 잔해지대', tag: '잔해 회수', sector: '리라 성역 · L-04', number: '01',
    description: '교전이 멎은 잔해지대. 남겨진 자산의 회수를 준비하세요.',
    objective: '잔해 구역을 확보하고 회수 함선을 보호하는 편성을 확인합니다.',
    risk: '잔존 경계 전력과 회수 함선의 노출을 함께 고려해야 합니다.',
    roleIds: ['salvage', 'guardian', 'scout'],
    roleReason: '회수 공간을 확보하고 호위와 정찰로 회수 함선을 뒷받침하세요.',
    stages: [
      { title: '진입 경로 확인', description: '정찰 수단과 접근 방식을 먼저 고릅니다.' },
      { title: '잔해 구역 확보', description: '타격 전력과 회수 함선의 호위를 살핍니다.' },
      { title: '회수 준비 점검', description: '편성의 화물 공간과 지원 구성을 확인합니다.' },
    ],
  },
  {
    id: 'relay', title: '봉쇄된 중계 거점', tag: '거점 대응', sector: '리라 성역 · L-08', number: '02',
    description: '항로를 가로막는 중계 시설. 고정 방어에 대응할 전력을 구성하세요.',
    objective: '중계 거점의 고정 방어를 고려해 공성·교란 역할을 배치합니다.',
    risk: '고정 방어에 치우친 대응은 기동 표적이나 호위 공백을 남길 수 있습니다.',
    roleIds: ['siege', 'jammer', 'guardian'],
    roleReason: '공성·교란 전력을 비교하고 나머지 함선의 호위도 함께 확인하세요.',
    stages: [
      { title: '방어 구성 파악', description: '고정 시설과 주변 경계 전력을 구분합니다.' },
      { title: '대응 역할 배치', description: '공성·교란 함선과 호위의 균형을 잡습니다.' },
      { title: '지원 방식 확인', description: '교란·정찰 지원과 접근 경로를 대조합니다.' },
    ],
  },
  {
    id: 'convoy', title: '새벽 수송선단', tag: '수송선단 대응', sector: '오리온 성역 · O-07', number: '03',
    description: '이탈을 준비하는 수송선단. 기동 대응과 화물 공간을 함께 살피세요.',
    objective: '수송선단의 이탈에 대비할 타격 전력과 회수 공간을 준비합니다.',
    risk: '화력에만 집중하면 화물 공간이 줄고, 회수 위주 편성은 호위가 얇아집니다.',
    roleIds: ['striker', 'guardian', 'salvage'],
    roleReason: '타격·호위·회수 역할을 비교해 기동 대응과 적재 공간을 함께 확보하세요.',
    stages: [
      { title: '접근 방식 선택', description: '직접 접근과 정찰을 통한 우회를 비교합니다.' },
      { title: '기동 대응 편성', description: '타격 전력과 호위의 구성을 살핍니다.' },
      { title: '회수 공간 확인', description: '지원과 화물 공간을 마지막으로 점검합니다.' },
    ],
  },
]);

const supports = { none: '지원 없음', recon: '정찰 지원', jam: '교란 지원', supply: '보급 지원' };
const approaches = { direct: '직접 접근', flank: '우회 접근' };
const presets = {
  balanced: { label: '균형 편성', counts: { striker: 2, guardian: 1, salvage: 1, scout: 1 } },
  recovery: { label: '회수 중심', counts: { striker: 1, guardian: 1, support: 1, salvage: 1, scout: 1 } },
  breach: { label: '거점 대응', counts: { striker: 1, guardian: 1, siege: 1, jammer: 1, scout: 1 } },
};
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const planetId = planet => typeof planet === 'string' ? planet : planet?.id;
const ownedPlanet = planet => ['nova', 'vesper'].includes(planetId(planet));
const planetName = planet => typeof planet === 'object' && planet?.name ? planet.name : planetId(planet) === 'nova' ? '노바 프라임' : planetId(planet) === 'vesper' ? '베스퍼' : '선택 행성';
const currentPlanet = state => state?.planets?.find(planet => planet.id === state.selected) || state?.planets?.[0];
const currentMission = ui => missions.find(mission => mission.id === ui?.mission) || missions[0];
const blankCounts = () => Object.fromEntries(ships.map(ship => [ship.id, 0]));
const finiteQuantity = value => {
  if (!['number', 'string'].includes(typeof value) || (typeof value === 'string' && !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : null;
};

export function initialOperations() {
  return { mission: 'salvage', drafts: {}, review: null };
}

export function operationInventory(planet) {
  return Object.fromEntries(ships.map(ship => [ship.id, planetId(planet) === 'nova' ? ship.id === 'striker' ? 3 : 1 : 0]));
}

export function operationDraft(ui, planet) {
  const inventory = operationInventory(planet);
  const saved = ui?.drafts?.[planetId(planet)];
  const counts = saved?.counts || (planetId(planet) === 'nova' ? presets.balanced.counts : {});
  return {
    counts: Object.fromEntries(ships.map(ship => [ship.id, Math.max(0, Math.min(inventory[ship.id], finiteQuantity(counts[ship.id]) ?? 0))])),
    support: Object.hasOwn(supports, saved?.support) ? saved.support : 'none',
    approach: Object.hasOwn(approaches, saved?.approach) ? saved.approach : 'direct',
    preset: Object.hasOwn(presets, saved?.preset) ? saved.preset : null,
  };
}

export function operationSummary(ui, planet) {
  const draft = operationDraft(ui, planet);
  const mission = currentMission(ui);
  const inventoryTotal = Object.values(operationInventory(planet)).reduce((sum, count) => sum + count, 0);
  const total = Object.values(draft.counts).reduce((sum, count) => sum + count, 0);
  const command = ships.reduce((sum, ship) => sum + draft.counts[ship.id] * ship.command, 0);
  const cargo = ships.reduce((sum, ship) => sum + draft.counts[ship.id] * ship.cargo, 0);
  const flankReady = draft.approach !== 'flank' || draft.counts.scout > 0 || draft.support === 'recon';
  const issues = [];
  if (!inventoryTotal) issues.push({ code: 'no-inventory', label: `${planetName(planet)}에 배치된 함선이 없습니다.`, action: '함대 현황과 조선소 건설을 확인하세요.' });
  else if (!total) issues.push({ code: 'empty', label: '편성에 선택한 함선이 없습니다.', action: '함선 수량을 늘리거나 추천 편성을 적용하세요.' });
  if (total > 6) issues.push({ code: 'ship-limit', label: `함선 수가 편성 한도보다 ${total - 6}척 많습니다.`, action: `함선 ${total - 6}척을 줄여 6척 이하로 맞추세요.` });
  if (command > 12) issues.push({ code: 'command-limit', label: `지휘 비용이 편성 한도보다 ${command - 12} 높습니다.`, action: `함선 수나 구성을 바꿔 지휘 비용을 ${command - 12} 줄이고 12 이하로 맞추세요.` });
  if (!flankReady) issues.push({ code: 'flank', label: '우회 접근에 필요한 정찰 수단이 없습니다.', action: '위스프를 1척 이상 편성하거나 정찰 지원을 선택하세요. 직접 접근으로 바꿀 수도 있습니다.' });
  const checks = [
    { id: 'inventory', label: '현지 함선 보유', pass: inventoryTotal > 0, detail: inventoryTotal ? `${planetName(planet)} 보유 ${inventoryTotal}척` : `${planetName(planet)} 배치 함선 없음` },
    { id: 'formation', label: '함선 수', pass: total > 0 && total <= 6, detail: total ? `${total} / 6척 · 편성 한도` : '함선을 1척 이상 선택하세요.' },
    { id: 'command', label: '지휘 비용', pass: command <= 12, detail: `${command} / 12 · 편성 한도` },
    { id: 'approach', label: '접근 조건', pass: flankReady, detail: draft.approach === 'direct' ? '직접 접근 · 추가 정찰 조건 없음' : flankReady ? `우회 접근 · ${draft.counts.scout ? '위스프 편성' : '정찰 지원'} 확보` : '우회 접근 · 위스프 또는 정찰 지원 필요' },
  ];
  const recommendations = mission.roleIds.filter(id => !draft.counts[id]).map(id => `${ships.find(ship => ship.id === id).role} 역할을 확인하세요.`);
  return { total, command, cargo, valid: issues.length === 0, issues, roles: ships.filter(ship => draft.counts[ship.id] > 0).map(ship => ({ id: ship.id, label: ship.role, count: draft.counts[ship.id] })), checks, recommendations, inventoryTotal };
}

const saveDraft = (ui, planet, draft) => ({ ...ui, drafts: { ...ui.drafts, [planetId(planet)]: draft }, review: null });

export function transitionOperations(ui, action, planet) {
  if (!action || typeof action.type !== 'string') return ui;
  if (action.type === 'reset') return initialOperations();
  if (action.type === 'cancel-review') return ui.review ? { ...ui, review: null } : ui;
  if (action.type === 'mission') return missions.some(mission => mission.id === action.id) && action.id !== ui.mission ? { ...ui, mission: action.id, review: null } : ui;
  if (!ownedPlanet(planet)) return ui;
  const draft = operationDraft(ui, planet);
  switch (action.type) {
    case 'quantity': {
      const ship = ships.find(candidate => candidate.id === action.id);
      const number = finiteQuantity(action.value);
      if (!ship || number === null) return ui;
      const value = Math.max(0, Math.min(operationInventory(planet)[ship.id], number));
      return value === draft.counts[ship.id] ? ui : saveDraft(ui, planet, { ...draft, counts: { ...draft.counts, [ship.id]: value }, preset: null });
    }
    case 'support':
    case 'approach': {
      const options = action.type === 'support' ? supports : approaches;
      return Object.hasOwn(options, action.value) && draft[action.type] !== action.value ? saveDraft(ui, planet, { ...draft, [action.type]: action.value }) : ui;
    }
    case 'preset': {
      if (!Object.hasOwn(presets, action.id) || !Object.values(operationInventory(planet)).some(Boolean)) return ui;
      const inventory = operationInventory(planet);
      const counts = Object.fromEntries(ships.map(ship => [ship.id, Math.min(inventory[ship.id], presets[action.id].counts[ship.id] || 0)]));
      if (draft.preset === action.id && ships.every(ship => draft.counts[ship.id] === counts[ship.id])) return ui;
      return saveDraft(ui, planet, { ...draft, counts, preset: action.id });
    }
    case 'clear':
      return !Object.values(draft.counts).some(Boolean) && draft.support === 'none' && draft.approach === 'direct' && !draft.preset ? ui : saveDraft(ui, planet, { counts: blankCounts(), support: 'none', approach: 'direct', preset: null });
    case 'review': {
      const review = freeze({ planet: { id: planetId(planet), name: planetName(planet) }, mission: currentMission(ui).id, draft, summary: operationSummary(ui, planet) });
      return { ...ui, review };
    }
    default: return ui;
  }
}

const rolePaths = {
  striker: '<path d="m12 3 7 16-7-4-7 4zM12 8v7"/>',
  guardian: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12h8"/>',
  siege: '<path d="M9 21V9l3-6 3 6v12M7 15h10M6 21h12"/>',
  support: '<path d="M8 3h8v5h5v8h-5v5H8v-5H3V8h5z"/>',
  salvage: '<path d="m4 8 8-5 8 5v10l-8 4-8-4zM4 8l8 5 8-5M12 13v9"/>',
  scout: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="m18 6 4-4M15 9l3-3"/>',
  jammer: '<path d="M12 8v13M8 21h8M8 8a5 5 0 0 1 8 0M4 5a11 11 0 0 1 16 0"/><circle cx="12" cy="9" r="1"/>',
  carrier: '<path d="M6 3h12l3 18H3zM9 7v10M15 7v10M9 12h6"/>',
};
const roleIcon = shipIcon;
const arrow = uiIcon('arrow');
const blueprintPaths = {
  striker: '<path d="m48 5 9 22 24 17-21-2-5 11H41l-5-11-21 2 24-17z"/><path d="M48 13v30M39 27h18M41 48h14M29 38l10-5M67 38l-10-5"/>',
  guardian: '<path d="m48 5 12 14 6 8 16 7v16H62l-6 5H40l-6-5H14V34l16-7 6-8z"/><path d="M39 20h18v23H39zM21 34v10h10V30M75 34v10H65V30M43 49h10"/>',
  siege: '<path d="M43 3h10v19l8 10 8 20H27l8-20 8-10z"/><path d="M48 7v37M39 33h18M33 46h30M29 36l-9 10v6h8M67 36l9 10v6h-8"/>',
  support: '<path d="m48 6 10 12v27l-10 10-10-10V18zM38 24H19l-5 8 5 13h19M58 24h19l5 8-5 13H58"/><path d="M24 29v11M29 29v11M67 29v11M72 29v11M44 31h8M48 27v8"/>',
  salvage: '<path d="m48 6 10 11v35H38V17zM38 22H17v26h21M58 22h21v26H58"/><path d="M22 27h11v16H22zM63 27h11v16H63zM44 18h8v20h-8zM42 47h12M17 34H8M79 34h9"/>',
  scout: '<path d="m48 5 7 24 18 20-19-8-6 13-6-13-19 8 18-20z"/><path d="M48 15v26M34 38l14-7 14 7M38 20l-9 8M58 20l9 8"/><path d="M22 18a32 32 0 0 1 52 0" stroke-dasharray="3 5"/>',
  jammer: '<path d="m48 8 11 13v31H37V21zM37 30 24 24v23l13-6M59 30l13-6v23l-13-6"/><path d="M44 20h8v19h-8zM43 47h10M30 17a26 26 0 0 1 36 0M23 10a36 36 0 0 1 50 0"/>',
  carrier: '<path d="m48 4 19 17 6 32H23l6-32z"/><path d="M36 21v25h24V21M40 18h16M48 23v18M31 31h-4M65 31h4M21 39H12v11h11M75 39h9v11H73"/>',
};
const blueprint = ship => `<svg class="op-blueprint" viewBox="0 0 96 60" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path class="op-blueprint-grid" d="M0 15h96M0 30h96M0 45h96M16 0v60M32 0v60M48 0v60M64 0v60M80 0v60"/><g class="op-blueprint-hull">${blueprintPaths[ship.id]}</g></svg>`;
const badge = (label, tone = '') => `<span class="op-badge${tone ? ` op-badge-${tone}` : ''}">${escape(label)}</span>`;
const link = (view, label, primary = false) => `<button class="ws-button${primary ? ' ws-button-primary' : ''}" data-view="${view}">${label}${arrow}</button>`;
const lead = (planet, description) => `<div class="op-lead"><p>${description}</p>${badge(`${planetName(planet)} · 현지 편성`)}</div>`;
const actualCommand = (scope, label = '출격 시작') => `<div class="op-actual-command"><button class="ws-button" id="${scope}-launch" disabled aria-describedby="${scope}-launch-reason">${label}</button><p id="${scope}-launch-reason">데모에서는 출격과 전투를 실행하지 않습니다.</p></div>`;
const unavailable = state => `<div class="ws-loading op-unavailable" role="status"><span class="ws-loading-dot"></span><strong>${state?.connection === 'offline' ? '연결 상태를 확인하세요' : '작전 정보를 불러오는 중입니다'}</strong><p>${state?.connection === 'offline' ? '상단 연결 상태에서 다시 시도한 뒤 편성을 확인하세요.' : '준비되면 현재 행성의 작전과 편성 정보를 표시합니다.'}</p></div>`;
const missionOptions = ui => missions.map(mission => `<option value="${mission.id}"${currentMission(ui).id === mission.id ? ' selected' : ''}>${mission.title}</option>`).join('');
const missionPicker = (scope, ui, ready = true) => `<label class="op-field op-${scope}-picker" for="${scope}-mission-select"><span>확인할 작전</span><select id="${scope}-mission-select"${ready ? '' : ' disabled'}>${ready ? missionOptions(ui) : '<option value="">작전 정보 확인 중</option>'}</select></label>`;
const roleChips = mission => `<div class="op-role-chips">${mission.roleIds.map(id => { const ship = ships.find(candidate => candidate.id === id); return `<span style="--op-role-color:${ship.color}">${roleIcon(id)}${ship.role}</span>`; }).join('')}</div>`;

function missionList(ui) {
  return `<aside class="op-mission-catalog" aria-label="개인 작전 선택"><div class="op-section-head"><h2>작전 목록</h2><span>3개 작전</span></div><div class="op-mission-list">${missions.map(mission => `<button id="career-mission-${mission.id}" class="op-mission-card" data-operation-mission="${mission.id}" aria-pressed="${currentMission(ui).id === mission.id}"><span class="op-mission-card-top"><span class="op-index">${mission.number}</span><span>${mission.tag}</span>${arrow}</span><strong>${mission.title}</strong><small>${mission.sector}</small><p>${mission.description}</p>${roleChips(mission)}</button>`).join('')}</div><p class="op-note">목표에 맞는 함종과 수량을 선택하세요.</p></aside>`;
}

function careerReadiness(state, ui, planet) {
  const summary = operationSummary(ui, planet);
  return `<section class="op-career-readiness" aria-labelledby="career-readiness-title"><div class="op-section-head"><h2 id="career-readiness-title">이 행성의 준비 상태</h2>${badge(summary.valid ? '준비 조건 충족' : '편성 보완 필요', summary.valid ? 'success' : 'warning')}</div><div class="op-readiness-metrics"><span><strong>${summary.total}</strong> / 6척</span><span>지휘 <strong>${summary.command}</strong> / 12</span><span>화물 <strong>${summary.cargo}</strong></span></div><p class="op-note">함선 6척 · 지휘 12는 편성 연습의 편성 한도입니다.</p>${summary.valid ? '<p class="op-ready-copy">현재 편성은 기본 준비 조건을 충족합니다. 연습에서 함종별 역할과 지원을 비교하세요.</p>' : `<p class="op-ready-copy op-text-warning">${escape(summary.issues[0].label)} ${escape(summary.issues[0].action)}</p>`}${!summary.inventoryTotal ? '<div class="op-actions">' + link('fleet', '현지 함대 확인') + '</div>' : ''}${actualCommand('career')}</section>`;
}

export function renderCareer(state, ui) {
  if (state?.connection !== 'ready') return `<div class="op-workspace op-career">${missionPicker('career', ui, false)}${unavailable(state)}</div>`;
  const planet = currentPlanet(state);
  const mission = currentMission(ui);
  return `<div class="op-workspace op-career">${lead(planet, '작전의 목적과 필요한 역할을 살핀 뒤, 현지 함대로 편성을 준비하세요.')}${missionPicker('career', ui)}<div class="op-career-grid">${missionList(ui)}<article class="ws-card op-briefing" aria-labelledby="career-briefing-title"><div class="op-briefing-hero"><img src="./art/operation-stage-v1.webp" alt="" class="op-stage-art"><div class="op-hero-copy"><span class="op-kicker">OPERATION ${mission.number} <i></i> ${mission.sector}</span><h2 id="career-briefing-title">${mission.title}</h2><p>${mission.description}</p>${badge(mission.tag)}<div class="op-hero-actions"><button class="ws-button ws-button-primary" id="career-practice-start" data-view="practice">이 작전으로 편성 연습${arrow}</button></div></div><span class="op-art-caption">작전 구역</span></div><div class="op-briefing-body"><div class="op-briefing-facts"><section><h3>작전 목표</h3><p>${mission.objective}</p></section><section><h3 class="op-text-warning">고려할 위험</h3><p>${mission.risk}</p></section></div><section class="op-role-advice" aria-label="추천 역할"><div><h3>확인할 역할</h3>${roleChips(mission)}</div><p>${mission.roleReason}</p></section><section class="op-stages" aria-labelledby="career-stages-title"><div class="op-section-head"><h2 id="career-stages-title">작전 준비 흐름</h2><span>3단계 확인</span></div><ol>${mission.stages.map((stage, index) => `<li class="op-stage"><span>0${index + 1}</span><div><strong>${stage.title}</strong><p>${stage.description}</p></div></li>`).join('')}</ol></section>${careerReadiness(state, ui, planet)}</div></article></div></div>`;
}

function practiceToolbar(state, ui, planet) {
  const ready = state?.connection === 'ready';
  const hasInventory = ready && Object.values(operationInventory(planet)).some(Boolean);
  const draft = operationDraft(ui, planet);
  return `<div class="op-practice-toolbar">${missionPicker('practice', ui, ready)}<div class="op-preset-group"><span class="op-field-label">추천 편성</span><div class="op-presets" role="group" aria-label="추천 편성 적용">${Object.entries(presets).map(([id, preset]) => `<button id="practice-preset-${id}" data-operation-preset="${id}" aria-pressed="${ready && draft.preset === id}"${hasInventory ? '' : ' disabled'}>${preset.label}</button>`).join('')}</div></div><button class="ws-button op-clear" id="practice-clear"${hasInventory ? '' : ' disabled'}>편성 비우기</button></div>`;
}

function shipEditor(ui, planet) {
  const inventory = operationInventory(planet);
  const draft = operationDraft(ui, planet);
  const hasInventory = Object.values(inventory).some(Boolean);
  return `<section class="op-inventory" aria-labelledby="practice-inventory-title"><div class="op-section-head"><div><h2 id="practice-inventory-title">현지 함선</h2><p class="op-note">${escape(planetName(planet))} 보유 ${Object.values(inventory).reduce((sum, count) => sum + count, 0)}척 · 수량을 골라 편성하세요.</p></div><span class="op-inventory-count">8개 함종</span></div>${!hasInventory ? `<div class="op-empty-fleet" id="practice-empty-fleet"><span class="op-empty-symbol">${roleIcon('carrier')}</span><div><h3>이 행성에는 배치된 함선이 없습니다</h3><p>${escape(planetName(planet))}의 보유량이 0척이어서 추천 편성과 수량 조절을 사용할 수 없습니다. 현지 함대와 조선소 건설을 확인하세요.</p><div class="op-actions">${link('fleet', '함대 현황')}${link('construction', '조선소·시설 확인')}</div></div></div>` : ''}<div class="op-ship-grid">${ships.map(ship => {
    const count = draft.counts[ship.id];
    return `<article class="op-ship-card${count ? ' op-ship-selected' : ''}${!inventory[ship.id] ? ' op-ship-unavailable' : ''}" data-operation-ship="${ship.id}" style="--op-role-color:${ship.color}"><div class="op-ship-identity"><span class="op-ship-role">${roleIcon(ship.id)}${ship.role}</span><h3>${ship.name}</h3><span class="op-ship-label">${ship.label}</span></div><div class="op-ship-drawing"><span class="sc-ship-art sc-art-${ship.id}" aria-hidden="true"></span></div><p class="op-ship-description">${ship.description}</p><div class="op-ship-capacity"><span>척당 지휘 <b>${ship.command}</b></span><span>화물 <b>${ship.cargo}</b></span><span class="op-available">보유 <b>${inventory[ship.id]}척</b></span></div><div class="op-ship-edit"><label for="practice-count-${ship.id}"><span class="sr-only">${ship.name} </span>편성 수량</label><div class="op-stepper"><button id="practice-minus-${ship.id}" data-operation-step="${ship.id}" data-delta="-1" aria-label="${ship.name} 1척 줄이기" aria-disabled="${count <= 0}"${hasInventory ? '' : ' disabled'}><span aria-hidden="true">−</span></button><input type="number" id="practice-count-${ship.id}" data-operation-quantity="${ship.id}" min="0" max="${inventory[ship.id]}" step="1" inputmode="numeric" value="${count}" aria-describedby="practice-available-${ship.id}"${inventory[ship.id] ? '' : ' disabled'}><button id="practice-plus-${ship.id}" data-operation-step="${ship.id}" data-delta="1" aria-label="${ship.name} 1척 늘리기" aria-disabled="${count >= inventory[ship.id]}"${hasInventory ? '' : ' disabled'}><span aria-hidden="true">+</span></button></div><span id="practice-available-${ship.id}" class="sr-only">이 행성에서 최대 ${inventory[ship.id]}척까지 편성할 수 있습니다.</span></div></article>`;
  }).join('')}</div></section>`;
}

function operationChoices(ui, planet) {
  const draft = operationDraft(ui, planet);
  return `<section class="ws-card op-choices" aria-labelledby="practice-choices-title"><div class="op-section-head"><h2 id="practice-choices-title">지원과 접근</h2><span>편성 조건 비교</span></div><div class="op-choice-fields"><div><label class="op-field" for="practice-support-select"><span>작전 지원</span><select id="practice-support-select">${Object.entries(supports).map(([value, label]) => `<option value="${value}"${draft.support === value ? ' selected' : ''}>${label}</option>`).join('')}</select></label><p class="op-note">지원 유형을 선택해 편성을 점검하세요.</p></div><div><label class="op-field" for="practice-approach-select"><span>접근 방식</span><select id="practice-approach-select">${Object.entries(approaches).map(([value, label]) => `<option value="${value}"${draft.approach === value ? ' selected' : ''}>${label}</option>`).join('')}</select></label><p class="op-note">우회 접근에는 위스프 1척 이상 또는 정찰 지원이 필요합니다.</p></div></div></section>`;
}

const metrics = (summary, prefix = '') => `<dl class="op-summary-metrics"><div class="${summary.total > 6 ? 'op-metric-warning' : ''}"><dt>편성 함선</dt><dd${prefix ? ` id="${prefix}-total"` : ''}>${summary.total}<small> / 6척</small></dd><span>편성 한도</span></div><div class="${summary.command > 12 ? 'op-metric-warning' : ''}"><dt>지휘 비용</dt><dd${prefix ? ` id="${prefix}-command"` : ''}>${summary.command}<small> / 12</small></dd><span>편성 한도</span></div><div><dt>화물 공간</dt><dd${prefix ? ` id="${prefix}-cargo"` : ''}>${summary.cargo}</dd><span>편성 적재 합계</span></div></dl>`;
const readinessChecks = summary => `<ul class="op-checks">${summary.checks.map(check => `<li class="${check.pass ? 'op-check-pass' : 'op-check-fail'}"><span class="op-check-mark" aria-hidden="true">${check.pass ? '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m5 10 3 3 7-7"/></svg>' : '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10 4v7m0 3v2"/></svg>'}</span><div><strong>${check.label}<span class="sr-only"> · ${check.pass ? '충족' : '보완 필요'}</span></strong><p>${escape(check.detail)}</p></div></li>`).join('')}</ul>`;
const issueList = summary => summary.issues.length ? `<div class="op-issues" aria-label="편성 수정 안내">${summary.issues.map(issue => `<div><strong>${escape(issue.label)}</strong><p>${escape(issue.action)}</p></div>`).join('')}</div>` : '';

function formation(draft) {
  const selected = ships.filter(ship => draft.counts[ship.id] > 0);
  return `<div class="op-formation" aria-label="선택한 함선의 역할 구성"><div class="op-formation-axis" aria-hidden="true"><span>접근 방향</span><svg viewBox="0 0 150 14" fill="none" stroke="currentColor"><path d="M0 7h148m-7-5 7 5-7 5"/></svg></div>${selected.length ? `<div class="op-formation-units">${selected.map(ship => `<div class="op-formation-unit" style="--op-role-color:${ship.color}"><span>${roleIcon(ship.id)}</span><div><strong>${ship.name} <b>×${draft.counts[ship.id]}</b></strong><small>${ship.role}</small></div></div>`).join('')}</div>` : '<p class="op-formation-empty">함선을 선택하면 역할 구성이 여기에 표시됩니다.</p>'}</div>`;
}

export function renderPracticeSummary(state, ui) {
  if (state?.connection !== 'ready') return unavailable(state);
  const planet = currentPlanet(state);
  const draft = operationDraft(ui, planet);
  const summary = operationSummary(ui, planet);
  return `<div class="op-section-head"><div><span class="op-kicker">편성 요약</span><h2 id="practice-summary-heading" tabindex="-1">편성 요약</h2></div>${badge(summary.valid ? '기본 조건 충족' : '보완 필요', summary.valid ? 'success' : 'warning')}</div><p class="op-summary-mission">${escape(currentMission(ui).title)}<span>${escape(planetName(planet))}</span></p>${formation(draft)}${metrics(summary, 'practice')}<div class="op-section-head op-check-heading"><h3>준비 조건</h3><span>전투 성과는 계산하지 않습니다</span></div>${readinessChecks(summary)}${issueList(summary)}${summary.recommendations.length ? `<p class="op-role-recommendation"><strong>작전 역할 제안</strong> ${escape(summary.recommendations.join(' '))} 출격에 꼭 필요한 조건은 아닙니다.</p>` : '<p class="op-role-recommendation">선택한 작전에서 제안하는 역할이 모두 포함되어 있습니다.</p>'}`;
}

export function renderPracticeResult(state, ui) {
  const planet = currentPlanet(state);
  const review = ui?.review;
  if (state?.connection !== 'ready' || !review || review.planet.id !== planetId(planet) || review.mission !== currentMission(ui).id) return '';
  const mission = missions.find(candidate => candidate.id === review.mission);
  const summary = review.summary;
  return `<section class="ws-card op-result op-result-card${summary.valid ? ' op-result-ready' : ' op-result-needs-fix'}" aria-labelledby="practice-result-title"><span class="op-kicker">편성 점검</span><h2 id="practice-result-title" tabindex="-1">${summary.valid ? '기본 준비 조건을 충족합니다' : '편성 보완이 필요합니다'}</h2><p class="op-result-context">${escape(review.planet.name)} · ${escape(mission.title)}</p><p class="op-result-disclaimer">이번에 확인한 편성의 준비 조건입니다. 전투 승패·보상·소요 시간은 산출하지 않습니다.</p><div class="op-result-formation"><h3>확인한 편성</h3><p>${ships.filter(ship => review.draft.counts[ship.id] > 0).map(ship => `${ship.name} ${review.draft.counts[ship.id]}척`).join(' · ') || '선택한 함선 없음'}</p><span>${supports[review.draft.support]} · ${approaches[review.draft.approach]}</span></div>${metrics(summary)}${readinessChecks(summary)}${issueList(summary)}${summary.valid ? '<p class="op-result-conclusion">편성 수량과 접근 조건을 확인했습니다. 다음 출항에 사용할 편성을 준비하세요.</p>' : '<p class="op-result-conclusion">위 안내에 따라 편성을 고친 뒤 다시 확인하세요.</p>'}${actualCommand('practice-result')}<button class="ws-text-button" id="practice-cancel-review" data-operation-cancel-review>점검 결과 닫기 <span aria-hidden="true">×</span></button></section>`;
}

export function renderPractice(state, ui) {
  const planet = currentPlanet(state);
  if (state?.connection !== 'ready') return `<div class="op-workspace op-practice">${practiceToolbar(state, ui, planet)}${unavailable(state)}<div id="practice-summary"></div><div id="practice-review-result"></div></div>`;
  return `<div class="op-workspace op-practice">${lead(planet, '보유 함선으로 역할과 지원을 비교하고, 작전에 필요한 준비 조건을 확인하세요.')}${practiceToolbar(state, ui, planet)}<div class="op-practice-topline"><p>함선 수량은 현지 보유량 안에서 조절할 수 있습니다.</p><button class="ws-text-button" id="practice-summary-jump" data-operation-focus-summary>편성 요약으로 이동 <span aria-hidden="true">↓</span></button></div><div class="op-practice-grid"><div class="op-editor-column">${shipEditor(ui, planet)}${operationChoices(ui, planet)}</div><div class="op-summary-column"><section class="ws-card op-summary-card" aria-labelledby="practice-summary-heading"><div id="practice-summary">${renderPracticeSummary(state, ui)}</div><button class="ws-button ws-button-primary op-review-button" id="practice-review">편성 점검하기${arrow}</button><p class="op-note op-review-note">현재 편성만 점검합니다. 확인 뒤 수량이나 선택을 바꾸면 결과가 지워집니다.</p></section><div id="practice-review-result">${renderPracticeResult(state, ui)}</div>${actualCommand('practice')}</div></div></div>`;
}
