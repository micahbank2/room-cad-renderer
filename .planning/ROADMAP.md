# Roadmap: Room CAD Renderer

## Milestones

- ✅ **v1.0 Room Visualization MVP** — Phases 1–5.1 (shipped 2026-04-05) — see [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 UX Fixes & Polish** — Phases 6–9 (in progress — Phase 6 shipped)
- 📋 **v1.2 New Element Types** — Phases 9–11 (planned)
- 📋 **v1.3 Color & Paint System** — Phases 12–14 (planned)

## Current Milestone: v1.1 UX Fixes & Polish

**Goal:** The app is usable without workarounds — zoom works, clicks land where you click, tools don't get stuck, measurements are visible while you work, and the home page guides you straight into a floor plan.

### Phase 6: 2D Canvas Navigation
**Goal:** Jessica can zoom, pan, and fit-to-view the 2D canvas so she can work at any scale
**Depends on:** Nothing
**Requirements:** NAV-01, NAV-02, NAV-03
**Success Criteria:**
  1. Scroll wheel zooms in/out centered on the cursor
  2. Middle-click-drag (or space+drag) pans the canvas
  3. +/- buttons and a "Fit to View" button are visible in the tool palette
  4. Zoom level persists during drawing/editing (doesn't snap back)
**UI hint:** yes

### Phase 7: Placement & Interaction Fixes
**Goal:** Placing, rotating, and resizing elements on the 2D canvas feels precise and predictable
**Depends on:** Phase 6
**Requirements:** EDIT-10, EDIT-11, EDIT-12, EDIT-13, EDIT-14
**Success Criteria:**
  1. A door placed on a wall lands exactly where the cursor clicked (no offset drift)
  2. After placing a wall/door/window, the active tool switches back to Select
  3. Selecting a placed wall/door/window shows a rotation handle you can drag
  4. While drawing a wall, the current length shows live as a floating label near the cursor
  5. While resizing a product, a size tag (like Google Slides) shows the current dimensions
**UI hint:** yes

### Phase 9: Wall Rendering Polish
**Goal:** Wall joints look clean in every configuration — X-junctions, dead ends, and mid-wall crossings all render correctly
**Depends on:** Phase 6 (corner caps already handle 2-wall junctions)
**Requirements:** WALL-01, WALL-02, WALL-03
**Success Criteria:**
  1. Three or more walls meeting at a single endpoint render as one clean joint, not as overlapping rectangles with boxes sticking out
  2. Dead-end walls (no neighbors at one or both endpoints) render with a clean cap matching the Obsidian theme — no raw perpendicular butt ends
  3. Two walls crossing through each other mid-segment render with a correct visual overlap (not a jagged X with misaligned thickness)
**UI hint:** yes

### Phase 8: Home Page, Save Visibility, Tab Cleanup
**Goal:** First-time users land in a focused welcome screen and understand their work is saved; broken tabs don't exist
**Depends on:** Phase 7
**Requirements:** SAVE-04, HOME-01, HOME-02, HOME-03, UI-01
**Success Criteria:**
  1. Welcome screen shows exactly 2 primary CTAs: "Create Floor Plan" and "Upload Existing Floor Plan"
  2. A "FLOOR_PLAN" tab appears in the toolbar alongside 2D_PLAN / 3D_VIEW
  3. "From Template → BROWSE" opens a picker showing Living Room, Bedroom, Kitchen presets
  4. Save status is prominently visible in the status bar with clear SAVING/SAVED state transitions
  5. Non-functional sidebar tabs (LAYERS, ASSETS, MEASURE, HISTORY) are removed or wired up to working features
**UI hint:** yes

### Progress

| Phase | Milestone | Plans Complete | Status |
|-------|-----------|----------------|--------|
| 6. 2D Canvas Navigation | v1.1 | 1/1 | Complete (merged 2026-04-05) |
| 7. Placement & Interaction Fixes | v1.1 | 0/TBD | Not started |
| 8. Home Page + Save + Tabs | v1.1 | 0/TBD | Not started |
| 9. Wall Rendering Polish | v1.1 | 0/TBD | Not started (endpoint snap + 2-wall caps done ad-hoc in Phase 6 PR) |

---

## Future Milestones (outline only)

### v1.2 New Element Types (planned)
- **Phase 9: Ceilings** — overhead surface with height, editable material (REQ: CEIL-01/02)
- **Phase 10: Floors & Wall Surfaces** — editable floor material, wallpaper overlays, wall art placement (REQ: FLOOR-01, SURFACE-01/02)
- **Phase 11: Custom Elements** — wainscoting + crown molding presets + freeform primitive builder (REQ: CUSTOM-01/02/03)

### v1.3 Color & Paint System (planned)
- **Phase 12: Color Library Foundation** — global paint store, custom color picker + save (REQ: COLOR-01/02)
- **Phase 13: Farrow & Ball Catalog** — preload ~130 colors with hex + names, filterable (REQ: COLOR-03)
- **Phase 14: Lime Wash + Apply to Surfaces** — toggle filter/shader for any color, apply to walls/ceilings in 2D + 3D (REQ: COLOR-04/05)

---

## Completed Phases

<details>
<summary>✅ v1.0 Room Visualization MVP (Phases 1–5.1) — SHIPPED 2026-04-05</summary>

- [x] Phase 1: 2D Canvas Polish (6/6 plans) — completed 2026-04-05
- [x] Phase 2: Product Library (5/5 plans) — completed 2026-04-05
- [x] Phase 3: 3D Product Rendering (4/4 plans) — completed 2026-04-05
- [x] Phase 4: 3D Walkthrough (3/3 plans) — completed 2026-04-05
- [x] Phase 5: Multi-Room (4/4 plans) — completed 2026-04-05
- [x] Phase 5.1: v1.0 Integration Gaps — INSERTED (1/1 plan) — completed 2026-04-05

</details>
