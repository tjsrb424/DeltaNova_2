# Planet Base Economy and Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 행성의 생산 자원으로 시설·연구·방어·실제 함선을 성장시키고 v0.5 대시보드에서 기존 개인/공동 작전까지 이어서 조작한다.

**Architecture:** 같은 SQLite에 v3 행성 자산 정본과 개인 제국 명령 영수증을 저장한다. 순수 제국 규칙이 생산·완료 시각·비용·위치·재고를 판정하고 기존 전투는 명시적인 함대 문맥을 받아 재사용한다. React 대시보드는 현지 상태와 서버 명령만 표시하며 그림·라벨·입력은 분리한다.

**Tech Stack:** 기존 React 19.3.0 / TypeScript 7.0.2 / Vite 8.3.4 / Vitest 5.0.4 / Node SQLite. 의존성 추가나 lockfile 갱신은 없다.

**Spec:** [2026-10-14-planet-base-dashboard-design.md](../specs/2026-10-14-planet-base-dashboard-design.md)

**Status:** 사용자 승인으로 Native 구현·전체 헤드리스 검증 완료. 최종 전체 리뷰 진행 중.

## Global Constraints

- 이번 범위는 첫 번째 단계인 행성별 기지 운영·실제 조선·v0.5 대시보드다. 성계 비행·NPC 공격 접근·첫 식민지 개척·수송은 다음 단계다.
- 처음에는 본성 **노바 프라임 한 개**를 실제 소유한다. 다른 식민지나 이동 작업을 가짜로 표시하지 않는다.
- 새 서버 저장은 schemaVersion 3 / rulesVersion `planet-base-v3`로 구분한다. 자원·정비·재고의 정본을 `base`와 `empire`에 중복 저장하지 않는다.
- 기존 생산의 완전한 분 단위·최대8시간·저장 포화 폐기 정책을 유지한다.
- 초기 최대 시설 레벨은5다. 제국 연구 작업 한 개, 기술 초기 수준0, 이번 최대 수준3이다.
- 조선 시작 수량1..20. 완료 시 실제 함선을 한 번 지급한다. 신규 함종은 이번에 추가하지 않는다.
- 완료 전 취소는 시작 비용의 자원별 `floor(비용×0.8)`를 원 지불 행성에 반환한다. 저장 상한을 넘는 반환분은 버리지 않고 취소 명령을 거절한다.
- 브라우저 편성 연습은 기존 `ROSTER`, 무료 연구, 로컬 저장과6척/지휘12 규칙을 그대로 사용한다.
- 새 명령은 `{ commandId, expectedEmpireRevision, action }`을 사용한다. 공동 operationId는 개인 제국 명령의 선행 조건이 아니다.
- 검증은 헤드리스로만 수행한다. 새 창·브라우저·편집기·렌더러를 열지 않는다. 임시 DB를 사용한다.
- 이번 변경을 공유 브랜치에 push하거나 merge하는 작업은 실행 방식 선택과 별도다. 문서/코드/테스트의 지정 경로만 커밋한다.

## Review Focus

1. 조회에서 이미 완료로 보인 조선을 처리 결과 불명의 이전 영수증으로 덮어쓰는 경우: 원 명령을 확인한 후 최신 개인 snapshot을 조회해야 한다. Task 5의 `retry refreshes after an older receipt`로 검증한다.
2. 한 번의 긴 접속 공백에 여러 증설과 공통 연구 완료가 섞인 경우: 사건 시각별 생산을 계산하면서 각 자원의8시간 예산을 세그먼트마다 새로 지급하면 안 된다. Task 1의 `offline cap spans jobs and shared research`로 검증한다.
3. 다른 참가자가 공동 작전을 교체하거나 기여한 경우: 개인 명령은 자신의 empire revision만 검사하며, 본인 자산을 바꾼 공동 기여는 개인 revision도 증가한다. Task 4의 `personal commands ignore unrelated guild revisions`로 검증한다.
4. v2 영수증을 v3로 이전하는 동안 world는 정상이고 영수증 하나만 손상되거나 SQL UPDATE가 실패한 경우: 모두 롤백하고 원 요청을 보존한다. Task 3의 `receipt failure rolls back every migrated row`로 검증한다.
5. 다른 행성 화면을 선택한 상태에서 개인 작전이 귀환하거나 취소 환불을 받는 경우: 저장된 원점/비용 출처에만 정산한다. Task 2·6의 `return and refund retain their source planet`로 검증한다.

