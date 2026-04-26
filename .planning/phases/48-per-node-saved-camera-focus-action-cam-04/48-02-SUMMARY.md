---
phase: 48-per-node-saved-camera-focus-action-cam-04
plan: 02
subsystem: cadStore / uiStore / ThreeViewport
tags: [cam-04, saved-camera, no-history, camera-capture, bridge, d-03, d-04]
dependency_graph:
  requires: [48-01]
  provides: [setSavedCameraOnWallNoHistory, setSavedCameraOnProductNoHistory, setSavedCameraOnCeilingNoHistory, setSavedCameraOnCustomElementNoHistory, clearSavedCameraNoHistory, getCameraCapture, installCameraCapture, clearCameraCapture, savedCameraPos-type-field, savedCameraTarget-type-field]
  affects: [src/types/cad.ts, src/stores/cadStore.ts, src/stores/uiStore.ts, src/three/ThreeViewport.tsx]
tech_stack:
  added: []
  patterns: [NoHistory-bypass-D04, getCameraCapture-bridge, orbitControlsRef-capture]
key_files:
  created: []
  modified:
    - src/types/cad.ts
    - src/stores/cadStore.ts
    - src/stores/uiStore.ts
    - src/three/ThreeViewport.tsx
decisions:
  - "__getCameraPose was already installed in ThreeViewport by Phase 36 (lines 156-175) — BLOCKER-2 is already resolved; only the production installCameraCapture bridge was missing"
  - "getCameraCapture bridge mirrors Phase 46 requestCameraTarget pattern in reverse: ThreeViewport writes, PropertiesPanel reads"
metrics:
  duration: "~8 minutes"
  completed: "2026-04-25"
  tasks_completed: 3
  files_modified: 4
---

# Phase 48 Plan 02: cadStore Types + NoHistory Actions + Camera-Capture Bridge Summary

**One-liner:** Data layer for per-node saved camera bookmarks — 4 type extensions, 5 NoHistory cadStore actions, and uiStore getCameraCapture cross-component bridge installed in ThreeViewport.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Type additions on 4 CAD entity shapes (D-03) | c0faea5 | src/types/cad.ts |
| 2 | cadStore — 5 NoHistory actions (D-04) | bd68516 | src/stores/cadStore.ts |
| 3 | uiStore camera-capture bridge + ThreeViewport install | 44a8a21 | src/stores/uiStore.ts, src/three/ThreeViewport.tsx |

## What Was Built

### Task 1 — Type Extensions (D-03)

Added `savedCameraPos?: [number, number, number]` and `savedCameraTarget?: [number, number, number]` to 4 entity interfaces in `src/types/cad.ts`:
- `WallSegment` (after `wallArt?: WallArt[]`)
- `PlacedProduct` (after `depthFtOverride?: number`)
- `PlacedCustomElement` (after `labelOverride?: string`)
- `Ceiling` (after `scaleFt?: number`)

All 8 fields tagged `Phase 48 CAM-04 (D-03)` for forward-traceability. Pure additions — no existing field modified. Optional fields require no migration (older snapshots load with undefined, fall through to default focus behavior).

### Task 2 — cadStore NoHistory Actions (D-04)

Added to `CADState` interface and `create()` factory:

1. `setSavedCameraOnWallNoHistory(wallId, pos, target)` — writes to `doc.walls[wallId].savedCameraPos/Target`
2. `setSavedCameraOnProductNoHistory(productId, pos, target)` — writes to `doc.placedProducts[productId].savedCameraPos/Target`
3. `setSavedCameraOnCeilingNoHistory(ceilingId, pos, target)` — writes to `(doc.ceilings ?? {})[ceilingId].savedCameraPos/Target`
4. `setSavedCameraOnCustomElementNoHistory(placedId, pos, target)` — writes to `(doc.placedCustomElements ?? {})[placedId].savedCameraPos/Target`
5. `clearSavedCameraNoHistory(kind, id)` — switch(kind) dispatch sets both fields to undefined

All 5 actions:
- Include `activeDoc(s)` guard (early return if no active room)
- Include entity lookup guard (early return on missing id — no throw)
- Explicitly bypass `pushHistory(s)` per D-04 (comment in each body)
- Handle optional maps (`ceilings`, `placedCustomElements`) with `?? {}` guard pattern

### Task 3 — uiStore Bridge + ThreeViewport

