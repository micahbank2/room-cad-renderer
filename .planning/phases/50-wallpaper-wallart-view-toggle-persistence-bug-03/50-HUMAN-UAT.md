---
status: partial
phase: 50-wallpaper-wallart-view-toggle-persistence-bug-03
source: [50-VERIFICATION.md]
started: 2026-04-27T17:00:00Z
updated: 2026-04-27T17:00:00Z
---

## How to test

Open the PR's Netlify preview link.

## Tests

### 1. Uploaded wallArt survives 2D ↔ 3D toggle (the actual bug)
Switch to 3D view. Upload a wallArt image (any JPEG/PNG of a piece of art) via the wallArt picker. Place it on a wall. Switch to 2D view, then back to 3D. **The wallArt should still be there**, rendering correctly.
result: [pending]

### 2. Uploaded wallArt survives multiple toggle cycles
Repeat the above 3-4 times in a row (2D → 3D → 2D → 3D). The wallArt stays put every time, no flickering or disappearance.
result: [pending]

### 3. Framed wallArt also works
Same test, but use a framed wallArt (one of the FRAME_PRESETS — like a black or white frame around the image). Frame + image both stay across toggles.
result: [pending]

### 4. Phase 49 wall textures still work (regression check)
Apply a custom wall texture (the Phase 49 fix). Verify it still renders on first apply, no toggle workaround needed. Toggle 2D ↔ 3D — texture stays.
result: [pending]

### 5. Preset wallpapers still work (regression check)
Apply a catalog wallpaper preset to a wall. Verify it renders correctly. Toggle 2D ↔ 3D — wallpaper stays.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
