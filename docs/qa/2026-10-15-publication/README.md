# 커밋·푸시 직전 재검증 — 2026-10-15

사용자 요청에 따라 `codex/uiux-refoundation`의 데모·근거·원본·인수인계를 게시하기 직전 다시 실행한 결과다. 전체 서비스 UI 이관은 포함하지 않는다. [재개 문서](../../uiux-refoundation/HANDOFF.md)가 다음 세션의 시작점이다.

| 검사 | 결과 | 로그/결과 |
|---|---|---|
| `npm test -- --maxWorkers=2` |20파일191/191 PASS |[tests.log](./tests.log) |
| `node tools/verify-uiux-model.mjs` |6/6 PASS |[model.log](./model.log) |
| `npm run build` |PASS |[build.log](./build.log) |
| `npm run verify:build` |PASS |[verify-build.log](./verify-build.log) |
| dist 확장 headless 품질 |94/94 PASS,21화면/상태,44대비맥락 |[quality.log](./quality.log), [quality.json](./quality.json) |
| dist 기존 데모 동작 |18조합,5과제 경로 PASS |[demo.log](./demo.log), [demo.json](./demo.json) |
| source/dist |실행8파일 byte 일치 |[manifest.json](./manifest.json) |
| 원본 킷 |ZIP SHA 및 추출25파일 일치 |[킷 manifest](../../uiux-refoundation/reference-kit/manifest.json) |
| 생성 원본 아트 |보존된 PNG의 SHA 일치 |[아트 기록](../../uiux-refoundation/ART_PROVENANCE.md) |

[validation.json](./validation.json)에 실행 조건과 종료 코드를 저장했다. Node24.13.0/npm11.6.2, 기존 Chrome/Playwright, headless로 실행했다. 설치·실제 API/DB/저장 조작·사용자 창 열기 없이 검증했다.

작성한 코드/문서는 staged whitespace 검사도 수행한다. 원본 킷 Markdown의 의도적 줄 끝 두 칸과 실제 CLI 로그의 EOF 빈 줄은 보존하며 이 검사에서 제외한다. 킷은 별도 `.gitattributes`로 줄바꿈 변환을 막고 원본 해시로 검증한다.

루트 `.gitattributes`는 이번 독립 데모 HTML/JS/CSS와 검사 도구만 LF로 고정해 다른 OS에서도 실행 소스의 manifest 해시를 비교할 수 있게 한다. 기존 운영 소스의 줄바꿈 정책은 바꾸지 않는다.

중복 PNG 전체를 다시 커밋하지 않도록 이번 재실행 캡처는 무시된 `.delta-nova/uiux-publication-2026-10-15/`에 저장했다. 다른 PC에서는 원래 최종 [refinement/after 캡처](../2026-10-15-refinement/after/)를 열어보고 새 출력 디렉터리에서 검사를 재실행한다. 이번 검사 대상과 저장된 아트·코드의 SHA는 manifest로 확인할 수 있다.

이전9.50 점수와 검증 한계는 [개선 보고서](../../uiux-refoundation/REFINEMENT_REPORT.md)를 유지한다. 이번 결과가 실기 모바일/스크린리더 음성 검증이나 서비스 UI 이관 승인을 추가하지 않는다. 정확한 게시 SHA는 `git log -1` 및 원격 브랜치로 확인한다.
