# Room CAD Renderer — CLAUDE.md

## What This Is

A production-grade interior design CAD tool. Users create dimensionally accurate 2D floor plans, upload custom products/materials, and convert plans into realistic 3D renderings. Built for interior designers who need real-world accuracy.

This is NOT a territory planning tool or a sales tool. It is a room design and visualization application.

---

## Tech Stack

- **React 18** + TypeScript via Vite
- **Tailwind CSS v4** via @tailwindcss/vite
- **Fabric.js v6** for the 2D CAD canvas
- **Three.js** via @react-three/fiber v8 + @react-three/drei v9
- **Zustand v5** + Immer for state management (undo/redo)
- **idb-keyval** for IndexedDB persistence (products + projects)
- **No backend** — local-first, browser storage only

---

## File Structure

```
src/
  main.tsx                       → React entry, imports index.css
  App.tsx                        → shell: toolbar + sidebar + 2D/3D/split views
  index.css                      → Tailwind base + custom CAD CSS vars

  types/
    cad.ts                       → Point, WallSegment, Opening, PlacedProduct, Room, CADSnapshot, ToolType
    product.ts                   → Product, PRODUCT_CATEGORIES

  stores/
    cadStore.ts                  → Zustand: room, walls, placedProducts, undo/redo history
    uiStore.ts                   → activeTool, selectedIds, gridSnap, showGrid, panel visibility

  canvas/
    FabricCanvas.tsx             → 2D canvas component, store-driven redraw, tool activation
    fabricSync.ts                → renders walls (polygons) + products (groups) from store
    grid.ts                      → 1ft grid with major/minor lines
    dimensions.ts                → room edge labels + wall dimension labels (feet+inches)
    tools/
      selectTool.ts              → click to select, drag to move walls/products, Delete to remove
      wallTool.ts                → click-click to draw thick walls, Shift for orthogonal
      doorTool.ts                → click on wall to place 3' door opening
      windowTool.ts              → click on wall to place 3' window opening
      productTool.ts             → click on canvas to place product from library

  three/
    ThreeViewport.tsx            → R3F Canvas with Scene component
    WallMesh.tsx                 → wall extrusion via ExtrudeGeometry, door/window holes
    ProductMesh.tsx              → textured box placeholder for products
    Lighting.tsx                 → directional + ambient + hemisphere lights

  components/
    Toolbar.tsx                  → tool buttons, undo/redo, grid toggle, export
    Sidebar.tsx                  → container: project manager + room settings + properties + product library
    RoomSettings.tsx             → width/length/height inputs, grid snap dropdown
    ProductLibrary.tsx           → product list, category filter, place/remove actions
    ProductForm.tsx              → add product form (name, category, dims, material, image)
    PropertiesPanel.tsx          → selected object properties display
    ProjectManager.tsx           → save/load/new/delete projects (IndexedDB)

  lib/
    geometry.ts                  → snapTo, distance, angle, wallCorners, formatFeet, closestPointOnWall, uid
    serialization.ts             → saveProject, loadProject, listProjects (IndexedDB)
    export.ts                    → exportRenderedImage, export2DImage (canvas toDataURL)
```

---

## Architecture

### Data Flow
```
Zustand Store (source of truth)
    ├── Fabric.js (2D view) — reads store, renders canvas objects
    └── Three.js (3D view) — reads store, renders meshes
```

User interacts with Fabric canvas → tool handler calls Zustand action → store updates → both views re-render. Neither view mutates the other.

### Wall Data Model
Walls are defined by start/end points in feet with configurable thickness. They're rendered as:
- 2D: `fabric.Polygon` (4-corner thick rectangle via `wallCorners()`)
- 3D: `THREE.ExtrudeGeometry` from a shape with holes for openings

### Tool System
Each tool (select, wall, door, window, product, ceiling) attaches event handlers on the Fabric canvas. Tools are activated via `activateXTool(fc, scale, origin)`, which **returns a `() => void` cleanup function**. `FabricCanvas.tsx` stores the returned cleanup fn in a `useRef<(() => void) | null>` (`toolCleanupRef`) and invokes it on tool switch + unmount. Per-activation mutable state lives inside the `activate()` closure as `let` bindings — no module-level `const state` objects. Shared helpers (`pxToFeet`, `findClosestWall`) live in `src/canvas/tools/toolUtils.ts`.

### Undo/Redo
Zustand store keeps `past[]` and `future[]` arrays of `CADSnapshot` objects (room + walls + placedProducts). Max 50 history entries. Every mutation pushes a snapshot before applying changes.

---

## Key Patterns

