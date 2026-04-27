---
phase: 49-bug-02-wall-user-texture-first-apply
type: research
created: 2026-04-27
domain: React Three Fiber / Zustand async texture state
confidence: HIGH
requirements: [BUG-02]
related: [BUG-03 — shared-cause determination below]
---

# Phase 49: Wall User-Texture First-Apply Bug — Research

**Researched:** 2026-04-27
**Domain:** R3F `<primitive attach="map">` async update, `useUserTexture` hook, IDB cache timing
**Confidence:** HIGH — root cause conclusively identified from static code analysis

---

## Summary

The bug is a missing `material.needsUpdate = true` signal in the React layer after the
`useUserTexture` hook resolves. When a user applies an uploaded texture for the first time,
`useUserTexture` sets `tex` from `null` → `THREE.Texture` via `setTex(t)`. WallMesh
re-renders and inserts a `<primitive attach="map" object={userTex} dispose={null} />` child
into a pre-existing `meshStandardMaterial`. R3F reconciles the change by assigning
`material.map = userTex` via the `attach` prop. However, R3F does NOT automatically set
`material.needsUpdate = true` on this assignment. Three.js only re-links the shader
program when `material.needsUpdate === true`. The first WebGL draw after the apply still
uses the previously compiled shader (no map slot), so the wall renders drywall color.

The 2D↔3D toggle workaround bypasses this because the toggle causes ThreeViewport to
unmount and remount the entire R3F `<Canvas>`. On remount, `useUserTexture` resolves
instantly from the module-level cache (same `Promise` instance, already settled), `userTex`
is non-null on the very first render, and the `<meshStandardMaterial>` is constructed fresh
with the map already set — so Three.js compiles the shader WITH the map slot from the start.
No `needsUpdate` required when the map is set at construction time; it is only required when
a map transitions from unset to set on an existing material instance.

**Primary recommendation:** After the `<primitive attach="map">` is attached (i.e., when
`userTex` changes from null to a Texture), call `material.needsUpdate = true` on the parent
`meshStandardMaterial`. The correct R3F pattern is a `ref` on the material element plus a
`useEffect([userTex])` that sets the flag.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01** — Default scope is BUG-02 only. Expand to BUG-03 if root cause is shared (researcher decides).
- **D-02** — New dedicated e2e spec `e2e/wall-user-texture-first-apply.spec.ts`. Assert that `material.map` is a non-null THREE.Texture within 1500ms after `setWallpaper` is called via test driver. No screenshot assertion required.
- **D-03** — Real fix with 1-day investigation budget. Workaround path requires explanatory comments + new GH issue.
- **D-04** — No regression on Phase 32 PBR pipeline. 6 pre-existing vitest failures stay at 6. Phase 36 VIZ-10 harness still passes.
- **D-05** — One commit per logical change.
- **D-06** — Test-mode driver in `src/test-utils/userTextureDrivers.ts` if the e2e spec needs to seed IDB without full UI flow.

### Claude's Discretion

None explicitly listed in CONTEXT.md for this phase.

### Deferred Ideas (OUT OF SCOPE)

- Phase 999.4 EXPLODE+saved-camera offset (CAM-04 carry-over)
- BUG-03 wallpaper/wallArt 2D↔3D toggle (Phase 50) — UNLESS root cause shared per D-01
- DEBT-05 FloorMaterial bloat migration (Phase 51)
- HOTKEY-01 cheat sheet (Phase 52)
- Refactoring `useUserTexture` to Suspense or other async pattern
- New PBR features (#81)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BUG-02 | Uploaded wall texture renders in 3D on first apply without view-mode toggle | Root cause identified: missing `material.needsUpdate = true` after `<primitive attach="map">` transition from null → Texture. Fix is targeted and confirmed non-regressive on Phase 32 pipeline. |
</phase_requirements>

---

## Hypothesis Ranking (Most → Least Likely)

### Hypothesis A — `<primitive attach="map">` does not trigger `material.needsUpdate` (CONFIRMED ROOT CAUSE)

**Evidence for:**

- `WallMesh.tsx:137-150`: when `userTex` transitions null → Texture, R3F reconciler assigns
  `material.map = userTex` via the `attach` prop. R3F's reconciler (`@react-three/fiber`
  v8 reconciler) sets the property but does NOT call `material.needsUpdate = true`. This is
  a documented Three.js requirement: changing `material.map` on an existing compiled material
  after initial construction requires setting `needsUpdate = true` to trigger shader recompile.
