---
phase: 60-stairs-stairs-01
plan: 01
subsystem: ui
tags: [stairs, fabric, three.js, zustand, immer, snapshot-migration, smart-snap, phase-46-tree, phase-53-ctxmenu, phase-54-click-select]

requires:
  - phase: 30-smart-snap-snap-01
    provides: computeSnap engine + snap-guide rendering (consumed unmodified per research Q2)
  - phase: 31-edit-handles-edit-01
    provides: edge-handle width-override pattern + size-override resolver (mirror for widthFtOverride)
  - phase: 46-rooms-tree-panel-tree-01
    provides: hiddenIds id-keyed Set + groupKey-driven tree rendering
  - phase: 47-display-mode-displaymode-01
    provides: RoomGroup multi-room render entry point
  - phase: 48-saved-camera-cam-04
    provides: SavedCameraButtons kind-union dispatch + per-entity savedCameraPos/Target fields
  - phase: 51-floormaterial-debt-05
    provides: snapshot v2→v3 migration boundary (preserved exactly via migrateV3ToV4 split)
  - phase: 53-ctxmenu-ctxmenu-01
    provides: getActionsForKind(kind, nodeId) registry; new "stair" branch added
  - phase: 54-click-select-props3d-01
    provides: useClickDetect hook; reused by StairMesh wrapping <group>
  - phase: 56-gltf-render-3d-01
    provides: Box3Helper-based selection-outline pattern (1 draw call)

provides:
  - "Stair top-level entity (RoomDoc.stairs) with 9 fields per D-01"
  - "Stair placement tool with D-04 origin asymmetry (bottom-step-center store, bbox-center snap)"
  - "2D fabric.Group render with outline + N step lines + UP arrow + optional label"
  - "3D <StairMesh> with N stacked boxGeometry meshes + bbox edges-geometry selection outline"
  - "PropertiesPanel.StairSection with width / rise / run / stepCount / rotation / label inputs"
  - "RoomsTreePanel STAIRS group + Material Symbols stairs glyph (TreeRow.tsx allowlist exception)"
  - "Phase 53 ctxmenu kind 'stair' with 6 actions (focus, save-cam, hide-show, copy, paste, delete)"
  - "Phase 54 click-to-select on StairMesh"
  - "focusOnStair() camera-fit dispatcher"
  - "Snapshot v3 → v4 migration via migrateV3ToV4() (separated from migrateFloorMaterials to preserve Phase 51 contract)"

affects:
  - phase: 61-open-01 (archways/passthroughs/niches — likely consumes stair entity pattern for similar top-level primitive shape)
  - "any future phase consuming RoomDoc.stairs (saved-camera fixtures, multi-floor v2.0+, stair landings)"

tech-stack:
  added: []  # No new libraries — stair is built on existing fabric/three/zustand stack
  patterns:
    - "Origin-asymmetry translation: store-anchor (user mental model) ≠ snap-anchor (engine bbox-center). Translate before snap, reverse on commit."
    - "Snap engine consume-only contract: new entity types may CONSUME the snap scene without contributing geometry to it."
    - "Snapshot migration boundary preservation: when adding a new schema version, do NOT collapse prior version bumps — split into a separate migrate{From}{To}() function so prior test contracts hold."
    - "TreeRow per-kind icon site (Material Symbols allowlist exception) for CAD-domain glyphs lucide doesn't carry."

