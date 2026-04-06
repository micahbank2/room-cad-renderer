# Requirements: Room CAD Renderer v1.4

**Defined:** 2026-04-06
**Core Value:** Jessica can see her future room with her actual furniture before spending money.

## v1.4 Requirements

Requirements for the polish & tech debt milestone. Each maps to roadmap phases.

### Verification (Deferred v1.3 Gaps)

- [ ] **POLISH-02**: User can double-click a wainscoted wall to inline-edit wainscot style and height
- [ ] **POLISH-03**: User can copy wall treatments from SIDE_A to SIDE_B with one click
- [ ] **POLISH-04**: User can override frame color on individual wall art placements
- [ ] **POLISH-06**: User can scroll all sidebar panels without content clipping when all sections are expanded

### UI Cleanup

- [ ] **LABEL-01**: All user-facing labels display spaces instead of underscores (ALL CAPS preserved)
- [ ] **LABEL-02**: Dynamic label transforms use space-preserving format instead of underscore insertion

## Future Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Backend & Sharing (v2.0 candidate)

- **CLOUD-01**: Projects and products sync to cloud storage
- **AUTH-01**: User authentication for project access
- **SHARE-01**: Share project links with others

### Advanced Features

- **SNAP-01**: Smart snapping to walls, objects, and auto-center
- **ARCH-01**: Expanded architectural toolbar (stairs, columns, openings)
- **MEASURE-01**: Measurement and annotation tools
- **3DMODEL-01**: GLTF/GLB/OBJ upload for realistic 3D products

## Out of Scope

| Feature | Reason |
|---------|--------|
| New product library rebuild (#24) | Separate milestone — larger UX redesign |
| Smart snapping (#17) | Feature work, not polish |
| Architectural toolbar expansion (#19) | Feature work, not polish |
| Cloud sync (#30) | v2.0 scope — requires backend |
| 3D model support (#29) | Complex feature, not polish |
| Changing ALL CAPS convention | Part of Obsidian CAD design system — only underscores change |
| Changing code identifiers, CSS classes, or test IDs | Only user-facing display labels change |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| POLISH-02 | TBD | Pending |
| POLISH-03 | TBD | Pending |
| POLISH-04 | TBD | Pending |
| POLISH-06 | TBD | Pending |
| LABEL-01 | TBD | Pending |
| LABEL-02 | TBD | Pending |

**Coverage:**
- v1.4 requirements: 6 total
- Mapped to phases: 0
- Unmapped: 6 ⚠️

---
*Requirements defined: 2026-04-06*
*Last updated: 2026-04-06 after initial definition*