## File Structure and Shared Interfaces

- `src/empire/types.ts`: `ResourceId`, `Resources`, `FacilityId`, `TechnologyId`, `ShipInstance`, `TimedJob`, `PlanetState`, `EmpireState`, `EmpireAction`, `EmpireCommand`, `EmpireSnapshot`, `EmpireReply`, `WorldState`.
- `src/empire/content.ts`: 설계의 초기값·시설 비용/시간·8함종 건조 조건·4기술의 비용/효과. 수치를 UI/서버에서 다시 정의하지 않는다.
- `src/empire/economy.ts`: `capacities(planet: PlanetState): Resources`, `power(planet: PlanetState): { supplied: number; demanded: number }`, `productionRates(planet: PlanetState, technologies: EmpireState["technologies"]): Resources`, `facilitySpace(planet: PlanetState): { used: number; reserved: number; capacity: number }`.
- `src/empire/rules.ts`: `initialEmpire(pilotId: string, now: number): EmpireState`, `projectEmpire(previous: EmpireState, now: number): EmpireState`, `applyEmpireAction(previous: EmpireState, action: EmpireAction, now: number, jobId: string): EmpireState`.
- `src/empire/validation.ts`: `validateEmpire(value: unknown): EmpireState`, `parseEmpireCommand(value: unknown): EmpireCommand`. 구조와 내용 검증을 서버와 클라이언트의 같은 진입점으로 처리한다.
- `src/empire/career.ts`: `applyEmpireCareer(previous: EmpireState, action: EmpireAction, now: number): EmpireState`, `fleetContext(planet: PlanetState): FleetContext`.
- `src/game/types.ts`: `FleetContext = { roster: readonly { id: string; shipId: string }[] }`. 동적 문맥은 명시적으로 전달하고 기본값은 현재 ROSTER다.
- `src/empire/migration.ts`: `upgradeWorld(value: unknown, now: number): WorldState`, `upgradeGuildReceipt(value: unknown, now: number): GuildReply`. 기존 v1/v2 검증을 통과한 뒤 변환한다.
- `server/store.ts`: 현재 `GuildStore` 클래스명을 유지하고 `worldSnapshot(): WorldState`, `snapshot(): GuildState`, `empireSnapshot(pilotId: string, now: number): EmpireSnapshot`, `executeEmpire(pilotId: string, input: EmpireCommand, now: number): EmpireReply`를 추가한다.
- `src/empire/api.ts` / `useEmpire.ts`: 세션·snapshot·미확정 명령·재전송을 처리한다. `EmpireApi.read(session, signal?)`, `connect(pilotId, signal?)`, `command(session, command, signal?)`.
- `src/components/PlanetDashboard.tsx`와 자식 컴포넌트: 표시와 입력을 담당한다. 경제 계산은 위 규칙/콘텐츠의 읽기 함수를 사용하고 상태 변경은 API를 사용한다.

`WorldState`는 영속 정본이며 `GuildState`는 호환을 유지하는 계산된 v2 공동 API view다. 영속 정본만 참가자의 `empire`를 사용하며 view의 `base`는 읽기 어댑터다. 기존 v1/v2 타입/검증은 이전 전용으로 유지하고, 정본에 기존 `base`를 두지 않는다. 기존 base 화면이 필요로 하는 읽기 값은 `src/empire/legacy-base.ts`에서 만들며 쓰기 명령은 실제 empire로 변환한다.

## Task 1: 행성 경제·작업 완료·공통 연구

**Files:** Create `src/empire/types.ts`, `content.ts`, `economy.ts`, `rules.ts`, `validation.ts`; Test `tests/empire.test.ts`.

