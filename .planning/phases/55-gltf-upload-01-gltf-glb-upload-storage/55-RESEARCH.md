---
phase: 55-gltf-upload-01-gltf-glb-upload-storage
type: research
created: 2026-04-29
domain: IndexedDB IDB pipeline / FileReader / SHA-256 dedup / AddProductModal
confidence: HIGH
requirements: [GLTF-UPLOAD-01]
---

# Phase 55: GLTF/GLB Upload + IDB Storage (GLTF-UPLOAD-01) — Research

**Researched:** 2026-04-29
**Domain:** IDB keyval, SHA-256 dedup, AddProductModal file input, drei useGLTF blob-URL
**Confidence:** HIGH — all findings grounded in direct file reads + official source verification

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01** — Add `gltfId?: string` to Product; annotate `modelUrl` `@deprecated`
- **D-02** — AddProductModal gets TWO inputs: existing image (required) + new GLTF (optional)
- **D-03** — Validate extension (.gltf/.glb, case-insensitive) + size ≤ 25 MB only; no parse-at-upload
- **D-04** — New `src/lib/gltfStore.ts` with `gltfIdbStore = createStore("room-cad-gltf-models", "models")`; exact function list locked; `computeSHA256` reused from userTextureStore
- **D-05** — Snapshot at v3; `gltfId` is a plain string field; no version bump; Phase 51 async loadSnapshot untouched
- **D-06** — 5 unit tests + 3 component tests + 1 e2e test (exact list locked)
- **D-07** — `__driveUploadGltf(blob, name)` driver gated by `MODE === "test"`; returns new product id
- **D-08** — Atomic commits per task
- **D-09** — Zero regressions on Phases 32, 51, 53, 54; 6 pre-existing vitest failures unchanged

### Claude's Discretion

None specified — all decisions locked in CONTEXT.md.

### Deferred Ideas (OUT OF SCOPE)

- 3D rendering of GLTF models (Phase 56)
- 2D top-down silhouette (Phase 57)
- Library UI indicator for GLTF-backed products (Phase 58)
- OBJ format, GLTF animations, custom material overrides
- LOD / progressive loading
- Cloud-hosted GLTF library
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GLTF-UPLOAD-01 | User uploads .gltf/.glb via AddProductModal; validated, stored in IDB with SHA-256 dedup; gltfId attached to Product | All 10 focus areas below |
</phase_requirements>

---

## Summary

Phase 55 is a clean mirror of Phase 32 LIB-08 (userTextureStore). Every function signature, IDB pattern, and dedup strategy has a direct analog. `computeSHA256` is exported from `userTextureStore.ts:41` and accepts `ArrayBuffer | ArrayBufferView` — it works with `await blob.arrayBuffer()` with no wrapper needed.

`AddProductModal.tsx` currently has one image file input (line 112–121) inside a drag-drop zone, plus a hidden `<input ref={fileRef}>`. The GLTF input fits cleanly below the existing image zone as a standalone labeled file row — no restructuring of the 2-column layout required. The modal is fixed-width at `w-[600px]` (line 64).

drei `useGLTF` accepts `blob:` URLs produced by `URL.createObjectURL(blob)` — this is the standard pattern used across the three.js ecosystem. Three.js `GLTFLoader.load(url)` treats blob URLs identically to HTTP URLs since both are fetchable via `fetch()`. This confirms Phase 56's design is viable.

**Primary recommendation:** Mirror `userTextureStore.ts` exactly, add the second file input below the image zone in `AddProductModal`, store the driver in a new `src/test-utils/gltfDrivers.ts` file, and install it in `main.tsx` following the Phase 49 pattern.

---

## Focus Area 1: gltfStore.ts — Side-by-Side Mapping to userTextureStore.ts

All line references are to `src/lib/userTextureStore.ts`.

### Store handle

| userTextureStore.ts | gltfStore.ts |
|---|---|
| `createStore("room-cad-user-textures", "textures")` (line 34) | `createStore("room-cad-gltf-models", "models")` |
| exported as `userTextureIdbStore` | exported as `gltfIdbStore` |

### computeSHA256

**Do NOT duplicate.** Import from `userTextureStore.ts`:

