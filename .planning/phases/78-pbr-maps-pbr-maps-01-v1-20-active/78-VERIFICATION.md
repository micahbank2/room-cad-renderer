---
phase: 78-pbr-maps-pbr-maps-01-v1-20
verified: 2026-05-08T00:00:00Z
status: passed
score: 10/10 must-haves verified
re_verification: false
---

# Phase 78: PBR Maps (AO + Displacement) Verification Report

**Phase Goal:** Extend the Material system to support AO (ambient occlusion) and displacement maps end-to-end — from type definition through upload UI to 3D mesh binding — completing the 5-map PBR pipeline (color + roughness + reflection + AO + displacement). MaterialCard shows glanceable map-presence indicators for all 5 slots.

**Verified:** 2026-05-08
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Material type exposes optional `aoMapId` and `displacementMapId` fields | VERIFIED | Lines 81-83 of `src/types/material.ts` — both fields declared as `optional string` with Phase 78 PBR-01 JSDoc comments |
| 2 | `saveMaterialWithDedup` persists aoMapId when aoFile provided, displacementMapId when displacementFile provided | VERIFIED | `src/lib/materialStore.ts` lines 106-124 — `aoFile?` and `displacementFile?` on `SaveMaterialInput`; both routed through `persistOptionalMap` |
| 3 | `useResolvedMaterial` returns `aoMap` and `displacementMap` THREE.Texture refs | VERIFIED | Lines 71-72 call `useUserTexture(resolved?.aoMapId)` and `useUserTexture(resolved?.displacementMapId)`; returned at lines 139-140 |
| 4 | `ResolvedSurfaceMaterial` carries `aoMapId` and `displacementMapId` | VERIFIED | `src/lib/surfaceMaterial.ts` lines 35-37 on interface; lines 99-100 pass through from Material |
| 5 | UploadMaterialModal renders AO_MAP and DISPLACEMENT_MAP drop zones | VERIFIED | Lines 444-459 render DropZone instances with labels `COPY.aoLabel` ("AO_MAP") and `COPY.displacementLabel` ("DISPLACEMENT_MAP") |
| 6 | Submit wires aoFile/displacementFile to save() | VERIFIED | Lines 323-324: `aoFile: aoMap?.file`, `displacementFile: displacementMap?.file` |
| 7 | Object URL cleanup on unmount/re-open | VERIFIED | Lines 206-215 revoke all 5 maps (including aoMap and displacementMap) in a cleanup useEffect |
| 8 | WallMesh, FloorMesh, CeilingMesh, CustomElementMesh bind `aoMap` + `displacementMap` with uv2 | VERIFIED | All 4 meshes: `aoMap={resolved.aoMap ?? undefined}`, `aoMapIntensity={1}`, `displacementMap={resolved.displacementMap ?? undefined}`, `displacementScale=0.05`, plus `uv2` BufferAttribute via ref callback |
| 9 | MaterialCard shows presence badges for all 5 slots: COLOR, ROUGH, REFL, AO, DISP | VERIFIED | `src/components/MaterialCard.tsx` lines 152-156 — conditional badges for all 5; COLOR gated on `colorMapId` (not shown for paint Materials) |
| 10 | Paint Materials do NOT show a COLOR badge | VERIFIED | `material.colorMapId && <MapBadge label="COLOR" />` — paint Materials set `colorHex` only, so `colorMapId` is falsy |

