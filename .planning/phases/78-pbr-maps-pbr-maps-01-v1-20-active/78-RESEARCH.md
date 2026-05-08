# Phase 78: PBR Maps — Research

**Researched:** 2026-05-08
**Domain:** Three.js PBR material maps, React IDB texture pipeline, Material type extension
**Confidence:** HIGH

## Summary

Phase 78 adds two new PBR map slots — AO (ambient occlusion) and displacement — to the existing material pipeline. The data model, storage, upload modal, 3D rendering, and library card all need extending in exactly the same pattern Phase 67/68 already established for `roughnessMapId` and `reflectionMapId`. The work is mechanical and low-risk because every layer of the stack has a clear precedent to follow.

The one non-trivial gotcha is Three.js `aoMap`: it requires a second UV set on the geometry (attribute name `uv2` for Three.js r0.183). Existing geometries (box, extrude, plane) have only one UV set. Every mesh that binds `aoMap` must copy `geometry.attributes.uv` to `geometry.attributes.uv2` via `setAttribute`. `displacementMap` uses the primary `uv` channel and has no such requirement.

**Primary recommendation:** Extend the existing Phase 67/68 pipeline layer by layer — `Material` type → `materialStore` → `useMaterials` → `useResolvedMaterial` → mesh components → `UploadMaterialModal` → `MaterialCard` — following the exact pattern already in place for roughness/reflection.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PBR-01 | User can upload an AO map — `aoMapId` field on `Material`, upload slot in modal | §Standard Stack: same `persistOptionalMap` + `SaveMaterialInput` extension pattern as roughnessFile |
| PBR-02 | User can upload a displacement map — `displacementMapId` field, upload slot | Same as PBR-01 |
| PBR-03 | 3D meshes apply `aoMap` + `displacementMap` props — WallMesh, FloorMesh, CeilingMesh, CustomElementMesh | §Architecture Patterns: uv2 setup required for aoMap; displacementMap uses uv0; useResolvedMaterial extension |
| PBR-04 | MaterialCard shows map-presence indicators for all 4 map slots | §Architecture Patterns: add badge row under thumbnail; `material.aoMapId` / `material.displacementMapId` presence check |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Three.js | ^0.183.2 (in use) | `aoMap`, `displacementMap`, `aoMapIntensity`, `displacementScale` props on `MeshStandardMaterial` | Already powering the 3D viewport |
| idb-keyval | ^6.2.2 (in use) | IDB persistence for new map ids | Same store used by all existing maps |
| React / R3F | ^18.3 / ^8.17 (in use) | Component wiring | No new deps needed |

### No New Dependencies
Phase 78 requires zero new npm packages. Every capability needed — texture upload, IDB persistence, Three.js material props, R3F binding — is already installed and tested.

---

## Architecture Patterns

### Layer-by-layer extension chain (exact precedent: roughnessMapId / reflectionMapId)

```
src/types/material.ts         → add aoMapId?: string  +  displacementMapId?: string
src/lib/materialStore.ts      → SaveMaterialInput: add aoFile? + displacementFile?
                                 saveMaterialWithDedup: call persistOptionalMap for each
                                 updateMaterialMetadata: no change needed (maps not in Partial<Pick<...>>)
src/lib/surfaceMaterial.ts    → ResolvedSurfaceMaterial: add aoMapId? + displacementMapId?
                                 resolveSurfaceMaterial: thread the new ids through
src/three/useResolvedMaterial.ts → add useUserTexture calls for aoMap + displacementMap
                                   return { ..., aoMap, displacementMap }
src/three/FloorMesh.tsx       → bind aoMap={resolved.aoMap} + displacementMap={...}
src/three/CeilingMesh.tsx     → same
src/three/CustomElementMesh.tsx → same
src/three/WallMesh.tsx        → same (wall surface / wallpaper branch)
src/components/UploadMaterialModal.tsx → 2 new DropZone slots + COPY entries + state vars
src/components/MaterialCard.tsx → map-presence dot/badge row
src/hooks/useMaterials.ts     → update test driver type SaveMaterialInput (picked up automatically)
```

### Pattern 1: Extending SaveMaterialInput and saveMaterialWithDedup

Follow the exact shape of `roughnessFile` / `reflectionFile` in `src/lib/materialStore.ts`:

