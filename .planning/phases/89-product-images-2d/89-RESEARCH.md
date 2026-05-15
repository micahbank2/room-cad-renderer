# Phase 89: Render product images on 2D Fabric canvas — Research

**Researched:** 2026-05-15
**Domain:** Fabric.js v6 image rendering inside the 2D CAD viewport
**Confidence:** HIGH (all paths read from source; no library guessing)

## Summary

**Surprise finding — most of this is already built.** The premise in the orchestrator prompt ("Product images don't load async in 2D canvas (border only, no image)") is **stale**. CLAUDE.md's "Remaining Work" list is out of date.

`src/canvas/productImageCache.ts` exists. `src/canvas/fabricSync.ts:1118-1140` already loads a cached `fabric.FabricImage` into the product Group when the catalog product has an `imageUrl` and no `gltfId`. Async-load + `onAssetReady` callback + tick-based redraw via `setProductImageTick((t) => t + 1)` are all in place. Tests exist (`tests/productImageCache.test.ts`, `tests/fabricSync.image.test.ts`).

**What's actually missing — the real Phase 89 scope:**

1. **The image is rendered with `scaleX: pw / naturalWidth, scaleY: pd / naturalHeight`** → **Stretch fit**, which distorts couches into letterboxed squares. Jessica's photos look wrong.
2. **No clipping.** The stretched image extends naturally; with a Cover fit, the image will overflow the footprint border unless explicitly clipped to the product rect.
3. **Custom elements get no image at all** — `renderCustomElements` (line 67) draws a colored rect + label only, even though `CustomElement.imageUrl?: string` exists (cad.ts:345).
4. **Label collision:** `nameLabel` and `dimLabel` paint on top of the image with no backdrop, illegible against busy photos.
5. **Phase 88 canvasTheme integration is partial** — the border on top of the image still uses `theme.dimensionFg` / `PRODUCT_STROKE` from a stale source-level constant (line 1067). Light mode will look wrong if PRODUCT_STROKE is dark-only.

**Primary recommendation:** treat Phase 89 as **polish, not implementation**. Switch image fit to **Cover with clip-to-footprint**, render images for custom elements, add label backdrops, and audit the existing render path for Phase 88 theme correctness.

---

## Project Constraints (from CLAUDE.md)

- **D-09 / D-10 UI labels:** product name renders via `.toUpperCase()` in dynamic-CAD-ID category → keep as-is. `font-mono` (Geist Mono) for the label since it's a data identifier.
- **D-13 squircle utilities:** do NOT apply to the canvas itself.
- **Phase 88 theme bridge:** call `getCanvasTheme()` per redraw, never cache at module level. The current `theme()` helper at fabricSync.ts top satisfies this.
- **StrictMode-safe useEffect cleanup (CLAUDE.md §7):** existing image cache is a module-level `Map` — fine, since no useEffect writes to it (`getCachedImage` is called from within render, not from a hook).
- **`PlacedProduct` per-axis overrides (D-02, Phase 31):** image must respect `resolveEffectiveDims(product, placed)` → confirmed: line 1026 already uses this, so `widthFtOverride` / `depthFtOverride` flow correctly into `pw`/`pd`.
- **No backend / local-first:** all images come from `Product.imageUrl` (data URL or blob URL). No network fetches needed.

---

## Current State (verbatim file refs)

### `src/types/product.ts:1-17` — Product type
```ts
export interface Product {
  id: string;
  name: string;
  category: string;
  width: number | null;
  depth: number | null;
  height: number | null;
  material: string;
  imageUrl: string;       // data URL or blob URL  ← confirmed field name
  modelUrl?: string;      // deprecated
  gltfId?: string;        // when set, 3D uses GLTF, 2D draws silhouette polygon
  textureUrls: string[];
}
```
**Image storage:** `Product.imageUrl` — either a base64 data URL (uploaded by user via FileReader) or a transient blob URL. Persisted to IndexedDB as part of the products array (`PRODUCTS_KEY = "room-cad-products"`).

