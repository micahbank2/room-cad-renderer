---
phase: 58-gltf-integration-verification-gltf-integration-01
type: research
created: 2026-05-04
status: ready-for-planning
---

# Phase 58: GLTF Integration Verification — Research

**Researched:** 2026-05-04
**Domain:** Three.js offscreen rendering + React design-system extension
**Confidence:** HIGH

## Summary

All five open questions from CONTEXT.md have clear answers grounded in the existing codebase patterns (Phase 45 swatch generator + Phase 56 GltfProduct + Phase 57 silhouette loader). The phase is mechanical wiring with no novel architecture: a parallel thumbnail generator mirroring Phase 45 line-for-line, a single new optional `badge?: ReactNode` prop on `LibraryCard`, and one new e2e scenario. All decisions in CONTEXT.md hold up — no recommended changes.

**Primary recommendation:** Mirror Phase 45's `swatchThumbnailGenerator.ts` structure exactly. Use FOV-based camera distance (formula B below) instead of the diagonal-multiplier in CONTEXT.md D-11 — it's deterministic across furniture aspect ratios. Always-visible Box badge with `text-text-dim` color and no background (option A).

## User Constraints (from CONTEXT.md)

### Locked Decisions
D-01 through D-16 from CONTEXT.md are LOCKED. Highlights:
- D-01/02: Box icon top-right corner, visible whenever `gltfId` is truthy (regardless of imageUrl).
- D-03/09: Lazy on first library render; thumbnail used only when `imageUrl` is absent.
- D-04: 3/4 perspective (~30° elevation, ~30° azimuth), perspective camera FOV=35°.
- D-05: 256×256 PNG dataURL.
- D-06: Studio lighting (DirLight 1.5 + Ambient 0.4 + Rim 0.3) — NOT scene-matching.
- D-07: Transparent background.
- D-08: In-memory `Map<string, string | "fallback">`. No IDB persistence; no writeback to `Product.imageUrl`.
- D-10: Dedicated lazy-init shared `THREE.WebGLRenderer`. **DO NOT** call `registerRenderer()`.
- D-12: One new e2e (`gltf-integration.spec.ts`) — Phase 48 saved-camera × GLTF only.
- D-13/14: 5 unit + 2 component + 3 e2e tests. Reuse `tests/e2e/fixtures/box.glb`.
- D-16: Zero regressions on Phase 31/53/54/56/57 + image-only products.

### Claude's Discretion
- D-04 framing math (formula choice — see Q2 below)
- D-11 disposal order (see Q4 below)
- Badge visual treatment (see Q5 below)

### Deferred Ideas (OUT OF SCOPE)
OBJ format, GLTF animations, custom material overrides, IDB-persisted thumbnail cache, regen UI, eager generation on upload, top-down/front-view options, additional Phase 31/53/54 × GLTF e2e (already covered).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GLTF-INTEGRATION-01 | Tie GLTF pipeline into rest of platform: library Box badge, auto-thumbnail (256×256 PNG, 3/4 perspective, studio-lit, in-memory cache), Phase 48 × GLTF e2e verification. | Q1: parsed scene per-call (safe to add). Q2: FOV-based framing formula. Q3: 3 WebGL contexts safe. Q4: traverse + dispose pattern. Q5: badge visual = always-visible 12px Box icon, `text-text-dim`, no background. |

## Open Questions — Answers

### Q1: GLTFLoader scene reuse safety — HIGH confidence

**Answer:** Each `new GLTFLoader().parseAsync(buf, "")` call returns a freshly-parsed `gltf.scene` (a new `THREE.Group`) — geometries, materials, and textures are NOT shared by reference across `parseAsync` calls. Adding the parsed scene to the thumbnail generator's `THREE.Scene` tree, rendering, then removing it cannot disturb a concurrent or sequential `loadGltfScene` call from `gltfSilhouette.ts` because they each parse independently.

**Evidence:**
- `src/lib/gltfSilhouette.ts:113-117` already creates a new `GLTFLoader` per call and uses the result locally; if scenes were shared, the silhouette compute (which calls `scene.updateMatrixWorld(true, true)`) would have caused mutation bugs already and they haven't.
- Three.js `GLTFLoader.parseAsync` is implemented to construct fresh `BufferGeometry` and material instances on each parse. There is no internal cache keyed by buffer identity.
- Phase 56 `src/three/GltfProduct.tsx:36` uses drei's `useGLTF(url)` which DOES cache by URL — but Phase 58 will use raw `GLTFLoader.parseAsync` (per CONTEXT.md D-11), bypassing drei's cache entirely. Same approach as Phase 57.

