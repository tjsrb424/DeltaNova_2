# 최신 후속 · 2026-10-16 연구·조선·취소/환급

현재 브랜치는 **`codex/demo-visual-unification`**, 이번 출발 기준은 `45abb204aa7f038f20d1671dd9fe78a1836d9685`이다. 아래 성능/그래픽 작업의 수치와 SHA는 이력으로 유지한다.

- [화면·규칙·평가·검수](./GROWTH_PREPARATION_REVIEW.md), [원문·캡처·재현](../qa/2026-10-16-growth-preparation/README.md).
- 연구4종의 효과/해금/자원·시간, 함선8종의1~20척 견적, 건설/연구/건조의 취소·환급 검토를 추가했다.
- 원 지불 행성,80% 내림 반환, 저장 상한·완료 후 취소 불가를 기존 규칙과 맞춘다. 실제 시작·취소는 비활성/미연결이며 자산/대기열/함대를 바꾸지 않는다.
- `development-model.js`는 명시한 표시 예시·카탈로그, `development.js`는 렌더러, `development-controller.js`는 선택·수량·검토창 수명/키보드 제어다. 운영 TS를 브라우저에서 import하지 않고 카탈로그 동등성을 테스트한다.
- 새 비트맵/패키지/타이머/API/저장소를 추가하지 않았다. 운영 게임·산식·src/server/아트 원본과 기존 체크아웃은 보존한다.
- 별도 읽기 리뷰의 Important1건(모달 밖 live 영역이 inert)을 모달 내부의 영속 live 영역으로 수정하고 열린 AX 트리로 검증했다.
- 실제 휴대폰 키보드/VoiceOver/TalkBack 음성과 기기 성능은 후속이다. 데이터 연결·서비스 UI 이관·main 병합은 계속 보류한다.

다른 PC에서는 아래 기존 clone 명령으로 같은 브랜치를 받고 `npm ci` 후 실행한다:

```powershell
npm run dev:solo -- --port 5181 --strictPort
```

직접 `http://127.0.0.1:5181/uiux-demo/index.html?review=growth-preparation#view=research`에 접속한다. 함대 화면 상단의 조선 계획 바로가기로 건조를 검토하고, 각 대기열의 취소·환급 검토를 연다. 상단 시설 스냅샷과 빈 작업 상태는 검토용 조건이며 실제 게임 성공을 만들지 않는다.

검수는 기존 설치된 headless Chrome/Playwright로 순서대로 진행한다. 다른 환경의 경로는 아래 `DELTA_NOVA_BROWSER`/`DELTA_NOVA_PLAYWRIGHT` 설명을 따른다.

```powershell
npx vitest run --maxWorkers=1 --testTimeout=30000 --hookTimeout=30000
npm run build
npm run verify:build
$env:DELTA_NOVA_DEMO_ROOT='dist'
node tools/verify-development-demo.mjs
node tools/verify-command-actions.mjs
node tools/verify-demo-mobile-a11y.mjs
node tools/verify-uiux-polish.mjs
node tools/verify-visual-unification.mjs
node tools/verify-free-fleet.mjs
Remove-Item Env:DELTA_NOVA_DEMO_ROOT -ErrorAction SilentlyContinue
```

새 검수 출력은 `DELTA_NOVA_GROWTH_REVIEW_OUT`로 바꾸며 기본은 ignored `.delta-nova/growth-preparation/browser`다. 자유 함대 도구는 기존처럼 public을 검수하고 다른 위 도구는 지정한 dist를 검수한다.

다음은 보고서·정비·재투자 UI → 홈/지도/함대의 동일 대상·상태 → 실기기/음성 검수 순으로 이어간다.

---

# 최신 후속 · 2026-10-16 명령 성능·행동 우선 배치

브랜치는 **`codex/demo-visual-unification`**, 이번 비교 기준은 `255fa766ee92e1c1794e440e9e35d02c5b1ea080`이다. 독립 데모만 변경하며 데이터/서비스 UI 이관과 main 병합은 보류한다. 아래 이전 후속의 측정/기준 SHA는 당시 이력이다.

- [원인 분리·수정·성능/UX 검수](./COMMAND_PERFORMANCE_ACTIONS_REVIEW.md), [전후 원문·캡처·재현](../qa/2026-10-16-command-performance-actions/README.md).
- 명령 직접 진입의 중복 화면 배치와 숨겨진 장면 측정을 줄이고, 입력 표시 노드를 유지한다. 같은 값의 change 재처리를 생략하며 즉시 편성/오류/안내 반영을 유지한다.
- 건설은 선택/실행→현재 건설→아트/효과/전체 비용·조건 순이다. 연구/함대/홈의 주요 행동도 설명 위에 둔다. 미연결 명령은 비활성이다.
- 이번 검수도 headless이며 물리 기기·음성 스크린리더·실제 INP/전력은 미검수다. 수치는 사용자 정의 slow-network/CPU 조건의 관측이며 서비스 성능 보장이 아니다.

