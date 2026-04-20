# Phase 25 — Canvas & Store Performance · VERIFICATION

**Status:** IN PROGRESS — awaiting human-in-the-loop evidence capture (Wave 3 Task 2)
**Verifier:** Human-in-the-loop (Micah)
**Started:** 2026-04-20

> This file is a stub. All `<TBD>` placeholders are filled by the continuation agent
> after the user supplies the bench numbers, Chrome trace, regression summary, and
> single-undo smoke results from the Wave 3 Task 2 checkpoint.

---

## ROADMAP Success Criteria Matrix

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | 60fps drag at 50W/30P (no frame > 16.7ms) | ⬜ TBD | Chrome trace, `<N>` frames over budget |
| 2 | structuredClone replaces every JSON.parse(JSON.stringify) in snapshot() | ✅ | `grep -c "JSON.parse" src/stores/cadStore.ts` body of snapshot() = 0 (Wave 1, commit `a839d4c`) |
| 3 | Snapshot ≥ 2x faster at 50W/30P | ⬜ TBD | ratio = `<BEFORE_MEAN>` / `<AFTER_MEAN>` = `<R>×` |
| 4 | Undo/redo single history entry per drag | ✅ | Wave 0 contract tests GREEN: `tests/cadStore.test.ts -t "drag produces single history entry"` + `"wall drag produces single history entry"` ; smoke pending |
| 5 | All tests pass with identical visual output | ⬜ TBD | npm test summary line pending — baseline = 168 pre-existing passing preserved + 4 Wave 0 greens + 1 Wave 1 green + 3 Wave 2 greens = 176 expected |

---

## PERF-02 — Snapshot Benchmark

> Source helpers (installed in Wave 0, commit `b7eca09`):
> - `window.__cadSeed(50, 30)` — seeds 50 walls + 30 placed products into the active room, resets past/future
> - `window.__cadBench(100)` — runs 100 snapshot() calls, logs `[__cadBench] n=100 mean=X.XXms p95=Y.YYms`, returns `{ mean, p95, samples }`

### BEFORE (JSON.parse(JSON.stringify) — pre-Wave-1)

| Field | Value |
|-------|-------|
| Captured | `<TBD>` |
| Machine | `<Micah's M-series Mac>` |
| Commit checked out | `b7eca09` (last commit before Wave 1 structuredClone landed; `__cadSeed` + `__cadBench` already installed) |
| Seed call | `window.__cadSeed(50, 30)` → `{walls: 50, products: 30}` |
| Runs | 3× `window.__cadBench(100)` |
| Reporting | median of 3 runs |

| Run | Mean (ms) | p95 (ms) |
|-----|-----------|----------|
| 1   | `<TBD>`   | `<TBD>`  |
| 2   | `<TBD>`   | `<TBD>`  |
| 3   | `<TBD>`   | `<TBD>`  |
| **Median** | **`<TBD>`** | **`<TBD>`** |

### AFTER (structuredClone — current branch HEAD)

| Field | Value |
|-------|-------|
| Captured | `<TBD>` |
| Machine | `<Micah's M-series Mac>` |
| Commit checked out | current branch HEAD (Wave 1 + Wave 2 landed) |
| Seed call | `window.__cadSeed(50, 30)` → `{walls: 50, products: 30}` |
| Runs | 3× `window.__cadBench(100)` |
| Reporting | median of 3 runs |

| Run | Mean (ms) | p95 (ms) |
|-----|-----------|----------|
| 1   | `<TBD>`   | `<TBD>`  |
| 2   | `<TBD>`   | `<TBD>`  |
| 3   | `<TBD>`   | `<TBD>`  |
| **Median** | **`<TBD>`** | **`<TBD>`** |

### Ratio

```
mean ratio = BEFORE_median_mean / AFTER_median_mean = <TBD> / <TBD> = <R>×
```

Target: ≥ 2.0× — **`<TBD: PASS/FAIL>`**

---

## PERF-01 — Drag Performance Trace

| Field | Value |
|-------|-------|
| Scene | `window.__cadSeed(50, 30)` → 50 walls, 30 products |
| Gesture | Product drag across canvas, ~5 seconds, smooth motion |
| Trace artifact | `25-perf-trace.png` (saved to `.planning/phases/25-canvas-store-performance/`) |
| Frames > 16.7ms in dragging region | `<TBD>` |
| Target | 0 — **`<TBD: PASS/FAIL>`** |

