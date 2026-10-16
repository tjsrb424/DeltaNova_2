# 전체 데모 그래픽·모션 검증 근거

2026-10-16 · `codex/demo-visual-unification` · 기준766b248

모든 브라우저 검사는 별도 headless Chrome의 로컬 정적 파일로 실행했다. 게임 서버나 사용자의 열린 브라우저를 조작하지 않았다. [변경·평가 보고서](../../uiux-refoundation/VISUAL_UNIFICATION_REVIEW.md), [설치·재개](../../uiux-refoundation/HANDOFF.md).

## 검사와 원문

| 검사 | 결과 | 근거 |
|---|---|---|
| 프로젝트 회귀 |32파일326/326 통과 |[tests.json](./tests.json) |
| 기존 통합 |35검사/15레이아웃 통과 |[integration-results.json](./integration-results.json) |
| 자유 편성 회귀 |14검사/8뷰포트 통과 |[free-fleet-results.json](./free-fleet-results.json) |
| 전체 화면/신규 효과 |11검사/120레이아웃/45글자 확대 조합 통과 |[all-views-report.json](./all-views-report.json) |
| 그래픽 채택 게이트 |채택5개 자산군 전부9.5점 초과 |[후보 기록](../../art-source/visual-unification-v1/review-gate.json), [원본/해시](../../art-source/visual-unification-v1/README.md) |
| 성능 비교 |4화면·각3회·전/후 교차, 총24로드 |[performance.json](./performance.json) |
| 빌드/HTTP |TypeScript+Vite 및 verify:build 통과 |[명령·출력 요약](./verification-summary.json) |

실행 명령:

```powershell
npx vitest run --maxWorkers=1 --testTimeout=30000 --hookTimeout=30000 --reporter=default --reporter=json --outputFile.json=.delta-nova/visual-unification-final-tests.json
npm run build
npm run verify:build
node tools/verify-uiux-polish.mjs
node tools/verify-free-fleet.mjs
$env:DELTA_NOVA_DEMO_ROOT='dist'
node tools/verify-visual-unification.mjs
```

기본5초 제한의 초기 전체 실행은 호스트 지연으로 추정되는 시간 초과로321/324,316/324였다. 전부 시간 초과 및 그 뒤 중복 DOM 영향으로 나타났고 해당 파일 단독 실행28/28과57/57은 기본 제한으로 통과했다. 제품/테스트 assertion을 바꾸지 않고 최종 전체 실행의 CLI 제한만30초로 늘렸다. 이후 연구 진입 테스트를 추가한 최종 결과는326/326이다. [실패와 재실행 이력](./deadline-reruns.json)을 보존한다. SQLite 실험 API 경고는 기존 Node 환경 경고다.

전체 화면: home/construction/research/fleet/defense/evasion/career/galaxy/guild/reports/practice/more/diplomacy/rankings/command. 뷰포트:1920×1080,1440×900,839×1065,390×844,360×800,320×568,844×390,390×390. 글자200%는15화면×320/390/844폭이다. 보고서의 파일 SHA는 검사한 dist 데모의 정확한 내용을 기록한다.

실제4척의 종류·수량, 최대6척의320/390/760/1440px 겹침/잘림0, 단계별 목적지 위치, 메뉴 복귀 때 도착 효과 재생0,6시설 아트와 비용,44px 조작, 가로 넘침/중복ID/검사한 텍스트 대비, 키보드/Back, OS 모션 감소·수동 정지·제어한 비가시 상태, 이미지 실패·빈 데이터·오프라인·터치 에뮬레이션을 확인했다. 검사한 API 요청/저장 호출/스크립트 오류는0이다.

## 실제 화면

각15화면의1440/390px PNG를 같은 폴더에 보존했다. 대표 화면:

- [네온 출항4척](./neon-outbound-desktop.png), [도착 위치](./neon-arrived-desktop.png), [320px 네온6척](./neon-six-mobile-320.png), [터치 시연](./neon-touch-mobile.png).
- [건설](./construction-1440.png), [선택 연구소](./construction-selected-lab.png), [모바일 건설](./construction-390.png).
- [연구](./research-1440.png), [모바일 연구](./research-390.png), [연구소 비교 CTA/시설](./research-action-mobile-390.png).
- [은하](./galaxy-1440.png), [모바일 전체 메뉴](./more-390.png), [동맹](./guild-1440.png), [보고서](./reports-1440.png).
- [320px/200% 건설](./construction-text200-320.png), [200% 연구](./research-text200-320.png), [200% 메뉴](./more-text200-320.png).

픽토그램 후보: [V1](./neon-candidate-v1.png), [V2](./neon-candidate-v2.png), [채택V3](./neon-candidate-v3.png). 시설: [80/160px 검토](./facilities-v2-80-160.png). 반려 시설 원본도 아트 소스 폴더에 보존했다.

## 해석의 한계

그래픽 점수9.60~9.75와 UI 내부9.50은 주관적 검토다. 자동 AI 판별/객관적 품질 인증·사용자 승인·WCAG 전체 인증으로 표현하지 않는다. 텍스트 대비 도구는 단색 합성의 근사치이며 배경 이미지의 모든 픽셀을 증명하지 않는다. 눈으로 본 대표 캡처와 함께 판단했다.

실제 휴대폰, 노치/키보드, VoiceOver/TalkBack 발화, 배터리/GPU, 인간의3초 발견 과제와 터치 지연은 미검수다. shared PC/localhost 측정과 doubleRAF는 실제 기기 성능/INP가 아니다. 건설 load 중앙값+47.4ms, 추가 래스터273,694bytes의 비용을 숨기지 않고 기록했다. 서비스 데이터 연결과 운영 UI 교체는 수행하지 않았다.

## 이렇게 테스트하세요

1. 최신 HANDOFF의 브랜치/실행 명령으로 데모를 연 뒤 건설·연구·전체 메뉴의 아트/행동을 확인한다.
2. 함대에서2케스트럴·1바스티온·1멘더를 직접 편성해 출항/도착/귀환의 네온4척과 편성표를 비교한다.
3.320/390px·200% 글자·모션 감소/정지를 확인하고, 다음 검수는 실제 휴대폰의 터치·음성 접근성·성능 순으로 진행한다.
