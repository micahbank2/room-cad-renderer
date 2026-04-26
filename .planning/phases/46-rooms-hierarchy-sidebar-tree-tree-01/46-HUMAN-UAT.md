---
status: partial
phase: 46-rooms-hierarchy-sidebar-tree-tree-01
source: [46-VERIFICATION.md]
started: 2026-04-25T22:38:00Z
updated: 2026-04-26T03:00:00Z
---

## How to test

**Easiest:** open the PR's Netlify preview link (it's posted as a comment on the PR), or pull this branch locally and run the dev server. Either way, just click around and check the items below.

## Tests

### 1. The Rooms panel exists at the top of the sidebar
Open the app. Look at the sidebar on the left. The very top item — above "Room config" — should be a "Rooms" panel with a − or + button to collapse it.
result: [pending]

### 2. The active room is expanded by default; others are collapsed
With one room ("Main Room"), it should appear already expanded — meaning you can see its child rows (walls, ceiling, products, custom elements). Add a second room — it should appear collapsed (only the room row visible, with a chevron pointing right).
result: [pending]

### 3. Clicking a wall row swings the 3D camera to face it
Switch to 3D view (or Split). Click a wall row inside the tree. The 3D camera should smoothly rotate to face that wall over about half a second.
result: [pending]

### 4. Reduced motion: camera snaps instantly instead of animating
Turn on macOS "Reduce motion" (System Settings → Accessibility → Display → Reduce motion). Reload the app. Click a wall row again — the camera should jump instantly to the new angle, no animation.
result: [pending]

### 5. The eye icon hides things in 3D
With the 3D view visible, click the eye icon next to a wall row in the tree. That wall should disappear in the 3D scene. Click again — it comes back. Same for products, ceiling, and custom elements. Click the eye icon next to the room itself — everything inside it should disappear.
result: [pending]

### 6. Hide-then-show preserves the child's hidden state (cascade)
Click the eye icon on a single wall to hide it. Then click the eye icon on the parent room — everything hides. Click the room's eye icon again to reveal — the original wall you hid first should still be hidden.
result: [pending]

### 7. Expand state survives a page reload
Collapse "Main Room" by clicking its chevron. Reload the page (Cmd+R). The room should still be collapsed. Expand it back — reload — it should still be expanded.
result: [pending]

### 8. Empty-state copy shows when a room has nothing in it
Create a brand-new project, but skip adding walls (or delete them all). Expand the room in the tree. You should see three italic gray rows: "No walls yet", "No products placed", "No custom elements placed".
result: [pending]

### 9. Visual styling matches the rest of the app
The rows should feel cohesive with the existing sidebar — IBM Plex Mono font, dark obsidian background, the selected row highlighted with the purple accent color and a left border. No layout glitches, no oversized icons.
result: [pending]

## Summary

total: 9
passed: 0
issues: 0
pending: 9
skipped: 0
blocked: 0

## Gaps
