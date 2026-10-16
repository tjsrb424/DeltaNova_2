# 개인 작전·편성 연습 아트

2026-10-15 · 기본 내장 image_gen 도구 사용. UI 스크린샷이 아닌 작전 브리핑용 새 삽화를 생성했다. 외부 사진이나 게임 아트는 사용하지 않았다.

- 원본: `art-source/operation-stage-v1.png`
- 런타임: `../../public/uiux-demo/art/operation-stage-v1.webp`
- 전체 구도를 유지한 WebP 포맷 변환만 수행했다. 조작 버튼·수치·라벨은 이미지에 그리지 않고 실제 HTML로 제공한다.
- 함선 도해는 `../../public/uiux-demo/operations.js`의 벡터 그래픽으로 작성한다. 기존 단색 선 아이콘과 같은 명도·여백을 사용한다.

## 최종 생성 프롬프트

Use case: stylized-concept. Asset type: background illustration for the mission briefing card in DELTA NOVA, a calm minimal galactic strategy game UI. Primary request: an understated cinematic space expedition illustration that visually matches a dark navy interface with muted cyan accents. Scene: a small, compact original industrial exploration frigate with a restrained cyan engine light, seen from a distant three-quarter rear angle, approaching an abandoned orbital relay and a few sparse fragments over the curved atmospheric limb of a planet. Main ship and small relay sit in the right two thirds; left third is quiet deep navy space usable under a subtle gradient, no text. Style: refined realistic 3D concept render, believable machined silhouettes, soft atmospheric light, tactile understated materials, restrained fine detail, subtle blue-gray starlight, faint amber station marker. Composition: wide landscape 3:2 or wider, generous negative space, ship at medium small scale so the image works cropped into a wide UI card. Palette: near-black #080f19, navy #101b2b, slate blue #607c94, subdued cyan #61c1d4, tiny warm beige highlights. Avoid: illustration of a UI, any frames, labels, letters, diagrams, HUD overlays, icons, logos, watermarks, people, combat fire, explosions, intense saturated neon, excessive star clutter, close-up giant ships. No text anywhere. Opaque image.