1. **Store-driven rendering**: Canvas is fully cleared and redrawn from store state on every change. No incremental updates.

2. **Coordinate system**: All measurements in feet. Canvas pixels = feet × scale. `pxToFeet()` and origin offset convert between coordinate systems.

3. **Grid snapping**: `snapPoint(point, gridSnap)` rounds to nearest increment. Default 0.5ft (6 inches).

4. **Hit testing**: Select tool uses store data (not Fabric `containsPoint`) — checks distance to walls via `closestPointOnWall()`, AABB for products.

5. **Tool cleanup pattern**: Each tool's `activateXTool(fc, scale, origin)` function returns a `cleanup: () => void` callback. `FabricCanvas.tsx` holds the returned cleanup fn in a `useRef` and invokes it on tool switch + unmount. Mutable tool state lives in the activate() closure — no module-level singletons. Intentional exceptions (D-07 public-API bridges): `productTool.pendingProductId` + `setPendingProduct()` (toolbar → tool bridge) and `selectTool._productLibrary` + `setSelectToolProductLibrary()` (productLibrary injection). Shared helpers in `src/canvas/tools/toolUtils.ts`.

6. **View modes**: App supports "2d", "3d", "split". Split uses `w-1/2` containers. FabricCanvas uses ResizeObserver to handle layout changes.

7. **StrictMode-safe useEffect cleanup for module-level registries**: When a `useEffect` writes to a module-level registry, global, or shared callback collection, it MUST return a cleanup function that clears the entry on unmount. React StrictMode (active in dev via `src/main.tsx`) double-mounts components — first mount runs the effect, then unmounts immediately, then remounts. Without cleanup, the registry retains a stale ref to the discarded first-mount instance, and downstream consumers (test drivers, async callbacks, render-tick hooks) read garbage.

   **We've hit this trap twice:**
   - **Phase 58** (`f5f6c46`): `gltfThumbnailGenerator` stored a single `onReady` callback per gltfId; first mount registered, StrictMode unmount discarded it, second mount saw `computing.has(gltfId)` and skipped its own registration. Fix: `Set<() => void>` per gltfId, fire all callbacks on resolve.
   - **Phase 64** (commit `acfb9c2`): `WallMesh` wrote `matRefA.current` to the test-mode `__wallMeshMaterials` registry on mount with no cleanup. After 2D→3D toggle the registry pointed at a discarded material; e2e flake on chromium-dev. Fix: cleanup function with identity check `if (reg[id] === matRefA.current) reg[id] = null`.

   **Required pattern when writing to a module-level registry from an effect:**
   ```ts
   useEffect(() => {
     const reg = (window as ...).__someRegistry;
     if (!reg) return;
     reg[id] = currentValue;
     return () => {
       // Identity check prevents clobbering a registration from a remount that already happened
       if (reg[id] === currentValue) reg[id] = null;
     };
   }, [id, ...]);
   ```

   Applies to: test-mode registries (`__wallMeshMaterials`, `__driver*`), shared callback Sets (FIX-01 onReady pattern), bridge functions installed by Scene/Canvas mount (e.g., Phase 48 `installCameraCapture`), and any other module-level state a useEffect mutates.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| V | Select tool |
| W | Wall tool |
| D | Door tool |
| N | Window tool |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| Delete/Backspace | Delete selected |
| Shift (held) | Orthogonal constraint while drawing walls |
| Alt/Option (held) | Disable smart snap during drag/placement (grid snap still applies) |
| Escape | Cancel current tool action |

---

## Remaining Work

### Open functional items:
- Product images don't load async in 2D canvas (border only, no image)
- GLTF/OBJ model loading for 3D products
- User-uploaded PBR textures on 3D materials
- Camera presets (eye-level, top-down)
- Editable dimension labels (double-click to change wall length)

### Auto-save (shipped Phase 28, v1.6):
- 2000ms debounced save via `useAutoSave`. Triggers: CAD mutations (rooms/activeRoomId/customElements) and project rename (`projectStore.activeName` while `activeId` is non-null). UI-store changes do NOT trigger saves.
- Status states: `idle | saving | saved | failed`. `SAVE_FAILED` persists until the next successful save (no auto-fade) — Jessica must see failures before closing the tab.
- Silent restore on mount: `App.tsx` reads `room-cad-last-project` pointer via `getLastProjectId()`, calls `loadProject(id)`, hydrates cadStore + projectStore, skips WelcomeScreen on success. No pointer / stale pointer / load error → falls through to WelcomeScreen.

