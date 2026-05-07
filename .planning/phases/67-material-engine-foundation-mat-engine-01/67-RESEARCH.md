# Phase 67: Material Engine Foundation (MAT-ENGINE-01) - Research

**Researched:** 2026-05-06
**Domain:** IndexedDB-backed catalog entity + library UI integration
**Confidence:** HIGH (existing pipeline maps cleanly to Material requirements)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Texture Maps**
- **D-01:** Material upload form has 1 required drop zone (color) + 2 optional drop zones (roughness, reflection). Optional maps default to "not provided"; downstream renderers (Phase 68) substitute defaults.

**Metadata Fields**
- **D-02:** **Required:** `name` (≤40 chars, matches UserTexture convention) and `tileSizeFt` (real-world tile size in decimal feet, parsed via existing `validateInput` from `src/canvas/dimensionEditor`).
- **D-03:** **Optional:** `brand`, `sku`, `cost`, `leadTime`. All four can be left blank without blocking save.
- **D-04:** **Cost** is a free-text string (e.g. `"$5.99/sqft"`, `"Quote on request"`). NOT a number.
- **D-05:** **Lead time** is a free-text string (e.g. `"2–4 weeks"`, `"In stock"`). NOT integer days.

**Library Entry Point**
- **D-06:** Add a new "Materials" section inside the existing `ProductLibrary` sidebar. The "Upload Material" CTA lives here. Do NOT repurpose `MyTexturesList`; do NOT add a top-toolbar button. Phase 70 will lift this into the proper top-level Materials/Assemblies/Products toggle.

**Inspect / Hover UX**
- **D-07:** Hovering a Material card shows a tooltip with `brand · SKU · cost · lead time · tile size`. Matches existing `LibraryCard` hover pattern. No click-to-expand inline panel. Empty fields gracefully omitted.

**Dedup Semantics**
- **D-08:** Dedup on the color-map SHA-256 only. Roughness/reflection map hashes are NOT part of the dedup key. Re-upload of same color-map (even with different metadata) links to the existing Material.

**Architecture (open for plan-phase research)**
- **D-09 (open):** Whether `Material` wraps one-or-more `userTextureId` references vs. owns texture maps directly is a research-time decision. Researcher's recommendation in §"Recommendation on D-09" below.

### Claude's Discretion
- Tooltip styling, animation timing, and reduced-motion behavior — apply existing D-39 conventions from Phase 33.
- Whether the new Materials section uses a tab, collapsible group, or divider — pick what's least disruptive.
- Test-driver shape (`window.__driveMaterialUpload` etc.) — follow Phase 34 `__driveTextureUpload` precedent.
- Toast copy on dedup hit — short and consistent with existing "texture already in your library" pattern.

### Deferred Ideas (OUT OF SCOPE)
- Cost/lead time as structured numbers with filter/sort UI.
- Click-to-expand or PropertiesPanel-style Material inspector.
- Allow duplicate Materials sharing a color map (vendor variants).
- Filter/sort by metadata in the library grid.
- Applying Materials to surfaces → Phase 68.
- Linking Materials to placed products as finish slots → Phase 69.
- Sidebar Materials/Assemblies/Products top-level toggle and category sub-tabs → Phase 70.
- Snapshot serialization changes — Materials live in their own store, no `cadStore` impact.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MAT-ENGINE-01 | User uploads a Material (color/roughness/reflection texture maps + name, brand, SKU, cost, lead time, tile size) and it persists in the local library with SHA-256 dedup on the color map. Hover shows metadata. | §"Standard Stack" (idb-keyval named store mirroring Phase 32), §"Reusable Helpers" (processTextureFile, saveUserTextureWithDedup), §"Material Data Model" (concrete TS interface), §"UI Integration Plan" (collapsible section in ProductLibrary) |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

- **D-33 Icon policy:** lucide-react ONLY for new chrome icons. No new `material-symbols-outlined` imports outside the existing 10-file allowlist. Material upload modal: lucide `Upload`, `X`, `Loader2`, `Plus`, `MoreHorizontal` only (mirrors `UploadTextureModal.tsx`).
- **D-34 Spacing:** zero-arbitrary `p-[Npx]` / `m-[Npx]` / `gap-[Npx]` / `rounded-[Npx]` in `Toolbar.tsx`, `Sidebar.tsx`, `PropertiesPanel.tsx`, `RoomSettings.tsx`. ProductLibrary.tsx is NOT in the strict-zero list, but stick to canonical spacing (`p-1/2/4/6/8`, `gap-1/2/4`, `rounded-sm/md/lg`).
- **D-39 Reduced motion:** `useReducedMotion()` guard on every new animation (modal open fade, tooltip fade-in, spinner). Snap when `matches === true`.
- **Pattern #7 StrictMode-safe useEffect cleanup:** ANY new `useEffect` that writes to a module-level registry, global, or shared callback collection MUST return a cleanup function with identity-check. Phase 67 introduces a test driver (`window.__driveMaterialUpload`) — this is NOT in a useEffect (it's an `if (test mode)` install at module evaluation time, mirroring Phase 34), so the trap doesn't apply. But: if `useMaterials` ends up subscribing to `window` events (mirroring `useUserTextures.ts:78-87`), the `removeEventListener` cleanup is mandatory.
- **Test-driver pattern:** `window.__driveX` bridges live behind `import.meta.env.MODE === "test"` guards (see `useUserTextures.ts:131-134`, `UploadTextureModal.tsx:460-477`). Material gets `window.__driveMaterialUpload` and `window.__getMaterials`.
- **Tool cleanup pattern:** N/A this phase — no canvas tools added.