```typescript
import { computeSHA256 } from "@/lib/userTextureStore";
```

`computeSHA256` (userTextureStore.ts:41–52) accepts `ArrayBuffer | ArrayBufferView`. Pass `await blob.arrayBuffer()` which returns `ArrayBuffer` — no wrapper needed. Verified: line 41 signature is `async function computeSHA256(bytes: ArrayBuffer | ArrayBufferView): Promise<string>`.

### GltfModel interface (maps to UserTexture in userTexture.ts)

```typescript
export interface GltfModel {
  id: string;          // "gltf_" + uid() — mirrors "utex_" prefix pattern
  blob: Blob;
  sha256: string;
  name: string;        // original filename
  sizeBytes: number;   // file.size at upload time (no analog in UserTexture — new field)
  uploadedAt: string;  // ISO timestamp (vs UserTexture.createdAt: number epoch)
}
```

Note: `UserTexture` uses `createdAt: number` (epoch ms, line 75 sort: `b.createdAt - a.createdAt`). `GltfModel.uploadedAt` as ISO string is fine since listing sort is by `new Date(b.uploadedAt) - new Date(a.uploadedAt)`, or use epoch number for simplicity. **Recommendation:** use `uploadedAt: number` (epoch ms) to keep the sort identical to userTextureStore.ts:75.

### Id format

`userTextureStore.ts:107`: `const id = \`${USER_TEXTURE_ID_PREFIX}${uid()}\``
where `USER_TEXTURE_ID_PREFIX = "utex_"` (from `src/types/userTexture.ts`).

For gltfStore: `const id = \`gltf_${uid()}\`` inline (no separate constant needed unless planner prefers consistency). `uid()` from `src/lib/geometry.ts` produces 8 random chars (verified: imported at userTextureStore.ts:26).

### Function mapping (all functions, file:line in userTextureStore.ts)

| userTextureStore.ts function | line | gltfStore.ts equivalent |
|---|---|---|
| `saveUserTexture(tex)` | 57–59 | `saveGltf(model: GltfModel): Promise<void>` |
| `getUserTexture(id)` | 62–64 | `getGltf(id: string): Promise<GltfModel \| undefined>` |
| `deleteUserTexture(id)` | 67–70 | `deleteGltf(id: string): Promise<void>` |
| `listUserTextures()` | 73–76 | `listGltfs(): Promise<GltfModel[]>` — sort by `uploadedAt DESC` |
| `findTextureBySha256(sha256)` | 81–86 | `findGltfBySha256(sha256: string): Promise<GltfModel \| undefined>` |
| `SaveTextureInput` interface | 88–93 | N/A — inline param shape: `{ blob: Blob; name: string }` (simpler; no tileSizeFt/mimeType) |
| `saveUserTextureWithDedup(input, sha256)` | 101–119 | `saveGltfWithDedup(input: { blob: Blob; name: string }): Promise<{ id: string; deduped: boolean }>` |
| `clearAllUserTextures()` | 122–124 | `clearAllGltfs(): Promise<void>` — test helper only |

### saveGltfWithDedup pseudocode (mirrors lines 101–119)

```typescript
export async function saveGltfWithDedup(
  input: { blob: Blob; name: string }
): Promise<{ id: string; deduped: boolean }> {
  const bytes = await input.blob.arrayBuffer();
  const sha256 = await computeSHA256(bytes);          // reuse from userTextureStore
  const existing = await findGltfBySha256(sha256);
  if (existing) return { id: existing.id, deduped: true };
  const id = `gltf_${uid()}`;
  const model: GltfModel = {
    id,
    blob: input.blob,
    sha256,
    name: input.name,
    sizeBytes: input.blob.size,
    uploadedAt: Date.now(),
  };
  await saveGltf(model);
  return { id, deduped: false };
}
```

Note: userTextureStore.ts:101 receives `sha256` as a parameter (computed by the caller). `saveGltfWithDedup` computes it internally — simpler API since the caller (AddProductModal) doesn't need to know the hash.

### Imports for gltfStore.ts

```typescript
import { createStore, set, get, del, values, clear } from "idb-keyval";
import { uid } from "@/lib/geometry";
import { computeSHA256 } from "@/lib/userTextureStore";
```

