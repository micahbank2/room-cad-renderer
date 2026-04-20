# Codebase Concerns

**Analysis Date:** 2026-04-04

## Tech Debt

**React 18 downgrade (was React 19):**
- Issue: React was pinned to `^18.3.1` to maintain compatibility with `@react-three/fiber` v8 and `@react-three/drei` v9, which do not fully support React 19. This is an explicit constraint, not an oversight.
- Files: `package.json`
- Impact: Cannot use React 19 features (server components, improved `use()` hook, improved transitions). Will need to track R3F's React 19 support timeline.
- Fix approach: Upgrade to `@react-three/fiber` v9 (when stable) before bumping React to 19.

**Tool cleanup stored as arbitrary property on Fabric canvas instance:**
- Issue: Each tool stores its cleanup function on the Fabric canvas instance via `(fc as any).__xToolCleanup`. This bypasses TypeScript's type system entirely and pollutes a third-party object.
- Files: `src/canvas/tools/wallTool.ts` (line 117), `src/canvas/tools/selectTool.ts` (line 190), `src/canvas/tools/doorTool.ts` (line 78), `src/canvas/tools/windowTool.ts` (line 77), `src/canvas/tools/productTool.ts` (line 60)
- Impact: No compile-time safety. If two tool activations race (e.g., during rapid redraw), the cleanup ref could be overwritten without calling the previous cleanup, leaking event listeners. The pattern also makes tool state invisible to React devtools or Zustand.
- Fix approach: Replace with a module-level `Map<fabric.Canvas, () => void>` keyed by canvas instance, or a single `activeToolCleanup` ref held in `FabricCanvas.tsx` and passed into each activate function.

**Tool state stored as module-level mutable singletons:**
- Issue: `wallTool.ts`, `selectTool.ts`, and `productTool.ts` each declare a `const state = { ... }` object at module scope. Because ES modules are singletons, this state is shared across any component that imports the module — problematic if two canvas instances ever exist simultaneously (e.g., tests, storybook, or future multi-room support).
- Files: `src/canvas/tools/wallTool.ts` (line 7-13), `src/canvas/tools/selectTool.ts` (line 8-20), `src/canvas/tools/productTool.ts` (line 8)
- Impact: Stale state if a canvas unmounts without cleanup completing, or if hot-module-replacement fires mid-gesture during development.
- Fix approach: Move state into closures inside each `activateXTool` call, returned and held by the caller.

**`pxToFeet` duplicated across every tool file:**
- Issue: The identical `pxToFeet` helper function is copy-pasted into `wallTool.ts`, `selectTool.ts`, `doorTool.ts`, `windowTool.ts`, and `productTool.ts`.
- Files: All five files under `src/canvas/tools/`
- Impact: Any fix to coordinate conversion must be applied in five places. A divergence already exists: `doorTool.ts` and `windowTool.ts` do not accept a `gridSnap` parameter in their `pxToFeet` usage.
- Fix approach: Extract to `src/canvas/tools/toolUtils.ts` and import from there.

**`findClosestWall` duplicated in door and window tools:**
- Issue: `doorTool.ts` and `windowTool.ts` both contain an identical `findClosestWall` function.
- Files: `src/canvas/tools/doorTool.ts` (line 20-38), `src/canvas/tools/windowTool.ts` (line 20-38)
- Impact: Maintenance burden. Any change to wall proximity logic must be applied twice.
- Fix approach: Move to `src/canvas/tools/toolUtils.ts` alongside the shared `pxToFeet`.

**`cadStore.ts` uses `JSON.parse(JSON.stringify(...))` for deep clone in history snapshots:**
- Issue: The `snapshot()` function in `src/stores/cadStore.ts` clones walls and placedProducts via `JSON.parse(JSON.stringify(...))` on every single store mutation (line 41-43). This is called by `pushHistory` which runs on every add, move, update, remove, and undo/redo.
- Files: `src/stores/cadStore.ts` (lines 38-44)
- Impact: CPU and GC pressure proportional to the number of walls and placed products. With 50 walls and 30 products, each drag mousemove event (calling `moveProduct`) serializes and deserializes the full store state. This will degrade noticeably at scale.
- Fix approach: Use `structuredClone()` (available in all modern browsers and faster than JSON roundtrip), or use Immer's `current()` utility to create a structural copy only at history push boundaries.

