# Requirements — v1.20 Surface Depth & Architectural Expansion

> Generated: 2026-05-08
> Milestone goal: Deepen material realism with PBR maps (AO + displacement), speed up window placement with standard-size presets, enable precise numeric sizing of placed products, and add columns/pillars as a new architectural element type.
>
> Continues phase numbering from 77. Phases start at 78.

---

## Active Requirements

### PBR Maps (PBR)

- [x] **PBR-01**: User can upload an AO (ambient occlusion) map alongside a material's color map in the material upload / edit form
- [x] **PBR-02**: User can upload a displacement map on a material in the same upload / edit form
- [x] **PBR-03**: 3D mesh rendering applies AO and displacement maps in addition to existing color and roughness — surfaces look noticeably more detailed and textured
- [x] **PBR-04**: Material card shows small map-presence indicators so Jessica can see which maps are loaded (color, roughness, AO, displacement) at a glance

### Window Presets (WIN)

- [x] **WIN-01**: When placing a window opening, user can choose from a preset size list (e.g. 2×3 ft, 3×4 ft, 4×5 ft, custom) rather than always typing dimensions manually
- [ ] **WIN-02**: The selected preset size is visible and editable in PropertiesPanel after placement — switching to "custom" allows free-form dimension input

### Parametric Controls (PARAM)

- [ ] **PARAM-01**: User can type exact width and depth values (feet) for any placed product in PropertiesPanel — updates the product's override dimensions immediately without requiring a drag
- [ ] **PARAM-02**: User can type exact X and Y position (feet from room origin) for any placed product in PropertiesPanel
- [ ] **PARAM-03**: Each parametric edit (size or position) is a single undo entry (Ctrl+Z reverts to previous value)

### Columns & Pillars (COL)

- [ ] **COL-01**: User can place a column/pillar in a room — choose round or rectangular cross-section, with configurable diameter/width and height (defaults to room ceiling height)
- [ ] **COL-02**: Column renders correctly in 2D (footprint outline at correct position and scale) and 3D (extruded pillar with a material finish slot)
- [ ] **COL-03**: Column is selectable, movable, and deletable via the standard select tool; PropertiesPanel shows its dimensions and finish material

---

## Future Requirements (Deferred)

These were considered for v1.20 and explicitly deferred:

- **Emissive map** — glowing surfaces (LED strips, backlit panels). Defer to v1.21 — AO + displacement have more everyday impact for Jessica's room planning use cases.
- **Window styles** (single-hung, casement, sliding, picture) — affects 2D/3D appearance. Defer to v1.21 — standard sizes cover the placement friction; visual style is secondary.
- **Window sill height preset** — auto-position window at 30"/36"/44" sill. Defer to v1.21 with styles.
- **Raised platforms / sunken floors** — elevated floor sections. Defer to v1.21 — columns are the simpler starting point for architectural depth.
- **Parametric controls for walls and custom elements** — extend PARAM to wall endpoints and custom element sizes. Defer to v1.21 — products are the highest-value target first.
- **R3F v9 / React 19 upgrade** — tracked separately; no dep on v1.20.

---

## Out of Scope (v1.20)

- **PBR normal maps** — not selected; AO + displacement cover the visible depth story for this milestone.
- **GLTF per-slot PBR override** — applying uploaded PBR maps to GLTF product sub-meshes. Still deferred from v1.19.
- **Assemblies tab content** — placeholder from v1.19; building pre-made combos deferred.
- **Multi-room levels** — true floor-to-floor multi-story layouts. Separate feature arc from column placement.

---

## Traceability

| Requirement | Phase | Plan | Status |
|-------------|-------|------|--------|
| PBR-01 | TBD | TBD | Not started |
| PBR-02 | TBD | TBD | Not started |
| PBR-03 | TBD | TBD | Not started |
| PBR-04 | TBD | TBD | Not started |
| WIN-01 | 79 | 01 | RED tests landed |
| WIN-02 | 79 | 01 | RED tests landed |
| PARAM-01 | TBD | TBD | Not started |
| PARAM-02 | TBD | TBD | Not started |
| PARAM-03 | TBD | TBD | Not started |
| COL-01 | TBD | TBD | Not started |
| COL-02 | TBD | TBD | Not started |
| COL-03 | TBD | TBD | Not started |
