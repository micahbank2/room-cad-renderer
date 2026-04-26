---
status: partial
phase: 48-per-node-saved-camera-focus-action-cam-04
source: [48-VERIFICATION.md]
started: 2026-04-26T16:30:00Z
updated: 2026-04-26T16:30:00Z
---

## How to test

Open the PR's Netlify preview link, or pull the branch locally and run the dev server. Either works.

## Tests

### 1. PropertiesPanel shows a "Save camera" button when a wall/product/ceiling/custom is selected
Switch to 3D (or Split). Click on any wall in the canvas (or the Rooms tree). The right-side Properties panel should now show a small purple-tinted "Save camera" button with a camera icon. Same for products, ceilings, and custom elements.
result: [pending]

### 2. The Save button is disabled in 2D-only view
Switch to 2D plan view. The Save camera button should still appear (when a wall/product is selected) but be greyed out and unclickable. Hover the button — tooltip says "Switch to 3D view to save a camera angle."
result: [pending]

### 3. Save captures the current 3D camera angle
In 3D view, select a wall. Orbit/zoom your camera to a specific angle you'd want to remember. Click Save camera. The button should remain in place; nothing visible should change in the scene. (The save is silent — the bookmark is stored on the node.)
result: [pending]

### 4. After saving, a Clear button appears next to Save
Once you've saved a camera, the Properties panel should show a second button next to Save: "Clear" with a "camera-off" icon. Click it — the saved camera is removed (the button disappears).
result: [pending]

### 5. The Rooms tree shows a small camera icon next to nodes that have a saved camera
After saving on at least one wall, look at the Rooms tree in the sidebar. Expand the room and walls group. The wall you saved should have a small purple-tinted camera icon next to its eye-toggle. Walls without a saved camera have no icon. Group rows (Walls, Products, etc.) and the room row itself never show the icon.
result: [pending]

### 6. Double-click on a saved-camera node animates the camera to that exact angle
With a saved camera on a wall, orbit your 3D camera to a different angle. Now double-click that wall row in the Rooms tree. The camera should smoothly tween over ~600ms back to the angle you saved.
result: [pending]

### 7. Double-click on a node WITHOUT a saved camera falls through to Phase 46 default focus
Pick a wall that has no saved camera (no camera icon in the tree). Double-click its row. The camera should focus on it the same way single-click does — facing it head-on. No dead clicks.
result: [pending]

### 8. Saved cameras survive a page reload
Save a camera on a wall. Wait ~3 seconds (autosave debounce). Reload the page (Cmd+R). After the project loads, the camera icon should still be on that wall in the tree. Double-click it — the camera tweens to the saved angle.
result: [pending]

### 9. Saving doesn't break Undo
Make a real edit to your project (move a wall, add a product). Then save a camera on something. Now hit Undo (Cmd+Z). The undo should reverse your wall edit — the saved camera state should NOT be undone (it's not in the history).
result: [pending]

### 10. Reduced-motion: camera snaps instantly instead of tweening
Turn on macOS Reduce Motion (System Settings → Accessibility → Display). Double-click a saved-camera node. Instead of a smooth ~600ms animation, the camera should snap immediately to the saved angle.
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0
blocked: 0

## Gaps