**Canvas full-redraw on every state change:**
- Issue: `FabricCanvas.tsx` calls `fc.clear()` and redraws all objects from scratch on every Zustand state update. The `redraw` callback is in the dependency array of a `useEffect`, so it fires on every change to `room`, `walls`, `placedProducts`, `productLibrary`, `activeTool`, `selectedIds`, or `showGrid`.
- Files: `src/canvas/FabricCanvas.tsx` (lines 49-83, 114-116)
- Impact: Dragging a product triggers `moveProduct` → store update → full canvas clear → re-add all polygons, labels, dimension text, and grid lines → `renderAll()`. Performance degrades roughly O(n) with wall and product count. The full-redraw also re-activates the current tool on every mousemove, which causes `deactivateAllTools` + `activateCurrentTool` to run during every drag frame.
- Fix approach: Separate static layers (grid, room outline, dimension labels) from interactive layers. Use Fabric's object `set()` to update position/stroke of existing objects instead of clearing and recreating. At minimum, debounce non-interactive state changes (room dims, grid toggle) to avoid full redraws on every keystroke.

**Product images never render in 2D canvas:**
- Issue: `fabricSync.ts` creates an `<img>` element synchronously, then checks `imgEl.complete && imgEl.naturalWidth > 0` immediately. Because images loaded from IndexedDB base64 data URLs are not always decoded before the next tick, and because `redraw()` is synchronous, this check nearly always evaluates to `false`. The image is never added to the canvas group.
- Files: `src/canvas/fabricSync.ts` (lines 155-168)
- Impact: Product thumbnails never appear in the 2D floor plan view — users see only the border rectangle and labels. This is a confirmed bug noted in `CLAUDE.md`.
- Fix approach: Use `fabric.FabricImage.fromURL(url)` (async) or add an `onload` callback that triggers `fc.renderAll()` after the image decodes. This requires making `renderProducts` async or using a two-phase render (render placeholder, then update when image resolves).

**No auto-save; unsaved work is lost on close:**
- Issue: Projects are only saved when the user explicitly clicks "Save" in the `ProjectManager`. There is no debounced auto-save on store change.
- Files: `src/components/ProjectManager.tsx`, `src/App.tsx`
- Impact: Any browser close, refresh, or crash loses all unsaved work. Products are persisted to IndexedDB immediately on add/remove (`App.tsx` lines 38-45), but the CAD scene is not.
- Fix approach: Subscribe to `useCADStore` in a top-level effect and call `saveProject` with a debounce (e.g., 2s after last mutation). Requires surfacing the active project ID to `App.tsx`.

**`ProjectManager` uses old Tailwind class tokens not from the design system:**
- Issue: `ProjectManager.tsx` uses `bg-blue-50`, `border-cad-accent`, `bg-cad-accent`, `text-gray-700`, `text-gray-400`, etc. — a mix of default Tailwind classes and an old `cad-accent` token. The rest of the app uses the custom design system tokens (`obsidian-*`, `text-*`, `accent`).
- Files: `src/components/ProjectManager.tsx` (throughout)
- Impact: Visual inconsistency — the project manager panel looks like a different app from the rest of the UI. The `cad-accent` token may resolve to an unset value depending on how Tailwind v4 config is defined.
- Fix approach: Rewrite using `accent`, `obsidian-low`, `text-text-dim`, `text-text-ghost` tokens consistent with the rest of the UI.

**Export function uses a CSS class selector to find the canvas element:**
- Issue: `exportRenderedImage()` finds the Three.js canvas by querying `.bg-gray-900 canvas`. This is fragile — if the wrapper class changes (e.g., during a design system update to `bg-obsidian-deepest`), the export silently falls back to the Fabric canvas instead of throwing an error.
- Files: `src/lib/export.ts` (lines 8-9)
- Impact: Export silently exports the wrong canvas in 3D mode without notifying the user. Already partially broken: the Three viewport wrapper uses `bg-obsidian-deepest`, not `bg-gray-900`.
- Fix approach: Pass a `ref` to the canvas element from `ThreeViewport` and `FabricCanvas`, or use a stable `data-canvas-id` attribute.

**`uid()` uses a module-level counter that resets on page load:**
- Issue: `uid()` in `src/lib/geometry.ts` returns `${++_idCounter}_${Date.now().toString(36)}`. The counter starts at 0 on every page load, so IDs are only unique within a session. If two objects are created in the same millisecond across two sessions and stored in IndexedDB, their IDs could collide.
- Files: `src/lib/geometry.ts` (lines 88-91)
- Impact: Low risk currently (IndexedDB is per-browser, projects are single-user), but could cause subtle bugs if IDs from two saved projects are merged or compared.
- Fix approach: Use `crypto.randomUUID()` which is available in all modern browsers and produces collision-resistant IDs with no counter state.