아래 기존 clone 명령으로 같은 브랜치를 받는다. 데모는 `npm run dev:solo -- --port 5181 --strictPort`로 실행한다. 직접 `http://127.0.0.1:5181/uiux-demo/index.html?review=command-actions-v3#view=construction` 또는 `#view=command&target=tarsis&intent=attack&context=solo&step=fleet`에 접속한다. 창을 자동으로 열지 않는다.

추가 검수(빌드 후):

```powershell
$env:DELTA_NOVA_DEMO_ROOT='dist'
node tools/verify-command-actions.mjs
node tools/verify-demo-mobile-a11y.mjs
```

명령 성능 재현은 다른 작업/브라우저 검수와 동시에 실행하지 않는다:

```powershell
New-Item -ItemType Directory -Force .delta-nova | Out-Null
git archive --format=zip --output=.delta-nova/command-perf-baseline.zip 255fa766ee92e1c1794e440e9e35d02c5b1ea080 public/uiux-demo
Expand-Archive -LiteralPath .delta-nova/command-perf-baseline.zip -DestinationPath .delta-nova/command-perf-baseline -Force
Remove-Item Env:DELTA_NOVA_DEMO_ROOT, Env:DELTA_NOVA_COMMAND_MODE, Env:DELTA_NOVA_COMMAND_LABEL, Env:DELTA_NOVA_COMMAND_NO_PRELOAD, Env:DELTA_NOVA_COMMAND_MEMORY -ErrorAction SilentlyContinue
$env:DELTA_NOVA_COMMAND_REPEATS='8'
$env:DELTA_NOVA_COMMAND_PROFILE_OUT='.delta-nova/command-disk-recheck.json'
node tools/profile-command-isolation.mjs
$env:DELTA_NOVA_COMMAND_MEMORY='1'
$env:DELTA_NOVA_COMMAND_PROFILE_OUT='.delta-nova/command-ram-recheck.json'
node tools/profile-command-isolation.mjs
Remove-Item Env:DELTA_NOVA_COMMAND_MEMORY, Env:DELTA_NOVA_COMMAND_PROFILE_OUT, Env:DELTA_NOVA_COMMAND_REPEATS -ErrorAction SilentlyContinue
```

최종 비교는 원형 응답·파일 서버8쌍과 RAM 서버8쌍을 별도 기록한다. 양쪽 로드당6회 입력이며 RAM은 서버 읽기 대기만 제거하고 브라우저 cache off/동일 네트워크·CPU는 유지한다. LCP/load/입력 비용은 줄었고 DOM 초기화는 약0.2초 늘었다. [표본 범위·정의·원문](../qa/2026-10-16-command-performance-actions/README.md)을 함께 본다.

원인 진단용 `DELTA_NOVA_COMMAND_MODE=cost`는 로드당30회 입력/함수 wrapper 계측이다. `DELTA_NOVA_COMMAND_NO_PRELOAD=1`과 `DELTA_NOVA_COMMAND_LABEL=after`는 검수 서버 응답에서만 modulepreload3개를 제거하는 별도 대조군이다. 해당 설정은 정상 비교 전에 제거한다. 기존4화면 프로파일은 `DELTA_NOVA_LOADING_BASE_REF=255fa766ee92e1c1794e440e9e35d02c5b1ea080`, `DELTA_NOVA_LOADING_BEFORE=.delta-nova/command-perf-baseline/public`를 지정하고 `node tools/profile-demo-loading.mjs`로 실행한다. 그 결과와 명령 전용 최종 실험은 섞지 않는다.

결과는 ignored `.delta-nova/`에 저장된다. 현재 브라우저/runtime 경로 재정의는 아래 설명을 따른다.

다음 검수는 실제 휴대폰 키보드·VoiceOver/TalkBack·명령 입력 지연 순으로 독립 데모에서 진행한다.

---

# 최신 후속 · 2026-10-16 모바일·접근성·로딩 검수

