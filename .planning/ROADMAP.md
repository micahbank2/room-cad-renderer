# Roadmap: Room CAD Renderer

## Overview

The foundation is built — room drawing, 3D view, product library, and save/load all exist. This roadmap completes the remaining 14 active requirements across five phases that follow Jessica's core workflow: interact with the 2D canvas confidently, manage a product library that works across all projects, see products rendered in 3D with real visual quality, feel the room from eye level, and eventually plan multiple rooms in one project.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: 2D Canvas Polish** - Fix product image rendering, drag-drop placement, rotation handles, dimension editing, and auto-save
- [ ] **Phase 2: Product Library** - Global library across projects, optional dimensions, and product search
- [ ] **Phase 3: 3D Product Rendering** - Textured products in 3D, smooth materials and shadows, and PNG export
- [ ] **Phase 4: 3D Walkthrough** - Eye-level camera to feel the room from inside
- [ ] **Phase 5: Multi-Room** - Multiple rooms per project and room templates

## Phase Details

### Phase 1: 2D Canvas Polish
**Goal**: The 2D canvas is fully interactive — product images are visible, products can be dragged and rotated, wall dimensions are editable, and work auto-saves
**Depends on**: Nothing (first phase — builds on existing foundation)
**Requirements**: EDIT-06, EDIT-07, EDIT-08, EDIT-09, SAVE-02
**Success Criteria** (what must be TRUE):
  1. A product with an uploaded image shows its image (not just a dashed border) when placed on the 2D canvas
  2. Jessica can drag a product from the library panel and drop it onto the canvas at the desired location
  3. A placed product shows rotation handles she can drag to spin it in place
  4. She can double-click a wall dimension label and type a new value to resize the wall
  5. After making any change, the project saves automatically within a few seconds — no explicit Save click required
**Plans**: 6 plans
  - [ ] 00-PLAN.md — Test infrastructure (Vitest + jsdom + stub test files)
  - [x] 01-PLAN.md — EDIT-09 product image rendering (cache + fabricSync fix)
  - [ ] 02-PLAN.md — EDIT-07 drag-drop placement (HTML5 DnD + auto-select)
  - [ ] 03-PLAN.md — EDIT-08 rotation handle (Figma-style + 15° snap + Shift free-rotate)
  - [ ] 04-PLAN.md — EDIT-06 dimension editing (dblclick overlay input + corner propagation)
  - [ ] 05-PLAN.md — SAVE-02 auto-save (2s debounce + projectStore + SaveIndicator)
**UI hint**: yes

### Phase 2: Product Library
**Goal**: The product library works as a permanent personal catalog — products added once are available in every project, dimensions are optional, and products are searchable
**Depends on**: Phase 1
**Requirements**: LIB-03, LIB-04, LIB-05
**Success Criteria** (what must be TRUE):
  1. A product Jessica uploads in Project A appears in the library when she opens Project B
  2. She can add a product with only an image and name — dimension fields are optional and skippable
  3. She can type part of a product name into a search field and see only matching results
**Plans**: 5 plans
  - [ ] 02-00-PLAN.md — Test stubs (Wave 0 scaffolding for productStore/helpers/search/modal/picker)
  - [ ] 02-01-PLAN.md — productStore + nullable Product dims + helpers (LIB-03/04 core)
  - [ ] 02-02-PLAN.md — Skip dimensions UI + SIZE:UNSET + PropertiesPanel editable dims (LIB-04)
  - [ ] 02-03-PLAN.md — App/Sidebar store consolidation + SidebarProductPicker (LIB-03/05)
  - [ ] 02-04-PLAN.md — Orphan/null-dim rendering in fabricSync + ProductMesh + selectTool (LIB-03/04)

