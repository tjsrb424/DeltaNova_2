# Guild Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 서로 다른 참가자의 역할 기여, 공유 전투와 중복 없는 보상을 실제 로컬 서버에 연결한다.
**Architecture:** 순수 공동 작전 규칙, SQLite 트랜잭션/API, React 네트워크 화면을 분리한다. 기존 개인 저장은 변경하지 않는다.
**Tech Stack:** React/TypeScript/Vite/Vitest, Node24 http/sqlite. 새 제품 의존성 없음.
**Spec:** docs/superpowers/specs/2026-10-13-guild-operations-design.md

## Global Constraints

- 역할당 1명, 참가자당 작전별 역할 1개, 예약 5분, 개인 공헌 10/공동 성공 20.
- 기존 편성 지휘 12/최대6척, 개발 함대9척. 전투/보상은 서버 판정.
- 서버 루프백만, 계정/외부배포 없음, UI에 개발 참가자 모드 명시.
- 디스크와 네트워크 실패는 성공이나 초기화로 처리하지 않는다. 창을 열지 않는다.
- 사용자의 추천안 진행 위임과 즉시 개발 지시에 따라 root가 직접 구현하고 마지막 독립 검토를 받는다.

## Review Focus

1. 서로 다른 세션의 같은 역할 선점, stale 요청은 기존 소유자를 보존한다. Task2 HTTP 경쟁 테스트.
2. 응답 유실 후 같은 명령 재시도와 서버 재시작이 공헌/보상을 중복하지 않는다. Task2 재시작 테스트.
3. 지원/역할 완료/만료/실패 돌파의 소유권 경계가 다른 사람의 확정 기여를 삭제하지 않는다. Task1 테스트.
4. SQLite 쓰기 실패/손상 버전은 상태와 영수증을 부분 커밋하거나 자동 초기화하지 않는다. Task2 테스트.
5. 늦게 도착한 읽기/명령 응답 또는 세션 전환은 새로운 화면을 이전 상태로 되돌리지 않는다. Task3 지연 응답 테스트.

## Task 1: Shared operation rules

**Files:** src/guild/types.ts, content.ts, rules.ts, validation.ts; tests/guild.test.ts.
**Interfaces:** GuildState(schemaVersion1,rulesVersion guild-v1,revision,pilots,operation), GuildCommand(commandId,expectedRevision,operationId,action); initialGuildState():GuildState; parseGuildCommand(unknown):GuildCommand; applyGuildCommand(state,actorId,command,now):GuildState; validateGuildState(unknown):GuildState. GuildError(status,code,message). Role IDs recon/jam/supply/breach. Report contains actual BattleResult[], supporting participants, contribution/reward/summary.
- [ ] Write tests for unique claims, one-role-per-pilot, expiry, wrong owner, specialist survival, all support effects, failed breach preservation, fixed rewards and next operation; run `npm test -- tests/guild.test.ts`, expect missing-module failure.
- [ ] Implement exact spec rules using existing createFleet/resolveBattle. Keep draft immutable and role reports on failed attempts. Persist only valid bounded shapes.
- [ ] Run same test command, expect all pass. Commit intended paths.

## Task 2: Transactional server

**Files:** server/store.ts, http.ts, main.ts; tools/dev.mjs; tests/guild-server.test.ts; package.json, vite.config.ts, tsconfig.json, .gitignore.
**Interfaces:** GuildStore(path) exposes snapshot(), execute(actorId,command,now), close(); execute returns {state,receipt,duplicate}. createGuildServer(store,options) returns Node Server. GET /api/guild returns {state,serverTime}; session {pilotId,token}; commands same execute envelope plus serverTime. Domain interfaces from Task1. parseKnownSession and origin checks at HTTP boundary.
- [ ] Write tests with real ephemeral HTTP server and two tokens: claim race, auth/ownership, exact request validation, stale command, duplicate command, restart receipt, unsupported saved version and transactional rollback using a rejecting SQLite trigger. Run `npm test -- tests/guild-server.test.ts`, expect missing-module failure.
- [ ] Implement SQLite BEGIN IMMEDIATE transaction and durable receipts, loopback API/limits, integrated headless dev runner/proxy.
- [ ] Run tests, expect pass. Commit intended paths.

## Task 3: Shared operation screen

**Files:** src/guild/api.ts, components/GuildPanel.tsx, guild.css; src/App.tsx; tests/GuildPanel.test.tsx; README and docs/validation/GUILD_OPERATIONS_REPORT.md.
**Interfaces:** GuildApi.read/connect/command return Task2 contracts; component accepts optional injected GuildApi. use monotonic revision and session generation, same-command retry, 3-second polling with cleanup. Existing FleetPanel provides selection only, gameplay remains server-owned.
- [ ] Write DOM tests for connect/reserve/contribute, offline preservation, stale polling ignored, ambiguous retry same command ID, session changes/expired token. Run `npm test -- tests/GuildPanel.test.tsx`, expect missing-module failure.
- [ ] Implement actionable role board, identity mode, contribution wallet and battle/effect report with responsive/reduced-motion styling. Integrate navigation without affecting solo operation locks.
- [ ] Run `npm test`, `npm run build`, `npm run verify:build`; expect all pass. Verify integrated dev/API via headless HTTP and stop server. Document real counts and pending rendered QA. Commit.
- [ ] Fresh independent whole-branch review; reproduce meaningful findings as failing regressions, fix once, run full suite/build and commit.

## Self-review

Shared type names and response shapes agree across tasks. No client provided outcome or wallet can enter server state. Current personal save schema stays v1; new shared SQLite state is independently versioned. Long-term economics and actual account service remain separate future work.
