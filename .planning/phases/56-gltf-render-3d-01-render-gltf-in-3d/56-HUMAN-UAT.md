---
status: partial
phase: 56-gltf-render-3d-01-render-gltf-in-3d
source: [56-VERIFICATION.md]
started: 2026-04-29T17:00:00Z
updated: 2026-04-29T17:00:00Z
---

## How to test

Open the PR's Netlify preview link.

> 🎉 **This is the magic moment.** Phase 55 stored the file; Phase 56 actually renders it. You upload a chair, you see a chair.

## Tests

### 1. The chair appears in 3D
Add a new product. Upload an image (any image — for the library thumbnail) AND a `.glb` file (e.g. the Khronos Chair model from earlier: https://github.com/KhronosGroup/glTF-Sample-Assets/raw/main/Models/Chair/glTF-Binary/Chair.glb). Place the product in your room. Switch to 3D view. **You should see the actual chair model**, not a textured box.
result: [pending]

### 2. The model fits the dimensions you specified
When creating the product, you set width / depth / height (e.g. 24″ × 24″ × 36″). The GLTF should auto-scale to fit those dimensions while keeping its proportions. Different-sized products should render at different sizes.
result: [pending]

### 3. The model sits on the floor (not floating, not buried)
The chair's bottom should rest on the floor. Not floating mid-air, not buried in the floor.
result: [pending]

### 4. Rotate works
With the chair selected in 2D, drag the rotation handle. Switch to 3D. The chair should be rotated by the same amount.
result: [pending]

### 5. Resize works (Phase 31 regression)
Drag an edge handle on the product in 2D to resize it. Switch to 3D. The chair should scale to match the new dimensions.
result: [pending]

### 6. Click-to-select still works (Phase 54 regression)
In 3D, click the chair model. The Properties panel should update to show the product. (You're clicking a real model, not a box now — the click detection still works because Phase 54's drag-threshold guard runs on a wrapping group.)
result: [pending]

### 7. Right-click context menu still works (Phase 53 regression)
In 3D, right-click the chair model. Context menu should appear with the 6 product actions (Focus camera, Save camera here, Hide/Show, Copy, Paste, Delete).
result: [pending]

### 8. Selection outline shows
Click the chair to select it. A purple bounding-box outline should appear around the model. Click empty space — outline disappears.
result: [pending]

### 9. Image-only products still work (regression check)
Place a product that has only an image (no GLTF). It should render as a textured box exactly like before. No regression.
result: [pending]

### 10. Loading + error fallback
If a GLTF takes a moment to load, you should briefly see the textured box (the loading fallback). If you upload a corrupt or invalid file (try renaming a `.txt` file to `.glb` and uploading), the product should still render as a textured box rather than crashing the app.
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0
blocked: 0

## Gaps