- The toggled-workaround behavior is the key diagnostic. On first mount when `userTex` is
  already non-null (cache hit after toggle), the `<meshStandardMaterial>` receives `map` at
  construction time — Three.js compiles the shader with the map slot included. No `needsUpdate`
  required. This is precisely why the toggle workaround works and confirms the compiled shader
  is the issue, not the texture data.
- `useUserTexture.ts:37-62`: The hook correctly sets `tex` to null on id-change then
  async-resolves to the Texture. The hook IS re-firing (dep `[id]` is correct, line 62).
  This rules out Hypothesis B entirely.
- `userTextureCache.ts:59-103`: On FIRST apply, the cache has NO entry for the new id. It
  reads IDB, creates an ObjectURL, runs `TextureLoader.loadAsync` — all async. On FIRST
  apply the IDB write has already completed (WallSurfacePanel calls `setWallpaper` only after
  the upload resolves and returns an id). The IDB read should succeed. This rules out
  Hypothesis C.

**The race is not IDB lag — it is material shader recompile.**

---

### Hypothesis B — `useUserTexture` not re-firing on first apply (RULED OUT)

`useUserTexture.ts:37,62`: `useEffect` dep array is `[id]`. WallMesh re-renders when
`wall.wallpaper.A.userTextureId` changes (cadStore mutation triggers component re-render).
`useUserTexture(wall.wallpaper?.A?.userTextureId)` receives the new id. The effect fires.
`tapEvent` instrumentation at line 43 (`useUserTexture:hook-mount`) would confirm this in
test mode. No evidence of stale closure or missing dep.

---

### Hypothesis C — `getUserTextureCached` returns null on first apply (RULED OUT)

`WallSurfacePanel.tsx:105-111`: `handleWallpaperUserTexture(id, tileSizeFt)` is called with
an `id` returned by the upload pipeline. The upload pipeline writes the blob to IDB before
returning the id. By the time `setWallpaper` fires, the IDB record exists. `getUserTextureCached`
reads that record, creates an ObjectURL, and resolves the Texture. The async is real but the
data is present. Result: the hook resolves to a valid Texture, but by then Three.js has
already drawn the frame using the unpatched shader.

---

### Hypothesis D — wallpaper field change doesn't trigger re-render (RULED OUT)

cadStore mutation via `setWallpaper` updates the `wall.wallpaper` field in Zustand immer
produce. WallMesh subscribes via `cadStore` selector. Zustand triggers re-render on reference
change. The `userTextureId` field being newly non-undefined changes the reference. Re-render
fires. Not the cause.

---

### Hypothesis E — R3F conditional `<mesh>` insertion fails attachment (PARTIALLY RELEVANT)

When `userTex` first resolves, WallMesh re-renders and the conditional `if (wp.userTextureId && userTex)` at `WallMesh.tsx:137` becomes true, inserting a new `<mesh>` into the scene. This IS part of the failure surface — a new `<meshStandardMaterial>` is created for this new `<mesh>`. But since the `<primitive attach="map">` pattern sets the map BEFORE Three.js has drawn the first frame with this material, theoretically the shader should compile with the map.

However: R3F's fiber reconciler processes attachment synchronously during the render pass
commit, but Three.js's shader compile is deferred until the first draw call for that material.
If the attach happens in the same React commit as the first draw call, the compile has already
been queued without the map. Setting `needsUpdate = true` after the attach forces a recompile
on the NEXT draw.

This makes Hypothesis A and E partially complementary, but A is the proximate mechanism.

---

## Root Cause Diagnosis

**File:** `src/three/WallMesh.tsx` — lines 137–151