**Interfaces:** 위 공유 인터페이스의 `initialEmpire`, `projectEmpire`, `applyEmpireAction`, 자원/전력/공간 함수와 검증 함수를 만든다. `EmpireState`에는 `revision`, `homePlanetId`, `planets`, `technologies`, `researchJob`, `career`, `careerOriginPlanetId`, `careerFleetContext`, 최근 최대50개 실제 작업 사건을 둔다. 자원별 생산 시작 시각/보정량을 두어 이전된 합금/연료와 새 결정의 생산 시작 시각을 구별한다.

- [x] Step 1: `tests/empire.test.ts`에 초기120/80/80·9척·본성1개, 건조 비용/예정량/완료 지급, 독립 건설/조선/공통 연구, 현지 비용 경계, 잘못된 수량/타 행성/최대 레벨 거절을 작성한다.

  첫 건조 핵심 assertion: 케스트럴1척은 합금40·결정20·연료10을 지불한다. 시작 직후 재고9척,39999ms에는9척,40000ms에는10척, 같은 시각 반복 투영도10척이며 이전 상태는 변하지 않는다.

  ```ts
  const initial = initialEmpire("nova", 0);
  const planetId = initial.homePlanetId;
  const started = applyEmpireAction(initial, {
    type: "build-ships", planetId, shipId: "striker", quantity: 1,
  }, 0, "nova-build-1");
  expect(started.planets[0].resources).toEqual({ alloy: 80, crystal: 60, fuel: 70 });
  expect(projectEmpire(started, 39999).planets[0].ships).toHaveLength(9);
  const done = projectEmpire(started, 40000);
  expect(done.planets[0].ships).toHaveLength(10);
  expect(projectEmpire(done, 40000).planets[0].ships).toHaveLength(10);
  expect(initial.planets[0].ships).toHaveLength(9);
  ```

- [x] Step 2: `npm test -- tests/empire.test.ts` 실행. Expected: 새 규칙이 없어 해당 행동이 실패한다. 누락 import를 해결하려고 먼저 경제 구현을 쓰지 말고, 테스트 단계에서 타입/명시적인 미구현 경계를 최소한으로 정의한다.
- [x] Step 3: `initialEmpire`, 비용/시간/필요 기술 콘텐츠, 전력/공간/저장 함수와 행동 검증을 구현한다. 비용은 설계 표 그대로이고 command payload의 임의 비용·시각·지급량은 거절한다.
- [x] Step 4: `projectEmpire`를 사건 시각/작업 ID 순으로 구현한다. 생성 함선 ID는 namespace+jobId+인덱스로 결정한다. 완료된 작업을 제거하고 사건을 남겨 다시 조회해도 재지급하지 않는다. 모든 세그먼트를 아우르는 자원별8시간 예산을 유지하고 분 단위 보정량으로 중간 생산률 변화를 처리한다.
- [x] Step 5: 같은 테스트 파일에 완료1ms 전/정각 취소,80% 반환, 환불 상한 거절, 공간 예약 해제, 전력 부족·산업 공통 효과·역행 시계·포화 생산 폐기·`offline cap spans jobs and shared research`를 먼저 실패시키고 구현한다. 긴 공백과 동일 시각 사건에서 분할 호출과 단일 호출의 총 재고가 같아야 한다.
- [x] Step 6: `npm test -- tests/empire.test.ts` 실행. Expected: 전부 PASS. `git diff --check` 통과 후 위 경로만 `feat: add planet economy and timed growth rules`로 커밋한다.

## Task 2: 동적 보유 함선과 서버 개인 작전

**Files:** Create `src/empire/career.ts`, `legacy-base.ts`; Modify `src/game/types.ts`, `fleet.ts`, `state.ts`, `src/storage/save.ts`; Test `tests/empire-career.test.ts`, 기존 `game.test.ts`, `storage.test.ts`.

**Interfaces:** `validateFleet(ids, support, approach, context?: FleetContext)`, `createFleet(ids, module, context?: FleetContext)`, `reduceGame(previous, action, context?: FleetContext)`, `decodeSave(raw, context?: FleetContext)`를 만든다. 기존 호출의 기본값은 고정ROSTER이며 브라우저 저장 계약을 바꾸지 않는다. 서버 저장 검증만 출격 당시 `careerFleetContext`를 명시한다.

