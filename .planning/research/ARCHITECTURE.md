# Architecture Research — v1.7 3D Realism Integration

**Domain:** PBR materials + user-uploaded textures + camera presets layered onto existing Room CAD Renderer
**Researched:** 2026-04-21
**Confidence:** HIGH (existing patterns well-established; decisions extend rather than redesign)

> Scope: ONLY the architectural seams the new features need. Existing Zustand-driven render, drag fast-path, single-undo invariant, save/load round-trip, and Pitfall 4 catalog/placement separation are non-negotiable inputs.

---

## D-1 — PBR Texture Asset Layout & Loading

**Decision:** Bundled PBR maps live under `public/textures/<material-id>/{albedo,normal,roughness}.jpg`, loaded lazily through a single module-level `getPbrTextureSet(materialId)` cache that mirrors the existing `wallpaperTextureCache` / `productTextureCache` / `getFloorTexture` patterns. Use Three's `TextureLoader` directly, NOT drei's `useTexture`.

**Rationale:**
- `public/` is Vite's static-asset convention; URLs become `/textures/wood-plank/albedo.jpg` and benefit from HTTP caching + GPU-side dedup.
- Module-level Promise/Texture caches are already the proven pattern across `WallMesh.tsx`, `ProductMesh.tsx`, `FloorMesh.tsx`. They naturally dedupe concurrent loads (logged as a "Good" decision in PROJECT.md).
- `useTexture` from drei is a Suspense hook — it suspends the entire `<Scene>` subtree on first load, which would re-trigger orbit-camera reset (we already fight this in `orbitPosRef` plumbing) and freeze the 3D viewport on every fresh material swap. Imperative loaders return immediately with a placeholder texture and patch in the real bitmap on `needsUpdate`.
- 3 PBR materials × 3 maps × 1024² × ~150 KB JPEG ≈ **~1.4 MB total over the wire, ~36 MB GPU VRAM** (1024² RGB uncompressed = 4 MB × 9 maps). Acceptable for a desktop-only personal tool. Cap at 1024² in this milestone; 2K is a v1.8 concern.

**Trade-off accepted:** Imperative loaders mean we surface a 1-frame flash of `baseColor` before the texture lands. Acceptable — already true for floor textures and never reported as a bug.

**File layout:**
```
public/textures/
├── wood-plank/{albedo,normal,roughness}.jpg
├── concrete/{albedo,normal,roughness}.jpg
└── plaster/{albedo,normal,roughness}.jpg
src/three/
└── pbrTextureCache.ts        # NEW — getPbrTextureSet(id) → { albedo, normal, roughness }
```

---

## D-2 — Surface Material Catalog Evolution

**Decision:** Add an optional `pbr` field to `SurfaceMaterial` in the existing `surfaceMaterials.ts`. NO `kind` discriminator, NO separate PBR catalog. The render path checks `material.pbr` and switches behavior — color-only materials keep the current `meshStandardMaterial color={hex}` path; PBR materials add `map`/`normalMap`/`roughnessMap` from the cache.

```ts
// src/data/surfaceMaterials.ts
export interface PbrMaps {
  albedo: string;        // "/textures/wood-plank/albedo.jpg"
  normal: string;
  roughness: string;
  tileFt: number;        // real-world tile size for repeat math
}
export interface SurfaceMaterial {
  id: string;
  label: string;
  color: string;         // RETAINED — used as fallback + tint multiplier on PBR albedo
  roughness: number;     // RETAINED — fallback when no roughnessMap
  surface: SurfaceTarget;
  defaultScaleFt: number;
  pbr?: PbrMaps;         // NEW — presence = PBR-capable
}
```

**Rationale:**
- Keeps the catalog as the single source of truth for `WOOD_PLANK`, `CONCRETE`, `PLASTER` — exactly the three materials called out in #61 already exist as color entries. No data migration, no parallel catalog drift.
- `materialsForSurface()` and every existing consumer keeps working unchanged. New PBR-aware consumers do `if (mat.pbr) { ...textured path... } else { ...color path... }` — one branch, locally scoped.
- Avoids the discriminator-union refactor explosion that would touch `floorTexture.ts`, `CeilingMesh`, `WallMesh`, `Sidebar` material picker, save/load migration. v1.5's PERF-02 already taught us the cost of "small invariant changes" rippling.
- `PAINTED_DRYWALL` keeps its color-only path per #61 spec.

**Trade-off accepted:** A material can technically be misconfigured (have `pbr` but `surface: "ceiling"` only). Mitigated by the catalog being a small static `Record` — typo-resistant, code-reviewed.

