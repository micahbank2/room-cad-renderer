---
status: partial
phase: 49-bug-02-wall-user-texture-first-apply
source: [49-VERIFICATION.md]
started: 2026-04-27T16:00:00Z
updated: 2026-04-27T16:00:00Z
---

## How to test

Open the PR's Netlify preview link.

## Tests

### 1. Wall user-texture renders on first apply
Open the app. Switch to 3D view. Upload a wall texture image (any JPEG/PNG you have handy) via "My Textures" → upload. Click on a wall, then apply that texture. The texture should appear on the wall **immediately** — no need to switch to 2D and back to 3D.
result: [pending]

### 2. Texture survives 2D → 3D toggle (Phase 36 VIZ-10 regression check)
With the texture applied, switch to 2D view. Switch back to 3D. The texture should still render correctly. (This was a known good behavior before the fix; we're confirming the fix didn't break it.)
result: [pending]

### 3. Texture survives a page reload
With the texture applied, save the project (or wait 3s for autosave), then reload the page. After the project loads, the texture should still render on the wall.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
