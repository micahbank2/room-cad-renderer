# Roadmap: Room CAD Renderer

## Milestones

- ✅ **v1.0 Room Visualization MVP** — Phases 1–5.1 (shipped 2026-04-05) — see [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 UX Fixes & Polish** — Phases 6–10 (shipped 2026-04-05) — see [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)
- 🚧 **v1.2 New Element Types** — Phases 11–14 (planning)
- 📋 **v1.3 Color & Paint System** — planned

## Current Milestone: v1.2 New Element Types

**Goal:** Beyond walls + products. Add the architectural and decorative elements that make a room feel real: ceilings, floor materials, wallpaper, wall art, wainscoting, crown molding, and custom elements.

### Phase 11: Ceilings
**Goal:** Jessica can draw ceilings as independent polygon surfaces with editable height + material, and see them overhead in 3D
**Depends on:** Nothing (first v1.2 phase)
**Requirements:** CEIL-01, CEIL-02, CEIL-03, CEIL-04
**Success Criteria:**
  1. Jessica can draw a ceiling by clicking points on the 2D canvas (tool behavior similar to wall tool but for polygon perimeters)
  2. Each ceiling has an editable height (defaults to room.wallHeight, shown in properties panel)
  3. Ceiling renders as a flat overhead surface in 3D at its height
  4. Jessica can assign a material (solid color or from catalog) to each ceiling
**UI hint:** yes

### Phase 12: Floor Materials
**Goal:** Swap the single procedural wood floor for per-room material picking + custom uploads
**Depends on:** Phase 11 (reuses material catalog concept)
**Requirements:** FLOOR-01, FLOOR-02, FLOOR-03
**Success Criteria:**
  1. Jessica can pick a floor material from a preset catalog (~8 options: wood, tile, concrete, carpet, marble, stone, vinyl, polished-concrete)
  2. Jessica can upload her own texture image as a floor material
  3. Floor material has adjustable scale + rotation (so 12"×12" tiles actually read as 12"×12" in 3D)
  4. Change persists per-room in the CAD snapshot
**UI hint:** yes

### Phase 13: Wall Surfaces + Architectural Trim
**Goal:** Per-wall wallpaper, per-wall wainscoting/crown toggles, and placed wall art
**Depends on:** Phase 12 (reuses material catalog infrastructure)
**Requirements:** SURFACE-01/02/03/04, TRIM-01/02/03
**Success Criteria:**
  1. Jessica can apply wallpaper (pattern image or solid color) to individual walls via the properties panel
  2. Jessica can place wall art items on any wall at specific x-position + height (stored per-wall)
  3. Wall art items have configurable W × H, render in 3D flush on the wall face
  4. Wall art items can be moved, resized, removed after placement
  5. Per-wall toggles add wainscoting (editable height, default 36") and crown molding
  6. Wainscoting + crown render as distinct architectural bands in 3D
**UI hint:** yes

### Phase 14: Custom Element Builder
**Goal:** Jessica can build and place custom decor/furniture items that aren't in her product library (built-ins, shelves, tables, etc.)
**Depends on:** Phases 11–13 (reuses material catalog)
**Requirements:** CUSTOM-01, CUSTOM-02, CUSTOM-03, CUSTOM-04, CUSTOM-05
**Success Criteria:**
  1. A "+ CUSTOM_ELEMENT" button opens a builder: name, shape (box or plane), W × D × H, material/color
  2. Custom elements place on the 2D canvas like products but require no image
  3. Custom elements support the same edit handles as products (rotate + resize + delete)
  4. Custom elements render in 3D with configured dimensions + material
  5. Saved custom elements persist in a per-project catalog for re-placement
**UI hint:** yes

### Progress

| Phase | Milestone | Plans | Status |
|-------|-----------|-------|--------|
| 11. Ceilings | v1.2 | 0/TBD | Not started |
| 12. Floor Materials | v1.2 | 0/TBD | Not started |
| 13. Wall Surfaces + Trim | v1.2 | 0/TBD | Not started |
| 14. Custom Element Builder | v1.2 | 0/TBD | Not started |

---

## Future Milestones (outline only)

### v1.3 Color & Paint System (planned)
- Global paint library (separate from product/material catalogs)
- Farrow & Ball catalog preloaded (~130 colors with hex + names)
- Custom color creation + save to library
- Lime wash toggle (shader/filter effect applicable to any color)
- Apply paint to walls and ceilings in 2D + 3D

---

## Completed Milestones

<details>
<summary>✅ v1.0 Room Visualization MVP (Phases 1–5.1) — SHIPPED 2026-04-05</summary>

6 phases, 23 plans. Core loop: global product library → 2D floor plans → textured 3D rendering → eye-level walkthrough → PNG export → auto-saved. See [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md).

</details>

<details>
<summary>✅ v1.1 UX Fixes & Polish (Phases 6–10) — SHIPPED 2026-04-05</summary>

6 phases, 7 PRs, 21 requirements. Zoom/pan, click accuracy, tool auto-revert, live dimensions, wall rotation, product resize, corner-perfect wall rendering, edit handles for every element, home page redesign, prominent save. See [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md).

</details>
