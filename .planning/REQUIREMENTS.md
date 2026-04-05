# Requirements: Room CAD Renderer v1.3

**Defined:** 2026-04-05
**Core Value:** Jessica can see her future room with her actual furniture before spending money.

## v1.3 Requirements

Requirements for milestone v1.3 — Color, Polish & Materials. Each maps to roadmap phases.

### Color & Paint System

- [ ] **PAINT-01**: User can apply a paint color to any wall side (2D shows solid fill, 3D shows colored material)
- [ ] **PAINT-02**: User can apply a paint color to any ceiling (2D + 3D)
- [ ] **PAINT-03**: User can browse Farrow & Ball 132-color catalog with swatch grid, name search, and hue family filter
- [ ] **PAINT-04**: User can create, name, save, and delete custom paint colors via hex picker
- [ ] **PAINT-05**: User can toggle lime wash finish on any paint color (renders as matte chalky surface in 3D)
- [ ] **PAINT-06**: User sees a recently-used palette row showing last-used paint colors
- [ ] **PAINT-07**: User can apply one paint color to all walls in a room with a single action

### v1.2 Polish Pass

- [ ] **POLISH-01**: User can drag, rotate, and resize placed custom elements via edit handles (same interaction as products)
- [ ] **POLISH-02**: User can edit wainscot library styles in-place from the library panel
- [ ] **POLISH-03**: User can copy all SIDE_A wall treatments to SIDE_B with one click
- [ ] **POLISH-04**: User can override frame color per-placement for framed wall art

### Advanced Materials

- [ ] **MAT-01**: User can pick floor and ceiling materials from a single unified surface material catalog
- [ ] **MAT-02**: User can apply ceiling texture presets (plaster, wood plank, concrete, painted drywall)
- [ ] **MAT-03**: Existing floor presets continue working without breaking saved projects (additive migration)

## Future Requirements

Deferred to v1.4+. Tracked but not in current roadmap.

### Deferred Differentiators

- **PAINT-F01**: Roughness slider per paint placement (preset defaults cover 95% of use cases)
- **PAINT-F02**: Saved room color scheme presets (adds schema complexity without enough v1.3 value)
- **POLISH-F01**: Dims editor for placed wall art (stock default rarely matches actual pieces)
- **POLISH-F02**: Per-wall wainscot knob overrides (heightOverride, colorOverride)
- **MAT-F01**: Roughness override per material placement
- **MAT-F02**: Ceiling texture rotation option
- **MAT-F03**: PBR texture upload for ceilings (floor already has custom upload)

## Out of Scope

| Feature | Reason |
|---------|--------|
| AR camera room paint preview | Requires image segmentation; 3D walkthrough covers "feel the space" |
| Official F&B color matching | F&B doesn't publish official hex; community approximations sufficient for visualization |
| Beam geometry for ceilings | Wood texture on ceiling gives visual suggestion at much lower cost |
| Custom GLSL shaders | Lime wash achievable via material params; shader complexity unjustified |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PAINT-01 | — | Pending |
| PAINT-02 | — | Pending |
| PAINT-03 | — | Pending |
| PAINT-04 | — | Pending |
| PAINT-05 | — | Pending |
| PAINT-06 | — | Pending |
| PAINT-07 | — | Pending |
| POLISH-01 | — | Pending |
| POLISH-02 | — | Pending |
| POLISH-03 | — | Pending |
| POLISH-04 | — | Pending |
| MAT-01 | — | Pending |
| MAT-02 | — | Pending |
| MAT-03 | — | Pending |

**Coverage:**
- v1.3 requirements: 14 total
- Mapped to phases: 0
- Unmapped: 14 ⚠️

---
*Requirements defined: 2026-04-05*
*Last updated: 2026-04-05 after initial definition*
