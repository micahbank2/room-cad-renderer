# v1.7 Requirements — 3D Realism

**Milestone goal:** Make Jessica's 3D view feel like the actual room — physically-based materials replace flat-color placeholders, she can drop in textures from photos of real surfaces she's considering, and she can switch camera angles to evaluate the space from multiple vantage points.

**Source issues:** [#61](https://github.com/micahbank2/room-cad-renderer/issues/61), [#47](https://github.com/micahbank2/room-cad-renderer/issues/47), [#45](https://github.com/micahbank2/room-cad-renderer/issues/45)

**Success measure:** WOOD_PLANK / CONCRETE / PLASTER read as believable surfaces in the 3D viewport (Jessica can tell wood from concrete at a glance), Jessica can upload a photo of a real surface she's considering and see it on a wall/floor/ceiling within ~10 seconds, and she can switch between top-down + eye-level + 3/4 + corner views with a single keystroke or click.

**Stack:** No new runtime dependencies. R3F v8 / drei v9 / React 18 lock holds (R3F v9 / React 19 deferred per D-02 / GH #56).

**Cross-cutting decisions:** See `.planning/research/SUMMARY.md` Decisions Ledger for the full set (D-1..D-6, LOCK-*, MUST-*).

---

## v1.7 Requirements

### PBR Materials (VIZ)

- [x] **VIZ-07** — `WOOD_PLANK`, `CONCRETE`, and `PLASTER` surface materials render with PBR maps (albedo + normal + roughness) on walls, floor, and ceiling. `PAINTED_DRYWALL` and existing flat-color materials remain unchanged.
  - **Source:** [#61](https://github.com/micahbank2/room-cad-renderer/issues/61)
  - **Verifiable:** In 3D viewport at default 3/4 camera with default lighting, each of the three materials reads as visually distinct from a flat hex-color render — wood shows plank seams + grain, concrete shows aggregate + roughness, plaster shows subtle surface variation. No color-space corruption (normal/roughness load with `NoColorSpace`; albedo with `SRGBColorSpace`).
  - **Acceptance:** D-1 (imperative `TextureLoader`), D-2 (optional `pbr?: PbrMaps` on `SurfaceMaterial`), MUST-CS, MUST-WRAP, MUST-ANISO.

- [x] **VIZ-08** — PBR texture loading is non-blocking and fault-tolerant: a missing or failed texture URL leaves the surface rendering with its base hex color (existing fallback) instead of blacking out the scene. Loading does not freeze the canvas via Suspense.
  - **Source:** [#61](https://github.com/micahbank2/room-cad-renderer/issues/61)
  - **Verifiable:** Manually break a texture URL in `surfaceMaterials.ts`; viewport continues rendering, only the affected surface falls back to base color. No console errors propagate to React error boundary.
  - **Acceptance:** MUST-SUSP (per-mesh `<Suspense>` + `<ErrorBoundary>`), MUST-DISP (refcount-based dispose API).

- [x] **VIZ-09** — Bundled PBR texture sets ship at sized for desktop viewing without bloating bundle: 1024×1024 albedo + 512×512 normal + 512×512 roughness per material, ~1.5 MB total in `public/textures/`.
  - **Source:** Locked per LOCK-RES, FEATURES §1.
  - **Verifiable:** `ls -la public/textures/` shows three subdirectories (`wood-plank/`, `concrete/`, `plaster/`) with the three required maps each. CC0-licensed from a verifiable source (e.g. ambientCG / Poly Haven).

### User-Uploaded Textures (LIB)

- [ ] **LIB-06** — Jessica can upload a single image (JPEG/PNG/WebP) as a custom material via a new "Upload Texture" UI in the materials section of Sidebar/PropertiesPanel. The upload form requires a name and a real-world tile size in feet+inches (reusing the Phase 29 parser).
  - **Source:** [#47](https://github.com/micahbank2/room-cad-renderer/issues/47)
  - **Verifiable:** Drop or pick a JPEG/PNG/WebP file → preview shows → fill name + tile size (e.g. `12"x12"`) → save → texture appears in the material picker for walls/floors/ceilings, applies on selection, persists across reload.
  - **Acceptance:** D-3 (`userTextureStore`), LOCK-UPL, MUST-NOT-SVG (reject `image/svg+xml` and `image/gif`).

- [ ] **LIB-07** — Uploaded images larger than 2048 px on the longest edge are auto-downscaled to ≤2048 px before persistence. Same image uploaded twice (SHA-256 dedup) reuses the existing entry instead of duplicating storage.
  - **Source:** [#47](https://github.com/micahbank2/room-cad-renderer/issues/47), PIT #8/#9.
  - **Verifiable:** Upload a 4096×4096 image; IDB entry stores ≤2048 px Blob. Re-upload the same file; only one entry exists in `userTextureStore`.
  - **Acceptance:** LOCK-CAP, MUST-DOWN, MUST-BLOB.

- [ ] **LIB-08** — User-uploaded textures persist as `Blob` in a separate IndexedDB keyspace (NOT inside `cadStore` snapshots). `CADSnapshot` references textures by `userTextureId` only. Deleting a texture from the library while a project still references it leaves the project loadable with the affected surface falling back to its base color.
  - **Source:** [#47](https://github.com/micahbank2/room-cad-renderer/issues/47), PIT #13/#14.
  - **Verifiable:** A test asserts `JSON.stringify(snapshot)` contains no `data:` substrings >10 KB and no `Blob` instances. Manually delete a referenced texture; project reload does not crash, surface renders base color.
  - **Acceptance:** D-3, LOCK-LIB, MUST-NO-INLINE, orphan-safe fallback.

### Camera Presets (CAM)

- [ ] **CAM-01** — Four camera presets are available in the 3D viewport: eye-level (5.5 ft), top-down (Y = 1.5× max(roomWidth, roomLength) above floor center), 3/4 (current default), and corner (at room corner, ceiling - 0.5 ft, looking at opposite corner). Switching is via four toolbar buttons and bare `1`/`2`/`3`/`4` keyboard hotkeys.
  - **Source:** [#45](https://github.com/micahbank2/room-cad-renderer/issues/45)
  - **Verifiable:** Click each toolbar button or press each hotkey; camera animates to the corresponding pose. Hotkeys are inert when focus is in an input/textarea (`document.activeElement` guard).
  - **Acceptance:** D-4 (state in `uiStore`), LOCK-PRE, MUST-NOT-CAMCTRL.

- [ ] **CAM-02** — Camera transitions are smooth (~600ms ease-in-out), not snap. The active preset is visually indicated on its toolbar button. Tweens disable `OrbitControls` damping during the animation, snap on epsilon, and cancel-and-restart cleanly when the user mashes another preset mid-tween.
  - **Source:** FEATURES §3, PIT #10.
  - **Verifiable:** Switch preset → camera glides over ~600ms; click another preset mid-glide → previous tween cancels, new one starts from current position. Active button visibly highlighted (`bg-accent/20 text-accent-light border-accent/30`).
  - **Acceptance:** MUST-LERP.

- [ ] **CAM-03** — Preset switches do NOT push to undo history (camera changes are transient like tool switches). Camera position does NOT trigger auto-save (Blob/MB churn into IDB on every glide). Switching view modes (2D/3D/split) clears any in-flight tween cleanly.
  - **Source:** D-4, D-5, PIT #11/#12.
  - **Verifiable:** `past.length` unchanged after preset switch. `useAutoSave` does not fire. View-mode toggle mid-tween does not throw or strand the camera.
  - **Acceptance:** MUST-CAM, MUST-VIEWMODE.

### Tech-Debt Sweep (DEBT)

- [ ] **DEBT-01** — GitHub issues #44 (auto-save), #46 (editable dim labels), #50 (per-placement label override), and #60 (drag-to-resize) are closed on GitHub with references to the v1.6 commits/PR that implemented them.
  - **Source:** v1.6 audit (these shipped but never closed on GH).
  - **Verifiable:** `gh issue list --state closed` shows all four with closing comments referencing PR #66 / PR #67.

- [ ] **DEBT-02** — Orphan `src/components/SaveIndicator.tsx` is removed. Its imports/exports are deleted; build still passes; no tests fail.
  - **Source:** v1.6 Phase 28 deferred cleanup, audit tech debt.
  - **Verifiable:** File no longer exists. `grep -r "SaveIndicator"` returns no production references. `npm test -- --run` still passes (340+ tests).

- [ ] **DEBT-03** — All remaining `effectiveDimensions` call sites that handle `PlacedProduct` or `PlacedCustomElement` migrate to `resolveEffectiveDims` / `resolveEffectiveCustomDims`. Legacy `effectiveDimensions` may remain as a catalog-only helper (productTool placement creates fresh objects).
  - **Source:** v1.6 audit tech debt.
  - **Verifiable:** `grep "effectiveDimensions(" src/` returns only catalog-context usages. Per-placement overrides continue to render correctly across 3D meshes, snap scene, fabricSync, selectTool.

- [ ] **DEBT-04** — Phase 29 SUMMARY.md frontmatter `requirements-completed` field is backfilled with `EDIT-20, EDIT-21` (currently empty across all 4 plan summaries).
  - **Source:** v1.6 audit traceability drift.
  - **Verifiable:** `gsd-tools summary-extract .planning/milestones/v1.6-phases/29-*/29-XX-SUMMARY.md --fields requirements_completed` returns the correct REQ-IDs for each plan that should have them. (If phases were not archived to milestones/, file paths shift but content fix applies the same way.)

---

## Future Requirements (deferred from v1.7 — likely v1.8+)

- **Library overhaul** — #24 rebuild library with full category structure + view switcher, #23 rename Product Registry → Library, #49 wainscot library item edit UI
- **Materials engine** — #25 texture mapping + real-world metadata, #26 product-to-material linking, #27 material application system
- **Parametric controls** — #28 edit dimensions, swap finishes, collision detection
- **Architectural breadth** — #19 stairs/columns/openings/levels, #20 window presets, #21 invisible walls / cutaway, #22 measurement & annotation
- **Per-room camera pose persistence** — Jessica's preferred angle restores when reopening a project (if requested after v1.7)
- **Advanced PBR upload UI** — disclosure to drop normal + roughness alongside albedo (schema supports it; UI deferred)
- **Wallpaper / wall-art loader migration** — converge existing image loaders onto the new color-space-correct PBR loader
- **HDR fallback bundling** — local HDR file (≤500 KB) for offline lighting if Environment CDN fails

## Out of Scope

- **GLTF/GLB/OBJ 3D model upload (#29)** — locked per PROJECT.md; image-only products remain the model. Too complex for Jessica's workflow; introducing 3D model upload would also explode bundle size.
- **Cloud sync (#30)** — locked per PROJECT.md; local-first via IndexedDB. Re-decision required to revisit.
- **Design system redesign (#48)** — blocked on Jessica's mockups. Will queue when mockups land.
- **R3F v9 / React 19 upgrade (#56)** — deferred per D-02 until R3F v9 exits beta. Tracked persistently on GH #56.
- **Server-side image processing** — no backend; all upload preprocessing happens client-side (`<canvas>` resize, SHA-256 in browser).
- **Per-light material customization** — out of v1.7. Lighting in `Lighting.tsx` stays as-is.
- **Walk-mode → orbit handoff via preset switch** — to be decided in plan-phase; if "disable presets in walk mode" is selected, that becomes the v1.7 behavior. Not separately tracked as a requirement.

---

## Traceability

| REQ-ID | Source Issue | Phase | Status |
|--------|--------------|-------|--------|
| VIZ-07 | #61 | TBD (32) | Pending |
| VIZ-08 | #61 | TBD (32) | Pending |
| VIZ-09 | locked | TBD (32) | Pending |
| LIB-06 | #47 | TBD (33) | Pending |
| LIB-07 | #47 | TBD (33) | Pending |
| LIB-08 | #47 | TBD (33) | Pending |
| CAM-01 | #45 | TBD (34) | Pending |
| CAM-02 | locked | TBD (34) | Pending |
| CAM-03 | locked | TBD (34) | Pending |
| DEBT-01 | v1.6 audit | TBD (35) | Pending |
| DEBT-02 | v1.6 audit | TBD (35) | Pending |
| DEBT-03 | v1.6 audit | TBD (35) | Pending |
| DEBT-04 | v1.6 audit | TBD (35) | Pending |

**Phase column gets filled by `/gsd:new-milestone` roadmapper or `/gsd:plan-phase`.**

---

*Created: 2026-04-21 — v1.7 milestone scoping. Decisions ledger lives in `.planning/research/SUMMARY.md`.*
