# Phase 25: Canvas & Store Performance - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-19
**Phase:** 25-canvas-store-performance
**Areas discussed:** Incremental redraw strategy, Drag history boundary, Snapshot strategy, Verification evidence

---

## Area selection

**Question:** Which areas do you want to discuss for Phase 25?

| Option | Description | Selected |
|--------|-------------|----------|
| Incremental redraw strategy | How to avoid full clear-and-redraw; drag-only vs object-pool vs RAF | ✓ |
| Drag history boundary | One history entry per completed drag; extend updateWallNoHistory pattern | ✓ |
| Snapshot strategy (PERF-02) | structuredClone vs immer-native vs narrowed snapshot; measurement location | ✓ |
| Verification evidence | Manual trace, automated bench, or both | ✓ |

**User's choice:** All four areas.

---

## Incremental redraw strategy

### Q1: Strategy for 60fps drag

| Option | Description | Selected |
|--------|-------------|----------|
| Drag-only fast path (Recommended) | Keep full redraw default; during drag, mutate Fabric object directly + requestRenderAll. Commit to store on drag-end. | ✓ |
| Object pool + dirty-flag diff | Maintain Map<id, FabricObject> per layer; diff prev vs next and add/update/remove. Bigger refactor. | |
| RAF-throttle redraw first, then assess | Wrap redraw in requestAnimationFrame coalescing as the first cheap win. | |
| Combine RAF throttle + drag fast path | Both belt-and-suspenders. | |

**User's choice:** Drag-only fast path (Recommended).
**Notes:** Matches existing updateWallNoHistory precedent; smallest blast radius.

### Q2: Disable renderOnAddRemove?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — disable and call requestRenderAll manually (Recommended) | Set canvas.renderOnAddRemove=false once; every batch path ends with fc.requestRenderAll(). | ✓ |
| Leave default behavior | Fabric renders after each add/remove; simpler code, more intermediate renders. | |
| You decide | Claude picks whatever the incremental strategy needs. | |

**User's choice:** Yes — disable and call requestRenderAll manually.

### Q3: Which drag operations use the fast path? (multiSelect)

| Option | Description | Selected |
|--------|-------------|----------|
| Product drag (move) | Primary dragging scenario in roadmap success criteria. | ✓ |
| Wall drag (move whole wall) | Dragging a wall segment to reposition. | ✓ |
| Wall endpoint drag (resize/reshape) | Dragging a wall endpoint to change length/angle. | ✓ |
| Product rotation handle drag | From Phase 1 (EDIT-08) — dragging around a pivot. | ✓ |

**User's choice:** All four.

### Q4: Skip re-rendering other layers during drag?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — only the moving object re-renders (Recommended) | Grid, dims, others stay put; maximum frame budget. | ✓ |
| No — keep everything else but still do one render call | Safer, still fast; everything stays on canvas. | |
| You decide during implementation | Claude picks based on profiling. | |

**User's choice:** Yes — only the moving object re-renders.

---

## Drag history boundary

### Q1: How to produce one history entry per drag?

| Option | Description | Selected |
|--------|-------------|----------|
| Mirror updateWallNoHistory pattern — one commit on drag-end (Recommended) | During drag: mutate Fabric directly, no store writes. On drag-end: call existing store action ONCE. | ✓ |
| Store writes every tick, but history push only on drag-end | Live store sync, but history push only on drag-end. Store write per mousemove. | |
| You decide during implementation | Claude picks based on what keeps tests green with least diff. | |

**User's choice:** Mirror updateWallNoHistory pattern — one commit on drag-end.

### Q2: Drag interruption behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Revert to pre-drag position (Recommended) | No store write, no history entry. Matches intuitive cancel behavior. | ✓ |
| Commit at current position | Pointer position at interruption becomes committed state. | |
| You decide | Claude picks based on existing tool-cleanup semantics. | |

**User's choice:** Revert to pre-drag position.

---

## Snapshot strategy (PERF-02)

### Q1: How should snapshots be produced?

| Option | Description | Selected |
|--------|-------------|----------|
| structuredClone() — direct swap (Recommended) | Replace every JSON.parse(JSON.stringify(...)) with structuredClone(...). Keep existing snapshot shape. | ✓ |
| Skip cloning — immer freezes state already | Past holds references to prior state slices without cloning. Fastest but risky. | |
| structuredClone + narrow the snapshot | Use structuredClone but also stop cloning slices that never change during history. | |

**User's choice:** structuredClone() — direct swap.

### Q2: Where should timing measurement live?

| Option | Description | Selected |
|--------|-------------|----------|
| Dev-only console.time + optional window hook (Recommended) | console.time/timeEnd in snapshot(), gated by NODE_ENV==="development". window.__cadBench() manual helper. | ✓ |
| Automated benchmark test in vitest | tests/perfSnapshot.test.ts seeds fixture and asserts ≥2x. Permanent regression guard. | |
| Both: dev hook + vitest bench | Console.time AND committed test. Strongest evidence. | |

**User's choice:** Dev-only console.time + optional window hook.

---

## Verification evidence

### Q1: How to prove the claims?

| Option | Description | Selected |
|--------|-------------|----------|
| Manual trace + dev console numbers in VERIFICATION.md (Recommended) | Chrome DevTools Perf trace + dev-mode console.time output. Matches Phase 24 style. | ✓ |
| Automated vitest perf test + manual trace | Bench test for PERF-02, manual trace for PERF-01 (fps can't be jsdom'd). | |
| All three: manual trace, dev hook, automated bench | Heaviest evidence. | |

**User's choice:** Manual trace + dev console numbers in VERIFICATION.md.

### Q2: Canonical benchmark scene?

| Option | Description | Selected |
|--------|-------------|----------|
| 50 walls / 30 products (matches roadmap) (Recommended) | Exactly the numbers in success criteria. One fixed scene. | ✓ |
| Multiple sizes (10/5, 50/30, 100/60) | Shows scaling curve but more work. | |
| You decide | Claude picks during planning. | |

**User's choice:** 50 walls / 30 products.

---

## Claude's Discretion

User explicitly deferred to Claude on:
- Exact structure of `window.__cadBench()` / `__cadSeed()` helper output format
- Where to install the drag-start position cache (selectTool closure vs FabricCanvas ref)
- Whether to add a feature flag for the drag fast path
- Refactoring within fabricSync if needed for the fast path
- Timing of refreshing the stale "115 tests" count

## Deferred Ideas

Noted for future phases:
- Full object-pool + dirty-flag diff rendering
- Multi-size benchmarking
- RAF-throttled redraw coalescing for non-drag mutations
- Automated perf regression test in CI
- Stale test-count doc sweep
- Feature flag for drag fast path
