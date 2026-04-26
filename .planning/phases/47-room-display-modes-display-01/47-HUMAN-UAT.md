---
status: partial
phase: 47-room-display-modes-display-01
source: [47-VERIFICATION.md]
started: 2026-04-26T15:55:00Z
updated: 2026-04-26T15:55:00Z
---

## How to test

Open the PR's Netlify preview link, or pull the branch locally and run the dev server. Both work — Netlify preview is the quickest.

## Tests

### 1. Three new buttons appear in the Toolbar when in 3D
Switch to 3D view (or Split). In the Toolbar at the top, you should now see three buttons grouped together: NORMAL, SOLO, and EXPLODE. They should be near the camera-preset buttons (the eye-level / top-down / 3-quarter ones from before).
result: [pending]

### 2. The buttons disappear in 2D-only view
Switch to 2D plan view. The NORMAL/SOLO/EXPLODE buttons should disappear. They only matter in 3D.
result: [pending]

### 3. NORMAL is the default and shows all rooms
With at least 2 rooms in your project (use the "+ Add room" button if needed), click NORMAL. All your rooms should render together in the 3D scene, the way they always have.
result: [pending]

### 4. SOLO hides everything except the active room
Click SOLO. Only the room currently selected in the Rooms tree should be visible. Switch the active room (click another room in the tree) — the 3D view should swap to show only that one.
result: [pending]

### 5. EXPLODE separates rooms along the X-axis
Click EXPLODE. Your rooms should now appear side-by-side along the X-axis with space between them, like an exploded layout view. Each room is still readable as its own volume.
result: [pending]

### 6. Switching modes is instant
Click between NORMAL → SOLO → EXPLODE rapidly. There should be no animation, no fade — the scene snaps to the new layout instantly.
result: [pending]

### 7. SOLO + Phase 46 hidden walls compose correctly
While in NORMAL mode, hide a single wall using the eye icon in the Rooms tree. Then switch to SOLO. The wall should still be hidden inside the active room (SOLO doesn't reset your eye-icon hides). Switch back to NORMAL — the wall stays hidden.
result: [pending]

### 8. Mode persists across reload
Click EXPLODE. Reload the page (Cmd+R). When the app comes back, EXPLODE should still be the active mode. Same for SOLO.
result: [pending]

### 9. Active button has the purple highlight
Whichever mode is currently active should have the purple-tinted background and text + the purple border, matching how active toolbar buttons look elsewhere in the app.
result: [pending]

## Summary

total: 9
passed: 0
issues: 0
pending: 9
skipped: 0
blocked: 0

## Gaps
