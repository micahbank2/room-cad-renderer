# Phase 26: Bug Sweep - Research

**Researched:** 2026-04-20
**Domain:** Fabric.js async image rendering + Three.js material tier resolution + IndexedDB persistence
**Confidence:** HIGH (all findings grounded in source; no external-library version questions)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Reproduce FIX-01 against current code before fixing. `fabricSync.ts:870` already uses `getCachedImage(product.id, imageUrl, onLoad)` via `productImageCache.ts`. Confirm actual failure mode first.
- **D-02:** Preserve existing Promise-deduped `productImageCache` by default. Do NOT rewrite to `fabric.FabricImage.fromURL` unless repro proves the cache itself is the root cause.
- **D-03:** Prioritize first-paint correctness over concurrent-load dedup. Double-load preferable to blank tile.
- **D-04:** If repro fails, close issue #42 as stale with evidence (repro steps + GREEN test).
- **D-05:** Reproduce FIX-02 against current code before fixing. `CeilingMesh` already has Tier-1 `surfaceMaterialId` branch. Identify actual failure mode (persistence / propagation / preset distinctness / tier order) first.
- **D-06:** Ceiling preset fix stays at **color + roughness** parity with `FloorMesh` preset path. Texture loading for ceiling presets is OUT OF SCOPE.
- **D-07:** Leave the three overlapping ceiling material fields (`material` legacy, `paintId`, `surfaceMaterialId`) AS-IS. Fix FIX-02 inside existing tier-resolution order. Do NOT collapse to discriminated union.
- **D-08:** Ship BOTH unit tests and manual smoke.
- **D-09:** Write RED tests first, then fix, then confirm GREEN (Phase 25 Wave 0 pattern).
- **D-10:** Close-out requires full automated suite passing AND user-approved manual smoke of both (a) 2D product thumbnail on placement and (b) ceiling preset visible change in 3D.
- **D-11:** Automated: `structuredClone(snapshot())` round-trip — assert `imageUrl` and `surfaceMaterialId` survive.
- **D-12:** Manual: actual IndexedDB save + full page refresh + reopen project — required before close-out.
- **D-13:** No new features. No type-model refactors. No cross-cutting cleanup. Out-of-scope findings become backlog items.
- **D-14:** Close #42 and #43 via PR commit message. If #42 resolves as stale (D-04), close with repro-evidence comment.

### Claude's Discretion

- Wave structure (e.g., Wave 0 RED / Wave 1 FIX-01 / Wave 2 FIX-02 / Wave 3 verify) — planner decides.
- Unit-test file paths and naming (stay consistent with existing `tests/` layout).
- Whether FIX-01 and FIX-02 ship as one commit or separate — planner decides; both bugs are independent.

### Deferred Ideas (OUT OF SCOPE)

