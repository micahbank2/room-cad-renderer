---
phase: "46"
plan: "02"
subsystem: rooms-hierarchy-sidebar-tree
tags: [tdd, green, pure-logic, uistore, wave-1]
dependency_graph:
  requires: [46-01]
  provides: [buildRoomTree-impl, isHiddenInTree-impl, wallLabels-impl, hiddenIds-store, pendingCameraTarget-store]
  affects: [plans-03-04]
tech_stack:
  added: []
  patterns: [tdd-red-green, zustand-set-pure-additions]
key_files:
  created:
    - src/lib/wallLabels.ts
  modified:
    - src/lib/buildRoomTree.ts
    - src/lib/isHiddenInTree.ts
    - src/stores/uiStore.ts
decisions:
  - "wallCardinalLabel: atan2 on midpoint-vs-center vector; dy negative = North (smaller Y = North in canvas coords). Diagonal angles outside all four ±22.5° bands fall back to Wall {N} (1-indexed)."
  - "hiddenIds is Set<string> transient per D-13 — initialized fresh on mount, never in undo history, never autosaved. Matches REQUIREMENTS.md TREE-01 acceptance text verbatim."
  - "pendingCameraTarget seq increments from prior value (same pattern as pendingPresetRequest/wallSideCameraTarget) so back-to-back requests for same position still fire useEffect."
  - "Ceiling group omitted entirely when empty (UI-SPEC § Empty States); walls/products/custom always emitted with children:[] so Plan 03 can render empty-state copy."
  - "D-05 dup-name index starts at 2: first occurrence is bare name, second is 'Name (2)', etc. Implemented via per-group Map<string,count>."
  - "Phase 31 labelOverride on PlacedCustomElement wins verbatim with no index suffix; only unnamed placements get dup-name counting."
metrics:
  duration: "~6 minutes"
  completed: "2026-04-26"
  tasks_completed: 2
  files_created: 1
  files_modified: 3
---

# Phase 46 Plan 02: Pure Logic + uiStore Additions Summary

Wave 0 RED tests turned GREEN. 4 files implemented; Plans 03 and 04 can now proceed against stable API contracts.

## One-liner

buildRoomTree/isHiddenInTree/wallCardinalLabel fully implemented; uiStore extended with hiddenIds Set + pendingCameraTarget + 5 actions — all 5 Wave 0 unit test files now GREEN.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | buildRoomTree, isHiddenInTree, wallLabels | 37e9bee | src/lib/buildRoomTree.ts, src/lib/isHiddenInTree.ts, src/lib/wallLabels.ts |
| 2 | uiStore hiddenIds + pendingCameraTarget | c2b3d86 | src/stores/uiStore.ts |

## Test Pass Count Delta

- Wave 0 baseline: 5 failed test files, 10 failed individual tests
- After Plan 02: 5 test files pass, 15 tests pass (0 failures)
- Full `src/lib/__tests__ src/stores/__tests__` suite: 5/5 files, 15/15 tests GREEN

## Pitfall Encounters

**Pitfall 4 — placedCustomElements vs catalog-root customElements:** The `doc.placedCustomElements` field on RoomDoc contains placed instances (with `customElementId` FK), while the top-level `customElements` param is the catalog keyed by id. The implementation correctly looks up `customElements[placed.customElementId]` for the base name, and respects Phase 31's `placed.labelOverride` (wins verbatim, no index suffix) — matching the same pattern used by `fabricSync.ts` and `PropertiesPanel`.

**Pitfall 2 — start/end swap invariance:** wallCardinalLabel uses the wall midpoint `(start+end)/2` relative to room center, making it invariant under start/end swap.

## D-12 Cascade Contract Verification

`isHiddenInTree(["r1", "r1:walls", "w1"], new Set(["r1:walls"]))` returns `true` — hiding a group hides all its descendants without needing to enumerate them. Verified by vitest unit tests.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all 4 files are fully implemented. RoomsTreePanel component (Plan 03) and ThreeViewport wiring (Plan 04) remain pending per wave design.

## Self-Check: PASSED
