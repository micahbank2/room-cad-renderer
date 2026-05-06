---
status: partial
phase: 60-stairs-stairs-01
source: [60-VERIFICATION.md]
started: 2026-05-05T00:00:00Z
updated: 2026-05-05T00:00:00Z
---

## How to test

Open the PR's Netlify preview link.

> 🪜 **The first new architectural primitive in months.** Phase 60 adds stairs to the toolbar. Click in 2D, place a stair. See it in 3D as actual stepped boxes. Configure rise/run/width/step count via the Properties panel.

## Tests

### 1. The Stairs tool appears in the Toolbar
Look at the Toolbar. You should see a new tool button with a stairs icon (small steps glyph). Hover over it — tooltip should say "Stairs".
result: [pending]

### 2. Click in 2D to place a stair
Click the Stairs tool. Click anywhere in your room. A stair should appear with the default config: 7" rise per step, 11" run per step, 36" wide, 12 steps. The 2D shape should be a rectangle outline with parallel horizontal lines (one per step) and a small arrow indicating the UP direction.
result: [pending]

### 3. Smart-snap to walls (Phase 30)
Click the Stairs tool. Drag the cursor near a wall. The stair should snap so its long edge sits flush against the wall. Hold Alt/Option to disable smart-snap.
result: [pending]

### 4. Switch to 3D — see actual stepped boxes
Place a stair, then switch to 3D view. You should see 12 stacked rectangular boxes that look like real stairs (each step visible, treads and risers obvious). The bottom step should rest on the floor.
result: [pending]

### 5. PropertiesPanel exposes stair configuration
Click the stair to select it. The Properties panel should show stair-specific inputs: Rise (inches), Run (inches), Step Count, Width (feet+inches), Rotation (degrees), Label (optional text). Edit any of them and the stair updates in both 2D and 3D.
result: [pending]

### 6. Width drag handle works (Phase 31 regression)
With a stair selected in 2D, drag one of the side edge handles. The stair should get wider/narrower. Top/bottom edges shouldn't have drag handles (length is determined by rise × step count, not draggable).
result: [pending]

### 7. Tree integration (Phase 46)
Open the Rooms tree in the sidebar. Expand a room — you should see a "STAIRS" group containing your placed stairs with a stairs icon next to each. Click a stair tree row to focus the camera on it.
result: [pending]

### 8. Right-click menu (Phase 53)
Right-click a stair (in 2D OR in 3D). A context menu should appear with all 6 product actions: Focus camera, Save camera here, Hide/Show, Copy, Paste, Delete.
result: [pending]

### 9. Click-to-select (Phase 54)
In 3D, click a stair. The Properties panel should update to show that stair's settings. (Same as the click-to-select that works on products and walls.)
result: [pending]

### 10. Save camera angle on a stair (Phase 48)
Select a stair in 3D. Orbit to a specific angle. Click "Save camera" in the Properties panel. The stair tree row should now show a small camera icon. Move the camera somewhere else, then double-click the stair tree row — the camera should snap back to your saved angle.
result: [pending]

### 11. Save and reload — stairs persist
Place a stair. Save the project. Reload the page. The stair should still be there with the same dimensions. (Tests the snapshot v3 → v4 migration.)
result: [pending]

### 12. Older projects still load
Open an existing project that was saved before this update. It should load normally — empty `stairs: {}` is added silently per room. No data loss, no error message.
result: [pending]

### 13. Phase 59 cutaway still works on walls
Make sure cutaway mode still works on regular walls — stairs shouldn't interfere with the wall ghosting logic.
result: [pending]

## Note on remaining v1.15 work

After Phase 60, two more architectural features ship:
- Phase 61 — Archway / passthrough / niche openings (extends doors+windows)
- Phase 62 — Measurement + annotation tools (dimension lines, labels, auto room-area)

## Summary

total: 13
passed: 0
issues: 0
pending: 13
skipped: 0
blocked: 0

## Gaps