### `src/types/cad.ts:345` — Custom element
```ts
export interface CustomElement {
  // ...
  imageUrl?: string;  // exists, currently unused in 2D render
}
```

### `src/stores/productStore.ts:24-58`
- Single Zustand store: `useProductStore`
- `addProduct(p)` writes to IDB via `idb-keyval` (`PRODUCTS_KEY`)
- No image-format normalization — whatever `imageUrl` the upload form produces is stored verbatim
- StrictMode-safe via `loaded` guard at line 30

### `src/canvas/productImageCache.ts` (full file, 38 lines)
Module-level `Map<productId, HTMLImageElement>` + `Set<loading>`. `getCachedImage(productId, url, onReady)`:
- Cache hit → returns `HTMLImageElement` synchronously
- Cache miss → creates `new Image()`, kicks off async load, returns `null`
- On `img.onload` → stores in cache, calls `onReady()` (callback drives re-render)
- On `img.onerror` → silently removes from `loading`, image never appears
- Has `invalidateProduct(id)` for cache invalidation (currently UNCALLED — Open Question 5)
- Has `__resetCache()` test helper

### `src/canvas/fabricSync.ts:1009-1140` — renderProducts (the meat)
Current image branch at lines 1118-1140:
```ts
const children: fabric.FabricObject[] = [shapeChild, nameLabel, dimLabel];

if (!showPlaceholder && !product?.gltfId && product!.imageUrl) {
  const cachedImg = getCachedImage(product!.id, product!.imageUrl, () => {
    fc.renderAll();
    onAssetReady?.();
  });
  if (cachedImg) {
    const fImg = new fabric.FabricImage(cachedImg, {
      scaleX: pw / cachedImg.naturalWidth,    // ← STRETCH (distorts aspect ratio)
      scaleY: pd / cachedImg.naturalHeight,
      originX: "center",
      originY: "center",
    });
    children.splice(1, 0, fImg); // insert after border, before labels
  }
}
```
**Group composition (in z-order, bottom→top):**
1. `border` (Rect with PRODUCT_STROKE outline) OR Phase 57 GLTF silhouette polygon
2. `fImg` (the image — inserted at index 1, **above border, below labels**)
3. `nameLabel` (product name, uppercase)
4. `dimLabel` (e.g. `4' x 4'`)

The Group has `angle: pp.rotation` (line 1147), so the image inherits product rotation automatically. ✓

### `src/canvas/FabricCanvas.tsx:253-262` — redraw integration
```ts
renderProducts(
  fc, placedProducts, productLibrary, scale, origin, selectedIds,
  () => setProductImageTick((t) => t + 1),  // ← functional setState, no stale closure
  hoveredEntityId,
);
```
The tick state in FabricCanvas bumps when ANY image (or GLTF silhouette) finishes loading, triggering a full redraw that picks up the now-cached image. D-03 functional setState handles concurrent loads correctly.

### `src/components/SidebarProductPicker.tsx:40-42` — confirmation
```tsx
{p.imageUrl ? (
  <img src={p.imageUrl} ... />
) : ...}
```
Plain `<img>` element → confirms `imageUrl` is browser-loadable directly (no transform needed). Same string can feed Fabric's `new Image()` in productImageCache.

### `src/three/ProductMesh.tsx:50-51` — 3D precedent
```ts
const textureUrl = !isPlaceholder && product?.imageUrl ? product.imageUrl : null;
```
Three.js side uses the same field. ProductBox component (separate file) does the actual `useProductTexture` lazy-load — no special async pattern beyond Suspense.

### Existing tests
- `tests/productImageCache.test.ts` — covers cache hit/miss, async onReady firing, multi-product isolation. Uses `MockImage` class to drive `onload` via `queueMicrotask`.
- `tests/fabricSync.image.test.ts` — covers FabricImage child insertion into the Group after onload. **Both tests are GREEN today** — verified path is the existing implementation, not a new one.

