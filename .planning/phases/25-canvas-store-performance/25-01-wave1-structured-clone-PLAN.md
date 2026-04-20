---
phase: 25-canvas-store-performance
plan: 01
type: execute
wave: 1
depends_on: ["25-00"]
files_modified:
  - src/stores/cadStore.ts
autonomous: true
requirements: [PERF-02]
gap_closure: false

must_haves:
  truths:
    - "snapshot() uses structuredClone for every deep-clone slice (rooms, customElements, customPaints)"
    - "Zero `JSON.parse(JSON.stringify(...))` calls remain inside snapshot() in cadStore.ts"
    - "Undo/redo behavior is byte-for-byte identical — snapshot keys, shapes, and independence preserved"
    - "Dev-only snapshot timing logs when a single clone exceeds 2ms"
    - "≥2x speedup measurable via window.__cadBench() at 50 walls / 30 products"
  artifacts:
    - path: "src/stores/cadStore.ts"
      provides: "Rewritten snapshot() using structuredClone + dev-gated console.time logging"
      contains: "structuredClone(state.rooms)"
      must_not_contain: "JSON.parse(JSON.stringify"
  key_links:
    - from: "snapshot() in cadStore.ts"
      to: "pushHistory() in cadStore.ts"
      via: "pushHistory calls snapshot() on every committing action; shape MUST remain CADSnapshot"
      pattern: "pushHistory.*snapshot"
    - from: "snapshot() output independence"
      to: "tests/cadStore.test.ts Wave 0 guard tests"
      via: "The 3 snapshot contract tests from Wave 0 must flip from RED to GREEN here"
      pattern: "snapshot uses structuredClone|snapshot is independent|snapshot preserves all keys"
---

<objective>
Migrate `cadStore.snapshot()` from three `JSON.parse(JSON.stringify(...))` calls to `structuredClone(...)` per PERF-02 and D-07. Add dev-gated `console.time`-style sampling so snapshot latency is observable without shipping to prod.

Purpose: Meet the literal PERF-02 requirement. The history-push path currently JSON-roundtrips `state.rooms`, `customElements`, and `customPaints` on every committing action; structuredClone is 2-5x faster for mixed-depth plain data, is native since 2022, and handles Date/Map/Set (future-proofing).
Output: 3-line semantic diff in snapshot() + a dev-gated timing sampler. No shape change. No behavior change outside perf.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/25-canvas-store-performance/25-CONTEXT.md
@.planning/phases/25-canvas-store-performance/25-RESEARCH.md
@.planning/phases/25-canvas-store-performance/25-00-SUMMARY.md
@.planning/REQUIREMENTS.md
@src/stores/cadStore.ts

<interfaces>
<!-- Current snapshot() — lines 98-114 of src/stores/cadStore.ts. Exact target for Wave 1 edit. -->
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

<!-- structuredClone is a browser + Node 17+ built-in. No import needed.
     Types in src/types/cad.ts are plain-data (Point, WallSegment, Opening, PlacedProduct, Room, CADSnapshot) — verified structuredClone-safe per 25-RESEARCH.md §"Pitfall 3". -->

