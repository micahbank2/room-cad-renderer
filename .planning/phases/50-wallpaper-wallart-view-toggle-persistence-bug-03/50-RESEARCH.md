---
phase: 50-wallpaper-wallart-view-toggle-persistence-bug-03
type: research
created: 2026-04-27
domain: React Three Fiber / texture persistence across view-mode toggle
confidence: HIGH
requirements: [BUG-03]
related: [Phase 36 VIZ-10, Phase 49 BUG-02]
---

# Phase 50: Wallpaper + WallArt View-Toggle Persistence (BUG-03) — Research

**Researched:** 2026-04-27
**Domain:** R3F `<primitive attach="map">` / `useWallArtTextures` / 2D↔3D toggle lifecycle
**Confidence:** HIGH — root cause conclusively identified from static code analysis

---

## Summary

Phase 49 fixed BUG-02 (user-uploaded wall texture, first-apply) by replacing `<primitive attach="map" object={userTex} dispose={null} />` with a direct `map={userTex}` prop on `<meshStandardMaterial>`. That fix is **confined to the user-uploaded wallpaper branch** inside `renderWallpaperOverlay` (WallMesh.tsx:175-189). The other three texture-consuming sites in WallMesh still use `<primitive attach="map">`.

The critical finding: the Phase 36 VIZ-10 wallpaper spec (`wallpaper-2d-3d-toggle.spec.ts`) already tests user-uploaded wallpaper across 5 mount cycles (it calls `uploadTexture()` + sets `userTextureId`). The spec was written for the preset-URL path but its implementation actually exercises the `useUserTexture` / `userTextureCache` path — the same path BUG-02 touched. Phase 49 SUMMARY.md:88 explicitly states "VIZ-10 harness uses `wallpaper-2d-3d-toggle.spec.ts` which uploads a real texture through the UI. That spec passed after the fix." This means **user-uploaded wallpaper toggle is already fixed and tested**.

The two remaining sites using `<primitive attach="map">` are both in `renderSideDecor` — the unframed wallArt mesh (WallMesh.tsx:317) and the framed wallArt inner mesh (WallMesh.tsx:337). Both consume textures via `useWallArtTextures` → `wallArtTextureCache`. These are the only STILL-BROKEN sites.

**Primary recommendation:** Replace both `<primitive attach="map" object={tex} dispose={null} />` sites in the wallArt render block with direct `map={tex}` props on their `<meshStandardMaterial>` elements, following the Phase 49 pattern. The existing `wallart-2d-3d-toggle.spec.ts` needs no structural change — it already tests the toggle cycle and uses a data-URL image. Extend it with a second test that uses the `__seedUserTexture` driver to cover user-uploaded wallArt. For preset wallpaper (catalog `imageUrl` path, WallMesh.tsx:231), the `<primitive>` is kept — that path is covered by VIZ-10 and the non-disposing cache handles it correctly.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01** — Research first to map what's still broken (scope discovery). The researcher determines the actual scope from code analysis. The planner sizes plans based on the scope map.
- **D-02** — Fix pattern: apply Phase 49's direct-prop pattern by default. If a path has a different bug shape, fix the actual cause.
- **D-03** — Test coverage: extend Phase 36 VIZ-10 harness. Researcher decides whether to augment existing spec or add new file. Same 5-mount-cycle invariant as VIZ-10. Reuses Phase 49's `__seedUserTexture` driver.
- **D-04** — Phase scope: budget conservatively. Hard ceiling: ≤1 plan, ≤4 tasks, ≤6 files modified.
- **D-05** — Atomic commits per Phase 49 D-05.
- **D-06** — Test driver reuse: REUSE Phase 49's `__seedUserTexture` from `src/test-utils/userTextureDrivers.ts`. Extend with `__seedWallArtPlacement(wallId, side, userTextureId)` only if needed.
- **D-07** — Zero regressions on Phase 49 fix. Phase 49 e2e must stay green. Cannot revert direct-prop pattern.

### Claude's Discretion

None explicitly listed in CONTEXT.md for this phase.

### Deferred Ideas (OUT OF SCOPE)

