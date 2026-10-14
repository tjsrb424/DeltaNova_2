# Delta Nova 개발 대시보드 v0.7 — 레퍼런스 및 생성 기록

- 작성일: 2026-10-14
- 상태: **A 메인 + B 성장 상세 사용자 승인 / 실제 UI 구현 / 원본 레퍼런스 보존**
- 브랜치: `codex/planet-overview-navigation`
- 기준 코드: `main 6eade0f3222529bd3ad2deea9da6417db8c5da32`
- 기존 v0.6 이미지와 문서는 보존한다.
- 생성 방식: 네이티브 `image_gen.imagegen`; 전체 화면 이미지는 불투명 배경.
- 이 기록은 생성 자산의 출처와 의도를 보존하는 문서다. 구현 계획이나 별도 문서 승인 단계가 아니다.

## 변경 요청

사용자: “지금 행성이 크게 보이지만 그렇게 크게 알려주는 정보가 없다, 아예 색다른 방식으로 대시보드를 다시 디자인해봐.”

큰 행성 이미지를 중심으로 한 v0.6 메인 화면은 채택되지 않았다. 새 방향은 행성을 작은 식별 요소로 줄이고, 현재 기반과 운영 상태, 진행 중인 개발의 결과, 다음 행동 및 병목을 중심으로 화면을 구성한다.

## 두 방향

| 안 | 화면 구조 | 판단에 필요한 정보 | 적합한 역할 |
| --- | --- | --- | --- |
| A — 개발 운영보드 | 밝은 세라믹 본문 + 흑연색 내비게이션, 완료 효과 → 운영 장부 → 행동 | 자원 보유·저장·생산, 전력 여유, 개발 후 변화, 수리·건설·연구의 다음 행동 | 메인 전체 현황에 추천 |
| B — 발전지도 | 어두운 기술 도면, 현재 기반 → 성장 조건 → 추가 건조 요건 | 시설·기술 수준, 선행 조건의 연결, 목표 건조까지의 비용과 부족분, 현재 작업 | 성장 경로를 살펴보는 메인 또는 연구·건설 상세 |

두 안 모두 왼쪽 카테고리 선택으로 본문 전체가 해당 상세 화면으로 바뀌는 방향을 유지한다. 실제 구현은 시설·함선 그림, 텍스트, 버튼을 개별 요소로 만들고 현재 서버 상태에 연결한다. 생성된 전체 화면 이미지를 UI 배경으로 붙이지 않는다.

## 검토 기준과 구현 시 정규화할 부분

- 숫자는 **예시 상태**이며 실행 중인 사용자 저장 데이터의 조회 결과가 아니다.
- 자원 및 시설 표시명은 `src/empire/content.ts`의 기존 명칭을 우선한다. 레퍼런스의 “수정/수정 광산/연료 정제소/조선소”는 실제 UI에서 “결정/결정 채굴소/연료 합성소/궤도 조선소”로 정규화한다.
- A 이미지의 진행 막대 길이는 배치 참고다. 실제 진행률은 작업 시작·완료 시각으로 계산한다. 예시의 정답은 건설 30%, 함선 55%, 연구 약 36%다.
- A의 동기 부여 문구와 영어 장식 문구는 실제 UI에서 상태 정보로 대체하거나 생략한다.
- B draft1의 잘못 연결된 선과 진행률을 수정한 **draft2**를 비교용 최종 이미지로 사용한다.
- B의 연결은 연구소 Lv.2 → 산업 기술 Lv.2, 산업 기술 Lv.2 + 조선소 Lv.3 → 아크 추가 건조, 정보 기술 Lv.1 → 베일 추가 건조다. 베일의 조선소 Lv.1 요건은 이미 충족한 상태로 표시한다.
- 추가 건조 요건은 함선 최초 보유와 구분한다. 이미 보유한 아크·베일은 기존 함대에 존재할 수 있다.
- 사용자가 실제 UI 방향을 선택하면 화면 구현과 헤드리스 검증 후 직접 검수 가능한 시점과 확인 항목을 안내한다.

## 예시 상태의 근거

계산 규칙은 현재 코드 `src/empire/economy.ts`, `src/empire/content.ts`와 기존 작업·함대 모델을 기준으로 한다.

