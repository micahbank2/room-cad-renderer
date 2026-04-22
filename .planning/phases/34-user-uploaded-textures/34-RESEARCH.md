---
phase: 34-user-uploaded-textures
researched: 2026-04-22
domain: Browser file upload pipeline, IndexedDB keyspace design, Three.js texture lifecycle, React material picker integration
confidence: HIGH
requirements: [LIB-06, LIB-07, LIB-08]
status: COMPLETE
---

# Phase 34: User-Uploaded Textures — Research

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Upload entry point lives inside the material picker — persistent `+ Upload Texture` tile at end of MY TEXTURES category. No separate sidebar button, no new top-level tab.
- D-02: One-step modal — drop or pick file → preview renders inline → name + tile-size fields → Save. No wizard flow.
- D-03: One file per upload (no bulk queue). Errors inline in modal + toast on success.
- D-03a: MIME-reject copy: `"Only JPEG, PNG, and WebP are supported."` Inline red error under file field.
- D-04: User textures appear in a dedicated `MY TEXTURES` category tab within existing CategoryTabs primitive.
- D-05: Any texture applies to any surface (walls/floors/ceilings) — no surface-type tagging at upload.
- D-06: Default ordering = most recently uploaded first.
- D-07: Delete requires confirm dialog with ref-count. Copy: `"Delete {name}? {N} surfaces in this project use it. They'll fall back to their base color."` Confirmed deletion removes from userTextureStore.
- D-08: Orphan fallback is silent on load — no toast, no badge. Surface renders at base hex.
- D-09: Orphan resolution = simple lookup at render. No project-load reconciliation sweep.
- D-10: Tile size is a catalog attribute (one per texture). No per-placement override in Phase 34.
- D-11: Catalog is editable after upload — ⋮ menu → Edit modal with name + tile-size. Edits propagate live.
- D-12: Phase 34 builds conservatively on Phase 32 cache patterns as-is. No up-front instrumentation hooks for Phase 36.

### Claude's Discretion
- Exact visual design of `+ Upload Texture` tile (within D-33/D-34 token constraints, lucide-react only).
- Progress-indicator shape during downscale + SHA-256 (spinner inside modal is sufficient).
- Image-decode / downscale implementation — `createImageBitmap` + `OffscreenCanvas` vs `<img>` + `<canvas>`.
- Whether Edit modal is a separate component or reuses Upload modal via `mode: "create" | "edit"` prop.
- SHA-256 implementation — Web Crypto `crypto.subtle.digest("SHA-256", bytes)` default.
- Test-driver hook naming — follow Phase 29/30/31 `window.__drive*` pattern, gated by `import.meta.env.MODE === "test"`.

### Deferred Ideas (OUT OF SCOPE)
- Per-placement tile-size override (post-v1.8 only if demand emerges)
- Bulk upload queue
- User-uploaded normal / roughness maps (Out of Scope v1.8)
- Per-surface orphan badge / reconciliation sweep
- Surface-type tagging at upload
- User-facing sort controls on MY TEXTURES
- VIZ-10 / Phase 36 shared instrumentation hooks
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LIB-06 | Upload JPEG/PNG/WebP, name it, set tile size in feet+inches, apply to walls/floors/ceilings from material picker; persists across reload | Upload pipeline (§A), picker integration (§D), CADSnapshot schema (§E), IDB keyspace (§B) |
| LIB-07 | 2048px longest-edge downscale, SHA-256 dedup, MIME whitelist reject with user-facing error | Upload pipeline (§A) in detail; dedup at write time; MIME gate at accept= + JS validation |
| LIB-08 | Snapshot holds userTextureId strings only (zero data-URL bloat); orphan fallback to base hex without crash | CADSnapshot schema (§E), render fallback (§H), IDB keyspace separation (§B) |
</phase_requirements>

---

## Summary

- **The serialization split is the core discipline.** `CADSnapshot` holds `userTextureId?: string` reference strings only. The Blob lives exclusively in a `userTextureStore` IDB keyspace created via `idb-keyval`'s `createStore()`. Nothing else about the existing IDB structure needs to change.
- **The upload pipeline runs entirely on the main thread** — `createImageBitmap` + `OffscreenCanvas` for downscale, `crypto.subtle.digest` for SHA-256, `FileReader` or `canvas.toBlob` for persistence. The bounded size (≤2048px) makes the operation sub-second; no Web Worker is required.
- **Three.js integration follows the non-disposing wallpaperTextureCache pattern,** not the refcount pbrTextureCache. User textures are referenced by Blob `ObjectURL`, loaded once at first render, and must survive `ThreeViewport` unmount/remount across 2D↔3D toggles — same problem class as wallpaper/wallArt (Phase 32 VIZ-10 investigation pending in Phase 36).
- **The material picker surfaces (FloorMaterialPicker, SurfaceMaterialPicker, WallSurfacePanel) are separate per-surface components today** — not a single unified picker. The `MY TEXTURES` tab must be added consistently across all three (or to a shared wrapper the planner creates). This is the main integration complexity.
- **parseFeetInches lives in `src/canvas/dimensionEditor.ts` as `validateInput`** — import it directly, do not fork or rename.

**Primary recommendation:** Build in 4 plans: (1) IDB keyspace + data layer, (2) upload modal + hook, (3) material picker MY TEXTURES tab across all surfaces, (4) 3D render integration + orphan fallback + delete flow.