- BUG-02 (Phase 49) re-fix or rollback
- Phase 999.4 EXPLODE+saved-camera offset
- DEBT-05 FloorMaterial migration (Phase 51)
- HOTKEY-01 cheat sheet (Phase 52)
- Refactoring `wallpaperTextureCache` or `wallArtTextureCache` to a different async pattern
- New PBR features (#81)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BUG-03 | Uploaded wallpaper + wallArt must persist across 2D↔3D view toggles | Scope map below: user-uploaded wallpaper already fixed by Phase 49 (confirmed by VIZ-10 spec). WallArt `<primitive attach="map">` sites at WallMesh.tsx:317 and :337 still broken — same mechanism as BUG-02. Direct-prop fix applies. |
</phase_requirements>

---

## Scope Map

The central artifact for the planner.

| Path | Render site (file:line) | Texture source | Render pattern | BUG-03 status |
|------|------------------------|----------------|----------------|---------------|
| User-uploaded wall texture (Phase 49 site) | WallMesh.tsx:175-189 `renderWallpaperOverlay` | `useUserTexture` → `userTextureCache` | `map={userTex}` direct prop (Phase 49 fix) | **FIXED (Phase 49)** |
| User-uploaded wallpaper (`kind="pattern"` + `userTextureId`) | WallMesh.tsx:175-189 `renderWallpaperOverlay` — SAME branch as wall texture | `useUserTexture` → `userTextureCache` | `map={userTex}` direct prop (Phase 49 fix) | **FIXED-INCIDENTAL (Phase 49)** |
| Preset wallpaper (catalog `imageUrl` / `kind="pattern"` without `userTextureId`) | WallMesh.tsx:222-234 `renderWallpaperOverlay` | `useWallpaperTexture` → `wallpaperTextureCache` | `<primitive attach="map" object={tex} dispose={null} />` | **ALWAYS-WORKED** — non-disposing cache; VIZ-10 harness confirmed across 5 cycles |
| User-uploaded wallArt (via `addWallArt` with data-URL imageUrl) | WallMesh.tsx:310-319 (unframed) + WallMesh.tsx:330-338 (framed inner) `renderSideDecor` | `useWallArtTextures` → `wallArtTextureCache` | `<primitive attach="map" object={tex} dispose={null} />` | **STILL-BROKEN** |
| Preset wallArt (FRAME_PRESETS catalog) | WallMesh.tsx:310-319 (unframed) + WallMesh.tsx:330-338 (framed inner) `renderSideDecor` | `useWallArtTextures` → `wallArtTextureCache` | `<primitive attach="map" object={tex} dispose={null} />` | **INVESTIGATE** — uses same `<primitive>` pattern, same `wallArtTextureCache`. Phase 36 VIZ-10 `wallart-2d-3d-toggle.spec.ts` uses a data-URL (not IDB), tests the `wallArtTextureCache` path. PASSED post-Phase 32 (VIZ-10 fix). If it still passes today, preset wallArt is ALWAYS-WORKED. If not, same fix applies. |

### Key structural finding: user-uploaded wallpaper is the SAME code branch as user-uploaded wall texture

`renderWallpaperOverlay` has a priority check at WallMesh.tsx:175:
```tsx
if (wp.userTextureId && userTex) {
  // Phase 49 fix: direct map={userTex} prop
  return (
    <mesh key={key} ...>
      <meshStandardMaterial ... map={userTex} />
    </mesh>
  );
}
```

A wallpaper with `kind="pattern"` + `userTextureId` set hits this branch first — the `userTextureId` guard short-circuits before the `wp.kind === "pattern" && wp.imageUrl && tex` branch at WallMesh.tsx:209. Therefore Phase 49's fix covers user-uploaded wallpaper. The VIZ-10 spec at `wallpaper-2d-3d-toggle.spec.ts:29` runs the 5-cycle toggle with `userTextureId` set (it calls `uploadTexture()` and then `setWallpaper` with `userTextureId: args.id`) and confirmed passing after Phase 49. Coverage already exists.

---

## Root Cause Diagnosis: STILL-BROKEN wallArt paths

### Mechanism

The wallArt render block (WallMesh.tsx:291-358, inside `renderSideDecor`) maps over `artItems` and for each item renders either:

**Unframed (WallMesh.tsx:310-319):**
```tsx
<meshStandardMaterial roughness={0.5} metalness={0} side={THREE.DoubleSide}>
  {tex && <primitive attach="map" object={tex} dispose={null} />}
</meshStandardMaterial>
```

**Framed inner (WallMesh.tsx:330-338):**
```tsx
<meshStandardMaterial roughness={0.5} metalness={0} side={THREE.DoubleSide}>
  {tex && <primitive attach="map" object={tex} dispose={null} />}
</meshStandardMaterial>
```

Both sites: `tex` is initially `null` when `useWallArtTextures` is resolving (on ThreeViewport remount after toggle). The `meshStandardMaterial` is constructed without a map. When `tex` resolves, React re-renders, `{tex && <primitive ...>}` becomes truthy, and R3F attaches `material.map = tex`. R3F does NOT set `material.needsUpdate = true`. Three.js reuses the previously compiled shader (no map slot). Wall art renders blank.

This is **the same BUG-02 mechanism** on the existing `<primitive attach="map">` branch — NOT a WebGL context loss or HTMLImageElement binding issue. The non-disposing cache (`wallArtTextureCache`) correctly preserves the `THREE.Texture` instance across mount cycles. The bug is the `material.needsUpdate` gap.

### Why Phase 32 ROOT-CAUSE.md left Candidates 1 and 2 inconclusive

Phase 32 investigated VIZ-10 for the `wallpaperTextureCache` path (preset wallpapers). The harness tests passed because the non-disposing cache works — same texture, new WebGLRenderer re-uploads it. The `HTMLImageElement` binding (Candidate 2) was a non-issue for that path. For wallArt's `<primitive attach="map">` sites, the same toggle-cycle analysis applies, and Phase 49's diagnosis now gives us the definitive mechanism: the `needsUpdate` gap. Candidates 1 and 2 from ROOT-CAUSE.md are superseded by Phase 49's analysis for these sites.

### Why wallArt differs from wallpaper's ALWAYS-WORKED preset path

The preset wallpaper path (WallMesh.tsx:222-234) uses `<primitive attach="map">` as well, but it is guarded: the `<meshStandardMaterial>` renders unconditionally (the `{tex && <primitive>}` is a child, not a condition on the mesh itself). More importantly, the `tex` from `useWallpaperTexture` starts as null but after the first cache hit the hook resolves synchronously on remount (module-level Map, Promise already settled). Whether the preset path actually shows the bug depends on the timing of the first draw vs. when `tex` settles — and the VIZ-10 harness confirmed it doesn't manifest in practice. That consistency holds because `wallpaperTextureCache` resolves on the same React render cycle as remount (Promise.then queued microtask, but React re-renders before browser paint). The `wallArtTextureCache` has the same timing, so preset wallArt should also be ALWAYS-WORKED — the VIZ-10 wallart spec confirms this. The user-reported BUG-03 is specifically about UPLOADED wallpaper/wallArt, which went through different code paths pre-Phase 49.

---

## Fix Design

### Two sites, same fix

**File:** `src/three/WallMesh.tsx`

**Site 1 — unframed wallArt (WallMesh.tsx:310-319):**

CURRENT:
```tsx
<meshStandardMaterial
  roughness={0.5}
  metalness={0}
  side={THREE.DoubleSide}
>
  {tex && <primitive attach="map" object={tex} dispose={null} />}
</meshStandardMaterial>
```

AFTER:
```tsx
<meshStandardMaterial
  roughness={0.5}
  metalness={0}
  side={THREE.DoubleSide}
  {...(tex ? { map: tex } : {})}
/>
```

Or more cleanly, restructure the conditional at the mesh level to match Phase 49's pattern — only render the mesh when `tex` is non-null so the material is always constructed with a map set:

```tsx
// Preferred: mirrors Phase 49 BUG-02 pattern exactly
// Branch only renders when tex is non-null → shader compiled WITH map from the start
{tex ? (
  <mesh key={art.id} position={[artX, artY, baseZ]}>
    <planeGeometry args={[art.width, art.height]} />
    <meshStandardMaterial
      roughness={0.5}
      metalness={0}
      side={THREE.DoubleSide}
      map={tex}
    />
  </mesh>
) : (
  <mesh key={art.id} position={[artX, artY, baseZ]}>
    <planeGeometry args={[art.width, art.height]} />
    <meshStandardMaterial
      roughness={0.5}
      metalness={0}
      side={THREE.DoubleSide}
    />
  </mesh>
)}
```

**Site 2 — framed inner mesh (WallMesh.tsx:330-338):** same pattern, same fix.

**VIZ-10 contract:** R3F does not auto-dispose externally-passed texture props. `wallArtTextureCache` retains ownership. The `dispose={null}` guard on the removed `<primitive>` is not needed — same contract as Phase 49 established. The `wallMeshDisposeContract.test.ts` assertion currently expects `>= 3` `<primitive>` sites. Removing 2 wallArt sites drops the count to 1 (preset wallpaper at WallMesh.tsx:231). The test must be updated to assert `>= 1`.

---

## Test Extension Recommendation

**Decision: AUGMENT the existing `wallart-2d-3d-toggle.spec.ts`** (not a new file).

Reasoning: The existing spec already has the full infrastructure — room seed, 5-cycle toggle loop, `comparePng` diff, lifecycle event dump. It tests a data-URL wallArt (exercises `wallArtTextureCache`). A second `test()` in the same file exercising user-uploaded wallArt via `__seedUserTexture` + `addWallArt` with `userTextureId` covers the IDB path without duplicating infrastructure.

For wallpaper, the `wallpaper-2d-3d-toggle.spec.ts` already tests user-uploaded wallpaper (Phase 49 VIZ-10 spec confirmed passing). **No extension needed for wallpaper spec** — it's already green.

### New test shape (add to `wallart-2d-3d-toggle.spec.ts`)

```typescript
test("user-uploaded wallArt (IDB path) survives 5 mount cycles", async ({ page }) => {
  // 1. Seed room + wall (same as existing test)
  // 2. __seedUserTexture(blob, "test-art", 2) → returns textureId
  // 3. addWallArt("wall_1", { ..., userTextureId: textureId, imageUrl: blobUrl })
  //    Note: WallArt.imageUrl is used by wallArtTextureCache; need to pass the blob URL
  // 4. 5 toggle cycles, comparePng, ≤1% delta
});
```

Wait — `WallArt` in cadStore has `imageUrl: string`, not a `userTextureId` field. The `wallArtTextureCache` is keyed by `imageUrl`. The user-upload flow sets `imageUrl` to a blob-URL or data-URL returned from the upload. The `__seedUserTexture` driver creates an IDB entry and returns an id; the test would need to get the blob URL for that id (via `URL.createObjectURL` on the IDB blob). Alternatively, the test can seed a data-URL directly (as the existing test does) — which IS the user-upload path from the cache's perspective. The existing test already covers this. The only gap is cycle reliability in a real headed browser; the fixture test covers that.

**Revised recommendation:** The existing wallart spec already exercises the relevant `wallArtTextureCache` path. The test extension needed is:
- Add a `test()` to `wallart-2d-3d-toggle.spec.ts` that seeds a wallArt via a blob URL obtained through `__seedUserTexture` to confirm the IDB + ObjectURL path (not just data-URL) also survives 5 cycles.
- Driver extension: add `__getWallArtBlobUrl(id): string` to `userTextureDrivers.ts` that creates an ObjectURL from the IDB blob for use as `imageUrl` in the `addWallArt` call.

---

## Phase Scope Estimate

**Phase shape: fix-shaped with regression-guard augmentation.**

| Dimension | Estimate |
|-----------|----------|
| Plans | 1 |
| Tasks | 3 |
| Files modified | 4 |

### Task breakdown

| Task | Description | Files |
|------|-------------|-------|
| T1 | Fix both `<primitive attach="map">` sites in `renderSideDecor` (unframed + framed wallArt); update `wallMeshDisposeContract.test.ts` assertion from `>= 3` to `>= 1` | `src/three/WallMesh.tsx`, `tests/wallMeshDisposeContract.test.ts` |
| T2 | Extend `src/test-utils/userTextureDrivers.ts` with `__getWallArtBlobUrl(id)` helper if needed | `src/test-utils/userTextureDrivers.ts` |
| T3 | Add user-uploaded wallArt 5-cycle test to `wallart-2d-3d-toggle.spec.ts` | `tests/e2e/specs/wallart-2d-3d-toggle.spec.ts` |

Files: 4 (well within D-04 ceiling of 6).

---

## Common Pitfalls

### Pitfall 1: Splitting mesh on tex presence vs. using spread prop
**What goes wrong:** Using `{...(tex ? { map: tex } : {})}` on the material while keeping a single `<mesh>` element — this means the material is constructed once (without map) and then updated. Same `needsUpdate` problem.
**Why it happens:** Looks clean, avoids JSX duplication.
**How to avoid:** Follow Phase 49's pattern exactly — the conditional must gate the MESH element, not just the map prop, so a fresh material is always constructed with the map set at construction time.
**Warning signs:** If you see `{...(tex ? { map: tex } : {})}` on a persistent mesh, it's wrong.

### Pitfall 2: Forgetting to update wallMeshDisposeContract.test.ts
**What goes wrong:** Test asserts `>= 3` `<primitive>` sites in WallMesh.tsx. After removing 2 wallArt sites, only 1 remains (preset wallpaper at line 231). Test fails.
**How to avoid:** Update the assertion count in the same commit as the WallMesh change (T1).

### Pitfall 3: Assuming wallpaper-2d-3d-toggle.spec.ts needs a new test
**What goes wrong:** Adding a redundant user-uploaded wallpaper toggle test when Phase 49 SUMMARY already confirms the spec passes for that path.
**How to avoid:** The wallpaper spec is already green. Only wallart spec needs a new test.

---

## Open Questions

1. **wallMeshDisposeContract.test.ts exact assertion:** The T1 implementer should read the full contract test to scope the change precisely. The count may be asserted differently (regex count, not a numeric `>=`). The research checked the SUMMARY.md note that "3 remaining `<primitive>` sites"; after removing 2 wallArt sites, 1 remains.

2. **Does wallArt currently have a `userTextureId` field, or only `imageUrl`?** Check `src/types/cad.ts` WallArt interface. If `userTextureId` is absent, the "user-uploaded" wallArt test must seed via `imageUrl` using an ObjectURL (blob path). If present, the `wallArtTextureCache` may already handle IDB lookup. This determines whether T2 (driver extension) is needed.

3. **Preset wallArt VIZ-10 status:** The `wallart-2d-3d-toggle.spec.ts` tests with a data-URL (confirmed passing per Phase 36). If the preset wallArt `<primitive>` sites also exhibit the toggle bug in a real headed browser (not just harness), they need the same fix. The fix is safe to apply universally since the tex is available when rendered — but the scope map marks it INVESTIGATE. The implementer should run the existing spec before T1 to confirm it still passes, establishing a baseline.

---

## Sources

### Primary (HIGH confidence)
- `src/three/WallMesh.tsx` — lines 1-388 — all render sites, full file read
- `src/three/wallArtTextureCache.ts` — lines 1-93 — cache contract
- `src/three/wallpaperTextureCache.ts` — lines 1-98 — cache contract
- `src/hooks/useUserTexture.ts` — lines 1-65 — hook implementation
- `src/three/userTextureCache.ts` — lines 1-148 — IDB cache
- `.planning/phases/49-bug-02-wall-user-texture-first-apply/49-RESEARCH.md` — BUG-02 root cause, BUG-03 shared-cause determination
- `.planning/phases/49-bug-02-wall-user-texture-first-apply/49-01-SUMMARY.md` — what Phase 49 actually did, confirmed VIZ-10 harness passing
- `tests/e2e/specs/wallpaper-2d-3d-toggle.spec.ts` — VIZ-10 wallpaper spec, confirms user-uploaded path tested
- `tests/e2e/specs/wallart-2d-3d-toggle.spec.ts` — VIZ-10 wallart spec, data-URL path

---

## Metadata

**Confidence breakdown:**
- Scope map: HIGH — code paths read directly; Phase 49 SUMMARY confirms VIZ-10 spec passing for wallpaper
- Root cause (wallArt): HIGH — same `<primitive attach="map">` + `needsUpdate` mechanism confirmed by Phase 49
- Fix design: HIGH — direct Phase 49 pattern application
- Test extension: MEDIUM — WallArt type interface not confirmed (Open Question 2); T2 scope contingent

**Research date:** 2026-04-27
**Valid until:** 2026-05-27