```tsx
// CURRENT (broken on first apply):
if (wp.userTextureId && userTex) {
  return (
    <mesh key={key} position={[0, 0, thickness / 2 + bandOffset / 2]}>
      <planeGeometry args={[length, height]} />
      <meshStandardMaterial
        color="#ffffff"
        roughness={0.85}
        metalness={0}
        side={THREE.DoubleSide}
      >
        <primitive attach="map" object={userTex} dispose={null} />
      </meshStandardMaterial>
    </mesh>
  );
}
```

R3F assigns `material.map = userTex` via the `<primitive attach="map">` child. Three.js
requires `material.needsUpdate = true` to recompile the shader program when `material.map`
transitions from `undefined/null` → a Texture on an existing material instance. R3F does not
set this automatically. The shader compiled for the drywall-color path (no map) is reused.

---

## BUG-03 Shared-Cause Determination (D-01 Decision)

**Decision: NO — BUG-03 does NOT share the same root cause. Keep Phase 50 separate.**

### Reasoning

BUG-02 is a first-apply failure: the material compiles without the map slot, and no
`needsUpdate` fires to force recompile when the map resolves.

BUG-03 is a post-toggle disappearance failure. The Phase 36 ROOT-CAUSE.md §2a records that
across 5 toggle cycles, the VIZ-10 harness produced NO blank rendering for wallpaper backed
by `wallpaperTextureCache` (data-URL path). But BUG-03 (#71) specifically calls out
UPLOADED wallpaper + wallArt, which travel through a different code path:

- Preset wallpaper uses `wallpaperTextureCache.ts` (data-URL key). Tested by VIZ-10 harness.
  No-repro in harness.
- Uploaded wallpaper uses `userTextureCache.ts` (IDB id key) → `getUserTextureCached` →
  `useUserTexture`. Tested minimally in VIZ-10 harness (16×16 fixture JPEG, controlled
  environment). ROOT-CAUSE.md §2b acknowledges harness gaps: real user-uploaded images,
  headed browser, production build.

BUG-03's likely mechanism (candidate from ROOT-CAUSE.md §1, Candidate 1/2 INCONCLUSIVE):
on 2D↔3D toggle, `ThreeViewport` unmounts. `useUserTexture` hook-unmount fires. On remount,
the hook re-fires with the same id, hits the module-level cache (same Promise, already
settled), and calls `setTex(texture)`. The question is whether the new `WebGLRenderer`
instance can re-use the `THREE.Texture` that was uploaded to the OLD WebGL context.

ROOT-CAUSE.md §4.1 concludes the non-disposing cache IS working in the harness. But the
harness gap (headed browser, real uploads, production minifier) leaves BUG-03 unconfirmed.

**Applying the BUG-02 fix (`needsUpdate = true`) to BUG-03:** The BUG-02 fix adds
`material.needsUpdate = true` when `userTex` changes in the existing material. On toggle
remount, a new `<meshStandardMaterial>` is constructed. The map is supplied via
`<primitive attach="map">` during R3F reconciliation — same timing issue. However, the BUG-02
fix (a `useEffect([userTex])` with `matRef.current.needsUpdate = true`) would ALSO fire on
remount when `useUserTexture` resolves after remount. So the BUG-02 fix would theoretically
help BUG-03's symptom too.

**Why still keep Phase 50 separate:**

1. BUG-03 may have additional contributing factors beyond `needsUpdate` (WebGL context
   re-upload, `HTMLImageElement` context binding — ROOT-CAUSE.md Candidates 1 & 2 are still
   INCONCLUSIVE). A targeted BUG-03 investigation is warranted.
2. BUG-03's acceptance criterion requires extending the Phase 36 VIZ-10 harness to cover
   user-uploaded wallpaper + wallArt across toggle cycles. That is distinct work from the
   BUG-02 e2e spec (first-apply, no toggle).
3. Merging into Phase 49 risks the scope creep D-01 explicitly names. If the BUG-02 fix
   incidentally resolves BUG-03 in testing, Phase 50 can be closed as "fixed by 49" with
   evidence from running the VIZ-10 harness variant post-fix. That is a safer gate.

**Call: Phase 50 remains a separate phase. Do NOT expand Phase 49 scope.**

---

## Fix Design

### Pattern: `ref` on `meshStandardMaterial` + `useEffect([userTex])`

The cleanest R3F-idiomatic fix: attach a `ref` to the `<meshStandardMaterial>` and fire
`material.needsUpdate = true` whenever `userTex` changes.

**File:** `src/three/WallMesh.tsx`

Inside `renderWallpaperOverlay` (the function at `WallMesh.tsx:126`), the material is
rendered inline in JSX. Because `renderWallpaperOverlay` is a function called inside the
component body, refs and effects CAN'T be used inside it (would violate Rules of Hooks
inside a non-component function). The fix requires one of two approaches:

**Option 1 (recommended): Inline `needsUpdate` via the prop**

R3F supports passing object methods as props via square-bracket notation or via a
`onUpdate` pattern. More idiomatically: switch from the `<primitive attach="map">` child
pattern to passing `map={userTex}` directly as a prop on `<meshStandardMaterial>`. When the
`map` prop is provided directly, R3F assigns `material.map = userTex` AND Three.js
recognizes that the map was set at construction/update time — which for a NEW `<mesh>` (the
conditional creates a new mesh element each time `userTex` becomes non-null) means the shader
compiles with the map slot included.

Wait — the `<mesh>` has `key={key}` and the whole branch exits early with a new `<mesh>`
element only when BOTH `wp.userTextureId && userTex`. On first apply: `userTex` is null
initially, so the branch doesn't execute and no mesh is mounted. When `userTex` resolves,
`userTex` becomes non-null and React mounts a NEW `<mesh>` for the first time. A fresh
`meshStandardMaterial` is constructed. Setting `map={userTex}` as a prop on
`<meshStandardMaterial>` instead of via `<primitive attach="map">` means Three.js has the
map reference at material construction time, so the initial shader compile includes the map
slot. **This eliminates the `needsUpdate` requirement entirely.**

```tsx
// BEFORE (src/three/WallMesh.tsx:137-151):
if (wp.userTextureId && userTex) {
  return (
    <mesh key={key} position={[0, 0, thickness / 2 + bandOffset / 2]}>
      <planeGeometry args={[length, height]} />
      <meshStandardMaterial
        color="#ffffff"
        roughness={0.85}
        metalness={0}
        side={THREE.DoubleSide}
      >
        <primitive attach="map" object={userTex} dispose={null} />
      </meshStandardMaterial>
    </mesh>
  );
}

// AFTER (map as direct prop, no <primitive> child needed):
if (wp.userTextureId && userTex) {
  return (
    <mesh key={key} position={[0, 0, thickness / 2 + bandOffset / 2]}>
      <planeGeometry args={[length, height]} />
      <meshStandardMaterial
        color="#ffffff"
        roughness={0.85}
        metalness={0}
        side={THREE.DoubleSide}
        map={userTex}
      />
    </mesh>
  );
}
```

**Why this is safe re: VIZ-10 / Phase 32 defensive code:**

The `dispose={null}` on the `<primitive>` was the VIZ-10 guard (ROOT-CAUSE.md §4.2) that
prevents R3F auto-disposing the cached texture on mesh unmount. With the direct `map={}` prop
approach, R3F also does NOT auto-dispose the texture when the prop value was supplied from
outside — R3F only auto-disposes objects it created internally (geometries, materials created
by JSX, not passed-in objects). However, to be explicit and safe, we should verify this or
add `onUpdate` to the material. The safest approach is to add a `ref` and an effect:

**Option 2 (belt-and-suspenders): Direct prop + explicit `needsUpdate` guard**