key-files:
  created:
    - src/canvas/stairSymbol.ts
    - src/canvas/tools/stairTool.ts
    - src/three/StairMesh.tsx
    - src/components/PropertiesPanel.StairSection.tsx
    - src/components/RoomsTreePanel/focusDispatch.ts (focusOnStair added)
    - src/test-utils/stairDrivers.ts
    - tests/stores/cadStore.stairs.test.ts (Task 1)
    - tests/components/PropertiesPanel.stair.test.tsx
    - e2e/stairs.spec.ts
  modified:
    - src/types/cad.ts (Stair interface, ToolType extended, RoomDoc.stairs, CADSnapshot version 4)
    - src/stores/cadStore.ts (9 stair actions + useActiveStairs selector + loadSnapshot v3→v4 chain)
    - src/stores/uiStore.ts (ContextMenuKind union extended with "stair")
    - src/lib/snapshotMigration.ts (migrateV3ToV4 added, migrateFloorMaterials reverted to v3 boundary)
    - src/canvas/fabricSync.ts (renderStairs export)
    - src/canvas/FabricCanvas.tsx (activate dispatcher + render call + right-click hit-test for stair groups)
    - src/three/RoomGroup.tsx (StairMesh per stair + hidden cascade)
    - src/components/PropertiesPanel.tsx (sequential `if (stair)` discriminator + SavedCameraSection kind extension + StairSection render branch)
    - src/components/RoomsTreePanel/RoomsTreePanel.tsx (stair-kind click + double-click savedCamera fall-through)
    - src/components/RoomsTreePanel/TreeRow.tsx (Material Symbols `stairs` glyph + empty-state copy)
    - src/components/RoomsTreePanel/savedCameraSet.ts (Phase 48 D-07 mirror)
    - src/components/CanvasContextMenu.tsx (NEW `if (kind === "stair")` branch + focusCamera + saveCameraHere stair arms)
    - src/components/Toolbar.tsx (Stairs tool button)
    - src/lib/buildRoomTree.ts (TreeNodeKind/groupKey union + STAIRS group emission)
    - src/main.tsx (installStairDrivers wired)
    - tests/snapshotMigration.test.ts (assertion bumped 3 → 4)
    - tests/lib/contextMenuActionCounts.test.ts (mock factories extended with focusOnStair / removeStair / setSavedCameraOnStairNoHistory)
    - CLAUDE.md (D-33 Material Symbols allowlist updated with TreeRow.tsx exception)

key-decisions:
  - "Stair is a NEW top-level entity (RoomDoc.stairs), NOT a customElement kind — stair-specific fields (rise, run, stepCount) don't fit the customElement catalog model"
  - "D-04 origin = bottom-step center (matches user mental model 'I want to start walking up from here'); engine snap operates on bbox center; tool translates between them"
  - "Snap engine consume-only — stairs do NOT contribute geometry to the snap scene in v1.15 (research Q2); other primitives won't snap to stairs"
  - "v3 → v4 migration split into migrateV3ToV4() rather than collapsed into migrateFloorMaterials so the Phase 51 v3-boundary test contract is preserved (D-17 zero-regression)"
  - "Selection outline = single bbox edges-geometry (Phase 56 Box3Helper mirror) — 1 draw call regardless of stepCount"
  - "Material Symbols `stairs` glyph for Toolbar AND TreeRow.tsx (lucide-react has no Stairs export); CLAUDE.md allowlist updated"

patterns-established:
  - "Origin-asymmetry: store user-facing anchor; translate to engine anchor for snap; reverse on commit. Pattern reusable for any future entity whose user-mental-model anchor differs from the geometric center."
  - "Snapshot migration version-boundary preservation: never collapse adjacent version bumps; each version gets its own migrate{From}{To}() function so existing test contracts at boundary versions remain valid."
  - "Top-level entity addition: type → store actions + selectors → snapshot migration → snap-engine consumer → 2D render → 3D mesh + click-detect + ctxmenu → PropertiesPanel discriminator → tree groupKey → toolbar tool → drivers + e2e."

requirements-completed: [STAIRS-01]

duration: ~75min
completed: 2026-05-05
---

# Phase 60 Plan 01: STAIRS-01 Summary

**Stair primitive — new top-level RoomDoc.stairs entity with placement tool (smart-snap, D-04 origin asymmetry), 2D fabric symbol, 3D stacked-box mesh, PropertiesPanel inputs, and tree integration. Snapshot v3 → v4 with split migration boundary preserving Phase 51 contract.**

## Performance

- **Duration:** ~75 min (Tasks 2-7; Task 1 already committed in 733f717)
- **Started (resume):** 2026-05-05T19:36:00Z
- **Completed:** 2026-05-05T19:59:00Z
- **Tasks:** 7 (1 prior + 6 in this session)
- **Files created:** 9
- **Files modified:** 18

## Accomplishments

