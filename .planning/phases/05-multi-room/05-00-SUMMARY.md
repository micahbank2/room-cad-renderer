---
phase: 05-multi-room
plan: 00
subsystem: testing
tags: [wave-0, stubs, vitest, it.todo]
requirements: [ROOM-01, ROOM-02]
dependency-graph:
  requires: []
  provides:
    - "Stable describe/it.todo anchors for Wave 1+ to fill in"
  affects:
    - "tests/ directory"
tech-stack:
  added: []
  patterns:
    - "Wave 0 it.todo stub precedent (Phase 2/3/4)"
key-files:
  created:
    - tests/cadStore.multiRoom.test.ts
    - tests/snapshotMigration.test.ts
    - tests/roomTemplates.test.ts
  modified: []
decisions:
  - "Wave 0 stubs use vitest-only imports (no src/@ imports) to remain orthogonal to Wave 1+ module creation"
  - "Exact describe/it string anchors preserved verbatim per plan spec — Wave 1/3 executors will swap it.todo for it + body keeping strings identical"
metrics:
  duration: "1m"
  tasks_completed: 1
  files_changed: 3
  completed: "2026-04-05"
---

# Phase 05 Plan 00: Wave 0 Test Stubs Summary

Created 3 vitest stub test files with 18 `it.todo()` placeholders (9+4+5) pinning describe/it string anchors for multi-room actions, v1→v2 snapshot migration, and room templates — giving Wave 1+ executors a mechanical handoff.

## What Was Built

**tests/cadStore.multiRoom.test.ts** — 9 todos covering addRoom/switchRoom/renameRoom/removeRoom + per-room wall/product isolation + undo semantics (ROOM-01).

**tests/snapshotMigration.test.ts** — 4 todos covering v1→v2 wrapping, v2 passthrough, default fallback, and legacy data carry-over into `room_main`.

**tests/roomTemplates.test.ts** — 5 todos covering LIVING_ROOM/BEDROOM/KITCHEN/BLANK template shapes + invariant (thickness=0.5, openings=[]) (ROOM-02).

## Verification

- `bun x vitest run tests/cadStore.multiRoom.test.ts tests/snapshotMigration.test.ts tests/roomTemplates.test.ts` → 18 todos, 0 failures
- Full suite: `bun x vitest run` → 97 passed / 21 todo / 0 failed (exit 0)
- `grep -c 'it.todo'`: 9 / 4 / 5 (match spec)
- No `@/` or `src/` imports in stub files

## Deviations from Plan

None - plan executed exactly as written.

## Commits

- `99bf426` test(05-00): add Wave 0 it.todo stubs for multi-room, migration, templates

## Self-Check: PASSED

- Files exist: tests/cadStore.multiRoom.test.ts, tests/snapshotMigration.test.ts, tests/roomTemplates.test.ts
- Commit 99bf426 in git log
