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
- 🚧 **v1.15 Architectural Toolbar Expansion** — Phases 59–62 (in progress)

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

3 phases, 4 plans, 3/3 shipped requirements (POLISH-01, FEEDBACK-01, BUG-01). VERIFICATION.md backfill closed v1.8 audit AUDIT-01 carry-over (3 retroactive verification reports for Phases 35/36/37). Real-use feedback signal pivoted from in-person hybrid to async 5-question questionnaire per CONTEXT D-08 due to calendar constraints — Jessica reported zero friction and zero new wishes beyond the GH backlog; all 3 Phase 35 HUMAN-UAT items confirmed; 8 GH issues curated as v2.0 scope seeds. **Mid-milestone re-scope:** Phases 40 (CEIL-01) and 41 (TILE-01) CANCELLED after Phase 39 contradicted their hypotheses ("ceilings went fine", "texture sizing feels right") — re-deferred to Phase 999.1 and Phase 999.3 backlogs. Narrower BUG-01 (Phase 42) shipped per-surface scaleFt isolation closing GH #96 — Ceiling.scaleFt added (mirrors Wallpaper.scaleFt + FloorMaterial.scaleFt convention), CeilingMesh resolver ceiling.scaleFt ?? entry?.tileSizeFt ?? 2, apply-time write in CeilingPaintSection, 4 new tests guard the invariant. 22 commits, +2,840/-40 LOC, single-day milestone. Audit passed_with_carry_over (AUDIT-01 recurring: v1.9 phases also lack VERIFICATION.md). The mid-milestone re-scope is itself the milestone's most valuable artifact — validated the "feedback-first" sequencing pattern by acting on its own hedge. See [milestones/v1.9-ROADMAP.md](milestones/v1.9-ROADMAP.md).

</details>

<details>
<summary>✅ v1.10 Evidence-Driven UX Polish (Phases 43–44) — SHIPPED 2026-04-25</summary>

2 phases, 2 plans, 5/5 shipped requirements (UX-01/02/03, DEFAULT-01, A11Y-01). Phase 43 UI polish bundle: 4 atomic commits closing #100 (templates ship with default ceiling at room.wallHeight), #98 (`--color-text-ghost` #484554 → #888494, ~5.15:1 WCAG AA, fixes 124+ usages globally), #101 (SAVED/SAVING/SAVE_FAILED badges enlarged text-[10px] → text-base 13px), #99 (ProspectSheet empty-state copy when nothing selected). Phase 44 reduced-motion sweep: 2 honest guards on wall-side camera tween + SAVING spinner; snap guides verified to need no guard (render at static GUIDE_OPACITY=0.6, no animation existed despite GH #76 issue body claim). Pattern validated: "evidence-driven prioritization" — 5 evidence-driven items shipped, 6 speculative items deferred (Pascal competitor-set committed for v1.11; #97/#81 deferred until evidence). 19 commits, +1,180/-42 LOC, single-day milestone. **AUDIT-01 systemic resolution:** three milestones of recurring "phases ship with SUMMARY-only" pattern (v1.8/v1.9/v1.10) resolved during v1.10 audit by editing `~/.claude/get-shit-done/workflows/audit-milestone.md` to formalize substitute-evidence policy. SUMMARY.md is now canonical evidence; VERIFICATION.md optional. Audit `passed_with_carry_over`. See [milestones/v1.10-ROADMAP.md](milestones/v1.10-ROADMAP.md).

</details>

---

## v1.11 Pascal Feature Set (shipped 2026-04-26)

4 phases (45-48), 13 plans, 4/4 requirements (THUMB-01, TREE-01, DISPLAY-01, CAM-04). Auto-rendered material swatches, sidebar rooms hierarchy tree, NORMAL/SOLO/EXPLODE display modes, per-node saved cameras with tree double-click focus. Audit passed_with_carry_over (Phase 999.4 EXPLODE+saved-camera offset gap deferred). 60+ commits, single-day milestone span. See [milestones/v1.11-ROADMAP.md](milestones/v1.11-ROADMAP.md).

---

## v1.12 Maintenance Pass (shipped 2026-04-27)

