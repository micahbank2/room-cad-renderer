# Phase 26: Bug Sweep - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Two isolated visual bugs from the v1.5 bug debt:

1. **FIX-01** — Product thumbnails missing from 2D canvas after placement / on project reload (GitHub issue #42).
2. **FIX-02** — Ceiling preset material selection not rendering correctly in the 3D viewport and/or not persisting across save/reload (GitHub issue #43).

Out of scope: any broader product-render or ceiling-material refactor. No new capabilities. No feature work. No type-model collapse.

</domain>

<decisions>
## Implementation Decisions

### FIX-01 Approach — Product images in 2D canvas

- **D-01:** Reproduce the bug against current code before implementing any fix. Issue #42 may be describing an older synchronous `imgEl.complete && naturalWidth > 0` path that no longer exists — `src/canvas/fabricSync.ts:~868` already uses `getCachedImage(product.id, imageUrl, onLoad)` via `src/canvas/productImageCache.ts`. Confirm the actual failure mode before deciding the fix shape.
- **D-02:** Preserve the existing Promise-deduped `productImageCache` by default. Do NOT rewrite to `fabric.FabricImage.fromURL` unless repro proves the cache itself is the root cause. Keeps Phase 24/25 "module-level async Promise caches" decision intact.
- **D-03:** If the fix requires a trade-off between "thumbnail appears on first paint" and "concurrent-load dedup," prioritize first-paint correctness. Success criteria #1 explicitly forbids placeholder-only renders; a double-load is preferable to a blank tile.
- **D-04:** If repro fails entirely against current code, close issue #42 as stale with evidence (repro steps + GREEN automated test) rather than manufacturing a fix.

### FIX-02 Approach — Ceiling preset materials in 3D

- **D-05:** Reproduce the bug against current code before implementing any fix. `src/three/CeilingMesh.tsx` already has a Tier-1 `surfaceMaterialId` branch that reads from `SURFACE_MATERIALS` and applies `color + roughness`. Real bug may be (a) preset not surviving save/reload (SC #4), (b) `surfaceMaterialId` not reaching `CeilingMesh`, (c) presets entries lacking visibly distinct colors, or (d) tier resolution order wrong. Identify which before fixing.
- **D-06:** Ceiling preset fix stays at **color + roughness** parity with `FloorMesh` preset path. `FloorMesh` presets also do not load textures — only custom-uploaded floor images do. Adding texture loading to ceiling presets is explicitly out of scope (deferred — see below).
- **D-07:** Leave the three overlapping ceiling material fields (`material` legacy, `paintId`, `surfaceMaterialId`) AS-IS. Fix FIX-02 inside the existing tier-resolution order. Do NOT collapse to a discriminated union in this phase — that is a typed-refactor concern, not a bug sweep. Flag as backlog.

### Test Strategy

- **D-08:** Ship BOTH unit tests and a manual smoke check. Image-async logic and ceiling tier selection are unit-testable; 3D visual correctness (distinct preset appearance, mesh updates on selection) needs a human eye.
- **D-09:** Write RED tests first, then fix, then confirm GREEN. Mirrors Phase 25 Wave 0 validation-scaffolding pattern. RED commits must be explicit and reviewable (evidence of regression guard intent).
- **D-10:** Final close-out requires both: full automated suite passing AND user-approved manual smoke of (a) placing a product with image in 2D → thumbnail appears within one render cycle, (b) selecting each ceiling preset → visible color/roughness change in 3D.

### Reload Verification Scope

- **D-11:** Automated path: `structuredClone(snapshot())` → rehydrate → assert product `imageUrl` and ceiling `surfaceMaterialId` round-trip intact. Mirrors Phase 25 D-07 snapshot-round-trip pattern.
- **D-12:** Manual path: actual IndexedDB save → full page refresh → open project → confirm both thumbnails render and ceiling preset holds. Required before phase close-out. Catches IndexedDB-layer bugs (migration, key collisions, field stripping) that the unit gate cannot.

### Process / Scope Guardrails

- **D-13:** No new features. No type-model refactors. No cross-cutting cleanup. If investigation surfaces a related issue outside FIX-01/FIX-02, file it as a backlog item — do not expand the phase.
- **D-14:** GitHub issue close-out: close #42 and #43 via PR commit message referencing the phase. If #42 resolves as stale (D-04), close with the repro evidence comment explaining why.

### Claude's Discretion

- Wave structure (e.g., Wave 0 RED scaffolding / Wave 1 FIX-01 / Wave 2 FIX-02 / Wave 3 verification) — planner decides.
- Exact unit-test file paths and naming — planner decides in line with Phase 25's `tests/` layout.
- Whether FIX-01 and FIX-02 ship as one commit or separate commits — planner decides; either is acceptable given the bugs are independent.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — Exact wording of FIX-01 (product images in 2D) and FIX-02 (ceiling preset materials).
- `.planning/ROADMAP.md` (v1.5 Phase 26 block, lines ~98-107) — Goal, dependencies, success criteria.

### Prior Phase Context (Phase 24 & 25 patterns carried forward)
- `.planning/phases/24-tool-architecture-refactor/24-CONTEXT.md` — D-13 manual-smoke precedent.
- `.planning/phases/25-canvas-store-performance/25-CONTEXT.md` — Module-level async Promise cache decision (applies to `productImageCache`); Wave 0 RED-test-first pattern; D-07 snapshot round-trip pattern.

### FIX-01 Source Files
- `src/canvas/fabricSync.ts` — `renderProducts` function around line 800-875; currently uses `getCachedImage(product.id, imageUrl, onLoad)`.
- `src/canvas/productImageCache.ts` — Existing Promise-deduped image cache. Likely the correct abstraction to preserve.
- `src/canvas/tools/productTool.ts` — Product placement entry point.
- `src/types/product.ts` — `Product.imageUrl` field (data URL).

### FIX-02 Source Files
- `src/three/CeilingMesh.tsx` — Current Tier-1 preset branch using `SURFACE_MATERIALS`.
- `src/three/FloorMesh.tsx` — Reference implementation for preset path (color + roughness only; custom uses textures). Parity target for ceiling presets.
- `src/data/surfaceMaterials.ts` — `SURFACE_MATERIALS` catalog structure.
- `src/components/CeilingPaintSection.tsx` — Writes via `setCeilingSurfaceMaterial(ceilingId, id)` store action.
- `src/types/cad.ts` (~lines 116-130) — `Ceiling` type with three material fields.
- `src/lib/serialization.ts` — Save/load; verify `surfaceMaterialId` round-trips.

### GitHub Issues
- Issue #42 — FIX-01 tracking; may have stale description (pre-dates `productImageCache`).
- Issue #43 — FIX-02 tracking.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`productImageCache.ts`** — Existing Promise-deduped image cache. Preserve and test, don't replace.
- **`FloorMesh.tsx` preset branch** — Reference pattern for ceiling preset resolution (color + roughness, no texture load).
- **Phase 25 `window.__cadSeed` / `window.__cadBench` dev helpers** — Useful for reproducing bugs with a deterministic scene.

### Established Patterns
- **Module-level async Promise caches** — Used for both custom floor textures (`FloorMesh` `customTextureCache`) and product images. New code should not reinvent this.
- **Store-driven render** — `FabricCanvas` fully redraws from store on every change; no incremental updates. Any FIX-01 fix must work within full-redraw semantics.
- **Tier resolution for material fields** — `CeilingMesh` resolves `surfaceMaterialId → paintId → legacy material`. Keep this order; fix within it.

### Integration Points
- 2D render entry: `renderProducts()` in `src/canvas/fabricSync.ts`.
- 3D ceiling render entry: `CeilingMesh` component rendered from `ThreeViewport` scene.
- Serialization entry: `saveProject` / `loadProject` in `src/lib/serialization.ts`.

</code_context>

<specifics>
## Specific Ideas

- Issue #42 references `imgEl.complete && imgEl.naturalWidth > 0` — that code no longer exists. Treat the issue description as a historical artifact; trust the current code + fresh repro.
- FloorMesh preset path is the concrete parity target for ceiling presets (color + roughness, no texture).
- Phase 25 W0 seed helpers (`window.__cadSeed`) should be leveraged for deterministic bug repro.

</specifics>

<deferred>
## Deferred Ideas

- **Ceiling material type collapse** — Merging `material` / `paintId` / `surfaceMaterialId` into a `CeilingMaterial` discriminated union (mirroring `FloorMaterial`). Out of scope for bug sweep; file as backlog for a future tech-debt phase.
- **Texture-loading for ceiling presets** — Wood planks, tile textures on ceilings. Beyond bug-fix scope; Jessica's visual focus is rarely the ceiling. File as backlog idea for a potential v1.6 polish phase.
- **`fabric.FabricImage.fromURL` migration** — Only if repro proves `productImageCache` is the root cause. Otherwise preserve the existing abstraction.
- **Automated IndexedDB round-trip** (Playwright or similar) — Would catch IndexedDB-layer bugs automatically. For now, manual smoke covers it; automation is a separate testing-infrastructure effort.

### Reviewed Todos (not folded)

None — no pending todos matched Phase 26 (checked via `gsd-tools todo match-phase 26`).

</deferred>

---

*Phase: 26-bug-sweep*
*Context gathered: 2026-04-20*