현재 브랜치는 **`codex/demo-visual-unification`**이다. 이번 후속 기준은 `e0f9e279c3b66bcb62b4cb6690bf1e0aed050667`. main 병합, 서버 데이터 연결, 운영 UI 교체는 계속 보류한다. 기존 `D:/kim_dev/DeltaNova` 체크아웃/브랜치를 보존하고 별도 worktree에서 작업했다. 아래 이전 기록의 기준 SHA와 결과는 당시 이력이다.

- [최신 문제·개선·평가](./MOBILE_A11Y_LOADING_REVIEW.md), [실행 결과·원문·캡처](../qa/2026-10-16-mobile-a11y-loading/README.md).
- [함선8종·격납고 점수/원본/반려/해시](../art-source/fleet-refinement-v2/README.md). V1을 보존하고 실제160px 카드에서 검토한 V2를 적용했다. 점수는 주관적 내부 검토다.
- 편성 가용량/제한의 접근성 설명과 편성·단계의 live announcement, 메뉴 경유 모바일 요약바 고정, 숨겨진 행성 텍스처 지연 로딩, 초기 레이아웃 이동 보완. 게임 산식/명령 모델은 그대로다.

다른 PC에서는 아래 기존 clone/설치 명령으로 **같은 브랜치**를 받는다. `npm ci`는 프로젝트의 기존 의존성만 설치한다. 독립 데모는 `npm run dev:solo -- --port 5181 --strictPort`로 실행하고 직접 `http://127.0.0.1:5181/uiux-demo/index.html?review=mobile-a11y-v2#view=command&target=tarsis&intent=attack&context=solo&step=fleet`에 접속한다. 창을 자동으로 열지 않는다.

추가 검수 명령(기존 전체 검수 명령도 아래 유지):

```powershell
$env:DELTA_NOVA_DEMO_ROOT='dist'
node tools/verify-demo-mobile-a11y.mjs
```

저속 조건 전/후 비교를 재현할 때는 별도 `.delta-nova/` 경로에 다음 기준 파일을 준비한다. 이 도구는 baseline 모든 파일의 Git blob SHA를 검증한다. 공유 PC 시간 변동이 크므로 원문 범위와 중앙값을 함께 본다.

```powershell
New-Item -ItemType Directory -Force .delta-nova | Out-Null
git archive --format=zip --output=.delta-nova/mobile-loading-baseline.zip e0f9e279c3b66bcb62b4cb6690bf1e0aed050667 public/uiux-demo
Expand-Archive -LiteralPath .delta-nova/mobile-loading-baseline.zip -DestinationPath .delta-nova/mobile-loading-baseline -Force
node tools/profile-demo-loading.mjs
```

실제 iOS/Android 키보드·노치·VoiceOver/TalkBack 발화·물리 기기 INP/전력은 미검수다. 이 실행의 모바일은 Chromium emulation/AX tree/키보드/headless 캡처다. 첫 실기기 검수에서도 데모만 사용한다. 운영 연결은 별도 사용자 승인 후 논의한다.

---

# DELTA NOVA UI/UX — 다른 환경에서 이어가기

## 2026-10-16 최신 후속 작업 · 전체 데모 그래픽·네온 출항

현재 이어갈 브랜치는 **`codex/demo-visual-unification`**다. 기준은 `766b248119495122d38dbe7e0cd67c0187a1edc7`(자유 편성)이며 **main 병합·데이터 연결·운영 UI 교체는 수행하지 않는다.** 아래 자유 함대/기존 main 안내는 이력으로 보존한다.

- [전체 데모 설계](./VISUAL_UNIFICATION_PLAN.md), [구현·평가·직접 확인](./VISUAL_UNIFICATION_REVIEW.md), [실제 QA 원문/캡처](../qa/2026-10-16-visual-unification/README.md).
- 시설6종/연구/우주 원본과 수정·반려 후보, 공통UI26종/함종8종 네온 픽토그램은 [아트 원본·게이트·해시](../art-source/visual-unification-v1/README.md)에 있다. 새 그래픽은 원본/실제 크기로 검토하고 **9.5점 초과** 후보만 사용한다. 점수는 내부 판단이다.
- 출항 장면은 실제 로컬 편성의 한 척마다 네온 glyph를 그린다. 도착/주둔은 목적지, 귀환은 역방향. 수치/명령 단계는 기존 model을 사용하며 새 성공/타이머/저장/API를 만들지 않는다.
- 새 코드는 `public/uiux-demo/icons.js`, `visuals.js`, `visuals.css`이고 기존 renderers가 이를 사용한다. `src/`, `server/`, package/lock과 모델 산식은 변경하지 않았다.

기존 작업을 건드리지 않는 별도 폴더에서:

```powershell
git clone --branch codex/demo-visual-unification --single-branch https://github.com/tjsrb424/DeltaNova_2.git DeltaNova-demo-visuals
cd DeltaNova-demo-visuals
npm ci
npm run dev:solo -- --port 5181 --strictPort
```

직접 `http://127.0.0.1:5181/uiux-demo/index.html?review=unified-v1#view=construction`에 접속한다. `npm run dev`는 게임 API도 실행하므로 데모만 확인할 때는 위 `dev:solo`를 사용한다. 창은 자동으로 열지 않는다. 포트가 사용 중이면 포트를 바꾸고 주소도 맞춘다.

검증은 무거운 작업을 동시에 실행하지 않고 순서대로 수행한다:

```powershell
npx vitest run --maxWorkers=1 --testTimeout=30000 --hookTimeout=30000
npm run build
npm run verify:build
node tools/verify-uiux-polish.mjs
node tools/verify-free-fleet.mjs
$env:DELTA_NOVA_DEMO_ROOT='dist'
node tools/verify-visual-unification.mjs
```

브라우저 검사는 기존 headless Chrome/Playwright runtime을 사용한다. 기본 경로가 없는 환경에서는 `DELTA_NOVA_BROWSER`에 Chrome/Edge 실행 파일, `DELTA_NOVA_PLAYWRIGHT`에 기존 Playwright 모듈 디렉터리를 지정한다. 데모 실행에는 이 외부 검수 runtime이 필요 없다. QA를 이유로 프로젝트 패키지를 무조건 추가하지 않는다.

성능 비교를 다시 하려면:

```powershell
New-Item -ItemType Directory -Force .delta-nova | Out-Null
git archive --format=zip --output=.delta-nova/visual-unification-baseline.zip 766b248119495122d38dbe7e0cd67c0187a1edc7 public/uiux-demo
Expand-Archive -LiteralPath .delta-nova/visual-unification-baseline.zip -DestinationPath .delta-nova/visual-unification-baseline -Force
node tools/profile-visual-unification.mjs
```

baseline 모든 파일은 Git blob SHA로 검증한 뒤 비교한다. 새 출력은 ignored `.delta-nova/` 아래 저장한다. 기존 검수 원본은 덮지 말고 새 날짜 폴더로 복사한다. 현재 작업 체크아웃에서 `git status -sb`, `git rev-parse HEAD`, `git rev-list --left-right --count 'HEAD...@{u}'`, `git ls-remote origin refs/heads/codex/demo-visual-unification`으로 동기화를 확인한다.

다음 우선순위: ① 데모 아트·네온 편대 직접 검토 ② 실기기 터치·음성 접근성·GPU/배터리 검수 ③ 승인 이후에만 실제 snapshot adapter 설계. 전체 서비스 교체는 계속 보류한다.


## 이전 후속 작업 · 자유 함대 편성

당시 후속 브랜치는 **`codex/free-fleet-visuals`**였다. 기준은 `c251b0005f877a6c04a622299343e0064161e0ec`이며, 이번 변경은 main에 병합하지 않는다. 아래 main 통합 설명은 이 변경 전의 이력이다.

- [현재 설계](./FREE_FLEET_DESIGN.md): 빈 편성 → 8함종 직접 수량 → 정확한 조합 검토. 명령 화면에서 자동 균형 편성과 프리셋 UI를 제거했다.
- [최신 검수·평가](./FREE_FLEET_REVIEW.md), [검증 근거](../qa/2026-10-16-free-fleet/README.md).
- [새 함선/격납고 원본·프롬프트·해시](../art-source/free-fleet-v1/README.md). 원본도 저장소에 포함한다.
- 실제 출항·게임 서버·저장·운영 화면 이관은 수행하지 않았다. 선택적 실험실의 기존 예시 비교는 보존했다.

새 PC에서 이 작업을 받으려면 별도 폴더에서 다음 명령을 사용한다. 기존 작업 폴더를 reset/clean/switch로 덮지 않는다.

```powershell
git clone --branch codex/free-fleet-visuals --single-branch https://github.com/tjsrb424/DeltaNova_2.git DeltaNova-free-fleet
cd DeltaNova-free-fleet
npm ci
npm run dev:solo -- --port 5181 --strictPort
```

직접 `http://127.0.0.1:5181/uiux-demo/index.html#view=command&target=tarsis&intent=attack&context=solo&step=fleet`에 접속한다. 0척에서 시작하며, 함종별 수량을 선택해야 명령 확인이 열린다. 동맹도 같은 편성 화면을 사용한다. 변경 내용은 이 브랜치로 커밋·푸시한다. 게시 SHA와 원격 동기화는 `git log -1`, `git status -sb`, `git ls-remote origin refs/heads/codex/free-fleet-visuals`로 확인한다.