**Recommendation:** No `scene.clone()` needed. Follow the D-11 pseudocode literally. Risk: zero.

**Risk note for planner:** If Phase 58 ever switches to `useGLTF` (it shouldn't — non-React context here), drei's cache would mean the same `THREE.Group` instance is shared across render calls. Always use raw `GLTFLoader.parseAsync` for offscreen renders.

### Q2: Camera framing math — HIGH confidence

**Recommendation: Formula B (FOV-based distance)** — deterministic across all furniture aspect ratios.

```ts
// Computed once per thumbnail. fov in degrees.
const fov = 35;
const fovRad = (fov * Math.PI) / 180;
const maxDim = Math.max(size.x, size.y, size.z);
const distance = (maxDim / 2) / Math.tan(fovRad / 2);
const safetyFactor = 1.4; // ~40% padding so model doesn't kiss the frame edges

// 3/4 view direction: normalized (1, 0.7, 1) — ~30° elevation, ~45° azimuth from front
const dir = new THREE.Vector3(1, 0.7, 1).normalize();
camera.position.copy(center).add(dir.multiplyScalar(distance * safetyFactor));
camera.near = distance * 0.01;
camera.far = distance * 10;
camera.updateProjectionMatrix();
camera.lookAt(center);
```

**Why B over A (CONTEXT.md D-11's `diagonal × (0.7, 0.5, 0.7)`):**
- Formula A scales distance by **diagonal length**, which over-zooms wide flat objects (e.g., a 6'×6"×3' bookshelf has small diagonal but tall silhouette — model fills frame top-to-bottom, gets cut off).
- Formula B scales by **largest single axis**, then uses safety factor for padding. Frames consistently whether the object is tall (lamp), wide (sofa), or deep (bed).
- FOV=35° (per D-04) is narrow enough that minor framing errors are not amplified by lens distortion.

**Why not Formula C (drei `Bounds`):** drei's `Bounds` is a React-specific component that wraps `<group>` and uses R3F invalidation. Phase 58 runs outside React in raw THREE — porting would mean reimplementing what Formula B already does in 5 lines.

**Evidence:**
- Phase 56 `src/three/GltfProduct.tsx:40-46` already uses `Box3.setFromObject(scene)` + `getSize` for in-scene fitting — same primitive applies here.
- Three.js docs (verified): `PerspectiveCamera.fov` is vertical FOV in degrees; `tan(fov/2) = (height/2) / distance`. Multi-axis safety derived by using max dimension instead of vertical extent.

**Risk:** A model with extreme aspect ratio (e.g., a 20ft floor lamp with a 0.3ft base) could still look weird, but Jessica's product library is furniture-scale where max-dimension framing dominates.

### Q3: WebGL context ceiling — HIGH confidence

**Answer:** Phase 58 adds exactly **one** new WebGL context. Total live contexts after Phase 58:

| Source | Context |
|--------|---------|
| Main viewport R3F `<Canvas>` (`src/three/ThreeViewport.tsx`) | 1 |
| Phase 45 `swatchThumbnailGenerator.ts:41` (lazy-init, may not be live until first swatch render) | 1 |
| Phase 58 `gltfThumbnailGenerator.ts` (lazy-init, first GLTF library render) | 1 |
| **Total** | **3** |

Chrome's hard cap is ~16 (per WebGL spec implementation; varies by GPU). Safari is lower (~8). Safe by a wide margin.

**Evidence:**
- `grep WebGLRenderer src/` confirms only TWO `new THREE.WebGLRenderer(...)` call sites: `swatchThumbnailGenerator.ts:41` and the implicit one inside R3F's `<Canvas>`. `pbrTextureCache.ts:14` only ACCEPTS a renderer reference (`registerRenderer(gl)`) — does NOT create one. `wallpaperTextureCache.ts` only references the type in comments.
- R3F's `<Canvas>` does count as one context (it instantiates `THREE.WebGLRenderer` internally on mount).
- Both Phase 45 and Phase 58 generators are LAZY-init: contexts only allocated on first call. If Jessica's library has zero GLTF products, no Phase 58 context is created.

**Recommendation:** No mitigation needed. Do NOT pool a renderer with Phase 45 — they have different scenes/cameras/lighting and the coupling cost outweighs the saved context.

**Risk note for planner:** If a future phase adds a 4th offscreen renderer (e.g., scene preview thumbnails), revisit. For now, document the count in `gltfThumbnailGenerator.ts` header comment.

### Q4: Texture/geometry disposal — HIGH confidence

**Answer:** Yes, dispose explicitly after each thumbnail render. With 20+ products in Jessica's session and GLTFs averaging 2-5 MB of GPU memory each, NOT disposing means ~50-100 MB of leaked textures/buffers per session — not catastrophic, but Jessica reloading the page hourly is annoying.

**Recommended disposal pattern (post-render):**

```ts
function disposeGltfScene(root: THREE.Object3D): void {
  root.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      // Geometry: single BufferGeometry per Mesh
      node.geometry?.dispose();

      // Material(s): may be array on multi-material meshes
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      for (const mat of materials) {
        if (!mat) continue;
        // Dispose every texture map the material references.
        // MeshStandardMaterial maps used by GLTFs:
        const maps = [
          (mat as THREE.MeshStandardMaterial).map,                 // albedo / baseColor
          (mat as THREE.MeshStandardMaterial).normalMap,
          (mat as THREE.MeshStandardMaterial).roughnessMap,
          (mat as THREE.MeshStandardMaterial).metalnessMap,
          (mat as THREE.MeshStandardMaterial).aoMap,
          (mat as THREE.MeshStandardMaterial).emissiveMap,
          (mat as THREE.MeshStandardMaterial).bumpMap,
          (mat as THREE.MeshStandardMaterial).displacementMap,
          (mat as THREE.MeshStandardMaterial).alphaMap,
          (mat as THREE.MeshStandardMaterial).envMap,
        ];
        for (const tex of maps) tex?.dispose();
        mat.dispose();
      }
    }
  });
}

// Call site (in computeGltfThumbnail, after r.render + toDataURL):
threeScene.remove(scene);
disposeGltfScene(scene);
```

**Why this order:**
- Three.js disposal is reference-counted only via the `WebGLRenderer.info.memory` tracker — there's no GC. Each `.dispose()` releases the underlying GPU resource.
- Materials must be disposed AFTER textures because disposing a texture while a live material still references it leaves a dangling sampler binding (warning in console, not a crash).
- Geometry disposal is independent of material/texture disposal.
- Scene-graph `.remove(scene)` does NOT dispose — it only detaches.

**Recommendation:** Add `disposeGltfScene` as a private helper in `gltfThumbnailGenerator.ts`. Call it inside the `try` block after `toDataURL` AND inside the `catch` block before returning `"fallback"` (parsed scene may exist even on render failure).

**Risk:** If a future phase shares parsed GLTF scenes between the thumbnail generator and the live viewport (it shouldn't — D-11 parses fresh per call), disposing here would corrupt the live scene. Document this constraint in the helper's JSDoc.

### Q5: LibraryCard badge styling — HIGH confidence

**Recommendation: Option A** — always-visible, no background, `text-text-dim` color.

**Rendering:**
```tsx
// In LibraryCard.tsx grid variant, AFTER the onRemove button block:
{badge ? (
  <div className="absolute top-1 left-1 z-10 pointer-events-none">
    {badge}
  </div>
) : null}

// In ProductLibrary.tsx LibraryCard call:
<LibraryCard
  ...
  badge={p.gltfId ? <Box size={12} className="text-text-dim" /> : undefined}
/>
```

**Why top-LEFT not top-right (as CONTEXT.md D-01 implied):**
- Re-read of `LibraryCard.tsx:84-92` shows the existing `onRemove` X button is at `top-1 right-1` with hover-reveal. Putting the persistent badge at `top-1 left-1` avoids visual collision when both are present (X appears on hover, badge stays put).
- CONTEXT.md D-01 says "top-right corner" — flag this for user confirmation. The ProductLibrary call site DOES pass `onRemove` (line 119), so the X button is always available, meaning top-right will collide on hover. **Recommend planner re-check D-01 with user before locking implementation.**

**Why Option A (no background, dim text) over B (pill background, accent color):**
- Phase 33 design system (`src/index.css`, see CLAUDE.md Phase 33 section): X button uses `text-text-ghost hover:text-error` — flat, no pill. A pill background on the badge would be the loudest element on the card and break visual hierarchy.
- `text-text-dim` (#938ea0) over the `bg-obsidian-high` (#292935) thumbnail container has WCAG AA contrast (~3.5:1) — readable but quiet. Matches "subtle persistent identifier" intent.
- 12px size matches the X button's `size={12}` — visual rhyme.

**Why not Option C (hover-revealed):** loses the persistent at-a-glance identification value that's the entire purpose of the badge.

**LibraryCardProps extension:**
```ts
export interface LibraryCardProps {
  // ... existing fields
  /** Optional top-corner badge (e.g., capability indicator). Slot kept generic; caller controls icon + styling. */
  badge?: ReactNode;
}
```

**Evidence:**
- `src/components/library/LibraryCard.tsx:84-92` — existing X button pattern (top-right, hover, `text-text-ghost`).
- `src/components/library/LibraryCard.tsx:33-36` — `ghost-border rounded-md` + `bg-obsidian-low hover:bg-obsidian-high` → low-contrast surface that a 12px text-dim icon reads cleanly against.

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| three | 0.183.2 | Offscreen WebGL rendering, GLTFLoader, Box3, dispose APIs | Matches main viewport version — single THREE namespace |
| lucide-react | already used (Phase 33) | `Box` icon for badge | Phase 33 D-33 icon policy lock — required library |

No new dependencies. No `npm install` needed.

## Architecture Patterns

### Mirror Phase 45 line-for-line
`gltfThumbnailGenerator.ts` should structurally match `swatchThumbnailGenerator.ts`:
- Module-level cache `Map<string, string>`
- Module-level lazy-init `renderer/scene/camera` refs (not lights/mesh — those are scene children)
- `ensureRenderer()` returns the renderer, lazy-builds scene + camera + lights on first call
- Exported async `computeGltfThumbnail(gltfId)` returning `Promise<string>` (dataURL OR `"fallback"`)
- Exported sync `getCachedGltfThumbnail(gltfId, onReady)` returning `string | undefined` (FIX-01 / Phase 57 pattern)
- Test-only `__resetGltfThumbnailCache()` exposed on `window` under `import.meta.env.MODE === "test"`

### LibraryCard slot extension
- Add ONE optional prop (`badge?: ReactNode`).
- Render in BOTH `grid` and `list` variants (`list` may use a different position — top-right of the 8x8 thumbnail box, OR inline before the label).
- Default `undefined` → no DOM element rendered (zero-cost for image-only callers).

### Cache miss → onReady pattern (Phase 57 mirror)
`getCachedGltfThumbnail(gltfId, onReady)`:
- Cache hit (string OR `"fallback"`) → return synchronously
- In-flight (Set membership) → return `undefined`
- Cache miss → kick off async, mark in-flight, return `undefined`; on resolve, set cache + call `onReady`
- `ProductLibrary` uses `useState(0)` tick + `() => setTick(t => t + 1)` as `onReady` → triggers re-render

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Camera auto-fit | Manual diagonal heuristic | FOV-based formula B (above) | Deterministic across aspect ratios |
| Bbox computation | Manual vertex loop | `THREE.Box3().setFromObject(scene)` | Handles nested transforms, indexed geometry |
| Convex hull (already shipped Phase 57) | Re-derive | Reuse `convexHull2D` if needed | N/A — Phase 58 uses bbox not hull |
| Disposal | Manual ref counting | `traverse + dispose` per node | Only safe pattern in three.js (no GC) |
| Async cache miss tracking | Promise queue | `Map + Set` (Phase 57 pattern) | Already proven, identical semantics |

## Common Pitfalls

### Pitfall 1: Stale `matrixWorld` causes 0×0×0 bbox
**What goes wrong:** `Box3.setFromObject(scene)` returns an empty box because freshly-parsed GLTF scenes have identity matrixWorld until traversed.
**Why:** GLTFLoader parses transforms into local matrices; `matrixWorld` is computed lazily on next render frame. Offscreen render BEFORE `Box3` measurement → measurement returns identity transform.
**How to avoid:** Call `scene.updateMatrixWorld(true, true)` BEFORE `Box3.setFromObject`. Already in CONTEXT.md D-11. Phase 56 hits this at `GltfProduct.tsx:41` with `updateWorldMatrix(true, true)`. Phase 57 hits it at `gltfSilhouette.ts:75`.
**Warning sign:** Thumbnails render as a single dot in the center of the frame, OR camera lookAt(0,0,0) targets origin instead of model center.

### Pitfall 2: GPU memory leak across session
**What goes wrong:** Jessica's session fills with 20+ GLTF products → 50-100 MB GPU memory leaked.
**Why:** `scene.remove()` does NOT dispose; three.js has no GC.
**How to avoid:** Always call `disposeGltfScene(scene)` after thumbnail render (see Q4). Apply to BOTH the success path AND the catch block.
**Warning sign:** Chrome DevTools Performance Monitor → "GPU memory" climbs monotonically; eventually `WEBGL_lose_context` extension fires.

### Pitfall 3: Race between Phase 45 and Phase 58 generators
**What goes wrong:** Two lazy renderers both `ensureRenderer()` simultaneously on first library render with mixed materials + GLTF products.
**Why:** Both create a `<canvas>` and a `WebGLRenderer` — fine independently, but if either tries to share a renderer with the other, scene/camera state collides.
**How to avoid:** Already prevented by D-10 — each generator owns its own renderer. Do NOT factor them into a shared base class — the saving (1 renderer instance) is not worth the coupling cost.

### Pitfall 4: Thumbnail dataURL leaks if cache cleared mid-session
**What goes wrong:** `__resetGltfThumbnailCache()` (test helper) discards dataURL strings, but `<img src={dataUrl}>` elements still in DOM hold references → dataURLs survive in memory until React unmounts those nodes.
**Why:** dataURLs are inline base64 in the `src` attribute — browser GC can't collect them while DOM uses them.
**How to avoid:** Acceptable — Jessica won't trigger this in production, only tests. Document in cache helper JSDoc.

## Code Examples

### Verified pattern: lazy-init renderer with lights (Phase 45)
See `src/three/swatchThumbnailGenerator.ts:36-66`. Phase 58 mirrors this exactly:
- 256×256 canvas (vs 128×128 swatch)
- Studio lighting unchanged
- `PerspectiveCamera(35, 1, near, far)` — note FOV=35° per D-04 (Phase 45 used 45°)
- `setClearColor(0x000000, 0)` — transparent

### Verified pattern: GLTF parse without React (Phase 57)
See `src/lib/gltfSilhouette.ts:109-118`:
```ts
const model = await getGltf(gltfId);
if (!model) return null;
const buf = await model.blob.arrayBuffer();
const loader = new GLTFLoader();
const gltf = await loader.parseAsync(buf, "");
return gltf.scene;
```
Reuse this snippet in `computeGltfThumbnail`.

### Verified pattern: bbox + auto-scale (Phase 56)
See `src/three/GltfProduct.tsx:40-58`:
```ts
scene.updateWorldMatrix(true, true);
const b = new THREE.Box3().setFromObject(scene);
const s = new THREE.Vector3();
b.getSize(s);
```

### Verified pattern: async cache miss + onReady (Phase 57)
See `src/lib/gltfSilhouette.ts:120-158`. Replace `Hull` type with `string` for thumbnail dataURL; sentinel changes from `null` → `"fallback"`.

## Runtime State Inventory

Not applicable — Phase 58 is greenfield code addition, no rename/refactor/migration.

## Environment Availability

Skipped — Phase 58 has no external service dependencies. All work is in-browser TypeScript using already-installed packages (three, lucide-react). No CLI tools, no databases, no APIs.

## Validation Architecture

`.planning/config.json` does not currently exist or is silent on `nyquist_validation`; treating as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (already configured) + Playwright (already configured) + RTL via `@testing-library/react` |
| Config file | `vitest.config.ts` + `playwright.config.ts` (existing) |
| Quick run command | `npx vitest run tests/three/gltfThumbnailGenerator.test.ts` |
| Full suite command | `npx vitest run && npx playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| GLTF-INTEGRATION-01 | computeGltfThumbnail resolves to PNG dataURL for synthetic Box scene | unit | `npx vitest run tests/three/gltfThumbnailGenerator.test.ts -t "computeGltfThumbnail"` | ❌ Wave 0 |
| GLTF-INTEGRATION-01 | getCachedGltfThumbnail synchronous hit returns cached value | unit | `npx vitest run tests/three/gltfThumbnailGenerator.test.ts -t "cache hit"` | ❌ Wave 0 |
| GLTF-INTEGRATION-01 | getCachedGltfThumbnail miss → undefined + onReady fires async | unit | `npx vitest run tests/three/gltfThumbnailGenerator.test.ts -t "cache miss"` | ❌ Wave 0 |
| GLTF-INTEGRATION-01 | Invalid gltfId / failed parse → "fallback" sentinel | unit | `npx vitest run tests/three/gltfThumbnailGenerator.test.ts -t "fallback"` | ❌ Wave 0 |
| GLTF-INTEGRATION-01 | LibraryCard renders badge slot when provided | unit | `npx vitest run tests/components/LibraryCard.badge.test.tsx` | ❌ Wave 0 |
| GLTF-INTEGRATION-01 | ProductLibrary renders Box badge for products with gltfId | component | `npx vitest run tests/components/ProductLibrary.gltf.test.tsx -t "badge"` | ❌ Wave 0 |
| GLTF-INTEGRATION-01 | ProductLibrary thumbnail-source priority (imageUrl > gltfId > none) | component | `npx vitest run tests/components/ProductLibrary.gltf.test.tsx -t "thumbnail source"` | ❌ Wave 0 |
| GLTF-INTEGRATION-01 | Phase 48 saved-camera × GLTF round-trip | e2e | `npx playwright test e2e/gltf-integration.spec.ts -g "saved camera"` | ❌ Wave 0 |
| GLTF-INTEGRATION-01 | Library shows Box badge for GLTF products | e2e | `npx playwright test e2e/gltf-integration.spec.ts -g "badge"` | ❌ Wave 0 |
| GLTF-INTEGRATION-01 | Library card thumbnail populated for GLTF-only product | e2e | `npx playwright test e2e/gltf-integration.spec.ts -g "thumbnail"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/three/gltfThumbnailGenerator.test.ts tests/components/LibraryCard.badge.test.tsx tests/components/ProductLibrary.gltf.test.tsx`
- **Per wave merge:** `npx vitest run && npx playwright test e2e/gltf-integration.spec.ts`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/three/gltfThumbnailGenerator.test.ts` — covers GLTF-INTEGRATION-01 (4 unit cases)
- [ ] `tests/components/LibraryCard.badge.test.tsx` — covers badge slot rendering
- [ ] `tests/components/ProductLibrary.gltf.test.tsx` — covers component-level integration (2 cases)
- [ ] `e2e/gltf-integration.spec.ts` — covers Phase 48 × GLTF + library DOM assertions (3 cases)
- [ ] Test fixture: confirm `tests/e2e/fixtures/box.glb` already exists (Phase 56 dependency) — should NOT need re-add
- Framework install: not needed; vitest + playwright already configured

## Sources

### Primary (HIGH confidence)
- `src/three/swatchThumbnailGenerator.ts:1-137` — Phase 45 pattern, full source mirror target
- `src/lib/gltfSilhouette.ts:1-165` — Phase 57 GLTF-load + async-cache pattern
- `src/three/GltfProduct.tsx:36-58` — Phase 56 bbox + scale pattern
- `src/components/library/LibraryCard.tsx:1-107` — current LibraryCard structure
- `src/components/ProductLibrary.tsx:111-122` — current LibraryCard call site
- Three.js docs (verified via prior Phase 45/56/57 research) — disposal API, GLTFLoader semantics, Box3 API

### Secondary (MEDIUM confidence)
- WebGL context limit estimates (Chrome ~16, Safari ~8) — community-reported, varies by GPU/driver; safe at 3 by any measure

### Tertiary (LOW confidence)
- None — all critical claims have direct codebase evidence or three.js API verification

## Metadata

**Confidence breakdown:**
- GLTFLoader scene reuse: HIGH — Phase 57 already proves no shared-reference issues
- Camera framing: HIGH — FOV math is geometric truth; safety factor empirical but generous
- WebGL context count: HIGH — `grep` of source confirms only 2 existing renderers
- Disposal pattern: HIGH — three.js disposal docs unchanged for 5+ years
- Badge styling: HIGH — derived from Phase 33 design tokens + existing LibraryCard X-button precedent

**Open flag for planner:** CONTEXT.md D-01 says "top-right corner" badge, but the existing X button is already at top-right. Recommend top-LEFT to avoid hover collision OR explicit user confirmation that the Box badge should overlap/replace the X button position. See Q5.

**Research date:** 2026-05-04
**Valid until:** 2026-06-04 (30 days — three.js + lucide are stable; in-house code in active dev but Phase 58 has no upstream churn)
