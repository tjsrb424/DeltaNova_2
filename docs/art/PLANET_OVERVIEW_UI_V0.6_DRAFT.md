# 행성 전체 현황·카테고리 상세 UI v0.6 초안

2026-10-14. 상태: 사용자 피드백을 반영한 **검토용 레퍼런스**. 아직 새 런타임 화면에 반영하지 않았다. 기존 v0.5 시안·환경 레이어·실행 중인 코드와 생성 원본을 보존했다.

## 사용자 피드백과 방향

중앙에는 행성 그림을 두고, 메인에서 이 행성의 개발된 시설·성장 상태·진행 작업·운영 상태를 전체적으로 보여준다. 왼쪽 카테고리는 오른쪽 작은 패널만 바꾸지 않고 제목과 본문 전체를 바꾸는 상세 화면으로 연결한다.

- [메인 전체 현황 시안](planet-overview-v0.6-draft1.png): 행성 그림, 시설별 수준과 공간, 생산/전력, 함대 가용/정비, 기술 수준, 건설/조선/연구의 진행 현황. 요약의 상세 링크로 해당 카테고리에 이동한다.
- [건설 상세 시안](planet-construction-v0.6-draft1.png): 여섯 시설의 선택 카드와 효과/비용/조건, 선택 시설의 공사/취소를 화면 전체로 표시한다. 큰 행성 그림은 메인에만 사용한다.

시설 단계 합계·공간 사용/예약·현재 생산률·현지 자원·함선 상태·기술 수준처럼 기존 장부에 있는 값으로 성장 상태를 전달한다. 새 행성 레벨/경험치/인구/과거 성장 차트 등의 지표를 임의로 만들지 않는다.

## 화면 분리의 기준

대시보드·건설·함대·연구·개인 작전·보고서에서 공통 메뉴와 선택 행성의 자원 HUD를 유지하며 본문을 별도 화면으로 전환한다. 각 화면의 범위는 다음과 같다.

| 화면 | 주 역할 |
|---|---|
| 대시보드 | 행성의 전체 현황과 현재 개발, 주의가 필요한 상태를 읽고 상세 화면으로 이동 |
| 건설 | 시설 목록/선택, 증설 효과·조건·비용, 현지 공사/방어 상세 |
| 함대 | 실제 보유/가용/정비/출격 재고와 조선 상세 |
| 연구 | 제국 기술 수준·효과·연구 작업과 지불 행성 |
| 개인 작전 | 편성·출격·판단·귀환과 기존 작전 모듈 |
| 보고서 | 실제 완료/취소 기록과 기존 전투 보고서 |

동맹과 무료 편성 연습은 기존 실제 진입을 유지한다. 핵심 개편은 기존 개인 제국 화면의 정보 배치·본문 전환이다. 서버/경제/저장 계약이나 인증 구조를 바꾸는 작업이 아니다.

화면 전환에도 선택 행성·실제 소유 자산·미확정 명령의 원 참가자/원 행성/원 ID·완료 알림 관측을 유지한다. 상세 진입 링크는 관련 시설/기술 등의 선택과 일치해야 한다. 메뉴 활성 표시·화면 제목·본문이 모두 같은 카테고리를 가리켜야 한다.

## 그림과 실제 UI

중앙 행성 그림과 여섯 시설 카드의 그림은 글자 없는 개별 자산으로 분리한다. 참고 이미지를 통째로 깔고 버튼/수치를 덧씌우지 않는다. 라벨·상태·수치·입력·선택·진행은 React/CSS로 구현한다.

수치는 레이아웃 검토용 예시이며 현재 서버를 읽어 만든 캡처가 아니다. 예시의 산업1/합금 광산2/나머지 시설1은 생산13/5/5, 전력 수요36/공급60을 뜻한다. 공간8/30은 완성 시설 단계7와 공사 예약1이다. 실제 구현에서는 현재 장부의 값을 사용한다.

첫 시안 상단의 알림벨/장식 배지는 기능 승인을 뜻하지 않는다. 실제 근거가 없는 배지·공격 접근·수송·개척·랭킹 CTA는 구현하지 않는다. 반응형·키보드·실제 조작·모션·음성의 검수는 런타임 구현 뒤 수행한다. 이번 결과에 런타임 품질 점수를 붙이지 않는다.

## 생성 기록

