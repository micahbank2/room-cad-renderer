---
status: partial
phase: 58-gltf-integration-verification-gltf-integration-01
source: [58-VERIFICATION.md]
started: 2026-05-05T00:00:00Z
updated: 2026-05-05T00:00:00Z
---

## How to test

Open the PR's Netlify preview link.

> 🎁 **The v1.14 closer.** Phase 55 stored the file. Phase 56 rendered it in 3D. Phase 57 made it look right in 2D. Phase 58 ties it all together — the library shows you which products have a 3D model, and it draws the thumbnail for you when you didn't upload an image.

## Tests

### 1. Box icon appears on GLTF products in the library
Add a product with a `.glb` file (e.g. Khronos Duck: https://github.com/KhronosGroup/glTF-Sample-Assets/raw/main/Models/Duck/glTF-Binary/Duck.glb). In the library, look at the product card. **A small box icon should appear in the top-LEFT corner**, marking it as a 3D-model product.
result: [pending]

### 2. Image-only products don't show the box icon
Add a product with only an image (no `.glb`). Its library card should NOT have the box icon — the icon is reserved for GLTF-backed products.
result: [pending]

### 3. The remove (X) button still works
Hover over any product card — the X button should still appear in the top-RIGHT corner. The box icon (top-left) and the X button (top-right) should never overlap.
result: [pending]

### 4. Auto-thumbnail renders for GLTF-only products
Add a product with **only** a `.glb` file (skip the image input). The library card should show a rendered 3/4-perspective view of the model — like a small product catalog photo. Not a blank placeholder.
result: [pending]

### 5. User-uploaded image takes priority
Add a product with BOTH an image AND a `.glb` file. The library card should show your uploaded image, NOT the auto-rendered thumbnail. (Your image always wins — the auto-thumbnail is just a fallback.)
result: [pending]

### 6. Saved camera works on GLTF products (Phase 48 × GLTF)
Place a GLTF product. Switch to 3D, orbit/zoom to a specific angle. Right-click the product → "Save camera here". A camera icon should appear next to the product in the tree. Move the camera elsewhere. Double-click the camera tree row. The view should snap back to your saved angle.
result: [pending]

### 7. Resize still works on GLTF products (Phase 31 regression)
Drag the edge handles on a GLTF product in 2D. The silhouette polygon should scale correctly. Switch to 3D — the model should also scale.
result: [pending]

### 8. Right-click menu works on GLTF products (Phase 53 regression)
Right-click a GLTF product in 3D OR on the silhouette in 2D. The 6-action context menu should open (Focus camera, Save camera here, Hide/Show, Copy, Paste, Delete).
result: [pending]

### 9. Click-to-select works on GLTF products (Phase 54 regression)
Click a GLTF product in 2D or 3D. The Properties panel should update.
result: [pending]

### 10. Thumbnail compute doesn't break the library
Open the library with several GLTF products. There may be a brief moment where some cards show a placeholder while thumbnails compute (~50ms each), then they fill in. The library should never crash, freeze, or show errors during compute.
result: [pending]

## Note on what's COMPLETE in v1.14

After Phase 58, the v1.14 "Real 3D Models" milestone is fully shipped:
- Upload `.gltf` / `.glb` files (Phase 55)
- Render real 3D models in 3D view (Phase 56)
- Render top-down silhouettes in 2D view (Phase 57)
- Box icon + auto-thumbnail in library (Phase 58)
- Phase 31 / 48 / 53 / 54 all compose correctly with GLTF products

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0
blocked: 0

## Gaps