```typescript
// src/lib/materialStore.ts — SaveMaterialInput addition
export interface SaveMaterialInput {
  name: string;
  tileSizeFt: number;
  brand?: string; sku?: string; cost?: string; leadTime?: string;
  colorFile: File;
  roughnessFile?: File;
  reflectionFile?: File;
  aoFile?: File;           // NEW PBR-01
  displacementFile?: File; // NEW PBR-02
}

// Inside saveMaterialWithDedup — after existing optional map blocks:
const aoMapId = input.aoFile
  ? await persistOptionalMap(input.aoFile, `${input.name} (ao)`, input.tileSizeFt)
  : undefined;
const displacementMapId = input.displacementFile
  ? await persistOptionalMap(input.displacementFile, `${input.name} (displacement)`, input.tileSizeFt)
  : undefined;

// Material record — add to mat:
aoMapId,
displacementMapId,
```

### Pattern 2: useResolvedMaterial extension

`src/three/useResolvedMaterial.ts` already calls `useUserTexture` for each map id. Add two more hook calls — hooks must be called unconditionally per React rules (pass `undefined` if map absent):

```typescript
// After existing roughnessMap / reflectionMap:
const aoMap = useUserTexture(resolved?.aoMapId);
const displacementMap = useUserTexture(resolved?.displacementMapId);

// Return value:
return { ..., aoMap, displacementMap };
```

The repeat/wrap `useEffect` only needs to apply to `aoMap` and `displacementMap` if they need tiling — AO maps typically do tile with the surface; displacement maps do too.

### Pattern 3: Three.js aoMap UV2 requirement (CRITICAL GOTCHA)

`MeshStandardMaterial.aoMap` samples from the `uv2` attribute (second UV channel), not `uv`. `BoxGeometry`, `ExtrudeGeometry`, and `PlaneGeometry` all ship with only a `uv` attribute. Without `uv2`, `aoMap` renders as if intensity=0 — silently does nothing.

**Fix:** After getting a ref to the geometry, copy `uv` → `uv2`:

```typescript
// In a <mesh> ref callback or useEffect after geometry is available:
import * as THREE from "three";

// R3F declarative geometry approach (preferred):
<boxGeometry ref={(geo) => {
  if (geo && !geo.attributes.uv2) {
    geo.setAttribute('uv2', new THREE.BufferAttribute(
      (geo.attributes.uv as THREE.BufferAttribute).array,
      2
    ));
  }
}} />
```

Or imperatively in a `useEffect` with a `meshRef`:

```typescript
useEffect(() => {
  const geo = meshRef.current?.geometry;
  if (geo && !geo.attributes.uv2) {
    geo.setAttribute('uv2', new THREE.BufferAttribute(
      (geo.attributes.uv as THREE.BufferAttribute).array,
      2
    ));
  }
}, []);
```

**Affected meshes:**
- `FloorMesh` — PlaneGeometry → needs uv2 when aoMap is bound
- `CeilingMesh` — PlaneGeometry → same
- `CustomElementMesh` — BoxGeometry → same
- `WallMesh` — ExtrudeGeometry → same

**`displacementMap` does NOT require uv2.** It uses the primary `uv` attribute already present.

### Pattern 4: UploadMaterialModal new drop zones

Add two `DropZone` instances following the `roughnessLabel` / `reflectionLabel` pattern exactly:

```typescript
// COPY additions:
aoLabel: "AO_MAP",
displacementLabel: "DISPLACEMENT_MAP",

// State additions:
const [aoMap, setAoMap] = useState<ProcessedMap | null>(null);
const [displacementMap, setDisplacementMap] = useState<ProcessedMap | null>(null);
const [aoError, setAoError] = useState<string | null>(null);
const [displacementError, setDisplacementError] = useState<string | null>(null);
const aoInputRef = useRef<HTMLInputElement | null>(null);
const displacementInputRef = useRef<HTMLInputElement | null>(null);

// Reset block (open effect):
setAoMap(prev => { if (prev) URL.revokeObjectURL(prev.previewUrl); return null; });
setDisplacementMap(prev => { if (prev) URL.revokeObjectURL(prev.previewUrl); return null; });

// Unmount revoke effect — extend existing array:
[colorMap, roughnessMap, reflectionMap, aoMap, displacementMap].forEach(m => {
  if (m) URL.revokeObjectURL(m.previewUrl);
});

// Submit — extend save() call:
save({
  ...,
  aoFile: aoMap?.file,
  displacementFile: displacementMap?.file,
});
```

### Pattern 5: MaterialCard map-presence indicators (PBR-04)

Add a small badge row beneath the Name/tile-size row. Check field presence only — no texture fetch needed:

```tsx
// After existing name + tile size block in MaterialCard:
<div className="flex gap-1 mt-1 flex-wrap">
  {material.colorMapId && <MapBadge label="COLOR" />}
  {material.roughnessMapId && <MapBadge label="ROUGH" />}
  {material.reflectionMapId && <MapBadge label="REFL" />}
  {material.aoMapId && <MapBadge label="AO" />}
  {material.displacementMapId && <MapBadge label="DISP" />}
</div>

// MapBadge helper (local):
function MapBadge({ label }: { label: string }) {
  return (
    <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-accent/20 text-muted-foreground uppercase tracking-wide">
      {label}
    </span>
  );
}
```

