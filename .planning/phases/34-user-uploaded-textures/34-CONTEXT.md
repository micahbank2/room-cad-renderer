# Phase 34: User-Uploaded Textures - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Jessica uploads JPEG/PNG/WebP photos of real surfaces she's considering, names them, specifies real-world tile size in feet+inches (reusing Phase 29 parser), and applies them to walls/floors/ceilings from the material picker. Uploads persist across full page reload, dedup via SHA-256 of downscaled bytes, downscale client-side to ≤2048px longest edge, and are referenced from `CADSnapshot` by `userTextureId` only (Blobs live in a separate `userTextureStore` IDB keyspace — zero Blobs / data-URL bloat in snapshot JSON). Orphan `userTextureId` references fall back to the surface's base hex color without crash.

Out of scope (explicit):
- Normal / roughness map upload by user (bundled-only; Phase 32 scope)
- Texture tiling controls beyond real-world size (no rotation / offset / seam-smoothing)
- 3D model upload (GLTF/OBJ) — Out of Scope per PROJECT.md
- Per-placement tile-size override — deferred (D-05 below)

</domain>

<decisions>
## Implementation Decisions

### Upload UI & Flow
- **D-01:** The "Upload Texture" entry point lives **inside the material picker** — a persistent `+ Upload Texture` tile at the end of the `MY TEXTURES` category (see D-04). No separate sidebar button, no new top-level tab. Zero mode switch: Jessica is already browsing materials when she wants to add hers.
- **D-02:** **One-step modal** — drop or pick a file → preview renders inline in the same modal → `name` + real-world tile size fields (feet+inches, Phase 29 parser) appear → Save. No two-step / wizard flow.
- **D-03:** **One file per upload.** No bulk drop queue for MVP. Name + tile size are per-texture and Jessica wants to think about each one; simpler downscale + SHA-256 pipeline.
- **D-03a:** **Errors** surface **inline inside the modal + toast on success.** MIME-reject copy: `"Only JPEG, PNG, and WebP are supported."` Oversize / decode failure: inline red error under the file field. Save success → toast. No blocking alert dialogs.

### Material Picker Integration
- **D-04:** User textures appear in a **dedicated `MY TEXTURES` category tab** within the existing `CategoryTabs` primitive (built in Phase 33 D-31), alongside the bundled WOOD / STONE / etc. tabs. Empty state on the tab = upload prompt.
- **D-05:** One uploaded texture applies to **any surface type** — walls, floors, ceilings — interchangeably. **No surface-type tagging at upload.** Matches LIB-06 success criterion ("apply to walls / floors / ceilings") literally; Jessica picks where it applies at placement time, not at upload.
- **D-06:** Default ordering of `MY TEXTURES` list = **most recently uploaded first.** Matches the dominant intent ("I just added oak — let me apply it"). No user-facing sort controls for MVP.

### Delete & Orphan UX
- **D-07:** **Delete requires a confirm dialog with ref-count.** Copy shape: `"Delete {name}? {N} surfaces in this project use it. They'll fall back to their base color."` Only after confirm does the texture leave `userTextureStore`. Prevents accidental data loss; makes orphan fallback predictable because Jessica was warned.
- **D-08:** **Orphan fallback is silent on load** — no toast, no per-surface badge, no "orphan texture" indicator in `PropertiesPanel`. Surface just renders at its base hex color (mirrors Phase 32 missing-texture pattern). Delete-dialog in D-07 is the single warning surface.
- **D-09:** **Orphan-reference resolution = simple lookup at render** — each surface render does `userTextureStore.get(userTextureId)`; missing → hex fallback. No project-load reconciliation sweep, no orphan-collection pass. Matches Phase 32 missing-texture behavior and keeps load path simple.

### Tile-Size Semantics
- **D-10:** **Tile size is a catalog attribute, one value per texture.** No per-placement `tileSizeOverride` field in Phase 34. If Jessica needs different scaling for the same texture on two different floors, she edits the catalog entry (see D-11) or re-uploads. Follows Phase 31 D-02 schema discipline — add override later only if real demand emerges. Keeps Phase 34 plan count tight (est. 3–4 plans, not 4–5).
- **D-11:** **Catalog is editable after upload** — right-click or `⋮` menu on a `MY TEXTURES` tile → `Edit` → modal with `name` + tile-size fields (same shape as the upload modal). Edits propagate: placed surfaces using that texture recompute tile size live. Prevents the "stuck with wrong tile size" trap without adding per-placement override complexity.