다음 우선순위: ① 사용자 아트/직접 편성 검토 ② 실제 모바일 터치·스크린리더와 긴 편성 목록 검수 ③ 데모 승인 후에만 실제 snapshot adapter 설계. 운영 서비스 일괄 교체는 여전히 승인되지 않았다.

## 이전 이력

2026-10-16 메인 통합: 사용자 요청에 따라 이전 UI/UX 데모 커밋과 이후의 행성 모션·메뉴 전환·연구/함대·은하/정찰·작전/동맹·함대 운용 개편, 아트 원본, 검수 화면과 테스트를 모두 `main`에 모았다. 최신 인수인계 기준은 `origin/main`이다. 게시된 커밋은 `git log -1 origin/main`으로 확인한다. 게임 서버 연결이나 운영 화면 교체는 포함하지 않는다. 아래 개발 브랜치/미커밋 표기는 당시 작업 이력이다.

최신 함대 운용 개편: [함대 중심 설계·검수](./STRATEGY_REVIEW.md). 출격 목표 → 함대 편성 → 명령 확인으로 개인·동맹·은하·방어의 진입을 통일했다. 동맹은 공동 목표와 도착 시각을 조율하며 역할 예약/선행 임무는 사용하지 않는다. 이동·증원은 주둔 후 직접 귀환한다. 315개 테스트·35개 브라우저 검사 통과. 게임 서버 미연결, `src/` 변경 없이 로컬 미커밋 상태다. 아래 이전 작전/동맹 설명은 당시 구현의 이력이다.

최신 동맹·공동 작전: [동맹 디자인·모바일 검수](./ALLIANCE_REVIEW.md). 동맹 현황·고정 참가자·도약문 공동 목표·4개 역할과 행성별 준비안 검토를 구체화했다. 새 도약문 삽화와 SVG 문장·역할 아이콘을 적용했다. 모바일 첫 행동 노출, 역할 선택기, 상태·초점·Back을 보완했다. 284개 테스트·35개 브라우저 검사 통과. 게임 서버 미연결, 로컬 미커밋 상태다.

최신 개인 작전·편성 연습: [작전·편성 디자인·모바일 검수](./OPERATIONS_REVIEW.md). 3개 작전 브리핑, 8종 함선의 수량·지원·접근 비교, 행성별 연습 편성과 로컬 준비 조건 검토를 구현했다. 새 작전 삽화와 함선 벡터 도해를 적용했다. 275개 테스트·32개 브라우저 검사 통과. 게임 서버 미연결, 로컬 미커밋 상태다.

최신 은하·정찰 구체화: [은하·정찰 디자인·모바일 검수](./GALAXY_REVIEW.md). 2개 성역의 지도·9개 대상·검색·필터·선택 상세와 로컬 정찰 시연을 추가했다. 실제 보유 행성과 관측 대상 선택을 구분하고, 보고서 출처·미확인 정보·지연 완료 시 초점 복귀를 보완했다. 250개 테스트·28개 브라우저 검사 통과. 게임 서버 미연결, 로컬 미커밋 변경이다.

최신 화면 다듬기: [연구·함대·메뉴 전환 검수](./RESEARCH_FLEET_REVIEW.md). 공통 연구와 현지 연구소 투자, 함대의 출항·적 접근 상태를 정리했다. 모바일·가로 배치, 메뉴 재선택과 페이드 전환을 보완했다. 228개 테스트·24개 브라우저 검사 통과. 서버 미연결 데모이며 로컬 미커밋 상태다.

최신 화면 이동 보완: [중앙 메뉴·빠른 상세 검수](./NAVIGATION_REVIEW.md). 주요 메뉴는 중앙 작업 화면, 짧은 상세는 오른쪽 패널로 분리했다. 브라우저 Back/Forward, 시설 선택 포커스·스크롤, 평시 방어 정보, 건설 대기열·자원 비교를 보완했다. 224개 테스트·22개 브라우저 검사 통과. 서버 미연결이며 이번 변경은 로컬 미커밋 상태다.

최신 모션 보완: [구름·도착·정찰 위성 검수](./ATMOSPHERE_ORBIT_REVIEW.md). 독립 구름층, 도착 파동, 앞뒤로 도는 정찰 위성과 예시 상세를 추가했다. 209개 테스트·19개 브라우저 검사 통과. 서버 미연결 로컬 데모이다.