### Phase 3: 3D Product Rendering
**Goal**: Products appear in the 3D view with their actual uploaded images as textures, the scene looks visually rich with proper materials and soft shadows, and she can capture the view as a PNG
**Depends on**: Phase 2
**Requirements**: VIZ-04, VIZ-06, SAVE-03
**Success Criteria** (what must be TRUE):
  1. A couch product with an uploaded image shows that image mapped onto its 3D box in the Three.js viewport
  2. The 3D scene has a visible floor surface, soft ambient shadows, and materials that feel closer to a real render than placeholder geometry
  3. Jessica can click Export and save the current 3D view as a PNG image file
**Plans**: 6 plans
  - [ ] 00-PLAN.md — Test infrastructure (Vitest + jsdom + stub test files)
  - [x] 01-PLAN.md — EDIT-09 product image rendering (cache + fabricSync fix)
  - [ ] 02-PLAN.md — EDIT-07 drag-drop placement (HTML5 DnD + auto-select)
  - [ ] 03-PLAN.md — EDIT-08 rotation handle (Figma-style + 15° snap + Shift free-rotate)
  - [ ] 04-PLAN.md — EDIT-06 dimension editing (dblclick overlay input + corner propagation)
  - [ ] 05-PLAN.md — SAVE-02 auto-save (2s debounce + projectStore + SaveIndicator)
**UI hint**: yes

### Phase 4: 3D Walkthrough
**Goal**: Jessica can switch to an eye-level camera and navigate through the room as if standing inside it — the core "feel the space" moment
**Depends on**: Phase 3
**Requirements**: VIZ-05
**Success Criteria** (what must be TRUE):
  1. A "Walk" or "Eye Level" button switches the 3D viewport from orbit camera to a first-person perspective at roughly standing height
  2. She can use arrow keys or WASD to move through the room and look around
  3. Switching back to orbit view restores the previous orbit camera position
**Plans**: 6 plans
  - [ ] 00-PLAN.md — Test infrastructure (Vitest + jsdom + stub test files)
  - [x] 01-PLAN.md — EDIT-09 product image rendering (cache + fabricSync fix)
  - [ ] 02-PLAN.md — EDIT-07 drag-drop placement (HTML5 DnD + auto-select)
  - [ ] 03-PLAN.md — EDIT-08 rotation handle (Figma-style + 15° snap + Shift free-rotate)
  - [ ] 04-PLAN.md — EDIT-06 dimension editing (dblclick overlay input + corner propagation)
  - [ ] 05-PLAN.md — SAVE-02 auto-save (2s debounce + projectStore + SaveIndicator)
**UI hint**: yes

### Phase 5: Multi-Room
**Goal**: A single project can contain multiple connected rooms, and Jessica can start from a preset template instead of drawing from scratch
**Depends on**: Phase 4
**Requirements**: ROOM-01, ROOM-02
**Success Criteria** (what must be TRUE):
  1. Jessica can add a second room to an existing project and switch between rooms in the same canvas view
  2. Room templates (living room, bedroom, kitchen) provide a pre-drawn room shape with typical dimensions she can accept or modify
  3. Products placed in one room do not appear in other rooms
**Plans**: 6 plans
  - [ ] 00-PLAN.md — Test infrastructure (Vitest + jsdom + stub test files)
  - [x] 01-PLAN.md — EDIT-09 product image rendering (cache + fabricSync fix)
  - [ ] 02-PLAN.md — EDIT-07 drag-drop placement (HTML5 DnD + auto-select)
  - [ ] 03-PLAN.md — EDIT-08 rotation handle (Figma-style + 15° snap + Shift free-rotate)
  - [ ] 04-PLAN.md — EDIT-06 dimension editing (dblclick overlay input + corner propagation)
  - [ ] 05-PLAN.md — SAVE-02 auto-save (2s debounce + projectStore + SaveIndicator)
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. 2D Canvas Polish | 0/TBD | Not started | - |
| 2. Product Library | 0/TBD | Not started | - |
| 3. 3D Product Rendering | 0/TBD | Not started | - |
| 4. 3D Walkthrough | 0/TBD | Not started | - |
| 5. Multi-Room | 0/TBD | Not started | - |