---

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fabric | ^6.9.1 | 2D canvas + `fabric.FabricImage` | already the project's canvas lib |
| HTMLImageElement | browser | image decode | native; productImageCache wraps |

### Required Fabric v6 APIs (verified by source usage)
- `new fabric.FabricImage(htmlImageElement, options)` — wraps an already-loaded `HTMLImageElement`. Synchronous. Used at fabricSync.ts:1132.
- `new fabric.FabricImage(htmlImageElement, { clipPath, scaleX, scaleY, originX, originY })` — `clipPath` is a Fabric Rect that masks the image to a region. **Use for Cover-fit clipping** (see Implementation Plan §Scale + clip).
- `fabric.Group([...children], { angle, originX: "center" })` — rotates all children together. Already in use.
- Fabric v6 quirk: `FabricImage` was `fabric.Image` in v5 → all 2D image code already uses v6 name. No upgrade hazard.

### No new dependencies needed
Phase 89 is purely a polish pass on existing infrastructure.

---

## Implementation Plan

### Decision: Cover fit + clip-to-footprint
- **Recommended scale mode: Cover.** Fills the entire footprint (no empty corners), crops the image's overflow. Couch photos look right cropped to a rectangle. Contain leaves dead space inside the placement rect → looks broken. Stretch (current behavior) distorts.
- **Implementation:** compute Fabric `clipPath` as a Rect matching `pw × pd` centered at `(0,0)` in the Group's local coords. Set `scaleX = scaleY = max(pw / naturalWidth, pd / naturalHeight)` (Cover formula). Center the image so the over-scaled axis overflows symmetrically.

```ts
// Replacement for fabricSync.ts:1132-1137
if (cachedImg) {
  const imgAspect = cachedImg.naturalWidth / cachedImg.naturalHeight;
  const footprintAspect = pw / pd;
  const coverScale = imgAspect > footprintAspect
    ? pd / cachedImg.naturalHeight  // height is the constraining edge
    : pw / cachedImg.naturalWidth;  // width is the constraining edge
  const fImg = new fabric.FabricImage(cachedImg, {
    scaleX: coverScale,
    scaleY: coverScale,
    originX: "center",
    originY: "center",
    // Clip to footprint — overflow is hidden, not painted outside the rect.
    clipPath: new fabric.Rect({
      width: pw,
      height: pd,
      originX: "center",
      originY: "center",
      absolutePositioned: false,  // clipPath in object's local coords
    }),
  });
  children.splice(1, 0, fImg);
}
```

**Verify in plan phase:** confirm `clipPath` rotates with the parent Group (it should — clipPath lives in object-local space). If it doesn't, fallback is to clip via canvas-level mask, but this is a known-working Fabric v6 pattern.

### Custom Element image rendering (NEW)
`renderCustomElements` (fabricSync.ts:67-204) currently draws a `Rect` with `el.color + "66"` fill and a label. Mirror the product image pattern:
- After the `rect` insert, check `el.imageUrl` (cad.ts:345)
- If present, call `getCachedImage(el.id, el.imageUrl, onAssetReady)` → wrap in `fabric.FabricImage` with same Cover + clipPath logic
- Compose as a Group `[rect, fImg, label]` instead of three separate `fc.add()` calls (current code adds them individually — refactor required)
- Pass `onAssetReady` through from `FabricCanvas` (need to thread the callback into `renderCustomElements` signature)

**Scoping note:** the orchestrator prompt's Open Question 2 recommends "Products only for v1". Inverted recommendation here: custom elements include things like rugs, wall art, framed paintings — Jessica likely DOES upload photos for these. The marginal cost is ~25 lines of code (mirror products). **Recommend including custom elements** — same plan, one extra task.

