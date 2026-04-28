---
status: partial
phase: 53-ctxmenu-01-right-click-context-menus
source: [53-VERIFICATION.md]
started: 2026-04-28T16:00:00Z
updated: 2026-04-28T16:00:00Z
---

## How to test

Open the PR's Netlify preview link.

## Tests

### 1. Right-click a wall in 2D opens a menu with 5 items
Switch to 2D view. Right-click on any wall. A small dark menu should appear right at your cursor with these 5 items in order: **Focus camera**, **Save camera here**, **Hide/Show**, **Copy**, **Delete**.
result: [pending]

### 2. Right-click a product in 3D opens a 6-item menu
Switch to 3D view. Place a product in your room. Right-click on it. The menu should show 6 items: **Focus camera**, **Save camera here**, **Hide/Show**, **Copy**, **Paste**, **Delete**.
result: [pending]

### 3. Right-click a ceiling shows just 3 items
With a ceiling visible (3D view), right-click it. Menu shows 3 items: **Focus camera**, **Save camera here**, **Hide/Show**. No Copy/Delete (ceilings aren't deletable through this path).
result: [pending]

### 4. Right-click a custom element shows 6 items including Rename
Place a custom element in a room. Right-click it. Menu shows: **Focus camera**, **Save camera here**, **Hide/Show**, **Copy**, **Delete**, **Rename label**. Click Rename label — the Properties panel's label input should auto-focus and select all text, ready for you to type a new name.
result: [pending]

### 5. Right-click on empty canvas
Right-click somewhere on the canvas with nothing under your cursor. **If you've copied something** previously (Cmd+C or Copy menu item), the menu shows just **Paste**. **If clipboard is empty**, no menu appears (or menu is hidden).
result: [pending]

### 6. Escape closes the menu
Right-click anywhere to open a menu. Press Escape. Menu disappears.
result: [pending]

### 7. Clicking outside closes the menu
Open a menu by right-clicking. Click anywhere else (the canvas, a wall, a sidebar item). Menu closes.
result: [pending]

### 8. Right-click on the toolbar / sidebar still gives the browser menu
Right-click on the Toolbar or Sidebar (not the canvas). You should see your browser's normal right-click menu (Inspect Element, Copy, etc.) — the app's context menu is canvas-only and shouldn't intercept.
result: [pending]

### 9. Menu near the right/bottom edge auto-flips
Right-click VERY close to the right edge of the canvas. The menu should appear *to the left* of your cursor, not running off-screen. Same for bottom edge — menu appears above your cursor.
result: [pending]

### 10. Hide via context menu cascades correctly (Phase 46 regression)
Right-click a wall, click Hide/Show. The wall disappears in 3D. Open the Rooms tree in the sidebar — the wall row's eye icon should reflect the hidden state. This confirms the menu reuses Phase 46's hiddenIds (no duplicate logic).
result: [pending]

### 11. Save camera here works (Phase 48 regression)
Switch to 3D, orbit to a specific angle. Right-click a wall, click Save camera here. The Rooms tree should now show a small camera icon next to that wall row. Double-click the row — camera should fly back to your saved angle.
result: [pending]

### 12. Phase 52 keyboard shortcuts still work
Press `?`. Help modal opens to SHORTCUTS section (no regression from this phase). Press Escape — modal closes.
result: [pending]

## Summary

total: 12
passed: 0
issues: 0
pending: 12
skipped: 0
blocked: 0

## Gaps
