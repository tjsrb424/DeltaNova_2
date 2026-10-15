# DELTA NOVA UI 진단 — 2026-10-15

판정: **Minimal Galactic Command 방향 채택, 기존 UI 일괄 교체 보류.** 이번 결과는 독립 데모까지다. 첨부 문서의 프롬프트·AGENTS 예시는 프로젝트 지시로 설치하거나 실행하지 않았다.

## 확인한 환경

- 시작 브랜치 `main`, HEAD `6724252`, `git status --short` 비어 있음. 작업 브랜치 `codex/uiux-refoundation`.
- React 19.3.0 / React DOM 19.3.0 / TypeScript 7.0.2 / Vite 8.3.4 / Vitest 5.0.4 / jsdom 26.1.0. 실제 `package.json` 기준.
- 별도 라우터·UI·모션·WebGL dependency 없음. `App.tsx`의 state가 화면을 선택하고 `PlanetDashboard`의 section이 상세를 전환한다.
- 명령/상태: `useEmpire` → `empire/api.ts` → 서버 HTTP → SQLite v3 원장. `EmpireSnapshot.serverTime`, `EmpireState`, 개별 `PlanetState`, `TimedJob`, `EmpireEvent`가 기존 표시의 근거다.
- 로컬 편성 연습은 `storage/save.ts`의 별도 저장을 사용한다. 데모는 두 데이터 경로 모두 접근하지 않는다.
- 기존 검증: Vitest, TypeScript/Vite 빌드, HTTP/proxy 검증, 별도 임시 DB를 사용하는 CDP 헤드리스 `verify-dashboard.mjs`.
- 루트·소스·상위 `D:/kim_dev`, `D:/`에 적용할 `AGENTS.md` 없음. 첨부 `AGENTS_SNIPPET.md`는 적용 지시가 아닌 예시다.

## 화면·기능·데이터 지도

| 화면 | 현재 구현 | 데이터/계약 | 새 프레임에서 유지하는 경로 |
|---|---|---|---|
| 대시보드 | PlanetDashboard, PlanetOverview | 생산/저장/전력/공간, 함대 준비, 개발 완료 효과 | 행성 관제 + 자원/시설 상세 |
| 건설 | PlanetDetails, PlanetActionPanel, DevelopmentMap | 시설·방어, quote/조건/공간/전력, 작업 취소 | 건설 메뉴 및 주요 작업 |
| 함대 | EmpireFleetPanel, PlanetDetails | 함선 건조, 보유/손상/출격, 정비 | 함대 메뉴 + 빠른 이동 |
| 연구 | PlanetDetails, DevelopmentMap | 현지 연구소, 공통 연구, 성장 선행 조건 | 연구 메뉴 + 작업 요약 |
| 개인 작전 | EmpireCareerPanel | 실제 보유 함선·출격/전투/귀환 | 개인 작전 메뉴 |
| 동맹 | GuildPanel | 참가자·공동 편성·독립 영수증 | 동맹 메뉴 |
| 보고서 | PlanetDetails / useCompletionNotice | 실제 완료/취소 이벤트, 완료 알림 중복 억제 | 보고서 + 최근 활동 |
| 편성 연습 | App, Fleet/Mission/Support/Base/OperationPanel | 로컬 게임/저장 보호 | 편성 연습 메뉴 |
| 은하·정찰·이동/회피·외교·랭킹 | 실제 운영 Action/상태 계약 없음 | 설계 문서와 향후 계획 존재 | 미연결로 명시, 결과/ETA/API 생성 안 함 |

데모의 모든 기존 메뉴는 상세를 열 수 있다. 이는 실제 기능의 이관 완료를 뜻하지 않는다. 원본 앱은 계속 기존 기능을 제공한다. 모바일은 주요 4개+더보기에서 개인 작전/동맹/보고서/편성 연습까지 접근한다.

## 문제 TOP 7