### VIZ-10 / Phase 36 Coupling
- **D-12:** **Phase 34 builds conservatively on Phase 32 cache patterns as-is** — `userTextureStore` uses the refcount-based dispose API, per-mesh `<Suspense>` + `<ErrorBoundary>`, non-disposing cache, and `dispose={null}` primitive attach introduced in Phase 32 Plans 06/07. No up-front instrumentation hooks. If Phase 36's Playwright harness reveals the cache model is wrong for user uploads, we refactor surgically in Phase 36 — Phase 34 must not be blocked because it is the Core Value delivery slice.

### Claude's Discretion
- Exact visual design of the `+ Upload Texture` tile (icon, label, hover affordance) — follow v1.7.5 D-33 (lucide-react only for new chrome) + D-34 (canonical spacing/radius tokens).
- Progress-indicator shape during downscale + SHA-256 hashing — a spinner inside the modal is sufficient; the operation is bounded (≤2048px, <1s on realistic files) so a progress bar is not required.
- Image-decode / downscale implementation — `createImageBitmap` + `OffscreenCanvas` vs `<img>` + `<canvas>` is the researcher/planner's call; both are viable, picked by bundle-size + jsdom-test compatibility.
- Whether the Edit modal (D-11) is a separate component or reuses the Upload modal with a `mode: "create" | "edit"` prop — planner decides.
- SHA-256 implementation — Web Crypto `crypto.subtle.digest("SHA-256", bytes)` is the default; no polyfill needed for Chromium-class browsers (Jessica's platform).
- Test-driver hooks (`window.__driveTextureUpload`, etc.) — follow the Phase 29/30/31 pattern, gate on `import.meta.env.MODE === "test"`.

### Folded Todos
None — no pending todos matched Phase 34's scope.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 34 roadmap & requirements
- `.planning/ROADMAP.md` §v1.8 → Phase 34 — Goal, success criteria (6 items), depends-on, plan estimate
- `.planning/REQUIREMENTS.md` §User-Uploaded Textures (LIB) — LIB-06, LIB-07, LIB-08 with verifiable + acceptance conditions
- `.planning/PROJECT.md` §Current Milestone: v1.8 — milestone framing, reused Phase 32 foundations, out-of-scope list

### Phase 32 foundations (required reading — Phase 34 builds directly on these)
- `.planning/phases/32-pbr-foundation/32-SUMMARY.md` — overall Phase 32 outcome
- `.planning/phases/32-pbr-foundation/32-07-SUMMARY.md` — non-disposing cache + `dispose={null}` primitive attach rationale; still-plausible VIZ-10 cause list
- `.planning/phases/32-pbr-foundation/32-HUMAN-UAT.md` Gap 1 — wallpaper/wallArt 2D↔3D regression origin (context for D-12)
- Color-space helper location + refcount dispose API (search in `src/three/` for the PBR loader / helper modules)

### Phase 29 parser (reused for tile-size input)
- `.planning/phases/29-editable-dim-labels/29-SUMMARY.md` — feet+inches parser contract + test coverage
- `src/` — locate the parser (search `parseFeetInches` or equivalent) and reuse verbatim; do not fork

### Phase 31 schema discipline (reference for D-10 deferral rationale)
- `.planning/phases/31-drag-resize-label-override/` SUMMARY / PLAN files — per-placement override pattern we are deliberately **not** replicating in Phase 34

### GitHub issue of record
- GH [#47](https://github.com/micahbank2/room-cad-renderer/issues/47) — user textures (LIB-06/07/08 source)

### Design system (mandatory for any new UI)
- `CLAUDE.md` §Design System (Phase 33 — v1.7.5) — icon policy (D-33: lucide-react only for new chrome), canonical spacing + radius tokens (D-34), typography ramp (D-03), reduced motion (D-39)
- `src/index.css` `@theme {}` block — tokens

### Primitives to reuse (from Phase 33)
- `CategoryTabs` component — host for `MY TEXTURES` tab (D-04)
- `LibraryCard` component — texture tile shape in the picker
- `CollapsibleSection` — if sectioning is needed inside the MY TEXTURES view
- `useReducedMotion` hook — guard any open/close animations on the upload/edit modal

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`parseFeetInches` parser (Phase 29)** — consumed directly for tile-size input; three-branch ordered regex, 37/37 tests green. Do not fork.
- **`CategoryTabs` + `LibraryCard` primitives (Phase 33)** — `MY TEXTURES` tab slots in with zero new primitive work.
- **`SurfaceMaterial` material-picker plumbing** — where bundled textures are consumed today by walls/floors/ceilings; user textures must flow through the same picker surface (D-04 / D-05).
- **Phase 32 PBR loader + color-space helper + refcount dispose API + per-mesh `<Suspense>` / `<ErrorBoundary>`** — `userTextureStore` texture-binding reuses these verbatim (D-12).
- **`useReducedMotion` hook (Phase 33)** — gates modal open/close animation.
- **`AddProductModal` shape** — reference shape for "drop / pick file → fields → save" modal; Phase 34's upload modal follows its idioms (lucide icons only per D-33, canonical tokens per D-34).
- **Test-driver pattern (Phase 29/30/31)** — `window.__drive*` hooks gated by `import.meta.env.MODE === "test"` for jsdom-hostile DOM interactions.

### Established Patterns
- **Module-level async cache with Promise values** — dedups concurrent loads; already in use for bundled textures (`Image`/`Texture` module caches). `userTextureStore` mirrors this for Blob → `ObjectURL` → `THREE.Texture` pipeline.
- **Refcount dispose** — `SurfaceMaterial` textures use refcounted dispose; `userTextureStore` entries follow the same lifecycle.
- **`userTextureId` snapshot reference pattern** — mirrors the `surfaceMaterialId` / `paintId` discipline already shipped (CAD data references catalog by ID, catalog holds the heavy state).
- **Drag fast-path / history-boundary pattern (Phase 25 D-01..D-06)** — not directly relevant to texture uploads, but any surface mutations that change `userTextureId` must push exactly one history entry.
- **v1.6 D-02 pointer-based silent restore** — project autoload path; `userTextureStore` must be hydrated (or at least lazily readable) before the first surface renders.

### Integration Points
- **Material picker UI** — add `MY TEXTURES` tab (D-04). Check wall / floor / ceiling pickers share one component (they should, per v1.3 MAT-01/02/03 unified catalog); if not, the tab is added to whichever picker is the unified one.
- **`CADSnapshot` schema** — existing surface-material references are string IDs; `userTextureId` is a new ID-space but reuses the same reference shape. Confirm `migrateSnapshot` handles forward-compatibility for projects saved pre-Phase 34 (no change expected — missing field = no user texture = bundled material unchanged).
- **`useAutoSave`** — user texture uploads write to `userTextureStore` IDB keyspace, NOT to `CADSnapshot`. Uploads should NOT flip the CAD autosave status; they are a separate persistence track. Confirm the autosave watcher is narrowed to `room-cad-project-*` keys and ignores `user-texture-*` keys.
- **`useProductLibrary`-style hook** — Phase 34 likely introduces a `useUserTextureStore` / `useUserTextures` hook for the material picker to consume; mirror the existing product-library hook shape.
- **3D mesh texture binding** — reuses Phase 32's `<Suspense>` + refcount dispose exactly; the only delta is the texture source (Blob `ObjectURL` instead of bundled static import).

</code_context>

<specifics>
## Specific Ideas

- "The `+ Upload Texture` tile inside MY TEXTURES should feel like the 'Add new' slot on an iOS photo-album grid" — one-click, inline, no mode switch.
- Error copy is user-facing and should read like a person wrote it: `"Only JPEG, PNG, and WebP are supported."` Not `"MIME type rejected"`.
- Delete confirm dialog should name the texture and the real count: `"Delete Oak Floor? 3 surfaces in this project use it. They'll fall back to their base color."` Generic "Are you sure?" is not enough.

</specifics>

<deferred>
## Deferred Ideas

- **Per-placement tile-size override** — Phase 31-style `tileSizeOverride` on surface treatments. Deferred per D-10; revisit only if Jessica expresses a concrete need after v1.8 ships.
- **Bulk upload queue** — drop N files, fill per-texture metadata, save all. Deferred per D-03; revisit when library size makes single-file friction obvious.
- **User-uploaded normal / roughness maps** — Out of Scope for v1.8 per REQUIREMENTS.md "Out of Scope".
- **Per-surface orphan badge / reconciliation sweep** — Deferred per D-08 / D-09; silent fallback is sufficient while delete-dialog is the warning surface.
- **Surface-type tagging at upload** — Deferred per D-05; revisit if `MY TEXTURES` list grows large enough that category filtering becomes necessary.
- **User-facing sort controls on MY TEXTURES** — Deferred per D-06; recent-first covers the dominant usage pattern.
- **Instrumentation hooks shared with Phase 36 VIZ-10 harness** — Deferred per D-12; Phase 36 extends `userTextureStore` at that phase, not up-front.

### Reviewed Todos (not folded)
None — no pending todos matched Phase 34's scope in `cross_reference_todos`.

</deferred>

---

*Phase: 34-user-uploaded-textures*
*Context gathered: 2026-04-22*
