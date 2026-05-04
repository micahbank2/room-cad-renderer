---
phase: 55-gltf-upload-01-gltf-glb-upload-storage
type: validation
created: 2026-04-29
requirements: [GLTF-UPLOAD-01]
---

# Phase 55 — GLTF-UPLOAD-01 Validation

## Test Paths and Assertions

### Unit Tests — tests/lib/gltfStore.test.ts

| # | Test Name | Assertion | Requirement Coverage |
|---|-----------|-----------|---------------------|
| 1 | saveGltf + getGltf round-trip | `getGltf(id).blob.size === testBlob.size` | GLTF-UPLOAD-01: "stored in IndexedDB" |
| 2 | findGltfBySha256 returns entry on match | `findGltfBySha256(sha256).id === savedId` | GLTF-UPLOAD-01: SHA-256 dedup lookup |
| 3 | saveGltfWithDedup returns deduped:true on duplicate blob | `result.id === firstId && result.deduped === true` | GLTF-UPLOAD-01: "second one references the first's IDB entry" |
| 4 | saveGltfWithDedup returns deduped:false for new blob | `result1.id !== result2.id && result1.deduped === false && result2.deduped === false` | GLTF-UPLOAD-01: distinct blobs stored separately |
| 5 | listGltfs returns all entries | `listGltfs().length === 2` after two saves | GLTF-UPLOAD-01: IDB enumeration |

**Run command:** `npx vitest run tests/lib/gltfStore.test.ts`

**Test fixture:** 16-byte synthetic GLB (GLB magic header: `67 6C 54 46 02 00 00 00 10 00 00 00 00 00 00 00`)

---

### Component Tests — tests/components/AddProductModal.gltf.test.tsx

| # | Test Name | Assertion | Requirement Coverage |
|---|-----------|-----------|---------------------|
| 6 | accepts valid .glb file — shows filename, no error | `queryByText(/FILE EXCEEDS/i)` is null after valid file selected | GLTF-UPLOAD-01: "File picker accepts .gltf and .glb extensions" |
| 7 | rejects file >25MB — shows size-cap error | `getByText(/FILE EXCEEDS 25MB LIMIT/i)` is visible; gltfFile state is null | GLTF-UPLOAD-01: "30MB GLTF → upload rejected with size-cap error message" |
| 8 | submit with valid GLTF — onAdd called with gltfId set | `onAdd.mock.calls[0][0].gltfId === "gltf_test123"` (mocked saveGltfWithDedup) | GLTF-UPLOAD-01: "product is created with gltfId set" |

**Run command:** `npx vitest run tests/components/AddProductModal.gltf.test.tsx`

**Mock:** `saveGltfWithDedup` mocked via `vi.mock("@/lib/gltfStore")` — returns `{ id: "gltf_test123", deduped: false }`. Isolates component test from IDB.

---

### E2E Tests — e2e/gltf-upload.spec.ts

| # | Scenario | Assertion | Requirement Coverage |
|---|----------|-----------|---------------------|
| 9a | driver path: driveUploadGltf saves blob to IDB | `gltfId.match(/^gltf_/)` and `blobSize > 0` | GLTF-UPLOAD-01: IDB storage via dedup pipeline |
| 9b | modal UI path: AddProductModal submit with GLB | Product name appears in library after submit; modal closes | GLTF-UPLOAD-01: full upload flow end-to-end |

**Run command:** `npx playwright test e2e/gltf-upload.spec.ts --project=chromium-dev`

---

## GLTF-UPLOAD-01 Requirement → Test Traceability

From REQUIREMENTS.md verifiable criteria:

| Criterion | Test # | Type | Command |
|-----------|--------|------|---------|
| File picker accepts .gltf and .glb extensions | 6 | component | vitest AddProductModal.gltf |
| Drop a 5MB GLTF → product created with gltfId set | 9b | e2e | playwright gltf-upload |
| Drop a 30MB GLTF → rejected with size-cap error | 7 | component | vitest AddProductModal.gltf |
| Same SHA-256 → second product references first IDB entry | 3 | unit | vitest gltfStore |
| Existing image-only products continue to work unchanged | (regression) | e2e | playwright full suite |
| Snapshot serialization preserves gltfId; loadSnapshot async path untouched | (regression) | e2e | playwright floor-material-migration |

---

## Acceptance Criteria — Full Pass Definition

Phase 55 GLTF-UPLOAD-01 is ACCEPTED when:

- [ ] `npx vitest run tests/lib/gltfStore.test.ts` — 5 tests pass
- [ ] `npx vitest run tests/components/AddProductModal.gltf.test.tsx` — 3 tests pass
- [ ] `npx vitest run tests/lib/userTextureStore.test.ts` — Phase 32 LIB-08 unaffected (regression gate)
- [ ] `npx vitest run` — total failure count is exactly 6 (pre-existing; no new failures)
- [ ] `npx playwright test e2e/gltf-upload.spec.ts --project=chromium-dev` — 2 scenarios pass
- [ ] `npx playwright test e2e/floor-material-migration.spec.ts --project=chromium-dev` — Phase 51 unaffected
- [ ] `npx playwright test e2e/canvas-context-menu.spec.ts --project=chromium-dev` — Phase 53 unaffected
- [ ] `npx tsc --noEmit` — exits 0

---

## Out-of-Scope Behaviors (NOT tested in Phase 55)

These behaviors are explicitly deferred to Phase 56+:

- 3D rendering of the GLTF model (Phase 56 — drei useGLTF)
- 2D top-down silhouette (Phase 57)
- Library UI GLTF indicator (Phase 58)
- ErrorBoundary fallback for corrupt GLTF (Phase 56)
- Blob URL lifecycle management (Phase 56 — revoke on unmount)

---

## Regression Gate Commands

Run after phase completion before triggering `/gsd:verify-work`:

```bash
npx tsc --noEmit
npx vitest run
npx playwright test e2e/ --project=chromium-dev
```

Expected: tsc exits 0; vitest 6 pre-existing failures only; playwright no new failures.
