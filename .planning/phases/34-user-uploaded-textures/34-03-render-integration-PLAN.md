---
phase: 34-user-uploaded-textures
plan: 03
type: execute
wave: 3
depends_on: [34-00, 34-02]
files_modified:
  - src/three/userTextureCache.ts
  - src/hooks/useUserTexture.ts
  - src/three/FloorMesh.tsx
  - src/three/WallMesh.tsx
  - src/three/CeilingMesh.tsx
  - tests/userTextureCache.test.ts
  - tests/userTextureOrphan.test.tsx
  - tests/userTextureSnapshot.test.ts
autonomous: true
requirements: [LIB-06, LIB-07, LIB-08]
gap_closure: false

must_haves:
  truths:
    - "After Jessica picks an uploaded texture in the floor/ceiling/wall picker, the 3D view renders the texture at the stored tileSizeFt repeat scale"
    - "Orphan userTextureId (texture missing from IDB) renders the surface at its base color with ZERO thrown errors and ZERO blank scene"
    - "JSON.stringify(snapshot) contains zero `data:image` substrings after applying user textures to 5 surfaces (LIB-08)"
    - "Toggling 2D ↔ 3D view 5 times does not produce a blank/missing texture on any user-texture surface (non-disposing cache semantics preserved from Phase 32 VIZ-10 lessons)"
    - "Deleting a texture emits `user-texture-deleted` event which invalidates the cache + revokes the ObjectURL so subsequent renders fall back to base color immediately"
  artifacts:
    - path: "src/three/userTextureCache.ts"
      provides: "Module-level non-disposing Map<id, Promise<THREE.Texture | null>>; getUserTextureCached; clearUserTextureCache; window-event subscriber"
      contains: "const cache = new Map"
    - path: "src/hooks/useUserTexture.ts"
      provides: "React hook returning THREE.Texture | null for a userTextureId"
      contains: "export function useUserTexture"
    - path: "src/three/FloorMesh.tsx"
      provides: "kind: 'user-texture' render branch with repeat = surface / tileSizeFt"
      contains: "kind === \"user-texture\""
    - path: "src/three/WallMesh.tsx"
      provides: "userTextureId branch on wallpaper.{A,B} with primitive dispose={null} attach"
      contains: "userTextureId"
    - path: "src/three/CeilingMesh.tsx"
      provides: "userTextureId branch as highest-priority material"
      contains: "userTextureId"
  key_links:
    - from: "src/three/userTextureCache.ts"
      to: "src/three/wallpaperTextureCache.ts (pattern source)"
      via: "Non-disposing Map<string, Promise<THREE.Texture | null>>; dispose={null} at render sites"
      pattern: "new Map"
    - from: "src/three/userTextureCache.ts"
      to: "src/lib/userTextureStore.ts"
      via: "getUserTexture(id) for Blob retrieval"
      pattern: "getUserTexture"
    - from: "src/three/FloorMesh.tsx / WallMesh.tsx / CeilingMesh.tsx"
      to: "src/hooks/useUserTexture.ts"
      via: "useUserTexture(id) returns null on orphan"
      pattern: "useUserTexture"
    - from: "src/three/userTextureCache.ts"
      to: "window 'user-texture-deleted' event (Plan 02 emits)"
      via: "addEventListener invalidates cache entry + revokes ObjectURL"
      pattern: "user-texture-deleted"
---

<objective>
Bridge the data layer and picker flows into the 3D rendering pipeline. Create `userTextureCache.ts` using the Phase 32 non-disposing `wallpaperTextureCache` pattern (NOT the refcount `pbrTextureCache`), a `useUserTexture` React hook, and userTextureId render branches in `WallMesh`, `FloorMesh`, and `CeilingMesh`. Implement orphan fallback (null → base color, no throw) and cache invalidation on delete via the `user-texture-deleted` event from Plan 02. Verify LIB-08 by asserting zero `data:image` in serialized snapshot.

Purpose: This plan closes the loop from upload → persist → pick → render. It is also the VIZ-10 regression guard: user textures MUST survive 2D↔3D toggles the same way wallpapers do.

