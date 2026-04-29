---
status: partial
phase: 55-gltf-upload-01-gltf-glb-upload-storage
source: [55-VERIFICATION.md]
started: 2026-04-29T15:00:00Z
updated: 2026-04-29T15:00:00Z
---

## How to test

Open the PR's Netlify preview link.

> ⚠️ Phase 55 is UPLOAD ONLY. The 3D model **does not render yet** — that's Phase 56. This phase is the foundation: upload, validate, store. You won't see the model in 3D after upload; you'll just confirm the upload flow works and the product gets created.

## Tests

### 1. Upload modal accepts a `.glb` file
Click "+ Add product" in the library. Fill in the name and category. In the new "3D Model (optional)" file input, select any `.glb` or `.gltf` file you have. Click Add. Product should be created with no errors.
result: [pending]

### 2. Image-only products still work
Repeat #1 but skip the 3D Model input. Just upload an image. Product creates normally — exactly like before this phase.
result: [pending]

### 3. Oversized GLTF is rejected
Find a `.glb` file larger than 25MB (or fake one with a large empty file). Try to upload it. The modal should reject it with a size-cap error message and NOT create the product.
result: [pending]

### 4. Invalid extensions rejected
In the 3D Model input, try selecting a `.png` or `.txt` file. The form should reject it (file picker may filter it out automatically; if you bypass that, the validation should kick in).
result: [pending]

### 5. Same GLTF uploaded twice deduplicates in IndexedDB
Upload the same `.glb` file across two different products (with different names). Both products should be created. Open browser DevTools → Application → IndexedDB → `room-cad-gltf-models`. There should be ONE entry, not two — both products reference the same blob via SHA-256 dedup.
result: [pending]

### 6. Snapshot persistence
After uploading a GLTF product, save the project (or wait 3s for autosave). Reload the page. The product should still be in your library. The `gltfId` field in the saved snapshot should reference an entry in IDB.
result: [pending]

## Note on what you WON'T see this phase

- The actual 3D model does not render in 3D view yet — products with `gltfId` still show as textured boxes.
- 2D products with GLTF still show as rectangles, not silhouettes.
- No library indicator shows which products are GLTF-backed.

These are Phases 56, 57, 58. Phase 55 is the foundation — verify the upload + storage works correctly so downstream phases have something to render.

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
