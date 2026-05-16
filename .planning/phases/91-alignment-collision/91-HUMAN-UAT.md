---
status: partial
phase: 91-alignment-collision
source: [91-VERIFICATION.md]
started: 2026-05-16T01:30:00-04:00
updated: 2026-05-16T01:30:00-04:00
---

## Current Test

[awaiting human testing]

## Tests

### 1. Drag a product near another product → centers snap
expected: Place two chairs (or any products) in the room. Drag the second one toward the first. As their centers align horizontally (or vertically), a purple snap guide line should appear and the dragged product should click into perfect alignment. Try both axes.
result: [pending]

### 2. Drag near edges → edges align
expected: Same setup. Drag a product so its LEFT edge approaches another product's LEFT edge. Purple guide should appear and snap edge-to-edge. Try right, top, bottom too.
result: [pending]

### 3. Columns participate in snap (Phase 86 carry-over)
expected: Place a column + a chair. Drag the chair near the column → centers/edges snap with purple guide. Same in reverse — drag the column near a chair.
result: [pending]

### 4. Stairs as snap targets only
expected: Place a staircase. Drag a chair near it → snap fires (stair is a target). Try to drag the stair itself — should still NOT be draggable (no stair-drag in this phase per D-04).
result: [pending]

### 5. Silent collision refuse — drop on top is rejected
expected: Place two chairs. Try to drag chair B directly on top of chair A so they would overlap. The chair should NOT move into the overlapping position — it stays at the last valid spot. No error toast, no red highlight, no shake. Just won't go there.
result: [pending]

### 6. Walls don't trigger collision
expected: You should still be able to place chairs flush against (or even slightly overlapping) walls. Walls are not collision targets (per D-07). Verify by dragging a product right up against a wall — it goes.
result: [pending]

### 7. Phase 30 wall-snap still works
expected: Draw a new wall starting near an existing wall's endpoint → purple snap guide still appears as before. The new object-snap should not have broken the older wall-snap.
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
