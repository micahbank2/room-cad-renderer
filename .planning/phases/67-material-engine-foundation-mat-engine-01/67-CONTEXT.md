# Phase 67: Material Engine Foundation (MAT-ENGINE-01) - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Jessica uploads a **Material** (color/roughness/reflection texture maps + name, brand, SKU, cost, lead time, tile size in feet+inches) and it persists in her library across reloads, dedupes if she re-uploads the same color-map image, and shows its metadata on hover.

**In scope:** Material entity, IDB persistence, upload form, library grid entry point, hover-metadata display, SHA-256 dedup on the color map.

**Out of scope (this phase):**
- Applying Materials to surfaces (walls, floors, ceilings) → Phase 68
- Linking Materials to placed products as finish slots → Phase 69
- Sidebar Materials/Assemblies/Products top-level toggle and category sub-tabs → Phase 70
- Snapshot serialization changes → Materials live in their own store, no `cadStore` impact
</domain>

<decisions>
## Implementation Decisions

### Texture Maps
- **D-01:** Material upload form has **1 required drop zone (color)** + **2 optional drop zones (roughness, reflection)**. Optional maps default to "not provided" and downstream renderers (Phase 68) will substitute sensible defaults when missing.

### Metadata Fields
- **D-02:** **Required:** `name` (≤40 chars, matches UserTexture convention) and `tileSizeFt` (real-world tile size in decimal feet, parsed via existing `validateInput` from `src/canvas/dimensionEditor`).
- **D-03:** **Optional:** `brand`, `sku`, `cost`, `leadTime`. All four can be left blank without blocking save. Rationale: Jessica often uploads from Pinterest or vendor browsing before deciding on a vendor — forcing brand/SKU upfront would block early exploration.
- **D-04:** **Cost** is a free-text string (e.g. `"$5.99/sqft"`, `"$120/yard"`, `"Quote on request"`). NOT a number. Rationale: real-world vendor data is messy; structured numeric input would reject valid sources. Filtering/sorting by cost is explicitly out of scope for v1.17.
- **D-05:** **Lead time** is a free-text string (e.g. `"2–4 weeks"`, `"In stock"`, `"Made to order"`). NOT integer days. Same rationale as D-04.

### Library Entry Point (Phase 67 only — Phase 70 reorganizes properly)
- **D-06:** Add a **new "Materials" section inside the existing `ProductLibrary`** sidebar. The "Upload Material" CTA lives here. Phase 70 will lift this into the proper top-level Materials/Assemblies/Products toggle — keeping it as a sub-section within ProductLibrary for now means Phase 70's restructure is a clean move, not a rewrite. **Do NOT** repurpose `MyTexturesList` (preserves the texture/material distinction the milestone is establishing) and **do NOT** add a top-toolbar button (would feel disconnected from where Jessica browses today).

### Inspect / Hover UX
- **D-07:** Hovering a Material card in the library shows a **tooltip** with `brand · SKU · cost · lead time · tile size`. Matches the existing `LibraryCard` hover pattern (`src/components/library/LibraryCard.tsx`). No click-to-expand inline panel, no full PropertiesPanel-style inspector. Empty fields are gracefully omitted from the tooltip.

### Dedup Semantics
- **D-08:** **Dedup on the color-map SHA-256 only.** If Jessica uploads the same color-map image twice — even with different metadata — the second upload links to the existing Material entry (matching the existing UserTexture D-11 catalog-edit pattern). To get two metadata variants of the same color map, Jessica edits the existing entry. Roughness/reflection map hashes are NOT part of the dedup key.

### Architecture (open for plan-phase research)
- **D-09 (open):** Whether `Material` wraps one-or-more `userTextureId` references (Material as metadata wrapper) or owns its texture maps directly (Material as new texture root) is a research-time decision. Requirements explicitly flagged this as a hypothesis to test. Plan-phase researcher chooses based on code analysis. Either approach must satisfy D-01 through D-08.

