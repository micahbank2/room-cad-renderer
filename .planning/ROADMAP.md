# Roadmap: Room CAD Renderer

## Milestones

- ✅ **v1.0 Room Visualization MVP** — Phases 1–5.1 (shipped 2026-04-05) — see [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 UX Fixes & Polish** — Phases 6–10 (shipped 2026-04-05) — see [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 New Element Types** — Phases 11–17 (shipped 2026-04-05) — see [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Color, Polish & Materials** — Phases 18–20 (shipped 2026-04-06) — see [milestones/v1.3-ROADMAP.md](milestones/v1.3-ROADMAP.md)
- 🚧 **v1.4 Polish & Tech Debt** — Phases 21–23 (in progress)

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

---

### 🚧 v1.4 Polish & Tech Debt (In Progress)

**Milestone Goal:** Close all deferred v1.3 verification gaps and clean up UI label formatting. Every feature that landed as code in v1.3 works end-to-end, and every user-facing label reads cleanly without underscores.

## Phases

- [x] **Phase 21: Deferred Feature Verification** - Verify copy-side, frame override, and sidebar scroll features shipped in v1.3 (completed 2026-04-06)
- [ ] **Phase 22: Wainscot Inline Edit** - Build double-click inline edit for wainscot style and height
- [ ] **Phase 23: Label Cleanup** - Remove all underscores from user-facing labels

## Phase Details

### Phase 21: Deferred Feature Verification
**Goal**: Users can use copy-side, frame color override, and sidebar scroll features that shipped as code in v1.3 without bugs or dead paths
**Depends on**: Nothing (first phase of v1.4)
**Requirements**: POLISH-03, POLISH-04, POLISH-06
**Success Criteria** (what must be TRUE):
  1. User can click a "copy to other side" button on any wall with SIDE A treatments and see those treatments replicated to SIDE B
  2. User can select a placed wall art piece and change its frame color independently from the default frame style
  3. User can expand every sidebar section simultaneously and scroll the full panel without any content clipping or overflow hiding
  4. Frame color changes do not flood undo history (each picker interaction produces at most one undo entry)
**Plans**: 1 plan
Plans:
- [x] 21-01-PLAN.md — Fix frame color undo flooding + sidebar scroll CSS + tests for copyWallSide
**UI hint**: yes

### Phase 22: Wainscot Inline Edit
**Goal**: Users can double-click a wainscoted wall and edit its wainscot style and height in place without navigating to a separate panel
**Depends on**: Phase 21
**Requirements**: POLISH-02
**Success Criteria** (what must be TRUE):
  1. User can double-click a wall with wainscoting in the 2D canvas and see an inline popover with style and height controls
  2. User can change wainscot style from the popover and see the 3D view update immediately
  3. User can change wainscot height from the popover and see the 3D geometry reflect the new height
  4. Popover dismisses on click-outside or Escape without leaving stale UI
**Plans**: 1 plan
Plans:
- [ ] 22-01-PLAN.md — WainscotPopover component + FabricCanvas dblclick integration
**UI hint**: yes

### Phase 23: Label Cleanup
**Goal**: Every user-facing label in the app displays clean spaces instead of underscores while preserving ALL CAPS convention and leaving code identifiers untouched
**Depends on**: Phase 22
**Requirements**: LABEL-01, LABEL-02
**Success Criteria** (what must be TRUE):
  1. All static labels in toolbar, sidebar, status bar, and modal headers display spaces instead of underscores (e.g., "SIDE A" not "SIDE_A", "FLOOR PLAN" not "FLOOR_PLAN")
  2. All dynamically generated labels (product names, wall segment IDs, material names) display with spaces via updated .replace() transforms
  3. No code identifiers, CSS class names, data attributes, or store keys are affected by the label changes
**Plans**: 1 plan
Plans:
- [ ] 23-01-PLAN.md — Remove all underscore labels (dynamic transforms + static labels + visual verify)
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 21 → 22 → 23

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 21. Deferred Feature Verification | v1.4 | 1/1 | Complete   | 2026-04-06 |
| 22. Wainscot Inline Edit | v1.4 | 0/1 | Planning complete | - |
| 23. Label Cleanup | v1.4 | 0/1 | Planning complete | - |
