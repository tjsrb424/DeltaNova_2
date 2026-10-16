# 게임 용어·데모 안내 검수 — 2026-10-16

기준: `17864b2cf0ba31ef8c5a72a5ac8daa20a0b19fac`. 정적 dist의 독립 데모를 headless Chromium에서 검수했다. 브라우저·편집기·미리보기 창을 열지 않았다. [변경 범위·용어 기준](../../uiux-refoundation/GAME_LANGUAGE_REVIEW.md), [다른 환경에서 이어가기](../../uiux-refoundation/HANDOFF.md).

## 최종 근거

최종 집계는 [verification-summary.json](./verification-summary.json)을 따른다. **최종: 33파일·341테스트, 빌드·빌드 검증, headless 검사70개 모두 통과.** 문구 전용69개·연구/건조24개·통합15개 레이아웃 검사와 모달20조건 AX 검사를 포함한다. 각 기록의 파일 해시와 [source-parity.json](./source-parity.json)을 함께 확인한다.

| 기록 | 확인 내용 |
| --- | --- |
| [tests-final.json](./tests-final.json), [전체 로그](./tests-final.log) | 기존 게임·UI·독립 데모 회귀 검사 전체 |
| [copy-browser.json](./copy-browser.json) | 15화면 × 1440/390/320px, 안내4조건, 확인창20조건. 총69개 레이아웃·대비·터치 크기 검사, 확인창20개 AX 확인 |
| [growth-browser.json](./growth-browser.json) | 연구4종·함선8종·정확한 비용·불완전 입력·원 지불 행성·환급·저장 공간·완료 후 취소 불가·포커스·터치 |
| [mobile.json](./mobile.json) | 15화면의 이름 있는 제어·랜드마크·수량 설명·입력 발화·가로/짧은 화면·200% 글자·강제 색상 |
| [actions.json](./actions.json) | 행동 우선 배치, 첫 화면의 건설 버튼 위치, 입력 노드/포커스 보존 |
| [integration.json](./integration.json) | 기존 탐색·모션·항로·행성·보고서·native dialog 흐름 |
| [code-review.json](./code-review.json) | 별도 소스 리뷰 지적3건 수정과 후속 지적0건 |
| [source-parity.json](./source-parity.json) | 변경된 runtime16파일의 public/dist/검수 해시 일치 |

‘데모 안내’는 상단에서 열고 summary로 초점을 옮긴다. 모바일에서 닫으면 상단 버튼으로 초점이 돌아온다. 열린 안내의 마지막 버튼에 대해 화면 좌표뿐 아니라 elementFromPoint로 실제로 가리지 않는지 확인한다. 최종 시작/취소 버튼은 비활성이고 모달 내부 안내를 aria-describedby로 참조한다. Escape·Tab·Shift+Tab·터치·강제 색상 모드도 확인한다.

## 발견한 화면 문제와 수정 근거

- [안내 가림 전](./guide-before.png) → [수정 후320px·글자200%](./guide-320-text200.png). 열린 안내의 z-index9가 고정 메뉴10 아래에 놓였다. 열린 상태11로 높여 스크롤 끝의 제어가 눌리는지 검사한다.
- [건설 버튼 가림 전](./construction-before.png), [전 위치 원문](./action-position-before.json) → [수정 후320×568](./construction-320.png), [최종 위치](./actions.json). 버튼 하단504.4px가 메뉴 시작496px에 가렸다. 모바일의 중복 안내 행을 닫힌 상태에서 숨겨 버튼 하단450.4px, 메뉴까지45.6px 여유를 확보했다. 기존 검사 기준12px를 유지한다.
- 귀환 단계는 수동 미리보기인데 ‘기다리세요’라고 안내했던 문구와 시설 상세의 비활성 버튼 설명 연결을 수정했다.

## 실패 기록 구분

- [기존 문구 검사 실패](./tests-old-copy-diagnostic.json): 이전 ‘시연·미연결’ 문구를 찾던14개 기대값을 새 게임 용어와 별도 안내 위치에 맞췄다. 비활성·원 지불 행성·수량·자원 불변·포커스 검사는 유지한다.
- [중복 버튼 선택자](./growth-selector-diagnostic.json): 동일한 ‘건설 취소’ 이름이 배경과 모달에 존재해 자동 검수가 두 버튼을 골랐다. 확인창 안의 최종 버튼을 검사하도록 범위를 좁혔다.
- [탐색 시간 초과](./navigation-timeout-diagnostic.json): 기존10초 탐색 제한에서 중단된 기록이다. 탐색·초기 화면 준비에60초를 주고 상호작용 제한은 유지한다. 로딩 속도가 개선됐다는 근거로 쓰지 않는다.
- [작업자 시작 원문](./worker-start-diagnostic.log), [초기 화면 준비 원문](./startup-timeout-diagnostic.json): 병렬 실행 중 Vitest worker 시작과 초기 화면 준비 대기가 시간 초과됐다. 최종 검수는 순서대로 실행하며 전체 파일 수·테스트 수·종료 코드까지 확인한다. 실패 캡처가 원래 실패를 가리지 않도록 최초 오류를 보존한다.

## 캡처

| 화면 | 캡처 |
| --- | --- |
| 건설 행동 위치 | [320px](./construction-320.png) |
| 연구 | [390px](./research-390.png) |
| 건조 시작 전 확인 | [390px](./build-confirm-390.png) |
| 취소·환급 | [390px](./refund-390.png) |
| 네온 출항·새 용어 | [390px](./orders-390.png) |
| 별도 데모 안내 | [320px·200%](./guide-320-text200.png) |

## 재현 명령

기존 의존성으로 실행한다. 아래 검수를 동시에 실행하지 않는다. Playwright/Chrome 위치가 다르면 HANDOFF의 DELTA_NOVA_PLAYWRIGHT/DELTA_NOVA_BROWSER 설정을 사용한다.

```powershell
npm test -- --maxWorkers=1 --testTimeout=30000 --hookTimeout=30000
npm run build
npm run verify:build
node tools/verify-demo-copy.mjs
node tools/verify-development-demo.mjs
$env:DELTA_NOVA_DEMO_ROOT='dist'
node tools/verify-demo-mobile-a11y.mjs
node tools/verify-command-actions.mjs
node tools/verify-uiux-polish.mjs
Remove-Item Env:DELTA_NOVA_DEMO_ROOT -ErrorAction SilentlyContinue
```

출력 경로는 DELTA_NOVA_COPY_REVIEW_OUT / DELTA_NOVA_GROWTH_REVIEW_OUT / DELTA_NOVA_MOBILE_REVIEW_OUT / DELTA_NOVA_ACTION_REVIEW_OUT / DELTA_NOVA_DEMO_REVIEW_OUT로 변경한다.

## 검증 범위의 한계

물리 iOS/Android, 실제 가상 키보드, VoiceOver/TalkBack 음성은 미검수다. Chromium 에뮬레이션·접근성 트리·키보드·캡처 근거와 구분한다. 실제 게임 데이터·전투 결과·소유 자산과 연결하지 않았다. 사용자 이해도·실서비스 성능을 실측한 것으로 점수를 만들지 않는다.

## 이렇게 테스트하세요

독립 데모의 상단 ‘데모 안내’를 연다. 함대의 ‘함선 건조’, 연구의 ‘연구하기’, 각 작업의 ‘건설 취소·연구 취소·건조 취소’를 확인한다. 320px 화면과 글자200%에서 안내를 끝까지 스크롤하고, 확인창을 Escape로 닫아 포커스가 원래 버튼으로 돌아오는지 확인한다. 최종 명령은 실행되지 않는다.
