---
status: partial
phase: 57-gltf-render-2d-01-top-down-silhouette
source: [57-VERIFICATION.md]
started: 2026-05-05T00:00:00Z
updated: 2026-05-05T00:00:00Z
---

## How to test

Open PR #139's Netlify preview link.

> 🦆 **The 2D payoff.** Phase 56 made the chair appear in 3D; Phase 57 makes it look right in 2D. A duck should look like a duck from above, not a rectangle.

## Tests

### 1. The silhouette appears in 2D
Add a new product. Upload an image AND a `.glb` file (e.g. the Khronos Duck: https://github.com/KhronosGroup/glTF-Sample-Assets/raw/main/Models/Duck/glTF-Binary/Duck.glb). Place the product in your room. **In 2D, you should see a duck-shaped outline** (top-down silhouette), not a rectangle.
result: [pending]

### 2. Image-only products still show rectangles (regression)
Place a product that has only an image (no GLTF). It should still render as a rectangle with the image inside, exactly like before. No regression.
result: [pending]

### 3. Loading state shows a placeholder
Right after placing a GLTF product, you might see a brief rectangle before the silhouette appears (the silhouette is computed async on first render). It should resolve to the silhouette within a fraction of a second.
result: [pending]

### 4. Resize works (Phase 31 regression)
Drag an edge handle on a GLTF product in 2D to resize it. The silhouette should scale to match the new dimensions while keeping its shape (e.g. a wider duck stays duck-shaped).
result: [pending]

### 5. Click-to-select still works (Phase 54 regression)
Click a GLTF silhouette in 2D. The Properties panel should update to show the product. Click empty space — selection clears.
result: [pending]

### 6. Right-click context menu still works (Phase 53 regression)
Right-click a GLTF silhouette in 2D. The context menu should appear with the product actions (Focus camera, Save camera here, Hide/Show, Copy, Paste, Delete).
result: [pending]

### 7. 3D view still renders correctly (Phase 56 regression)
Switch to 3D. The same GLTF product should render as a real 3D model exactly like in Phase 56. No change to 3D behavior.
result: [pending]

### 8. Multiple GLTF products in the same room
Place 2–3 different GLTF products in the same room (e.g. duck + chair + box). Each should render as its own distinct silhouette in 2D and as its own model in 3D.
result: [pending]

### 9. Bad GLTF falls back to rectangle
Upload a corrupt or invalid `.glb` (try renaming a `.txt` file to `.glb`). The product should permanently render as a rectangle in 2D rather than crashing or hanging on a placeholder. Same behavior as Phase 56's 3D fallback.
result: [pending]

### 10. Silhouette persists across reloads
Place a GLTF product, save the project, reload the page. The silhouette should reappear in 2D after a brief recompute (the silhouette is computed lazily, not stored — that's by design).
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0
blocked: 0

## Gaps
