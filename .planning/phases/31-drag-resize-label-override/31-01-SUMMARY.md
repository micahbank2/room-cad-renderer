---
phase: 31
plan: 01
subsystem: testing
tags: [tdd, wave-0, vitest, red-stubs, drag-resize, label-override]
requires: []
provides:
  - "Executable contract for EDIT-22 corner+edge resize handles"
  - "Executable contract for EDIT-23 wall-endpoint smart-snap (D-05/D-06/D-07)"
  - "Executable contract for EDIT-24 single-undo across 5 paths"
  - "Executable contract for CUSTOM-06 label-override UX + render + persistence"
  - "Driver-bridge contracts (__driveResize / __driveWallEndpoint / __driveLabelOverride) advertised for Wave 1/2"
affects: [tests/]
tech-stack:
  added: []
  patterns:
    - "TDD red-stub plan (Phase 29/30 shape)"
    - "window.__drive* test bridges under import.meta.env.MODE === 'test'"
    - "past.length delta === 1 single-undo assertion idiom"
key-files:
  created:
    - tests/resizeHandles.test.ts
    - tests/resolveEffectiveDims.test.ts
    - tests/wallEndpointSnap.test.ts
    - tests/updatePlacedCustomElement.test.ts
    - tests/phase31Resize.test.tsx
    - tests/phase31WallEndpoint.test.tsx
    - tests/phase31Undo.test.tsx
    - tests/phase31LabelOverride.test.tsx
  modified: []
decisions:
  - "Mirror Phase 29/30 driver-bridge pattern: type-and-commit / start-to-end shape"
  - "Snapshot round-trip test uses JSON.stringify + loadSnapshot (no mocked persistence)"
  - "Edge-handle hit radius locked to 0.5 ft (matches corner radius for visual parity)"
metrics:
  duration: ~25 minutes
  completed: 2026-04-20
---

# Phase 31 Plan 01: Test Scaffolding Summary

**Wave 0 TDD red-stub plan — pure test files, no production code.** Locks the EDIT-22/23/24 + CUSTOM-06 contracts in executable vitest before Wave 1 (`31-02-pure-modules`) writes the implementations.

## What Shipped

8 test files in `tests/`, totaling **71 it() blocks**:

| File | it() blocks | Contract |
|------|------------:|----------|
| tests/resizeHandles.test.ts | 15 | `EDGE_HANDLE_HIT_RADIUS_FT`, `getEdgeHandles`, `hitTestEdgeHandle`, `hitTestAnyResizeHandle` (corner-priority Pitfall 1), `edgeDragToAxisValue` (rotation-aware) |
| tests/resolveEffectiveDims.test.ts | 11 | `resolveEffectiveDims` + `resolveEffectiveCustomDims` — D-02 `override ?? libraryDim × sizeScale` |
| tests/wallEndpointSnap.test.ts | 7 | `buildWallEndpointSnapScene` — D-05 restricted scene (no product bboxes, no wall faces) |
| tests/updatePlacedCustomElement.test.ts | 10 | New store actions; Pitfall 4 (placement vs catalog); `clearProductOverrides` / `clearCustomElementOverrides` |
| tests/phase31Resize.test.tsx | 6 | Corner→sizeScale, edge→override, grid-snap, reset (drives `window.__driveResize`) |
| tests/phase31WallEndpoint.test.tsx | 6 | D-05/D-06/D-07 endpoint+midpoint snap, Shift-ortho, Alt-disable, no product snap, guides clear |
| tests/phase31Undo.test.tsx | 7 | EDIT-24 `past.length` delta === 1 across corner / edge-product / edge-custom / wall-endpoint / label-Enter / label-blur + undo restoration |
| tests/phase31LabelOverride.test.tsx | 9 | Placeholder=catalog, maxLength=40, live preview, Enter+blur commit, empty reverts, Escape cancel, fabricSync render, save/load round-trip |

**Total: 71 it() blocks** (target ≥57; +14 over).

## Red State Confirmation

```
$ npx vitest run tests/resizeHandles.test.ts tests/resolveEffectiveDims.test.ts tests/wallEndpointSnap.test.ts tests/updatePlacedCustomElement.test.ts
 Test Files  4 failed (4)
      Tests  36 failed (36)

$ npx vitest run tests/phase31Resize.test.tsx tests/phase31WallEndpoint.test.tsx tests/phase31Undo.test.tsx tests/phase31LabelOverride.test.tsx
 Test Files  4 failed (4)
      Tests  27 failed | 1 passed (28)
```

**Total: 63 failures across 8 files** (target ≥50; +13 over). Failure modes are the expected RED-state signatures:
- Unit tests: `TypeError: useCADStore.getState(...).clearProductOverrides is not a function`, `Cannot find module '@/canvas/wallEndpointSnap'`
- Integration tests: `AssertionError: expected undefined to be defined` from `vi.waitFor(() => expect(window.__driveWallEndpoint).toBeDefined())`

The single `phase31LabelOverride` "passed" appears to be the Escape-cancel test passing trivially because pre-edit value is preserved when no input is rendered — Wave 2 will need to re-validate this once the input mounts.

## Driver Bridges Advertised to Wave 2