<!-- OUT-OF-SCOPE per D-07:
     - copyWallSide JSON calls at cadStore.ts:810, 817, 824, 834 (single user-triggered action, not hot path)
     - src/App.tsx JSON calls at lines 144, 145, 176-178 (not in PERF-02's stated files)
     Leave all six untouched in this wave. -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Replace JSON.parse(JSON.stringify(...)) with structuredClone in snapshot() and add dev-gated timing</name>
  <files>src/stores/cadStore.ts</files>
  <read_first>
    - src/stores/cadStore.ts lines 90-120 (the snapshot() function — the precise edit site)
    - src/stores/cadStore.ts lines 116-119 (pushHistory — confirms snapshot is the only clone site under test)
    - src/stores/cadStore.ts lines 203-211 (updateWallNoHistory — precedent pattern, unchanged here but read for context)
    - src/types/cad.ts (CADSnapshot shape — must not change)
    - .planning/phases/25-canvas-store-performance/25-CONTEXT.md §decisions (D-07, D-08, D-09 are LOCKED)
    - .planning/phases/25-canvas-store-performance/25-RESEARCH.md §"Code Examples — snapshot() refactor (PERF-02)" (exact target shape)
    - tests/cadStore.test.ts (the Wave 0 guards — these must flip RED→GREEN)
  </read_first>
  <behavior>
    - "snapshot uses structuredClone" test GOES GREEN (file source contains `structuredClone(` and NOT `JSON.parse(JSON.stringify`).
    - "snapshot is independent" test STAYS GREEN.
    - "snapshot preserves all keys" test STAYS GREEN (identical output shape).
    - "drag produces single history entry" STAYS GREEN (pushHistory behavior unchanged).
    - Dev console logs `[cadStore] snapshot X.XXms` ONLY when a single snapshot exceeds 2ms — avoids spam on trivial states. Prod builds strip the timing block.
  </behavior>
  <action>
    Edit `src/stores/cadStore.ts` — replace the current `snapshot()` function body (lines 98-114) with the target shape below. Do NOT touch `pushHistory`, `copyWallSide`, or any other JSON call elsewhere in the file.

    **Exact replacement (copy verbatim, adjusting formatting to match surrounding style):**

    ```typescript
    function snapshot(state: CADState): CADSnapshot {
      const root = state as any;
      const t0 = import.meta.env.DEV ? performance.now() : 0;
      const snap: CADSnapshot = {
        version: 2,
        rooms: structuredClone(state.rooms),
        activeRoomId: state.activeRoomId,
        ...(root.customElements
          ? { customElements: structuredClone(root.customElements) }
          : {}),
        ...(root.customPaints
          ? { customPaints: structuredClone(root.customPaints) }
          : {}),
        ...(root.recentPaints
          ? { recentPaints: [...root.recentPaints] }
          : {}),
      };
      if (import.meta.env.DEV) {
        const dt = performance.now() - t0;
        // Sampled logging: only surface snapshots that could matter for perf.
        if (dt > 2) {
          // eslint-disable-next-line no-console
          console.log(`[cadStore] snapshot ${dt.toFixed(2)}ms`);
        }
      }
      return snap;
    }
    ```

    Constraints (grep-checkable in acceptance):
    - Function body contains exactly THREE `structuredClone(` calls
    - Function body contains ZERO `JSON.parse(` occurrences
    - Function body contains ZERO `JSON.stringify(` occurrences
    - `recentPaints` slice stays as `[...root.recentPaints]` (shallow spread) — NOT structuredClone. D-07 explicitly scopes to the three deep clones only; recentPaints is already an array of strings/hex values and the spread is fine.
    - The timing block is gated by `import.meta.env.DEV` (branches present; Vite tree-shakes in prod)
    - Threshold `> 2` ms is used for the log to filter noise (Claude's discretion per D-09; documented)
    - `console.log` is prefixed with `"[cadStore] snapshot "` (grep-stable string)

    Do NOT change the function signature. Do NOT rename. Do NOT export. Do NOT add a new variant.

    Implements: D-07 (structuredClone swap), D-08 (keep clone semantics — don't skip), D-09 (dev-gated timing).
  </action>
  <verify>
    <automated>npm test -- tests/cadStore.test.ts -t "Phase 25 Wave 0" && npm test</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "JSON.parse(JSON.stringify" src/stores/cadStore.ts` returns a number LESS THAN the pre-change value (specifically: 3 fewer — the three snapshot() calls gone; the 4 in copyWallSide remain untouched)
    - `grep -c "structuredClone(" src/stores/cadStore.ts` returns a value ≥ 3 (one for rooms, one for customElements, one for customPaints)
    - `grep -c "JSON.parse(JSON.stringify" src/stores/cadStore.ts` returns EXACTLY 4 (only the copyWallSide calls remain — lines 810, 817, 824, 834 per research)
    - `src/stores/cadStore.ts` contains the literal string `[cadStore] snapshot ` (dev timing log prefix)
    - `src/stores/cadStore.ts` snapshot() body contains `import.meta.env.DEV` at least twice (t0 gate + log gate)
    - `npm test -- tests/cadStore.test.ts -t "snapshot uses structuredClone"` exits 0 (was RED in Wave 0, GREEN now)
    - `npm test -- tests/cadStore.test.ts -t "snapshot is independent"` exits 0
    - `npm test -- tests/cadStore.test.ts -t "snapshot preserves all keys"` exits 0
    - `npm test -- tests/cadStore.test.ts -t "drag produces single history entry"` exits 0
    - `npm test -- tests/cadStore.test.ts -t "wall drag produces single history entry"` exits 0
    - Full suite `npm test`: 168 pre-existing passing preserved + at least 1 NEW green (the structuredClone guard); failure count NOT increased
    - `npm run build` succeeds; prod bundle (`dist/`) does NOT contain `[cadStore] snapshot ` or `performance.now()` inside the tree-shaken branch — (manual spot-check: `grep -r "cadStore] snapshot" dist/` returns empty)
  </acceptance_criteria>
  <done>
    snapshot() uses structuredClone for the three deep slices; dev-only timing emits for snapshots > 2ms; pushHistory behavior, CADSnapshot shape, and all undo/redo semantics identical. The Wave 0 RED test for structuredClone flips to GREEN.
  </done>
</task>

</tasks>

<verification>
Quick run: `npm test -- tests/cadStore.test.ts tests/toolCleanup.test.ts tests/fabricSync.test.ts` — the `"snapshot uses structuredClone"` RED from Wave 0 flips GREEN. Full regression: `npm test` — 168 pre-existing passing preserved, new green ≥ 1, failure count unchanged.

Manual (D-10 prep):
1. `npm run dev`, open http://localhost:5173
2. DevTools console: `window.__cadSeed(50, 30)` → expect `{walls: 50, products: 30}`
3. `window.__cadBench(100)` — record mean + p95. This is the AFTER baseline.
4. To capture the BEFORE baseline, `git stash` the snapshot edit, `npm run dev` a second instance (or revert and re-checkout), and run the same bench. Compute ratio in Wave 3 VERIFICATION.md.

(Wave 3 owns the full evidence bundle; Wave 1 just lands the code.)
</verification>

<success_criteria>
- [ ] `grep "JSON.parse(JSON.stringify" src/stores/cadStore.ts` shows ZERO matches inside snapshot() function body (only copyWallSide matches remain, 4 total)
- [ ] 3 `structuredClone(` calls exist inside snapshot()
- [ ] Dev-gated timing block present and uses `> 2ms` threshold
- [ ] `npm test -- tests/cadStore.test.ts -t "snapshot uses structuredClone"` now exits 0
- [ ] Full test suite: 168 pre-existing passing preserved; zero new failures
- [ ] `npm run build` succeeds; prod bundle free of dev-only timing strings
</success_criteria>

<output>
After completion, create `.planning/phases/25-canvas-store-performance/25-01-SUMMARY.md` documenting:
- Exact diff lines in cadStore.ts (before → after for snapshot() body)
- Red→Green transition for `"snapshot uses structuredClone"` test
- Quick `window.__cadBench()` measurement from dev instance (ms mean + p95) for the Wave 3 evidence bundle
- Decisions honored: D-07, D-08, D-09
- Confirmation that copyWallSide (4 JSON calls) and App.tsx (5 JSON calls) are intentionally untouched per D-07 scope
</output>