---

## D-3 — User-Uploaded Texture Storage

**Decision:** New `userTextureStore` (Zustand + idb-keyval persistence, mirroring `productStore` pattern). Textures stored as **base64 data URLs** keyed by `userTex_<uid>`, GLOBAL across projects (not per-project). Snapshots reference textures by ID only, NEVER by inlined bytes. ObjectURLs are derived at render time inside the existing texture cache.

```
src/stores/
└── userTextureStore.ts       # NEW — Zustand + idb-keyval
src/types/
└── userTexture.ts            # NEW — { id, name, dataUrl, createdAt, advanced?: { normal?, roughness? } }
```

**Rationale:**
- **Global, not per-project**: Jessica's whole Pinterest-driven workflow is "I keep finding fabrics I love." Re-uploading the same hardwood photo into 4 different room layouts would feel broken. Mirrors the locked decision "Global product library" in PROJECT.md.
- **Base64 data URL, not Blob+ObjectURL in storage**: existing wallpaper (`Wallpaper.imageUrl`), wall art (`WallArt.imageUrl`), floor custom (`FloorMaterial.imageUrl`), and product images all use data URLs. The whole snapshot serialization path (`structuredClone(toPlain(...))` in `cadStore.snapshot()` and `idb-keyval` JSON encoding) already handles strings cleanly. Blobs would require a parallel persistence path and break the symmetric save/load round-trip the v1.5 D-07 contract guarantees. ObjectURL revocation lifecycle is also a known footgun on undo/redo.
- **ID reference in snapshot**: a `Wallpaper { kind: "userTexture", userTextureId: "userTex_abc" }` discriminant (or analogous field on `FloorMaterial`/`Ceiling`) keeps `CADSnapshot` size bounded — undo history caps at 50 entries × N textures × ~500 KB each would otherwise blow IndexedDB's per-DB quota fast.
- **Advanced PBR pathway**: optional `advanced.normal` / `advanced.roughness` data URLs on the SAME `UserTexture` record — single "asset" the user thinks of as "my wood photo," with optional extra maps. Renderer checks `advanced` presence and falls back to single-map mode if absent.

**Auto-save implication:** Auto-save's observation set (`rooms`, `activeRoomId`, `customElements`) does NOT need to expand. User-texture uploads are CATALOG actions (separate store, separate IndexedDB key) — they persist on their own write, identical to how `productStore` handles uploads today.

**Trade-off accepted:** A user texture deleted from the catalog while still referenced by a placement becomes an orphan. Render path mirrors existing `ProductMesh` orphan-safety: missing → render placeholder color from `material.color` fallback, no crash. Add `pruneOrphanUserTextures()` lazy on load if it becomes a problem (defer — not in scope for v1.7).

---

## D-4 — Camera Preset State Location

**Decision:** Camera presets live in **`uiStore`** as an enum + a transient tween target (mirroring the existing `wallSideCameraTarget` pattern already in `uiStore`). Per-project saved camera position is **explicitly out of scope for v1.7**.

```ts
// uiStore.ts additions
cameraPreset: "default" | "eye" | "top" | "corner";
cameraTweenTarget: { pos: [number,number,number]; look: [number,number,number]; seq: number } | null;
setCameraPreset: (p) => void;
clearCameraTweenTarget: () => void;
```

