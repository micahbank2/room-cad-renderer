# Phase 2: Product Library - Research

**Researched:** 2026-04-04
**Domain:** Zustand store consolidation, IndexedDB persistence, optional/nullable schema, search UI
**Confidence:** HIGH

## Summary

Phase 2 consolidates product state into a new Zustand `productStore` (mirroring the existing `cadStore` / `projectStore` / `uiStore` pattern), makes `Product.width/depth/height` nullable, adds a "Skip dimensions" toggle to `AddProductModal`, introduces an orphan/null-dim rendering branch in both the 2D (`fabricSync.ts`) and 3D (`ProductMesh.tsx`) renderers, and adds a compact searchable product picker to `Sidebar.tsx`. All infrastructure this phase needs already exists in the codebase — no new libraries, no new IndexedDB keys, no schema migration at the persistence layer. The work is internal refactoring plus three well-scoped UI deltas.

**Primary recommendation:** Build `productStore` with built-in IndexedDB subscribe-and-persist (same pattern as `useAutoSave`), migrate existing `Product` records at store init by coercing `width|depth|height` to `null` if non-number, and extend `fabricSync.renderProducts` + `ProductMesh` with a single null-dim/orphan branch that uses 2×2×2 ft placeholders.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** New `src/stores/productStore.ts` Zustand store is single source of truth. Remove duplicate IndexedDB loaders currently in `App.tsx` (lines 35-55) and `Sidebar.tsx` (lines 16-26). Persists to existing `room-cad-products` key — no migration needed.
- **D-02:** Library is decoupled from projects. `CADSnapshot` keeps `placedProducts` with `productId` references; library records live only in the global store. Loading a project never mutates the library.
- **D-03:** Orphan handling — deleting a library product does NOT touch placed instances. Orphans render as dashed placeholder boxes with last-known name + 2×2×2 ft fallback. No blocking confirmation; toast message: "Deleted [name] — N placements now show as missing."
- **D-04:** "Skip dimensions" toggle in `AddProductModal`. When on: W/D/H fields grey out, not required. When off: current behavior.
- **D-05:** `Product.width`, `Product.depth`, `Product.height` become `number | null`. Null = "unspecified" → render 2×2×2 ft with **dashed accent-colored border in 2D** and **20% lower opacity (0.8) in 3D**.
- **D-06:** Jessica can set real dimensions later from `PropertiesPanel` when a placeholder product is selected.
- **D-07:** Library cards show `SIZE: UNSET` in dim row when any dimension is null.
- **D-08:** Current library-view name search (case-insensitive substring) already satisfies LIB-05. Keep + add test.
- **D-09:** New compact searchable product picker in canvas `Sidebar.tsx` — thumbnails + name, single search input, draggable via existing `DRAG_MIME`.
- **D-10:** Sidebar picker is name-only search. Category filter stays in full library view only.

### Claude's Discretion
- Exact styling of dashed placeholder border (thickness, dash pattern, opacity) — use obsidian-* + accent tokens.
- Toast/status message styling for orphan notification — reuse SaveIndicator pattern or a sidebar inline message.
- Sidebar product picker height / scroll behavior — pick per visual balance with existing sections.
- Whether to migrate `productStore` subscription into `FabricCanvas`/`ThreeViewport` props or have consumers subscribe directly.
- Whether nullable dim change needs a one-time migration at productStore init.

### Deferred Ideas (OUT OF SCOPE)
- Editing product name/category/image after creation
- Bulk product import
- Tagging / custom filters beyond category
- "Recently used" / "Favorites" in sidebar picker
- Cloud sync / cross-device library
- Product versioning or undo on library deletion
- GLB/OBJ model upload
- Auto-detecting dimensions from image metadata

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LIB-03 | Product library is global — persists across all room projects | Already true at persistence layer (`room-cad-products` key is global). Research confirms consolidation into `productStore` + decoupling from `cadStore` closes the requirement (see Architecture Patterns §1). |
| LIB-04 | Product dimensions are optional (image-only upload allowed) | `Product.width/depth/height` → `number \| null`; `AddProductModal` gets a Skip toggle; `fabricSync` + `ProductMesh` get a null-dim rendering branch with 2×2×2 ft placeholder (see Architecture Patterns §2-4). |
| LIB-05 | User can search products by name | Existing `ProductLibrary.tsx` line-27-34 substring match already satisfies. Add test + new sidebar picker replicates the same filter (see Architecture Patterns §5). |

