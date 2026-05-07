---
phase: 67-material-engine-foundation-mat-engine-01
plan: "01"
subsystem: data-and-ui
tags: [material, indexeddb, dedup, upload-modal, library, foundation]
requires:
  - Phase 32/34 user-texture pipeline (processTextureFile + saveUserTextureWithDedup + userTextureIdbStore)
  - Phase 33 design system (LibraryCard primitive, lucide-react, canonical spacing, useReducedMotion)
provides:
  - Material entity (data model + IDB persistence + dedup)
  - Library UI surface for upload + browse + edit
  - D-09 wrapper integration surface for Phase 68 surface application
  - Test driver bridges (window.__driveMaterialUpload, window.__getMaterials)
affects:
  - src/components/ProductLibrary.tsx (now hosts MaterialsSection above products grid)
tech-stack:
  added: []  # zero new deps — pure additive on existing stack
  patterns:
    - "wrapper-architecture: Material stores utex_-prefixed references into existing texture store"
    - "named-IDB-keyspace-isolation: room-cad-materials physically separate from textures + projects"
    - "module-eval-test-driver: __driveMaterialUpload installed at module load (NOT in useEffect, Pattern #7)"
key-files:
  created:
    - src/types/material.ts
    - src/lib/materialStore.ts
    - src/hooks/useMaterials.ts
    - src/components/UploadMaterialModal.tsx
    - src/components/MaterialCard.tsx
    - src/components/MaterialsSection.tsx
    - tests/materialStore.test.ts
    - tests/materialStore.isolation.test.ts
    - tests/useMaterials.test.tsx
    - tests/uploadMaterialModal.test.tsx
    - tests/materialCard.test.tsx
    - tests/e2e/specs/material-upload.spec.ts
  modified:
    - src/components/ProductLibrary.tsx (3 lines: import + render + divider)
decisions:
  - "D-09 RESOLVED to wrapper architecture: Material.colorMapId is a utex_ id, not a raw blob. Phase 68 surface renderers consume userTextureId references via the existing pbrTextureCache, so apply works without new texture-cache plumbing."
  - "D-08 dedup on color-map SHA-256 ONLY (roughness/reflection hashes are not part of dedup key) — re-upload of same color JPEG returns existing Material id with deduped:true."
  - "Materials live in their own IDB store room-cad-materials; cadStore is unmodified; project save/load round trip does not touch the material store (success criterion #5)."
  - "Auto-fix Rule 1: tests/materialCard.test.tsx had a stale assertion expecting formatFeet(2.5) → \"2'6\\\"\" but the actual production helper at src/lib/geometry.ts:190 returns \"2'-6\\\"\" (hyphenated). Updated test contract to match production."
metrics:
  duration: ~25min
  completed: "2026-05-07"
  tasks-completed: 3
  vitest-files-added: 5
  vitest-assertions-green: 37
  e2e-files-added: 1
  source-files-added: 6
  source-files-modified: 1
  commits: 3
---

# Phase 67 Plan 01: Material Engine Foundation Summary

Material entity ships as a first-class data system: Jessica uploads a Material (color/roughness/reflection texture maps + name, brand, SKU, cost, lead time, tile size), it persists across reloads in its own IndexedDB store (`room-cad-materials`), dedupes on identical color-map upload, and shows metadata on hover. Built atop Phase 34's user-texture pipeline via D-09 wrapper architecture — Materials store `utex_` references into the existing texture store rather than owning blobs directly.

## What changed

**Data layer** — `src/types/material.ts` defines the Material interface with required `{id, name, tileSizeFt, colorMapId, colorSha256, createdAt}` and optional `{roughnessMapId, reflectionMapId, brand, sku, cost, leadTime}`. `src/lib/materialStore.ts` exposes `saveMaterialWithDedup`, `listMaterials`, `getMaterial`, `deleteMaterial`, `findMaterialByColorSha256`, `updateMaterialMetadata`, `clearAllMaterials` over `createStore("room-cad-materials", "materials")`. `src/hooks/useMaterials.ts` mirrors `useUserTextures` shape with cross-instance window-event sync (`material-saved` / `material-updated` / `material-deleted`).

**UI layer** — `UploadMaterialModal` (NEW; not an extension of `UploadTextureModal` per RESEARCH.md anti-pattern) renders 3 drop zones + 6 form fields with locked UI-SPEC §1 strings and toast-on-dedup vs toast-on-save. `MaterialCard` lazy-resolves the color blob URL via `getUserTexture(material.colorMapId)`, shows hover tooltip with `brand · SKU · cost · lead time · tile size` (empty fields filtered), and renders an orphan placeholder with the warning copy "Color map missing — re-upload to restore" when the underlying UserTexture has been deleted. `MaterialsSection` is a collapsible group with "+ UPLOAD_MATERIAL" CTA, hosted inside `ProductLibrary` above the existing products grid.

