# UI/UX 재정비 QA 증거 — 2026-10-15

최종 결과는 `checks.json`과 `final-results.json`, `final-*.log`를 기준으로 읽는다. 모두 headless이며 사용자 DB나 사용자 브라우저 프로필을 사용하지 않았다.

- `idle/threat/complete-{width}x{height}.png`: 최종 dist의6해상도×3상태 viewport 캡처.
- `evasion-review-{desktop,mobile}.png`: 진입 모션이 끝난 회피 검토 상태.
- `idle-mobile-full.png`: 전체 세로 화면. 하단 고정 메뉴는 캡처 시점 viewport 위치에 찍히며 실제 화면에서는 viewport 바닥에 고정된다.
- `empty/offline/loading-desktop.png`: 예시 상태. 실제 서버 상태가 아니다.
- `zoom-200-percent.png`: CSS viewport720×450 리플로 상당 조건.
- `text-200-percent.png`:1440px에서 보이는 텍스트를200%로 확대한 검사.
- `first-*.png`, `second-desktop.png`: 초기 개선 과정의 캡처. 최종 시안으로 취급하지 않는다.
- `performance-before.json`: 비동기 분할 이전의 성능 표본. 최신 비교는 checks.json.
- `baseline-app/`: 기존 앱을 별도 임시 API/SQLite로 재검증한 화면과 행동 검사 수치.
- `regression-results.json`: 기존 build/HTTP/경제/공동/대시보드 검증 exit code.
- `final-results.json`: 모델·전체191테스트·최종 build·HTTP·dist 데모 검증 exit code.

`baseline-tests.log`는 worker2로 제한한 베이스라인 재검증이다. 최초 기본 병렬 실행에서 일부 UI timeout이 있었으며 최종 결과와 구별한다. `demo-browser.log` 등 중간 로그에 실패가 남을 수 있다. 실패 원인·수정·검사의 한계는 [실행 보고서](../../uiux-refoundation/REPORT.md)를 참조한다.

자동 과제 동작 통과는 실제 사람의 인지 시간, 실제 모바일 기기, 음성 스크린리더, 전체 접근성 인증, 최종 디자인 승인을 뜻하지 않는다.