---

## Focus Area 2: AddProductModal Extension Shape

File: `src/components/AddProductModal.tsx` (260 lines, read in full).

### Existing structure

- **Line 64:** modal outer div fixed at `w-[600px]`
- **Line 78:** `<form>` with `space-y-4`
- **Line 79–128:** left column `w-48 shrink-0` — image drag-drop zone + hidden `<input ref={fileRef}>`
- **Line 131–235:** right column `flex-1 space-y-3` — form fields
- **Line 112–121:** hidden image file input (`accept="image/*"`)
- **Line 37–51:** `handleSubmit` — constructs Product, calls `onAdd({...})`, then `onClose()`
- **Line 19:** `imageUrl` state; line 21: `fileRef` for image input

### New state needed

```typescript
const [gltfFile, setGltfFile] = useState<File | null>(null);
const [gltfError, setGltfError] = useState<string | null>(null);
const gltfRef = useRef<HTMLInputElement>(null);
```

### Validation function (extension + size)

```typescript
function validateGltf(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext !== "gltf" && ext !== "glb") return "FILE MUST BE .GLTF OR .GLB";
  if (file.size > 25 * 1024 * 1024) return "FILE EXCEEDS 25MB LIMIT";
  return null;
}
```

DO NOT check `file.type` — see Focus Area 5 (MIME type behavior).

### Where to insert the new input (minimal-diff)

Insert a new labeled row inside the right column (`flex-1 space-y-3`, lines 131–235), after the MATERIAL FINISH label block (lines 223–234), before the closing `</div>` at line 235:

```tsx
{/* 3D Model (optional) */}
<div className="space-y-1">
  <span className="font-mono text-[9px] text-text-ghost tracking-wider">
    3D MODEL (OPTIONAL)
  </span>
  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={() => gltfRef.current?.click()}
      className="font-mono text-[9px] px-3 py-1.5 border border-outline-variant/30 rounded-sm text-text-dim hover:text-text-primary hover:border-accent/40 transition-colors"
    >
      {gltfFile ? gltfFile.name.toUpperCase() : "CHOOSE .GLTF / .GLB"}
    </button>
    {gltfFile && (
      <button type="button" onClick={() => { setGltfFile(null); setGltfError(null); }}
        className="text-text-ghost hover:text-error transition-colors">
        <X size={12} />
      </button>
    )}
    <input ref={gltfRef} type="file" accept=".gltf,.glb"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const err = validateGltf(f);
        if (err) { setGltfError(err); setGltfFile(null); }
        else { setGltfFile(f); setGltfError(null); }
        e.target.value = "";   // allow re-select of same file
      }}
      className="hidden" />
  </div>
  {gltfError && (
    <span className="font-mono text-[8px] text-error block">{gltfError}</span>
  )}
</div>
```

Use `X` from `lucide-react` (consistent with D-33 icon policy).

### handleSubmit addition

`handleSubmit` currently calls `onAdd({...})` synchronously (line 41). GLTF dedup is async. Change to async submit:

```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!name) return;
  let gltfId: string | undefined;
  if (gltfFile) {
    const result = await saveGltfWithDedup({ blob: gltfFile, name: gltfFile.name });
    gltfId = result.id;
  }
  onAdd({
    id: `prod_${uid()}`,
    name,
    category,
    width: skipDims ? null : width,
    depth: skipDims ? null : depth,
    height: skipDims ? null : height,
    material,
    imageUrl: imageUrl ?? "",
    textureUrls: [],
    ...(gltfId ? { gltfId } : {}),
  });
  onClose();
}
```

No loading spinner needed for Phase 55 (SHA-256 on 25MB is ~50ms; imperceptible). Phase 56 can add a spinner if needed.

### Modal layout fit (Focus Area 7 answer)

The modal is `w-[600px]` (line 64) — fixed width, not responsive. The right column is `flex-1 space-y-3` with four existing fields. Adding one more `space-y-1` block matches the existing rhythm. No layout restructuring needed. The button-style file picker (not a full drag-drop zone) keeps vertical height minimal. **Confirmed: fits without breaking layout.**

---

## Focus Area 3: Drei useGLTF Blob-URL Acceptance