## Standard Stack

### Core (already in project, no new installs)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^5.0.12 | `productStore` state + actions | Already used by `cadStore`, `uiStore`, `projectStore` — this IS the project's state convention |
| immer | ^11.1.4 | Immutable updates inside Zustand actions | Pattern mandated by `cadStore.ts` (see `produce((s) => ...)`) |
| idb-keyval | ^6.2.2 | Persist product list to browser IndexedDB under `room-cad-products` | Already used in App.tsx / Sidebar.tsx — direct `get`/`set` API |
| fabric | ^6.9.1 | 2D rendering (null-dim placeholder branch) | Existing rendering layer |
| three / @react-three/fiber | 0.183.2 / 8.17.14 | 3D rendering (opacity/transparency for null-dim) | Existing rendering layer |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | ^4.1.2 | Unit tests for store + search | All test files in `tests/` already use it |
| @testing-library/react | ^16 | Hook tests (renderHook) + component tests | Already used in `tests/SaveIndicator.test.tsx`, `tests/useAutoSave.test.ts` |
| jsdom | ^29.0.1 | Test environment | Configured via vitest |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| idb-keyval direct | zustand/middleware `persist` | Adds middleware layer; current project uses manual `set()` calls from hooks — mirroring it in productStore is more consistent |
| Nullable W/D/H | Sentinel value (e.g. `0` or `-1`) | Explicit `null` is TypeScript-idiomatic, forces exhaustive handling, matches "unspecified" semantics |
| Name search via fuzzy lib (Fuse.js) | Substring `toLowerCase().includes()` | LIB-05 says "type part of the name" — substring exactly matches. Fuzzy adds dep + complexity for no user benefit. |

**Installation:** No new packages required. All dependencies already in `package.json`.

**Version verification:** Skipped — all packages already installed at pinned versions verified by Phase 1 execution.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── stores/
│   ├── productStore.ts        # NEW — global product library (consolidates App+Sidebar loads)
│   ├── cadStore.ts            # unchanged
│   ├── projectStore.ts        # unchanged
│   └── uiStore.ts             # unchanged
├── types/
│   └── product.ts             # MODIFIED — width/depth/height nullable
├── components/
│   ├── AddProductModal.tsx    # MODIFIED — Skip dimensions toggle
│   ├── ProductLibrary.tsx     # MODIFIED — "SIZE: UNSET" rendering
│   ├── PropertiesPanel.tsx    # MODIFIED — editable W/D/H for null-dim products
│   ├── Sidebar.tsx            # MODIFIED — remove duplicate load + add product picker
│   └── SidebarProductPicker.tsx  # NEW (or inline in Sidebar.tsx)
├── canvas/
│   └── fabricSync.ts          # MODIFIED — null-dim + orphan placeholder branch
└── three/
    └── ProductMesh.tsx        # MODIFIED — opacity 0.8 for null-dim
```

### Pattern 1: Zustand Store with IndexedDB Persistence
**What:** Product state + mutations + automatic IndexedDB sync
**When to use:** The productStore — single source of truth for library products
**Example:**
```typescript
// Source: mirrors src/stores/cadStore.ts + src/hooks/useAutoSave.ts patterns
import { create } from "zustand";
import { produce } from "immer";
import { get, set } from "idb-keyval";
import type { Product } from "@/types/product";

const PRODUCTS_KEY = "room-cad-products";

