# Delta Nova Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 편성, 지원, 접근 경로, 교전, 귀환과 기지 모듈을 실제 조작할 수 있는 로컬 작전실을 만든다.

**Architecture:** 데이터와 순수 규칙을 React 화면 및 저장 어댑터에서 분리한다. 작전은 출격 스냅샷과 명시적 상태 전이로 해결한다. 첫 결과물은 서버 없이 로컬에서 기능을 검증한다.

**Tech Stack:** React, TypeScript, Vite, Vitest, React Testing Library, jsdom. npm lockfile로 버전 고정.

**Spec:** `docs/superpowers/specs/2026-10-13-delta-nova-command-center-design.md`

## Global Constraints

- 최대 6척, 지휘 용량 12. 최초 함종 8종은 최종 상한이 아니다.
- 기본 교전과 선택 가능한 추가 교전. 기본·추가 교전 사이 귀환 가능.
- 정찰, 교란, 보급은 실제 길드원을 대신하는 로컬 지원 시뮬레이션이다.
- 실제 서버, 계정, PvP, 온라인 길드, 앱 패키징과 공개 배포 제외.
- UI는 게임 판정 수식을 중복 구현하지 않는다. 같은 입력에 같은 결과.
- 개발 검증은 헤드리스. 새 창을 열지 않는다.
- 사용자가 추천안 진행을 위임했다. 현 작업 브랜치에서 직접 구현하고 별도 검토자가 마지막 변경을 검토한다.

## Review Focus

1. 잘못된 저장과 알 수 없는 버전은 기존 데이터를 덮어쓰지 않는다. Task 2에서 검증.
2. 더블 클릭, 동일 출격·귀환·보고서 처리로 보상이 중복되지 않는다. Task 1과 3에서 검증.
3. 정찰 선택 해제 후 남은 우회 경로는 유효성 검사에서 거절된다. Task 1과 3에서 검증.
4. 전멸·기한 초과·동시 전멸에도 음수나 무한 반복 없이 결과 및 재도전 가능. Task 1에서 검증.
5. 저장 실패나 외부 탭 변경은 현재 진행을 조용히 버리지 않는다. Task 2와 3에서 검증.

## Files and interfaces

`src/game/types.ts`는 ShipDefinition, CombatUnit, MissionDefinition, Support, Approach, ModuleId, BattleResult, Operation, Profile, GameState 및 GameAction 타입을 정의한다.

`src/game/content.ts`는 SHIPS, ROSTER, MISSIONS, SUPPORTS, MODULES를 제공한다. `src/game/fleet.ts`의 `validateFleet(ids: string[], support: Support, approach: Approach): string[]`와 `createFleet(ids: string[], module: ModuleId): CombatUnit[]`가 편성 경계다.

`src/game/combat.ts`의 `resolveBattle(fleet: CombatUnit[], enemies: CombatUnit[], options: BattleOptions): BattleResult`가 순수 교전 판정이다. `src/game/state.ts`는 `initialState(): GameState`, `reduceGame(state: GameState, action: GameAction): GameState`를 제공한다. 게임 오류는 state.message에 남기고 기존 진행 상태를 보존한다.

`src/storage/save.ts`는 `encodeSave(state: GameState): string`, `decodeSave(raw: string): GameState`, `loadGame(storage: StoragePort): LoadResult`, `saveGame(storage: StoragePort, state: GameState): SaveResult`를 제공한다. 예외와 저장 거절을 UI가 구분할 수 있다.

`src/App.tsx`는 상태/저장/화면 연결, `src/components/`는 ShipGlyph, FleetPanel, MissionPanel, SupportPanel, OperationPanel, BasePanel, ResultPanel, `src/styles.css`는 반응형 및 모션을 담당한다.

## Task 1: Deterministic mission core

**Files:** Create package.json, package-lock.json, tsconfig.json, vite.config.ts, index.html, .gitignore, src/game/types.ts, content.ts, fleet.ts, combat.ts, state.ts; tests/game.test.ts; tools/simulate.ts.

