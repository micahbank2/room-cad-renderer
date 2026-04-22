---
gsd_state_version: 1.0
milestone: v1.8
milestone_name: 3D Realism Completion
status: Phase 34 Plan 02 complete — MY TEXTURES pickers + delete dialog shipped
stopped_at: Completed Phase 34 Plan 02 — MyTexturesList + DeleteTextureDialog + 3 picker integrations + 22 new tests green
last_updated: "2026-04-22T15:45:00.000Z"
last_activity: "2026-04-22 — Plan 34-02 complete (3 tasks, 22 new tests passing, MY TEXTURES tab in floor/ceiling/wall pickers, user-texture-deleted CustomEvent contract for Plan 03)"
progress:
  total_phases: 1
  completed_phases: 1
  total_plans: 8
  completed_plans: 9
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-22 — v1.8 3D Realism Completion started)

**Core value:** Jessica can see her future room with her actual furniture before spending money.
**Current focus:** Milestone v1.8 — Phase 34 (User-Uploaded Textures) in execution; Wave 1 (Plan 00 data layer) complete; Wave 2 (Plans 01 upload modal + 02 picker integration) next

## Current Position

Milestone: v1.8 3D Realism Completion
Phase: 34 User-Uploaded Textures
Plan: 00-data-layer — COMPLETE; 01-upload-modal — COMPLETE; 02-picker-integration — COMPLETE
Status: Waves 1 + 2 complete; Plan 34-03 (Wave 3: 3D render integration + orphan fallback + user-texture-deleted cache subscription) ready to begin
Last activity: 2026-04-22 — Plan 34-02 shipped (MyTexturesList, DeleteTextureDialog with locked D-07 copy, MY TEXTURES tab wired into floor/ceiling/wall pickers, user-texture-deleted CustomEvent contract published for Plan 03)

Completed milestones: v1.0, v1.1, v1.2, v1.3, v1.4, v1.5, v1.6, v1.7.5 (all archived in `.planning/milestones/`)
Partial: v1.7 3D Realism — Phase 32 PBR Foundation shipped 2026-04-21; remainder absorbed into v1.8 as Phases 34–37
Backlog: 999.1 ceiling resize handles (unchanged); 999.2 wallpaper/wallArt regression PROMOTED into v1.8 Phase 36

## Accumulated Context

### Decisions

Full log in PROJECT.md Key Decisions table. Recent milestone decisions summarized in `.planning/RETROSPECTIVE.md § v1.5`.

