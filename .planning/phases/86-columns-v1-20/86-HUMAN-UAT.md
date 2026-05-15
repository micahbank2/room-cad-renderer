---
status: partial
phase: 86-columns-v1-20
source: [86-VERIFICATION.md]
started: 2026-05-15T23:30:00-04:00
updated: 2026-05-15T23:30:00-04:00
---

## Current Test

[awaiting human testing]

## Tests

### 1. Place a column and see it in 2D + 3D
expected: Find the Cuboid icon (3D rectangular shape) in the Structure group on the floating toolbar — it sits next to the Stair icon. Click it. Then click somewhere inside a room on the 2D canvas. A square column footprint should appear at the click position. Switch to 3D view (or open Split). The same column should appear as a vertical pillar from floor to ceiling. After placement the tool auto-switches back to Select.
result: [pending]

### 2. Resize and rename a column from the inspector
expected: Click the placed column. Right inspector opens with three tabs: Dimensions / Material / Rotation. Dimensions tab shows 5 numeric inputs (Width / Depth / Height / X / Y). Change Width to 2, hit Enter — column gets wider in both 2D and 3D. There should also be a "Reset to wall height" button — change the column's Height to 4, hit Enter (column shrinks), then click Reset — column should snap back to the room's wall height (probably 8ft). One Ctrl+Z should revert that reset in a single step.
result: [pending]

### 3. Columns appear in the Rooms tree under the active room
expected: Open the Rooms tree on the left sidebar. Under your active room, there should now be a "Columns" group alongside Walls / Ceiling / Products / Custom Elements / Stairs. Your placed column appears as a leaf node with default name. Double-click to rename (e.g. "Entry Column"). Hover the row — the column should glow accent-purple on the 2D canvas. Click the eye icon — column hides from both 2D and 3D. Click again — it comes back.
result: [pending]

### 4. Columns persist across reload
expected: After placing + renaming a column, hit Cmd+R to reload the page. The column should still be there at the same position with the same dimensions and the renamed label.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
