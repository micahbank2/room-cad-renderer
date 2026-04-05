# Phase 2: Product Library - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

The product library becomes a permanent personal catalog: products added once appear in every project (LIB-03), products can be uploaded with only an image and name with dimensions optional (LIB-04), and Jessica can find products by typing part of the name (LIB-05). Scope is strictly LIB-03, LIB-04, and LIB-05 — no new 3D model formats, no cloud sync, no product editing beyond what's needed.

</domain>

<decisions>
## Implementation Decisions

*User deferred discussion ("just execute") — decisions below are Claude's recommended defaults to be ratified during planning.*

### Library Architecture (LIB-03)
- **D-01:** Consolidate product state into a new Zustand `productStore` (`src/stores/productStore.ts`) — single source of truth. Remove duplicate loads currently in both `App.tsx` and `Sidebar.tsx`. Store persists to the existing `room-cad-products` IndexedDB key (no migration needed — key already exists and is already global).
- **D-02:** Product library is explicitly decoupled from projects. A `CADSnapshot` continues to hold `placedProducts` with `productId` references; the product records themselves live only in the global store. Loading a project never mutates the library.
- **D-03:** Orphan handling — if Jessica deletes a library product that is placed in any saved project, those placed instances render as a dashed placeholder box with the last-known product name displayed in the label (dimensions fall back to 2×2×2 ft). No blocking confirmation dialog; deletion is immediate with a toast-style status message "Deleted [name] — N placements now show as missing." She can re-add or replace.

### Optional Dimensions (LIB-04)
- **D-04:** Add a "Skip dimensions" toggle to `AddProductModal`. When toggled, the W/D/H fields grey out and are not required. When off, fields behave exactly as today (required with current defaults).
- **D-05:** `Product.width`, `Product.depth`, `Product.height` become `number | null`. Null means "unspecified" — they render on the canvas using placeholder dimensions (2×2×2 ft) with a visual indicator (dashed accent-colored border in 2D, 20% lower opacity in 3D) signalling "approximate size".
- **D-06:** Jessica can set real dimensions later from the `PropertiesPanel` when the placeholder product is selected. This closes the loop without forcing the decision upfront.
- **D-07:** Library cards show `SIZE: UNSET` in the dimension row when any dimension is null, instead of `W × D × H FT`.

