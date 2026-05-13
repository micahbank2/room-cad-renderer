---
status: partial
phase: 81-left-panel-restructure-v1-21
source: [81-VERIFICATION.md]
started: 2026-05-13T19:00:00-04:00
updated: 2026-05-13T19:00:00-04:00
---

## Current Test

[awaiting human testing]

## Tests

### 1. Fresh load — only the Rooms tree is expanded
expected: Open the app in a fresh tab (or hard-reload Cmd+Shift+R). The left sidebar should show "Rooms" expanded with the room tree visible underneath. Every other section ("Room config", "Snap", "Custom elements", "Framed art library", "Wainscoting library", "Product library") should be collapsed — you only see the section name with a chevron next to it.
result: [pending]

### 2. Collapse state persists across reload
expected: Click "Product library" to expand it (you should see the product picker appear). Reload the page. Product library should still be expanded. Collapse "Rooms" by clicking its header. Reload. Rooms should still be collapsed.
result: [pending]

### 3. Hover a tree row — wall glows on 2D canvas
expected: Make sure you're in 2D view. Hover your mouse over "North wall" in the Rooms tree (under Rooms → Bedroom → Walls). The north wall on the canvas should briefly outline in accent-purple. Move your mouse off the row — the outline should clear immediately. Try the same with a placed product or custom element.
result: [pending]

### 4. Double-click rename + saved-camera moved to icon
expected: Double-click "North wall" in the tree. The label should turn into an editable text field. Type "Window wall" and hit Enter. The tree should now show "Window wall", and the 2D canvas dimension label on that wall should also say "Window wall". Reload the page — the name should persist. Then look for a small camera icon to the right of the wall name — clicking that should still do the saved-camera thing (not double-click anymore).
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