### Drag-to-Resize + Label Override (shipped Phase 31, v1.6):
- **Per-axis product resize:** Edge handles (N/S/E/W) write `PlacedProduct.widthFtOverride` or `depthFtOverride` (new optional fields); corner handles continue to update `sizeScale` for uniform resize. Override fields also exist on `PlacedCustomElement`. Effective-dimension resolver: `resolveEffectiveDims(product, placed)` in `src/types/product.ts` — `override ?? (libraryDim × sizeScale)`. All consumers (3D mesh, 2D sync, snap scene, selectTool hit-test) migrated. Legacy `effectiveDimensions(product, scale)` preserved for placement-preview contexts that have no `PlacedProduct`.
- **Wall-endpoint smart-snap:** Wall-endpoint drag in selectTool invokes `computeSnap()` with a restricted scene (`buildWallEndpointSnapScene` in `src/canvas/wallEndpointSnap.ts`) containing ONLY other-wall endpoints + midpoints — walls do NOT snap to product/custom-element bboxes (D-05). Shift constrains to ortho axis; Alt disables smart-snap and keeps grid-snap (matches Phase 30 convention). Accent-purple guide reuses Phase 30 `snapGuides.ts`.
- **Single-undo hardening:** Drag-transaction pattern (pushHistory at drag start via empty `update*(id, {})` + `*NoHistory` mid-drag) extended to new `resizeProductAxis` / `resizeCustomElementAxis` pairs. `past.length` increments by exactly 1 per complete drag cycle. Preserves Phase 25 PERF-01 fast-path (`_dragActive` flag + `renderOnAddRemove: false`).
- **Per-placement label override (custom elements):** `PlacedCustomElement.labelOverride?: string` (max 40 chars). Rendered in 2D via `(placed.labelOverride ?? catalog.name).toUpperCase()` at `src/canvas/fabricSync.ts` custom-element label site. PropertiesPanel input live-previews on keystroke (no debounce), commits on Enter/blur (one history entry), Escape rewinds live-preview. Empty string → reverts to catalog name. RESET_SIZE affordance next to overridden size fields clears `widthFtOverride`/`depthFtOverride` via new `clearProductOverrides` / `clearCustomElementOverrides` store actions.
- **New store actions (cadStore):** `updatePlacedCustomElement` / `updatePlacedCustomElementNoHistory` (placement mutator — distinct from the catalog-mutating `updateCustomElement`, which is untouched), `resizeProductAxis` / `resizeProductAxisNoHistory`, `resizeCustomElementAxis` / `resizeCustomElementAxisNoHistory`, `clearProductOverrides`, `clearCustomElementOverrides`.
- **Test drivers:** `window.__driveResize`, `window.__driveWallEndpoint`, `window.__driveLabelOverride`, `window.__getCustomElementLabel` (all gated by `import.meta.env.MODE === "test"`).

### Planned phases:
- Design system redesign (pending mockups)
- Backend + auth (Fastify + Postgres + R2)
- Advanced 3D (CSG verification, environment maps, PBR materials)

---

## Design System (Phase 71 — v1.18)

### Icon Policy (D-33, updated Phase 71)

**lucide-react only across the chrome.** The Phase 33 Material Symbols allowlist (10 files) was deleted in Phase 71 (v1.18 TOKEN-FOUNDATION) per D-15.

Where lucide-react lacks an exact match for a CAD-domain glyph (`stairs`, `arch`, `roofing`), use the closest visual lucide icon and add a one-line comment marking the substitution: `// D-15: substitute for material-symbols 'stairs'`. Acceptable substitutes: stairs → Footprints, arch → Squircle, roofing → Triangle or Home, window → RectangleVertical.

Do NOT add `material-symbols-outlined` imports anywhere. Do NOT re-introduce the Material Symbols `<link>` in `index.html`.

### Canonical Spacing + Radius (D-34, updated Phase 71)

Pascal-aligned spacing scale, defined in `src/index.css` `@theme {}` block:

| Token | Value | Tailwind utility |
|-------|-------|------------------|
| `--spacing-xs` | 8px | `p-1` (under new scale) / `gap-1` |
| `--spacing-sm` | 12px | `p-2` (under new scale) / `gap-2` |
| `--spacing-md` | 16px | `p-3` / `p-4` / `gap-3` / `gap-4` |
| `--spacing-lg` | 24px | `p-6` / `gap-6` |
| `--spacing-xl` | 32px | `p-8` / `gap-8` |
| `--radius` | 0.625rem (10px) | base; `--radius-lg` resolves to this |
| `--radius-sm` | calc(var(--radius) - 4px) (6px) | `rounded-sm` |
| `--radius-md` | calc(var(--radius) - 2px) (8px) | `rounded-md` |
| `--radius-lg` | var(--radius) (10px) | `rounded-lg` |
| `--radius-xl` | calc(var(--radius) + 4px) (14px) | `rounded-xl` |