---

## Summary

Phase 67 is a near-mechanical mirror of the Phase 32 / Phase 34 user-texture pipeline. Every architectural piece — IDB keyspace, MIME-gated downscale, SHA-256 dedup, react hook, library card, upload modal — already exists for textures and can be cloned-with-rename for Materials. The novel surface is small:

1. **`Material` data type** with optional metadata fields (D-02..D-05) and 1+optional-2 texture-map references.
2. **`useMaterials` hook** (parallel to `useUserTextures`) over a new IDB store `room-cad-materials`.
3. **`UploadMaterialModal`** — a NEW modal (do NOT extend `UploadTextureModal`; see §"Why a new modal" below).
4. **Materials sub-section in `ProductLibrary.tsx`** as a collapsible group above the product grid.
5. **Tooltip on hover over Material cards** showing metadata.

**Primary recommendation:** Adopt the **Material-as-wrapper** architecture (D-09 RESOLVED) — Material stores `colorMapId`, `roughnessMapId?`, `reflectionMapId?` as references into the existing `userTextureIdbStore`. The color map flows through the unmodified `processTextureFile` pipeline, gets persisted as a `UserTexture`, and Material owns only the metadata + the references. This decision is load-bearing for Phase 68's apply flow (the wallpaper / floor-material renderers already consume `userTextureId` references, so Material apply lives on the same plumbing).

---

## Standard Stack

### Core (already installed, reuse verbatim)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `idb-keyval` | ^6.2.2 | Named IndexedDB store for Materials | Already powering `userTextureIdbStore` (`src/lib/userTextureStore.ts:34`); same pattern, new DB name |
| `react` | ^18.3.1 | Hook + component tree | Phase 33 design system primitives expect React 18 conventions |
| `lucide-react` | (already installed) | Modal + tooltip icons | D-33 chrome-icon mandate |
| Web Crypto (`crypto.subtle.digest`) | browser-native | SHA-256 hash | Already used in `computeSHA256` (`userTextureStore.ts:41-52`) |
| Tailwind v4 + design tokens | (already installed) | Styling | All `bg-obsidian-*`, `text-text-*`, `border-outline-*`, `font-mono` already in `src/index.css` `@theme {}` |

### Existing Helpers (import unchanged)

| Helper | Path | Purpose |
|--------|------|---------|
| `processTextureFile` | `src/lib/processTextureFile.ts:105-149` | MIME gate + 2048px downscale + JPEG re-encode + SHA-256 hash. Reuse verbatim for color/roughness/reflection maps. |
| `saveUserTextureWithDedup` | `src/lib/userTextureStore.ts:101-119` | Persist or dedup a UserTexture. Reuse verbatim for each map upload. |
| `validateInput` | `src/canvas/dimensionEditor.ts:52` | Parse `2'6"` / `0.5` / `2'` to decimal feet. Reuse for tile-size field. |
| `formatFeet` | `src/lib/geometry.ts` | Display `2.5` → `"2'6\""`. Reuse for tooltip + edit-mode prefill. |
| `useReducedMotion` | `src/hooks/useReducedMotion.ts` | D-39 motion guard. Required for tooltip + modal open. |
| `uid` | `src/lib/geometry.ts` | id generator (already used by `USER_TEXTURE_ID_PREFIX`). Use with `MATERIAL_ID_PREFIX = "mat_"`. |

### New Files (this phase creates)