![Performance trace](./25-perf-trace.png)

---

## Regression Confirmation

`npm test` output:

```
<TBD: paste npm test summary line here>
```

Baseline: 168 passing / 6 pre-existing failing / 3 todo (locked since Phase 24).
Phase 25 deltas (already booked through Wave 0/1/2):
- Wave 0: +4 GREEN (independence, preserves-keys, product-drag-single-entry, wall-drag-single-entry); +4 RED migration gates
- Wave 1: +1 GREEN (structuredClone), -1 RED
- Wave 2: +3 GREEN (renderOnAddRemove, fast-path no-clear, drag-interrupt revert); -3 RED

Expected Wave 3 baseline: **176 passing / 6 pre-existing failing / 3 todo**.

---

## Single-History-Entry Smoke (Wave 3 Task 2 Part D)

| Scenario | Expected | Result |
|----------|----------|--------|
| Drag a product → release → Ctrl+Z | Returns to pre-drag position in ONE undo step | `<TBD>` |
| Drag a wall endpoint → release → Ctrl+Z | Endpoint returns in ONE undo step | `<TBD>` |
| Rotate a product via handle → release → Ctrl+Z | Angle returns in ONE undo step | `<TBD>` |
| Start drag → press `W` mid-drag | Snap-back to pre-drag, NOTHING to undo | `<TBD>` |

---

## Out-of-Scope Confirmation

Per D-07, these `JSON.parse(JSON.stringify)` calls were INTENTIONALLY left in place
and are NOT regressions:

| Path | Lines (approx) | Count | Reason |
|------|----------------|-------|--------|
| `src/stores/cadStore.ts` `copyWallSide` | 820, 827, 834, 844 | 4 | Single user-action path, not hot path; out of PERF-02 scope |
| `src/App.tsx` clone calls | 144, 145, 176-178 | 5 | Outside `cadStore.ts` and outside PERF-02 scope per D-07 |

**Total intentional remaining:** 9 (`grep -rc "JSON.parse(JSON.stringify" src/` should equal 9 across these two files).

---

## Decisions Honored

| ID | Description | Status |
|----|-------------|--------|
| D-01 | Drag-only fast path (not object pool) | ✅ Wave 2 |
| D-02 | renderOnAddRemove: false at FabricCanvas init | ✅ Wave 2 (commit `10622c9`) |
| D-03 | 4 drag types: product move, wall move, wall endpoint, product rotation | ✅ Wave 2 (commit `fa6233f`) |
| D-04 | Non-moving layers not re-rendered during drag | ✅ Wave 2 (no `fc.clear()` in mouse:move) |
| D-05 | Zero store writes during drag; one commit on mouseup | ✅ Wave 2 |
| D-06 | Cleanup revert wired (drag-interrupt) | ✅ Wave 2 |
| D-07 | structuredClone for rooms + customElements + customPaints (snapshot only) | ✅ Wave 1 (commit `a839d4c`) |
| D-08 | Cloning preserved (not skipped) | ✅ Wave 1 |
| D-09 | Dev-gated snapshot timing + `__cadBench` helper | ✅ Wave 0 (commit `b7eca09`) |
| D-10 | Evidence bundle: trace + bench numbers | ⬜ THIS FILE (in progress) |
| D-11 | Canonical 50W/30P seed via `__cadSeed` | ✅ Wave 0 |
| D-12 | Manual-evidence verification (no brittle CI perf asserts) | ✅ This file IS the manual evidence bundle |

---

## Pending Work

This file becomes complete after the user supplies (via Wave 3 Task 2 checkpoint):
1. Three `window.__cadBench(100)` outputs from the BEFORE commit `b7eca09` checkout
2. Three `window.__cadBench(100)` outputs from current branch HEAD
3. Frames-over-16.7ms count from Chrome DevTools Performance trace
4. `25-perf-trace.png` screenshot saved to this directory
5. `npm test` summary line
6. Pass/fail for each of the 4 single-undo smoke scenarios

The continuation agent then computes the ratio, fills every `<TBD>` placeholder,
flips the success-criteria matrix to ✅/❌, updates ROADMAP.md to mark Phase 25
complete, marks REQUIREMENTS.md PERF-01 + PERF-02 complete, and commits.