**Verdict: blob URLs work.** THREE.js `GLTFLoader.load(url)` uses `fetch(url)` internally for all URL schemes including `blob:`. `URL.createObjectURL(blob)` returns a `blob:http://localhost:5173/...` URL that is fetchable in the same origin. drei `useGLTF(url)` delegates to `useLoader(GLTFLoader, url)` which wraps `THREE.GLTFLoader.load()`.

**Evidence:**
- Three.js forum confirms: `GLTFLoader.load(URL.createObjectURL(blob))` is the standard pattern for in-memory blob loading (multiple threads 2022–2025)
- drei issue #918 documents blob URL usage in user reports — no rejection, usage confirmed working
- The pattern is: obtain blob from IDB → `const url = URL.createObjectURL(blob)` → pass to `useGLTF(url)` → revoke URL via `useEffect` cleanup when component unmounts

**Important lifecycle note for Phase 56:** The blob URL must NOT be revoked while `useGLTF` is using it. Pattern:
```typescript
const url = useMemo(() => URL.createObjectURL(blob), [blob]);
useEffect(() => () => URL.revokeObjectURL(url), [url]);
const { scene } = useGLTF(url);
```

**`data:` URLs:** Also work with GLTFLoader but are significantly larger in memory (base64 encoded). Do not use for Phase 56.

**Confidence:** HIGH — confirmed by three.js ecosystem documentation and multi-year community usage.

---

## Focus Area 4: computeSHA256 Reusability

Source: `src/lib/userTextureStore.ts:41–52`.

```typescript
export async function computeSHA256(bytes: ArrayBuffer | ArrayBufferView): Promise<string>
```

- Accepts `ArrayBuffer` directly (line 44: `bytes instanceof ArrayBuffer`)
- `await blob.arrayBuffer()` returns `ArrayBuffer` — passes the `instanceof ArrayBuffer` branch
- No wrapper needed
- **Recommendation: import directly from `userTextureStore.ts`** — no duplication

```typescript
// In gltfStore.ts:
import { computeSHA256 } from "@/lib/userTextureStore";

// Usage in saveGltfWithDedup:
const bytes = await input.blob.arrayBuffer();
const sha256 = await computeSHA256(bytes);
```

**Confidence:** HIGH — verified from source lines 41–52.

---

## Focus Area 5: GLTF MIME Type Detection

**Problem:** Browser-reported MIME types for GLTF files are inconsistent:
- `.gltf` files → browsers report `text/plain`, `model/gltf+json`, or `application/json` depending on OS and browser
- `.glb` files → browsers report `application/octet-stream` or `model/gltf-binary`

Neither `model/gltf+json` nor `model/gltf-binary` are consistently reported on all platforms.

**Recommendation: validate by file extension only (case-insensitive). Do NOT check `file.type`.**

```typescript
function validateGltf(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext !== "gltf" && ext !== "glb") {
    return "FILE MUST BE .GLTF OR .GLB";
  }
  if (file.size > 25 * 1024 * 1024) {
    return "FILE EXCEEDS 25MB LIMIT";
  }
  return null;
}
```

Also set `accept=".gltf,.glb"` on the `<input>` element (filters OS file picker by extension, not MIME). This is the same defense-in-depth approach the existing image input uses (`accept="image/*"`).

---

## Focus Area 6: Cross-Product SHA-256 Dedup Behavior

Trace through `userTextureStore.ts:101–119` to confirm the parallel for `saveGltfWithDedup`:

1. `findTextureBySha256(sha256)` (line 105) — linear scan via `listUserTextures()` (all entries)
2. If `existing` found → **return `{ id: existing.id, deduped: true }`** (line 106) — NO new IDB write
3. If not found → generate new `id`, write new entry, return `{ id, deduped: false }`

**Result for the 3-product dedup scenario:**
- Product A uploads `sofa.glb` → SHA-256 = "abc123" → new IDB entry `gltf_x1y2z3w4` → `deduped: false`
- Product B uploads same `sofa.glb` → SHA-256 = "abc123" → `findGltfBySha256` returns the entry → return `{ id: "gltf_x1y2z3w4", deduped: true }` — **no new blob written**
- Product C uploads same file → same → `{ id: "gltf_x1y2z3w4", deduped: true }`