interface ProductState {
  products: Product[];
  loaded: boolean;
  load: () => Promise<void>;
  addProduct: (p: Product) => void;
  removeProduct: (id: string) => void;
  updateProduct: (id: string, changes: Partial<Product>) => void;
}

export const useProductStore = create<ProductState>()((setState, getState) => ({
  products: [],
  loaded: false,

  load: async () => {
    const stored = await get<Product[]>(PRODUCTS_KEY);
    if (stored) {
      // Migration: coerce legacy non-null W/D/H to number | null
      const migrated = stored.map((p) => ({
        ...p,
        width: typeof p.width === "number" ? p.width : null,
        depth: typeof p.depth === "number" ? p.depth : null,
        height: typeof p.height === "number" ? p.height : null,
      }));
      setState({ products: migrated, loaded: true });
    } else {
      setState({ loaded: true });
    }
  },

  addProduct: (p) =>
    setState(
      produce((s: ProductState) => {
        s.products.push(p);
      })
    ),

  removeProduct: (id) =>
    setState(
      produce((s: ProductState) => {
        s.products = s.products.filter((x) => x.id !== id);
      })
    ),

  updateProduct: (id, changes) =>
    setState(
      produce((s: ProductState) => {
        const prod = s.products.find((x) => x.id === id);
        if (prod) Object.assign(prod, changes);
      })
    ),
}));

// Persist on every change (subscribe pattern, same as useAutoSave)
useProductStore.subscribe((state, prev) => {
  if (state.products !== prev.products && state.loaded) {
    set(PRODUCTS_KEY, state.products).catch(() => {});
  }
});
```

### Pattern 2: Nullable Dimension Schema
**What:** Make `width/depth/height` optional at the type level
**When to use:** `src/types/product.ts`
**Example:**
```typescript
export interface Product {
  id: string;
  name: string;
  category: string;
  width: number | null;   // feet, null = unspecified
  depth: number | null;
  height: number | null;
  material: string;
  imageUrl: string;
  modelUrl?: string;
  textureUrls: string[];
}

// Helper used by renderers + PropertiesPanel
export const PLACEHOLDER_DIM_FT = 2;

export function hasDimensions(p: Product): boolean {
  return p.width !== null && p.depth !== null && p.height !== null;
}

export function effectiveDimensions(p: Product | undefined): {
  width: number; depth: number; height: number; isPlaceholder: boolean;
} {
  if (!p || p.width == null || p.depth == null || p.height == null) {
    return { width: PLACEHOLDER_DIM_FT, depth: PLACEHOLDER_DIM_FT, height: PLACEHOLDER_DIM_FT, isPlaceholder: true };
  }
  return { width: p.width, depth: p.depth, height: p.height, isPlaceholder: false };
}
```

### Pattern 3: 2D Orphan/Null-Dim Rendering Branch
**What:** Extend `renderProducts` to handle missing product (orphan) AND null-dim product with a dashed-border placeholder
**When to use:** `src/canvas/fabricSync.ts` — the existing `if (!product) continue` branch becomes the orphan case
**Example:**
```typescript
// Source: extends src/canvas/fabricSync.ts renderProducts (current lines 107-109)
for (const pp of Object.values(placedProducts)) {
  const product = productLibrary.find((p) => p.id === pp.productId);
  const orphan = !product;
  const { width, depth, isPlaceholder } = effectiveDimensions(product);
  const showPlaceholder = orphan || isPlaceholder;

  const pw = width * scale;
  const pd = depth * scale;
  const isSelected = selectedIds.includes(pp.id);
  const cx = origin.x + pp.position.x * scale;
  const cy = origin.y + pp.position.y * scale;

  const border = new fabric.Rect({
    width: pw,
    height: pd,
    fill: showPlaceholder ? "rgba(124,91,240,0.04)" : "rgba(124,91,240,0.06)",
    stroke: isSelected
      ? PRODUCT_STROKE
      : showPlaceholder
      ? "#7c5bf0"   // accent
      : "#94a3b8",
    strokeWidth: isSelected ? 2 : 1,
    strokeDashArray: showPlaceholder ? [6, 4] : (isSelected ? undefined : [4, 3]),
    originX: "center",
    originY: "center",
  });

  const nameLabel = new fabric.FabricText(
    orphan ? "MISSING_PRODUCT" : product!.name,
    { /* same as today */ }
  );

  const dimLabel = new fabric.FabricText(
    showPlaceholder ? "SIZE: UNSET" : `${product!.width}' x ${product!.depth}'`,
    { /* same as today */ }
  );
  // ... rest of existing rendering
}
```

### Pattern 4: 3D Opacity for Null-Dim Products
**What:** Set material opacity to 0.8 with transparent=true when dimensions are null
**When to use:** `src/three/ProductMesh.tsx`
**Example:**
```typescript
// Source: extends src/three/ProductMesh.tsx
import { effectiveDimensions } from "@/types/product";

