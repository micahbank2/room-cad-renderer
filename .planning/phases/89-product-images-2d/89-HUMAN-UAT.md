---
status: partial
phase: 89-product-images-2d
source: [89-VERIFICATION.md]
started: 2026-05-15T00:30:00-04:00
updated: 2026-05-15T00:30:00-04:00
---

## Current Test

[awaiting human testing]

## Tests

### 1. Cover-fit on a non-square photo
expected: Upload a tall portrait photo (or landscape photo) as a product's image. Place that product in a square or differently-shaped footprint on the 2D canvas. The image should fill the footprint and crop the excess instead of stretching — no squashed faces or warped furniture.
result: [pending]

### 2. Rotation works with Cover-fit
expected: Place a product with a clearly directional image (e.g. a couch facing left). Rotate it 45° or 90° via the inspector. The image should rotate with the product, still clipped to the footprint, no visual artifacts at the corners.
result: [pending]

### 3. Labels stay readable on busy photos
expected: Place a product with a photo that has both light and dark areas (e.g. a couch on a patterned rug). The product name + dimension labels should have a subtle semi-transparent backdrop behind them so the text stays readable no matter what's behind. Try in both Light and Dark themes via the gear icon.
result: [pending]

### 4. Image cache invalidates on re-upload
expected: After placing a product with a photo, go back and upload a different image to that same product (overwrite). The 2D canvas should update to show the new image immediately, no reload needed.
result: [pending]

### 5. Custom Element images render (if you have any)
expected: If you have any custom elements with an uploaded image, they should now show that image filled into their footprint, same Cover-fit + backdrop treatment as products. Custom elements without an image still show as a colored rect (fallback unchanged).
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