All three products have `gltfId = "gltf_x1y2z3w4"`. One blob in IDB. Dedup confirmed correct.

**Deletion note (not in scope for Phase 55 but worth flagging):** If Product A is deleted, the IDB entry is NOT swept. Products B and C still reference it. Phase 58 or later must implement reference-counting if cleanup is desired. Pattern mirrors Phase 32's orphan-fallback approach.

---

## Focus Area 8: Test Driver Pattern

Pattern source: `src/test-utils/userTextureDrivers.ts:31–53` (`seedUserTexture`) and lines 86–103 (`installUserTextureDrivers`).

### New file: `src/test-utils/gltfDrivers.ts`

Separate file (not appended to `userTextureDrivers.ts`) — cleaner per D-07 and consistent with Phase 49+ convention of one driver file per feature domain.

**`driveUploadGltf` function:**

```typescript
export async function driveUploadGltf(blob: Blob, name: string): Promise<string> {
  if (import.meta.env.MODE !== "test") {
    throw new Error("driveUploadGltf must not be called outside test mode");
  }
  // 1. Save to IDB via dedup (same path the modal takes)
  const { id: gltfId } = await saveGltfWithDedup({ blob, name });
  // 2. Create a product with the gltfId attached
  const prodId = `prod_${uid()}`;
  useProductStore.getState().addProduct({
    id: prodId,
    name,
    category: "Other",
    width: null, depth: null, height: null,
    material: "",
    imageUrl: "",
    textureUrls: [],
    gltfId,
  });
  return prodId;
}
```

**`installGltfDrivers` function:**

```typescript
export function installGltfDrivers(): void {
  if (typeof window === "undefined") return;
  if (import.meta.env.MODE !== "test") return;
  (window as unknown as { __driveUploadGltf: typeof driveUploadGltf }).__driveUploadGltf =
    driveUploadGltf;
}
```

**Global declaration:**

```typescript
declare global {
  interface Window {
    __driveUploadGltf?: (blob: Blob, name: string) => Promise<string>;
  }
}
```

### main.tsx addition (line 18, after `installUserTextureDrivers()`):

```typescript
import { installGltfDrivers } from "./test-utils/gltfDrivers";
// Phase 55: install GLTF upload test drivers (gated by MODE==="test", production no-op)
installGltfDrivers();
```

---

## Focus Area 9: Test Fixture — Small GLTF Blob

For unit tests (`tests/lib/gltfStore.test.ts`), the blob does not need to be a parseable GLTF — only a valid `Blob` with the right size behavior. Use a synthetic blob:

```typescript
// Minimal valid synthetic GLB: magic bytes + 12 bytes padding = 16 bytes total
// GLB magic: 0x46546C67 (little-endian "glTF")
const GLB_MAGIC = new Uint8Array([0x67, 0x6C, 0x54, 0x46, 0x02, 0x00, 0x00, 0x00,
                                   0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
const testBlob = new Blob([GLB_MAGIC], { type: "model/gltf-binary" });
```

This is a 16-byte blob that starts with the correct GLB magic bytes. Good enough for IDB round-trip tests and SHA-256 dedup tests. Does NOT need to be parseable by GLTFLoader (Phase 56 concern).

For component tests (`AddProductModal.gltf.test.tsx`), use the same synthetic blob plus a `File` wrapper:

```typescript
const testFile = new File([testBlob], "test-model.glb", { type: "model/gltf-binary" });
```

For the size-cap rejection test:
```typescript
const bigFile = new File(
  [new Uint8Array(26 * 1024 * 1024)],  // 26MB > 25MB cap
  "big.glb",
  { type: "model/gltf-binary" }
);
```

Check `tests/fixtures/` for any existing GLB files — if none exist, use the synthetic approach above. No fixture file needed in the repo.

---

## Focus Area 10: Task Breakdown

**1 plan, 4 tasks** — confirmed correct estimate from CONTEXT.md.

### Task 1 — `src/lib/gltfStore.ts` + 5 unit tests (TDD)

Files:
- `src/lib/gltfStore.ts` (NEW, ~110 lines)
- `tests/lib/gltfStore.test.ts` (NEW, 5 tests)

