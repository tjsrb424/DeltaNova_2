# 델타 노바 다중 행성 화면 시안 평가와 개선

2026-10-13. 사용자는 시안 레퍼런스를 에이전트가 평가하고9.5 이상까지 개선·재생성한 뒤 저장하거나 보여주도록 요청했다. 이 평가의 대상은 정적인 화면 시안이다. 외부 인증·실제 플레이·프레임 성능·반응형 UI·모션 검증 점수가 아니다. 기준과 점수를 바꿔 통과시키지 않고 각 버전에서 보이는 개선과 한계를 기록한다.

현재 선택 레퍼런스는 [v0.4](empire-colony-ui-v0.4.png)다. 점수9.55/10으로9.5 이상을 충족했다. 실제 실행 중인 웹 화면에는 적용하지 않았다. 기존 아트와 이전 생성본을 보존했다.

## 같은 기준으로 비교한 결과

| 기준 | 배점 | v0.2 | v0.3 | v0.4 |
|---|---:|---:|---:|---:|
| 제국 운영·다중 행성의 전달 | 2.00 | 1.20 | 1.90 | 2.00 |
| 정보와 행동의 우선순위 | 2.00 | 1.80 | 1.85 | 1.90 |
| 한글·수치·비용의 가독성 | 1.50 | 1.35 | 1.40 | 1.45 |
| 독자적인 우주 톤과 형태 | 2.00 | 1.85 | 1.85 | 1.85 |
| 선택·입력·상태의 구분 | 1.50 | 1.30 | 1.30 | 1.40 |
| 실제 UI로 분리해 구현할 수 있는 구성 | 1.00 | 0.80 | 0.80 | 0.95 |
| 합계 | 10.00 | 8.30 | 9.10 | 9.55 |

평가는 제작자의 주관적 판단이다. 같은 시안에서 세부 정보와 형태를 일관된 기준으로 비교한 결과이며 소수점은 배점 합계다. 핵심 한글 오타, 선택 행성과 자원 주체의 혼동, 서로 반대인 수송 방향, 비용/실행 대상의 불일치가 있으면 총점과 관계없이 다시 개선한다.

## 관찰과 수정

v0.2는 기지와 조선소의 읽기 쉬운 구성을 갖지만 행성 전환·현지 자원·수송의 연결이 없다. 작은 모듈과 날아다니는 함선이 많고 생산시설의 투자 이유를 읽기 어렵다.

v0.3은 행성3개의 선택과 특화, 선택한 행성의 자원, 행성 간 수송을 추가했다. 기지의 주요 실루엣을 줄였고 건조 시간·하단 남은 시간도 읽을 수 있다. 생산률이 없고 생산시설의 종류가 묶여 있으며 자원 주체 라벨이 클릭 버튼처럼 보여 추가 개선했다.

v0.4는 생산률을 추가하고 합금 제조라인/결정 정제소를 구분했다. 선택 행성 라벨을 조용한 문맥으로 바꾸고 조선 패널의 중첩 테두리를 줄였다. 수송은 세레스에서 노바 프라임으로 향하는 화살표와 같은 이름의 도착 작업·합금240을 보여준다. 자원·선택 행성·조선 비용·작업의 관계가 함께 읽힌다. 주요 한글과 비용·시간의 배치를 직접 확인했다.

남은 한계는 정적인 이미지라는 점, 작은 보조 텍스트의 화면 크기별 읽기, 기지의 일부 세부 묘사와 움직임이다. 실제 구현에서는 배경/시설/함선/마커/텍스트/입력을 분리하고, 서버 상태에 연결된 이벤트로 모션을 만든다. 시안 수치와 대기 시간은 예시이고 확정 밸런스가 아니다.

## 이후 시안에도 적용할 작업 방식

시안의 용도와 주요 판단을 먼저 정하고 평가 항목·배점을 생성 전에 고정한다. UI에는 위 기준을 사용하고 단독 함선/시설 아트는 그 용도에 맞는 실루엣·기능·재료·일관성·기술 사용 조건을 정한다. 생성 → 직접 보기 → 항목별 점수와 결함 기록 → 가장 큰 결함에 집중해 재생성 → 같은 기준 재평가를9.5 이상까지 반복한다.

선정한 버전은 프로젝트에 저장하고 이전 원본과 정확한 프롬프트를 보존한다. 시안 품질과 실제 조작감의 평가를 합치지 않는다. 번호나 색만 바뀐 결과를 개선으로 취급하지 않고 점수를 위해 기존 기준을 느슨하게 바꾸지 않는다.

## 생성과 저장

이번 요청에서 내장 image_gen 도구로 편집2회를 수행했다. API/CLI 대체 경로와 다른 이미지 편집 도구는 사용하지 않았다. 모든 출력은 불투명 PNG이고 생성 원본은 보존했다.