Paint materials (`colorHex` set, no `colorMapId`) should NOT show the COLOR badge since they have no texture.

### Anti-Patterns to Avoid

- **Skipping uv2 setup for aoMap.** Silently renders nothing. Must be done for every mesh that binds `aoMap`.
- **Adding aoMapId / displacementMapId to the `updateMaterialMetadata` Partial<Pick>.** Map references are write-once (same contract as roughnessMapId). The existing update API does not need to change.
- **Passing aoMap/displacementMap repeat in the same useEffect as colorMap.** It should be included in the repeat effect alongside the others — fine to add to the existing `useEffect` in `useResolvedMaterial`.
- **Setting displacementScale to a large value.** Default `displacementScale=1` in Three.js is too aggressive. Set `displacementScale={0.05}` (≈0.6 inches in world-space feet units) as the starting default so surfaces look detailed without appearing broken.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Texture dedup + IDB storage | Custom IDB blob storage | Existing `persistOptionalMap` + `saveUserTextureWithDedup` | Already handles SHA-256 dedup, 2048px downscale, MIME gate |
| Texture loading into THREE.Texture | Custom TextureLoader | Existing `useUserTexture` hook + `getUserTextureCached` | Already handles cache lifecycle, StrictMode safety, orphan fallback |
| File processing/validation | Custom JPEG processor | Existing `processTextureFile` | Already handles MIME check, downscale, SHA-256 |

---

## Common Pitfalls

### Pitfall 1: aoMap silently renders nothing (missing uv2)
**What goes wrong:** `aoMap` prop is set on `<meshStandardMaterial>` but surfaces look identical with and without the map.
**Why it happens:** Three.js `MeshStandardMaterial.aoMap` samples `uv2` attribute; geometries only ship with `uv`.
**How to avoid:** After geometry creation, `setAttribute('uv2', new THREE.BufferAttribute(geo.attributes.uv.array, 2))`. Check `!geo.attributes.uv2` before setting to avoid redundant writes.
**Warning signs:** No visual change when applying a high-contrast AO map; no Three.js console warnings (it fails silently).

### Pitfall 2: displacementMap breaks geometry at default scale
**What goes wrong:** Geometry vertices visibly explode outward or surfaces look drastically deformed.
**Why it happens:** Three.js `displacementScale` defaults to `1` — in world units (feet) that's 1 foot of displacement.
**How to avoid:** Always set `displacementScale={0.05}` (≈0.6 inches) as starting default. Expose it as a Material field only if needed; for now hardcode the safe default.
**Warning signs:** Walls/floors show extreme vertex displacement or gaps.

### Pitfall 3: Revoke leak for new map state in UploadMaterialModal
**What goes wrong:** Memory leak — preview object URLs for `aoMap` and `displacementMap` states are never revoked on unmount.
**Why it happens:** The existing unmount revoke effect explicitly lists `[colorMap, roughnessMap, reflectionMap]` — new state is not auto-included.
**How to avoid:** Extend the unmount revoke array and the reset block in the open effect to cover all 5 maps.

### Pitfall 4: updateMaterialMetadata called with aoMapId changes
**What goes wrong:** A caller tries to swap an AO map by passing `{ aoMapId: newId }` to `update()` — it silently does nothing because `aoMapId` is not in the `Partial<Pick<...>>` the function accepts.
**Why it happens:** Phase 67 design decision: map references are write-once (D-11 pattern); to swap a map, delete and re-upload.
**How to avoid:** Don't add map ids to `updateMaterialMetadata`'s type — preserve the existing contract.

---

## Code Examples

### Three.js aoMap + displacementMap on MeshStandardMaterial (verified props)
```typescript
// Source: Three.js docs MeshStandardMaterial — both props confirmed on r0.183
<meshStandardMaterial
  map={resolved.colorMap ?? undefined}
  roughnessMap={resolved.roughnessMap ?? undefined}
  aoMap={resolved.aoMap ?? undefined}           // NEW — requires uv2 on geometry
  aoMapIntensity={1}                            // default 1; keep at 1 unless tuned
  displacementMap={resolved.displacementMap ?? undefined} // NEW — uses uv
  displacementScale={0.05}                     // safe default: ~0.6 inches
  metalness={resolved.metalness}
  roughness={resolved.roughness}
  side={THREE.DoubleSide}
/>
```