내장 `image_gen`의 `ui-mockup` 모드를 사용했다. CLI/API 우회는 사용하지 않았다. 입력 v0.5와 기존 환경 레이어는 스타일/행성 참고이며 기존 레이아웃을 그대로 복제하는 대상이 아니다. 두 결과는 불투명 PNG이며 원본을 남긴 채 복사했다.

| 파일 | 실제 크기 | SHA256 |
|---|---|---|
| 메인 전체 현황 | 1672×941 | `41d3497e8facd507a78fb4ae872f807df38bd988b613c822bfa260eda75397fc` |
| 건설 상세 | 1672×941 | `9934934d776717c200977a3351bf22f7c3c0b3a3068ca06262e6772b27610086` |

생성 원본:
- `C:\Users\delic\.codex\generated_images\01a137ec-ccfd-77f0-b32f-1937420224ed\exec-52953303-15ec-4807-814d-1cdc11380637.png`
- `C:\Users\delic\.codex\generated_images\01a137ec-ccfd-77f0-b32f-1937420224ed\exec-80004fdf-f1f8-4ea7-b4c7-8839fc17b7a8.png`

## 최종 프롬프트: 메인 전체 현황

```text
Use case: ui-mockup.
Asset type: high-fidelity DELTA NOVA strategy-game interface reference, MAIN PLANET OVERVIEW, entire desktop application screen, crisp wide landscape about 16:9.
Input images: Image 1 is the existing brand/palette/type/ceramic-white/graphite/copper material reference only, NOT the target layout. Image 2 is a reference only for the recognizable blue homeworld. Completely redesign the interface composition for the following user request.
Primary request: The main dashboard tells the complete development/growth/operating state of ONE owned planet at a glance. The center is simply beautiful PLANET ART. Left navigation leads to full dedicated category pages; do NOT retain a huge ship-build action panel next to the planet.
Visual quality: premium polished game UI art direction with rigorous alignment, generous spacing, very legible clean Korean sans-serif text, restrained thin cyan accents on midnight navy panels, broad matte surfaces, small consistent white line icons, readable white/soft-blue text, amber only for maintenance, no heavy neon frames. A calm sophisticated command-center interface, not a marketing landing page.
Composition: Slim left sidebar about 11% width; a compact shared resource HUD along top; below it a clear planet overview heading. Central-left hero region about 55% content width contains one large blue Earthlike homeworld with realistic continents/clouds/city lights and a thin restrained atmospheric rim. NO orbiting ships, stations, facility buildings, floating leader lines, markers or clickable facility labels around the globe. Clean dark space around this planet. To the right, two well-composed stacked overview cards summarizing facilities and fleet/research. Across the bottom, a wide three-row development-progress panel plus a compact operating-status panel. Screen should feel like an actionable strategic overview, with small category-detail links, not inline construction forms.
Text/navigation, use these Korean labels clearly: brand "DELTA NOVA"; sidebar "대시보드" SELECTED, then "건설", "함대", "연구", "개인 작전", "동맹", "보고서". A quiet top-right identity "노바 · 연결됨". No galaxy/colonization/ranking/settings debug entries.
Top HUD: "노바 프라임 · 현지 자원"; "합금 184 / 400" with "+13 / 분"; "결정 96 / 200" with "+5 / 분"; "연료 68 / 150" with "+5 / 분"; "전력 36 / 60". These are small coherent reference values, no K/M numbers.
Main heading: "노바 프라임", subtitle "본성 · 행성 개발 현황", a green "생산 정상" indicator.
Facility overview card heading "기지 개발 현황"; readable rows or compact level chips: "합금 광산 Lv.2", "결정 채굴소 Lv.1", "연료 합성소 Lv.1", "발전소 Lv.1", "조선소 Lv.1", "연구소 Lv.1"; footer "시설 공간 8 / 30" and "완성 7 · 공사 예약 1"; small link "건설 상세 →".
Second overview card has "함대 현황": "보유 10척", "가용 8척", amber "정비 2척", small link "함대 상세 →". A clearly separated "연구 현황": "산업 Lv.1", "추진 Lv.0", "정보 Lv.0", "방어 Lv.0", small link "연구 상세 →".
Bottom main card heading "진행 중인 개발". Three clear separate rows with icons, source "노바 프라임", slim progress bars and remaining times: "건설 · 연료 합성소 Lv.1 → 2" "00:42"; "조선 · 케스트럴 1척" "00:18"; "연구 · 추진 기술 Lv.0 → 1" "00:58".
Bottom-right card "운영 상태": "전력 여유 24"; "건설·조선·연구 진행 중"; amber restrained "함선 2척 정비 필요". Summary rows, no fake hostile-alert or incoming-transport rows.
Constraints: ONE homeworld only. No fake colonies, coordinates, growth XP/planet level, population, historical charts, NPC incoming attacks, transport, extra resources or unimplemented features. No quantity inputs or giant build button on this OVERVIEW. Do not reproduce the old screenshot; visibly different deliberate overview information architecture. The central planet must be the visual anchor and Korean labels/metrics must remain easy to read. Opaque background, no watermark, no browser chrome, no device frame, no poster treatment.
```