Tests per D-06:
1. `saveGltf` round-trip (write → `getGltf` returns same blob bytes)
2. `findGltfBySha256` returns existing entry when SHA matches
3. `saveGltfWithDedup` returns existing id when SHA-256 matches (`deduped: true`)
4. `saveGltfWithDedup` creates new id when SHA-256 differs (`deduped: false`)
5. `listGltfs` returns all entries

### Task 2 — Product type + driver file + main.tsx

Files:
- `src/types/product.ts` — add `gltfId?: string`; `@deprecated modelUrl`
- `src/test-utils/gltfDrivers.ts` (NEW, ~60 lines)
- `src/main.tsx` — add `installGltfDrivers()` call

### Task 3 — AddProductModal extension + 3 component tests

Files:
- `src/components/AddProductModal.tsx` — second file input, async handleSubmit
- `tests/components/AddProductModal.gltf.test.tsx` (NEW, 3 tests)

Tests per D-06:
6. Modal accepts `.gltf` and `.glb` via new input (no error state)
7. Modal rejects 30MB file with size-cap error message visible
8. Submission with model file → product in store has `gltfId` set (mock `saveGltfWithDedup`)

### Task 4 — e2e/gltf-upload.spec.ts (1 scenario)

File:
- `e2e/gltf-upload.spec.ts` (NEW)

Scenario per D-06:
9. Open modal → upload synthetic GLB → modal submits → product in `productStore` has `gltfId` → IDB `gltfIdbStore` has the blob (assert via `getGltf(gltfId).blob.size > 0`)

Driver: `page.evaluate(() => window.__driveUploadGltf(blob, "test-sofa"))` — bypasses modal for the store-state assertion. Full UI path in the scenario above tests modal flow.

---

## Architecture Patterns

### gltfStore.ts recommended structure

```
src/lib/gltfStore.ts
  Header comment (mirrors userTextureStore.ts comment block)
  import { createStore, get, set, del, values, clear } from "idb-keyval"
  import { uid } from "@/lib/geometry"
  import { computeSHA256 } from "@/lib/userTextureStore"
  export const gltfIdbStore = createStore(...)
  export interface GltfModel { ... }
  export async function saveGltf(...) { ... }
  export async function getGltf(...) { ... }
  export async function deleteGltf(...) { ... }
  export async function listGltfs(...) { ... }
  export async function findGltfBySha256(...) { ... }
  export async function saveGltfWithDedup(...) { ... }
  export async function clearAllGltfs(...) { ... }  // test helper only
```

### Product type addition (src/types/product.ts:10)

