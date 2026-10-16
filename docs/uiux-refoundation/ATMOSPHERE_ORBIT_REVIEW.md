# 구름·도착·정찰 위성 데모 검수

2026-10-15 · `codex/uiux-refoundation` · `91cf86e` 이후 로컬 변경. [외곽 항로 검수](./EXTERIOR_ROUTE_REVIEW.md)의 후속 작업이다. 게임 서버 연결 없이 정적 데모만 변경했다.

## 반영한 연출

- **구름:** 구름이 그려져 있던 지형 대신 구름 없는 지형 버전과 별도 구름 마스크를 사용한다. 지형은 240초, 구름은 270초 주기로 같은 방향으로 움직여 상대 위치가 천천히 달라진다. 두 층 모두 고정 광원으로 음영을 받는다. GPU에 전달하는 각도는 한 회전 범위로 제한해 긴 세션의 낮은 정밀도 문제를 줄였다.
- **도착:** 접근 함대가 대기권 밖 대기점에 닿으면 작은 빛과 얇은 파동이 약 2.2초 동안 한 번 퍼진다. 이후 꼬리가 사라지고 점은 그 위치에 남는다. 배너·행성 상태·요약은 ‘외곽 대기’로 바뀐다. 전투·피해·회피 성공은 생성하지 않는다.
- **빠른 검토:** **시연 설정 → 노바 외곽 도착 · 5초 시연**으로 같은 도착 효과를 재현할 수 있다. 기존 2분 40초 접근 시연도 유지한다.
- **정찰 위성:** 고정된 조선소와 구분되는 작은 S-01 위성이 약 96초 주기로 기울어진 타원 궤도를 돈다. 행성 앞에서는 보이고, 뒤에서 행성에 가려지는 구간은 숨긴다. 실제 궤도 역학을 계산한 수치는 아니다.
- **정찰 진입:** 움직이는 위성을 터치 대상으로 만들지 않고, 고정된 ‘정찰 정보 · 예시’ 버튼으로 상세를 연다. 노바 프라임의 로컬 위성 fixture이며 베스퍼에서는 숨긴다. 실제 정보 수신·스파이 결과는 없고 정찰 명령은 비활성이다.

## 사용성과 직접 화면 검수

PC 1440×900와 모바일 390×844에서 실제 브라우저로 구름·위성·항로를 보고, 5초 시연을 시작해 도착 순간을 캡처했다. 파동은 경고·대응 버튼의 우선순위를 해치지 않는 작은 외곽 효과로 유지했다. 구름은 대륙을 읽을 수 있을 만큼 얇게 합성했다. 모바일 정찰 상세의 문구·비활성 명령·닫기·호출 버튼으로의 포커스 복귀도 직접 확인했다.

모션 감소·수동 정지·숨긴 탭·열린 상세에서는 구름·자전과 위성·항로의 시연 시간이 함께 정지한다. 화면 밖 행성은 GPU 렌더링을 중지하고, 항로·위성의 SVG 위치도 갱신하지 않는다. 화면 밖에서 필요한 전역 ETA 문구만 초당 한 번 갱신한다. 도착 효과는 화면 복귀나 상세 열기로 다시 시작되지 않는다.

## 검증

| 검사 | 결과 |
|---|---|
| 전체 Vitest | 23파일 / **209개 통과** |
| 독립 모델 검사 | 6개 통과 |
| TypeScript·Vite 빌드 / 정적 HTTP 제공 | 통과 |
| 브라우저 통합 검사 | **19개 통과**, 기존 15개 화면·상태 조합 포함 |
| 새 모션 검사 | 서로 다른 구름/지형 진행, 위성 한 바퀴·앞/뒤 가림, 도착 1회 재생·종점 유지·복귀 시 재생 방지, 진행 중/파동 중 모션 감소 정지 |
| 실패 대체 화면 | WebGL 미지원·텍스처 업로드 오류 시 자연 정지 이미지, 전체 이미지 오류 시 절차 지형, 구름 마스크만 누락 시 지형 자전 유지 |
| 기존 회귀 | 외곽 항로 7개 화면 크기, 시설 비교·Back·포커스, 3개 크기 글자 200%, 기존 자전 정지 검사 통과 |
| 서버 및 부작용 | 게임 API 4318 리스너 0, 실제 `guild.sqlite` 없음, 관측한 검사 context의 API/non-GET/Storage 접근·pageerror 0 |

독립 리뷰의 두 결함은 실패 검사로 재현 후 수정했다. 화면 밖 항로 점이 계속 움직이던 문제는 SVG 쓰기를 멈추고 전역 ETA만 1Hz로 갱신해 해결했다. WebGL 업로드 오류가 예외를 던지지 않고 오류 상태만 설정하는 경우에는 `getError`와 할당 성공 여부를 검사해 정지 이미지로 전환한다. 실패한 Canvas에서 상태 전환마다 GPU 초기화를 반복하지 않는다.