---

## Canonical References

| File | What to read |
|------|-------------|
| `src/canvas/dimensionEditor.ts` lines 42–81 | `validateInput` — the feet+inches parser to reuse for tile-size input. Returns `number \| null` (decimal feet). |
| `src/three/wallpaperTextureCache.ts` | Non-disposing module-level cache pattern — user textures follow this, NOT the refcount pbrTextureCache. |
| `src/three/pbrTextureCache.ts` | refcount `acquireTexture`/`releaseTexture` API — understand but do NOT use for user texture lifecycle. |
| `src/three/PbrSurface.tsx` | `<Suspense>` + `<PbrErrorBoundary>` wrapping pattern — user texture render component mirrors this shape. |
| `src/lib/serialization.ts` | Current IDB usage via bare `idb-keyval` `get/set/del/keys` with `room-cad-project-` key prefix. |
| `src/three/FloorMesh.tsx` | Custom floor texture path (data URL → module-level `customTextureCache` → `<primitive dispose={null}>`). |
| `src/three/WallMesh.tsx` | Wallpaper overlay render (`useWallpaperTexture` hook → `<primitive attach="map" dispose={null}>`). |
| `src/three/CeilingMesh.tsx` | PBR branch + flat-color fallback — needs same user-texture branch added. |
| `src/components/FloorMaterialPicker.tsx` | Current floor picker with upload button that stores data URL in snapshot — shows what Phase 34 REPLACES for the userTextureId path. |
| `src/components/SurfaceMaterialPicker.tsx` | Bundled material grid — `MY TEXTURES` tab lives alongside this. |
| `src/components/library/CategoryTabs.tsx` | `CategoryTab[]` + `onChange` API — slot `MY TEXTURES` in as a new tab entry. |
| `src/components/library/LibraryCard.tsx` | Card with `onRemove`, `thumbnail`, `selected` props — reuse for texture tiles + `+ Upload` slot. |
| `.planning/phases/32-pbr-foundation/32-07-SUMMARY.md` | Still-plausible VIZ-10 causes — user texture cache must not introduce the same bug class. |
| `src/data/surfaceMaterials.ts` | `PbrMaps.tile.{wFt, lFt}` — tile repeat semantics; user textures carry the same `tileSizeFt` concept. |

---

## Architecture Findings

### A. Upload Pipeline Architecture

**Where it runs:** Main thread only. The downscale + SHA-256 operation is bounded (≤2048px JPEG = typically 2–4MB decode, <10ms canvas draw, <5ms SHA-256 on modern hardware). No Web Worker required for Phase 34.

**Recommended path: `createImageBitmap` + `OffscreenCanvas`**

```typescript
// 1. Validate MIME
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
if (!ALLOWED_TYPES.has(file.type)) throw new Error("Only JPEG, PNG, and WebP are supported.");

// 2. Decode
const bitmap = await createImageBitmap(file);

// 3. Downscale
const MAX_EDGE = 2048;
const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
const w = Math.round(bitmap.width * scale);
const h = Math.round(bitmap.height * scale);
const oc = new OffscreenCanvas(w, h);
const ctx = oc.getContext("2d")!;
ctx.drawImage(bitmap, 0, 0, w, h);
bitmap.close(); // free GPU/CPU memory

// 4. Get bytes for SHA-256
const blob = await oc.convertToBlob({ type: "image/jpeg", quality: 0.9 });
const bytes = await blob.arrayBuffer();

// 5. SHA-256 dedup
const hashBuf = await crypto.subtle.digest("SHA-256", bytes);
const sha256 = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,"0")).join("");
```

