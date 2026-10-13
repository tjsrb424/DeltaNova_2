# 델타 노바 행성 대시보드 시안 v0.5

2026-10-13. 사용자가 제공한 행성 중심 UI를 직접 다듬어 내부 시안 평가 9.5 이상으로 만들라는 요청이다. 평상시와 적 함대 접근 상태를 같은 화면 구성으로 만들었다. 정적인 시안의 평가이며 런타임 UI·실제 조작감·반응형·모션의 완료 평가가 아니다.

선정본: [평상시](planet-dashboard-normal-v0.5.png), [적 함대 접근](planet-dashboard-threat-v0.5.png). 둘 다 내부 평가 9.55/10이다. 사용자 원본과 이전 생성본을 보존했다. 실제 실행 중인 웹 화면에는 적용하지 않았다.

## 생성 전에 고정한 평가 기준과 결과

이전 [기지 시안 평가](EMPIRE_COLONY_UI_REVIEW.md)의 항목·배점을 유지했다. 점수는 제작자의 주관적 판단이며 소수점은 배점 합계다. 기준을 느슨하게 바꿔 통과시키지 않았다. 두 최종 상태 각각 9.5 이상이어야 선정한다.

| 기준 | 배점 | 사용자 원본 | 평상시 1차 | 평상시 선정 | 공격 1차 | 공격 선정 |
|---|---:|---:|---:|---:|---:|---:|
| 제국 운영·다중 행성의 전달 | 2.00 | 1.80 | 1.95 | 1.95 | 1.95 | 1.95 |
| 정보와 행동의 우선순위 | 2.00 | 1.85 | 1.90 | 1.95 | 1.95 | 1.95 |
| 한글·수치·비용의 가독성 | 1.50 | 1.40 | 1.45 | 1.45 | 1.40 | 1.40 |
| 독자적인 우주 톤과 형태 | 2.00 | 1.75 | 1.75 | 1.85 | 1.85 | 1.90 |
| 선택·입력·상태의 구분 | 1.50 | 1.35 | 1.40 | 1.40 | 1.35 | 1.40 |
| 실제 UI로 분리해 구현할 수 있는 구성 | 1.00 | 0.95 | 0.95 | 0.95 | 0.95 | 0.95 |
| 합계 | 10.00 | 9.10 | 9.40 | 9.55 | 9.45 | 9.55 |

주요 한글 오타, 선택 행성과 자원 주체 혼동, 공격 정보/행동 모순, 수송 방향/비용 대상 불일치는 총점과 관계없이 재개선한다. 모든 출력은 생성 직후 화면으로 확인했다.

## 관찰과 집중 수정

사용자 원본은 상단 자원, 중앙 행성, 우측 위협, 하단 작업의 역할 분리가 좋다. 평상시 우측 행동, 현지 생산·저장, 행성에 연결되는 조작 지점, 선택기 중복, 모호한 성장 점 표시, 관측 정보의 정확도와 시각이 보완 대상이었다.

평상시 1차는 현지 자원·생산률·저장 상한·전력 여유를 보이고, 행성 선택을 한 곳으로 모았다. 생산 시설·조선소·방어 거점의 실제 그림과 표시를 연결했다. 우측은 조선소·함선·수량·비용·시간·건조 행동으로 바뀌었다. 하단 작업은 행성/제국 연구/수송 출발·목적지를 적는다. 다만 수송 아이콘이 지상 트럭이고 비활성 경계가 밝아 9.40으로 판단했다.

평상시 2차는 수송 아이콘을 우주 수송선으로 교체하고 비활성 패널·행성 카드 경계를 억제했다. 조선소 선택과 현지 건조 비용의 관계가 유지됐고 합계 9.55로 선정했다.

공격 1차는 같은 배치에서 우측을 위협과 대응 준비로 바꿨다. 적 규모는 '약 124척', 구성은 미확인, 원거리 센서 관측 시각은 3분 전으로 표시한다. 노출 자원 420K는 예상 손실과 구분한다. 회피 후보·편도 시간·왕복 연료·귀환 시간을 표시하고 준비 버튼 뒤에 함대/화물/회피 유지 시간을 확인하는 흐름을 전제한다. 탐지 보고서의 화물 아이콘과 조선소의 선택 표시가 남아 9.45로 판단했다.