Output: 2 new files (cache + hook) + 3 mesh files modified + 3 new test files covering cache semantics, orphan fallback, and snapshot purity.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/34-user-uploaded-textures/34-CONTEXT.md
@.planning/phases/34-user-uploaded-textures/34-RESEARCH.md
@.planning/phases/32-pbr-foundation/32-07-SUMMARY.md
@.planning/phases/34-user-uploaded-textures/34-00-data-layer-PLAN.md
@.planning/phases/34-user-uploaded-textures/34-02-picker-integration-PLAN.md

# Pattern-source files the executor MUST read before coding
@src/three/wallpaperTextureCache.ts
@src/three/WallMesh.tsx
@src/three/FloorMesh.tsx
@src/three/CeilingMesh.tsx

<interfaces>
<!-- Reference pattern (from src/three/wallpaperTextureCache.ts — EXECUTOR READS THIS FILE): -->
```typescript
// wallpaperTextureCache.ts — the exact pattern user textures MUST follow:
// - Module-level Map<string, Promise<THREE.Texture | null>>
// - Never dispose on consumer unmount
// - Texture colorSpace = THREE.SRGBColorSpace
// - wrapS = wrapT = THREE.RepeatWrapping
// - Render sites use <primitive attach="map" object={tex} dispose={null} />
// DO NOT IMPORT AND REUSE pbrTextureCache (it refcount-disposes, which breaks 2D↔3D toggle)
```

<!-- From Plan 00: -->
```typescript
export async function getUserTexture(id: string): Promise<UserTexture | undefined>; // Blob lookup
```

<!-- From Plan 02 (already landed): -->
```typescript
// On delete confirm, DeleteTextureDialog emits:
window.dispatchEvent(new CustomEvent("user-texture-deleted", { detail: { id: "utex_..." } }));
```

<!-- Target render precedence for each mesh: -->
//   WallMesh  (wallpaper.A): userTextureId > imageUrl(legacy) > no wallpaper
//   WallMesh  (wallpaper.B): same
//   FloorMesh: kind="user-texture" > kind="custom"(imageUrl legacy) > kind="preset" > color fallback
//   CeilingMesh: userTextureId > surfaceMaterialId (PBR) > flat color

