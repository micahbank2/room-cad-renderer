---
phase: 54-props3d-01-properties-panel-3d
type: context
created: 2026-04-28
status: ready-for-research
requirements: [PROPS3D-01]
depends_on: [Phase 53 right-click context menu wiring (don't conflict with left-click), Phase 47 RoomGroup multi-room iteration, Phase 48 PropertiesPanel save-camera, Phase 31 inline editing]
---

# Phase 54: PropertiesPanel in 3D + Split View (PROPS3D-01) — Context

## Goal

3D click-to-select wires to `useUIStore.selectedIds`. PropertiesPanel renders in 3D-only and split modes. Selection state is single source of truth across both panes. Source: [GH #97](https://github.com/micahbank2/room-cad-renderer/issues/97).

## Scope reality (from scout)

Bigger than the issue title suggests:
- **No 3D click-to-select wiring exists.** Mesh components have no `onClick`/`onPointerDown` handlers. Phase 54 wires the whole flow.
- **PropertiesPanel already mounts in 3D-only mode** (App.tsx:270) but inside the `viewMode === "3d"` pane, NOT in split-mode 3D pane.
- **In split mode**, PropertiesPanel only renders in the 2D pane (line 250). Selection sync should already work because `selectedIds` is a single uiStore field.

## Decisions

### D-01 — Click vs orbit-drag detection (movement threshold)

Track pointer-down screen position in a ref. On pointer-up, compute distance moved. If `< 5px`, treat as click and dispatch `useUIStore.getState().select([id])`. If `≥ 5px`, treat as orbit drag and ignore.

**Why 5px:** matches OS conventions (drag-threshold), prevents accidental deselects during normal orbit camera use.

### D-02 — Click on empty 3D space deselects

`<Canvas onPointerMissed>` calls `useUIStore.getState().select([])` to clear selection. Mirrors 2D Fabric behavior where clicking empty canvas clears selection.

Honors the same drag-threshold check (don't deselect after orbit-drag).

### D-03 — Split mode: ONE PropertiesPanel (in the 2D pane)

Keep the existing single-panel layout in split mode. The panel renders in the 2D pane (line 250). Click in either pane updates `selectedIds`; the panel re-renders accordingly.

**Why one panel:** two panels in split mode wastes horizontal space and visually duplicates. Single source of truth at uiStore level handles cross-pane sync without UI duplication.

### D-04 — 3D-only mode: keep existing PropertiesPanel mount

Already wired at App.tsx:270 inside the 3D pane. Verify it works for ALL selection kinds (walls / products / ceilings / custom elements). No code change needed unless verification finds gaps.

### D-05 — Click priority vs Phase 53 right-click

Phase 53 wired `onContextMenu` (right-click via `e.button === 2` checks). Phase 54 wires LEFT-click selection via `onPointerDown`/`onPointerUp` with explicit `e.button === 0` check. Independent paths — no conflict.

Both must coexist on the same mesh. Researcher confirms exact event-handler attachment pattern in WallMesh/ProductMesh/CeilingMesh.

### D-06 — Test coverage

- **Unit:** click-vs-drag threshold function (5px) with vitest — pure math, no DOM
- **E2E:**
  1. Click wall in 3D → PropertiesPanel shows wall properties
  2. Click product in 3D → PropertiesPanel shows product properties
  3. Click ceiling in 3D → PropertiesPanel shows ceiling properties
  4. Click custom element in 3D → PropertiesPanel shows
  5. Click empty 3D space → selection clears
  6. Click + drag (orbit) does NOT change selection
  7. Split mode: click in 3D pane → 2D pane's PropertiesPanel updates
  8. Split mode: click in 2D pane → still works (regression check)
  9. Right-click in 3D still opens context menu (Phase 53 regression)

### D-07 — Atomic commits per task

One commit per logical change. Mirror Phase 49–53 pattern.

### D-08 — Zero regressions

- Phase 31 inline editing on PropertiesPanel
- Phase 47 displayMode interactions (NORMAL/SOLO/EXPLODE)
- Phase 48 saved-camera Save/Clear buttons in PropertiesPanel
- Phase 53 right-click context menu (left + right click coexist)
- Phase 46 tree click-to-focus
- 6 pre-existing vitest failures unchanged

## Out of scope

- Multi-select via Shift/Cmd+click in 3D (single-select only this phase)
- Keyboard navigation between selected meshes
- Two PropertiesPanels in split mode (D-03 explicitly chooses one)
- Hover highlight on meshes (no `onPointerOver`/`onPointerOut` work)
- Dimension editing in 3D (Phase 29 is 2D-only by design)
- Mobile / touch tap-to-select (no mobile target user)

## Files we expect to touch (estimate)

- `src/three/WallMesh.tsx` — add `onPointerDown`/`onPointerUp` with drag-threshold check
- `src/three/ProductMesh.tsx` — same
- `src/three/CeilingMesh.tsx` — same
- (any custom element mesh component) — same
- `src/three/ThreeViewport.tsx` — add `<Canvas onPointerMissed>` for empty-space deselect
- `src/App.tsx` — render PropertiesPanel in split-mode 3D pane (or confirm split layout is fine with single panel — D-03 says fine)
- `src/lib/dragThreshold.ts` (NEW or inline) — pure helper for click-vs-drag math
- New: `tests/lib/dragThreshold.test.ts` (or inline in component test)
- New: `e2e/properties-panel-3d.spec.ts` — 9 scenarios

Estimated 1 plan, 3-4 tasks, ~8 files. Smaller than Phase 53.

## Open questions for research phase

1. **Pointer-event propagation in R3F:** Does `e.stopPropagation()` on a mesh's `onPointerUp` prevent the Canvas-level `onPointerMissed` from firing? Confirm with file:line.
2. **Custom element mesh component:** Find the file path. Does it exist as a separate component or is it inlined in ThreeViewport?
3. **Split-mode existing PropertiesPanel:** Confirm it currently renders in the 2D pane during split mode. If not, this phase needs to add it (D-03 says single panel; the location matters).
4. **Wall mesh hit area:** Walls are thin extruded rectangles. Does R3F hit-test the visible wall surface, or do users need to click within a few pixels of an edge? May affect UX but not blocking — note for HUMAN-UAT.
5. **Drag-threshold helper location:** new `src/lib/dragThreshold.ts` (cleanest), or inline in each mesh component (more duplication)?