[브라우저 결과](../qa/2026-10-15-atmosphere-orbit/results.json) · [PC 도착 순간](../qa/2026-10-15-atmosphere-orbit/desktop-arrival.jpg) · [모바일 도착 순간](../qa/2026-10-15-atmosphere-orbit/mobile-arrival.jpg) · [모바일 정찰 상세](../qa/2026-10-15-atmosphere-orbit/mobile-recon-detail.jpg)

브라우저 시간 검사는 Playwright의 제어 시계로 전체 궤도와 도착 시간을 진행한다. 실제 GPU 메모리 부족 대신 실제 GL 오류 상태를 주입해 대체 경로를 확인했다. 실기 iOS/Android의 장시간 GPU·배터리와 실제 음성 스크린리더 검증은 포함하지 않는다.

## 아트·생성 기록

**내장 `image_gen` 도구**로 두 이미지를 제작했다. CLI/API 키 경로를 사용하지 않았다. 기존 이미지는 보존하고 새 버전으로 저장했다. 원본 PNG를 프로젝트에 복사하고 기존 번들 Sharp로 WebP 인코딩만 수행했다. 추가 의존성은 없다.

| 용도 | 저장 파일 | 크기 |
|---|---|---|
| 구름 없는 지형 | [nova-albedo-v2.webp](../../public/uiux-demo/art/nova-albedo-v2.webp) | 1774×887 / 248,906 bytes |
| 독립 구름 마스크 | [nova-clouds-v1.webp](../../public/uiux-demo/art/nova-clouds-v1.webp) | 1774×887 / 221,460 bytes |
| 편집 결과 원본 | [nova-cloudless-v2.png](./art-source/nova-cloudless-v2.png) | 원본 보존 |
| 구름 마스크 원본 | [nova-clouds-v1.png](./art-source/nova-clouds-v1.png) | 원본 보존 |

GPU에는 각각 1024×512로 업로드해 경도 반복과 mipmap을 적용한다. 구름은 마스크의 밝기로 합성하므로 별도 검은 배경이 화면에 나오지 않는다. WebGL 정지 대체 화면은 이전 자연 아트를 사용한다.

구름 없는 지형의 최종 프롬프트. 편집 대상은 보존된 `nova-equirectangular-v1.png` 한 장이다:

> Edit target: the attached flat 2:1 equirectangular alien planet texture. Produce the same complete longitude-latitude UV albedo map with ALL atmospheric clouds and white cloud wisps removed from the oceans and land. Fill cloud-covered areas with coherent underlying ocean or land terrain. Preserve the original geography, coastline shapes and positions, islands, green/copper terrain palette, mountain ridges, deep blue/turquoise seas, and permanent north/south polar ground ice. Keep the map edge-to-edge and horizontally seamless at the original meridian. Preserve the flat rectangular equirectangular projection and original 2:1 aspect ratio. This is ground surface only: zero atmospheric clouds or haze anywhere. Neutral even illumination, no sunlight or shadows, no sphere, no circular outline, no space, no UI, no labels. This cloud-free albedo will have a separate animated cloud layer added in a shader. Make only this removal-and-fill change, maintaining the detailed premium realistic space-strategy surface style.

구름 마스크의 최종 프롬프트:

> Create a production game texture: a flat 2:1 equirectangular longitude-latitude CLOUD OPACITY MAP only. Edge-to-edge rectangular global atmospheric cloud pattern that wraps seamlessly horizontally around a sphere. Pure black background (zero cloud coverage), white and light gray semi-transparent-looking cloud masses; grayscale only. Delicate realistic satellite-view meteorological structures, thin feathered wisps, broken cotton cloud fields, elongated curling weather fronts, a few small restrained spiral systems, subtle wind-sheared bands, plenty of completely black open spaces. Approximately 30 percent coverage, airy and sparse so terrain will remain readable underneath. North/south pole edges must be naturally sparse and projection-compatible; left and right edges seamlessly tile. Flat unwrapped full globe UV map, NOT a globe or planet picture. Absolutely NO land, continents, ocean, stars, space imagery, shadow, directional illumination, border, labels, text or interface. This image will be sampled as a monochrome opacity mask in a shader on top of a separate rotating planet surface, with independent slow cloud rotation. Natural premium realistic space-strategy art, understated detail, not thick fog or milky haze. Landscape 2:1 aspect ratio.

운영 `src/`, 서버 API/DB, 실제 이동·정찰·경제·전투 규칙과 의존성은 변경하지 않았다. 커밋·푸시·운영 UI 이관은 수행하지 않았다.
