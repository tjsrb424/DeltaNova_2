# 모바일·접근성·로딩·함선 재검수 근거

2026-10-16 · `codex/demo-visual-unification` · 기준 `e0f9e279c3b66bcb62b4cb6690bf1e0aed050667`

독립 정적 데모와 기존 headless Chrome/Playwright runtime으로 검수했다. 게임 서버 데이터나 사용자 브라우저를 조작하지 않았다. [문제·변경·점수·성능 해석](../../uiux-refoundation/MOBILE_A11Y_LOADING_REVIEW.md), [설치·재개](../../uiux-refoundation/HANDOFF.md).

## 실행 결과

| 검사 | 결과 | 원문 |
|---|---|---|
| 기준 코드 진단 |9검사 중5실패 |[before.json](./before.json) |
| 추가 모바일/AX/로딩 경계/아트 해시 |11/11 통과 |[mobile-a11y-report.json](./mobile-a11y-report.json) |
| 기존 프로젝트 회귀 |32파일326/326 통과 |[tests.json](./tests.json) |
| 기존 통합 |35검사/15레이아웃 통과 |[integration-results.json](./integration-results.json) |
| 자유 편성 회귀 |14검사/8레이아웃 통과 |[free-fleet-results.json](./free-fleet-results.json) |
| 전체 화면·네온 효과 |11검사/120레이아웃/45글자 확대 조합 통과 |[all-views-report.json](./all-views-report.json) |
| 빌드/HTTP/스코프 |TypeScript+Vite, loopback HTTP 통과 |[verification-summary.json](./verification-summary.json) |
| 저속 조건 전후 비교 |4화면×전후3회,24 cold loads |[performance.json](./performance.json), [정의·최소/최대](./performance-analysis.json) |
| 기존 함선8종+격납고 재평가 |V2 9.60~9.70,격납고9.60 유지 |[항목별 게이트](../../art-source/fleet-refinement-v2/review-gate.json), [원본·해시·반려](../../art-source/fleet-refinement-v2/README.md) |

기준의5실패는 AX 수량 설명, 편성 변경 발화 영역, 단계 변경 발화 영역, 메뉴 경유 요약바 위치, 숨겨진 행성 텍스처 요청이다. 최종 도구에는 원본/런타임 해시 및 실제 선체 경계 검사를 추가했다. [진단 이력](./review-history.json)에 추가 발견과 도구 보정도 구분했다.

15개 화면에서 한 main/h1·이름 있는 nav/조작을 Chromium AX tree로 확인했다. 수량8개의 현지 가용량·6척/지휘12 description, 입력 포커스·정확한 오류/도착 안내,24개 높이/글자/포커스 조합, forced colors의 skip link/dialog Tab·Escape 복귀,11폭×8함종의 실제 alpha 경계를 검사했다. 스크립트 오류/게임 API 요청은0. 기존 전체 도구는 모션 감소·수동 정지·비가시 상태, fallback·오프라인·빈 결과, 텍스트 대비 근사, 터치 에뮬레이션도 검사한다.

전체 뷰포트:1920×1080,1440×900,839×1065,390×844,360×800,320×568,844×390,390×390. 글자200%는15화면×320/390/844px. 추가 포커스는390×844,320×568,390×430,320×390에서 일반/200%·3함종이다. 함선 경계는1920/1440/1152/1024/839/768/760/390/361/360/320px이다.

## 대표 캡처

- [390px 함선8종 실제 카드](./fleet-cards-390.png), [1440px 카드](./fleet-cards-1440.png), [원본/120/160px 비교 시트](../../art-source/fleet-refinement-v2/comparison-sheet.png).
- [메뉴 경유 후 요약바](./mobile-summary-after-navigation.png), [320px 명령](./strategy-command-320x568.png), [320px/글자200%](./strategy-command-text-200-320.png).
- [고대비 연구](./forced-colors-research.png), [모바일 행성](./idle-390x844.png), [모바일 전체 명령](./command-390.png).
- [네온 출항4척](./neon-outbound-desktop.png), [320px 네온6척](./neon-six-mobile-320.png).

캡처를 실제로 열어 카드 실루엣·문구 간격·모바일 행성·고대비 읽기 상태를 검토했다. 아트 후보 원본과 실제160px 카드는 별도로 검토했다. 자동 검사의 성공을 눈으로 본 평가로 대체해 표현하지 않는다.

