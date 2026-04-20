# Roadmap: Room CAD Renderer

## Milestones

- ✅ **v1.0 Room Visualization MVP** — Phases 1–5.1 (shipped 2026-04-05) — see [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 UX Fixes & Polish** — Phases 6–10 (shipped 2026-04-05) — see [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 New Element Types** — Phases 11–17 (shipped 2026-04-05) — see [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Color, Polish & Materials** — Phases 18–20 (shipped 2026-04-06) — see [milestones/v1.3-ROADMAP.md](milestones/v1.3-ROADMAP.md)
- ✅ **v1.4 Polish & Tech Debt** — Phases 21–23 (shipped 2026-04-08) — see [milestones/v1.4-ROADMAP.md](milestones/v1.4-ROADMAP.md)
- ✅ **v1.5 Performance & Tech Debt** — Phases 24–27 (shipped 2026-04-20) — see [milestones/v1.5-ROADMAP.md](milestones/v1.5-ROADMAP.md)
- 🚧 **v1.6 Editing UX** — Phases 28–31 (in progress) — see below

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

---

## v1.6 Editing UX

**Goal:** Close daily-workflow gaps in 2D editing — Jessica can size walls precisely, resize without menus, snap intelligently, rename placed items, and never lose work.

**Requirements:** 11 | **Phases:** 4 (28–31)

### Phases

- [x] **Phase 28: Auto-Save** — CAD scene saves itself; toolbar shows SAVING/SAVED status (completed 2026-04-20)
- [x] **Phase 29: Editable Dimension Labels** — double-click any wall label to type a new length (completed 2026-04-20)
- [x] **Phase 30: Smart Snapping** — edges snap to walls and objects; auto-center on midpoints; guides appear on snap (completed 2026-04-20)
- [ ] **Phase 31: Drag-to-Resize + Label Override** — drag handles resize products and walls; custom elements can be renamed per placement

### Phase Details

#### Phase 28: Auto-Save
**Goal**: Jessica never loses work — the CAD scene saves itself within seconds of any edit
**Depends on**: Nothing (standalone persistence layer)
**Requirements**: SAVE-05, SAVE-06
**Success Criteria** (what must be TRUE):
  1. After drawing a wall and waiting ~2 seconds, the toolbar briefly shows "SAVING..." then "SAVED" without any manual action
  2. Continuous drag operations (moving a product) do not trigger save spam — exactly one save fires after the drag ends
  3. Reloading the page restores the scene exactly as left, with no data loss
  4. The SAVING/SAVED indicator uses the existing SAVE-04 surface from v1.1 (no new chrome)
**Plans**: TBD
**UI hint**: yes

#### Phase 29: Editable Dimension Labels
**Goal**: Jessica can set an exact wall length by typing it — no drag-to-measure guessing
**Depends on**: Phase 28
**Requirements**: EDIT-20, EDIT-21
**Success Criteria** (what must be TRUE):
  1. Double-clicking a wall's dimension label opens an in-place feet+inches input field on the canvas
  2. Typing a new value and pressing Enter resizes the wall from its start point along its current angle
  3. Pressing Escape closes the input with no change to the wall
  4. Each dimension-label edit produces exactly one undo entry — pressing Ctrl+Z once fully undoes the resize
**Plans**: TBD
**UI hint**: yes

#### Phase 30: Smart Snapping
**Goal**: Jessica places objects precisely — edges and midpoints snap, and she can see when a snap is active
**Depends on**: Phase 29
**Requirements**: SNAP-01, SNAP-02, SNAP-03
**Success Criteria** (what must be TRUE):
  1. Dragging a product near a wall edge causes it to snap flush to that wall edge within a small pixel tolerance
  2. Dragging a product near the midpoint of a wall snaps it to be centered on that wall
  3. A visible guide (line or highlight) appears on the canvas when any snap is active, and disappears when the drag ends
  4. Snapping works during both placement (product tool) and repositioning (select tool drag)
**Plans**: TBD
**UI hint**: yes

#### Phase 31: Drag-to-Resize + Label Override
**Goal**: Jessica resizes furniture and walls with handles, and can rename any custom element she has placed
**Depends on**: Phase 30
**Requirements**: EDIT-22, EDIT-23, EDIT-24, CUSTOM-06
**Success Criteria** (what must be TRUE):
  1. Selecting a placed product shows corner/edge resize handles; dragging one updates the product dimensions snapped to the active grid increment
  2. Selecting a wall shows endpoint handles; dragging an endpoint moves that end of the wall (Shift constrains to orthogonal)
  3. A drag-resize operation produces exactly one undo entry — Ctrl+Z fully restores the pre-drag size/position in one step
  4. Mid-drag canvas performance matches the Phase 25 fast-path baseline (no per-frame store commits)
  5. Selecting a placed custom element and typing into the label-override field in PropertiesPanel changes its 2D canvas label; clearing the field reverts to the catalog name
**Plans**: TBD
**UI hint**: yes

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 28. Auto-Save | 5/5 | Complete    | 2026-04-20 |
| 29. Editable Dimension Labels | 4/4 | Complete    | 2026-04-20 |
| 30. Smart Snapping | 4/4 | Complete   | 2026-04-20 |
| 31. Drag-to-Resize + Label Override | 0/? | Not started | - |
