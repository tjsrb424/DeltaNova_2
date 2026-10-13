# 델타 노바 제국 기지 화면 시안 제작 기록

2026-10-13. 내장 image_gen 도구로 새 ui-mockup 이미지를 한 번 생성했다. 참고 입력 이미지와 편집 대상은 없고 배경은 불투명이다. 게임 기능을 구현하거나 실제 웹 화면을 캡처한 결과가 아니다. 최종 아트 승인은 아직 없다.

- 원본: C:/Users/delic/.codex/generated_images/01a1333e-608f-7ee1-ac15-3792617628e4/exec-7e559a7b-4763-4c6a-8e48-19699a14985c.png
- 프로젝트 사본: docs/art/empire-colony-ui-v0.2.png
- 원본과 사본 SHA256: 2D87800F773F986576ECE10713201254152943BEF9B5656FB07B8E158A63AE7E
- 기존 public/art/orbital-base-v1.png와 실행 중인 UI는 교체하지 않았다.

## 시안 검토

중앙 기지·선택 조선소·상단 자원·좌측 한글 메뉴·하단 작업을 구분할 수 있다. 흰 세라믹/흑연 구조와 청록 선택, 따뜻한 산업 조명이 함께 쓰였다. 선택 시설과 우측 행동이 같은 대상으로 읽힌다. 시안의 공격력/내구도/속도, 자원 보유량, 작업 대기 시간은 장식적인 예시이고 규칙이나 확정 밸런스가 아니다.

그림과 글자가 하나의 비트맵이므로 런타임 배경으로 그대로 사용하면 조작과 반응형 가독성이 확보되지 않는다. 실제 구현은 기지 이미지/함선 이미지/마커/텍스트/입력 컨트롤을 분리하고 서버 상태에 연결한다. 생성 이미지의 문구는 실제 UI 카피로 검수해 다시 작성한다. 정적 이미지의 배치만 검토했고 실제 조작·화면 크기별 렌더·모션 체감은 검증하지 않았다.

## 실제 생성 프롬프트

```text
Use case: ui-mockup
Asset type: one high fidelity 16:9 gameplay screen concept for Delta Nova, an original persistent space empire strategy game. This is a visual proposal, not a shipped UI.
Primary request: A premium, exceptionally readable space civilization strategy game interface that feels like a carefully polished console game and works as a modern PC web game. The player grows a real space colony, builds fleets and defenses, researches sensors, and dispatches ships across a star map. Show the colony overview with the shipyard selected. No Nintendo, Civilization or OGame logos, characters, copied art, or copied screen layouts.
Scene/backdrop: A deep midnight navy orbital setting with a pale blue planet limb, subtle stars, and a beautifully stylized three-quarter isometric modular orbital colony filling the center of the screen. The central colony is the functional gameplay space, not a marketing hero picture. Broad sculpted off-white ceramic modules, graphite foundations, restrained copper pipework, cool teal docking lights, distinctive sensor arrays, grouped defense batteries, solar panels and a shipyard berth with one readable original frigate under construction. Strong readable silhouettes and tactile matte materials, expensive soft lighting and carefully controlled depth. A small warm building work light indicates construction. Never cover important colony silhouettes with text.
Composition/framing: Full-frame flat 16:9 PC game screen with no device mockup. Top horizontal HUD with generous typography: left small DELTA NOVA logo, centered three resources, right a compact energy indicator. A slim left navigation column with icon plus clearly legible Korean labels. Middle 58 percent is the colony diorama with five subtle anchored facility markers and one selected shipyard marker. The right 25 percent is a calm dark translucent selected shipyard panel, with a big frigate thumbnail, one short stat row, quantity stepper, clear material cost row and a single substantial teal build button. Along the bottom, a compact event/queue dock with just three items: building upgrade, frigate construction, and a scout's timed flight. Also a small star-map preview near the lower left of the scene with a visible route and destination marker.
Style/medium: Art-directed stylized 3D game rendering integrated with crisp designed UI, premium friendly industrial science fiction, confident generous spacing, sophisticated typography, strong contrast, clear rounded rectangular shapes, subtle layering and restrained highlights. More physical game-world presence than an analytics dashboard. No cluttered management grid, tiny text, random decorative hexagons, excessive glowing neon, lens flare, fake HUD numbers, or dense lore paragraphs.
Color palette: midnight navy and blue graphite, matte ivory structures, pale cyan/teal for active selection and primary action, warm copper for industry, restrained warm amber for timers. Body text off-white and secondary text muted blue-gray.
Text (verbatim), readable Korean typography:
Top HUD: "합금 1,240" "결정 680" "연료 320" "전력 84 / 120"
Left navigation: "기지" "성계" "함대" "방어" "연구" "동맹"
Scene small title: "노바 프라임"
Selected right panel: "궤도 조선소" "케스트럴" "경량 타격함" "건조 수량" "1" "합금 120 · 결정 40" "함선 건조"
Bottom queue captions: "제조라인 증설" "케스트럴 건조" "정찰함 이동"
Tiny draft identifier bottom right: "화면 시안"
Constraints: Every visible panel and symbol supports an understandable game action. Keep the navigation and primary build action readable at thumbnail scale. All graphic subjects original. Show one selected facility, not all facility tooltips at once. Do not imply actual gameplay implementation; include the small draft identifier. Opaque background.
```
