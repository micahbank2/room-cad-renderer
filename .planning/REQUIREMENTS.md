# Requirements — Room CAD Renderer v1

## Core Value

Jessica can see her future room with her actual furniture before spending money.

---

## v1 Requirements

### 2D Editor

- [x] **EDIT-01**: User can create a room with real dimensions (width, length, wall height)
- [x] **EDIT-02**: User can draw walls with snap-to-grid (0.5ft default)
- [x] **EDIT-03**: User can place doors and windows on walls
- [x] **EDIT-04**: User can select, move, and delete walls and products
- [x] **EDIT-05**: User can undo/redo all actions (50-level history)
- [x] **EDIT-06**: User can edit wall dimensions by double-clicking the dimension label
- [x] **EDIT-07**: User can drag products from library onto the canvas
- [x] **EDIT-08**: User can rotate placed products via drag handles in 2D
- [x] **EDIT-09**: Product images render visibly on the 2D canvas (async image loading fix)

### Product Library

- [x] **LIB-01**: User can upload product image with name, category, and dimensions
- [x] **LIB-02**: User can browse and filter products by category
- [x] **LIB-03**: Product library is global — persists across all room projects
- [x] **LIB-04**: Product dimensions are optional (image-only upload allowed)
- [x] **LIB-05**: User can search products by name

### 3D Visualization

- [x] **VIZ-01**: User can see walls extruded in 3D with lighting and shadows
- [x] **VIZ-02**: User can orbit the 3D camera
- [x] **VIZ-03**: User can toggle between 2D, 3D, and split views
- [x] **VIZ-04**: Products render in 3D with their uploaded image as texture (not blank boxes)
- [x] **VIZ-05**: Eye-level camera walkthrough to feel the room from inside
- [x] **VIZ-06**: Smooth 3D experience (PBR materials, soft shadows, floor texture)

### Persistence

- [x] **SAVE-01**: User can save and load projects from browser storage
- [x] **SAVE-02**: Auto-save with debounce so work is never lost
- [x] **SAVE-03**: User can export 3D view as PNG image

### Rooms

- [ ] **ROOM-01**: User can create multiple rooms within one project
- [ ] **ROOM-02**: Room templates (living room, bedroom, kitchen presets with typical dimensions)

---

## v2 Requirements (Deferred)

- iPad / touch-friendly support
- Connected whole-house floor plan (rooms linking via doorways)
- Backend / cloud sync for cross-device access
- GLTF/OBJ 3D model upload for products

## Out of Scope

- Multi-user / collaboration — single user personal tool
- Export to CAD file formats — not needed for home planning
- Pricing / shopping list integration — not for v1
- Professional drafting features (layers, annotations, blueprints)
- Mobile phone support — desktop only

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| EDIT-01 | — | Validated (existing) |
| EDIT-02 | — | Validated (existing) |
| EDIT-03 | — | Validated (existing) |
| EDIT-04 | — | Validated (existing) |
| EDIT-05 | — | Validated (existing) |
| EDIT-06 | Phase 1 | Active |
| EDIT-07 | Phase 1 | Active |
| EDIT-08 | Phase 1 | Active |
| EDIT-09 | Phase 1 | Active |
| LIB-01 | — | Validated (existing) |
| LIB-02 | — | Validated (existing) |
| LIB-03 | Phase 2 | Active |
| LIB-04 | Phase 2 | Active |
| LIB-05 | Phase 2 | Active |
| VIZ-01 | — | Validated (existing) |
| VIZ-02 | — | Validated (existing) |
| VIZ-03 | — | Validated (existing) |
| VIZ-04 | Phase 3 | Active |
| VIZ-05 | Phase 4 | Active |
| VIZ-06 | Phase 3 | Active |
| SAVE-01 | — | Validated (existing) |
| SAVE-02 | Phase 1 | Active |
| SAVE-03 | Phase 3 | Active |
| ROOM-01 | Phase 5 | Active |
| ROOM-02 | Phase 5 | Active |