### Label backdrop (semi-transparent card behind nameLabel/dimLabel)
Today (fabricSync.ts:1064-1085) the two labels paint directly over the image. Add a semi-transparent backdrop `fabric.Rect`:
```ts
// Behind nameLabel
const nameBg = new fabric.Rect({
  width: nameLabelWidth + 6,    // requires nameLabel.width — measure after construction
  height: 12,
  fill: withAlpha(theme().background, 0.7),  // requires importing withAlpha from canvasTheme
  originX: "center",
  originY: "bottom",
  top: -pd / 2 - 3,
});
children.push(nameBg, nameLabel);  // backdrop BELOW label
```
**Pitfall:** Fabric `FabricText.width` is only valid after the text is created. Read it synchronously inside `renderProducts`. Verified pattern — Fabric measures text on construction. Similar treatment for `dimLabel`.

### Phase 88 canvasTheme audit
Confirm the existing image branch still respects theme:
- `border.stroke` uses `theme().dimensionFg` for unselected non-placeholder products (fabricSync.ts:1051) — ✓ already theme-aware
- `nameLabel.fill` uses `theme().foreground` (line 1067) — ✓ already theme-aware
- `dimLabel.fill` uses `PRODUCT_STROKE` constant (line 1081) — **NOT theme-aware**. Audit `PRODUCT_STROKE` definition; if it's a hard-coded hex from pre-Phase-88, replace with `theme().dimensionFg` for parity with `border.stroke`. Track this as a small task even if it's a 1-line fix.

### File deltas (estimate)
| File | Change | Lines |
|------|--------|-------|
| `src/canvas/fabricSync.ts` | Cover-fit + clipPath at line 1132; label backdrops; PRODUCT_STROKE audit | ~30 |
| `src/canvas/fabricSync.ts` | renderCustomElements: image branch + Group refactor | ~50 |
| `tests/fabricSync.image.test.ts` | Update aspect-ratio assertion (was Stretch → now Cover) | ~15 |
| `tests/fabricSync.customElement.image.test.ts` (new) | Mirror image test for custom elements | ~80 |
| `src/canvas/FabricCanvas.tsx` | Thread onAssetReady into renderCustomElements call | ~3 |

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image caching | New cache module | Existing `productImageCache.ts` | Already battle-tested with FIX-01 onReady pattern + StrictMode-safe |
| Async image load | Polling / setTimeout | `HTMLImageElement.onload` (already in cache) | Native, single-fire, error-handled |
| Cover-fit math | Recompute fit on every redraw | Compute once per renderProducts call | `pw/pd/naturalWidth/Height` are all available in scope |
| Clipping | Canvas `globalCompositeOperation` | Fabric `clipPath` prop on the image | Native to Fabric v6, rotates with parent Group |
| Theme color lookup | Inline rgb hex | `getCanvasTheme()` + `withAlpha()` from canvasTheme.ts | Phase 88 D-04 contract; light/dark mode safe |

---

## Common Pitfalls

### Pitfall 1: clipPath in absolute vs. object-local coords
**What goes wrong:** `clipPath.absolutePositioned = true` clips against the canvas, not the rotated Group. Image clips to an axis-aligned rect even when the product is rotated 45° → visible bug at non-zero rotations.
**Why it happens:** Fabric v6 default is `absolutePositioned: false`, but it's worth being explicit.
**How to avoid:** Always set `absolutePositioned: false` on the clipPath Rect.
**Warning signs:** Image bleeds outside the footprint border when rotation ≠ 0°.

### Pitfall 2: Cover scale + clip with large source images
**What goes wrong:** If a user uploads a 4000×3000 px photo and the placed footprint is 2ft × 2ft (80 px × 80 px at typical scale), Fabric still rasterizes the full source image, then clips. Performance is fine for one product but degrades with 30+ placed products.
**Why it happens:** Fabric paints the full image into an offscreen canvas, then applies clipPath.
**How to avoid:** For v1, accept the perf hit — single-user tool, 30 products is the upper bound. If profiling shows >100ms redraw, add a downscaling step in `productImageCache` (resize to max 512px on long edge before caching). **Out of scope for Phase 89.**
**Warning signs:** Redraw lag when many image-products are visible.

