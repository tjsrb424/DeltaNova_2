# Minimal Galactic Command — 독립 화면 구현 계획

> Execution: this session, using writing-plans / executing-plans / verification-before-completion. 사용자 요청이 P0~P2 구현과 검증을 명시하므로 중간 재승인 없이 진행한다. 서비스 이관은 승인 후 별도 작업이다.

**Goal:** 기존 게임을 보존하면서 메인 행성의 평시·위협·완료 상태를 평가할 수 있는 독립 화면을 만든다.
**Architecture:** `public/uiux-demo/`의 HTML/CSS/ES modules. Vite public 복사 기능만 사용하며 앱 import, API 호출, 저장 접근이 없다. 모델, 캔버스 행성, DOM 인터랙션을 분리한다.
**Tech Stack:** 기존 Vite 8.3.4, native DOM/dialog/Canvas2D/CSS. 새 dependency 없음.
**Spec:** 첨부 키트의 README, 디자인 바이블, IA, 화면·모션·QA 문서와 `DESIGN_BIBLE_REVISED.md`.

## Global constraints

- 경제·전투·함대 이동·정찰·연구·건설 수식 및 서버/저장 계약 변경 0건.
- 전체 서비스 UI 교체 금지. 데모 상태는 항상 DEMO 표시.
- 서버 없는 명령은 비활성 및 이유 표시. 완료는 예시 이벤트임을 문구로 구별한다.
- 신규 패키지 설치, 외부 폰트, 외부 배포, 창 띄우기 없음.
- 1920×1080 / 1440×900 / 1280×720 / 1024×768 / 390×844 / 360×800 검증.

## Review focus

1. 경보 중복·완료 예시가 기존 위협을 지우거나 성공으로 오인되지 않음.
2. 행성 전환 뒤 위협 대상, 시설 표시 및 상세 대상 일치.
3. 모바일 긴급 CTA가 행성/하단 메뉴에 밀리지 않음.
4. dialog Escape·Tab·포커스 복귀 및 motion 감소.
5. 오프라인·빈 상태·로딩에서 명령/가짜 타이머/성공을 표시하지 않음.

## Task 1: 진단 및 안전한 데모 모델

Files: `UI_AUDIT.md`, `DESIGN_BIBLE_REVISED.md`, `public/uiux-demo/model.js`, `tools/verify-uiux-model.mjs`.

- [x] 기존 메뉴/데이터/그래픽/명령 복구 계약 조사 및 기존 캡처 확인.
- [x] node:test로 위협 중복, 대상 보존, 완료 예시, 시설 변화의 불변성 검사 작성·실패 확인.
- [x] `initialDemo()`, `transition(state, action)`, `visualFacilities(planet)` 구현 후 통과.

## Task 2: 대표 화면

Files: `public/uiux-demo/index.html`, `tokens.css`, `style.css`, `planet.js`, `main.js`.

Consumes: Task 1의 순수 상태 모델. Produces: `/uiux-demo/index.html` 독립 페이지. Vite의 디렉터리 URL은 SPA fallback을 타므로 HTML 경로를 명시한다.

- [x] 중앙 행성·자원·주요 작업·전체 메뉴·상태 시연 도구 구현.
- [x] 위협 우선 패널, 완료 예시 피드백, 시설 snapshot 변경, 세부 drawer 구현.
- [x] native dialog, 키보드/터치, 페이지 비활성 및 motion 감소 처리.

## Task 3: 측정·개선·보고

Files: `tools/verify-uiux-demo.mjs`, `docs/qa/2026-10-15-refoundation/*`, `REPORT.md`.

- [x] 번들 Playwright와 로컬 Chrome/Edge를 headless로만 사용. API/저장 접근 없는 별도 context.
- [x] 6해상도×3상태, 모바일 터치, 전체 메뉴, 경보 지속, 포커스, 대비, 200% 확대, 오류/빈 상태 확인.
- [x] 기존 앱은 임시 서버/DB 검증. 기존 사용자 서버나 DB 변경 금지.
- [x] 캡처를 실제 열어보고 개선한 후 재측정. npm test/build 및 HTTP·게임 회귀 확인.
- [x] 점수표는 내부 평가로 명시. 사람의 인지 시간, 실기 성능, 최종 디자인 승인은 별도 기록.

## Decisions / ledger

- Ruling: 격리는 새 branch + 독립 public 경로로 충족한다. 기존 tracked 파일 변경과 새 worktree/중복 설치를 피한다.
- Ruling: 키트의 UNKNOWN_RESULT 일반 가이드보다 저장소의 동일 commandId 재확인 계약이 우선한다. 이 데모는 명령을 전송하지 않는다.
- Ruling: 4개 성장 등급의 임의 임계값을 만들지 않는다. 실제 모델에 존재하는 개별 시설 level을 시각 레이어에 직접 대응한다.
- Ruling: 자동 commit/push 및 배포는 이번 결과 검토 범위에 포함하지 않는다.

## Final ledger

- Task 1: complete — 기존 UI 진단, 모델 안전 계약6/6 PASS. 행성별 snapshot 회귀 실패 후 수정·통과.
- Task 2: complete — 독립3상태, 주요 메뉴·drawer, 모션·포커스. 기존 tracked 파일 수정0.
- Task 3: complete — 기존191테스트, build/HTTP/API/임시 DB 회귀, 최종 dist18조합·5과제·확대·터치·키보드 PASS.
- Final review: 독립 reviewer Critical0,Important1 수정. 재시도 중 DOM 교체·포커스 복귀 회귀 실패 후 수정·통과. native close 이벤트 완료 조건으로 검증.
- Final: minor (deferred): 전 상태/drawer/반투명 합성색의 자동 대비 검사 확장. 현재 대비 결과는 평시 desktop101개에 한정.
- Ruling: 초기 Canvas 계산은8행마다 yield하도록 변경 — 약0.8초 연속 main-thread 점유 제거 — 전체 texture 완료시간은 약0.8~1.05초로 남는다.
- User gate: 전체 서비스 UI 교체·실제 snapshot adapter는 디자인 검토 승인 후 별도 실행.
