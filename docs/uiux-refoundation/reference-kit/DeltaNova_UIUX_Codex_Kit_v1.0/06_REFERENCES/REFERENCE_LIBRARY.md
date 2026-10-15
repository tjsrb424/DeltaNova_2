# 외부 레퍼런스 & 적용 경계

다음 문서는 2026-10-15 기준으로 공식 사이트를 확인한 **외부 참고 URL**이다. 라이브러리 채택은 코드베이스 파악 후 결정한다.

## 디자인 기초/가이드

- Vercel Geist Design System — https://vercel.com/geist/introduction  
  적용: 컴포넌트 패턴, 타이포그래피, 높은 대비와 그리드 규칙. **Vercel 브랜드를 복제하지 않음**.
- shadcn/ui theme guide — https://ui.shadcn.com/docs/theming  
  적용: 시맨틱 CSS 변수와 배경/전경 쌍. 현재 React + Tailwind인 경우 검토.
- W3C WCAG 2.2 — https://www.w3.org/TR/WCAG22/  
  적용: 텍스트 대비, 비텍스트 대비, 터치 타깃, 키보드 탐색, 모션 감소.

## 모션/인터랙션

- Motion for React — https://motion.dev/docs/react  
  적용: 상태 변화, 화면 전환, 제스처, 레이아웃 애니메이션.
- Motion layout animations — https://motion.dev/docs/react-layout-animations  
  적용: 탭 밑줄/패널 레이아웃 변화 시 연속성.
- Motion reduced motion — https://www.motion.dev/docs/react-motion-config  
  적용: 사용자의 모션 선호 설정 존중.
- Rive Docs — https://rive.app/docs  
  적용: 상태 머신이 필요한 확정 아트 시퀀스에 한정; 초기 필수 의존성 아님.

## Codex 전달 방식

- Codex AGENTS.md — https://github.com/openai/codex/blob/main/docs/agents_md.md  
  적용: 저장소별 지속 지침. 기존 AGENTS.md를 덮어쓰기 전에 내용 확인.

## 스타일 참고 대상과 금지 경계

- Linear: 여백, 내비게이션, 가독성, 정돈된 데이터 UX만 참고.
- Destiny 2: SF 공간감, 중앙 비주얼의 존재감, 위험 상황 연출만 참고.
- Stellaris / OGame: 전략적 정보 구조, 장기 운영의 복잡도만 참고.
- '레퍼런스 화면 통째 복사', '고유 에셋 무단 사용', '서비스 UI 상표/디자인 혼동' 금지.

## 도구 선정 가이드

- React 기반으로 확인되면 shadcn/ui + Motion 검토.
- non-React 기반이라면 현재 구조/컴포넌트 시스템에서 대응.
- 고급 3D 렌더러 도입은 2D/CSS/정적 자산과 A/B 성능 검증 후 판단.
- Storybook 등 컴포넌트 사례집은 existing tooling이 있다면 활용, 프로젝트에 불필요한 설치는 보류.
