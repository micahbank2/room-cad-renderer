# Roadmap: Room CAD Renderer

## Milestones

- ✅ **v1.0 Room Visualization MVP** — Phases 1–5.1 (shipped 2026-04-05) — see [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 UX Fixes & Polish** — Phases 6–10 (shipped 2026-04-05) — see [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 New Element Types** — Phases 11–17 (shipped 2026-04-05) — see [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Color, Polish & Materials** — Phases 18–20 (shipped 2026-04-06) — see [milestones/v1.3-ROADMAP.md](milestones/v1.3-ROADMAP.md)
- ✅ **v1.4 Polish & Tech Debt** — Phases 21–23 (shipped 2026-04-08) — see [milestones/v1.4-ROADMAP.md](milestones/v1.4-ROADMAP.md)
- ✅ **v1.5 Performance & Tech Debt** — Phases 24–27 (shipped 2026-04-20) — see [milestones/v1.5-ROADMAP.md](milestones/v1.5-ROADMAP.md)
- ✅ **v1.6 Editing UX** — Phases 28–31 (shipped 2026-04-21) — see [milestones/v1.6-ROADMAP.md](milestones/v1.6-ROADMAP.md)
- ✅ **v1.7 3D Realism** — Phase 32 shipped 2026-04-21; remainder absorbed into v1.8
- ✅ **v1.7.5 Design System & UI Polish** — Phase 33 (shipped 2026-04-22) — see [milestones/v1.7.5-ROADMAP.md](milestones/v1.7.5-ROADMAP.md)
- ✅ **v1.8 3D Realism Completion** — Phases 34–37 (shipped 2026-04-25) — see [milestones/v1.8-ROADMAP.md](milestones/v1.8-ROADMAP.md)
- ✅ **v1.9 Polish & Feedback** — Phases 38, 39, 42 (Phases 40 + 41 cancelled mid-milestone) — shipped 2026-04-25 — see [milestones/v1.9-ROADMAP.md](milestones/v1.9-ROADMAP.md)
- ✅ **v1.10 Evidence-Driven UX Polish** — Phases 43–44 (shipped 2026-04-25) — see [milestones/v1.10-ROADMAP.md](milestones/v1.10-ROADMAP.md)
- ✅ **v1.11 Pascal Feature Set** — shipped 2026-04-26
- ✅ **v1.12 Maintenance Pass** — shipped 2026-04-27
- ✅ **v1.13 UX Polish Bundle** — shipped 2026-04-28
- ✅ **v1.14 Real 3D Models** — Phases 55–58 (shipped 2026-05-05)
- ✅ **v1.15 Architectural Toolbar Expansion** — Phases 59–62 (shipped 2026-05-06)
- ✅ **v1.16 Maintenance Pass** — Phases 63–66 (shipped 2026-05-06)
- 🚧 **v1.17 Library + Material Engine** — Phases 67–70 (in progress)

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

<details>
<summary>✅ v1.8 3D Realism Completion (Phases 34–37) — SHIPPED 2026-04-25</summary>

4 phases, 9 plans, 11/11 requirements complete (LIB-06/07/08, CAM-01/02/03, VIZ-10, DEBT-01..04). User-uploaded textures (drop JPEG/PNG/WebP → name + real-world tile size → apply to walls/floors/ceilings; 2048px downscale + SHA-256 dedup + orphan fallback). Camera presets (eye-level / top-down / 3-quarter / corner via Toolbar buttons + bare 1/2/3/4 hotkeys; ~600ms easeInOutCubic tween with cancel-and-restart + reduced-motion snap; full activeElement/walk-mode/viewMode guards; no undo/autosave pollution). VIZ-10 permanent regression guard (Playwright harness × 4 surfaces × 2 projects + within-run pixel-diff via pixelmatch + GitHub Actions CI; ROOT-CAUSE.md documents no-repro Branch B per R-04 — all 4 Phase 32 defensive-code pieces classified KEEP). Tech-debt sweep closes GH #44/#46/#50/#60 verification, deletes orphan SaveIndicator, finishes effectiveDimensions migration with @deprecated marker, backfills Phase 29 frontmatter, formally accepts 6 pre-existing vitest failures as permanent. 80 commits, +16,588/-242 LOC. Audit passed_with_carry_over (AUDIT-01: 3 phases lack VERIFICATION.md → tech debt). See [milestones/v1.8-ROADMAP.md](milestones/v1.8-ROADMAP.md).

</details>

<details>
<summary>✅ v1.9 Polish & Feedback (Phases 38, 39, 42 — 40 + 41 cancelled mid-milestone) — SHIPPED 2026-04-25</summary>

3 phases, 4 plans, 3/3 shipped requirements (POLISH-01, FEEDBACK-01, BUG-01). VERIFICATION.md backfill closed v1.8 audit AUDIT-01 carry-over (3 retroactive verification reports for Phases 35/36/37). Real-use feedback signal pivoted from in-person hybrid to async 5-question questionnaire per CONTEXT D-08 due to calendar constraints — Jessica reported zero friction and zero new wishes beyond the GH backlog; all 3 Phase 35 HUMAN-UAT items confirmed; 8 GH issues curated as v2.0 scope seeds. **Mid-milestone re-scope:** Phases 40 (CEIL-01) and 41 (TILE-01) CANCELLED after Phase 39 contradicted their hypotheses ("ceilings went fine", "texture sizing feels right") — re-deferred to Phase 999.1 and Phase 999.3 backlogs (later cleared by v1.16). Narrower BUG-01 (Phase 42) shipped per-surface scaleFt isolation closing GH #96 — Ceiling.scaleFt added (mirrors Wallpaper.scaleFt + FloorMaterial.scaleFt convention), CeilingMesh resolver ceiling.scaleFt ?? entry?.tileSizeFt ?? 2, apply-time write in CeilingPaintSection, 4 new tests guard the invariant. 22 commits, +2,840/-40 LOC, single-day milestone. Audit passed_with_carry_over (AUDIT-01 recurring: v1.9 phases also lack VERIFICATION.md). The mid-milestone re-scope is itself the milestone's most valuable artifact — validated the "feedback-first" sequencing pattern by acting on its own hedge. See [milestones/v1.9-ROADMAP.md](milestones/v1.9-ROADMAP.md).

</details>

<details>
<summary>✅ v1.10 Evidence-Driven UX Polish (Phases 43–44) — SHIPPED 2026-04-25</summary>

2 phases, 2 plans, 5/5 shipped requirements (UX-01/02/03, DEFAULT-01, A11Y-01). Phase 43 UI polish bundle: 4 atomic commits closing #100 (templates ship with default ceiling at room.wallHeight), #98 (`--color-text-ghost` #484554 → #888494, ~5.15:1 WCAG AA, fixes 124+ usages globally), #101 (SAVED/SAVING/SAVE_FAILED badges enlarged text-[10px] → text-base 13px), #99 (ProspectSheet empty-state copy when nothing selected). Phase 44 reduced-motion sweep: 2 honest guards on wall-side camera tween + SAVING spinner; snap guides verified to need no guard (render at static GUIDE_OPACITY=0.6, no animation existed despite GH #76 issue body claim). Pattern validated: "evidence-driven prioritization" — 5 evidence-driven items shipped, 6 speculative items deferred (Pascal competitor-set committed for v1.11; #97/#81 deferred until evidence). 19 commits, +1,180/-42 LOC, single-day milestone. **AUDIT-01 systemic resolution:** three milestones of recurring "phases ship with SUMMARY-only" pattern (v1.8/v1.9/v1.10) resolved during v1.10 audit by editing `~/.claude/get-shit-done/workflows/audit-milestone.md` to formalize substitute-evidence policy. SUMMARY.md is now canonical evidence; VERIFICATION.md optional. Audit `passed_with_carry_over`. See [milestones/v1.10-ROADMAP.md](milestones/v1.10-ROADMAP.md).

</details>

<details>
<summary>✅ v1.11 Pascal Feature Set (Phases 45–48) — SHIPPED 2026-04-26</summary>

4 phases (45-48), 13 plans, 4/4 requirements (THUMB-01, TREE-01, DISPLAY-01, CAM-04). Auto-rendered material swatches, sidebar rooms hierarchy tree, NORMAL/SOLO/EXPLODE display modes, per-node saved cameras with tree double-click focus. Audit passed_with_carry_over (Phase 999.4 EXPLODE+saved-camera offset gap deferred). 60+ commits, single-day milestone span. See [milestones/v1.11-ROADMAP.md](milestones/v1.11-ROADMAP.md).

</details>

<details>
<summary>✅ v1.12 Maintenance Pass (Phases 49–52) — SHIPPED 2026-04-27</summary>

4 phases (49-52), 7 plans, 4/4 requirements (BUG-02, BUG-03, DEBT-05, HOTKEY-01). Two carry-over texture bugs closed (wall first-apply + wallpaper/wallArt 2D↔3D persistence) using a shared direct-`map` prop pattern. Legacy FloorMaterial data-URL entries auto-migrate to userTextureId references on snapshot load — `loadSnapshot` is now async (Pattern A pre-pass before Immer produce; 23 caller sites updated). Keyboard shortcuts cheat sheet overlay shipped via new single-source-of-truth registry at `src/lib/shortcuts.ts` (26 entries, coverage-gate test prevents drift). Audit `passed` — zero gaps, zero carry-over. ~5,700 LOC, 4 PRs, single-day milestone. See [milestones/v1.12-ROADMAP.md](milestones/v1.12-ROADMAP.md).

</details>

<details>
<summary>✅ v1.13 UX Polish Bundle (Phases 53–54) — SHIPPED 2026-04-28</summary>

2 phases (53-54), 2 plans, 2/2 requirements (CTXMENU-01, PROPS3D-01). Editor-flow maturity milestone before v1.14's real-3D-models work. Phase 53: right-click context menus via `CanvasContextMenu` (2D Fabric + 3D R3F, auto-flip, 5 close paths). Phase 54: 3D click-to-select via new `useClickDetect` hook (5px drag-threshold) + Canvas `onPointerMissed` deselect. Audit caught + fixed one cross-phase gap (CustomElementMesh missing right-click). ~21 files modified, 2 PRs, single-day milestone. Audit `passed` — zero carry-over. See [milestones/v1.13-ROADMAP.md](milestones/v1.13-ROADMAP.md).

</details>

<details>
<summary>✅ v1.14 Real 3D Models (Phases 55–58) — SHIPPED 2026-05-05</summary>

4 phases (55-58), 4 plans, 4/4 requirements (GLTF-UPLOAD-01, GLTF-RENDER-3D-01, GLTF-RENDER-2D-01, GLTF-INTEGRATION-01). Biggest user-visible win in project history. Phase 55: `.gltf`/`.glb` upload to IDB with SHA-256 dedup (mirrors Phase 32 user-texture pattern). Phase 56: drei `useGLTF` 3D rendering with auto-scale + Y-floor + `<box3Helper>` selection outline. Phase 57: top-down convex-hull silhouette polygons via Andrew's monotone chain + FIX-01 async cache. Phase 58: library Box badge top-LEFT + auto-thumbnail (mirrors Phase 45 swatch generator) + Phase 48 × GLTF e2e closing the only untested combo. 59 files modified, 11K LOC, 4 PRs ([#137](https://github.com/micahbank2/room-cad-renderer/pull/137), [#138](https://github.com/micahbank2/room-cad-renderer/pull/138), [#139](https://github.com/micahbank2/room-cad-renderer/pull/139), [#140](https://github.com/micahbank2/room-cad-renderer/pull/140)). Audit `passed` — zero regressions on Phase 31/48/53/54. Post-merge fix for React StrictMode double-mount in thumbnail callback. See [milestones/v1.14-ROADMAP.md](milestones/v1.14-ROADMAP.md).

</details>

<details>
<summary>✅ v1.15 Architectural Toolbar Expansion (Phases 59–62) — SHIPPED 2026-05-06</summary>

4 phases (59-62), 4 plans, 4/4 requirements (CUTAWAY-01, STAIRS-01, OPEN-01, MEASURE-01). After v1.14 made the *furniture* real, v1.15 made the *room itself* richer. Phase 59: wall cutaway via most-opposed-normal raycast (auto/off/manual modes; per-room Map in EXPLODE; constant `transparent: true` + opacity-only animation avoids Phase 49 BUG-02). Phase 60: `Stair` as new top-level entity (not customElement.kind) with D-04 origin-asymmetry handling — bottom-step center vs. bbox-center translation for snap; Material Symbols `stairs` glyph; first D-33 allowlist expansion since Phase 33; snapshot v3→v4. Phase 61: archway / passthrough / niche openings extending `Opening.type` enum (no version bump); D-11' lesson — Phase 53/54 don't auto-inherit, NEW wiring required; niche math sign-convention trap (`+N_out × d/2` recess INTO wall); Wall Cutouts dropdown. Phase 62: measureLine + annotation entities; `polygonArea` shoelace winding-agnostic + connectivity check; centroid for canvas overlay; click-preview-click measure flow with Phase 30 smart-snap; DOM-overlay label edit at zIndex 30; snapshot v4→v5. 90 files modified, +15.7K LOC, 4 PRs ([#142](https://github.com/micahbank2/room-cad-renderer/pull/142), [#143](https://github.com/micahbank2/room-cad-renderer/pull/143), [#144](https://github.com/micahbank2/room-cad-renderer/pull/144), [#145](https://github.com/micahbank2/room-cad-renderer/pull/145)). Audit `passed` — 85/85 e2e pass on chromium-preview. CI evolution: workflow timeout bumped 20m→35m then sharded by Playwright project to halve wall-clock. See [milestones/v1.15-ROADMAP.md](milestones/v1.15-ROADMAP.md).

</details>

<details>
<summary>✅ v1.16 Maintenance Pass (Phases 63–66) — SHIPPED 2026-05-06</summary>

4 phases (63-66), 4 plans, 4/4 requirements (DEBT-06, BUG-04, CEIL-02, TILE-02). Mirrored the v1.12 maintenance-pass pattern after two big feature milestones (v1.14 + v1.15 = 8 phases in 10 days). **Two long-parked Phase 999.x backlog items dating back to v1.9 finally cleared:** 999.1 ceiling resize handles (re-deferred twice) and 999.3 per-surface tile-size override (re-deferred once). Phase 63: investigated #146 vitest cascade — could not reproduce; shipped hygiene cleanup (top-level `global.URL` mutation → `vi.spyOn` + `restoreAllMocks`) as preventative. Phase 64: real bug found — WallMesh useEffect cleanup missing (StrictMode double-mount class, mirrors Phase 58 pattern); fix + 3000ms→8000ms timeout bump → `--repeat-each=5` 10/10 green. Phase 65: ceiling resize handles via override-anchor model (4 fields: widthFtOverride/depthFtOverride/anchorXFt/anchorYFt) with `resolveCeilingPoints` resolver — east/south drags use default anchors; west/north explicitly set opposite-edge anchor so dragged edge moves with cursor. Formal VERIFICATION 13/13 PASS. Phase 66: investigation revealed Phase 42 had already shipped data fields + actions + renderers + serialization; Phase 66 was just the missing UI tier (two `<input>` fields, no schema changes, no version bump). 32 files modified, +3,713 LOC, 4 PRs ([#147](https://github.com/micahbank2/room-cad-renderer/pull/147), [#148](https://github.com/micahbank2/room-cad-renderer/pull/148), [#149](https://github.com/micahbank2/room-cad-renderer/pull/149), [#150](https://github.com/micahbank2/room-cad-renderer/pull/150)). 3 of 4 phases used `/gsd:quick`; CEIL-02 used full pipeline. **Total wall-clock: ~55 minutes** — fastest milestone in project history. Audit `passed-with-notes` (DEBT-06 cascade observed once during audit re-run; monitor for v1.17). CLAUDE.md Pattern #7 (StrictMode useEffect cleanup) added between Phase 64 and 65, applied 3 times total in this milestone. See [milestones/v1.16-ROADMAP.md](milestones/v1.16-ROADMAP.md).

</details>

---

## v1.17 Library + Material Engine (active)

**Goal:** Jessica picks real materials (marble, fabric, tile, paint, flooring) with real-world metadata (brand, SKU, cost, lead time) and applies them to walls, floors, ceilings, and objects. Her library finally feels organized — Materials, Assemblies, and Products as separate top-level sections. **First milestone since v1.2 to introduce a new core data system.** Source: [#24](https://github.com/micahbank2/room-cad-renderer/issues/24), [#25](https://github.com/micahbank2/room-cad-renderer/issues/25), [#26](https://github.com/micahbank2/room-cad-renderer/issues/26), [#27](https://github.com/micahbank2/room-cad-renderer/issues/27).

**Sequencing rationale (locked):** Foundation → Apply → Link → UI Surface. Phase 67 lays the data foundation (no surface-area changes yet). Phase 68 makes materials usable on real surfaces (the moment Jessica can SEE Carrara marble on a wall). Phase 69 unlocks finish-swapping on placed objects (gold faucet → matte black without re-placing). Phase 70 surfaces all of it in a properly organized sidebar. Each phase replaces an existing subsystem — migration work + snapshot version bump expected at every boundary.

**Forward signal:** This is the longest-arc milestone since v1.8. Each phase ships independently — Phase 67 alone has user value (uploaded materials persist in the library, ready for Phase 68's apply flow). Two-tier cross-cutting risk: (a) snapshot version chain must thread cleanly v5 → v6 → v7 → v8 across phases, and (b) existing paint/wallpaper/floor-material systems either alias under Material or migrate fully — research at plan-phase decides per phase.

### Phases

- [x] **Phase 67: Material Engine Foundation** — Material entity + texture-map upload + IDB persistence, mirroring Phase 32 user-texture pipeline (completed 2026-05-07)
- [x] **Phase 68: Material Application System** — Unified surface-material picker replacing split paint / wallpaper / floor-material flows (completed 2026-05-07)
- [ ] **Phase 69: Product–Material Linking** — Finish slot on placed products, swap fabric/finish without re-placing
- [ ] **Phase 70: Library Rebuild** — Materials / Assemblies / Products top-level toggle with category tabs

### Phase Details

#### Phase 67: Material Engine Foundation (MAT-ENGINE-01)

**Goal:** Jessica uploads a Material with texture maps (color / roughness / reflection) plus real-world metadata (brand, SKU, cost, lead time, name, real-world tile size in feet+inches), and that Material persists in the library across reload, dedupes on identical color-map upload, and shows its metadata on hover/inspect.
**Depends on:** Phase 32 (user-texture IDB pipeline — SHA-256 dedup, 2048px downscale, 25MB cap)
**Requirements:** [MAT-ENGINE-01](https://github.com/micahbank2/room-cad-renderer/issues/25)
**Success Criteria** (what must be TRUE):
  1. User opens the library → clicks "Upload Material" → can drag a JPEG/PNG color map (and optionally roughness/reflection maps) plus type a name, brand, SKU, cost, lead time, and real-world tile size in feet+inches
  2. After save, the new Material appears in the library and persists across browser reload
  3. Re-uploading the same color-map file dedupes (no duplicate IDB entry; SHA-256 collision uses the existing texture)
  4. Hovering or inspecting a Material shows its metadata (brand, SKU, cost, lead time, tile size)
  5. Materials live in a separate `materialStore` (not in `cadStore`) — no impact on existing snapshot serialization at this phase
**Plans:** 1/1 plans complete
- [x] 67-01-PLAN.md — Material entity + IDB store + useMaterials hook + UploadMaterialModal + MaterialCard + MaterialsSection in ProductLibrary
**UI hint:** yes

#### Phase 68: Material Application System (MAT-APPLY-01)

**Goal:** Jessica selects any wall side, floor, ceiling, or custom-element face and applies a Material from the library through one unified picker, replacing today's split paint / wallpaper / floor-material flows. Existing assignments auto-migrate v5→v6 (D-01).
**Depends on:** Phase 67 (Material entity + library), Phase 32 (texture pipeline), Phase 13/17 (legacy wallpaper / floor-material / wall-side surface model), Phase 31 (single-undo apply pattern), Phase 51 (async snapshot migration template)
**Requirements:** [MAT-APPLY-01](https://github.com/micahbank2/room-cad-renderer/issues/27)
**Success Criteria** (what must be TRUE):
  1. Selecting a wall side, floor, ceiling, or custom-element face shows a unified "Material" picker in PropertiesPanel
  2. Picking a Material from the library renders it correctly in 2D fabric texture-fill AND 3D mesh material (color map + roughness)
  3. Applying a material is a single undo entry (Ctrl+Z reverts the apply)
  4. Existing paint colors, wallpaper assignments, and floor-material assignments auto-migrate at load time (snapshot v5→v6, idempotent — D-01)
  5. Snapshot serialization preserves `surface.materialId` and round-trips cleanly through save/load
**Plans:** 7/7 plans complete
- [x] 68-01-PLAN.md — Wave 0 RED test scaffolding (6 failing tests pin the contract)
- [x] 68-02-PLAN.md — Type extensions (Material.colorHex, FaceDirection, materialIdA/B, floorMaterialId, ceiling.materialId, faceMaterials, snapshot v5→v6) + resolveSurfaceMaterial / resolveSurfaceTileSize
- [x] 68-03-PLAN.md — migrateV5ToV6 async pre-pass (paint→Material, wallpaper→Material, floor→Material, ceiling→Material, idempotent) + applySurfaceMaterial / *NoHistory + applySurfaceTileSize / *NoHistory store actions
- [x] 68-04-PLAN.md — useResolvedMaterial R3F hook + priority-1 materialId branch in WallMesh / FloorMesh / CeilingMesh / per-face material array on CustomElementMesh
- [x] 68-05-PLAN.md — materialPatternCache (async fabric.Pattern loader) + fabricSync wall fill materialId branch + new renderFloor 2D top-down floor render
- [x] 68-06-PLAN.md — Unified MaterialPicker (replaces 4 legacy pickers) + mount in PropertiesPanel / WallSurfacePanel / RoomSettings (legacy picker files kept on disk per D-01 safety net)
- [x] 68-07-PLAN.md — Test drivers (`__driveApplyMaterial`, `__getResolvedMaterial`) + e2e Wave 0 spec GREEN + HUMAN-UAT.md + Jessica checkpoint
**UI hint:** yes

#### Phase 69: Product–Material Linking (MAT-LINK-01)

**Goal:** Jessica swaps the finish material on a placed product (couch fabric, faucet finish, cabinet color) without re-placing or re-uploading the object. Products carry an optional finish slot referencing a Material from the library.
**Depends on:** Phase 67 (Material entity), Phase 68 (Material picker UI), Phase 31 (placement-instance state per D-02), Phase 56/58 (GLTF PBR material slot handling)
**Requirements:** [MAT-LINK-01](https://github.com/micahbank2/room-cad-renderer/issues/26)
**Success Criteria** (what must be TRUE):
  1. User selects a placed product → PropertiesPanel shows a "Finish" picker → picks a Material from the library
  2. Product's 3D rendering updates to use that Material's color + roughness; placement, position, scale, and rotation are preserved
  3. Single Ctrl+Z reverts the finish change
  4. Finish persists across save/load (`PlacedProduct.finishMaterialId` round-trips through the snapshot)
  5. Products placed without an explicit finish continue to render with the catalog default (today's behavior unchanged)
**Plans:** TBD
**UI hint:** yes

#### Phase 70: Library Rebuild (LIB-REBUILD-01)

**Goal:** Sidebar library reorganizes around a top-level Materials / Assemblies / Products toggle. Each tab has its own category sub-tabs (Materials: Flooring, Wall coverings, Countertops, Paint; Products: Furniture, Plumbing fixtures, Appliances, Lighting, Curtains & blinds, Decor; Assemblies: empty placeholder).
**Depends on:** Phase 67 (Materials live in their own store), Phase 33 (CategoryTabs primitive), Phase 14 (custom-element library precedent)
**Requirements:** [LIB-REBUILD-01](https://github.com/micahbank2/room-cad-renderer/issues/24)
**Success Criteria** (what must be TRUE):
  1. Sidebar library shows a 3-way Materials / Assemblies / Products toggle at the top; switching tabs swaps the visible content cleanly
  2. Materials tab shows category sub-tabs (Flooring / Wall coverings / Countertops / Paint) and the Phase 67 materials filtered by category
  3. Products tab shows category sub-tabs (Furniture / Plumbing fixtures / Appliances / Lighting / Curtains & blinds / Decor); existing products migrate to the right category (or "Uncategorized" if metadata is missing)
  4. Assemblies tab shows a clear empty-state placeholder ("Coming soon — pre-built combos like kitchen cabinetry"), not broken UI
  5. Upload buttons are context-aware: in Materials tab → "Upload Material"; in Products tab → "Add Product"; existing upload + place flows continue to work end-to-end
**Plans:** TBD
**UI hint:** yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 32. PBR Foundation | 7/7 | Complete    | 2026-04-21 |
| 33. Design System & UI Polish | 10/10 | Complete    | 2026-04-22 |
| 34. User-Uploaded Textures | 4/4 | Complete   | 2026-04-22 |
| 35. Camera Presets | 2/2 | Complete   | 2026-04-25 |
| 36. Wallpaper/wallArt Regression (VIZ-10) | 2/2 | Complete   | 2026-04-24 |
| 37. Tech-Debt Sweep | 1/1 | Complete   | 2026-04-25 |
| 38. VERIFICATION.md Backfill | 1/1 | Complete   | 2026-04-25 |
| 39. Real-Use Feedback Session | 2/2 | Complete   | 2026-04-25 |
| ~~40. Ceiling Resize Handles~~ | n/a | CANCELLED   | 2026-04-25 (deferred to Phase 999.1; later cleared by Phase 65) |
| ~~41. Per-Surface Tile-Size Override~~ | n/a | CANCELLED   | 2026-04-25 (deferred to Phase 999.3; later cleared by Phase 66) |
| 42. Per-Surface tileSizeFt Bug Fix | 1/1 | Complete   | 2026-04-25 |
| 43. UI Polish Bundle | 1/1 | Complete   | 2026-04-25 |
| 44. Reduced-Motion Sweep | 1/1 | Complete   | 2026-04-25 |
| 45. Auto-Gen Material Swatch Thumbnails | 2/2 | Complete    | 2026-04-26 |
| 46. Rooms Hierarchy Sidebar Tree | 4/4 | Complete    | 2026-04-26 |
| 47. Room Display Modes | 3/3 | Complete    | 2026-04-26 |
| 48. Per-Node Saved Camera + Focus | 2/3 | Complete    | 2026-04-26 |
| 49. Wall Texture First-Apply Fix | 1/1 | Complete    | 2026-04-27 |
| 50. Wallpaper/WallArt View-Toggle Persistence | 1/1 | Complete    | 2026-04-27 |
| 51. Legacy FloorMaterial Snapshot Migration | 1/1 | Complete    | 2026-04-28 |
| 52. Keyboard Shortcuts Overlay | 1/1 | Complete    | 2026-04-28 |
| 53. Canvas Context Menus | 1/1 | Complete    | 2026-04-28 |
| 54. PropertiesPanel in 3D & Split View | 1/1 | Complete    | 2026-04-29 |
| 55. GLTF Upload & Storage | 1/1 | Complete    | 2026-04-29 |
| 56. GLTF Render in 3D | 1/1 | Complete    | 2026-05-04 |
| 57. GLTF Top-Down Silhouette in 2D | 1/1 | Complete    | 2026-05-05 |
| 58. GLTF Integration Verification | 1/1 | Complete    | 2026-05-05 |
| 59. Wall Cutaway Mode | 1/1 | Complete    | 2026-05-05 |
| 60. Stairs | 1/1 | Complete    | 2026-05-06 |
| 61. Openings — Archway/Passthrough/Niche | 1/1 | Complete    | 2026-05-06 |
| 62. Measurement + Annotation Tools | 1/1 | Complete    | 2026-05-06 |
| 63. Vitest Pollution Fix | 1/1 | Complete    | 2026-05-06 |
| 64. Wall-Texture Flake Fix | 1/1 | Complete    | 2026-05-06 |
| 65. Ceiling Resize Handles | 1/1 | Complete    | 2026-05-06 |
| 66. Per-Surface Tile-Size UI | 1/1 | Complete    | 2026-05-06 |
| 67. Material Engine Foundation | 1/1 | Complete    | 2026-05-07 |
| 68. Material Application System | 7/7 | Complete   | 2026-05-07 |
| 69. Product–Material Linking | 0/0 | Not started   | — |
| 70. Library Rebuild | 0/0 | Not started   | — |

## Backlog

### Phase 999.1: Ceiling resize handles — CLEARED by Phase 65 (v1.16)

Originally captured 2026-04-21 Phase 32 T4 human UAT; re-deferred from cancelled v1.9 Phase 40. Promoted to v1.16 Phase 65 (CEIL-02), shipped 2026-05-06 via PR [#149](https://github.com/micahbank2/room-cad-renderer/pull/149) with the override-anchor model (4 new optional fields on `Ceiling`). Issue [#70](https://github.com/micahbank2/room-cad-renderer/issues/70) auto-closed.

### Phase 999.2: Wallpaper + wallArt view-toggle regression — PROMOTED to Phase 36 under v1.8

Originally captured 2026-04-21 Phase 32 T4 human UAT. Promoted into v1.8 as Phase 36 (VIZ-10). Shipped.

### Phase 999.3: Per-surface texture tile-size override — CLEARED by Phase 66 (v1.16)

Originally captured 2026-04-25 during Phase 35 HUMAN-UAT; re-deferred from cancelled v1.9 Phase 41. Promoted to v1.16 Phase 66 (TILE-02), shipped 2026-05-06 via PR [#150](https://github.com/micahbank2/room-cad-renderer/pull/150). Investigation revealed Phase 42 had already shipped the data fields + actions + renderers; Phase 66 was just the missing UI tier (two `<input>` fields). Issue [#105](https://github.com/micahbank2/room-cad-renderer/issues/105) auto-closed.

### Phase 999.4: Saved camera EXPLODE-mode offset correction (BACKLOG — v1.11 carry-over)

**Goal:** When a user double-clicks a tree node with a saved camera while in EXPLODE display mode, the focus tween should target the room's CURRENT world position (post-offset), not the saved absolute coordinates from when the camera was captured in NORMAL/SOLO.

**Requirements:** AUDIT-01 (filed 2026-04-26 during v1.11 milestone audit). Single integration gap between CAM-04 (Phase 48) and DISPLAY-01 (Phase 47).
**GH Issue:** [#127](https://github.com/micahbank2/room-cad-renderer/issues/127)
**Plans:** 0 plans

**Trigger conditions (all 3 required):**
1. User saves a camera while in NORMAL or SOLO (room rendered at offsetX = 0)
2. User switches to EXPLODE display mode (`cumulativeX += max(width, length) × 1.25` per room)
3. User double-clicks the saved-camera node in the rooms tree

**Mitigation paths:**
- Apply `roomOffsets[roomId]` from `computeRoomOffsets()` to savedCameraPos/Target inside `focusOnSavedCamera` before dispatching to `requestCameraTarget`
- Or: store saved cameras in room-relative coordinates and add the offset at focus-dispatch time

**Why deferred:** Narrow trigger (cross-mode use of saved camera). Most users save + use bookmarks within a single display mode. EXPLODE is an inspection mode, not a navigation mode. Re-deferred again at v1.16 scoping (2026-05-06). Revisit if real-use feedback surfaces the bug.

**Discovered:** 2026-04-26 during v1.11 milestone audit (gsd-integration-checker).

### Phase 999.5: DEBT-07 vitest cascade observability (POTENTIAL — v1.16 carry-over)

**Goal:** If the 10-failure transient observed once during the v1.16 audit re-run (DEBT-06 cascade pattern) reappears consistently in v1.17 PR audits, file as a new requirement and surface the underlying flake.

**Status:** Not yet a confirmed bug — observed once, did not reproduce in three deterministic local runs. Monitor in v1.17 PR audits.

**Discovered:** 2026-05-06 during v1.16 milestone audit. Captured in v1.16-REQUIREMENTS.md "Out of Scope" section.