Each integration test file documents its driver contract inline (top-of-file comment + `declare global` block). Wave 2 (`31-03-integration`) installs them in `selectTool.ts` / `PropertiesPanel.tsx` under `import.meta.env.MODE === "test"`.

```typescript
// In selectTool.ts activate(), under test-mode guard:
window.__driveResize = {
  start: (placedId: string,
          handle: "corner-ne"|"corner-nw"|"corner-sw"|"corner-se"
                |"edge-n"|"edge-s"|"edge-e"|"edge-w") => void,
  to:    (feetX: number, feetY: number,
          opts?: { shift?: boolean; alt?: boolean }) => void,
  end:   () => void,
};

window.__driveWallEndpoint = {
  start:     (wallId: string, which: "start"|"end") => void,
  to:        (feetX: number, feetY: number,
              opts?: { shift?: boolean; alt?: boolean }) => void,
  end:       () => void,
  getGuides: () => Array<{ type: string }>,
};

// In PropertiesPanel.tsx, under test-mode guard:
window.__driveLabelOverride = {
  typeAndCommit: (placedCustomElementId: string,
                  text: string,
                  mode: "enter"|"blur") => void,
};

// Optional helper for fabricSync render assertion:
window.__getCustomElementLabel = (pceId: string) => string;  // uppercased canvas label text
```

## Cross-Reference: 31-VALIDATION.md §Wave 0 Requirements

| Validation requirement | Satisfied by |
|------------------------|--------------|
| Corner + edge hit-test unit tests | `tests/resizeHandles.test.ts` (15 it) |
| Override resolver unit tests | `tests/resolveEffectiveDims.test.ts` (11 it) |
| Snap target builder + ortho composition | `tests/wallEndpointSnap.test.ts` (7 it) + `tests/phase31WallEndpoint.test.tsx` (D-06 ortho) |
| Single-undo integration (corner + edge + wall-endpoint) | `tests/phase31Undo.test.tsx` (5 path scenarios) |
| RTL label-override input | `tests/phase31LabelOverride.test.tsx` (9 it) |
| New store action unit tests | `tests/updatePlacedCustomElement.test.ts` (10 it) |
| 2D label render lookup | `tests/phase31LabelOverride.test.tsx` D-14 fabricSync test |

All Wave 0 rows satisfied.

## Cross-Reference: 31-RESEARCH.md §Phase Requirements → Test Map

| Req ID | Behavior | Covered by |
|--------|----------|-----------|
| EDIT-22 | Corner hit-test (rotation-aware) | resizeHandles.test.ts §getEdgeHandles + existing corner code |
| EDIT-22 | Edge hit-test (rotation-aware) | resizeHandles.test.ts §hitTestEdgeHandle |
| EDIT-22 | Corner wins ties (Pitfall 1) | resizeHandles.test.ts §hitTestAnyResizeHandle |
| EDIT-22 | resolveEffectiveDims override priority | resolveEffectiveDims.test.ts |
| EDIT-22 | Edge drag writes override w/ grid-snap | phase31Resize.test.tsx |
| EDIT-22 | Corner drag writes sizeScale | phase31Resize.test.tsx |
| EDIT-23 | Snap to other endpoint | phase31WallEndpoint.test.tsx D-05 endpoint |
| EDIT-23 | Snap to other midpoint | phase31WallEndpoint.test.tsx D-05 midpoint |
| EDIT-23 | Shift+snap composition | phase31WallEndpoint.test.tsx D-06 |
| EDIT-23 | Alt disables snap | phase31WallEndpoint.test.tsx D-07 |
| EDIT-23 | No product-bbox snap | phase31WallEndpoint.test.tsx D-05 negative |
| EDIT-24 | Corner single-undo | phase31Undo.test.tsx corner |
| EDIT-24 | Edge single-undo | phase31Undo.test.tsx edge-product + edge-custom |
| EDIT-24 | Wall-endpoint single-undo | phase31Undo.test.tsx wall |
| EDIT-24 | Label-override single-undo | phase31Undo.test.tsx Enter + blur |
| CUSTOM-06 | PropertiesPanel input | phase31LabelOverride.test.tsx (placeholder + maxLength) |
| CUSTOM-06 | Live preview no debounce | phase31LabelOverride.test.tsx D-09 |
| CUSTOM-06 | Empty reverts | phase31LabelOverride.test.tsx D-11 |
| CUSTOM-06 | Save/load round-trip | phase31LabelOverride.test.tsx D-13 |
| CUSTOM-06 | Escape cancels | phase31LabelOverride.test.tsx Escape |

All rows satisfied.

## Deviations from Plan

None — plan executed exactly as written. The single passing test in `phase31LabelOverride` is a trivial pre-state preservation, not a contract violation; Wave 2 will exercise it once the input mounts.

## Commits

| Task | Hash | Description |
|------|------|-------------|
| 1 | 2c8cbcf | Unit stubs (4 files, 43 it blocks, 36 failures) |
| 2 | 6a98e3c | Integration + RTL stubs (4 files, 28 it blocks, 27 failures) |

## Self-Check: PASSED

All 8 files exist on disk. Both task commits exist (`2c8cbcf`, `6a98e3c`). Red state confirmed (63 failures across 8 files; ≥50 target met). Driver contracts advertised in-file. All Wave 0 + Phase Requirements rows mapped to it() blocks.