- [x] Step 1: 실제 Task 1 규칙으로 케스트럴을 건조한 뒤 새 ID로 개인 임무를 출격·귀환하는 테스트, 도킹/손상/타 행성·타 참가자/중복 ID 거절, 모듈이 적용된 보고서 재생 검증을 작성한다.

  최소 함대 문맥 assertion은 아래와 같다. 뒤이어 실제 조선 결과의 ID를 같은 문맥에 넣어 원점/연료/귀환을 검사한다.
  ```ts
  const context = { roster: [{ id: "built-striker-1", shipId: "striker" }] };
  expect(validateFleet(["built-striker-1"], "none", "direct", context)).toEqual([]);
  expect(createFleet(["built-striker-1"], "none", context)[0].id).toBe("built-striker-1");
  expect(validateFleet(["built-striker-1"], "none", "direct")).not.toEqual([]);
  expect(validateFleet(["striker-01"], "none", "direct", context)).not.toEqual([]);
  ```
- [x] Step 2: `npm test -- tests/empire-career.test.ts tests/game.test.ts tests/storage.test.ts`. Expected: 기존 연습은 통과하지만 새 함선/원점 정산이 실패한다.
- [x] Step 3: 위 선택적 함대 문맥을 기존 전투·저장 재생에 전달한다. 서버 개인 출격 시 출발지와 함대 문맥을 저장하고 연료/정비를 검사한다. 즉시 패배나 귀환 결과는 원 행성에 한 번 정산한다. 원문 game action을 검증한 후 reducer에 넘긴다.
- [x] Step 4: `return and refund retain their source planet`의 귀환 부분, 건조 함선으로 모듈 해금/활성 변경 후 재출격, checkpoint에서 정비/중복 출격 거절, result에서 중복 화물 지급 금지, 동적 보고서의 HP/화물 변조 거절을 추가하고 RED→GREEN을 확인한다.
- [x] Step 5: 기존 구형 기지 명령의 home target 어댑터를 작성한다. `.base` 읽기 값을 영속 정본에 복사하지 않는다. 구형 수령/시설/정비/개인 행동을 같은 empire 자산에 적용한다. 완료돼 정산된 기존 result를 다시 보상하지 않는다.
- [x] Step 6: 위 세 테스트 파일 전부 PASS와 `npm run build`의 exit0을 확인하고 관련 경로만 `feat: use constructed ships in personal operations`로 커밋한다.

## Task 3: v3 저장 이전과 공동 작전 재고 연결

**Files:** Create `src/empire/migration.ts`, `src/guild/legacy-validation.ts`; Modify `src/guild/types.ts`, `validation.ts`, `migration.ts`, `rules.ts`, `src/base/validation.ts`; Test `tests/empire-migration.test.ts`, `tests/empire-guild.test.ts`, 기존 `base.test.ts`, `guild.test.ts`.

**Interfaces (구현 판단 반영):** `WorldPilot.empire`, schema3/rulesVersion `planet-base-v3`의 `WorldState`; `upgradeWorld(value, now)`, `upgradeGuildReceipt(value, now)`; `applyWorldGuildCommand(previous, actorId, command, now)`는 정본 자산을 다룬다. 기존 공동 API는 `worldGuildView`가 계산한 v2 view를 사용한다. `LegacyGuildStateV1`/`LegacyGuildStateV2`의 검증은 이전 전용 모듈로 보존한다.

- [x] Step 1: 정상 v1/v2와 진행 중 checkpoint/result, 시설3·정비·모듈·공헌·공동 완료·원 영수증을 포함하는 픽스처를 작성한다. 변환 전후 합금/연료/함선 ID/정비/성과/작전 원점의 보존과 새 결정80의 한 번 지급을 assert한다.

  픽스처를 이 테스트 파일에서 명시적으로 구성하고 아래 계약을 검사한다.
  ```ts
  const migrated = upgradeWorld(legacyV2, 1000);
  const home = migrated.pilots[0].empire.planets[0];
  expect(migrated.schemaVersion).toBe(3);
  expect(home.resources.alloy).toBe(legacyV2.pilots[0].base.resources.alloy);
  expect(home.resources.fuel).toBe(legacyV2.pilots[0].base.resources.supply);
  expect(home.resources.crystal).toBe(80);
  expect(upgradeWorld(migrated, 9000)).toEqual(migrated);
  ```
