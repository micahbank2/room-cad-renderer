# Architecture

**Analysis Date:** 2026-04-04

## Pattern Overview

**Overall:** Store-driven imperative rendering with dual viewport output

**Key Characteristics:**
- All CAD data lives in two Zustand stores (`cadStore`, `uiStore`). Neither the 2D nor 3D renderer owns state.
- The 2D canvas (Fabric.js) is fully imperative: on every store change, `FabricCanvas` calls `redraw()` which clears the canvas and redraws every object from scratch.
- The 3D viewport (Three.js via React Three Fiber) is declarative: store-subscribed React components (`WallMesh`, `ProductMesh`) re-render automatically when store slices change.
- Tools are stateless modules (plain `.ts` files) that receive a `fabric.Canvas` reference plus `scale`/`origin` context, attach event listeners, and call store actions directly. They never read from React component state.
- All geometry coordinates are in real-world feet throughout the store, geometry helpers, and tool modules. The `scale` + `origin` transform is applied only at render time.

## Layers

**Store Layer:**
- Purpose: Single source of truth for all CAD data and UI state
- Location: `src/stores/`
- Contains: Zustand stores with immer-based mutations, undo/redo history stacks
- Depends on: `src/types/cad.ts`, `src/lib/geometry.ts` (uid)
- Used by: Every canvas module, every component

**2D Rendering Layer:**
- Purpose: Fabric.js canvas that visualizes CAD data as a floor plan
- Location: `src/canvas/`
- Contains: `FabricCanvas.tsx` (orchestrator), `fabricSync.ts` (draw functions), `grid.ts`, `dimensions.ts`, tool modules
- Depends on: Store (reads state), `src/lib/geometry.ts`
- Used by: `App.tsx`

**3D Rendering Layer:**
- Purpose: React Three Fiber scene that renders the same store data in 3D
- Location: `src/three/`
- Contains: `ThreeViewport.tsx` (R3F Canvas + Scene), `WallMesh.tsx`, `ProductMesh.tsx`, `Lighting.tsx`
- Depends on: Store (direct Zustand subscriptions), `src/lib/geometry.ts`
- Used by: `App.tsx` (lazy-loaded)

**UI Shell Layer:**
- Purpose: App chrome — toolbar, sidebar, status bar, modals
- Location: `src/components/`
- Contains: `Toolbar.tsx`, `ToolPalette.tsx`, `Sidebar.tsx`, `PropertiesPanel.tsx`, `StatusBar.tsx`, `RoomSettings.tsx`, `WelcomeScreen.tsx`, `ProductLibrary.tsx`, `AddProductModal.tsx`, `ProjectManager.tsx`, `ProductForm.tsx`
- Depends on: Stores, `src/types/`, `src/lib/`
- Used by: `App.tsx`

**Library Layer:**
- Purpose: Pure utility functions with no React or store dependencies
- Location: `src/lib/`
- Contains: `geometry.ts` (math, snap, format), `serialization.ts` (IndexedDB project CRUD), `export.ts` (canvas PNG export)
- Depends on: `src/types/cad.ts`
- Used by: All layers above

**Type Layer:**
- Purpose: Shared TypeScript interfaces and constants
- Location: `src/types/`
- Contains: `cad.ts` (all CAD domain types), `product.ts` (Product interface, PRODUCT_CATEGORIES)
- Depends on: nothing
- Used by: All layers

## Data Flow

**User Draws a Wall (2D):**

1. `FabricCanvas` activates `wallTool` on each redraw, passing current `scale` + `origin`
2. User clicks once: tool stores `startPoint` in module-level state; draws preview circle on canvas
3. User moves mouse: tool draws a dashed preview `Line` directly on the Fabric canvas (ephemeral, not in store)
4. User clicks again: `wallTool` calls `useCADStore.getState().addWall(start, end)`
5. `cadStore` runs immer mutation — pushes history snapshot, adds wall to `walls` record
6. Zustand notifies all subscribers; `FabricCanvas.redraw` dependency array includes `walls`, so `redraw()` fires
7. `redraw()` clears canvas, calls `renderWalls(fc, walls, ...)` from `fabricSync.ts` which creates new `fabric.Polygon` objects
8. `ThreeViewport` Scene component re-renders; `WallMesh` components are recreated for the updated `walls` map

**User Places a Product:**

1. `ProductLibrary` calls `setPendingProduct(productId)` (module-level var in `productTool.ts`) and `useUIStore.getState().setTool("product")`
2. `FabricCanvas` redraw activates `productTool` with current scale/origin
3. User clicks canvas: tool reads `pendingProductId`, converts px to feet, snaps to grid, calls `useCADStore.getState().placeProduct(productId, position)`
4. Store adds a `PlacedProduct` entry; both canvases redraw/re-render

**Undo/Redo:**

1. Each mutation in `cadStore` calls `pushHistory(state)` which deep-clones `room + walls + placedProducts` into `state.past[]` (max 50)
2. `useCADStore.getState().undo()` pops from `past`, pushes to `future`, restores state
3. All subscribers redraw automatically

