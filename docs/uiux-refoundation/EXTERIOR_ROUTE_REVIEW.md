# 행성 외곽 항로·자전 후속 검수

후속 변경: [구름·도착·정찰 위성 검수](./ATMOSPHERE_ORBIT_REVIEW.md)에서 독립 구름층·도착 효과·위성 궤도를 구현했다. 아래는 외곽 항로 작업 시점의 기록이다.

2026-10-15 · `codex/uiux-refoundation` · `91cf86e` 이후 로컬 변경. 게임 서버 연결 없이 독립 데모만 수정했다. 이전 [모션 검수](./UX_MOTION_REVIEW.md)의 대칭 반구·고정 항로 시간 한계를 이번 변경으로 대체한다.

## 직접 화면 평가

- **디자인:** 중앙 행성, 얇은 궤도, 청록 강조와 붉은 위협의 시각 언어가 일관된다. 구면 전체 지형과 고정 광원을 사용해 기존 정면 그림의 늘어짐·대칭 반복을 줄였다. 장식 점이 함대처럼 보이지 않도록 궤도의 무의미한 점은 숨겼다.
- **사용성:** 자원 → 현재 행성 → 시설·함대 → 대응 행동의 순서가 명확하다. 접근 시에는 경고와 회피 검토가 우선 노출된다. 상세에서도 같은 남은 시간을 보여 주며, 실제 명령은 실행할 수 없다.
- **발견 후 수정:** 모바일 출항 시간과 조선소 표식이 겹쳤다. 표식 간격을 조정하고 이동하는 시간 문구가 시설 버튼을 피하게 했다. 좁은 데스크톱에서 생산량이 어색하게 줄바꿈되는 간격도 줄였다.
- **작은 화면:** 320px와 짧은 가로 화면에서는 행성까지 스크롤해야 한다. 핵심 대응 버튼과 하단 이동 메뉴를 우선 노출하는 구성을 유지했다. 실제 사용자 과제 성공률을 측정한 결과는 아니다.

## 항로와 위치

- 출항 시작점과 접근 종점은 실제 Canvas 외곽에서 12~22 CSS px 떨어진 대기권 밖 대기점이다. 점선은 화면 바깥까지 이어지며, 곡선 전체가 행성 표면을 통과하지 않는다.
- 속이 빈 작은 원은 대기점, 빛나는 채워진 점은 **현재 시연 위치**다. 꼬리는 현재 점 뒤에만 붙는다. 반복하는 장식 네온을 없앴다.
- 위치와 모든 남은 시간은 하나의 로컬 시연 시계로 계산한다. 접근은 이미 일부 진행한 위치에서 2분 40초, 출항은 대기점에서 4분 20초로 시작한다. 이 수치는 실제 거리·속도·항로 ETA를 계산한 값이 아니다.
- 도달하면 위치는 종점에 멈춘다. 다시 처음으로 돌아가지 않으며 공격·회피·재고 변경을 실행하지 않는다. 접근 종점은 지상이 아닌 외곽 대기점이다.
- 상세 열기, 수동 정지, 모션 감소, 숨긴 탭에서는 위치와 시연 시간을 함께 멈춘다. 연속 자전은 화면 밖에서도 정지한다. 타이머를 live region으로 반복 읽지 않고, 위협 발생만 한 번 알린다.
- 행성을 바꿔도 접근 대상은 노바 프라임에 남는다. 출항도 원래 선택한 행성에서만 보인다.

## 자전과 새 아트

4분 주기로 전체 경도 지형을 회전시킨다. 태양광과 대기 가장자리는 고정하며, 시설 수준에 따른 약한 야간 불빛은 지형과 함께 움직인다. WebGL 미지원 시 기존 자연 아트 정지 화면, 이미지 오류 시 절차 지형으로 대체한다.

**제작 방식:** 내장 `image_gen` 사용. CLI/API 키 경로는 사용하지 않았다. 기존 아트는 보존했다. 아래 원본을 복사 보존하고 WebP로 인코딩했다. 추가 패키지는 설치하지 않았다.

- 생성 원본: [nova-equirectangular-v1.png](./art-source/nova-equirectangular-v1.png)
- 데모 사용 파일: [nova-albedo-v1.webp](../../public/uiux-demo/art/nova-albedo-v1.webp), 1774×887 / 437,850 bytes
- GPU 업로드 시 1024×512로 표본화해 경도 반복과 mipmap을 적용한다.