**Rationale:**
- **uiStore over cadStore**: cadStore is the **persisted** scene. Putting camera there forces a `version: 3` snapshot bump + `migrateSnapshot` branch + extends auto-save's observation set + occupies an undo slot every time the camera moves. Jessica's preferred angle "restoring on reload" is a v1.8 nice-to-have, not a v1.7 requirement (#45 spec lists toolbar + 1/2/3/4 keys, not persistence).
- **uiStore over local Scene state**: the Toolbar buttons + global keyboard handler (`1/2/3/4`) need to dispatch into the camera. uiStore is where every other tool/view dispatch lives. Local React state in `<Scene>` would require lifting handlers via prop-drilling or context — strictly worse.
- **uiStore over a new cameraStore**: 4 fields and 2 actions don't justify a new store file. The existing `wallSideCameraTarget` precedent in uiStore is the closest analog and is one screen up — natural co-location.
- **Tween via existing useFrame lerp**: `<Scene>` already has a `useFrame` lerp loop for `wallSideCameraTarget`. Reuse the same pattern; the seq counter pattern means switching to the same preset twice still re-triggers the tween.

**Per-project camera position deferred:** If Jessica asks for it, it becomes a separate v1.8 ticket — adds `RoomDoc.savedCameraPose?: { pos, look }` and a "Save current view" button. v1.7 does not pay that cost.

---

## D-5 — Drag Fast-Path & Undo/Redo Implications

**Decision:**
- **Camera preset switch:** does NOT push to history. Camera is uiStore (D-4) → outside the cadStore undo/redo subsystem entirely. Same pattern as tool switches and selection.
- **User-texture upload (catalog):** does NOT push to cadStore history. Uploads land in `userTextureStore`, separate from cadStore.
- **Applying a user texture to a wall/floor/ceiling (placement):** DOES push exactly one history entry, via the existing `setWallpaper` / `setFloorMaterial` / `updateCeiling` actions. No new action, no new undo semantics.
- **PBR material apply:** identical to current color-material apply — single history entry from the same action. PBR is a render-path concern, not a state-shape concern.

**Drag fast-path preservation:** No new drag interactions in v1.7 — PBR/textures/camera are click-to-apply or button-press. The Phase 25 `shouldSkipRedrawDuringDrag` + `*NoHistory` action family + single mouseup commit invariant is **untouched**. Verification gate: any new action that mutates cadStore must come with a `*NoHistory` twin if it could ever fire mid-gesture; for v1.7 NONE of the new actions fall in that bucket.

**Trade-off accepted:** "Apply 8 different paints in a row" still pollutes undo with 8 entries — same as today, not made worse.

---

## D-6 — R3F v8 / drei v9 Forward-Compat Constraints

**Decision:** Build PBR + camera-preset code against **today's R3F v8 / drei v9 idioms** with one explicit precaution: **avoid `useTexture` for PBR loads** (which is also the D-1 decision for unrelated reasons). All other choices are forward-compatible.

**Why this is enough:**
- The R3F v9 / React 19 migration (#56) is documented in `.planning/codebase/CONCERNS.md` and **deferred until R3F v9 stabilizes**. Per PROJECT.md, "execution deferred until R3F v9 stabilizes."
- v8→v9 is mostly TypeScript types + React 19 hook compat, NOT an API rewrite of `meshStandardMaterial`, `Canvas`, `OrbitControls`, `PointerLockControls`, `Environment`, or `useFrame` — the entire surface area v1.7 touches.
- `useTexture` (drei) is the one hook with known suspension semantics changes between drei 9 and 10. Avoiding it (D-1) means zero rework when #56 lands.
- Camera preset implementation reuses the existing `useFrame` lerp pattern from `wallSideCameraTarget` — already part of the audited scene, will migrate together.

**Trade-off accepted:** None material. We don't take a forward-compat hit by writing v1.7 against current versions.

---

## Quality Gate Checklist

- [x] Zustand-driven render preserved — PBR materials are render-path-only; user-texture refs are IDs in the existing snapshot shape
- [x] Phase 25 drag fast-path untouched — no new drag interactions, no per-frame store writes introduced
- [x] Single-undo invariant per gesture — every new mutating action lands a single history entry; no compound user actions
- [x] Save/load round-trip preserves all state — snapshot extension is additive (optional `pbr` field is data-only; user-texture refs are strings; camera state is intentionally NOT persisted in v1.7)
- [x] productTool placement uses fresh objects — unchanged; no override seeding
- [x] Pitfall 4 catalog vs placement separation — `surfaceMaterials.ts` (catalog) and per-wall `wallpaper`/`floorMaterial` references (placement) stay distinct; user textures follow the same split via `userTextureStore` (catalog) + ID reference (placement)

## Sources

- `src/stores/cadStore.ts` (snapshot, pushHistory, *NoHistory family, undo/redo)
- `src/stores/uiStore.ts` (wallSideCameraTarget pattern, cameraMode)
- `src/stores/projectStore.ts` (saveStatus surface)
- `src/data/surfaceMaterials.ts` (catalog shape)
- `src/three/ThreeViewport.tsx` (Scene, useFrame lerp, OrbitControls ref pattern)
- `src/three/WallMesh.tsx` (wallpaperTextureCache, wallArtTextureCache imperative-loader pattern)
- `src/three/ProductMesh.tsx` (resolveEffectiveDims + texture cache)
- `src/lib/serialization.ts` (idb-keyval round-trip, LAST_PROJECT_KEY pattern)
- `src/types/cad.ts` (Wallpaper discriminant, FloorMaterial.kind, CADSnapshot v2)
- `.planning/PROJECT.md` (locked decisions: global product library, image-only assets, R3F v9 deferral, Pitfall 4)

---
*Architecture research for: v1.7 3D Realism — PBR + user textures + camera presets*
*Researched: 2026-04-21*