- 시설: 합금 광산 Lv.2, 나머지 다섯 시설 Lv.1, 방어 시설 0.
- 기술: 산업 Lv.1, 정보 Lv.0, 나머지 Lv.0.
- 보유 자원: 합금 184, 결정 96, 연료 68.
- 저장 한도: 400 / 200 / 150.
- 생산량: 13 / 5 / 5 (분당).
- 전력: 수요 36 / 공급 60, 여유 24.
- 시설 공간: 완성 시설 수준 합계 7 + 건설 예약 1 = 8 / 30.
- 함선: 총 10척, 출격 가능 8척, 수리 필요 2척. 해당 두 함선의 정비 비용 예시는 합금 2다.
- 진행 중 건설: 연료 합성소 Lv.1 → 2, 총 60초 중 42초 남음. 연료 5 → 9/분, 저장 150 → 200, 여유 전력 24 → 18.
- 진행 중 함선: 케스트럴 1척, 총 40초 중 18초 남음. 함선 10 → 11척.
- 진행 중 연구: 정보 기술 Lv.0 → 1, 총 90초 중 58초 남음. 베일 추가 건조의 기술 요건 충족.
- 별도 수리 행동: 출격 가능 8 → 10척. 진행 중 함선 건조의 증가분과 합쳐 표기하지 않는다.

B의 아크 추가 건조 비용은 현재 시설·기술에서 시작하여 다음을 모두 포함한다.

| 단계 | 합금 | 결정 | 연료 |
| --- | ---: | ---: | ---: |
| 연구소 Lv.1 → 2 | 60 | 30 | 10 |
| 산업 기술 Lv.1 → 2 | 80 | 60 | 20 |
| 조선소 Lv.1 → 2 | 60 | 30 | 10 |
| 조선소 Lv.2 → 3 | 120 | 60 | 20 |
| 아크 1척 건조 | 120 | 80 | 30 |
| 합계 | 440 | 260 | 90 |
| 현재 보유 | 184 | 96 | 68 |
| 부족분 | 256 | 164 | 22 |

전체 경로 비용은 검토용 합계이며 자동 예약·연속 실행·완료 시각 예측 기능을 의미하지 않는다. 인구, 행성 전체 경험치·레벨, 근거 없는 성장률, 과거 시계열, 미구현 운송·식민지·적 공격 기능은 추가하지 않는다.

## 최종 자산

### A — 개발 운영보드

- 파일: `planet-development-board-v0.7-draft1.png`
- 크기: 1672 × 941
- SHA-256: `3fe2c51288e60d93bf326f69055d0bb682399198e7eb18cdac2cf44f9ebe53a5`
- 네이티브 원본: `C:\Users\delic\.codex\generated_images\01a137ec-ccfd-77f0-b32f-1937420224ed\exec-de0152e0-60ae-49a7-adba-bbfcef9094e6.png`
- 원본과 작업공간 복사본의 바이트 일치를 확인했다.

### B — 발전지도 (연결 및 진행률 수정본)

- 파일: `planet-development-map-v0.7-draft2.png`
- 크기: 1672 × 941
- SHA-256: `b5d5a28f6e86b99b008a9930df09038aa26bdb1175dfcdd2fec39511a57a8b5b`
- 네이티브 원본: `C:\Users\delic\.codex\generated_images\01a137ec-ccfd-77f0-b32f-1937420224ed\exec-06ab41b0-db1d-411c-aeaf-8392a4ecae14.png`
- 원본과 작업공간 복사본의 바이트 일치를 확인했다.

B 수정 전 네이티브 원본도 삭제하지 않고 보존한다.

- `C:\Users\delic\.codex\generated_images\01a137ec-ccfd-77f0-b32f-1937420224ed\exec-07e57881-b790-4aa5-86f2-134153308173.png`

## 생성 입력과 전체 프롬프트

### A 신규 생성

- 참조 이미지: 없음.
- 마지막 대화 이미지 포함: 없음.
- `transparent_background: false`.

