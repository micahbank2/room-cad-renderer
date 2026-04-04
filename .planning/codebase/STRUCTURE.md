# Codebase Structure

**Analysis Date:** 2026-04-04

## Directory Layout

```
room-cad-renderer/
├── src/
│   ├── App.tsx                    # Root component — layout, view mode, product library state
│   ├── main.tsx                   # React entry point
│   ├── index.css                  # Global styles, Tailwind base, custom CSS classes
│   ├── stores/
│   │   ├── cadStore.ts            # CAD domain state — room, walls, placedProducts, undo/redo
│   │   └── uiStore.ts             # Interaction state — activeTool, selectedIds, grid settings
│   ├── types/
│   │   ├── cad.ts                 # Point, WallSegment, Opening, PlacedProduct, Room, CADSnapshot, ToolType
│   │   └── product.ts             # Product interface, PRODUCT_CATEGORIES constant
│   ├── canvas/
│   │   ├── FabricCanvas.tsx       # Fabric.js canvas component — full redraw orchestrator
│   │   ├── fabricSync.ts          # renderWalls() and renderProducts() draw functions
│   │   ├── grid.ts                # drawGrid() — grid lines and room outline
│   │   ├── dimensions.ts          # drawRoomDimensions() and drawWallDimension()
│   │   └── tools/
│   │       ├── wallTool.ts        # Click-to-place wall drawing with preview line
│   │       ├── selectTool.ts      # Hit-testing, drag-to-move, delete key handler
│   │       ├── doorTool.ts        # Click-on-wall to insert door opening
│   │       ├── windowTool.ts      # Click-on-wall to insert window opening
│   │       └── productTool.ts     # Click-to-place product, pendingProductId module var
│   ├── three/
│   │   ├── ThreeViewport.tsx      # R3F Canvas + Scene + OrbitControls (lazy-loaded)
│   │   ├── WallMesh.tsx           # Wall mesh with ExtrudeGeometry holes for openings
│   │   ├── ProductMesh.tsx        # BoxGeometry product with texture loader
│   │   └── Lighting.tsx           # Ambient + directional + hemisphere lights
│   ├── components/
│   │   ├── Toolbar.tsx            # Top header bar + exported ToolPalette (floating palette)
│   │   ├── Sidebar.tsx            # Left sidebar — room config, stats, grid/snap controls
│   │   ├── RoomSettings.tsx       # Width/length/wallHeight number inputs → cadStore.setRoom
│   │   ├── PropertiesPanel.tsx    # Floating overlay showing selected wall or product properties
│   │   ├── StatusBar.tsx          # Bottom bar — active tool hint, wall count, grid snap
│   │   ├── ProductLibrary.tsx     # Full-screen library grid with category filter and place button
│   │   ├── AddProductModal.tsx    # Modal to create a new product with image upload
│   │   ├── ProjectManager.tsx     # Save/load/delete named projects via IndexedDB
│   │   ├── WelcomeScreen.tsx      # Landing screen shown before any walls exist
│   │   └── ProductForm.tsx        # (Unused/stub — AddProductModal contains the active form)
│   ├── lib/
│   │   ├── geometry.ts            # snapTo, snapPoint, distance, angle, wallLength, wallCorners,
│   │   │                          #   constrainOrthogonal, formatFeet, closestPointOnWall, uid
│   │   ├── serialization.ts       # saveProject, loadProject, deleteProject, listProjects via idb-keyval
│   │   └── export.ts              # exportRenderedImage() and export2DImage() — PNG download
│   └── assets/                    # Static images (currently empty / imported inline)
├── design/
│   ├── mockups/                   # Design reference files (not consumed by build)
│   └── system/                    # Design system reference files
├── .planning/
│   └── codebase/                  # GSD codebase analysis documents (this directory)
├── index.html                     # Vite HTML entry
├── vite.config.ts                 # Vite config — React plugin, Tailwind plugin, @ alias
├── tsconfig.json                  # TypeScript config
└── package.json                   # Dependencies
```

## Directory Purposes

**`src/stores/`:**
- Purpose: Global application state via Zustand
- Contains: Two stores only — `cadStore.ts` (domain data) and `uiStore.ts` (interaction/UI flags)
- Key files: `cadStore.ts`, `uiStore.ts`

**`src/types/`:**
- Purpose: TypeScript type definitions and enumerations shared across the codebase
- Contains: No logic — interfaces, types, and `const` arrays only
- Key files: `cad.ts` (all CAD types), `product.ts` (Product type + PRODUCT_CATEGORIES)

**`src/canvas/`:**
- Purpose: Everything Fabric.js — canvas component, draw functions, and all drawing tool modules
- Contains: One React component (`FabricCanvas.tsx`), pure draw functions, and tool activate/deactivate modules
- Key files: `FabricCanvas.tsx` (orchestrator), `fabricSync.ts` (wall and product renderers), `tools/` (one file per tool)

**`src/canvas/tools/`:**
- Purpose: Stateless tool modules — one file per `ToolType` value
- Contains: Each file exports `activate*Tool(fc, scale, origin)` and `deactivate*Tool(fc)`
- Key files: `wallTool.ts`, `selectTool.ts`, `doorTool.ts`, `windowTool.ts`, `productTool.ts`

**`src/three/`:**
- Purpose: React Three Fiber 3D viewport — separate rendering of the same store data
- Contains: Viewport wrapper, individual mesh components, lighting setup
- Key files: `ThreeViewport.tsx` (entry, lazy-loaded by App), `WallMesh.tsx`, `ProductMesh.tsx`

