---
phase: 89-product-images-2d
type: context
created: 2026-05-15
branch: gsd/phase-89-product-images-2d
research: 89-RESEARCH.md
---

# Phase 89 — Product/Custom-Element Image Polish (2D Canvas)

## Summary

Polish pass on the 2D Fabric image-rendering path. The async cache + FabricImage loader (`src/canvas/productImageCache.ts`, `fabricSync.ts:1118-1140`) already exists. Phase 89 fixes the parts that look wrong:

1. **Stretch → Cover fit** with `clipPath` so Jessica's couch photos keep their aspect ratio
2. **Custom elements get images** (today they're colored rects only)
3. **Label backdrops** so name/dimension labels stay readable over busy photos
4. **Cache invalidation** when a product's `imageUrl` is updated

Standalone polish phase, like Phase 87 + 88 — no v1.xx milestone.

---

## Locked Decisions

### D-01 — Standalone polish phase

Phase 89 ships outside any v1.xx milestone. Listed under "Polish Phases" in ROADMAP.md alongside Phase 87 + 88. No new milestone created.

### D-02 — Cover scale mode for product + custom-element images

Image fills the placed footprint, cropping the overflow axis. Use Fabric `clipPath` (a `fabric.Rect` matching the footprint, `absolutePositioned: false` so it rotates with the parent Group) to clip the overflow.

**Replaces:** current Stretch-to-fit at `fabricSync.ts:1133-1134` (`scaleX = pw/naturalWidth, scaleY = pd/naturalHeight`).

**Formula:** `coverScale = imgAspect > footprintAspect ? pd/naturalHeight : pw/naturalWidth`. Single scale applied to both axes; image centered via `originX/Y: "center"`; overflow clipped by Rect clipPath.

No UI toggle for Contain — Cover is the only mode.

### D-03 — Custom Elements get image rendering too

`CustomElement.imageUrl?: string` already exists at `src/types/cad.ts:345` but `renderCustomElements` (fabricSync.ts:67-204) ignores it. Phase 89 wires it identically to products:
- Same cache (`getCachedImage(el.id, el.imageUrl, onAssetReady)`)
- Same Cover-fit + clipPath math
- Same label backdrop treatment

Requires refactor: current `renderCustomElements` adds rect + label as separate `fc.add()` calls. Phase 89 wraps them in a `fabric.Group` so the image, rect, and label rotate together. Custom elements WITHOUT `imageUrl` keep the existing colored-rect rendering (`el.color + "66"` fill, no image).

### D-04 — Label backdrops for readability on busy photos

Both `nameLabel` and `dimLabel` get a semi-transparent backdrop rect behind them. Padding ~4px on each side. Fill: `withAlpha(theme.background, 0.75)` from `canvasTheme.ts`. Inserted into the Group BELOW the label, ABOVE the image.

Backdrop dimensions: read `label.width` immediately after FabricText construction (Fabric measures text in the constructor). Accept approximate width if Geist Mono hasn't loaded yet — backdrop just needs to be wide enough.

**Theme audit included:** the dimension label at `fabricSync.ts:1081` uses stale `PRODUCT_STROKE` constant instead of `theme().dimensionFg`. Fix in same task.

### D-05 — Image cache invalidation on update

`productImageCache.ts` already exports `invalidateProduct(productId)` — currently uncalled. Phase 89 wires it:
- `productStore.updateProduct(id, changes)`: if `changes.imageUrl !== undefined`, call `invalidateProduct(id)` BEFORE the `setState` (so the next redraw triggered by the state change re-fetches).
- `cadStore.updateCustomElement(id, changes)` (line ~1065): same treatment.

Cache key today is `productId`. For custom elements, reuse the same module — the cache is a `Map<string, HTMLImageElement>` keyed by a string ID; product IDs and custom-element IDs share a namespace (UUIDs, no collision risk).

---

## Claude's Discretion

- **Backdrop opacity exact value:** locked to 0.75 in D-04 as a starting point. If light-mode contrast is too aggressive on white backgrounds during UAT, drop to 0.65 — single-constant tweak, no replan.
- **Backdrop padding exact value:** 4px each side feels right per research; tune in implementation if labels feel cramped.
- **Label-backdrop z-order within Group:** insert backdrop right before its label child. Verify rotation behavior visually — both are children of the same Group so they should rotate as a unit.

---

## Deferred Ideas (out of scope)

- Image downscaling on upload (perf optimization for many large images — see RESEARCH Pitfall 2)
- Image rotation independent of product rotation
- PBR-style 2D image lighting to match 3D
- Broken-image fallback icon (current silent fallback to bordered rect is acceptable)
- Tracked as separate concerns if/when they surface in UAT.

---

## Plans

- **89-01** — Single plan, 4 atomic tasks, Wave 1 (autonomous). See `89-01-PLAN.md`.

---

## Success Criteria

- [ ] Product images render in Cover fit with clipPath; no aspect-ratio distortion
- [ ] Rotated products show the image clipped to the rotated footprint rect (not an axis-aligned rect)
- [ ] Custom elements with `imageUrl` render the image; without it, fall back to existing rect
- [ ] Name + dimension labels readable over photos in both light + dark mode
- [ ] Re-uploading a product photo updates the 2D canvas within one redraw
- [ ] `PRODUCT_STROKE` stale constant replaced with `theme().dimensionFg` for dim label
- [ ] Existing tests updated; new tests for custom-element image + cache invalidation green
- [ ] `gsd-tools verify key-links` passes
