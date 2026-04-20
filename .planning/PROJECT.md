# Room CAD Renderer — Project Context

## What This Is

A personal interior design tool built for Jessica (Micah's wife) to plan and visualize their future home. She uploads products she actually loves — from Pinterest, specific stores, real items she's considering — places them in dimensionally accurate multi-room layouts, and walks through the space in 3D at eye level before buying anything.

This is a single-user personal tool. Not a SaaS, not a professional CAD app, not a collaboration platform.

## Core Value

**Jessica can see her future room with her actual furniture before spending money.** The magic moment: she uploads a photo of a couch she found, places it in a room with real dimensions, switches to walk mode, and feels whether it works.

## Current State

**v1.6 Editing UX — Phase 30 Smart Snapping complete 2026-04-20.** 4 plans (TDD → pure engine → tool integration → gate). Net-new code (unlike hardening in Phases 28/29): `src/canvas/snapEngine.ts` is a pure 427-LOC module with zero Fabric/store/DOM imports — fully unit-testable. Per-axis independent snap algorithm with 8px zoom-aware tolerance (`SNAP_TOLERANCE_PX = 8`, scaled to feet via `/scale`). Snap targets: wall outer edges + wall midpoints (SNAP-02 auto-center) + other-object bbox edges; excludes the dragged object itself. When no smart-snap candidate is within tolerance, per-axis grid fallback preserves existing `gridSnap` behavior. `src/canvas/snapGuides.ts` Fabric renderer draws accent-purple (`#7c5bf0` @ 0.6 opacity) axis line across canvas + tick at snap point, plus a distinct midpoint dot for wall-center snaps; tagged `data.type === "snap-guide"` for clean removal on mouse:up and tool cleanup. Integrated into `selectTool` generic-move drag + `productTool` placement/hover; wall-endpoint drag (lines 765–789) deliberately untouched per D-08b (Phase 31 territory). Hold Alt/Option to disable smart snap while keeping grid snap (documented in CLAUDE.md). `window.__driveSnap` + `window.__getSnapGuides` test bridges under `import.meta.env.MODE === "test"` guard. Phase 25 drag fast-path preserved (`NoHistory` count unchanged; no per-frame store writes introduced). Tests: 31/31 smart-snap green (17 engine + 10 guides + 4 integration); full suite 269 passing (6 pre-existing unrelated). 4 perceptual items in `30-HUMAN-UAT.md`.

**v1.6 Editing UX — Phase 29 Editable Dimension Labels complete 2026-04-20.** 4 plans (1 Wave 0 TDD + 2 parallel impl + 1 gate). Hardened the existing `EDIT-06` in-place overlay rather than rewriting. Feet+inches parser (`12'6"`, `12' 6"`, `12'-6"`, `12'`, `6"`, `12ft 6in`, plus decimal back-compat) rejects ambiguous forms like `12 6` and non-positive values. Overlay now pre-fills with `formatFeet()` (matches the label), widened to 96px, selects-all on focus. `EditableRow` in PropertiesPanel gained an optional `parser` prop — LENGTH row opts in to feet+inches; THICKNESS/HEIGHT rows remain numeric. 1e-6 no-op guard added to suppress spurious undo entries from formatFeet round-trip drift. Bonus: React 18 getSnapshot-caching fix in `SwatchPicker` (Rule-3 auto-fix). EDIT-21 single-undo locked in by regression test — `resizeWallByLabel` already satisfied it by design. Full suite 238 passing (6 pre-existing unrelated failures). 3 perceptual items queued in `29-HUMAN-UAT.md` (overlay angle fidelity, blur-commit feel, Ctrl+Z round-trip).

**v1.6 Editing UX — Phase 28 Auto-Save complete 2026-04-20.** 5 plans (4 standard + 1 gap-closure). Hardened existing `useAutoSave.ts` rather than rewriting: added `"failed"` SaveStatus variant, `SAVE_FAILED` branch in `ToolbarSaveStatus` (Toolbar.tsx) with `text-error` and no auto-fade (D-04a), dual-subscriber for CAD data + project rename (D-05), silent restore on app launch via `room-cad-last-project` idb-keyval pointer with WelcomeScreen fallback on load failure (D-02/D-02a). Phase 25 drag fast-path preserved (subscribe filter unchanged — no per-frame commits, no ui-store leak). Tests: 10/10 Phase 28 stubs green, full suite 204 passing (6 pre-existing unrelated failures). `SaveIndicator.tsx` left orphaned as deferred cleanup. SAVE-05 + SAVE-06 validated; 4 perceptual items persisted in `28-HUMAN-UAT.md` for browser follow-up. See `.planning/phases/28-auto-save/28-VERIFICATION.md`.

**v1.5 Performance & Tech Debt shipped 2026-04-20.** 4 phases, 15 plans. Tool architecture refactored (18 `(fc as any).__xToolCleanup` casts eliminated, closure state across all 6 tools, shared `toolUtils.ts`). Drag fast-path landed (`renderOnAddRemove: false`, mid-drag Fabric-only mutation, single commit on mouse:up — DevTools ~99.9% clean frames over 47.7s). `cadStore.snapshot()` migrated to `structuredClone(toPlain(...))` — D-07 contract met; ≥2× speedup target missed at tested scales (~1.25× slower due to Immer-draft unwrap) but absolute latency <0.3ms, non-user-visible (accepted as tech debt). Both bugs fixed: product thumbnail async render (#42 closed) and ceiling preset material closed as perception-only Outcome A with regression guards (#43 closed). R3F v9 / React 19 upgrade documented in `.planning/codebase/CONCERNS.md` and tracked on GH #56 (execution deferred until R3F v9 stabilizes). Test baseline grew 168 → 191 passing; same 6 pre-existing failures unrelated.

**v1.4 shipped 2026-04-08.** All 6 deferred v1.3 verification gaps closed: wainscot inline edit via `WainscotPopover` + FabricCanvas dblclick, frame color override with single-undo pattern, sidebar scroll fix via `min-h-0`, copy-side action verified with unit tests. Label cleanup removed ~125 underscores from user-facing display text across 30+ files while preserving code identifiers (Obsidian CAD display/identifier separation convention established). Plus 10 Jess Feedback bugs fixed in parallel via PR #39 (welcome screen, wall/ceiling drag, product persistence, wall side alignment).

**v1.3 shipped 2026-04-06.** Full paint system (132 Farrow & Ball + custom hex), lime wash finish, bulk painting via multi-select, custom element edit handles, collapsible sidebars, unified surface material catalog. 12/16 requirements shipped; 4 polish items deferred to and completed in v1.4.

**v1.2 shipped 2026-04-05.** 29 requirements across 7 phases. Ceilings, floor materials, wallpaper, wall art, wainscoting, crown molding, custom element builder, framed art library, 7 wainscoting styles, per-side wall treatments.

**v1.1 shipped 2026-04-05.** 21 UX fixes across 6 phases. Zoom/pan, click accuracy, tool auto-revert, live dimensions, wall rotation, product resize, corner-perfect walls, edit handles, save status, welcome screen.

**v1.0 shipped 2026-04-05.** 14 requirements. Product library → 2D plans → 3D rendering → walkthrough → export → auto-save.

See `.planning/ROADMAP.md` for links to each milestone archive.

## Current Milestone: v1.6 Editing UX

**Goal:** Close the daily-workflow gaps in 2D editing — Jessica can size walls precisely, resize without menus, snap intelligently, rename placed items, and never lose work.

**Target features (5 GH issues):**
- #44 Auto-save with debounce (status indicator in chrome)
- #46 Editable dimension labels (double-click label → type length)
- #60 Drag-to-resize products and walls
- #17 Smart snapping (walls, object edges, auto-center)
- #50 Per-placement label override for custom elements

**Key context:**
- #44 existed as SAVE-02 in v1.0 — this milestone tightens/completes the UX surface (status indicator, debounce behavior) that #44 still calls out
- #60 + #17 overlap heavily — both rework interactive 2D-canvas behavior; likely co-located in one phase
- #46 has precedent in v1.4 wainscot inline-edit (shared dblclick `useEffect` pattern)
- #50 is a small tack-on; pair with a related phase

Not in v1.6: #22 measurement/annotation (heavier — own milestone), #48 design redesign (blocked on mockups), #56 R3F v9 (deferred per D-02), 3D realism, library overhaul, materials engine, cloud sync, docs guides.

## Target User

One person. Non-technical. Interior design enthusiast, not a professional. Comfortable with basic computer use. Thinks visually. Saves products from Pinterest, Instagram, and store websites.

## Context

- Building a home — this is for planning real purchases
- Existing tools fail because they lock you into preset catalogs or are too complex
- Jessica wants HER products in HER rooms at the right scale
- "Feel the space" matters as much as "does it fit"
- Desktop-first (laptop/monitor). iPad is future wishlist, not v1.
- Codebase is ~14,355 LOC TypeScript across React 18 + Fabric.js + Three.js + Zustand (as of v1.5)

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

**v1.5 Milestone (shipped 2026-04-20) — 7 complete, 1 partial:**

- ✓ Tool cleanup uses type-safe pattern (no `(fc as any).__xToolCleanup` — activate returns cleanup fn, held in useRef) (TOOL-01, Phase 24)
- ✓ Tool state held in closures, not module-level singletons (3 wrapper interfaces dissolved) (TOOL-02, Phase 24)
- ✓ `pxToFeet` + `findClosestWall` extracted to shared `src/canvas/tools/toolUtils.ts` (6 duplicates consolidated) (TOOL-03, Phase 24)
- ✓ Drag fast-path: mouse:move mutates Fabric object only, single store commit on mouse:up (`renderOnAddRemove: false`) — DevTools trace shows ~99.9% clean frames during drag (PERF-01, Phase 25)
- ⚠ `cadStore.snapshot()` uses `structuredClone(toPlain(...))` per D-07 contract — 0 `JSON.parse(JSON.stringify)` remain (PERF-02, Phase 25) **Partial:** ≥2× speedup target not met at tested scales (~1.25× slower due to Immer draft unwrap cost), absolute latency <0.3ms — never user-visible. See `milestones/v1.5-MILESTONE-AUDIT.md` and `.planning/phases/25-canvas-store-performance/25-VERIFICATION.md`.
- ✓ Product thumbnails render in 2D canvas on async image load via `productImageTick` + Group rebuild (FIX-01 / #42, Phase 26)
- ✓ Ceiling preset material bug closed as Outcome A — perception-only (PLASTER vs PAINTED_DRYWALL below JND); 4 regression guards locked the round-trip (FIX-02 / #43, Phase 26)
- ✓ R3F v9 / React 19 upgrade path documented in `.planning/codebase/CONCERNS.md § R3F v9 / React 19 Upgrade` and tracked on GH #56 (TRACK-01, Phase 27) — execution deferred until R3F v9 stabilizes

### Active

v1.6 Editing UX — requirements being defined. Target issues: #44, #46, #60, #17, #50.

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
| Closure-scoped tool state (v1.5, Phase 24) | Module-level singletons risked cross-canvas bleed; closures make per-activation state the default. Public-API bridges (pendingProductId, _productLibrary) intentionally kept module-scoped per D-07. | ✓ Good — 3 wrapper interfaces dissolved; leak-regression tests lock behavior |
| Drag fast-path bypasses store mid-drag (v1.5, Phase 25, D-01..D-06) | Per-frame store commits blew 60fps at realistic scene sizes; Fabric-only mutation + single mouseup commit keeps undo/redo behavior and paints clean frames. | ✓ Good — ~99.9% clean frames over 47.7s drag, single undo entry per op |
| `structuredClone(toPlain(...))` snapshots (v1.5, Phase 25, D-07) | Cleaner than JSON roundtrip semantically (handles Dates, Maps in principle) and standards-aligned. Immer drafts require `current()`-normalization before clone. | ⚠ Partial — contract met, ≥2× speedup target missed (~1.25× slower at 50W/30P). Absolute latency <0.3ms — not user-visible. Accepted tech debt. |
| FIX-02 closed as perception-only Outcome A (v1.5, Phase 26) | End-to-end code path verified correct; PLASTER #f0ebe0 vs PAINTED_DRYWALL #f5f5f5 differ ~3 L* — below JND. Regression guards added to lock the store setter → snapshot → JSON round-trip contract. | ✓ Good — GH #43 closed, 4 new tests |
| R3F v9 / React 19 upgrade: document now, execute later (v1.5, Phase 27, D-02) | Target majors locked (^9 R3F, ^10 drei, ^19 React); upgrade is documentation-only until R3F v9 stabilizes out of beta. | ✓ Good — CONCERNS.md single source of truth, GH #56 as persistent tracker |

## Tech Stack (Current)

- React 18 + TypeScript + Vite 8
- Fabric.js v6 (2D CAD canvas)
- Three.js via @react-three/fiber v8 + drei v9 (3D viewport, walk mode via PointerLockControls)
- Zustand v5 + Immer (cadStore + uiStore + productStore + projectStore, undo/redo, auto-save)
- Tailwind CSS v4 (styling, Obsidian CAD theme inline in index.css)
- idb-keyval (IndexedDB persistence — projects + product library)
- Vitest + jsdom + @testing-library (191 passing tests + 3 todo; 6 pre-existing unrelated failures)
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
*Last updated: 2026-04-20 — v1.6 Editing UX scoping started (5 GH issues: #44, #46, #60, #17, #50)*