const { width, depth, height, isPlaceholder } = effectiveDimensions(product);
const rotY = -(placed.rotation * Math.PI) / 180;

return (
  <mesh position={[placed.position.x, height / 2, placed.position.y]} rotation={[0, rotY, 0]}>
    <boxGeometry args={[width, height, depth]} />
    <meshStandardMaterial
      color={isSelected ? "#93c5fd" : "#f3f4f6"}
      map={texture}
      transparent={isPlaceholder}
      opacity={isPlaceholder ? 0.8 : 1}
      roughness={0.6}
      metalness={0.1}
    />
  </mesh>
);
```

### Pattern 5: Sidebar Product Picker with Name Search
**What:** Compact draggable product list with search input, reuses Phase 1 drag-drop contract
**When to use:** New section inside `Sidebar.tsx` (below SNAP)
**Example:**
```typescript
// Source: simplified copy of ProductLibrary.tsx filter + DRAG_MIME pattern
const [search, setSearch] = useState("");
const products = useProductStore((s) => s.products);
const filtered = products.filter(
  (p) => !search || p.name.toLowerCase().includes(search.toLowerCase())
);

return (
  <div>
    <h3 className="font-mono text-[10px] text-text-ghost tracking-widest uppercase mb-2">
      PRODUCT_LIBRARY
    </h3>
    <input
      type="text"
      placeholder="SEARCH..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="w-full px-2 py-1 text-[10px] mb-2 font-mono"
    />
    <div className="space-y-1 max-h-64 overflow-y-auto">
      {filtered.map((p) => (
        <div
          key={p.id}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(DRAG_MIME, p.id);
            e.dataTransfer.effectAllowed = "copy";
          }}
          className="flex items-center gap-2 p-1.5 hover:bg-obsidian-high cursor-grab rounded-sm"
        >
          {p.imageUrl && (
            <img src={p.imageUrl} alt="" className="w-8 h-8 object-cover rounded-sm" />
          )}
          <span className="font-mono text-[10px] text-text-dim truncate">
            {p.name.toUpperCase().replace(/\s/g, "_")}
          </span>
        </div>
      ))}
    </div>
  </div>
);
```

### Anti-Patterns to Avoid
- **Do NOT keep `productLibrary` as a React state in App.tsx after introducing `productStore`** — that defeats the consolidation. Delete `useState<Product[]>`, `handleAddProduct`, `handleRemoveProduct`, and the loader `useEffect`.
- **Do NOT load products twice** — current bug is that both `App.tsx` and `Sidebar.tsx` read `room-cad-products` on mount. Store owns the load exactly once.
- **Do NOT pass `productLibrary` as a prop if the consumer can subscribe to the store directly** — prefer direct subscriptions for `Sidebar`, `PropertiesPanel`, `ProductLibrary`. Prop drilling is only necessary for the canvas tool module-level `_productLibrary` injection in `selectTool.ts`.
- **Do NOT mutate `placedProducts` when a library product is deleted** — orphans are a legit render state, not a broken state. The canvas is forgiving by design.
- **Do NOT render null-dim products at 0×0×0** — always use the 2×2×2 ft placeholder. Zero-dim breaks hit-testing and creates invisible selection targets.
- **Do NOT block on confirmation dialogs for product deletion** — D-03 is explicit: immediate delete + toast.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reactive product state | Manual React state + manual `set()` calls in multiple components | Zustand `productStore` (established pattern) | Matches cadStore/uiStore/projectStore convention; eliminates dual-loader bug |
| IndexedDB sync | Custom localStorage serializer | `idb-keyval` `get`/`set` | Already a project dep; already used for `room-cad-products`; async-safe |
| Immutable updates | Spread/clone-heavy handlers | `immer` `produce()` inside Zustand actions | Every existing store uses this |
| Name search | Fuzzy match library | `name.toLowerCase().includes(query.toLowerCase())` | LIB-05 literal requirement; ProductLibrary.tsx line 32 already does exactly this |
| Drag-drop contract | New dataTransfer MIME or custom protocol | Existing `DRAG_MIME` from `canvas/dragDrop.ts` | Canvas drop handler already reads this MIME; sidebar picker reuses verbatim |
| Toast notifications | Custom toast library (react-toastify, sonner) | Inline sidebar message or `SaveIndicator`-style fade | No toast lib in project; status indicator pattern already exists |

**Key insight:** This phase is 90% "use what we already have correctly." The only novelty is (a) the productStore file itself and (b) the null-dim rendering branch. Everything else is convention-following.

## Common Pitfalls

### Pitfall 1: Legacy Products Without Nullable Dims in IndexedDB
**What goes wrong:** Existing stored products have `width: 3, depth: 2, height: 3` (numbers). After schema change to `number | null`, TypeScript narrowing works, but runtime code that assumed "always number" breaks only for products added *after* the migration.
**Why it happens:** No forced migration at read time; mixed-shape data in IndexedDB.
**How to avoid:** Coerce at `productStore.load()`: `typeof p.width === "number" ? p.width : null`. This normalizes the shape on read, once, for every saved product. Also: always go through `effectiveDimensions()` helper — never read `product.width` directly in renderers.
**Warning signs:** `NaN` appearing in rendered dimension labels, 3D meshes with zero scale, TypeScript `possibly null` errors in renderer code.

### Pitfall 2: Sidebar + App Both Set ProductLibrary (Race Condition)
**What goes wrong:** Today both `App.tsx` and `Sidebar.tsx` call `get<Product[]>(PRODUCTS_KEY)` and `setProductLibrary()` on mount. Whichever finishes last wins. If Sidebar mounts/unmounts (switching view modes), it reloads.
**Why it happens:** Dual ownership of async-loaded state.
**How to avoid:** Single `load()` call in App.tsx (or a top-level effect that calls `useProductStore.getState().load()` once). Remove Sidebar's loader useEffect entirely.
**Warning signs:** Products appearing/disappearing when switching between 2D/3D/library views, flash of empty library on mount.

### Pitfall 3: Zustand Persist Fires Before Load Completes
**What goes wrong:** If `productStore.subscribe((s) => set(PRODUCTS_KEY, s.products))` fires during the initial empty-state render (before `load()` completes), IndexedDB gets overwritten with `[]`.
**Why it happens:** Store initializes with `products: []` synchronously; subscribe attaches immediately; `load()` resolves later.
**How to avoid:** Guard the subscribe with `if (state.loaded)` — only persist AFTER load completes. See Pattern 1 example.
**Warning signs:** Product library empties itself on page reload.

### Pitfall 4: Orphan Placeholder Breaks Hit-Testing
**What goes wrong:** `selectTool.hitTestStore()` (lines 47-62) does `_productLibrary.find(...)` and `continue` if not found. An orphan product becomes un-clickable, un-deletable.
**Why it happens:** Hit-testing assumes product exists in library.
**How to avoid:** Hit-test must use `effectiveDimensions()` too — if product missing, use 2×2 ft AABB at the placed position. Same pattern as renderer.
**Warning signs:** Jessica can see a "missing product" box but can't click or delete it.

### Pitfall 5: `selectTool`'s `setSelectToolProductLibrary` Injection Becomes Stale
**What goes wrong:** `selectTool.ts` line 86 stores `_productLibrary` as a module-level variable, synced via `setSelectToolProductLibrary()` from `FabricCanvas.tsx`. After removing prop drilling, the tool must still get fresh products.
**Why it happens:** Tool modules read store outside React via `useCADStore.getState()`; they'd need the same pattern for productStore.
**How to avoid:** Either (a) call `useProductStore.getState().products` directly inside `hitTestStore()`, or (b) keep the injection but feed it from `FabricCanvas`'s own productStore subscription. Option (a) is cleaner.
**Warning signs:** Newly-added products don't become selectable; deleted-then-re-added products fail hit-test.

### Pitfall 6: Dashed Border + Selected State Visual Collision
**What goes wrong:** Current code uses `strokeDashArray: [4, 3]` for unselected products. Null-dim placeholder adds `[6, 4]` dashed. When null-dim product is selected, dash gets cleared → placeholder looks identical to real selected product.
**Why it happens:** Two states competing for the same stroke style.
**How to avoid:** Always apply `[6, 4]` dash for placeholders, regardless of selection. Differentiate selection via strokeWidth (2 vs 1) only for placeholders.
**Warning signs:** Jessica can't tell at a glance which products have real dimensions.

## Code Examples

### Subscribe to productStore in a Component
```typescript
// Source: mirrors src/components/Sidebar.tsx cadStore subscription pattern
import { useProductStore } from "@/stores/productStore";

