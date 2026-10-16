import {icon as uiIcon} from './icons.js';
import { initialDemo, transition, visualFacilities } from './model.js';
import { drawPlanet, syncPlanetMotion } from './planet.js';
import { facilityCards, facilityPreview } from './presentation.js';
import { createRoutePreview } from './route-preview.js';
import { createDemoNavigation } from './navigation.js';
import { workspaceTitles, renderWorkspace, renderFacilityDetail } from './workspace.js';
import { galaxyTargets, initialGalaxy, transitionGalaxy, visibleGalaxyTargets, selectedGalaxyTarget, renderGalaxyContent, renderGalaxyReport } from './galaxy.js';
import { missions, ships, initialOperations, operationDraft, operationInventory, transitionOperations, renderPracticeSummary, renderPracticeResult } from './operations.js';
import { allianceRoles, initialAlliance, transitionAlliance } from './alliance.js';
import { initialStrategy,strategyShips,strategyFleet,strategySummary,transitionStrategy } from './strategy-model.js';
import { renderStrategyPicked,renderStrategyMetrics,renderStrategyEstimate } from './strategy.js';

const stationArt = '<svg viewBox="0 0 160 76" fill="none" aria-hidden="true"><g stroke="#8fa8ba" stroke-width="1"><path d="m5 23 42-9 6 32-42 9zM108 12l43 9-6 32-43-9z" fill="#1d3648"/><path d="m16 21 6 32m5-34 6 32m5-34 6 32M10 34l40-9M12 44l40-9M119 15l-6 31m17-29-6 31m17-29-6 31m-25-26 40 9m-42 1 40 9" opacity=".7"/><path d="m46 29 68-3-1 9-66 3z" fill="#617789"/><path d="m65 20 20-7 17 9-3 26-22 8-14-10z" fill="#7f919c"/><path d="m65 20 12 10 25-8M77 30v26"/><path d="m72 25 11-4 9 5-11 4z" fill="#bad3dc"/><path d="m83 35 12-4-1 9-12 4z" fill="#163548"/><path d="M81 14V4m-6 0h12M69 49l-8 13m36-14 8 13"/><g class="station-extension"><path d="m73 56 13-5 4 12-14 5z" fill="#a0aeb6"/><path d="M77 68v6m5-7v6"/></g></g><circle cx="80" cy="9" r="1.2" fill="#e0b975"/><circle cx="112" cy="30" r="1.1" fill="#68b6ce"/></svg>';
const icon = kind => kind === 'station' ? stationArt : uiIcon(kind);
function hydrateIcons(scope = document) { scope.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); }); }
const $ = id => document.getElementById(id);
const names = { alloy: '합금', crystal: '결정', fuel: '연료' };
const facilityNames = { alloyMine: '합금 광산', crystalMine: '결정 채굴소', fuelRefinery: '연료 합성소', powerPlant: '발전소', shipyard: '궤도 조선소', laboratory: '연구소' };
const titles = { recon:'정찰 위성 · 예시', planet: '행성 시설 개요', resources: '자원과 현지 생산', construction: '건설 관리', research: '연구 관리', fleet: '함대 현황', career: '개인 작전', galaxy: '은하 · 정찰', guild: '동맹 · 공동 작전', reports: '활동 보고서', practice: '편성 연습', threat: '적 함대 접근 · 예시', evasion: '함대 회피 검토', defense: '방어 현황', more: '제국 메뉴', settings: '화면 설정', rankings: '랭킹', diplomacy: '외교 · 메시지' };
let state = initialDemo();
let galaxyUI = initialGalaxy(), pendingGalaxyUI = null, scanTimer, scanSerial = 0;
let operationsUI = initialOperations();
let allianceUI = initialAlliance();
let strategyUI = initialStrategy();
let panel = null, opener = null, retryTimer, selectedFacility = 'fuelRefinery', view = 'home', navigationController;
let demoReady=false,planetRenderKey;
const screenMemory = new Map();
const dialog = $('detail-dialog');
const demoEvents = new window.AbortController();
const listen = (target,type,listener) => target.addEventListener(type,listener,{signal:demoEvents.signal});
const routePreview = createRoutePreview(()=>state);
const planet = () => state.planets.find(p => p.id === state.selected);
const format = n => n.toLocaleString('ko-KR');
const stat = (label, value) => `<div class="detail-stat"><span>${label}</span><strong>${value}</strong></div>`;
function bookmark(element) {
  if (!(element instanceof HTMLElement)) return null;
  return { element, id: element.id, scope: element.closest('[id]')?.id, label: element.getAttribute('aria-label'), panel: element.dataset.panel, facility:element.dataset.facility, view:element.dataset.view, workspaceFacility:element.dataset.workspaceFacility };
}
function resolveBookmark(saved) {
  if (!saved) return null;
  const available = el => {
    if (!el?.isConnected || el.closest('[hidden],dialog:not([open])')) return false;
    for (let node=el;node instanceof HTMLElement;node=node.parentElement) if (getComputedStyle(node).display === 'none') return false;
    return true;
  };
  if (available(saved.element)) return saved.element;
  if (saved.id && available($(saved.id))) return $(saved.id);
  const scope = saved.scope ? $(saved.scope) : document;
  if (!scope) return null;
  return [...scope.querySelectorAll('button,input,select,a')].filter(available).find(el => saved.label ? el.getAttribute('aria-label') === saved.label : saved.workspaceFacility ? el.dataset.workspaceFacility === saved.workspaceFacility : saved.facility ? el.dataset.facility === saved.facility : saved.view ? el.dataset.view === saved.view : saved.panel && el.dataset.panel === saved.panel) || null;
}
function announce(text) { $('announcement').textContent = text; }
// Hidden workspaces do not allocate a WebGL scene or fetch its textures.
function renderVisiblePlanet(){
  if(!demoReady||view!=='home')return;
  const p=planet(),key=JSON.stringify([p.id,p.facilities]);
  if(key===planetRenderKey){syncPlanetMotion($('planet-canvas'));return;}
  planetRenderKey=key;const started=performance.now();
  $('planet-scene').setAttribute('aria-busy','true');
  drawPlanet($('planet-canvas'),p).then(()=>{
    performance.measure('planet-render',{start:started,end:performance.now()});
    if(planetRenderKey===key)$('planet-scene').setAttribute('aria-busy','false');
  });
}
function act(action) {
  if(action.type==='reset')strategyUI=initialStrategy();
  else if(action.type==='select'||action.type==='connection'&&action.value!=='ready')strategyUI=transitionStrategy(strategyUI,{type:'cancel-review'},state);
  if (action.type === 'reset') allianceUI = initialAlliance();
  else if (action.type === 'select' || action.type === 'connection' && action.value !== 'ready') allianceUI = transitionAlliance(allianceUI,{type:'cancel-review'},planet());
  if (action.type === 'reset') operationsUI = initialOperations();
  else if (action.type === 'select' || action.type === 'connection' && action.value !== 'ready') operationsUI = transitionOperations(operationsUI,{type:'cancel-review'},planet());
  if (action.type === 'reset' || action.type === 'connection' && action.value !== 'ready') {
    clearTimeout(scanTimer);
    galaxyUI = action.type === 'reset' ? initialGalaxy() : transitionGalaxy(galaxyUI,{type:'scan-cancel'});
  }
  const previousThreat = state.threat;
  state = transition(state, {...action,now:routePreview.now()});
  render();
  if(action.type==='reset'&&view==='command')navigationController.go({target:strategyUI.target,intent:strategyUI.intent,context:strategyUI.context,step:'fleet'},{replace:true});
  else if(view==='command'&&navigationController?.current.step==='confirm'&&!strategyUI.review)navigationController.go({step:'fleet'},{replace:true});
  if (action.type === 'reset' && view === 'galaxy') navigationController.go({target:galaxyUI.target},{replace:true});
  if (action.type === 'reset' && ['career','practice'].includes(view)) navigationController.go({mission:operationsUI.mission,intent:strategyUI.intent},{replace:true});
  if (action.type === 'reset' && view === 'guild') navigationController.go({role:allianceUI.role},{replace:true});
  if (action.type === 'arrival') $('urgent-announcement').textContent = '5초 뒤 외곽 도달 효과를 표시하는 시연입니다. 실제 공격은 실행되지 않습니다.';
  if (action.type === 'threat' && !previousThreat) $('urgent-announcement').textContent = '적 함대 접근 예시. 대상 노바 프라임. 남은 시간 2분 40초부터 항로 위치와 함께 진행하는 시연입니다. 회피 검토에서 실제 명령은 전송되지 않습니다.';
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
  $('resources').innerHTML = Object.keys(names).map(key => `<button class="resource" data-panel="resources" aria-label="${names[key]} 자원 상세" aria-describedby="resource-info-${key}"><span class="resource-icon">${icon(key)}</span><span class="resource-label">${names[key]}<em>${unavailable?'—':'+'+p.rates[key]+'/분'}</em></span><strong>${unavailable ? '—' : format(p.resources[key])}<small> / ${unavailable?'—':p.capacities[key]}</small></strong><span class="storage-meter" aria-hidden="true"><i style="width:${unavailable?0:p.resources[key]/p.capacities[key]*100}%"></i></span><span class="sr-only" id="resource-info-${key}">${unavailable ? '불러오는 상태 예시' : `예시 보유 ${p.resources[key]}, 생산 분당 ${p.rates[key]}, 저장 한도 ${p.capacities[key]}`}</span></button>`).join('');
  $('production-value').innerHTML = Object.keys(names).map(key=>`<span class="rate-value" title="${names[key]}">${icon(key)}${unavailable?'—':'+'+p.rates[key]}</span>`).join('');
  $('fleet-value').innerHTML = (unavailable ? '—' : p.ships) + ' <small>/ ' + (unavailable?'—':p.ships) + '척</small>';
  $('facility-value').innerHTML = (unavailable ? '—' : Object.values(p.facilities).filter(n => n > 0).length) + ' <small>종</small>';
  $('surface-count').textContent = Object.entries(p.facilities).filter(([key, n]) => ['alloyMine','crystalMine','fuelRefinery'].includes(key) && n > 0).length + '개 생산 시설';
  $('orbit-level').textContent = 'Lv.' + v.orbit;
  $('facility-hotspots').innerHTML = ['alloyMine','fuelRefinery','shipyard'].map((key,i)=>`<button class="facility-hotspot hotspot-${i}" data-facility="${key}" aria-label="${facilityNames[key]} 상세" aria-pressed="${key===selectedFacility}"><span class="hotspot-dot"></span><span>${facilityNames[key]} <small>Lv.${p.facilities[key]}</small></span></button>`).join('');
  const outbound = state.departure?.planetId === p.id, incoming = state.threat?.planetId === p.id;
  $('departure-route').toggleAttribute('hidden', !outbound);
  $('incoming-route').toggleAttribute('hidden', !incoming);
  $('route-status').innerHTML = (incoming?'<span class="incoming-status">↘ 접근 <time data-route-eta="incoming">02:40</time> · <span data-route-phase="incoming">현재 위치</span></span>':'') + (outbound?'<span class="outgoing-status">↗ 출항 <time data-route-eta="outgoing">04:20</time> · <span data-route-phase="outgoing">현재 위치</span></span>':'') + (incoming||outbound?'<small class="route-disclosure">예시 항로 · 위치·남은 시간 동기화</small>':'');
  $('departure-button').setAttribute('aria-pressed', String(outbound));
  const hasSatellite=state.satellite.planetId===p.id;
  $('recon-button').hidden=!hasSatellite;document.querySelector('.recon-summary').hidden=!hasSatellite;
  $('orbit-facility').hidden = !v.orbit;
  $('orbit-facility').dataset.level = v.orbit;
  const districts = [[68,49],[64,57],[59,65],[56,73],[62,38],[70,60],[49,36],[46,78],[53,58],[63,70]];
  $('surface-markers').innerHTML = Array.from({length: v.industry + v.power + v.research}, (_,i) => { const [x,y]=districts[i%districts.length]; return `<i class="surface-marker" style="left:${x}%;top:${y}%;rotate:${i*19}deg"></i>`; }).join('');
  $('planet-scene').setAttribute('aria-label', p.name + ' 시설 개요 열기');
  $('planet-visual-description').textContent = '예시 시설. ' + Object.entries(p.facilities).map(([key,level]) => facilityNames[key] + ' 수준 ' + level).join(', ') + '. 시설 표식을 선택하면 증설 전후를 비교할 수 있습니다.';

  $('planet-status').className = 'status-pill' + (state.threat?.planetId === p.id ? ' danger' : '');
  $('planet-status').textContent = state.threat?.planetId === p.id ? '△ 적 접근 · 예시' : '● 평시 · 예시';
  document.querySelectorAll('[data-state]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.state === (state.threat ? 'threat' : state.notice ? 'complete' : 'idle'))));
  $('threat-banner').hidden = !state.threat;
  if (state.threat) $('threat-banner').innerHTML = `${icon('warning')}<div><strong><span data-threat-phase>적 함대 접근</span> · 노바 프라임 · 예시</strong><p><span><span data-incoming-caption>외곽 도달까지</span> <time data-route-eta="incoming">02:40</time> · 시연</span><span class="threat-demo-note">실제 공격 아님</span></p></div><button class="button danger" data-panel="evasion">회피 계획 검토 ${icon('fleet')}</button>`;
  $('context').innerHTML = contextContent();
  $('mobile-priority').hidden = !!state.threat || view !== 'home';
  $('mobile-priority').className = 'mobile-priority' + (state.notice ? ' complete' : '');
  $('mobile-priority').innerHTML = state.notice ? '<div><span>✓ 완료 피드백 · 예시</span><strong>실제 자산 변화 없음</strong></div><button class="button secondary" data-panel="reports">결과 예시 확인</button>' : `<div><span>${state.empty || p.id === 'vesper' ? '다음 계획' : '건설 진행 · 고정 예시'}</span><strong>${state.connection !== 'ready' ? '연결 상태 예시' : state.empty || p.id === 'vesper' ? '진행 중인 작업 없음' : '연료 합성소 Lv.' + facilityPreview(p,'fuelRefinery').next + ' · 01:24'}</strong></div><button class="button secondary" data-panel="construction">건설 관리</button>`;
  $('queue').innerHTML = unavailable ? '<p class="empty-state">불러오는 상태 예시 · 서버 요청 없음</p>' : state.empty || p.id === 'vesper' ? '<p class="empty-state"><strong>진행 중인 작업 없음</strong>건설이나 연구에서 다음 계획을 확인하세요.</p>' : `<div class="queue-row">${icon('build')}<div><strong>연료 합성소 Lv.${facilityPreview(p,"fuelRefinery").next}</strong><small>건설 · 고정 예시</small></div><div class="progress-track" role="progressbar" aria-label="건설 진행 예시" aria-valuenow="62" aria-valuemin="0" aria-valuemax="100"><i style="width:62%"></i></div><time>01:24 예시</time></div><div class="queue-row">${icon('research')}<div><strong>산업 기술 Lv.1</strong><small>공통 연구 · 노바 프라임 · 예시</small></div><div class="progress-track" role="progressbar" aria-label="연구 진행 예시" aria-valuenow="28" aria-valuemin="0" aria-valuemax="100"><i style="width:28%"></i></div><time>03:10 예시</time></div>`;
  $('event-feed').innerHTML = state.notice ? `<div class="event-row">${icon('check')}<div>${state.notice.text}<small>시연 이벤트 · 실제 건설 변화 없음</small></div></div>` : `<div class="event-row">${icon('planet')}<div>${p.name} 스냅샷<small>기록 예시 · 서버 기록 아님</small></div></div><div class="event-row">${icon('info')}<div>행성 시설이 표면에 반영됩니다.<small>시설 수준 기반의 시각화 실험</small></div></div>`;
  $('connection-state').hidden = state.connection === 'ready';
  if (state.connection !== 'ready') $('connection-state').innerHTML = state.connection === 'loading' ? '<strong>불러오는 상태 예시</strong><p>서버 요청 없이 로딩 표현만 검토합니다.</p>' : `<div><strong>연결 오류 예시 · 마지막 예시 스냅샷</strong><p>실제 서버에 연결하지 않았습니다. 명령을 실행할 수 없습니다.</p></div><button class="button secondary" id="retry-button">다시 표시 · 데모</button>`;
  $('empty-button').setAttribute('aria-pressed', String(state.empty));
  $('offline-button').setAttribute('aria-pressed', String(state.connection === 'offline'));
  renderCurrentWorkspace();
  if (dialog.open && panel) renderPanel();
  if (focused && !focused.element.isConnected && document.activeElement === document.body) {
    (resolveBookmark(focused) || (dialog.open ? $('dialog-close') : $('planet-select'))).focus({preventScroll:true});
  }
  routePreview.render();
}
function contextContent() {
  const f=facilityPreview(planet(),'fuelRefinery');
  if (state.threat) return `<article class="decision-card threat"><div class="card-icon">${icon('warning')}</div><span class="overline">위협 우선 · 예시</span><h3>노바 프라임에<br><span data-threat-phase>적 함대 접근</span></h3><p>선택 행성은 ${planet().name}입니다.<br>대응 전 위협 대상과 함대를 확인하세요.</p><div class="job-time"><span><span data-incoming-caption>외곽 도달까지</span> · 시연</span><strong><time data-route-eta="incoming">02:40</time></strong></div><button class="button secondary" data-panel="threat">위협 상세 보기 ${icon('compass')}</button>${state.notice ? `<div class="inline-feedback">${state.notice.text}<br>위협 예시는 계속 유지됩니다.</div>` : ''}</article>`;
  if (state.notice) return `<article class="decision-card complete"><div class="card-icon">${icon('check')}</div><span class="overline">완료 피드백 · 시연 이벤트</span><h3>다음 성장을<br>준비할 시간.</h3><p>${state.notice.text}<br>실제 완료나 자산 변화를 뜻하지 않습니다.</p><button class="button" data-panel="reports">완료 예시 확인 ${icon('reports')}</button></article>`;
  if (state.connection !== 'ready') return `<article class="decision-card"><div class="card-icon">${icon('info')}</div><span class="overline">${state.connection === 'offline' ? '연결 오류' : '로딩'} 예시</span><h3>명령은 실행되지<br>않습니다.</h3><p>네트워크 요청이 없는 독립 데모입니다. 상태 표현과 복귀 경로를 확인하세요.</p><button class="button secondary" data-panel="resources">예시 데이터 확인</button></article>`;
  if (state.empty || planet().id === 'vesper') return `<article class="decision-card"><div class="card-icon">${icon('build')}</div><span class="overline">새로운 계획</span><h3>다음 개발을<br>선택하세요.</h3><p>진행 중인 작업이 없습니다. 시설 목록에서 다음 투자 대상을 검토할 수 있습니다.</p><button class="button" data-panel="construction">건설 관리 열기 ${icon('build')}</button></article>`;
  return `<article class="decision-card"><div class="card-icon">${icon('fuel')}</div><span class="overline">현재 건설</span><h3>연료 합성소<br>Lv.${f.level} <span style="color:var(--dn-tertiary)">→</span> Lv.${f.next}</h3><p>시설 생산 기여 <strong>${f.before} → ${f.after} /분</strong><br><small>효과 비교 예시</small></p><div class="job-time"><span>남은 시간 · 고정 예시</span><strong>01:24</strong></div><div class="progress-track" role="progressbar" aria-label="주요 건설 진행 예시" aria-valuenow="62" aria-valuemin="0" aria-valuemax="100"><i style="width:62%"></i></div><button class="button" data-panel="construction">효과와 조건 확인 ${icon('build')}</button></article>`;
}
function renderCurrentWorkspace() {
  const home = view === 'home';
  $('home-workspace').hidden = !home;
  $('workspace-page').hidden = home;
  $('workspace-page').dataset.view = view;
  $('mobile-priority').hidden = !home || !!state.threat;
  document.querySelector('.workspace-heading .overline').textContent = '제국 / ' + (workspaceTitles[view] || '행성 관제');
  const navigationView=view==='command'?(strategyUI.context==='alliance'?'guild':strategyUI.context==='defense'?'defense':'career'):view;
  document.querySelectorAll('.sidebar [data-view]').forEach(button => {
    const direct = [...document.querySelectorAll('.desktop-nav [data-view]')].some(el=>el.dataset.view===navigationView && navigationView!=='more');
    const main = ['home','construction','research','fleet'].includes(navigationView);
    const active = button.dataset.view === navigationView || button.dataset.view === 'more' && !main && (button.classList.contains('mobile-more') || !direct);
    button.classList.toggle('active',active);
    if (active) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
  });
  document.title = 'DELTA NOVA — ' + (workspaceTitles[view] || '행성 관제') + ' · UI/UX Demo';
  if (home){renderVisiblePlanet();return;}
  const strategyPlan=view==='command'?strategySummary(strategyUI,state):null;
  $('workspace-title').textContent = strategyPlan?.target ? strategyPlan.target.name+' '+({attack:'공격',scout:'정찰',move:'이동',reinforce:'증원'}[strategyUI.intent]) : workspaceTitles[view];
  $('workspace-planet').textContent = planet().name + ' · 예시 스냅샷';
  $('workspace-body').innerHTML = renderWorkspace(view,state,selectedFacility,galaxyUI,operationsUI,allianceUI,strategyUI);
  hydrateIcons($('workspace-body'));
  routePreview.render();
}
function captureScreen() {
  const {sector,target,filter,query} = galaxyUI;
  return {scroll:window.scrollY,focus:bookmark(document.activeElement),dialogScroll:$('dialog-content').scrollTop,facility:selectedFacility,galaxy:{sector,target,filter,query}};
}
function operationRoute(nextView) {
  return {view:nextView,...(nextView==='career'?{intent:strategyUI.intent,context:'solo'}:{}),...(nextView === 'guild' ? {role:allianceUI.role} : {}),...(nextView === 'galaxy' ? {target:galaxyUI.target} : {}),...(['career','practice'].includes(nextView) ? {mission:operationsUI.mission} : {})};
}
function openStrategy(target,intent,context='solo'){
  strategyUI=transitionStrategy(strategyUI,{type:'configure',target,intent,context,stage:'fleet'},state);
  navigationController.go({view:'command',target:strategyUI.target,intent:strategyUI.intent,context:strategyUI.context,step:'fleet'});
}
function refreshStrategy(){
  if(view!=='command'||!$('strategy-estimate')||state.connection!=='ready')return;
  const s=strategySummary(strategyUI,state),focused=bookmark(document.activeElement),scroll=window.scrollY;
  $('strategy-estimate').innerHTML=renderStrategyEstimate(state,strategyUI);
  $('strategy-picked').innerHTML=renderStrategyPicked(state,strategyUI);
  $('strategy-metrics').innerHTML=renderStrategyMetrics(state,strategyUI);
  $('strategy-review').disabled=!s.valid;
  if($('strategy-mobile-count'))$('strategy-mobile-count').textContent=`${s.total}척 · 지휘 ${s.command}/12`;
  $('strategy-delay').value=String(strategyUI.delay);
  if($('strategy-align-note'))$('strategy-align-note').textContent=!s.total?'먼저 함대를 편성하세요.':s.travelSeconds>480?'예정 시각에 도착하려면 더 빠른 편성이 필요합니다.':'1분 단위로 조정하며 예정 시각과의 차이를 30초 이내로 맞춥니다.';
  for(const ship of strategyShips){
    const input=$('strategy-count-'+ship.id),value=s.counts[ship.id]||0,max=s.available[ship.id]||0;
    const card=input?.closest('[data-strategy-ship]');
    if(card)card.dataset.selected=String(value>0);
    if(input&&input.value!==String(value))input.value=String(value);
    if(input){input.max=String(max);input.disabled=!max;}
    for(const [direction,unavailable] of [['minus',value<=0],['plus',value>=max]]){
      const button=$('strategy-'+direction+'-'+ship.id);
      if(button){button.disabled=!max;button.setAttribute('aria-disabled',String(unavailable||!max));}
    }
  }
  resolveBookmark(focused)?.focus({preventScroll:true});window.scrollTo({top:scroll,behavior:'instant'});
}
function changeStrategy(action){
  if(state.connection!=='ready')return;
  const before=strategyUI;
  strategyUI=transitionStrategy(strategyUI,action,state);
  if(action.type==='review'&&strategyUI.review){
    if(navigationController.current.step!=='confirm')navigationController.go({step:'confirm'});
    else renderCurrentWorkspace();
    $('strategy-confirm-title')?.scrollIntoView?.({block:'start'});$('strategy-confirm-title')?.focus({preventScroll:true});
  }else if(action.type==='preview'&&strategyUI.orders.length>before.orders.length){
    navigationController.go({view:'fleet'});announce('출항 흐름 시연을 추가했습니다. 실제 함선과 연료는 변경하지 않았습니다.');
  }else if(['advance','recall'].includes(action.type)){
    const focus=bookmark(document.activeElement),scroll=window.scrollY;renderCurrentWorkspace();
    const orderElement=$('strategy-order-'+action.id);
    const oldOrder=before.orders.find(o=>o.id===action.id),order=strategyUI.orders.find(o=>o.id===action.id);
    if(oldOrder?.phase!==order?.phase){
      orderElement?.classList.add('dn-phase-changed');
      const phase={waiting:'출발 대기',outbound:'목표로 이동 중',arrived:'목표 도착',deployed:'현지 주둔 중',returning:'귀환 중',complete:'귀환 완료'}[order.phase];
      announce(`${order.targetName} ${order.total}척, ${phase} 시연입니다. 실제 자산은 변경되지 않았습니다.`);
    }
    const fallback=orderElement?.querySelector('h3');fallback?.setAttribute('tabindex','-1');
    (resolveBookmark(focus)||fallback)?.focus({preventScroll:true});window.scrollTo({top:scroll,behavior:'instant'});
  }else {
    refreshStrategy();
    if(action.type==='quantity'&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&!document.body.matches('.motion-paused,.page-hidden')){
      const art=document.querySelector(`[data-strategy-ship="${action.id}"] .sc-ship-art`);
      if(art){art.classList.remove('sc-edited');void art.offsetWidth;art.classList.add('sc-edited');}
    }
    if(['quantity','delay'].includes(action.type)&&strategyUI!==before){const summary=strategySummary(strategyUI,state);announce(`편성 ${summary.total}척, 지휘 ${summary.command} / 12. ${summary.errors.length?summary.errors.map(e=>e.text).join(' '):'명령 확인이 가능합니다. 실제 출항은 시연에서만 진행합니다.'}`);}
    if(action.type==='clear')announce('함대 편성을 비웠습니다. 함종과 수량을 다시 선택하세요.');
  }
}
function refreshAlliance() {
  if (view !== 'guild') return;
  const focused=bookmark(document.activeElement),scroll=window.scrollY;
  renderCurrentWorkspace();
  resolveBookmark(focused)?.focus({preventScroll:true});
  window.scrollTo({top:scroll,behavior:'instant'});
}
function changeAlliance(action) {
  if (state.connection !== 'ready') return;
  allianceUI=transitionAlliance(allianceUI,action,planet());
  refreshAlliance();
  if (action.type === 'review' && allianceUI.review) {
    $('alliance-result-title')?.closest('section')?.scrollIntoView?.({block:'start'});
    $('alliance-result-title')?.focus({preventScroll:true});
    announce('공동 작전 준비안을 검토했습니다. 역할 예약이나 기여는 전송되지 않았습니다.');
  }
}
function refreshPractice() {
  if (view !== 'practice' || !$('practice-summary') || state.connection !== 'ready') return;
  const focused = bookmark(document.activeElement), scroll = window.scrollY;
  const draft = operationDraft(operationsUI,planet()), inventory = operationInventory(planet());
  $('practice-summary').innerHTML = renderPracticeSummary(state,operationsUI);
  $('practice-review-result').innerHTML = renderPracticeResult(state,operationsUI);
  for (const ship of ships) {
    const value = draft.counts[ship.id] || 0, max = inventory[ship.id] || 0;
    const input = $('practice-count-'+ship.id);
    if (input && input.value !== String(value)) input.value = String(value);
    input?.closest('[data-operation-ship]')?.classList.toggle('op-ship-selected',value>0);
    for (const [direction,unavailable] of [['minus',value<=0],['plus',value>=max]]) {
      const button = $('practice-'+direction+'-'+ship.id);
      if (button) { button.disabled = !max; button.setAttribute('aria-disabled',String(unavailable || !max)); }
    }
  }
  $('practice-mission-select').value = operationsUI.mission;
  $('practice-support-select').value = draft.support;
  $('practice-approach-select').value = draft.approach;
  document.querySelectorAll('[data-operation-preset]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.operationPreset===draft.preset)));
  resolveBookmark(focused)?.focus({preventScroll:true});
  window.scrollTo({top:scroll,behavior:'instant'});
}
function changeOperation(action) {
  if (state.connection !== 'ready') return;
  const next = transitionOperations(operationsUI,action,planet());
  operationsUI = next;
  refreshPractice();
  if (action.type === 'review') {
    const heading = $('practice-result-title');
    heading?.closest('section')?.scrollIntoView?.({block:'start'});
    heading?.focus({preventScroll:true});
    announce('현재 편성의 준비 조건을 검토했습니다. 실제 출격이나 전투 결과는 생성하지 않습니다.');
  }
}
function refreshGalaxyContent() {
  if (view !== 'galaxy' || !$('galaxy-content') || state.connection !== 'ready') return;
  const focused = bookmark(document.activeElement), scroll = window.scrollY;
  $('galaxy-content').innerHTML = renderGalaxyContent(state,galaxyUI);
  $('galaxy-sector-select').value = galaxyUI.sector;
  if ($('galaxy-search').value !== galaxyUI.query) $('galaxy-search').value = galaxyUI.query;
  document.querySelectorAll('[data-galaxy-filter]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.galaxyFilter===galaxyUI.filter)));
  $('galaxy-results-count').textContent = visibleGalaxyTargets(galaxyUI).length + '개 대상';
  const nextFocus = resolveBookmark(focused);
  if (nextFocus && document.activeElement !== nextFocus) nextFocus.focus({preventScroll:true});
  window.scrollTo({top:scroll,behavior:'instant'});
}
function changeGalaxy(action,{replace=false}={}) {
  if (state.connection !== 'ready') return;
  const next = transitionGalaxy(galaxyUI,action);
  if (next === galaxyUI) return;
  if (navigationController.current.target !== next.target) {
    pendingGalaxyUI = next;
    navigationController.go({view:'galaxy',target:next.target},{replace});
  } else { galaxyUI = next; refreshGalaxyContent(); }
}
function previewGalaxyScan() {
  const target = selectedGalaxyTarget(galaxyUI);
  if (state.connection !== 'ready' || !target || galaxyUI.scan) return;
  const token = ++scanSerial;
  const next = transitionGalaxy(galaxyUI,{type:'scan-start',token,target:target.id});
  if (next === galaxyUI) return;
  galaxyUI = next; refreshGalaxyContent();
  scanTimer = setTimeout(()=>{
    galaxyUI = transitionGalaxy(galaxyUI,{type:'scan-complete',token});
    refreshGalaxyContent();
    if (dialog.open && panel === 'intel' && navigationController.current.target === target.id) {
      const focused = bookmark(document.activeElement), scroll = $('dialog-content').scrollTop;
      renderPanel(); $('dialog-content').scrollTop = scroll;
      resolveBookmark(focused)?.focus({preventScroll:true});
    }
    announce(target.name + ' 정찰 시연 결과가 준비되었습니다. 결과 보기에서 확인하세요.');
  },1400);
}
function syncFacilitySelection() {
  document.querySelectorAll('.facility-hotspot').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.facility===selectedFacility)));
}
function workspaceFocusTarget() {
  const title = view === 'home' ? $('planet-name') : $('workspace-title');
  return title.getClientRects().length ? title : $('main');
}
function focusWorkspaceStart() {
  const mobile = getComputedStyle(document.querySelector('.sidebar')).position === 'fixed';
  window.scrollTo({top:mobile ? $('main').offsetTop : 0,behavior:'instant'});
  const target=workspaceFocusTarget();
  target.setAttribute('tabindex','-1');target.focus({preventScroll:true});
}
// A URL may restore navigation, but never manufacture approval of a changed fleet.
function syncStrategyRoute(){
  const route=navigationController.current;if(route.view!=='command')return false;
  const patch={target:strategyUI.target,intent:strategyUI.intent,context:strategyUI.context,step:strategyUI.stage==='confirm'&&strategyUI.review?'confirm':'fleet'};
  if(Object.keys(patch).every(key=>route[key]===patch[key]))return false;
  navigationController.go(patch,{replace:true});return true;
}
function applyNavigation(route, previous, info) {
  const before = captureScreen();
  if (info.previousKey) screenMemory.set(info.previousKey,before);
  const changedTarget = route.view === 'galaxy' && previous?.target !== route.target;
  const changedMission = ['career','practice'].includes(route.view) && previous?.mission !== route.mission;
  const changedRole = route.view === 'guild' && previous?.role !== route.role;
  const changedStrategy=['career','command'].includes(route.view)&&['target','intent','context','step'].some(key=>route[key]!==previous?.[key]);
  const saved = info.replace ? before : info.history ? screenMemory.get(info.key) : !info.initial && view === route.view && (changedTarget || changedMission || changedRole || changedStrategy) ? before : null;
  const changedView = view !== route.view;
  view = route.view;
  if (saved?.galaxy) galaxyUI = {...galaxyUI,...saved.galaxy};
  if (pendingGalaxyUI) { galaxyUI = pendingGalaxyUI; pendingGalaxyUI = null; }
  if ((route.view === 'galaxy' || route.detail === 'intel') && route.target !== galaxyUI.target) galaxyUI = transitionGalaxy(galaxyUI,{type:'target',id:route.target});
  if (['career','practice'].includes(route.view) && route.mission !== operationsUI.mission) operationsUI = transitionOperations(operationsUI,{type:'mission',id:route.mission},planet());
  if (route.view === 'guild' && route.role !== allianceUI.role) allianceUI = transitionAlliance(allianceUI,{type:'role',id:route.role},planet());
  if(route.view==='career')strategyUI=transitionStrategy(strategyUI,{type:'configure',intent:route.intent,context:'solo',stage:'target'},state);
  if(route.view==='command'){
    if(strategyUI.target!==route.target||strategyUI.intent!==route.intent||strategyUI.context!==route.context)strategyUI=transitionStrategy(strategyUI,{type:'configure',target:route.target,intent:route.intent,context:route.context,stage:'fleet'},state);
    if(route.step==='confirm'&&strategyUI.review&&strategySummary(strategyUI,state).valid)strategyUI={...strategyUI,stage:'confirm'};
    else if(info.history&&strategyUI.review)strategyUI={...strategyUI,stage:'fleet'};
    else strategyUI=transitionStrategy(strategyUI,{type:'edit'},state);
    if(navigationController&&syncStrategyRoute())return;
  }
  if (saved) selectedFacility = saved.facility;
  if (route.detail === 'planet') selectedFacility = route.facility;
  syncFacilitySelection();
  const wasOpen = dialog.open;
  if (!route.detail && wasOpen) dialog.close();
  panel = route.detail;
  if (changedView || info.initial || changedStrategy || view === 'guild' && changedRole || view === 'career' && changedMission || saved?.facility && !['galaxy','practice'].includes(view)) renderCurrentWorkspace();
  else if (view === 'galaxy' && (saved || changedTarget)) refreshGalaxyContent();
  else if (view === 'practice' && (saved || changedMission)) refreshPractice();
  if (panel) {
    if (!wasOpen) opener = bookmark(document.activeElement);
    renderPanel();
    if (!dialog.open) dialog.showModal();
    $('dialog-content').scrollTop = saved?.dialogScroll || 0;
  }
  syncPlanetMotion($('planet-canvas'));
  if (info.initial) {
    if (panel) $('dialog-title').focus({preventScroll:true});
    return;
  }
  if (saved) {
    window.scrollTo({top:saved.scroll,behavior:'instant'});
    (resolveBookmark(saved.focus) || (panel ? $('dialog-title') : workspaceFocusTarget())).focus({preventScroll:true});
  } else if (panel) {
    $('dialog-title').focus({preventScroll:true});
  } else if (changedView) {
    focusWorkspaceStart();
    const surface=view==='home' ? $('home-workspace') : $('workspace-body');
    surface.classList.remove('dn-view-enter');
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches&&!document.body.matches('.motion-paused,.page-hidden')){void surface.offsetWidth;surface.classList.add('dn-view-enter');}
  } else if (wasOpen) {
    (resolveBookmark(opener) || $('workspace-title')).focus({preventScroll:true});
  }
}
function openPanel(next, source) {
  if (['construction','evasion','defense','more','career','galaxy','guild','practice','rankings','diplomacy'].includes(next)) {
    navigationController.go(operationRoute(next)); return;
  }
  if (!dialog.open) opener = bookmark(source || document.activeElement);
  navigationController.go({detail:next,facility:selectedFacility});
}
function renderPanel() {
  const p = planet();
  $('dialog-back').hidden = true;
  $('drawer-location').textContent = (workspaceTitles[view] || '행성 관제') + ' / 빠른 확인';
  $('dialog-title').textContent = panel === 'planet' ? facilityNames[selectedFacility] : panel === 'intel' ? '정찰 결과 · 예시' : titles[panel] || '상세';
  $('dialog-return').textContent = (workspaceTitles[view] || '행성 관제') + '로 돌아가기';
  const disabled = label => `<button class="button secondary" disabled aria-describedby="command-reason">${label}</button><p id="command-reason" class="drawer-demo">데모에서는 실행할 수 없습니다.</p>`;
  const manage = (key,label='전체 관리 열기') => `<button class="button secondary detail-manage" data-view="${key}">${label} <span aria-hidden="true">↗</span></button>`;
  let html = '';
  if (state.connection === 'loading' && panel!=='settings') html = '<div class="empty-state" role="status">예시 스냅샷을 불러오는 중입니다.</div>';
  else if (panel === 'resources') html = `<p>${p.name} · 보유량과 현지 생산</p>` + Object.keys(names).map(key => `<section class="resource-detail"><h3>${icon(key)}${names[key]}</h3>${stat('보유 / 저장 한도', format(p.resources[key]) + ' / ' + format(p.capacities[key]))}${stat('생산', '+' + p.rates[key] + ' /분')}</section>`).join('') + manage('construction','시설 투자 비교');
  else if (panel === 'planet') {
    const f=facilityPreview(p,selectedFacility);
    html = `<label class="detail-facility-select" for="detail-facility-select">시설 선택<select id="detail-facility-select">${Object.entries(p.facilities).map(([key,level])=>`<option value="${key}" ${key===selectedFacility?'selected':''}>${facilityNames[key]} · Lv.${level}</option>`).join('')}</select></label><section id="facility-detail" aria-label="선택 시설"><div class="facility-effect"><span>${f.effect}</span><strong>${f.before} <span>→</span> ${f.after} <small>${f.unit}</small></strong></div><p>${f.name} · Lv.${f.level} → Lv.${f.next}</p><h3>증설 비용 · 예시</h3><div class="cost-grid">${Object.keys(names).map(k=>`<span>${icon(k)}${names[k]} <strong>${f.cost[k]}</strong></span>`).join('')}</div>${stat('소요 시간',f.cost.time)}<p class="detail-condition">${f.affordable?'예시 보유 자원으로 비용 충족':'예시 보유 자원 부족'}</p><button class="button secondary" disabled>건설 실행 · 미연결</button></section>${manage('construction','전체 시설·조건 비교')}`;
  }
  else if (panel === 'fleet') html = `<p>${p.name}의 함대</p>${stat('보유 함선',p.ships+'척')}${stat('출격 가능',p.ships+'척 · 예시')}${stat('출격 중','0척 · 예시')}${manage('fleet')}`;
  else if (panel === 'research') html = `${stat('현지 연구소','Lv.'+p.facilities.laboratory)}${stat('공통 연구',state.empty?'진행 중인 연구 없음':'산업 기술 Lv.1')}${stat('연구 행성','노바 프라임')}${stat('남은 시간',state.empty?'—':'03:10 · 고정 예시')}${manage('research')}`;
  else if (panel === 'threat') html = state.threat ? `${stat('위협 대상','노바 프라임')}${stat('선택 행성',p.name)}${stat('<span data-incoming-caption>외곽 도달까지</span>','<time data-route-eta="incoming">02:40</time> · 시연')}${stat('접근 종점','대기권 밖 대기점')}${manage('defense','방어 현황 확인')}${manage('evasion','회피 계획 검토')}` : '<p>현재 접근 중인 위협 예시가 없습니다.</p>' + manage('defense','방어 현황 확인');
  else if (panel === 'reports') html = (state.notice ? `<div class="detail-callout">${state.notice.text}</div>` : '<div class="empty-state"><strong>새 완료 기록 없음</strong>진행 중인 작업은 건설·연구에서 확인할 수 있습니다.</div>') + manage('reports','활동 전체 보기');
  else if (panel === 'recon') html = `<p>노바 프라임의 정찰 위성 S-01</p>${stat('시연 상태','기울어진 궤도 순찰')}${stat('궤도 표현','앞에서 표시 · 뒤에서 가림')}${stat('정보 수신','미연결')}${disabled('정찰 명령 · 미연결')}${manage('galaxy','은하·정찰 보기')}`;
  else if (panel === 'intel') html = renderGalaxyReport(state,galaxyUI,navigationController?.current.target || galaxyUI.target);
  else if (panel === 'settings') html = '<p>시스템의 모션 감소 설정을 자동 반영합니다.</p><label class="setting-row"><input type="checkbox" id="pause-motion">모든 화면 모션 일시정지</label><div class="detail-callout">시연 위치와 남은 시간을 함께 멈춥니다. 경고와 항로는 계속 표시됩니다.</div>';
  $('dialog-content').innerHTML = html;
  if (panel === 'settings') $('pause-motion').checked = document.body.classList.contains('motion-paused');
  routePreview.render();
}
function selectWorkspaceFacility(key) {
  if (!facilityCards[key]) return;
  selectedFacility = key;
  syncFacilitySelection();
  if (state.connection === 'ready') $('workspace-facility-detail').innerHTML = renderFacilityDetail(planet(),key);
  document.querySelectorAll('[data-workspace-facility]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.workspaceFacility===key)));
  $('workspace-facility-select').value=key;
  hydrateIcons($('workspace-facility-detail'));
  announce(facilityNames[key]+' 증설 비교를 표시했습니다.');
}
listen(document,'click', event => {
  if (event.target.closest('.skip-link')) { event.preventDefault(); $('main').focus(); return; }
  if (event.target.closest('.brand')) { event.preventDefault(); navigationController.go({view:'home'}); return; }
  const button = event.target.closest('button');
  if (!button) return;
  if(button.dataset.strategyOpen)openStrategy(button.dataset.strategyOpen,button.dataset.strategyIntent,button.dataset.strategyContext||'solo');
  else if(button.dataset.strategyIntentTab)navigationController.go({view:'career',intent:button.dataset.strategyIntentTab,context:'solo'});
  else if(button.dataset.strategyMap)navigationController.go({view:'galaxy',target:button.dataset.strategyMap});
  else if(button.dataset.strategyPreset)changeStrategy({type:'preset',id:button.dataset.strategyPreset});
  else if(button.dataset.strategyStep){const id=button.dataset.strategyStep;changeStrategy({type:'quantity',id,value:(strategyFleet(strategyUI,state)[id]||0)+Number(button.dataset.delta)});}
  else if(button.dataset.strategyAdvance)changeStrategy({type:'advance',id:button.dataset.strategyAdvance});
  else if(button.dataset.strategyRecall)changeStrategy({type:'recall',id:button.dataset.strategyRecall});
  else if(button.dataset.strategyAction==='review')changeStrategy({type:'review'});
  else if(button.dataset.strategyAction==='clear')changeStrategy({type:'clear'});
  else if(button.dataset.strategyAction==='preview')changeStrategy({type:'preview'});
  else if(button.dataset.strategyAction==='align'){changeStrategy({type:'align'});const s=strategySummary(strategyUI,state);announce(!s.total?'먼저 함대를 편성하세요.':Math.abs(s.allyDelta)<=30?'도착 계획을 동맹 예정 시각과 30초 이내로 맞췄습니다. 자동으로 출발하지 않습니다.':'예정 시각에 도착하려면 더 빠른 편성이 필요합니다. 현재 출발 계획은 유지했습니다.');}
  else if(button.dataset.strategyAction==='estimate'){$('strategy-estimate-title')?.closest('aside')?.scrollIntoView?.({block:'start'});$('strategy-estimate-title')?.setAttribute('tabindex','-1');$('strategy-estimate-title')?.focus({preventScroll:true});}
  else if(button.dataset.strategyAction==='compose'){$('strategy-composer-title')?.closest('section')?.scrollIntoView?.({block:'start'});$('strategy-composer-title')?.focus({preventScroll:true});}
  else if(button.dataset.strategyAction==='edit'){navigationController.go({step:'fleet'});$('strategy-review')?.scrollIntoView?.({block:'nearest'});$('strategy-review')?.focus({preventScroll:true});}
  else if (button.dataset.allianceRole) {
    navigationController.go({role:button.dataset.allianceRole});
    $('alliance-preparation')?.scrollIntoView?.({block:'start'});
    $('alliance-preparation-title')?.focus({preventScroll:true});
  }
  else if (button.dataset.allianceAction === 'review') changeAlliance({type:'review'});
  else if (button.dataset.allianceAction === 'prepare') { $('alliance-preparation')?.scrollIntoView?.({block:'start'}); $('alliance-preparation-title')?.focus({preventScroll:true}); }
  else if (button.dataset.allianceAction === 'edit') { changeAlliance({type:'cancel-review'}); $('alliance-review')?.scrollIntoView?.({block:'nearest'}); $('alliance-review')?.focus({preventScroll:true}); }
  else if (button.dataset.operationMission) navigationController.go({mission:button.dataset.operationMission});
  else if (button.dataset.operationPreset) changeOperation({type:'preset',id:button.dataset.operationPreset});
  else if (button.dataset.operationStep) {
    const id = button.dataset.operationStep, draft = operationDraft(operationsUI,planet());
    changeOperation({type:'quantity',id,value:(draft.counts[id] || 0)+Number(button.dataset.delta)});
  }
  else if (button.id === 'practice-clear') changeOperation({type:'clear'});
  else if (button.id === 'practice-review') changeOperation({type:'review'});
  else if (button.hasAttribute('data-operation-cancel-review')) { changeOperation({type:'cancel-review'}); $('practice-review')?.scrollIntoView?.({block:'nearest'}); $('practice-review')?.focus({preventScroll:true}); }
  else if (button.hasAttribute('data-operation-focus-summary')) { $('practice-summary')?.closest('.op-summary-card')?.scrollIntoView?.({block:'start'}); $('practice-summary-heading')?.focus({preventScroll:true}); }
  else if (button.dataset.galaxyTarget) changeGalaxy({type:'target',id:button.dataset.galaxyTarget});
  else if (button.dataset.galaxyFilter) changeGalaxy({type:'filter',value:button.dataset.galaxyFilter},{replace:true});
  else if (button.dataset.galaxyHome) {
    if (state.connection !== 'ready' || !state.planets.some(p=>p.id===button.dataset.galaxyHome)) return;
    act({type:'select',id:button.dataset.galaxyHome}); navigationController.go({view:'home'});
  }
  else if (button.hasAttribute('data-galaxy-focus')) { $('galaxy-target-title')?.closest('.gx-inspector')?.scrollIntoView?.({block:'start'}); $('galaxy-target-title')?.focus({preventScroll:true}); }
  else if (button.id === 'galaxy-center-current') changeGalaxy({type:'target',id:state.selected});
  else if (button.id === 'galaxy-clear-query') {
    changeGalaxy({type:'query',value:''},{replace:true});
    changeGalaxy({type:'filter',value:'all'},{replace:true});
    $('galaxy-search')?.focus({preventScroll:true});
  }
  else if (button.id === 'galaxy-scan-preview') previewGalaxyScan();
  else if (button.dataset.workspaceFacility) selectWorkspaceFacility(button.dataset.workspaceFacility);
  else if (button.dataset.view) {
    if (facilityCards[button.dataset.viewFacility]) selectedFacility = button.dataset.viewFacility;
    if (button.dataset.view === view && !panel) focusWorkspaceStart();
    else navigationController.go(operationRoute(button.dataset.view));
  }
  else if (button.dataset.facility) {
    selectedFacility = button.dataset.facility;
    document.querySelectorAll('.facility-hotspot').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.facility===selectedFacility)));
    openPanel('planet',button);
  }
  else if (button.dataset.panel) openPanel(button.dataset.panel,button);
  else if (button.dataset.state) act({type:button.dataset.state});
  else if (button.id === 'snapshot-button') act({type:'snapshot'});
  else if (button.id === 'arrival-button') act({type:'arrival'});
  else if (button.id === 'departure-button' || button.id === 'fleet-departure-preview') act({type:'departure'});
  else if (button.id === 'empty-button') act({type:'empty'});
  else if (button.id === 'offline-button') { clearTimeout(retryTimer); act({type:'connection',value:state.connection==='offline'?'ready':'offline'}); }
  else if (button.id === 'reset-button') { clearTimeout(retryTimer); act({type:'reset'}); announce('데모를 초기화했습니다.'); }
  else if (button.id === 'retry-button') { act({type:'connection',value:'loading'}); retryTimer=setTimeout(()=>{act({type:'connection',value:'ready'});announce('예시 스냅샷을 다시 표시했습니다.');},700); }
});
listen($('planet-select'),'change',event=>act({type:'select',id:event.target.value}));
function closePanel() { navigationController.closeDetail(); }
listen($('dialog-close'),'click',closePanel);
listen($('dialog-return'),'click',closePanel);
listen(dialog,'cancel',event=>{event.preventDefault();closePanel();});
listen(dialog,'close',()=>syncPlanetMotion($('planet-canvas')));
listen(dialog,'keydown',event=>{
  if(event.key!=='Tab')return;
  const items=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]')].filter(el=>el.getClientRects().length);
  const first=items[0],last=items.at(-1);
  if(event.shiftKey&&(document.activeElement===first||document.activeElement===$('dialog-title'))){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
});
listen(dialog,'click',event=>{
  const r=dialog.getBoundingClientRect();
  if(event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))closePanel();
});
listen(document,'change',event=>{
  if(event.target.id==='strategy-delay')changeStrategy({type:'delay',value:event.target.value});
  if(event.target.dataset.strategyQuantity)changeStrategy({type:'quantity',id:event.target.dataset.strategyQuantity,value:event.target.value});
  if(event.target.id==='alliance-role-select')navigationController.go({role:event.target.value});
  if(event.target.id==='alliance-scenario')changeAlliance({type:'scenario',value:event.target.value});
  if(event.target.id==='alliance-formation')changeAlliance({type:'formation',value:event.target.value});
  if(['career-mission-select','practice-mission-select'].includes(event.target.id))navigationController.go({mission:event.target.value});
  if(event.target.dataset.operationQuantity)changeOperation({type:'quantity',id:event.target.dataset.operationQuantity,value:event.target.value});
  if(event.target.id==='practice-support-select')changeOperation({type:'support',value:event.target.value});
  if(event.target.id==='practice-approach-select')changeOperation({type:'approach',value:event.target.value});
  if(event.target.id==='galaxy-sector-select')changeGalaxy({type:'sector',value:event.target.value});
  if(event.target.id==='galaxy-target-select')changeGalaxy({type:'target',id:event.target.value});
  if(event.target.id==='pause-motion'){document.body.classList.toggle('motion-paused',event.target.checked);syncPlanetMotion($('planet-canvas'));}
  if(event.target.id==='workspace-facility-select')selectWorkspaceFacility(event.target.value);
  if(event.target.id==='detail-facility-select')navigationController.go({detail:'planet',facility:event.target.value},{replace:true});
});
listen(document,'input',event=>{
  if(event.target.dataset.strategyQuantity&&event.target.value!==''&&event.target.validity.valid&&!event.isComposing)changeStrategy({type:'quantity',id:event.target.dataset.strategyQuantity,value:event.target.value});
  if(event.target.id==='galaxy-search' && !event.isComposing) changeGalaxy({type:'query',value:event.target.value},{replace:true});
  if(event.target.dataset.operationQuantity && event.target.value !== '' && event.target.validity.valid && !event.isComposing) changeOperation({type:'quantity',id:event.target.dataset.operationQuantity,value:event.target.value});
});
listen(document,'compositionend',event=>{
  if(event.target.id==='galaxy-search') changeGalaxy({type:'query',value:event.target.value},{replace:true});
});
listen(document,'visibilitychange',()=>{document.body.classList.toggle('page-hidden',document.hidden);syncPlanetMotion($('planet-canvas'));});
hydrateIcons();
render();
navigationController=createDemoNavigation(applyNavigation,{views:Object.keys(workspaceTitles),details:['resources','planet','fleet','research','reports','threat','recon','intel','settings'],targets:galaxyTargets.map(target=>target.id),missions:missions.map(mission=>mission.id),roles:allianceRoles.map(role=>role.id)});
syncStrategyRoute();
demoReady=true;renderVisiblePlanet();
const sidebar=document.querySelector('.sidebar');
const navigationSize=new ResizeObserver(()=>{
  document.documentElement.style.setProperty('--dn-nav-clearance',Math.ceil(sidebar.getBoundingClientRect().height+6)+'px');
  const fleetBar=document.querySelector('.sc-mobile-plan');
  const fleetClearance=fleetBar&&getComputedStyle(fleetBar).position==='fixed'?Math.ceil(fleetBar.getBoundingClientRect().height+12):0;
  document.documentElement.style.setProperty('--dn-fleet-clearance',fleetClearance+'px');
});
navigationSize.observe(sidebar);
navigationSize.observe(document.body);
export function disposeDemo(){demoEvents.abort();navigationController.dispose();navigationSize.disconnect();routePreview.dispose();clearTimeout(retryTimer);clearTimeout(scanTimer);}
