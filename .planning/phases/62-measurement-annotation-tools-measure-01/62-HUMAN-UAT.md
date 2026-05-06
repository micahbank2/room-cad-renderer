---
status: partial
phase: 62-measurement-annotation-tools-measure-01
source: [62-VERIFICATION.md]
started: 2026-05-06T00:00:00Z
updated: 2026-05-06T00:00:00Z
---

## How to test

Open the PR's Netlify preview link.

> 📐 **The v1.15 closer.** Three documentation features for the 2D plan view: dimension lines, free-form text labels, and auto room-area calculation. Phase 62 ends v1.15 — after this merges, the architectural toolbar work is done.

## Tests

### 1. Measure tool appears in the tool palette
Look at the vertical tool palette (left side). You should see a new Measure tool (lucide ruler icon). Hover — tooltip should say something like "Measure (M)".
result: [pending]

### 2. Place a dimension line
Click the Measure tool. Click anywhere in the 2D plan view (first endpoint). Move your mouse — a ghost preview line should follow the cursor. Click again somewhere else (second endpoint). A dimension line appears between the two points with a measurement label in the middle (e.g. `8'-6"`).
result: [pending]

### 3. Smart-snap to wall endpoints
Click the Measure tool. Drag the cursor near a wall corner. The preview line endpoint should snap to the wall's endpoint (Phase 30 smart-snap). Hold Alt to disable snap. Place the second endpoint similarly — it should snap to other wall corners.
result: [pending]

### 4. Label tool — click to place + immediate edit
Click the Label tool (lucide Type icon, keyboard `T`). Click anywhere in the 2D plan view. A text input should appear at the click point in edit mode. Type "Closet" and press Enter. The label should appear at the click point.
result: [pending]

### 5. Empty label removes itself
Click the Label tool. Click in the canvas. Without typing anything, press Enter (or click outside). The empty placeholder should disappear — no label is created. This is by design: labels with no text are useless.
result: [pending]

### 6. Double-click an existing label to edit
Place a label (test 4). Click somewhere else to deselect. Double-click the label. The text input should reappear in edit mode with the existing text. Type new text and press Enter — the label updates.
result: [pending]

### 7. Auto room-area in the Properties panel
Click empty canvas (no entity selected). The Properties panel should show a Room properties section including `AREA: XX SQ FT` for the active room. Drag a wall to make the room bigger — the area should recalculate live.
result: [pending]

### 8. Room-area overlay on the 2D canvas
Look at the 2D plan view. Each room should show its area in the center as a subtle text overlay (e.g. `100 SQ FT`). Same value as the Properties panel.
result: [pending]

### 9. Right-click menus on annotations
Right-click on a placed dimension line. The context menu should have ONE action: Delete. Right-click on a placed text label. The menu should have TWO actions: Edit text, Delete.
result: [pending]

### 10. Click-to-select on annotations
Click on a dimension line — it should highlight (selected state). Click on a label — it should highlight. Click empty canvas to deselect.
result: [pending]

### 11. Drag dimension endpoints
Click a dimension line to select it. Drag either endpoint — the line should follow your drag and the measurement label should update live (e.g. `8'-6"` → `12'-3"` as you drag). Single Ctrl+Z should undo the entire drag (one history entry, not many).
result: [pending]

### 12. Drag labels to move them
Click a label to select it. Drag the body — it should translate with your drag. Single Ctrl+Z should undo the move (one history entry).
result: [pending]

### 13. Save and reload — annotations persist
Place a dimension and a label. Save the project. Reload the page. Both should still be there with the same positions and text. (Tests the snapshot v4 → v5 migration.)
result: [pending]

### 14. Older project files still load
Open a project saved before this update (with stairs/openings but no annotations). It should load normally with no errors. The new measurement/annotation features are simply absent — everything else works.
result: [pending]

### 15. Switch to 3D — annotations are NOT visible (by design)
With dimensions and labels placed in 2D, switch to 3D view. The annotations should NOT appear in 3D — they're documentation-only for the plan view. Switch back to 2D — annotations reappear. (This was a deliberate v1.15 scope choice; 3D measurements deferred to v1.16+ if requested.)
result: [pending]

## Note: v1.15 milestone closes after this phase merges

After Phase 62 merges, the v1.15 Architectural Toolbar Expansion milestone is complete:
- Phase 59 — Wall cutaway mode
- Phase 60 — Stairs
- Phase 61 — Openings (archway / passthrough / niche)
- Phase 62 — Measurement + annotation tools

## Summary

total: 15
passed: 0
issues: 0
pending: 15
skipped: 0
blocked: 0

## Gaps