- [x] Step 2: `npm test -- tests/empire-migration.test.ts tests/empire-guild.test.ts`. Expected: 현재v2와 고정 재고 때문에 FAIL.
- [x] Step 3: `upgradeWorld`와 영수증 응답의 순수 변환을 구현한다. 새 결정 시각은 이전 시각, 기존 합금/연료의 시각/보정은 원자료를 따른다. 다른 schema/rulesVersion은 오류이며 현재v3를 다시 이전하지 않는다. 원 영수증 요청과 식별자를 보존한다.
- [x] Step 4: 공동 역할의 편성/특수함 조건/연료/정비/합금 보상을 actor의 실제 본성 재고에 적용한다. 신규 명령의 출발 행성은 명시하고 구형 명령은 본성이다. 본인 자산 변경 시 empire revision도 올린다. 예약/해제/다른 참가자의 행동은 해당 개인 자산을 바꾸지 않는다.
- [x] Step 5: 건조한 특수함/케스트럴로 공동 역할 수행, checkpoint 함선의 공동 출격 거절, 동일 함선을 다른 행성에서 사용 거절, 과거 보고서의 동적 함대 결정론 검증, 기존 네 역할 단독 완료/네 명 분담의 성과 보존을 테스트한다. 기존 API의 v2 view 행동과 새 v3 정본을 함께 검증한다.
- [x] Step 6: `npm test -- tests/empire-migration.test.ts tests/empire-guild.test.ts tests/base.test.ts tests/guild.test.ts tests/game.test.ts tests/storage.test.ts`. Expected: 전부 PASS. 지정 경로만 `feat: migrate shared careers to planet assets`로 커밋한다.

## Task 4: SQLite 장부·개인 명령·인증 API

**Files:** Modify `server/store.ts`, `http.ts`, `main.ts`, `src/guild/api.ts`; Create `server/empire-commands.ts`; Test `tests/empire-server.test.ts`, 기존 `base-server.test.ts`, `guild-server.test.ts`.

**Interfaces:** `GuildStore.worldSnapshot`, `snapshot`, `empireSnapshot`, `executeEmpire`. DB에 `empire_receipts(pilot_id, command_id, request, response, PRIMARY KEY(pilot_id, command_id))`를 추가한다. `executeEmpire`의 replay receipt는 원 개인revision이고 `empireSnapshot`의 현재revision과 구별한다.

- [x] Step 1: 임시 SQLite/루프백 HTTP 테스트로 인증 조회·명령 시작·완료 후 재시작·duplicate 비용/지급 단1회·같은ID 다른payload409·개인 stale revision409·타 참가자 조회/명령 거절을 작성한다.

  ```ts
  const store = new GuildStore(":memory:", { now: 0 });
  try {
    const snapshot = store.empireSnapshot("nova", 0);
    const command = { commandId: "build-1", expectedEmpireRevision: snapshot.state.revision,
      action: { type: "build-ships", planetId: snapshot.state.homePlanetId,
        shipId: "striker", quantity: 1 } } as const;
    store.executeEmpire("nova", command, 0);
    const before = store.worldSnapshot();
    expect(store.executeEmpire("nova", command, 40000).duplicate).toBe(true);
    expect(store.worldSnapshot()).toEqual(before);
    expect(store.empireSnapshot("nova", 40000).state.planets[0].ships).toHaveLength(10);
  } finally { store.close(); }
  ```