```tsx
// In WallMesh component body (before renderWallpaperOverlay call):
const matRefA = useRef<THREE.MeshStandardMaterial>(null);
const matRefB = useRef<THREE.MeshStandardMaterial>(null);

useEffect(() => {
  if (matRefA.current && userTexA) matRefA.current.needsUpdate = true;
}, [userTexA]);

useEffect(() => {
  if (matRefB.current && userTexB) matRefB.current.needsUpdate = true;
}, [userTexB]);
```

And in `renderWallpaperOverlay`, pass the ref as a prop:

```tsx
<meshStandardMaterial
  ref={/* pass through as arg */}
  map={userTex}
  color="#ffffff"
  roughness={0.85}
  metalness={0}
  side={THREE.DoubleSide}
/>
```

Since `renderWallpaperOverlay` is a plain function (not a component), the `ref` needs to be
passed in as a parameter. This is straightforward — the function already takes `wp`, `tex`,
`userTex`, `key` as params; add `matRef` as a 5th param.

**Recommended approach: Option 1 (direct `map` prop) as the primary fix, with a comment
explaining why `<primitive>` is removed and what VIZ-10 implications were considered.**

The `dispose={null}` guard on `<primitive>` was keeping R3F from disposing the cached texture.
With a direct `map={userTex}` prop, R3F treats the texture as externally owned (not lifecycle-
managed by R3F). This is the same logical outcome as `dispose={null}` — the cache retains
ownership. Document this in the code comment.

**Add a code comment at the fix site explaining:**
1. Why `<primitive attach="map">` was replaced
2. That the externally-owned texture is not auto-disposed by R3F (mirrors the `dispose={null}` contract)
3. Reference to ROOT-CAUSE.md §4.2 for VIZ-10 context

---

## `wallMeshDisposeContract.test.ts` Impact

ROOT-CAUSE.md §4.3 describes `tests/wallMeshDisposeContract.test.ts` — a static test that
asserts `dispose={null}` patterns exist at render sites. The fix REMOVES the `<primitive>`
element from the user-texture branch. This will break that static test.

The test must be updated to reflect the new contract: the user-texture branch uses a direct
`map={}` prop (externally-owned, not auto-disposed by R3F — equivalent semantic, different
mechanism). The test should assert the direct-prop pattern exists AND that the map ref is
not `.dispose()`d anywhere in the cache. Both invariants preserve the VIZ-10 non-disposing
contract; the static test just validates differently.

---

## Test Driver Shape (D-06)

The e2e spec needs to:

1. Write a texture blob to IDB without going through the file upload UI
2. Call `setWallpaper(wallId, "A", { kind: "pattern", userTextureId: id, scaleFt: 2 })`
3. Assert `material.map` on the WallMesh's `meshStandardMaterial` is non-null within 1500ms

**Recommended driver in `src/test-utils/userTextureDrivers.ts`:**

```typescript
// Gated: import.meta.env.MODE === "test"
import { putUserTexture } from "@/lib/userTextureStore";
import { getUserTextureCached } from "@/three/userTextureCache";

export async function seedUserTexture(
  blob: Blob,
  name: string,
  sizeFt: number,
): Promise<string> {
  // putUserTexture writes to IDB and returns the new id.
  const id = await putUserTexture(blob, name, sizeFt);
  // Pre-warm the module-level cache so the hook resolves instantly in test.
  await getUserTextureCached(id);
  return id;
}
```

Expose on `window` in `src/main.tsx` (test mode only):

```typescript
if (import.meta.env.MODE === "test") {
  import("./test-utils/userTextureDrivers").then((m) => {
    (window as unknown as { __seedUserTexture: typeof m.seedUserTexture }).__seedUserTexture =
      m.seedUserTexture;
  });
}
```

The e2e spec flow:
1. `page.evaluate` → call `__seedUserTexture(blob, "test-tex", 2)` → returns id
2. `page.evaluate` → call `useCADStore.getState().setWallpaper(wallId, "A", { kind: "pattern", userTextureId: id, scaleFt: 2 })`
3. `page.waitForFunction` → check `window.__getWallMeshMaterialMap(wallId)` is non-null (need a second driver that exposes the R3F material ref)

