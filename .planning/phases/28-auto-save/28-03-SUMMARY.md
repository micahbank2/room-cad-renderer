---
phase: 28-auto-save
plan: 03
subsystem: auto-save
tags: [auto-save, silent-restore, indexeddb, idb-keyval, app-mount]

# Dependency graph
requires:
  - phase: 28-auto-save
    plan: 01
    provides: 4 red App.restore test stubs (valid pointer, no pointer, stale pointer, loadProject throws)
  - phase: 28-auto-save
    plan: 02
    provides: hardened useAutoSave with try/catch — pointer write can fail inside the same catch
provides:
  - LAST_PROJECT_KEY constant + setLastProjectId / getLastProjectId helpers in serialization (D-02b)
  - Pointer write at single site (useAutoSave success path) (D-02b)
  - Mount-time silent-restore effect in App.tsx (D-02 + D-02a fallback) — replaces broken listProjects-based hydration
  - Completes SAVE-05 success criterion #3 "Reloading the page restores the scene exactly as left"
affects: [28-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single pointer write site (inside useAutoSave try block) = single source of truth"
    - "Silent restore effect mirrors existing App.tsx useEffect cancellation pattern (cancelled flag, IIFE body)"
    - "Pointer normalization: getLastProjectId returns id | null, never undefined"

key-files:
  created: []
  modified:
    - src/lib/serialization.ts
    - src/hooks/useAutoSave.ts
    - src/App.tsx
    - tests/useAutoSave.test.ts
    - tests/App.restore.test.tsx

key-decisions:
  - "Pointer written inside useAutoSave try block, not in projectStore.setActive — single write site avoids sync bugs between pointer and save state"
  - "Pointer write failure surfaces as SAVE_FAILED — a successful project write with a broken pointer is user-visible failure (reload won't restore)"
  - "App.tsx loadSnapshot during restore intentionally fires CAD subscriber (Pitfall 4 Option 1) — accepted behavior, idempotent re-save 2s later, no hydrating flag added"
  - "getLastProjectId helper (not raw idb-keyval get) used at read site for testability — test mock substitutes a stub that delegates to the idb-keyval mock"

requirements-completed: [SAVE-05]

# Metrics
duration: 2m26s
completed: 2026-04-20
---

# Phase 28 Plan 03: Silent Restore Summary

**Pointer-based silent restore on app mount: Jessica reloads → lands back in her last-active project. Replaces broken listProjects-based hydration; completes SAVE-05 reload-restore.**

## Performance

- **Duration:** 2m26s (146s)
- **Started:** 2026-04-20T20:11:32Z
- **Completed:** 2026-04-20T20:13:58Z
- **Tasks:** 3
- **Files modified:** 5 (3 source + 2 test mock updates)

## Accomplishments

- `serialization.ts` gains `LAST_PROJECT_KEY = "room-cad-last-project"` + two helpers:
  - `setLastProjectId(id)` — persists pointer via `idb-keyval.set`
  - `getLastProjectId()` — returns id | null (normalizes undefined → null)
- `useAutoSave` writes the pointer exactly once per successful save:
  - Inside try block, after `saveProject` resolves, before `setSaveStatus("saved")`
  - Pointer write failure is caught by the same try/catch → status transitions to `"failed"` (correct: pointer/save divergence is user-visible)
- `App.tsx` silent-restore effect replaces the broken listProjects hydration:
  - `getLastProjectId` → `loadProject(id)` → `loadSnapshot` + `setActive` + `setHasStarted(true)`
  - No pointer OR stale pointer OR throw → falls through to WelcomeScreen (D-02a)
  - Preserves cancellation-on-unmount pattern
- All 4 red stubs in `tests/App.restore.test.tsx` now PASS:
  - valid pointer → loads + skips WelcomeScreen
  - no pointer → WelcomeScreen
  - stale pointer (loadProject → null) → WelcomeScreen, loadProject called with pointer id
  - loadProject throws → WelcomeScreen, no unhandled rejection

## Task Commits

1. **Task 1: LAST_PROJECT_KEY + pointer helpers in serialization** — `aadedd0` (feat)
2. **Task 2: Pointer write in useAutoSave success path** — `06ecd99` (feat)
3. **Task 3: App.tsx pointer-based silent restore** — `229438a` (feat)

## Files Modified

- `src/lib/serialization.ts` — +11 lines: `LAST_PROJECT_KEY`, `setLastProjectId`, `getLastProjectId`. Existing CRUD untouched.
- `src/hooks/useAutoSave.ts` — +5 lines: `setLastProjectId` import + `await setLastProjectId(id)` inside try block between `saveProject` and `setSaveStatus("saved")`. Comment anchors D-02b.
- `src/App.tsx` — replaced 11-line hydration block with 22-line silent-restore effect. Swapped `listProjects` import for `getLastProjectId`/`loadProject`. Added `setHasStarted(true)` on success (the missing behavior that made the prior hydration a no-op for UX).
- `tests/useAutoSave.test.ts` — added `setLastProjectId` to the `@/lib/serialization` mock (Rule 3 blocker fix; without it all rejection-path tests broke because the mock's `setLastProjectId` was undefined and threw before reaching the try/catch's success half).
- `tests/App.restore.test.tsx` — updated the `@/lib/serialization` mock to include `setLastProjectId` (vi.fn resolve) and `getLastProjectId` (delegates to `idb-keyval.get` mock, preserving the tests' original control surface).

## Test Results

| Suite | Before | After |
|-------|--------|-------|
| `tests/useAutoSave.test.ts` | 9/9 (Plan 02) | 9/9 |
| `tests/App.restore.test.tsx` | 0/4 (red stubs) | **4/4** |
| Full suite | 201 pass / 6 pre-existing fail / 3 todo | **201 pass / 6 pre-existing fail / 3 todo** |

Command: `npx vitest run --reporter=dot` — 201 passed, 6 failed (unrelated: AddProductModal LIB-04, SidebarProductPicker LIB-05, productStore LIB-03), 3 todo. Verified failures are pre-existing by re-running failing files with Plan 03 changes stashed — same 6 failures with or without the Phase 28 work.

## Decisions Made

- **Single pointer write site (useAutoSave only)** — Open Question 1 from 28-RESEARCH.md resolved: write on every successful save, nowhere else. `projectStore.setActive` is called from many code paths (ProjectManager open, auto-create on first edit, silent-restore itself); writing the pointer there would require guards against the silent-restore's own `setActive` call. Keeping it in the save path means the pointer is ALWAYS consistent with what's actually on disk.
- **Pointer failure = SAVE_FAILED** — The pointer write sits INSIDE the try block between `saveProject` and `setSaveStatus("saved")`. If `setLastProjectId` rejects (IDB full, transaction closed), the save is partial from Jessica's perspective (reload won't land her back). Correct to surface as SAVE_FAILED rather than silently succeed.
- **Accept Pitfall 4 (loadSnapshot fires CAD subscriber)** — When silent restore calls `loadSnapshot`, the existing CAD subscriber filter fires and schedules a 2s-debounced re-save of the data that was just loaded. Per 28-RESEARCH.md § Pitfall 4 Option 1: acceptable (idempotent), no hydrating flag added. Keeps the code minimal and avoids edge cases where the flag gets stuck.
- **Helper-based read site in App.tsx, not raw idb-keyval `get`** — Using `getLastProjectId()` rather than inline `get("room-cad-last-project")` centralizes the pointer-key string in one file and makes the read-site testable via a simple serialization mock. Test file's `@/lib/serialization` mock delegates `getLastProjectId` to the `idb-keyval.get` mock so the test's pointer-control surface is preserved.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `@/lib/serialization` mock in tests/useAutoSave.test.ts missing setLastProjectId**
- **Found during:** Task 2 verification.
- **Issue:** Adding `setLastProjectId` to the `useAutoSave` import (per plan) caused the test's vi.mock to fail with `No "setLastProjectId" export is defined on the "@/lib/serialization" mock`. 2 of 9 tests failed (status transitions, subsequent success clears failed).
- **Fix:** Added `setLastProjectId: vi.fn().mockResolvedValue(undefined)` to the mock object in tests/useAutoSave.test.ts.
- **Commit:** `06ecd99`

**2. [Rule 3 - Blocking] `@/lib/serialization` mock in tests/App.restore.test.tsx missing getLastProjectId**
- **Found during:** Task 3 verification.
- **Issue:** App.tsx now reads the pointer via `getLastProjectId()` (not raw `idb-keyval.get`). The Plan 01 test stubs mock `@/lib/serialization` without `getLastProjectId`, so the import returned undefined at App mount. 2 of 4 restore tests failed.
- **Fix:** Replaced the flat mock with an async factory that imports `idb-keyval` and provides `getLastProjectId: vi.fn(async () => (await idb.get("room-cad-last-project")) ?? null)`. This preserves each test's ability to control the pointer via `vi.mocked(get).mockResolvedValueOnce(...)`.
- **Commit:** `229438a`

Neither fix changes test intent — both just wire the test mocks to match the new module surface.

## Deferred Issues

### tests/App.restore.test.tsx — WainscotLibrary unhandled render error
Pre-existing test mock bug (Plan 01 stubbed `useWainscotStyleStore` as `{ styles: [] }` but `WainscotLibrary.tsx:167` reads `items.length`). The error is an uncaught exception during App render on the valid-pointer path but does NOT affect test assertions — all 4 restore tests pass. Logged in `.planning/phases/28-auto-save/deferred-items.md` for a future test-infra pass.

## Issues Encountered

None that needed resolution beyond the two auto-fixes above. Pre-existing baseUrl warning (`tsconfig.json`) remains — unrelated to this plan.

## Next Phase Readiness

- **Plan 28-04 (Manual smoke verification) unblocked** — all 4 SAVE-05 / SAVE-06 verification scenarios have their code paths wired end-to-end:
  - (a) Draw wall → SAVING → SAVED (Plan 01/02)
  - (b) Drag product 3s → exactly 1 save at drag-end (Plan 01/02 + Phase 25 invariants)
  - (c) Hard refresh → scene returns identical ← **this plan closes the loop**
  - (d) Rename project → SAVING → SAVED (Plan 02)
- **No blockers.** Phase 28 core loop complete: debounced save → pointer write → silent restore → WelcomeScreen fallback on any failure.
- **Phase 28 red stubs:** 10/10 green. 6 useAutoSave (Plan 02) + 4 App.restore (this plan).

## Self-Check: PASSED

Files verified present:
- `src/lib/serialization.ts` — FOUND (contains `LAST_PROJECT_KEY`, `setLastProjectId`, `getLastProjectId`, `"room-cad-last-project"`)
- `src/hooks/useAutoSave.ts` — FOUND (contains `setLastProjectId`, `await setLastProjectId(id)` inside try block)
- `src/App.tsx` — FOUND (contains `getLastProjectId`, `setHasStarted(true)`, `cancelled = true`, `D-02a`; does NOT contain `listProjects`)

Commits verified:
- `aadedd0` — feat(28-03): add LAST_PROJECT_KEY + pointer helpers in serialization — FOUND
- `06ecd99` — feat(28-03): write last-project pointer after successful save — FOUND
- `229438a` — feat(28-03): replace App.tsx hydration with pointer-based silent restore — FOUND

Tests verified:
- `npx vitest run tests/App.restore.test.tsx --reporter=dot` → 4/4 PASS
- `npx vitest run tests/useAutoSave.test.ts --reporter=dot` → 9/9 PASS
- `npx vitest run --reporter=dot` (full suite) → 201 pass / 6 pre-existing fail / 3 todo

Acceptance criteria verified:
- LAST_PROJECT_KEY = "room-cad-last-project" exported — YES
- setLastProjectId / getLastProjectId helpers exported — YES
- useAutoSave writes pointer after every successful save inside try block — YES
- App.tsx hydration replaced: pointer → loadProject → hydrate + setHasStarted(true); fallback → WelcomeScreen — YES
- All 10 Phase 28 test stubs (6 useAutoSave + 4 App.restore) now PASS — YES
- `npx tsc --noEmit` clean (only pre-existing baseUrl warning) — YES

---
*Phase: 28-auto-save*
*Completed: 2026-04-20*