4 phases (49-52), 7 plans, 4/4 requirements (BUG-02, BUG-03, DEBT-05, HOTKEY-01). Two carry-over texture bugs closed (wall first-apply + wallpaper/wallArt 2D↔3D persistence) using a shared direct-`map` prop pattern. Legacy FloorMaterial data-URL entries auto-migrate to userTextureId references on snapshot load — `loadSnapshot` is now async (Pattern A pre-pass before Immer produce; 23 caller sites updated). Keyboard shortcuts cheat sheet overlay shipped via new single-source-of-truth registry at `src/lib/shortcuts.ts` (26 entries, coverage-gate test prevents drift). Audit `passed` — zero gaps, zero carry-over. ~5,700 LOC, 4 PRs, single-day milestone. See [milestones/v1.12-ROADMAP.md](milestones/v1.12-ROADMAP.md).

---

## v1.13 UX Polish Bundle (shipped 2026-04-28)

2 phases (53-54), 2 plans, 2/2 requirements (CTXMENU-01, PROPS3D-01). Editor-flow maturity milestone before v1.14's real-3D-models work. Phase 53: right-click context menus via `CanvasContextMenu` (2D Fabric + 3D R3F, auto-flip, 5 close paths). Phase 54: 3D click-to-select via new `useClickDetect` hook (5px drag-threshold) + Canvas `onPointerMissed` deselect. Audit caught + fixed one cross-phase gap (CustomElementMesh missing right-click). ~21 files modified, 2 PRs, single-day milestone. Audit `passed` — zero carry-over. See [milestones/v1.13-ROADMAP.md](milestones/v1.13-ROADMAP.md).

---

## v1.14 Real 3D Models (shipped 2026-05-05)

4 phases (55-58), 4 plans, 4/4 requirements (GLTF-UPLOAD-01, GLTF-RENDER-3D-01, GLTF-RENDER-2D-01, GLTF-INTEGRATION-01). Biggest user-visible win in project history. Phase 55: `.gltf`/`.glb` upload to IDB with SHA-256 dedup (mirrors Phase 32 user-texture pattern). Phase 56: drei `useGLTF` 3D rendering with auto-scale + Y-floor + `<box3Helper>` selection outline. Phase 57: top-down convex-hull silhouette polygons via Andrew's monotone chain + FIX-01 async cache. Phase 58: library Box badge top-LEFT + auto-thumbnail (mirrors Phase 45 swatch generator) + Phase 48 × GLTF e2e closing the only untested combo. 59 files modified, 11K LOC, 4 PRs ([#137](https://github.com/micahbank2/room-cad-renderer/pull/137), [#138](https://github.com/micahbank2/room-cad-renderer/pull/138), [#139](https://github.com/micahbank2/room-cad-renderer/pull/139), [#140](https://github.com/micahbank2/room-cad-renderer/pull/140)). Audit `passed` — zero regressions on Phase 31/48/53/54. Post-merge fix for React StrictMode double-mount in thumbnail callback. See [milestones/v1.14-ROADMAP.md](milestones/v1.14-ROADMAP.md).

---

## v1.15 Architectural Toolbar Expansion

**Goal:** After v1.14 made the *furniture* real, v1.15 makes the *room itself* richer. The toolbar currently has walls, doors, windows, and ceilings — that's it. Add wall cutaway viewing, stairs, archway/passthrough/niche openings, and measurement + annotation tools. Source: [#21](https://github.com/micahbank2/room-cad-renderer/issues/21), [#19](https://github.com/micahbank2/room-cad-renderer/issues/19) (partial), [#22](https://github.com/micahbank2/room-cad-renderer/issues/22).

**Sequencing rationale:** Wall cutaway ships first because it's 3D-only and doesn't depend on new primitives — fastest visible value. Stairs second because it sets the new-primitive pattern (2D draw + 3D extrusion + tree integration). Openings third because it extends both the existing wall-cut codepath (doors/windows) and intersects with stairs in stairwell scenarios. Measurement last as the annotation layer that overlays everything.

**Forward signal:** Closes the architectural-toolbar gap before any further library / material work. After v1.15, Jessica can model her actual home, not just a rectangle with furniture in it.

### Phase Details

#### Phase 59: Wall Cutaway Mode (CUTAWAY-01)

