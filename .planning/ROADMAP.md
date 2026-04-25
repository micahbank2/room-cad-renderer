# Roadmap: Room CAD Renderer

## Milestones

- ✅ **v1.0 Room Visualization MVP** — Phases 1–5.1 (shipped 2026-04-05) — see [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 UX Fixes & Polish** — Phases 6–10 (shipped 2026-04-05) — see [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 New Element Types** — Phases 11–17 (shipped 2026-04-05) — see [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Color, Polish & Materials** — Phases 18–20 (shipped 2026-04-06) — see [milestones/v1.3-ROADMAP.md](milestones/v1.3-ROADMAP.md)
- ✅ **v1.4 Polish & Tech Debt** — Phases 21–23 (shipped 2026-04-08) — see [milestones/v1.4-ROADMAP.md](milestones/v1.4-ROADMAP.md)
- ✅ **v1.5 Performance & Tech Debt** — Phases 24–27 (shipped 2026-04-20) — see [milestones/v1.5-ROADMAP.md](milestones/v1.5-ROADMAP.md)
- ✅ **v1.6 Editing UX** — Phases 28–31 (shipped 2026-04-21) — see [milestones/v1.6-ROADMAP.md](milestones/v1.6-ROADMAP.md)
- 🟡 **v1.7 3D Realism** — Phase 32 shipped (2026-04-21); remainder absorbed into v1.8 (see below)
- ✅ **v1.7.5 Design System & UI Polish** — Phase 33 (shipped 2026-04-22) — see [milestones/v1.7.5-ROADMAP.md](milestones/v1.7.5-ROADMAP.md)
- 🚧 **v1.8 3D Realism Completion** — Phases 34–37 (in progress)

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

<details>
<summary>✅ v1.7.5 Design System & UI Polish (Phase 33) — SHIPPED 2026-04-22</summary>

1 phase, 10 plans, 8/8 requirements complete (GH #83–#90). Canonical design tokens (typography 5-tier + spacing 7-step + radius 3-step in Tailwind v4 @theme), mixed-case typography hierarchy with UPPERCASE preserved for CAD identifiers, zero-arbitrary spacing sweep across Toolbar/Sidebar/PropertiesPanel/RoomSettings, `useReducedMotion` hook, `CollapsibleSection` primitive (10 PropertiesPanel sections + localStorage persistence), `LibraryCard` + `CategoryTabs` primitives (ProductLibrary + CustomElementsPanel migrated), `FloatingSelectionToolbar` with `uiStore.isDragging` bridge, dismissible `GestureChip` 2D/3D, rotation preset chips (-90/-45/0/+45/+90) with single-undo, `InlineEditableText` primitive for doc title + room tabs. Lucide-react chrome icons alongside 8-file Material Symbols CAD-glyph allowlist. 90 commits, +15,569/-908 LOC. Audit passed (8/8 reqs, 10/10 wirings, 5/5 E2E flows). See [milestones/v1.7.5-ROADMAP.md](milestones/v1.7.5-ROADMAP.md).

</details>

---

## v1.7 3D Realism (PARTIAL — remainder absorbed into v1.8)

**Goal:** Make Jessica's 3D view feel like the actual room — physically-based materials, user-uploaded textures, and camera presets.

**Status:** Phase 32 (PBR Foundation) shipped 2026-04-21. The remaining scope (user-uploaded textures, camera presets, wallpaper/wallArt regression, v1.6 tech-debt sweep) paused while v1.7.5 Design System & UI Polish shipped (2026-04-22), and has now been **rolled into the v1.8 3D Realism Completion milestone** below. See v1.8 section for phase details.

### Phases

- [x] **Phase 32: PBR Foundation** — WOOD_PLANK / CONCRETE / PLASTER render with bundled albedo + normal + roughness maps; loader is non-blocking and color-space correct (completed 2026-04-21)
- 🔁 **Phases 34–36 moved to v1.8** (User-Uploaded Textures, Camera Presets, Wallpaper/wallArt Regression, Tech-Debt Sweep — now Phases 34/35/36/37 under v1.8)

### Phase Details

#### Phase 32: PBR Foundation
**Plans:** 10/10 plans complete
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

---

## v1.8 3D Realism Completion

**Goal:** Close the v1.7 3D Realism story Phase 32 opened. Jessica uploads photos of real surfaces she is considering, switches camera angles via `1`/`2`/`3`/`4` hotkeys, and never sees textures vanish on 2D↔3D toggle. v1.6 tech-debt carry-overs also closed.

**Requirements:** 11 | **Phases:** 4 (34, 35, 36, 37) | **Coverage:** 11/11 ✓

### Sequencing rationale

- **Phase 34 (User-Uploaded Textures)** runs first — it delivers the Core Value slice (Jessica applies HER photos to surfaces). Its cache / IDB / Suspense work overlaps heavily with Phase 36's debugging harness, so the two phases feed each other.
- **Phase 36 (VIZ-10 regression)** runs EARLY — either parallel to Phase 34 or immediately after. The instrumentation harness may reveal cache semantics that reshape Phase 34's `userTextureStore` strategy. Do NOT defer Phase 36 to the end; a surprise here during Phase 37 would block a release.
- **Phase 35 (Camera Presets)** is independent — can run parallel to Phase 34/36. No code coupling to texture pipeline.
- **Phase 37 (Tech-Debt Sweep)** runs LAST. Positioned so it can be cut under scope pressure without leaving features half-shipped.

### Phases

- [x] **Phase 34: User-Uploaded Textures** — Jessica uploads JPEG/PNG/WebP with real-world tile size; applies to walls/floors/ceilings; 2048px downscale + SHA-256 dedup + orphan fallback (completed 2026-04-22)
- [x] **Phase 35: Camera Presets** — eye-level / top-down / 3-quarter / corner switchable via toolbar + 1/2/3/4 hotkeys with ~600ms ease-in-out tween, no undo/autosave pollution (completed 2026-04-25)
- [x] **Phase 36: Wallpaper/wallArt 2D↔3D Regression (VIZ-10)** — instrumentation-first investigation of Phase 32 carry-over regression; Playwright harness captures root cause BEFORE any fix merges (completed 2026-04-24)
- [ ] **Phase 37: Tech-Debt Sweep** — close GH #44/#46/#50/#60, delete orphan SaveIndicator, finish `resolveEffectiveDims` migration, backfill Phase 29 frontmatter

### Phase Details

#### Phase 34: User-Uploaded Textures
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
**Plans**: 4 plans
Plans:
- [x] 34-00-data-layer-PLAN.md — UserTexture type + userTextureStore IDB keyspace (SHA-256 dedup, most-recent-first list) + useUserTextures hook + countTextureRefs + cad.ts schema extensions (Wave 1) — SHIPPED 2026-04-22 (27 tests green; see 34-00-SUMMARY.md)
- [x] 34-01-upload-modal-PLAN.md — processTextureFile pipeline (MIME gate + 2048px downscale + SHA-256) + UploadTextureModal (create + edit modes per UI-SPEC §1) (Wave 2) — SHIPPED 2026-04-22 (27 new tests green; see 34-01-upload-modal-SUMMARY.md)
- [x] 34-02-picker-integration-PLAN.md — MyTexturesList shared component + DeleteTextureDialog (ref-count copy) + MY TEXTURES tab wired into Floor/Ceiling/Wall pickers (Wave 2) — SHIPPED 2026-04-22 (22 new tests green; user-texture-deleted CustomEvent contract published; see 34-02-picker-integration-SUMMARY.md)
- [x] 34-03-render-integration-PLAN.md — userTextureCache (non-disposing per wallpaper pattern) + useUserTexture hook + WallMesh/FloorMesh/CeilingMesh branches + orphan fallback + LIB-08 snapshot assertion + VIZ-10 regression guard (Wave 3)
**UI hint**: yes

#### Phase 35: Camera Presets
**Goal**: Jessica can switch between top-down, eye-level, 3/4, and corner views with a single keystroke or click, with a smooth glide between poses
**Depends on**: Nothing (sequencing only — no code coupling to other v1.8 phases; can run parallel to Phase 34/36)
**Requirements**: CAM-01, CAM-02, CAM-03
**Success Criteria** (what must be TRUE):
  1. Four toolbar buttons and bare `1`/`2`/`3`/`4` hotkeys switch between eye-level (5.5 ft), top-down (Y = 1.5× max(roomWidth, roomLength)), 3/4 (current default), and corner (room corner at ceiling - 0.5 ft, looking at opposite corner)
  2. Hotkeys are inert when focus is in an input or textarea (`document.activeElement` guard) — no preset switch fires while typing in PropertiesPanel or RoomSettings
  3. Camera transitions glide ~600ms ease-in-out, not snap; `OrbitControls` damping is disabled during the tween, snap on epsilon, and a mid-tween preset switch cancels-and-restarts cleanly from the current position
  4. The active preset is visually indicated on its toolbar button (`bg-accent/20 text-accent-light border-accent/30`)
  5. Preset switches do NOT push to undo history (`past.length` unchanged) and do NOT trigger `useAutoSave` (no Blob/MB churn into IDB on every glide)
  6. Switching view modes (2D/3D/split) mid-tween clears the in-flight tween cleanly without throwing or stranding the camera; walk-mode handoff is decided in plan-phase
**Plans:** 2/2 plans complete
Plans:
- [x] 35-01-structure-PLAN.md — cameraPresets.ts pose module + unit tests + uiStore bridge (activePreset + pendingPresetRequest + requestPreset) + Toolbar 4-button lucide cluster + 1/2/3/4 hotkey wiring with full guard chain (Wave 1)
- [x] 35-02-motion-PLAN.md — ThreeViewport tween engine (easeInOutCubic + damping toggle + cancel-and-restart + reduced-motion snap + view-mode/walk-mode cleanup) + 3 test drivers (__applyCameraPreset / __getActivePreset / __getCameraPose) + 5 Playwright e2e specs covering CAM-01/02/03 (Wave 2)
**UI hint**: yes

#### Phase 36: Wallpaper/wallArt 2D↔3D Regression (VIZ-10)
**Goal**: Identify the root cause of the Phase 32 wallpaper/wallArt 2D↔3D view-toggle regression via runtime instrumentation BEFORE landing any fix; then fix it with root-cause evidence on record
**Depends on**: Phase 32 (investigates the exact cache-migration code from Plans 32-03/05/06/07). Can run parallel to Phase 34 — its findings may reshape Phase 34's `userTextureStore` cache strategy
**Requirements**: VIZ-10
**Success Criteria** (what must be TRUE):
  1. A Playwright instrumentation harness exists in the repo that exercises first-mount-upload → unmount → second-mount-attempt on uploaded-image wallpaper and wallArt, logging the full texture lifecycle (load → bind → unbind → dispose) across all mount cycles
  2. A root-cause document (`.planning/phases/36-viz-10-regression/ROOT-CAUSE.md` or equivalent) is written BEFORE any fix PR merges — it names the actual cause identified by the harness (not speculation), and cross-references the still-plausible candidate causes listed in `.planning/phases/32-pbr-foundation/32-07-SUMMARY.md`
  3. After the fix lands, uploading an image-based wallpaper on a wall → toggling 2D→3D→2D→3D five times → pixel-diff of every 3D frame vs the first 3D frame is ≤1%; same test passes for wallArt
  4. The Playwright harness is retained as a regression guard, wired into the vitest or equivalent CI loop so a future cache-migration cannot silently break this path again
  5. Existing defensive code from Phase 32 Plans 06/07 (non-disposing caches + `dispose={null}` primitive attach + static regression test) is either kept intact OR simplified with explicit justification in the root-cause document — no silent removals
**Plans:** 2/2 plans complete
Plans:
- [x] 36-01-PLAN.md — Playwright harness + texture-lifecycle instrumentation + ROOT-CAUSE.md (NO fix)
- [x] 36-02-PLAN.md — Fix per ROOT-CAUSE.md findings + defensive-code triage + CI regression guard
**UI hint**: no

#### Phase 37: Tech-Debt Sweep
**Goal**: v1.6 leftover noise is gone — shipped issues are closed on GitHub, dead code is deleted, the resolver migration is complete, and Phase 29 traceability frontmatter is correct
**Depends on**: Nothing (independent; positioned LAST so it can be cut under scope pressure without leaving features half-shipped)
**Requirements**: DEBT-01, DEBT-02, DEBT-03, DEBT-04
**Success Criteria** (what must be TRUE):
  1. GitHub issues #44 (auto-save), #46 (editable dim labels), #50 (per-placement label override), and #60 (drag-to-resize) are closed with comments referencing PR #66 / PR #67 (or their equivalents)
  2. `src/components/SaveIndicator.tsx` no longer exists; `grep -r "SaveIndicator"` returns no production references; build still passes; full test suite (424+) still passes
  3. `grep "effectiveDimensions(" src/` returns only catalog-context usages — all `PlacedProduct` / `PlacedCustomElement` call sites use `resolveEffectiveDims` / `resolveEffectiveCustomDims`; per-placement overrides continue to render correctly across 3D meshes, snap scene, fabricSync, and selectTool
  4. Phase 29 SUMMARY.md frontmatter `requirements-completed` field is backfilled with `EDIT-20, EDIT-21` for the relevant plan summaries (verifiable via `gsd-tools summary-extract`)
**Plans**: TBD (est. 1–2 plans: close GH issues + delete SaveIndicator + complete migration + frontmatter backfill; can be parallelized across sub-tasks if desired)
**UI hint**: no

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 32. PBR Foundation | 7/7 | Complete    | 2026-04-21 |
| 33. Design System & UI Polish | 10/10 | Complete    | 2026-04-22 |
| 34. User-Uploaded Textures | 4/4 | Complete   | 2026-04-22 |
| 35. Camera Presets | 2/2 | Complete   | 2026-04-25 |
| 36. Wallpaper/wallArt Regression (VIZ-10) | 2/2 | Complete   | 2026-04-24 |
| 37. Tech-Debt Sweep | 0/0 | Not started | - |

## Backlog

### Phase 999.1: Ceiling resize handles (BACKLOG)

**Goal:** [Captured for future planning] Extend drag-to-resize handles from Phase 31 (products + custom-elements) to cover ceilings. Ceilings (customElements with `kind: "ceiling"`) currently have no resize handles — users can only move or delete and redraw. Mirror Phase 31's width/depth override pattern (`widthFtOverride` / `depthFtOverride`, single-undo drag transaction, Alt disables smart-snap).

**Requirements:** TBD
**Plans:** 4/4 plans complete

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

**Discovered:** 2026-04-21 during Phase 32 T4 human UAT (Jessica) — pre-existing, not Phase 32 scope.

### Phase 999.2: Wallpaper + wallArt view-toggle regression — PROMOTED to Phase 36 under v1.8

Originally captured 2026-04-21 Phase 32 T4 human UAT. Promoted into v1.8 as Phase 36 (VIZ-10). See Phase 36 Details above.

### Phase 999.3: Per-surface texture tile-size override (BACKLOG)

**Goal:** Let users scale a texture for design effect on a single surface without re-uploading. e.g., preview the same wood floor at 6"/12"/18" plank widths in the same room. Default behavior (real-world tiling via `RepeatWrapping`) stays correct; override is optional per surface.

**Requirements:** TBD
**GH Issue:** [#105](https://github.com/micahbank2/room-cad-renderer/issues/105)
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready, likely v1.9+ texture polish)

**Discovered:** 2026-04-25 during Phase 35 HUMAN-UAT — user asked why wood oak doesn't grow with the floor. Confirmed by-design behavior; captured as a natural follow-up enhancement. CLAUDE.md already flags "Texture tiling controls beyond real-world size" as out of scope for v1.8.
