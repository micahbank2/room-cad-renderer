---
phase: 28-auto-save
plan: 02
subsystem: auto-save
tags: [auto-save, zustand, indexeddb, error-handling, rename]

# Dependency graph
requires:
  - phase: 28-auto-save
    plan: 01
    provides: 6 red useAutoSave test stubs (rename, ui-store-no-trigger, save-failure, no-fade, subsequent-success, drag-one-save)
  - phase: 25-canvas-store-performance
    provides: drag fast-path invariant (store commits only at drag-end) making 2s debounce safe
provides:
  - Extended SaveStatus union with "failed" variant (SAVE-06)
  - Hardened useAutoSave with try/catch error path (SAVE-06)
  - Rename trigger via second useProjectStore.subscribe (SAVE-05 D-05)
  - SAVE_FAILED render branch in SaveIndicator using text-error
affects: [28-03, 28-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared debounced save helper (triggerDebouncedSave closure) consumed by two Zustand subscribers"
    - "Rename subscriber gated on prevState.activeId === state.activeId && state.activeId !== null (Pitfall 3 guard against null→id hydration triggering a save)"
    - "Failure path intentionally skips fadeTimer reschedule — SAVE_FAILED persists until next success (D-04a)"

key-files:
  created: []
  modified:
    - src/stores/projectStore.ts
    - src/components/SaveIndicator.tsx
    - src/hooks/useAutoSave.ts

key-decisions:
  - "Two subscribers (CAD + project) share a single triggerDebouncedSave() closure — one debounce timer/fade timer pair across both trigger sources; preserves SAVE-05 drag-one-save invariant even if a rename lands mid-drag"
  - "Failure path clears fadeTimer BEFORE setSaveStatus('failed') so an in-flight fade from a previous successful save cannot race to idle and mask the error"
  - "No useUIStore import — D-05b hard rule; ui-store mutations (tool, selection, grid, gridSnap) are session state, not scene data"
  - "CAD subscribe filter slice list unchanged (rooms / activeRoomId / customElements) — Phase 25 drag fast-path preserved verbatim"

requirements-completed: [SAVE-05, SAVE-06]

# Metrics
duration: 1min
completed: 2026-04-20
---

# Phase 28 Plan 02: Auto-Save Hardening Summary

**Extends useAutoSave with a SAVE_FAILED path and a rename trigger; turns Plan 01's 4 red stubs green without touching the Phase 25 drag fast-path filter.**

## Performance

- **Duration:** ~1 min (58s)
- **Started:** 2026-04-20T20:08:34Z
- **Completed:** 2026-04-20T20:09:32Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `SaveStatus` union extended to 4 members (`"idle" | "saving" | "saved" | "failed"`) — type-only change, no runtime behavior alteration for existing callers
- `SaveIndicator` gains a third render branch: `status === "failed"` → `<span>SAVE_FAILED</span>` with `text-error` color, uppercase_underscore label matching the obsidian CAD theme
- `useAutoSave` refactored (not rewritten — closure structure preserved per D-01) into a shared `triggerDebouncedSave()` helper consumed by two `*.subscribe` listeners:
  - Subscriber 1 (CAD): filter slice list **unchanged** — guards Phase 25 drag fast-path
  - Subscriber 2 (project): gated on `prevState.activeId === state.activeId && state.activeId !== null` — prevents Pitfall 3 (hydration false-positive) and project-switch bleed
- `saveProject` awaited inside `try/catch`; on reject → `console.error` (D-04b) + `setSaveStatus("failed")` + `clearTimeout(fadeTimer)`, with deliberate NO fade reschedule (D-04a)
- All 6 Phase 28 red stubs from Plan 01 Task 2 now PASS; 3 existing pre-Phase-28 tests still pass; combined `9/9` in `tests/useAutoSave.test.ts`

## Task Commits

1. **Task 1: Extend SaveStatus + SaveIndicator branch** — `8435399` (feat)
2. **Task 2: Harden useAutoSave — try/catch + rename trigger** — `cca34a6` (feat)

**Plan metadata:** this commit — docs + STATE + ROADMAP

## Files Modified

- `src/stores/projectStore.ts` — 1 line: `SaveStatus` union extended to include `"failed"`. `setSaveStatus` signature propagates automatically.
- `src/components/SaveIndicator.tsx` — +10 lines: new `if (status === "failed")` branch inserted after the `"idle"` null-return and before the `"saving"` branch. Uses `text-error` (existing token per `src/index.css`), `font-mono`, `text-[9px]`, `tracking-widest` — matches existing branches verbatim.
- `src/hooks/useAutoSave.ts` — refactored body into `triggerDebouncedSave()` closure helper + 2 subscribers + try/catch. Closure structure, debounce/fade timer pattern, and exported constants (`DEBOUNCE_MS`, `FADE_MS`) all preserved. +47/-25 lines.

## Test Results

Before Plan 02: `5 passed | 4 failed (9)` in `tests/useAutoSave.test.ts`
After Plan 02: `9 passed (9)` — all red stubs green, all pre-existing tests still pass.

Command: `npx vitest run tests/useAutoSave.test.ts --reporter=dot` → exit 0.

## Decisions Made

- **Shared timer across both subscribers, not per-subscriber** — one `timer` and `fadeTimer` pair lives in the outer closure; both subscribers call the same `triggerDebouncedSave()`. This guarantees the SAVE-05 invariant ("drag produces exactly one save") even in the edge case where Jessica renames the project mid-drag — the rename trigger collapses into the same debounce window rather than firing a second save.
- **Clear fadeTimer BEFORE setting `"failed"`** — if a previous successful save scheduled a fade to `"idle"` and then a later save fails, we must kill the pending fade first. Otherwise the fade could win the race and flip `"failed" → "idle"` silently, defeating D-04a (SAVE_FAILED must persist).
- **Rename-subscriber gate: triple condition** — (1) name actually changed, (2) activeId non-null, (3) activeId stable across the transition. Without (2), `clearActive()` would fire a save on teardown. Without (3), the `null→string` hydration that Plan 03 will add for silent-restore would trigger a spurious save on app launch. The test suite's `setActive("proj_existing", "A")` step implicitly validates condition (3): setActive alone must NOT fire a save (activeId changed from null → "proj_existing"), but the follow-up `setActiveName("B")` must.
- **No behavior changes in the happy path** — existing 3 pre-Phase-28 tests (`debounce`, `auto-create`, `status transitions idle→saving→saved→idle`) all still pass unmodified. The refactor is additive: it extends the hook, doesn't reshape its contract.

## Phase 25 Invariants Preserved

Grep evidence:
- `grep -c "rooms === prevState.rooms" src/hooks/useAutoSave.ts` → `1` (CAD filter intact)
- `grep -c "customElements" src/hooks/useAutoSave.ts` → `3` (customElements prev/next compare + write-through in save payload)
- `grep -n "useUIStore" src/hooks/useAutoSave.ts` → no matches (D-05b hard rule, no ui-store watching)

## Deviations from Plan

None — plan executed exactly as written. The `<action>` block in the plan provided the target shape verbatim; implementation matches it line-for-line.

## Issues Encountered

None. Task 1 TypeScript check surfaced a pre-existing `tsconfig.json` deprecation warning for `baseUrl` (TS 7.0 compat) — unrelated to this plan, not caused by these changes, no new errors introduced.

## Next Phase Readiness

- **Plan 28-03 (Silent Restore) unblocked** — the `"failed"` SaveStatus and hardened save path give Plan 03 a stable ground state: on app launch the silent-restore hook can call `loadProject(id)` without worrying about a concurrent save causing a state-machine surprise; any subsequent save failure lands cleanly on `SAVE_FAILED` without masking the restore outcome.
- **Plan 28-04 (Manual smoke verification) unblocked** — the four verification scenarios in `28-RESEARCH.md § Sampling Rate` (wall draw → SAVING→SAVED, drag 3s → 1 save, rename → SAVING→SAVED, simulated QuotaExceeded → SAVE_FAILED persists) all have their code paths wired.
- **No blockers.** SAVE-05 and SAVE-06 fully satisfied at the hook + store + indicator level; remaining SAVE-06 surface (silent restore on mount) is Plan 03's scope.

## Self-Check: PASSED

Files verified present:
- `src/stores/projectStore.ts` — FOUND (contains `"failed"`)
- `src/components/SaveIndicator.tsx` — FOUND (contains `SAVE_FAILED`, `status === "failed"`, `text-error`)
- `src/hooks/useAutoSave.ts` — FOUND (contains `useProjectStore.subscribe`, `try {`, `setSaveStatus("failed")`, `console.error`, `prevState.activeId !== state.activeId`, `state.activeId === null`)

Commits verified:
- `8435399` — feat(28-02): add failed SaveStatus variant with SAVE_FAILED indicator — FOUND
- `cca34a6` — feat(28-02): harden useAutoSave with try/catch and rename trigger — FOUND

Tests verified:
- `npx vitest run tests/useAutoSave.test.ts --reporter=dot` → `9 passed (9)` — all Plan 01 red stubs now green, all pre-existing tests preserved.

Acceptance criteria verified:
- `src/stores/projectStore.ts` contains `"failed"` — YES
- `src/components/SaveIndicator.tsx` contains `SAVE_FAILED`, `status === "failed"`, `text-error` — YES (all three)
- `src/hooks/useAutoSave.ts` contains all required strings — YES
- `src/hooks/useAutoSave.ts` does NOT contain `useUIStore` — CONFIRMED (grep empty)
- `npx tsc --noEmit` clean (only pre-existing baseUrl warning) — YES

---
*Phase: 28-auto-save*
*Completed: 2026-04-20*