| 우선 | 문제·분류 | 실제 근거 | 영향 / 대응 |
|---|---|---|---|
| 1 | 현재 아트 방향과 최신 요청 불일치 · 정체성 | operations.css의 Ceramic light surface 및 기존 `overview-desktop.png`; PlanetOverview는 중앙 구체 없는 운영 표 | 기존 결정의 오류로 단정하지 않음. 최신 요청에 맞춘 어두운 독립 관제 시안을 비교 제공 |
| 2 | 동일 데이터 다중 노출 · 계층 | HUD 자원/전력 + page-readiness 함대 + outcome cards + 생산 표 + next-actions | 메인은 자원 요약·중앙 시설·주요 작업, 상세 수치/전체표는 drawer로 이동 |
| 3 | 모바일 핵심 행동 도달 지연 · 발견성 | 기존 `overview-mobile.png`에서 상단 메뉴/참가자 연결/자원/상태가 첫 600px 이상 점유 | 주요 4개 하단 메뉴, 현재 작업·건설 CTA 상단 요약, 위협 CTA는 행성 앞 |
| 4 | 디자인 값 중복·override 비용 · 일관성 | styles.css 1785줄, dashboard.css 21줄(긴 압축 규칙); 각각 고유 hex146/140개. operations/unified에도 182/186개; 값은 중복 포함 아님, 파일별 고유값 | 새 화면은 시맨틱 토큰 한 벌. 기존 CSS는 건드리지 않고 이관 승인 후 범위를 나눔 |
| 5 | 작은 중요 텍스트·메뉴 수평 탐색 · 가독성 | dashboard.css의 9~12px 작업/연결/자원 보조 설명, 모바일 기존 가로 메뉴 | 실제 수치 18~27px, 본문14px, 보조12px; 모바일44px 핵심 버튼. 최종 사용자 독해 시험 필요 |
| 6 | 위협 모델 부재 · 상태 진실성 | empire/types.ts의 EmpireState에 incoming/threat 없음. EmpireAction에 이동/회피 없음 | 위협은 DEMO fixture만. 고정 ETA 예시를 명시하고 실제 확정 비활성. 신규 서버 계약은 이번 범위 밖 |
| 7 | 정적 행성과 성장의 분리 · 상태 시각화 | 기존 `planet-dashboard-scene-v1.png`에는 도시/우주 정거장이 합성되어 개별 수준을 조절할 수 없음 | 원본 자산 보존. 데모의 별/구체/시설광/궤도/경보를 분리, facilities 수준 직접 대응 |

## 패키지 충돌 조정

1. 기본 컬러는 제안값을 채택하되 기존 밝은 theme와 혼합하지 않는다. 새 global `:root`는 독립 HTML에서만 로드한다.
2. 패키지의 EARLY/DEVELOPING/ADVANCED/IMPERIAL은 아트 제안이며 실제 성장 산식이 아니다. 현재 모델의 개별 시설 수준을 직접 표시한다.
3. 패키지 자원 예시와 달리 실제 자원은 **합금·결정·연료**다. 전력/시설 공간은 소모 재화와 분리한다.
4. 은하/정찰/이동/회피·랭킹을 기존 서비스 기능처럼 활성화하지 않는다. 실제 없는 좌표/성공 확률/회피 목적지도 생성하지 않는다.
5. 패키지의 타임아웃 일반 가이드보다 기존 **동일 commandId의 원 명령·참가자·대상 보존 및 영수증 확인**이 우선한다. 데모에서는 command 경로 자체가 없다.
6. 모션 툴·shadcn·Three.js는 필요 없음. native dialog + CSS + 단발 Canvas2D 사용.

## 증거와 한계

- 사전 시각 근거: `docs/qa/2026-10-14-dashboard/overview-desktop.png`, `overview-mobile.png`와 현재 소스. 해당 캡처는 10월14일 기록임을 구분한다.
- 이번 실행의 현재 앱 재검증: `docs/qa/2026-10-15-refoundation/baseline-app/`의 임시 DB 캡처 및 검사 수치.
- 새 화면: 같은 QA 폴더의 6해상도×3상태 캡처와 `checks.json`.
- 인간의 3초/5초 인지 및 주관적 선호, 실제 모바일 GPU/배터리/터치 기기, 스크린리더 음성은 자동 테스트로 대체하지 않는다.
