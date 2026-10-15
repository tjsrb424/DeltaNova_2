/**
 * DELTA NOVA UI refoundation standalone demonstration.
 * No networking. No real fleet dispatch. No game state or economy integration.
 */
(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const state = { threat: false, stage: 0, complete: false, lastFocus: null, toastTimer: null };
  const stageNames = ['EARLY', 'DEVELOPING', 'ADVANCED', 'IMPERIAL'];
  const panels = {
    'planet-select': {
      title: '현재 행성 · 아스테라', eyebrow: 'PLANET SELECT / DEMO',
      content: `<div class="drawer-callout"><strong>아스테라</strong><p class="smalltext">델타노바의 시각적 시연용 행성입니다. 실제 좌표나 게임 계정 데이터가 아닙니다.</p></div><div class="drawer-stat"><span>개발 단계</span><strong id="drawerStage">시연 상태</strong></div><div class="drawer-stat"><span>연결 상태</span><strong>미연결 (DEMO)</strong></div><p class="drawer-note">실제 제품에서는 행성 전환 후 자원·함대·건설 문맥이 함께 변경되어야 합니다.</p>`
    },
    resources: {
      title: '자원 현황', eyebrow: 'RESOURCE DETAILS / DEMO',
      content: `<p>총량/생산량/저장 한도를 구별하여 보여주는 상세 화면의 구조 예시입니다.</p><div class="drawer-stat"><span>금속 · 샘플</span><strong>1,248,000</strong></div><div class="drawer-stat"><span>크리스탈 · 샘플</span><strong>684,200</strong></div><div class="drawer-stat"><span>에너지 잉여 · 샘플</span><strong>+1,820</strong></div><p class="drawer-note">실제 게임의 자원 종류와 서버 값, 생산량과 저장량 항목을 확인한 후 구현해야 합니다.</p>`
    },
    guide: {
      title: '시연 안내', eyebrow: 'INTERACTION LAB / DEMO',
      content: `<div class="drawer-callout"><strong>이 화면은 프로덕션 게임이 아닙니다.</strong><p class="smalltext">모든 숫자, 진행률, 함대 접근 시간은 샘플입니다. 실제 서버 명령은 보내지 않습니다.</p></div><p>오른쪽 하단 실험 버튼으로 위협 이벤트, 성장 단계 변화, 완료 상태를 확인할 수 있습니다.</p><p>내비게이션과 자원 스트립을 클릭하면 패널이 열립니다. <strong>ESC</strong> 키로 닫을 수 있습니다.</p>`
    },
    construction: {
      title: '건설 관리', eyebrow: 'CONSTRUCTION / DEMO',
      content: `<div class="drawer-callout"><strong>시설 확장</strong><p class="smalltext">프로덕션 연동 전: 건물 목록·요구 자원·건설 시간은 실제 데이터 계약에서 받아야 합니다.</p></div><div class="drawer-stat"><span>실제 건설 가능 여부</span><strong>미연결</strong></div><div class="drawer-stat"><span>시설 목록</span><strong>코드베이스 검토 필요</strong></div>`
    },
    research: {
      title: '연구 현황', eyebrow: 'RESEARCH / DEMO',
      content: `<div class="drawer-callout"><strong>연구 진행률 · 64% (샘플)</strong><p class="smalltext">현재 게임의 실제 연구 큐/서버 타이밍과 연결되지 않은 인터랙션 시연입니다.</p></div><div class="drawer-stat"><span>현재 연구</span><strong>예시 작업</strong></div><div class="drawer-stat"><span>완료 예상 시각</span><strong>미연결</strong></div>`
    },
    fleet: {
      title: '함대 현황', eyebrow: 'FLEET CONTROL / DEMO',
      content: `<div class="drawer-callout"><strong>함대 명령 인터페이스</strong><p class="smalltext">이 화면은 실제 함대 수/이동/전투 정보를 담고 있지 않습니다.</p></div><p>최종 구현에서는 함대 선택, 위치, 출격 가능 여부, 이동/귀환 시간, 서버 권한을 확인해야 합니다.</p><div class="drawer-stat"><span>함대 상태</span><strong>샘플 · 명령 대기</strong></div>`
    },
    galaxy: {
      title: '은하 지도', eyebrow: 'GALAXY / DEMO',
      content: `<p>은하 지도 진입의 탐색 계약 예시입니다.</p><div class="drawer-callout"><strong>실제 시스템 대체 금지</strong><p class="smalltext">정찰·약탈·복수·외교의 실제 컨텍스트는 서버와 기존 게임 지도 구조에 연결해야 합니다.</p></div>`
    },
    more: {
      title: '더보기 · 외교 / 랭킹', eyebrow: 'MORE MODULES / ROADMAP',
      content: `<p>동맹, 외교, 방어, 메시지, 향후 랭킹(종합/전투/성장/약탈/방어)을 위한 공통 탐색 자리입니다.</p><div class="drawer-callout"><strong>랭킹 산식은 기획 후 구현</strong><p class="smalltext">이번 UI/UX 작업에서 점수 공식이나 랭킹 데이터를 만들어 넣지 않습니다.</p></div>`
    },
    evasion: {
      title: '함대 회피 계획 검토', eyebrow: 'INCOMING THREAT / DEMO',
      content: `<div class="drawer-callout warning"><strong>적 함대 접근 중 · 샘플</strong><p class="smalltext">행성: 아스테라 · 예상 도착 00:19:42는 고정된 예시 값입니다. 실시간 카운트다운이 아닙니다.</p></div><div class="drawer-stat"><span>회피 대상 함대</span><strong>실제 데이터 미연결</strong></div><div class="drawer-stat"><span>도착 시각</span><strong>예시 값</strong></div><div class="drawer-stat"><span>목적지 및 소요시간</span><strong>미선택</strong></div><p class="drawer-note">실제 게임에서는 함대·목적지·비용·시간·중복 명령·서버 응답을 검증한 후에만 최종 발진 버튼을 활성화합니다.</p><button class="btn secondary full" type="button" id="demoReviewOnly">검토 종료 · 명령 전송 안 함</button>`
    }
  };

  function announce(text) { $('#announcer').textContent = text; }
  function toast(text) {
    const node = $('#toast');
    node.textContent = text;
    node.hidden = false;
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => { node.hidden = true; }, 3200);
  }
  function update() {
    const visual = $('#planetVisual');
    visual.className = `planet-wrap stage-${state.stage}`;
    $('#planetStageLabel').textContent = `개발 단계 · ${stageNames[state.stage]} (예시)`;
    $('#threatCard').hidden = !state.threat;
    $('#normalCard').hidden = state.threat;
    const badge = $('#situationBadge');
    badge.classList.toggle('threat', state.threat);
    badge.innerHTML = state.threat ? '<i></i>위협 발생' : '<i></i>안정';
    $('#connectionStatus').classList.toggle('alerted', state.threat);
    $('#connectionStatus span').textContent = state.threat ? '위험 이벤트' : '궤도 안정';
    $('#planetStatusLabel').textContent = state.threat ? '위협 대응 필요' : (state.complete ? '시연 완료 상태' : '정상 운영 중');
    $('#orbitSignal').textContent = state.threat ? 'ALERT' : (state.complete ? 'UPDATED' : 'STABLE');
    $('#fleetState').textContent = state.threat ? '접근 경보 감지' : '명령 대기';
    $('#nextDecision').textContent = state.threat ? '위험 대응 검토' : (state.complete ? '다음 작업 선택' : '기술 연구 확인');
    $('#planetSubtitle').textContent = state.threat ? '적 접근 이벤트를 확인하고 대응을 결정하세요.' : (state.complete ? '시연용 행동 완료 피드백을 확인했습니다.' : '오늘의 함대와 자원을 한눈에 확인하세요.');
    $('#toggleThreat').textContent = state.threat ? '적 함대 경보 해제 시연' : '적 함대 접근 시연';
    $('#toggleCompleted').textContent = state.complete ? '행동 완료 상태 해제' : '행동 완료 상태 시연';
  }
  function openPanel(key, trigger) {
    const item = panels[key];
    if (!item) return;
    if ($('#drawer').hidden) state.lastFocus = trigger || document.activeElement;
    $('#drawerEyebrow').textContent = item.eyebrow;
    $('#drawerTitle').textContent = item.title;
    $('#drawerContent').innerHTML = item.content;
    if (key === 'planet-select') {
      const stage = $('#drawerStage');
      if (stage) stage.textContent = stageNames[state.stage] + ' (샘플)';
    }
    $('#overlay').hidden = false;
    $('#drawer').hidden = false;
    $('#drawer').focus();
    announce(`${item.title} 열림`);
    const review = $('#demoReviewOnly');
    if (review) review.addEventListener('click', () => { closePanel(); toast('샘플 검토 종료 · 실제 함대 명령은 전송되지 않았습니다.'); });
  }
  function closePanel() {
    if ($('#drawer').hidden) return;
    $('#drawer').hidden = true;
    $('#overlay').hidden = true;
    const last = state.lastFocus;
    state.lastFocus = null;
    if (last && typeof last.focus === 'function') last.focus();
    announce('상세 패널 닫힘');
  }

  $$('[data-panel]').forEach((btn) => btn.addEventListener('click', () => openPanel(btn.dataset.panel, btn)));
  $$('[data-nav]').forEach((btn) => btn.addEventListener('click', () => {
    const current = btn.dataset.nav;
    if (current === '행성 관제') { closePanel(); return; }
    const map = {'건설 관리':'construction','연구 관리':'research','함대 관리':'fleet','은하 지도':'galaxy','기타 기능':'more'};
    openPanel(map[current], btn);
  }));
  $('#reviewThreat').addEventListener('click', (e) => openPanel('evasion', e.currentTarget));
  $('#toggleThreat').addEventListener('click', () => {
    state.threat = !state.threat;
    state.complete = false;
    update();
    announce(state.threat ? '시연용 적 함대 접근 경보 발생' : '시연용 위협 경보 해제');
  });
  $('#advanceStage').addEventListener('click', () => {
    state.stage = (state.stage + 1) % 4;
    update();
    toast(`행성 시각 단계: ${stageNames[state.stage]} · 시연용 변화`);
  });
  $('#toggleCompleted').addEventListener('click', () => {
    state.complete = !state.complete;
    if (state.complete) state.threat = false;
    update();
    toast(state.complete ? '샘플 UI의 완료 상태 · 실제 서버 명령 없음' : '샘플 UI의 평시 상태로 복귀');
  });
  $('#drawerClose').addEventListener('click', closePanel);
  $('#drawerDismiss').addEventListener('click', closePanel);
  $('#overlay').addEventListener('click', closePanel);
  document.addEventListener('keydown', (ev) => {
    if ($('#drawer').hidden) return;
    if (ev.key === 'Escape') { ev.preventDefault(); closePanel(); return; }
    if (ev.key !== 'Tab') return;
    const focusables = $$('#drawer button:not(:disabled), #drawer [href], #drawer [tabindex="0"]');
    if (focusables.length === 0) { ev.preventDefault(); $('#drawer').focus(); return; }
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (ev.shiftKey && (document.activeElement === first || document.activeElement === $('#drawer'))) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && (document.activeElement === last || document.activeElement === $('#drawer'))) { ev.preventDefault(); first.focus(); }
  });
  update();
})();