**Product selection AABB ignores rotation:**
- Issue: The hit-test in `selectTool.ts` uses an axis-aligned bounding box (AABB) check against product position regardless of the product's `rotation` field.
- Files: `src/canvas/tools/selectTool.ts` (lines 43-58)
- Impact: A product rotated 45 degrees is hit-tested as if it were axis-aligned. Clicks near the corners of a rotated product miss, and clicks just outside the visual boundary incorrectly register as hits.
- Fix approach: Transform the click point into the product's local coordinate system using the rotation angle before performing the bounds check.

**Library view filter checkboxes are non-functional:**
- Issue: The category and material filter checkboxes in the library sidebar (`App.tsx` lines 107-127) have no `onChange` handler and no state binding. They render but do nothing.
- Files: `src/App.tsx` (lines 100-130)
- Impact: The library view sidebar is entirely cosmetic — filtering only works via the search input in the main `ProductLibrary` component.
- Fix approach: Wire checkboxes to state and pass selected filters as props to `ProductLibrary`, or remove the sidebar entirely until the feature is implemented.

## R3F v9 / React 19 Upgrade

This section documents the deferred upgrade from the current React 18 + R3F v8 + drei v9 stack to React 19 + R3F v9 + drei v10. Per phase 27 decisions (D-01 through D-04), this is a tracking/documentation artifact only — execution is deferred to a future phase when timing aligns. No `package.json` or `src/` changes are made in phase 27.

### Current State

The codebase is pinned to React 18 with R3F v8 and drei v9 because R3F v8 / drei v9 do not support React 19. The original downgrade (captured in the Tech Debt "React 18 downgrade" bullet above) was driven by hook errors with React 19 under the v8/v9 matrix.

Current pinned versions (verified from `package.json` on 2026-04-20):

| Package | Current |
|---------|---------|
| `react` | `^18.3.1` |
| `react-dom` | `^18.3.1` |
| `@types/react` | `^18.3.18` |
| `@types/react-dom` | `^18.3.5` |
| `@react-three/fiber` | `^8.17.14` |
| `@react-three/drei` | `^9.122.0` |
| `three` | `^0.183.2` |
| `@types/three` | `^0.183.1` |

### Target Versions

Target pinned versions (per D-02, locked):

| Package | Target |
|---------|--------|
| `react` | `^19.0.0` |
| `react-dom` | `^19.0.0` |
| `@types/react` | `^19.0.0` |
| `@types/react-dom` | `^19.0.0` |
| `@react-three/fiber` | `^9.0.0` |
| `@react-three/drei` | `^10.0.0` |
| `three` | unchanged (`^0.183.2`) |
| `@types/three` | unchanged (`^0.183.1`) |

Latest stables verified during research (2026-04-20): R3F 9.6.0, drei 10.7.7, React 19.2.x. Pin to the major ranges above per D-02 — do not pin to specific minors in `package.json`.

### Upgrade Sequence

Locked conceptual sequence: `R3F v9 → drei v10 → React 19`.

This is the conceptual dependency ordering: R3F v9 is the gatekeeper because drei v10 peer-requires R3F v9, and React 19 is peer-required by both R3F v9 and drei v10. In practice a single-PR `npm install` covers all four peer-deps at once (per RESEARCH.md §6 Option A). Example install command:

```
npm install react@^19 react-dom@^19 @react-three/fiber@^9 @react-three/drei@^10 @types/react@^19 @types/react-dom@^19
```

Do not stage the four bumps across separate PRs — intermediate peer-dep states are invalid (e.g., drei v10 + R3F v8 will not resolve).

### Known Blockers

- The original blocker was **hook errors with React 19** on the v8/v9 matrix — this is the same language used in the existing Tech Debt "React 18 downgrade" bullet above. That blocker is resolved at the upstream level by R3F v9 + drei v10 + React 19 all being GA stable as of 2026-04-20.
- Upstream status as of 2026-04-20: R3F v9 stable, drei v10 stable, React 19 GA. The blocker is resolved at the ecosystem level; execution of this upgrade is deferred to a future phase based on scheduling, not on ecosystem readiness.
- React 19.2 reconciler nuance: pin React 19.2.x at execution time to match the tested R3F v9 compatibility matrix (per RESEARCH.md §4). Avoid leading edge pre-releases.