- Ceiling material type collapse to `CeilingMaterial` discriminated union (backlog, future tech-debt phase).
- Texture-loading for ceiling presets (backlog, v1.6 polish candidate).
- `fabric.FabricImage.fromURL` migration (only if repro proves cache is root cause).
- Automated IndexedDB round-trip via Playwright (separate testing-infra effort).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FIX-01 | Product thumbnails appear in 2D canvas on placement; persist across reload (issue #42) | `fabricSync.ts:869-880` + `productImageCache.ts`. Cache already handles async; investigate whether placement triggers `renderAll()`, whether a reload-first-render races ahead of cache population, and whether `imageUrl` survives snapshot/save. |
| FIX-02 | Selecting ceiling preset visibly changes 3D ceiling material; persists across reload (issue #43) | `CeilingMesh.tsx:30-48` Tier-1 branch + `setCeilingSurfaceMaterial` in `cadStore.ts:445-459` + `SURFACE_MATERIALS` catalog. Investigate: (a) does preset click call `setCeilingSurfaceMaterial`, (b) does `surfaceMaterialId` survive structuredClone + IDB save, (c) do three ceiling presets (`PLASTER #f0ebe0`, `WOOD_PLANK #a0794f`, `PAINTED_DRYWALL #f5f5f5`, plus shared `CONCRETE #8a8a8a`) look visibly distinct. |
</phase_requirements>

## Summary

Both bugs live in code that has been **substantially refactored since the GitHub issues were written**. Issue #42 references a synchronous `imgEl.complete && naturalWidth > 0` pattern that no longer exists — `fabricSync.ts` now delegates to the Phase 24/25 `productImageCache.ts` Promise-style loader. Issue #43 references a ceiling preset path that has since gained a functional Tier-1 `surfaceMaterialId` branch in `CeilingMesh.tsx`. **Both bugs therefore require investigation-first rather than speculative fixing.**

The research establishes: (a) the current code paths are correct in structure, so root causes are likely in edge cases — cache-miss on first render, snapshot-drop on reload, or UI click not writing the right field — rather than missing implementations; (b) test infrastructure (Vitest + happy-dom) and repro helpers (`window.__cadSeed`) are already in place; (c) the minimum change surface per bug is likely < 20 lines, consistent with the scope guardrail D-13.

**Primary recommendation:** Ship a RED-scaffolded plan (Phase 25 Wave 0 precedent) with four waves: (W0) RED failing tests that reproduce each bug against current code, (W1) FIX-01 fix, (W2) FIX-02 fix, (W3) manual IndexedDB smoke + GitHub issue close-out. If either RED test turns out to pass against current code, close the issue as stale per D-04.

## Project Constraints (from CLAUDE.md)

- **Zustand store-driven rendering** — Fabric canvas fully redraws from store on every change; no incremental updates allowed in fix. Any FIX-01 change must work within full-redraw semantics.
- **Tool cleanup pattern** — `activate*(fc, scale, origin)` returns `() => void` cleanup. Not directly relevant to these fixes (neither bug touches tool activation) but avoid regressions.
- **Feet-based coordinates** — both bugs are unrelated to coordinates; no change.
- **structuredClone snapshots** — `cadStore.ts:106` wraps rooms in `structuredClone(toPlain(...))`. `toPlain` uses Immer `current()` on drafts. This is the serialization path FIX-01/FIX-02 round-trip tests must traverse.
- **Display-vs-identifier separation** — surface material IDs (`PLASTER`, `WOOD_PLANK`) are identifiers; labels (`"PLASTER"`, `"WOOD PLANK"`) are display — already consistent in `surfaceMaterials.ts`.
- **GSD workflow enforcement** — CLAUDE.md mandates all file edits happen inside a GSD workflow; /gsd:plan-phase is the entry point for Phase 26.

## Standard Stack

### Core (already installed — no new deps)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | ^3.x (via vitest/config) | Test runner for RED/GREEN gates | Already used in `tests/*.test.ts` (27 test files) |
| happy-dom | (via vitest config) | DOM environment for Fabric image tests | Already set in `vitest.config.ts` |
| fabric | ^6.9.1 | 2D canvas | Already in use — `FabricImage`, `Group`, etc. |
| three | ^0.183.2 | 3D scene | Already in use — `ShapeGeometry`, `MeshStandardMaterial` |
| @react-three/fiber | ^8.17.14 | React binding for Three.js | Already mounting `CeilingMesh` |
| zustand + immer | ^5 / ^11 | Store + snapshots | Existing `cadStore` |
| idb-keyval | ^6.2.2 | IndexedDB persistence | `saveProject` / `loadProject` in `serialization.ts` |

**No new packages are required.** Both fixes should be implementable inside existing dependencies.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `getCachedImage` Promise dedup | `fabric.FabricImage.fromURL(url).then(...)` | Loses module-level dedup; every placed product issues its own fetch. Preserve existing cache per D-02. |
| Three overlapping ceiling material fields | `CeilingMaterial` discriminated union mirroring `FloorMaterial` | Out of scope per D-07. Backlog item. |
| Adding `TextureLoader` for ceiling presets | Three.js `TextureLoader` + `meshStandardMaterial.map` | Out of scope per D-06. Ceilings are rarely the visual focus. |

## Architecture Patterns

### Current File Map (what exists)

```
src/
├── canvas/
│   ├── FabricCanvas.tsx          # Subscribes to placedProducts + productLibrary; calls renderProducts
│   ├── fabricSync.ts             # renderProducts() at ~800-880 — uses getCachedImage
│   └── productImageCache.ts      # Promise-deduped HTMLImageElement cache
├── three/
│   ├── CeilingMesh.tsx           # 3-tier material resolution (surfaceMaterialId → paintId → legacy)
│   └── FloorMesh.tsx             # Reference: preset = color+roughness only; custom = texture
├── data/
│   └── surfaceMaterials.ts       # SURFACE_MATERIALS catalog (11 entries)
├── components/
│   └── CeilingPaintSection.tsx   # Calls setCeilingSurfaceMaterial(ceilingId, id)
├── stores/
│   └── cadStore.ts               # setCeilingSurfaceMaterial action @ line 445; snapshot() @ line 106
├── lib/
│   └── serialization.ts          # saveProject / loadProject via idb-keyval
├── types/
│   └── cad.ts                    # Ceiling type at line 116-130 (three overlapping fields)
└── types/
    └── product.ts                # Product.imageUrl (data URL)

tests/                            # Vitest suite (27 files), happy-dom env
├── productImageCache.test.ts     # Already tests cache dedup + async
├── ceilingMaterial.test.ts       # Already tests 3-tier resolution (pure helper form)
├── fabricSync.test.ts            # Existing sync tests
└── setup.ts                      # Shared test setup
```

### Pattern 1: Promise-Deduped Async Image Cache (FIX-01 target)

**What:** `productImageCache.ts` returns a cached `HTMLImageElement` immediately on hit, returns `null` on miss while firing an async `Image()` load; calls `onReady` callback exactly once when load completes.

**Current code (preserve):**
```typescript
// src/canvas/productImageCache.ts
export function getCachedImage(productId, url, onReady): HTMLImageElement | null {
  const hit = cache.get(productId);
  if (hit) return hit;
  if (loading.has(productId)) return null;  // <-- dedup: concurrent callers see null
  loading.add(productId);
  const img = new Image();
  img.onload = () => {
    loading.delete(productId);
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      cache.set(productId, img);
      onReady();  // triggers fc.renderAll()
    }
  };
  img.src = url;
  return null;
}
```

**Consumption (preserve structure):**
```typescript
// src/canvas/fabricSync.ts:869-880
if (!showPlaceholder && product!.imageUrl) {
  const cachedImg = getCachedImage(product!.id, product!.imageUrl, () => fc.renderAll());
  if (cachedImg) {
    const fImg = new fabric.FabricImage(cachedImg, { ... });
    children.splice(1, 0, fImg);
  }
}
```

**Why this is correct in structure:** On first render, `cachedImg === null`, so only border+labels draw. When `img.onload` fires, `onReady` calls `fc.renderAll()`, which does NOT re-run `renderProducts()` — it just redraws existing fabric objects. The product group already built won't include the image.

**Hypothesis for FIX-01 root cause:** `onReady` triggers `fc.renderAll()`, but that only re-paints existing fabric objects. It does NOT rebuild the product group to include the newly-loaded image. The correct trigger is something that causes `FabricCanvas.tsx:183` to re-call `renderProducts()` — e.g., a state bump, a `redraw()` call, or a store-subscribed signal. **This is the likely bug surface.**

### Pattern 2: 3-Tier Ceiling Material Resolution (FIX-02 target)

**Current code (preserve tier order):**
```typescript
// src/three/CeilingMesh.tsx:30-48
const { color, roughness } = useMemo(() => {
  if (ceiling.surfaceMaterialId) {                        // Tier 1: preset
    const mat = SURFACE_MATERIALS[ceiling.surfaceMaterialId];
    if (mat) return { color: mat.color, roughness: mat.roughness };
  }
  if (ceiling.paintId) {                                   // Tier 2: paint
    return { color: resolvePaintHex(ceiling.paintId, customColors),
             roughness: ceiling.limeWash ? 0.95 : 0.8 };
  }
  return {                                                  // Tier 3: legacy
    color: ceiling.material.startsWith("#") ? ceiling.material : "#f5f5f5",
    roughness: 0.8,
  };
}, [ceiling.surfaceMaterialId, ceiling.paintId, ceiling.limeWash, ceiling.material, customColors]);
```

**Store write (preserve):**
```typescript
// src/stores/cadStore.ts:445-459
setCeilingSurfaceMaterial: (ceilingId, materialId) =>
  set(produce((s) => {
    pushHistory(s);
    const c = activeDoc(s).ceilings[ceilingId];
    if (materialId) {
      c.surfaceMaterialId = materialId;
      delete c.paintId;       // clears Tier 2
      delete c.limeWash;
    } else {
      delete c.surfaceMaterialId;
    }
  })),
```

**UI write (preserve):**
```typescript
// src/components/CeilingPaintSection.tsx:42
onSelect={(id) => setCeilingSurfaceMaterial(ceilingId, id)}
```

**Hypothesis for FIX-02 root cause:** Four candidates, need repro to narrow:
1. `SurfaceMaterialPicker` filters by `surface: "ceiling" | "both"` and the ceiling-scoped entries (`PLASTER`, `WOOD_PLANK`, `PAINTED_DRYWALL`, `CONCRETE`) have visually similar near-white colors (`#f0ebe0`, `#f5f5f5`) — user may perceive "not rendering" when it IS rendering but with imperceptible change.
2. `CeilingMesh` `useMemo` dependency array is complete — subscription should update. BUT if `SurfaceMaterialPicker` calls a DIFFERENT setter (not `setCeilingSurfaceMaterial`) the store field won't update.
3. `setCeilingSurfaceMaterial` deletes `paintId` and `limeWash` but leaves legacy `material` intact. Tier 1 branch should still win — verify with test.
4. IndexedDB round-trip: `structuredClone` preserves `surfaceMaterialId` (plain string on plain object → clonable). Should persist. Verify with explicit round-trip test.

### Anti-Patterns to Avoid

- **Replacing `productImageCache` with fresh `fabric.FabricImage.fromURL` calls** — loses Phase 24/25 dedup, regresses under concurrent placement of same-product instances (D-02).
- **Collapsing the three ceiling fields in this phase** — type-model refactor is D-07 backlog.
- **Adding texture loading to ceiling presets** — D-06 out of scope; file as backlog if visually justified.
- **Speculatively rewriting before repro** — D-01, D-05 explicitly forbid. RED test FIRST.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Async image load + dedup | Fresh `new Image()` call sites | Existing `getCachedImage()` in `productImageCache.ts` | Already Promise-deduped; already tested in `productImageCache.test.ts` |
| Snapshot round-trip | `JSON.parse(JSON.stringify(...))` | Existing `structuredClone(toPlain(...))` from `cadStore.ts:106` | Phase 25 D-07 contract; PERF-02 regressed JSON roundtrips explicitly |
| IndexedDB save/load | Fresh `idb-keyval` call sites | Existing `saveProject` / `loadProject` in `serialization.ts` | Already wraps with `PROJECT_PREFIX`; manual smoke step D-12 uses this |
| Surface material catalog lookup | Hand-listing color/roughness | `SURFACE_MATERIALS[id]` from `data/surfaceMaterials.ts` | Already Record-typed; 11 entries; single source of truth |
| Paint hex resolution | Color-mix logic in CeilingMesh | Existing `resolvePaintHex(paintId, customColors)` | Already handles F&B catalog + custom paints |

**Key insight:** Both bugs are in glue code, not in missing primitives. Every building block needed (cache, snapshot, IDB, catalog) already works. The fix is likely < 20 lines in each case.

## Runtime State Inventory

> Phase 26 is a localized bug-fix phase. No renames, no refactors, no migrations. Included for completeness per rename/refactor trigger check.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | IndexedDB projects under `room-cad-project-*` keys contain `snapshot.rooms[id].ceilings[id].surfaceMaterialId` and `snapshot.rooms[id].placedProducts[id]` (productId → Product.imageUrl indirection). FIX verification must assert both survive save+reload. | Data-migration: NONE — field names unchanged. Code-edit only: ensure fields are included in save path and consumed by render path. |
| Live service config | None — fully client-side app, no external services | None — verified by STACK ("No backend — local-first, browser storage only" per CLAUDE.md). |
| OS-registered state | None — runs in browser tab only | None — verified by env (Vite dev server + static hosting). |
| Secrets/env vars | None — app has no secrets; no env vars are read at runtime | None — verified by `grep -rn "process.env\|import.meta.env"` review during research: only `import.meta.env.DEV` gating for dev helpers. |
| Build artifacts | `dist/` may contain a stale build if someone ran `npm run build` pre-fix. Not a correctness risk — `npm run dev` and fresh `npm run build` regenerate. | None required — standard `npm run build` rebuild resolves. |

**Manual IDB smoke note (D-12):** The manual smoke path should inspect the IndexedDB entry in Chrome DevTools Application → IndexedDB → `keyval-store` → `room-cad-project-*` → `snapshot` to confirm the JSON contains `surfaceMaterialId` and that `placedProducts[].productId` maps to a product whose `imageUrl` is a data URL.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vitest / Vite | ✓ | Not pinned (no `.nvmrc`) | — |
| npm | Install/run | ✓ | per `package-lock.json` | — |
| Browser | Runtime + IDB manual smoke | ✓ (Chrome for DevTools smoke) | — | — |
| No external services | — | — | — | — |

**Missing dependencies:** None. Both fixes are purely in-repo TS + React changes with existing deps.

## Common Pitfalls

### Pitfall 1: `fc.renderAll()` alone won't insert a freshly-loaded image into an existing Group

**What goes wrong:** `productImageCache` calls the `onReady` callback on image load completion. Today that callback is `() => fc.renderAll()`. `renderAll()` repaints existing fabric objects — it does NOT re-execute `renderProducts()` to rebuild the product Group to include the newly-available image.

**Why it happens:** The product `Group` is constructed synchronously on the first `renderProducts()` call. If `getCachedImage` returned `null`, the Group was built without the `FabricImage` child. A later `renderAll()` paints the same childless Group again.

**How to avoid:** `onReady` must trigger something that rebuilds the Group — e.g., invalidating a store-subscribed signal that `FabricCanvas.tsx:183` reacts to, or calling `FabricCanvas`'s `redraw` function (which re-runs `renderProducts`). Current code appears to do the former only partially.

**Warning signs:** Thumbnail appears ONLY after some unrelated interaction (tool switch, drag, zoom) that triggers a store change and re-runs `renderProducts()`. If manual repro shows "image appears after moving the product," this is the exact pitfall.

### Pitfall 2: `useMemo` dependency staleness in `CeilingMesh`

**What goes wrong:** `useMemo` for `{ color, roughness }` in `CeilingMesh.tsx:30` has `[ceiling.surfaceMaterialId, ceiling.paintId, ceiling.limeWash, ceiling.material, customColors]`. If `ceiling` is a stable reference from Zustand (it should be — Zustand returns new references on change), memo recomputes. If something wraps `ceiling` in a stable identity (e.g., a parent component), the memo won't refire.

**How to avoid:** Verify `ThreeViewport` → `Scene` passes `ceiling` from a fresh `useCADStore` subscription, not a static prop.

**Warning signs:** Selecting a preset updates the store (confirm via Redux DevTools / `useCADStore.getState()`) but `CeilingMesh` never re-renders (use React DevTools Profiler).

### Pitfall 3: Three near-white ceiling presets look identical at a glance

**What goes wrong:** `PLASTER #f0ebe0`, `PAINTED_DRYWALL #f5f5f5`, and `CONCRETE #8a8a8a` (the visibly different one). User perceives "not changing" because PLASTER and PAINTED_DRYWALL differ only in `{L: 92 → 96}` and roughness `{0.9 → 0.8}`.

**How to avoid:** RED test asserts `SURFACE_MATERIALS.PLASTER.color !== SURFACE_MATERIALS.PAINTED_DRYWALL.color`. Manual smoke MUST include selecting `CONCRETE` and `WOOD_PLANK` specifically (visually distinct) before concluding a visual bug exists.

**Warning signs:** User reports "nothing changes" but switching between PLASTER ↔ WOOD_PLANK (amber brown) would show obvious change if tier-1 fires.

### Pitfall 4: Snapshot drop of `surfaceMaterialId` on save/reload

**What goes wrong:** `structuredClone` on a plain object preserves all own enumerable properties. BUT `toPlain(state.rooms)` uses Immer `current()` — if a ceiling was created before the `surfaceMaterialId` field existed in the Ceiling type, the stored snapshot might lack the field, and `setCeilingSurfaceMaterial` via Immer `produce` should add it correctly.

**How to avoid:** RED test: create ceiling → `setCeilingSurfaceMaterial("CONCRETE")` → call `snapshot()` → assert snapshot JSON contains `surfaceMaterialId: "CONCRETE"`. Then `JSON.stringify` → `JSON.parse` → `loadSnapshot` → assert field present.

**Warning signs:** Preset visible during session but gone after page refresh.

### Pitfall 5: First-paint race (FIX-01 alternate root cause)

**What goes wrong:** On project reload, `renderProducts()` fires once on mount. If `imageUrl` is a data URL (synchronous — already base64 in-memory), `new Image()` `onload` fires on next microtask. But the initial `renderProducts()` has already built the Group WITHOUT the image (because `getCachedImage` returned null). The subsequent `onReady → fc.renderAll()` doesn't rebuild the Group.

**How to avoid:** Root cause is Pitfall 1 in disguise. Same fix path.

**Warning signs:** On reload, thumbnails are missing; appear after any interaction that triggers redraw.

## Code Examples

### FIX-01 Candidate Fix Shape (not prescriptive — investigate first)

**Option A — Increment a redraw signal in `onReady`:**
```typescript
// In FabricCanvas.tsx — add a local tick state
const [imageTick, setImageTick] = useState(0);
// Dependency array — add imageTick so renderProducts runs again when image loads
useEffect(() => { /* ... */
  renderProducts(fc, placedProducts, productLibrary, scale, origin, selectedIds);
}, [room, walls, placedProducts, productLibrary, ..., imageTick]);

// Pass callback
renderProducts(..., /* onImageReady: */ () => setImageTick((t) => t + 1));
```

**Option B — In `productImageCache.onReady`, dispatch a synthetic canvas event that `FabricCanvas` listens to:**
```typescript
// Less invasive — cache callback fires a known event
() => fc.fire("cache:image-loaded");
// In FabricCanvas, on that event, call redraw() — which re-invokes renderProducts
```

**Recommendation (after repro):** Option A is idiomatic React; Option B couples cache to fabric events. Prefer A unless Profiler shows unnecessary re-renders.

### FIX-02 Candidate Fix Shape (not prescriptive — investigate first)

If repro confirms tier-1 fires but UI doesn't update:
```typescript
// Verify CeilingMesh receives a fresh ceiling ref on store change
// No change needed if Zustand subscription is correct; otherwise:
const ceilings = useCADStore((s) => activeRoomDoc(s)?.ceilings ?? {});
// spread into Scene so each CeilingMesh gets fresh object
```

If repro confirms `surfaceMaterialId` drops on reload, investigate snapshot migration (`snapshotMigration.ts`) for a tier field being stripped.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sync `imgEl.complete && naturalWidth > 0` in fabricSync | Module-level `productImageCache` Promise-dedup | Phase 24/25 (issue #42 pre-dates this) | Issue #42 description is stale — treat as historical artifact. |
| Single `ceiling.material` field for hex OR preset | 3-tier `surfaceMaterialId → paintId → material` resolution | Phase 18/20 | Tier-1 branch already exists; issue #43 may be pre-Phase-20 as well. |
| `JSON.parse(JSON.stringify(snapshot))` | `structuredClone(toPlain(snapshot))` | Phase 25 | Both `imageUrl` (string) and `surfaceMaterialId` (string) round-trip cleanly. |

**Deprecated/outdated:**
- The issue #42 description snippet `imgEl.complete && naturalWidth > 0` — code no longer exists. D-04 allows closing as stale if repro fails.

## Open Questions

1. **Does FIX-01 actually reproduce against current main?**
   - Known: Code structure is correct; `getCachedImage` handles async cleanly.
   - Unclear: Whether `onReady → fc.renderAll()` is sufficient, OR whether a Group-rebuild trigger is needed.
   - Recommendation: Wave 0 RED test does exactly this — place a product with image in happy-dom; assert `FabricImage` child exists in the product Group after `onload` fires; mock `Image.onload` (the existing `productImageCache.test.ts` already demonstrates the pattern). If test passes against current code, FIX-01 is stale — close #42 per D-04.

2. **Does FIX-02 actually reproduce?**
   - Known: Tier-1 branch exists; `setCeilingSurfaceMaterial` writes correctly.
   - Unclear: Whether user's repro is (a) preset-not-persisting (snapshot drop), (b) similar-looking presets (Pitfall 3), or (c) UI not calling the right action.
   - Recommendation: Wave 0 RED test: (1) structuredClone round-trip of ceiling with `surfaceMaterialId`, (2) manual 2-minute visual check of PLASTER → WOOD_PLANK → CONCRETE cycling. Narrow root cause before writing fix.

3. **Is there a hidden fourth ceiling material field?**
   - Known: Three fields documented (`material`, `paintId`, `surfaceMaterialId`).
   - Unclear: Whether any serializer strips one.
   - Recommendation: Grep `snapshotMigration.ts` for ceiling field handling during W0.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest + happy-dom (per `vitest.config.ts`) |
| Config file | `vitest.config.ts` (exists) |
| Quick run command | `npx vitest run tests/<file>.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FIX-01 | Placed product with imageUrl → product Group contains `FabricImage` child after image onload | unit (happy-dom) | `npx vitest run tests/fabricSync.image.test.ts -x` | ❌ Wave 0 — new file |
| FIX-01 | Snapshot round-trip preserves `placedProducts[].productId` and productStore preserves `imageUrl` | unit | `npx vitest run tests/cadStore.test.ts -x` | ✅ extend existing |
| FIX-01 | Manual: place product → thumbnail visible within one render cycle on fresh canvas | manual (D-10) | N/A — human smoke | N/A |
| FIX-01 | Manual: IDB save → refresh browser → reopen project → thumbnail visible | manual (D-12) | N/A — human smoke | N/A |
| FIX-02 | `setCeilingSurfaceMaterial("CONCRETE")` → `snapshot()` → JSON contains `surfaceMaterialId: "CONCRETE"` | unit | `npx vitest run tests/ceilingMaterial.persistence.test.ts -x` | ❌ Wave 0 — new file |
| FIX-02 | structuredClone round-trip preserves `surfaceMaterialId` | unit | (same file) | ❌ Wave 0 |
| FIX-02 | Tier-1 resolution returns correct color for each of PLASTER, WOOD_PLANK, PAINTED_DRYWALL, CONCRETE | unit | `npx vitest run tests/ceilingMaterial.test.ts` | ✅ extend existing |
| FIX-02 | Manual: select each ceiling preset → visible color/roughness change in 3D viewport | manual (D-10) | N/A — human smoke | N/A |
| FIX-02 | Manual: IDB save → refresh → reopen → preset persists | manual (D-12) | N/A — human smoke | N/A |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/<touched-file>.test.ts` (< 5s typical)
- **Per wave merge:** `npx vitest run` (full suite, ~180+ tests, < 30s on M-series)
- **Phase gate:** Full suite green + D-10 manual smoke user-approved + D-12 IDB manual smoke user-approved before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/fabricSync.image.test.ts` — new file; covers FIX-01 Group-contains-FabricImage-after-onload assertion. Pattern: reuse `MockImage` class from `tests/productImageCache.test.ts`. RED first — expected to fail if Pitfall 1 is the root cause.
- [ ] `tests/ceilingMaterial.persistence.test.ts` — new file; covers FIX-02 structuredClone round-trip. RED first — expected to pass if field truly round-trips (then FIX-02 root cause is elsewhere).
- [ ] Extend `tests/ceilingMaterial.test.ts` — add one test per remaining ceiling preset (`WOOD_PLANK`, `PAINTED_DRYWALL`) to guard against Pitfall 3 regression.
- [ ] No framework install needed — Vitest, happy-dom, and setup already present.

## Sources

### Primary (HIGH confidence)
- `src/canvas/productImageCache.ts` (all 37 lines — read in research)
- `src/canvas/fabricSync.ts` lines 14, 830-920 (renderProducts path — read)
- `src/three/CeilingMesh.tsx` (all 66 lines — read)
- `src/three/FloorMesh.tsx` (all 72 lines — read; parity target)
- `src/stores/cadStore.ts` lines 1-80, 106-135, 440-460 (snapshot + setCeilingSurfaceMaterial — read)
- `src/components/CeilingPaintSection.tsx` (all 102 lines — read; UI write path)
- `src/types/cad.ts` (all 180 lines — read; Ceiling type + CADSnapshot)
- `src/data/surfaceMaterials.ts` (all 118 lines — read; 11 entries confirmed)
- `src/lib/serialization.ts` (all 47 lines — read; IDB path)
- `tests/productImageCache.test.ts` (MockImage pattern)
- `tests/ceilingMaterial.test.ts` (existing tier-resolution test pattern)
- `vitest.config.ts` (happy-dom env + test includes)
- `.planning/config.json` (`nyquist_validation: true` confirmed)
- `CLAUDE.md` (project architecture + constraints)
- CONTEXT.md and DISCUSSION-LOG.md (all 14 decisions verbatim)

### Secondary (MEDIUM confidence)
- None — all research grounded in source files.

### Tertiary (LOW confidence)
- None — no web search performed; both bugs are internal code-paths with complete local context.

## Metadata

**Confidence breakdown:**
- Code structure (current state): **HIGH** — all files read directly.
- Root-cause hypotheses (FIX-01 Pitfall 1, FIX-02 Pitfall 3): **MEDIUM** — need Wave 0 repro to confirm.
- Fix shapes (Option A / B for FIX-01): **MEDIUM** — speculative until repro narrows.
- Test scaffolding (file locations, patterns): **HIGH** — existing suite provides templates.
- Persistence round-trip: **HIGH** — structuredClone + plain strings → trivially preserved; verification is a guard, not a discovery.

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (30 days — internal code; no external API volatility)
