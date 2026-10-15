import { initialDemo, transition, visualFacilities } from './model.js';
import { drawPlanet } from './planet.js';

const paths = {
  planet: '<circle cx="12" cy="12" r="7"/><ellipse cx="12" cy="12" rx="11" ry="3" transform="rotate(-30 12 12)"/>',
  build: '<path d="m14 3 7 7-4 4-3-3-8 10-3-3 10-8-3-3z"/>',
  research: '<path d="M9 3h6M10 3v7L4 20h16l-6-10V3M8 14h8"/>',
  fleet: '<path d="m12 2 9 18-9-5-9 5zM12 8v7"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6z"/>',
  galaxy: '<path d="M12 3c6-2 12 6 7 10-4 4-10-3-5-5 6-1 8 8 2 12-6 4-15-3-12-9 2-5 8-5 9 0 0 3-3 4-5 2"/>',
  guild: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4M17 5a3 3 0 0 1 0 6M19 14a5 5 0 0 1 2 4v3"/>',
  reports: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7"/>',
  practice: '<path d="m3 7 9-5 9 5-9 5zM3 12l9 5 9-5M3 17l9 5 9-5"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  settings: '<path d="m10 2-1 3-3 1-3-1-2 4 2 3-1 3 3 3 3-1 3 2 4-2v-3l3-2-1-4-3-1-1-3z"/><circle cx="11" cy="11" r="3"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 10v7M12 7v.1"/>',
  warning: '<path d="m12 3 10 18H2zM12 9v5M12 17v.1"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
  expand: '<path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5"/>',
  station: '<path d="M10 7h4v10h-4zM2 5h5v14H2zM17 5h5v14h-5zM7 12h3M14 12h3M12 3v4M12 17v4"/>',
  alloy: '<path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10"/>',
  crystal: '<path d="m12 2 8 8-8 12L4 10zM4 10h16M12 2 9 10l3 12 3-12z"/>',
  fuel: '<path d="M12 2C9 8 5 11 5 15a7 7 0 0 0 14 0c0-4-4-7-7-13zM9 15a3 3 0 0 0 3 3"/>',
};
const stationArt = '<svg viewBox="0 0 160 76" fill="none" aria-hidden="true"><g stroke="#8fa8ba" stroke-width="1"><path d="m5 23 42-9 6 32-42 9zM108 12l43 9-6 32-43-9z" fill="#1d3648"/><path d="m16 21 6 32m5-34 6 32m5-34 6 32M10 34l40-9M12 44l40-9M119 15l-6 31m17-29-6 31m17-29-6 31m-25-26 40 9m-42 1 40 9" opacity=".7"/><path d="m46 29 68-3-1 9-66 3z" fill="#617789"/><path d="m65 20 20-7 17 9-3 26-22 8-14-10z" fill="#7f919c"/><path d="m65 20 12 10 25-8M77 30v26"/><path d="m72 25 11-4 9 5-11 4z" fill="#bad3dc"/><path d="m83 35 12-4-1 9-12 4z" fill="#163548"/><path d="M81 14V4m-6 0h12M69 49l-8 13m36-14 8 13"/><g class="station-extension"><path d="m73 56 13-5 4 12-14 5z" fill="#a0aeb6"/><path d="M77 68v6m5-7v6"/></g></g><circle cx="80" cy="9" r="1.2" fill="#e0b975"/><circle cx="112" cy="30" r="1.1" fill="#68b6ce"/></svg>';
const icon = kind => kind === 'station' ? stationArt : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[kind] || paths.info}</svg>`;
function hydrateIcons(scope = document) { scope.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); }); }
const $ = id => document.getElementById(id);
const names = { alloy: '합금', crystal: '결정', fuel: '연료' };
const facilityNames = { alloyMine: '합금 광산', crystalMine: '결정 채굴소', fuelRefinery: '연료 합성소', powerPlant: '발전소', shipyard: '궤도 조선소', laboratory: '연구소' };
const titles = { planet: '행성 시설 개요', resources: '자원과 현지 생산', construction: '건설 관리', research: '연구 관리', fleet: '함대 현황', career: '개인 작전', galaxy: '은하 · 정찰', guild: '동맹 · 공동 작전', reports: '활동 보고서', practice: '편성 연습', threat: '적 함대 접근 · 예시', evasion: '함대 회피 검토', defense: '방어 현황', more: '제국 메뉴', settings: '화면 설정', rankings: '랭킹', diplomacy: '외교 · 메시지' };
let state = initialDemo();
let panel = null, opener = null, retryTimer;
const dialog = $('detail-dialog');
const planet = () => state.planets.find(p => p.id === state.selected);
const format = n => n.toLocaleString('ko-KR');
const stat = (label, value) => `<div class="detail-stat"><span>${label}</span><strong>${value}</strong></div>`;
function bookmark(element) {
  if (!(element instanceof HTMLElement)) return null;
  return { element, id: element.id, scope: element.closest('[id]')?.id, label: element.getAttribute('aria-label'), panel: element.dataset.panel };
}
function resolveBookmark(saved) {
  if (!saved) return null;
  if (saved.element.isConnected) return saved.element;
  if (saved.id && $(saved.id)) return $(saved.id);
  const scope = saved.scope ? $(saved.scope) : document;
  if (!scope) return null;
  return [...scope.querySelectorAll('button,input,select,a')].find(el => saved.label ? el.getAttribute('aria-label') === saved.label : saved.panel && el.dataset.panel === saved.panel) || null;
}
function announce(text) { $('announcement').textContent = text; }
function act(action) {
  const previousThreat = state.threat;
  state = transition(state, action);
  render();
  if (action.type === 'threat' && !previousThreat) $('urgent-announcement').textContent = '적 함대 접근 예시. 대상 노바 프라임. 남은 시간 2분 40초는 고정 예시입니다. 회피 검토에서 실제 명령은 전송되지 않습니다.';
  if (action.type === 'idle' || action.type === 'reset') $('urgent-announcement').textContent = '';
  if (action.type === 'complete') announce(state.notice.text + '. 실제 건설은 변경되지 않았습니다.');
  if (action.type === 'select') announce(planet().name + ' 예시 스냅샷을 선택했습니다.');
  if (action.type === 'snapshot') announce('시설 예시 스냅샷을 변경했습니다. 생산 시설, 조선소 수준이 행성에 반영됩니다.');
}
function render() {
  const focused = bookmark(document.activeElement);
  const p = planet(), v = visualFacilities(p), unavailable = state.connection === 'loading';
  document.body.classList.toggle('has-threat', !!state.threat);
  $('planet-select').value = p.id;
  $('planet-name').textContent = p.name;
  $('planet-kind').textContent = p.kind + ' · 예시 스냅샷';
  $('resources').innerHTML = Object.keys(names).map(key => `<button class="resource" data-panel="resources" aria-label="${names[key]} 자원 상세" aria-describedby="resource-info-${key}"><span class="resource-icon">${icon(key)}</span><span class="resource-label">${names[key]}<em>+${p.rates[key]}/분</em></span><strong>${unavailable ? '—' : format(p.resources[key])}</strong><span class="sr-only" id="resource-info-${key}">${unavailable ? '불러오는 상태 예시' : `예시 보유 ${p.resources[key]}, 생산 분당 ${p.rates[key]}, 저장 한도 ${p.capacities[key]}`}</span></button>`).join('');
  $('production-value').innerHTML = (unavailable ? '—' : '+' + Object.values(p.rates).reduce((a,b) => a+b,0)) + ' <small>/분</small>';
  $('fleet-value').innerHTML = (unavailable ? '—' : p.ships) + ' <small>척</small>';
  $('facility-value').innerHTML = (unavailable ? '—' : Object.values(p.facilities).filter(n => n > 0).length) + ' <small>종</small>';
  $('surface-count').textContent = Object.entries(p.facilities).filter(([key, n]) => ['alloyMine','crystalMine','fuelRefinery'].includes(key) && n > 0).length + '개 생산 시설';
  $('orbit-level').textContent = 'Lv.' + v.orbit;
  $('orbit-facility').hidden = !v.orbit;
  $('orbit-facility').dataset.level = v.orbit;
  const districts = [[68,49],[64,57],[59,65],[56,73],[62,38],[70,60],[49,36],[46,78],[53,58],[63,70]];
  $('surface-markers').innerHTML = Array.from({length: v.industry + v.power + v.research}, (_,i) => { const [x,y]=districts[i%districts.length]; return `<i class="surface-marker" style="left:${x}%;top:${y}%;rotate:${i*19}deg"></i>`; }).join('');
  $('planet-scene').setAttribute('aria-label', p.name + ' 시설 개요 열기');
  $('planet-visual-description').textContent = '예시 시설. ' + Object.entries(p.facilities).map(([key,level]) => facilityNames[key] + ' 수준 ' + level).join(', ') + '. 자연 지형과 별도로 시설 수준에 따라 표면 불빛과 궤도 시설이 변합니다.';
  const renderingStarted = performance.now();
  $('planet-scene').setAttribute('aria-busy', 'true');
  drawPlanet($('planet-canvas'), p).then(() => {
    performance.measure('planet-render', { start: renderingStarted, end: performance.now() });
    if (planet().id === p.id) $('planet-scene').setAttribute('aria-busy', 'false');
  });
  $('planet-status').className = 'status-pill' + (state.threat?.planetId === p.id ? ' danger' : '');
  $('planet-status').textContent = state.threat?.planetId === p.id ? '△ 적 접근 · 예시' : '● 평시 · 예시';
  document.querySelectorAll('[data-state]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.state === (state.threat ? 'threat' : state.notice ? 'complete' : 'idle'))));
  $('threat-banner').hidden = !state.threat;
  if (state.threat) $('threat-banner').innerHTML = `${icon('warning')}<div><strong>적 함대 접근 · 노바 프라임 · 예시</strong><p><span>도착까지 ${state.threat.eta} · 고정 예시</span><span class="threat-demo-note">실제 공격 아님</span></p></div><button class="button danger" data-panel="evasion">회피 계획 검토 ${icon('fleet')}</button>`;
  $('context').innerHTML = contextContent();
  $('mobile-priority').hidden = !!state.threat;
  $('mobile-priority').className = 'mobile-priority' + (state.notice ? ' complete' : '');
  $('mobile-priority').innerHTML = state.notice ? '<div><span>✓ 완료 피드백 · 예시</span><strong>실제 자산 변화 없음</strong></div><button class="button secondary" data-panel="reports">결과 예시 확인</button>' : `<div><span>${state.empty || p.id === 'vesper' ? '다음 계획' : '건설 진행 · 고정 예시'}</span><strong>${state.connection !== 'ready' ? '연결 상태 예시' : state.empty || p.id === 'vesper' ? '진행 중인 작업 없음' : '연료 합성소 · 01:24'}</strong></div><button class="button secondary" data-panel="construction">건설 관리</button>`;
  $('queue').innerHTML = unavailable ? '<p class="empty-state">불러오는 상태 예시 · 서버 요청 없음</p>' : state.empty || p.id === 'vesper' ? '<p class="empty-state"><strong>진행 중인 작업 없음</strong>건설이나 연구에서 다음 계획을 확인하세요.</p>' : `<div class="queue-row">${icon('build')}<div><strong>연료 합성소 Lv.2</strong><small>건설 · 고정 예시</small></div><div class="progress-track" role="progressbar" aria-label="건설 진행 예시" aria-valuenow="62" aria-valuemin="0" aria-valuemax="100"><i style="width:62%"></i></div><time>01:24 예시</time></div><div class="queue-row">${icon('research')}<div><strong>산업 기술 Lv.1</strong><small>공통 연구 · 노바 프라임 · 예시</small></div><div class="progress-track" role="progressbar" aria-label="연구 진행 예시" aria-valuenow="28" aria-valuemin="0" aria-valuemax="100"><i style="width:28%"></i></div><time>03:10 예시</time></div>`;
  $('event-feed').innerHTML = state.notice ? `<div class="event-row">${icon('check')}<div>${state.notice.text}<small>시연 이벤트 · 실제 건설 변화 없음</small></div></div>` : `<div class="event-row">${icon('planet')}<div>${p.name} 스냅샷<small>기록 예시 · 서버 기록 아님</small></div></div><div class="event-row">${icon('info')}<div>행성 시설이 표면에 반영됩니다.<small>시설 수준 기반의 시각화 실험</small></div></div>`;
  $('connection-state').hidden = state.connection === 'ready';
  if (state.connection !== 'ready') $('connection-state').innerHTML = state.connection === 'loading' ? '<strong>불러오는 상태 예시</strong><p>서버 요청 없이 로딩 표현만 검토합니다.</p>' : `<div><strong>연결 오류 예시 · 마지막 예시 스냅샷</strong><p>실제 서버에 연결하지 않았습니다. 명령을 실행할 수 없습니다.</p></div><button class="button secondary" id="retry-button">다시 표시 · 데모</button>`;
  $('empty-button').setAttribute('aria-pressed', String(state.empty));
  $('offline-button').setAttribute('aria-pressed', String(state.connection === 'offline'));
  if (dialog.open && panel) renderPanel();
  if (focused && !focused.element.isConnected && document.activeElement === document.body) {
    (resolveBookmark(focused) || (dialog.open ? $('dialog-close') : $('planet-select'))).focus({preventScroll:true});
  }
}
function contextContent() {
  if (state.threat) return `<article class="decision-card threat"><div class="card-icon">${icon('warning')}</div><span class="overline">위협 우선 · 예시</span><h3>노바 프라임에<br>적 함대 접근</h3><p>선택 행성은 ${planet().name}입니다.<br>대응 전 위협 대상과 함대를 확인하세요.</p><div class="job-time"><span>도착까지 · 고정 예시</span><strong>02:40</strong></div><button class="button secondary" data-panel="threat">위협 상세 보기 ${icon('compass')}</button>${state.notice ? `<div class="inline-feedback">${state.notice.text}<br>위협 예시는 계속 유지됩니다.</div>` : ''}</article>`;
  if (state.notice) return `<article class="decision-card complete"><div class="card-icon">${icon('check')}</div><span class="overline">완료 피드백 · 시연 이벤트</span><h3>다음 성장을<br>준비할 시간.</h3><p>${state.notice.text}<br>실제 완료나 자산 변화를 뜻하지 않습니다.</p><button class="button" data-panel="reports">완료 예시 확인 ${icon('reports')}</button></article>`;
  if (state.connection !== 'ready') return `<article class="decision-card"><div class="card-icon">${icon('info')}</div><span class="overline">${state.connection === 'offline' ? '연결 오류' : '로딩'} 예시</span><h3>명령은 실행되지<br>않습니다.</h3><p>네트워크 요청이 없는 독립 데모입니다. 상태 표현과 복귀 경로를 확인하세요.</p><button class="button secondary" data-panel="resources">예시 데이터 확인</button></article>`;
  if (state.empty || planet().id === 'vesper') return `<article class="decision-card"><div class="card-icon">${icon('build')}</div><span class="overline">새로운 계획</span><h3>다음 개발을<br>선택하세요.</h3><p>진행 중인 작업이 없습니다. 시설 목록에서 다음 투자 대상을 검토할 수 있습니다.</p><button class="button" data-panel="construction">건설 관리 열기 ${icon('build')}</button></article>`;
  return `<article class="decision-card"><div class="card-icon">${icon('build')}</div><span class="overline">건설 진행 · 예시</span><h3>연료 합성소<br>Lv.1 <span style="color:var(--dn-tertiary)">→</span> Lv.2</h3><p>투자가 성장으로 이어지는 순간.<br>완료 후 효과와 다음 조건을 확인하세요.</p><div class="job-time"><span>남은 시간 · 고정 예시</span><strong>01:24</strong></div><div class="progress-track" role="progressbar" aria-label="주요 건설 진행 예시" aria-valuenow="62" aria-valuemin="0" aria-valuemax="100"><i style="width:62%"></i></div><button class="button" data-panel="construction">건설 관리 열기 ${icon('build')}</button></article>`;
}
function openPanel(next, source) {
  const wasOpen = dialog.open;
  if (!wasOpen) opener = bookmark(source || document.activeElement);
  panel = next;
  renderPanel();
  $('dialog-content').scrollTop = 0;
  if (!dialog.open) dialog.showModal();
  (wasOpen ? $('dialog-title') : $('dialog-close')).focus({preventScroll: true});
}
function renderPanel() {
  const p = planet();
  $('dialog-title').textContent = titles[panel] || '상세';
  const unavailable = '<div class="detail-callout">현재 데모에서는 서버 미연결입니다. 기존 게임에서 실제 기능을 사용할 수 있습니다.</div>';
  const disabled = label => `<button class="button secondary" disabled aria-describedby="command-reason">${label}</button><p id="command-reason" class="drawer-demo">현재 미연결 · 실제 명령 전송 불가</p>`;
  let html = '';
  if (panel === 'resources') html = `<p>${p.name}의 예시 보유량과 분당 생산량입니다. 두 수치는 서로 다릅니다.</p>` + Object.keys(names).map(key => `${stat(names[key] + ' 보유 / 저장 한도', format(p.resources[key]) + ' / ' + format(p.capacities[key]))}${stat(names[key] + ' 생산', '+' + p.rates[key] + ' /분')}`).join('');
  else if (panel === 'planet' || panel === 'construction') html = `<p>${p.name} · ${p.kind}. 개별 시설의 수준을 표면 활동과 궤도 시설에 직접 반영합니다. 전체 성장 등급은 임의 정의하지 않았습니다.</p>` + Object.entries(p.facilities).map(([key,level]) => stat(facilityNames[key], 'Lv.' + level)).join('') + `<div class="detail-callout">시설 스냅샷 변경은 아트 연결 예시입니다. 비용·생산 수치·완료 기록은 변경하지 않습니다.</div>` + (panel === 'construction' ? disabled('실제 건설 · 미연결') : '<button class="button secondary" data-panel="construction">건설 관리 열기</button>');
  else if (panel === 'fleet') html = `<p>${p.name}의 함대 예시 스냅샷입니다.</p>${stat('보유 함선', p.ships + '척')}${stat('출격 가능', p.ships + '척 · 예시')}${stat('출격 중', '0척 · 예시')}${stat('수리 필요', '0척 · 예시')}${unavailable}${disabled('함대 명령 · 미연결')}`;
  else if (panel === 'research') html = `<p>현재 공통 연구와 현지 연구소를 구분합니다.</p>${stat('현재 행성', p.name)}${stat('현지 연구소', 'Lv.' + p.facilities.laboratory)}${stat('공통 연구 예시', state.empty ? '진행 중인 연구 없음' : '산업 기술 Lv.1')}${stat('연구 행성', '노바 프라임 · 예시')}${stat('남은 시간', state.empty ? '—' : '03:10 · 고정 예시')}${unavailable}${disabled('연구 시작 · 미연결')}`;
  else if (['threat','evasion','defense'].includes(panel)) {
    if (!state.threat) html = '<div class="empty-state"><strong>현재 위협 예시 없음</strong>상태 시연에서 적 함대 접근을 선택하세요.</div>';
    else html = `<div class="detail-callout danger">${icon('warning')} 적 접근은 시연 이벤트입니다. 실제 공격/도착 시각/회피 결과가 아닙니다.</div>${stat('위협 대상', '노바 프라임')}${stat('선택 중인 행성', p.name)}${stat('이벤트 유형', '적 함대 접근 · 예시')}${stat('도착까지', '02:40 · 고정 예시')}` + (panel === 'evasion' ? `${stat('대상 함대', '노바 프라임 보유 10척 · 예시')}${stat('목적지', '현재 미연결')}${stat('이동 시간 / 연료 비용', '현재 미연결')}<p>함대 이동 기능이 연결되어 있지 않습니다. 이동 결과를 미리 판단할 수 없으며, 실제 명령은 전송되지 않습니다.</p>${disabled('함대 이동 확정 · 미연결')}` : panel === 'defense' ? `${stat('현지 방어', state.planets[0].defenses + '기 · 예시')}<p>방어 결과와 생존 확률은 산출하지 않습니다.</p>` : `<button class="button secondary" data-panel="defense">방어 현황 확인</button><button class="button secondary" data-panel="evasion">함대 회피 검토</button>`);
  }
  else if (panel === 'reports') html = `<p>이 화면의 로그는 디자인 검토용입니다. 서버 영수증이나 실제 건설 결과를 대신하지 않습니다.</p>${state.notice ? `<div class="detail-callout">${state.notice.text}<br>실제 자산 변화 없음</div>` : '<div class="empty-state">완료 예시가 없습니다. 행동 완료 시연으로 확인하세요.</div>'}${stat('선택 행성', p.name)}${stat('데이터 출처', '독립 데모 데이터')}`;
  else if (panel === 'settings') html = '<p>시스템의 모션 감소 설정을 자동 반영합니다. 장식 움직임은 아래에서 추가로 정지할 수 있습니다.</p><label class="setting-row"><input type="checkbox" id="pause-motion">행성 주변 움직임 정지</label><div class="detail-callout">장식용 움직임만 정지합니다. 경보와 진행 정보는 계속 표시됩니다.</div>';
  else if (panel === 'more') html = '<div class="drawer-menu">' + ['career','galaxy','defense','guild','diplomacy','rankings','reports','practice','settings'].map(key => `<button data-panel="${key}">${titles[key]}<small>${['galaxy','diplomacy','rankings'].includes(key) ? '현재 API 없음' : '데모 상세'}</small></button>`).join('') + '</div>';
  else if (panel === 'career') html = `<p>기존 개인 작전은 실제 보유 함선을 편성해 출격·귀환·정비하는 기능입니다. 이번 데모에서는 기존 기능을 보존하고 진입 위치를 검토합니다.</p>${stat('대상 행성', p.name)}${unavailable}${disabled('작전 출격 · 미연결')}`;
  else if (panel === 'guild') html = `<p>기존 동맹 공동 작전의 참가자 연결·역할 편성·공동 명령을 유지합니다. 명령 영수증은 기존 서버가 관리합니다.</p>${unavailable}${disabled('공동 작전 · 미연결')}`;
  else if (panel === 'practice') html = '<p>기존 편성 연습은 개인 서버 자산과 분리된 로컬 기능입니다. 이 디자인 데모는 연습 저장도 읽거나 쓰지 않습니다.</p><div class="detail-callout">상단의 기존 게임으로 돌아가기를 통해 편성 연습을 사용할 수 있습니다.</div>';
  else html = `<p>${titles[panel]}는 현재 운영 API에서 제공되지 않습니다. 이번 UI 검토에서 결과·순위·정찰 정보를 생성하지 않습니다.</p>${unavailable}${disabled('현재 미연결')}`;
  $('dialog-content').innerHTML = html;
  if (panel === 'settings') $('pause-motion').checked = document.body.classList.contains('motion-paused');
}
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.panel) openPanel(button.dataset.panel, button);
  else if (button.hasAttribute('data-home')) { closePanel(); $('main').focus(); window.scrollTo({top: 0}); }
  else if (button.dataset.state) act({type: button.dataset.state});
  else if (button.id === 'snapshot-button') act({type: 'snapshot'});
  else if (button.id === 'empty-button') act({type: 'empty'});
  else if (button.id === 'offline-button') { clearTimeout(retryTimer); act({type: 'connection', value: state.connection === 'offline' ? 'ready' : 'offline'}); }
  else if (button.id === 'reset-button') { clearTimeout(retryTimer); act({type: 'reset'}); announce('데모를 초기화했습니다.'); }
  else if (button.id === 'retry-button') { act({type: 'connection', value: 'loading'}); retryTimer = setTimeout(() => { act({type: 'connection', value: 'ready'}); announce('예시 스냅샷을 다시 표시했습니다. 실제 서버 연결은 없습니다.'); }, 700); }
});
$('planet-select').addEventListener('change', event => act({type: 'select', id: event.target.value}));
function closePanel() { if (dialog.open) dialog.close(); }
$('dialog-close').addEventListener('click', closePanel);
$('dialog-return').addEventListener('click', closePanel);
dialog.addEventListener('close', () => { panel = null; (resolveBookmark(opener) || $('planet-select')).focus({preventScroll: true}); });
dialog.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const items = [...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]')].filter(el => el.getClientRects().length);
  const first = items[0], last = items.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
dialog.addEventListener('click', event => { const r = dialog.getBoundingClientRect(); if (event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) closePanel(); });
document.addEventListener('change', event => { if (event.target.id === 'pause-motion') document.body.classList.toggle('motion-paused', event.target.checked); });
document.addEventListener('visibilitychange', () => document.body.classList.toggle('page-hidden', document.hidden));
hydrateIcons();
render();
// A fixed mobile bar must reserve its actual height when text or labels grow.
const navigation = document.querySelector('.sidebar');
new ResizeObserver(() => {
  document.documentElement.style.setProperty('--dn-nav-clearance', Math.ceil(navigation.getBoundingClientRect().height + 6) + 'px');
}).observe(navigation);