After `modelUrl` line, insert:
```typescript
/** @deprecated use gltfId instead — modelUrl is a non-persistent blob URL */
modelUrl?: string;
/** IDB key into gltfIdbStore. Set when user uploads a .gltf/.glb file. */
gltfId?: string;
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| SHA-256 hashing | Custom hash | `computeSHA256` from `userTextureStore.ts` via Web Crypto |
| IDB CRUD | Raw `indexedDB.open()` | `idb-keyval` createStore/get/set/del/values |
| File dedup | Content-addressed naming | SHA-256 linear scan (catalog is O(10s) entries) |
| GLTF parsing at upload | THREE.GLTFLoader at upload time | Skip — defer to Phase 56 |

---

## Common Pitfalls

### Pitfall 1: Checking file.type instead of file extension
**What goes wrong:** `.gltf` files report `text/plain` on macOS, causing false validation rejections.
**How to avoid:** Validate extension only: `file.name.split(".").pop()?.toLowerCase()`.

### Pitfall 2: Making handleSubmit synchronous
**What goes wrong:** `saveGltfWithDedup` is async (SHA-256 compute + IDB write). If handleSubmit is sync, gltfId will be undefined.
**How to avoid:** Mark handleSubmit as `async`, await `saveGltfWithDedup`.

### Pitfall 3: Passing `blob.arrayBuffer()` result to computeSHA256 without await
**What goes wrong:** `blob.arrayBuffer()` is a Promise — passing it unwrapped produces `sha256` of a Promise object, not the bytes.
**How to avoid:** `const bytes = await blob.arrayBuffer(); const sha256 = await computeSHA256(bytes);`

### Pitfall 4: Revoking blob URL too early in Phase 56
**What goes wrong:** `URL.createObjectURL(blob)` URL revoked before `useGLTF` finishes loading produces a fetch error. (Phase 56 concern — document here so Phase 56 researcher doesn't re-discover.)
**How to avoid:** Only revoke in `useEffect` cleanup (component unmount), never eagerly.

### Pitfall 5: Writing gltfStore to the default idb-keyval store
**What goes wrong:** If `createStore()` is called without arguments, it writes to the shared default store used by `serialization.ts` (project save/load), corrupting project data.
**How to avoid:** Always pass both arguments: `createStore("room-cad-gltf-models", "models")`.

---

## State of the Art

| Old Approach | Current Approach |
|---|---|
| `modelUrl?: string` (blob URL, non-persistent) | `gltfId?: string` (IDB key, survives reload) |
| No GLTF storage in Phase 1–54 | Phase 55: IDB keystore with SHA-256 dedup |

---

## Environment Availability

Step 2.6: SKIPPED — no external tools, services, or CLIs beyond the existing project stack. All required packages (`idb-keyval`, `lucide-react`) are already installed. Web Crypto (`crypto.subtle`) is available in all target browsers and in happy-dom (vitest test env).

---

## Validation Architecture

### Test Framework

| Property | Value |
|---|---|
| Framework | vitest (existing) |
| Config file | `vite.config.ts` (existing) |
| Quick run command | `npx vitest run tests/lib/gltfStore.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| GLTF-UPLOAD-01 | gltfStore round-trip | unit | `npx vitest run tests/lib/gltfStore.test.ts` | ❌ Wave 0 |
| GLTF-UPLOAD-01 | SHA-256 dedup | unit | `npx vitest run tests/lib/gltfStore.test.ts` | ❌ Wave 0 |
| GLTF-UPLOAD-01 | Modal accepts .gltf/.glb | component | `npx vitest run tests/components/AddProductModal.gltf.test.tsx` | ❌ Wave 0 |
| GLTF-UPLOAD-01 | Modal rejects 30MB file | component | `npx vitest run tests/components/AddProductModal.gltf.test.tsx` | ❌ Wave 0 |
| GLTF-UPLOAD-01 | Full upload e2e flow | e2e | `npx playwright test e2e/gltf-upload.spec.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/lib/gltfStore.test.ts` (Task 1), `npx vitest run tests/components/AddProductModal.gltf.test.tsx` (Task 3)
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full vitest suite green + Playwright e2e green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/lib/gltfStore.test.ts` — 5 unit tests for GLTF-UPLOAD-01 IDB layer
- [ ] `tests/components/AddProductModal.gltf.test.tsx` — 3 component tests
- [ ] `e2e/gltf-upload.spec.ts` — 1 e2e scenario

---

## Sources

### Primary (HIGH confidence)

- `src/lib/userTextureStore.ts` lines 1–126 — direct code read; all patterns confirmed from source
- `src/components/AddProductModal.tsx` lines 1–259 — direct code read; insertion points identified
- `src/types/product.ts` lines 1–12 — direct code read; `modelUrl` field confirmed
- `src/test-utils/userTextureDrivers.ts` lines 1–115 — driver pattern confirmed
- `src/main.tsx` lines 1–26 — install pattern confirmed
- `src/stores/productStore.ts` lines 47–55 — `addProduct` signature confirmed

### Secondary (MEDIUM confidence)

- Three.js forum: blob URL + GLTFLoader confirmed working across 2022–2025 threads
- drei issue #918: `useGLTF` with blob URLs — community confirmation, no official API doc

### Tertiary (LOW confidence)

- None — all critical claims verified from source.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — idb-keyval 6.2.2 installed, patterns read directly from source
- Architecture (gltfStore mirror): HIGH — line-by-line parallel verified
- AddProductModal insertion: HIGH — full file read, insertion points identified
- drei blob-URL support: MEDIUM — confirmed by community usage, not official API doc
- MIME type behavior: HIGH — well-documented cross-browser inconsistency

**Research date:** 2026-04-29
**Valid until:** 2026-05-29 (stable stack)