공격 2차는 탐지 보고서 아이콘을 레이더로 바꾸고 우측이 위협 대응 중일 때 조선소 선택 광원을 해제했다. 붉은 공격 경로와 선택/조작의 청록색을 구분했다. 주요 한글·시간·수량·관측 상태를 다시 확인했고 합계 9.55로 선정했다.

남은 감점은 공통 우주 UI 형식의 일부, 상세 운영 비교가 별도 화면에 있다는 점, 공격 패널의 작은 보조 문구다. 실제 화면 크기별 가독성과 포커스/터치/모션은 별도 구현 검증이 필요하다. 정적인 스텝퍼와 버튼 표시는 조작감 검증이 아니다.

## 구현에 전달하는 화면 규칙

- 상단은 선택 행성의 현지 자원이다. 제국 총합으로 현지 비용을 지불한 것처럼 표시하지 않는다.
- 평상시 시설 선택과 우측 비용/행동을 연결한다. 위협 패널이 활성화되면 조선소 선택을 해제한다.
- 공격이 없을 때 붉은 경고를 상시 표시하지 않는다. 위험 정보는 숫자·이름·아이콘·텍스트로 함께 전달한다.
- '함대 회피 준비'는 즉시 출격이 아니다. 후속 준비 화면에서 함선, 적재 화물, 목적지, 실제 서버 판정 연료, 도착/귀환 시각, 회피 유지 시간을 검토한다.
- 표시된 왕복 40분은 즉시 귀환을 선택했을 때의 화면 예시다. 안전을 보장하거나 자동으로 회피 시간을 정하는 규칙이 아니다.
- 회피 가능 96척은 현지 가용 함선의 예시다. 현재 이동 중인 함대를 포함하거나 자원을 자동 회피시키지 않는다.
- 공통 연구 큐와 행성별 건설·조선, 비행의 출발/목적지/화물을 분리한다.
- 시안의 수치·비용·대기 시간은 배치 예시이고 확정 밸런스가 아니다.
- 행성·기지·함선 배경과 마커·텍스트·입력을 분리해 구현한다. 완성 PNG를 클릭 가능한 게임 UI로 취급하지 않는다.

## 마이크로인터랙션 전달

이미지에 실제 모션은 구현되어 있지 않다. 구현 시 행성 전환과 현지 HUD/우측 패널을 함께 갱신하고, 선택 120~180ms·패널 180~260ms를 시제품 기준으로 삼는다. 건조 명령이 확정되면 자원 지출과 작업 큐를 함께 갱신한다. 위협 도착 예정은 서버 시각에 맞춰 읽고, 오래된 연결 상태를 현재 정보처럼 보이지 않게 한다. 모션 감소와 키보드 포커스에서도 같은 정보를 전달한다.

## 파일 보존과 확인

내장 image_gen 도구로 편집 4회를 수행했다. CLI/API 대체 경로나 다른 이미지 편집 도구는 사용하지 않았다. 요청 프롬프트는 선명한 2K급 화면을 지향했지만 도구가 반환한 실제 파일은 원본과 같은 1672×941 PNG다. 저장 사본의 SHA256이 생성 원본과 같은지 확인했다. 생성 원본과 사용자 첨부 파일은 삭제하거나 덮어쓰지 않았다.

| 역할 | 프로젝트 저장 파일 | 크기 | SHA256 |
|---|---|---|---|
| 사용자 원본 · 9.10 | [planet-dashboard-user-reference-v0.5.png](planet-dashboard-user-reference-v0.5.png) | 1672×941 | E9A5E9181FE32A62CCB6C518BC8D99177D9FEF41B9215D820DB68F5A29B93D37 |
| 평상시 첫 개선 · 9.40 | [planet-dashboard-normal-v0.5-draft1.png](planet-dashboard-normal-v0.5-draft1.png) | 1672×941 | 5657F51BCBB61358829A4C270E52F351DEDCB84051790D646A165FF8FC7C4CB5 |
| 평상시 선정 · 9.55 | [planet-dashboard-normal-v0.5.png](planet-dashboard-normal-v0.5.png) | 1672×941 | 2D6A117731B357119A59124B8383F3834F9A92228657562923487AEB05F4AB83 |
| 공격 접근 첫 개선 · 9.45 | [planet-dashboard-threat-v0.5-draft1.png](planet-dashboard-threat-v0.5-draft1.png) | 1672×941 | 86B9DE9627336E8208DFF652F63B4BF2AE49F1FA73E54B87905FCA94D23C2019 |
| 공격 접근 선정 · 9.55 | [planet-dashboard-threat-v0.5.png](planet-dashboard-threat-v0.5.png) | 1672×941 | 3F57F88BF13181CEEEFB919172F0125860066B701E581BA4A65DEE6584F2E2DA |