**Goal:** In 3D, the wall closest to the camera ghosts or hides so the room interior is visible from any angle. Auto-mode detects the blocking wall via raycast each frame; manual mode hides a specific wall via right-click action.
**Depends on:** Phase 47 (RoomGroup architecture), Phase 53 (right-click menus on walls), Phase 46 (hiddenIds pattern)
**Requirements:** [CUTAWAY-01](https://github.com/micahbank2/room-cad-renderer/issues/21)
**Success Criteria** (what must be TRUE):
  1. In 3D, when the camera is at a side angle, the nearest wall ghosts (semi-transparent) so the interior is visible — no more "blocked by foreground wall" frustration
  2. Toggle works: Toolbar button cycles `auto / off / manual:<wallId>`; right-click any wall in 3D → "Hide wall in 3D" action
  3. Cutaway respects Phase 47 SOLO/EXPLODE display modes and Phase 46 hiddenIds (already-hidden walls stay hidden)
  4. No regression on Phase 32 PBR materials, Phase 36 wallpaper/wallArt, Phase 49–50 user-textures (cutaway is a render-state-only feature)
  5. Cutaway state is session-only — NOT persisted to snapshots (geometry doesn't change based on viewing angle)
**Plans:** 1/1 plans complete
**UI hint:** yes

#### Phase 60: Stairs (STAIRS-01)

**Goal:** New architectural primitive. Click in 2D → place a stair element with configurable rise / run / width / step count. Renders as a stair-symbol polygon in 2D and connected step boxes in 3D.
**Depends on:** Phase 31 (size-override resolver pattern), Phase 53/54 (right-click + click-to-select), Phase 46 (tree integration), Phase 48 (saved-camera per node)
**Requirements:** [STAIRS-01](https://github.com/micahbank2/room-cad-renderer/issues/19)
**Success Criteria** (what must be TRUE):
  1. New "Stairs" tool in Toolbar; click in 2D places a stair with default config (7" rise, 11" run, 36" width, 12 steps)
  2. 2D shows a top-down stair symbol with arrow indicating rise direction; 3D renders connected stepped boxes that look like real stairs
  3. PropertiesPanel exposes editable rise / run / width / step count; Phase 31 drag-handles adjust width
  4. Tree integration: stairs appear under their containing room with a `Stairs` lucide icon
  5. Phase 53 right-click and Phase 54 click-to-select work; Phase 48 saved-camera works on stair tree node
  6. Snapshot serialization preserves stairs across reloads
**Plans:** 0/1 plans complete
**UI hint:** yes

#### Phase 61: Openings — Archway / Passthrough / Niche (OPEN-01)

**Goal:** Extend the existing wall-opening codepath beyond doors and windows. Three new opening kinds: archway (rounded top), passthrough (full-height rectangle), niche (recessed cutout that doesn't go through the wall).
**Depends on:** Phase 60 (sets the "new primitive" precedent), existing Wall + Opening types from v1.0, Phase 33 design tokens
**Requirements:** [OPEN-01](https://github.com/micahbank2/room-cad-renderer/issues/19)
**Success Criteria** (what must be TRUE):
  1. Toolbar adds 3 new opening tools: Archway, Passthrough, Niche (or extends Door/Window into a multi-kind menu)
  2. Click on a wall in 2D → places opening at click point with kind-specific defaults; 2D shows kind-specific symbol
  3. 3D renders correct cutout shape: archway has rounded top via `THREE.Shape` bezier curve; passthrough is full-height rectangle; niche is a recessed face mesh (NOT a through-hole)
  4. PropertiesPanel exposes kind-specific dimensions (width / height / depth-for-niche / arch-radius-for-archway)
  5. Snapshot back-compat: existing snapshots with `kind: "door" | "window"` load unchanged
**Plans:** 0/1 plans complete
**UI hint:** yes

#### Phase 62: Measurement + Annotation Tools (MEASURE-01)

**Goal:** Add dimension lines, free-form text labels, and automatic per-room area calculation in square feet. Communication layer over the room — useful for verifying layouts and sharing with contractors.
**Depends on:** Phase 30 (smart-snap to wall endpoints), Phase 31 (inline-edit pattern for label text), Phase 33 (typography tokens), Phase 53/54 (right-click + click-to-select)
**Requirements:** [MEASURE-01](https://github.com/micahbank2/room-cad-renderer/issues/22)
**Success Criteria** (what must be TRUE):
  1. New Toolbar tools: "Measure" (lucide `Ruler`) and "Label" (lucide `Type`)
  2. Measure tool: click two points in 2D → dimension line drawn between them, auto-formatted feet+inches label centered on the line; Phase 30 smart-snap to wall endpoints
  3. Label tool: click in 2D → places editable text annotation; Phase 31 inline-edit (double-click to edit text)
  4. Auto room-area: PropertiesPanel + RoomSettings for a Room shows `Area: XX sq ft` from shoelace formula on the wall polygon
  5. Phase 53 right-click delete + Phase 54 click-to-select work on measurements and annotations
  6. Snapshot includes measurements + annotations; reload preserves them
**Plans:** 0/1 plans complete
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
| ~~40. Ceiling Resize Handles~~ | n/a | CANCELLED   | 2026-04-25 (deferred to Phase 999.1) |
| ~~41. Per-Surface Tile-Size Override~~ | n/a | CANCELLED   | 2026-04-25 (deferred to Phase 999.3) |
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
| 52. Keyboard Shortcuts Overlay | 0/1 | Complete    | 2026-04-28 |
| 53. Canvas Context Menus | 1/1 | Complete    | 2026-04-28 |
| 54. PropertiesPanel in 3D & Split View | 1/1 | Complete    | 2026-04-29 |
| 55. GLTF Upload & Storage | 1/1 | Complete    | 2026-04-29 |
| 56. GLTF Render in 3D | 1/1 | Complete    | 2026-05-04 |
| 57. GLTF Top-Down Silhouette in 2D | 1/1 | Complete    | 2026-05-05 |
| 58. GLTF Integration Verification | 1/1 | Complete    | 2026-05-05 |
| 59. Wall Cutaway Mode | 1/1 | Complete    | 2026-05-05 |
| 60. Stairs | 0/1 | Pending    |   |
| 61. Openings — Archway/Passthrough/Niche | 0/1 | Pending    |   |
| 62. Measurement + Annotation Tools | 0/1 | Pending    |   |

## Backlog

### Phase 999.1: Ceiling resize handles (BACKLOG — re-deferred from v1.9)

**Goal:** Extend drag-to-resize handles from Phase 31 (products + custom-elements) to cover ceilings. Ceilings (customElements with `kind: "ceiling"`) currently have no resize handles — users can only move or delete and redraw. Mirror Phase 31's width/depth override pattern (`widthFtOverride` / `depthFtOverride`, single-undo drag transaction, Alt disables smart-snap).

**Requirements:** CEIL-01 (re-parked here from v1.9 Phase 40 cancellation 2026-04-25)
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog or v2.0 milestone scoping)

**Discovered:** 2026-04-21 during Phase 32 T4 human UAT (Jessica) — pre-existing.
**Promoted to v1.9 as Phase 40 (CEIL-01)** during 2026-04-25 v1.9 scoping.
**Re-deferred 2026-04-25** after Phase 39 feedback signal showed Jessica reported zero pain on ceilings ("went fine"). Building drag-resize on hypothesis-only would be guessing; revisit when a future feedback session surfaces actual ceiling-resize friction.

### Phase 999.2: Wallpaper + wallArt view-toggle regression — PROMOTED to Phase 36 under v1.8

Originally captured 2026-04-21 Phase 32 T4 human UAT. Promoted into v1.8 as Phase 36 (VIZ-10). See Phase 36 Details above.

### Phase 999.3: Per-surface texture tile-size override — design-effect (BACKLOG — re-deferred from v1.9)

**Goal:** Let users scale a texture for design effect on a single surface without re-uploading. e.g., preview the same wood floor at 6"/12"/18" plank widths in the same room. Default behavior (real-world tiling via `RepeatWrapping`) stays correct; override is optional per surface.

**Requirements:** TILE-01 (re-parked here from v1.9 Phase 41 cancellation 2026-04-25). Distinct from BUG-01 (#96 fix in v1.9 Phase 42) which only handles per-surface `tileSizeFt` isolation, not the full design-effect override UI.
**GH Issue:** [#105](https://github.com/micahbank2/room-cad-renderer/issues/105)
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog or v2.0 milestone scoping)

**Discovered:** 2026-04-25 during Phase 35 HUMAN-UAT — user asked why wood oak doesn't grow with the floor. Confirmed by-design behavior; captured as a natural follow-up enhancement.
**Promoted to v1.9 as Phase 41 (TILE-01)** during 2026-04-25 v1.9 scoping.
**Re-deferred 2026-04-25** after Phase 39 feedback signal showed Jessica reported zero pain on texture sizing ("feels right"). Full design-effect override is hypothesis-only; the narrower BUG-01 fix (Phase 42) handles the per-surface isolation that's needed regardless. Revisit design-effect scaling when a future feedback session surfaces demand.

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

**Why deferred:** Narrow trigger (cross-mode use of saved camera). Most users save + use bookmarks within a single display mode. EXPLODE is an inspection mode, not a navigation mode. Revisit if real-use feedback surfaces the bug.

**Discovered:** 2026-04-26 during v1.11 milestone audit (gsd-integration-checker).
