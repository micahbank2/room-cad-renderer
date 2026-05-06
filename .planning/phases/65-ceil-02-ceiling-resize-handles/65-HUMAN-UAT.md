---
status: partial
phase: 65-ceil-02-ceiling-resize-handles
source: [65-VERIFICATION.md]
started: 2026-05-06T00:00:00Z
updated: 2026-05-06T00:00:00Z
---

## How to test

Open the PR's Netlify preview link.

> 🏠 **Ceilings can finally be resized without redrawing.** Click a ceiling to select it, drag the edge handles to make it bigger or smaller. Smart-snap to wall edges. Single Ctrl+Z undoes the whole drag. Right-click → Reset size returns to original.

## Tests

### 1. Edge handles appear when a ceiling is selected
Click a ceiling in 2D plan view. Four small handles should appear at the midpoints of the ceiling's bounding box (north, south, east, west). Same visual as the product edge-handles you've seen on furniture.
result: [pending]

### 2. Drag east edge → ceiling extends east, west stays put
Click + drag the east handle to the right. The ceiling should grow eastward. The west edge should NOT move. Same logic as resizing a product.
result: [pending]

### 3. Drag west edge → west moves with cursor, east stays put
Click + drag the west handle to the LEFT. The west edge should follow your cursor. The east edge should stay locked. (This is the trickier case — most CAD tools handle this badly. Verify it feels right.)
result: [pending]

### 4. Drag north / south edges
Same as #2 and #3 but vertical: south drag extends south, north drag pulls north edge with cursor.
result: [pending]

### 5. Smart-snap to wall edges
Drag any edge near a wall. The handle should snap to the wall edge (purple guide line appears, edge sits flush). Hold Alt to disable smart-snap.
result: [pending]

### 6. PropertiesPanel WIDTH and DEPTH update live
Click a ceiling. Properties panel shows WIDTH and DEPTH inputs (feet+inches). Drag any edge — both numbers should update in real time. Type a new value into WIDTH and press Enter — ceiling resizes to match.
result: [pending]

### 7. Single Ctrl+Z undoes the entire drag
Drag an edge from 10 feet to 14 feet. Press Ctrl+Z once. Ceiling should snap back to 10 feet. (Not 13.5 → 13 → 12.5 → 12 → ... etc. One drag = one undo step.)
result: [pending]

### 8. Right-click → Reset size returns to original
After resizing, right-click the ceiling. Context menu should show "Reset size" (visible only when overrides are set). Click it. Ceiling returns to its original drawn dimensions.
result: [pending]

### 9. PropertiesPanel RESET_SIZE button
Same effect via PropertiesPanel — when at least one override is set, a RESET_SIZE button appears. Click → ceiling reverts.
result: [pending]

### 10. L-shaped ceiling scales proportionally
Draw an L-shaped ceiling (5+ vertices forming an L). Resize it. Every vertex should scale uniformly along the dragged axis — the L shape preserves but stretches/squishes. (No vertex jumps around or breaks the polygon.)
result: [pending]

### 11. 3D view re-extrudes live
With ceiling resize in progress in 2D, switch to 3D OR use split view. The 3D mesh should re-extrude as you drag — no lag, no flicker, no incorrect geometry.
result: [pending]

### 12. Saved + reloaded — overrides persist
Resize a ceiling. Save the project. Reload the page. The ceiling should still be at its resized dimensions (overrides persist via the `widthFtOverride` / `depthFtOverride` / `anchorXFt` / `anchorYFt` fields in the snapshot).
result: [pending]

### 13. Older project files still load
Open a project saved before this update (no override fields). Ceilings should render at their original drawn shape exactly as before. No data loss, no errors.
result: [pending]

### 14. Existing ceiling features unchanged (regression)
Phase 18 paint, Phase 20 surface materials, Phase 34 user-textures, Phase 42 per-ceiling tile-size — all should still work on a resized ceiling. The resolved-points polygon is the rendering surface; everything else is unchanged.
result: [pending]

## Note on remaining v1.16 work

After Phase 65 (CEIL-02), one phase left:
- Phase 66 — TILE-02 per-surface tile-size override UI completion (#105)

## Summary

total: 14
passed: 0
issues: 0
pending: 14
skipped: 0
blocked: 0

## Gaps