Phase 71 dropped the old 4px spacing tier; `p-1` now resolves to 8px. Component files that used `p-1` for tight density may need explicit review (most should remain `p-1` under the new scale; some may want `p-0.5` if Tailwind's stop is desired — verify visually).

**Squircle utilities (D-13):** `.rounded-smooth` / `.rounded-smooth-md` / `.rounded-smooth-lg` / `.rounded-smooth-xl` apply `corner-shape: squircle` (Safari/WebKit progressive enhancement; Chrome/Firefox fall back to `border-radius`). Apply to cards, modals, dropdowns, buttons, tab containers, inputs. Do NOT apply to Fabric canvas, Three.js viewport, or dimension labels (sharp by design).

### Typography (D-03, updated Phase 71)

Pascal-aligned font stack:

- `--font-sans: 'Barlow', 'Geist Sans', system-ui, sans-serif` — chrome (`font-sans` Tailwind utility)
- `--font-mono: 'Geist Mono', ui-monospace, ...` — data sites only (`font-mono` Tailwind utility)

Sources:
- Barlow loaded from Google Fonts in `index.html`
- Geist Sans + Geist Mono loaded from Google Fonts in `index.html` (note: the `geist` npm package is Next.js-only and not compatible with Vite)

The Phase 33 Space Grotesk display tier was dropped — Barlow handles all chrome typography (large headings via `text-display: 28px`, body via `text-base: 13px`, captions via `text-sm: 11px`). IBM Plex Mono was replaced by Geist Mono for data sites.

**font-mono dual semantics:** UI chrome uses `font-sans` (Barlow). Data labels — wall IDs, status strings (`SAVED`, `BUILDING_SCENE...`), `.toUpperCase()` product/element names rendered in 2D Fabric overlay, dynamic CAD identifiers — keep `font-mono` (Geist Mono).

### Theme System (Phase 71 — v1.18)

Light + dark dual mode via Tailwind v4 class-based dark mode. `.dark` class on `<html>` flips all token values.

- **Hook:** `src/hooks/useTheme.ts` — returns `{ theme, resolved, setTheme }`.
  - `theme`: user choice (`"light" | "dark" | "system"`, default `"system"`)
  - `resolved`: actual rendering mode (`"light" | "dark"`)
  - `setTheme`: persists to `localStorage` under key `room-cad-theme` and applies `<html class="dark">` via effect
- **Boot bridge:** Inline `<script>` in `index.html` reads localStorage and applies `dark` class BEFORE React mounts (prevents flash of light mode).
- **Test driver:** `window.__driveTheme(theme)` exposed via `installThemeDrivers()` in `src/test-utils/themeDrivers.ts`. Gated by `import.meta.env.MODE === "test"`. StrictMode-safe via identity-check cleanup (see §"StrictMode-safe useEffect cleanup" pattern).
- **No visible toggle UI** in this phase — Phase 76 lands the toggle alongside StatusBar / Settings rework.
- **WelcomeScreen + ProjectManager + scene-list pages** remain dark-rendering until Phase 76 (D-06).

### Reduced Motion (D-39)

Every new animation in Phase 33 guards on `useReducedMotion()` from `src/hooks/useReducedMotion.ts`. When `matches === true`, snap open/closed instead of animating.

---

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Room CAD Renderer — Project Context**

A personal interior design tool built for Jessica (Micah's wife) to plan and visualize their future home. She uploads products she actually loves — from Pinterest, specific stores, real items she's considering — places them in dimensionally accurate room layouts, and sees the space in 3D before buying anything.

This is a single-user personal tool. Not a SaaS, not a professional CAD app, not a collaboration platform.

**Core Value:** **Jessica can see her future room with her actual furniture before spending money.** The magic moment: she uploads a photo of a couch she found, places it in a room with real dimensions, rotates to 3D, and feels whether it works.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript ^6.0.2 - All source files in `src/`
- Python 3.x - `generate_guide.py` (doc generation utility, not part of the app)
- CSS - `src/index.css` (design tokens and global styles)
## Runtime
- Browser (SPA, no server-side runtime)
- Entry point: `index.html` → `src/main.tsx`
- npm (lockfile: `package-lock.json` present)
- `"type": "commonjs"` in package.json but source uses ESNext modules (bundled by Vite)
## Frameworks
- React ^18.3.1 - UI rendering, component model
- React DOM ^18.3.5 - Browser rendering target
- Three.js ^0.183.2 - 3D geometry, mesh rendering, lighting
- @react-three/fiber ^8.17.14 - React renderer for Three.js (`src/three/ThreeViewport.tsx`)
- @react-three/drei ^9.122.0 - Three.js helpers: `OrbitControls`, camera utilities (`src/three/ThreeViewport.tsx`)
- Fabric.js ^6.9.1 - 2D interactive canvas, CAD drawing tools (`src/canvas/FabricCanvas.tsx`, `src/canvas/tools/`)
- Tailwind CSS ^4.2.2 - Utility-first CSS (v4 Vite plugin, `@tailwindcss/vite`)
- Design tokens defined in `src/index.css` via `@theme {}` block (CSS custom properties)
- No shadcn/ui — custom component set only
- Zustand ^5.0.12 - Client state stores (`src/stores/cadStore.ts`, `src/stores/uiStore.ts`)
- Immer ^11.1.4 - Immutable state updates via `produce()` inside Zustand actions
- Vite ^8.0.3 - Dev server and bundler
- @vitejs/plugin-react ^6.0.1 - React Fast Refresh + JSX transform
## Key Dependencies
- `fabric` ^6.9.1 - Powers the entire 2D CAD viewport; all drawing tools depend on it (`src/canvas/FabricCanvas.tsx`)
- `three` + `@react-three/fiber` + `@react-three/drei` - Powers the 3D viewport (`src/three/ThreeViewport.tsx`); loaded lazily via `React.lazy()`
- `zustand` + `immer` - All application state; `cadStore` holds the CAD data model, `uiStore` holds tool and selection state
- `idb-keyval` ^6.2.2 - Browser-native IndexedDB persistence for projects and product library (`src/lib/serialization.ts`, `src/App.tsx`)
- `@types/react` ^18.3.18 - TypeScript types for React
- `@types/three` ^0.183.1 - TypeScript types for Three.js
## Configuration
- Config: `tsconfig.json`
- Target: ES2020
- Module resolution: `bundler` (Vite-aware)
- Path alias: `@/*` → `./src/*`
- Strict mode: enabled
- JSX: `react-jsx` transform
- Config: `vite.config.ts`
- Plugins: `@vitejs/plugin-react`, `@tailwindcss/vite`
- Path alias: `@` → `./src` (mirrors tsconfig)
- Output: `dist/` (present in repo root)
- No custom build targets or multi-entry configuration
- Tailwind v4 loaded via Vite plugin (no `tailwind.config.js` file — config is inline in CSS)
- Design system defined entirely in `src/index.css` `@theme {}` block
- Custom CSS classes: `.cad-grid-bg`, `.glass-panel`, `.ghost-border`, `.accent-glow`, `.material-symbols-outlined`
- Color palette: `obsidian-*` surface scale, `accent` purple (#7c5bf0), `text-*` hierarchy
## Platform Requirements
- Node.js (version not pinned; no `.nvmrc` or `.node-version` file)
- npm for package management
- `npm run dev` starts Vite dev server
- `npm run build` produces `dist/`
- Static file hosting (no server required)
- All persistence is browser-side (IndexedDB)
- Fonts loaded from Google Fonts CDN (network required at first load)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- React components: PascalCase — `PropertiesPanel.tsx`, `AddProductModal.tsx`
- Stores: camelCase with suffix — `cadStore.ts`, `uiStore.ts`
- Utility libraries: camelCase — `geometry.ts`, `serialization.ts`
- Type definitions: camelCase — `cad.ts`, `product.ts`
- Canvas tools: camelCase with suffix — `wallTool.ts`, `productTool.ts`
- Event handlers: `handle` prefix — `handleSubmit`, `handleDelete`, `handleLoad`, `handleDrop`
- Boolean togglers: `toggle` prefix in stores — `toggleGrid`, `toggleProductLibrary`
- Async operations: verb + noun — `saveProject`, `loadProject`, `deleteProject`, `listProjects`
- Utility functions: verb + noun — `snapTo`, `snapPoint`, `formatFeet`, `wallLength`, `wallCorners`
- camelCase throughout — `productLibrary`, `activeCategory`, `gridSnap`, `placedProducts`
- Boolean flags: `show` prefix for visibility — `showGrid`, `showProductLibrary`, `showProperties`
- Constants: UPPER_SNAKE_CASE — `MAX_HISTORY`, `PRODUCTS_KEY`, `STATUS_MESSAGES`, `PRODUCT_CATEGORIES`
- Interfaces: PascalCase — `Point`, `WallSegment`, `Opening`, `PlacedProduct`, `Room`, `CADSnapshot`
- Type aliases: PascalCase — `ToolType`, `ViewMode`
- Store state interfaces: PascalCase with `State` suffix — `CADState`, `UIState`
- Props interfaces: named `Props` (local to each file, not exported)
- Walls: `wall_` prefix — `wall_${uid()}`
- Placed products: `pp_` prefix — `pp_${uid()}`
- Openings: `op_` prefix — `op_${uid()}`
- Products: `prod_` prefix — `prod_${uid()}`
- Projects: `proj_` prefix — `proj_${uid()}`
## UI Label Convention (D-09, updated Phase 71)

Mixed-case for chrome (sentence case or Title Case as appropriate):
- Section headers: `Room config`, `System stats`, `Layers`, `Snap`
- Tool labels: `Select`, `Wall`, `Door`, `Window`
- View labels: `2D Plan`, `3D View`, `Library`, `Split`
- Property labels: `Length`, `Thickness`, `Height`, `Width (ft)`, `Material Finish`

UPPERCASE preserved (D-10) for dynamic CAD identifiers (data, not chrome):
- `WALL_SEGMENT_{id}` — wall IDs in 2D overlay
- `{PRODUCT_NAME_UPPERCASED}` — product/element labels rendered via `.toUpperCase()`
- Status string values: `READY`, `SAVED`, `BUILDING_SCENE...`, `SAVING`, `SAVE_FAILED` (the dynamic value; the surrounding `System Status:` label is mixed case)
## Component Structure
- `export function ToolPalette()` lives in `src/components/Toolbar.tsx`
## Styling Approach (Phase 71 — Pascal token system)
- Backgrounds: `bg-background`, `bg-card`, `bg-muted`, `bg-popover` — Pascal oklch semantic tokens
- Text: `text-foreground`, `text-muted-foreground`, `text-card-foreground`
- Accent (interactive): `bg-accent`, `bg-accent/10`, `bg-accent/20`, `border-ring` — accent purple preserved for interactive highlights; NO `text-accent` in static chrome
- Semantic: `text-destructive`, `bg-destructive`, `bg-primary`, `text-primary-foreground`
- Borders: `border-border`, `border-border/50`, `border-ring`
- `font-sans` — Barlow — used for ALL chrome labels, buttons, section headers
- `font-mono` — Geist Mono — used for data identifiers, status strings, CAD overlays only
- `cursor-crosshair` / `cursor-grab` — canvas cursor overrides (unchanged)
- REMOVED (Phase 71): `bg-obsidian-*`, `text-text-*`, `glass-panel`, `ghost-border`, `cad-grid-bg`, `accent-glow`, `font-display` (Space Grotesk), `font-body` (Inter), `IBM Plex Mono`
## Design System Tokens (Obsidian CAD Theme)
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
- `src/stores/cadStore.ts` — CAD scene data (room, walls, placed products, undo/redo history)
- `src/stores/uiStore.ts` — UI interaction state (active tool, selection, visibility flags, grid snap)
## Import Organization
## Known Style Inconsistency
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- All CAD data lives in two Zustand stores (`cadStore`, `uiStore`). Neither the 2D nor 3D renderer owns state.
- The 2D canvas (Fabric.js) is fully imperative: on every store change, `FabricCanvas` calls `redraw()` which clears the canvas and redraws every object from scratch.
- The 3D viewport (Three.js via React Three Fiber) is declarative: store-subscribed React components (`WallMesh`, `ProductMesh`) re-render automatically when store slices change.
- Tools are stateless modules (plain `.ts` files) that receive a `fabric.Canvas` reference plus `scale`/`origin` context, attach event listeners, and call store actions directly. They never read from React component state.
- All geometry coordinates are in real-world feet throughout the store, geometry helpers, and tool modules. The `scale` + `origin` transform is applied only at render time.
## Layers
- Purpose: Single source of truth for all CAD data and UI state
- Location: `src/stores/`
- Contains: Zustand stores with immer-based mutations, undo/redo history stacks
- Depends on: `src/types/cad.ts`, `src/lib/geometry.ts` (uid)
- Used by: Every canvas module, every component
- Purpose: Fabric.js canvas that visualizes CAD data as a floor plan
- Location: `src/canvas/`
- Contains: `FabricCanvas.tsx` (orchestrator), `fabricSync.ts` (draw functions), `grid.ts`, `dimensions.ts`, tool modules
- Depends on: Store (reads state), `src/lib/geometry.ts`
- Used by: `App.tsx`
- Purpose: React Three Fiber scene that renders the same store data in 3D
- Location: `src/three/`
- Contains: `ThreeViewport.tsx` (R3F Canvas + Scene), `WallMesh.tsx`, `ProductMesh.tsx`, `Lighting.tsx`
- Depends on: Store (direct Zustand subscriptions), `src/lib/geometry.ts`
- Used by: `App.tsx` (lazy-loaded)
- Purpose: App chrome — toolbar, sidebar, status bar, modals
- Location: `src/components/`
- Contains: `Toolbar.tsx`, `ToolPalette.tsx`, `Sidebar.tsx`, `PropertiesPanel.tsx`, `StatusBar.tsx`, `RoomSettings.tsx`, `WelcomeScreen.tsx`, `ProductLibrary.tsx`, `AddProductModal.tsx`, `ProjectManager.tsx`, `ProductForm.tsx`
- Depends on: Stores, `src/types/`, `src/lib/`
- Used by: `App.tsx`
- Purpose: Pure utility functions with no React or store dependencies
- Location: `src/lib/`
- Contains: `geometry.ts` (math, snap, format), `serialization.ts` (IndexedDB project CRUD), `export.ts` (canvas PNG export)
- Depends on: `src/types/cad.ts`
- Used by: All layers above
- Purpose: Shared TypeScript interfaces and constants
- Location: `src/types/`
- Contains: `cad.ts` (all CAD domain types), `product.ts` (Product interface, PRODUCT_CATEGORIES)
- Depends on: nothing
- Used by: All layers
## Data Flow
- `useCADStore` holds domain data: `room`, `walls`, `placedProducts`, `past[]`, `future[]`
- `useUIStore` holds interaction state: `activeTool`, `selectedIds`, `showGrid`, `gridSnap`, `showProductLibrary`, `showProperties`
- `productLibrary` (`Product[]`) lives in `App` component state and is persisted to IndexedDB via `idb-keyval`. It is passed down as props to canvas components and modals — it is not in a Zustand store.
- Projects (named CAD snapshots) are saved/loaded via `src/lib/serialization.ts` using IndexedDB.
## Key Abstractions
- Purpose: Serializable slice of cadStore (`room + walls + placedProducts`) used for undo history, project save/load, and new-project initialization
- Examples: `src/types/cad.ts`, `src/lib/serialization.ts`, `src/stores/cadStore.ts`
- Pattern: Plain object, deep-cloned via `JSON.parse(JSON.stringify(...))` for history; `idb-keyval` for persistence
- Purpose: Encapsulates all interaction logic for one drawing mode (wall, door, window, product, ceiling, select)
- Examples: `src/canvas/tools/wallTool.ts`, `src/canvas/tools/selectTool.ts`
- Pattern: `activate*(fc, scale, origin)` attaches Fabric + document event listeners inside a closure and returns a `() => void` cleanup fn that detaches them and clears preview objects. `FabricCanvas.tsx` stores the returned cleanup in `toolCleanupRef = useRef<(() => void) | null>` and invokes it on tool switch + unmount. Tools read store state via `useCADStore.getState()` / `useUIStore.getState()` (outside React) and write via store actions. Shared coordinate helpers (`pxToFeet`, `findClosestWall`) live in `src/canvas/tools/toolUtils.ts`.
- Purpose: Maps real-world foot coordinates to canvas pixels
- Pattern: Computed in `FabricCanvas.redraw()` as `scale = min((canvasW - padding) / roomW, (canvasH - padding) / roomH)` and `origin = center offset`. Passed to every render function and every tool activation. 3D viewport uses coordinates directly (Three.js world units = feet).
- Purpose: Represents a cut-out in a wall segment
- Location: `src/types/cad.ts`, stored as `WallSegment.openings[]`
- 2D rendering: white polygon overlay in `fabricSync.ts`
- 3D rendering: `THREE.Shape` with holes via `ExtrudeGeometry` in `WallMesh.tsx`
## Entry Points
- Location: `src/main.tsx`
- Triggers: Vite dev server / browser load
- Responsibilities: Mounts `<App />` into `#root`
- Location: `src/App.tsx`
- Triggers: React tree root
- Responsibilities: View mode state (`2d` | `3d` | `split` | `library`), product library state + IndexedDB persistence, keyboard shortcut wiring, welcome screen gate, layout composition
- Location: `src/canvas/FabricCanvas.tsx`
- Triggers: Mounted when viewMode is `2d` or `split`
- Responsibilities: Creates/destroys `fabric.Canvas`, subscribes to all store slices needed for redraw, implements the `redraw()` callback that redraws the entire 2D canvas, manages tool lifecycle (deactivate all → activate current)
- Location: `src/three/ThreeViewport.tsx`
- Triggers: Lazy-loaded when viewMode is `3d` or `split`
- Responsibilities: Creates R3F `<Canvas>` with camera/shadows, renders `<Scene>` which subscribes to cadStore and maps wall/product data to mesh components
## Error Handling
- Tool functions check for valid state before acting (e.g., `if (!state.startPoint) return`)
- `renderProducts` skips any `PlacedProduct` whose `productId` is not found in `productLibrary`
- `WallMesh` skips dimension rendering if wall length is 0
- `ProductMesh` catches texture load errors silently (`try/catch` returns `null`)
- `export.ts` uses `alert()` when no canvas element is found
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:issues-living-system-start -->
## GitHub Issues — Living System

The GitHub Issues tracker is a **living artifact that must stay in sync with planning state**. Drift here creates stale roadmap, duplicate work, and lost context. The following rules are non-optional:

### On bug discovery (outside a fix-on-the-spot flow)

If a bug is found and NOT fixed in the same turn:
1. Add a ROADMAP backlog entry (phase `999.N` if generic, or inside the active phase's UAT file if scoped)
2. Create a corresponding GitHub issue with labels `bug` + `backlog` (+ `deferred` if explicitly deferred)
3. Link the GH issue number back into the ROADMAP / UAT entry
4. Never leave a bug observation only in a commit message or scratch note

### On phase plan creation (`/gsd:plan-phase`)

For each requirement or feature the phase addresses:
- If an existing GH issue maps to it → add label `in-progress` (or create one if missing) and reference the issue in the PLAN.md frontmatter or context block
- If no issue exists and the work is substantive (≥1 plan) → create the issue with `enhancement` label + reference back to the phase

### On PR creation

- Every PR body **must** list `Closes #N` (or `Fixes #N` for bugs) for every issue the PR addresses. Use GitHub's linked-issues UI so merge auto-closes them.
- If a PR only partially addresses an issue → use `Refs #N` instead and explain what's still pending
- Add `Spec: .planning/phases/{phase}/{plan}-PLAN.md` for phase PRs so reviewers can navigate to the full plan

### On PR merge

- Verify the auto-closed issues actually closed (rare GH bug: they don't)
- Any remaining open issue tagged to this phase that the merge did NOT close → either retag `planned` → next phase, or explicitly keep open with a reason
- Update `.planning/ROADMAP.md` phase status + any backlog entries that moved state

### On phase completion (`gsd-tools phase complete`)

- Phase's HUMAN-UAT.md gaps → corresponding GH issues must exist, with correct status labels (`backlog` / `deferred` / `in-progress`)
- Phase's VERIFICATION.md score → if `passed-with-carry-over`, each carry-over must be a tracked GH issue

### On milestone completion (`/gsd:complete-milestone`)

- Close the GH milestone (not the issues — those should already be closed as PRs merged)
- Verify no orphan open issues reference the completed milestone
- Any carry-over issues → relabel with the next milestone

### Label taxonomy (keep this tight)

| Label | Meaning | Close trigger |
|-------|---------|---------------|
| `enhancement` | Feature request | PR that implements it merges |
| `bug` | Something's broken | PR that fixes it merges |
| `backlog` | Parked in 999.x or UAT gaps | Promoted to active phase → relabel |
| `planned` | Scoped for a specific future phase | Phase ships → close with phase ref |
| `tech-debt` | Refactor / upgrade / cleanup | Ongoing, close when addressed |
| `deferred` | Explicitly out of scope for current major version | Never auto-close |
| `competitor-insight` | Borrowed from competitive audit | Same lifecycle as `enhancement` |
| `ux` | UX / interaction design | Orthogonal tag (combine with others) |
| `documentation` | Docs work | Orthogonal tag |

### On drift detected

If issues and planning state diverge (e.g., a phase shipped but the GH issue is still open, or a new bug discovered on-screen but no issue exists), run the `/gsd:sync-issues` skill to reconcile.

### Automation status (as of 2026-04-21)

- **Manual**: everything above, enforced by this rule
- **Semi-automated**: `/gsd:sync-issues` reconciliation skill (see `.claude/commands/gsd-sync-issues.md` if present)
- **Future**: post-merge hook that auto-closes linked issues and updates ROADMAP.md — not built yet; tracked as separate issue if pursued
<!-- GSD:issues-living-system-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