원본 경로:

- 사용자 첨부: C:/Users/delic/AppData/Local/Temp/codex-clipboard-361c0cfa-1ffe-4f67-a242-2186326d5f35.png
- 평상시 1차: C:/Users/delic/.codex/generated_images/01a1333e-608f-7ee1-ac15-3792617628e4/exec-59b352be-57f4-4f81-94b1-a4a8645cacc9.png
- 평상시 선정: C:/Users/delic/.codex/generated_images/01a1333e-608f-7ee1-ac15-3792617628e4/exec-371d43b9-4ffd-44c2-94b2-c1cce220cbea.png
- 공격 1차: C:/Users/delic/.codex/generated_images/01a1333e-608f-7ee1-ac15-3792617628e4/exec-ef7fcbdc-763f-4e09-9fbc-fdccd460e74c.png
- 공격 선정: C:/Users/delic/.codex/generated_images/01a1333e-608f-7ee1-ac15-3792617628e4/exec-8b716a44-3937-4177-acad-6ef5558a6886.png

## 정확한 프롬프트

### 평상시 첫 편집

편집 입력: 사용자 원본; transparent_background=false; referenced_image_paths로 해당 원본 한 장을 지정했다.

```text
Use case: ui-mockup, precise reference edit.
Asset: DELTA NOVA Korean space empire game, desktop main planet dashboard, NORMAL PEACETIME state.
Input image 1 is the user's target UI reference. Preserve its recognizable composition: slim left navigation, persistent resource header, a magnificent blue Earthlike planet in the central scene, right contextual action column, lower active-work list. Preserve DELTA NOVA logo, three owned planets, dark space atmosphere and readable Korean game controls. Refine this exact direction, not a different dashboard genre.
Output one complete 16:9 high fidelity screen, crisp 2K-class or higher, no device frame, no annotations outside the game screen.

Visual polish: deep midnight navy, graphite matte panels, restrained teal light, white text, warm copper industrial accents. Borders subtle blue-gray, teal only selected controls and main CTA, no blanket neon outlines. No red emergency card in normal state. Bright planet limb and distinct continents with subtle city lights, calm star field. Premium console-strategy-game clarity. Orbital structures use ceramic white hulls, charcoal joints and small copper lighting. Consistent crisp line icons, generous spacing, aligned readable typography. Do not make the whole planet a flat decorative background.

Header: left-to-right plain context label "노바 프라임 · 현지 자원" (NOT a second planet dropdown), then four resource cells. Resource name, owned/capacity on one line, production on a smaller second line:
"합금" "1.24M / 2.00M" "+18K / 시간"
"결정" "892.3K / 1.20M" "+12K / 시간"
"연료" "457.1K / 800K" "+6K / 시간"
"전력" "84 / 120" "여유 36"
Bell and small portrait "사령관 Q" on far right. Do not say metal, deuterium or energy stockpile.

Left navigation exactly: "행성" selected, "함대", "은하계", "건설", "연구", "동맹", "랭킹"; bottom "보고서", "설정". Small monochrome icons and one restrained cyan selected row.

Central title "노바 프라임"; subtitle "[1:234:8] · 지구형". Under it compact neutral metrics "시설 공간 18 / 30" and "제국 행성 3". No ambiguous five dots or growth stage decorations.
Upper right within central scene show the ONLY planet selector, three compact thumbnail cards:
"노바 프라임" "본성" selected,
"아스트라-3" "산업",
"켈리온" "연료",
followed by a small "+ 개척" button. Do not add a second planet switching menu.
Central planet moderately smaller than the source so there is comfortable space for three useful clickable station hotspots. Around its rim, thin unobtrusive leader lines connect scene objects to exactly three compact pill labels: "생산 시설", "조선소" (selected in cyan, linked to the right panel), "방어 거점". Each label has a distinct simple icon and target point. No collision with continents/title/header or decorative global hexagonal grids. On bottom of scene a discreet text link "행성 상세 →".

Right column top compact header "행성 운영" and calm status "정상". Small readable summary "주둔 96척" "방어 12기" and "결정 저장 74%".
Below, the principal contextual action card "궤도 조선소 Lv.4" displays a small original sleek frigate illustration, name "프리깃", helper "호위 · 기동 타격", quantity stepper "−  1  +".
Cost row: "합금 42K" "결정 18K" "연료 4K"; time "건조 시간 00:18:00". One large restrained teal filled button "프리깃 건조". Below small text "건조 대기 2건", and a quiet secondary text action "함대 관리 →". All input and action states immediately understandable. No buttons with conflicting actions.

Bottom central panel title "진행 중", quiet link "전체 보기 →". Exactly three aligned rows with task type, full location/context, a thin teal progress bar, and remaining time:
"건설" "노바 프라임 · 합금 광산 Lv.14 → 15" "02:14:32"
"연구" "제국 · 추진 기술 Lv.8 → 9" "12:43:21"
"수송" "아스트라-3 → 노바 프라임 · 합금 80K" "00:21:10"
No operation exists on two planets simultaneously, no global pooled spendable resource labels.
Bottom right "최근 보고서" with "수송 도착" "12분 전" and "정찰 보고서" "28분 전".
Render all supplied Korean strings correctly, with clear Hangul letter shapes, aligned numbers, consistent separators. Fewer better controls, not more microtext. No watermark, no concept score, no unrelated UI, no glowing red emergency in this normal view. This is a static visual reference, not code.
```