- New top-level Stair primitive at `RoomDoc.stairs`, with 9 fields per D-01 schema (id, position, rotation, riseIn, runIn, widthFtOverride, stepCount, labelOverride, savedCamera*)
- Toolbar Stairs tool that places a stair at the cursor, smart-snapped to wall edges with D-04 origin-asymmetry handling (bottom-step-center stored, bbox-center snapped)
- 2D fabric.Group symbol: outline rectangle + N step lines + UP-arrow triangle + optional label
- 3D stacked-box mesh with 1-draw-call selection outline (Phase 56 Box3Helper mirror)
- PropertiesPanel.StairSection — 6 inputs (width / rise / run / stepCount / rotation / label) with single-undo edit pattern; Save Camera section
- RoomsTreePanel STAIRS group with Material Symbols `stairs` glyph for stair leaf rows; empty state "No stairs in this room"
- Phase 53 right-click context menu with 6 stair-specific actions
- Phase 54 click-to-select via useClickDetect on the wrapping `<group>` in StairMesh
- Snapshot v3 → v4 migration with `migrateV3ToV4()` separated from Phase 51's `migrateFloorMaterials` so existing Phase 51 tests (which assert `version === 3` after their migration) keep passing — D-17 zero-regression preserved
- 13 new tests: 5 unit (Task 1) + 3 component (Task 5) + 6 e2e (Task 7) — all passing
- Phase 48/53/59 e2e regression sweep: 15 prior tests pass

## Task Commits

1. **Task 1: Stair type + cadStore actions + v3→v4 migration (TDD)** — `733f717` (feat) — 5 unit tests
2. **Task 2: stairSymbol.ts pure shape builder** — `bf0ef72` (feat)
3. **Task 3: stairTool placement + fabricSync render (D-04 origin asymmetry)** — `648a986` (feat)
4. **Task 4: StairMesh 3D + RoomGroup integration** — `aaebbec` (feat)
5. **Task 5: PropertiesPanel.StairSection + 3 component tests + migration split** — `b5bb7e4` (feat) — 3 component tests
6. **Task 6: tree + ctxmenu + toolbar + focusOnStair + CLAUDE.md allowlist** — `76e42f4` (feat)
7. **Task 7: stairs e2e + drivers (E1-E6 incl. D-04 origin asymmetry)** — `71ede52` (test) — 6 e2e

## Files Created/Modified

### Created (9)
- `src/canvas/stairSymbol.ts` — pure 2D shape builder for the stair symbol
- `src/canvas/tools/stairTool.ts` — placement tool (closure state, snap-cache, D-04 translation)
- `src/three/StairMesh.tsx` — 3D stacked-box render + selection outline + click handlers
- `src/components/PropertiesPanel.StairSection.tsx` — stair-specific inputs
- `src/test-utils/stairDrivers.ts` — window-level drivers for e2e + tests
- `tests/stores/cadStore.stairs.test.ts` — 5 unit tests U1-U4 + supporting v3→v4 roundtrip (Task 1)
- `tests/components/PropertiesPanel.stair.test.tsx` — 3 component tests C1-C3
- `e2e/stairs.spec.ts` — 6 Playwright scenarios E1-E6
- `.planning/phases/60-stairs-stairs-01/60-01-SUMMARY.md` (this file)

### Modified (18)
- `src/types/cad.ts` — Stair interface, ToolType extended, RoomDoc.stairs?, CADSnapshot.version literal 4 (Task 1)
- `src/stores/cadStore.ts` — 9 stair actions + useActiveStairs + loadSnapshot v3→v4 chain
- `src/stores/uiStore.ts` — ContextMenuKind union extended with "stair"
- `src/lib/snapshotMigration.ts` — migrateV3ToV4() added, migrateFloorMaterials reverted to v3 boundary
- `src/canvas/fabricSync.ts` — renderStairs export
- `src/canvas/FabricCanvas.tsx` — dispatch + render + right-click hit-test for stair groups
- `src/three/RoomGroup.tsx` — StairMesh per stair + hiddenIds cascade for stairs
- `src/components/PropertiesPanel.tsx` — stair selector + render branch + SavedCameraButtons kind extension
- `src/components/RoomsTreePanel/RoomsTreePanel.tsx` — stair routing
- `src/components/RoomsTreePanel/TreeRow.tsx` — Material Symbols stairs glyph + empty-state copy
- `src/components/RoomsTreePanel/focusDispatch.ts` — focusOnStair()
- `src/components/RoomsTreePanel/savedCameraSet.ts` — Phase 48 D-07 mirror for stairs
- `src/components/CanvasContextMenu.tsx` — NEW `kind === "stair"` branch + focusCamera + saveCameraHere arms
- `src/components/Toolbar.tsx` — Stairs tool button + onSelectTool seeds pendingStairConfig
- `src/lib/buildRoomTree.ts` — TreeNodeKind/groupKey union + STAIRS group emission
- `src/main.tsx` — installStairDrivers wired
- `tests/snapshotMigration.test.ts` — version assertion bumped 3 → 4
- `tests/lib/contextMenuActionCounts.test.ts` — mock factory completeness for new imports
- `CLAUDE.md` — D-33 Material Symbols allowlist updated with TreeRow.tsx exception note

