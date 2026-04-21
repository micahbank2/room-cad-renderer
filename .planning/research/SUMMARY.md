# Project Research Summary — v1.7 3D Realism

**Project:** Room CAD Renderer
**Domain:** Browser interior 3D CAD — PBR materials, user-uploaded textures, animated camera presets on locked R3F v8 / drei v9 / React 18
**Researched:** 2026-04-21
**Confidence:** HIGH

## Executive Summary

v1.7 turns the 3D viewport from "flat-color preview" into "feels like the actual room." The three target features (PBR maps for `WOOD_PLANK`/`CONCRETE`/`PLASTER`, single-image user texture uploads, four animated camera presets) are all achievable on the existing locked stack — **no new runtime dependencies**, no React/R3F upgrade in scope (R3F v9 / React 19 deferred per Decision D-02 / GH #56). Bundled CC0 PBR sets (~1.5 MB at 1K) ship from `public/textures/`, user uploads land in a new dedicated catalog store, and the existing `useFrame` lerp pattern at `ThreeViewport.tsx:84–103` (proven in MIC-35) extends trivially to camera presets.

The four research files converge on architecture but diverge on **one** question: which loader API for PBR maps. STACK recommends drei `useTexture` object-form; ARCHITECTURE D-1 and PITFALLS #6/#7/#16 push back, citing Suspense lockup inside the lazy-loaded `<Canvas>`, drei v9→v10 migration risk, and WebGL-context-teardown when module-level caches outlive a Canvas remount on view-mode toggle. **Resolution: imperative `THREE.TextureLoader` wins** — it matches the existing `wallpaperTextureCache` / `wallArtTextureCache` / `floorTexture` pattern (logged "Good" in PROJECT.md), avoids Suspense, and survives the v9 migration with zero rework. Cost: a 1-frame `baseColor` flash before the bitmap lands. Already true for floor textures; never reported as a bug.

Highest-leverage risks: (1) **color-space corruption** — albedo MUST be `SRGBColorSpace`, normal/roughness MUST be `NoColorSpace`, owned by a single helper; (2) **auto-save observing texture mutations** — Blobs MUST NEVER ride inside `cadStore` snapshots (`useAutoSave` would serialize multi-MB on every paint stroke; Phase 25 `structuredClone` would silently inflate); (3) **Suspense lockup** — the existing `<Suspense fallback={null}>` at `ThreeViewport.tsx:120` scopes only `<Environment>`; new PBR meshes need per-mesh Suspense + ErrorBoundary or one bad URL blacks the scene.

## Cross-Cutting Decisions Ledger

| ID | Decision | Source | Rationale |
|----|----------|--------|-----------|
| **D-1** | Imperative `THREE.TextureLoader` for PBR; NOT drei `useTexture` | ARCH D-1, PIT #6/#7/#16, STACK conflict resolved | Avoids Suspense lockup + drei v9→v10 risk; matches existing cache pattern |
| **D-2** | Optional `pbr?: PbrMaps` on `SurfaceMaterial`; no new catalog | ARCH D-2 | Single source of truth; one render-path branch; no migration |
| **D-3** | `userTextureStore` global across projects; Blob in IDB; snapshot stores `userTextureId` only | ARCH D-3, PIT #9/#13/#14 | Bounded snapshot; auto-save unaffected; mirrors `productStore` |
| **D-4** | Camera preset state in `uiStore`, NOT `cadStore`; no per-room save in v1.7 | ARCH D-4, PIT #12 | Outside undo + auto-save; mirrors `wallSideCameraTarget` |
| **D-5** | Drag fast-path + single-undo invariant untouched; no new `*NoHistory` actions | ARCH D-5 | No new drag interactions in v1.7 |
| **D-6** | No R3F v9 / React 19 / drei v10 APIs | ARCH D-6, PIT #17, PROJECT D-02 | Lock holds per GH #56 |
| **LOCK-RES** | PBR ships at 1024 albedo + 512 normal + 512 roughness | FEATURES §1 | Fidelity vs IDB bloat for desktop viewer |
| **LOCK-VAR** | 1 PBR variant per category (WOOD_PLANK, CONCRETE, PLASTER) | FEATURES §1 | Single-user; expand later |
| **LOCK-UPL** | User upload = single albedo + name + real-world tile size in feet+inches; locked aspect | FEATURES §2 | Matches Sweet Home 3D / SketchUp; reuses Phase 29 parser |
| **LOCK-CAP** | Cap uploads ≤2048 px longest edge; SHA-256 dedup; whitelist `image/jpeg`,`png`,`webp` | FEATURES §2, PIT #8/#9 | Mipmap stall + IDB hygiene + XSS prevention |
| **LOCK-PRE** | 4 presets (eye-level, top-down, 3/4, corner); bare `1/2/3/4` hotkeys; 600 ms ease-in-out | FEATURES §3 | Cuts SketchUp's 7 to relevant subset |
| **LOCK-LIB** | User textures GLOBAL across projects | ARCH D-3, FEATURES §2 | Mirrors locked PROJECT decision |
| **MUST-CS** | Albedo→sRGB; normal/roughness→NoColorSpace; single helper enforces | PIT #1 | Wrong color space = silently corrupted lighting |
| **MUST-WRAP** | All maps in one PBR set share `wrapS/T`, `repeat`, `offset` | PIT #3 | Mismatched repeat = parallax artifacts |
| **MUST-ANISO** | Floor + wall PBR get `anisotropy = min(8, getMaxAnisotropy())` | PIT #4 | Walk-mode oblique-angle blur prevention |
| **MUST-DISP** | Module caches expose `disposeTexture(url)`; refcount on swap | PIT #5 | GPU memory leak prevention |
| **MUST-SUSP** | Each PBR mesh wrapped in own `<Suspense>` + `<ErrorBoundary>` | PIT #7 | One bad URL ≠ scene blackout |
| **MUST-DOWN** | Auto-downscale uploads to ≤2048 px before persistence | PIT #8 | Prevents first-frame mipmap stall |
| **MUST-BLOB** | IDB stores Blob, never base64; pair `createObjectURL` with `revokeObjectURL` | PIT #9 | Storage size + memory hygiene |
| **MUST-LERP** | Camera tween animates pos AND target, calls `controls.update()`, snaps on epsilon, disables controls during tween, cancels previous on rapid clicks | PIT #10 | Damping-fight prevention |
| **MUST-CAM** | Camera position MUST NOT land in cadStore subscribers | PIT #12 | Auto-save loop prevention |
| **MUST-NO-INLINE** | Snapshot test: no `data:` substrings >10 KB and no Blob instances | PIT #14 | Locks D-3 contract |
| **MUST-WALK** | Preset switch in walk mode either disabled OR transitions to orbit first; clear `cameraAnimTarget` on `cameraMode` change | PIT #10 | Prevents lerp into destroyed PointerLockControls |
| **MUST-VIEWMODE** | View-mode toggle clears in-flight `cameraAnimTarget`; calls `cam.updateProjectionMatrix()` next frame | PIT #11 | Aspect-ratio bug prevention |
| **MUST-NOT-SVG** | Reject `image/svg+xml` and `image/gif` uploads | Security | XSS via embedded scripts |
| **MUST-NOT-V9** | No imports from `@react-three/fiber/v9`; no v9-only APIs | PIT #17, PROJECT D-02 | Lock holds |
| **MUST-NOT-CAMCTRL** | Do NOT swap `OrbitControls` for drei `<CameraControls>` in v1.7 | STACK §1 | Breaks `orbitControlsRef` consumers (wall-side anim, walk toggle) |

## Recommended Phase Sequencing (NOT binding — for roadmapper)

**Phase 32 — PBR Foundation.** Loader, color-space helper, per-mesh Suspense + ErrorBoundary, anisotropy, dispose API, Environment fallback, migrate wallpaper/wall-art loaders to share helper, ship 3 bundled CC0 PBR sets, extend `surfaceMaterials.ts`. Addresses #61. Locks D-1, MUST-CS/WRAP/ANISO/DISP/SUSP, PIT #6/#16/#17.

**Phase 33 — User-Uploaded Textures.** `userTextureStore` (Zustand + idb-keyval, separate IDB keyspace), upload modal (image + tile size + name reusing Phase 29 parser), auto-downscale, SHA-256 dedup, MIME whitelist, Wallpaper/Floor/Ceiling discriminant for `userTexture` kind, snapshot ID-only references, orphan-safe fallback. Addresses #47. Locks D-3, LOCK-CAP/LIB, MUST-DOWN/BLOB/NO-INLINE/NOT-SVG.

**Phase 34 — Camera Presets.** `cameraPreset` + `cameraTweenTarget` in uiStore, `cameraPresets.ts` math, 4 toolbar buttons, `1/2/3/4` keyboard handler with `document.activeElement` guard, walk-mode handoff state machine, view-mode toggle hardening. Addresses #45. Locks D-4, LOCK-PRE, MUST-LERP/CAM/WALK/VIEWMODE/NOT-CAMCTRL.

**Phase 35 — Tech-Debt Sweep.** Close GH #44/#46/#50/#60, delete `SaveIndicator.tsx`, finish `effectiveDimensions` → `resolveEffectiveDims` migration in `productTool`, backfill Phase 29 SUMMARY frontmatter.

**Ordering rationale:** PBR first because every other 3D feature loads through that contract. User uploads second because they reuse Phase 32's loader, Suspense pattern, dispose path. Camera presets third because they're independent and lower-risk. Tech debt last so it can be cut under scope pressure without leaving features half-shipped.

### Research Flags

- **Phase 33 needs research:** auto-downscale algorithm (`<canvas>` drawImage vs `createImageBitmap` with `resizeWidth`), dedup hash strategy under quota, base64 `imageUrl` migration plan for existing saved projects.
- **Phase 34 needs research:** walk-mode → orbit handoff state machine details, tween library pick (`useFrame.lerp` vs `@tweenjs/tween.js` for time-based easing), Quaternion.slerp adoption decision.
- **Phase 32 standard patterns** — direct extension of existing `wallpaperTextureCache`. Skip research-phase.
- **Phase 35 mechanical** — no research needed.

## Open Questions for Plan-Phase

- **Tween library:** `useFrame.lerp` (framerate-coupled, ships today) vs `@tweenjs/tween.js` (time-based 600ms ease-in-out). STACK leans lerp; FEATURES leans TWEEN. Local to one file — defer to plan-phase.
- **Quaternion.slerp adoption:** Drop in only if top-down ↔ 3/4 reveals gimbal-flip during plan-phase smoke. Don't pre-commit.
- **Walk-mode → orbit handoff:** Three options — disable presets in walk mode entirely / transition to orbit before tween / capture pointer-lock pos as tween start. PIT #10 lists failure mode either way.
- **Advanced PBR upload (user normal/roughness):** Schema supports it via `UserTexture.advanced?: { normal?, roughness? }`. Plan-phase decides whether disclosure UI ships in Phase 33 or defers to v1.8.
- **Per-room camera pose persistence:** OUT of v1.7 per ARCH D-4. If Jessica requests, queue v1.8.
- **HDR fallback bundling:** PIT #16 suggests bundling local HDR (≤500 KB). Plan-phase decides bundled HDR vs lighting-boost fallback only.
- **Existing wallpaper/wall-art loader migration:** Migrate in Phase 32 (consistent loader, possible perceptual delta) or leave alone (fragmentation, no visual diff)?
- **Existing base64 `imageUrl` migration scope:** Full migration of every saved project, or lazy-on-access?
- **WebGL test strategy:** Playwright visual smoke vs `it.skip` markers — current 340-test vitest baseline doesn't cover 3D.

## Confidence

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | APIs verified against official docs/source; no new deps |
| Features | HIGH on Sweet Home 3D / SketchUp / Planner 5D; MEDIUM on Roomstyler/Coohom; HIGH on Three.js technicals |
| Architecture | HIGH | All decisions extend established patterns with file:line refs |
| Pitfalls | HIGH | Citations to Three.js / R3F / drei / MDN with file:line refs |

**Overall: HIGH.** Ready for roadmap and requirements.