| File | Purpose |
|------|---------|
| `src/types/material.ts` | `Material` interface + `MATERIAL_ID_PREFIX = "mat_"` |
| `src/lib/materialStore.ts` | Named IDB store + `saveMaterialWithDedup`, `listMaterials`, `getMaterial`, `deleteMaterial`, `findMaterialByColorSha256`, `updateMaterialMetadata` |
| `src/hooks/useMaterials.ts` | React hook (parallel to `useUserTextures`) |
| `src/components/UploadMaterialModal.tsx` | Upload + edit modal — 3 drop zones + 6 metadata fields |
| `src/components/MaterialsSection.tsx` | Collapsible "MATERIALS" group inside `ProductLibrary` (or inline render — researcher's choice; collapsible recommended) |
| `src/components/MaterialCard.tsx` | Wraps `LibraryCard` + adds hover tooltip with metadata |

### Versions (verified)

```bash
npm view idb-keyval version
# 6.2.2 (matches package.json)
```

All other dependencies already pinned in `package.json`. No new installs required.

---

## Architecture Patterns

### Recommended Project Structure (delta only)

```
src/
├── types/
│   └── material.ts                      # NEW — Material interface
├── lib/
│   └── materialStore.ts                 # NEW — IDB CRUD, SHA-256 dedup
├── hooks/
│   └── useMaterials.ts                  # NEW — React hook
├── components/
│   ├── UploadMaterialModal.tsx          # NEW
│   ├── MaterialsSection.tsx             # NEW (renders inside ProductLibrary)
│   ├── MaterialCard.tsx                 # NEW (wraps LibraryCard)
│   └── ProductLibrary.tsx               # MODIFY — host the Materials section
```

### Recommendation on D-09 — Material-as-Wrapper

**Decision:** `Material` wraps `userTextureId` references; it does NOT own texture-map blobs.

**Rationale:**

1. **Phase 68 alignment.** Phase 68 (MAT-APPLY-01) needs to apply a Material's color-map to a wall, floor, or ceiling. The existing wall/floor/ceiling renderers (`WallMesh`, `FloorMesh`, `CeilingMesh`) already consume `userTextureId` strings via `pbrTextureCache` / `floorTexture` / `ceilingMaterial` resolvers. If Material owns its own blob, Phase 68 would need a *second* texture-cache pipeline. If Material wraps `userTextureId`, Phase 68 just resolves `material.colorMapId` → existing texture cache → done.

2. **Dedup semantics fall out naturally.** D-08 says dedup on color-map SHA-256. The existing `userTextureIdbStore` already does SHA-256 dedup. If Jessica uploads the same JPEG as both a "Carrara texture" via Phase 34 AND a "Carrara material" via Phase 67, the IDB only stores ONE blob. The Material entry references the same `userTextureId`. This is the only way to get the "no duplicate IDB entry" success criterion with zero new code.

3. **Smaller blast radius.** No changes to `processTextureFile`, `userTextureStore`, or any existing renderer. Phase 67 is purely additive: a new IDB store containing tiny metadata records plus `userTextureId` strings. Each Material record is < 1KB.

4. **Phase 32 hypothesis.** REQUIREMENTS.md and CONTEXT.md both name "Material as wrapper" as the hypothesis to test. Code analysis confirms it's the right call.

**Tradeoff:** If Jessica deletes a UserTexture that a Material references, the Material becomes orphan-pointing. The existing orphan-fallback path (`userTextureOrphan.test.tsx` precedent) handles this for surfaces — Material apply in Phase 68 inherits the same fallback. For the Phase 67 library view, a Material whose `colorMapId` no longer resolves should render with a placeholder thumbnail and a one-line warning in the tooltip ("Color map missing — re-upload to restore"). Implementation: lazy-resolve the blob URL on card mount; if `getUserTexture(colorMapId)` returns `undefined`, show the warning.

### Pattern 1: Named IDB store (mirror of Phase 34)

```ts
// Source: src/lib/userTextureStore.ts:34
export const materialIdbStore = createStore("room-cad-materials", "materials");
```

Physical isolation from `room-cad-user-textures`, `room-cad-gltf-models`, and the default project store. Writes here NEVER trigger project autosave. Materials live entirely outside `cadStore`, satisfying success criterion #5.

### Pattern 2: SHA-256 dedup on color-map upload

```ts
// Pseudocode for materialStore.saveMaterialWithDedup
async function saveMaterialWithDedup(input: SaveMaterialInput): Promise<{ id: string; deduped: boolean }> {
  // 1. Process color map through existing pipeline.
  const color = await processTextureFile(input.colorFile);

  // 2. Persist (or dedup) the color UserTexture in the texture store.
  const { id: colorMapId } = await saveUserTextureWithDedup(
    { name: `${input.name} (color)`, tileSizeFt: input.tileSizeFt, blob: color.blob, mimeType: color.mimeType },
    color.sha256,
  );

  // 3. Check Material catalog for existing entry with same colorSha256 (D-08).
  const existing = await findMaterialByColorSha256(color.sha256);
  if (existing) return { id: existing.id, deduped: true };

  // 4. Process optional roughness / reflection maps (each goes through processTextureFile + saveUserTextureWithDedup independently).
  const roughnessMapId = input.roughnessFile ? await persistMap(input.roughnessFile, `${input.name} (roughness)`, input.tileSizeFt) : undefined;
  const reflectionMapId = input.reflectionFile ? await persistMap(input.reflectionFile, `${input.name} (reflection)`, input.tileSizeFt) : undefined;

  // 5. Write Material record.
  const id = `mat_${uid()}`;
  await set(id, { id, name: input.name, brand: input.brand, sku: input.sku, cost: input.cost, leadTime: input.leadTime, tileSizeFt: input.tileSizeFt, colorMapId, colorSha256: color.sha256, roughnessMapId, reflectionMapId, createdAt: Date.now() }, materialIdbStore);
  return { id, deduped: false };
}
```

### Anti-Patterns to Avoid

- **DO NOT** extend `UploadTextureModal` to handle Material mode. The modal is at 477 lines with locked UI-SPEC §1 copy strings. Adding 4 metadata fields + 2 optional drop zones + a mode switch would force every existing texture test to account for new branches. Build a new `UploadMaterialModal` and copy the patterns. Smaller blast radius, easier review.
- **DO NOT** put Materials in `cadStore`. Locked by D-09 hypothesis confirmation + success criterion #5. They're a global library, not per-project.
- **DO NOT** make roughness/reflection maps part of the dedup key. D-08 is explicit: color-map only.
- **DO NOT** use arbitrary spacing (`p-[12px]`) or non-canonical radii. Stick to `p-1/2/4/6/8`, `gap-1/2/4`, `rounded-sm/md/lg` (D-34).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image MIME gate | Ad-hoc switch on `file.type` | `processTextureFile` | Already returns `ProcessTextureError("MIME_REJECTED", "Only JPEG, PNG, and WebP are supported.")` with locked UI copy |
| Image downscale | Custom canvas resize | `processTextureFile` | Already handles `createImageBitmap` + `OffscreenCanvas` + injectable seams for happy-dom |
| SHA-256 hash | Custom Web Crypto wrapper | `computeSHA256` | Already handles ArrayBufferView/ArrayBuffer normalization |
| Feet+inches parsing | Regex from scratch | `validateInput` | Already accepts `2'`, `2'6"`, `0.5`, returns `number \| null` |
| Display feet+inches | `Math.floor` + `*12` | `formatFeet` | Already handles edge cases like `2'6"` rendering |
| IDB CRUD with dedup | Custom IndexedDB wrapper | `saveUserTextureWithDedup` + clone | The pattern works; clone with rename rather than reinvent |
| Hover tooltip | Custom positioning logic | Native HTML `title` attr OR small CSS-only tooltip | A lightweight CSS hover-revealed div positioned `absolute` over `LibraryCard` is enough for D-07's "tooltip with metadata" — no need for floating-ui or radix-tooltip |
| Modal open/close | Custom focus trap | Mirror `UploadTextureModal`'s pattern (Escape→Discard, click backdrop→Discard, no full focus trap) | Phase 34 pattern is established and accepted |
| React hook for catalog | Custom subscription | Clone `useUserTextures` pattern | Window-event bridge for cross-instance sync is already proven |

**Key insight:** Phase 67's surface area is so close to Phase 34 that the only genuinely new logic is (a) the metadata form fields and (b) the hover tooltip. Everything else is mechanical clone-with-rename.

---

## Runtime State Inventory

> Phase 67 is a greenfield additive phase (NEW IDB keyspace, NEW types, NEW components). No rename, refactor, or migration. **Skipping this section per the scope rule** — there is no pre-existing runtime state to inventory.

(Explicitly: no databases to migrate, no live service config to update, no OS-registered state, no secrets, no build artifacts to invalidate. New IDB store `room-cad-materials` is created on first write; no migration of existing data is required because Phase 67 introduces the entity.)

---

## Common Pitfalls

### Pitfall 1: ObjectURL lifecycle leak

**What goes wrong:** Material card thumbnails created via `URL.createObjectURL(blob)` accumulate forever if the cleanup is missing.
**Why it happens:** Each Material card resolves the color-map blob from IDB and creates an object URL for the `<img src>`.
**How to avoid:** Mirror `MyTexturesList.tsx:53-85` — keep a `Map<materialId, url>` ref, revoke URLs for materials no longer in the list, revoke all on unmount.
**Warning signs:** DevTools → Memory tab shows growing blob:URL count after switching projects or deleting Materials.

### Pitfall 2: Unhashed dedup race

**What goes wrong:** Two concurrent uploads of the same color JPEG both pass the `findMaterialByColorSha256` check before either has written, resulting in a duplicate.
**Why it happens:** `saveMaterialWithDedup` is async; check-then-write is not atomic in IndexedDB without a transaction.
**How to avoid:** This is the same race that exists in `saveUserTextureWithDedup` and is NOT guarded against today. For a single-user local tool with click-to-upload UX, the race window is the user's reaction time + processing time — practically impossible to hit. Document it in code comments and accept the same tradeoff as Phase 34. Don't over-engineer.
**Warning signs:** Two Materials with the same `colorSha256` in IDB. Easy to detect via a `__getMaterials()` test driver call.

### Pitfall 3: Orphan color-map after Material is created

**What goes wrong:** Jessica uploads a JPEG as a UserTexture in Phase 34's MyTexturesList, then deletes it from there. A Phase 67 Material referencing the same SHA-256 now points to a missing blob.
**Why it happens:** The texture-store `delete` API doesn't sweep references in OTHER stores.
**How to avoid:** Mirror the existing orphan-fallback pattern. On Material card mount, lazy-resolve `getUserTexture(colorMapId)`. If `undefined`, render placeholder thumbnail + tooltip warning. Same pattern proven in `userTextureOrphan.test.tsx`. Phase 68 will need to handle this for the renderer side, but Phase 67's library view is the first place a user sees the missing blob.
**Warning signs:** Card with no thumbnail and no warning copy → orphan handling missing.

### Pitfall 4: Test driver registered without StrictMode-safe cleanup

**What goes wrong:** Bug pattern from Phase 58 + Phase 64 — `useEffect` writes to a `window.__X` global without a cleanup function; React StrictMode double-mounts in dev/test, the first-mount cleanup discards a stale entry, and downstream consumers read garbage.
**Why it happens:** Test drivers are tempting to install in `useEffect`.
**How to avoid:** **DO NOT** install test drivers in `useEffect`. Install at module evaluation time behind `import.meta.env.MODE === "test"` (mirror `useUserTextures.ts:131-134` and `UploadTextureModal.tsx:460-477`). These are not effects — they run once when the module is imported, are never re-run, and don't need cleanup.
**Warning signs:** Any new `useEffect(() => { window.__driveX = ...; })` is the bug.

### Pitfall 5: Cost / lead-time string injection in tooltip

**What goes wrong:** D-04/D-05 explicitly allow free-text `"Quote on request"` style inputs. If Material metadata is ever rendered via `dangerouslySetInnerHTML`, that's an XSS vector.
**Why it happens:** Free-text fields invite "rich" rendering.
**How to avoid:** Render every metadata field as plain text (React's default `{value}` interpolation escapes by default). No `dangerouslySetInnerHTML`. Truncate long values with CSS (`truncate`, `max-w-xs`).
**Warning signs:** Reviewer sees `dangerouslySetInnerHTML` in the tooltip → fail review.

---

## Code Examples (verified patterns from existing codebase)

### Material data type

```ts
// src/types/material.ts
// Source pattern: src/types/userTexture.ts
export const MATERIAL_ID_PREFIX = "mat_";

/**
 * Phase 67 — Material entity.
 *
 * A Material is a user-curated catalog entry pairing a color texture map
 * (mandatory) and optional roughness/reflection maps with real-world metadata
 * (brand, SKU, cost, lead time, tile size). Materials live in their own IDB
 * keyspace (`room-cad-materials`) — separate from UserTextures and from
 * project snapshots. They wrap UserTexture references rather than owning
 * blobs directly (D-09 resolved: wrapper architecture).
 *
 * Dedup semantics (D-08): SHA-256 of the color map only. Re-upload of the
 * same color map returns the existing Material id even if metadata differs;
 * the user must edit the existing entry to change metadata.
 */
export interface Material {
  /** Opaque id, prefixed `mat_`. */
  id: string;
  /** Required ≤40 chars (matches UserTexture convention). */
  name: string;
  /** Real-world tile size in decimal feet. Required, parsed via validateInput. */
  tileSizeFt: number;

  /** Reference into userTextureIdbStore. Required. */
  colorMapId: string;
  /** Lowercase hex SHA-256 of the color map's downscaled JPEG bytes. D-08 dedup key. */
  colorSha256: string;
  /** Optional reference into userTextureIdbStore. */
  roughnessMapId?: string;
  /** Optional reference into userTextureIdbStore. */
  reflectionMapId?: string;

  /** Optional metadata (D-03). Free-text. */
  brand?: string;
  /** Optional metadata. Free-text. */
  sku?: string;
  /** D-04: free-text, e.g. "$5.99/sqft", "Quote on request". NOT a number. */
  cost?: string;
  /** D-05: free-text, e.g. "2-4 weeks", "In stock", "Made to order". NOT integer days. */
  leadTime?: string;

  /** Upload timestamp (Date.now()). Drives listMaterials sort order. */
  createdAt: number;
}
```

### Material store (key APIs)

```ts
// src/lib/materialStore.ts
// Source pattern: src/lib/userTextureStore.ts
import { createStore, get, set, del, values, clear } from "idb-keyval";
import { uid } from "./geometry";
import { saveUserTextureWithDedup } from "./userTextureStore";
import { processTextureFile } from "./processTextureFile";
import type { Material } from "@/types/material";
import { MATERIAL_ID_PREFIX } from "@/types/material";

export const materialIdbStore = createStore("room-cad-materials", "materials");

export interface SaveMaterialInput {
  name: string;
  tileSizeFt: number;
  brand?: string;
  sku?: string;
  cost?: string;
  leadTime?: string;
  colorFile: File;
  roughnessFile?: File;
  reflectionFile?: File;
}

export async function saveMaterialWithDedup(
  input: SaveMaterialInput,
): Promise<{ id: string; deduped: boolean }> {
  // (1) Process color map through existing pipeline.
  const color = await processTextureFile(input.colorFile);

  // (2) Persist or dedup the color UserTexture (uses existing texture-store dedup).
  const { id: colorMapId } = await saveUserTextureWithDedup(
    { name: `${input.name} (color)`, tileSizeFt: input.tileSizeFt, blob: color.blob, mimeType: color.mimeType },
    color.sha256,
  );

  // (3) Material-level dedup (D-08).
  const existing = await findMaterialByColorSha256(color.sha256);
  if (existing) return { id: existing.id, deduped: true };

  // (4) Optional maps - independent UserTextures (D-08: not part of dedup).
  const roughnessMapId = input.roughnessFile
    ? await persistOptionalMap(input.roughnessFile, `${input.name} (roughness)`, input.tileSizeFt)
    : undefined;
  const reflectionMapId = input.reflectionFile
    ? await persistOptionalMap(input.reflectionFile, `${input.name} (reflection)`, input.tileSizeFt)
    : undefined;

  // (5) Write Material record (no blob - just metadata + refs).
  const id = `${MATERIAL_ID_PREFIX}${uid()}`;
  const mat: Material = {
    id,
    name: input.name,
    tileSizeFt: input.tileSizeFt,
    colorMapId,
    colorSha256: color.sha256,
    roughnessMapId,
    reflectionMapId,
    brand: input.brand?.trim() || undefined,
    sku: input.sku?.trim() || undefined,
    cost: input.cost?.trim() || undefined,
    leadTime: input.leadTime?.trim() || undefined,
    createdAt: Date.now(),
  };
  await set(id, mat, materialIdbStore);
  return { id, deduped: false };
}

async function persistOptionalMap(file: File, name: string, tileSizeFt: number): Promise<string> {
  const result = await processTextureFile(file);
  const { id } = await saveUserTextureWithDedup(
    { name, tileSizeFt, blob: result.blob, mimeType: result.mimeType },
    result.sha256,
  );
  return id;
}

export async function listMaterials(): Promise<Material[]> {
  const all = (await values(materialIdbStore)) as Material[];
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function findMaterialByColorSha256(sha256: string): Promise<Material | undefined> {
  const all = await listMaterials();
  return all.find((m) => m.colorSha256 === sha256);
}

export async function getMaterial(id: string): Promise<Material | undefined> {
  return get<Material>(id, materialIdbStore);
}

export async function deleteMaterial(id: string): Promise<void> {
  await del(id, materialIdbStore);
}

export async function updateMaterialMetadata(
  id: string,
  changes: Partial<Pick<Material, "name" | "tileSizeFt" | "brand" | "sku" | "cost" | "leadTime">>,
): Promise<void> {
  const existing = await getMaterial(id);
  if (!existing) return;
  await set(id, { ...existing, ...changes }, materialIdbStore);
}

export async function clearAllMaterials(): Promise<void> {
  await clear(materialIdbStore);
}
```

### useMaterials hook (mirror of useUserTextures)

Same shape as `src/hooks/useUserTextures.ts:50-126`: window-event bridge for cross-instance sync, `loading` flag, `save` / `update` / `remove` / `reload`. Test driver `window.__getMaterials = listMaterials` installed at module-level behind `import.meta.env.MODE === "test"` guard.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Materials = paint colors only (Phase 18) | Material as a real entity with PBR maps + metadata | v1.17 (Phase 67–70) | First milestone since v1.2 to introduce a new core data system |
| Texture upload tied to per-surface picker | Upload-first flow via library | Phase 34 | Already established; Phase 67 inherits |
| Per-surface tile-size override (Phase 66) | `Material.tileSizeFt` becomes the default; per-surface override remains | v1.16 / v1.17 | Phase 68 will apply Material.tileSizeFt as default; existing per-surface override still wins |

**Deprecated/outdated:** None. Phase 67 is purely additive.

---

## Open Questions

1. **Should the Materials section be a collapsible group, a tab, or always-expanded?**
   - What we know: D-06 picks ProductLibrary as the host; CONTEXT.md says "tab, collapsible group, or divider — pick what's least disruptive."
   - What's unclear: ProductLibrary's current layout has CategoryTabs at the top for product categories. Adding a parallel set of Materials tabs would clutter the header. A vertically-stacked collapsible section above the products grid feels least disruptive — header → "MATERIALS (count)" expand/collapse → grid → divider → "PRODUCTS" header → existing tabs + grid.
   - Recommendation: **Collapsible section** with `MATERIALS` heading and `+ UPLOAD MATERIAL` button on the right of the heading. Use the existing `CollapsibleSection` primitive from Phase 33 if appropriate; otherwise inline the open/close state. Phase 70 will lift this up to a top-level toggle, so keep the implementation easy to extract.

2. **Should the Material card thumbnail show ONLY the color map, or composite color+roughness?**
   - What we know: Phase 67 is foundation; Phase 68 does the actual rendering.
   - What's unclear: Showing color map alone is simplest and matches `UserTexture` cards in `MyTexturesList`. Composite previews would require WebGL.
   - Recommendation: **Color map only.** Matches existing pattern, zero new code. Phase 45's auto-swatch generator (`gltfThumbnailGenerator`) is a precedent for richer compositing if Jessica asks for it later.

3. **Does the upload modal show a "Material already in your library" toast on dedup hit, or silently link?**
   - What we know: D-08 says dedup; existing UserTexture flow is silent (just returns existing id).
   - What's unclear: A different UX for Materials vs. Textures could feel inconsistent.
   - Recommendation: **Match existing pattern.** Toast `"Material already in your library."` (free decision per discretion area). Drop the toast in the Phase 34 toast shim location (`UploadMaterialModal.tsx` — `toastSuccess` helper).

4. **Tooltip positioning when Material card is at the bottom of the visible viewport?**
   - What we know: A simple absolute-positioned tooltip below the card will clip when the card is near the viewport bottom.
   - What's unclear: Do we need floating-ui to auto-flip?
   - Recommendation: **Use a CSS-only solution** — tooltip positioned ABOVE the card by default (since cards live in a scrollable list, the bottom edge of the modal/sidebar usually has more room above each card than below). If clipping becomes a real complaint, add `floating-ui/react` in a follow-up phase. Don't pull in a new dep for Phase 67.

---

## Environment Availability

> Phase 67 has no external dependencies beyond what's already installed. Skipping classification — all deps confirmed in `package.json`.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| idb-keyval | New material IDB store | ✓ | ^6.2.2 | — |
| react | Hooks + components | ✓ | ^18.3.1 | — |
| lucide-react | Modal + tooltip icons | ✓ | (installed) | — |
| Web Crypto subtle | SHA-256 (already used) | ✓ | browser-native | — |
| OffscreenCanvas + createImageBitmap | downscale (already used) | ✓ | browser-native | injectable test seam already exists |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest (run via `npm run test`) + Playwright (`npm run test:e2e`) |
| Config files | `vitest.config.ts`, `playwright.config.ts` |
| Quick run command | `npm run test:quick` (vitest reporter=dot) |
| Full suite command | `npm run test` then `npm run test:e2e` |
| Test directories | `tests/` (vitest unit + integration), `tests/e2e/` (Playwright) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MAT-ENGINE-01 (success-1: upload form fields) | Form renders 1 required + 2 optional drop zones; name + tile-size required; brand/sku/cost/leadTime optional | unit (component) | `npx vitest run tests/uploadMaterialModal.test.tsx -x` | ❌ Wave 0 |
| MAT-ENGINE-01 (success-2: persist across reload) | `saveMaterialWithDedup` writes to IDB; `listMaterials` returns it after re-import | unit (integration) | `npx vitest run tests/materialStore.test.ts -x` | ❌ Wave 0 |
| MAT-ENGINE-01 (success-3: SHA-256 dedup) | Re-uploading same color JPEG returns existing Material id, no duplicate row | unit (integration) | `npx vitest run tests/materialStore.test.ts -t "dedup" -x` | ❌ Wave 0 |
| MAT-ENGINE-01 (success-4: hover metadata tooltip) | MaterialCard shows tooltip with brand/sku/cost/leadTime/tileSize on hover | unit (component) | `npx vitest run tests/materialCard.test.tsx -x` | ❌ Wave 0 |
| MAT-ENGINE-01 (success-5: separate store) | Material writes don't trigger project autosave; project save/load doesn't touch material store | unit (integration) | `npx vitest run tests/materialStore.isolation.test.ts -x` | ❌ Wave 0 |
| End-to-end upload flow | User opens library, clicks "Upload Material," fills form, saves, sees card | e2e | `npx playwright test tests/e2e/material-upload.spec.ts` | ❌ Wave 0 |
| Test-driver bridge | `window.__driveMaterialUpload(file, metadata)` runs full pipeline | integration | covered by `materialStore.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run test:quick` (vitest dot reporter, ~30s)
- **Per wave merge:** `npm run test` (full vitest suite)
- **Phase gate:** Full vitest + Playwright e2e green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/materialStore.test.ts` — covers MAT-ENGINE-01 success criteria 2, 3, 5 (CRUD + dedup + isolation from project autosave)
- [ ] `tests/uploadMaterialModal.test.tsx` — form validation, MIME error, tile-size error, optional-field handling
- [ ] `tests/materialCard.test.tsx` — hover tooltip renders metadata correctly; empty fields gracefully omitted
- [ ] `tests/useMaterials.test.tsx` — hook lifecycle, cross-instance sync via window events, StrictMode-safe (mount+unmount+remount in StrictMode does not duplicate state)
- [ ] `tests/materialStore.isolation.test.ts` — write to material store does NOT fire project autosave events; project save/load does NOT mutate material store
- [ ] `tests/e2e/material-upload.spec.ts` — Playwright: upload → reload → see persisted Material; re-upload same JPEG → see "already in library" path
- [ ] **Test-driver registration:** `window.__driveMaterialUpload` and `window.__getMaterials` (gated by `import.meta.env.MODE === "test"`) — installed at module-level in `useMaterials.ts` and `UploadMaterialModal.tsx`, mirroring Phase 34. Used by integration tests to bypass file-input event simulation.

**Why each test type:**
- **Unit (store):** Validates the IDB CRUD + SHA-256 dedup contract independently of UI. Cheapest signal.
- **Unit (modal):** Validates form behavior — required vs. optional fields, error states, locked copy strings.
- **Unit (card + hook):** Validates rendering + cross-instance sync.
- **Isolation test:** Specifically guards against accidentally putting Materials in `cadStore` or wiring autosave triggers (success criterion #5).
- **e2e:** Validates the full user flow including IndexedDB persistence across page reloads (the only way to truly test #2).

---

## Sources

### Primary (HIGH confidence — direct code reads)

- `src/lib/userTextureStore.ts` — IDB store + dedup pattern (mirror target)
- `src/lib/processTextureFile.ts` — MIME gate + downscale + SHA-256 (reuse verbatim)
- `src/types/userTexture.ts` — type interface pattern (mirror)
- `src/hooks/useUserTextures.ts` — React hook + window-event sync + test-driver pattern (mirror)
- `src/components/UploadTextureModal.tsx` — modal pattern + locked copy + reduced-motion + test-driver bridge (mirror, NOT extend)
- `src/components/MyTexturesList.tsx` — grid + upload tile + ⋮ menu + ObjectURL lifecycle (mirror)
- `src/components/library/LibraryCard.tsx` — base card primitive (use for MaterialCard)
- `src/components/library/CategoryTabs.tsx` — tabs primitive (may use for Materials category sub-tabs in Phase 70)
- `src/components/ProductLibrary.tsx` — host component for Materials section
- `src/App.tsx:232` — ProductLibrary instantiation site
- `.planning/phases/67-material-engine-foundation-mat-engine-01/67-CONTEXT.md` — locked decisions D-01 through D-08
- `.planning/REQUIREMENTS.md` (worktree) — MAT-ENGINE-01 specification
- `.planning/ROADMAP.md` (worktree) — v1.17 milestone phasing rationale
- `CLAUDE.md` — Pattern #7 StrictMode-safe useEffect cleanup; D-33/D-34/D-39 design system

### Secondary (MEDIUM confidence — inferred from convention)

- Phase 34 SUMMARY.md and PLAN.md (referenced via CONTEXT.md canonical_refs) — confirm the "wrapper" pattern was the predecessor architecture for textures alone
- Phase 58 + Phase 64 fix history (referenced in CLAUDE.md Pattern #7) — confirm StrictMode trap is a recurring class

### Tertiary (LOW confidence — none)

No claims rely on training data or unverified web sources. Every recommendation traces to a specific file path and line range.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every helper, hook, and component already exists and is in active use
- Architecture (D-09 wrapper): HIGH — direct code analysis of `WallMesh`, `pbrTextureCache`, and `floorTexture` consumer pattern confirms `userTextureId` references are the established surface contract
- Pitfalls: HIGH — three of five pitfalls are documented bugs from Phase 58, 34, and 64
- UI integration: MEDIUM — recommendation is "collapsible section" but final layout choice was left to Claude's discretion per CONTEXT.md
- Validation architecture: HIGH — test infrastructure already exists with parallel tests for the texture pipeline (`tests/userTextureStore.test.ts`, `tests/uploadTextureModal.test.tsx`, `tests/myTexturesList.test.tsx`)

**Research date:** 2026-05-06
**Valid until:** Phase 68 begins (decisions made here propagate forward; D-09 wrapper architecture in particular is load-bearing for Phase 68's apply flow)