**Why `createImageBitmap` + `OffscreenCanvas` over `<img>` + `<canvas>`:**
- Works in jsdom environments with the right polyfill setup (vitest already polyfills canvas via jsdom's built-in)
- No DOM element needed — cleaner for a hook/utility function
- `bitmap.close()` explicitly frees memory after use
- Safari 16.4+ supports `OffscreenCanvas.convertToBlob` (Jessica's platform is Chromium-class per CONTEXT.md)

**Memory profile for 12MP JPEG → 2048px:** A 12MP JPEG (e.g. 4000×3000) decodes to ~48MB raw (4000×3000×4 bytes). After downscale to 2048×1536, the canvas holds ~12MB. The JPEG re-encode at quality 0.9 produces ~300–600KB blob. Peak memory during the operation is ~60MB; all freed after `bitmap.close()` and the blob is handed off to IDB. This is within browser limits for a single-user tool.

**MIME gate:** Set `accept="image/jpeg,image/png,image/webp"` on the `<input type="file">` AND validate `file.type` in JS (the `<input accept>` is advisory only — user can still select other types via "All files").

**Confidence:** HIGH — `createImageBitmap`, `OffscreenCanvas.convertToBlob`, and `crypto.subtle.digest` are all baseline in Chromium-class browsers and Safari 16.4+.

---

### B. IndexedDB Keyspace Design

**Current state:** `src/lib/serialization.ts` imports `get/set/del/keys` from `idb-keyval` and uses the *default* store (one unnamed `idb-keyval` IndexedDB). Keys are prefixed: `room-cad-project-*` and `room-cad-last-project`.

**`createStore` is already exported from idb-keyval** (verified: `createStore` present in `node_modules/idb-keyval/dist/index.cjs`).

**Recommended design: separate named store via `createStore`**

```typescript
// src/lib/userTextureStore.ts
import { createStore, get, set, del, values } from "idb-keyval";

export const userTextureIdbStore = createStore("room-cad-user-textures", "textures");

export interface UserTexture {
  id: string;          // "utex_" + uid()
  sha256: string;      // hex SHA-256 of downscaled bytes
  name: string;        // user-given name
  tileSizeFt: number;  // decimal feet (from validateInput)
  blob: Blob;          // the downscaled JPEG blob
  mimeType: string;    // "image/jpeg" (always JPEG after downscale)
  createdAt: number;   // Date.now()
}

export async function saveUserTexture(tex: UserTexture): Promise<void> {
  await set(tex.id, tex, userTextureIdbStore);
}

export async function getUserTexture(id: string): Promise<UserTexture | undefined> {
  return get<UserTexture>(id, userTextureIdbStore);
}

export async function deleteUserTexture(id: string): Promise<void> {
  await del(id, userTextureIdbStore);
}

export async function listUserTextures(): Promise<UserTexture[]> {
  const all = await values<UserTexture>(userTextureIdbStore);
  return all.sort((a, b) => b.createdAt - a.createdAt); // most recent first (D-06)
}
```

**Why a separate named store (not prefixed keys in the default store):**
- `listProjects()` uses `keys()` against the default store — adding `user-texture-*` keys there would require every `keys()` call to filter them out, introducing coupling.
- A separate IDB database (`room-cad-user-textures`) with its own object store (`textures`) is zero-migration: existing projects stored in the default `idb-keyval` database are completely unaffected.
- `del` + `values` API on a named store cleanly isolates the lifetime of texture data from project data.

**SHA-256 dedup:** Before saving, call `listUserTextures()`, check if any entry has `sha256 === newSha256`. If match found, return the existing `id` (link to existing entry instead of writing duplicate). The second "upload" under a different name still links to the first entry — per LIB-07.

**Migration story:** None required. The new IDB database is created lazily on first `set()` call. Pre-Phase-34 projects load cleanly — no `userTextureId` fields = no user texture = renders with bundled materials. `migrateSnapshot` needs no change (missing fields remain undefined = existing behavior).

**No autosave interference:** `useAutoSave` watches `room-cad-project-*` keys only (the default store). Writing to `userTextureIdbStore` never triggers autosave status change. Confirmed by reading `src/lib/serialization.ts` — autosave calls `saveProject()` which writes to the default store only.

**Confidence:** HIGH — `createStore` API confirmed present, design is additive.

---

### C. Phase 32 Integration Points

**PBR loader (pbrTextureCache):** Uses `acquireTexture(url, channel)` with refcount + explicit `releaseTexture(url)` on unmount. The cache key is the URL string. This pattern is for bundled static assets loaded from `/textures/...` paths.

**User textures MUST NOT use pbrTextureCache.** Reasons:
1. User texture URLs are `ObjectURL`s created from Blob — they are session-lived (revoked on page unload). Refcount lifecycle assumes stable URLs.
2. Refcount dispose means the texture is `.dispose()`d when refs drop to 0 (on `ThreeViewport` unmount). For user textures this causes the same blank-on-remount bug documented in Phase 32 32-07-SUMMARY.md.

**Correct pattern: non-disposing module-level cache** (same as `wallpaperTextureCache.ts`):

```typescript
// src/three/userTextureCache.ts  — mirrors wallpaperTextureCache.ts exactly
const cache = new Map<string, Promise<THREE.Texture | null>>();
const objectUrls = new Map<string, string>(); // blobId → objectUrl

export function getUserTextureCached(blobId: string, getBlob: () => Promise<Blob | undefined>): Promise<THREE.Texture | null> {
  const existing = cache.get(blobId);
  if (existing) return existing;
  const p = getBlob().then(blob => {
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    objectUrls.set(blobId, url);
    const loader = new THREE.TextureLoader();
    return loader.loadAsync(url).then(tex => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      return tex;
    }).catch(() => null);
  });
  cache.set(blobId, p);
  return p;
}
```

**dispose={null} pattern:** All user-texture render sites MUST use `<primitive attach="map" object={tex} dispose={null} />` — the same defensive pattern applied in Phase 32 Plans 06/07. This prevents R3F auto-dispose from invalidating the shared cached `THREE.Texture` instance.

**Tile repeat in Three.js:** `PbrMaps.tile.{wFt, lFt}` drives `tex.repeat.set(widthFt / wFt, lengthFt / lFt)`. User textures carry `tileSizeFt` (a single number — square tile per D-10). Repeat calculation: `repeatX = surfaceWidthFt / tileSizeFt`, `repeatY = surfaceHeightFt / tileSizeFt`. Units are Three.js world units = feet (confirmed by WallMesh.tsx: `position: new THREE.Vector3(midX, wall.height / 2, midY)` — all values in feet).

**ObjectURL lifecycle:** Create `URL.createObjectURL(blob)` once per texture (stored in the module cache). Do NOT revoke it while the texture is cached — revoking while THREE.js holds a reference to the URL causes blank textures. The module-level cache holds both the Promise and, implicitly, the ObjectURL alive for the session lifetime. This is acceptable for a single-user local tool with a bounded number of textures.

**Confidence:** HIGH — all patterns confirmed by reading production code.

---

### D. Material Picker Integration

**Current picker landscape — NOT a single unified component:**

| Surface | Component | How material is set |
|---------|-----------|---------------------|
| Floor | `FloorMaterialPicker.tsx` | `useCADStore.setFloorMaterial(FloorMaterial)` — `kind: "preset" \| "custom"` |
| Ceiling | `CeilingPaintSection.tsx` + `SurfaceMaterialPicker.tsx` | `useCADStore.updateCeiling(id, { surfaceMaterialId })` |
| Wall surface | `WallSurfacePanel.tsx` (from grep) | Likely sets `wallpaper` or `surfaceMaterialId` on WallSegment |

Each picker currently shows bundled materials only. Phase 34 must add `MY TEXTURES` tab to each, or create a shared `UserTexturePicker` sub-component that each host drops in alongside its existing `SurfaceMaterialPicker`.

**How `userTextureId` integrates into the data model:**

For walls: `Wallpaper.imageUrl` currently holds a data URL. Phase 34 adds `Wallpaper.userTextureId?: string` alongside `Wallpaper.imageUrl`. At render, `WallMesh` checks `userTextureId` first; if present, loads from userTextureCache; if missing, falls back to `imageUrl` (legacy) or base hex.

For floors: `FloorMaterial` currently has `kind: "preset" | "custom"`. Add `kind: "user-texture"` variant: `{ kind: "user-texture", userTextureId: string, scaleFt: number, rotationDeg: number }`. Existing `FloorMesh` `kind: "custom"` path (data URL) is NOT removed — it serves as fallback for legacy projects.

For ceilings: `Ceiling.surfaceMaterialId` currently references bundled SURFACE_MATERIALS. Add `Ceiling.userTextureId?: string`. At render, check `userTextureId` first before `surfaceMaterialId`.

**`CategoryTabs` API:** Takes `tabs: CategoryTab[]` with `{ id, label, count? }`. Add `{ id: "my-textures", label: "MY TEXTURES", count: textures.length }`. The `onChange` handler switches the active tab. The `+ Upload Texture` slot renders as the last item in the MY TEXTURES grid when that tab is active.

**`LibraryCard` reuse:** The `onRemove` prop shows a hover-revealed X button — use this for the delete affordance on MY TEXTURES tiles (triggers confirm dialog D-07). `thumbnail` accepts a blob ObjectURL. `selected` highlights the active texture. Add a `⋮` menu button for Edit (D-11) — this is beyond `LibraryCard`'s current API; either extend LibraryCard with an `onEdit` prop, or render a separate button alongside the card.

**`useUserTextures` hook shape** (new hook to introduce):
```typescript
// src/hooks/useUserTextures.ts
export function useUserTextures(): {
  textures: UserTexture[];
  loading: boolean;
  save(file: File, name: string, tileSizeFt: number): Promise<string>; // returns id
  update(id: string, changes: Partial<Pick<UserTexture, "name" | "tileSizeFt">>): Promise<void>;
  remove(id: string): Promise<void>;
}
```

This is the hook the material picker components consume. Mirrors `useProductStore` shape.

**Confidence:** MEDIUM — integration is clear but the exact structure of WallSurfacePanel (not read) needs verification at implementation time. The floor + ceiling paths are fully confirmed by code review.

---

### E. Snapshot Serialization

**`CADSnapshot` (v2) current shape:**
```typescript
interface CADSnapshot {
  version: 2;
  rooms: Record<string, RoomDoc>;  // contains walls, floorMaterial, ceilings, etc.
  activeRoomId: string | null;
  customElements?: Record<string, CustomElement>;
  customPaints?: PaintColor[];
  recentPaints?: string[];
}
```

**Required changes to types:**

`Wallpaper` (in `cad.ts`): add `userTextureId?: string`. When this is set, the wallpaper renders via userTextureCache. The existing `imageUrl` field remains for backward compat.

`FloorMaterial` (in `cad.ts`): add `kind: "user-texture"` union member:
```typescript
interface FloorMaterial {
  kind: "preset" | "custom" | "user-texture";
  presetId?: string;        // when kind === "preset"
  imageUrl?: string;        // when kind === "custom" (legacy)
  userTextureId?: string;   // when kind === "user-texture"
  scaleFt: number;
  rotationDeg: number;
}
```

`Ceiling` (in `cad.ts`): add `userTextureId?: string`.

**LIB-08 verification:** After these changes, `JSON.stringify(snapshot)` will contain only `"userTextureId": "utex_..."` strings (~20 bytes each) — zero `data:` prefixes, zero `Blob` instances. The Blob lives only in the `room-cad-user-textures` IDB database, never serialized into the snapshot JSON.

**`migrateSnapshot`:** No changes needed. Missing `userTextureId` fields default to `undefined` = no user texture = existing render path. Forward-compatible by construction.

**Project export (if any):** Current codebase has `exportRenderedImage` and `export2DImage` only (canvas PNG export) — no project file export exists. If a user shares a project JSON, orphan `userTextureId` references will silently fall back to base hex (D-08 / D-09) — exactly the specified behavior.

**Confidence:** HIGH — types confirmed by reading cad.ts; serialization.ts confirmed no Blob handling.

---

### F. Tile-Size + Feet+Inches Parser

**Location:** `src/canvas/dimensionEditor.ts` — function `validateInput(raw: string): number | null`

**Contract:**
- Input: raw string from text field (e.g. `"8'"`, `"8'4\""`, `"2.5"`, `"30in"`)
- Output: decimal feet (`number`) or `null` if invalid/non-positive
- Three-branch ordered regex (inches-only, feet+inches, decimal-only)
- Rejects: bare `"12 6"` (ambiguous), negative, zero, empty, whitespace-only
- Test coverage: 37+ tests in `tests/dimensionEditor.test.ts` — all GREEN

**How to use for tile-size input:**
```typescript
import { validateInput } from "@/canvas/dimensionEditor";
const tileSizeFt = validateInput(rawInput); // null = invalid
```

**Three.js tile repeat units:** Three.js world units = feet in this codebase (walls/floors/ceilings all measured in feet — confirmed by WallMesh, FloorMesh). Tile repeat is `tex.repeat.set(surfaceWidthFt / tileSizeFt, surfaceHeightFt / tileSizeFt)`. No unit conversion needed.

**Default tile size:** A sensible default is 2.0 ft (matches the wallpaper `scaleFt` default and is a common tile/plank repeat). Can be pre-filled in the upload modal.

**Confidence:** HIGH — parser is production code, fully tested, confirmed by code read.

---

### G. Ref-Count + Delete Flow

**Counting references to `userTextureId`:** No existing utility — must be implemented. The scan must cover:

1. `rooms[roomId].walls[wallId].wallpaper?.{A,B}?.userTextureId`
2. `rooms[roomId].floorMaterial` where `kind === "user-texture"` → `userTextureId`
3. `rooms[roomId].ceilings?.[ceilingId]?.userTextureId`

All rooms must be scanned (projects can have multiple rooms). Custom elements (boxes/planes) do NOT currently carry material assignments — no scan needed there.

**Reference counting utility:**
```typescript
function countTextureRefs(snapshot: CADSnapshot, textureId: string): number {
  let count = 0;
  for (const room of Object.values(snapshot.rooms)) {
    // Walls (both sides)
    for (const wall of Object.values(room.walls)) {
      if (wall.wallpaper?.A?.userTextureId === textureId) count++;
      if (wall.wallpaper?.B?.userTextureId === textureId) count++;
    }
    // Floor
    if (room.floorMaterial?.kind === "user-texture" && room.floorMaterial.userTextureId === textureId) count++;
    // Ceilings
    for (const ceiling of Object.values(room.ceilings ?? {})) {
      if (ceiling.userTextureId === textureId) count++;
    }
  }
  return count;
}
```

**Delete flow sequence:**
1. User clicks X on MY TEXTURES tile → open confirm dialog (D-07)
2. Compute `count = countTextureRefs(cadStore.getState(), textureId)`
3. Show: `"Delete {name}? {count} surfaces in this project use it. They'll fall back to their base color."`
4. If count === 0: show abbreviated version `"Delete {name}? This texture isn't used by any surface."`
5. On confirm: call `deleteUserTexture(id)` (IDB del) + invalidate the userTextureCache module cache entry for this id
6. Orphan references remain in CADSnapshot (by D-09 — no sweep). They silently fall back at render time.

**History implications:** The delete operation is IDB-only — it does NOT mutate cadStore state (no `userTextureId` fields are nulled out). Therefore it does NOT push a CAD history entry. This is consistent with D-09 (no reconciliation sweep). The only side effect is: next render of affected surfaces shows base hex color.

**Confidence:** HIGH — data model confirmed; countTextureRefs is straightforward to implement.

---

### H. Orphan Fallback at Render Time

**Where material selection happens per mesh:**

- `WallMesh.tsx`: calls `useWallpaperTexture(wpAUrl)` where `wpAUrl = wall.wallpaper?.A?.imageUrl`. Phase 34 adds a parallel `useUserTexture(wall.wallpaper?.A?.userTextureId)` hook call. If `userTextureId` is set but texture resolves to `null` (orphan), the overlay branch is skipped → base wall color renders.
- `FloorMesh.tsx`: `useMemo` resolves `material.kind` → `"user-texture"` branch calls `useUserTexture(material.userTextureId)` → resolves to null → falls through to `fallbackTexture`.
- `CeilingMesh.tsx`: `useMemo` currently resolves `surfaceMaterialId` → PBR or flat color. Phase 34 adds `userTextureId` as highest-priority branch, falling through to existing logic on null.

**No Suspense waterfalls:** The `useUserTexture` hook follows `useWallpaperTexture`'s `useState + useEffect` pattern (NOT the Suspense-throwing pattern of `PbrSurface`). This means:
- On first render: hook returns `null` → surface renders at base color
- On texture load: state update → surface re-renders with texture
- On orphan: hook returns `null` → surface stays at base color permanently

This is exactly the Phase 32 missing-texture pattern specified in D-08/D-09. No error thrown, no blank scene.

**Confidence:** HIGH — pattern is confirmed in `wallpaperTextureCache.ts` and `useWallpaperTexture`.

---

### I. Testing Strategy

**Existing test infrastructure:** vitest + jsdom + React Testing Library. 50+ test files confirmed. No Playwright in Phase 34 (Phase 36 adds Playwright for VIZ-10 harness per REQUIREMENTS.md).

**Test driver pattern (Phase 29/30/31 convention):**
```typescript
if (typeof window !== "undefined" && import.meta.env.MODE === "test") {
  (window as any).__driveTextureUpload = async (file: File, name: string, tileSizeFt: number) => { ... };
  (window as any).__getTextureById = (id: string) => getUserTexture(id);
  (window as any).__getUserTextureCount = () => listUserTextures();
  (window as any).__countTextureRefs = (id: string) => countTextureRefs(...);
}
```

**New test files needed:**

| File | Coverage |
|------|----------|
| `tests/userTextureStore.test.ts` | save/load/dedup (SHA-256), MIME gate, downscale contract (mocked), list sort order |
| `tests/userTextureCache.test.ts` | non-disposing cache contract (mirrors `wallpaperTextureCache.test.tsx`), null on orphan |
| `tests/userTexturePicker.test.tsx` | MY TEXTURES tab renders, upload slot visible, texture card selected/deselect |
| `tests/userTextureDelete.test.ts` | ref-count calculation, confirm dialog copy, IDB del called on confirm |
| `tests/userTextureSnapshot.test.ts` | LIB-08: `JSON.stringify(snapshot)` zero data-URL, userTextureId string only |
| `tests/userTextureOrphan.test.tsx` | orphan userTextureId → WallMesh/FloorMesh/CeilingMesh render at base color, no throw |

**Unit test split:** All tests are vitest unit/component tests. The `OffscreenCanvas` + `createImageBitmap` path needs mocking in jsdom (jsdom does not implement OffscreenCanvas natively). Use `vi.stubGlobal('createImageBitmap', mockFn)` and `vi.stubGlobal('OffscreenCanvas', MockOffscreenCanvas)`. Alternatively, extract the downscale + hash logic into a standalone `processTextureFile(file)` function that is easier to mock at the `OffscreenCanvas` boundary.

**Confidence:** MEDIUM — driver pattern is clear, specific test implementation depends on component structure finalized in planning.

---

## Plan Breakdown Recommendation

**4 plans, sequential waves:**

### Plan 34-01: Data Layer (Wave 1 — no UI, no 3D)
**Goal:** `userTextureStore` IDB keyspace, `UserTexture` type, `useUserTextures` hook, `countTextureRefs` utility, `validateInput` reuse for tile size, type additions to `cad.ts` (`Wallpaper.userTextureId`, `FloorMaterial.kind: "user-texture"`, `Ceiling.userTextureId`).

**Tasks:**
1. Add `UserTexture` interface to `src/types/userTexture.ts` (new file)
2. Implement `src/lib/userTextureStore.ts` with `createStore`, save/load/del/list + SHA-256 dedup check
3. Implement `src/hooks/useUserTextures.ts` hook (load on mount, save/update/remove mutations)
4. Add `countTextureRefs` to `src/lib/userTextureStore.ts`
5. Extend `src/types/cad.ts` with `userTextureId` fields
6. Wave 0 tests: `tests/userTextureStore.test.ts`

**Wave:** 1 (no dependencies)

---

### Plan 34-02: Upload Modal (Wave 2 — depends on Plan 01)
**Goal:** `UploadTextureModal` component (D-02: drag/drop + file picker, preview, name + tile-size fields, Save). Implements the downscale + SHA-256 pipeline. Errors inline. Toast on success.

**Tasks:**
1. Implement `src/lib/processTextureFile.ts` — file → downscale → SHA-256 → Blob (testable standalone)
2. Create `src/components/UploadTextureModal.tsx` — drag-and-drop area, inline preview, `validateInput` for tile size, inline error display, Save button calls `useUserTextures().save()`
3. Wire test driver `window.__driveTextureUpload`
4. Wave 0 tests: `tests/uploadTextureModal.test.tsx`, `tests/processTextureFile.test.ts`

**Wave:** 2 (depends on Plan 01 `useUserTextures` hook)

---

### Plan 34-03: Material Picker MY TEXTURES Tab (Wave 2 — depends on Plan 01, parallel to Plan 02)
**Goal:** MY TEXTURES tab in `FloorMaterialPicker`, `SurfaceMaterialPicker` (ceiling), and `WallSurfacePanel` (wall). `LibraryCard` tiles for user textures. `+ Upload Texture` slot opens `UploadTextureModal`. Edit (⋮ menu) and Delete (confirm dialog, D-07) flow. Catalog edit modal (D-11).

**Tasks:**
1. Create `src/components/MyTexturesList.tsx` — shared sub-component that renders LibraryCard grid + `+ Upload` tile + delete/edit actions. Consumed by all three picker hosts.
2. Add MY TEXTURES `CategoryTab` entry to `FloorMaterialPicker`, ceiling picker, wall surface picker
3. Implement delete confirm dialog (ref-count copy, D-07)
4. Implement Edit modal (re-use `UploadTextureModal` with `mode="edit"` — Claude's Discretion)
5. Wave 0 tests: `tests/myTexturesList.test.tsx`, `tests/userTextureDelete.test.ts`

**Wave:** 2 (depends on Plan 01; Plan 02 modal needed for the `+ Upload` slot — coordinate merge order or stub the modal)

---

### Plan 34-04: 3D Render Integration + Orphan Fallback (Wave 3 — depends on Plans 01–03)
**Goal:** `userTextureCache.ts`, `useUserTexture` hook, render branches in WallMesh/FloorMesh/CeilingMesh, tile repeat computation, orphan fallback (null → base hex), LIB-08 snapshot assertion.

**Tasks:**
1. Create `src/three/userTextureCache.ts` — non-disposing module-level cache (mirrors wallpaperTextureCache)
2. Create `src/hooks/useUserTexture.ts` — `useState + useEffect` pattern, returns `THREE.Texture | null`
3. Extend `WallMesh.tsx` — add `useUserTexture(wall.wallpaper?.A?.userTextureId)` calls, overlay branch with `<primitive attach="map" dispose={null}>`
4. Extend `FloorMesh.tsx` — add `kind: "user-texture"` branch
5. Extend `CeilingMesh.tsx` — add `userTextureId` branch (highest priority)
6. Wave 0 tests: `tests/userTextureCache.test.ts`, `tests/userTextureOrphan.test.tsx`, `tests/userTextureSnapshot.test.ts`

**Wave:** 3 (depends on Plans 01–03)

---

## Validation Architecture

> `workflow.nyquist_validation` not explicitly set to false — section included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (confirmed in `package.json`, 50+ existing tests) |
| Config file | `vite.config.ts` (vitest config inline) |
| Quick run command | `npx vitest run tests/userTextureStore.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Files |
|--------|----------|-----------|-------------------|-------|
| LIB-06 | Upload JPEG, name+tileSizeFt, apply to floor, persists across reload | Integration | `npx vitest run tests/userTextureStore.test.ts tests/myTexturesList.test.tsx` | Wave 0 |
| LIB-06 | validateInput parses feet+inches for tile size | Unit | `npx vitest run tests/dimensionEditor.test.ts` | Exists (37 tests) |
| LIB-06 | Material picker MY TEXTURES tab visible, card selectable | Component | `npx vitest run tests/myTexturesList.test.tsx` | Wave 0 |
| LIB-07 | 2048px downscale — IDB blob dimensions ≤ 2048 | Unit | `npx vitest run tests/processTextureFile.test.ts` | Wave 0 |
| LIB-07 | SHA-256 dedup — second upload of same bytes returns existing id | Unit | `npx vitest run tests/userTextureStore.test.ts` | Wave 0 |
| LIB-07 | MIME reject — SVG/GIF/HEIC produces inline error not save | Unit | `npx vitest run tests/uploadTextureModal.test.tsx` | Wave 0 |
| LIB-08 | Snapshot JSON has zero `data:` substrings after placing 5 user-texture surfaces | Unit | `npx vitest run tests/userTextureSnapshot.test.ts` | Wave 0 |
| LIB-08 | Orphan userTextureId → WallMesh renders without throw | Component | `npx vitest run tests/userTextureOrphan.test.tsx` | Wave 0 |
| LIB-08 | Non-disposing cache — second mount returns same THREE.Texture instance | Unit | `npx vitest run tests/userTextureCache.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/userTextureStore.test.ts` (or the relevant new test file)
- **Per wave merge:** `npx vitest run` (full suite, must stay green)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps (all must be created before execute-phase)

- [ ] `tests/userTextureStore.test.ts` — covers LIB-07 SHA-256 dedup, save/load/del/list, sort order
- [ ] `tests/processTextureFile.test.ts` — covers LIB-07 downscale (mocked OffscreenCanvas), MIME gate
- [ ] `tests/uploadTextureModal.test.tsx` — covers LIB-07 inline error, LIB-06 save flow
- [ ] `tests/myTexturesList.test.tsx` — covers LIB-06 picker tab, card selection, delete confirm copy
- [ ] `tests/userTextureCache.test.ts` — covers LIB-08 non-disposing cache contract
- [ ] `tests/userTextureOrphan.test.tsx` — covers LIB-08 orphan fallback
- [ ] `tests/userTextureSnapshot.test.ts` — covers LIB-08 zero data-URL assertion
- [ ] `tests/userTextureDelete.test.ts` — covers D-07 ref-count calculation + confirm dialog

---

## Open Questions / Blockers

### No hard blockers found. One implementation decision to surface:

**OQ-01: WallSurfacePanel — structure not read**
- What: `WallSurfacePanel.tsx` (from grep results) was not read during research. It is the wall-side surface picker. Phase 34 must add MY TEXTURES tab here.
- Risk: LOW — pattern is identical to FloorMaterialPicker. Plan 03 should read this file before planning tasks.
- Recommendation: Plan 34-03 planner reads `src/components/WallSurfacePanel.tsx` before finalizing task breakdown.

**OQ-02: OffscreenCanvas in vitest/jsdom**
- What: jsdom does not natively implement `OffscreenCanvas.convertToBlob`. Tests for `processTextureFile` will need either `vi.stubGlobal` mocks or an abstraction seam.
- Recommendation: `processTextureFile.ts` should accept an injectable `downscale` function parameter for test isolation, with a default that uses `OffscreenCanvas`. Planner should specify this seam in Plan 34-02.

**OQ-03: ObjectURL lifetime when texture cache is invalidated on delete**
- What: When a texture is deleted from IDB, the module-level cache in `userTextureCache.ts` still holds the cached `Promise<THREE.Texture | null>` for that `id`. Subsequent renders will use the cached texture until page reload.
- Options: (a) Invalidate cache on delete — safe, requires `cache.delete(id)` + `URL.revokeObjectURL(url)` in the delete flow; (b) Accept stale cache until reload — simpler but texture remains rendered after "delete" until reload.
- Recommendation (Claude's Discretion): Option (a) — invalidate the cache on delete. This makes the UI consistent (texture disappears from 3D immediately after delete). Implement as `clearUserTextureCache(id)` export.

---

## Deferred Items

These are explicitly out of scope for Phase 34. Do not plan for them.

- **D-10: Per-placement tile-size override** — no `tileSizeOverride` on Wallpaper, FloorMaterial, or Ceiling. Post-v1.8 only.
- **D-12: VIZ-10 / Phase 36 instrumentation hooks** — Phase 34 builds on Phase 32 patterns as-is. Phase 36 extends `userTextureCache` if root-cause analysis requires it.
- **Bulk upload queue** — one file per upload (D-03).
- **User-uploaded normal / roughness maps** — albedo only (v1.8 Out of Scope).
- **Per-surface orphan badge / reconciliation sweep** — silent fallback only (D-08/D-09).
- **Surface-type tagging at upload** — any texture to any surface (D-05).
- **User-facing sort controls on MY TEXTURES** — recent-first only (D-06).

---

## Environment Availability

Step 2.6: SKIPPED — Phase 34 is purely browser-side code + existing toolchain. No new CLI tools, databases, or external services. `createImageBitmap`, `OffscreenCanvas`, `crypto.subtle.digest`, `URL.createObjectURL` are all browser builtins with no npm install.

---

## Sources

### Primary (HIGH confidence)
- `src/lib/serialization.ts` — confirmed idb-keyval default store, key prefix pattern
- `src/types/cad.ts` — confirmed CADSnapshot shape, Wallpaper/FloorMaterial/Ceiling fields
- `src/three/wallpaperTextureCache.ts` — confirmed non-disposing cache pattern
- `src/three/pbrTextureCache.ts` — confirmed refcount acquire/release API
- `src/three/PbrSurface.tsx` — confirmed Suspense + ErrorBoundary wrapping
- `src/three/WallMesh.tsx` — confirmed wallpaper overlay + `<primitive dispose={null}>`
- `src/three/FloorMesh.tsx` — confirmed `kind: "custom"` data URL branch
- `src/three/CeilingMesh.tsx` — confirmed PBR + paint tier resolution
- `src/canvas/dimensionEditor.ts` lines 42–81 — confirmed `validateInput` contract
- `src/components/library/CategoryTabs.tsx` — confirmed props API
- `src/components/library/LibraryCard.tsx` — confirmed `onRemove`, `thumbnail`, `selected` props
- `src/components/FloorMaterialPicker.tsx` — confirmed current upload pattern (FileReader + data URL)
- `src/components/SurfaceMaterialPicker.tsx` — confirmed current bundled material grid
- `src/data/surfaceMaterials.ts` — confirmed `PbrMaps.tile.{wFt, lFt}` semantics
- `node_modules/idb-keyval/dist/index.cjs` — confirmed `createStore` is exported
- `.planning/phases/32-pbr-foundation/32-07-SUMMARY.md` — confirmed VIZ-10 candidate causes
- `.planning/phases/34-user-uploaded-textures/34-CONTEXT.md` — all locked decisions
- `.planning/REQUIREMENTS.md` — LIB-06/07/08 verifiable + acceptance conditions

### Secondary (MEDIUM confidence)
- `src/components/WallSurfacePanel.tsx` — NOT read; inferred from grep results + pattern consistency
- OffscreenCanvas jsdom support — based on known jsdom behavior; verified by vitest/jsdom project convention

---

## RESEARCH COMPLETE

**Phase:** 34 — User-Uploaded Textures
**Confidence:** HIGH

### Key Findings
- `idb-keyval.createStore` is available and is the correct IDB isolation mechanism; separate named store, no migration needed.
- Upload pipeline: `createImageBitmap` + `OffscreenCanvas.convertToBlob` + `crypto.subtle.digest("SHA-256")` — all main thread, sub-second, no Worker needed.
- User textures MUST use the non-disposing wallpaperTextureCache pattern (NOT pbrTextureCache refcount) to survive 2D↔3D toggling.
- The material picker is NOT a single unified component — MY TEXTURES tab must be added to 3 separate pickers (floor, ceiling, wall surface). `MyTexturesList` shared sub-component avoids triple duplication.
- `validateInput` in `src/canvas/dimensionEditor.ts` is the feet+inches parser — import directly, returns decimal feet.

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | All libraries confirmed in production code |
| Architecture | HIGH | All integration points read from source |
| Upload Pipeline | HIGH | Browser APIs confirmed available on target platform |
| IDB Keyspace | HIGH | createStore verified in node_modules |
| Pitfalls | HIGH | Phase 32 VIZ-10 history documented, non-disposing pattern confirmed |
| Test Strategy | MEDIUM | Driver pattern confirmed; exact jsdom mock shape for OffscreenCanvas to be finalized in Plan 34-02 |

### Open Questions
- OQ-01: Read `WallSurfacePanel.tsx` at plan-time (not blocking)
- OQ-02: OffscreenCanvas mock seam in vitest — handle in Plan 34-02 Wave 0
- OQ-03: Cache invalidation on delete — recommend option (a), expose `clearUserTextureCache(id)`

### Ready for Planning
Research complete. Planner can create 4 PLAN.md files (34-01 through 34-04).
