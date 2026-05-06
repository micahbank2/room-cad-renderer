# Requirements — v1.16 Maintenance Pass

After two big feature milestones back-to-back (v1.14 GLTF, v1.15 architectural toolbar) shipping 8 phases in 10 days, v1.16 clears accumulated tech debt and parked backlog items before the next big feature push. Mirrors the v1.12 maintenance-pass pattern. Continues phase numbering from 62 → starts at 63.

## Active Requirements

### Tech Debt + Bug Fixes

- [ ] **DEBT-06** — Fix the parallel-vitest pollution from `pickerMyTexturesIntegration.test.tsx` that cascades 281 React errors when the suite runs in parallel pool mode, inflating the failure count from 4 (real pre-existing) → 10 (phantom). Source: [#146](https://github.com/micahbank2/room-cad-renderer/issues/146).
  - **Verifiable:** `npx vitest run` reports `4 failed / N passed` (only the pre-existing 4 baseline failures); 0 cascade errors. `npx vitest run tests/pickerMyTexturesIntegration.test.tsx` continues to pass in isolation. Full-suite report no longer shows phantom failures in unrelated test files.
  - **Acceptance:** Either (a) explicit `beforeEach`/`afterEach` resets in `pickerMyTexturesIntegration.test.tsx` to clear module-level singletons, OR (b) `vitest.config.ts` `pool: "forks"` switch (slower but fully isolates each test file), OR (c) mark the offending file `test.sequential` and keep parallel for the rest. Research picks the lowest-disruption fix.
  - **Hypothesis to test:** Test file mounts something with module-level state (texture cache, Zustand store, productImageCache) that doesn't reset between parallel-pool workers. Confirm via reproduction + isolation test in research.

- [ ] **BUG-04** — Fix the wall-user-texture-first-apply flaky e2e on chromium-dev (`__getWallMeshMapResolved` timeout after 2D→3D→2D→3D toggle). Pre-existing from v1.14; surfaces on every PR's chromium-dev shard. Source: [#141](https://github.com/micahbank2/room-cad-renderer/issues/141).
  - **Verifiable:** `npx playwright test e2e/wall-user-texture-first-apply.spec.ts --project=chromium-dev --repeat-each=5` passes 5/5 (currently flakes ~50% on CI). All other Phase 49/50 e2e specs continue to pass.
  - **Acceptance:** Either (a) bump the 3000ms `__getWallMeshMapResolved` timeout to 8000ms (matches other dev-server e2e timeouts), OR (b) add an explicit "WallMesh remount complete" event signal the test can wait on (more correct), OR (c) investigate StrictMode double-mount discarding the registry entry (similar pattern to the Phase 58 thumbnail callback bug fixed in `f5f6c46`). Research picks the right fix.
  - **Hypothesis to test:** React StrictMode (active in Vite dev) double-mounts WallMesh; the `__wallMeshMaterials` registry entry from the first mount gets discarded but the test waits on it. Confirm via console logs in the failing test.

### User-Facing Polish (promoted from backlog)

- [x] **CEIL-02** — Add edge-handle resize for ceilings (currently users can only delete + redraw). Mirror the Phase 31 product-resize pattern. Promoted from Phase 999.1 backlog (re-deferred from v1.9 twice). Source: [#70](https://github.com/micahbank2/room-cad-renderer/issues/70). **Shipped:** Phase 65 plan 01 (2026-05-04).
  - **Verifiable:** Select a ceiling in 2D. Edge handles appear on the ceiling polygon (4 sides minimum for a rectangular ceiling). Drag an edge → ceiling resizes; PropertiesPanel dimensions update live; 3D ceiling mesh re-extrudes. Single Ctrl+Z undoes the entire drag. Phase 30 smart-snap engages (snap to wall edges). Hold Alt to disable smart-snap.
  - **Acceptance:** New `widthFtOverride?: number` and `depthFtOverride?: number` fields on `Ceiling` type (mirrors `PlacedProduct` pattern). New cadStore actions `resizeCeilingAxis` + `resizeCeilingAxisNoHistory`. fabricSync.ts renders 4 edge handles per selected ceiling (mirrors product edge-handle code path). Phase 53 right-click "Reset size" action clears the overrides. RESET_SIZE affordance in PropertiesPanel.
  - **Hypothesis to test:** Ceiling polygons are not always rectangles (Phase 12+ allows arbitrary polygon vertices). v1.16 first-pass: handles only on rectangular ceilings; non-rectangular ceilings get a "convert to rectangle to resize" tooltip OR continue to delete-and-redraw. Confirm during research.

- [ ] **TILE-02** — Per-surface tile-size override UI completion. Phase 42 added the data fields (`Wallpaper.scaleFt`, `FloorMaterial.scaleFt`, `Ceiling.scaleFt`); v1.16 finishes the PropertiesPanel UI so end-users can adjust each surface independently. Promoted from Phase 999.3 backlog (re-deferred from v1.9). Source: [#105](https://github.com/micahbank2/room-cad-renderer/issues/105).
  - **Verifiable:** Select a wall with wallpaper → PropertiesPanel shows a "Tile size: X ft" slider. Slide → wallpaper repeat updates live in 2D and 3D. Same for floor surface (FloorMaterial) and ceiling. Per-surface override persists in snapshot. Reset button reverts to the catalog default. No regression on Phase 17 wallpaper / Phase 11 floor / Phase 13 ceiling rendering.
  - **Acceptance:** New PropertiesPanel input rows (slider OR feet+inches input — research picks). Single-undo per drag (Phase 31 pattern: `update*(id, {})` + `*NoHistory` mid-drag). Slider range 0.5ft–10ft. Reset button clears the override → falls back to catalog. Snapshot serialization preserves the field (already in v3+ schema from Phase 42). 2D fabric texture scale + 3D `texture.repeat.set()` both honor the override.
  - **Hypothesis to test:** Phase 42's data fields exist on the types but may not have UI consumers yet. Research confirms which surfaces have the field plumbed end-to-end vs. which need additional wiring.

## Out of Scope (this milestone)

| Item | Reason |
|------|--------|
| **CAM-05** ([#127](https://github.com/micahbank2/room-cad-renderer/issues/127)) EXPLODE saved-camera offset | Narrow trigger; Jessica unlikely to hit it day-to-day. Re-deferred again. |
| L-shape concave-room normal heuristic | v1.15 Phase 60/61 limitation; severe non-convex rooms only. Defer to v1.17+. |
| Per-opening saved-camera bookmarks | v1.15 Phase 61 deferral. Wall's saved-camera works as fallback. |
| 3D dimension billboards | v1.15 Phase 62 D-03 deferral; 2D-only is sufficient for contractor handoff. |
| Tree integration for measurements + annotations | v1.15 Phase 62 D-12 deferral; visual entities don't need tree groups. |
| Columns + levels/platforms ([#19](https://github.com/micahbank2/room-cad-renderer/issues/19) partial) | v1.15 partial-ship; deferred for evidence of need. |
| Window presets ([#20](https://github.com/micahbank2/room-cad-renderer/issues/20)) | Cosmetic variants; current generic window places fine. |
| OBJ format support (v1.14 carry-over) | Demand-driven; defer until requested. |
| GLTF animations (v1.14 carry-over) | Furniture rarely animated. |
| Custom material overrides on GLTF (v1.14 carry-over) | Embedded PBR sufficient. |
| LOD / progressive loading (v1.14 carry-over) | 25MB cap keeps load times fine. |
| R3F v9 / React 19 upgrade ([#56](https://github.com/micahbank2/room-cad-renderer/issues/56)) | Still gated on R3F v9 stability. |
| Materials overhaul ([#24](https://github.com/micahbank2/room-cad-renderer/issues/24)–[#28](https://github.com/micahbank2/room-cad-renderer/issues/28), [#81](https://github.com/micahbank2/room-cad-renderer/issues/81)) | Big rework — needs Jessica feedback before committing 4-6 phases. |
| Plain English documentation ([#31](https://github.com/micahbank2/room-cad-renderer/issues/31), [#32](https://github.com/micahbank2/room-cad-renderer/issues/32), [#33](https://github.com/micahbank2/room-cad-renderer/issues/33)) | Could fold into a v1.17 doc-only mini-milestone. |

## Validated Requirements (Earlier Milestones)

See `.planning/milestones/v1.0-REQUIREMENTS.md` through `.planning/milestones/v1.15-REQUIREMENTS.md`. All v1.0–v1.15 requirements shipped or formally deferred.

## Traceability

| Requirement | Phase | Plans |
|-------------|-------|-------|
| DEBT-06 | Phase 63 | TBD |
| BUG-04 | Phase 64 | TBD |
| CEIL-02 | Phase 65 | 65-01-SUMMARY.md (2026-05-04) |
| TILE-02 | Phase 66 | TBD |

---

*Last updated: 2026-05-06*