- [v1.8 roadmap]: Split legacy "Tech-Debt Sweep" Phase 36 into two phases — Phase 36 (VIZ-10 regression, instrumentation-first) and Phase 37 (Tech-Debt Sweep). Rationale: VIZ-10 is a correctness investigation whose findings may reshape Phase 34's cache strategy; it must run EARLY, not last. Tech-debt sweep stays positioned last so it can be cut under scope pressure.
- [v1.8 roadmap]: Phases 34/35/36/37 derived from requirement clustering: LIB-* → 34, CAM-* → 35, VIZ-10 → 36, DEBT-* → 37. Vertical-slice per capability, no horizontal layers.
- [v1.8 roadmap]: Phase numbering continues from 33; no reset. Last shipped = 33 (v1.7.5 Design System), first new = 34.
- [v1.8 roadmap]: Phase 36 sequencing: "DO NOT schedule fix plans before root-cause plan lands" is baked into plan-count estimate (2 plans: instrumentation + fix).
- [Phase 34 Plan 00]: Physically isolate user-texture IDB via createStore("room-cad-user-textures", "textures") — not a key prefix in the default store — so listProjects() filter paths never couple to user-texture keys.
- [Phase 34 Plan 00]: Dedup preserves first upload's metadata (name, tileSizeFt). Second upload with same SHA-256 returns existing id without overwrite. Renames flow through the Edit (D-11) path, not re-upload.
- [Phase 34 Plan 00]: countTextureRefs is a pure snapshot-shaped function; callers pass useCADStore.getState() at the call site. Keeps it easy to test and reusable from non-React contexts.
- [Phase 34 Plan 00]: Added fake-indexeddb/auto to tests/setup.ts so idb-keyval tests run against real IDB semantics under happy-dom (existing vi.mock callers unaffected).
- [Phase 34 Plan 01]: Injectable-seam pattern (ProcessTextureDeps.decode + drawToBlob) keeps the processTextureFile pipeline testable under happy-dom (no createImageBitmap / OffscreenCanvas shim needed). Reusable pattern for future jsdom-hostile pipelines.
- [Phase 34 Plan 01]: SHA-256 computed on DOWNSCALED JPEG bytes (not source File) so the LIB-07 dedup key is deterministic regardless of source format/dimensions — same visual output always hashes the same.
- [Phase 34 Plan 01]: UploadTextureModal is a single dual-mode component (create + edit) per D-11. Edit mode hides the drop zone, autoFocuses Name, and calls useUserTextures().update instead of .save.
- [Phase 34 Plan 01]: sonner is not in package.json. Inlined a console.info toast shim behind a single call site (toastSuccess) and kept the "Texture saved." copy in a centralized COPY constant — one-line swap to real sonner when Plan 02/03 adopts it.
- [Phase 34 Plan 01]: window.__driveTextureUpload(file, name, tileSizeFt) test driver (import.meta.env.MODE === "test" gated) bypasses the React tree — happy-dom cannot cleanly synthesize a native <input type="file"> change event. Plan 02 picker tests can seed textures via this bridge.
- [Phase 34 Plan 02]: MyTexturesList + DeleteTextureDialog ship the LIB-06 picker surface — MY TEXTURES tab lands in FloorMaterialPicker, SurfaceMaterialPicker (ceiling via CeilingPaintSection), and WallSurfacePanel. No cadStore action changes needed (Plan 00 widened types so setFloorMaterial/updateCeiling/setWallpaper accept userTextureId via pass-through).
- [Phase 34 Plan 02]: DeleteTextureDialog emits window.dispatchEvent(new CustomEvent("user-texture-deleted", { detail: { id } })) after successful remove(). Plan 03 userTextureCache MUST addEventListener on "user-texture-deleted" to invalidate cached THREE.Texture entries. Contract is DOM-event-based to keep Plan 02 dependency-free from Plan 03's cache module.
- [Phase 34 Plan 02]: Auto-fixed 6 test mocks (phase31*/snapIntegration/App.restore) to add createStore + values to idb-keyval mock — direct consequence (Rule 3 Blocking) of picker imports cascading into useUserTextures → userTextureStore. Mock additions are minimal (2 lines each).

### Pending Todos

- Run Plans 34-01 (upload modal) and 34-02 (picker integration) in Wave 2 (can parallelize against Plan 00's stable API surface)
- Plan 34-03 (Wave 3: 3D render integration + orphan fallback)
- Phase 36 should run EARLY (parallel to Phase 34 or immediately after) — do NOT save for end
- Phase 37 (Tech-Debt Sweep) sequenced LAST; cuttable under scope pressure

### Open Blockers/Concerns

None. Roadmap approved, traceability complete (11/11), ready to plan Phase 34.

### Known Gaps Carried Forward

- **PERF-02 speedup target missed** — `structuredClone(toPlain(...))` contract met but ~1.25× slower than JSON roundtrip at 50W/30P (absolute <0.3ms, non-user-visible). Accepted; documented in `milestones/v1.5-MILESTONE-AUDIT.md` and `25-VERIFICATION.md`. No revisit unless scene scale grows to user-visible impact.
- **R3F v9 / React 19 upgrade execution deferred** — docs shipped (TRACK-01). Upgrade itself waits for R3F v9 to exit beta. Tracked on GH #56.
- **#61 WOOD_PLANK PBR realism** — closed in spirit by Phase 32 PBR Foundation; remaining polish (if any) tracked under user-uploaded-texture workflow in Phase 34.
- **Traceability table drift (cosmetic)** — v1.5 requirements archive preserves "Pending" strings in 4 rows where checkboxes are `[x]`. Cosmetic only.
- **Phase 32 wallpaper/wallArt 2D↔3D regression** — promoted into v1.8 Phase 36 (VIZ-10) with instrumentation-first approach. Three prior fix attempts (Phase 32 Plans 05/06/07) retained as defensive code.

## Session Continuity

Last session: 2026-04-22T22:30:00.000Z
Stopped at: Completed Phase 34 Plan 00 — data layer shipped (userTextureStore + hook + countTextureRefs + schema extensions)
Resume file: .planning/phases/34-user-uploaded-textures/34-01-upload-modal-PLAN.md