| 버전 | 역할 | 저장 파일 | SHA256 |
|---|---|---|---|
| v0.2 | 기존 평가 기준본 | empire-colony-ui-v0.2.png | 2D87800F773F986576ECE10713201254152943BEF9B5656FB07B8E158A63AE7E |
| v0.3 | 첫 개선,9.10 | empire-colony-ui-v0.3.png | DD17F04344FD2DDE0AA8D7FA6FE11701C80B2B6B648477DF7EBE4F03B944FAEB |
| v0.4 | 두 번째 개선,선정9.55 | empire-colony-ui-v0.4.png | 78A07093FC9BF137AEA0F049D7B6C548C019877817341E0F791AEEBCB6FE6099 |

- v0.3 원본: C:/Users/delic/.codex/generated_images/01a1333e-608f-7ee1-ac15-3792617628e4/exec-09aab02e-c4da-4089-8086-81eca55ce5d1.png
- v0.4 원본: C:/Users/delic/.codex/generated_images/01a1333e-608f-7ee1-ac15-3792617628e4/exec-1cba75e6-367b-4536-919a-f4263371814d.png
- 첫 편집 입력은 프로젝트의 v0.2였고 두 번째는 생성된 v0.3이었다. 각 출력은 다음 편집 전에 화면으로 확인했다.
- 기존 v0.2의 생성 프롬프트는 [초기 제작 기록](EMPIRE_COLONY_UI_V0.2_PROMPT.md)에 있다.

## v0.3 정확한 편집 프롬프트

```text
Use case: ui-mockup
Intent: edit and improve the supplied Delta Nova colony gameplay screen. Image 1 is the edit target and a reference for its original ivory/graphite/copper/teal industrial science-fiction identity. Preserve the clear top resource HUD, left icon-and-Korean-label navigation, central orbital colony, right selected-facility action panel and bottom task dock. Do not copy any third-party game, console brand or other IP.
Primary request: Bring this screen to an exceptionally polished premium console-quality persistent space civilization strategy game, now clearly supporting MULTIPLE OWNED PLANETS and independently developing colonies. Readable, restrained, original, tactile, not a business dashboard. 16:9 full game screen, opaque background.
Required improvements:
1. Directly below the top resource HUD add a shallow well-designed PLANET SELECTOR bar spanning the main content area. Three distinct round planet thumbnails and Korean names, separated by plenty of air: selected pale-blue homeworld "노바 프라임" with small pill "본성"; rocky copper-gray colony "세레스" with small pill "산업"; icy pale-teal colony "네레이드" with small pill "연료". The selected homeworld has a clear ivory name and restrained teal underline/border. Also a modest "+ 식민지" action at the far right. No duplicated side planet list. The resource HUD visibly belongs to the selected world with a small context label "노바 프라임 자원".
2. Reduce central colony clutter substantially. Keep only five to six major, distinctly readable building silhouettes with generous space and a clean large-scale three-quarter view: central low broad command hub, long shipyard dock, a pair of resource production modules, one compact research/sensor cluster, and a separated defense battery. Surface materials stay broad matte ceramic with purposeful functional details, no endless copy-pasted rings or pods. Make the shipyard the only facility with a bright slim teal selection outline. Other facility labels have low visual emphasis and are anchored accurately. Keep a breathtaking restrained blue planet atmosphere behind the orbiting settlement. No marketing slogan. A quiet small scene title "노바 프라임" is enough.
3. Right panel: "궤도 조선소", one original broad ivory/graphite frigate with distinctive asymmetrical sensor fin and two separated restrained teal engines; the thumbnail clearly sits in its own spacious area. Ship name "케스트럴", subtitle "경량 타격함". One compact stat line with simple icons, not a dense grid. Section "건조 수량" and a clean - 1 + stepper. Costs "합금 120 · 결정 40". Small clear duration "건조 시간 01:35". Large teal primary action "함선 건조". Strong visual hierarchy and realistic comfortable target sizes.
4. Top HUD exact resource captions and numbers: "합금 1,240", "결정 680", "연료 320", "전력 84 / 120". Use matching original readable material icons. No decorative numbers unrelated to state.
5. Left navigation exact labels: "기지", "성계", "함대", "방어", "연구", "동맹". Icons are stylistically unified and instantly distinguishable. All Korean text is crisply typeset, correctly spelled, and clearly readable.
6. Keep the bottom task dock spacious and limited to THREE practical actions. "제조라인 증설" with "01:20 남음", "케스트럴 건조" with "00:48 남음", "세레스 → 노바 프라임" with "수송 도착 03:10". Use tactile but subtle progress bars, little thumbnails, and clear equal task cards.
7. Lower-left miniature map: just the three named owned planets and one clean route. Selected planet uses the same teal emphasis as the planet selector. Label "행성 간 수송". No dense star lattice or gratuitous star nodes.
8. Keep the scene physically believable and calm: cream modules, deep navy panels, copper industrial lights, subtle teal status; refined soft planetary bounce. Rounded rectangular UI surfaces, subtle depth and controlled material contrast, excellent text/background separation, no excessive neon, bloom, lens flares, tiny lore, multiple glowing callouts or borders around every small item.
9. Include tiny "화면 시안" at bottom right. This is an editable-layout reference proposal; depicted amounts and times are illustrative, not actual balance or a gameplay screenshot. Do not put a giant disclaimer on the image.
Constraints: Preserve the original distinctive space-industrial identity and readable major UI zones. Improve only this game screen, no multi-screen collage, no monitor frame, no phone, no external watermarks. Have the planet selector, selected planet context and interplanetary transport all visible and coherent. All primary labels must be legible at normal screen size.
```