**Material map driver (second driver):** A `window.__getWallMeshMapResolved(wallId)` bridge
that reads the material ref attached to the WallMesh. This follows the Phase 46/47/48 pattern
of exposing internal state via window globals in test mode. The WallMesh ref can be exposed
via a `useEffect(() => { window.__wallMeshMaterials[wall.id] = matRef.current }, [])`.

---

## Task Breakdown Estimate

**1 plan, 3 tasks.**

### Wave 0 (investigation complete in research — no Wave 0 tasks needed)

Root cause is conclusively identified from static code analysis. No in-browser reproduction
investigation required. D-03 1-day budget: consumed by this research phase.

### Plan 49-01: Fix + Test

| Task | Description | Files |
|------|-------------|-------|
| T1 | Fix `WallMesh.tsx` user-texture branch: replace `<primitive attach="map">` with direct `map={userTex}` prop; add explanatory comments; update `wallMeshDisposeContract.test.ts` | `src/three/WallMesh.tsx`, `tests/wallMeshDisposeContract.test.ts` |
| T2 | Add test driver `src/test-utils/userTextureDrivers.ts` + install on `window` in `src/main.tsx` (test-mode gated, mirror Phase 48 pattern) | `src/test-utils/userTextureDrivers.ts`, `src/main.tsx` |
| T3 | Add `e2e/wall-user-texture-first-apply.spec.ts`: seed texture via driver, call `setWallpaper`, assert `map` slot non-null within 1500ms, run on chromium-dev + chromium-preview | `e2e/wall-user-texture-first-apply.spec.ts` |

File modification count: 5 files total. Well within scope-sanity limits.

---

## Open Questions

1. **R3F v8 and direct `map` prop auto-dispose behavior:** Confirm that passing `map={userTex}`
   to `<meshStandardMaterial>` does NOT cause R3F to call `.dispose()` on the texture when
   the mesh unmounts. This can be verified by inspecting R3F v8 reconciler source or by
   running the Phase 36 VIZ-10 harness after the fix and checking the same lifecycle
   invariants (same `tex.uuid` across mount cycles). If R3F DOES dispose externally-passed
   textures, Option 2 (ref + needsUpdate effect, keeping `<primitive>`) is the correct path.
   The implementer should verify this during T1 before committing.

2. **`wallMeshDisposeContract.test.ts` full scope:** The test may cover multiple render sites
   beyond the user-texture branch. Only the user-texture branch is changing. The implementer
   should read the full test file to scope the update precisely.

---

## Sources

### Primary (HIGH confidence)
- `src/three/WallMesh.tsx` — lines 1-160 — full render path including `<primitive>` sites
- `src/hooks/useUserTexture.ts` — lines 1-65 — hook implementation and dep array
- `src/three/userTextureCache.ts` — lines 1-148 — cache contract and IDB read path
- `src/components/WallSurfacePanel.tsx` — lines 100-113 — apply call site
- `.planning/phases/36-viz-10-regression/ROOT-CAUSE.md` — VIZ-10 candidate analysis §1, §4.1, §4.2, §4.3

### Secondary (MEDIUM confidence)
- Three.js documented behavior: `material.needsUpdate = true` required when changing `material.map` on an existing compiled material. Consistent with behavior described in ROOT-CAUSE.md Candidate 2.
- R3F v8 `attach` prop behavior: R3F sets the property but does not call `needsUpdate`. Consistent with the no-repro in harness (harness remount creates fresh materials; BUG-02 is a first-apply on existing material).

---

## Metadata

**Confidence breakdown:**
- Root cause: HIGH — conclusive from code analysis; toggle-workaround behavior is a diagnostic clincher
- BUG-03 shared-cause: HIGH — no (different mechanism, different harness coverage gap)
- Fix design: MEDIUM-HIGH — Option 1 (direct prop) is correct; R3F auto-dispose behavior on externally-passed props needs verification in T1
- Test driver: HIGH — mirrors established Phase 46/47/48 patterns

**Research date:** 2026-04-27
**Valid until:** 2026-05-27 (stable domain — R3F v8 behavior unlikely to change)
