# Roadmap: Room CAD Renderer

## Milestones

- ✅ **v1.0 Room Visualization MVP** — Phases 1–5.1 (shipped 2026-04-05) — see [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 UX Fixes & Polish** — Phases 6–10 (shipped 2026-04-05) — see [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 New Element Types** — Phases 11–17 (shipped 2026-04-05) — see [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Color, Polish & Materials** — Phases 18–20 (shipped 2026-04-06) — see [milestones/v1.3-ROADMAP.md](milestones/v1.3-ROADMAP.md)
- ✅ **v1.4 Polish & Tech Debt** — Phases 21–23 (shipped 2026-04-08) — see [milestones/v1.4-ROADMAP.md](milestones/v1.4-ROADMAP.md)
- ✅ **v1.5 Performance & Tech Debt** — Phases 24–27 (shipped 2026-04-20) — see [milestones/v1.5-ROADMAP.md](milestones/v1.5-ROADMAP.md)
- ✅ **v1.6 Editing UX** — Phases 28–31 (shipped 2026-04-21) — see [milestones/v1.6-ROADMAP.md](milestones/v1.6-ROADMAP.md)
- 🚧 **v1.7 3D Realism** — Phases 32–35 (in progress) — see below

---

## Completed Milestones

<details>
<summary>✅ v1.0 Room Visualization MVP (Phases 1–5.1) — SHIPPED 2026-04-05</summary>

6 phases, 23 plans. Core loop: global product library → 2D floor plans → textured 3D rendering → eye-level walkthrough → PNG export → auto-saved. See [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md).

</details>

<details>
<summary>✅ v1.1 UX Fixes & Polish (Phases 6–10) — SHIPPED 2026-04-05</summary>

6 phases, 7 PRs, 21 requirements. Zoom/pan, click accuracy, tool auto-revert, live dimensions, wall rotation, product resize, corner-perfect wall rendering, edit handles for every element, home page redesign, prominent save. See [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md).

</details>

<details>
<summary>✅ v1.2 New Element Types (Phases 11–17) — SHIPPED 2026-04-05</summary>

7 phases, 8 PRs, 29 requirements. Ceilings, floor materials, wallpaper, wall art, wainscoting, crown molding, custom elements, framed art library, 7 wainscoting styles with live 3D preview, per-side wall treatments. See [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md).

</details>

<details>
<summary>✅ v1.3 Color, Polish & Materials (Phases 18–20) — SHIPPED 2026-04-06</summary>

3 phases, 11 plans, 12/16 requirements. Full paint system (132 F&B + custom hex + lime wash), custom element edit handles, multi-select + bulk paint, collapsible sidebars, unified surface material catalog. See [milestones/v1.3-ROADMAP.md](milestones/v1.3-ROADMAP.md).

</details>

<details>
<summary>✅ v1.4 Polish & Tech Debt (Phases 21–23) — SHIPPED 2026-04-08</summary>

3 phases, 3 plans, 6/6 requirements. Deferred v1.3 verification (copy-side, frame color override, sidebar scroll) plus `updateWallArtNoHistory` undo-history fix, wainscot inline-edit popover on 2D canvas, underscore cleanup across 30+ files with display/identifier separation. See [milestones/v1.4-ROADMAP.md](milestones/v1.4-ROADMAP.md).

</details>

<details>
<summary>✅ v1.5 Performance & Tech Debt (Phases 24–27) — SHIPPED 2026-04-20</summary>

4 phases, 15 plans, 7/8 requirements complete (PERF-02 speedup partial, accepted as tech debt). Tool architecture refactor (18 `(fc as any)` casts eliminated, closure-scoped state, shared toolUtils), drag fast path (~99.9% clean frames), structuredClone snapshot contract, product thumbnail async-load fix, ceiling preset perception resolution, R3F v9 / React 19 upgrade tracking in CONCERNS.md + GH #56. See [milestones/v1.5-ROADMAP.md](milestones/v1.5-ROADMAP.md).

</details>

<details>
<summary>✅ v1.6 Editing UX (Phases 28–31) — SHIPPED 2026-04-21</summary>

4 phases, 17 plans, 11/11 requirements complete. Auto-save (debounced; SAVING/SAVED toolbar status; pointer-based silent restore on reload), editable dimension labels (double-click wall label → feet+inches input; single-undo guard), smart snapping (edges snap to walls/objects; midpoint auto-center; purple accent guides; Alt/Option disable), drag-to-resize handles (corner uniform + edge per-axis on products; wall-endpoint with smart-snap closing Phase 30 D-08b; single undo entry preserving Phase 25 fast-path), per-placement label override for custom elements with PropertiesPanel input + live 2D render. See [milestones/v1.6-ROADMAP.md](milestones/v1.6-ROADMAP.md).

</details>

---

## v1.7 3D Realism

**Goal:** Make Jessica's 3D view feel like the actual room — physically-based materials replace flat-color placeholders, she can drop in textures from photos of real surfaces she's considering, and she can switch camera angles to evaluate the space from multiple vantage points.

**Requirements:** 13 | **Phases:** 4 (32–35)

### Phases

- [x] **Phase 32: PBR Foundation** — WOOD_PLANK / CONCRETE / PLASTER render with bundled albedo + normal + roughness maps; loader is non-blocking and color-space correct (completed 2026-04-21)
- [ ] **Phase 33: User-Uploaded Textures** — Jessica uploads a photo of a real surface; it appears as a custom material on walls/floors/ceilings; persists locally with dedup + downscale
- [ ] **Phase 34: Camera Presets** — eye-level / top-down / 3-quarter / corner switchable via toolbar buttons + 1/2/3/4 hotkeys with smooth ~600ms tween
- [ ] **Phase 35: Tech-Debt Sweep** — close GH #44/#46/#50/#60, delete orphan SaveIndicator, finish resolveEffectiveDims migration, backfill Phase 29 frontmatter

### Phase Details

#### Phase 32: PBR Foundation
**Plans:** 7/7 plans complete
**Goal**: Jessica's WOOD_PLANK, CONCRETE, and PLASTER walls/floors/ceilings read as believable surfaces in 3D — wood shows plank seams + grain, concrete shows aggregate roughness, plaster shows subtle surface variation
**Depends on**: Nothing (first v1.7 phase)
**Requirements**: VIZ-07, VIZ-08, VIZ-09
**Success Criteria** (what must be TRUE):
  1. In the 3D viewport at default 3/4 camera with default lighting, WOOD_PLANK / CONCRETE / PLASTER each read as visually distinct from a flat hex-color render — no color-space corruption (albedo loads `SRGBColorSpace`; normal/roughness load `NoColorSpace`)
  2. PAINTED_DRYWALL and existing flat-color materials render unchanged from v1.6 baseline
  3. Manually breaking a texture URL leaves the affected surface rendering with its base hex color; the rest of the scene continues rendering; no React error boundary trip
  4. PBR loading is non-blocking — Suspense fallback is per-mesh, not whole-scene; canvas does not freeze while textures load
  5. `public/textures/` ships three CC0-licensed sets (`wood-plank/`, `concrete/`, `plaster/`) at 1024² albedo + 512² normal + 512² roughness, ~1.5 MB total
  6. Refcount-based dispose API releases GPU memory when a texture is no longer referenced by any active material; anisotropy is set from renderer capabilities; wrap mode is `RepeatWrapping`
**Plans**:
- [x] 32-01-PLAN.md — Texture assets (CC0 downloads) + SurfaceMaterial.pbr registry extension (wave 1)
- [x] 32-02-PLAN.md — PBR loader infrastructure (color-space helper, refcount cache, ErrorBoundary) (wave 1, parallel)
- [x] 32-03-PLAN.md — Wire PBR into FloorMesh/CeilingMesh/WallMesh; swap Environment HDR; migrate legacy caches (D-05) (wave 2)
- [x] 32-04-PLAN.md — Test driver + integration tests + boundary tests (wave 3)
- [x] 32-05-PLAN.md — GAP CLOSURE: debounced texture disposal (wallpaper/wallArt regression from D-05 cache migration) (wave 4)
**UI hint**: yes

#### Phase 33: User-Uploaded Textures
**Goal**: Jessica uploads a photo of a real surface she's considering and applies it to a wall/floor/ceiling within ~10 seconds; the upload persists across reload and never bloats project snapshots
**Depends on**: Phase 32 (reuses PBR loader, color-space helper, per-mesh Suspense pattern, refcount dispose API)
**Requirements**: LIB-06, LIB-07, LIB-08
**Success Criteria** (what must be TRUE):
  1. Dropping or picking a JPEG/PNG/WebP file in the new "Upload Texture" UI shows a preview, accepts a name + real-world tile size in feet+inches (Phase 29 parser), and saves to the material picker for walls/floors/ceilings
  2. Uploaded textures apply on selection like bundled materials and persist across full page reload
  3. SVG and GIF uploads are rejected at the MIME-whitelist gate with a clear error message
  4. Images larger than 2048 px on the longest edge are auto-downscaled client-side to ≤2048 px before persistence; SHA-256 of the resulting bytes dedups same-image re-uploads to a single IDB entry
  5. `JSON.stringify(snapshot)` contains zero `data:` substrings >10 KB and zero `Blob` instances — `CADSnapshot` references textures by `userTextureId` only; Blobs live in a separate `userTextureStore` IDB keyspace
  6. Deleting a texture from the library while a project still references it leaves the project loadable; the orphan-referenced surface falls back to its base hex color without crash
**Plans**: TBD
**UI hint**: yes

#### Phase 34: Camera Presets
**Goal**: Jessica can switch between top-down, eye-level, 3/4, and corner views with a single keystroke or click, with a smooth glide between poses
**Depends on**: Phase 33 (sequencing only — no code coupling; could run after Phase 32)
**Requirements**: CAM-01, CAM-02, CAM-03
**Success Criteria** (what must be TRUE):
  1. Four toolbar buttons and bare `1`/`2`/`3`/`4` hotkeys switch between eye-level (5.5 ft), top-down (Y = 1.5× max(roomWidth, roomLength)), 3/4 (current default), and corner (room corner at ceiling - 0.5 ft, looking at opposite corner)
  2. Hotkeys are inert when focus is in an input or textarea (`document.activeElement` guard) — no preset switch fires while typing in PropertiesPanel or RoomSettings
  3. Camera transitions glide ~600ms ease-in-out, not snap; `OrbitControls` damping is disabled during the tween, snap on epsilon, and a mid-tween preset switch cancels-and-restarts cleanly from the current position
  4. The active preset is visually indicated on its toolbar button (`bg-accent/20 text-accent-light border-accent/30`)
  5. Preset switches do NOT push to undo history (`past.length` unchanged) and do NOT trigger `useAutoSave` (no Blob/MB churn into IDB on every glide)
  6. Switching view modes (2D/3D/split) mid-tween clears the in-flight tween cleanly without throwing or stranding the camera; walk-mode handoff is decided in plan-phase
**Plans**: TBD
**UI hint**: yes

#### Phase 35: Tech-Debt Sweep
**Goal**: v1.6 leftover noise is gone — shipped issues are closed on GitHub, dead code is deleted, the resolver migration is complete, and Phase 29 traceability frontmatter is correct
**Depends on**: Nothing (independent; recommended last so it can be cut under scope pressure without leaving features half-shipped)
**Requirements**: DEBT-01, DEBT-02, DEBT-03, DEBT-04
**Success Criteria** (what must be TRUE):
  1. GitHub issues #44 (auto-save), #46 (editable dim labels), #50 (per-placement label override), and #60 (drag-to-resize) are closed with comments referencing PR #66 / PR #67
  2. `src/components/SaveIndicator.tsx` no longer exists; `grep -r "SaveIndicator"` returns no production references; build still passes; full test suite (340+) still passes
  3. `grep "effectiveDimensions(" src/` returns only catalog-context usages — all `PlacedProduct` / `PlacedCustomElement` call sites use `resolveEffectiveDims` / `resolveEffectiveCustomDims`; per-placement overrides continue to render correctly across 3D meshes, snap scene, fabricSync, and selectTool
  4. Phase 29 SUMMARY.md frontmatter `requirements-completed` field is backfilled with `EDIT-20, EDIT-21` for the relevant plan summaries (verifiable via `gsd-tools summary-extract`)
**Plans**: TBD
**UI hint**: yes

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 32. PBR Foundation | 7/7 | Complete    | 2026-04-21 |
| 33. User-Uploaded Textures | 0/0 | Not started | - |
| 34. Camera Presets | 0/0 | Not started | - |
| 35. Tech-Debt Sweep | 0/0 | Not started | - |

## Backlog

### Phase 999.1: Ceiling resize handles (BACKLOG)

**Goal:** [Captured for future planning] Extend drag-to-resize handles from Phase 31 (products + custom-elements) to cover ceilings. Ceilings (customElements with `kind: "ceiling"`) currently have no resize handles — users can only move or delete and redraw. Mirror Phase 31's width/depth override pattern (`widthFtOverride` / `depthFtOverride`, single-undo drag transaction, Alt disables smart-snap).

**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

**Discovered:** 2026-04-21 during Phase 32 T4 human UAT (Jessica) — pre-existing, not Phase 32 scope.

### Phase 999.2: Wallpaper + wallArt view-toggle regression (BACKLOG, deferred from Phase 32)

**Goal:** [To be addressed early in Phase 33 — same code paths] Fix the regression where uploaded-image wallpaper and wallArt disappear after a 2D↔3D view toggle. PBR paths, color wallpaper, and paint paths all work — only the cached data-URL texture paths through `<meshStandardMaterial>` fail. Three stacked fix attempts in Phase 32 (Plans 05, 06, 07) landed correct code against known R3F footguns without resolving the underlying issue. Phase 33's first task: build a runtime instrumentation harness (Playwright + instrumented build) that captures the full sequence (first-mount texture upload → unmount → second-mount attempt → pixel diff) to identify the actual cause before a fourth fix.

**Requirements:** TBD — see `.planning/phases/32-pbr-foundation/32-HUMAN-UAT.md` Gap 1 and `32-07-SUMMARY.md` "What's left that could cause it" for the still-plausible candidate causes.
**Plans:** 0 plans

Plans:
- [ ] TBD (promote early in Phase 33)

**Discovered:** 2026-04-21 Phase 32 T4 human UAT. Deferred rather than attempting a 4th speculative fix. Retained defensive code from 32-06 and 32-07 stays in place (non-disposing caches + `dispose={null}` primitive attach + static regression test).
