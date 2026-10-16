# Growth Preparation Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan inline. Steps use checkbox syntax for tracking.

**Goal:** Complete research, shipbuilding and cancellation/refund review UI in the independent demo.
**Architecture:** Extend existing research/fleet/construction workspaces. A presentation-only catalog and quote module reads immutable demo snapshots; a controller keeps choices in memory and opens one native review dialog. No real commands, timers, success states, inventory mutation or persistence.
**Tech Stack:** Existing native JS/CSS, Vitest/jsdom and installed headless Chromium/Playwright. No packages or new art.
**Spec:** User-approved scope: research/shipbuilding/cancel-refund first, action above description, growth-expedition loop, independent demo only.

## Global Constraints
- Preserve src/, server/, economy/combat/fleet/research/construction rules, assets and dependencies.
- Actual start/cancel controls stay disabled and say 미연결. Interactive controls are explicitly 계획 검토 / 환급 검토.
- Mirror existing src/empire/content.ts prices/requirements and cancel rule: floor(resourcePaid * .8), original payer, sufficient capacity, unavailable after completion.
- Existing queues, fleet commands, research scope and navigation remain available. No fake cancellation/removal/completion.
- Reuse current approved art; respect reduced motion and pause.
- Headless verification only. Commit/push same branch codex/demo-visual-unification; no merge or production integration.

## Review Focus
- Selected colony differs from research original payer: refund must use payer inventory/capacity.
- Blank/fractional/negative/huge construction quantity: no silent valid quote or lost typing focus.
- Modal opened before planet/connection/navigation/reset change: dismiss stale review, restore sensible focus.
- Completed/empty queues and capacity failures: never show successful cancellation or alter assets.
- 320px, short landscape, 200% text and keyboard/forced colors: no clipped actions, duplicate IDs or unnamed controls.

## Task 1: presentation catalog/quotes/refunds
Files: public/uiux-demo/development-model.js; tests/uiux-development.test.ts.
Consumes immutable initialDemo snapshots. Produces technologies, shipBuild, initialDevelopment(), researchPlan(state,ui), shipPlan(state,ui), cancellationPlan(state,kind,scenario).
- [x] Write assertions for existing prices, requirements, whole quantities 1..20, payer-specific refunds/capacity/completion, immutable snapshots.
- [x] Run RED, implement, run GREEN. No rule import into browser; catalog parity checked against canonical TypeScript in tests.

## Task 2: workspaces/controller/dialog
Files: development.js, development.css, development-controller.js; workspace.js, main.js, index.html; tests/uiux-development.test.ts.
- [x] Write RED DOM assertions: 4 technologies,8 ships, exact quote and stable numeric field; queue refund reviews; disabled real actions; safe modal dismissal/focus.
- [x] Implement catalog selection, top plan controls, artwork/effects/prerequisites below, current queues and next destinations.
- [x] Add accessible native dialog with named close, actual action disabled, explicit review conditions, source planet and full resource comparison.
- [x] Run focused tests incl existing workspace/demo/neon tests. Preserve existing hooks or update only assertions whose display structure changed.

## Task 3: validation and handoff
Files: tools/verify-development-demo.mjs; docs/qa/2026-10-16-growth-preparation/; docs/uiux-refoundation/GROWTH_PREPARATION_REVIEW.md and HANDOFF/README links.
- [x] Build, full tests, verify build.
- [x] Headless flow/AX/focus/320/390/landscape/text200/forced-colors/reduced-motion/offline/art fallback checks; inspect screenshots and fix actual issues.
- [x] Run existing demo/mobile/fleet/all-view regressions sequentially. Final read-only code reviewer.
- [x] Record raw outputs, source hashes, preserved scope, screenshots, limitations and how to test.
Publication after validation: explicitly stage, commit/push as authorized, then verify local/upstream/live SHA parity and clean worktrees. The publication SHA is reported after it exists.