**Interfaces:** Produces the shared types, content and pure functions above. BattleResult includes fleet/enemies, outcome (victory/repelled/destroyed), rounds, cargoLost and structured events. Operation holds missionId, support, approach, module, phase (briefing/checkpoint/result), fleet, battle histories, earned/unloaded/lost cargo and final settlement. GameAction covers launch, advance, return, dismiss, unlock-module, activate-module, clear-message.

- [ ] Write failing real-behavior tests: overcapacity/duplicates/unknown IDs refused; unsupported flank refused; simultaneous destruction; first-round-only jam; armor bypass; guardian conservation; carrier hit; victory-only repairs; cargo loss; highest-record delta rewards and repeated return; failed mission can relaunch.
- [ ] Run `npm test -- tests/game.test.ts`; expect missing behavior failure.
- [ ] Implement content, fleet validation, combat and reducer. Keep stable IDs and snapshot settings. Launch resolves the first battle synchronously, advance resolves optional battle, return settles once. Events contain source/target IDs, type, amount and text; UI derives its explanations from these events.
- [ ] Run `npm test -- tests/game.test.ts`; expect all tests pass.
- [ ] Implement enumeration of all legal fleets/support/approach combinations and CSV/Markdown summary through `npm run simulate`. Record actual output in docs/validation; this validates balance hypotheses, not human fun.
- [ ] Commit only Task 1 paths and record command results.

## Task 2: Reliable local progress

**Files:** Create src/storage/save.ts and tests/storage.test.ts.

**Interfaces:** Consumes GameState. Save schema version is 1, rules version command-center-v1. LoadResult status is fresh/loaded/invalid/unavailable; SaveResult reports success or reason. StoragePort has getItem/setItem only.

- [ ] Write failing tests for full valid roundtrip, bad JSON, unknown version, malformed nested fleet, negative/NaN values, unsupported IDs, quota failure and preservation of invalid raw storage.
- [ ] Run `npm test -- tests/storage.test.ts`; expect missing module/behavior failure.
- [ ] Implement recursive runtime validation and non-destructive recovery. Use one namespaced snapshot key, `delta-nova.command-center.v1`. Do not silently reset unknown data. Inject StoragePort so quota denial is tested without a browser.
- [ ] Run full `npm test`; expect all tests pass. Commit Task 2 paths.

## Task 3: Playable command center and visual feedback

**Files:** Create src/main.tsx, App.tsx, components/*.tsx, styles.css, tests/App.test.tsx; use public/art/orbital-base-v1.png and docs/art/ORBITAL_BASE_PROMPT.md; update README.md and docs/validation/IMPLEMENTATION_REPORT.md.

**Interfaces:** Consumes content, reducer and storage APIs. DOM buttons dispatch GameAction; local selection state covers mission/fleet/support/approach. State phase controls locking. CSS motion is decorative and reduced-motion safe.

- [ ] Write failing tests using real UI: empty fleet cannot launch, selecting ships updates capacity, selecting recon unlocks flank and deselection invalidates/reset it, launch shows battle/report, returning updates persistent progress once, completed result can dismiss/retry, invalid save requires explicit fresh start, storage failure warns, external storage event locks editing.
- [ ] Run `npm test -- tests/App.test.tsx`; expect missing UI failure.
- [ ] Implement four working navigation destinations (command/operations/fleet/base) as local sections. Use an original station hero, restrained telemetry, role glyphs, six selection slots, accessible buttons, support cards, route choice, battle event explanation and result settlement. Label support as local simulation.
- [ ] Apply tactile hover/press/focus feedback, selection fill transitions, launch state, damage and result entry; respect prefers-reduced-motion and small viewports.
- [ ] Run `npm test`, `npm run build`, `npm run simulate`; expect passing tests, successful TypeScript/Vite build and a real balance report. Record unperformed rendered/human QA separately.
- [ ] Commit intended files. Fresh whole-branch review focuses on the five Review Focus items and gameplay state boundaries; fix meaningful findings with failing regression tests before reporting.

## Plan self-review

The three tasks cover rules, reliable local state and the complete user flow. Storage validation consumes the same GameState used by the UI and reducer. Module/support/route effects are exclusively in game rules. No task claims online guild implementation or final art approval. Cross-task interface names above are authoritative.
