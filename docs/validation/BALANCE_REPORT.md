# 편성 열거 검증

규칙 command-center-v1. 초기 모듈 없음, 보유 함선 9척의 모든 부분집합에서 지휘 12·최대 6척 조건과 경로 조건을 만족하는 지원/경로 조합을 열거했다. 난수 없음. 승률은 인간 플레이 예측이 아니라 이 열거 집합의 비율이다.

전체 7,350개 출격 조건. 기본 교전 후 귀환과 추가 진입을 각각 비교했다. 모든 결과에서 화물 보존을 검사했다.

| 임무 | 조합 | 기본 승리 | 최대 귀환/추가 | 추가 진입 이익/손해/동일 |
|---|---:|---:|---:|---:|
| 고요한 잔해지대 | 2450 | 2230 | 6 / 13 | 1118 / 922 / 410 |
| 봉쇄된 중계 거점 | 2450 | 1172 | 7 / 13 | 101 / 990 / 1359 |
| 새벽 수송선단 | 2450 | 1222 | 8 / 14 | 267 / 714 / 1469 |

## 지원별 결과

| 임무 | 지원 | 기본 승리 / 출격 | 추가 진입 후 평균 귀환 화물 |
|---|---|---:|---:|
| salvage | 독립 작전 | 509 / 562 | 5.21 |
| salvage | 정찰 지원 | 700 / 764 | 5.28 |
| salvage | 교란 지원 | 512 / 562 | 6.35 |
| salvage | 보급 지원 | 509 / 562 | 5.47 |
| relay | 독립 작전 | 263 / 562 | 1.08 |
| relay | 정찰 지원 | 372 / 764 | 1.05 |
| relay | 교란 지원 | 274 / 562 | 1.51 |
| relay | 보급 지원 | 263 / 562 | 1.21 |
| convoy | 독립 작전 | 271 / 562 | 2.76 |
| convoy | 정찰 지원 | 404 / 764 | 2.92 |
| convoy | 교란 지원 | 276 / 562 | 3.20 |
| convoy | 보급 지원 | 271 / 562 | 2.88 |

## 목표별 상위 사례

동점 중 첫 3개만 표시. 최적 해의 유일성이나 실제 재미를 주장하지 않는다.

### 고요한 잔해지대

- striker-01+striker-02+guardian-01+siege-01+salvage-01 / none / direct: 귀환 6, 추가 13, 손실 0
- striker-01+striker-02+guardian-01+siege-01+salvage-01 / recon / direct: 귀환 6, 추가 13, 손실 0
- striker-01+striker-02+guardian-01+siege-01+salvage-01 / jam / direct: 귀환 6, 추가 13, 손실 0

### 봉쇄된 중계 거점

- striker-01+striker-02+guardian-01+siege-01+salvage-01+scout-01 / jam / direct: 귀환 7, 추가 13, 손실 2
- striker-01+guardian-01+siege-01+support-01+salvage-01+scout-01 / jam / direct: 귀환 7, 추가 13, 손실 2
- striker-02+guardian-01+siege-01+support-01+salvage-01+scout-01 / jam / direct: 귀환 7, 추가 13, 손실 2

### 새벽 수송선단

- striker-01+striker-02+guardian-01+siege-01+salvage-01 / jam / direct: 귀환 8, 추가 14, 손실 0
- striker-01+striker-02+guardian-01+siege-01+salvage-01 / supply / direct: 귀환 8, 추가 14, 손실 0
- striker-01+striker-02+guardian-01+siege-01+salvage-01+scout-01 / jam / direct: 귀환 8, 추가 14, 손실 0

## 해석의 한계

- 지원 없음은 기준선이다. 지원 비용과 실제 길드원의 제한은 아직 없어서 지원 선택의 경제적 균형을 입증하지 않는다.
- 정찰 지원은 우회 가능한 집합을 늘리므로 지원별 전체 평균의 모집단이 다르다. 인과 비교에는 같은 편성·경로를 사용해야 한다.
- 피해/화물 보존과 진입 위험의 존재를 검증했다. 실제 협동 재미, 장기 경제, PvP 공정성, 인간의 가독성은 별도 플레이테스트가 필요하다.
- 생성 명령: `npm run simulate`. 전체 행: `balance.csv`.