```text
Use case: ui-mockup. Create a completely new, premium desktop game dashboard reference screenshot for DELTA NOVA, a Korean-language science-fiction planet development strategy game. Wide 16:9 composition, excellent legibility, production-ready visual hierarchy, beautifully precise typography and restrained technical details. This is concept A: an INFORMATION-FIRST DEVELOPMENT OPERATIONS BOARD. It must look radically different from a dark space-poster dashboard with an enormous planet. Use a warm ceramic/off-white main workspace, graphite black navigation rail and top framing, charcoal type, restrained teal operational highlights and copper construction accents. Crisp dividers, carefully proportioned flat panels, slight material depth, elegant industrial-control typography. No giant globe, no starfield hero, no generic marketing dashboard. Information takes almost all the canvas. A small attractive 48px blue planet thumbnail beside the planet name is the only planet illustration.

Full screenshot shell: narrow graphite left sidebar with DELTA NOVA wordmark, clear clickable Korean navigation: 대시보드 (selected), 건설, 함대, 연구, 개인작전, 동맹, 보고서. Main workspace title '노바 프라임' with subtitle '행성 개발 현황'. All navigation corresponds to full-body category detail pages, visually meaningful active state. Top compact status strip shows '합금 184 / 400 · +13/분', '수정 96 / 200 · +5/분', '연료 68 / 150 · +5/분', '전력 36 / 60', and '공간 8 / 30'. Use recognizable small resource pictograms.

The strongest main section is titled '진행 중인 개발이 바꾸는 것'. Three generous horizontally aligned outcome summaries:
1. '연료 생산' with a visually explicit '5 → 9 /분', small copper '+4/분', explanation '정제소 Lv.1 → 2', and progress/time '42초 남음'.
2. '보유 함선' with '10 → 11척', explanation '케스트럴 1척 건조', progress/time '18초 남음'.
3. '추가 건조 가능' with '베일 재머', explanation '정보 기술 Lv.0 → 1', progress/time '58초 남음'.
Outcome values dominate, not decorative artwork.

Below, a large structured operations ledger titled '지금의 생산·운영 상태' occupies about two-thirds of the content width. Clear spacious resource rows show current storage/capacity, per-minute production, a modest storage usage bar, and the improvement from active development. Alloy row '184 / 400', '+13/분', '유지'; crystal row '96 / 200', '+5/분', '유지'; fuel row '68 / 150', '+5/분 → +9/분', '저장 150 → 200'. A power-margin indicator underneath says '여유 전력 24 → 18', with subtle current/after markers. Small footer says '정제소 완공 기준'. This is a current-state ledger, not an invented historical chart.

A distinct right-side actionable panel titled '지금 할 일' has:
- Main teal action '함선 2척 수리' with '합금 2 소모' and '출격 가능 8 → 10척', clear '수리' button.
- Construction opportunity '연구소 Lv.2' with '재료 충족 · 건설 슬롯 42초 후 비움', small '건설 상세' button.
- Dependency '산업 기술 Lv.2' with muted lock marker '연구소 Lv.2 필요', small '연구 상세' link.
Buttons are visibly interactive and provide concrete next steps.

At bottom, a concise facility status row/grid using tiny bespoke isometric facility emblems and readable text: '합금 광산 Lv.2', '수정 광산 Lv.1', '연료 정제소 Lv.1 → 2 · 건설 중', '발전소 Lv.1', '조선소 Lv.1', '연구소 Lv.1'. A compact fleet availability summary says '함선 10척 · 출격 가능 8 · 수리 필요 2'. Keep facility thumbnails small so data remains dominant.

Preserve a coherent sample state: industry level1, intelligence level0, other technology0, all facilities1 except alloy mine2, no defenses. These are illustrative game data. No population, no arbitrary global planet level/XP/growth percentage, no invented long-term graphs, no fake alert counts, no unimplemented trading/colonization, no auto-queue. Fleet repair and construction are separate actions. The screenshot should feel like a gorgeous purposeful game command workspace: information dense yet spacious, easy to scan, explicit before/after effects, clear current work and blockers. Korean UI text should be accurate and carefully rendered. Fill the image with the actual dashboard; no framing laptop, no extra presentation caption, no concept labels A or B inside the screen.
```

### B 신규 생성 — draft1

- 참조 이미지: 없음.
- 마지막 대화 이미지 포함: 없음.
- `transparent_background: false`.