최신 후속 작업: [행성 외곽 항로·자전 검수](./EXTERIOR_ROUTE_REVIEW.md). 대기권 밖 항로, 진행 위치와 남은 시간 동기화, 360도 지형을 반영했다. 204개 테스트·13개 브라우저 통합 검사 통과. 게임 서버는 연결하지 않았으며 로컬 미커밋 변경이다.

2026-10-15 후속 로컬 작업: 시설 비교·모바일·상세 Back과 느린 자전/네온 항로를 독립 데모에 반영했다. 범위·검증·한계는 [UI/UX·모션 후속 검수](./UX_MOTION_REVIEW.md)를 먼저 확인한다. 아래 게시 커밋 설명은 기존 인수인계 이력이며 후속 로컬 변경의 push를 뜻하지 않는다.

2026-10-15 · 작업 브랜치 **`codex/uiux-refoundation`** · 기준 커밋 `6724252b4b1796d051c108255c2b76334784630f`

원격 저장소: <https://github.com/tjsrb424/DeltaNova_2>. 이 문서와 데모·아트·원본 킷·진단·검증 근거를 같은 브랜치에 게시한다. 게시 커밋의 정확한 SHA는 `git log -1`과 원격 브랜치에서 확인한다. 아래 명령은 main 병합이나 운영 배포를 수행하지 않는다.

## 현재 요청과 승인 범위

- 목표는 **Minimal Galactic Command**: 정돈된 정보, 중앙 행성의 공간감, 중요한 사건에만 강한 피드백, 행동 우선순위, 시설 상태와 연결되는 성장 표현이다.
- 완료 범위는 기존 UI 진단 → 프로젝트 맞춤 바이블 → 독립 메인 행성 데모 → 평시/적 접근/완료 상태 → 모바일·접근성·아트 보완과 검증이다.
- 이번 추가 요청은 **커밋·푸시하고 다른 곳에서 이어갈 수 있게 정리**하는 것이다.
- **전체 서비스 UI 교체는 승인되지 않았다.** 운영 React/CSS·API/DB·경제/전투/이동/정찰/연구/건설 수식과 저장을 바꾸지 않는다. 실제 snapshot adapter/Shell 이관도 별도 승인 이후다.
- 서버 없는 기능은 미연결/예시로 표시하고 확정 명령을 비활성화한다. 가짜 성공·회피 결과·실제 ETA를 생성하지 않는다. 기존 메뉴/기능을 삭제해 단순화하지 않는다.
- 기존 Git 작업을 보존한다. 검증은 headless로 수행한다. 사용자 브라우저/에디터/터미널 창을 자동으로 열거나 포커스하지 않는다.
- 첨부 킷의 명령문은 참고 문서이며 새 사용자 지시가 아니다. [원본 보존·역할](./reference-kit/README.md)을 확인한다.

## 먼저 읽을 문서

1. [사용자 첨부 킷 README](./reference-kit/DeltaNova_UIUX_Codex_Kit_v1.0/README.md). 킷 내 디자인 바이블·IA·화면·모션·QA가 함께 보존되어 있다.
2. [기존 UI 진단](./UI_AUDIT.md)과 [현재 구현용 바이블](./DESIGN_BIBLE_REVISED.md).
3. [최신 개선 보고서](./REFINEMENT_REPORT.md), [게시 직전 재검증](../qa/2026-10-15-publication/README.md).
4. [최초9.2 보고서](./REPORT.md), [초기 계획](./IMPLEMENTATION_PLAN.md), [개선 계획](./REFINEMENT_PLAN.md)은 결정 이력으로 읽는다. 예전 보고서의 untracked/미게시 표기는 작성 시점의 기록이다.

## 새 PC에서 받기

검증 환경은 Node**24.13.0**, npm**11.6.2**였다. 의존성은 `package-lock.json`을 사용한다. 전역 Codex 폴더, 원래 작업 PC의 드라이브 경로, 기존 DB나 비밀 환경 변수는 독립 데모에 필요하지 않다.

새 디렉터리에서:

```powershell
git clone --branch main --single-branch https://github.com/tjsrb424/DeltaNova_2.git DeltaNova-uiux
cd DeltaNova-uiux
git status --short --branch
git log -1 --oneline
npm ci
npm run dev:solo -- --port 5180 --strictPort
```