### Claude's Discretion
- Exact tooltip styling, animation timing, and reduced-motion behavior — apply existing D-39 conventions from Phase 33.
- Whether the new Materials section in ProductLibrary uses a tab, a collapsible group, or a divider — pick what's least disruptive to the existing layout.
- Test-driver shape (`window.__driveMaterialUpload` etc.) — follow the Phase 34 `__driveTextureUpload` precedent.
- Toast copy on dedup hit — short and consistent with existing "texture already in your library" pattern.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Pipeline (mirror this)
- `src/lib/userTextureStore.ts` — IDB store for user textures (Phase 34). Key APIs: `saveUserTextureWithDedup`, `findTextureBySha256`, `listUserTextures`, `deleteUserTexture`, `computeSHA256`. **Architectural template** — Material persistence should follow the same pattern (separate named IDB store, SHA-256 dedup, most-recent-first listing).
- `src/lib/processTextureFile.ts` — MIME gate (JPEG/PNG/WebP) + 2048px longest-edge downscale + JPEG re-encode + SHA-256. Reuse verbatim for the Material color map; the optional roughness/reflection maps go through the same pipeline.
- `src/types/userTexture.ts` — `UserTexture` type definition + `USER_TEXTURE_ID_PREFIX = "utex_"` convention. Material gets its own prefix (e.g. `"mat_"`) and its own type file.
- `src/hooks/useUserTextures.ts` — React hook over the texture store. Material gets a parallel `useMaterials.ts`.

### Existing UI (mirror or extend)
- `src/components/UploadTextureModal.tsx` — dual-mode (create/edit) modal with drop zone, name field, tile-size field. Lines 37–54 lock copy strings (UI-SPEC §1 Copywriting Contract). Lines 161–186 own the file-handling pipeline. **Decision for plan-phase:** extend this modal with a Material mode, OR build a new `UploadMaterialModal` — researcher picks based on complexity of the metadata-form additions.
- `src/components/MyTexturesList.tsx` — grid + upload tile + ⋮ edit/delete menu. Material list UI should mirror this layout (grid + LibraryCard + upload tile).
- `src/components/library/LibraryCard.tsx` — base card primitive (Phase 33 design system). Use for Material cards. Hover tooltip (D-07) hooks here.
- `src/components/library/CategoryTabs.tsx` — Phase 33 primitive. May or may not be used in Phase 67 depending on D-06 implementation choice.
- `src/components/ProductLibrary.tsx` — host component for the new Materials section (D-06). Need to inspect current structure to pick the cleanest insertion point.

### Design System Constraints
- `CLAUDE.md` §"Design System (Phase 33 — v1.7.5)" — D-33 (lucide-react chrome icons only), D-34 (canonical spacing tokens, no arbitrary `p-[Npx]`), D-39 (`useReducedMotion()` guard on every new animation).
- `src/index.css` — design tokens (`--color-obsidian-*`, `--color-accent`, `--font-mono` etc.).

### Roadmap / Requirements
- `.planning/REQUIREMENTS.md` §MAT-ENGINE-01 — verifiable + acceptance criteria + hypothesis to test.
- `.planning/ROADMAP.md` §"Phase 67: Material Engine Foundation" — 5 success criteria.

