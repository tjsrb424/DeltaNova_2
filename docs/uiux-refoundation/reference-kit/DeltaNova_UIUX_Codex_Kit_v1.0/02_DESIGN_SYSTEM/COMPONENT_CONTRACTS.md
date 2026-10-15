# 공통 컴포넌트 계약서

목표: 모든 화면에서 같은 용도에 같은 모양/동작/타이밍을 재사용한다. 우선 컴포넌트 인벤토리를 파악한 후 누락된 것만 추가한다.

## 최소 컴포넌트 세트

| 이름 | 주요 props/state | 필수 역할 | 흔한 오류 |
|---|---|---|---|
| `AppShell` | route, planet, alerts | 전역 내비·현재 행성·상태 | 페이지별 사이드바 중복 |
| `PlanetSelector` | items, selected, onChange | 대상 행성 전환 명확화 | 액션 전 대상 오인 |
| `ResourceStrip` | value, rate?, capacity?, status | 자원 요약, 상세 진입 | 자원 총량과 생산량 혼동 |
| `StatusPill` | status, icon?, label | 정상/경고/위험 의미 전달 | 색만으로 상태 표시 |
| `PrimaryAction` | action, enabled, loading | 핵심 행동 강조 | 보조 버튼과 동일한 강조 |
| `ContextPanel` | title, priority, content | 화면별 한 가지 주요 작업 | 여러 독립 패널 중첩 |
| `ProgressSummary` | type, progress?, eta? | 건설/연구 진행상황 | 서버 미확인 시간을 수치로 표현 |
| `ThreatBanner` | target, type, ETA?, state | 적 위협 인지/대응 진입 | 단순 토스트로 위험 묻기 |
| `EvasionReview` | fleet, destination, timing, cost? | 실제 명령 전 검토 | 리뷰 없이 발진, 자동 회피 |
| `EventFeed` | events, unread | 중요 이벤트 요약 | 낮은 우선순위의 끊임없는 팝업 |
| `PlanetVisual` | planetId, growthStage?, threatState? | 성장/현재 상태 표현 | 성장 수치 임의 정의 |
| `DetailDrawer` | open, onClose, source | 점진적 정보 노출 | 포커스 트랩 및 복귀 누락 |
| `Toast` | severity, message, duration | 완료/실패 피드백 | 성공처럼 보여주는 대기 상태 |
| `EmptyState` | title, reason, nextAction | 데이터 없음 처리 | 기능 비활성인지 알 수 없음 |
| `RankingsTabs` | rankingType, season | 향후 복수 랭킹 구조 | 모든 랭킹을 한 점수로 혼합 |

## 상태별 공통 계약

각 컴포넌트는 `default / hover / focus-visible / pressed / loading / success / error / disabled` 가운데 적용 가능한 상태를 명시한다. **로딩 = 성공이 아님.** 진행 중 명령 취소 가능 여부는 서버 계약에 따른다.

## 함대 등 고위험 명령

1. 버튼의 레이블은 명령이 아니라 **검토 단계**인지 분명히 표현.
2. 서버 데이터에 기반한 이동 시간, 대기, 목적지, 사용 함대, 비용 등 필수 요소를 확인할 수 있게 함.
3. `확인` 후 서버 ack 전에 성공 토스트를 띄우지 않는다.
4. 중복 요청을 막고, 실패/타임아웃에서 재시도 경로를 명확히 함.
5. 확인 과정에서 경보 시간이 변할 수 있으므로 갱신/만료 상태를 처리.
6. 자원이 부족하거나 함대가 이동 중인 경우 실행 불가 사유를 노출.

## 적용 수준

- Phase 1: AppShell, StatusPill, ResourceStrip, ContextPanel, ThreatBanner, ActionButton.
- Phase 2: PlanetVisual, PlanetSelector, ProgressSummary, DetailDrawer.
- Phase 3: EvasionReview, EventFeed, EmptyState, RankingsTabs 등 화면별 정교화.

## 구현 메모

- 기존 컴포넌트가 있으면 래핑/토큰 리팩터링을 우선 검토한다.
- 명확한 공통 인터페이스가 있으면 라이브러리 없이도 구현 가능하다.
- 접근성, 데이터를 받는 역할, 테스트 필요성이 신규 의존성 도입보다 우선이다.