```text
Use case: ui-mockup. Create a NEW premium Korean-language desktop dashboard reference screenshot for DELTA NOVA, a science-fiction planet development strategy game. Wide 16:9 canvas, beautifully legible, sophisticated art direction, exact layout hierarchy. Concept B is a TECHNICAL DEVELOPMENT ATLAS: a purposeful blueprint of the planet's industrial development and capability prerequisites. It must be visually and structurally different from a card-grid dashboard and from a huge planet floating in space. Main canvas uses deep matte slate/navy, bright ivory typography, fine cyan blueprint connector lines, sparse copper progress accents, understated inset technical panels, precise square/soft-corner industrial instrumentation. No starfield background, no giant globe, no decorative orbital station hero. Small 44px planet badge only beside '노바 프라임'. Use subtle technical grid only behind the central development map.

A narrow fixed graphite sidebar with DELTA NOVA wordmark and meaningful Korean navigation: 대시보드 selected, 건설, 함대, 연구, 개인작전, 동맹, 보고서. Top main title '노바 프라임 · 발전지도'. Compact top instrument strip: '합금 184/400 · +13/분', '수정 96/200 · +5/분', '연료 68/150 · +5/분', '전력 36/60', '공간 8/30'. No arbitrary overall development percentage.

Primary content left/center around 70% width is a large readable MAP, with structured columns and fine straight/angled connectors, NOT tangled or an unreadable flowchart. Label '현재 기반과 다음 건조 요건'. Organize into three visible layers:
Left '현재 기반': compact resource facility cluster showing illustrated miniatures with '합금 광산 Lv.2', '수정 광산 Lv.1', '연료 정제소 Lv.1 → 2' copper active badge, '발전소 Lv.1'. Explain active fuel improvement '완공 후 연료 +5 → +9/분'. These facility miniatures are small, secondary to readable status.
Middle '성장 조건': a lab branch with '연구소 Lv.1 → 2' and below/onwards '산업 기술 Lv.1 → 2'; a separate shipyard branch '조선소 Lv.1 → 2 → 3'. Existing levels use filled cyan markers; unmet target levels use hollow slate/ivory nodes; copper is reserved for current work. A short annotation by industry2 '연구소 Lv.2 필요'.
Right end of the map '추가 건조 가능': a detailed but modest carrier ship miniature, title '아크 캐리어 추가 건조', underneath two prerequisite chips '조선소 Lv.3' and '산업 기술 Lv.2'. Connector arrows from industry2 AND shipyard3 end at this carrier node. The carrier already exists in the fleet, so this is explicitly about additional construction capability, not first-time ownership/unlock. A small branch for active '정보 기술 Lv.0 → 1 · 58초' leads to a smaller '베일 추가 건조 가능' endpoint. Keep this branch distinct from the industry/carrier dependencies.
No automatic queued plan or execute-plan button. Read-only prerequisite map with one subtle '건설·연구 상세' control.

Right side about 30% width is a vertically arranged '선택한 건조 요건' inspector for '아크 캐리어 추가 건조'. Show actionable, specific conditions: '조선소 Lv.1 / 필요 Lv.3', '산업 기술 Lv.1 / 필요 Lv.2', '연구소 Lv.1 / 필요 Lv.2'. A compact material comparison table titled '시설·기술·1척 건조 합계': rows '합금 필요 440 · 보유 184 · 부족 256', '수정 필요 260 · 보유 96 · 부족 164', '연료 필요 90 · 보유 68 · 부족 22'. Make it visually obvious that this is total future upgrade+research+single-ship cost, NOT current resource stock or a forecast. Show a blocker callout '건설 슬롯 사용 중 · 42초 남음'. A small outline button '조선소 상세 보기'.

Across the bottom, a spacious horizontal CURRENT-WORK RAIL titled '지금 진행 중인 개발', three distinct lanes: '정제소 Lv.1 → 2 · 42초 · 연료 +4/분', '케스트럴 1척 · 18초 · 함선 10 → 11척', '정보 기술 Lv.0 → 1 · 58초 · 베일 추가 건조'. Each lane has a fine progress bar and a readable completion effect; no fictional historical trend graph. Bottom-right or a compact adjacent readiness panel '함대 준비 상태' says '10척 보유 · 출격 가능 8 · 수리 필요 2', and a clear teal '2척 수리 · 합금 2' action.

The resulting image should answer: what infrastructure already exists, what is improving now, what this enables, and what prerequisite or materials prevent the next expansion. Game-specific facilities, ships and dependency lines, exceptional typography and restrained sci-fi craft. No population, global planet XP or level, arbitrary overall growth score, fake event counts, invented propulsion speed boost, trading, colonization, attack alerts, or future completion date forecast. No huge art consuming useful screen space, no marketing slogans. Korean UI copy must be carefully rendered. Fill the image with actual game UI, no outer mockup frame, no labels A or B.
```