최종 생성 프롬프트:

> Generate a single production game texture, NOT a rendered planet picture. Use case: stylized-concept / natural planetary albedo texture for a 3D globe. A full, edge-to-edge rectangular EQUIRECTANGULAR (longitude-latitude, UV) surface map of an original temperate Earth-like alien planet. Landscape 2:1 aspect ratio, ideally 2048 x 1024. Entire image is the flat unwrapped global map, with the north pole along the top full edge and south pole along the bottom full edge, equator across center, and the left and right edges seamlessly tile at the same meridian. NO sphere, NO circular outline, NO black space, NO border, NO sunlight, NO shadows, NO terminator, NO specular glints, NO labels or text, NO graphic interface. Neutral even illumination across the complete map: all night/day shading will be added dynamically in the shader. Natural realistic detailed deep blue and muted turquoise oceans, irregular green continents and copper-brown dry plateaus with mountain ridges and branching coastlines, some small islands and polar white ice. Thin broken wisps of white cloud cover distributed over the flat UV map, restrained enough to see the land. Premium realistic space-strategy visual style; original geography, not the real Earth map. The texture must remain convincing when wrapped on a sphere and rotated continuously through 360 degrees.

## 검증 근거

| 검사 | 결과 |
|---|---|
| 전체 Vitest | 22파일 / **204개 통과** |
| 독립 모델 | 6개 통과 |
| TypeScript·Vite·정적 HTTP 빌드 검사 | 통과 |
| `node tools/verify-uiux-polish.mjs` | **13개 통합 검사 / 15개 화면·상태 조합 통과** |
| 항로 전체 경로 표본 | 320·390·839·844·1440·1920·2560px의 7개 화면 크기에서 대기권 침범·세로 잘림 없음, 점과 경로 일치 |
| 시간·위치 | 경과에 따라 함께 진행, 배너·요약·상세 ETA 일치, 상세 열림 시 함께 정지 |
| 200% 글자 | 320×568·390×844·844×390 reflow·메뉴·상세 대비·복귀 검사 통과 |
| 브라우저 관측 | 주 검사 context의 API/non-GET/Storage 접근 0, pageerror 0 |
| 서버 상태 | 게임 API 4318 리스너 0, 실제 `.delta-nova/guild.sqlite` 없음 |
| 직접 검수 | Codex 브라우저에서 1440×900·839×1065·390×844·320×568·844×390의 항로·시간·자전·스크롤·상세 복귀를 조작하고 확인 |
| 독립 코드 리뷰 | 넓은 화면의 곡선 제어점이 위로 벗어나는 결함 발견 → 2개 실패 테스트로 재현 → 높이 제한 후 단위·7개 브라우저 크기 재검증 |

[검사 결과 JSON](../qa/2026-10-15-exterior-routes/results.json) · [PC](../qa/2026-10-15-exterior-routes/desktop-routes.jpg) · [모바일](../qa/2026-10-15-exterior-routes/mobile-routes.jpg) · [320px](../qa/2026-10-15-exterior-routes/small-routes.jpg) · [가로](../qa/2026-10-15-exterior-routes/landscape-routes.jpg) · [위협 상세](../qa/2026-10-15-exterior-routes/threat-detail.jpg)

자동 검사는 빌드된 정적 파일만 임시 loopback HTTP로 제공한다. 게임 API를 시작하지 않는다. 기존 게임 테스트의 임시 SQLite fixture는 별도이며 실제 기지 DB 연결이 아니다.

## 남은 폴리싱과 범위

구름은 현재 지형과 함께 회전한다. 구름의 독립 이동, 출항 직후의 가속 감각, 외곽 도달 후의 별도 이벤트 연출은 다음 시각 폴리싱 후보이다. 실제 사건·좌표·속도·목적지 연결은 이번 범위가 아니다. 베스퍼는 같은 지형의 색조 변형이다.

실제 iOS/Android, 음성 스크린리더, 장시간 GPU/배터리 성능은 검증하지 않았다. 운영 `src/`, API/DB, 경제·전투·이동 산식, 의존성은 변경하지 않았다. 커밋·푸시·운영 UI 이관은 수행하지 않았다.

데모: `http://127.0.0.1:5180/uiux-demo/index.html`. **시연 설정 → 적 접근 / 함대 출항**으로 확인한다. **화면 설정 → 자전 · 항로 시연 일시정지**로 정지한다. 다시 시작하려면 **초기화** 후 시연을 선택한다.
