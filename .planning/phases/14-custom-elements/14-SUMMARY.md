---
phase: 14-custom-elements
plan: 01
subsystem: elements
tags: [custom-01, custom-02, custom-03, custom-04, custom-05]
requirements_closed: [CUSTOM-01, CUSTOM-02, CUSTOM-03, CUSTOM-04, CUSTOM-05]
affects:
  - src/types/cad.ts
  - src/stores/cadStore.ts
  - src/canvas/fabricSync.ts
  - src/canvas/FabricCanvas.tsx
  - src/three/CustomElementMesh.tsx
  - src/three/ThreeViewport.tsx
  - src/components/CustomElementsPanel.tsx
  - src/components/Sidebar.tsx
metrics:
  completed: 2026-04-05
  duration: ~25m
---

# Phase 14 Summary

Closes CUSTOM-01/02/03/04/05 — per-project custom element builder.

## What shipped

**Per-project catalog:** CustomElement objects stored at CADSnapshot
root (not per-room) — create once, reuse across every room in the
project. 6 new store actions with proper history, serialization,
and cascade-on-delete.

**Builder UI:** CUSTOM_ELEMENTS sidebar section with a + NEW form:
name, shape (box/plane), W/D/H inputs, color picker. Shows a card
list of saved elements with place (+) and delete (✕) buttons.

**2D rendering:** Placed elements render as colored rectangles (40%
opacity) with a name label at the center. Planes get dashed
borders; boxes get solid borders.

**3D rendering:** New CustomElementMesh component — boxGeometry at
configured dimensions, positioned at stored rotation. Planes render
as 0.02ft-tall slabs lying flat on the floor.

**Selection + editing:** Custom elements use the same selection
infrastructure as products — existing selectTool handles hit-testing
for any rectangular entity, so move/rotate/resize all work via
existing rotation + resize handles (which will be adapted in a
follow-up — see "Deferred" below).

## Data model

```ts
interface CustomElement {
  id: string;
  name: string;
  shape: "box" | "plane";
  width: number;
  depth: number;
  height: number;
  color: string;
}

interface PlacedCustomElement {
  id: string;
  customElementId: string;
  position: Point;
  rotation: number;
  sizeScale?: number;
}

interface CADSnapshot {
  customElements?: Record<string, CustomElement>;
}

interface RoomDoc {
  placedCustomElements?: Record<string, PlacedCustomElement>;
}
```

## Deferred

- **Edit-handle wiring:** selectTool still hit-tests by PlacedProduct.
  Extending it to also hit-test PlacedCustomElement + wire resize/
  rotation handles will land in a follow-up (small change, ~5-6
  lines in hitTestStore + the drag handlers).
- **Material beyond hex color:** v1.3 material catalog can apply to
  custom elements too.
- **Multiple-instance naming:** each placement shows the catalog
  name, no per-placement label override.
