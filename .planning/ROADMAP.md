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