## 최종 프롬프트: 건설 상세

```text
Use case: ui-mockup.
Asset type: high-fidelity DELTA NOVA desktop game interface reference, dedicated CONSTRUCTION CATEGORY PAGE, full wide landscape screen about 16:9.
Input image 1: style/system reference for shared left navigation, top resource HUD, typography, colors, materials and alignment. This is NOT an overview-layout target. Reuse its calm premium midnight-navy/cyan/white/copper system, and make the whole main content a truly distinct detailed construction page.
Primary request: Clicking the left "건설" category replaces the dashboard overview with a full detailed category work screen. The large planet picture belongs ONLY to the main dashboard. On this construction page, no huge planet or persistent planet-scene/right-panel hybrid.
High quality: precise editorial grid, ample margins, excellent Korean text legibility and hierarchy, elegant matte dark cards and thin restrained cyan borders, coherent white line/resource icons, no neon clutter or excess bloom. Looks like a polished finished strategy-game UI, not a wireframe, poster or marketing page.
Shared chrome: slim left sidebar, "DELTA NOVA". Labels "대시보드", "건설" SELECTED, "함대", "연구", "개인 작전", "동맹", "보고서". Compact top HUD exactly "노바 프라임 · 현지 자원", "합금 184 / 400" "+13 / 분", "결정 96 / 200" "+5 / 분", "연료 68 / 150" "+5 / 분", "전력 36 / 60". Top-right quiet "노바 · 연결됨", no notification bell/unread-dot or inactive fake settings.
Content: large heading "건설", quiet breadcrumb "대시보드 / 건설", context "노바 프라임 · 시설 개발". Small meaningful summaries "시설 공간 8 / 30" and "전력 여유 24". About two-thirds of page content is a 3-column by 2-row facility-card grid, each card has a beautiful large consistent code-reproducible icon, name, current level, operating effect and power. About one-third is a substantial selected-facility detail and active-job card. The selected fuel refinery card connects visually to its matching detail through the same cyan highlight. No invented search or category-filter controls.
Facility cards, render clean readable labels:
"합금 광산" "Lv.2" "합금 +13 / 분" "전력 12";
"결정 채굴소" "Lv.1" "결정 +5 / 분" "전력 4";
"연료 합성소" "Lv.1 → 2" cyan selected, badge "공사 중", "연료 +5 / 분" "전력 6";
"발전소" "Lv.1" "전력 공급 60";
"조선소" "Lv.1" "케스트럴 건조 중" "전력 8";
"연구소" "Lv.1" "추진 기술 연구 중" "전력 6".
Selected detail card: prominent heading "연료 합성소", "레벨 1 → 2", clear subhead "증설 효과"; comparative rows "연료 생산 5 → 9 / 분", "저장 상한 150 → 200", "행성 전력 수요 36 → 42". Cost row with resource icons "합금 40" "결정 10" "연료 10"; construction time "건설 시간 60초". Distinct active job block "증설 진행 중", progress about30%, "남은 시간 00:42", "작업 출처 · 노바 프라임". A visibly disabled current-state action "증설 진행 중", and secondary amber-outline actionable "작업 취소". Small clear note "취소 시 원 행성에 80% 반환" with refund "합금 32 · 결정 8 · 연료 8".
Under the facility grid, one compact "현재 공사" row for "연료 합성소 Lv.1 → 2", source "노바 프라임", a progress bar, "00:42"; and small text "행성별 동시 건설 1건". Do not invent a multi-item build queue.
Constraints: All labels and numbers belong to the same sample state as the reference. Actual facility levels/production/power/space and active job terms only. No population, XP, fictional planet level, colony unlocks, NPC threat/transport, new resources, galaxy screens or placeholder actions. Only construction content fills the main page; no giant planet scene. Readable text, sharp icons, coherent spacing, tasteful hierarchy, opaque background, no watermark, no browser/device frame.
```