**`src/components/`:**
- Purpose: All React UI components except canvas and 3D viewport
- Contains: Shell components (Toolbar, Sidebar, StatusBar), panels (PropertiesPanel), modals (AddProductModal), screens (WelcomeScreen), and utility views (ProductLibrary, ProjectManager)
- Key files: `Toolbar.tsx` (also exports `ToolPalette`), `PropertiesPanel.tsx`, `ProductLibrary.tsx`

**`src/lib/`:**
- Purpose: Pure utility modules — no React, no store imports
- Contains: Geometry math, IndexedDB serialization, canvas export
- Key files: `geometry.ts` (most-imported utility file), `serialization.ts`

## Key File Locations

**Entry Points:**
- `src/main.tsx`: React DOM root mount
- `src/App.tsx`: Application root, view mode routing, product library state

**Configuration:**
- `vite.config.ts`: Build config — `@` alias maps to `./src`
- `tsconfig.json`: TypeScript config
- `index.html`: Single HTML shell

**Core Domain Logic:**
- `src/stores/cadStore.ts`: All CAD mutations and undo/redo
- `src/types/cad.ts`: Canonical type definitions — read this first when understanding the data model
- `src/lib/geometry.ts`: All coordinate math, snapping, formatting, uid generation

**2D Rendering Pipeline:**
- `src/canvas/FabricCanvas.tsx`: The `redraw()` function is the render loop
- `src/canvas/fabricSync.ts`: `renderWalls()` and `renderProducts()` — the actual Fabric object creation

**3D Rendering Pipeline:**
- `src/three/ThreeViewport.tsx`: R3F Canvas setup and Scene component
- `src/three/WallMesh.tsx`: ExtrudeGeometry with holes — the most complex 3D geometry

**Persistence:**
- `src/lib/serialization.ts`: Project save/load/list/delete via IndexedDB
- Product library is persisted directly in `App.tsx` and `Sidebar.tsx` using `idb-keyval` key `"room-cad-products"`

## Module Boundaries

**Store → Canvas:** `FabricCanvas` subscribes to `cadStore` and `uiStore` slices. On change, calls `redraw()`. No Fabric objects are persisted across redraws — full clear-and-redraw on every state change.

**Store → Three:** `ThreeViewport/Scene` subscribes to `cadStore` slices directly. R3F re-renders mesh components when store values change. No imperative redraw needed.

**Tools → Store:** Tool modules call `useCADStore.getState()` and `useUIStore.getState()` directly (outside React). They never import components or canvas modules.

**Components → Store:** All UI components subscribe to stores via `useCADStore(selector)` / `useUIStore(selector)`. They never import canvas or three modules directly (except `ProductLibrary` imports `setPendingProduct` from `productTool.ts`).

**lib/ → (nothing):** `src/lib/` files import only from `src/types/` and each other. No store or React imports.

**Canvas ↔ Three:** No direct dependency. Both independently read from the same Zustand stores.

## Import Patterns

**Path Alias:**
- `@/` resolves to `src/` — configured in `vite.config.ts`
- Use `@/stores/cadStore`, `@/types/cad`, `@/lib/geometry` etc. for all cross-directory imports
- Never use relative paths that traverse more than one directory level (`../..`)

**Typical import groups in a canvas tool file:**
```typescript
import * as fabric from "fabric";
import { useCADStore } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { snapPoint, distance } from "@/lib/geometry";
import type { Point, WallSegment } from "@/types/cad";
```

**Typical import groups in a component file:**
```typescript
import { useCADStore } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { formatFeet } from "@/lib/geometry";
import type { Product } from "@/types/product";
```

**Lazy loading:** `ThreeViewport` is the only lazy-loaded module, loaded via `React.lazy()` in `App.tsx` to avoid bundling Three.js unless the 3D view is activated.

## Where to Add New Code

**New drawing tool (e.g., `circleTool`):**
- Implementation: `src/canvas/tools/circleTool.ts` — follow the `activate*/deactivate*` pattern, store cleanup on `fc.__circleToolCleanup`
- Wire up: Add to `activateCurrentTool()` and `deactivateAllTools()` in `src/canvas/FabricCanvas.tsx`
- Add `ToolType` value: `src/types/cad.ts`
- Add keyboard shortcut: `App.tsx` shortcuts map
- Add toolbar button: `src/components/Toolbar.tsx` `tools` array

**New CAD entity (e.g., `furniture group`):**
- Type: `src/types/cad.ts`
- Store slice: `src/stores/cadStore.ts` — add to `CADState`, add to `CADSnapshot`, add to `snapshot()` and `pushHistory()`
- 2D render: `src/canvas/fabricSync.ts` — add a new `render*` function, call from `FabricCanvas.redraw()`
- 3D render: `src/three/` — add a new `*Mesh.tsx` component, add to `Scene` in `ThreeViewport.tsx`

**New UI panel or sidebar section:**
- Implementation: `src/components/` — new `.tsx` file
- Mount: Add to appropriate location in `App.tsx` or `Sidebar.tsx`

**New geometry utility:**
- Implementation: `src/lib/geometry.ts` — add exported function
- No store or React imports allowed in this file

**New persistence feature:**
- Implementation: `src/lib/serialization.ts` or new lib file
- Use `idb-keyval` for client-side storage (already a dependency)

## Special Directories

**`.planning/`:**
- Purpose: GSD planning documents — architecture, structure, concerns, conventions
- Generated: No (hand-written by GSD mapper)
- Committed: Yes

**`design/`:**
- Purpose: Design reference mockups and design system files
- Generated: No
- Committed: Yes (reference only, not imported by build)

**`dist/`:**
- Purpose: Vite build output
- Generated: Yes
- Committed: No (gitignored)

**`.netlify/`:**
- Purpose: Netlify deployment configuration
- Generated: Partially (functions-internal)
- Committed: Yes (v1/ config)

---

*Structure analysis: 2026-04-04*