### Per-Package Breaking Changes (Summary)

**R3F v9:**
- JSX namespace augmentation deprecated — use the exported `ThreeElements` type for JSX-intrinsic element typing instead of relying on global JSX namespace merging.
- Strict Mode double-render verification is needed for any `useFrame` imperative code to ensure effects are idempotent.
- Affected in this codebase: `src/three/ThreeViewport.tsx` and `src/three/WalkCameraController.tsx` import sites, plus all `src/three/*Mesh.tsx` files that use JSX intrinsics (`<mesh>`, `<group>`, `<boxGeometry>`, etc.).

**drei v10:**
- Manual `ContextBridge` component removed — not used in this codebase.
- Peer-requires `@react-three/fiber@^9` and React 19 — drives the single-PR upgrade pattern above.
- Existing drei component APIs used here (`OrbitControls`, `Environment`, `PointerLockControls`) are unchanged for our usage patterns.

**React 19:**
- `forwardRef` is deprecated in favor of ref as a prop — not used anywhere in `src/`.
- Removed APIs: string refs, `ReactDOM.render`, PropTypes, `defaultProps` on function components — none used in `src/`.
- Automatic batching unchanged from React 18.
- Ref cleanup functions are a new capability — opportunity for simplification, not a breaking change.

### Affected Files (at execution time — NOT modified in Phase 27)

Per RESEARCH.md §1 and §2, the following files will need review/changes when the upgrade executes:

- `src/three/ThreeViewport.tsx` — direct R3F + drei imports; `OrbitControls` ref typing update; Strict Mode audit on the camera-restore `useEffect`.
- `src/three/WalkCameraController.tsx` — direct R3F imports (`useFrame`, `useThree`); smoke-test only, no known API surface break.
- All `src/three/*Mesh.tsx` files — JSX intrinsics to be typed under the `ThreeElements` type import instead of global JSX namespace.
- `tsconfig.json` — may need `"types": ["@react-three/fiber"]` per the v9 types resolution pattern.
- `package.json` — version bumps for react, react-dom, @react-three/fiber, @react-three/drei, @types/react, @types/react-dom.

### Acceptance Criteria (for future execution phase)

Mirroring the acceptance block on GitHub issue #56:

- 3D viewport renders without errors on load.
- Walk mode (PointerLock) works — camera movement, pointer capture, escape handling.
- Orbit camera works — pan, zoom, rotate.
- Textures load on `ProductMesh` (existing async texture pathway intact).
- All tests pass (once test coverage lands per Test Coverage Gaps section below).
- No React hook errors in the browser console during navigation, tool switching, or 3D view interaction.

### Citations

