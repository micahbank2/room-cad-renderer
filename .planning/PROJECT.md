# Room CAD Renderer — Project Context

## What This Is

A personal interior design tool built for Jessica (Micah's wife) to plan and visualize their future home. She uploads products she actually loves — from Pinterest, specific stores, real items she's considering — places them in dimensionally accurate multi-room layouts, and walks through the space in 3D at eye level before buying anything.

This is a single-user personal tool. Not a SaaS, not a professional CAD app, not a collaboration platform.

## Core Value

**Jessica can see her future room with her actual furniture before spending money.** The magic moment: she uploads a photo of a couch she found, places it in a room with real dimensions, switches to walk mode, and feels whether it works.

## Current State

**v1.0 shipped 2026-04-05.** All 14 active v1 requirements validated end-to-end. The core loop works: global product library → dimensionally accurate 2D floor plans → textured 3D rendering → eye-level walkthrough → PNG export → auto-saved + restored on reload.

See `.planning/MILESTONES.md` for shipped work. Multi-room projects (ROOM-01/02) and walk mode (VIZ-05) both work across room switches after Phase 5.1 closed the audit gaps.

## Target User

One person. Non-technical. Interior design enthusiast, not a professional. Comfortable with basic computer use. Thinks visually. Saves products from Pinterest, Instagram, and store websites.

## Context

- Building a home — this is for planning real purchases
- Existing tools fail because they lock you into preset catalogs or are too complex
- Jessica wants HER products in HER rooms at the right scale
- "Feel the space" matters as much as "does it fit"
- Desktop-first (laptop/monitor). iPad is future wishlist, not v1.
- Codebase is ~4,900 LOC TypeScript across React 18 + Fabric.js + Three.js + Zustand

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

### Active (v1.1 UX Fixes & Polish)

**2D canvas navigation:**
- [ ] Zoom + pan + fit-to-view on 2D canvas
**Placement & interaction fixes:**
- [ ] Door/window clicks land at cursor (accuracy fix)
- [ ] Auto-revert to Select after placing element
- [ ] Rotate already-placed walls/doors/windows
- [ ] Live dimension display while drawing walls
- [ ] Size tag while resizing products (Google-Slides style)
**Home page + save + tabs:**
- [ ] Welcome screen: 2 CTAs (Create vs Upload)
- [ ] FLOOR_PLAN top-level tab
- [ ] Template browser works (Living Room, Bedroom, Kitchen)
- [ ] Auto-save status prominently visible
- [ ] Remove/wire broken sidebar tabs
**Wall rendering polish:**
- [ ] X-junctions (3+ walls at one point) render clean
- [ ] Dead-end wall caps (cleaner than perpendicular butt)
- [ ] Walls crossing mid-segment render with correct overlap
**Google-Slides-style edit handles:**
- [ ] Wall endpoint drag handles (extend/shorten walls)
- [ ] Wall thickness handle
- [ ] Door/window width resize handles
- [ ] Door/window reposition along host wall
- [ ] Live dimension tag during any drag

### Planned (v1.2 New Element Types)
- Ceilings
- Editable floors
- Wallpaper & wall art (wall surface overlays)
- Wainscoting + crown molding presets
- Freeform custom-element builder

### Planned (v1.3 Color & Paint System)
- Color/paint library (global)
- Farrow & Ball catalog (~130 colors)
- Custom color creation + save
- Lime wash toggle (filter/shader)
- Apply paint to walls + ceilings (2D + 3D)

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

## Next Milestone Goals

v1.1 UX Fixes & Polish — make the app usable without workarounds. See ROADMAP.md for full phase breakdown.

Key fixes driving v1.1:
- 2D canvas zoom/pan is missing (critical — makes larger rooms unworkable)
- Click-placement offset bug (door lands next to wall, not on cursor)
- Tools stay sticky after placing (should auto-revert to Select)
- No live measurements while drawing
- Home page flow needs refocusing on 2 CTAs
- Broken nav tabs (LAYERS/ASSETS/MEASURE/HISTORY) either wired up or removed

After v1.1: v1.2 adds ceilings/floors/surfaces/custom elements, v1.3 adds the color & paint system with Farrow & Ball catalog and lime wash.

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
*Last updated: 2026-04-05 after v1.0 milestone*