- [x] Step 2: `npm test -- tests/empire-server.test.ts tests/base-server.test.ts tests/guild-server.test.ts`. Expected: 제국 endpoint/명령이 없어 FAIL, 기존 동작은 유지한다.
- [x] Step 3: 초기v3 저장과 v1/v2 world/모든 영수증의 원자적 이전을 store 시작 트랜잭션에 넣는다. Task 3의 변환을 사용하고 직접 새 비용/재고 규칙을 복제하지 않는다. `snapshot()`은 기존 공동 API용 계산한 v2 view, `worldSnapshot()`은 확정 v3 정본, 개인 조회는 `projectEmpire`를 사용하는 읽기 투영이다.
- [x] Step 4: 인증 GET `/api/empire`, POST `/api/empire/commands`와 기존 `/api/dev/session` 재사용을 구현한다. GET에도 Bearer를 적용한다. 기존 host/origin/body 제한을 유지하고 클라이언트 입력 비용·완료 시각·pilotId injection을 거절한다.
- [x] Step 5: 영수증 확인→revision 확인→시각 정산→행동→world/영수증 저장을 한 `BEGIN IMMEDIATE`에서 실행한다. 조회/duplicate는 상태를 덮어쓰지 않는다. `receipt failure rolls back every migrated row`에 손상 응답과 UPDATE 실패 trigger 두 경우를 추가한다.
- [x] Step 6: `personal commands ignore unrelated guild revisions`, 같은 비용으로 동시 조선 시작 하나만 성공, 재시작v3 재지급 금지, 이전 전 pending duplicate 확인, 작업 완료 뒤 창을 닫았다 열어도 원점/재고 유지 테스트를 추가해 RED→GREEN을 확인한다.
- [x] Step 7: 세 서버 테스트 파일 전부 PASS, `npm run build` exit0 후 지정 경로만 `feat: persist authenticated planet commands and receipts`로 커밋한다.

## Task 5: 제국 API와 미확정 명령 복구

**Files:** Create `src/empire/api.ts`, `useEmpire.ts`; Modify `src/guild/api.ts`, `useGuildOperation.ts`, `src/components/ParticipantLink.tsx`; Test `tests/empire-network.test.tsx`, 기존 `GuildPanel.test.tsx`.

**Interfaces:** `EmpireApi`, `useEmpire(api)`의 `{ data, session, online, busy, error, pending, pendingPilotId, connect, refresh, send, retry }`. 공통 참가자 연결 컴포넌트는 화면의 연결 상태/콜백 인터페이스를 받으며 특정 hook 타입에 의존하지 않는다. API request helper는 GET/POST 모두 token을 전송하고 기존 timeout/abort 계약을 유지한다.

- [x] Step 1: jsdom 테스트에 stale read의 최신 revision 덮어쓰기 방지, 명령 timeout 후 동일ID/원 행성 재송신, 메뉴/새로고침 복구, sessionStorage 차단 시 메뉴 복구, 만료 후 같은 참가자 재연결, 미확정 중 다른 참가자 변경 차단을 작성한다.

  timeout→행성 전환→retry를 테스트 API에서 제어한 뒤 기록된 명령과 hook 상태를 검사한다.
  ```ts
  expect(recordedCommands[1]).toEqual(recordedCommands[0]);
  expect(recordedCommands[1].action.planetId).toBe(originalPlanetId);
  expect(result.current.data.state.revision).toBe(7);
  expect(result.current.pending).toBe(false);
  expect(readsAfterRetry).toBeGreaterThan(0);
  ```
- [x] Step 2: `npm test -- tests/empire-network.test.tsx tests/GuildPanel.test.tsx`. Expected: 새 hook 부재로 제국 행동이 실패한다.
- [x] Step 3: 현재 `useGuildOperation`의 순서/세대/부재 storage 방어 패턴을 재사용한 제국 hook을 구현한다. 제국pending key는 공동pending과 분리하고 공유 세션을 읽는다. 명령을 저장한 뒤 전송하고 원 actor/action을 보존한다.
- [x] Step 4: `retry refreshes after an older receipt`에서 현재 개인revision7에 revision3 duplicate가 돌아와도 최신 건조 재고를 유지하고 새 read를 수행하도록 한다. 같은 revision이면 더 최신serverTime만 수락한다. 응답 receipt의 commandId·actor·revision·duplicate 형식을 검사한다.
- [x] Step 5: 연결 실패 시 마지막 확인 상태/시각과 부족 사유를 표시할 수 있는 API를 제공한다. 기존 GuildPanel의 pending/세션·예약 기능 회귀 테스트를 유지한다.
- [x] Step 6: 두 네트워크/UI 테스트 전부 PASS, `npm run build` exit0 후 지정 경로만 `feat: recover planet commands across navigation and reconnects`로 커밋한다.

## Task 6: v0.5 행성 대시보드 디자인과 실제 조작