## Decisions Made

All 17 CONTEXT decisions implemented as specified. Key locked choices:
- **D-04 (origin = bottom-step center)** — verified by E2 e2e (asserts inverse-translation correctness at rot=0 and rot=90)
- **D-12 (snapshot v3 → v4)** — implemented as a SEPARATE `migrateV3ToV4()` function rather than a collapse into `migrateFloorMaterials`, so the Phase 51 `version === 3` test contract remains valid
- **Research Q2 (snap engine consume-only)** — verified: `git diff origin/main src/canvas/snapEngine.ts src/canvas/buildSceneGeometry.ts` shows zero lines changed
- **Research Q1 (Material Symbols `stairs` glyph)** — TreeRow.tsx added to D-33 allowlist with documented CAD-domain-glyph exception in CLAUDE.md
- **Research Q4 (sequential `if (entity)` discriminator)** — PropertiesPanel.tsx adds `if (stair)` branch alongside existing wall/pp/ceiling/pce arms; not a switch
- **Research Q5 (NEW ctxmenu branch, not product reuse)** — Delete handler distinct because removeStair takes (roomId, stairId) signature
- **Research Q6 (hiddenIds id-keyed)** — stair IDs join the same Set; cascade in RoomGroup.tsx mirrors existing wall/product cascade

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Migration version-boundary collapse broke Phase 51 tests**
- **Found during:** Task 5 (full vitest run after PropertiesPanel changes)
- **Issue:** Task 1 (committed in 733f717 before this session) had collapsed the v2→v3 + v3→v4 migration steps into a single `migrateFloorMaterials()` call that ended at v4. This broke 6 pre-existing Phase 51 tests asserting `version === 3` after `migrateFloorMaterials` runs (D-17 violation).
- **Fix:** Split `migrateFloorMaterials` back to its v3 boundary and added a NEW `migrateV3ToV4()` function. Updated `cadStore.loadSnapshot` pipeline to chain `migrateSnapshot → migrateFloorMaterials → migrateV3ToV4` so v2 snapshots still reach v4 cleanly while preserving the v3 boundary contract.
- **Files modified:** src/lib/snapshotMigration.ts, src/stores/cadStore.ts
- **Verification:** All 6 Phase 51 tests pass; the supporting Task-1 v3→v4 migration test still passes; defaultSnapshot still returns v4.
- **Committed in:** `b5bb7e4` (Task 5)

**2. [Rule 1 - Bug] Enter+blur double-commit in NumberRow**
- **Found during:** Task 5 (TDD RED-GREEN cycle on test C2)
- **Issue:** Pressing Enter in a stair input committed via `updateStair`, then `(e.target as HTMLInputElement).blur()` triggered onBlur, which committed AGAIN — past[] grew by 2 instead of 1.
- **Fix:** Added `skipNextBlurRef` guard in NumberRow (mirrors the existing `LabelOverrideInput` pattern in PropertiesPanel.tsx). Enter sets the flag → onCommit runs → blur sees flag, skips its own commit.
- **Files modified:** src/components/PropertiesPanel.StairSection.tsx
- **Verification:** Test C2 passes — single past[] entry per Enter commit cycle.
- **Committed in:** `b5bb7e4` (Task 5)

**3. [Rule 3 - Blocking] tests/lib/contextMenuActionCounts.test.ts mock factory missing new exports**
- **Found during:** Task 6 (full vitest run, intermittent failures depending on test pool concurrency)
- **Issue:** The shared `vi.mock("@/components/RoomsTreePanel/focusDispatch", ...)` factory listed wall/product/ceiling/custom focuses but NOT the new `focusOnStair`. Same for `mockCadStoreState` missing `removeStair` + `setSavedCameraOnStairNoHistory`. Under parallel pool execution, the mock occasionally surfaced as `undefined` for these names and broke the wall/product/ceiling assertion paths.
- **Fix:** Added `focusOnStair: vi.fn()` to the focusDispatch mock factory and the two missing actions to `mockCadStoreState`. No production code changes required.
- **Files modified:** tests/lib/contextMenuActionCounts.test.ts
- **Verification:** Full vitest now reliably reports 4 failures (the genuine pre-existing baseline).
- **Committed in:** `76e42f4` (Task 6)