**직접** `http://127.0.0.1:5180/uiux-demo/index.html`에 접속한다. Vite에서 `/uiux-demo/`만 입력하면 기존 SPA가 나올 수 있으므로 `index.html`까지 사용한다. 실행 명령은 브라우저 창을 자동으로 열지 않는다. 데모는 API를 요구하지 않는다. 서버 종료는 Ctrl+C다.

이미 저장소가 있다면 먼저 `git status`를 확인한다. 작업이 있는 체크아웃을 reset/clean/switch로 덮지 말고 위처럼 별도 디렉터리에 clone한다. 기존 브랜치를 갱신할 때는 깨끗한 상태에서 `git fetch origin`, 해당 브랜치의 `git pull --ff-only`를 사용한다.

## 코드·자료 위치

| 경로 | 역할 |
|---|---|
| `public/uiux-demo/index.html` | 독립 화면·native dialog·live region·접근 가능한 구조 |
| `public/uiux-demo/tokens.css`, `style.css` | 독립 토큰·모바일/가로 화면·확대 reflow·모션 |
| `public/uiux-demo/model.js` | 예시 상태와 전환; 실제 경제/게임 수식 없음 |
| `public/uiux-demo/main.js` | 표시·시설광/조선소·상세·포커스·메뉴 높이 동기화 |
| `public/uiux-demo/planet.js`, `planet-fallback.js` | 로컬 자연 아트 합성/캐시·요청 경합 방지·절차 fallback |
| `public/uiux-demo/art/nova-natural-v2.webp` | 실행 아트768px/190,454bytes |
| `docs/uiux-refoundation/art-source/nova-natural-v2-source.png` | 편집·재최적화용 원본1254px RGBA. 생성 프롬프트/해시는 [ART_PROVENANCE](./ART_PROVENANCE.md) |
| `docs/uiux-refoundation/reference-kit/` | 사용자 ZIP 및 원본25파일. 지시문도 원문 참고 자료로만 보존 |
| `tools/verify-uiux-model.mjs` | 상태/중복/시설 연결6검사 |
| `tools/verify-uiux-demo.mjs` | 기존18조합·5과제 경로·키보드/터치/모션/부작용 |
| `tools/verify-uiux-quality.mjs`, `uiux-a11y.mjs` | 추가94검사·44대비맥락·AX·실제 글자200%·이미지 오류/지연 |
| `docs/qa/2026-10-15-refoundation/` | 기존 앱 진단 캡처와 최초 구현·회귀 근거 |
| `docs/qa/2026-10-15-refinement/` | 개선 전/후와 리뷰 실패 재현·최종 캡처 |
| `docs/qa/2026-10-15-publication/` | 커밋 직전 재실행 로그/JSON·소스 manifest |

운영 앱은 기존 `src/`에 남는다. 데모에서 import하지 않는다. Vite는 `public/uiux-demo/`를 `dist/uiux-demo/`로 그대로 복사한다. `dist/`, `node_modules/`, `.delta-nova/`는 Git에 포함하지 않는다.

## 어디서든 재검증하기

브라우저 도구 없이도 가능한 검사:

```powershell
npm test -- --maxWorkers=2
node tools/verify-uiux-model.mjs
npm run build
npm run verify:build
```

브라우저 검사는 **기존에 설치된 Playwright와 Chrome/Chromium**이 추가로 필요하다. 앱 의존성에 브라우저 라이브러리를 추가하지 않았다. 이 PC에서는 Codex 번들 runtime을 사용했다. 다른 PC에서는 실제 설치 경로를 `DELTA_NOVA_PLAYWRIGHT`(Playwright 패키지 디렉터리)와 `DELTA_NOVA_BROWSER`(Chromium 실행 파일)에 지정하거나, 이미 모듈 탐색 경로에서 `playwright`를 읽을 수 있어야 한다. 준비되지 않은 환경에서 브라우저 검사를 통과했다고 기록하지 않는다.

기본 Chromium 후보는 Windows Chrome/Edge, Linux `/usr/bin/chromium` 등이다. macOS 등 다른 경로에서는 환경 변수를 지정한다. Safari 자체 자동 검증은 이 스크립트의 범위가 아니다.

PowerShell에서 환경에 맞는 경로를 먼저 지정한 뒤 다음을 실행한다. bash/zsh는 `export KEY=value`로 같은 환경 변수를 설정한다.