### Patterns
- `CLAUDE.md` §"StrictMode-safe useEffect cleanup for module-level registries" (Pattern #7) — applies to any new test driver registration via `import.meta.env.MODE === "test"` guard.
- `CLAUDE.md` §"Tool cleanup pattern" (#5) — N/A this phase, no canvas tools added.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (high leverage)
- **`processTextureFile`** — MIME gate + downscale + SHA-256 already done. Reuse verbatim for color map; optional roughness/reflection maps go through the same pipeline (each gets its own SHA-256 even though only color drives dedup per D-08).
- **`userTextureIdbStore` pattern** — Material gets a parallel named IDB store (`createStore("room-cad-materials", "materials")`) for physical isolation from texture store and from project save/load.
- **`UploadTextureModal` form skeleton** — drop zone + name + tile-size fields are 80% of the Material upload form. Adding optional metadata fields (brand/SKU/cost/lead time) and 2 optional drop zones is incremental.
- **`MyTexturesList`** — grid + upload tile + edit/delete menu pattern is directly reusable. Materials list = same layout, different item type.
- **`LibraryCard` + `CategoryTabs`** — Phase 33 design-system primitives. Material cards drop in cleanly.
- **`useUserTextures`** — React-hook + IDB-store pattern. `useMaterials` is the same shape.
- **`validateInput`** (`src/canvas/dimensionEditor`) — feet+inches parser for `tileSizeFt`. Already used by UploadTextureModal.

### Established Patterns
- **Separate IDB keyspaces** — texture/gltf/project all live in distinct named stores. Materials follow the same isolation. Writes don't trigger project autosave; deletes don't invalidate snapshots.
- **Test driver bridges** — `window.__driveTextureUpload` (Phase 34) and `window.__driveResize` (Phase 31) precedent. Material upload gets `window.__driveMaterialUpload` gated by `import.meta.env.MODE === "test"`.
- **D-11 catalog-edit flow** — second upload of same image links to existing entry; rename/edit the existing entry to change metadata. Phase 67 inherits this verbatim (D-08).

### Integration Points
- `ProductLibrary.tsx` — host for the new "Materials" section (D-06). Need to find the cleanest insertion point that doesn't disrupt the existing Products grid.
- `App.tsx` — may need to lazy-load `useMaterials` on first library open (mirrors how `useUserTextures` is lazy-loaded). Check current App.tsx for the pattern.
- No `cadStore` integration (D-09 closed: Materials live in their own store).

### Risks / Constraints
- **Form size** — adding 4 optional metadata fields + 2 optional drop zones to UploadTextureModal could push it past comfortable height. Researcher should evaluate scrolling vs. a separate Material modal.
- **Tooltip overflow** — long brand/SKU strings in the hover tooltip (D-07) need a max-width or truncation. Cosmetic.
- **No SHA-256 collision risk in practice** — single-user local catalog; current scan is `O(n)` linear (acceptable per D-06 of Phase 34).

</code_context>

<specifics>
## Specific Ideas

- "Pinterest before vendor" mental model drives metadata-optional decision (D-03). Jessica explores possibilities before committing — the upload form should match that flow.
- Free-text cost/lead time (D-04, D-05) explicitly chosen to accommodate `"Quote on request"`, `"2–4 weeks"`, `"Made to order"` style inputs from real vendor pages.
- Materials section as a sub-section of ProductLibrary in Phase 67 (D-06) is intentionally a stepping stone for Phase 70 — keep the implementation easy for Phase 70 to lift up.

</specifics>

<deferred>
## Deferred Ideas

- **Cost/lead time as structured numbers** with filter/sort UI — would unlock "show me materials under $10/sqft" but rejects messy real-world inputs. Defer to a future phase if Jessica asks for budget filters.
- **Click-to-expand or PropertiesPanel-style Material inspector** — D-07 picks hover tooltip for now. Larger inspector could come if hover proves insufficient.
- **Allow duplicate Materials sharing a color map (vendor variants)** — D-08 picks single-Material-per-color-map. Revisit if Jessica wants explicit "Carrara from Vendor A vs Vendor B" comparison.
- **Material as new texture root (no `userTextureId` wrapping)** — D-09 leaves architecture open for plan-phase research. The chosen path determines whether wrapper-vs-root resurfaces.
- **Filter/sort by metadata in the library grid** — out of scope this phase. The hover tooltip is the only metadata-display surface.

</deferred>

---

*Phase: 67-material-engine-foundation-mat-engine-01*
*Context gathered: 2026-05-06*