### B 편집 — draft2

- 참조 이미지: `C:\Users\delic\.codex\generated_images\01a137ec-ccfd-77f0-b32f-1937420224ed\exec-07e57881-b790-4aa5-86f2-134153308173.png`.
- 마지막 대화 이미지 포함: 사용하지 않음.
- `transparent_background: false`.

```text
Use case: ui-mockup. Edit the attached DELTA NOVA development-map dashboard. Preserve its excellent dark slate blueprint style, Korean typography, layout, facility and ship artwork, resource values and readable right inspector. Correct the prerequisite connectors and progress indicators precisely. This is a game reference, and the graph must communicate only REAL dependencies.

Erase ALL existing cyan connector paths/arrows across the main map first. Redraw only the following FOUR dependency arrows, routed cleanly with straight/angled cyan lines and enough space:
1. Research-lab node '연구소 Lv.1 → 2' goes DOWN to the industry node '산업 기술 Lv.1 → 2'. Industry level2 requires lab level2.
2. Industry node '산업 기술 Lv.1 → 2' goes RIGHT to the carrier node '아크 캐리어 추가 건조'.
3. Shipyard node '조선소 Lv.1 → 2 → 3' goes RIGHT to the SAME carrier node, with a separate inlet. Carrier additionally requires shipyard level3.
4. Intelligence node '정보 기술 Lv.0 → 1' goes RIGHT to the veil node '베일 추가 건조 가능'. Veil additionally requires shipyard level1 which already exists; keep a small readable '조선소 Lv.1 · 충족' chip at Veil beside its '정보 기술 Lv.1' chip.
No resource mine or refinery arrows into lab, industry or shipyard. They are current operational context, not building prerequisites. No direct lab→carrier arrow, no industry→shipyard arrow, no shipyard→Veil arrow. Keep four connectors easy to follow and not overlapping labels.

The CURRENT-WORK RAIL across bottom must have mathematically coherent elapsed-progress bars and percentages, keeping the same remaining times:
- Refinery upgrade total60sec remaining42sec: show 30% progress, not70%. Text '42초 남음'; fuel5→9/min.
- Kestrel total40sec remaining18sec: show55% progress, not40%. Text '18초 남음'; ships10→11.
- Intelligence research total90sec remaining58sec: show36% rounded progress, not28%. Text '58초 남음'; Veil additional construction.
Place percentages beside bars and make bar fills match these percentages.

Preserve right material table exactly: total upgrade+research+one-carrier construction required440/260/90, current184/96/68, shortage256/164/22. Preserve power36/60, space8/30, fleet10 /available8 /repair2, repaircostalloy2. Ensure selected carrier title says '아크 캐리어 추가 건조' and its prerequisite chips '조선소 Lv.3', '산업 기술 Lv.2'. There is no automated queue, execution-plan button, population, globalgrowthscore, or history graph. Remove decorative motivational slogans at sidebar bottom; small 'PLANET OPERATIONS' is sufficient. Keep this as one full-screen polished high-quality UI screenshot with readable Korean.
```

## 사용자 선택과 실제 구현

- 2026-10-14 사용자 선택: **“A 운영보드 메인 + B 성장 상세 (추천)”**.
- 이 선택으로 실제 UI 개편이 승인됐다. 위의 초안 이미지는 비교 기록으로 보존한다.
- 메인: A 방향의 밝은 운영보드. 행성 이미지는 작은 식별 요소로 사용한다.
- 상세: 건설·함대·연구·개인 작전·보고서의 본문 전체가 전환된다. 동맹은 기존 공동 작전 화면으로 연결된다.
- 발전지도: 연구 화면에서 펼쳐 보이며 건설·함대 화면에서도 열어볼 수 있다.
- 비용: 진행 중인 작업의 지불 금액을 제외하고 필요한 발전소·연구소·조선소 증설, 추가 연구 및 다음 함선 1척을 합산한다. 전력 부족과 목표 경로의 공간 부족도 표시한다.
- 실제 자원·시설 명칭은 기존 콘텐츠 정의를 유지했다.
- 함선 도형은 기존 `ShipGlyph` 시스템을 유지하고, 시설 그림은 아래의 투명 자산을 새로 생성했다.

### 시설 자산

