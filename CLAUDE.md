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

### Planned phases:
- Design system redesign (pending mockups)
- Backend + auth (Fastify + Postgres + R2)
- Advanced 3D (CSG verification, environment maps, PBR materials)

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
## UI Label Convention (Obsidian CAD Theme)
- Section headers: `ROOM_CONFIG`, `SYSTEM_STATS`, `LAYERS`, `SNAP`
- Tool labels: `SELECT`, `WALL`, `DOOR`, `WINDOW`
- View labels: `2D_PLAN`, `3D_VIEW`, `LIBRARY`, `SPLIT`
- Property names: `LENGTH`, `THICKNESS`, `HEIGHT`, `WIDTH_FT`, `MATERIAL_FINISH`
- Status strings: `SYSTEM_STATUS: READY`, `SAVED`, `BUILDING_SCENE...`
- Dynamic identifiers: `WALL_SEGMENT_{id}`, `{PRODUCT_NAME_UPPERCASED}`
- Product names displayed: `.toUpperCase().replace(/\s/g, "_")`
## Component Structure
- `export function ToolPalette()` lives in `src/components/Toolbar.tsx`
## Styling Approach
- Backgrounds: `bg-obsidian-deepest`, `bg-obsidian-base`, `bg-obsidian-low`, `bg-obsidian-mid`, `bg-obsidian-high`, `bg-obsidian-highest`, `bg-obsidian-bright`
- Text: `text-text-primary`, `text-text-muted`, `text-text-dim`, `text-text-ghost`
- Accent: `text-accent`, `text-accent-light`, `bg-accent`, `bg-accent/10`, `bg-accent/20`, `border-accent/30`
- Semantic: `text-success`, `text-warning`, `text-error`, `text-info`
- Borders: `border-outline-variant/20`, `ghost-border` (custom CSS class)
- `glass-panel` — glassmorphism surface: `rgba(31, 30, 42, 0.8)` background, `backdrop-filter: blur(12px)`
- `ghost-border` — subtle 15% opacity border
- `cad-grid-bg` — radial dot grid background pattern
- `accent-glow` — purple glow box-shadow
- `cursor-crosshair` / `cursor-grab` — canvas cursor overrides
- `font-mono` — IBM Plex Mono — used for ALL labels, values, identifiers, and UI chrome
- `font-display` — Space Grotesk — used for large hero headings (`DESIGN_YOUR_SPACE`, brand name)
- `font-body` (default, via CSS) — Inter — used for descriptive prose paragraphs
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
