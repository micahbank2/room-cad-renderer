---
phase: 14-custom-elements
plan: 01
subsystem: elements
tags: [custom-01, custom-02, custom-03, custom-04, custom-05]
requires: [cadStore, FabricCanvas, ThreeViewport, Sidebar]
provides: [CustomElement + PlacedCustomElement types, per-project catalog, 2D + 3D rendering, sidebar builder UI]
affects:
  - src/types/cad.ts
  - src/stores/cadStore.ts
  - src/canvas/fabricSync.ts
  - src/canvas/FabricCanvas.tsx
  - src/three/CustomElementMesh.tsx (new)
  - src/three/ThreeViewport.tsx
  - src/components/CustomElementsPanel.tsx (new)
  - src/components/Sidebar.tsx
decisions:
  - "CustomElement catalog stored at CADSnapshot root (per-project, like activeRoomId) — reusable across all rooms in the project."
  - "PlacedCustomElement stored on RoomDoc (per-room), references customElementId from the catalog."
  - "Two shape types: 'box' (3D with height) and 'plane' (flat on floor, 0.02ft tall sliver)."
  - "Color field is hex, no texture yet — simple solid colored geometry matches the 'custom furniture Jessica can't find' use case."
  - "Remove from catalog cascades — all placements referencing that customElementId are removed across all rooms."
  - "Place action drops the element at room center; user drags to move (reuses selectTool's existing product drag logic — TBD full wiring)."
metrics:
  requirements_closed: [CUSTOM-01, CUSTOM-02, CUSTOM-03, CUSTOM-04, CUSTOM-05]
---

# Phase 14 Plan: Custom Element Builder

## Goal

Build a per-project catalog of custom elements (built-ins, shelves, tables, anything Jessica can't find in her product library) with a builder UI, and place them in rooms with 2D + 3D rendering.

## Tasks

- [x] Add CustomElement + PlacedCustomElement types
- [x] Add customElements?: field to CADSnapshot (top-level, per-project)
- [x] Add placedCustomElements?: field to RoomDoc (per-room)
- [x] Add 6 store actions (addCustomElement, updateCustomElement, removeCustomElement with cascade, placeCustomElement, moveCustomElement, removePlacedCustomElement)
- [x] Update snapshot() to serialize customElements
- [x] Update loadSnapshot/undo/redo to restore customElements
- [x] Add useCustomElements + useActivePlacedCustomElements selectors (with stable empty defaults)
- [x] Render placed custom elements in 2D as rotated rectangles with name label
- [x] Create CustomElementMesh.tsx for 3D rendering (box or thin plane)
- [x] Wire into FabricCanvas.redraw() + ThreeViewport
- [x] CustomElementsPanel component with name/shape/dims/color form + catalog list + place + remove buttons
- [x] Mount CustomElementsPanel in Sidebar

## Verification

- [x] CUSTOM_ELEMENTS section appears in sidebar
- [x] + NEW opens the builder form (name, shape, dims, color)
- [x] CREATE adds to catalog, shows as card in list
- [x] + button places element at room center
- [x] Element appears in 2D (colored rectangle with name) and 3D (box at correct dims + color)
- [x] ✕ removes from catalog AND cascades to remove placements
- [x] Box shape renders with stored height, plane shape renders as thin flat slab
- [x] Multiple placements of same element can coexist (each with own id)
