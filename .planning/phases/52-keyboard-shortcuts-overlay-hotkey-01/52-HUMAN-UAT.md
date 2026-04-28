---
status: partial
phase: 52-keyboard-shortcuts-overlay-hotkey-01
source: [52-VERIFICATION.md]
started: 2026-04-27T20:05:00Z
updated: 2026-04-27T20:05:00Z
---

## How to test

Open the PR's Netlify preview link.

## Tests

### 1. Press `?` to open the shortcuts cheat sheet
Anywhere in the app (canvas focused, no input selected), press `?` (Shift+/). A modal should appear and land on the **SHORTCUTS** section directly — not "Getting started" or whatever was last open.
result: [pending]

### 2. The cheat sheet now shows all 7 previously-missing shortcuts
Scroll the SHORTCUTS section. You should see entries for:
- **Ceiling tool** (C)
- **Reset canvas view** (0)
- **Camera preset: Eye level** (1), **Top down** (2), **3/4 view** (3), **Corner** (4)
- **Copy selected** (Cmd+C)
- **Paste** (Cmd+V)

Previously these were wired in App.tsx but missing from the help display.
result: [pending]

### 3. Escape closes the modal
Open the modal with `?`. Press Escape. Modal should disappear.
result: [pending]

### 4. Clicking outside the modal closes it
Open the modal with `?`. Click anywhere on the dimmed backdrop (outside the white panel). Modal should close.
result: [pending]

### 5. `?` is inert when typing in an input
Click into the room "Width" input box in the sidebar (so it's focused). Press `?`. The modal should NOT open — your `?` character is treated as input text. Click out of the input and press `?` again — now it opens.
result: [pending]

### 6. Camera Presets still work (Phase 35 regression)
Switch to 3D view. Press `1`. Camera should jump to eye-level. Press `3`. Camera should jump to 3/4 view. Press `2`. Top-down. Press `4`. Corner.
result: [pending]

### 7. Copy/Paste still works (Phase 31 regression)
Select a wall in 2D view. Press Cmd+C. Press Cmd+V. A copy of the wall should appear, slightly offset from the original.
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