### 평상시 집중 수정

편집 입력: 평상시 첫 생성본; transparent_background=false; referenced_image_paths로 해당 원본 한 장을 지정했다.

```text
Use case: ui-mockup reference refinement.
Input image 1 is the NORMAL PEACETIME Delta Nova dashboard edit target. Preserve the entire layout, planet rendering, logo, avatar, every Korean word and number, all positions and three station leader lines, resource HUD, planet selector, shipyard construction panel and three work rows exactly. Do not add, remove, translate, resize or rename any controls. This is a focused second polish pass, not a redesign.

Change only these two visual-coherence defects:
1. In the bottom work table's "수송" row, replace the terrestrial truck pictogram with a clean WHITE SPACE CARGO SHIP pictogram: compact cargo modules and a small engine, no wheels. This is an interplanetary flight. All other table icons stay unchanged.
2. Reduce passive panel/chrome borders to subtle slate-blue, no bright cyan glow on inactive panels or unselected planet cards. Keep cyan selection ONLY on the selected "행성" navigation, selected "노바 프라임" planet card, selected "조선소" hotspot and the main "프리깃 건조" button. Keep the planet atmosphere attractive blue and active progress bars teal, without globally dulling the scene. Preserve contrast and all legibility.
All output remains one full 16:9 game screen, crisp Korean typography and aligned numerals, opaque PNG visual reference, no annotation, no watermark.
```

### 공격 접근 상태 편집

편집 입력: 선정한 평상시 생성본; transparent_background=false; referenced_image_paths로 해당 원본 한 장을 지정했다.

