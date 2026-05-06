---
phase: 61-openings-archway-passthrough-niche-open-01
type: context
created: 2026-05-05
status: ready-for-research
requirements: [OPEN-01]
depends_on: [Existing Opening type + WallSegment.openings[] codepath (v1.0), Phase 53 right-click on opening, Phase 54 click-to-select on opening, Phase 33 design system (lucide icons + Material Symbols allowlist), existing doorTool / windowTool placement pattern, Phase 59 wall outward-normal logic (for niche interior-side detection)]
---

# Phase 61: Openings — Archway / Passthrough / Niche (OPEN-01) — Context

## Goal

Extend the existing wall-opening codepath beyond doors and windows. Three new opening kinds: archway (round-top through-hole), passthrough (full-height through-hole), niche (recessed cutout that doesn't go through the wall). Most homes have at least one wall opening that isn't a door or window — a kitchen pass-through, a doorless living-room archway, a built-in display niche.

Source: REQUIREMENTS.md `OPEN-01` ([#19 partial](https://github.com/micahbank2/room-cad-renderer/issues/19)).

## Pre-existing infrastructure

- **`src/types/cad.ts:78-85`** — `Opening` type: `{ id, type: "door" | "window", offset, width, height, sillHeight }`. Stored in `WallSegment.openings[]`. Already snapshot-serialized.
- **`src/canvas/tools/doorTool.ts`** + **`windowTool.ts`** — placement tool template. Click on a wall → places opening with kind-specific defaults.
- **`src/three/WallMesh.tsx:104-131`** — `THREE.Shape` builder. Currently `Path.lineTo` 4-point rectangular hole per opening. Phase 61 extends this to support archway-arc paths and niche separate-mesh rendering.
- **`src/canvas/fabricSync.ts`** — 2D opening overlay rendering (white polygon for door/window). New 2D symbols needed per kind.
- **Phase 53/54** — right-click + click-to-select on openings already work (existing data attribute pattern). Inheritance is automatic for new kinds.
- **Phase 59 outward-normal logic** in `src/three/cutawayDetection.ts` — used to detect "interior face" of a wall (for niche placement). Re-export the helper.

## Decisions

### D-01 — Extend `Opening.type` enum (no new entity)

```ts
export interface Opening {
  id: string;
  type: "door" | "window" | "archway" | "passthrough" | "niche";  // NEW: 3 added kinds
  offset: number;       // distance along wall from start (existing)
  width: number;        // feet (existing)
  height: number;       // feet (existing)
  sillHeight: number;   // feet from floor (existing; doors=0, niches>0, archway/passthrough=0)
  /** Niche-only: depth of the recess into the wall. Optional; ignored for through-holes. */
  depthFt?: number;     // NEW (default 0.5 ft = 6")
}
```

**Why extend, not new entity:** archway and passthrough are wall cutouts just like doors/windows — they fit the existing `WallSegment.openings[]` model. Niche is also a wall cutout (just one that doesn't go through). All 5 kinds share `offset / width / height / sillHeight`; only niche needs the new `depthFt` field.

**Snapshot back-compat (research Q3):** existing snapshots with `type: "door" | "window"` load unchanged. New optional field `depthFt` is undefined for non-niches. **No snapshot version bump needed** — type-union extension + optional new field is back-compat.

### D-02 — Default values per kind

| Kind | Width | Height | Sill | Depth | Notes |
|------|-------|--------|------|-------|-------|
| `door` | 3 ft | 7 ft | 0 ft | — | existing |
| `window` | 3 ft | 4 ft | 3 ft | — | existing |
| `archway` | 3 ft (36") | 7 ft (84") | 0 ft | — | full-height + arched top |
| `passthrough` | 5 ft (60") | wall.height | 0 ft | — | full wall height, no top |
| `niche` | 2 ft (24") | 3 ft (36") | 3 ft (36") | 0.5 ft (6") | elevated; doesn't go to floor |

REQUIREMENTS-locked. Niche `sillHeight` default = 3 ft = 36" (typical shelf-height niche).

### D-03 — Toolbar layout: Door + Window primary; 3 new in dropdown

User-facing choice. Toolbar layout:
- **Door** button (primary, lucide `DoorOpen`) — unchanged
- **Window** button (primary, lucide `Square` or material-symbols `window`) — unchanged
- **NEW: Wall Cutouts dropdown** (lucide `MoreHorizontal` or `ChevronDown` trigger) → reveals popover with 3 items:
  - Archway (lucide best-fit; if none, material-symbols `door_front` or custom SVG)
  - Passthrough (lucide best-fit)
  - Niche (lucide best-fit)

Phase 33 D-33 allowlist may need expansion if no lucide icons fit. Research will confirm.

**Why dropdown:** door + window are heavily-used; demoting them hurts daily UX. Keeping all 5 as primary buttons crowds an already-busy toolbar (post-Phase 60 it has 8+ tools). The 3 new openings are placed less frequently — dropdown is the right tier.

### D-04 — Archway shape: round / semicircular only

User-facing choice. Archway top is a half-circle (semicircular). Implementation: `THREE.Path.absarc` from one corner of the rectangular shaft to the other, with center at the midpoint and radius = width / 2.

```ts
// In wall shape builder, for archway opening:
const archCenterX = oLeft + opening.width / 2;
const archRadius = opening.width / 2;
const shaftTop = oBottom + opening.height - archRadius;
hole.moveTo(oLeft, oBottom);
hole.lineTo(oRight, oBottom);
hole.lineTo(oRight, shaftTop);
hole.absarc(archCenterX, shaftTop, archRadius, 0, Math.PI, false);
hole.lineTo(oLeft, oBottom);
```

**Why round only:** standard interior archway. Pointed / Gothic is rare; defer to v1.16+ if requested.

### D-05 — Niche depth: user-configurable, default 6"

User-facing choice. Niche `depthFt` defaults to 0.5 (6"), editable in PropertiesPanel via inches input. Validation clamps to `min(wallThickness - 1") so the back of the recess never breaks through. (Wall thickness exposed via `wall.thickness`.)

Range: 2"–12". Below 2" doesn't read as a recess; above 12" exceeds typical residential wall thickness.

### D-06 — Niche face: interior-side only (auto-detected)

User-facing choice. Niche always renders on the **interior face** of the wall. Interior = the side facing the room centroid (Phase 59 outward-normal logic, but inverted: niche faces INWARD).

Implementation: re-export Phase 59's outward-normal helper as `getWallInteriorNormal(wall, room)` and use it to position the niche mesh on the inside face.

**Why interior-only:** real-world niches are interior decorative recesses. No use case for exterior niches in v1.15.

### D-07 — Niche 3D rendering: separate inset mesh (not wall hole)

Archway and passthrough cut THROUGH the wall (existing `THREE.Shape.holes` pattern with kind-specific path).

Niche does NOT cut through. Instead:
1. The wall's `THREE.Shape.holes` excludes the niche (no hole at all — wall remains solid)
2. A separate `<mesh>` is rendered at the wall's interior face, recessed inward by `depthFt`
3. The niche mesh has its own back wall (closes the recess) + 4 side walls + open front
4. Material matches the wall's base color (single-color rendering for v1.15; PBR materials deferred)

**Why separate mesh, not modified extrude geometry:** simpler implementation, avoids deep `THREE.ExtrudeGeometry` modification, easier to apply materials later. ~30 lines of geometry construction.

### D-08 — 2D symbols per kind

Existing door/window 2D symbols (white polygon overlay) extended:

- **Archway:** rectangle outline + arc above the line (small THREE.Path → fabric.Path)
- **Passthrough:** rectangle outline (taller than door, no top frame line). Open at top-bottom for visual differentiation
- **Niche:** rectangle outline + diagonal hatch lines indicating "recessed not through" — Phase 33 design tokens for hatch color (text-text-dim @ 30% opacity)

All wrapped in `fabric.Group` with `data: { type: "opening", openingId, openingType }` so Phase 53/54 dispatch already works.

### D-09 — Three new placement tools

- `src/canvas/tools/archwayTool.ts` — NEW (~80 lines), mirrors `doorTool.ts`
- `src/canvas/tools/passthroughTool.ts` — NEW (~80 lines), mirrors `doorTool.ts`
- `src/canvas/tools/nicheTool.ts` — NEW (~90 lines), mirrors `doorTool.ts` + adds depth handling

Each tool: click on wall → snap to wall edge midpoint → place opening with kind-specific defaults. No smart-snap to other things (consume-only — Phase 60 D-05 precedent).

### D-10 — PropertiesPanel: kind-specific inputs

Existing PropertiesPanel `OpeningSection` already shows `width / height / sillHeight / offset` (door/window). Extend with:
- **Archway:** same as door (no extra inputs — archway is procedurally generated from width)
- **Passthrough:** same as door but height defaults to wall height (and shows that fact in placeholder)
- **Niche:** adds `Depth` input (inches) + clamp validation

Single-undo via `*NoHistory` mid-drag commits on Enter/blur (Phase 31 pattern).

### D-11' — Phase 53 + 54 wiring (REVISED — NEW code required)

**Research correction:** the original D-11 assumption was wrong. Phase 53 right-click and Phase 54 click-to-select do NOT currently work for openings. Verified by research:
- `ContextMenuKind` union has no `"opening"` kind
- `FabricCanvas.tsx:498` explicitly comments `// Skip: ... opening` in the right-click hit-test
- Openings render with `selectable: false, evented: false` so no click-to-select either

Phase 61 must ADD opening support to both:

1. **Phase 53 right-click:** extend `ContextMenuKind` union with `"opening"`; add hit-test branch in `FabricCanvas.tsx`; add `getActionsForKind('opening')` branch in `CanvasContextMenu.tsx` (5 actions: Focus camera, Save camera here, Hide/Show, Delete; Copy/Paste deferred since Opening is a sub-entity of WallSegment)
2. **Phase 54 click-to-select:** make the 2D opening overlay `selectable + evented`; in 3D, add `onContextMenu` + `onClick` to a wrapping group at the niche/archway/passthrough render site (mirror Phase 56 `WallMesh.tsx:430-438` pattern)
3. **Selection state:** openings use the existing `selectedIds: Set<string>` model — opening IDs are first-class

This adds ~30-40 LOC across `src/canvas/FabricCanvas.tsx`, `src/components/CanvasContextMenu.tsx`, `src/stores/uiStore.ts`, and the new opening tools / mesh files. Counts as a new task in the plan.

**Inclusion in Phase 61:** Phase 54 click-to-select for openings COULD theoretically spin out as a separate phase, but research recommends inclusion — it's small (one hook per mesh kind), and shipping new opening kinds without click-to-select would feel half-done.

### D-12 — Test coverage

**Unit (vitest):**
1. `Opening.type` accepts all 5 kinds
2. Default-value resolver returns correct defaults per kind
3. Niche depthFt clamps to `wallThickness - 1"`
4. Snapshot v4 with new opening kinds round-trips correctly

**Component (vitest + RTL):**
5. PropertiesPanel for niche shows Depth input
6. PropertiesPanel for passthrough shows wall-height placeholder
7. PropertiesPanel for archway hides Depth input

**E2E (Playwright):**
8. Toolbar Wall Cutouts dropdown → click Archway → click on wall → archway placed; 3D shows arched top
9. Same for Passthrough → full-height rectangle through-hole
10. Same for Niche → recessed mesh on interior face; wall NOT cut through (camera through wall doesn't see niche back)
11. Niche depth input updates 3D mesh
12. Phase 53 right-click on each new kind → context menu opens with all 6 actions
13. Old snapshot with door + window only loads cleanly (back-compat)

### D-13 — Atomic commits per task

Mirror Phase 49–60 pattern.

### D-14 — Zero regressions

- Phase 30 smart-snap unchanged (openings consume snap targets, don't contribute)
- Phase 31 size-override unchanged
- Existing door/window placement + rendering unchanged (kind-discriminated branch)
- Phase 33 design system: new dropdown UI uses Phase 33 tokens; lucide icons or D-33 allowlist exception
- Phase 46 tree visibility cascade unchanged (openings don't have separate tree nodes)
- Phase 53/54 inherit automatically
- Phase 56-58 GLTF unchanged
- Phase 59 cutaway unchanged (operates on walls; openings are cutouts within walls)
- Phase 60 stairs unchanged
- 4 pre-existing vitest failures must remain exactly 4
- Snapshot back-compat: existing snapshots with `type: "door" | "window"` load unchanged; no version bump

## Out of scope (this phase — confirmed v1.15 locks)

- Pointed / Gothic / Tudor archway shapes (round only for v1.15)
- Multi-tier niches (single rectangular niche only)
- Niche shelving / interior dividers
- Niche back-wall material override (single base color for v1.15)
- Exterior-facing niches (interior face only — D-06)
- Curved niches (rectangular only)
- Through-hole niches (defeats the "recess" semantics)
- Floor-to-ceiling niches (sillHeight > 0 always)
- Per-opening material override (uses wall material — v1.15 simplification)
- Animated open/close for archways (not a door — always open)

## Files we expect to touch

- `src/types/cad.ts` — extend `Opening.type` union; add optional `depthFt?: number` field
- `src/three/WallMesh.tsx` — kind-discriminated shape-builder branches (archway arc, passthrough taller rect, niche separate mesh insert)
- `src/three/NicheMesh.tsx` — NEW (~80 lines): separate inset mesh for niche kind
- `src/canvas/tools/archwayTool.ts` — NEW (~80 lines)
- `src/canvas/tools/passthroughTool.ts` — NEW (~80 lines)
- `src/canvas/tools/nicheTool.ts` — NEW (~90 lines)
- `src/canvas/fabricSync.ts` — kind-discriminated 2D symbol rendering
- `src/canvas/openingSymbols.ts` — NEW (~80 lines): pure 2D shape builders per kind
- `src/components/Toolbar.tsx` — add Wall Cutouts dropdown trigger + popover with 3 items
- `src/components/Toolbar.WallCutoutsDropdown.tsx` — NEW (~70 lines): dropdown popover component
- `src/components/PropertiesPanel.OpeningSection.tsx` — extend with niche depth input + kind-specific placeholder text (file may already exist; verify in research)
- `src/three/cutawayDetection.ts` — re-export `getWallInteriorNormal` helper for niche side detection
- `src/test-utils/openingDrivers.ts` — NEW: `__drivePlaceArchway`, `__drivePlacePassthrough`, `__drivePlaceNiche`, `__getOpeningKind`
- `tests/types/opening.test.ts` — NEW (4 unit tests U1-U4)
- `tests/components/PropertiesPanel.opening.test.tsx` — NEW (3 component tests C1-C3)
- `e2e/openings.spec.ts` — NEW (6 e2e scenarios E1-E6)

Estimated 1 plan, 6-8 tasks, ~16 files. Mid-size phase.

## Open questions for research phase

1. **Lucide-react icons for archway / passthrough / niche:** does lucide-react have suitable glyphs for these? Likely no direct matches. Confirm + recommend fallback (Material Symbols `arch`, `door_front`, `inventory_2`, etc.) AND whether D-33 allowlist needs expansion (Toolbar.tsx and TreeRow.tsx already on it; new dropdown component would be a third file unless we inline into Toolbar).

2. **THREE.Path.absarc for archway:** confirm correct argument order and direction (`absarc(x, y, radius, startAngle, endAngle, clockwise)`). Test with a single archway opening that the resulting `ExtrudeGeometry` doesn't crash on the bezier-arc transition.

3. **Niche mesh positioning math:** how to compute the niche mesh's world position given:
   - Wall start/end points (world coords)
   - Opening offset (along wall)
   - Sill height + height + width + depth
   - Wall thickness
   - Wall outward-normal direction (interior is inverse)
   The mesh sits on the wall's interior face, recessed inward by depthFt. Need a clear formula research validates.

4. **Existing PropertiesPanel `OpeningSection`:** does this component already exist as a separate file, or is it inline in PropertiesPanel.tsx? Confirm location + extension shape.

5. **Phase 53/54 menu inheritance:** confirm the kind discriminator in `CanvasContextMenu.tsx`. Does `kind === "opening"` cover all opening types, or is there per-type discrimination? Either way the new kinds need to fall through cleanly.

6. **Niche back-wall material:** the back wall of the niche needs a material. Use the wall's base color (single solid)? Or query the wall's material/wallpaper? For v1.15 simplicity, recommend wall's base color only — defer wallpaper-into-niche to v1.16 if Jessica asks.

7. **Toolbar dropdown UI primitive:** does the codebase have an existing dropdown / popover primitive (radix-ui? headlessui? custom)? Or do we build inline? Phase 33 design system may have established a pattern. Research should locate it.