## v0.4 정확한 편집 프롬프트

```text
Use case: ui-mockup
Intent: final focused edit of the supplied multi-planet Delta Nova gameplay screen. Image 1 is the sole edit target. Preserve the composition, resource icons, left navigation, three-planet selector, selected planet, central colony camera, selected shipyard, frigate design, right panel and three bottom task cards. Preserve its original ivory ceramic, graphite, copper industrial, restrained teal design identity. Do NOT redesign the whole screen.
Goal: exceptionally readable and strategically informative multi-colony game UI reference, premium polished console-game quality. Keep the image opaque and 16:9.
Only these refinements:
1. Improve the top HUD's information hierarchy without making it busy. Each resource cell has a large name/amount and one smaller but readable production-rate line beneath it. Exact text: "합금 1,240" with "분당 +6", "결정 680" with "분당 +4", "연료 320" with "분당 +2". Keep the selected-world context label "노바 프라임 자원" as quiet small plain text, not an extra glowing bordered button. Resource HUD and planet selector never overlap. Leave plenty of vertical padding for the rate lines.
2. Planet selector stays clearly above the scene. Exact captions: "노바 프라임" with "본성", "세레스" with "산업", "네레이드" with "연료", and "+ 식민지". Give the selected planet ONE clean teal bottom edge and a soft selected fill, not multiple competing glows. Unselected worlds stay calmly legible. Each world thumbnail is visually distinct.
3. Make production infrastructure useful to read. Replace the vague "자원 생산 시설" marker by TWO accurately attached quiet markers, one "합금 제조라인" on an elongated broad module with copper industry lights, and one "결정 정제소" on a compact faceted white module with pale cyan functional lights. The two production modules are physically distinguishable, separated by a short service bridge. Other scene labels exactly: "지휘 센터", "연구소", "방어 포대", and selected "궤도 조선소". Only the selected shipyard marker is teal. Minor labels must not collide with each other or buildings. Keep the colony's center of gravity and overall distinctive silhouette; do not add endless detail or an extra city.
4. Remove most decorative flying spacecraft so the colony silhouette is calm. At most TWO small distant craft in the entire scene, plus the clearly docked selected frigate. Do not let a floating craft compete with the selected shipyard or obscure facility labels.
5. Make the right panel feel less like nested boxes. Remove the extra border around the entire frigate/ship-stat subpanel. Use spacing and one fine divider to group it. Keep the facility heading, frigate thumbnail, Korean ship title "케스트럴", subtitle "경량 타격함", one compact stat row, "건조 수량" with "- 1 +", "합금 120 · 결정 40", "건조 시간 01:35" and the sole large primary button "함선 건조". The stepper has tactile distinct segments, and the primary button has gentle material depth with restrained brightness. All text is correctly spelled and legible. Avoid excessive inset borders.
6. Bottom tasks remain exactly THREE: "제조라인 증설" / "01:20 남음"; "케스트럴 건조" / "00:48 남음"; "세레스 → 노바 프라임" / "수송 도착 03:10". Add a short readable cargo annotation "합금 240" to the transport item without overcrowding. These are illustrative values, not real balance. Keep every caption and time inside its own card with comfortable margin.
7. Lower-left inset title "행성 간 수송". It shows ONLY three planet markers named "노바 프라임", "세레스", "네레이드" and one purposeful route arrow from 세레스 to selected 노바 프라임. No random dense star network. Make the transfer direction correspond to the bottom task.
8. Top energy indicator "전력 84 / 120" is visually unchanged. Left navigation exact labels "기지", "성계", "함대", "방어", "연구", "동맹". Scene title "노바 프라임" remains modest and lower priority than resources and the selected action.
9. Keep a tiny "화면 시안" at bottom right. No brand names beyond DELTA NOVA, no copied external IP, no watermark, no device frame, no multi-screen collage.
Pass criteria: ownership/selected planet and local resources are obvious at a glance; production rates and resource-specialist facilities can be compared; planet switching, build quantity, build action and transport each have one unmistakable affordance; calm broad physical forms, excellent readable Korean and coordinated material/UI hierarchy. The screenshot remains a static reference proposal, not an implemented or interactive game.
```
