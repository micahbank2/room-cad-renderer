# Room CAD Renderer — Project Context

## What This Is

A personal interior design tool built for Jessica (Micah's wife) to plan and visualize their future home. She uploads products she actually loves — from Pinterest, specific stores, real items she's considering — places them in dimensionally accurate multi-room layouts, and walks through the space in 3D at eye level before buying anything.

This is a single-user personal tool. Not a SaaS, not a professional CAD app, not a collaboration platform.

## Core Value

**Jessica can see her future room with her actual furniture before spending money.** The magic moment: she uploads a photo of a couch she found, places it in a room with real dimensions, switches to walk mode, and feels whether it works.

## Current State

**v1.7.5 Design System & UI Polish — Phase 33 shipped 2026-04-22.** 10 plans across 3 waves. Foundation tokens (`--text-*` / `--spacing-*` / `--radius-*` on Tailwind v4 @theme, `--radius-lg` 6→8px) + `lucide-react` installed. Typography ramp (mixed-case section/panel/button labels; UPPERCASE preserved for dynamic IDs, status strings, unit value labels per D-03/D-04/D-05). Zero arbitrary `p-[Npx]` / `m-[Npx]` / `rounded-[Npx]` / `gap-[Npx]` across Toolbar/Sidebar/PropertiesPanel/RoomSettings. Shared `useReducedMotion` hook, `CollapsibleSection` primitive with localStorage persistence (10 PropertiesPanel sections wrapped), `LibraryCard` + `CategoryTabs` primitives (ProductLibrary + CustomElementsPanel migrated; WainscotLibrary / Paint/Material / FramedArt deferred per D-31), `FloatingSelectionToolbar` (Duplicate + Delete above bbox), `GestureChip` (dismissible, 2D + 3D variants), rotation preset chips `[-90,-45,0,45,90]` with single-undo contract, `InlineEditableText` primitive (doc title + room tabs click-to-edit via Phase 31 LabelOverrideInput pattern). Closes GH #83-#90. Test baseline grew 340 → 424 passing (+45 Phase 33 tests + 39 other net); same pre-existing LIB-03/04/05 + App.restore failures unrelated (now 6, was 8 on main — improved by 2).

**v1.6 Editing UX shipped 2026-04-21.** 4 phases, 17 plans, 11/11 requirements complete (audit `passed`). Auto-save with debounce + SAVING/SAVED/SAVE_FAILED toolbar status + pointer-based silent restore on reload (Phase 28: SAVE-05, SAVE-06). Editable dimension labels via double-click overlay with feet+inches parser, single-undo guard preserved (Phase 29: EDIT-20, EDIT-21). Smart snapping with pure 427-LOC `snapEngine.ts` + Fabric `snapGuides.ts` renderer, edge/midpoint snap, accent-purple axis guides, Alt/Option disables (Phase 30: SNAP-01, SNAP-02, SNAP-03). Drag-to-resize with corner uniform + edge per-axis handles on products and custom elements; wall-endpoint drag with smart-snap closing Phase 30 D-08b deferral; per-placement label override on custom elements via `PropertiesPanel` input + live 2D render via `resolveEffectiveDims` resolver (Phase 31: EDIT-22, EDIT-23, EDIT-24, CUSTOM-06). Phase 25 drag fast-path preserved across all new editing branches (single undo entry per drag op). Test baseline grew 191 → 340 passing; same 6 pre-existing LIB-03/04/05 failures unrelated. 21 perceptual items auto-approved across 4 HUMAN-UAT.md files. Tech debt: orphan `SaveIndicator.tsx`, legacy `effectiveDimensions` coexists with `resolveEffectiveDims` (incremental migration).

**v1.5 Performance & Tech Debt shipped 2026-04-20.** 4 phases, 15 plans. Tool architecture refactored (18 `(fc as any).__xToolCleanup` casts eliminated, closure state across all 6 tools, shared `toolUtils.ts`). Drag fast-path landed (`renderOnAddRemove: false`, mid-drag Fabric-only mutation, single commit on mouse:up — DevTools ~99.9% clean frames over 47.7s). `cadStore.snapshot()` migrated to `structuredClone(toPlain(...))` — D-07 contract met; ≥2× speedup target missed at tested scales (~1.25× slower due to Immer-draft unwrap) but absolute latency <0.3ms, non-user-visible (accepted as tech debt). Both bugs fixed: product thumbnail async render (#42 closed) and ceiling preset material closed as perception-only Outcome A with regression guards (#43 closed). R3F v9 / React 19 upgrade documented in `.planning/codebase/CONCERNS.md` and tracked on GH #56 (execution deferred until R3F v9 stabilizes). Test baseline grew 168 → 191 passing; same 6 pre-existing failures unrelated.

**v1.4 shipped 2026-04-08.** All 6 deferred v1.3 verification gaps closed: wainscot inline edit via `WainscotPopover` + FabricCanvas dblclick, frame color override with single-undo pattern, sidebar scroll fix via `min-h-0`, copy-side action verified with unit tests. Label cleanup removed ~125 underscores from user-facing display text across 30+ files while preserving code identifiers (Obsidian CAD display/identifier separation convention established). Plus 10 Jess Feedback bugs fixed in parallel via PR #39 (welcome screen, wall/ceiling drag, product persistence, wall side alignment).

**v1.3 shipped 2026-04-06.** Full paint system (132 Farrow & Ball + custom hex), lime wash finish, bulk painting via multi-select, custom element edit handles, collapsible sidebars, unified surface material catalog. 12/16 requirements shipped; 4 polish items deferred to and completed in v1.4.

**v1.2 shipped 2026-04-05.** 29 requirements across 7 phases. Ceilings, floor materials, wallpaper, wall art, wainscoting, crown molding, custom element builder, framed art library, 7 wainscoting styles, per-side wall treatments.

**v1.1 shipped 2026-04-05.** 21 UX fixes across 6 phases. Zoom/pan, click accuracy, tool auto-revert, live dimensions, wall rotation, product resize, corner-perfect walls, edit handles, save status, welcome screen.

**v1.0 shipped 2026-04-05.** 14 requirements. Product library → 2D plans → 3D rendering → walkthrough → export → auto-save.

See `.planning/ROADMAP.md` for links to each milestone archive.

## Current Milestone: v1.7 3D Realism

**Goal:** Make Jessica's 3D view feel like the actual room — physically-based materials replace flat-color placeholders, she can drop in textures from photos of real surfaces she's considering, and she can switch camera angles to evaluate the space from multiple vantage points.

**Target features:**
- **PBR material upgrade (#61)** — `WOOD_PLANK`, `CONCRETE`, `PLASTER` get albedo + normal + roughness maps; existing `PAINTED_DRYWALL` keeps current treatment
- **User-uploaded textures (#47)** — Jessica drops a single image → albedo, with optional advanced pathway to add normal/roughness for full PBR
- **Camera presets (#45)** — eye-level, top-down, 3/4 (current default), corner; toolbar buttons + `1/2/3/4` keyboard switch with smooth tween
- **Tech-debt sweep** — close GH #44/#46/#50/#60 (v1.6 commits), delete orphan `SaveIndicator.tsx`, finish `effectiveDimensions` → `resolveEffectiveDims` migration in `productTool` placement, backfill Phase 29 SUMMARY frontmatter

**Phase numbering:** continues from 32. Estimated 4–5 phases.

**Out of v1.7:** GLTF/OBJ upload (#29 — Out of Scope per PROJECT), cloud sync (#30 — Out of Scope), design system redesign (#48 — blocked on mockups), R3F v9 / React 19 (#56 — deferred per D-02). Library overhaul, materials engine, parametric, architectural breadth all queued for v1.8+.

**Why this milestone, why now:** Core Value is "Jessica can SEE her future room with her actual furniture before spending money." v1.0–v1.6 perfected the 2D editing + persistence + interaction layer; the SEEING side is 3D, and the realism gap is now the loudest friction. PBR + user textures compound directly on top of every prior milestone's work.

## Target User

One person. Non-technical. Interior design enthusiast, not a professional. Comfortable with basic computer use. Thinks visually. Saves products from Pinterest, Instagram, and store websites.

## Context

- Building a home — this is for planning real purchases
- Existing tools fail because they lock you into preset catalogs or are too complex
- Jessica wants HER products in HER rooms at the right scale
- "Feel the space" matters as much as "does it fit"
- Desktop-first (laptop/monitor). iPad is future wishlist, not v1.
- Codebase grew ~17.1K insertions across v1.6 (auto-save hardening, dim-label parser, snapEngine + snapGuides, resizeHandles + wallEndpointSnap + resolver) on top of v1.5's ~14,355 LOC baseline

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

**v1.6 Milestone (shipped 2026-04-21) — 11 complete:**

- ✓ CAD scene auto-saves within ~2s of last edit; debounced so continuous drag does not cause save spam (SAVE-05, Phase 28)
- ✓ Toolbar shows `SAVING...` / `SAVED` / `SAVE_FAILED` via the v1.1 SAVE-04 surface (SAVE-06, Phase 28)
- ✓ Double-clicking a wall dimension label opens a feet+inches overlay input; Enter commits, Escape cancels; wall resizes from start point along existing angle (EDIT-20, Phase 29)
- ✓ Each dimension-label edit produces exactly one undo entry (EDIT-21, Phase 29)
- ✓ Selected product shows corner (uniform) + edge (per-axis) resize handles; drag updates `widthFt` / `lengthFt` with override schema, snapped to active grid (EDIT-22, Phase 31)
- ✓ Selected wall shows endpoint handles with smart-snap; Shift constrains orthogonal; Alt disables snap (EDIT-23, Phase 31)
- ✓ Drag-resize commits single undo entry at mouse-up; Phase 25 `shouldSkipRedrawDuringDrag` + `renderOnAddRemove:false` fast-path preserved (EDIT-24, Phase 31)
- ✓ Object edges snap to nearby wall + object edges within pixel tolerance, during both placement and repositioning (SNAP-01, Phase 30)
- ✓ Midpoint auto-centering on walls during drag (SNAP-02, Phase 30)
- ✓ Visible purple accent axis guide + midpoint dot appears on snap engagement, disappears on drag-end (SNAP-03, Phase 30)
- ✓ Placed custom elements accept a per-placement label override via `PropertiesPanel` input; 2D canvas renders override; empty reverts to catalog name; persists through save/load + undo (CUSTOM-06, Phase 31)

### Active

v1.7 not yet scoped. Run `/gsd:new-milestone` to define next milestone requirements.

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
| Pointer-based silent restore on app mount (v1.6, Phase 28, D-02/D-02a/D-02b) | Replaces broken listProjects hydration; single-write site in `useAutoSave` stores `room-cad-last-project` pointer; mount-time read in `App.tsx` loads last project or falls through to WelcomeScreen. | ✓ Good — reload restores scene exactly; WelcomeScreen only flashes on no-pointer or stale-pointer |
| SAVE_FAILED persists until next success, no auto-fade (v1.6, Phase 28, D-04a) | Jessica must see a failed save before closing the tab — auto-fade would hide data loss. | ✓ Good — `ToolbarSaveStatus` failed branch renders until next successful save clears it |
| Three-branch ordered regex for feet+inches parser (v1.6, Phase 29) | "First match wins" cleanly rejects ambiguous forms like `12 6` while accepting `12'6"`, `12'-6"`, `12ft 6in`, `6"`, decimals. | ✓ Good — 37/37 Phase 29 tests green |
| `window.__openDimensionEditor` / `__driveSnap` / `__drive*` test drivers (v1.6, Phase 29/30/31) | jsdom+fabric hit-test fragility makes pixel-accurate DOM events unreliable; driver bridges gated by `import.meta.env.MODE === "test"` let RTL specs exercise the underlying logic deterministically. | ✓ Good — locked into CLAUDE.md; zero production impact |
| Restricted wall-endpoint smart-snap scene (v1.6, Phase 30 D-08b → Phase 31 D-05) | Phase 30 deliberately left wall-endpoint drag untouched; Phase 31 built `wallEndpointSnap.ts` to exclude the wall being dragged from snap candidates, preventing self-snap degeneracy. | ✓ Good — 6/6 phase31WallEndpoint assertions green |
| Per-placement override schema — `widthFtOverride` / `depthFtOverride` / `labelOverride` (v1.6, Phase 31, D-02) | Placement-instance state separated from catalog state (Pitfall 4); `resolveEffectiveDims(placedProduct, product) = override ?? libraryDim × sizeScale`. | ✓ Good — resolver migration through 3D meshes, snap scene, fabricSync, selectTool |
| Edge-resize commits history at mousedown, not mouseup (v1.6, Phase 31, D-16) | Consistent with existing rotate/resize; mousedown snapshot is the pre-drag state; `*NoHistory` actions handle mid-drag. | ⚠ Minor — fires a history entry even if user starts drag but never moves. Consistent with existing patterns, accepted. |
| Legacy `effectiveDimensions` coexists with `resolveEffectiveDims` (v1.6, Phase 31) | Incremental migration — placement in productTool still uses legacy because fresh placements have no overrides; all consumers that handle PlacedProduct/PlacedCustomElement go through resolver. | — Pending — remaining legacy call-sites can be swept in v1.7 polish |

## Tech Stack (Current)

- React 18 + TypeScript + Vite 8
- Fabric.js v6 (2D CAD canvas)
- Three.js via @react-three/fiber v8 + drei v9 (3D viewport, walk mode via PointerLockControls)
- Zustand v5 + Immer (cadStore + uiStore + productStore + projectStore, undo/redo, auto-save)
- Tailwind CSS v4 (styling, Obsidian CAD theme inline in index.css)
- idb-keyval (IndexedDB persistence — projects + product library)
- Vitest + jsdom + @testing-library (340 passing tests + 3 todo; 6 pre-existing LIB-03/04/05 failures documented in deferred-items.md)
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
*Last updated: 2026-04-21 — v1.7 3D Realism scoped (PBR materials + user-uploaded textures + camera presets + tech-debt sweep)*