## 로딩 해석

390×844/DPR3, cache off, down1.6Mbps/up750kbps, 설정 latency150ms, CPU4배의 사용자 정의 에뮬레이션이다. baseline 모든 파일을 Git blob SHA로 검증했다. 전후 순서를 교차했고24표본을 전부 남겼다. 최초 Node IPC 시각 대신 브라우저 MutationObserver의 초기 DOM 준비 시각을 최종 비교에 사용했다.

최종12개 after 표본의 **초기 layout-shift 누적합은 모두0**이었다. 원인은 자원 영역52px 증가, 늦게 배치한 궤도/아이콘/로딩 문구였다. [최초 원인 표본](./startup-shift-before-fix.json), [공간 예약만 한 중간 표본](./startup-shift-first-fix.json)과 최종을 비교한다. `cls` 필드는 session-window 알고리즘이 없는 관측 합이다. 공식 CLS/Web Vitals 전체 인증으로 표현하지 않는다.

건설/연구 리소스 본문 합은 각각468,190bytes, 명령559,052bytes 줄었고 홈은2,176bytes 늘었다. WebP 함선은90,862bytes(38.0%) 작아졌다. decodedBodySize와 파일 bytes이며 gzip 전송량/전체 배포 파일 합계가 아니다. V1 원본은 보존한다.

명령 ready 중앙값5201.1→6355.8ms, 입력 doubleRAF p95 59.5→157.7ms는 **악화**다. 홈 after ready 최대22.2초와 연구 before 최대30.6초 등 큰 변동도 원문에 남겼다. 공유 호스트 영향과 코드 비용을 분리하지 못했다. 성능 전체 개선·실제 INP·물리 기기 체감9.5점을 주장하지 않는다. 다음 성능 검수는 통제한 실기기의 명령 진입/수량 입력을 우선한다.

## 재현 명령

```powershell
npx vitest run --maxWorkers=1 --testTimeout=30000 --hookTimeout=30000 --reporter=default --reporter=json --outputFile.json=.delta-nova/mobile-final-tests.json
npm run build
npm run verify:build
$env:DELTA_NOVA_DEMO_ROOT='dist'
node tools/verify-demo-mobile-a11y.mjs
node tools/verify-uiux-polish.mjs
node tools/verify-free-fleet.mjs
node tools/verify-visual-unification.mjs
```

추가 모바일/전체 화면/통합 도구는 위 env로 dist를 검사한다. 기존 자유 편성 도구는 public을 검사한다. 성능 baseline 준비와 환경 경로 설정은 HANDOFF 맨 위에 있다. `node tools/profile-demo-loading.mjs`는 public을 전후 비교하며, 기본4화면×각3회이다. 출력은 ignored `.delta-nova/`이므로 새 날짜 폴더에 필요한 원문만 복사한다. 무거운 브라우저·성능 검사는 한 번에 하나씩 실행한다.

## 한계와 남은 확인

AX tree와 DOM live region 문구는 음성 발화 검증이 아니다. Chrome 에뮬레이션은 실기기, safe area·소프트 키보드, VoiceOver/TalkBack, 배터리/GPU·INP를 증명하지 않는다. 일부 대비 검사는 단색 합성의 근사치이다. 그래픽9.60~9.70은 원본과160px 카드의 내부 평가이며 객관적 AI 판별/품질 인증/사용자 승인이 아니다. 데이터 연동과 운영 UI 교체는 계속 보류한다.

## 이렇게 테스트하세요

1. HANDOFF의 최신 브랜치를 받아 `npm run dev:solo -- --port 5181 --strictPort`로 실행하고 명령 데모에 직접 접속한다.2케스트럴·1바스티온·1멘더를 편성해 정확히4척의 네온 출항/도착/귀환을 확인한다.
2.320/390px·글자200%에서 출격 메뉴→타르시스 공격→아래 함종까지 이동하며 요약바·수량 입력·하단 메뉴/초기화가 가리지 않는지 확인한다. Tab/Shift+Tab·Escape·모션 감소·고대비도 확인한다.
3. 실제 휴대폰의 키보드가 열린 수량 입력과 VoiceOver/TalkBack의 가용량/제한/오류/단계 안내를 다음 검수로 진행한다. 독립 데모만 사용한다.
