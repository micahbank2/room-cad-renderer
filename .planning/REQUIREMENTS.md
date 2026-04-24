---
milestone: v1.8
milestone_name: 3D Realism Completion
status: active
created: 2026-04-22
source: resumes v1.7 3D Realism track + promotes Phase 999.2 backlog
---

# v1.8 Requirements — 3D Realism Completion

**Milestone goal:** Close the 3D Realism story Phase 32 opened. Jessica can upload photos of real surfaces she's considering, switch camera angles instantly (1/2/3/4 hotkeys), and never see textures vanish on 2D↔3D toggle. v1.7 tech-debt (auto-save carry-overs, resolver migration, frontmatter backfill) also cleared.

**Source issues:** [#47](https://github.com/micahbank2/room-cad-renderer/issues/47) (user textures), [#45](https://github.com/micahbank2/room-cad-renderer/issues/45) (camera presets), [#44](https://github.com/micahbank2/room-cad-renderer/issues/44) / [#46](https://github.com/micahbank2/room-cad-renderer/issues/46) / [#50](https://github.com/micahbank2/room-cad-renderer/issues/50) / [#60](https://github.com/micahbank2/room-cad-renderer/issues/60) (tech-debt carry-overs), plus Phase 999.2 backlog regression (uploaded-image wallpaper/wallArt 2D↔3D view-toggle).

**Success measure:** Jessica drops a photo of a real surface and sees it on a wall/floor/ceiling within ~10 seconds; she switches between top-down / eye-level / 3/4 / corner views with a single keystroke and a smooth ~600ms glide; uploaded-image wallpaper and wallArt survive 2D↔3D toggles indefinitely; all v1.6 carry-over GH issues are closed.

**Stack:** No new runtime dependencies. R3F v8 / drei v9 / React 18 lock holds (R3F v9 / React 19 deferred per D-02 / GH #56). Reuses Phase 32 foundations (color-space helper, refcount dispose API, per-mesh `<Suspense>` + `<ErrorBoundary>` pattern).

**Cross-cutting decisions inherited from v1.7:** D-1 (imperative TextureLoader), D-2 (optional `pbr?: PbrMaps` on `SurfaceMaterial`), D-5 (PBR cache migration), MUST-CS (color-space), MUST-WRAP (RepeatWrapping), MUST-ANISO (renderer-capability anisotropy), MUST-SUSP (per-mesh Suspense + ErrorBoundary), MUST-DISP (refcount dispose). Full ledger: `.planning/research/SUMMARY.md`.

---

## v1.8 Requirements

### User-Uploaded Textures (LIB)

- [x] **LIB-06** — User can upload a texture image (JPEG/PNG/WebP) via an "Upload Texture" UI, name it, specify real-world tile size in feet+inches (reusing the Phase 29 parser), and apply it to walls / floors / ceilings from the material picker.
  - **Source:** [#47](https://github.com/micahbank2/room-cad-renderer/issues/47)
  - **Verifiable:** Drop a 1024×1024 JPEG in the upload UI → preview appears → enter "Oak Floor" + "8ft × 4ft" → Save → appears in material picker → select a floor → material applies and renders tiled correctly in 3D at stated size. Full page reload preserves the material + its floor assignment.
  - **Acceptance:** MIME whitelist (JPEG/PNG/WebP). Reuses Phase 29 feet+inches parser. Written through a dedicated `userTextureStore` (separate from bundled `SurfaceMaterial` registry).

- [x] **LIB-07** — Upload pipeline enforces a size ceiling and deduplicates identical images.
  - **Source:** [#47](https://github.com/micahbank2/room-cad-renderer/issues/47)
  - **Verifiable:** Upload a 4096×4096 PNG → it is downscaled client-side to ≤2048 px on the longest edge before persistence (verify IDB entry byte size + image dimensions). Re-upload the same bytes (even under a different name) → SHA-256 of the downscaled bytes matches → only one IDB keyspace entry exists, and the second "upload" links to the existing entry. Uploading SVG or GIF → rejected at the MIME gate with a clear user-facing error ("Only JPEG, PNG, and WebP are supported").
  - **Acceptance:** 2048 px longest-edge client-side downscale. SHA-256 content addressing for dedup. MIME whitelist rejects SVG/GIF/HEIC/BMP.

- [x] **LIB-08** — Snapshots stay small and orphan texture references don't crash projects.
  - **Source:** [#47](https://github.com/micahbank2/room-cad-renderer/issues/47)
  - **Verifiable:** After placing 5 user-uploaded-texture surfaces, `JSON.stringify(snapshot)` contains zero `data:` substrings >10 KB and zero `Blob` instances — references are `userTextureId` strings only (typical <50 bytes each). Delete a user texture from the library while a project still references it → reload that project → orphan-referenced surface falls back to its base hex color without throwing or blanking the scene; other surfaces unaffected.
  - **Acceptance:** `CADSnapshot` holds `userTextureId` references only. Blobs live in `userTextureStore` IDB keyspace (never in snapshot JSON). Orphan fallback mirrors Phase 32 missing-texture fallback (base hex color).

### Camera Presets (CAM)

- [ ] **CAM-01** — Four camera presets (eye-level, top-down, 3/4, corner) are accessible via toolbar buttons and bare `1` / `2` / `3` / `4` hotkeys.
  - **Source:** [#45](https://github.com/micahbank2/room-cad-renderer/issues/45)
  - **Verifiable:** Click each toolbar button or press each hotkey in a clean 3D viewport → camera transitions to the correct pose:
    - Eye-level: 5.5 ft height, looking toward room center
    - Top-down: Y = 1.5 × max(roomWidth, roomLength), looking straight down
    - 3/4: current default (matches v1.7.5 baseline)
    - Corner: opposite room corner at ceiling height – 0.5 ft, looking at opposite corner
  - **Acceptance:** Active preset visually indicated on its toolbar button (`bg-accent/20 text-accent-light border-accent/30`). Hotkeys inert when `document.activeElement` is an `<input>` or `<textarea>` (no preset switch while typing in PropertiesPanel / RoomSettings).

- [ ] **CAM-02** — Preset switches glide smoothly and handle mid-tween interruption cleanly.
  - **Source:** [#45](https://github.com/micahbank2/room-cad-renderer/issues/45)
  - **Verifiable:** Clicking a preset → camera tweens ~600ms ease-in-out (not a snap). `OrbitControls` damping is disabled during the tween and re-enabled on settle (snap on epsilon). Pressing a different preset mid-tween → previous tween cancels and a new tween starts from the current camera position (no jumps, no stranded cameras). Switching view mode (2D / split) mid-tween → tween clears without throwing.
  - **Acceptance:** ~600ms ease-in-out tween. Damping toggle on tween boundaries. Cancel-and-restart behavior on interrupting input. Walk-mode ↔ preset handoff decided in plan-phase.

- [ ] **CAM-03** — Preset switches do not pollute persistence.
  - **Source:** [#45](https://github.com/micahbank2/room-cad-renderer/issues/45)
  - **Verifiable:** Before any preset switch, note `useCADStore.getState().past.length`. Trigger 10 preset switches (mix of buttons + hotkeys). `past.length` is unchanged. `useAutoSave` status never flips from `idle`/`saved` to `saving` on preset switches (verified via stubbed spy or devtools observation — no IDB writes during preset tweens).
  - **Acceptance:** Camera state is view-state, not CAD-state. Undo history and autosave both ignore it.

### Wallpaper/wallArt 2D↔3D Regression (VIZ)

- [ ] **VIZ-10** — Uploaded-image wallpaper and wallArt survive 2D↔3D view toggles indefinitely without reload or texture loss. Before proposing a fix, the root cause is identified via runtime instrumentation (Playwright harness capturing first-mount-upload → unmount → second-mount → pixel-diff). _(Plan 36-01 shipped the harness + ROOT-CAUSE.md documenting no-repro under chromium-dev. Plan 36-02 activates chromium-preview + CI + expanded coverage.)_
  - **Source:** Phase 999.2 backlog; `.planning/phases/32-pbr-foundation/32-HUMAN-UAT.md` Gap 1; `32-07-SUMMARY.md` "What's left that could cause it".
  - **Verifiable:** Upload an image-based wallpaper on a wall → toggle 2D→3D→2D→3D five times → wallpaper visible on every 3D frame (verified by pixel-diff vs first 3D frame, ≤1% delta). Same test for wallArt. Instrumentation harness logs the full texture lifecycle across all 5 mount cycles; root-cause document written before any code fix merges.
  - **Acceptance:** No 4th speculative fix. Root cause identified BEFORE fix. Test harness retained as regression guard. Existing defensive code from Phase 32 Plans 06/07 (non-disposing caches + `dispose={null}` primitive attach + static regression test) may stay or be simplified based on root-cause findings.

### Tech-Debt Sweep (DEBT)

- [ ] **DEBT-01** — v1.6 carry-over GitHub issues are closed with PR references.
  - **Source:** v1.6 milestone close (retained open as carry-over tracking).
  - **Verifiable:** `gh issue view 44` / `46` / `50` / `60` all show `state: CLOSED` with closing comments referencing the actual PRs that shipped the corresponding features (PR #66 / PR #67 or their equivalents). No orphan "in-progress" labels remain on these issues.

- [ ] **DEBT-02** — Orphan `SaveIndicator.tsx` component is removed.
  - **Source:** v1.6 carry-over (Phase 28 scope boundary).
  - **Verifiable:** `src/components/SaveIndicator.tsx` no longer exists on disk. `grep -r "SaveIndicator" src/` returns zero hits in production code (test drivers referencing the string by comment are acceptable — zero import/JSX hits). `npm run build` passes. Full vitest suite (424+) passes; failure count does not increase.

- [ ] **DEBT-03** — `effectiveDimensions` → `resolveEffectiveDims` migration is complete for all placement call sites.
  - **Source:** v1.6 Phase 31 incremental-migration tech-debt.
  - **Verifiable:** `grep -rn "effectiveDimensions(" src/` returns only catalog-context usages (places that compute library dims with no `PlacedProduct` / `PlacedCustomElement` to resolve against — e.g. placement preview before the placed record exists). All consumer sites (3D product mesh, 2D fabricSync, snap scene, selectTool hit-test, productTool) use `resolveEffectiveDims` / `resolveEffectiveCustomDims`. Per-placement `widthFtOverride` / `depthFtOverride` continue to render correctly after the migration (Phase 31 regression tests remain GREEN).

- [ ] **DEBT-04** — Phase 29 SUMMARY.md frontmatter traceability is backfilled.
  - **Source:** v1.6 Phase 29 SUMMARY.md frontmatter gap.
  - **Verifiable:** Each Phase 29 plan SUMMARY.md relevant to EDIT-20 / EDIT-21 has `requirements-completed: [EDIT-20, EDIT-21]` (or appropriate subset) in its YAML frontmatter. `node $HOME/.claude/get-shit-done/bin/gsd-tools.cjs summary-extract` can enumerate the backfilled requirements from Phase 29 without errors.

---

## Future Requirements (Deferred from v1.8)

- **GLTF/OBJ model upload** (#29) — Out of Scope per PROJECT.md (not a library-model tool).
- **Cloud sync / multi-device** (#30) — Out of Scope per PROJECT.md (single-user tool).
- **R3F v9 / React 19 upgrade** (#56) — Deferred per D-02 pending R3F v9 stabilization.
- **GH #89 library migration follow-ups** — WainscotLibrary / Paint-Material picker / FramedArt library onto `LibraryCard` + `CategoryTabs` shape-deferred per D-31. Candidate for a future polish cycle.
- **Phase 999.1 ceiling resize handles** — Extend Phase 31 drag-to-resize pattern to `customElements` with `kind: "ceiling"`. Candidate for v1.9+.

## Out of Scope

- **Normal / roughness map upload by user** — v1.8 handles albedo only via user upload. Normal + roughness maps remain a bundled-only concept (Phase 32 scope). Out of scope to avoid PBR-UX complexity for a Jessica-targeted flow.
- **Texture tiling controls beyond real-world size** — no per-surface rotation / offset / seam-smoothing UI. Uploaded textures tile at stated real-world size using `RepeatWrapping` only.
- **Walk-mode camera presets** — presets apply to orbit mode only. Walk-mode handoff semantics are decided in plan-phase; if ambiguity emerges, walk-mode is out of scope for this milestone.

## Traceability

Phase → requirement mapping. Plan column filled by `/gsd:plan-phase` when each phase is planned.

| Requirement | Phase | Plan(s) |
| ----------- | ----- | ------- |
| LIB-06 | Phase 34 | TBD |
| LIB-07 | Phase 34 | TBD |
| LIB-08 | Phase 34 | TBD |
| CAM-01 | Phase 35 | 35-01 |
| CAM-02 | Phase 35 | 35-02 |
| CAM-03 | Phase 35 | 35-02 |
| VIZ-10 | Phase 36 | TBD |
| DEBT-01 | Phase 37 | TBD |
| DEBT-02 | Phase 37 | TBD |
| DEBT-03 | Phase 37 | TBD |
| DEBT-04 | Phase 37 | TBD |
