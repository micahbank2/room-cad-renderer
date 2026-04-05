# Requirements — Room CAD Renderer v1.2

## Core Value

Jessica can see her future room with her actual furniture before spending money.

**v1.2 focus:** Beyond walls + products. Add the architectural and decorative elements that make a room feel real: ceilings, floor materials, wallpaper, wall art, wainscoting, crown molding, and anything custom Jessica wants to place (built-ins, shelving, custom tables).

---

## v1.2 Requirements

### Ceilings

- [ ] **CEIL-01**: Jessica can draw a ceiling as an independent polygon surface on the 2D canvas (like drawing a floor)
- [ ] **CEIL-02**: Each ceiling has an editable height (independent of wall height, defaults to room's wallHeight)
- [ ] **CEIL-03**: Ceiling renders in 3D as a flat surface overhead
- [ ] **CEIL-04**: Ceiling has an optional material (from catalog or solid color)

### Floor Materials

- [ ] **FLOOR-01**: Jessica can pick a floor material from a curated preset catalog (wood, tile, concrete, carpet, marble, stone, vinyl, polished-concrete)
- [ ] **FLOOR-02**: Jessica can upload a custom floor texture image (e.g. a tile sample photo)
- [ ] **FLOOR-03**: Floor material has editable scale + rotation so patterns tile correctly

### Wall Surfaces

- [ ] **SURFACE-01**: Each wall independently supports wallpaper (tiled pattern image or solid color)
- [ ] **SURFACE-02**: Jessica can place wall art items (framed images) on any wall at a specific x-position + height
- [ ] **SURFACE-03**: Wall art items have configurable width + height, render in 3D attached to the wall face
- [ ] **SURFACE-04**: Wall art items can be moved, resized, and removed post-placement

### Architectural Trim

- [ ] **TRIM-01**: Each wall has an independent wainscoting toggle (on/off, with editable height, default 36")
- [ ] **TRIM-02**: Each wall has an independent crown molding toggle (on/off)
- [ ] **TRIM-03**: Wainscoting + crown render in 3D as distinct architectural bands on the wall

### Custom Element Builder

- [ ] **CUSTOM-01**: Jessica can create a custom element with a name, shape (box or plane), dimensions (W × D × H), and material/color
- [ ] **CUSTOM-02**: Custom elements can be placed on the 2D canvas (like products, but with no image required)
- [ ] **CUSTOM-03**: Custom elements support the same edit handles as products (rotate + resize + move)
- [ ] **CUSTOM-04**: Custom elements render in 3D at their configured dimensions and material
- [ ] **CUSTOM-05**: Saved custom elements persist in a per-project catalog for re-placement

---

## v1 Requirements (Shipped)

See `.planning/milestones/v1.0-REQUIREMENTS.md` and `.planning/milestones/v1.1-REQUIREMENTS.md`.

---

## v1.3 Requirements (Deferred — Color & Paint System)

- Color/paint library (global, separate from product library)
- Farrow & Ball catalog preloaded (~130+ colors)
- Custom color creation + save to library
- Lime wash toggle (shader/filter effect)
- Apply paint to walls and ceilings (2D + 3D)

## v2 Requirements (Deferred)

- iPad / touch-friendly support
- Connected whole-house floor plan (rooms linking via doorways)
- Backend / cloud sync
- GLTF/OBJ 3D model upload for products

## Out of Scope

- Multi-user / collaboration
- CAD file exports
- Pricing / shopping list integration
- Mobile phone support
- Professional drafting features (layers, annotations, blueprints)
- Sloped / vaulted ceilings (can extend CEIL in v1.3 if needed)

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| CEIL-01 | Phase 11 | Active |
| CEIL-02 | Phase 11 | Active |
| CEIL-03 | Phase 11 | Active |
| CEIL-04 | Phase 11 | Active |
| FLOOR-01 | Phase 12 | Active |
| FLOOR-02 | Phase 12 | Active |
| FLOOR-03 | Phase 12 | Active |
| SURFACE-01 | Phase 13 | Active |
| SURFACE-02 | Phase 13 | Active |
| SURFACE-03 | Phase 13 | Active |
| SURFACE-04 | Phase 13 | Active |
| TRIM-01 | Phase 13 | Active |
| TRIM-02 | Phase 13 | Active |
| TRIM-03 | Phase 13 | Active |
| CUSTOM-01 | Phase 14 | Active |
| CUSTOM-02 | Phase 14 | Active |
| CUSTOM-03 | Phase 14 | Active |
| CUSTOM-04 | Phase 14 | Active |
| CUSTOM-05 | Phase 14 | Active |
