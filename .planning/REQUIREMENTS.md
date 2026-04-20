# v1.6 Requirements — Editing UX

**Milestone goal:** Close the daily-workflow gaps in 2D editing — Jessica can size walls precisely, resize without menus, snap intelligently, rename placed items, and never lose work.

**Scope:** 5 open GitHub issues (#44, #46, #60, #17, #50) grouped by theme. Not in v1.6: #22 measurement/annotation (heavier, own milestone), #48 design redesign (blocked on mockups), #56 R3F v9 (deferred per D-02), all 3D realism, library overhaul, materials engine, cloud sync, and docs-guide issues.

---

## Requirements

### Auto-Save (SAVE)

- [x] **SAVE-05** — CAD scene auto-saves within ~2s of the last edit (walls, products, rooms, materials). Debounced so continuous drag does not cause save spam. Source: [#44](https://github.com/micahbank2/room-cad-renderer/issues/44).
- [x] **SAVE-06** — Toolbar shows `SAVING...` during an in-flight save and `SAVED` briefly after, using the v1.1 SAVE-04 save-status surface. Source: [#44](https://github.com/micahbank2/room-cad-renderer/issues/44).

### Editable Dimension Labels (EDIT)

- [ ] **EDIT-20** — Double-clicking a wall dimension label opens a feet+inches input in place. Enter commits; Escape cancels; the wall resizes from its start point along its existing angle. Source: [#46](https://github.com/micahbank2/room-cad-renderer/issues/46).
- [ ] **EDIT-21** — Each dimension-label edit produces exactly one undo/redo entry. Source: [#46](https://github.com/micahbank2/room-cad-renderer/issues/46).

### Drag-to-Resize (EDIT)

- [ ] **EDIT-22** — A selected product shows corner/edge resize handles. Dragging a handle updates `widthFt` / `lengthFt`, snapped to the active grid (`uiStore.gridSnap`, default 0.5ft). Source: [#60](https://github.com/micahbank2/room-cad-renderer/issues/60).
- [ ] **EDIT-23** — A selected wall shows endpoint handles. Dragging an endpoint updates the wall's `start` / `end` point. Shift constrains the drag to orthogonal. Source: [#60](https://github.com/micahbank2/room-cad-renderer/issues/60).
- [ ] **EDIT-24** — Drag-resize commits a single undo entry at mouse-up, not per frame. Preserves the Phase 25 PERF-01 drag fast-path (`shouldSkipRedrawDuringDrag`, `renderOnAddRemove: false`). Source: [#60](https://github.com/micahbank2/room-cad-renderer/issues/60).

### Smart Snapping (SNAP)

- [ ] **SNAP-01** — While placing or dragging an object, its edges snap to the edges of nearby walls and other objects within a small pixel tolerance. Source: [#17](https://github.com/micahbank2/room-cad-renderer/issues/17).
- [ ] **SNAP-02** — Dragging an object near the midpoint of a wall auto-centers it on that wall. Source: [#17](https://github.com/micahbank2/room-cad-renderer/issues/17).
- [ ] **SNAP-03** — When a snap engages, a visible guide (line, tick, or highlight) indicates which edge or axis snapped. Source: [#17](https://github.com/micahbank2/room-cad-renderer/issues/17).

### Per-Placement Label Override (CUSTOM)

- [ ] **CUSTOM-06** — Selecting a placed custom element reveals a label-override input in `PropertiesPanel`. When set, the 2D canvas renders the override instead of the catalog name. Empty reverts to the catalog name. Override persists with the project. Source: [#50](https://github.com/micahbank2/room-cad-renderer/issues/50).

---

## Future Requirements (Deferred to Later Milestones)

Open GH issues not in v1.6:

- [#22](https://github.com/micahbank2/room-cad-renderer/issues/22) Measurement & annotation tools — heavier; own milestone
- [#21](https://github.com/micahbank2/room-cad-renderer/issues/21) Invisible wall / cutaway mode for 3D
- [#29](https://github.com/micahbank2/room-cad-renderer/issues/29) GLTF/GLB/OBJ real 3D model upload — note: PROJECT.md "Out of Scope" locks against this
- [#45](https://github.com/micahbank2/room-cad-renderer/issues/45) Camera presets (eye-level, top-down)
- [#47](https://github.com/micahbank2/room-cad-renderer/issues/47) User-uploaded PBR textures
- [#61](https://github.com/micahbank2/room-cad-renderer/issues/61) 3D materials need realistic PBR textures
- [#49](https://github.com/micahbank2/room-cad-renderer/issues/49) Wainscot library item edit UI
- [#19](https://github.com/micahbank2/room-cad-renderer/issues/19) Expand architectural toolbar — stairs, columns, openings, levels
- [#20](https://github.com/micahbank2/room-cad-renderer/issues/20) Window presets
- [#23](https://github.com/micahbank2/room-cad-renderer/issues/23) Rename Product Registry → Library
- [#24](https://github.com/micahbank2/room-cad-renderer/issues/24) Rebuild Library with category structure
- [#25](https://github.com/micahbank2/room-cad-renderer/issues/25) Material engine
- [#26](https://github.com/micahbank2/room-cad-renderer/issues/26) Product-to-material linking
- [#27](https://github.com/micahbank2/room-cad-renderer/issues/27) Material application system
- [#28](https://github.com/micahbank2/room-cad-renderer/issues/28) Parametric object controls
- [#30](https://github.com/micahbank2/room-cad-renderer/issues/30) Cloud sync
- [#31](https://github.com/micahbank2/room-cad-renderer/issues/31), [#32](https://github.com/micahbank2/room-cad-renderer/issues/32), [#33](https://github.com/micahbank2/room-cad-renderer/issues/33) Plain English user/dev/3D-sourcing guides
- [#48](https://github.com/micahbank2/room-cad-renderer/issues/48) Design system redesign — blocked on mockups
- [#56](https://github.com/micahbank2/room-cad-renderer/issues/56) R3F v9 / React 19 upgrade — tracked, execution deferred per D-02

---

## Out of Scope (Locked in PROJECT.md)

- Multi-user / collaboration
- Export to contractor / CAD file formats
- Pricing / shopping lists
- Mobile / iPad
- Professional drafting features (layers, annotations, blueprints)
- Backend / server / auth
- GLTF/OBJ 3D model upload (#29) — Jessica's workflow stays image-only

---

## Traceability

| REQ-ID | Issue | Phase |
|--------|-------|-------|
| SAVE-05 | #44 | Phase 28 |
| SAVE-06 | #44 | Phase 28 |
| EDIT-20 | #46 | Phase 29 |
| EDIT-21 | #46 | Phase 29 |
| EDIT-22 | #60 | Phase 31 |
| EDIT-23 | #60 | Phase 31 |
| EDIT-24 | #60 | Phase 31 |
| SNAP-01 | #17 | Phase 30 |
| SNAP-02 | #17 | Phase 30 |
| SNAP-03 | #17 | Phase 30 |
| CUSTOM-06 | #50 | Phase 31 |

*Updated by roadmapper 2026-04-20.*
