---
status: partial
phase: 54-props3d-01-properties-panel-3d
source: [54-VERIFICATION.md]
started: 2026-04-28T17:00:00Z
updated: 2026-04-28T17:00:00Z
---

## How to test

Open the PR's Netlify preview link.

## Tests

### 1. Click a wall in 3D selects it
Switch to 3D view. Left-click a wall. The Properties panel on the right side of the canvas should now show that wall's properties (length, thickness, height, etc.). Before this phase, nothing happened on click.
result: [pending]

### 2. Same for products
Place a product. Switch to 3D. Click the product. Properties panel shows product details (name, dimensions, rotation).
result: [pending]

### 3. Same for ceilings
With a ceiling visible, click it in 3D. Properties panel shows ceiling info.
result: [pending]

### 4. Same for custom elements
Place a custom element (e.g., a framed art). Click it in 3D. Properties panel shows it.
result: [pending]

### 5. Click empty 3D space deselects
Select a wall (click it). Then click empty 3D space (sky / floor / nothing). Selection clears, Properties panel returns to its empty state ("Select something").
result: [pending]

### 6. Orbit-drag doesn't deselect
Select a wall. Then click + drag in empty space to orbit the camera. While dragging, your selection should NOT clear. (The drag-threshold guard distinguishes click from drag — only movements under 5 pixels count as clicks.)
result: [pending]

### 7. Split view: click in 3D updates the panel
Switch to split view. Click a wall in the 3D pane (right side). The Properties panel on the left (in the 2D pane) should update to show that wall's properties.
result: [pending]

### 8. Split view: 2D click still works (regression check)
In split view, click a wall in the 2D pane. Properties panel updates. (This was working before; confirming nothing broke.)
result: [pending]

### 9. Right-click still opens context menu (Phase 53 regression)
Right-click any wall in 3D. The context menu from Phase 53 should still open with all 5 actions. Left-click and right-click are independent.
result: [pending]

### 10. Save camera button works after 3D click (Phase 48 regression)
Click a wall in 3D to select it. The Properties panel should show the "Save camera" button. Click it. The Rooms tree should now show a small camera icon next to that wall.
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0
blocked: 0

## Gaps
