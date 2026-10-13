# Base Economy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 서버 기지 생산·정비·개인 연구 작전과 단독 공동 작전을 연결한다.
**Architecture:** 순수 BaseState 규칙, 공유 v2 상태/원자적 이전, 재사용 네트워크 훅 기반 기지 화면. 브라우저 연습 저장은 유지한다.
**Tech Stack:** 기존 React/TypeScript/Vite/Vitest/Node24 SQLite, 새 제품 의존성 없음.
**Spec:** docs/superpowers/specs/2026-10-13-base-economy-design.md

## Global Constraints

- 합금120/보급80, 6×forge/4×reactor 분당 생산, 8시간 상한, 저장300/150 시작. 시설1..3, 합금40/보급10×현재 레벨.
- 보급 지휘합계(개인 지원+2), 정비 손실HP10당 합금1 함선별 올림, 정상 함선만 출격. 개인 회수화물×4합금, 연구 모듈20데이터+40합금.
- 미완료 예약만 참가자당1개, 완료 역할의 정원 해제. 개인 역할10/공동 참가자당20 공헌.
- v1 세계와 영수증 응답을 원자적으로 v2 이전. 비용·보상은 서버 판정, 원 요청과 중복 장부 보존.
- 로컬 개발 참가자, GUI 창 없음, 기존 전용 브랜치/native 구현 후 독립 최종 검토.

## Review Focus

1. 가득 찬 저장고/오프라인 상한 뒤 업그레이드가 버린 생산을 되살리거나 높은 레벨로 소급하지 않는다. Task1 경계 테스트.
2. 귀환·즉시 실패·중복 명령·보고서 닫기가 자원과 정비를 두 번 정산하지 않는다. Task1/2 테스트.
3. 혼자 네 역할을 마치거나 여러 역할을 가진 참가자의 공동 보상이 중복되지 않고 남의 완료 기여를 보존한다. Task1 테스트.
4. 저장 이전 중 영수증 쓰기 실패/손상 응답이 세계만 새 버전으로 남기지 않고 v1 원본을 유지한다. Task2 테스트.
5. 참가자 전환/메뉴 이동/오프라인 중 비용 표시와 재전송이 다른 참가자나 오래된 명령에 적용되지 않는다. Task3 DOM 및 기존 네트워크 회귀.

## Task 1: Base rules and shared v2 domain

**Files:** src/base/types.ts, rules.ts, validation.ts; src/guild/types.ts, rules.ts, validation.ts; tests/base.test.ts; tests/guild.test.ts.
**Interfaces:** BaseState(resources:{alloy,supply},facilities:{forge,reactor},lastProducedAt,wear:Record<string,number>,career:GameState); BaseAction collect-production/upgrade-facility/repair-fleet/career-action; initialBase(now=0), projectBase(base,now):BaseState, sortieCost(ids,support='none'):number, repairCost(base,ids):number, assertDeparture(base,ids):void, recordReturn(base,fleet):void, applyBaseAction(base,action,now):BaseState. GuildState v2 contains pilot.base, applyGuildCommand accrues actor and handles BaseAction. validateGuildState(value) v2, validateLegacyGuildState(value) v1 for Task2.
- [ ] Write `tests/base.test.ts`: minute fractions/caps/backward time, upgrade old-rate/no overflow bank, insufficient resources immutable, launch debit and checkpoint lock, return credits once/wear/repair, module alloy+research/no guild prerequisite, sequential four-role merit60/one award, multi-actor preservation. Run `npm test -- tests/base.test.ts`; Expected missing module/API failure.
- [ ] Implement stated pure interfaces and exact values, use existing reduceGame/resolveBattle; v2 validation validates BaseState and decodeSave career. Completed owners may repeat across roles; awards must equal unique completed owners.
- [ ] Run `npm test -- tests/base.test.ts tests/guild.test.ts`; Expected pass. Commit intended paths.

## Task 2: Atomic migration and persistent career API

**Files:** src/guild/migration.ts; server/store.ts; tests/base-server.test.ts; tools/verify-guild.mjs.
**Interfaces:** upgradeGuildState(value,now):GuildState validates v1 before seeding BaseState. GuildStore constructor accepts optional {now?:number}, creates v2 and migrates v1 world + every v1 receipt response inside BEGIN IMMEDIATE; execute contract unchanged.
- [ ] Write real SQLite/HTTP tests: valid v1 claim/receipt preserved and seeded once; migration receipt trigger failure rollback; corrupt legacy receipt rollback; solo launch/return/repair/module persisted across restart; replay original launch/return IDs changes neither supply nor credits/wear. Run `npm test -- tests/base-server.test.ts`; Expected missing migration/v2 support failure.
- [ ] Implement migration and server adapter, no new endpoint/auth model. Extend HTTP proxy smoke with same-pilot sequential roles and repair after each role; assert merit60 and one success award.
- [ ] Run `npm test -- tests/base-server.test.ts tests/guild-server.test.ts`, `npm run verify:guild`; Expected pass. Commit.

## Task 3: Base operations UI

**Files:** src/components/BaseOperationsPanel.tsx, ParticipantLink.tsx; src/base/base.css; src/components/GuildPanel.tsx, FleetPanel.tsx; src/App.tsx; tests/BaseOperationsPanel.test.tsx; README/docs/validation/BASE_ECONOMY_REPORT.md and vision.
**Interfaces:** BaseOperationsPanel({api?:GuildApi}) uses shared useGuildOperation and BaseState; ParticipantLink({network:ReturnType<typeof useGuildOperation>}) owns connection/errors/retry controls; FleetPanel optional recommended:string[] defaults STARTER_FLEET. GuildPanel uses active reservations only and exposes base resource/repair navigation link. App adds 기지 운영 menu with server career distinct from 편성 연습.
- [ ] Write DOM tests for production/upgrade, personal sortie→return→repair→module, same-pilot recon→jam availability, insufficient resources and reconnect/menu pending preservation. Run `npm test -- tests/BaseOperationsPanel.test.tsx`; Expected missing component failure.
- [ ] Implement responsive/reduced-motion base panels, cost preview, maintenance diagnostics and personal operation report using existing components. UI never grants currencies or submits HP/time. Extract shared identity/retry controls.
- [ ] Run `npm test`, `npm run build`, `npm run verify:build`, `npm run verify:guild`; Expected pass; document counts/limitations and commit.
- [ ] Fresh independent whole-branch review; reproduce Important/Critical as failing regressions, one fix pass/full checks/commit.

## Self-review

Task1 BaseState and action/validation names match migration and UI. Existing personal reducer/save are reused without economic fields so deterministic validation remains intact. Production does not mutate on GET or award guild research. Research is earned by individual missions regardless of guild membership. Ready-state blocks persistent damage instead of silently spawning partially repaired full-health ships.