- R3F v9 Migration Guide: [r3f.docs.pmnd.rs/tutorials/v9-migration-guide](https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide)
- React 19 release blog: [react.dev/blog/2024/12/05/react-19](https://react.dev/blog/2024/12/05/react-19)
- drei releases: [github.com/pmndrs/drei/releases](https://github.com/pmndrs/drei/releases)

### Tracking

GitHub [issue #56](https://github.com/micahbank2/room-cad-renderer/issues/56) is the persistent external tracking artifact for this upgrade and will stay OPEN until execution lands. This `CONCERNS.md` section is the in-repo mirror of that tracking state.

## Known Bugs

**3D export broken in current state:**
- Symptoms: Clicking export in 3D mode finds no canvas and either falls back to 2D export or shows the alert.
- Files: `src/lib/export.ts` (line 8)
- Trigger: Switch to 3D view, click export.
- Workaround: None — user gets either wrong output or an alert.

**Product images never show in 2D canvas:**
- Symptoms: Products with uploaded images display only as a dashed border rectangle in the floor plan.
- Files: `src/canvas/fabricSync.ts` (lines 155-168)
- Trigger: Place any product that has an `imageUrl`.
- Workaround: None currently.

## Security Considerations

**Base64 images stored in IndexedDB with no size cap:**
- Risk: `ProductForm.tsx` converts user-uploaded images to base64 and stores them in the `imageUrl` field, which is persisted to IndexedDB. There is no validation of file type, image dimensions, or data size.
- Files: `src/components/AddProductModal.tsx` (image upload handler), `src/lib/serialization.ts`
- Current mitigation: Browser-only storage limits protect against server-side abuse; this is a local tool.
- Recommendations: Add a client-side size limit (e.g., 2MB) and accept only `image/*` MIME types to prevent users from accidentally importing very large files that degrade performance.

## Performance Bottlenecks

**Full canvas redraw on every drag frame:**
- Problem: Every `mousemove` during a product drag fires `moveProduct` → Zustand update → `redraw()` → `fc.clear()` → full repaint of all canvas objects.
- Files: `src/canvas/FabricCanvas.tsx` (lines 49-116), `src/canvas/fabricSync.ts`
- Cause: The architecture treats the canvas as a pure view that reflects store state, which is correct conceptually but expensive when re-rendering the entire scene (grid, all walls with opening polygons, all dimension labels) on every mousemove event.
- Improvement path: Render static elements (grid, dimension labels) once to a background layer or offscreen canvas. Keep only interactive objects (walls, products) in the live Fabric canvas and update them via `object.set()` rather than clearing and recreating.

**History snapshots deep-clone entire scene on every mutation:**
- Problem: `pushHistory` in `cadStore.ts` runs `JSON.parse(JSON.stringify(...))` on the full `walls` and `placedProducts` records on every store action, including high-frequency ones like `moveProduct`.
- Files: `src/stores/cadStore.ts` (lines 38-50)
- Cause: Naive deep-clone approach.
- Improvement path: Throttle history snapshot pushes during drag (only push on `mouseUp`), or use `structuredClone()` for faster cloning. Consider only snapshotting the changed entity rather than the full scene.

## Fragile Areas

**Tool deactivation during rapid redraw:**
- Files: `src/canvas/FabricCanvas.tsx` (lines 81-82), all `src/canvas/tools/*.ts`
- Why fragile: `redraw()` calls `deactivateAllTools(fc)` then `activateCurrentTool(fc, ...)` on every render. If a tool's activate function throws or is called while a prior activation is still completing (e.g., a stale closure holds an old `origin`), event listeners can be doubled or stale coordinate transforms can be used for the remainder of a gesture.
- Safe modification: Any change to tool activate/deactivate logic must ensure deactivate is always called before activate and that closures capture the latest `scale` and `origin` values. Test by rapidly switching tools during an in-progress wall draw.
- Test coverage: None.

**`selectTool.ts` module-level `_productLibrary` ref:**
- Files: `src/canvas/tools/selectTool.ts` (lines 83-87)
- Why fragile: The product library is injected via `setSelectToolProductLibrary()` called from a `useEffect` in `FabricCanvas`. If the effect fires after a tool event (race condition), hit-testing against products uses a stale or empty library.
- Safe modification: Always call `setSelectToolProductLibrary` before activating the select tool.

## Scaling Limits

**IndexedDB storage for product images:**
- Current capacity: Unlimited by application code, bounded by browser quota (~10% of available disk by default, with user prompt for more).
- Limit: With large product libraries containing high-resolution images stored as base64, the serialized project snapshots (which embed product IDs but not images) will not hit limits, but the separate product store could become slow to load.
- Scaling path: Store only a reference (filename hash) and use the File System Access API for user-managed assets, or cap image dimensions on upload.

## Missing Critical Features

**GLTF/OBJ model loading not implemented:**
- Problem: `ProductMesh.tsx` renders all products as textured boxes. The `Product` type has no 3D model field. There is no model loading infrastructure.
- Blocks: Realistic 3D visualization for any custom furniture or product shape.

**No undo/redo for product library changes:**
- Problem: Adding or removing products from the library is not tracked in the CAD undo/redo history. The library is managed separately in `App.tsx` React state and IndexedDB.
- Blocks: Accidental product removal cannot be undone.

**No keyboard shortcut for product tool:**
- Problem: `App.tsx` defines shortcuts for `v` (select), `w` (wall), `d` (door), `n` (window) but not for `p` (product). The product tool can only be activated by clicking a product in the library.
- Blocks: Keyboard-driven workflow for power users.

## Test Coverage Gaps

**No tests of any kind:**
- What's not tested: All geometry math (`src/lib/geometry.ts`), store mutations (`src/stores/cadStore.ts`), serialization (`src/lib/serialization.ts`), and all tool interaction logic.
- Files: Entire `src/` directory — `package.json` test script exits with error code 1.
- Risk: Geometry bugs (wall corner calculation, opening placement, coordinate conversion) are invisible until a user reports visual glitches. Undo/redo correctness cannot be verified automatically. Serialization round-trips are untested.
- Priority: High for `src/lib/geometry.ts` and `src/stores/cadStore.ts` — these are pure functions with no browser dependencies and are trivial to unit test with Vitest.

---

*Concerns audit: 2026-04-04*
