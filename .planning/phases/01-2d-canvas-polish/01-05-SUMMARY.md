---
phase: 01-2d-canvas-polish
plan: 05
subsystem: persistence
tags: [auto-save, projectStore, debounce, indicator]
requires: [cadStore, serialization.saveProject, uid]
provides: [useProjectStore, useAutoSave, SaveIndicator]
affects: [App.tsx, ProjectManager.tsx, StatusBar.tsx]
tech-stack:
  added: []
  patterns: ["zustand v5 subscribe with setTimeout debounce", "store-lifted component state"]
key-files:
  created:
    - src/stores/projectStore.ts
    - src/hooks/useAutoSave.ts
    - src/components/SaveIndicator.tsx
  modified:
    - src/App.tsx
    - src/components/ProjectManager.tsx
    - src/components/StatusBar.tsx
    - tests/useAutoSave.test.ts
    - tests/SaveIndicator.test.tsx
decisions:
  - "Debounce via setTimeout inside useEffect, not custom hook — simpler cleanup"
  - "Reference-equality check on room/walls/placedProducts to skip past/future history-only writes"
  - "clearActive() always resets name to 'Untitled Room' per D-13 (replaces handleNew's old 'Untitled Project')"
metrics:
  duration: "3m 26s"
  completed: "2026-04-05"
  tasks: 4
  commits: 6
---

# Phase 01 Plan 05: Auto-Save + Save Indicator Summary

SAVE-02 shipped: every cadStore mutation auto-saves to IndexedDB 2s after the last change, with a visible SAVING/SAVED indicator that fades, and auto-creates an "Untitled Room" project on first edit if none exists.

## What Shipped

**`projectStore` (new Zustand store)** holds `activeId: string | null`, `activeName: string`, `saveStatus: "idle"|"saving"|"saved"` plus `setActive`, `setActiveName`, `clearActive`, `setSaveStatus` actions. Defaults to `activeName: "Untitled Room"`.

**`useAutoSave()` hook** subscribes to `useCADStore` and compares `room`/`walls`/`placedProducts` references against the previous state (skipping past/future-only mutations so undo doesn't trigger saves). Debounces 2s via `setTimeout` — each mutation clears the prior timer. When it fires: auto-creates `proj_{uid}` + "Untitled Room" if `activeId` is null (D-13), flips status `saving` → `saved`, then 2s later `idle`. Cleanup tears down both timers and the store subscription.

**`SaveIndicator`** reads `saveStatus` from projectStore and renders:
- `idle` → `null`
- `saving` → `SAVING...` in `text-text-dim` (Obsidian dim)
- `saved` → `SAVED` in `text-success` (Obsidian green)
All with `font-mono text-[9px] tracking-widest` and a 200ms opacity transition.

**`ProjectManager` refactor**: removed local `useState` for `currentId`/`projectName`, now reads/writes via `useProjectStore`. `handleSave` → `setActive(id, projectName)`. `handleLoad` → `setActive(project.id, project.name)`. `handleDelete`/`handleNew` → `clearActive()`. Name input uses `setActiveName`.

**`App.tsx`** calls `useAutoSave()` once at the top level. **`StatusBar`** mounts `<SaveIndicator />` in the right-hand metrics row after SCALE.

## Architecture Notes

The hook uses a single module-level subscription inside a top-level `useEffect(, [])` so it lives for the app's lifetime. Two timers are tracked in closure: `timer` (debounce) and `fadeTimer` (idle fade). The subscription's reference-equality check is critical — without it, `undo`/`redo` push new `past`/`future` arrays and would trigger redundant saves of identical state.

Test approach uses Vitest fake timers + `advanceTimersByTimeAsync` with manual `Promise.resolve()` yields to drain the async `saveProject` call between status transitions.

## Test Timing Fix (deviation)

**[Rule 1 - Bug] Fixed debounce test time calculation**
- **Found during:** Task 2 RED run
- **Issue:** The plan-supplied test advanced `DEBOUNCE_MS - 500 - 1` ms hoping to land just before the debounce fire, but each mutation resets the debounce window — so with 5 mutations 100ms apart, the timer fires 2000ms after the *last* mutation (t=2400), not after the first.
- **Fix:** Advance `DEBOUNCE_MS - 101` after the mutation loop (lands at t=2399, just before fire), then +2ms to trigger.
- **Files modified:** `tests/useAutoSave.test.ts`
- **Commit:** 3b835b0

## Verification

- `npx vitest run` — 32 passed (3 todo in unrelated stubs), including all 6 new tests for SAVE-02
- `npx tsc --noEmit --ignoreDeprecations 6.0` — no new errors (pre-existing fabric `data` prop warnings unchanged)
- Manual browser verification pending (see 01-VALIDATION.md Manual-Only: save indicator fade animation)

## Phase 1 Completion

All phase 1 requirements closed: EDIT-06 (wall dim editing), EDIT-07 (drag-drop), EDIT-08 (rotation handle), EDIT-09 (product images), SAVE-02 (auto-save). Ready for `/gsd:verify-work` + phase transition.

## Self-Check: PASSED
- src/stores/projectStore.ts FOUND
- src/hooks/useAutoSave.ts FOUND
- src/components/SaveIndicator.tsx FOUND
- All commits exist: 37c27c2, abd5019, 3b835b0, 9caf49c, 3bebcdb, 2636205
