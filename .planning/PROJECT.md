# Room CAD Renderer — Project Context

## What This Is

A personal interior design tool built for Jessica (Micah's wife) to plan and visualize their future home. She uploads products she actually loves — from Pinterest, specific stores, real items she's considering — places them in dimensionally accurate multi-room layouts, and walks through the space in 3D at eye level before buying anything.

This is a single-user personal tool. Not a SaaS, not a professional CAD app, not a collaboration platform.

## Core Value

**Jessica can see her future room with her actual furniture before spending money.** The magic moment: she uploads a photo of a couch she found, places it in a room with real dimensions, switches to walk mode, and feels whether it works.

## Current State

**Phase 24 (Tool Architecture Refactor) shipped 2026-04-19.** First phase of v1.5 complete — 18 `(fc as any).__xToolCleanup` casts eliminated, all 6 tools converted to cleanup-fn return pattern with closure state, `pxToFeet` + `findClosestWall` consolidated into `src/canvas/tools/toolUtils.ts` (107 lines of duplication deleted). Added `tests/toolCleanup.test.ts` with 6 listener-leak regression cases. Test baseline maintained at 168 passing (+6 new), same 6 pre-existing failures unrelated to tools. D-13 manual smoke user-approved.

**v1.4 shipped 2026-04-08.** All 6 deferred v1.3 verification gaps closed: wainscot inline edit via `WainscotPopover` + FabricCanvas dblclick, frame color override with single-undo pattern, sidebar scroll fix via `min-h-0`, copy-side action verified with unit tests. Label cleanup removed ~125 underscores from user-facing display text across 30+ files while preserving code identifiers (Obsidian CAD display/identifier separation convention established). Plus 10 Jess Feedback bugs fixed in parallel via PR #39 (welcome screen, wall/ceiling drag, product persistence, wall side alignment).

**v1.3 shipped 2026-04-06.** Full paint system (132 Farrow & Ball + custom hex), lime wash finish, bulk painting via multi-select, custom element edit handles, collapsible sidebars, unified surface material catalog. 12/16 requirements shipped; 4 polish items deferred to and completed in v1.4.

**v1.2 shipped 2026-04-05.** 29 requirements across 7 phases. Ceilings, floor materials, wallpaper, wall art, wainscoting, crown molding, custom element builder, framed art library, 7 wainscoting styles, per-side wall treatments.

**v1.1 shipped 2026-04-05.** 21 UX fixes across 6 phases. Zoom/pan, click accuracy, tool auto-revert, live dimensions, wall rotation, product resize, corner-perfect walls, edit handles, save status, welcome screen.

**v1.0 shipped 2026-04-05.** 14 requirements. Product library → 2D plans → 3D rendering → walkthrough → export → auto-save.

See `.planning/ROADMAP.md` for links to each milestone archive.

## Current Milestone: v1.5 Performance & Tech Debt

**Goal:** Make the app feel smoother as scenes grow and close the highest-friction tech debt and bug debt before adding more features.

**Target items:**
- Canvas full-redraw → incremental updates (perf)
- `JSON.parse(JSON.stringify())` → `structuredClone()` in cadStore snapshots (perf)
- Tool cleanup off `(fc as any).__xToolCleanup` pattern (type-safety)
- Tool state from module-level singletons → closures (multi-canvas safety)
- Extract `pxToFeet` + `findClosestWall` to shared `toolUtils.ts` (DRY)
- R3F v9 / React 19 upgrade tracking
- Bug: 2D async product image rendering (#42)
- Bug: Ceiling preset-id path (#43)

**Source issues:** [#42](https://github.com/micahbank2/room-cad-renderer/issues/42), [#43](https://github.com/micahbank2/room-cad-renderer/issues/43), [#51](https://github.com/micahbank2/room-cad-renderer/issues/51), [#52](https://github.com/micahbank2/room-cad-renderer/issues/52), [#53](https://github.com/micahbank2/room-cad-renderer/issues/53), [#54](https://github.com/micahbank2/room-cad-renderer/issues/54), [#55](https://github.com/micahbank2/room-cad-renderer/issues/55), [#56](https://github.com/micahbank2/room-cad-renderer/issues/56)

**Success criteria:** Identical UX, measurably better perf (60fps drag at 50 walls / 30 products), zero `as any` casts on Fabric instances, both bugs verified end-to-end.

## Target User

One person. Non-technical. Interior design enthusiast, not a professional. Comfortable with basic computer use. Thinks visually. Saves products from Pinterest, Instagram, and store websites.

## Context

- Building a home — this is for planning real purchases
- Existing tools fail because they lock you into preset catalogs or are too complex
- Jessica wants HER products in HER rooms at the right scale
- "Feel the space" matters as much as "does it fit"
- Desktop-first (laptop/monitor). iPad is future wishlist, not v1.
- Codebase is ~13,987 LOC TypeScript across React 18 + Fabric.js + Three.js + Zustand (as of v1.4)

## Requirements

### Validated

**v1.0 Milestone (2026-04-05):**

- ✓ Product images render in 2D canvas (async FabricImage cache) — v1.0 (EDIT-09, Phase 1)
- ✓ Drag-and-drop from product library to canvas — v1.0 (EDIT-07, Phase 1)
- ✓ Product rotation in 2D via handles — v1.0 (EDIT-08, Phase 1)
- ✓ Editable wall dimension labels — v1.0 (EDIT-06, Phase 1)
- ✓ Auto-save with debounce + startup hydration — v1.0 (SAVE-02, Phase 1 + 5.1)
- ✓ Global product library persists across all projects — v1.0 (LIB-03, Phase 2)
- ✓ Product dimensions are optional — v1.0 (LIB-04, Phase 2)
- ✓ Product name search — v1.0 (LIB-05, Phase 2)
- ✓ 3D product rendering with uploaded textures — v1.0 (VIZ-04, Phase 3)
- ✓ Smooth 3D experience (PBR, soft shadows, procedural floor, Environment) — v1.0 (VIZ-06, Phase 3)
- ✓ Export 3D view as PNG — v1.0 (SAVE-03, Phase 3)
- ✓ Eye-level camera walkthrough with collision — v1.0 (VIZ-05, Phase 4 + 5.1)
- ✓ Multiple rooms per project with Ctrl/Cmd+Tab switching — v1.0 (ROOM-01, Phase 5)
- ✓ Room templates (living room, bedroom, kitchen, blank) — v1.0 (ROOM-02, Phase 5)

**Pre-v1 foundation (existing):**

- ✓ 2D room drawing + walls + doors/windows + undo/redo — existing
- ✓ Split view (2D + 3D) + orbit camera + wall extrusion — existing
- ✓ Project save/load via IndexedDB — existing
- ✓ Obsidian CAD design system + Welcome screen — existing

**v1.1 Milestone (2026-04-05) — 21 shipped requirements:**

- ✓ 2D canvas zoom + pan + fit-to-view — v1.1 (NAV-01/02/03, Phase 6)
- ✓ Door/window live placement preview — v1.1 (EDIT-10, Phase 7)
- ✓ Tool auto-revert to Select — v1.1 (EDIT-11, Phase 7)
- ✓ Wall rotation handle — v1.1 (EDIT-12, Phase 7.1)
- ✓ Live wall-length label while drawing — v1.1 (EDIT-13, Phase 7)
- ✓ Product resize with live W × D tag — v1.1 (EDIT-14, Phase 7.1)
- ✓ Prominent toolbar save status — v1.1 (SAVE-04, Phase 8)
- ✓ 2-CTA welcome screen — v1.1 (HOME-01, Phase 8)
- ✓ FLOOR_PLAN top-level tab — v1.1 (HOME-02, Phase 8)
- ✓ Template picker + upload floor plan — v1.1 (HOME-03, Phase 8)
- ✓ Broken welcome tabs removed — v1.1 (UI-01, Phase 8)
- ✓ X-junction wall caps — v1.1 (WALL-01, Phase 9)
- ✓ Dead-end wall caps — v1.1 (WALL-02, Phase 9)
- ✓ Mid-segment crossing caps — v1.1 (WALL-03, Phase 9)
- ✓ Wall endpoint drag handles — v1.1 (EDIT-15, Phase 10)
- ✓ Wall thickness handle — v1.1 (EDIT-16, Phase 10)
- ✓ Opening width resize handles — v1.1 (EDIT-17, Phase 10)
- ✓ Opening slide along host wall — v1.1 (EDIT-18, Phase 10)
- ✓ Live dim tag during all drags — v1.1 (EDIT-19, Phase 10)

**v1.2 Milestone (2026-04-05) — 29 shipped requirements:**

- ✓ Ceilings with editable height + material (CEIL-01/02/03/04, Phase 11)
- ✓ Floor materials — 8 presets + custom upload + scale/rotation (FLOOR-01/02/03, Phase 12)
- ✓ Per-wall wallpaper + wall art + wainscoting + crown molding (SURFACE/TRIM, Phase 13)
- ✓ Custom element builder with per-project catalog (CUSTOM-01..05, Phase 14)
- ✓ Framed art library with 3D frame geometry (ART-01..06, Phase 15)
- ✓ Per-side wall treatments (SIDE-01/02/03, Phase 17)
- ✓ Wainscoting style library — 7 real 3D styles + live preview (WAIN-01..04, Phase 16)

**v1.3 Milestone (2026-04-06) — 12 shipped requirements:**

- ✓ Full paint system — F&B catalog, custom hex, lime wash, recently-used, paint-all-walls (PAINT-01..07, Phase 18)
- ✓ Custom element edit handles — drag, rotate, resize (POLISH-01, Phase 19)
- ✓ Cmd+click multi-select + bulk paint (POLISH-05, Phase 19)
- ✓ Unified surface material catalog — floor + ceiling swatch picker (MAT-01/02/03, Phase 20)

*Deferred to v1.4 and completed there: POLISH-02, POLISH-03, POLISH-04, POLISH-06*

**v1.4 Milestone (2026-04-08) — 6 shipped requirements:**

- ✓ Wainscot inline edit via WainscotPopover on 2D canvas (POLISH-02, Phase 22)
- ✓ Copy wall treatments SIDE_A → SIDE_B with one click (POLISH-03, Phase 21)
- ✓ Frame color override per wall art placement with single-undo pattern (POLISH-04, Phase 21)
- ✓ Sidebar scrolls all sections when expanded (POLISH-06, Phase 21)
- ✓ All user-facing labels display spaces instead of underscores (LABEL-01, Phase 23)
- ✓ Dynamic label transforms use space-preserving format (LABEL-02, Phase 23)

**v1.5 Milestone (in progress) — Phase 24 shipped 2026-04-19:**

- ✓ Tool cleanup uses type-safe pattern (no `(fc as any).__xToolCleanup` — activate returns cleanup fn, held in useRef) (TOOL-01, Phase 24)
- ✓ Tool state held in closures, not module-level singletons (3 wrapper interfaces dissolved) (TOOL-02, Phase 24)
- ✓ `pxToFeet` + `findClosestWall` extracted to shared `src/canvas/tools/toolUtils.ts` (6 duplicates consolidated) (TOOL-03, Phase 24)

### Active

**v1.5 Milestone — Performance & Tech Debt** (Phase 24 shipped; 25-27 pending)

- [ ] **PERF-01**: Canvas redraw uses incremental updates instead of full clear
- [ ] **PERF-02**: cadStore snapshots use `structuredClone()` instead of JSON roundtrip
- [ ] **TRACK-01**: R3F v9 / React 19 upgrade path documented and tracked
- [ ] **FIX-01**: Product images render in 2D canvas (async load)
- [ ] **FIX-02**: Ceiling preset materials apply correctly in `CeilingMesh`

### Out of Scope

- Multi-user / collaboration — single user only
- Export to contractors / CAD file formats — not needed
- Pricing integration / shopping lists — not for this product
- Mobile / iPad support — desktop only for now, iPad on v2 wishlist
- Professional drafting features (layers, annotations, blueprints)
- Backend / server / auth — stays local-first (IndexedDB)
- GLTF/OBJ 3D model upload — too complex for Jessica's workflow, stick with images

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Local-first, no backend | Single user, personal tool. IndexedDB sufficient. | ✓ Good — no sync headaches, instant saves |
| Global product library | Jessica uploads once, uses across all projects. | ✓ Good — shipped as productStore separate from cadStore |
| Image-only products (no required 3D models) | Jessica saves screenshots from Pinterest/stores. | ✓ Good — textured boxes read as realistic enough |
| Optional dimensions | Some products she wants to see in the space — vibes over precision. | ✓ Good — placeholder dash works in 2D and 3D |
| Desktop-only | Laptop workflow. iPad can come later. | ✓ Good — no responsive compromises |
| React 18 (not 19) | R3F 8 + drei 9 had hook errors with React 19. | Locked — do not upgrade |
| Obsidian CAD design system (DS8) | Dark theme, purple accents, monospace labels. | Locked |
| Fabric.js for 2D, Three.js for 3D | Both read from same Zustand store. | Locked — clean one-way data flow |
| CADSnapshot v2 with migration | Multi-room needed wrapping shape; v1 → v2 migrateSnapshot. | ✓ Good — backwards-compatible |
| active-room selector pattern | Single null-guard call-site per action. | ✓ Good — 15 consumers wired cleanly |
| History-boundary drag pattern | One snapshot at mousedown, no-history per frame. | ✓ Good — smooth drags without history bloat |
| Module-level async caches (image/texture/floor) | Dedup concurrent loads, naturally dedup via Promise-valued cache. | ✓ Good — no double-fetch bugs |
| react-colorful for paint picker | Lightweight hex picker, no heavy deps. | ✓ Good — clean integration |
| Unified surface material catalog | One data file serves both floor and ceiling pickers. | ✓ Good — reduced duplication |
| Floor texture clone pattern | Clone cached texture, share source — independent repeat per consumer. | ✓ Good — split-view safe |
| Paint mutual exclusion (paintId clears surfaceMaterialId) | Single material state per ceiling, no ambiguous combos. | ✓ Good — clean UX |
| CollapsibleSection as file-scoped component | Only Sidebar uses it, no need for shared component. | ✓ Good — minimal surface area |
| onFocus history push + onChange NoHistory for color pickers | React onChange fires like native event — onBlur misses initial state; onFocus captures one snapshot per interaction. | ✓ Good — pattern reusable for any continuous input |
| Extend existing dblclick useEffect for wainscot popover (shared with dim-label editor) | Avoids handler collision; dim-label hit test returns early, wainscot check only runs when no label hit. | ✓ Good — canvas inline editor pattern established |
| Display-vs-identifier separation in Obsidian CAD theme | Display text gets spaces (ALL CAPS preserved); underscores reserved for code keys, CSS classes, test IDs, data attrs. | ✓ Locked convention |
| Integration checker substitutes for VERIFICATION.md when retrofit | Audit trail completeness not worth rebuilding if code is wired correctly and the agent-level check passes. | — Pending — use sparingly; prefer formal verification at execute-time |

## Tech Stack (Current)

- React 18 + TypeScript + Vite 8
- Fabric.js v6 (2D CAD canvas)
- Three.js via @react-three/fiber v8 + drei v9 (3D viewport, walk mode via PointerLockControls)
- Zustand v5 + Immer (cadStore + uiStore + productStore + projectStore, undo/redo, auto-save)
- Tailwind CSS v4 (styling, Obsidian CAD theme inline in index.css)
- idb-keyval (IndexedDB persistence — projects + product library)
- Vitest + jsdom + @testing-library (115 tests + 3 todo)
- IBM Plex Mono + Space Grotesk + Inter (typography)
- Material Symbols Outlined (icons)

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-19 — Phase 24 (Tool Architecture Refactor) complete, 3/8 v1.5 requirements shipped*
