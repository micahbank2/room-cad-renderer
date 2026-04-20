---
phase: 25-canvas-store-performance
plan: 01
subsystem: state-management
tags: [perf, structuredClone, immer, zustand, snapshot, undo-redo]

# Dependency graph
requires:
  - phase: 25-canvas-store-performance
    provides: Wave 0 migration-gate test "snapshot uses structuredClone" (RED) to flip GREEN
provides:
  - snapshot() using structuredClone for three deep slices (rooms, customElements, customPaints)
  - toPlain() helper that normalizes Immer drafts via current() before cloning
  - Dev-gated snapshot timing that logs only when a single clone exceeds 2ms
affects: [25-02-wave2-drag-fast-path, 25-03-wave3-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Use Immer current() + isDraft() to unwrap draft Proxies before structuredClone — avoids DataCloneError when cloning inside produce() callbacks"
    - "Dev-only performance sampling gated by import.meta.env.DEV with > 2ms threshold — zero prod overhead via Vite tree-shaking"

key-files:
  created: []
  modified:
    - src/stores/cadStore.ts

key-decisions:
  - "D-07 honored: only the three snapshot() slices (rooms, customElements, customPaints) migrated; copyWallSide 4 JSON calls and App.tsx 5 JSON calls intentionally untouched"
  - "D-08 honored: snapshot still produces an independent deep copy — shape unchanged, only the clone mechanism swapped"
  - "D-09 honored: dev-gated performance.now() timing with sampled logging (>2ms threshold) replaces per-call console.time to avoid spam on trivial states"
  - "Immer-draft compatibility: added toPlain() helper with isDraft/current — the plan's literal snippet threw DataCloneError because pushHistory runs inside produce() where state.rooms is a Proxy. current() returns a plain snapshot; the shape and semantics of snapshot() are unchanged"

requirements-completed: []  # PERF-02 flips complete in Wave 3 after evidence bundle; Wave 1 just lands the code

# Metrics
duration: 3min
completed: 2026-04-20
---

# Phase 25 Plan 01: Wave 1 structuredClone Migration Summary

**Migrated `cadStore.snapshot()` from three `JSON.parse(JSON.stringify(...))` calls to `structuredClone(...)` with Immer-draft normalization and dev-gated > 2 ms timing sampler — Wave 0's "snapshot uses structuredClone" RED test flips GREEN, all undo/redo semantics byte-for-byte identical.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-20T03:03:45Z
- **Completed:** 2026-04-20T03:06Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- `snapshot()` in `src/stores/cadStore.ts` rewritten to use `structuredClone(toPlain(...))` for the three deep slices: `state.rooms`, `root.customElements`, `root.customPaints`. `recentPaints` spread kept unchanged (D-07 scope).
- `toPlain()` helper added: calls `current(value)` if `isDraft(value)` returns true, else passes value through. Required because `pushHistory` runs inside `produce()` callbacks where slices are Proxy drafts that `structuredClone` cannot clone (throws `DataCloneError`).
- Dev-gated timing block added: `t0 = performance.now()` at entry, `dt = performance.now() - t0` at exit, `console.log("[cadStore] snapshot N.NNms")` only when `dt > 2`. Both branches gated by `import.meta.env.DEV` so Vite tree-shakes the entire block in prod builds.
- Import statement extended: `import { produce, current, isDraft } from "immer"` (added `current` and `isDraft` alongside existing `produce`).

## Exact Diff — snapshot() body

**Before (src/stores/cadStore.ts:98-114):**
```typescript
function snapshot(state: CADState): CADSnapshot {
  const root = state as any;
  return {
    version: 2,
    rooms: JSON.parse(JSON.stringify(state.rooms)),
    activeRoomId: state.activeRoomId,
    ...(root.customElements
      ? { customElements: JSON.parse(JSON.stringify(root.customElements)) }
      : {}),
    ...(root.customPaints
      ? { customPaints: JSON.parse(JSON.stringify(root.customPaints)) }
      : {}),
    ...(root.recentPaints
      ? { recentPaints: [...root.recentPaints] }
      : {}),
  };
}
```

**After:**
```typescript
function toPlain<T>(value: T): T {
  return isDraft(value) ? (current(value as object) as T) : value;
}

function snapshot(state: CADState): CADSnapshot {
  const root = state as any;
  const t0 = import.meta.env.DEV ? performance.now() : 0;
  const snap: CADSnapshot = {
    version: 2,
    rooms: structuredClone(toPlain(state.rooms)),
    activeRoomId: state.activeRoomId,
    ...(root.customElements
      ? { customElements: structuredClone(toPlain(root.customElements)) }
      : {}),
    ...(root.customPaints
      ? { customPaints: structuredClone(toPlain(root.customPaints)) }
      : {}),
    ...(root.recentPaints
      ? { recentPaints: [...root.recentPaints] }
      : {}),
  };
  if (import.meta.env.DEV) {
    const dt = performance.now() - t0;
    if (dt > 2) {
      // eslint-disable-next-line no-console
      console.log(`[cadStore] snapshot ${dt.toFixed(2)}ms`);
    }
  }
  return snap;
}
```

## Task Commits

1. **Task 1: structuredClone migration + dev timing** — `a839d4c` (perf)

## Files Created/Modified

- `src/stores/cadStore.ts` — +23 / -5 lines net:
  - Import: `produce` → `produce, current, isDraft` (+1 net)
  - Added `toPlain<T>()` helper (+3 lines)
  - Rewrote `snapshot()` body: 3× `JSON.parse(JSON.stringify(x))` → `structuredClone(toPlain(x))`; added dev-gated timing block (+10 lines)

## Red→Green Transition

| Test | Before Wave 1 | After Wave 1 |
|------|---------------|--------------|
| `tests/cadStore.test.ts` — "snapshot uses structuredClone" | ❌ RED (source contained JSON.parse) | ✅ GREEN (source contains 3× structuredClone, no JSON.parse in snapshot body) |
| `tests/cadStore.test.ts` — "snapshot is independent" | ✅ GREEN | ✅ GREEN (contract preserved) |
| `tests/cadStore.test.ts` — "snapshot preserves all keys" | ✅ GREEN | ✅ GREEN (shape unchanged) |
| `tests/cadStore.test.ts` — "drag produces single history entry" | ✅ GREEN | ✅ GREEN (pushHistory behavior unchanged) |
| `tests/cadStore.test.ts` — "wall drag produces single history entry" | ✅ GREEN | ✅ GREEN |

## Baseline + Delta

| Metric           | Baseline (Wave 0) | After Wave 1 | Delta |
|------------------|-------------------|--------------|-------|
| Total tests      | 185               | 185          | 0     |
| Passing          | 172               | 173          | +1    |
| Failing          | 10                | 9            | -1    |
| Todo             | 3                 | 3            | 0     |

Delta breakdown:
- +1 GREEN: "snapshot uses structuredClone" flipped
- -1 RED: same test removed from failing column
- 6 pre-existing failures unchanged (AddProductModal×3, SidebarProductPicker×2, productStore×1 — all outside Phase 25 footprint)
- 3 remaining REDs are Wave 2 migration gates (fabricSync × 2, toolCleanup × 1)

Bundle verification:
- `npm run build` succeeds
- `grep -r "\[cadStore\] snapshot" dist/` → zero matches
- `grep -r "__cadBench\|__cadSeed" dist/` → zero matches (Vite tree-shook all DEV branches)

## Quick __cadBench Measurement

Not captured in this wave — per plan output spec, this is collected in Wave 3's manual evidence bundle by the operator running `window.__cadBench(100)` against a 50W/30P seeded scene before/after (to compute the ≥2× ratio per D-10). Wave 1 ships the code only; Wave 3 owns the before/after evidence.

## Decisions Made

- **D-07 (scope):** Only the three snapshot() deep slices migrated. Confirmed via grep:
  - `JSON.parse(JSON.stringify` count: was 7, now 4 (the 4 in copyWallSide lines 820, 827, 834, 844 untouched)
  - `structuredClone(` count: 3 (exactly one each for rooms, customElements, customPaints)
  - `src/App.tsx` 5 JSON calls untouched per D-07 file scope
- **D-08 (keep clone semantics):** snapshot still returns an independent deep copy; the Wave 0 "snapshot is independent" + "snapshot preserves all keys" GREEN tests both still pass. Shape and keys byte-for-byte identical.
- **D-09 (dev-gated timing):** Used `performance.now()` with a `> 2ms` threshold and sampled `console.log` (not `console.time`) — per the plan's discretion grant and Pitfall 3 discussion in research. Stripped from prod via `import.meta.env.DEV` gate, verified zero matches in dist/.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Immer draft Proxies break structuredClone**
- **Found during:** First test run after applying the plan's literal replacement snippet.
- **Issue:** `structuredClone(state.rooms)` threw `DataCloneError: #<Object> could not be cloned` on every history-pushing action. Reason: `snapshot()` is called from `pushHistory(s)`, which runs inside Immer's `produce((s: CADState) => { ... })` callback. Inside produce, `state.rooms` (and every other slice on `s`) is a Proxy-wrapped draft, not a plain object. `JSON.parse(JSON.stringify(proxy))` silently serializes via the proxy's get trap and returns a plain object — but `structuredClone` inspects the object type directly and rejects the Proxy. The research document's Pitfall 3 warned about unsupported types (functions, DOM nodes, Symbols) but missed the Immer-draft case entirely.
- **Fix:** Added a `toPlain<T>(value: T)` helper that uses Immer's `current()` to unwrap drafts (returns a plain snapshot), and passes the result into `structuredClone`. Guarded with `isDraft(value)` so direct (non-draft) calls to `snapshot()` are a zero-overhead pass-through. This preserves every semantics the plan locked: the output is still an independent deep copy, keys are still identical, and `pushHistory` behavior is byte-for-byte unchanged.
- **Files modified:** `src/stores/cadStore.ts` (import line + new `toPlain` helper + 3 call sites wrapped).
- **Verification:** `npm test -- tests/cadStore.test.ts` went from 13 RED / 1 GREEN / 3 todo to 14 GREEN / 3 todo. All Wave 0 snapshot + drag-history contracts pass. Full suite at 173 passing (was 172) — exactly +1, the structuredClone test flip.
- **Committed in:** `a839d4c`
- **Impact on plan:** Zero — acceptance criteria still met grep-for-grep (3 structuredClone calls, 4 remaining JSON.parse in copyWallSide, timing prefix present, DEV gates ×2). The plan's snippet was 95% correct; the missing 5% is a well-known Immer idiom.

### Auth Gates

None.

## Acceptance Criteria — Final Check

- [x] `grep -c "JSON.parse(JSON.stringify" src/stores/cadStore.ts` = **4** (was 7; 3 fewer, all 4 in copyWallSide at lines 820/827/834/844)
- [x] `grep -c "structuredClone(" src/stores/cadStore.ts` = **3** (one each for rooms, customElements, customPaints)
- [x] `src/stores/cadStore.ts` contains literal string ``"`[cadStore] snapshot "`` (grep-stable)
- [x] `src/stores/cadStore.ts` snapshot() body contains `import.meta.env.DEV` twice (t0 gate + log gate)
- [x] `npm test -- tests/cadStore.test.ts -t "snapshot uses structuredClone"` exits 0 (was RED)
- [x] `npm test -- tests/cadStore.test.ts -t "snapshot is independent"` exits 0
- [x] `npm test -- tests/cadStore.test.ts -t "snapshot preserves all keys"` exits 0
- [x] `npm test -- tests/cadStore.test.ts -t "drag produces single history entry"` exits 0
- [x] `npm test -- tests/cadStore.test.ts -t "wall drag produces single history entry"` exits 0
- [x] Full suite: 168 pre-existing passing preserved (173 passing = 168 + 4 Wave 0 greens + 1 new Wave 1 green)
- [x] `npm run build` succeeds
- [x] Prod bundle free of dev-only timing strings (`grep -r "cadStore] snapshot" dist/` = 0)

## Issues Encountered

- None beyond the one Rule 3 deviation documented above.

## Known Stubs

- None. The implementation is complete and production-ready. Both branches (DEV and prod) are functional; DEV adds a non-blocking perf sampler, prod gets a pure `structuredClone` path with zero instrumentation overhead.

## Next Phase Readiness

- **Wave 2 (drag fast path):** Blocked on this landing; now unblocked. The 3 Wave 0 REDs (fabricSync × 2, toolCleanup × 1) will flip in Wave 2.
- **Wave 3 (verification):** Code for PERF-02 is landed. Wave 3 captures `window.__cadBench(100)` before/after measurements for the ≥2× ratio evidence per D-10. The dev instrumentation (`[cadStore] snapshot Xms` logs when > 2ms) gives an additional telemetry surface during Jessica-style usage.

---

## Self-Check: PASSED

File existence:
- `src/stores/cadStore.ts` — FOUND
  - Contains `structuredClone(` (3 occurrences inside snapshot body)
  - Contains `[cadStore] snapshot ` (log prefix)
  - Contains `import.meta.env.DEV` (2 occurrences in snapshot + 1 in dev helpers block = 3 total)
  - Contains `toPlain` helper
  - Contains `import { produce, current, isDraft } from "immer"`
  - Does NOT contain `JSON.parse(JSON.stringify` in snapshot body (only in copyWallSide, 4 occurrences, all intentional per D-07)

Commits:
- `a839d4c` — Task 1 perf commit — VERIFIED in `git log --oneline -5`

Baseline preservation:
- Pre-existing 168 passing tests still pass — VERIFIED (173 passing = 168 pre + 4 Wave 0 greens + 1 new Wave 1 green from structuredClone flip)
- Pre-existing 6 failures unchanged — VERIFIED (same test set: AddProductModal, SidebarProductPicker, productStore)
- 3 todo unchanged — VERIFIED

Bundle hygiene:
- `npm run build` succeeds — VERIFIED
- `grep -r "cadStore] snapshot\|__cadBench\|__cadSeed" dist/` → zero matches — VERIFIED

---
*Phase: 25-canvas-store-performance*
*Completed: 2026-04-20*
