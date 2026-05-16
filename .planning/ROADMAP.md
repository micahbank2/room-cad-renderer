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
- ✅ **v1.17 Library + Material Engine** — Phases 67–68 (partial-shipped 2026-05-07; Phases 69 MAT-LINK-01 + 70 LIB-REBUILD-01 deferred to v1.19)
- ✅ **v1.18 Pascal Visual Parity** — Phases 71–76 (shipped 2026-05-08) — chrome-only rewrite to emulate pascalorg/editor
- 🚧 **v1.19 Material Linking & Library Rebuild** — Phases 69, 70, 77 (in progress) — finish slots on placed products + 3-tab library rebuild
- ✅ **v1.20 Surface Depth & Architectural Expansion** — Phases 78, 79, 80, 86 (shipped 2026-05-15) — PBR maps + window presets + parametric controls + columns all complete; v1.20 milestone closed by Phase 86 Plan 03
- ✅ **v1.21 Sidebar IA & Contextual Surfaces** — Phases 81–84 (shipped 2026-05-14) — rebuilt left + right panels and floating toolbar with Figma/Miro-style contextual visibility; 8/8 IA requirements complete (IA-02 through IA-08); surfaced from Phase 79 Jessica UAT feedback — see [milestones/v1.21-REQUIREMENTS.md](milestones/v1.21-REQUIREMENTS.md)

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

## v1.18 Pascal Visual Parity (active)

**Goal:** Make Room CAD Renderer look extremely similar to Pascal Editor. Adopt Pascal's design tokens (oklch shadcn/ui v4 palette), font stack (Barlow + Geist Sans + Geist Mono), 10px squircle radius, layout patterns (contextual right sidebar, floating two-row action menu), and light + dark dual-mode. Every existing behavior, store, snapshot v6, hotkey, and test driver continues to work — chrome-only rewrite. Audit reference: `.planning/competitive/pascal-visual-audit.md`.

**Sequencing rationale (locked):** Tokens → Primitives → Sidebar → Toolbar → Properties → Final. Phase 71 establishes the new design language at the variable level (every Tailwind class downstream picks up the new look). Phase 72 builds the primitive library so subsequent phases assemble UIs from one consistent vocabulary. Phase 73 reshapes the rooms tree + makes the right sidebar contextual — biggest layout change before the toolbar rework. Phase 74 swaps the top-left toolbar for the floating action menu — single most "Pascal-feeling" leap. Phase 75 polishes the properties + library surfaces with the new vocabulary. Phase 76 finishes with light-mode marketing surfaces + carry-over test cleanup + audit.

**Forward signal:** Roadmap will be filled in by gsd-roadmapper. 6 phases, ~5–7 days. Functionality regression-tested by existing 800+ test suite. Lucide-icon fallback first for the action menu's chunky top row; commission isometric PNG icons later if look is flat.

### Phases

- [x] **Phase 71: Token Foundation (TOKEN-FOUNDATION)** — Replace Obsidian palette with Pascal's oklch tokens; Barlow + Geist fonts; 10px squircle radius; light + dark dual-mode (completed 2026-05-07)
- [x] **Phase 72: Primitives Shelf (PRIMITIVES-SHELF)** — `cva`-driven primitives (Button / Tab / PanelSection / SegmentedControl / Switch / Slider / Tooltip / Dialog / Input / Popover) with `motion/react` animations (completed 2026-05-07)
- [x] **Phase 73: Sidebar Restyle (SIDEBAR-RESTYLE)** — Pascal spine-and-branches rooms tree; right sidebar becomes contextual (mounts only when something is selected) (completed 2026-05-08)
- [x] **Phase 74: Toolbar Rework (TOOLBAR-REWORK)** — Floating two-row action menu at canvas-bottom-center replaces the top-left toolbar entirely (completed 2026-05-08)
- [ ] **Phase 75: Properties + Library Restyle (PROPERTIES-LIBRARY-RESTYLE)** — MaterialPicker / ProductLibrary / RoomSettings / PropertiesPanel / Add+UploadModals adopt new tokens, primitives, and contextual mount pattern
- [x] **Phase 76: Modals + Welcome + Final (MODALS-WELCOME-FINAL)** — Modal/Dialog primitives finalized; WelcomeScreen + ProjectManager adopt light mode; carry-over v1.17 test cleanup; final audit pass (completed 2026-05-08)

### Phase Details

