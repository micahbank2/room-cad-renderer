# Pitfalls Research — v1.7 3D Realism (PBR + User Textures + Camera Presets)

**Domain:** Browser-based interior 3D CAD on React 18 + Three.js 0.183 + R3F v8.17 + drei v9.122, single-user, IndexedDB persistence, no backend.
**Researched:** 2026-04-20
**Confidence:** HIGH (most rules cite Three.js / R3F / drei docs, MDN, or are inferable from the existing code with file:line references)

> Format: every rule is phrased as **MUST / MUST NOT / SHOULD** so the roadmapper can drop them straight into acceptance criteria. "Code:" tags reference the existing codebase, "Source:" tags reference external docs / known issues.

---

## Critical Pitfalls

### 1. Color-space corruption on PBR textures

**What goes wrong:** Albedo/diffuse maps look washed out or too dark; normal maps produce wrong shading; roughness maps invert apparent glossiness.

**Why it happens:** Three.js r152+ moved to "color management on" by default — only color textures should be tagged `SRGBColorSpace`; data textures (normal, roughness, metalness, AO, displacement) MUST stay in `LinearSRGBColorSpace` (the default). drei's `useTexture` does **not** auto-tag color space — the caller must set it. The existing wallpaper/wall-art loader at `src/three/WallMesh.tsx:18-41` never sets `colorSpace`, which is acceptable for the current image-as-pattern use case but **will silently corrupt PBR albedo maps** when the same loader pattern is copy-pasted for v1.7.

**Rules:**
- Albedo/diffuse maps **MUST** set `tex.colorSpace = THREE.SRGBColorSpace` immediately after load.
- Normal, roughness, metalness, AO, displacement maps **MUST NOT** set sRGB color space — leave the default `LinearSRGBColorSpace`.
- A single texture-loader helper **SHOULD** be the only place that sets `colorSpace`, parameterized by `kind: "color" | "data"`. Do not let individual mesh files re-implement loaders.
- Existing helpers `getWallArtTexture` / `getWallpaperTexture` (`src/three/WallMesh.tsx:18-41`) **SHOULD** be migrated to the new helper (or explicitly tagged sRGB) so existing assets do not change appearance under the new default-on color management.

**Source:** Three.js color management migration guide (r152+); drei `useTexture` README.

**Phase:** Phase 32 (PBR foundations) — establish the loader before any material upgrade.

---

### 2. Normal-map handedness / Y-flip

**What goes wrong:** Surface bumps appear inverted (concave looks convex), or normals look correct on Side B and inverted on Side A.

**Why it happens:** Three.js uses OpenGL-style normal maps (+Y up). Many texture sites (Substance, Quixel, freepbr.com) export DirectX-style (-Y). Compounding this: `WallMesh.tsx:283` rotates Side A by `[0, Math.PI, 0]` to flip to the back face — a 180° Y rotation flips tangent space and can invert apparent normal-map lighting on the mirrored side.

**Rules:**
- Loader **SHOULD** support per-texture green-channel flip via `material.normalScale.y *= -1` to convert DirectX → OpenGL.
- Wall PBR materials applied to Side A vs Side B **MUST** be visually verified at execute-time on a textured wall — not just a flat-color one.
- Document the convention (e.g., "we expect OpenGL-style normals; DirectX uploads are auto-flipped") in CLAUDE.md so Jessica's uploads behave predictably.

**Source:** Three.js docs "Normal maps and tangent space"; widely reported in r3f community.

**Phase:** Phase 32.

---

### 3. Texture wrap mode — real-world tiling and per-map sync

**What goes wrong:** Wallpaper or wood-grain repeats look stretched, mirrored, or have visible seams; or the normal map tiles at a different rate than the albedo, producing a parallax-like artifact.

**Why it happens:** `THREE.RepeatWrapping` requires `tex.wrapS = tex.wrapT = THREE.RepeatWrapping` AND a sensible `tex.repeat.set(u, v)`. The existing wallpaper code at `src/three/WallMesh.tsx:120-127` does this correctly (computes `length / scaleFt`), but PBR materials need albedo + normal + roughness + AO to all share the **same** repeat. Mismatched repeats between maps produce visible artifacts.

**Rules:**
- All maps in a single PBR material set (albedo, normal, roughness, AO) **MUST** share `wrapS`, `wrapT`, `repeat`, and `offset`. Use a shared "configure" helper or apply once across all maps.
- Tiling scale **MUST** be expressed in feet (real-world tile size), not in canvas pixels — match the existing pattern at `WallMesh.tsx:122` (`tex.repeat.set(length / s, height / s)`).
- For non-tiling assets (wall art, single-image albedo) **MUST** use `ClampToEdgeWrapping` and `repeat.set(1, 1)` — already correct at `WallMesh.tsx:24-27`.
- Setting `repeat` / `wrap` after first frame **MUST** be followed by `tex.needsUpdate = true` (already done at `WallMesh.tsx:128`).