**State Management:**

- `useCADStore` holds domain data: `room`, `walls`, `placedProducts`, `past[]`, `future[]`
- `useUIStore` holds interaction state: `activeTool`, `selectedIds`, `showGrid`, `gridSnap`, `showProductLibrary`, `showProperties`
- `productLibrary` (`Product[]`) lives in `App` component state and is persisted to IndexedDB via `idb-keyval`. It is passed down as props to canvas components and modals — it is not in a Zustand store.
- Projects (named CAD snapshots) are saved/loaded via `src/lib/serialization.ts` using IndexedDB.

## Key Abstractions

**CADSnapshot:**
- Purpose: Serializable slice of cadStore (`room + walls + placedProducts`) used for undo history, project save/load, and new-project initialization
- Examples: `src/types/cad.ts`, `src/lib/serialization.ts`, `src/stores/cadStore.ts`
- Pattern: Plain object, deep-cloned via `JSON.parse(JSON.stringify(...))` for history; `idb-keyval` for persistence

**Tool Module:**
- Purpose: Encapsulates all interaction logic for one drawing mode (wall, door, window, product, select)
- Examples: `src/canvas/tools/wallTool.ts`, `src/canvas/tools/selectTool.ts`
- Pattern: `activate*(fc, scale, origin)` attaches Fabric event listeners and stores cleanup function on `fc.__*ToolCleanup`. `deactivate*()` reads and calls that function. Tools read store state via `useCADStore.getState()` / `useUIStore.getState()` (outside React) and write via store actions.

**Scale/Origin Transform:**
- Purpose: Maps real-world foot coordinates to canvas pixels
- Pattern: Computed in `FabricCanvas.redraw()` as `scale = min((canvasW - padding) / roomW, (canvasH - padding) / roomH)` and `origin = center offset`. Passed to every render function and every tool activation. 3D viewport uses coordinates directly (Three.js world units = feet).

**Opening (door/window):**
- Purpose: Represents a cut-out in a wall segment
- Location: `src/types/cad.ts`, stored as `WallSegment.openings[]`
- 2D rendering: white polygon overlay in `fabricSync.ts`
- 3D rendering: `THREE.Shape` with holes via `ExtrudeGeometry` in `WallMesh.tsx`

## Entry Points

**`src/main.tsx`:**
- Location: `src/main.tsx`
- Triggers: Vite dev server / browser load
- Responsibilities: Mounts `<App />` into `#root`

**`src/App.tsx`:**
- Location: `src/App.tsx`
- Triggers: React tree root
- Responsibilities: View mode state (`2d` | `3d` | `split` | `library`), product library state + IndexedDB persistence, keyboard shortcut wiring, welcome screen gate, layout composition

**`src/canvas/FabricCanvas.tsx`:**
- Location: `src/canvas/FabricCanvas.tsx`
- Triggers: Mounted when viewMode is `2d` or `split`
- Responsibilities: Creates/destroys `fabric.Canvas`, subscribes to all store slices needed for redraw, implements the `redraw()` callback that redraws the entire 2D canvas, manages tool lifecycle (deactivate all → activate current)

**`src/three/ThreeViewport.tsx`:**
- Location: `src/three/ThreeViewport.tsx`
- Triggers: Lazy-loaded when viewMode is `3d` or `split`
- Responsibilities: Creates R3F `<Canvas>` with camera/shadows, renders `<Scene>` which subscribes to cadStore and maps wall/product data to mesh components

## Error Handling

**Strategy:** No formal error boundaries. Silent failures via guard clauses.

**Patterns:**
- Tool functions check for valid state before acting (e.g., `if (!state.startPoint) return`)
- `renderProducts` skips any `PlacedProduct` whose `productId` is not found in `productLibrary`
- `WallMesh` skips dimension rendering if wall length is 0
- `ProductMesh` catches texture load errors silently (`try/catch` returns `null`)
- `export.ts` uses `alert()` when no canvas element is found

## Cross-Cutting Concerns

**Coordinate System:** All store data is in feet (real-world). 2D canvas converts at render time using `scale`/`origin`. 3D uses feet directly as Three.js world units with the convention `x = roomX`, `y = elevation`, `z = roomY`.

**Validation:** None at store level. Inputs use HTML `min`/`max`/`step` attributes. No schema validation on loaded project snapshots.

**Authentication:** Not implemented. No auth layer.

**Persistence:** Two separate IndexedDB namespaces via `idb-keyval`: `room-cad-products` (product library array) and `room-cad-project-{id}` prefixed keys (named project snapshots).

**Coordinate Snapping:** `useUIStore.gridSnap` (feet, default `0.5`) is read by all tools via `useUIStore.getState()` at interaction time. `src/lib/geometry.ts:snapPoint()` performs the snap.

---

*Architecture analysis: 2026-04-04*