**uiStore additions:**
- `getCameraCapture: (() => { pos, target } | null) | null` — state field (null when no Scene mounted)
- `installCameraCapture(fn)` — sets getCameraCapture to the provided capture closure
- `clearCameraCapture()` — sets getCameraCapture to null

**ThreeViewport Scene `useEffect` (production capture bridge):**
```typescript
useEffect(() => {
  useUIStore.getState().installCameraCapture(() => {
    const ctrl = orbitControlsRef.current;
    if (!ctrl?.object) return null;
    const cam = ctrl.object as THREE.Camera;
    return { pos: [...], target: [...] };
  });
  return () => useUIStore.getState().clearCameraCapture();
}, []);
```

**BLOCKER-2 status:** `window.__getCameraPose()` test driver was already installed in ThreeViewport by Phase 36 (lines 156-175, useEffect gated on `import.meta.env.MODE === "test"`). No new install needed — the driver was already there.

## Test Results

**cadStore.savedCamera.test.ts (Plan 01 test — unchanged):**
- All 9 tests GREEN after Task 2 lands
- Includes JSON round-trip serialization test (WARNING-6 fix)
- No test file edited (WARNING-3 compliance)
- No `seedTestRoom.ts` helper created (WARNING-3 compliance)

**Full vitest suite:**
- 6 pre-existing failures unchanged (Phase 37 D-02 baseline preserved)
- PropertiesPanel.savedCamera + RoomsTreePanel.savedCamera tests remain RED (Plan 03 implements the UI)

## Verification Checks

- `grep -c "savedCameraPos?: \[number, number, number\]" src/types/cad.ts` → 4
- `grep -c "savedCameraTarget?: \[number, number, number\]" src/types/cad.ts` → 4
- `grep -c "Phase 48 CAM-04" src/types/cad.ts` → 8
- `grep -c "setSavedCameraOnWallNoHistory" src/stores/cadStore.ts` → 2
- `grep -c "clearSavedCameraNoHistory" src/stores/cadStore.ts` → 2
- `grep -c "Phase 48 CAM-04" src/stores/cadStore.ts` → 6
- `grep -c "getCameraCapture" src/stores/uiStore.ts` → 4
- `grep -c "installCameraCapture" src/stores/uiStore.ts` → 3
- `grep -c "installCameraCapture\|clearCameraCapture" src/three/ThreeViewport.tsx` → 2
- `grep -c "__getCameraPose" src/three/ThreeViewport.tsx` → 3 (pre-existing × 2 + ref in comment)
- `npx tsc --noEmit` → 0 errors (only pre-existing baseUrl deprecation warning)
- `git diff src/stores/__tests__/cadStore.savedCamera.test.ts` → 0 lines
- `git diff src/components/PropertiesPanel.tsx` → 0 lines
- `git diff src/canvas/FabricCanvas.tsx` → 0 lines

## Deviations from Plan

### Observation: `__getCameraPose` already installed (BLOCKER-2 pre-resolved)

**Found during:** Task 3 read of ThreeViewport.tsx
**Issue:** Plan 02 Task 3 specifies installing `window.__getCameraPose()` test driver, but Phase 36 Plan 01 already installed it (lines 156-175 of ThreeViewport.tsx) as a deterministic camera pose helper for VIZ-10/preset test specs.
**Fix:** Skipped the redundant install. Only added the production `installCameraCapture` bridge (which was genuinely missing).
**Impact:** BLOCKER-2 was already resolved; no functional gap. The existing `__getCameraPose` useEffect returns `{ position, target }` from orbitControlsRef — exactly what Plan 03 e2e specs need.
**Commit:** 44a8a21 (the ThreeViewport change adds only the production bridge useEffect)

## Known Stubs

None. Plan 02 is a pure data layer — no UI rendering paths. No placeholder text, no empty data sources, no stubs.

## Self-Check

### Files exist
- [x] `src/types/cad.ts` — FOUND
- [x] `src/stores/cadStore.ts` — FOUND
- [x] `src/stores/uiStore.ts` — FOUND
- [x] `src/three/ThreeViewport.tsx` — FOUND
- [x] `src/stores/__tests__/seedTestRoom.ts` — NOT FOUND (correct — WARNING-3)

### Commits exist
- [x] c0faea5 — feat(48-02): extend 4 CAD entity types with savedCamera fields (D-03)
- [x] bd68516 — feat(48-02): add 5 NoHistory savedCamera actions to cadStore (D-04)
- [x] 44a8a21 — feat(48-02): add getCameraCapture bridge to uiStore + ThreeViewport install (CAM-04)

## Self-Check: PASSED