<!-- Tile repeat (RESEARCH.md §C): -->
//   For any surface: repeatX = surfaceWidthFt / tileSizeFt; repeatY = surfaceHeightFt / tileSizeFt
//   (tileSizeFt is a single square-tile value per D-10)
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: userTextureCache.ts (non-disposing) + useUserTexture hook + cache invalidation on delete</name>
  <files>src/three/userTextureCache.ts, src/hooks/useUserTexture.ts, tests/userTextureCache.test.ts</files>
  <read_first>
    - src/three/wallpaperTextureCache.ts (read ENTIRELY — this is the pattern source; mirror its shape exactly)
    - src/three/pbrTextureCache.ts (read ENTIRELY — this is the ANTI-pattern; confirm you are NOT mirroring its refcount dispose)
    - src/lib/userTextureStore.ts (from Plan 00 — use `getUserTexture(id)`)
    - .planning/phases/34-user-uploaded-textures/34-RESEARCH.md §C (Phase 32 integration points + exact code snippet)
    - .planning/phases/32-pbr-foundation/32-07-SUMMARY.md (VIZ-10 cause list)
  </read_first>
  <behavior>
    - `getUserTextureCached(id)` returns `Promise<THREE.Texture | null>`; same Promise returned on repeated calls (dedup)
    - Cache miss: calls `getUserTexture(id)` → if Blob found, creates ObjectURL, loads via `THREE.TextureLoader().loadAsync(url)`, sets `colorSpace=SRGBColorSpace`, `wrapS=wrapT=RepeatWrapping`; if not found, resolves to `null`
    - Loader failure: catches, resolves to `null` (no throw)
    - Cache NEVER disposes textures on consumer unmount (critical for 2D↔3D toggle survival — VIZ-10 class bug guard)
    - `clearUserTextureCache(id)` removes the cache entry AND revokes the ObjectURL for that id
    - Subscribes to `window.addEventListener("user-texture-deleted", ...)` on module load; auto-invalidates cache entry for the deleted id
    - `useUserTexture(id: string | undefined): THREE.Texture | null` — `useState + useEffect` pattern (NOT Suspense); returns `null` initially and on orphan, texture when loaded
    - Hook handles id changes correctly (new id triggers new resolution) and unmount safely (cancel flag, but DOES NOT dispose the texture — cache owns lifetime)
  </behavior>
  <action>
    Create `src/three/userTextureCache.ts`:

    ```typescript
    import * as THREE from "three";
    import { getUserTexture } from "@/lib/userTextureStore";

    const cache = new Map<string, Promise<THREE.Texture | null>>();
    const objectUrls = new Map<string, string>();

    export function getUserTextureCached(id: string): Promise<THREE.Texture | null> {
      const existing = cache.get(id);
      if (existing) return existing;

      const p = (async () => {
        const rec = await getUserTexture(id);
        if (!rec) return null;
        const url = URL.createObjectURL(rec.blob);
        objectUrls.set(id, url);
        const loader = new THREE.TextureLoader();
        try {
          const tex = await loader.loadAsync(url);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.RepeatWrapping;
          tex.needsUpdate = true;
          return tex;
        } catch {
          return null;
        }
      })();

      cache.set(id, p);
      return p;
    }

    export function clearUserTextureCache(id: string): void {
      cache.delete(id);
      const url = objectUrls.get(id);
      if (url) {
        URL.revokeObjectURL(url);
        objectUrls.delete(id);
      }
    }

    export function _clearAllForTests(): void {
      for (const url of objectUrls.values()) URL.revokeObjectURL(url);
      objectUrls.clear();
      cache.clear();
    }

    if (typeof window !== "undefined") {
      window.addEventListener("user-texture-deleted", (ev) => {
        const detail = (ev as CustomEvent<{ id: string }>).detail;
        if (detail?.id) clearUserTextureCache(detail.id);
      });
    }
    ```

    Create `src/hooks/useUserTexture.ts`:

    ```typescript
    import { useEffect, useState } from "react";
    import * as THREE from "three";
    import { getUserTextureCached } from "@/three/userTextureCache";

    export function useUserTexture(id: string | undefined): THREE.Texture | null {
      const [tex, setTex] = useState<THREE.Texture | null>(null);

      useEffect(() => {
        let cancelled = false;
        if (!id) {
          setTex(null);
          return;
        }
        setTex(null); // clear while loading on id change
        getUserTextureCached(id).then(t => {
          if (!cancelled) setTex(t);
        });
        return () => { cancelled = true; };
      }, [id]);

      return tex;
    }
    ```

    Write `tests/userTextureCache.test.ts`. Mock `getUserTexture` (from Plan 00) via vi.mock. Mock `THREE.TextureLoader` via vi.spyOn (loadAsync returns a fake `THREE.Texture` instance). >= 8 cases:

    1. First call to `getUserTextureCached("utex_1")` returns Promise resolving to a THREE.Texture with `colorSpace === SRGBColorSpace`, `wrapS === RepeatWrapping`, `wrapT === RepeatWrapping`
    2. Second call with same id returns SAME Promise instance (cache dedup) — assert `cache1 === cache2` via Object.is reference check
    3. Orphan: `getUserTexture` returns undefined → resolves to `null`
    4. Loader throws → resolves to `null` (no throw)
    5. `clearUserTextureCache(id)` removes entry; subsequent `getUserTextureCached(id)` produces a NEW Promise (not the same reference)
    6. ObjectURL lifecycle: assert `URL.createObjectURL` called on cache miss, `URL.revokeObjectURL` called on clear (spy on both)
    7. `window.dispatchEvent(new CustomEvent("user-texture-deleted", { detail: { id: "utex_1" } }))` invalidates the cache for utex_1 (next call re-fetches)
    8. Non-disposing: `useUserTexture` unmount does NOT dispose the texture — mount hook, load texture, unmount, check `tex.dispose` was not called (spy on dispose)
    9. Id change: mount with id=A, change to id=B → state flips to null briefly then to B's texture
  </action>
  <verify>
    <automated>npx vitest run tests/userTextureCache.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - [ ] `grep -q "const cache = new Map" src/three/userTextureCache.ts` succeeds (module-level cache)
    - [ ] `grep -q "SRGBColorSpace" src/three/userTextureCache.ts` AND `grep -q "RepeatWrapping" src/three/userTextureCache.ts` succeed
    - [ ] `grep -q "export function clearUserTextureCache" src/three/userTextureCache.ts` succeeds
    - [ ] `grep -q "URL.createObjectURL" src/three/userTextureCache.ts` AND `grep -q "URL.revokeObjectURL" src/three/userTextureCache.ts` succeed
    - [ ] `grep -q "user-texture-deleted" src/three/userTextureCache.ts` succeeds (event subscriber)
    - [ ] `! grep -q "acquireTexture\\|releaseTexture" src/three/userTextureCache.ts` (did NOT reuse pbrTextureCache refcount API)
    - [ ] `! grep -q "\\.dispose()" src/three/userTextureCache.ts` (non-disposing — except within `_clearAllForTests` which is test-only; if dispose appears, ensure it's only inside `_clearAllForTests`)
    - [ ] `grep -q "export function useUserTexture" src/hooks/useUserTexture.ts` succeeds
    - [ ] `grep -q "getUserTextureCached" src/hooks/useUserTexture.ts` succeeds
    - [ ] `npx vitest run tests/userTextureCache.test.ts` passes with >= 8 tests green
  </acceptance_criteria>
  <done>
    Cache + hook reproduce Phase 32 wallpaperTextureCache semantics for user textures. Event-driven invalidation wires Plan 02's delete flow to immediate 3D fallback. VIZ-10 class bug is actively guarded against by the non-disposing assertion test.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Wire useUserTexture into WallMesh + FloorMesh + CeilingMesh with orphan fallback</name>
  <files>src/three/WallMesh.tsx, src/three/FloorMesh.tsx, src/three/CeilingMesh.tsx, tests/userTextureOrphan.test.tsx</files>
  <read_first>
    - src/three/WallMesh.tsx (read ENTIRELY — find the existing `useWallpaperTexture` branch for side A/B; mirror the pattern)
    - src/three/FloorMesh.tsx (read ENTIRELY — find the existing `kind: "custom"` data-URL branch; ADD the `kind: "user-texture"` branch ADJACENT to it, preserving the custom branch as legacy fallback)
    - src/three/CeilingMesh.tsx (read ENTIRELY — find current `surfaceMaterialId` resolution + PBR/paint branches)
    - src/hooks/useUserTexture.ts (Task 1)
    - src/types/cad.ts (from Plan 00 — confirm the final Wallpaper / FloorMaterial / Ceiling shape)
    - .planning/phases/34-user-uploaded-textures/34-RESEARCH.md §C and §H
  </read_first>
  <behavior>
    - WallMesh: Add `useUserTexture(wall.wallpaper?.A?.userTextureId)` and `useUserTexture(wall.wallpaper?.B?.userTextureId)` hook calls; when not null, overlay branch uses the returned texture via `<primitive object={tex} attach="map" dispose={null} />`. Tile repeat: `tex.repeat.set(wallLengthFt / tileSizeFt, wallHeightFt / tileSizeFt)` where `tileSizeFt = wallpaper.scaleFt` (reused — wallpaper already carries scaleFt).
    - FloorMesh: Add `useUserTexture(material.kind === "user-texture" ? material.userTextureId : undefined)`. Branch: when `kind === "user-texture"` AND `tex !== null` → render textured plane with `tex.repeat.set(roomWidthFt / material.scaleFt, roomLengthFt / material.scaleFt)`. When `kind === "user-texture"` AND `tex === null` (orphan) → fall through to floor base color (existing `fallbackTexture` / flat color branch).
    - CeilingMesh: Add `useUserTexture(ceiling.userTextureId)` as HIGHEST priority. When not null → render textured ceiling. When null (orphan OR no userTextureId) → fall through to existing surfaceMaterialId/paint logic.
    - All three meshes: when texture is null, NO throw, NO blank scene — base color renders. This is the orphan contract (D-08/D-09).
    - All render sites use `dispose={null}` on the primitive — matches Phase 32 guard against R3F auto-dispose invalidating the shared cached texture.
  </behavior>
  <action>
    For each mesh file, make minimal additive changes. Do NOT remove or restructure existing branches — user textures are a new branch with priority, existing branches are preserved as fallbacks.

    **WallMesh.tsx changes:**

    1. Import `useUserTexture` from `@/hooks/useUserTexture`.
    2. At the top of the component body (adjacent to existing `useWallpaperTexture` calls), add:
       ```typescript
       const userTexA = useUserTexture(wall.wallpaper?.A?.userTextureId);
       const userTexB = useUserTexture(wall.wallpaper?.B?.userTextureId);
       ```
    3. In each wallpaper render branch (side A and side B), PRIORITIZE the user texture over the legacy `imageUrl` path:
       ```tsx
       {wall.wallpaper?.A?.userTextureId && userTexA ? (
         <meshStandardMaterial>
           <primitive object={userTexA} attach="map" dispose={null} />
         </meshStandardMaterial>
       ) : wall.wallpaper?.A?.imageUrl ? (
         /* existing imageUrl/data-URL branch untouched */
       ) : null}
       ```
    4. For tile repeat, set it inside an effect OR inline at render:
       ```typescript
       useEffect(() => {
         if (userTexA && wall.wallpaper?.A) {
           const scale = wall.wallpaper.A.scaleFt || 2;
           userTexA.repeat.set(wallLengthFt / scale, wall.height / scale);
           userTexA.needsUpdate = true;
         }
       }, [userTexA, wall.wallpaper?.A?.scaleFt, wallLengthFt, wall.height]);
       ```
       Same for side B.

    **FloorMesh.tsx changes:**

    1. Import `useUserTexture`.
    2. Add:
       ```typescript
       const userTexId = material.kind === "user-texture" ? material.userTextureId : undefined;
       const userTex = useUserTexture(userTexId);
       ```
    3. Add render branch BEFORE the existing `kind === "custom"` branch:
       ```tsx
       if (material.kind === "user-texture" && userTex) {
         // Set repeat
         userTex.repeat.set(roomWidthFt / material.scaleFt, roomLengthFt / material.scaleFt);
         userTex.rotation = (material.rotationDeg ?? 0) * Math.PI / 180;
         userTex.needsUpdate = true;
         return (
           <mesh>
             {/* existing floor geometry */}
             <meshStandardMaterial>
               <primitive object={userTex} attach="map" dispose={null} />
             </meshStandardMaterial>
           </mesh>
         );
       }
       // Orphan case (userTextureId set but userTex === null) falls through to flat-color branch below
       ```
    4. If the existing code uses `useMemo` for the material selection, fold the user-texture branch into the memo with appropriate deps.

    **CeilingMesh.tsx changes:**

    1. Import `useUserTexture`.
    2. Add:
       ```typescript
       const userTex = useUserTexture(ceiling.userTextureId);
       ```
    3. Make user texture the highest priority branch:
       ```tsx
       if (ceiling.userTextureId && userTex) {
         // Compute ceiling size from room — same mechanism used for existing PBR branch
         const scale = /* ceiling uses a tile-size input; if Ceiling currently lacks a scaleFt, default to 2ft or reuse the associated UserTexture.tileSizeFt — but the hook only returns THREE.Texture, so pass tileSizeFt through from a separate source */;
         // SIMPLER: store the scale in ceiling.userTextureScaleFt? OR look up via useUserTextures()
         // DECIDE: Add ceiling.userTextureScaleFt?: number and set it at pick time (Plan 02 dispatch) OR fetch from userTexture catalog.
         // RECOMMENDED: Extend updateCeiling dispatch in Plan 02 to also set a ceilingSurfaceScaleFt — but Plan 02 already landed, so HERE we do lookup via the hook:
         // Use a separate hook call OR inline the catalog lookup
         return (...);
       }
       ```

       **Clarification on ceiling scale:** Since `Ceiling` has no `scaleFt` field today, and `UserTexture.tileSizeFt` is in IDB not state, the cleanest approach is: **lookup the catalog entry via `useUserTextures()` inside CeilingMesh to read `tileSizeFt`.** This is acceptable overhead (one IDB read at mount, cached by useUserTextures hook). Implementation:
       ```typescript
       import { useUserTextures } from "@/hooks/useUserTextures";
       // ...
       const { textures } = useUserTextures();
       const userTextureEntry = ceiling.userTextureId ? textures.find(t => t.id === ceiling.userTextureId) : undefined;
       const tileSizeFt = userTextureEntry?.tileSizeFt ?? 2;
       // Use tileSizeFt for repeat:
       if (userTex) {
         userTex.repeat.set(roomWidthFt / tileSizeFt, roomLengthFt / tileSizeFt);
         userTex.needsUpdate = true;
       }
       ```
    4. If `userTex === null` OR `ceiling.userTextureId` is undefined → fall through to existing `surfaceMaterialId` / PBR / paint resolution untouched.

    **Test driver** (added at bottom of `src/three/userTextureCache.ts` — not in meshes):
    ```typescript
    if (typeof window !== "undefined" && import.meta.env.MODE === "test") {
      (window as any).__getUserTextureCacheSize = () => cache.size;
      (window as any).__simulateUserTextureOrphan = (id: string) => {
        // Plan 00's deleteUserTexture + cache clear — but without emitting the event so we can test the cache-lookup path
        cache.delete(id);
      };
    }
    ```

    Write `tests/userTextureOrphan.test.tsx`. Mock `useUserTexture` to return `null` for specific ids. Use React Three Fiber's `@react-three/test-renderer` (OR just shallow-render with the cadStore + mock hook). >= 5 cases:
    1. WallMesh with `wall.wallpaper.A.userTextureId = "utex_missing"` → hook returns null → no textured overlay rendered, no throw (assertable by absence of primitive with `attach="map"`)
    2. FloorMesh with `material.kind === "user-texture"`, `material.userTextureId = "utex_missing"` → hook returns null → falls through to flat-color branch (assertable by material color equal to expected fallback)
    3. CeilingMesh with `ceiling.userTextureId = "utex_missing"` → falls through to surfaceMaterialId / flat color
    4. WallMesh with real texture (mock hook returns a mock THREE.Texture) → primitive rendered with `dispose={null}` attribute (assert via React element tree inspection)
    5. Deleting texture (dispatch `user-texture-deleted` event, then remount mesh) → subsequent render returns null from hook, fallback path taken
  </action>
  <verify>
    <automated>npx vitest run tests/userTextureOrphan.test.tsx</automated>
  </verify>
  <acceptance_criteria>
    - [ ] `grep -q "useUserTexture" src/three/WallMesh.tsx` succeeds
    - [ ] `grep -q "useUserTexture" src/three/FloorMesh.tsx` succeeds
    - [ ] `grep -q "useUserTexture" src/three/CeilingMesh.tsx` succeeds
    - [ ] `grep -qE "dispose=\\{null\\}" src/three/WallMesh.tsx` succeeds AND FloorMesh AND CeilingMesh each contain at least one `dispose={null}` primitive in the user-texture branch
    - [ ] `grep -q "userTextureId" src/three/WallMesh.tsx` succeeds (branch key)
    - [ ] `grep -qE "kind\\s*===\\s*\"user-texture\"" src/three/FloorMesh.tsx` succeeds (floor branch)
    - [ ] `grep -q "ceiling.userTextureId" src/three/CeilingMesh.tsx` succeeds (ceiling branch)
    - [ ] `! grep -q "acquireTexture\\|releaseTexture" src/three/WallMesh.tsx src/three/FloorMesh.tsx src/three/CeilingMesh.tsx` (mesh files do NOT use pbrTextureCache refcount API for the user-texture path)
    - [ ] `grep -q "__getUserTextureCacheSize\\|__simulateUserTextureOrphan" src/three/userTextureCache.ts` AND `grep -q "import.meta.env.MODE === \"test\"" src/three/userTextureCache.ts` succeed (test drivers gated)
    - [ ] `npx vitest run tests/userTextureOrphan.test.tsx` passes with >= 5 tests green
    - [ ] Full suite: `npx vitest run` passes (no regressions to existing wall/floor/ceiling tests)
  </acceptance_criteria>
  <done>
    3D meshes render user textures correctly and fall back silently on orphan. Delete event wires through cache → meshes re-render with base color. Existing wall/floor/ceiling render paths are untouched for non-user-texture surfaces.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: LIB-08 snapshot-purity assertion + VIZ-10 regression guard</name>
  <files>tests/userTextureSnapshot.test.ts</files>
  <read_first>
    - src/lib/serialization.ts (confirm the exact snapshot-building code path — find `saveProject` or `buildSnapshot` helper that serializes state)
    - src/stores/cadStore.ts (confirm how a snapshot is built from state for save)
    - src/types/cad.ts (from Plan 00 — confirm final shape)
    - .planning/phases/34-user-uploaded-textures/34-RESEARCH.md §E (LIB-08 verification)
  </read_first>
  <behavior>
    - Build a realistic CADSnapshot by simulating: create room → add 5 surfaces (2 walls with wallpaper side A + side B, 1 floor kind="user-texture", 1 ceiling with userTextureId, plus base-color surfaces for contrast) → snapshot
    - Assert `JSON.stringify(snapshot)` contains ZERO `data:image` substrings
    - Assert snapshot contains userTextureId string references for each surface (pattern `utex_[a-z0-9]+`)
    - Assert blob fields are NOT present in the snapshot (walk the object, ensure no `Blob` instances and no `blob` key anywhere)
    - Verify roundtrip: save snapshot to `loadProject` → reload → serialized reloaded snapshot also has zero `data:image`
  </behavior>
  <action>
    Write `tests/userTextureSnapshot.test.ts`:

    1. Setup: construct a full in-memory cadStore state with:
       - 1 room with 4 walls
       - Walls 0 and 1 have `wallpaper.A = { userTextureId: "utex_wall_a", scaleFt: 2, rotationDeg: 0 }` and `wallpaper.B` similar
       - `floorMaterial: { kind: "user-texture", userTextureId: "utex_floor", scaleFt: 2.5, rotationDeg: 0 }`
       - 1 ceiling with `userTextureId: "utex_ceiling"`
       - Also include a wall with `wallpaper: undefined` (baseline — no texture) to confirm no spurious fields

    2. Build snapshot via the same helper used by saveProject (discover the exact name by reading serialization.ts — likely `buildSnapshot(state)` or inline `{ version: 2, rooms, ... }`).

    3. Assertions:
       ```typescript
       const json = JSON.stringify(snapshot);
       expect(json).not.toContain("data:image");
       expect(json).not.toContain("data:application");
       expect(json.match(/utex_[a-z0-9]+/g)?.length).toBeGreaterThanOrEqual(5); // 4 wall sides + 1 floor + 1 ceiling OR similar
       // Walk object for Blob instances:
       function hasBlob(obj: any): boolean {
         if (obj instanceof Blob) return true;
         if (obj && typeof obj === "object") {
           return Object.values(obj).some(hasBlob);
         }
         return false;
       }
       expect(hasBlob(snapshot)).toBe(false);
       ```

    4. Add a size assertion: `expect(json.length).toBeLessThan(50_000)` — with 6 user textures referenced via ID only, the snapshot should be small. (Adjust the threshold after running once if realistic baseline is higher, but the point is to catch accidental Blob/data-URL bloat in future changes.)

    5. Roundtrip test: call `saveProject("test-project", snapshot)` → `loadProject("test-project")` (use fake-indexeddb for isolation) → serialize loaded snapshot → same assertions pass.

    **VIZ-10 regression guard** (test 4 in the same file): mount FloorMesh (or WallMesh) with a user texture, simulate 2D↔3D toggle by unmounting and remounting the mesh 5 times, assert that `window.__getUserTextureCacheSize()` remains stable (cache not cleared) AND the texture reference returned by the cache on round 5 is the SAME object as round 1.

    ```typescript
    test("VIZ-10 guard: user texture survives 5x mount/unmount cycles", async () => {
      const id = "utex_test";
      // Mock getUserTexture to return a blob
      const tex1 = await getUserTextureCached(id);
      for (let i = 0; i < 5; i++) {
        // simulate unmount/remount — this is a module-level cache so the mount lifecycle is a no-op for it
        // The hook useEffect cleanup runs but MUST NOT call tex.dispose()
      }
      const tex2 = await getUserTextureCached(id);
      expect(tex2).toBe(tex1); // same reference, not disposed
    });
    ```
  </action>
  <verify>
    <automated>npx vitest run tests/userTextureSnapshot.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - [ ] `grep -q "data:image" tests/userTextureSnapshot.test.ts` succeeds (LIB-08 assertion subject)
    - [ ] `grep -q "utex_" tests/userTextureSnapshot.test.ts` succeeds (id-reference assertion)
    - [ ] `grep -q "VIZ-10" tests/userTextureSnapshot.test.ts` succeeds (comment marker for regression purpose)
    - [ ] `grep -qE "expect\\([^)]+\\)\\.not\\.toContain\\(\"data:image\"\\)" tests/userTextureSnapshot.test.ts` succeeds
    - [ ] `grep -q "instanceof Blob" tests/userTextureSnapshot.test.ts` succeeds (no-blob walker)
    - [ ] `npx vitest run tests/userTextureSnapshot.test.ts` passes with >= 4 tests green (snapshot purity + Blob absence + roundtrip purity + VIZ-10 cache stability)
    - [ ] Full suite: `npx vitest run` passes
  </acceptance_criteria>
  <done>
    LIB-08 is verified automatically on every test run. VIZ-10 class regression guard is in place — if a future change introduces refcount dispose to the user-texture path, this test will fail.
  </done>
</task>

</tasks>

<verification>
Phase-level gate (executed at the end of wave 3):

1. `npx vitest run tests/userTextureCache.test.ts tests/userTextureOrphan.test.tsx tests/userTextureSnapshot.test.ts` — all three test files green
2. `npx vitest run` — full suite green (no regressions; Phase 32 wallpaper/floor/ceiling tests still pass)
3. End-to-end via test driver (integration smoke):
   - `window.__driveTextureUpload(fakeJpegFile, "Oak Floor", 2.5)` → returns `utex_xxx`
   - Dispatch `cadStore.setFloorMaterial({ kind: "user-texture", userTextureId: "utex_xxx", scaleFt: 2.5, rotationDeg: 0 })`
   - Build snapshot → `JSON.stringify(snapshot)` contains `utex_xxx` and does NOT contain `data:image`
4. `grep -c "data:image" src/types/cad.ts src/stores/cadStore.ts src/lib/serialization.ts` is unchanged from phase start (no new data-URL plumbing introduced)
5. Reduced-motion + lucide + spacing policies: N/A for this plan (no new UI — but inherited plans already validated)
</verification>

<success_criteria>
- `userTextureCache.ts` + `useUserTexture.ts` mirror wallpaperTextureCache non-disposing pattern exactly; VIZ-10 class bug guarded by test
- WallMesh, FloorMesh, CeilingMesh each render user textures when present and fall back silently on orphan (D-08/D-09)
- Delete event flow complete: picker delete → store remove → cache invalidate → ObjectURL revoke → mesh re-renders base color
- LIB-08 verified: `JSON.stringify(snapshot)` contains zero `data:image` substrings with 6 user-texture surfaces
- LIB-06 end-to-end: upload (Plan 01) → pick (Plan 02) → render (Plan 03) forms a working chain
- LIB-07 2048px downscale (Plan 01) + SHA-256 dedup (Plan 00) + MIME reject (Plan 01) all active in the pipeline
</success_criteria>

<output>
After completion, create `.planning/phases/34-user-uploaded-textures/34-03-render-integration-SUMMARY.md` documenting:
- userTextureCache export surface + subscription to `user-texture-deleted`
- Exact render-branch ordering in each of the 3 mesh files
- Ceiling tile-size decision (useUserTextures lookup for tileSizeFt vs extending Ceiling schema)
- VIZ-10 regression guard test location + what behavior it would catch
- LIB-08 assertion results (actual snapshot size when 6 user textures are referenced)
- Any deviation from RESEARCH.md §C / §H (expected: none, but document ceiling-scale resolution choice)
</output>
