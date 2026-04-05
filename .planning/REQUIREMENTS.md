# Requirements — Room CAD Renderer v1.1

## Core Value

Jessica can see her future room with her actual furniture before spending money.

**v1.1 focus:** The app is usable without workarounds — zoom works, clicks land where you click, tools don't get stuck, measurements are visible while you work, and the home page guides you straight into a floor plan.

---

## v1.1 Requirements

### 2D Canvas Navigation

- [ ] **NAV-01**: User can zoom in/out on the 2D canvas (scroll wheel + pinch + +/- buttons)
- [ ] **NAV-02**: User can pan the 2D canvas (middle-click drag or space+drag)
- [ ] **NAV-03**: "Fit to view" button recentres + zooms to fit the whole floor plan

### Placement & Interaction Fixes

- [ ] **EDIT-10**: Door/window placement lands at cursor coordinates (not offset)
- [ ] **EDIT-11**: Tools auto-revert to Select after placing a wall / door / window
- [ ] **EDIT-12**: User can rotate an already-placed wall, door, or window (rotation handle on selection)
- [ ] **EDIT-13**: Live dimension display shows dragged-wall length in real-time while drawing
- [ ] **EDIT-14**: Live size display shows product dimensions in real-time while resizing (Google-Slides style tag)

### Auto-save Visibility

- [ ] **SAVE-04**: Save status is prominently visible — clear "SAVING..." → "SAVED" transitions, not buried

### Home Page Flow

- [ ] **HOME-01**: Welcome screen presents exactly 2 primary options: "Create Floor Plan" and "Upload Existing Floor Plan"
- [ ] **HOME-02**: "Floor Plan" appears as a top-level tab in the toolbar (alongside 2D_PLAN / 3D_VIEW / etc.)
- [ ] **HOME-03**: "From Template → Browse" opens a working template picker (living room, bedroom, kitchen presets)

### Broken Tabs Cleanup

- [ ] **UI-01**: Remove or wire up the non-functional sidebar tabs (LAYERS, ASSETS, MEASURE, HISTORY)

### Wall Rendering Polish

- [ ] **WALL-01**: X-junctions (3+ walls meeting at one endpoint) render as clean joints, not rectangle pile-ups
- [ ] **WALL-02**: Dead-end walls (no neighbors) get cleaner end caps than the current perpendicular butt
- [ ] **WALL-03**: Walls that cross through each other mid-segment (not sharing endpoints) render with correct visual overlap

---

## v1 Requirements (Validated — shipped)

See `.planning/milestones/v1.0-REQUIREMENTS.md` — all 14 v1.0 requirements complete.

---

## v1.2 Requirements (Deferred — New Element Types)

- New element: Ceilings (overhead surface like floor/walls)
- Editable floors (material, pattern, texture)
- Wallpaper & wall art (surface overlays on walls)
- Custom elements: Wainscoting preset (wall section 36" height)
- Custom elements: Crown molding preset (wall-ceiling trim)
- Custom elements: Freeform primitive builder (box/plane, configurable dims, material)

## v1.3 Requirements (Deferred — Color & Paint System)

- Color/paint library (global, separate from product library)
- Farrow & Ball catalog preloaded (~130+ colors with hex + names)
- Custom color creation + save to library
- Lime wash toggle (shader/filter effect applicable to any color)
- Apply paint color to walls and ceilings (2D + 3D)

## v2 Requirements (Deferred)

- iPad / touch-friendly support
- Connected whole-house floor plan (rooms linking via doorways)
- Backend / cloud sync
- GLTF/OBJ 3D model upload

## Out of Scope

- Multi-user / collaboration
- CAD file exports
- Pricing / shopping lists
- Mobile phone support
- Professional drafting features (layers, annotations, blueprints)

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| NAV-01 | Phase 6 | Active |
| NAV-02 | Phase 6 | Active |
| NAV-03 | Phase 6 | Active |
| EDIT-10 | Phase 7 | Active |
| EDIT-11 | Phase 7 | Active |
| EDIT-12 | Phase 7 | Active |
| EDIT-13 | Phase 7 | Active |
| EDIT-14 | Phase 7 | Active |
| SAVE-04 | Phase 8 | Active |
| HOME-01 | Phase 8 | Active |
| HOME-02 | Phase 8 | Active |
| HOME-03 | Phase 8 | Active |
| UI-01 | Phase 8 | Active |
| WALL-01 | Phase 9 | Active |
| WALL-02 | Phase 9 | Active |
| WALL-03 | Phase 9 | Active |