- 런타임 파일: `public/art/planet-facilities-v1.png`.
- 네이티브 원본: `C:\Users\delic\.codex\generated_images\01a137ec-ccfd-77f0-b32f-1937420224ed\exec-8f4fd768-8f95-43df-ad45-d677c08a2998.png`.
- 모드: 네이티브 `image_gen.imagegen`, `transparent_background: true`.
- 참조: A 운영보드 네이티브 원본 `C:\Users\delic\.codex\generated_images\01a137ec-ccfd-77f0-b32f-1937420224ed\exec-de0152e0-60ae-49a7-adba-bbfcef9094e6.png`.
- 마지막 대화 이미지 포함: 사용하지 않음.
- 크기: 1536 × 1024, 3열 × 2행.
- 순서: 합금 광산 / 결정 채굴소 / 연료 합성소 / 발전소 / 궤도 조선소 / 연구소.
- SHA-256: `cc1dc6e43568380b6ff0c2e4b2d07d84ac5ee0b7b756fb040792e8adbebf3e9d`.
- PNG 알파 채널 검사: alpha minimum 0, 완전 투명 픽셀 961632 / 1572864. 네 모서리 알파 0 / 0 / 1 / 0.
- CSS가 각 셀을 별도 시설 그림으로 표시한다. 원본을 잘라 덮어쓰거나 생성한 전체 UI 그림을 배경으로 쓰지 않는다.

```text
Use case: game-asset. Create a TEXT-FREE production sprite atlas of SIX miniature sci-fi colony facilities in the exact sophisticated isometric facility style of the attached DELTA NOVA dashboard reference. Output a transparent PNG, wide 3:2 canvas, arranged in a precise THREE-COLUMN TWO-ROW equal-cell grid. Each of the six equal rectangular cells contains exactly one distinct facility, centered in its own cell with generous transparent margin. No grid lines, background, letters, numbers, UI panels, scenery, separate icons, or additional objects. Never overlap cell boundaries. All six share the same 3/4 isometric camera, scale, light from upper left, detailed graphite/silver metal bodies, subtle warm copper parts and small restrained cyan operational lights. Clean readable silhouettes, premium strategy-game rendering, convincing grounded construction with a subtle small contact shadow on the transparent canvas.

Cell ordering is mandatory:
TOP LEFT: alloy mine, angular graphite drill/excavation rig with a compact pile of metallic ore on a small industrial base.
TOP MIDDLE: crystal extraction facility, cyan crystalline mineral cluster and graphite collector machinery on a small industrial base.
TOP RIGHT: fuel synthesis facility, several tall warm copper cylindrical processing columns with pipes on a compact graphite industrial base.
BOTTOM LEFT: power plant, a distinctive compact silver/graphite turbine power station with an upright glowing cyan reactor core; visually different from the mine and fuel columns.
BOTTOM MIDDLE: orbital shipyard, a compact angular graphite docking platform with gantry arms and a small docked silver spaceship, distinct ship-construction silhouette.
BOTTOM RIGHT: research laboratory, a sophisticated silver blue glass scientific dome with compact side modules and a small antenna, distinct from all other facilities.

Compose the illustrations as six coherent reusable assets for a light ceramic operations board AND a dark blueprint development view. Keep facilities within the middle 70% of their respective cells to prevent CSS tile clipping. Transparent surroundings all the way to the edges. Nothing from the reference's text, cards or backdrop should appear.
```

### 검수 방법

`npm run verify:dashboard`는 새 임시 DB와 무작위 loopback 포트에서 실제 API·웹 UI를 시작하고 Chromium을 **헤드리스 모드**로 실행한다. 사용 중인 브라우저 프로필이나 저장 데이터에 접근하지 않으며 GUI 창을 만들지 않는다. PC·태블릿·모바일의 가로 넘침, 모든 현황/상세 전환, 런타임 예외, 시설 PNG 디코딩을 확인하고 캡처와 checks.json을 남긴다.

- 기본 결과 위치: `docs/qa/2026-10-14-dashboard/`.
- Chrome/Edge가 기본 위치에 없다면 `DELTA_NOVA_BROWSER`에 실행 파일 경로를 지정한다.
- 출력 위치 변경: `DELTA_NOVA_QA_OUTPUT`.
- 실제 사용자 검수는 개발 서버에서 참가자로 연결한 뒤 대시보드 → 건설 → 함대 → 연구 → 개인 작전 → 보고서 → 대시보드 순서로 확인한다.
