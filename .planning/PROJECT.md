# Room CAD Renderer — Project Context

## What This Is

A personal interior design tool built for Jessica (Micah's wife) to plan and visualize their future home. She uploads products she actually loves — from Pinterest, specific stores, real items she's considering — places them in dimensionally accurate room layouts, and sees the space in 3D before buying anything.

This is a single-user personal tool. Not a SaaS, not a professional CAD app, not a collaboration platform.

## Core Value

**Jessica can see her future room with her actual furniture before spending money.** The magic moment: she uploads a photo of a couch she found, places it in a room with real dimensions, rotates to 3D, and feels whether it works.

## Target User

One person. Non-technical. Interior design enthusiast, not a professional. Comfortable with basic computer use. Thinks visually. Saves products from Pinterest, Instagram, and store websites.

## Context

- Building a home — this is for planning real purchases
- Existing tools fail because they lock you into preset catalogs or are too complex
- Jessica wants HER products in HER rooms at the right scale
- "Feel the space" matters as much as "does it fit"
- Desktop-first (laptop/monitor). iPad is future wishlist, not v1.

## Requirements

### Validated

- ✓ 2D room drawing with real dimensions — existing
- ✓ Wall drawing tool with snap-to-grid — existing
- ✓ Door and window placement on walls — existing
- ✓ Product library with image upload, name, category, dimensions — existing
- ✓ Product placement on 2D canvas — existing
- ✓ 3D viewport with wall extrusion and lighting — existing
- ✓ Split view (2D + 3D side by side) — existing
- ✓ Undo/redo with history — existing
- ✓ Project save/load (IndexedDB) — existing
- ✓ Obsidian CAD design system applied — existing
- ✓ Welcome screen with blank room creation — existing
- ✓ Product images render in 2D canvas (async FabricImage cache) — Validated in Phase 01: 2d-canvas-polish (EDIT-09)
- ✓ Drag-and-drop from product library to canvas — Validated in Phase 01: 2d-canvas-polish (EDIT-07)
- ✓ Product rotation in 2D via handles — Validated in Phase 01: 2d-canvas-polish (EDIT-08)
- ✓ Editable dimension labels — Validated in Phase 01: 2d-canvas-polish (EDIT-06)
- ✓ Auto-save with debounce + status indicator — Validated in Phase 01: 2d-canvas-polish (SAVE-02)

### Active

- [ ] Global product library persists across all projects (currently per-project IndexedDB)
- [ ] Multi-room / whole-house floor plan support (connected rooms)
- [ ] Product dimensions are optional (image-only upload, approximate placement)
- [ ] 3D product rendering with uploaded textures (aesthetic vibe, not just placeholder boxes)
- [ ] Eye-level camera walkthrough in 3D (feel the room from inside)
- [ ] Room templates (living room, bedroom, kitchen presets)
- [ ] Smooth 3D experience (proper materials, shadows, ambient occlusion)

## Current State

Phase 01 (2D Canvas Polish) complete — canvas is now fully interactive with async image rendering, drag-drop placement, rotation handles, editable dimensions, and debounced auto-save.

### Out of Scope

- Multi-user / collaboration — single user only
- Export to contractors / CAD file formats — not needed
- Pricing integration / shopping lists — not for v1
- Mobile / iPad support — desktop only for now
- Professional drafting features (layers, annotations, blueprints)
- Backend / server / auth — stays local-first (IndexedDB)
- GLTF/OBJ 3D model upload — too complex for Jessica, stick with images

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Local-first, no backend | Single user, personal tool. IndexedDB is sufficient. | Active |
| Global product library | Jessica uploads products once and uses them across all room projects. | Active |
| Image-only products (no required 3D models) | Jessica saves screenshots from Pinterest/stores. 3D models are too technical. | Active |
| Optional dimensions | Some products she just wants to see in the space — vibes over precision for some items. | Active |
| Desktop-only | She'll use a laptop. iPad can come later. | Active |
| React 18 (not 19) | R3F 8 + drei 9 had hook errors with React 19. Downgraded for compatibility. | Locked |
| Obsidian CAD design system (DS8) | Dark theme, purple accents, monospace labels. DS1 for Welcome screen only. | Locked |
| Fabric.js for 2D, Three.js for 3D | Both read from same Zustand store. Neither mutates the other. | Locked |

## Tech Stack (Current)

- React 18 + TypeScript + Vite 8
- Fabric.js v6 (2D CAD canvas)
- Three.js via @react-three/fiber v8 + drei v9 (3D viewport)
- Zustand v5 + Immer (state management, undo/redo)
- Tailwind CSS v4 (styling)
- idb-keyval (IndexedDB persistence)
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
*Last updated: 2026-04-04 after initialization*