### Pitfall 3: Aspect-ratio assertion breaks the existing test
**What goes wrong:** `tests/fabricSync.image.test.ts` asserts `scaleX = pw / 1` and `scaleY = pd / 1` (Stretch math) with the MockImage's 1×1 natural dims. Switching to Cover with a 1:1 image inside a non-square footprint → `scaleX === scaleY` (single coverScale value).
**Why it happens:** Test was written against current Stretch behavior, not the intended Cover behavior.
**How to avoid:** Plan must include a test update task. Recommend updating MockImage's natural dimensions to 2×1 inside this test to exercise both Cover branches (image-wider-than-footprint vs. taller).

### Pitfall 4: getCachedImage cache invalidation on product edit
**What goes wrong:** User uploads a new photo for the same product — old image stays cached forever (cache key = `productId`, not URL). 2D canvas keeps showing the old photo.
**Why it happens:** `invalidateProduct(productId)` exists but is never called from `productStore.updateProduct`.
**How to avoid:** Add `invalidateProduct(id)` call inside `productStore.updateProduct` whenever `changes.imageUrl !== undefined`. Track as a small task (or note for plan phase to decide scope).
**Warning signs:** Re-uploading a photo for an existing product shows the old image until app reload.

### Pitfall 5: Label measurement before Group construction
**What goes wrong:** Computing the backdrop width from `nameLabel.width` returns 0 or NaN if read before Fabric finishes constructing the FabricText.
**Why it happens:** Fabric measures text in the constructor, but only after the `fontFamily` resolves. If Geist Mono hasn't loaded yet, fallback metrics may differ.
**How to avoid:** Read `nameLabel.width` immediately after construction — Fabric uses metrics from the system fallback font if Geist Mono isn't ready. Acceptable, since the backdrop just needs to be approximately wide enough.
**Warning signs:** Backdrop too narrow → label text overflows; or backdrop too wide on first load, then shrinks after font swap.

---

## Plan Decomposition

**Single plan (89-01), 4 atomic tasks:**

| Task | Scope | Files | Lines |
|------|-------|-------|-------|
| 89-01-T1 | Switch product image fit Stretch → Cover with clipPath | fabricSync.ts, fabricSync.image.test.ts | ~45 |
| 89-01-T2 | Label backdrops over images (nameLabel + dimLabel) | fabricSync.ts, theme audit (PRODUCT_STROKE → theme().dimensionFg) | ~30 |
| 89-01-T3 | Custom-element image rendering (mirror product path) | fabricSync.ts (renderCustomElements), FabricCanvas.tsx, new test file | ~135 |
| 89-01-T4 | Cache invalidation on `updateProduct({ imageUrl })` | productStore.ts + test | ~25 |

**Skip the original prompt's Task 1 ("New productImageCache module") — already exists.**

Wave structure: T1 and T2 can land in the same wave (both touch the product image branch). T3 is independent. T4 is also independent. Verification task can land after all three.

---

## Open Questions for Plan Phase

1. **Cover vs Contain — final call.** Recommend Cover. Confirm with Jessica via visual sketch? (She's the user; product visions her real furniture in her real room. Cover preserves the photo's punch; Contain looks like clip-art.) **Recommend: lock Cover, no UI toggle.**

2. **Custom elements in scope?** Recommend YES — rugs, framed art, wall pieces commonly have photos. Adds ~135 lines (T3). If we descope, Phase 89 is much smaller (~75 lines).

3. **Cache invalidation in `updateProduct` (Pitfall 4) — in scope?** Recommend YES — it's a 1-line fix in productStore. Without it, a user reuploading a photo sees stale data. Adds T4.

4. **PRODUCT_STROKE theme audit (line 1081 dimLabel) — same scope or separate?** Tiny change (~3 lines). Recommend folding into T2 (label polish task).

5. **e2e specs that may break.** Need to grep `tests/e2e/` for any spec asserting the absence of a FabricImage in the product Group, OR asserting specific scaleX/scaleY values matching the old Stretch math. Quick grep showed `fabricSync.image.test.ts` is the only known offender. Plan phase should run a final sweep. **No known phase-88 e2e specs blocking.**