**Files:** Create `src/components/PlanetDashboard.tsx`, `PlanetScene.tsx`, `PlanetActionPanel.tsx`, `EmpireJobs.tsx`, `EmpireFleetPanel.tsx`, `src/empire/dashboard.css`, `tests/PlanetDashboard.test.tsx`, `public/art/planet-dashboard-scene-v1.png`, `docs/art/PLANET_DASHBOARD_RUNTIME_V0.1.md`; Modify `src/App.tsx`, `styles.css`, `FleetPanel.tsx`, `BaseOperationsPanel.tsx`, `GuildPanel.tsx`, 기존 `App.test.tsx`, `BaseOperationsPanel.test.tsx`.

**Interfaces:** `PlanetDashboard({ api?: EmpireApi })`는 실제 참가자 연결과 전체 제국 화면을 갖는다. 자식 화면은 `EmpireState`, 선택 행성 ID, 확인serverTime, `busy/pending`, `send(action)`을 받는다. `FleetPanel`은 선택적 `roster`를 받아 기존 브라우저 호출은 고정 함대, 서버 호출은 현지 실재고를 표시한다.

- [x] Step 1: jsdom 테스트에 본성1개·실제 자원/상한/전력, 시설 선택과 우측 제목/비용 일치, 건조 수량 입력/부족 사유, 비용 출처가 명령에 고정됨, 실제 작업 목록·완료 재고 증가, 건조 함선의 개인/공동 작전 선택을 작성한다.

  실제 초기 상태를 반환하는 테스트 API로 참가자 연결→조선소 선택→케스트럴1척 건조를 수행하고 아래 계약을 검사한다. 화면의 함선 명칭은 기존 콘텐츠의 케스트럴을 사용한다.
  ```ts
  expect(screen.getByRole("button", { name: /노바 프라임/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /아스트라|켈리온/ })).toBeNull();
  expect(screen.getByRole("heading", { name: /조선소/ })).toBeTruthy();
  expect(recordedCommands.at(-1).action).toEqual({
    type: "build-ships", planetId: empire.homePlanetId, shipId: "striker", quantity: 1,
  });
  expect(screen.queryByText("적 함대 접근")).toBeNull();
  ```
- [x] Step 2: `npm test -- tests/PlanetDashboard.test.tsx tests/App.test.tsx tests/BaseOperationsPanel.test.tsx tests/GuildPanel.test.tsx`. Expected: 기본 화면과 새 명령/재고가 없어 제국 assertion FAIL.
- [x] Step 3: v0.5 평상시 PNG를 읽고 imagegen skill을 적용해 텍스트/HUD/패널 없는 행성·궤도 시설 장면을 `public/art/planet-dashboard-scene-v1.png`로 만든다. 원본은 보존한다. 이 그림은 레이아웃 참고와 장면 자산이며 숫자·버튼·마커는 그림에 넣지 않는다. 생성/원본 경로와 실제 크기/사용 제한을 art 문서에 기록한다.
- [x] Step 4: 좌측 탐색/상단현지HUD/중앙행성/우측행동/하단작업을 v0.5 배치·세라믹/흑연/구리/청록 역할로 구현한다. 실제 기능만 탐색에 두고 브라우저 연습은 별도 진입으로 유지한다. 본성1개와 실제 함대/포대/작업을 보여주고 은하계/개척/가짜위협/수송은 실행 CTA를 만들지 않는다.
- [x] Step 5: 생산·발전 증설/방어건설/공통연구/8함종 조선과 재고·정비 화면을 실제 `send`에 연결한다. 작업 취소 시80% 반환과 저장 부족을 설명한다. 추천 편성과 개인/공동 작전은 가용 현지 동적 함대 문맥을 사용하고 현재6척/지휘12가 기존 임무 제한임을 보여준다.
- [x] Step 6: 두 행성 UI 픽스처에서 선택 전환과 명령 작성 뒤 재전송 원점, 귀환/환불 출처, 공통연구의 비용 출처를 검증한다. 키보드 시설선택·수량 최소/최대·명확한 부족텍스트·마지막확인시각/오프라인표시·설정된모션감소·협소화면DOM읽기순서를 행동 중심으로 테스트한다.
- [x] Step 7: 선택120~180ms/패널180~260ms/완료400~700ms와 `prefers-reduced-motion`을 CSS에 넣는다. 이 모션이 명령/입력을 지연하지 않도록 타이머와 pending을 분리한다. 생성 그림 파일을 헤드리스로 확인하고 실제 렌더/모션체감은 미검증으로 기록한다.
- [x] Step 8: 네 UI 테스트 파일 PASS, `npm run build`, `npm run verify:build` exit0 후 지정 경로만 `feat: add the interactive planet dashboard and shipyard`로 커밋한다.

