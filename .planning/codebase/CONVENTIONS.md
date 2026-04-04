# Coding Conventions

**Analysis Date:** 2026-04-04

## Naming Patterns

**Files:**
- React components: PascalCase — `PropertiesPanel.tsx`, `AddProductModal.tsx`
- Stores: camelCase with suffix — `cadStore.ts`, `uiStore.ts`
- Utility libraries: camelCase — `geometry.ts`, `serialization.ts`
- Type definitions: camelCase — `cad.ts`, `product.ts`
- Canvas tools: camelCase with suffix — `wallTool.ts`, `productTool.ts`

**Functions and handlers:**
- Event handlers: `handle` prefix — `handleSubmit`, `handleDelete`, `handleLoad`, `handleDrop`
- Boolean togglers: `toggle` prefix in stores — `toggleGrid`, `toggleProductLibrary`
- Async operations: verb + noun — `saveProject`, `loadProject`, `deleteProject`, `listProjects`
- Utility functions: verb + noun — `snapTo`, `snapPoint`, `formatFeet`, `wallLength`, `wallCorners`

**Variables:**
- camelCase throughout — `productLibrary`, `activeCategory`, `gridSnap`, `placedProducts`
- Boolean flags: `show` prefix for visibility — `showGrid`, `showProductLibrary`, `showProperties`
- Constants: UPPER_SNAKE_CASE — `MAX_HISTORY`, `PRODUCTS_KEY`, `STATUS_MESSAGES`, `PRODUCT_CATEGORIES`

**Types and Interfaces:**
- Interfaces: PascalCase — `Point`, `WallSegment`, `Opening`, `PlacedProduct`, `Room`, `CADSnapshot`
- Type aliases: PascalCase — `ToolType`, `ViewMode`
- Store state interfaces: PascalCase with `State` suffix — `CADState`, `UIState`
- Props interfaces: named `Props` (local to each file, not exported)

**ID prefixes:**
- Walls: `wall_` prefix — `wall_${uid()}`
- Placed products: `pp_` prefix — `pp_${uid()}`
- Openings: `op_` prefix — `op_${uid()}`
- Products: `prod_` prefix — `prod_${uid()}`
- Projects: `proj_` prefix — `proj_${uid()}`

## UI Label Convention (Obsidian CAD Theme)

All visible UI labels, titles, status text, and identifiers rendered in the interface use `SCREAMING_SNAKE_CASE` with underscores replacing spaces:
- Section headers: `ROOM_CONFIG`, `SYSTEM_STATS`, `LAYERS`, `SNAP`
- Tool labels: `SELECT`, `WALL`, `DOOR`, `WINDOW`
- View labels: `2D_PLAN`, `3D_VIEW`, `LIBRARY`, `SPLIT`
- Property names: `LENGTH`, `THICKNESS`, `HEIGHT`, `WIDTH_FT`, `MATERIAL_FINISH`
- Status strings: `SYSTEM_STATUS: READY`, `SAVED`, `BUILDING_SCENE...`
- Dynamic identifiers: `WALL_SEGMENT_{id}`, `{PRODUCT_NAME_UPPERCASED}`
- Product names displayed: `.toUpperCase().replace(/\s/g, "_")`

This convention applies to all `font-mono` text in the UI. Descriptive body text (non-label prose) uses normal sentence case.

## Component Structure

All components are default-exported function components. Props are typed via a local `interface Props {}` block at the top of the file.

**Standard component structure:**
```tsx
import { ... } from "...";
import type { ... } from "@/types/...";

interface Props {
  // typed props
}

export default function ComponentName({ prop1, prop2 }: Props) {
  // store subscriptions via individual selectors
  const value = useCADStore((s) => s.value);

  // local state
  const [state, setState] = useState(initialValue);

  // handlers (function declarations, not arrow functions)
  function handleAction() { ... }

  return ( /* JSX */ );
}

// Small co-located sub-components at bottom of file (named exports)
function Row({ label, value }: { label: string; value: string }) { ... }
```

**Handlers:** Always function declarations (`function handleX()`), not arrow function assignments.

**Store subscriptions:** Use individual fine-grained selectors per value — `useCADStore((s) => s.walls)` — never destructure the whole store.

**Lazy loading:** Use `React.lazy` + `Suspense` for heavy Three.js viewport:
```tsx
const ThreeViewport = lazy(() => import("@/three/ThreeViewport"));
```

**Named sub-exports:** Small co-located components are named exports in the same file:
- `export function ToolPalette()` lives in `src/components/Toolbar.tsx`

## Styling Approach

**Framework:** Tailwind CSS v4 via `@tailwindcss/vite` plugin. No `tailwind.config.js` — tokens are defined in `src/index.css` inside `@theme {}`.

**Token usage:** Always prefer design token classes over raw values:
- Backgrounds: `bg-obsidian-deepest`, `bg-obsidian-base`, `bg-obsidian-low`, `bg-obsidian-mid`, `bg-obsidian-high`, `bg-obsidian-highest`, `bg-obsidian-bright`
- Text: `text-text-primary`, `text-text-muted`, `text-text-dim`, `text-text-ghost`
- Accent: `text-accent`, `text-accent-light`, `bg-accent`, `bg-accent/10`, `bg-accent/20`, `border-accent/30`
- Semantic: `text-success`, `text-warning`, `text-error`, `text-info`
- Borders: `border-outline-variant/20`, `ghost-border` (custom CSS class)

