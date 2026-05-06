---
phase: 60-stairs-stairs-01
type: context
created: 2026-05-05
status: ready-for-research
requirements: [STAIRS-01]
depends_on: [Phase 31 (size-override resolver pattern + edge handles), Phase 30 (smart-snap engine + snap guides), Phase 46 (RoomsTreePanel integration), Phase 47 (RoomGroup multi-room rendering), Phase 48 (saved-camera per node), Phase 53 (right-click menu for new entity kind), Phase 54 (click-to-select on new mesh kind), existing fabricSync.ts product-rendering pattern, existing productTool.ts placement tool pattern]
---

# Phase 60: Stairs (STAIRS-01) — Context

## Goal

New architectural primitive: stairs. Most homes have them; the toolbar doesn't. Jessica can place a stair via the new Toolbar tool, configure rise / run / width / step count via the PropertiesPanel, see it as a top-down stair symbol in 2D and as connected stepped boxes in 3D.

Stairs are a NEW top-level entity (`Stair` type stored at the room level), NOT a `customElement.kind` extension — they have stair-specific fields (rise, run, stepCount) that don't fit the customElement schema.

Source: REQUIREMENTS.md `STAIRS-01` ([#19 partial](https://github.com/micahbank2/room-cad-renderer/issues/19)).

## Pre-existing infrastructure

- **Phase 31** `src/types/product.ts` `resolveEffectiveDims` pattern + edge-handle drag resolver. Stairs reuse the override-or-default pattern: `widthFtOverride ?? defaultWidth`.
- **Phase 30** `src/canvas/snapEngine.ts` + `src/canvas/snapGuides.ts` — smart-snap. Stair placement extends the existing snap scene to include wall edges as snap targets (already supported).
- **Phase 46** `src/components/RoomsTreePanel/` — sidebar tree. `RoomNode → groupKey: "products" | "customElements" | …`. Stairs add a new groupKey `"stairs"`.
- **Phase 47** `src/three/RoomGroup.tsx` — per-room mesh group. Add `<StairMesh>` rendering for each stair under the room.
- **Phase 48** saved-camera per node — extend to stairs (mirrors product/customElement field pattern).
- **Phase 53/54** right-click + click-to-select — extends to stair meshes via `data.stairId` on the `fabric.Group` wrapper (2D) and onPointerUp/onContextMenu on the wrapping `<group>` (3D).
- **`src/canvas/tools/productTool.ts`** — placement tool template. Stair tool mirrors structure (closure-state, snap-cache pattern, cleanup return).
- **`src/canvas/fabricSync.ts:989-1071`** — existing fabric.Group rendering pattern with `data: { type, placedProductId, ... }`. Stair Group uses `data: { type: "stair", stairId: s.id }`.

## Decisions

### D-01 — Stair as new top-level entity

`Stair` type stored at room level (`RoomDoc.stairs: Record<string, Stair>`). NOT a customElement kind because stair-specific fields (rise, run, stepCount) don't fit the customElement catalog/placement model.

**Schema:**
```ts
export interface Stair {
  id: string;                       // "stair_<uid>"
  position: Point;                  // bottom-step center in feet (D-04)
  rotation: number;                 // degrees, continuous (D-02)
  riseIn: number;                   // per-step rise in inches (default 7)
  runIn: number;                    // per-step run in inches (default 11)
  widthFtOverride?: number;         // Phase 31 width drag (default 36" / 3 ft)
  stepCount: number;                // default 12
  labelOverride?: string;           // optional display name; default "STAIRS"
  // Phase 48 CAM-04 (D-03 mirror):
  savedCameraPos?: [number, number, number];
  savedCameraTarget?: [number, number, number];
}
```

Default = 7" rise × 11" run × 36" width × 12 steps (residential IBC-aligned, total run = 132" / 11 ft, total rise = 84" / 7 ft).

### D-02 — Continuous rotation (NOT 4-cardinal snap)

Rotation is a continuous degree value (matches Phase 31 product rotation). Toolbar rotation handle drags freely; Shift snaps to 15° increments (matches existing convention).

REQUIREMENTS.md mentioned "4 cardinal directions" but that's not consistent with how products/customElements rotate. Locked decision: continuous degrees, Shift-snap-15°. Update REQUIREMENTS later if needed.

### D-03 — 2D symbol: outline + parallel step lines + arrow

User-facing choice. Top-down stair symbol = `fabric.Group` containing:
1. Rectangle outline of stair footprint (width × totalRunFt)
2. Parallel lines perpendicular to UP direction — one per step (12 lines for default)
3. Arrow in UP direction (small triangle near top step)
4. Optional `labelOverride` text label below or beside

**NOT** the full traditional drafting symbol with diagonal break-line — single-floor app doesn't need "stair continues beyond this cut" indication.

### D-04 — Placement origin: bottom-step center

User-facing choice. The `position: Point` is the bottom-step center. Click placement: bottom of stair lands at click point; stair extends AWAY in the UP direction (defined by rotation).

**Why bottom-step center:** matches user mental model ("I want to start walking up from here"). Cleaner than bbox center because the bottom step is the user-visible "this is where the stair starts" anchor.

### D-05 — Smart-snap to wall edges

User-facing choice. Stair placement uses Phase 30 `computeSnap()` with the standard snap scene including wall edges. The stair's long edge (bottom-step edge) snaps flush against a wall.

Hold Alt/Option to disable smart-snap (matches Phase 30 convention). Grid-snap remains active with Alt held.

**Implementation:** `stairTool.ts` mirrors `productTool.ts` structure. Snap scene already contains wall endpoints + midpoints; the stair's bottom-edge midpoint is the anchor point used for snap matching.

### D-06 — 3D rendering: N stacked box meshes

User-facing choice. `<StairMesh>` renders `stepCount` separate `<boxGeometry>` meshes, each `widthFt × riseFt × runFt`, stacked + offset along the UP direction. Each step at progressively higher Y and further along the rotation axis.

**Why stacked boxes (not extrude):** simpler implementation, easy debug, fine perf for 12-step defaults (12 draws per stair × ~2 stairs in a typical scene = 24 extra meshes — negligible). Per-step materials become possible later if needed.

```tsx
function StairMesh({ stair, isSelected }) {
  const widthFt = stair.widthFtOverride ?? 3;
  const riseFt = stair.riseIn / 12;
  const runFt = stair.runIn / 12;
  return (
    <group position={[stair.position.x, 0, stair.position.y]} rotation={[0, stair.rotation, 0]}>
      {Array.from({ length: stair.stepCount }, (_, i) => (
        <mesh
          key={i}
          position={[0, riseFt * (i + 0.5), runFt * i + runFt / 2]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[widthFt, riseFt, runFt]} />
          <meshStandardMaterial color="#cdc7b8" roughness={0.7} />
        </mesh>
      ))}
      {isSelected && <SelectionOutline />}
    </group>
  );
}
```

### D-07 — Phase 31 size-override: width-only drag

Edge handles in 2D adjust the stair's width (writes `widthFtOverride`). Corner handles → uniform scale via `sizeScale`? **No.** Stairs don't have a `sizeScale` field — uniform scale on a stair distorts the rise/run/stepCount relationship in unintuitive ways.

**Locked:** edge handles drag width only (left/right of stair → adjust width). Top/bottom edge handles are hidden for stairs (length is determined by rise × stepCount, not user-draggable). Rise / run / stepCount are PropertiesPanel-only (input fields).

### D-08 — PropertiesPanel: rise / run / step count + width

PropertiesPanel inputs:
- Width (feet+inches input, mirrors Phase 31)
- Rise per step (inches input, integer 4-9)
- Run per step (inches input, integer 9-13)
- Step count (integer input, 3-30)
- Rotation (degrees input, 0-359)
- Label (text input, max 40 chars, optional — Phase 31 D-13 mirror)

Live-edit pattern: input updates dispatch `*NoHistory` actions; commit on Enter/blur (single undo entry).

### D-09 — Stair color/material

For v1.15: hardcoded color `#cdc7b8` (warm wood tone) on `<meshStandardMaterial>` with `roughness: 0.7`. No per-stair material override; no PBR pipeline integration.

User can request material configurability later. Keep scope tight.

### D-10 — Tree integration: new groupKey "stairs"

Phase 46 `RoomsTreePanel` gains a new collapsible group per room: "STAIRS". Each stair node:
- `lucide` icon: `Stairs` (or `StepForward` if `Stairs` not in lucide-react)
- Label: `stair.labelOverride` or "STAIRS" + auto-numbered index
- Click → focus camera (Phase 46 pattern)
- Right-click → Phase 53 menu (Focus camera, Save camera here, Hide/Show, Copy, Paste, Delete)
- Double-click → focus saved camera (Phase 48 pattern)

Empty state: "No stairs in this room" placeholder when group expanded.

### D-11 — Phase 53 right-click + Phase 54 click-to-select

3D: wrapping `<group>` carries `onContextMenu` + `onClick` (via Phase 54 `useClickDetect`). Same pattern as `GltfProduct` from Phase 56.

2D: fabric.Group wrapper has `data: { type: "stair", stairId: s.id }`. Phase 53/54 dispatch already keys on `data.type` — extend the type-discriminator switch with one new case.

### D-12 — Snapshot serialization

`RoomDoc.stairs: Record<string, Stair>` is included in CADSnapshot. Increment snapshot version 3 → 4. Migration: load v3 snapshots with empty `stairs: {}` per room. Backward-compatible.

### D-13 — Default values

```ts
const DEFAULT_STAIR: Omit<Stair, "id" | "position"> = {
  rotation: 0,
  riseIn: 7,
  runIn: 11,
  widthFtOverride: undefined,  // resolves to 3 ft (36") default
  stepCount: 12,
  labelOverride: undefined,
};
const DEFAULT_STAIR_WIDTH_FT = 3; // 36"
```

7" rise × 11" run × 36" width × 12 steps = standard residential staircase per IBC R311.

### D-14 — Saved-camera support (Phase 48)

Stairs have `savedCameraPos` + `savedCameraTarget` optional fields (mirrors Phase 48 pattern on PlacedProduct/PlacedCustomElement). PropertiesPanel adds Save Camera / Clear Camera buttons. Tree double-click on stair node → focus camera.

### D-15 — Test coverage

**Unit (vitest):**
1. `addStair(roomId, partial)` writes a stair to `RoomDoc.stairs` with default values applied
2. `updateStair(roomId, stairId, patch)` patches the stair; preserves other fields
3. `removeStair(roomId, stairId)` deletes the stair entry
4. `*NoHistory` variants don't push to undo stack

**Component (vitest + RTL):**
5. PropertiesPanel for a selected stair shows rise/run/width/stepCount/rotation inputs
6. Editing rise input dispatches `updateStairNoHistory` on keystroke; commits on Enter
7. Width edge-handle drag (Phase 31 pattern) updates `widthFtOverride`

**E2E (Playwright):**
8. Click Toolbar Stairs → click in 2D → stair placed with default config (driver assertion: stair appears in `RoomDoc.stairs`)
9. Smart-snap: drag stair tool near wall → snap guide appears; release → stair flush against wall
10. Switch to 3D → 12 stacked box meshes render at expected positions
11. Phase 53 right-click on stair in 2D and 3D → context menu opens with all 6 actions
12. Phase 54 click stair in 3D → PropertiesPanel updates
13. Tree: stair node appears under containing room with Stairs icon

### D-16 — Atomic commits per task

Mirror Phase 49–59 pattern.

### D-17 — Zero regressions

- Phase 31 size-override on products / customElements unchanged
- Phase 30 smart-snap on existing primitives unchanged (snap scene gains stair-edge targets but existing target types unchanged)
- Phase 46 tree groupKeys unchanged for existing types
- Phase 47 RoomGroup multi-room render unchanged
- Phase 48 saved-camera on existing types unchanged
- Phase 53/54 right-click + click-to-select on existing kinds unchanged
- Phase 55-58 GLTF pipeline unchanged
- Phase 59 cutaway unchanged (stairs are inside the room — cutaway operates on walls only, doesn't affect stairs)
- 4 pre-existing vitest failures must remain exactly 4

## Out of scope (this phase — confirmed v1.15 locks)

- Stair landings / multi-flight stairs (turn at landing) — first version is straight runs only
- Spiral stairs — defer
- L-shape stairs with intermediate landing — defer
- Curved / winding stairs — defer
- Handrails / banisters — visual detail; defer
- Floor opening / ceiling cut for upper-floor stairs — single-floor app; multi-floor is v2.0+
- Per-step materials / textures — single material color for v1.15
- IBC code-compliance validator (rise+run+width within code) — informative only, not enforced
- Stair carpet / stair runner — material detail, defer
- "Stair to nowhere" detection (stair top doesn't reach a floor / opening) — out of scope

## Files we expect to touch

- `src/types/cad.ts` — add `Stair` interface + `RoomDoc.stairs: Record<string, Stair>` field
- `src/stores/cadStore.ts` — `addStair`, `updateStair`, `removeStair`, `*NoHistory` variants
- `src/canvas/tools/stairTool.ts` — NEW (~150 lines): placement tool mirroring `productTool.ts`
- `src/canvas/fabricSync.ts` — render stairs as fabric.Group with stair symbol + arrow
- `src/canvas/stairSymbol.ts` — NEW (~80 lines): build the 2D stair-symbol shapes (outline + step lines + arrow)
- `src/three/StairMesh.tsx` — NEW (~80 lines): 3D stacked-box rendering + selection outline
- `src/three/RoomGroup.tsx` — render stairs alongside products / customElements
- `src/components/Toolbar.tsx` — add Stairs tool button (lucide `Stairs` icon if available, else `StepForward`)
- `src/components/PropertiesPanel.tsx` — stair-specific section (rise/run/width/stepCount/rotation/label inputs + Save Camera button)
- `src/components/RoomsTreePanel/RoomsTreePanel.tsx` — add "stairs" groupKey
- `src/components/RoomsTreePanel/TreeRow.tsx` — Stairs icon + empty-state copy
- `src/canvas/CanvasContextMenu.tsx` — add stair-kind action set (mirror product set)
- `src/lib/serialization.ts` — bump snapshot version 3 → 4 with stairs migration
- `src/test-utils/stairDrivers.ts` — NEW: `__drivePlaceStair`, `__getStairCount`, `__getStairConfig`
- `tests/stores/cadStore.stairs.test.ts` — NEW (4 unit tests U1-U4)
- `tests/components/PropertiesPanel.stair.test.tsx` — NEW (3 component tests C1-C3)
- `e2e/stairs.spec.ts` — NEW (6 e2e scenarios E1-E6)

Estimated 1 plan, 6-8 tasks, ~17 files. Largest phase in v1.15 (new entity is bigger surface area than cutaway / opening).

## Open questions for research phase

1. **lucide `Stairs` icon availability:** does `lucide-react` export a `Stairs` icon, or only `StepForward`? Confirm available set; pick the most stair-like glyph. Fallback to material-symbols `stairs` glyph if needed (Phase 33 design-system allowlist accepts CAD-domain glyphs).

2. **Snap engine integration:** Phase 30's `computeSnap()` snap scene currently includes walls + customElements + products. Do we add stair-edge targets to the snap scene (so other primitives snap to placed stairs), or only consume snap targets (stair snaps to walls but nothing snaps to stairs)? Recommend the simpler path. Probably consume-only for v1.15.

3. **Snapshot migration shape:** v3 → v4. Existing migration helpers in `src/lib/serialization.ts` — confirm pattern. Likely just empty `stairs: {}` per RoomDoc on v3 load. Does the snapshot version field require an explicit bump elsewhere (test fixtures, e2e seed data)?

4. **PropertiesPanel structure:** PropertiesPanel currently switches on selected entity kind (wall / product / customElement / ceiling / floor). Confirm the discriminator pattern and where to inject the stair branch. Avoid bloating into unrelated sections.

5. **Phase 53 menu kind discrimination:** `getActionsForKind('wall')` etc. returns the menu set per kind. Does this need a new `getActionsForKind('stair')`, or does the Product action set work as-is? Stairs need: Focus camera, Save camera here, Hide/Show, Copy, Paste, Delete (same 6 as Product). Recommend reusing product action set with kind label override to "STAIR".

6. **Hidden-state interaction with Phase 46:** does the tree visibility cascade (Phase 46 hiddenIds) need to know about stairs? Probably yes — stairs hidden via tree should not render in 2D or 3D. Confirm `hiddenIds: Set<string>` is keyed by entity id (not kind-scoped); stair IDs join the same set.