#### Phase 71: Token Foundation (TOKEN-FOUNDATION)

**Goal:** Jessica opens the app and sees a different application — neutral grays instead of dark blue, soft 10px corners instead of sharp 2px, Barlow / Geist Sans body text instead of monospace. Toggling theme moves cleanly between light and dark surfaces. Every existing screen still works because the change is purely at the CSS-token level.
**Depends on:** Phase 33 (Tailwind v4 `@theme {}` baseline + `useReducedMotion` D-39 — preserved); Phase 47 (display modes), Phase 48 (saved cameras), Phase 53 (context menus), Phase 67 (material library), Phase 68 (unified MaterialPicker) — all consume the new tokens at render time, no API changes
**Requirements:** TOKEN-FOUNDATION (no GH issue — internal v1.18 milestone requirement)
**Success Criteria** (what must be TRUE):
  1. Open the app → entire UI renders in Pascal's neutral grays; zero `#7c5bf0` purple visible anywhere in the chrome (purple reserved for non-existent charts)
  2. Every button, card, input, panel section shows ~10px rounded corners (Safari/WebKit also gets the squircle treatment via `corner-shape: squircle` progressive enhancement)
  3. Toggle theme via `useTheme()` → smooth swap to light mode; every surface adapts cleanly with no `obsidian-*` artifacts
  4. UI text uses Barlow (display) and Geist Sans (body) plus Geist Mono only where monospaced data is appropriate; IBM Plex Mono is gone from the chrome
  5. Existing 800+ test suite passes after the token swap, plus the 4 v1.17 carry-over tests get their contracts updated (snapshot v6 assertion, removed wallpaper "MY TEXTURES" tab, WallMesh cutaway ghost-spread audit, contextMenuActionCounts pollution)
**Plans:** 7/7 plans complete
**UI hint:** yes

#### Phase 72: Primitives Shelf (PRIMITIVES-SHELF)

**Goal:** Jessica clicks anywhere in the app and feels the new vocabulary — every button looks and animates the same; dialogs share one blur + spring entrance; tabs share one active-pill treatment; panel sections share one spring expand/collapse with chevron rotation. The primitives become the only way to author chrome from this phase forward.
**Depends on:** Phase 71 (tokens must exist before primitives consume them); Phase 33 (`useReducedMotion()` hook reused for animation guards per D-39); Phase 33 `CollapsibleSection` (replaced by new PanelSection primitive); Phase 33 `LibraryCard` / `CategoryTabs` (continue working but slated for incremental migration in Phase 75)
**Requirements:** PRIMITIVES-SHELF (no GH issue — internal v1.18 milestone requirement)
**Success Criteria** (what must be TRUE):
  1. Click any button across the app → consistent variant family (default / destructive / outline / secondary / ghost / link) and size scale (default / sm / lg / icon / icon-sm / icon-lg) — no inline-styled one-offs in the migrated sites
  2. Open any dialog → unified backdrop blur + spring entry animation (no abrupt mount); reduced-motion users get instant snap
  3. Click a Tab → muted-background pill active state (no neon glow, no hard accent ring)
  4. Expand any panel section → spring-animated height transition with chevron rotation; collapsed/expanded state persists per section
  5. ~30 existing button sites + ~5 tab sites + ~5 panel sites migrated to the new primitives in this phase; remaining sites continue to work with their inline styles until touched in Phases 73-76
**Plans:** 3/9 plans executed
- [x] 72-01-PLAN.md — Install deps + cn.ts + motion.ts + barrel skeleton
- [x] 72-02-PLAN.md — Button primitive + tests
- [x] 72-03-PLAN.md — PanelSection primitive + test driver + tests
- [x] 72-04-PLAN.md — Dialog primitive + tests
- [x] 72-05-PLAN.md — Remaining primitives (Tabs, SegmentedControl, Switch, Slider, Tooltip, Input, Popover)
- [ ] 72-06-PLAN.md — Toolbar button migration (~20 sites)
- [x] 72-07-PLAN.md — PropertiesPanel CollapsibleSection migration (11 sites) + cleanup
**UI hint:** yes

#### Phase 73: Sidebar Restyle (SIDEBAR-RESTYLE)