## Task 7: 전체 순환 검증과 문서

**Files:** Create `tools/verify-empire.mjs`, `docs/validation/PLANET_BASE_REPORT.md`; Modify `tools/verify-guild.mjs`, `tools/verify-build.mjs`, `package.json` scripts, `README.md`, 이 계획/상세 설계의 상태.

**Interfaces:** `npm run verify:empire`는 임시DB와 루프백API를 만들고 생산→건설/연구/건조→새 함선 개인출격/귀환/정비→공동기여→재시작→duplicate확인을 실제HTTP로 수행한다. 시간을 테스트용 clock으로 제어하며 실제 긴 기다림을 만들지 않는다.

- [x] Step 1: 검증 도구의 assertion을 먼저 작성한다. 보유9→10, 비용단1회, 완료/취소원점, 건조된ID의 실제출격, 재시작전후재고/SHA대상자료동일, 원 영수증재송신 후 장부불변을 검사한다. 기존 네 역할 단독/분담 검증의 행동을 v3에 맞춘다.
- [x] Step 2: 도구를 실행해 빠진 통합 경로를 확인하고 Task 1..6의 결함만 원인별회귀테스트와 함께 수정한다. `verify:build`가 새 장면 자산도 HTTP로 제공되는지 검사하도록 한다.
- [x] Step 3: `npm test`, `npm run build`, `npm run verify:build`, `npm run verify:guild`, `npm run verify:empire`, `npm run simulate`를 실행한다. Expected: 각 exit0, 테스트 실패0, 브라우저/GUI창 없음. 로그에 수/결과/제한을 기록하고 불변 코드의 검증을 이유 없이 반복하지 않는다.
- [x] Step 4: README에 현재 실행 흐름, 실제 초기값, 비용/대기/취소, 버전이전, 조선재고, UI상태와 남은 성계/식민지 범위를 갱신한다. PLANET_BASE_REPORT에는 신선한 검증 결과와 실제렌더/재미검증미완료를 구별한다. 구현되지 않은 공격접근/수송을 완료로 보고하지 않는다.
- [ ] Step 5: `git diff --check`와 요구사항별완료표를 검토한다. Native 실행 시 전체 변경을 독립 리뷰하고 Critical/Important는 수정/검증한다. 지정 경로만 `test: verify planet growth and dashboard integration`로 커밋한다. 공유 브랜치 push/merge는 별도 승인 없이 실행하지 않는다.

## Self-Review and Execution Handoff

순수 규칙→동적 전투→저장/공동규칙→장부/API→명령복구→실제 대시보드→전체 순환 순으로 인터페이스가 연결된다. 저장을 이중화하지 않고 기존 브라우저 연습은 선택적 함대 문맥의 기본값으로 유지한다. 설계의 모든 완료 기준을 Task 1..7에 매핑했고 Review Focus 다섯 가지는 위 명시된 테스트로 보완한다.

추천 실행 방식은 **Native: 이 대화에서 직접 구현**이다. 경제·이전·전투·화면이 같은 데이터 타입을 계속 사용하므로 한 실행자가 순서대로 구현하고 마지막에 전체 변경을 독립 리뷰하는 구성이 적합하다. 별도 작업별 구현/리뷰 에이전트 방식은 사용자 선택 시 적용한다.

사용자는 계획을 승인하고 **이 대화에서 직접 구현**을 선택했다. 작업 사이마다 추가 진행 승인을 묻지 않고 모든 Task를 이어 수행한다. `superpowers:executing-plans`의 plan 전용 ledger에 테스트·커밋·판단을 남긴다.