6. **Out of scope for Phase 89 (track as separate issues):**
   - Image downscaling on upload (performance — see Pitfall 2)
   - Image rotation independent of product rotation (e.g., couch photo taken at 90° but placed at 0°)
   - PBR-style image lighting in 2D (matches 3D rendering)
   - "Broken image" icon overlay for failed loads (current behavior: silent fallback to bordered rect — recommended to keep silent per orchestrator prompt)

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (already in use) |
| Config file | vite.config.ts (test config inline) |
| Quick run command | `npm test -- fabricSync.image` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req | Behavior | Test Type | Command | File Exists? |
|-----|----------|-----------|---------|--------------|
| 89-T1 | Image scales Cover, not Stretch | unit | `npm test -- fabricSync.image` | ✅ (needs update) |
| 89-T1 | clipPath applied with absolutePositioned=false | unit | same | ❌ — add assertion |
| 89-T2 | Label backdrop renders at correct position | unit | `npm test -- fabricSync.image` | ❌ — add assertion |
| 89-T3 | Custom element renders image when imageUrl present | unit | new test file | ❌ — Wave 0 |
| 89-T3 | Custom element falls back to colored rect when imageUrl absent | unit | new test file | ❌ — Wave 0 |
| 89-T4 | updateProduct({imageUrl}) calls invalidateProduct | unit | `npm test -- productStore` | ❌ — add file |
| Visual | Rotated product shows clipped image | e2e (playwright) | manual UAT acceptable | ❌ — manual |

### Wave 0 Gaps
- [ ] Update `tests/fabricSync.image.test.ts` MockImage to 2×1 dims to exercise both Cover branches
- [ ] Create `tests/fabricSync.customElement.image.test.ts` — mirror existing image test
- [ ] Create `tests/productStore.invalidation.test.ts` — verify `invalidateProduct` called

### Sampling Rate
- **Per task commit:** `npm test -- fabricSync` (image + custom element tests, ~5s)
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green + manual visual check that rotated products show the image clipped to the rotated rect (this last bit is the part automated tests can't catch)

---

## Sources

### Primary (HIGH confidence — all read from source)
- `src/canvas/productImageCache.ts` (full file)
- `src/canvas/fabricSync.ts:67-204, 1009-1230` (renderCustomElements + renderProducts)
- `src/canvas/canvasTheme.ts` (full file — Phase 88 bridge)
- `src/canvas/FabricCanvas.tsx:230-290` (redraw lifecycle)
- `src/types/product.ts` (full file — Product type + resolveEffectiveDims)
- `src/types/cad.ts:67-345` (PlacedProduct, CustomElement, PlacedCustomElement)
- `src/stores/productStore.ts` (full file — image-upload flow)
- `src/three/ProductMesh.tsx:50-51` (3D imageUrl consumer — confirms field reuse)
- `src/components/SidebarProductPicker.tsx:40-42` (existing image-render proof)
- `tests/productImageCache.test.ts` + `tests/fabricSync.image.test.ts` (existing test patterns to mirror)

### Secondary (MEDIUM)
- Fabric.js v6 docs: `FabricImage`, `clipPath`, `absolutePositioned` — verified against existing v6 usage in the codebase (lines 1132, 1041, 234, etc.). Not externally re-verified; trust based on internal consistency.

### Tertiary (LOW)
- None. All claims are source-verified.

---

## Metadata

**Confidence breakdown:**
- Current state: HIGH — direct file reads, all line numbers verified
- Recommended approach (Cover + clipPath): HIGH — known Fabric v6 pattern, mirrors existing internal patterns
- Custom element scope decision: MEDIUM — depends on Jessica's actual upload behavior, recommend asking in plan checkpoint
- Performance ceiling: LOW — no profiling done. Recommendation is "ship it, profile later"

**Research date:** 2026-05-15
**Valid until:** 2026-06-15 (Fabric.js v6 is stable; the only thing that could invalidate this is a new phase that rewrites `renderProducts` wholesale)
