# 행성 대시보드 런타임 아트 v0.1

2026-10-14. v0.5 평상시 시안의 행성·시설 장면을 텍스트 없는 별도 환경 레이어로 생성했다. 내장 image_gen 도구를 사용했고 CLI/API 우회는 사용하지 않았다.

- 기준: [v0.5 평상시 시안](planet-dashboard-normal-v0.5.png).
- 소비 자산: `public/art/planet-dashboard-scene-v1.png`. 원본 시안과 생성 원본을 보존했다.
- 생성 원본: `C:\Users\delic\.codex\generated_images\01a137ec-ccfd-77f0-b32f-1937420224ed\exec-588d31b3-1514-4fb8-81a0-b146bcd1d1f9.png`.
- 실제 크기: 1672×941. 완성 대시보드 캡처가 아니라 행성 장면 파일이다.
- SHA256: `85992F6195D0B6363C98A2671DC48C86A797822BDC5DD5711FC450D270C1F74A`.
- 이미지 확인: 푸른 본성, 왼쪽 생산 시설, 우측 조선소, 아래 방어 거점과 동일 계열 재질을 유지하며 글자·숫자·HUD·패널·버튼·마커가 없다.
- 시설 리더선·선택 강조·행성 선택·HUD·실행·진행 막대는 React/CSS로 만든다. SVG 아이콘과 함종 도식은 코드로 관리한다.
- 실제 화면 렌더·반응형 기기·포커스 시인성·모션 체감은 별도 시각 QA다. 정적 시안 점수를 런타임 완료 점수로 사용하지 않는다.

## 최종 프롬프트

```text
Use case: precise-object-edit. Asset type: text-free gameplay environment layer for the DELTA NOVA planet dashboard. Input image 1 is the approved v0.5 normal dashboard reference; extract and recompose ONLY its central blue homeworld and three orbiting installations as a standalone opaque landscape scene. Preserve the recognizable planet, illuminated continents, restrained blue atmospheric rim, original ceramic-white/graphite/copper orbital shipyard on the right, small production station on the left and defensive station lower left, coherent original space-industrial design and calm three-quarter camera. The planet occupies the center-right of this standalone scene with comfortable dark space around all installations. Keep the top-left quarter calm dark navy for live heading overlays; reserve quiet space near upper-right for live planet selection cards. Elegant sparse stars, no clutter, no excessive neon or bloom. Premium tactile game illustration, broad clear silhouettes and refined lighting, landscape about 16:9. Remove ALL interface chrome: no sidebar, no logo, no avatar, no portrait, no headers, no HUD, no panels, no cards, no labels, no leader lines, no markers, no buttons, no icons, no counters, no bars, no charts, no typography, no digits and no watermark anywhere. Do not reproduce the complete screenshot. Deliver only the beautifully finished environment art to be consumed behind independent live React controls. Background must be opaque deep midnight navy. Original reference stays untouched.
```
