# 행성 아트 출처와 레이어 계약

2026-10-15 독립 UI 데모 전용. 운영 게임 아트 교체는 수행하지 않았다.

- 생성: Codex 내장 `image_gen.imagegen`, 새 이미지 1장, 투명 배경.
- 원본: `C:/Users/delic/.codex/generated_images/01a13ece-0fd6-7490-ba2a-3404062f895d/exec-94110715-d642-4d9c-b700-73c01f598352.png`, 1254×1254 RGBA, 2,675,800 bytes. 원본 보존.
- 다른 환경에서 사용하는 저장소 내 원본: [art-source/nova-natural-v2-source.png](./art-source/nova-natural-v2-source.png). 위 생성 원본과 SHA256이 같다. 원래 PC의 Codex 폴더가 필요하지 않다.
- 사용 파일: `D:/kim_dev/DeltaNova/public/uiux-demo/art/nova-natural-v2.webp`, 768×768 RGBA, **190,454 bytes**.
- 최적화: 기존 번들 sharp로 768px 축소와 WebP 인코딩만 수행했다. 이미지 편집 도구나 새 패키지는 설치하지 않았다.
- 원본 SHA256: `edbb3a8f5538e312b9a5a9f00758cdbb8b7887ea998a9eb336026e683dd3cf98`.
- WebP SHA256: `11139b421799e4964a70c99914482a8f278c0e151af03d080c9d83cb1b0829b6`.

## 최종 생성 프롬프트

Use case: stylized-concept, premium realistic science-fiction strategy game planet art. Asset type: isolated natural planetary globe for the central interactive DELTA NOVA command screen, consumed as an image texture beneath data-driven city lights and orbital facilities. Create one exceptionally detailed believable terrestrial alien planet, centered perfect circular complete sphere, diameter 90 percent of the square canvas with a genuinely transparent background. Entire sphere fully visible, no cropping. Camera frontal from deep space, natural perspective. Strong directional grazing sunlight from upper left; terminator curves through right third; night side retains faint blue reflected detail, not a black cutout. Restrained deep slate-blue oceans, weathered mineral green and ochre rugged landmasses with geological detail at several scales, delicate coastal shallows, thin physically plausible cloud systems with soft shadows and fine wispy structure, subtle north polar ice. Invent a new continental arrangement, do not copy Earth's recognizable continents. Fine narrow cyan atmosphere on sunlit limb, restrained illumination, sophisticated photographic orbital realism, beautifully textured land and water, premium cinematic depth. Minimal Galactic Command art direction: calm, precise, expensive, no neon overload. IMPORTANT the globe's natural surface must have NO cities, NO artificial lights, NO buildings, NO orbital structures, NO satellites, NO starfield, NO rings, NO UI, NO text, NO numbers, NO watermark. Those gameplay layers are drawn separately. Do not include decorative transparent boxes or particles. This is the final high-quality natural globe asset, not a UI mockup.

## 표시와 데이터 연결

`planet.js`가 로컬 WebP를 읽고 512px Canvas에 합성한다. 노바 프라임은 절제된 원색, 베스퍼는 같은 자연 지형의 색조 변형이다. 두 행성의 고유 지형을 완성했다고 평가하지 않는다. 두 fixture ID만 메모리 캐시하며, 비동기 요청 토큰으로 이전 행성의 완료가 현재 선택을 덮어쓰지 않게 한다.

자연 아트에 도시나 시설을 구워 넣지 않았다. 도시광 cluster 수는 개별 시설 수준, 궤도 조선소의 유무·크기·확장부는 `facilities.shipyard`에서 나온다. 시설 앵커는 아트의 육지에 맞춘 데모 전용 정규화 좌표다. 실제 행성의 지형/건설 위치를 의미하지 않는다. 도시광과 조선소는 코드의 CSS/SVG이며 이미지 생성 결과와 별개다.

WebP 실패 시 보존한 `planet-fallback.js`의 결정적 절차 구체를 표시한다. 네트워크 오류를 성공 상태로 바꾸지 않고 실제 명령/자산을 수정하지 않는다. 자연 아트 로딩 중에도 위협 입력은 동작하며, 별도 QA에서 파일 실패와 지연을 의도적으로 주입한다.

실제 서비스 이관 전에는 행성별 고유 아트, 지형과 시설 앵커의 정합, 실기 GPU/메모리·배터리, 사용자 비주얼 선호 검토가 필요하다.