```text
Use case: ui-mockup, precise state-variant edit.
Asset: DELTA NOVA Korean planet dashboard, INCOMING HOSTILE FLEET state.
Input image 1 is the selected polished normal dashboard. It is the edit target and the complete visual identity source. Preserve its exact full-screen 16:9 layout, logo, left navigation, top local resource HUD with all names/numbers/rates, main planet illustration and station geometry, three planet selector cards, facility space 18 / 30, empire planets 3, and lower work list with all existing rows/times. Preserve the refined space cargo ship icon in "수송". No redesign, no crop, no device frame. Crisp readable Korean high fidelity.

Make a focused hostile-state variation. The right column becomes a single clear threat-response card above the same recent reports panel. Keep the outer dimensions and typography system. Red ONLY indicates the threat title, countdown, selected planet warning icon and a short incoming path in the scene. Normal frame borders stay subtle slate, resource/header/buttons remain controlled teal.
In the central scene, add a restrained thin red incoming route arrow near the upper-right planet limb, ending at a small warning beacon, plus a small pill "적 함대 접근". Do not wrap the entire planet in a red aura. On the selected "노바 프라임" thumbnail add an explicit red triangle warning icon (not only an ambiguous dot). No damage, explosion or battle yet: attack arrives in 32 minutes. Station hotspots remain readable. Set the "조선소" hotspot to neutral because its construction panel is not currently open, keep other hotspots neutral. Left "행성" selection stays teal.

Right threat card, generous breathing room and well aligned:
Heading with triangle icon "적 함대 접근", a small outlined badge "위험 1건".
Subheading "노바 프라임 도착까지"; large primary timer "00:32:17". No second competing large number.
Two compact rows: "공격자" "K-317" and "출발" "[1:198:6]".
A quiet amber indicator and label "관측 정보 · 구성 미확인".
Three clear data rows:
"적 관측 규모" "약 124척"
"회피 가능 함선" "96척"
"노출 자원" "420K"
Helper under them "원거리 센서 · 3분 전 관측" and "노출 자원은 예상 손실이 아닙니다". No exact enemy composition or damage prediction appears.
Below a compact calm preparation preview section "회피 후보 · 켈리온", with two short readable lines:
"편도 00:20:00 · 왕복 연료 12K"
"즉시 귀환 시 총 00:40:00"
A small note "회피 유지 시간은 출격 전에 선택".
One large teal main button "함대 회피 준비" with a simple space-ship icon. The wording must mean prepare, not instant launch. Below two equal secondary outline buttons "방어 검토" and "지원 요청". Bottom small helper "출격 전에 함대·화물·귀환 시간을 확인하세요". The destination and preview are candidates, not a confirmed live flight.
No suggestion that all resources automatically flee, no immediate departure instruction without review, no guaranteed safe return. Make threat data and preparation controls fit without tiny text.

Bottom right remains "최근 보고서". Rows are "접근 함대 탐지" "방금" and "정찰 보고서" "28분 전".
Render exact Korean and times, aligned readable digits. If space is needed reduce shipyard-only decorative imagery entirely within the right column; do not shrink Korean copy to illegibility. No hero ship preview is needed in the threat card. Main central composition stays the same. This image is a static UX state reference with illustrative values, no watermark or score.
```

### 공격 접근 집중 수정

편집 입력: 공격 접근 첫 생성본; transparent_background=false; referenced_image_paths로 해당 원본 한 장을 지정했다.

```text
Use case: ui-mockup, precise semantic polish.
Input image 1 is the Delta Nova INCOMING HOSTILE FLEET dashboard edit target. Preserve its entire layout, every word and number, alert and candidate flight previews, planet artwork, shipyard geometry, header/resource values, all controls and spacing. Preserve these verbatim and unchanged: "00:32:17", "약 124척", "96척", "420K", "3분 전 관측", "왕복 연료 12K", "즉시 귀환 시 총 00:40:00". No new content, no crop, no overall style change.

Fix ONLY two semantic state cues:
1. In lower-right "최근 보고서", the first "접근 함대 탐지" row currently has a white cargo-box pictogram. Replace that pictogram with a WHITE RADAR/DETECTION pictogram (sweeping radar arcs and small blip or a clean radar dish), clearly recognizable as detection. Do not change its text or "방금".
2. In the center-right scene, the neutral "조선소" station hotspot has a bright cyan target dot and glowing cyan leader line left over from the normal selected shipyard view. Make that exact target dot and leader line neutral white/slate with NO CYAN SELECTION GLOW; keep the "조선소" pill neutral white/slate as it already is. It is not currently selected while the threat-response panel is displayed. Preserve the bright teal selected "행성" navigation, selected planet card, main preparation CTA, resource production text and work progress bars. Preserve the red incoming-route threat beacon and alert, making selection and threat distinct.
Crisp Hangul, unchanged exact geometry, one complete 16:9 opaque game screen, no watermark or annotations.
```