export default function Sidebar() {
  const products = useProductStore((s) => s.products);
  const removeProduct = useProductStore((s) => s.removeProduct);
  // ...
}
```

### Initialize productStore on App Mount
```typescript
// Source: src/App.tsx — replaces current load useEffect
import { useProductStore } from "@/stores/productStore";

useEffect(() => {
  useProductStore.getState().load();
}, []);
```

### AddProductModal "Skip Dimensions" Toggle
```typescript
// Source: src/components/AddProductModal.tsx
const [skipDims, setSkipDims] = useState(false);

function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!name) return;
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
  });
  onClose();
}

// In JSX, above dimensions grid:
<label className="flex items-center gap-2 cursor-pointer">
  <input
    type="checkbox"
    checked={skipDims}
    onChange={(e) => setSkipDims(e.target.checked)}
    className="w-3 h-3 accent-accent"
  />
  <span className="font-mono text-[9px] text-text-ghost tracking-wider">
    SKIP_DIMENSIONS
  </span>
</label>

// And gate the grid:
<div className={`grid grid-cols-3 gap-2 ${skipDims ? "opacity-40 pointer-events-none" : ""}`}>
```

### PropertiesPanel Editable W/D/H for Null-Dim Products
```typescript
// Source: src/components/PropertiesPanel.tsx extends pp branch
const updateProduct = useProductStore((s) => s.updateProduct);
const product = useProductStore((s) =>
  pp ? s.products.find((p) => p.id === pp.productId) : undefined
);