**Goal:** Jessica looks at the left sidebar and sees Pascal's tree — a faint vertical spine line with horizontal branch lines connecting room nodes. When nothing is selected, the right side of the editor is empty canvas (more room to work). When she clicks a wall, product, ceiling, or custom-element, a properties panel slides in from the right with spring animation showing only the relevant controls.
**Depends on:** Phase 72 (primitives — PanelSection drives properties section accordions); Phase 46 (rooms tree data + click-to-focus + per-node visibility cascade); Phase 47 (display modes consume sidebar real estate); Phase 48 (saved-camera Save/Clear UI lives in the contextual right panel); Phase 53 (context-menu exit closes the right panel cleanly); Phase 68 (MaterialPicker mounted within PropertiesPanel must un-mount cleanly with the sidebar)
**Requirements:** SIDEBAR-RESTYLE (no GH issue — internal v1.18 milestone requirement)
**Success Criteria** (what must be TRUE):
  1. Open the app → left sidebar shows the rooms tree with a 1px gray vertical spine at left:21px and horizontal branch lines at 21px-32px (matches Pascal's `bg-border/50` pattern)
  2. Hover any tree row → soft `bg-accent/30` highlight; active rows render with `bg-accent`; double-click camera-focus (Phase 46) and per-node eye-icon visibility (Phase 47) preserved
  3. Click empty canvas → right sidebar disappears with spring exit animation; canvas fills the freed space
  4. Click a wall / product / ceiling / custom-element / opening / stair → right sidebar slides in with spring entry showing the relevant PropertiesPanel sections
  5. Re-click empty canvas → sidebar collapses again with no driver registration loss (Phase 68 lesson: drivers live in `src/test-utils/*Drivers.ts`, survive component un-mount cleanly)
**Plans:** 2/2 plans complete
- [x] 73-01-PLAN.md — Tree spine restyle (TreeRow.tsx) + Sidebar CollapsibleSection→PanelSection
- [x] 73-02-PLAN.md — Contextual right panel with AnimatePresence spring slide (App.tsx)
**UI hint:** yes

#### Phase 74: Toolbar Rework — Floating Action Menu (TOOLBAR-REWORK)

**Goal:** Jessica's biggest "Pascal-feeling" moment — the top-left vertical toolbar is gone. In its place, a floating glass pill sits at the bottom-center of the canvas with two rows: top row of chunky building-block icons (Wall / Floor / Ceiling / Door / Window / Wall Art / Wainscoting / Crown / Stair / Custom Element) and bottom row of flat manipulation tools (Select / Pan / Zoom / Undo / Redo / Grid / Display Mode / View Mode). Existing keyboard shortcuts and tool-state behavior unchanged.
**Depends on:** Phase 72 (primitives — Button + SegmentedControl + Tooltip drive the menu); Phase 71 (glass-pill tokens — `bg-background/90` + `backdrop-blur-md`); Phase 33 D-33 icon policy (drops Material Symbols entirely — Toolbar.tsx + Toolbar.WallCutoutsDropdown.tsx must lose their `material-symbols-outlined` imports); Phase 47 (display modes folded into the bottom row as a SegmentedControl); existing tool activation flows in `src/canvas/tools/` and keyboard shortcuts in `src/lib/shortcuts.ts` (Phase 52) untouched
**Requirements:** TOOLBAR-REWORK (no GH issue — internal v1.18 milestone requirement)
**Success Criteria** (what must be TRUE):
  1. Open the app → no left vertical toolbar; floating glass pill at canvas-bottom-center holds the two rows of tools (`fixed bottom-6 left-1/2 -translate-x-1/2 rounded-2xl border bg-background/90 shadow-2xl backdrop-blur-md`)
  2. Top row shows chunky lucide-react icons at 1.5x size (no Material Symbols anywhere in the codebase); bottom row shows flat lucide icons at default size; hover any icon → tooltip pops with the tool name + shortcut
  3. Click a building-block icon → tool activates and canvas cursor switches; existing keyboard shortcuts (V / W / D / N / etc. from `src/lib/shortcuts.ts`) all still work
  4. Active tool gets a darker fill ring; switching to a different tool runs the existing tool-cleanup pattern (`toolCleanupRef` from CLAUDE.md tool architecture) with zero leaks
  5. Display Mode (NORMAL/SOLO/EXPLODE) and View Mode (2D/3D/Split) render as SegmentedControl primitive instances in the bottom row; Save/Open project UI relocates to a top-bar or floating top-right element (decided during plan-phase research)
**Plans:** 3/3 plans complete
- [x] 74-01-PLAN.md — FloatingToolbar glass pill (two-row tool palette)
- [x] 74-02-PLAN.md — TopBar fixed header (project name, save status, camera presets, utilities)
- [x] 74-03-PLAN.md — App.tsx swap + Toolbar.tsx deletion
**UI hint:** yes

#### Phase 75: Properties + Library Restyle (PROPERTIES-LIBRARY-RESTYLE)

**Goal:** Jessica opens the MaterialPicker, ProductLibrary, RoomSettings, PropertiesPanel, and any upload modal — every surface uses the new primitives, the new spring animations, and the new typography. The familiar shapes are still there (material grid, product cards, room-config inputs) but everything reads as one coherent visual language.
**Depends on:** Phase 72 (primitives — Dialog / PanelSection / Tab / Input drive every surface in scope); Phase 73 (PropertiesPanel must already mount/un-mount contextually before its internals are restyled); Phase 67 (Material upload form preserves validation + dedup); Phase 68 (unified MaterialPicker grid responsiveness preserved; `applySurfaceMaterial` + `*NoHistory` single-undo apply pattern preserved); Phase 58 (GLTF Box badge top-LEFT slot continues to render — restyle it but keep the slot wiring); Phase 33 `CategoryTabs` (replaced by new Tab primitive)
**Requirements:** PROPERTIES-LIBRARY-RESTYLE (no GH issue — internal v1.18 milestone requirement)
**Success Criteria** (what must be TRUE):
  1. Click any upload button → Pascal-style Dialog primitive (rounded, blurred backdrop, spring entry with reduced-motion guard)
  2. Open the MaterialPicker → grid of material thumbnails on the new neutral background; hover shows soft accent fill; click applies the material (single Ctrl+Z still reverts per Phase 68 contract)
  3. Open the ProductLibrary → cards use Pascal's pattern with Barlow names + Geist Sans metadata; GLTF Box badge top-LEFT survives the restyle
  4. RoomSettings collapsible sections use the new PanelSection primitive (spring expand/collapse, chevron rotation); inputs use the new Input primitive
  5. Custom CSS classes `glass-panel` / `accent-glow` / `cad-grid-bg` / `ghost-border` removed from MaterialPicker / ProductLibrary / RoomSettings / PropertiesPanel / WallSurfacePanel / AddProductModal / UploadTextureModal / UploadMaterialModal / MyTexturesList / LibraryCard
**Plans:** 3 plans
- [ ] 75-01-PLAN.md — AddProductModal Dialog wrapping + RoomSettings Input + MaterialPicker tokens
- [ ] 75-02-PLAN.md — ProductLibrary Tabs migration + WallSurfacePanel Switch/Input
- [ ] 75-03-PLAN.md — PropertiesPanel + sub-components Input migration + full-phase grep audit
**UI hint:** yes

#### Phase 76: Modals + WelcomeScreen + Final (MODALS-WELCOME-FINAL)

**Goal:** Jessica opens the app on a fresh device and lands on a marketing-feeling light-mode WelcomeScreen — Barlow heading, neutral cream background, dark body text. Click "Continue to editor" → smooth transition to the dark editor. Open ProjectManager → also light mode. Help modal, delete confirmation, error toasts all use the unified primitives. Final QA passes show zero `obsidian-*` references anywhere in `src/`.
**Depends on:** Phase 71 (light + dark dual-mode tokens must be in place); Phase 72 (Dialog primitive drives every modal); Phase 75 (editor surfaces fully restyled — light-mode flip happens against a finished dark mode); Phase 33 `InlineEditableText` (preserved); Phase 52 keyboard shortcuts overlay (HelpModal restyled); existing test driver registration pattern (`src/test-utils/*Drivers.ts` per Phase 68 lesson)
**Requirements:** MODALS-WELCOME-FINAL (no GH issue — internal v1.18 milestone requirement)
**Success Criteria** (what must be TRUE):
  1. Fresh-device load → WelcomeScreen renders in light mode (`oklch(0.998 0 0)` background, dark Barlow heading, dark body); clicking "Continue to editor" smoothly transitions to dark editor (theme class swap on `<html>`)
  2. Open ProjectManager → also renders in light mode and feels consistent with the WelcomeScreen
  3. Open HelpModal, ConfirmDialog, ErrorBoundary fallback → all use the unified Dialog primitive; existing keyboard-shortcut overlay (Phase 52) preserves its 26 shortcut entries
  4. Final grep audit returns zero matches for `obsidian-` / `text-text-` / `accent-glow` / `cad-grid-bg` / `glass-panel` / `material-symbols-outlined` across `src/`
  5. The 4 v1.17 carry-over tests verified passing on the new chrome (snapshot v6 assertion, removed wallpaper "MY TEXTURES" tab, WallMesh cutaway ghost-spread audit, contextMenuActionCounts pollution); existing 800+ test suite still green
**Plans:** 3/3 plans complete
- [ ] 72-01-PLAN.md — Install deps + cn.ts + motion.ts + barrel skeleton
- [ ] 72-02-PLAN.md — Button primitive + tests
- [ ] 72-03-PLAN.md — PanelSection primitive + test driver + tests
- [ ] 72-04-PLAN.md — Dialog primitive + tests
- [ ] 72-05-PLAN.md — Remaining primitives (Tabs, SegmentedControl, Switch, Slider, Tooltip, Input, Popover)
- [ ] 72-06-PLAN.md — Toolbar button migration (~20 sites)
- [ ] 72-07-PLAN.md — PropertiesPanel CollapsibleSection migration (11 sites) + cleanup
**UI hint:** yes

---

## v1.17 Library + Material Engine (closed early — partial-shipped)

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

#### Phase 69: Product–Material Linking (MAT-LINK-01) — v1.19 ACTIVE

> **Status: Active in v1.19.** Was deferred from v1.17 so the finish-slot UI could ship in v1.18 Pascal Visual Parity chrome. v1.18 complete — this phase is now the first target of v1.19.

**Goal:** Jessica swaps the finish material on a placed product (couch fabric, faucet finish, cabinet color) without re-placing or re-uploading the object. Products carry an optional finish slot referencing a Material from the library.
**Depends on:** Phase 67 (Material entity), Phase 68 (Material picker UI), Phase 31 (placement-instance state per D-02), Phase 56/58 (GLTF PBR material slot handling), v1.18 primitives (Phases 71-76) for the finish picker chrome
**Requirements:** [MAT-LINK-01](https://github.com/micahbank2/room-cad-renderer/issues/26)
**Success Criteria** (what must be TRUE):
  1. User selects a placed product → PropertiesPanel shows a "Finish" picker → picks a Material from the library
  2. Product's 3D rendering updates to use that Material's color + roughness; placement, position, scale, and rotation are preserved
  3. Single Ctrl+Z reverts the finish change
  4. Finish persists across save/load (`PlacedProduct.finishMaterialId` round-trips through the snapshot)
  5. Products placed without an explicit finish continue to render with the catalog default (today's behavior unchanged)
**Plans:** TBD (v1.19)
**UI hint:** yes

#### Phase 70: Library Rebuild (LIB-REBUILD-01) — v1.19 ACTIVE

> **Status: Active in v1.19.** Was deferred from v1.17 so the library-rebuild UI could ship in v1.18 Pascal Visual Parity chrome. v1.18 complete — this phase follows Phase 69 in v1.19.

**Goal:** Sidebar library reorganizes around a top-level Materials / Assemblies / Products toggle. Each tab has its own category sub-tabs (Materials: Flooring, Wall coverings, Countertops, Paint; Products: Furniture, Plumbing fixtures, Appliances, Lighting, Curtains & blinds, Decor; Assemblies: empty placeholder).
**Depends on:** Phase 67 (Materials live in their own store), Phase 33 (CategoryTabs precedent — superseded by v1.18 Tab primitive), Phase 14 (custom-element library precedent), v1.18 primitives (Phases 71-76) for the new tab + library chrome
**Requirements:** [LIB-REBUILD-01](https://github.com/micahbank2/room-cad-renderer/issues/24)
**Success Criteria** (what must be TRUE):
  1. Sidebar library shows a 3-way Materials / Assemblies / Products toggle at the top; switching tabs swaps the visible content cleanly
  2. Materials tab shows category sub-tabs (Flooring / Wall coverings / Countertops / Paint) and the Phase 67 materials filtered by category
  3. Products tab shows category sub-tabs (Furniture / Plumbing fixtures / Appliances / Lighting / Curtains & blinds / Decor); existing products migrate to the right category (or "Uncategorized" if metadata is missing)
  4. Assemblies tab shows a clear empty-state placeholder ("Coming soon — pre-built combos like kitchen cabinetry"), not broken UI
  5. Upload buttons are context-aware: in Materials tab → "Upload Material"; in Products tab → "Add Product"; existing upload + place flows continue to work end-to-end
**Plans:** TBD (v1.19)
**UI hint:** yes

#### Phase 77: Test Suite Cleanup (TEST-CLEANUP-01) — v1.19 ACTIVE

**Goal:** Fix v1.18 carry-over test failures that block a clean CI baseline for v1.19 execution.
**Depends on:** v1.18 Phases 72 (Switch primitive), 73/74 (Tooltip/FloatingToolbar)
**Requirements:** [TEST-CLEANUP-01](https://github.com/micahbank2/room-cad-renderer/issues/163), [TEST-CLEANUP-02](https://github.com/micahbank2/room-cad-renderer/issues/164)
**Success Criteria** (what must be TRUE):
  1. All 5 Phase-31-era test files that render PropertiesPanel or FloatingToolbar wrap their renders in `<TooltipProvider>` — the 34-test wall/snap failures from GH #163 are gone
  2. AddProductModal tests query `getByRole("switch")` instead of `getByRole("checkbox")` — the Switch migration from v1.18 Phase 76 no longer breaks these 3 tests (GH #164)
  3. `npm run test` passes with zero failures in the migrated test files
**Plans:** 1/1 plans complete
**UI hint:** no

---

## v1.20 — Surface Depth & Architectural Expansion ✅

**Goal:** Deepen material realism with PBR maps (AO + displacement), speed up window placement with standard-size presets, enable precise numeric sizing of placed products, and add columns/pillars as a new architectural element type.

**Sequencing rationale:** PBR (tightly coupled to existing Material pipeline — all 4 requirements ship together) → Window presets (small, isolated Opening UI change) → Parametric controls (zero schema changes, pure PropertiesPanel UI over Phase 31 fields) → Columns (largest scope — new entity type mirroring Phase 60 Stair pattern, snapshot bump expected).

### Phases

- [x] **Phase 78: PBR Maps (PBR-MAPS-01)** — AO + displacement map upload on Materials; 3D rendering applies all maps; Material card shows map-presence indicators (completed 2026-05-13)
- [x] **Phase 79: Window Presets (WIN-PRESETS-01)** — Preset size picker when placing windows; PropertiesPanel shows selected preset post-placement (completed 2026-05-13)
- [ ] **Phase 80: Parametric Product Controls (PARAM-01)** — Type exact width/depth/position for placed products in PropertiesPanel; single-undo per edit
- [x] **Phase 81: Columns & Pillars (COL-01)** — New Column entity; round/rectangular cross-section; renders in 2D + 3D; selectable/movable/deletable (completed 2026-05-13)

### Phase Details

#### Phase 78: PBR Maps (PBR-MAPS-01) — v1.20 ACTIVE

**Goal:** Jessica uploads AO and displacement maps on a Material and sees dramatically richer, more tactile surfaces in 3D — grout lines pop, fabric has depth, stone looks real.
**Depends on:** Phase 67 (Material entity with existing map slots), Phase 32 (user-texture IDB pipeline — SHA-256 dedup, downscale, upload)
**Requirements:** PBR-01, PBR-02, PBR-03, PBR-04
**Success Criteria** (what must be TRUE):
  1. UploadMaterialModal / edit form has AO map and displacement map upload slots alongside the existing roughness/reflection slots
  2. Uploaded AO map appears on `material.aoMapId`; displacement map on `material.displacementMapId` — both persist across reload
  3. 3D mesh surfaces that use the material render with `aoMap` and `displacementMap` props — surfaces look noticeably more detailed
  4. Material card shows small icons/dots indicating which of the 4 maps (color, roughness, AO, displacement) are loaded
**Plans:** 4/4 plans complete
**UI hint:** yes

#### Phase 79: Window Presets (WIN-PRESETS-01) — v1.20 ACTIVE

**Goal:** Placing a window is a single pick from a size list, not a manual dimension-typing exercise every time.
**Depends on:** Phase 15 (Opening entity with widthFt/heightFt fields), Phase 30/31 (window tool + PropertiesPanel)
**Requirements:** WIN-01, WIN-02
**Success Criteria** (what must be TRUE):
  1. Window tool shows a preset picker (2×3 ft, 3×4 ft, 4×5 ft, custom) before or during placement
  2. Selecting a preset auto-fills widthFt/heightFt on the Opening — no manual typing required
  3. After placement, PropertiesPanel shows the active preset label and allows switching to another preset or "custom"
  4. Existing manual window placement (typing custom dimensions) continues to work unchanged
**Plans:** 3/3 plans complete
- [x] 79-01-PLAN.md — Wave 0 RED tests pin WIN-PRESETS contract (catalog, bridge, e2e)
- [x] 79-02-PLAN.md — Catalog module + windowTool bridge (data + tool layer)
- [x] 79-03-PLAN.md — WindowPresetSwitcher + PropertiesPanel preset row + App mount
**UI hint:** yes

#### Phase 80: Parametric Product Controls (PARAM-01) — v1.20 ACTIVE

**Goal:** Jessica can type "3.5 ft wide" for a sofa and it snaps to exactly that width — no guessing from drag handles.
**Depends on:** Phase 31 (PlacedProduct.widthFtOverride / depthFtOverride fields + applyProductOverride actions), v1.18 primitives (Input component)
**Requirements:** PARAM-01, PARAM-02, PARAM-03
**Success Criteria** (what must be TRUE):
  1. PropertiesPanel for a selected placed product shows numeric inputs for Width (ft), Depth (ft), X position (ft), Y position (ft)
  2. Typing a value and pressing Enter/blur updates the product immediately — same as drag-resizing but with an exact number
  3. Each field edit is a single undo entry (Ctrl+Z)
  4. Values reflect current state: if product was drag-resized, the input shows the override value; if untouched, shows the catalog default
**Plans:** TBD (v1.20)
**UI hint:** yes

#### Phase 86: Columns & Pillars (COL-01) — v1.20 COMPLETE (2026-05-15)

**Goal:** Jessica places a structural column in a room, sees it in both 2D floor plan and 3D walk-through, and can resize/reposition it like any other element.
**Depends on:** Phase 60 (Stair entity pattern — new top-level entity, store actions, 2D + 3D rendering), Phase 67/68 (material finish slot pattern from PlacedProduct), snapshot migration pattern (v7→v8 expected)
**Requirements:** COL-01, COL-02, COL-03
**Success Criteria** (what must be TRUE):
  1. Column tool in the toolbar lets Jessica place a round or rectangular column; default size matches room ceiling height; configurable diameter/width
  2. 2D canvas shows the column footprint (circle or rectangle outline) at the correct position and scale
  3. 3D viewport shows the column as an extruded pillar from floor to ceiling height
  4. Column is selectable via the select tool; PropertiesPanel shows its cross-section type, diameter/width, height, and material finish; Delete key removes it
**Plans:** 3/3 plans complete
**UI hint:** yes

## Polish Phases

Standalone phases that ship outside any v1.xx milestone — small, focused, one-off improvements.

- 🚧 **Phase 87 — Theme Toggle + Settings Popover** (in progress) — branch `gsd/phase-87-theme-toggle`. Gear button in TopBar → popover with Light / Dark / System segmented control wired to existing `useTheme()` hook. Removes the three `.light` force-wrappers from WelcomeScreen / ProjectManager / HelpPage shipped in Phase 76. See [.planning/phases/87-theme-toggle-settings/87-CONTEXT.md](phases/87-theme-toggle-settings/87-CONTEXT.md).
- 🚧 **Phase 88 — Light Mode + Visual Density Polish** (in progress) — branch `gsd/phase-88-light-mode-polish`. Closes 4 GH issues surfaced from Phase 87 UAT: #194 FloatingToolbar missing in 3D (mount hoist), #195 2D canvas ignores light mode (new `canvasTheme.ts` bridge + thread theme through every render module), #196 light-mode borders invisible (`--border`/`--input` bumped to oklch(0.85)), #197 chrome typography too small (one-step bump 9→11, 10→12, 11→13). 2 plans across 2 waves. See [.planning/phases/88-light-mode-polish/88-CONTEXT.md](phases/88-light-mode-polish/88-CONTEXT.md).
  Plans:
  - [x] 88-01-PLAN.md — Canvas theme bridge + FloatingToolbar mount + border contrast (POLISH-01/02/03)
  - [x] 88-02-PLAN.md — Typography density sweep (POLISH-04)
- ✅ **Phase 89 — Product/Custom-Element Image Polish (2D Canvas)** — branch `gsd/phase-89-product-images-2d`. Polish pass on the existing 2D image-rendering path: switch product images from Stretch to Cover fit with `clipPath`, add image rendering to custom elements (`CustomElement.imageUrl` exists but was unrendered), add semi-transparent label backdrops for readability over busy photos, fix the stale `PRODUCT_STROKE` dim-label constant, and wire cache invalidation on `imageUrl` update. 1 plan, 4 atomic tasks. See [.planning/phases/89-product-images-2d/89-CONTEXT.md](phases/89-product-images-2d/89-CONTEXT.md).
  Plans:
  - [x] 89-01-PLAN.md — Cover-fit + clipPath, label backdrops, custom-element images, cache invalidation
- ✅ **Phase 90 — Canvas Polish** — branch `gsd/phase-90-canvas-polish`. Closes 3 GH issues from Phase 89 UAT: #201 theme backdrop flip (MutationObserver on `<html>.class` drives canvas-bg flip — useTheme local state was insufficient), #202 floating toolbar overlap (h-[calc(100%-13rem)] shrinks canvas wrapper by 208px), #203 left-click pan on empty canvas with Select tool (closure-scoped panStart in selectTool no-hit branch + _panActive module flag mirroring _dragActive). 2 plans across 2 waves. PR closes #201 #202 #203. See [.planning/phases/90-canvas-polish/90-CONTEXT.md](phases/90-canvas-polish/90-CONTEXT.md).
  Plans:
  - [x] 90-01-PLAN.md — Theme backdrop flip + toolbar viewport reservation (#201/#202)
  - [x] 90-02-PLAN.md — Left-click pan on empty canvas + Fit-to-screen reset verification (#203/D-06)

- 🚧 **Phase 91 — Object-to-Object Alignment Guides + Collision Detection** (in progress) — branch `gsd/phase-91-alignment-collision`. Extends Phase 30 smart-snap engine with object-center axis targets (closes Phase 85 D-02 deferral) and adds columns + stairs to the snap scene. Reverses the D-08a stair-precedent skip at `selectTool.ts:1500` so columns participate as snap source. Adds silent-refuse AABB collision so dragging a chair into another chair is rejected (Phase 25 single-undo invariant preserved). 2 plans across 2 waves. See [.planning/phases/91-alignment-collision/91-CONTEXT.md](phases/91-alignment-collision/91-CONTEXT.md).
  Plans:
  - [x] 91-01-PLAN.md — Object-center snap targets + columns/stairs in scene + column smart-snap wiring (ALIGN-91-01/02/03)
  - [ ] 91-02-PLAN.md — Object-vs-object AABB collision; silent refuse (COL-91-01)

---

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
| 69. Product–Material Linking | 1/1 | Complete   | 2026-05-08 |
| 70. Library Rebuild | 1/1 | Complete   | 2026-05-08 |
| 71. Token Foundation | 7/7 | Complete   | 2026-05-07 |
| 72. Primitives Shelf | 3/9 | Complete   | 2026-05-08 |
| 73. Sidebar Restyle | 2/2 | Complete   | 2026-05-08 |
| 74. Toolbar Rework | 3/3 | Complete   | 2026-05-08 |
| 75. Properties + Library Restyle | 3/3 | Complete   | 2026-05-08 |
| 76. Modals + Welcome + Final | 3/3 | Complete    | 2026-05-08 |
| 77. Test Suite Cleanup | 1/1 | Complete   | 2026-05-08 |
| 78. PBR Maps | 1/4 | Complete    | 2026-05-13 |
| 79. Window Presets | 3/3 | Complete    | 2026-05-13 |
| 80. Parametric Product Controls | n/a | Renumbered → Phase 85   | — |
| 81. Columns & Pillars | 3/3 | Complete    | 2026-05-13 |
| 82. Inspector Rebuild (IA-04 + IA-05) | 3/3 | Complete    | 2026-05-14 |
| 83. Floating Toolbar Redesign (IA-06 + IA-07) | 2/2 | Complete    | 2026-05-15 |
| 84. Contextual Sidebar Visibility (IA-08) | 1/1 | Complete    | 2026-05-15 |
| 85. Parametric Product Controls (PARAM-01) | 3/3 | Complete    | 2026-05-15 |
| 86. Columns & Pillars (COL-01) | 3/3 | Complete    | 2026-05-15 |
| 87. Theme Toggle + Settings Popover (polish) | 1/1 | Complete    | 2026-05-15 |

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