### Search (LIB-05)
- **D-08:** Current library-view search (case-insensitive name substring match) already meets LIB-05. Keep behavior; verify and add a test for it.
- **D-09:** Add a compact searchable product picker to the canvas sidebar (`Sidebar.tsx`) so Jessica can drag products onto the canvas without leaving 2D view. Lists thumbnails + name, filtered by a single search input, draggable via the existing `DRAG_MIME` mechanism from Phase 1.
- **D-10:** Search is name-only (matches LIB-05's literal requirement). Category filter stays as its current separate control in the full library view; no category filter in the sidebar picker (tight space).

### Claude's Discretion
- Exact styling of the dashed placeholder border (thickness, dash pattern, opacity) — use existing obsidian-* tokens and accent color.
- Toast/status message styling for orphan notification — reuse save indicator pattern from Phase 1 or a sidebar inline message.
- Sidebar product picker height / scroll behavior — Claude picks per visual balance with existing ROOM_CONFIG, SYSTEM_STATS, LAYERS, SNAP sections.
- Whether to migrate `productStore` subscription into `FabricCanvas`/`ThreeViewport` props or read directly from the store — Claude picks based on existing prop-drilling pattern.
- Whether `width`/`depth`/`height` nullable change requires a one-time migration for existing products in IndexedDB — if so, run at productStore init.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & Requirements
- `.planning/ROADMAP.md` §Phase 2 — Phase 2 goal, LIB-03/04/05 requirements, 3 success criteria
- `.planning/REQUIREMENTS.md` §Product Library — LIB-03, LIB-04, LIB-05 requirement text

### Project Context
- `.planning/PROJECT.md` — Jessica's workflow, core value, locked tech decisions, Active requirement "Global product library persists across all projects"

### Prior Phase Context
- `.planning/phases/01-2d-canvas-polish/01-CONTEXT.md` — Drag-drop contract (`DRAG_MIME`), Obsidian token conventions, auto-save/snapshot patterns to respect

### Codebase Maps
- `.planning/codebase/CONCERNS.md` — Known issues including product loading duplication
- `.planning/codebase/ARCHITECTURE.md` — Store-driven rendering, product prop drilling
- `.planning/codebase/CONVENTIONS.md` — Obsidian CAD design tokens, naming patterns
- `.planning/codebase/STRUCTURE.md` — File layout for stores, components

### Key Source Files
- `src/App.tsx` — Current `productLibrary` ownership (lines 25, 35-55); load/add/remove to migrate into productStore
- `src/components/Sidebar.tsx` — Second load site (lines 16-26) to remove; target for new product picker
- `src/components/ProductLibrary.tsx` — Existing search (line 22, 27-34); onRemove callback for deletion flow
- `src/components/AddProductModal.tsx` — Form where "Skip dimensions" toggle goes; currently requires W/D/H (lines 14-16, 170-207)
- `src/components/PropertiesPanel.tsx` — Where Jessica can later set dimensions on placeholder products
- `src/types/product.ts` — `Product` interface; width/depth/height need to become `number | null`
- `src/canvas/fabricSync.ts` — Product rendering (line 108 `productLibrary.find`); add dashed placeholder branch for null dimensions and orphan products
- `src/three/ThreeViewport.tsx` — 3D product rendering (line 54); add transparency for null-dimension products
- `src/canvas/tools/selectTool.ts` — `setSelectToolProductLibrary` injection point; migrate to productStore subscription
- `src/canvas/dragDrop.ts` — `DRAG_MIME` reused by new sidebar picker

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`room-cad-products` IndexedDB key** — Already in use, already global. No migration needed at persistence level.
- **`ProductLibrary.tsx` search logic (lines 27-34)** — Works; copy pattern to sidebar picker.
- **`DRAG_MIME` + `draggable` product cards** — Drag-drop plumbing from Phase 1 is reusable verbatim.
- **`PRODUCT_CATEGORIES` constant** — Stays in `src/types/product.ts`.
- **Zustand + Immer store pattern** — `cadStore.ts` and `uiStore.ts` are the templates for `productStore.ts`.
- **`idb-keyval` get/set** — Already used for persistence, just move into store.

### Established Patterns
- **Store-driven state:** Products should live in Zustand, not `useState` in App.tsx. Matches `cadStore` + `uiStore` pattern.
- **Prop drilling for productLibrary:** Currently passed from App.tsx → FabricCanvas, ThreeViewport, PropertiesPanel, Sidebar. Can either keep props (minimal change) or have consumers subscribe directly to productStore (cleaner). Downstream planner to pick.
- **Obsidian CAD tokens:** All new UI uses `font-mono`, `obsidian-low`, `accent`, `accent-light`, `text-text-dim`, `text-text-ghost`.
- **Null-safe renders:** `fabricSync.ts` already returns early when `productLibrary.find` returns undefined — orphan placeholder logic slots in right there.

### Integration Points
- **`src/stores/productStore.ts`** — NEW file. Holds products, add/remove actions, IndexedDB sync on mutation.
- **`App.tsx`** — Remove local `productLibrary` state, `handleAddProduct`, `handleRemoveProduct`, IndexedDB loader. Pass products from store (or remove props if consumers subscribe directly).
- **`Sidebar.tsx`** — Remove duplicate IndexedDB loader. Add product picker section with search input + draggable thumbnail list.
- **`AddProductModal.tsx`** — Add "Skip dimensions" checkbox state; conditional field rendering; pass null to onAdd when skipped.
- **`ProductLibrary.tsx`** — Show `SIZE: UNSET` when dimensions are null; keep search + category filter.
- **`fabricSync.ts`** — Extend product rendering branch: if product missing (orphan) OR dimensions null, render dashed-box placeholder with name label.
- **`ThreeViewport.tsx`** — If dimensions null, use 2×2×2 placeholder and set material opacity to 0.8.
- **`PropertiesPanel.tsx`** — When a placed product's underlying Product has null dimensions, show editable W/D/H inputs that, on save, update the product in productStore.

</code_context>

<specifics>
## Specific Ideas

- "Global library" storage is already implemented — Phase 2 consolidates/codifies it rather than building it from scratch.
- Deletion is immediate with a toast notification ("Deleted [name] — N placements now show as missing") — no blocking confirmation.
- `SIZE: UNSET` is the literal label text for dimension-less products in the library card.
- Null dimensions render with a **dashed accent-colored border** in 2D and **20% lower opacity** in 3D — signals "approximate size" to Jessica.
- Placeholder dimensions for null-sized products: **2×2×2 ft**.
- Sidebar picker is name-only search; full library view retains both name search and category filter.

</specifics>

<deferred>
## Deferred Ideas

- **Editing product name/category/image after creation** — not required by LIB-03/04/05. Jessica can delete + re-add for now.
- **Bulk import of products** (e.g., drop 10 images at once) — nice future addition, not in scope.
- **Tagging / custom filters beyond category** — deferred.
- **"Recently used" or "Favorites" section in sidebar picker** — deferred, start with flat searchable list.
- **Cloud sync / cross-device library** — explicitly v2 per PROJECT.md.
- **Product versioning or undo on library deletion** — not in scope; toast is the safety net.
- **GLB/OBJ model upload** — explicitly out of scope per PROJECT.md.
- **Auto-detecting dimensions from image metadata / AI** — deferred.

</deferred>

---

*Phase: 02-product-library*
*Context gathered: 2026-04-04*