**Custom CSS classes** (defined in `src/index.css`, do not remove):
- `glass-panel` — glassmorphism surface: `rgba(31, 30, 42, 0.8)` background, `backdrop-filter: blur(12px)`
- `ghost-border` — subtle 15% opacity border
- `cad-grid-bg` — radial dot grid background pattern
- `accent-glow` — purple glow box-shadow
- `cursor-crosshair` / `cursor-grab` — canvas cursor overrides

**Border radius:** Always use `rounded-sm` (maps to `--radius-sm: 2px` — machined precision aesthetic). Never use `rounded`, `rounded-md`, `rounded-lg`, or arbitrary radii.

**Typography classes:**
- `font-mono` — IBM Plex Mono — used for ALL labels, values, identifiers, and UI chrome
- `font-display` — Space Grotesk — used for large hero headings (`DESIGN_YOUR_SPACE`, brand name)
- `font-body` (default, via CSS) — Inter — used for descriptive prose paragraphs

**Font sizing:** UI uses very small type — `text-[9px]`, `text-[10px]`, `text-xs` (12px) are most common. Use `tracking-widest` on mono labels, `tracking-wider` on values.

**Glow shadows:** Use inline style or arbitrary Tailwind for accent glow:
```tsx
className="shadow-[0_0_15px_rgba(124,91,240,0.2)]"
```

**Conditional classes:** Use template literal ternary pattern:
```tsx
className={`base-classes ${condition ? "active-classes" : "inactive-classes"}`}
```

## Design System Tokens (Obsidian CAD Theme)

Defined in `src/index.css` under `@theme {}`:

| Token | Value | Usage |
|-------|-------|-------|
| `--color-obsidian-deepest` | `#0d0d18` | Deepest background, headers, status bar |
| `--color-obsidian-base` | `#12121d` | App root background |
| `--color-obsidian-low` | `#1b1a26` | Sidebar, card backgrounds |
| `--color-obsidian-mid` | `#1f1e2a` | Modal backgrounds |
| `--color-obsidian-high` | `#292935` | Hover states, badges |
| `--color-obsidian-highest` | `#343440` | Elevated surfaces |
| `--color-accent` | `#7c5bf0` | Primary interactive color (purple) |
| `--color-accent-light` | `#ccbeff` | Values, active labels |
| `--color-accent-dim` | `#4a3d7b` | Dimmed accent |
| `--color-accent-deep` | `#340098` | Deep accent |
| `--color-accent-glow` | `rgba(124,91,240,0.2)` | Glow effects |
| `--color-text-primary` | `#e3e0f1` | Primary readable text |
| `--color-text-muted` | `#cac3d7` | Secondary text |
| `--color-text-dim` | `#938ea0` | Tertiary text |
| `--color-text-ghost` | `#484554` | Labels, disabled text |
| `--color-success` | `#22c55e` | Status indicators |
| `--color-warning` | `#ffb875` | Warning states |
| `--color-error` | `#ffb4ab` | Error states |
| `--color-outline` | `#938ea0` | Borders |
| `--color-outline-variant` | `#484554` | Subtle borders |
| `--radius-sm` | `2px` | All border radii |
| `--font-display` | Space Grotesk | Hero headings |
| `--font-body` | Inter | Prose |
| `--font-mono` | IBM Plex Mono | All UI chrome |

## State Management Conventions

**Two Zustand stores:**
- `src/stores/cadStore.ts` — CAD scene data (room, walls, placed products, undo/redo history)
- `src/stores/uiStore.ts` — UI interaction state (active tool, selection, visibility flags, grid snap)

**Immer for mutations:** `cadStore` uses `produce` from immer for all state mutations. `uiStore` uses plain Zustand set objects (no immer needed — shallow updates only).

**History pattern (cadStore):** Every mutating action calls `pushHistory(s)` before modifying state. History is capped at `MAX_HISTORY = 50` snapshots.

**Selector pattern:** Always subscribe to the minimal slice:
```ts
const walls = useCADStore((s) => s.walls);         // correct
const store = useCADStore();                         // never do this
```

**Persistence:** Product library is persisted via `idb-keyval` (IndexedDB) under key `"room-cad-products"`. Projects are persisted via `src/lib/serialization.ts` (also IndexedDB). CAD store itself is ephemeral — no automatic persistence.

**Local React state:** Used for UI-only concerns not needed in other components — modal open/close (`showAddModal`), form field values, project name input.

## Import Organization

1. React built-ins — `import { useState, useEffect } from "react"`
2. Third-party packages — `import { create } from "zustand"`
3. Internal stores — `import { useCADStore } from "@/stores/cadStore"`
4. Internal types — `import type { Product } from "@/types/product"`
5. Internal components — `import Toolbar from "@/components/Toolbar"`
6. Internal lib — `import { uid } from "@/lib/geometry"`

**Path alias:** `@/` maps to `src/` (configured in `vite.config.ts`). Always use `@/` for all internal imports, never relative paths.

**Type-only imports:** Use `import type` for all type-only imports — `import type { ToolType } from "@/types/cad"`.

## Known Style Inconsistency

`src/components/ProductForm.tsx` and `src/components/ProjectManager.tsx` are legacy components that have not been migrated to the Obsidian CAD design system. They use light-theme Tailwind classes (`border-gray-200`, `bg-gray-100`, `text-gray-600`, `bg-blue-50`, `border-cad-accent`) inconsistent with the rest of the codebase. These components appear to be superseded by `AddProductModal.tsx` and the project management features embedded in `App.tsx`. Do not replicate these old patterns.

---

*Convention analysis: 2026-04-04*