**4. [Rule 1 - Bug] Toolbar dynamic import warning**
- **Found during:** Task 6 (build output)
- **Issue:** Initial Toolbar onSelectTool used `await import("@/canvas/tools/stairTool")` to lazy-load `setPendingStair`, but stairTool was already statically imported by FabricCanvas — Vite emitted INEFFECTIVE_DYNAMIC_IMPORT warning.
- **Fix:** Promoted the import to a top-level static `import { setPendingStair } from "@/canvas/tools/stairTool"`.
- **Files modified:** src/components/Toolbar.tsx
- **Verification:** Build emits no INEFFECTIVE_DYNAMIC_IMPORT warning for stairTool.ts.
- **Committed in:** `76e42f4` (Task 6)

---

**Total deviations:** 4 auto-fixed (1 bug from Task 1 collapse, 1 bug in NumberRow, 1 blocking test-mock completeness, 1 bug bundle warning).
**Impact on plan:** All four were correctness/regression fixes. No scope creep. The migration-split (#1) is a meaningful architectural improvement that preserves the Phase 51 boundary contract.

## Issues Encountered

- **vitest pool non-determinism:** Some test files passed in isolation but failed when run in the full parallel suite. Root cause was the contextMenuActionCounts mock factory missing the new `focusOnStair` import surface. Fixing the mock removed the non-determinism.
- **Migration version contract preservation:** Required care to keep Phase 51's `version === 3` test boundary while also threading v4. Split into a separate `migrateV3ToV4()` solves cleanly without touching Phase 51 logic.

## User Setup Required

None — no external service configuration required. Stairs is a fully client-local feature.

## Next Phase Readiness

- **Phase 61 OPEN-01** (archways / passthroughs / niches): can mirror the stair entity pattern (top-level RoomDoc field, snap consumer, 2D fabric Group + 3D mesh, PropertiesPanel discriminator, tree groupKey).
- **HUMAN-UAT.md gap to author:** visual UAT items still required for Shift-snap-15° rotation, Alt disable smart-snap, label override commit on blur, top/bottom edge handles hidden, empty-state copy in tree. (Plan E2-E6 covered state-level proofs; visual flows deferred per CONTEXT D-15 sampling-rate guidance.)

## Audit Gates

- `git diff origin/main -- src/canvas/snapEngine.ts src/canvas/buildSceneGeometry.ts` → 0 lines changed (research Q2 consume-only verified)
- `grep -rc "stairs ?? {}" src/` → 6 files use the defensive fallback (≥5 required)
- `grep -n "version: 4" src/types/cad.ts` → literal type bumped (research Q3)
- `grep -n "version: 2" src/types/cad.ts` → 0 hits (literal removed)
- `grep -n "stair" src/stores/uiStore.ts` → ContextMenuKind union extended at all kind sites
- Pre-existing 4 vitest failures stable (D-17): SaveIndicator, SidebarProductPicker, AddProductModal-3, productStore-1
- Phase 60 e2e: 6 / 6 pass on chromium-preview
- Phase 48/53/59 regression e2e: 15 / 15 pass

## Self-Check: PASSED

All claimed files exist:
- `src/canvas/stairSymbol.ts` — FOUND
- `src/canvas/tools/stairTool.ts` — FOUND
- `src/three/StairMesh.tsx` — FOUND
- `src/components/PropertiesPanel.StairSection.tsx` — FOUND
- `src/test-utils/stairDrivers.ts` — FOUND
- `tests/stores/cadStore.stairs.test.ts` — FOUND
- `tests/components/PropertiesPanel.stair.test.tsx` — FOUND
- `e2e/stairs.spec.ts` — FOUND

All claimed commits exist:
- 733f717 (Task 1) — FOUND
- bf0ef72 (Task 2) — FOUND
- 648a986 (Task 3) — FOUND
- aaebbec (Task 4) — FOUND
- b5bb7e4 (Task 5) — FOUND
- 76e42f4 (Task 6) — FOUND
- 71ede52 (Task 7) — FOUND

---
*Phase: 60-stairs-stairs-01*
*Completed: 2026-05-05*