**Score:** 10/10 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/types/material.ts` | `aoMapId?` + `displacementMapId?` on Material interface | VERIFIED | Both fields present at lines 81-83 |
| `src/lib/materialStore.ts` | `aoFile?` + `displacementFile?` on SaveMaterialInput; `persistOptionalMap` calls for both | VERIFIED | Lines 50-53, 106-110 |
| `src/lib/surfaceMaterial.ts` | `aoMapId` + `displacementMapId` on ResolvedSurfaceMaterial; threaded through `resolveSurfaceMaterial` | VERIFIED | Interface lines 35-37; pass-through lines 99-100 |
| `src/three/useResolvedMaterial.ts` | `aoMap` + `displacementMap` THREE.Texture refs returned, repeat applied | VERIFIED | Hooks called lines 71-72; repeat applied in useEffect lines 102-113; returned lines 139-140 |
| `src/components/UploadMaterialModal.tsx` | AO_MAP + DISPLACEMENT_MAP drop zones, state, cleanup, submit wiring | VERIFIED | All present; 5-map revoke cleanup confirmed |
| `src/three/WallMesh.tsx` | `aoMap` + `displacementMap` bound + uv2 setup | VERIFIED | uv2 via ref callback line 285-287; props lines 301-303 |
| `src/three/FloorMesh.tsx` | same | VERIFIED | uv2 lines 136-138; props lines 160-162 |
| `src/three/CeilingMesh.tsx` | same | VERIFIED | uv2 lines 140-142; props lines 188-190 |
| `src/three/CustomElementMesh.tsx` | same | VERIFIED | uv2 lines 173-175; props lines 98-100 |
| `src/components/MaterialCard.tsx` | MapBadge sub-component + 5 conditional badges | VERIFIED | MapBadge defined lines 166-185; badges lines 152-156 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `materialStore.saveMaterialWithDedup` | `persistOptionalMap` | `input.aoFile` and `input.displacementFile` | WIRED | Lines 106-110 call `persistOptionalMap` for both new fields |
| `useResolvedMaterial` | `useUserTexture` | `resolved?.aoMapId` and `resolved?.displacementMapId` | WIRED | Lines 71-72 pass both ids to `useUserTexture` |
| `UploadMaterialModal submit()` | `useMaterials.save` (SaveMaterialInput) | `aoFile: aoMap?.file` | WIRED | Lines 323-324 confirmed |
| `WallMesh/FloorMesh/CeilingMesh/CustomElementMesh` | `useResolvedMaterial` result | `resolved.aoMap`, `resolved.displacementMap` | WIRED | All 4 meshes destructure and bind both props |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `WallMesh` | `resolved.aoMap` | `useResolvedMaterial` → `useUserTexture(resolved?.aoMapId)` → IDB blob → THREE.Texture | Yes — IDB blob resolved via existing `userTextureCache` pattern | FLOWING |
| `MaterialCard` | `material.aoMapId` / `material.displacementMapId` | Direct prop from `useMaterials()` store | Yes — IDB-persisted Material record | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — no runnable entry points testable in isolation (requires browser + R3F canvas + IDB + texture upload).

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| PBR-01 | 78-01, 78-02 | Upload AO map; `aoMapId` field on Material type | SATISFIED | `material.ts` + `materialStore.ts` + upload modal all verified |
| PBR-02 | 78-01, 78-02 | Upload displacement map; `displacementMapId` on Material type | SATISFIED | Same as PBR-01 pattern, all layers present |
| PBR-03 | 78-03 | 3D rendering applies aoMap + displacementMap on wall/floor/ceiling/custom-element meshes | SATISFIED | All 4 mesh files bind both props with uv2 setup |
| PBR-04 | 78-04 | MaterialCard shows map-presence indicators for all 5 PBR slots | SATISFIED | 5 conditional MapBadge renders confirmed; paint-Material exclusion for COLOR badge correct |

No orphaned requirements — all 4 PBR IDs are claimed by plans and implementation exists for each.

**Note on PBR-03 scope decision:** `ProductBox.tsx` and `ProductMesh.tsx` are explicitly documented out of scope. Both files contain comments explaining they use the legacy `useProductTexture` pattern (single texture, no Material system) and are intentionally excluded. This is an acceptable scope boundary, not a gap.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

No TODO/FIXME/placeholder comments in the verified files. No empty implementations. No hardcoded empty arrays passed as props.

---

### Human Verification Required

#### 1. AO map visible in 3D viewport

**Test:** Upload a material with an AO map (a greyscale JPEG with black in corners/crevices). Apply it to a wall in 3D view.
**Expected:** The 3D surface shows darker areas in grout lines or recessed zones compared to a material without AO.
**Why human:** Requires browser + WebGL + texture upload; cannot verify visual darkening programmatically.

#### 2. Displacement map creates vertex offset

**Test:** Upload a material with a displacement map. Apply to a floor in 3D view with camera at floor level.
**Expected:** Floor surface shows subtle bumps (~0.6 inches / `displacementScale=0.05`). Geometry is not exploded or missing.
**Why human:** Vertex displacement is only verifiable visually in the 3D viewport.

#### 3. Five-badge display on a fully-specified material

**Test:** Upload a material with all 5 maps. View it in the Material Library.
**Expected:** MaterialCard shows COLOR, ROUGH, REFL, AO, and DISP badges simultaneously.
**Why human:** Requires creating a real material through the UI; badge rendering is a visual check.

---

### Gaps Summary

No gaps found. All 4 requirements are fully implemented end-to-end:

- **PBR-01 + PBR-02 (type + store + upload UI):** `material.ts` has both new optional fields, `materialStore.ts` persists them via `persistOptionalMap`, and `UploadMaterialModal` renders two new drop zones with proper state management, preview cleanup, and submit wiring.
- **PBR-03 (3D mesh binding):** All four in-scope mesh components (WallMesh, FloorMesh, CeilingMesh, CustomElementMesh) bind `aoMap` and `displacementMap` props and set up the required `uv2` BufferAttribute for the AO sampler.
- **PBR-04 (MaterialCard badges):** `MaterialCard` shows all 5 conditional badges with correct logic (COLOR only for textured, not paint Materials).

---

_Verified: 2026-05-08_
_Verifier: Claude (gsd-verifier)_
