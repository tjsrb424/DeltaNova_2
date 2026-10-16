# 자유 함대 편성 검증 근거 · 2026-10-16

최신 설계/평가: [FREE_FLEET_REVIEW](../../uiux-refoundation/FREE_FLEET_REVIEW.md). 독립 정적 데모만 렌더했다. 운영 API/DB에 연결하지 않았다.

| 검사 | 실행 명령 | 결과/원본 |
|---|---|---|
| 프로젝트 | `npm test -- --maxWorkers=2` |31파일320/320, [실행 요약](./tests-summary.txt) |
| 통합/기존 화면 | `npm run build` 후 `node tools/verify-uiux-polish.mjs` |35검사/15조합, [integration-checks.json](./integration-checks.json) |
| 이번 함대 보완 | `node tools/verify-free-fleet.mjs` |14검사/8뷰포트, [fleet-checks.json](./fleet-checks.json) |
| 빌드/정적 HTTP | `npm run build`, `npm run verify:build` |각 exit0. 원래 운영 빌드도 성공 |
| 범위/공백 | `git diff --name-only -- src server package.json package-lock.json`, `git diff --check` |운영/의존성 변경 없음, 공백 오류 없음 |

브라우저 스크립트는 Playwright와 Chrome headless를 사용한다. 기존 Codex 런타임 경로가 없는 환경은 `DELTA_NOVA_PLAYWRIGHT`에 사용 가능한 Playwright 모듈 경로를, `DELTA_NOVA_BROWSER`에 Chromium 실행 파일 경로를 지정한다. 제품 실행/빌드에는 Playwright가 필요 없다. 새 패키지를 설치하지 않았다.

이번 함대 검사는 `public/`을 loopback 임시 정적 서버로 읽는다. 통합 검사는 빌드된 `dist/`를 읽는다. 결과의 임시 포트는 검사마다 달라진다. 원래 출력은 `.delta-nova/free-fleet-review/`, `.delta-nova/uiux-strategy-review/`에 생성된다. 이 폴더에는 최종 결과 JSON과 대표 캡처를 복사해 보존했다.

## 대표 캡처

- [데스크톱 실제 화면](./fleet-desktop-frame.png), [전체 편성 화면](./fleet-1440x900.png)
- [390px 직접 편성](./fleet-editor-390.png), [320px/200% 글자](./fleet-text-200-320.png)
- [명령 확인](./fleet-confirm.png), [출항 장면](./fleet-departure.png), [이미지 로딩 실패](./fleet-art-unavailable.png)

캡처는 코드의 실제 브라우저 렌더이며 생성형 목업이 아니다. 장식 이미지 원본은 [아트 보존 폴더](../../art-source/free-fleet-v1/README.md)에 별도로 있다.

## 성능 표본

[첫 인코딩](./performance-initial.json), [최적화 후](./performance-final.json)를 보존했다. baseline은 c251b00이며, 서빙 중인 strategy.js가 Git 원문과 일치함을 검증했다. 이전/이후 로컬 정적 서버를 각각5180/5181에서 읽고 새1440×900 컨텍스트3개, 입력12회씩 측정했다. 최종 표본은 before/after를 번갈아 실행했다. 각 페이지에서 `performance.getEntriesByType('navigation')`, `/art/` 리소스의 `decodedBodySize`, input 이벤트 전 시각부터 두 번의 requestAnimationFrame까지의 차이를 기록했다.

이 측정은 실제 INP·모바일 GPU·망 지연 보장이 아니다. 전송량392,300bytes와 콜드 로딩/꼬리 입력 지연 증가를 보고서에 비용으로 기록했다.

## 발견해서 수정한 실패

1. 첫 TDD 실행은3/3 실패했다. 자동5척·접힌 입력·수동 수량에 기본 함선이 섞이는 기존 동작을 재현했다.
2. 기존 브라우저 스크립트의 자동 편성/접힌 disclosure 전제를 직접 수량 선택으로 변경했다. 검사할 행동 자체를 생략하지 않았다.
3. 실험실 래스터180px가76~110px 열을 넘는 문제는 실제 카드 너비에 맞춰 고쳤다. 별도 리뷰와4해상도 경계 검사 통과.
4. 하단 요약이 초기화 버튼을 덮는 문제는 실제 높이를 본문 여백에 반영해 고쳤다. 320px/200% 글자에서도 실제 클릭 통과.
5. 작은390×390 화면에 가로 전용 헤더가 적용되던 문제는600px 최소 너비 조건으로 고쳤다.

실제 모바일 단말·음성 스크린리더·사용자 인지 과제 검수는 남아 있다.