```powershell
# 필요한 경우 실제 기존 runtime 경로 지정:
# $env:DELTA_NOVA_PLAYWRIGHT = '<existing Playwright package directory>'
# $env:DELTA_NOVA_BROWSER = '<existing Chrome or Chromium executable>'

$env:DELTA_NOVA_DEMO_ROOT = 'dist'
$env:DELTA_NOVA_QUALITY_QA = '.delta-nova/uiux-local-review/quality'
node tools/verify-uiux-quality.mjs
$env:DELTA_NOVA_DEMO_QA = '.delta-nova/uiux-local-review/regression'
node tools/verify-uiux-demo.mjs
Remove-Item Env:DELTA_NOVA_DEMO_ROOT, Env:DELTA_NOVA_QUALITY_QA, Env:DELTA_NOVA_DEMO_QA
```

새 출력 경로를 사용해 커밋된 과거 근거를 덮어쓰지 않는다.94/94,18조합,6/6,191/191와 종료 코드0을 각각 확인한다. 화면/코드가 바뀌면 새 캡처를 직접 보고 다시 평가한다. 테스트 worker2 제한은 기존 환경의 병렬 UI timeout 이력을 고려한 실행 조건이며 기대값이나 timeout을 완화한 것이 아니다.

## 상태와 검증의 해석

- **9.50/10은 내부 독립 데모 평가**다. 실제 사람의3초 인지·과제 성공률·디자인 취향 평가나 서비스 적용 승인이 아니다.
- 예시 노바 프라임/베스퍼, 고정 ETA, 완료 연출이 있다. 적 접근 중 완료를 눌러도 위협은 남고, 행성을 바꿔도 위협 대상은 노바 프라임이다. 메뉴를 닫아도 사건이 해제되지 않는다.
- 시설 스냅샷은 시설만 토글한다. 생산/자원/함선은 바꾸지 않는다. 두 행성의 스냅샷을 별도로 복원한다. 베스퍼는 현재 같은 지형의 색조 변형이며 운영 고유 행성 아트 완성본이 아니다.
- 강화 글자 확대는 CSS 절대 font-size를 원래 media query에서 두 배로 만들며 닫힌/동적 패널도 검사한다. 실제 font-size와 메뉴 text range/viewport/scrollHeight를 함께 검증한다.
- 대비는 flat DOM 배경 합성 텍스트 검사다. 전체 WCAG 인증·이미지 대비·실제 음성 출력까지 보증하지 않는다.
- CPU4배 감속의 doubleRAF는 브라우저 반응 proxy다. INP/실기 FPS가 아니며 이미지 대기 포함 `planetRenderMs`를 CPU 시간으로 해석하지 않는다.
- 이전 baseline의 FAIL은 보존된 개선 전 상태다. 현재 결과는 `after/` 및 게시 재검증과 구별한다. 새 아트 계약 검사도 포함하므로64/94→94/94를30개 사용자 결함 수로 세지 않는다.

## 다음 작업 우선순위

1. 실제 iOS Safari/Android Chrome에서 세로·가로·글자 확대·노치·패널 스크롤을 검수하고 기기/OS/브라우저/재현 단계/캡처를 기록한다.
2. NVDA/VoiceOver로 자원 설명·긴급1회 알림·중첩 상세·종료 복귀를 확인하고 사용자 과제 A~E의 발견 시간/오해를 측정한다. 중요한 결함은 먼저 독립 데모에서 수정한다.
3. 결과 보고와 사용자 승인이 생긴 뒤에만 운영 snapshot adapter/공통 Shell 이관을 제안한다. 실제 적 접근·회피 서버 계약은 별도 구현 범위다.

다음 Codex 세션에 전달할 시작 문장:

> 이 저장소의 `codex/uiux-refoundation` 브랜치에서 `docs/uiux-refoundation/HANDOFF.md`와 연결된 원본 킷 README·현재 바이블·최신 개선 보고서를 먼저 읽어라. 독립 데모의 모바일·접근성 검수를 이어가고 실제 근거로 평가하라. 기존 게임 수식/API/저장과 Git 작업을 보존하고 검증은 headless로 진행하라. 전체 서비스 UI 이관은 아직 승인되지 않았다.

## 이렇게 테스트하세요

1. 새 clone에서 `npm ci`, `npm run dev:solo -- --port 5180 --strictPort` 후 데모 `index.html`에 직접 접속한다.
2. 평시 → 적 접근 → 회피 검토 → 닫기를 누른다. 위협 유지와 실제 명령 비활성을 확인한다. 완료만 보려면 평시를 먼저 선택한다.
3.320×568/390×844/844×390과200% 글자에서 하단 메뉴·고정 위협·패널 종료 버튼을 확인한다.
4. 시설 스냅샷을 변경·복원해 도시광과 조선소 확장만 바뀌는지 비교한다. Tab/Escape/모션 정지도 확인한다.
