---
milestone: v1.11
milestone_name: Pascal Feature Set
status: active
created: 2026-04-25
source: Pascal Editor competitive audit (.planning/competitive/pascal-audit.md); 4 GH issues filed during v1.7.5 design-system work as competitor-insight
---

# v1.11 Requirements — Pascal Feature Set

**Milestone goal:** Adopt the 4 strongest features from the Pascal Editor competitive audit. v1.9 Phase 39 deferred these as "speculative" because there was no demand signal at the time; the user explicitly committed to them as the next direction during v1.10 scoping.

**Source:** Pascal audit at `.planning/competitive/pascal-audit.md`. 4 GH issues: [#77](https://github.com/micahbank2/room-cad-renderer/issues/77), [#78](https://github.com/micahbank2/room-cad-renderer/issues/78), [#79](https://github.com/micahbank2/room-cad-renderer/issues/79), [#80](https://github.com/micahbank2/room-cad-renderer/issues/80).

**Success measure:** All 4 Pascal features ship as user-visible improvements. Each is independently shippable — cancellation of any later phase still leaves the earlier phases' value behind.

**Stack:** No new runtime dependencies anticipated. Reuses Phase 33 design tokens / `lucide-react` chrome / `useReducedMotion`, Phase 34 user-texture pipeline, Phase 35 camera infrastructure (`uiStore.cameraMode`, `__setTestCamera`), and `cadStore` room/customElement structure.

**Cross-cutting decisions inherited:**
- Phase 33 D-33 (icon policy: lucide for new chrome) + D-34 (canonical spacing tokens)
- Phase 33 D-39 (every new animation guards on `useReducedMotion`)
- 6 pre-existing vitest failures permanently accepted (Phase 37 D-02); CI vitest stays disabled
- Substitute-evidence policy formalized in v1.10 (SUMMARY.md is canonical evidence; VERIFICATION.md optional)

**Sequencing intent:** Easy → hard. Each phase ships a tangible UX win; sequencing minimizes upstream-dependency churn.

---

## v1.11 Requirements

### Auto-Generated Material Swatch Thumbnails (THUMB)

- [ ] **THUMB-01** — Material picker swatches are auto-rendered from the live PBR/material pipeline rather than hand-curated static images. Source: [#77](https://github.com/micahbank2/room-cad-renderer/issues/77).
  - **Verifiable:** Open any material picker (FloorMaterialPicker, SwatchPicker, ceiling material picker via SurfaceMaterialPicker) → each swatch tile renders the actual material that will apply when selected (correct color/tone/PBR feel for the size of the tile). Adding a new material to `src/data/surfaceMaterials.ts` (or equivalent) does NOT require committing a new PNG asset — the swatch generates from the material definition.
  - **Acceptance:** Renderer-driven thumbnail generation (small offscreen R3F or WebGL canvas, or static-shader fallback for non-PBR materials). Cached per-material so each picker render does not re-paint. Cache invalidates on material edit. Loading state graceful — placeholder hex swatch while async render completes (re-uses Phase 32 `<Suspense>` + `<ErrorBoundary>` pattern).

### Rooms Hierarchy Sidebar Tree (TREE)

- [ ] **TREE-01** — Sidebar gains a Rooms hierarchy tree: collapsible per room, showing the room's contents (walls, ceilings, placed products, custom-element placements) as nested children. Click-to-focus the camera on a node. Per-node visibility toggle. Source: [#78](https://github.com/micahbank2/room-cad-renderer/issues/78).
  - **Verifiable:** Sidebar shows a "Rooms" panel with one entry per room in `cadStore.rooms`. Expanding a room reveals its child nodes grouped (Walls / Ceilings / Products / Custom Elements). Clicking a child node selects it (drives `uiStore.selectedIds`) AND focuses the camera (re-uses MIC-35 wall-side / Phase 35 preset camera infrastructure). Eye icon next to each node toggles visibility (renderer skips hidden nodes).
  - **Acceptance:** Reuses `CollapsibleSection` primitive (Phase 33). Selection state is single source of truth via `uiStore.selectedIds` — clicking in tree drives same path as clicking in canvas. Visibility state lives on `uiStore.hiddenIds: Set<string>` (new field) — view-state, not CAD-state, so undo/autosave skip it. Lucide icons for tree (ChevronRight/Down, Eye/EyeOff). Activates per-node Focus action (TREE-CAM-01 below) — but Focus itself ships in CAM-04, not here.

### Room Display Modes (DISPLAY)

- [ ] **DISPLAY-01** — Toolbar (or sidebar) gains a display-mode selector: NORMAL (default — all rooms render), SOLO (only the active room renders, others hidden), EXPLODE (all rooms render with positional offsets so they don't overlap visually — axonometric "exploded" feel). Source: [#80](https://github.com/micahbank2/room-cad-renderer/issues/80).
  - **Verifiable:** With 3+ rooms in a project, switch the display mode → 3D viewport changes correspondingly. SOLO hides all but `activeRoomId`. EXPLODE preserves all rooms but offsets them along an axis so they read as separate volumes (matches Pascal's "exploded layout" concept). NORMAL is the existing render. Switching modes is instant — no tween (D-39 reduced-motion: snap; design choice: this is a structural mode change, not a transition).
  - **Acceptance:** New `uiStore.displayMode: "normal" | "solo" | "explode"` field (default `"normal"`). Three toggles in Toolbar (or appropriate UI surface — picker decided in CONTEXT). EXPLODE math: each room offset by `(roomBboxWidth × index)` along X-axis, stacked spacing decided in CONTEXT. Hidden rooms (SOLO mode) skipped at the `Object.values(rooms).map` level in ThreeViewport. View-state only — no cadStore mutations, no undo entries, no autosave triggers.

### Per-Node Saved Camera + Focus Action (CAM)

- [ ] **CAM-04** — Each placed product / wall / ceiling can have a bookmarked camera angle saved on it. Double-clicking the node (in the rooms tree from TREE-01, or via right-click context menu in the canvas) jumps the camera to that bookmarked angle via the same easeInOutCubic tween as Phase 35 presets. Source: [#79](https://github.com/micahbank2/room-cad-renderer/issues/79).
  - **Verifiable:** Right-click any selected wall / product / ceiling → context menu has "Save current camera here" + "Focus camera here". Save persists `position` + `target` on the node. Focus jumps via the existing presetTween infrastructure (Phase 35). Double-click in TREE-01's tree triggers Focus. Snapshot serializes the camera bookmark per node.
  - **Acceptance:** New optional fields on `WallSegment`, `PlacedProduct`, `Ceiling`, `PlacedCustomElement`: `savedCameraPos?: [number, number, number]` + `savedCameraTarget?: [number, number, number]`. Focus action drives Phase 35's `pendingPresetRequest` shape (or a new `pendingCameraTarget` sibling — picked in CONTEXT). Reuses easeInOutCubic tween + reduced-motion snap (D-04 inherited from Phase 35). Save/Focus actions are view-only writes that do NOT pollute undo history (per CAM-03 precedent — extended). Right-click context menu uses Phase 33 lucide icons.

---

## Future Requirements (Deferred)

These items remain deferred per prior milestone audits — no change in v1.11:

- **[#97](https://github.com/micahbank2/room-cad-renderer/issues/97) Properties panel in 3D/split** — actual feature, no demand signal. Speculative. Revisit if Jessica or Micah surfaces evidence.
- **[#81](https://github.com/micahbank2/room-cad-renderer/issues/81) PBR extensions (AO + displacement + emissive)** — feature work without demand. Revisit pending request.
- **Phase 999.1 — Ceiling drag-resize handles** — re-deferred from v1.9 cancellation.
- **Phase 999.3 — Full design-effect tile-size override** — re-deferred from v1.9 cancellation.
- **Lighting controls / walk-mode improvements / layout templates / multi-room nav / export workflow / AI-assisted layout** — feature work without demand.
- **Backend / auth / cloud sync / sharing / mobile / iPad** — major-version leap; revisit only when an actual reason exists outside our heads.
- **R3F v9 / React 19 upgrade** — still gated on R3F v9 stability ([#56](https://github.com/micahbank2/room-cad-renderer/issues/56)).

## Traceability

Phase → requirement mapping. Plan column filled by `/gsd:plan-phase` when each phase is planned.

| Requirement | Phase | Plan(s) |
| ----------- | ----- | ------- |
| THUMB-01 | Phase 45 | TBD |
| TREE-01 | Phase 46 | TBD |
| DISPLAY-01 | Phase 47 | TBD |
| CAM-04 | Phase 48 | TBD |

---

*Last updated: 2026-04-25*
