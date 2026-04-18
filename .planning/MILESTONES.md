# Milestones — Room CAD Renderer

## v1.4 — Polish & Tech Debt ✅

**Shipped:** 2026-04-08 (archived 2026-04-18)
**Timeline:** 2026-04-06 → 2026-04-08 (~2 days)
**Phases:** 3 (21, 22, 23) — 3 plans
**Files changed:** ~40 | **LOC:** ~13,987 TypeScript
**Git range:** `0596cef` (feat 21-01) → `b330315` (fix 23 surface labels)
**Tag:** `v1.4`

**Delivered:** All deferred v1.3 verification gaps closed and every user-facing underscore label cleaned up. Jessica can double-click a wainscoted wall in the 2D canvas to edit its style and height inline, her color picker interactions produce clean single-undo entries, and the sidebar scrolls smoothly when every section is expanded. Every label in the app reads cleanly with spaces — code identifiers left untouched.

**Key accomplishments:**

1. **Undo-history fix** — `updateWallArtNoHistory` cadStore action + onFocus/onChange color picker pattern producing at most one undo entry per interaction (POLISH-04)
2. **Sidebar scroll fix** — `min-h-0` on flex-1 overflow container lets every section be expanded simultaneously without clipping (POLISH-06)
3. **Wainscot inline edit** — `WainscotPopover` component + FabricCanvas dblclick integration so users edit wainscot style/height directly on canvas, matching EDIT-06 dimension-label precedent. Single useEffect shared with dimension-label handler (no collision) (POLISH-02)
4. **Copy wall side verification** — `copyWallSide` action tested end-to-end with 3 new unit tests (POLISH-03)
5. **Label cleanup** — 4 dynamic `.replace(/\s/g, "_")` transforms removed, ~125 static underscore labels replaced across 30+ files, surface material display labels fixed. Display/identifier separation established as Obsidian CAD convention (LABEL-01, LABEL-02)
6. **Jess Feedback bug sweep (PR #39)** — 10 bugs found during v1.3 user testing fixed in parallel: welcome screen "Open Existing Project" option, wall dimensions editable after placement, ceilings draggable after placement, ceiling paint picker usable after material selection, product persistence to IndexedDB, wall Side A/B alignment between 2D and 3D

### Known Gaps (Accepted)

- **VERIFICATION.md artifacts** — not generated for phases 21, 22, 23. Integration checker (2026-04-17) substitutes for formal verification; all 6 requirements confirmed wired end-to-end.
- **VALIDATION.md (Nyquist)** — not generated for any v1.4 phase. Low priority.
- Phase 22 and 23 SUMMARY.md files were retrofit on 2026-04-17 from git history (see [v1.4-MILESTONE-AUDIT.md](milestones/v1.4-MILESTONE-AUDIT.md))

**Archives:**

- [v1.4-ROADMAP.md](milestones/v1.4-ROADMAP.md) — full phase breakdown
- [v1.4-REQUIREMENTS.md](milestones/v1.4-REQUIREMENTS.md) — 6/6 requirements validated
- [v1.4-MILESTONE-AUDIT.md](milestones/v1.4-MILESTONE-AUDIT.md) — 3-source cross-reference audit with integration verification

---

## v1.3 — Color, Polish & Materials ✅

**Shipped:** 2026-04-06
**Timeline:** 2026-04-05 → 2026-04-06 (1 day)
**Phases:** 3 (18, 19, 20) — 11 plans
**Files changed:** 72 | **LOC:** ~13,300 TypeScript (+4,738 from v1.2)
**Git range:** `94d96a4` → `cdc7dc9`
**Tag:** `v1.3`

**Delivered:** Jessica can paint any wall or ceiling with named Farrow & Ball colors, create custom hex colors, toggle lime wash finishes, and see results in both 2D and 3D. Custom elements have full edit handles, multi-select enables bulk painting, and floor/ceiling materials share a unified swatch catalog.

**Key accomplishments:**

1. **Full paint system** — 132 Farrow & Ball swatches with hue filter + name search, custom hex palette, lime wash toggle, recently-used row, paint-all-walls action (PAINT-01..07)
2. **Paint rendering** — wall and ceiling paint in both 2D floor plans (solid fill + lime wash overlay) and 3D views (PBR material with roughness) (PAINT-01/02/05)
3. **Custom element edit handles** — drag, rotate, resize placed custom elements via same interaction model as products (POLISH-01)
4. **Cmd+click multi-select** — select multiple walls in 2D, then bulk-paint with one action (POLISH-05)
5. **Sidebar UX** — collapsible sections, sidebar collapse toggle, full scroll support (POLISH-06 partial)
6. **Unified surface material catalog** — single picker for floor and ceiling texture presets, floor texture clone fix for split-view safety (MAT-01/02/03)

### Known Gaps

Accepted as tech debt for v1.4:

- **POLISH-02**: Wainscot library inline edit (code landed but not verified end-to-end)
- **POLISH-03**: Copy SIDE_A treatments to SIDE_B (copyWallSide action exists, UI button landed but not verified)
- **POLISH-04**: Per-placement frame color override (frameColorOverride type + picker landed but not verified)
- **POLISH-06**: Sidebar scroll/collapse (implemented but not fully verified on every page/view)

**Archives:**

- [v1.3-ROADMAP.md](milestones/v1.3-ROADMAP.md) — full phase breakdown
- [v1.3-REQUIREMENTS.md](milestones/v1.3-REQUIREMENTS.md) — 12/16 requirements validated (4 gaps)

---

## v1.1 — UX Fixes & Polish ✅

**Shipped:** 2026-04-05
**Timeline:** 2026-04-05 (~3.5 hours of execution)
**Phases:** 6 (Phase 6, 7, 7.1, 8, 9, 10) — 7 PRs
**Files changed:** 33 | **LOC:** ~8,562 TypeScript (from ~4,924 after v1.0 = +3,638)
**Git range:** `f51d537` → `389446b`
**Tag:** `v1.1`

**Delivered:** The app is usable without workarounds. Zoom + pan work, clicks land where you click, tools don't get stuck, live dimensions show during every drag, corners look professional, and every placed element (walls, doors, windows, products) can be edited in-place with Google-Slides-style handles.

**Key accomplishments:**

1. **2D canvas navigation** — scroll-zoom + pinch + +/- buttons + fit-to-view + `0` key (NAV-01/02/03)
2. **Placement & interaction fixes** — door/window preview, tool auto-revert, live wall length (EDIT-10/11/13)
3. **Wall rotation + product resize** — handles + live size tags, per-placement sizeScale without mutating library (EDIT-12/14)
4. **Home page redesign** — 2-CTA welcome, FLOOR_PLAN tab, template picker, floor plan upload for tracing, prominent save status, broken tabs removed (HOME-01/02/03, SAVE-04, UI-01)
5. **Wall rendering polish** — clean X-junctions, dead-end caps, mid-segment crossing caps (WALL-01/02/03)
6. **Google-Slides-style edit handles** — wall endpoints + thickness, opening slide + resize, live dim tags everywhere (EDIT-15/16/17/18/19)

**Archives:**

- [v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md) — full phase breakdown
- [v1.1-REQUIREMENTS.md](milestones/v1.1-REQUIREMENTS.md) — all 21 requirements validated
- [v1.1-MILESTONE-AUDIT.md](milestones/v1.1-MILESTONE-AUDIT.md) — audit report (PASSED)

---

## v1.0 — Room Visualization MVP ✅

**Shipped:** 2026-04-05
**Timeline:** 2026-04-04 → 2026-04-05 (2 days)
**Phases:** 6 (1, 2, 3, 4, 5, 5.1) — 23 plans
**Files changed:** 155 | **LOC:** ~4,924 TypeScript
**Git range:** `f5da5fb` → `395403a`
**Tag:** `v1.0`

**Delivered:** Jessica can upload her own products, place them in dimensionally accurate multi-room layouts, see real image textures in a 3D scene with PBR materials and soft shadows, walk through the room at eye level, and export the view as PNG — all of it auto-saved and restored on reload.

**Key accomplishments:**

1. **2D canvas made fully interactive** — async product image rendering (EDIT-09), HTML5 drag-drop placement (EDIT-07), rotation handles with 15° snap (EDIT-08), double-click editable wall dimensions (EDIT-06)
2. **Global product library** with nullable dimensions, search, and placeholder rendering — one catalog across all projects (LIB-03/04/05)
3. **3D scene coherence** — ACES tone mapping, soft shadows, procedural wood-plank floor, Environment preset, PBR materials, image-textured products (VIZ-04/06)
4. **Eye-level walkthrough** with PointerLockControls, WASD movement, walls+bounds collision, axis-slide fallback (VIZ-05)
5. **Multi-room model** — CADSnapshot v2 migration, rooms map + activeRoomId, room templates (living/bedroom/kitchen), RoomTabs + Ctrl/Cmd+Tab switching (ROOM-01/02)
6. **Auto-save + startup hydration** — 2s debounce, SaveIndicator, last-saved project restored on page reload, walk camera respawns on room switch, orbit position preserved on mode toggle (SAVE-02/03, closed via 5.1)

**Archives:**

- [v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) — full phase breakdown
- [v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md) — all 14 active requirements validated
- [v1.0-MILESTONE-AUDIT.md](milestones/v1.0-MILESTONE-AUDIT.md) — integration audit + gap closure record
