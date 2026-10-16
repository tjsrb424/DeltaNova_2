# 연구·조선·취소/환급 검증 원문

2026-10-16 · baseline `45abb204aa7f038f20d1671dd9fe78a1836d9685` · `codex/demo-visual-unification`

[디자인·규칙·평가·직접 확인](../../uiux-refoundation/GROWTH_PREPARATION_REVIEW.md) · [다른 PC 실행/검수](../../uiux-refoundation/HANDOFF.md) · [집계·범위 보존](./verification-summary.json)

## 최종 결과

| 검수 | 원문 |
|---|---|
|전체33파일·340테스트|[tests-final.json](./tests-final.json)|
|신규11개 흐름·24개 레이아웃/대비·터치·모달AX|[growth-browser.json](./growth-browser.json)|
|기존 행동/명령7개|[actions.json](./actions.json)|
|기존 모바일/접근성11개|[mobile.json](./mobile.json)|
|통합35개/15레이아웃|[integration.json](./integration.json)|
|자유 함대14개/8레이아웃|[free-fleet.json](./free-fleet.json)|
|전체15화면11개/일반120·글자200%45레이아웃|[all-views.json](./all-views.json)|

최종 제품 소스에서 build/verify:build도 성공했다. 모든 브라우저 검수는 headless이고 순서대로 실행했다. 새 도구는 기본dist, free-fleet 도구만 기존public을 검수한다. 게임API를 시작하거나 기존 DB를 사용하지 않는다. 각 검수 흐름에서 요청/Storage/런타임 오류가 없음을 확인하며 전체 서비스의 모든 경로를 검증했다는 뜻은 아니다.

## 새 검수의 범위

- 연구4종: 선택·효과·해금·정확한 가격/시간, 최대 수준 상태와 접힌 메뉴/초점 유지.
- 함선8종:1~20 정수 입력/증감, 합산 견적, 입력 노드·포커스 유지, 빈 값/소수/범위 초과 차단.
- 건설/연구/건조 취소 검토: 원 지불 행성, 자원별80% 내림/미반환, 저장 상한, 완료 후 반환0, 검토 종료 뒤 자산/작업 유지.
- 선택 행성이 베스퍼여도 연구 환급은 노바 프라임이며 행성/연결/탐색 변화에 낡은 모달을 닫는다.
-1440×900,390×844,320×568,844×390 각각 일반/글자200%에서 연구·조선·환급24개 레이아웃/대비 검수. 모바일/가로는44px, 데스크톱은24px 이상의 조작 영역을 검사한다.
- Tab/Shift+Tab/Escape·초점 복원·forced colors, 모바일 터치 emulation(DPR3/isMobile/hasTouch), 모달 내부 고정 live 영역의 **정확한 DOM 요소와 AX backend node 일치**를 검증한다.
- 기존 아트 실패에도 함종 이름/수량/견적/검토를 유지한다. 승인된 기존 V2 bitmap/glyph를 재사용하고 새 이미지/패키지를 추가하지 않는다.
- 실제 시작/취소 버튼은 항상 미연결·비활성이다. 실제 함선/연구 완료나 취소 성공을 생성하지 않는다.

## RED와 별도 리뷰

- [규칙7개 RED](./model-red.json) → [GREEN](./model-green.json): 카탈로그를 canonical TypeScript와 대조하고 환급/수량 경계를 검증한다.
- [UI3개 RED](./ui-red.json): 선택 목록, 환급 확인, 입력 유지.
- [상태 비교 메뉴/초점 RED](./expanded-red.json): 재렌더 후 details 접힘을 수정했다.
- [환급 조건 안내 RED](./refund-announcement-red.json), [모달 Tab 이탈 RED](./dialog-focus-red.json).
- [모달 내부 live 영역 RED](./modal-live-region-red.json): 별도 읽기 리뷰의 Important1건을 수용했다. 바깥 live 영역의 textContent만으로 발화를 입증할 수 없어 내부 영속 영역으로 옮겼다. 최종 [growth-browser](./growth-browser.json)의 accessibility 항목에 열린 모달의 정확한 AX노드·속성·안내 문자열을 남겼다.
- [페이지 탐색8초 초과 진단](./navigation-timeout-diagnostic.json): 공유PC의 load timeout을 남긴다. 탐색60초/조작8초로 분리했고 이를 로딩 속도 개선 근거로 사용하지 않는다.
- [기존 상세창 선택자 RED](./legacy-dialog-selector-red.json): 두 네이티브 dialog를 한 선택자로 찾던 기존 검수는 대상 상세창 ID로 한정했다.
- [구형 보존용 품질 도구 추가 진단](./archival-quality-diagnostic.json): 기준45abb20부터 접혀 있는 시연 설정을 열지 않고 평시 버튼을 클릭해0개 본검사에서 중단된다. 최신 통합/전체화면 도구와 검사 계약이 달라 이번 필수 검수의 통과로 합산하지 않았다. 이 도구에 시도한 선택자 변경은 원본으로 복원했다.
- 최종 별도 읽기 코드 검토: Critical0/Important1/Minor0. Important는 위 RED→GREEN 및 최종 전체340테스트로 수정 검증했다.

## 화면 캡처

[연구1440](./screenshots/research-1440.png) · [연구390](./screenshots/research-390.png) · [조선1440](./screenshots/shipyard-1440.png) · [조선390](./screenshots/fleet-390.png)

[환급390](./screenshots/refund-390-text100.png) · [환급320/글자200%](./screenshots/refund-320-text200.png) · [가로 건조 검토/글자200%](./screenshots/fleet-plan-844-text200.png) · [터치 조선](./screenshots/touch-shipyard-390.png)

화면 캡처는 최종dist에서 생성한다.200%/짧은 화면에서는 정상 스크롤로 비용·조건·환급 전체를 읽는다. 실제 iOS/Android 소프트 키보드·노치·VoiceOver/TalkBack 발화, 실제 기기의 INP/전력·사용자 이해도 실험은 미검수다. 내부 디자인 평가는 보고서에 별도로 표시하며 자동 검사 결과를 점수로 환산하지 않는다.

## 이렇게 테스트하세요

1. 같은 브랜치를 받고 `npm ci` 후 `npm run dev:solo -- --port 5181 --strictPort`로 실행한다. `/uiux-demo/index.html?review=growth-preparation#view=research`에서4기술을 비교한다.
2. 함대 상단 조선 계획에서 케스트럴3척의120/60/30·2분 견적, 소수/빈 값 차단, 원래 보유량 유지와 선행 연구 이동을 확인한다.
3. 각 대기열의 취소·환급 검토에서 조건을 바꾸고 Tab/Shift+Tab/Escape로 조작한다. 베스퍼 선택/320px/글자200%/가로/모션 줄이기로 반복한다. [HANDOFF](../../uiux-refoundation/HANDOFF.md)의 검수 명령은 순차 실행한다.
