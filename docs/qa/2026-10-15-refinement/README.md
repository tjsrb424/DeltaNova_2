# 독립 데모 개선 QA — 2026-10-15

최종 결과: **dist94/94**, 이전 동작18조합, 모델6/6, 기존191/191, build/verify:build PASS.

- [개선 후 확장 결과](./after/quality.json):7화면×3상태,44대비맥락,4화면200% 텍스트와8개 확대 패널,AX·위협·스크롤·터치·오류 주입.
- [개선 전 동일 검사](./before/quality.json):64/94. `before/site/`는 수정 전 데모의 독립 복사본이다. 미사용 신규 아트 파일이 포함되어도 기존 entry가 참조하지 않아 렌더에 영향을 주지 않는다.
- [리뷰 지적 재현](./review-before/quality.json):하단 메뉴 수정 직전의 강화 검사.320/360/390에서 잘림 실패. 다른 중간 실행/이전 검사 수는 최종94개와 구분한다.
- [이전 동작 검사](./regression/checks.json):6화면×3상태,5개 과제 경로,모션 감소·키보드·터치·상태 경계.
- [source/dist 해시](./manifest.json), [build](./build.log), [HTTP](./verify-build.log), [191테스트](./tests.log), [모델](./model.log).
- [평가·수정·한계](../../uiux-refoundation/REFINEMENT_REPORT.md), [아트 출처](../../uiux-refoundation/ART_PROVENANCE.md).

`after/` PNG는 최종 dist의 실제 headless 캡처다. `text-200-*`는 viewport, `text-200-full-*`는 전체 페이지이며 고정 메뉴 위치는 viewport 캡처로 판단한다. `accessibility-tree.json`은 Chromium CDP AX tree다. `progress.log`는 검사 이름별 결과, `quality.json`이 최종 판정이다.

## 재현

기존 Node/Chromium/Playwright runtime을 사용한다. 설치·사용자 창 생성·실제 API/Storage 조작 없음.

```powershell
npm run build
$env:DELTA_NOVA_DEMO_ROOT = 'dist'
$env:DELTA_NOVA_QUALITY_QA = 'docs/qa/local-refinement/quality'
node tools/verify-uiux-quality.mjs
$env:DELTA_NOVA_DEMO_QA = 'docs/qa/local-refinement/regression'
node tools/verify-uiux-demo.mjs
node tools/verify-uiux-model.mjs
npm test -- --maxWorkers=2
npm run verify:build
Remove-Item Env:DELTA_NOVA_DEMO_ROOT, Env:DELTA_NOVA_QUALITY_QA, Env:DELTA_NOVA_DEMO_QA
```

다른 환경에서는 `DELTA_NOVA_BROWSER`/`DELTA_NOVA_PLAYWRIGHT`에 기존 runtime을 지정한다. 새 출력 경로를 사용해 이번 근거를 덮어쓰지 않는다.

## 측정의 한계

flat DOM 색상 합성의 텍스트 대비 검사는 이미지 대비/전체 WCAG 인증을 포함하지 않는다.200%는 CSS 절대 font-size를 원래 media query 안에서 두 배로 만드는 시험이며 브라우저 zoom 조작과 구별한다. doubleRAF click 반응 proxy는 실측 INP가 아니다. 이미지 게이트를 포함한 planet-render 경과 시간은 CPU 연산 시간이 아니다. 물리 기기, 실제 음성 출력, 사용자 과제 성공률·인지 시간은 미측정이다.
