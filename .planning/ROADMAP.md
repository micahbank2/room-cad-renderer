# Roadmap: Room CAD Renderer

## Milestones

- ✅ **v1.0 Room Visualization MVP** — Phases 1–5.1 (shipped 2026-04-05) — see [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 UX Fixes & Polish** — Phases 6–10 (shipped 2026-04-05) — see [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 New Element Types** — Phases 11–17 (shipped 2026-04-05) — see [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md)
- 📋 **v1.3 Color, Polish & Materials** — Phases 18–20 (active)

---

## v1.3 Color, Polish & Materials

**Goal:** Round out v1.2 with a full paint system, fix v1.2 edit gaps, and unify material catalogs.

## Phases

- [ ] **Phase 18: Color & Paint System** — Global paint library with 132 Farrow & Ball colors + custom colors; apply paint to walls and ceilings in 2D and 3D
- [ ] **Phase 19: v1.2 Polish Pass** — Edit handles for custom elements, wainscot edit-in-place, copy-side wall treatments, per-placement frame overrides
- [ ] **Phase 20: Advanced Materials** — Unified ceiling/floor surface material catalog with texture presets; floor texture cache fix

## Phase Details

### Phase 18: Color & Paint System
**Goal**: Users can paint any wall side or ceiling with named colors from a Farrow & Ball catalog or custom palette
**Depends on**: Nothing (first phase of v1.3)
**Requirements**: PAINT-01, PAINT-02, PAINT-03, PAINT-04, PAINT-05, PAINT-06, PAINT-07
**Success Criteria** (what must be TRUE):
  1. User can open a paint picker on any wall side and the wall instantly shows the chosen color in both 2D floor plan and 3D view
  2. User can browse 132 Farrow & Ball swatches with hue family filter and name search, then apply a color with one click
  3. User can create a custom paint color by entering a hex value, name it, and save it to the library for reuse across walls and ceilings
  4. User can toggle lime wash on any applied paint and see a visibly chalky/matte surface in the 3D rendering
  5. User can paint all walls in the current room a single color in one action, and the recently-used palette row reflects the colors just applied
**Plans:** 4 plans
Plans:
- [x] 18-01-PLAN.md — Data foundation: types, F&B catalog, paintStore, colorUtils, cadStore extensions
- [x] 18-02-PLAN.md — Rendering: 3D paint + lime wash in WallMesh/CeilingMesh, 2D paint + lime wash in fabricSync
- [x] 18-03-PLAN.md — UI: PaintSection component, CeilingPaintSection, WallSurfacePanel integration
- [ ] 18-04-PLAN.md — Visual verification checkpoint
**UI hint**: yes

### Phase 19: v1.2 Polish Pass
**Goal**: Every placed element can be edited in place, and common wall treatment workflows require half as many clicks
**Depends on**: Phase 18 (proceeds after paint system; independent in type dependencies)
**Requirements**: POLISH-01, POLISH-02, POLISH-03, POLISH-04
**Success Criteria** (what must be TRUE):
  1. User can click a placed custom element and drag, rotate, or resize it via visible handles — identical behavior to placed products
  2. User can double-click a wainscoting style in the library panel and edit its name, height, or color without opening a separate dialog
  3. User can click a single "Copy to Side B" button on a wall's SIDE_A treatment panel and all treatments (wallpaper, wainscoting, art, crown) instantly appear on SIDE_B
  4. User can select any placed framed art piece and override just its frame color from the properties panel without changing the library entry
**Plans**: TBD
**UI hint**: yes

### Phase 20: Advanced Materials
**Goal**: Wall surfaces, ceilings, and floors all draw from one consistent material catalog, and ceiling textures work as reliably as floor textures
**Depends on**: Phase 18 (extends ceiling render path established by paint system)
**Requirements**: MAT-01, MAT-02, MAT-03
**Success Criteria** (what must be TRUE):
  1. User can open a single "Surface Materials" picker for either floor or ceiling and see all texture presets in one catalog (plaster, wood plank, concrete, painted drywall for ceilings; existing 8 floor presets)
  2. User can apply a ceiling texture preset and the 3D ceiling renders the texture consistently — no tile scale corruption when multiple rooms are open in split view
  3. All existing projects load without errors; floor material selections saved before v1.3 continue working without any migration step
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 18. Color & Paint System | 3/4 | In Progress|  |
| 19. v1.2 Polish Pass | 0/? | Not started | - |
| 20. Advanced Materials | 0/? | Not started | - |

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

<details>
<summary>✅ v1.2 New Element Types (Phases 11–17) — SHIPPED 2026-04-05</summary>

7 phases, 8 PRs, 29 requirements. Ceilings, floor materials, wallpaper, wall art, wainscoting, crown molding, custom elements, framed art library, 7 wainscoting styles with live 3D preview, per-side wall treatments. See [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md).

</details>
