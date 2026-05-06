---
phase: 64-bug-04-wall-texture-flake-fix
plan: 01
status: complete
type: summary
shipped: 2026-05-06
commits:
  - acfb9c2 fix(64): wall-user-texture-first-apply chromium-dev flake (BUG-04, #141)
---

# Phase 64-01 Summary — BUG-04 (wall-texture flake fix)

## Outcome: Two-part fix landed; flake eliminated

## Root cause #1: missing useEffect cleanup in WallMesh registry write

`src/three/WallMesh.tsx:218-223` registered material refs in the test-mode `__wallMeshMaterials` registry on mount but had **no cleanup function**. When WallMesh unmounted during a 2D→3D toggle, the registry kept pointing at the discarded material. Next mount's effect re-registered the new ref, but during the gap, `getWallMeshMapResolved(wallId)` could read a stale ref and return false.

**Same React StrictMode double-mount class as the Phase 58 thumbnail-callback bug fixed in commit `f5f6c46`.** Pattern: side-effect on mount → no cleanup → unmount leaves stale state → remount may not catch up before the next observer reads.

```ts
// BEFORE — no cleanup
useEffect(() => {
  if (import.meta.env.MODE === "test") {
    const reg = (window as ...).__wallMeshMaterials;
    if (reg) reg[wall.id] = matRefA.current;
  }
}, [wall.id, userTexA]);

// AFTER — cleanup clears stale registration on unmount
useEffect(() => {
  if (import.meta.env.MODE !== "test") return;
  const reg = (window as ...).__wallMeshMaterials;
  if (!reg) return;
  reg[wall.id] = matRefA.current;
  return () => {
    if (reg[wall.id] === matRefA.current) reg[wall.id] = null;
  };
}, [wall.id, userTexA]);
```

The identity check `reg[wall.id] === matRefA.current` ensures the cleanup doesn't clobber a registration from a remount that already happened.

## Root cause #2: 3000ms timeout too tight on chromium-dev runners

`e2e/wall-user-texture-first-apply.spec.ts:202` used a 3000ms timeout for the post-toggle `__getWallMeshMapResolved` wait. With React StrictMode active in chromium-dev, four view-mode toggles produced **up to 8 effective render cycles** plus async texture re-resolve. 3000ms was tight on slower CI runners.

Bumped to **8000ms** (matches other dev-server e2e timeouts in the repo).

## Verification

- `npx playwright test e2e/wall-user-texture-first-apply.spec.ts --project=chromium-dev --repeat-each=5` → **10/10 pass** (was flaking ~50% in CI before)
- `npx vitest run` → 4 failed / 791 passed / 7 todo (pre-existing baseline unchanged)
- Both Phase 49 e2e tests in the file passed every iteration

## Files modified

- `src/three/WallMesh.tsx` — added cleanup function to the test-mode registry useEffect (~6 LOC)
- `e2e/wall-user-texture-first-apply.spec.ts` — bumped timeout 3000ms → 8000ms with comment explaining the StrictMode render-cycle math (~10 LOC including comment)

## Quick-task pattern

Executed via `/gsd:quick`. Investigation surfaced the StrictMode-cleanup bug pattern (consistent with Phase 58 lesson). Total wall-clock: ~15 minutes.

## Lessons reinforced

1. **The Phase 58 / Phase 64 cleanup pattern.** When you write to a module-level registry from a useEffect, you MUST add a cleanup function that clears the entry on unmount. Otherwise React StrictMode (active in dev) leaves stale state. We've now seen this trap twice — capture in CLAUDE.md or a one-pager soon.
2. **Test timeouts grow with the test suite.** As more phases ship, view-mode toggles trigger more renders (StrictMode × N components). 3000ms timeouts that were fine in v1.5 may not be fine in v1.16. Audit timeouts when CI flakes appear.
3. **chromium-dev exposes timing bugs that chromium-preview hides.** Production builds are faster + skip dev-only logging. If a flake only fires on chromium-dev, it's almost always a timing issue (StrictMode, HMR overhead, dev-mode console writes).

## State updates

- Phase 64 marked complete via STATE.md "Quick Tasks Completed" table
- Issue #141 will be closed by PR merge (PR body has `Closes #141`)