**ProductLibrary integration** — minimal 3-line diff: import `MaterialsSection`, render it above `<CategoryTabs>`, add a thin divider. Phase 70 will lift this into the proper top-level Materials/Assemblies/Products toggle; keeping it as a sub-section now makes the Phase 70 restructure a clean move.

## D-09 RESOLUTION — Wrapper Architecture

`Material.colorMapId` is a `utex_`-prefixed string referencing an entry in the existing `userTextureIdbStore` (Phase 34). Each color/roughness/reflection upload flows through the verbatim `processTextureFile` + `saveUserTextureWithDedup` pipeline — no new texture-cache plumbing. Three implications:

1. **Phase 68 alignment.** Surface renderers (`WallMesh`, `FloorMesh`, `CeilingMesh`) already consume `userTextureId` references via `pbrTextureCache` / `floorTexture` / `ceilingMaterial` resolvers. Phase 68's apply flow resolves `material.colorMapId` → existing texture cache → done. No fork in the texture pipeline.
2. **Cross-system dedup.** If the same JPEG is uploaded as both a Phase 34 UserTexture and a Phase 67 Material, IDB only stores one blob. The Material entry references the same `userTextureId`.
3. **Orphan tolerance.** If Jessica deletes a UserTexture that a Material references, `MaterialCard` renders a placeholder + warning at resolve time. `deleteMaterial` does NOT cascade-delete the underlying UserTexture (single-source-of-blob rule).

## Pattern #7 application (StrictMode-safety)

CLAUDE.md Pattern #7 was applied at three sites:

1. **`useMaterials.ts` cross-instance listener.** The `useEffect` that registers `material-saved` / `material-updated` / `material-deleted` window listeners returns a cleanup that calls `removeEventListener` for each event name — StrictMode double-mount discards the first-mount listeners and reinstalls fresh ones with no leak.
2. **`MaterialCard.tsx` blob URL lifecycle.** The `useEffect` that resolves `getUserTexture(colorMapId)` → `URL.createObjectURL(blob)` returns a cleanup that calls `URL.revokeObjectURL(createdUrl)` with a `cancelled` flag guard. StrictMode double-mount → first instance creates URL → cleanup revokes it → remount creates a fresh one.
3. **Test driver bridges installed at MODULE EVAL TIME, not in `useEffect`.** Per RESEARCH.md Pitfall 4, `window.__getMaterials` and `window.__driveMaterialUpload` are installed at module load behind `import.meta.env.MODE === "test"`. Module-eval install runs once when the module is first imported, never re-runs, never needs cleanup. Putting drivers in a `useEffect` is the trap from Phase 58 + Phase 64.

`UploadMaterialModal.tsx` Escape-key listener also uses standard `removeEventListener` cleanup; per-zone preview blob URLs are revoked both on file replacement and on unmount.

## Locked copy strings shipped (UI-SPEC §1 Material Copywriting Contract)

For Phase 70 reference — every string below is grep-verified at acceptance:

| Surface | String |
|---|---|
| Modal heading (create) | `UPLOAD MATERIAL` |
| Modal heading (edit) | `EDIT MATERIAL` |
| CTA (create) | `Upload Material` |
| CTA (edit) | `Save Changes` |
| CTA discard | `Discard` |
| Progress (create) | `Uploading…` |
| Progress (edit) | `Saving Changes…` |
| Color drop zone label | `COLOR_MAP` (required, `*` indicator) |
| Roughness drop zone label | `ROUGHNESS_MAP` (`OPTIONAL` tag) |
| Reflection drop zone label | `REFLECTION_MAP` (`OPTIONAL` tag) |
| Drop invite (per zone) | `Drag and drop a photo, or click to browse.` |
| Tile-size helper | `Real-world repeat (e.g. 2'6")` |
| Brand placeholder | `Vendor or maker (optional)` |
| SKU placeholder | `Product code (optional)` |
| Cost placeholder | `$5.99/sqft, Quote on request (optional)` |
| Lead-time placeholder | `2–4 weeks, In stock (optional)` |
| MIME error | `Only JPEG, PNG, and WebP are supported.` |
| Decode error | `This file couldn't be processed. Try a different image.` |
| Tile error | `Enter a valid size like 2', 1'6", or 0.5` |
| Name error | `Name is required.` |
| Toast saved | `Material saved.` |
| Toast deduped | `Material already in your library.` |
| Section heading | `MATERIALS` |
| Upload CTA | `+ UPLOAD_MATERIAL` |
| Tooltip orphan warning | `Color map missing — re-upload to restore` |
| Modal close aria | `Close upload dialog` |

## Wave 0 RED → GREEN trace

| Test file | Wave 0 state | Final state |
|---|---|---|
| `tests/materialStore.test.ts` | RED (Cannot resolve `@/lib/materialStore`) | GREEN (10 assertions) |
| `tests/materialStore.isolation.test.ts` | RED (Cannot resolve `@/lib/materialStore`) | GREEN (4 assertions) |
| `tests/useMaterials.test.tsx` | RED (Cannot resolve `@/hooks/useMaterials`) | GREEN (5 assertions) |
| `tests/uploadMaterialModal.test.tsx` | RED (Cannot resolve `@/components/UploadMaterialModal`) | GREEN (12 assertions) |
| `tests/materialCard.test.tsx` | RED (Cannot resolve `@/components/MaterialCard`) | GREEN (6 assertions) |
| `tests/e2e/specs/material-upload.spec.ts` | RED (drivers not installed) | Pending live e2e run |

