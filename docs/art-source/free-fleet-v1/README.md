# 함대 아트 원본 · 2026-10-16

직접 요청한 독립 데모의 아트 보완에 사용했다. 이미지 생성 스킬과 내장 imagegen으로 새로 생성한 이미지이며, 외부 게임의 이미지를 가져오지 않았다.

| 원본 | 내용 | 크기 | 실행 파일 |
|---|---|---|---|
| fleet-roster-v1.png | 4열×2행 투명 함선 아틀라스 | 1774×887 RGBA | public/uiux-demo/art/fleet-roster-v1.webp |
| orbital-hangar-v1.png | 궤도 격납고 파노라마 | 2172×724 RGB | public/uiux-demo/art/orbital-hangar-v1.webp |

아틀라스 순서: 상단 타격/호위/공성/수리, 하단 회수/정찰/교란/항모. 각 셀을 CSS background-position으로 선택한다. 이름·역할·수량은 별도의 HTML 텍스트다. 함선별 게임 데이터/스탯을 이미지 생성 결과에서 가져오지 않는다.

정확한 생성 프롬프트: [prompts.json](./prompts.json). 파일별 크기와 SHA-256: [manifest.json](./manifest.json).

원본은 보존하고, 기존 환경의 sharp로 실행 이미지 크기와 인코딩만 최적화했다. 함선은 1280×640(셀320px), 격납고는 1920×640, WebP quality86/alphaQuality100이다. 생성 후 수작업으로 함체를 그리거나 다른 이미지로 바꾸지 않았다. 실행 파일 합계 392,300bytes(약383KiB). 첫 인코딩630,282bytes에서 약38% 줄였다. 런타임 의존성은 추가하지 않았다.

원래 도구 출력: exec-38e94f53-45b9-4021-a862-5255b33f4d69.png, exec-4749aa03-e881-4134-8da1-1344c60269a3.png. 이 폴더의 PNG가 다른 PC에서도 쓸 수 있는 보존본이다. 전역 생성 이미지 폴더에 의존하지 않는다.