### uv2 setup for R3F geometries
```typescript
// In a useEffect after mesh mounts — works for box, plane, extrude:
useEffect(() => {
  const geo = meshRef.current?.geometry;
  if (!geo || geo.attributes.uv2) return;
  geo.setAttribute(
    'uv2',
    new THREE.BufferAttribute(
      (geo.attributes.uv as THREE.BufferAttribute).array.slice(),
      2,
    ),
  );
}, []); // run once on mount
```

---

## Environment Availability

Step 2.6: SKIPPED — Phase 78 is code-only. No new external tools, services, or CLIs required. All dependencies (Three.js, idb-keyval, React) already installed.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + Playwright |
| Config file | `vitest.config.ts` (unit), `playwright.config.ts` (e2e) |
| Quick run command | `npx vitest run tests/materialStore.isolation.test.ts` |
| Full suite command | `npx vitest run && npx playwright test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PBR-01 | `saveMaterialWithDedup` persists `aoMapId` when `aoFile` provided | unit | `npx vitest run tests/materialStore.isolation.test.ts` | ✅ (extend) |
| PBR-02 | `saveMaterialWithDedup` persists `displacementMapId` when `displacementFile` provided | unit | `npx vitest run tests/materialStore.isolation.test.ts` | ✅ (extend) |
| PBR-03 | `useResolvedMaterial` returns `aoMap` and `displacementMap` texture refs | unit | `npx vitest run src/three/__tests__/useResolvedMaterial.test.tsx` | ✅ (extend) |
| PBR-04 | `MaterialCard` shows AO/DISP badges when those fields are set | unit | `npx vitest run tests/MaterialThumbnail.test.tsx` | ✅ (extend or new) |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/materialStore.isolation.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full vitest + Playwright green before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements via extension of existing test files.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `roughnessMapId` / `reflectionMapId` only | Adding `aoMapId` + `displacementMapId` | Phase 78 | More tactile surfaces; same pipeline |
| No uv2 on project geometries | uv2 copy on first aoMap bind | Phase 78 | Required for aoMap to work at all |

---

## Open Questions

1. **Should `displacementScale` be a Material field or always hardcoded?**
   - What we know: Three.js `displacementScale=1` is too aggressive for the project's foot-based coordinate system.
   - What's unclear: Whether Jessica would benefit from per-material control vs. a good fixed default.
   - Recommendation: Hardcode `displacementScale={0.05}` for Phase 78; add per-material field only if feedback after UAT asks for it. Keeps scope tight.

2. **Does WallMesh use ExtrudeGeometry in a way that already provides uv2?**
   - What we know: WallMesh uses `THREE.ExtrudeGeometry` and the existing roughnessMap works without uv2. ExtrudeGeometry auto-generates UVs on the front/back faces; the side UVs may be minimal.
   - What's unclear: Whether ExtrudeGeometry's `uv` attribute is interleaved (which would make the `array.slice()` copy unsafe) or buffered.
   - Recommendation: In WallMesh, check `geo.attributes.uv?.isInterleavedBufferAttribute`. If true, use `geometry.toNonIndexed()` first or skip aoMap on walls. Most likely it is a standard BufferAttribute (same as Box/Plane), but verify at implementation time.

---

## Sources

### Primary (HIGH confidence)
- Three.js MeshStandardMaterial official docs — `aoMap` and `displacementMap` props confirmed; uv2 requirement documented
- `src/lib/materialStore.ts` (Phase 67) — `persistOptionalMap`, `SaveMaterialInput`, IDB pipeline
- `src/three/useResolvedMaterial.ts` (Phase 68) — hook pattern for roughnessMap/reflectionMap
- `src/lib/surfaceMaterial.ts` (Phase 68) — `ResolvedSurfaceMaterial` interface
- `src/types/material.ts` (Phase 67) — Material type fields
- `src/components/UploadMaterialModal.tsx` (Phase 67) — DropZone pattern
- `src/components/MaterialCard.tsx` (Phase 67) — card structure
- `.planning/milestones/v1.20-REQUIREMENTS.md` — PBR-01 through PBR-04 verbatim requirements

### Secondary (MEDIUM confidence)
- Three.js forum thread "Why do AO and LightMap need a second set of UVs?" — confirms uv2 requirement is architectural; copy-UV pattern for BoxGeometry is standard approach
- R3F GitHub discussion #1019 — uv2 setAttribute approach in R3F context verified by community

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use, confirmed from codebase
- Architecture: HIGH — exact precedent exists in Phase 67/68 for all patterns
- aoMap uv2 gotcha: HIGH — confirmed in Three.js docs and multiple forum sources; silent failure risk documented
- Pitfalls: HIGH — derived directly from codebase inspection + known Three.js behavior

**Research date:** 2026-05-08
**Valid until:** 2026-08-08 (Three.js r0.183 stable; patterns are framework-version-stable)