37 vitest assertions green. `tsc --noEmit` clean. `npm run build` succeeds.

## Phase 68 forward signal

`material.colorMapId` is the integration surface. Phase 68's apply flow:
1. User selects a Material from the library and clicks a surface (wall, floor, ceiling).
2. Phase 68 resolves `material.colorMapId` through the existing `pbrTextureCache` / `floorTexture` / `ceilingMaterial` pipeline (same path as today's `setWallpaper(userTextureId)` / `setFloorMaterial(userTextureId)` flows).
3. Roughness/reflection maps (when present) feed the Three.js `MeshStandardMaterial.roughnessMap` / `envMap` slots — Phase 68 will add a second resolution path or extend `pbrTextureCache` with a multi-map variant. Decision deferred to Phase 68 research.

The wrapper architecture is load-bearing. If Phase 68 finds the existing pipeline insufficient, the alternative is to migrate Materials to own their blobs directly — but that's a larger refactor than expected for a v1.17 milestone.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Wave 0 test contract for `formatFeet(2.5)` was stale**
- **Found during:** Task 2 first vitest run
- **Issue:** `tests/materialCard.test.tsx` asserted `formatFeet(2.5) → "2'6\""` per plan §interfaces, but `src/lib/geometry.ts:190-197` actually returns `"2'-6\""` (hyphenated separator).
- **Fix:** Updated two assertions in tests/materialCard.test.tsx to expect `"2'-6\""`. The plan's interface block was a stale doc transcription; the production helper is the source of truth.
- **Files modified:** `tests/materialCard.test.tsx`
- **Commit:** 828a2f5

**2. [Rule 1 — Bug] MaterialCard tooltip not present in DOM by default broke test assertions**
- **Found during:** Task 2 first vitest run
- **Issue:** Initial implementation only rendered the tooltip element when `hover === true`. Tests asserted `container.textContent` includes metadata without simulating hover events; happy-dom's `mouseEnter` simulation is unreliable in the test renderer.
- **Fix:** Always render the tooltip element; toggle visibility via `opacity-100` / `opacity-0` Tailwind classes. Maintains the visual hover-only behavior while making the text deterministically readable for tests + screen readers.
- **Files modified:** `src/components/MaterialCard.tsx`
- **Commit:** 828a2f5

**3. [Rule 1 — Bug] Submit button disabled by blank name prevented inline error surfacing**
- **Found during:** Task 2 first vitest run
- **Issue:** `primaryDisabled` included `nameTrimmed.length === 0`, so clicking submit with a blank name was a no-op. The "Name is required." inline-error path was therefore unreachable.
- **Fix:** Removed `nameTrimmed.length === 0` from `primaryDisabled`; `submit()` now sets `nameError` inline if the name is blank and short-circuits before the save call. tile-size and color-map remain hard preconditions because users can't recover without them.
- **Files modified:** `src/components/UploadMaterialModal.tsx`
- **Commit:** 828a2f5

### Out-of-Scope Discoveries (Deferred)

Pre-existing test failures unrelated to this phase: `tests/productStore.test.ts` (1 case), `tests/AddProductModal.test.tsx` (3 cases), `tests/lib/contextMenuActionCounts.test.ts` (6 cases), `tests/SidebarProductPicker.test.tsx` (suite import error). Verified via `git stash + npm run test` that these fail without any 67-01 changes. Not addressed per scope-boundary rule. Recommend tracking in 999.x backlog if not already.

## Self-Check: PASSED

- All 6 created source files exist (`src/types/material.ts`, `src/lib/materialStore.ts`, `src/hooks/useMaterials.ts`, `src/components/UploadMaterialModal.tsx`, `src/components/MaterialCard.tsx`, `src/components/MaterialsSection.tsx`).
- All 6 created test files exist (`tests/materialStore.test.ts`, `tests/materialStore.isolation.test.ts`, `tests/useMaterials.test.tsx`, `tests/uploadMaterialModal.test.tsx`, `tests/materialCard.test.tsx`, `tests/e2e/specs/material-upload.spec.ts`).
- Modified file: `src/components/ProductLibrary.tsx` (verified import + render lines).
- Commits exist: `f6c4a14` (Task 0 RED), `2209601` (Task 1 data), `828a2f5` (Task 2 UI).
- 37 vitest assertions GREEN across the 5 material vitest files.
- TypeScript compiles cleanly (only pre-existing TS5101 baseUrl deprecation warning, unrelated).
- `npm run build` succeeds.
- `git diff src/stores/cadStore.ts` is empty — cadStore unmodified.
