# Independent demo UX and motion implementation plan

> **For agentic workers:** Execute inline, using the approved review recommendations and the user's motion request. Verify the final diff and rendered UI before delivery.

**Goal:** Make the disconnected UI demo useful for reviewing decisions, navigation and restrained planet/fleet motion.

**Architecture:** Keep all changes in the static demo. Add explicit presentation fixtures for facility comparisons, a drawer history and facility selection. Animate a sphere projection with fixed lighting; use SVG neon route previews with fixed illustrative times. No game rules, requests, storage, accounts or successful commands.

**Tech stack:** Existing HTML/CSS/JavaScript, Canvas/WebGL with static fallback, Vitest/jsdom, browser review.

**Spec:** The six findings accepted in this chat, the user's slow rotation / outbound and incoming neon route request, and `docs/uiux-refoundation/DESIGN_BIBLE_REVISED.md` (motion updated by the current request).

## Global constraints

- Work in the already selected `codex/uiux-refoundation` checkout.
- No game API connection, backend or production `src/` edits; no extra packages.
- Example data and times remain identified. Commands remain disabled.
- Reduced motion, manual pause, hidden tabs and an offscreen globe stop continuous rendering.
- Existing functions and menus remain reachable; nested details have Back and Close.

## Review focus

- Planet changes must not move an incoming threat from its original target.
- A visual departure or completion must not mutate ships, resources or facilities.
- Back restores the prior panel, facility and scroll position; Close restores its outside opener.
- Loading placeholders must not leak stale totals; expanded fixtures remain illustrative.
- Compact portrait/landscape, 200% text and image/WebGL failure must leave controls usable.

## Tasks

- [x] Add meaningful UI regression tests for facility comparisons, nested Back, global threat/departure and loading placeholders; watch failures.
- [x] Implement explicit fixture comparisons, selectable facility details, drawer history, concise copy and resource/readiness summaries.
- [x] Compact mobile header, move asset summaries ahead of the globe on phones and collapse preview tools by default.
- [x] Add sphere rotation and neon route previews; respect motion and visibility settings, retain static fallback.
- [x] Run tests/build, inspect desktop/mobile states and interactions in the live browser; repair observed defects.
- [x] Save new review evidence, update handoff notes and report actual limits. Leave the demo running for review.

Validation: Vitest 197/197; model 6/6; build and HTTP assets pass; 11 integration checks / 15 layouts; 200% text at 3 sizes. Independent review's three findings reproduced and fixed. See `docs/uiux-refoundation/UX_MOTION_REVIEW.md` for scope and visual limitations.

## Follow-up: exterior routes and synchronized positions

User requested a fresh visual review, exterior atmospheric endpoints and actual local demo positions instead of decorative loops. This supersedes the original fixed-time route implementation above; no server connection is authorized.

- [x] Review live desktop/mobile rendering and repair observed time/label collisions.
- [x] Add tested exterior geometry and a single local clock for current positions and every ETA. Stop at arrival and freeze preview time with motion settings/details.
- [x] Replace mirrored hemispheres with an original full equirectangular texture using built-in imagegen; preserve source and existing fallback art.
- [x] Reproduce independent review's wide-screen vertical clipping defect with failing tests; bound the control point and validate full routes at seven viewport sizes.
- [x] Re-run 204 tests, 6 model checks, build/HTTP and 13 browser integration checks; preserve screenshots, provenance and remaining limits in `EXTERIOR_ROUTE_REVIEW.md`.