{product && product.width == null && (
  <div className="space-y-1.5">
    <Row label="SIZE" value="UNSET" />
    <div className="grid grid-cols-3 gap-1 pt-1">
      <input
        type="number" step={0.25} min={0.25}
        placeholder="W"
        onBlur={(e) => {
          const v = +e.target.value;
          if (v > 0) updateProduct(product.id, { width: v });
        }}
        className="w-full px-1 py-0.5 text-[10px] font-mono"
      />
      {/* ...depth, height */}
    </div>
  </div>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useState<Product[]>` in App.tsx + duplicate loader in Sidebar.tsx | Zustand `productStore` with single IndexedDB loader | Phase 2 (this phase) | Eliminates double-load race; enables direct subscription from canvas tools |
| `Product.width/depth/height: number` (required) | `number \| null` with `effectiveDimensions()` helper | Phase 2 | Unlocks LIB-04 (image-only products) |
| Product library scoped mentally to "this session's app state" | Explicitly global store decoupled from `cadStore` (CADSnapshot) | Phase 2 | Codifies LIB-03 (was already true at persistence layer) |
| `product.imageUrl` read directly in `ProductMesh` via `THREE.TextureLoader` sync `.load()` | Same pattern, now with `transparent` + `opacity` on material for placeholders | Phase 2 | Visual affordance for "approximate size" |

**Deprecated/outdated:** None — this phase introduces new surface area, no removal.

## Open Questions

1. **Where does the orphan notification toast live?**
   - What we know: D-03 mandates a toast "Deleted [name] — N placements now show as missing."
   - What's unclear: Whether to build a mini toast component or surface it inline in the sidebar next to the library picker.
   - Recommendation: Reuse the `SaveIndicator` fade pattern — add a second status field to `projectStore` (or a new `notificationStore`) with message + auto-clear after ~4s. Planner decides. Simplest: a `libraryNotice` field in productStore itself.

2. **Should `productStore.load()` block the welcome screen?**
   - What we know: Current load is non-blocking; library just appears empty until resolved.
   - What's unclear: Whether to gate anything on load.
   - Recommendation: Non-blocking. Match current behavior. Jessica sees empty library briefly on first load; after first add, IndexedDB has data and subsequent loads are fast.

3. **Does `selectTool._productLibrary` injection stay or go?**
   - What we know: `FabricCanvas.tsx` line 48-50 calls `setSelectToolProductLibrary(productLibrary)` on every render.
   - What's unclear: Whether the tool should read productStore directly via `useProductStore.getState()`.
   - Recommendation: Migrate to direct store read. Keeps tool module stateless. Delete `setSelectToolProductLibrary` export.

## Environment Availability

Skipped — no new external tools or dependencies. All work uses existing npm packages (zustand, immer, idb-keyval, fabric, three, vitest) already verified available in Phase 1.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.2 + @testing-library/react ^16 + jsdom ^29 |
| Config file | `vite.config.ts` (vitest config inline) + `tests/setup.ts` |
| Quick run command | `npm run test:quick` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LIB-03 | productStore consolidates library; load() migrates legacy shapes; persist gated on loaded=true | unit | `npm run test -- productStore` | ❌ Wave 0 |
| LIB-03 | Adding product in one "project session" persists and reloads | unit (idb-keyval mocked) | `npm run test -- productStore` | ❌ Wave 0 |
| LIB-03 | Orphan placedProducts render without crashing (name="MISSING_PRODUCT", 2x2 placeholder) | unit (effectiveDimensions helper) | `npm run test -- product.helpers` | ❌ Wave 0 |
| LIB-04 | `effectiveDimensions(null-dim product)` returns 2/2/2 + isPlaceholder:true | unit | `npm run test -- product.helpers` | ❌ Wave 0 |
| LIB-04 | AddProductModal submit with skipDims=true passes null W/D/H to onAdd | component | `npm run test -- AddProductModal` | ❌ Wave 0 |
| LIB-04 | PropertiesPanel editable inputs update productStore for null-dim products | component | `npm run test -- PropertiesPanel` | ❌ Wave 0 |
| LIB-05 | Name substring filter: "EAMES" matches "Eames Lounge Chair" (case-insensitive) | unit | `npm run test -- productSearch` | ❌ Wave 0 |
| LIB-05 | SidebarProductPicker draggable items have correct DRAG_MIME payload | component | `npm run test -- SidebarProductPicker` | ❌ Wave 0 |
| LIB-05 | Empty search returns full list; whitespace-only search returns full list | unit | `npm run test -- productSearch` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:quick`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/productStore.test.ts` — covers LIB-03 (load/migrate/add/remove/persist-gate)
- [ ] `tests/productHelpers.test.ts` — covers LIB-04 (`effectiveDimensions`, `hasDimensions`)
- [ ] `tests/productSearch.test.ts` — covers LIB-05 (substring match, case-insensitive, empty/whitespace)
- [ ] `tests/AddProductModal.test.tsx` — covers LIB-04 (skipDims toggle submits null)
- [ ] `tests/SidebarProductPicker.test.tsx` — covers LIB-05 (search filter + DRAG_MIME on dragstart)
- [ ] `tests/PropertiesPanel.test.tsx` (optional) — covers LIB-04 (editable W/D/H for null-dim)

No framework install needed — vitest + testing-library already configured (Phase 1 used them).

## Project Constraints (from CLAUDE.md)

### Required Patterns
- **Store-driven rendering:** New productStore fits the "Zustand is source of truth" pattern. Both Fabric and Three.js read from stores, neither mutates the other.
- **Real-world feet coordinates:** 2×2×2 placeholder is 2 feet in each axis, stored in feet like all other dimensions.
- **Tool lifecycle pattern:** If productStore gets read inside `selectTool.ts`, use the `useProductStore.getState()` outside-React access pattern (matches `useCADStore.getState()` usage).
- **Obsidian CAD design tokens:** All new UI uses `font-mono`, IBM Plex Mono, `obsidian-*` surface scale, `accent`/`accent-light` purple, `text-text-ghost/dim/primary` hierarchy.
- **Naming conventions:** Store file `productStore.ts` (camelCase + suffix), exported hook `useProductStore`, product IDs `prod_${uid()}` (already convention).
- **UI label convention:** `SKIP_DIMENSIONS`, `SIZE: UNSET`, `PRODUCT_LIBRARY`, `MISSING_PRODUCT`, `SEARCH...` — uppercase snake, monospace.
- **`type: "commonjs"` in package.json** but source is ESNext — keep `.ts` ESM syntax, Vite bundles it.

### Forbidden Patterns
- No backend calls — persistence is IndexedDB only.
- No shadcn/ui — use custom Tailwind components only.
- No new CSS files — use `src/index.css` tokens + Tailwind utilities.
- No GLTF/OBJ model upload — explicitly out of scope per PROJECT.md.
- No cross-device sync — local-first, single-user.

### Testing Rules
- vitest + jsdom + @testing-library/react; test files live in `tests/` at project root (NOT co-located).
- Mock `@/lib/serialization` and `idb-keyval` when testing the store.
- Use `vi.useFakeTimers()` for any debounce/timer-based behavior.

## Sources

### Primary (HIGH confidence)
- `./CLAUDE.md` — Obsidian CAD tokens, naming, architecture patterns
- `.planning/PROJECT.md` — Locked tech decisions (React 18, Zustand, Fabric/Three split, local-first)
- `.planning/REQUIREMENTS.md` — LIB-03/04/05 requirement text
- `.planning/ROADMAP.md §Phase 2` — Success criteria
- `.planning/phases/02-product-library/02-CONTEXT.md` — All locked decisions
- `src/stores/cadStore.ts`, `src/stores/projectStore.ts`, `src/stores/uiStore.ts` — Zustand + Immer store templates
- `src/hooks/useAutoSave.ts` — subscribe-and-persist pattern for IndexedDB
- `src/components/ProductLibrary.tsx` line 27-34 — existing substring search
- `src/canvas/dragDrop.ts` — DRAG_MIME contract from Phase 1
- `src/canvas/fabricSync.ts` lines 107-168 — product rendering entry point
- `src/three/ProductMesh.tsx` — 3D product rendering
- `src/canvas/tools/selectTool.ts` — product hit-testing via `_productLibrary` injection
- `package.json` — dependency versions locked

### Secondary (MEDIUM confidence)
- None required — phase is purely internal refactor + small UI additions using existing patterns.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all deps already in package.json, all patterns proven in existing stores
- Architecture: HIGH — productStore mirrors existing stores 1:1; rendering branch extends existing fabricSync
- Pitfalls: HIGH — derived from reading existing code, spotting the dual-loader bug, understanding tool injection

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (30 days — internal patterns are stable)
