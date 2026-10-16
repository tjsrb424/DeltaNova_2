# DELTA NOVA UI/UX REFOUNDATION — 독립 검토 화면

사용자 요청일: 2026-10-15. 방향: **Minimal Galactic Command**.

**최신 후속 · 2026-10-16:** [명령 성능 원인 분리·실행 우선 배치](./COMMAND_PERFORMANCE_ACTIONS_REVIEW.md), [검증 원문·화면](../qa/2026-10-16-command-performance-actions/README.md). 같은 브랜치이며 최신 재개 명령은 HANDOFF 맨 위에 있다.

**이전 모바일 후속 · 2026-10-16:** [모바일·접근성·로딩·기존 함선 평가](./MOBILE_A11Y_LOADING_REVIEW.md), [검증 원문·실제 화면](../qa/2026-10-16-mobile-a11y-loading/README.md). 같은 `codex/demo-visual-unification` 브랜치. [이어가기](./HANDOFF.md) 맨 위를 사용한다.

**이전 전체 화면 후속 · 2026-10-16:** [전체 데모 그래픽·네온 출항 설계](./VISUAL_UNIFICATION_PLAN.md), [평가·검수](./VISUAL_UNIFICATION_REVIEW.md), [실제 화면](../qa/2026-10-16-visual-unification/README.md). 현재 브랜치는 `codex/demo-visual-unification`이며 데이터/운영 이관은 보류한다. [다른 PC에서 이어가기](./HANDOFF.md) 맨 위를 사용한다.

**이전 자유 함대 작업:** [자유 함대 편성·함선 아트·모션 설계](./FREE_FLEET_DESIGN.md), [최신 검수/평가](./FREE_FLEET_REVIEW.md). 해당 이력 브랜치는 `codex/free-fleet-visuals`이며 명령 화면은 빈 편성에서 시작한다. [다른 PC에서 이어가기](./HANDOFF.md)의 맨 위 안내를 사용한다.

**다른 PC/새 세션에서 재개:** [HANDOFF — 브랜치·설치·검사·승인 범위·다음 작업](./HANDOFF.md). 사용자 원본 킷과 원본 행성 PNG도 저장소에 포함했다.

현재 실행 중인 개발 서버에서 [독립 화면 열기](http://127.0.0.1:5181/uiux-demo/index.html). Vite는 `/uiux-demo/`를 기존 앱으로 처리할 수 있으므로 반드시 **index.html까지** 입력한다.

- [기존 UI 진단](./UI_AUDIT.md)
- [프로젝트에 맞춘 디자인 바이블](./DESIGN_BIBLE_REVISED.md)
- [구현 계획 및 결정](./IMPLEMENTATION_PLAN.md)
- [최신 모바일·접근성·행성 아트 개선 평가](./REFINEMENT_REPORT.md)
- [행성 아트 출처·최종 프롬프트](./ART_PROVENANCE.md)
- [최초 실행·평가 보고서 — 9.2 평가 보존](./REPORT.md)
- [확장 품질 검사 결과](../qa/2026-10-15-refinement/after/quality.json)
- [헤드리스 검사 결과](../qa/2026-10-15-refoundation/checks.json)
- [기존 앱 회귀 검사 결과](../qa/2026-10-15-refoundation/regression-results.json)

## 코드 경계

`public/uiux-demo/`의 독립 HTML/ES modules만 사용한다. 운영 React 앱, global CSS, API, DB, 게임 수식, 저장 기능과 연결되지 않는다. 기존 Vite 빌드는 이 폴더를 `dist/uiux-demo/`로 복사한다. 새 패키지는 필요 없다.

| 파일 | 책임 |
|---|---|
| index.html | 의미 있는 화면 구조·메뉴·dialog |
| tokens.css / style.css | 독립 시맨틱 토큰·반응형·모션 |
| model.js | 명시적 예시 데이터와 불변 상태 전환 |
| planet.js / planet-fallback.js / art/ | 자연 WebP 합성·행성별 캐시 / 분할 절차 fallback / 아트 |
| main.js | DOM 표시·안전한 상세·포커스·시연 입력 |

## 로컬 검증

```powershell
node tools/verify-uiux-model.mjs
node tools/verify-uiux-demo.mjs
node tools/verify-uiux-quality.mjs
npm test -- --maxWorkers=2
npm run build
npm run verify:build
npm run verify:empire
npm run verify:guild
```

브라우저 검증은 기존 Chromium과 Playwright runtime을 사용하며 설치하지 않는다. 다른 기기에서는 `DELTA_NOVA_BROWSER`에 Chrome/Edge 실행 파일, `DELTA_NOVA_PLAYWRIGHT`에 설치된 Playwright 경로를 지정할 수 있다. 기본 동작 검사는 `docs/qa/2026-10-15-refoundation/`, 확장 품질 검사는 `docs/qa/2026-10-15-refinement/after/`에 저장한다. `DELTA_NOVA_DEMO_ROOT=dist`로 빌드 결과를 검사할 수 있다. 기존 근거를 보존하려면 `DELTA_NOVA_DEMO_QA`/`DELTA_NOVA_QUALITY_QA`에 새 출력 경로를 지정한다.

서버가 꺼져 있으면 아래 명령으로 **데모 전용** 프런트엔드를 실행하고 `http://127.0.0.1:5180/uiux-demo/index.html`에 접속한다. 이 명령은 서버 API를 실행하지 않는다.

```powershell
npm run dev:solo -- --port 5180 --strictPort
```

## 이렇게 테스트하세요

1. 1920×1080 또는1440×900에서 자원 요약·중앙 행성·오른쪽 건설 관리 위치를 확인한다.
2. 상단의 `평시 → 적 함대 접근 → 행동 완료`를 누른다. 위협이 있는 상태에서 완료 예시를 눌러도 위협은 유지된다. 완료 화면만 보려면 평시를 먼저 누른다.
3. `회피 계획 검토`에서 위협 대상·선택 행성·고정 예시 시간을 확인한다. 실제 이동 버튼은 미연결 사유와 함께 비활성이다.
4. 행성을 베스퍼로 바꿔도 위협 대상은 노바 프라임으로 유지된다. 각 행성에서 시설 스냅샷을 바꾸고 원래 상태로 되돌린다.
5. 자원·건설·연구·함대·기타 메뉴를 열고 Escape/Tab/Shift+Tab으로 종료·포커스 복귀를 확인한다.
6. 모바일390×844/360×800에서 상단 주요 행동, 하단 메뉴·더보기, 긴 상세의 세로 스크롤을 확인한다.
7. 하단 시연 도구의 빈 작업·연결 오류·다시 표시를 시험하고, OS 모션 감소 또는 화면 설정의 정지를 확인한다.
8. 상단 `기존 게임으로 돌아가기`로 원본 화면을 연다. 데모는 원본 자원이나 저장에 영향을 주지 않는다.
