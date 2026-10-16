# 명령 성능·행동 우선 배치 검증

2026-10-16 · 기준 `255fa766ee92e1c1794e440e9e35d02c5b1ea080` · 독립 데모만 변경.
[원인·변경·평가](../../uiux-refoundation/COMMAND_PERFORMANCE_ACTIONS_REVIEW.md), [다른 PC 재현 명령](../../uiux-refoundation/HANDOFF.md).

## 같은 조건의 최종 비교

390×844/DPR3/mobile touch, Chromium 155.0.8059.80, cache off, down1.6Mbps/up750kbps, latency 설정150ms, CPU4배. 전후 순서를 교차하고 각 모드8쌍/16 cold loads와 각 측48개 합성 수량 입력을 남겼다. 입력은 실제 터치/키보드 INP가 아니다.

| 파일 서버 중앙값 / 명시한 분위수 | 이전 | 개선 |
|---|---:|---:|
| 같은 격납고 LCP |4806ms|3788ms|
| load |4750.60ms|4397.10ms|
| 입력 동기 처리 |14.15ms|3.85ms|
| 입력 doubleRAF p95 |77.70ms|49.80ms|
| 입력당 layout |3회|1회|
| DOM 초기화 |3271.30ms|3474.55ms|

이미지 선로딩의 비용으로 DOM 초기화 +203.25ms/FCP +38ms가 관측됐다. 전체 지표 개선으로 표현하지 않는다. 같은 이미지/44982px LCP 후보를 유지했으며 body 합계 +2407bytes(0.34%)다. RAM 서버도 LCP/load/입력은 줄고 DOM 초기화는 +199.65ms였다. 과거14~30초 이상치 모두 해결 또는 실제 기기9.5점 인증을 뜻하지 않는다.

- [파일 서버 최종8쌍](./performance-disk.json), [RAM 서버 최종8쌍](./performance-ram.json): 제품 응답 원형. 서버 조건이 다르므로 별도 실험이다.
- [최소/최대·중앙값·p95·후보·용어](./performance-analysis.json), [성능 계측 파일=최종 public=빌드 dist SHA 대조](./performance-source-parity.json).
- [빌드/브라우저/테스트 집계](./verification-summary.json).
- 브라우저 캐시는 양쪽 모두 꺼져 있다. RAM 대조군은 서버가 양쪽 파일을 사전에 읽고 메모리에서 응답한다. 파일 서버의 per-request 읽기를 대체하는 별도 실험이다.
- 모든 측정은 같은 공유 PC에서 headless로 순차 실행했다. 반복 표본과 범위를 보며 실기기/독립 사용자 평가와 구분한다.

## 최종 동작 원문

- [32파일·329테스트](./tests-final.json).
- [행동 우선·선로딩·입력·키보드7개](./actions-final.json).
- [모바일·Chromium AX·발화용 live 영역·그림11개](./mobile-a11y-final.json).
- [기존 통합35개·레이아웃15개](./integration-final.json).
- [자유 편성14개·레이아웃8개](./free-fleet-final.json).
- [전체 화면11개·일반120/텍스트 확대45개 레이아웃](./all-views-final.json).

API 요청·변경·Storage 접근·런타임 오류는 해당 도구의 검수 흐름에서0이다. 실제 서버, 게임 모델/산식, 운영UI, 패키지/lock, 아트 바이너리는 이번 변경에 포함하지 않는다. 실제 iOS/Android 키보드·VoiceOver/TalkBack 발화·기기 INP/전력은 미검수다.

## 실패와 진단 이력

결과가 나쁜 실험도 남긴다. 진단 단계 파일은 최종 원형 응답 실험과 합산하지 않는다.

- [신규 동작 테스트 최초 RED](./focused-red.json):3실패/47통과 → 최종 관련56통과.
- [기존 동작 기준에서 새 UX 검사](./actions-before.json): 최초6검사 중4실패.
- [이미지 발견/320px 여백 보완 전 RED](./hero-and-clearance-red.json): 요청 발견 지연 및8.6px 여유 → 최종 선로딩/12px 이상 검사 통과.
- [기존 통합 검수 선택자 RED](./legacy-selector-red.json): 보존한 현재 건설 제목까지 h3가2개가 되어 strict locator 충돌. 시설명 선택자로 한정하고 같은35개 검사를 다시 통과했다.
- [초기 기준 비용](./initial-cost-before.json), [입력만 먼저 수정한 비용](./initial-cost-after-input-only.json), [함수 비용 진단](./cost-diagnostic.json): wrapper는 검수 서버 응답에만 있다.
- [modulepreload 제거 대조군](./module-preload-ablation-disk.json): 공유 호스트 변동이 커 preload 단독 효과를 확정하지 않는다.
- [4화면 파일 서버 진단](./four-view-disk-diagnostic.json): 최종 격납고 선로딩 전 기록이다. 요청 읽기 최대1366.7ms와 악화된 표본도 보존했다.
- [격납고 선로딩 전 RAM8쌍](./memory-before-hero.json): 이 실험도 악화됐다. RAM만으로 해결됐다고 결론내리지 않고 격납고의 늦은 발견을 추적해 보완했다.

## 실제 화면

- [건설 데스크톱](./screenshots/construction-1440.png), [320px](./screenshots/construction-320.png), [390px](./screenshots/construction-390.png), [글자200%](./screenshots/construction-text200-390.png).
- [연구](./screenshots/research-390.png), [함대](./screenshots/fleet-390.png), [명령 확인 상단](./screenshots/command-review-top-390.png), [홈 주 행동](./screenshots/home-action-1440.png).
- 캡처는 최종 dist에서 생성했다. 200%에서는 정상 스크롤로 실행/비용을 확인한다. 버튼이 모든 조건에서 첫 화면 안에 들어온다는 주장은 하지 않는다.

## 이렇게 테스트하세요

1. 같은 브랜치를 받고 `npm ci` → `npm run dev:solo -- --port 5181 --strictPort` 후 `/uiux-demo/index.html?review=command-actions-v3#view=construction`에 직접 접속한다. 320/390px에서 시설을 바꿔도 실행 영역과 현재 건설이 먼저 나오고 전체 비용/조건이 아래 남는지 본다.
2. 연구·함대에서 상단 진입 버튼을 누른다. 명령에서 수량을 빠르게 입력하고 지우기/초과 수량/명령 확인·뒤로가기를 확인한다. 예시 수량과 오류, 포커스가 유지되어야 한다. 실제 건설/연구 버튼은 미연결 비활성 상태다.
3. Tab/Shift+Tab/Enter, 글자200%, 가로 화면, 모션 줄이기로 반복한다. [HANDOFF](../../uiux-refoundation/HANDOFF.md)의 빌드 검수와 파일/RAM8쌍 명령을 순차 실행해 원문을 비교한다.

권장 후속은 실제 iOS/Android 키보드와 VoiceOver/TalkBack에서 같은 독립 데모 경로를 확인하고, DOM 초기화 +0.2초 비용을 재평가하는 것이다. 데이터 연결/서비스 UI 이관은 별도 승인 대기다.
