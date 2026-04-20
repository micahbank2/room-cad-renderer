# v1.5 Requirements — Performance & Tech Debt

**Milestone goal:** Make the app feel smoother as scenes grow and close the highest-friction tech debt and bug debt before adding more features.

**Source issues:** [#42](https://github.com/micahbank2/room-cad-renderer/issues/42), [#43](https://github.com/micahbank2/room-cad-renderer/issues/43), [#51](https://github.com/micahbank2/room-cad-renderer/issues/51), [#52](https://github.com/micahbank2/room-cad-renderer/issues/52), [#53](https://github.com/micahbank2/room-cad-renderer/issues/53), [#54](https://github.com/micahbank2/room-cad-renderer/issues/54), [#55](https://github.com/micahbank2/room-cad-renderer/issues/55), [#56](https://github.com/micahbank2/room-cad-renderer/issues/56)

**Success measure:** Identical UX, measurably better drag perf (target: 60fps at 50 walls / 30 products), zero `as any` casts on Fabric instances, both bugs verified end-to-end.

---

## v1.5 Requirements

### Performance (PERF)

- [x] **PERF-01**: Canvas redraw uses incremental updates instead of full clear-and-redraw
  - **Source:** [#51](https://github.com/micahbank2/room-cad-renderer/issues/51)
  - **Verifiable:** Dragging a product in a 50-wall / 30-product scene maintains 60fps on M-series Mac. Visual parity with current behavior. All 115 tests pass.
  - **Files:** `src/canvas/FabricCanvas.tsx`, `src/canvas/fabricSync.ts`

- [x] **PERF-02**: cadStore snapshots use `structuredClone()` instead of `JSON.parse(JSON.stringify())` — **Partial** (D-07 contract met; ≥2× speedup target missed — see 25-VERIFICATION.md)
  - **Source:** [#52](https://github.com/micahbank2/room-cad-renderer/issues/52)
  - **Verifiable:** Snapshot perf measured before/after — ≥2x improvement at 50 walls / 30 products. Undo/redo still produces single entries for drag-completed mutations.
  - **Files:** `src/stores/cadStore.ts` (lines 38–44)

### Tool Architecture (TOOL)

- [x] **TOOL-01**: Tool cleanup uses type-safe pattern (no `as any` on Fabric canvas instance)
  - **Source:** [#53](https://github.com/micahbank2/room-cad-renderer/issues/53)
  - **Verifiable:** Zero `as any` casts on Fabric canvas. No event listener leaks during rapid tool switching. Existing tool behavior unchanged.
  - **Files:** `src/canvas/tools/wallTool.ts:117`, `selectTool.ts:190`, `doorTool.ts:78`, `windowTool.ts:77`, `productTool.ts:60`

- [x] **TOOL-02**: Tool state held in closures, not module-level singletons
  - **Source:** [#54](https://github.com/micahbank2/room-cad-renderer/issues/54)
  - **Verifiable:** No `const state = {...}` at module scope in any tool file. Two parallel tool activations don't bleed state. Existing tool behavior unchanged.
  - **Files:** `src/canvas/tools/wallTool.ts:7-13`, `selectTool.ts:8-20`, `productTool.ts:8`

- [x] **TOOL-03**: `pxToFeet` and `findClosestWall` extracted to shared `toolUtils.ts`
  - **Source:** [#55](https://github.com/micahbank2/room-cad-renderer/issues/55)
  - **Verifiable:** Zero duplicated implementations across 5 tool files. All tools take consistent `gridSnap` behavior on hover/click. All 115 tests pass.
  - **Files:** All 5 files under `src/canvas/tools/`, new `src/canvas/tools/toolUtils.ts`

### Tracking (TRACK)

- [x] **TRACK-01**: R3F v9 / React 19 upgrade path documented and tracked
  - **Source:** [#56](https://github.com/micahbank2/room-cad-renderer/issues/56)
  - **Verifiable:** Upgrade plan written into a README/notes block (not yet executed — blocked on R3F v9 stable). Issue #56 stays open as the tracking artifact.
  - **Files:** `package.json` notes, `.planning/codebase/CONCERNS.md` update

### Bug Fixes (FIX)

- [x] **FIX-01**: Product images render in 2D canvas (async load)
  - **Source:** [#42](https://github.com/micahbank2/room-cad-renderer/issues/42)
  - **Verifiable:** Product thumbnails appear in 2D canvas after placement. No flicker on existing renders. Project reload shows images without re-trigger.
  - **Files:** `src/canvas/fabricSync.ts:155-168`

- [x] **FIX-02**: Ceiling preset materials apply correctly in `CeilingMesh`
  - **Source:** [#43](https://github.com/micahbank2/room-cad-renderer/issues/43)
  - **Verifiable:** Selecting a ceiling preset visibly changes the 3D ceiling material. Preset persists across reload. Hex color path still works.
  - **Files:** `src/three/CeilingMesh.tsx`, `src/lib/surfaceMaterials.ts`

---

## Future Requirements (Deferred to Later Milestones)

Issues filed but not in v1.5 scope:

- [#44](https://github.com/micahbank2/room-cad-renderer/issues/44) Auto-save CAD scene with debounce
- [#45](https://github.com/micahbank2/room-cad-renderer/issues/45) Camera presets (eye-level, top-down)
- [#46](https://github.com/micahbank2/room-cad-renderer/issues/46) Editable dimension labels
- [#47](https://github.com/micahbank2/room-cad-renderer/issues/47) User-uploaded PBR textures
- [#48](https://github.com/micahbank2/room-cad-renderer/issues/48) Design system redesign (blocked on mockups)
- [#49](https://github.com/micahbank2/room-cad-renderer/issues/49) Wainscot library item edit UI
- [#50](https://github.com/micahbank2/room-cad-renderer/issues/50) Per-placement label override for custom elements
- Pre-existing GH issues: [#17](https://github.com/micahbank2/room-cad-renderer/issues/17), [#19-33](https://github.com/micahbank2/room-cad-renderer/issues/19) (smart snapping, toolbar expansion, library rebuild, material engine, GLTF, cloud sync, user guides)

## Out of Scope (Locked)

From PROJECT.md:

- Multi-user / collaboration
- Export to contractors / CAD file formats
- Pricing integration / shopping lists
- Mobile / iPad support
- Professional drafting features
- Backend / server / auth (separately tracked as future work in [#30](https://github.com/micahbank2/room-cad-renderer/issues/30))
- GLTF/OBJ 3D model upload (separately tracked as [#29](https://github.com/micahbank2/room-cad-renderer/issues/29) but explicitly deferred)

---

## Traceability

| Requirement | Issue | Phase | Status |
|-------------|-------|-------|--------|
| PERF-01 | #51 | Phase 25 | Complete |
| PERF-02 | #52 | Phase 25 | Partial — D-07 contract met; ≥2× speedup NOT met (see 25-VERIFICATION.md) |
| TOOL-01 | #53 | Phase 24 | Pending |
| TOOL-02 | #54 | Phase 24 | Pending |
| TOOL-03 | #55 | Phase 24 | Pending |
| TRACK-01 | #56 | Phase 27 | Pending |
| FIX-01 | #42 | Phase 26 | Complete |
| FIX-02 | #43 | Phase 26 | Complete — closed as perception-only (Outcome A); regression guards added (see 26-02 SUMMARY) |