**Source:** Three.js Texture docs.

**Phase:** Phase 32.

---

### 4. Anisotropic filtering not set — wall surfaces blur at oblique angles

**What goes wrong:** Wood floor and wall textures look sharp from above but smear into a blur in walk mode, where most surfaces are seen at glancing angles.

**Why it happens:** Three.js defaults `anisotropy` to 1. For floor/wall textures viewed at oblique angles (precisely the eye-level walkthrough mode #45 unlocks), this produces visible blur.

**Rules:**
- The PBR loader **MUST** set `tex.anisotropy = renderer.capabilities.getMaxAnisotropy()` for floor and wall textures. Cap at 8 if you want to be conservative across GPUs.
- Anisotropy **SHOULD NOT** be applied to small props (chair fabric, tabletop items) — the cost isn't worth it.
- `gl` access in R3F is via `useThree(s => s.gl)` — the loader needs renderer access, so either it's called from inside a hook or anisotropy is set via a one-time `useEffect` after first frame.

**Source:** Three.js `Texture.anisotropy` docs; drei's `useTexture` does not auto-anisotropy.

**Phase:** Phase 32.

---

### 5. Texture / material disposal — leaking GPU memory across material swaps

**What goes wrong:** Switching wall material from `WOOD_PLANK` → `CONCRETE` → `PLASTER` 20 times balloons GPU memory until the tab crashes, especially with 4K user uploads.

**Why it happens:** Three.js does NOT garbage-collect WebGL resources. Every `Texture` and `Material` allocates GPU buffers that persist until `.dispose()` is called explicitly. R3F **does** auto-dispose meshes/materials/geometries created declaratively in JSX. However, **textures created imperatively and stored in module-level caches (the existing pattern at `WallMesh.tsx:18`, `:32`) are never disposed.** Today this is bounded because there are only a handful of wallpaper assets; with user uploads + multiple PBR map sets it becomes unbounded.

**Rules:**
- Module-level texture caches **MUST** expose a `disposeTexture(url)` API that removes from cache AND calls `tex.dispose()`. Call this when a texture is removed from the user library.
- When swapping albedo on an existing material via `material.map = newTex`, the OLD texture **MUST** be disposed if no other material references it — or a refcount **MUST** be maintained.
- A development-only counter **SHOULD** be exposed (e.g., `window.__textureCount`) so QA can sanity-check after a 50-swap session.
- Material objects created inside JSX (e.g., `<meshStandardMaterial>` in `WallMesh.tsx:268`) **MUST NOT** be manually disposed — R3F handles it. Only imperatively-created `new THREE.MeshStandardMaterial()` needs manual disposal.

**Source:** Three.js "How to dispose of objects" docs; pmndrs/react-three-fiber FAQ.

**Phase:** Phase 32 / Phase 33.

---

### 6. WebGL context teardown mid-load — texture loads after canvas unmounts

**What goes wrong:** User switches from `3d` to `2d` view while a 4K texture is decoding. The Promise resolves after the R3F Canvas has unmounted; uploading the image to a destroyed WebGL context throws or silently no-ops, and the cached texture entry is bound to a dead context.

**Why it happens:** `ThreeViewport.tsx:212-225` mounts/unmounts a `<Canvas>` based on viewMode. Existing texture caches at `WallMesh.tsx:18`, `:32` (and `floorTexture.ts`) are module-scoped — the cached `Texture` outlives the Canvas. On next mount, the cached texture is still bound to the old (disposed) GL context.

**Rules:**
- Module-level texture caches **MUST** key on URL, not `(URL, canvas)`. The cache **MUST** be invalidated on `<Canvas>` unmount, OR textures **MUST** be decoded once and re-uploaded lazily on first material `onBeforeRender` after a context change.
- Alternative (simpler): wrap PBR loads in drei `useTexture` inside Suspense — drei handles lifecycle correctly per-Canvas but does NOT share across canvases. Cost: load duplication on split-view → 3D-only switch.
- Texture-loading promises **SHOULD** check `gl.isContextLost()` before applying.
- The view-mode switch **MUST** be tested with a slow-loading texture (DevTools "Slow 3G") to confirm no console errors.

**Source:** Three.js `WebGLRenderer.dispose` docs; pmndrs/drei issues re: split-canvas texture sharing.

**Phase:** Phase 32 (set the cache pattern); regression-test in Phase 33.

---

### 7. Suspense boundary swallows the entire scene if a single texture fails

**What goes wrong:** One bad PBR map URL in a user upload causes the whole 3D viewport to suspend indefinitely. The `Suspense fallback={null}` at `ThreeViewport.tsx:120-122` (currently wrapping `<Environment>`) means the user sees nothing with no error message.

**Why it happens:** drei `useTexture` throws a Promise on load → Suspense catches it. If the load rejects, Suspense never resolves. R3F has no built-in error boundary.

**Rules:**
- Each PBR-textured mesh (or each material set) **MUST** be wrapped in its own `<Suspense fallback={<FallbackMaterial />}>` so a single failure doesn't black out the scene.
- A React `<ErrorBoundary>` **SHOULD** wrap each suspending texture user; on error, fall back to flat-color `meshStandardMaterial`.
- User-upload error path **MUST** show a toast: "Could not load texture X — using flat color." Never silently fail.
- The existing `Suspense fallback={null}` at `ThreeViewport.tsx:120` **SHOULD** keep its current narrow scope (only `<Environment>`); PBR meshes need their own boundaries.

**Source:** R3F docs "Suspense"; drei `useTexture` README.

**Phase:** Phase 32.

---

### 8. Mipmap generation cost on first frame — 4K uploads stall the main thread

**What goes wrong:** First time a user-uploaded 4096×4096 image is rendered, the mipmap pyramid is generated synchronously on the GPU/main thread. Frame time spikes 200–800ms; in walk mode this looks like a freeze.

**Why it happens:** Three.js generates mipmaps the first time a texture is used in a draw call (default `generateMipmaps = true`). For 4K images this is expensive. Compounded by the fact that 4K is wasteful for wall surfaces seen from 8 ft away — 1024² is plenty.

**Rules:**
- User uploads **MUST** be auto-downscaled to ≤2048 on the longest edge before persistence. Use a `<canvas>` `drawImage` resize on the main thread (acceptable for 4K → 2K, ~50ms) or `createImageBitmap` with `resizeWidth` (faster, off-main-thread).
- Texture loader **SHOULD** keep `generateMipmaps = true` (default) AND `THREE.LinearMipmapLinearFilter` (default) — do not disable mipmaps to avoid the cost; just downscale the source.
- For PBR map sets where source images have different sizes, the loader **MUST** assert all maps are within 2× of each other on each axis (mismatched resolutions waste memory without quality gain).
- A warning toast **SHOULD** fire if upload >10 MB before processing.

**Source:** Three.js Texture docs; widely-discussed perf issue in r3f community.

**Phase:** Phase 33 (user texture upload).

---

### 9. IndexedDB Blob persistence — base64 vs Blob, quota, eviction

**What goes wrong:** Storing 50 user textures as base64 strings in IndexedDB inflates payload by ~33% over Blob storage and slows project load (large strings JSON-parse slowly). Browser quota eviction can also discard textures silently in low-disk situations.

**Why it happens:** The existing pattern at `src/components/AddProductModal.tsx` (per CONCERNS.md security note) converts uploads to base64 and stores them in `imageUrl` — fine for small product photos, painful for 4K PBR maps. `idb-keyval` (used at `src/lib/serialization.ts`) supports `Blob` natively via structured clone.

**Rules:**
- v1.7 user texture uploads **MUST** be stored as `Blob` in IndexedDB, not base64. Use `URL.createObjectURL(blob)` to get a render URL, and revoke when done.
- Each `URL.createObjectURL` call **MUST** be paired with `URL.revokeObjectURL` when the texture is removed from the cache or when the canvas unmounts. Failing to revoke is a slow leak that browsers will not GC.
- A texture record **SHOULD** be `{ id, name, blob, mimeType, width, height, hash, createdAt }` — store width/height after upload so consumers don't have to decode-to-measure on every project load.
- File-type validation **MUST** restrict to `image/jpeg`, `image/png`, `image/webp`. Reject `image/svg+xml` (XSS via embedded scripts), `image/gif` (animated maps not supported by Three.js), and unknown types.
- Quota: a single user texture **MUST NOT** exceed 5 MB after auto-downscale. Total user library quota **SHOULD** be capped at ~100 MB with a UI counter (`72 / 100 MB used`).
- Dedup: hash uploaded bytes (SHA-256 of the resized output, not the raw upload) and reject duplicates with a "this texture already exists as X" message — name-based dedup is brittle (Pinterest exports as `unnamed.jpg`).

**Source:** MDN "IndexedDB best practices"; MDN `URL.createObjectURL` (memory lifetime).

**Phase:** Phase 33.

---

### 10. Camera tween fights OrbitControls damping

**What goes wrong:** `1/2/3/4` preset switch jumps to the new position, then OrbitControls' damping springs the camera back toward the user's last position; or the lerp loop and damping fight, producing a jittery result.

**Why it happens:** When `enableDamping={true}` (already set at `ThreeViewport.tsx:174-175`), OrbitControls applies inertia each frame in `controls.update()`. Imperatively writing `cam.position.set(...)` while damping is active creates a tug-of-war. The existing wall-side animation at `ThreeViewport.tsx:84-103` works around this by lerping `cam.position` AND `controls.target` together each frame and calling `controls.update()` — this is the correct pattern, but it MUST be replicated for camera presets.

**Rules:**
- Preset switching **MUST** use the existing lerp pattern at `ThreeViewport.tsx:84-103` (animate both `cam.position` AND `controls.target`, call `controls.update()`, snap when distance < 0.05).
- During an active tween, OrbitControls **SHOULD** be disabled (`controls.enabled = false`) and re-enabled on tween complete — prevents user input mid-tween from interrupting.
- Multiple rapid preset clicks **MUST** cancel the previous tween (overwrite `cameraAnimTarget.current`) — already the pattern at `:79`. Verify no stacking lerps.
- Preset switch **MUST NOT** be allowed in walk mode without first switching to orbit. Switching `cameraMode` mid-tween **MUST** clear `cameraAnimTarget.current` to avoid the tween writing into a destroyed PointerLockControls camera.

**Source:** drei OrbitControls README; Three.js OrbitControls source (uses `update()` with damping accumulator).

**Phase:** Phase 34 (camera presets).

---

### 11. Aspect ratio bug on view-mode toggle mid-tween

**What goes wrong:** Switching `2d` → `3d` (or vice versa) while a camera tween is mid-animation leaves the camera at a stretched aspect because the Canvas resize fires after the lerp captured the old aspect.

**Why it happens:** R3F auto-updates camera aspect on canvas resize via `useThree()` reactivity. But if `cameraAnimTarget.current` writes `cam.position` AFTER the resize, `cam.updateProjectionMatrix()` may not fire again unless explicitly triggered.

**Rules:**
- View-mode toggle **MUST** clear any in-flight `cameraAnimTarget.current` (snap to final position immediately).
- After view-mode toggle, on next frame the controller **MUST** call `cam.updateProjectionMatrix()` once.
- Canvas wrapper **SHOULD** use ResizeObserver-based confirmation that the new aspect propagated before re-enabling tweens.

**Source:** R3F Canvas docs (auto-resize); Three.js Camera docs.

**Phase:** Phase 34.

---

### 12. Saving "last camera position" creates an infinite loop

**What goes wrong:** Storing camera position in Zustand on every `OrbitControls.onChange` triggers store mutation → `useAutoSave` subscriber fires → debounced save → eventually triggers a re-render that re-creates `OrbitControls` with the saved target → fires `onChange` again. Spinner of doom.

**Why it happens:** OrbitControls' `onChange` fires on EVERY frame during damping, not just on user input end. The existing pattern at `ThreeViewport.tsx:176-183` already updates `orbitPosRef` (a ref, not store state) on every change — this is correct.

**Rules:**
- Camera position **MUST NOT** be stored in Zustand. Keep it in `useRef` (current pattern at `:41-42` is correct).
- If camera position MUST be persisted across reloads (e.g., for "restore last view"), the write **MUST** be:
  - Throttled to ≤1 Hz (debounce, not on every onChange frame).
  - Written to a separate, non-CAD store (e.g., `uiStore` or a dedicated `cameraStore`) that does NOT trigger `useAutoSave`.
- The existing `useAutoSave` filter (`src/hooks/useAutoSave.ts:56-67`) only subscribes to `state.rooms` / `activeRoomId` / `customElements`. Camera-position writes **MUST NOT** land in those slices.

**Source:** Inferable from existing `useAutoSave` filter; drei OrbitControls docs ("onChange fires every frame during damping").

**Phase:** Phase 34.

---

### 13. Auto-save debounce includes texture-upload mutations → multi-MB serialization on every paint stroke

**What goes wrong:** User uploads a 4 MB texture; `useAutoSave` (`src/hooks/useAutoSave.ts:11-86`) debounces 2s and serializes the entire snapshot, which now includes a 4 MB Blob inline. Save takes 800ms+, blocks UI, and Jessica sees `SAVING...` for an uncomfortable duration on every minor edit.

**Why it happens:** `useAutoSave` subscribes to `state.rooms` AND `state.customElements`. If user textures are stored in `cadStore` (e.g., as part of `floorMaterial` or wallpaper config), every save serializes them. Even worse if textures are inlined as base64 inside the snapshot.

**Rules:**
- User texture Blobs **MUST** live in a separate store (e.g., `userTextureStore`) with its own IndexedDB keyspace (e.g., `room-cad-texture-{id}`). Snapshots **MUST** reference textures by `id` only, never inline the Blob.
- `useAutoSave` subscribers **MUST NOT** be added for the texture store. Texture uploads persist independently (write-once on upload, not on snapshot save).
- The CADSnapshot serialization (`src/lib/serialization.ts:24-36`) **MUST** be benchmarked at execute-time with 10 user textures referenced — assert <100ms `structuredClone` + IDB write.
- Textures referenced by ID but missing from the texture store on load **MUST** render a placeholder (analogous to `ProductMesh.tsx:14`'s `isPlaceholder` path) — never crash.

**Source:** Inferable from `src/hooks/useAutoSave.ts` and `src/lib/serialization.ts` structure.

**Phase:** Phase 33; regression-tested in Phase 34.

---

### 14. Snapshot deep-clone (Phase 25 `structuredClone`) chokes on Blob references

**What goes wrong:** `cadStore.snapshot()` uses `structuredClone(toPlain(...))` per Phase 25 D-07. If a user-texture Blob ends up inside the snapshot tree (even by mistake), `structuredClone` will succeed (Blobs are clonable) but the per-snapshot memory cost balloons and IndexedDB writes blow out — a hard-to-find perf regression.

**Why it happens:** `structuredClone` silently handles Blob — there's no error, just a slow snapshot. The existing snapshot perf budget (Phase 25 D-07: <0.3ms at 50W/30P) would be violated by a single 4 MB Blob.

**Rules:**
- A unit test **MUST** assert that `cadStore.snapshot()` output, when JSON-serialized, contains no `data:` URL substrings >10 KB and no `Blob` instances (only ID references).
- All texture-bearing types (`PlacedProduct`, `WallSegment.wallpaper`, `FloorMaterial`, etc.) **MUST** reference textures by ID. Existing `imageUrl: string` fields **SHOULD** transition to `textureId: string` for user-uploaded assets (preserve `imageUrl` for legacy / built-ins).
- Migration: existing base64 `imageUrl` values in saved projects **MUST** be auto-migrated to texture-store entries on load (one-time migration in `loadProject` or a versioned snapshot upgrader).

**Source:** Inferable from Phase 25 D-07 contract documented in PROJECT.md; MDN `structuredClone` (supports Blob).

**Phase:** Phase 33.

---

### 15. jsdom / happy-dom can't run WebGL — PBR pipeline is untestable in unit tests

**What goes wrong:** Vitest specs that import `<Canvas>` or any R3F hook fail with "WebGL is not supported" because jsdom has no WebGL context. The existing Phase 24-31 pattern of `window.__driveX` test drivers will not extend cleanly to 3D.

**Why it happens:** jsdom's `HTMLCanvasElement.getContext("webgl2")` returns `null`. happy-dom is the same. Headless WebGL requires either headless-gl (native binding, fragile) or a real browser via Playwright.

**Rules:**
- 3D features **MUST** ship with a hybrid test strategy:
  - **Unit-testable layer:** texture loader, color-space helper, downscale function, ID dedup, format validation, store mutations. Pure TS, no `<Canvas>`. Target ≥90% coverage on these.
  - **Visual smoke layer:** Playwright spec that loads the app, places a wall, applies WOOD_PLANK, screenshots the 3D viewport, asserts the screenshot has expected dominant color buckets. One spec per material is enough.
- `<Canvas>` and R3F components **MUST NOT** be imported in jsdom test files. Mock the texture loader at the module boundary.
- Visual regression tests **SHOULD** use `tolerance: 5%` pixel diff — strict zero-diff fails on GPU-vendor variation.
- Skip-strategy: if Playwright is too heavy, an `it.skip` with a `// TODO: visual` marker is acceptable, BUT the unit-testable layer (loader + dedup + validation) **MUST NOT** be skipped.

**Source:** jsdom GitHub issue #1875 (WebGL closed wontfix); R3F testing docs recommend `@react-three/test-renderer` (limited adoption, no WebGL either).

**Phase:** Phase 32 (set up the split); apply across all 3D phases.

---

### 16. drei v9 `Environment` preset Suspense lockup if HDR fetch fails

**What goes wrong:** `<Environment preset="apartment" />` (`ThreeViewport.tsx:121`) fetches an HDR from the pmndrs CDN on first load. If offline / CDN slow / CORS blocked, the wrapping Suspense (`:120`) never resolves; with `fallback={null}` the user sees no Environment lighting at all (PBR materials look flat / wrong roughness).

**Why it happens:** drei v9 `Environment preset` mode hits `https://market-assets.fra1.cdn.digitaloceanspaces.com/...` — CDN dependency outside our control. R3F v8 doesn't surface load errors.

**Rules:**
- For v1.7, the PBR rollout assumes Environment IS providing IBL. **MUST** ship a fallback: if Environment fails to load within 3s, the lighting setup **SHOULD** boost `<hemisphereLight>` and `<ambientLight>` intensity to compensate (visible-but-flat is better than dark).
- An ErrorBoundary **MUST** wrap `<Environment>` so a CDN failure cannot black out the scene.
- For long-term durability, consider bundling a small HDR (≤500 KB compressed HDR or EXR) and loading from `/public/` instead of CDN — eliminates the dependency.

**Source:** drei `Environment` source on GitHub; community reports of CDN flakes.

**Phase:** Phase 32.

---

### 17. R3F v8 + drei v9 specific — pinned versions and Strict Mode

**What goes wrong:** Adding new R3F v9-only patterns (e.g., the new `ThreeElements` JSX namespace from v9 migration guide) breaks the v8 build silently because TS types resolve via global JSX merging.

**Why it happens:** The codebase is locked at R3F 8.17 / drei 9.122 (per PROJECT.md "Tech Stack" + CONCERNS.md "R3F v9 / React 19 Upgrade" — execution deferred per D-02). v9-only APIs do not exist in v8, but TypeScript may not catch all of them.

**Rules:**
- v1.7 code **MUST NOT** import from `@react-three/fiber/v9` or use v9-only APIs (`ThreeElements` type, new ref-as-prop patterns).
- Before merging v1.7 PBR work, run `npm ls @react-three/fiber @react-three/drei` to confirm no transitive bump.
- StrictMode (if enabled) **MUST NOT** double-register imperative event listeners or double-load textures — verify by toggling StrictMode at root and re-running the texture-leak test.
- The deferred R3F v9 / React 19 upgrade (GH #56) **MUST** remain deferred — v1.7 is explicitly NOT the time to bundle this in.

**Source:** PROJECT.md (React 18 lock); CONCERNS.md "R3F v9 / React 19 Upgrade"; R3F v9 migration guide.

**Phase:** Phase 32.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store user textures as base64 in cadStore (extending existing pattern) | Reuses Phase 1-31 patterns; no new store | Snapshot bloat, slow saves, structuredClone perf collapse, no dedup | **NEVER** for v1.7 |
| Skip color-space tagging on PBR maps | Faster loader code | Permanent washed-out / wrong materials; expensive to fix later because every saved project's appearance changes | NEVER |
| Use drei `useTexture` for ALL textures (not just PBR) | One API everywhere | Forces every texture under Suspense; complicates the existing async wallpaper/wallart loader | Only in new PBR mesh code, not retrofit |
| Allow original-resolution uploads (no downscale) | Simpler upload flow | First-frame stalls, GPU pressure, IDB bloat | NEVER for v1.7 |
| Persist camera position in cadStore | "Restore last view" works trivially | Feedback loop with useAutoSave; saves fire on every damping frame | NEVER — refs or non-CAD store |
| Single Suspense boundary around the entire scene | Simple JSX | One bad texture blacks out everything | NEVER |
| Skip texture disposal | "It works" in dev | GPU memory leaks; tab crashes after extended sessions | Only in tests |
| Revert snapshot to `JSON.parse(JSON.stringify(...))` | Sidesteps Blob worry | Loses Phase 25 D-07 contract; loses Date/Map fidelity | NEVER |
| Bundle R3F v9 / React 19 upgrade with v1.7 | "Two birds, one PR" | Massive risk surface; v1.7 already touches the 3D layer | NEVER — keep deferred per D-02 |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| drei `useTexture` | Assuming it tags color space | Manually set `tex.colorSpace = THREE.SRGBColorSpace` after load for color maps |
| drei `Environment preset` | Assuming CDN is always available | Wrap in ErrorBoundary; provide fallback lighting; consider bundling local HDR |
| `idb-keyval` | Storing Blobs as base64 strings | Store native `Blob` — `idb-keyval` supports it via structured clone |
| `URL.createObjectURL` | Forgetting `revokeObjectURL` | Pair every create with revoke on cache eviction |
| OrbitControls + lerp | Imperative `cam.position.set` while damping is active | Animate both position AND target; call `controls.update()`; snap on epsilon |
| `<Canvas>` mount/unmount | Module-cached textures bound to dead GL context | Per-canvas cache, OR invalidate on unmount, OR rely on drei's per-Canvas Suspense cache |
| PointerLockControls | Switching mode while pointer locked | Always exit pointer lock before switching `cameraMode` (verify existing `WalkCameraController`) |
| File upload `<input type="file">` | Accepting any MIME type | `accept="image/jpeg,image/png,image/webp"` AND client-side `file.type` check AND optional magic-byte check |
| ExtrudeGeometry + textures | Re-extruding on every render | Memoize geometry by `(length, height, thickness, openings hash)` — already done at `WallMesh.tsx:63-89` |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| 4K texture mipmap on first frame | 200-800ms freeze when applying a new material | Auto-downscale uploads to ≤2048 longest edge | Any 4K source — happens immediately |
| Texture cache leak across material swaps | GPU memory grows unbounded; eventual `WebGL: CONTEXT_LOST` | Refcount textures in cache; dispose on unref-zero | After ~50-100 swaps with 2K+ textures |
| Snapshot serialization with inlined Blobs | Save status pinned to `SAVING...` for >500ms | Reference textures by ID only in snapshot | First user-uploaded 4MB texture in scene |
| Suspense waterfall (5 PBR maps load serially) | "Pop-in" — wall stays grey for several seconds | Preload map sets together via `useTexture([...urls])` | First-load of a wall material |
| OrbitControls `onChange` writing into Zustand | UI jank; auto-save spam | Keep camera in `useRef`; if persisted, throttle to ~1Hz, separate store | Immediately on first orbit during damping |
| Per-frame `useFrame` with object allocation | GC pauses; frame drops in walk mode | Reuse `THREE.Vector3` instances outside the frame closure | At ~50+ products in scene |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Accepting `image/svg+xml` as user texture | XSS via embedded `<script>` in SVG | Whitelist `image/jpeg`, `image/png`, `image/webp` only |
| Trusting `file.type` (MIME) without sanity check | User renames `.exe` to `.png`; some libraries misbehave | Decode-or-reject (try `createImageBitmap`; if it throws, reject). For low-risk personal tool, MIME + decode is sufficient |
| Storing user-uploaded HTML data URLs in IndexedDB | If ever rendered as innerHTML elsewhere → XSS | Store Blob, not data URL. Render only via `<img src={objectURL}>` or `Texture` |
| HDR/EXR uploads from arbitrary URL | Tainted canvas — `gl.readPixels` and PNG export silently fail | All uploads go through `<input type="file">` (already same-origin Blob); reject `http(s)://` URL imports unless explicitly CORS-tested |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visual feedback during texture upload | Jessica thinks the app froze on a 10MB JPEG | Inline progress: "Resizing..." → "Saving..." → done |
| Camera preset jumps instantly without tween | Disorienting; loses spatial context | 300-500ms eased lerp (existing pattern at `ThreeViewport.tsx:84-103`) |
| Walk mode entered from a preset that's outside the room | User immediately walks into a wall | Walk-mode entry **MUST** clamp camera to inside-room bounds (verify `WalkCameraController` collision) |
| PBR materials look "wrong" because lighting wasn't tuned | Jessica thinks she's bad at picking materials | Tune `<Lighting />` (`src/three/Lighting.tsx`) to neutral D65-ish white point; verify all PBR presets render acceptably |
| User uploads texture but can't preview before applying | Trial-and-error friction | Upload modal shows 200×200 thumbnail before "Add to library" |
| "Albedo / Normal / Roughness" jargon in upload UI | Confusing for non-technical user | Default to "drop a photo" → albedo only. Hide normal/roughness behind an "Advanced" toggle |
| Camera presets with non-obvious names (`PRESET_3` etc.) | User can't predict what `2` does | Toolbar labels: `EYE_LEVEL`, `TOP_DOWN`, `THREE_QUARTER`, `CORNER` — match Obsidian CAD label convention |

---

## "Looks Done But Isn't" Checklist

- [ ] **PBR loader:** Often missing color-space tags — verify a normal map renders correctly (no inverted bumps) AND an albedo doesn't look washed out.
- [ ] **Texture cache:** Often missing dispose path — verify GPU memory in DevTools after 20 material swaps stays under 100MB.
- [ ] **User upload:** Often missing auto-downscale — verify a 4096×4096 upload becomes ≤2048×2048 in IDB.
- [ ] **User upload:** Often missing dedup — verify uploading the same file twice produces ONE library entry.
- [ ] **User upload:** Often missing revokeObjectURL — verify `performance.memory.usedJSHeapSize` doesn't grow per upload+remove cycle.
- [ ] **Camera presets:** Often missing tween cancellation — verify rapid `1→2→3→1` clicks land at preset 1, no leftover lerp.
- [ ] **Camera presets:** Often missing walk-mode handoff — verify clicking a preset while in walk mode either disabled OR transitions cleanly to orbit first.
- [ ] **Auto-save:** Often missing texture-mutation exclusion — verify uploading a texture does NOT trigger `SAVING...`.
- [ ] **Snapshot:** Often missing Blob exclusion — verify `JSON.stringify(snapshot).length` does not jump after a texture upload.
- [ ] **Suspense:** Often missing per-mesh boundaries — verify a deliberately-broken texture URL still renders the rest of the scene.
- [ ] **Environment:** Often missing CDN fallback — verify offline mode (DevTools Network: Offline) doesn't black out the scene.
- [ ] **View-mode toggle:** Often missing aspect-ratio fix — verify split → 3d → 2d → 3d preserves orbit camera position correctly.
- [ ] **Memory:** Often missing leak test — verify a 5-min walk-mode + material-swap session keeps GPU < 200MB and JS heap < 200MB.
- [ ] **R3F v8 lock:** Often missing version assertion — verify `npm ls @react-three/fiber` is still v8.x after install.
- [ ] **Drag fast-path (Phase 25):** Often missing regression check — verify mid-drag camera-preset switch does NOT break the drag's single-undo-entry contract.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Color-space wrong on shipped textures | LOW | Add color-space tag to loader; existing textures re-render correctly on next load (no migration needed) |
| Texture cache leak | MEDIUM | Add dispose path; users must reload tab to reclaim leaked GPU memory once |
| Inlined Blobs in snapshot (regression) | HIGH | Migration: walk all saved projects, extract embedded Blobs to texture store, replace with IDs. Risk of partial migration if user has many projects |
| Auto-save firing on texture upload (perf regression) | LOW | Filter out texture-store mutations from `useAutoSave` subscriber |
| Camera tween / damping fight | LOW | Switch to the proven pattern at `ThreeViewport.tsx:84-103` |
| Lost user textures from IDB eviction | HIGH | Cannot recover. Prevention: warn user when total > 50MB, encourage cleanup |
| Suspense lockup from bad Environment CDN | MEDIUM | Ship local HDR fallback; deploy as patch release |
| User uploads SVG with embedded JS | HIGH (if app re-deployed publicly) / LOW (single-user) | Whitelist MIME up front; never accept SVG |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Color-space corruption | Phase 32 (PBR foundation) | Loader unit test + visual smoke (normal map produces shading) |
| 2. Normal-map handedness | Phase 32 | Visual: textured wall in Side A AND Side B |
| 3. Wrap mode / tiling | Phase 32 | All maps in a set share `repeat` (assertion in loader) |
| 4. Anisotropy | Phase 32 | Walk-mode screenshot at glancing angle vs. baseline |
| 5. Texture / material disposal | Phase 32 (set pattern) + Phase 33 (cache) | DevTools GPU memory after 20-swap session |
| 6. WebGL teardown mid-load | Phase 32 | Slow-3G load + view-mode toggle smoke test |
| 7. Suspense per mesh | Phase 32 | Deliberately broken texture URL test |
| 8. Mipmap / 4K stall | Phase 33 (user upload) | Upload 4K image, assert downscaled to ≤2048 in IDB |
| 9. IDB Blob persistence | Phase 33 | Unit test: stored type is Blob not string |
| 10. Camera tween + damping | Phase 34 (camera presets) | Rapid `1→2→3→1` test |
| 11. Aspect ratio mid-tween | Phase 34 | View-mode toggle during preset tween |
| 12. Camera-pos save loop | Phase 34 | `useAutoSave` does NOT fire on orbit |
| 13. Auto-save bloat from textures | Phase 33 | Upload texture, observe no `SAVING...` toolbar flash |
| 14. Snapshot Blob leak | Phase 33 | Unit test: snapshot JSON has no large data: substrings |
| 15. WebGL untestable | Phase 32 (split test strategy) | At least one Playwright visual smoke per material |
| 16. Environment CDN fail | Phase 32 | DevTools Offline test |
| 17. R3F v8 / drei v9 lock | Phase 32 | `npm ls` assertion in CI / phase verification |

---

## Sources

- Three.js Color Management migration (r152+): https://threejs.org/docs/#manual/en/introduction/Color-management
- Three.js Texture docs (wrap, anisotropy, dispose): https://threejs.org/docs/#api/en/textures/Texture
- Three.js OrbitControls source (damping accumulator): https://github.com/mrdoob/three.js/blob/dev/examples/jsm/controls/OrbitControls.js
- pmndrs/drei `useTexture`: https://github.com/pmndrs/drei#usetexture
- pmndrs/drei `Environment`: https://github.com/pmndrs/drei#environment
- pmndrs/react-three-fiber FAQ (disposal, Strict Mode): https://docs.pmnd.rs/react-three-fiber/advanced/gotchas
- MDN `URL.createObjectURL` (memory lifetime): https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static
- MDN IndexedDB best practices (Blob storage): https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- MDN `structuredClone` (Blob support): https://developer.mozilla.org/en-US/docs/Web/API/structuredClone
- jsdom WebGL non-support (closed wontfix): https://github.com/jsdom/jsdom/issues/1875
- R3F v9 migration guide: https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide
- Existing code references (Confidence: HIGH — line numbers verified):
  - `src/three/ThreeViewport.tsx` lines 41-103, 120-122, 167-190, 212-225
  - `src/three/WallMesh.tsx` lines 18-41, 63-89, 120-128, 268, 283
  - `src/three/ProductMesh.tsx` lines 14-37
  - `src/three/Lighting.tsx` lines 1-30
  - `src/hooks/useAutoSave.ts` lines 11-86 (subscriber filter at 56-67)
  - `src/lib/serialization.ts` lines 24-36
  - `.planning/codebase/CONCERNS.md` (Phase 25 D-07 contract; base64 image security note; R3F v9 deferral)
  - `.planning/PROJECT.md` (R3F v8 / drei v9 / React 18 pin rationale; Phase 25 D-07 partial)

---
*Pitfalls research for: Browser-based 3D CAD — adding PBR + user textures + camera presets to existing v1.6 codebase*
*Researched: 2026-04-20*
