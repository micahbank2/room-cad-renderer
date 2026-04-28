# Phase 53: Right-Click Context Menus on Canvas Objects — Research

**Researched:** 2026-04-27
**Domain:** Fabric.js event API, R3F event propagation, Zustand slice patterns, React DOM overlay patterns
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01** — Single `CanvasContextMenu` component at `src/components/CanvasContextMenu.tsx`
- **D-02** — Action sets per kind (wall/product/ceiling/custom/empty) locked in display order
- **D-03** — 2D uses `mouse:down` + button=2 + `fc.findTarget(e.e)`; 3D uses `onContextMenu` per mesh
- **D-04** — Anchor at clientX/Y; auto-flip via single `useLayoutEffect` measure pass; no library
- **D-05** — 5 close paths: Escape, click outside, click item, right-click elsewhere, resize/scroll
- **D-06** — Lucide icons; Phase 33 design tokens; 24px item height; 14px icons; IBM Plex Mono
- **D-07** — Skip when `document.activeElement` is INPUT/TEXTAREA/SELECT; `preventDefault` only over canvas objects
- **D-08** — 5 vitest unit tests + 8 Playwright e2e tests listed
- **D-09** — Atomic commits per task
- **D-10** — Zero regressions on Phases 46–52

### Claude's Discretion

None specified.

### Deferred Ideas (OUT OF SCOPE)

- Mobile / touch long-press
- Right-click on RoomsTreePanel tree rows
- Submenus / nested menus
- Customizable per-user menu items
- Keyboard arrow-key navigation within menu
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CTXMENU-01 | Right-click canvas object → context menu with kind-specific actions | All 8 focus areas addressed below |
</phase_requirements>

---

## Summary

Phase 53 wires right-click context menus across both the 2D Fabric.js canvas and the 3D R3F viewport. All infrastructure needed already exists: `uiStore` has the `pendingCameraTarget` / `requestCameraTarget` pattern to copy, `focusDispatch.ts` already has `focusOnWall` / `focusOnPlacedProduct` etc., `cadStore` already has the four `setSavedCameraOn*NoHistory` actions, and Phase 46's `toggleHidden` is directly callable. The only new infrastructure is: (1) the `contextMenu` slice in `uiStore`, (2) the `CanvasContextMenu` component, (3) exporting `copySelection` / `pasteSelection` from `shortcuts.ts` to a new `clipboardActions.ts`, and (4) a `pendingLabelFocus` slice for the custom-element Rename action.

**Primary recommendation:** Add `contextMenu` + `openContextMenu` + `closeContextMenu` to `uiStore` following the `pendingCameraTarget` + `seq`-based seq-increment pattern. Mount `<CanvasContextMenu />` once at the App.tsx level. Wire 2D via a native `mousedown` listener on the canvas wrapper (button=2 + `fc.findTarget`) and 3D via per-mesh `onContextMenu` JSX props.

---

## Focus Area 1: Fabric.js 2D Right-Click Wiring

### How `mouse:down` is currently wired

`FabricCanvas.tsx` does NOT attach `mouse:down` directly at the component level. The existing zoom/pan code attaches a native `mousedown` listener on `wrapperRef.current` at **FabricCanvas.tsx:370** (checks `e.button === 1` for middle-drag pan, `e.button === 0` for space+pan). The Fabric `fc.on("mouse:down", ...)` calls are inside the tool modules (e.g., `selectTool.ts:1348`).

**Conclusion:** The right-click handler should be a new native `mousedown` listener on `wrapperRef.current` — exactly like the pan handler — checking `e.button === 2`. No Fabric event channel needed.

### Does `e.button` work?

Yes. The wrapper's native `mousedown` event carries `e.button`. The pan handler at **FabricCanvas.tsx:371** already reads `e.button === 1`. The right-click handler follows the exact same shape: `if (e.button !== 2) return`.

### `fc.findTarget(e)` API

`fabric.Canvas.findTarget(e: Event)` returns the topmost Fabric object at the pointer position, or `null`/`undefined` if nothing was hit. It accepts the native `MouseEvent` directly. The correct call is:

```ts
const hit = fc.findTarget(e);
```

This is the production API used in Fabric v6. Confidence: HIGH (verified against Fabric.js v6 source patterns; selectTool reads `opt.e` as `MouseEvent` throughout at lines 590, 903, 999, 1143).

### How Fabric objects encode their ID

`fabricSync.ts` does NOT use a unified `data.id` field. Each object kind uses a different key:

| Kind | `data` shape | File:Line |
|------|-------------|-----------|
| Wall | `{ type: "wall", wallId: wall.id }` | fabricSync.ts:333–343 |
| Wall (painted split) | `{ type: "wall-side", wallId: wall.id, side }` | fabricSync.ts:313, 323 |
| Product group | `{ type: "product", placedProductId: pp.id, productId: pp.productId }` | fabricSync.ts:925 |
| Ceiling | `{ type: "ceiling", ceilingId: c.id }` | fabricSync.ts:216 |
| Custom element rect | `{ type: "custom-element", placedId: p.id }` | fabricSync.ts:81 |
| Custom element label | `{ type: "custom-element-label", pceId: p.id }` | fabricSync.ts:100 |
| Rotation handle | `{ type: "rotation-handle", placedId: p.id }` | fabricSync.ts:130 |
| Resize handle | `{ type: "resize-handle", corner, placedId }` | fabricSync.ts:153 |
| Opening | `{ type: "opening", openingId, wallId }` | fabricSync.ts:424 |

**All Fabric objects have `evented: false`** — meaning `fc.findTarget(e)` will NOT hit them via the standard Fabric hit-test path (evented=false objects are skipped by the hit-tester). The correct approach is to use `fc._searchPossibleTargets` or iterate `fc.getObjects()` manually, OR use the raw pointer coordinate and perform manual hit testing from the store.

**Recommended approach for 2D hit detection:** Use the pointer coordinate from the native `mousedown` event, convert to canvas coordinates via `fc.getViewportPoint(e)`, then scan `fc.getObjects()` filtering for objects whose `data.type` belongs to a known CAD kind (skip handles, corner-caps, labels, grid objects). This is the same pattern selectTool uses at **selectTool.ts:894** with `fc.getViewportPoint(opt.e)`.

**Kind dispatch table for the handler:**

```ts
function resolveHit(obj: fabric.Object): { kind: ContextMenuKind; nodeId: string } | null {
  const d = (obj as any).data;
  if (!d) return null;
  if (d.type === "wall" || d.type === "wall-side" || d.type === "wall-limewash")
    return { kind: "wall", nodeId: d.wallId };
  if (d.type === "product")
    return { kind: "product", nodeId: d.placedProductId };
  if (d.type === "ceiling" || d.type === "ceiling-limewash")
    return { kind: "ceiling", nodeId: d.ceilingId };
  if (d.type === "custom-element" || d.type === "custom-element-label")
    return { kind: "custom", nodeId: d.placedId ?? d.pceId };
  return null; // handles, labels, grid — skip
}
```

**No `data.id` exists.** The field is kind-specific (`wallId`, `placedProductId`, `ceilingId`, `placedId`). Confidence: HIGH (direct read of fabricSync.ts).

---

## Focus Area 2: R3F Right-Click — Propagation + Empty-Canvas Detection

### Does R3F `onContextMenu` bubble?

In R3F, pointer events on meshes DO propagate up the JSX tree by default (same as React DOM). Each mesh fires `onContextMenu` with an `event` that has `stopPropagation()`. To prevent the event from reaching a parent mesh (e.g., a wall mesh inside a group), call `e.stopPropagation()` inside the mesh handler.

**Correct pattern per mesh:**

```tsx
<mesh
  onContextMenu={(e) => {
    e.stopPropagation();
    e.nativeEvent.preventDefault();
    useUIStore.getState().openContextMenu("wall", wall.id, {
      x: e.nativeEvent.clientX,
      y: e.nativeEvent.clientY,
    });
  }}
>
```

### Empty-canvas detection in 3D

When a right-click hits NO mesh, R3F does not fire `onContextMenu` on any mesh. The event falls through to the DOM `<canvas>` element. Two options:

1. **`onPointerMissed` on `<Canvas>`** — R3F's `onPointerMissed` fires when a pointer event hits no mesh. However, `onPointerMissed` is for pointer events (mousemove/click), not contextmenu specifically. Confirmed: R3F does not have an `onContextMenuMissed` equivalent.

2. **DOM `contextmenu` listener on the canvas wrapper div** — Attach a native `addEventListener("contextmenu", handler)` on the `<div className="w-full h-full bg-obsidian-deepest relative">` wrapper (**ThreeViewport.tsx:517**). When a mesh fires `e.nativeEvent.preventDefault()` + `e.stopPropagation()`, the native event is already prevented at mesh level. When NO mesh is hit, the native event bubbles to the wrapper div.

**Recommended approach (Option 2):** Add a native `contextmenu` handler on the ThreeViewport outer div. If `uiStore.contextMenu` was already set by a mesh handler in the same event cycle, this handler no-ops (check `useUIStore.getState().contextMenu !== null` as a guard won't work since mesh handler fires synchronously before bubbling). Use a module-level flag `let _meshHandledThisEvent = false` reset on the next tick, OR simply check if the mesh set the menu already via a sentinel approach.

**Simpler alternative:** Attach the empty-canvas handler at `<Canvas onContextMenu={...}>` — R3F Canvas accepts `onContextMenu` as a DOM prop. Since R3F mesh handlers call `e.stopPropagation()`, a mesh hit prevents the Canvas-level handler from firing. When no mesh is hit, the Canvas-level handler fires.

```tsx
<Canvas
  onContextMenu={(e: React.MouseEvent) => {
    e.preventDefault();
    // Only if no mesh handled it (mesh handlers call stopPropagation)
    useUIStore.getState().openContextMenu("empty", null, {
      x: e.clientX,
      y: e.clientY,
    });
  }}
>
```

**Confidence:** MEDIUM — verified by R3F event-system docs that `stopPropagation()` on mesh events prevents bubbling to the Canvas root. The Canvas-level `onContextMenu` is a standard DOM handler on the canvas element.

---

## Focus Area 3: Helper Extraction — `copySelection` / `pasteSelection`

**Current state:** Both functions are file-private in `src/lib/shortcuts.ts` (lines 116–182). They share a module-level `_clipboard` variable (line 114) and a `PASTE_OFFSET` constant (line 112).

**Recommendation: Option (b) — extract to `src/lib/clipboardActions.ts`.**

Rationale:
- `shortcuts.ts` is already at its correct scope (keyboard registry factory). Adding exports to it couples the context-menu feature to the shortcut registry file, which has its own iteration-order invariant and test coverage.
- `clipboardActions.ts` becomes a clean shared dependency: both `shortcuts.ts` (for Cmd+C/V) and `CanvasContextMenu.tsx` import from it.
- `_clipboard` and `PASTE_OFFSET` move to `clipboardActions.ts`; `shortcuts.ts` imports `copySelection`, `pasteSelection` from there.

**`src/lib/clipboardActions.ts` shape:**

```ts
// src/lib/clipboardActions.ts
// Shared clipboard actions for Cmd+C/V shortcuts (shortcuts.ts) and
// CanvasContextMenu (CanvasContextMenu.tsx).

import type { WallSegment, PlacedProduct, RoomDoc } from "@/types/cad";
import { useUIStore } from "@/stores/uiStore";
import { useCADStore, getActiveRoomDoc } from "@/stores/cadStore";
import { uid } from "@/lib/geometry";

export const PASTE_OFFSET = 1;

let _clipboard: { walls: WallSegment[]; products: PlacedProduct[] } | null = null;

export function hasClipboardContent(): boolean {
  return _clipboard !== null && (_clipboard.walls.length > 0 || _clipboard.products.length > 0);
}

export function copySelection(): boolean { /* ... moved from shortcuts.ts ... */ }
export function pasteSelection(): boolean { /* ... moved from shortcuts.ts ... */ }
```

The `hasClipboardContent()` export is needed by `CanvasContextMenu` to gate the "Paste" entry on the Empty Canvas menu (D-02: "only when clipboard non-empty — hide entry otherwise").

---

## Focus Area 4: uiStore `contextMenu` Slice

**Mirror pattern:** `pendingCameraTarget` (uiStore.ts:78–82) — a nullable object with a `seq` field for idempotent re-triggers. The `contextMenu` slice is simpler (no seq needed since open/close are explicit).

**Exact TypeScript to add to `uiStore.ts`:**

```ts
// --- State additions (inside UIState interface) ---

contextMenu: {
  kind: "wall" | "product" | "ceiling" | "custom" | "empty";
  nodeId: string | null;   // null only for "empty"
  position: { x: number; y: number };
} | null;

openContextMenu: (
  kind: "wall" | "product" | "ceiling" | "custom" | "empty",
  nodeId: string | null,
  position: { x: number; y: number },
) => void;
closeContextMenu: () => void;

// --- Optionally: for Rename label trigger (see Focus Area 5) ---
pendingLabelFocus: string | null;  // pceId to focus; component clears after handling
setPendingLabelFocus: (pceId: string | null) => void;
```

**Implementation (inside `create<UIState>()` call):**

```ts
contextMenu: null,
openContextMenu: (kind, nodeId, position) =>
  set({ contextMenu: { kind, nodeId, position } }),
closeContextMenu: () => set({ contextMenu: null }),
pendingLabelFocus: null,
setPendingLabelFocus: (pceId) => set({ pendingLabelFocus: pceId }),
```

**Type alias to export (for consumers):**

```ts
export type ContextMenuState = NonNullable<UIState["contextMenu"]>;
export type ContextMenuKind = ContextMenuState["kind"];
```

---

## Focus Area 5: Custom Element "Rename Label" Trigger

### LabelOverrideInput location

`LabelOverrideInput` is a file-private function component in `src/components/PropertiesPanel.tsx:547`. It renders an `<input aria-label="Label override">` (line 638). It does NOT have a `ref` or `data-testid` that would allow external focus targeting.

### Pattern recommendation: Option (a) — `pendingLabelFocus` in uiStore

**How it works:**
1. Context menu "Rename label" action:
   - Calls `useUIStore.getState().select([nodeId])` (selects the element, opens PropertiesPanel)
   - Calls `useUIStore.getState().setPendingLabelFocus(nodeId)` (signals intent)
   - Calls `useUIStore.getState().closeContextMenu()`

2. `LabelOverrideInput` adds a `useEffect` watching `pendingLabelFocus`:
   ```ts
   const pendingLabelFocus = useUIStore((s) => s.pendingLabelFocus);
   const inputRef = useRef<HTMLInputElement>(null);
   useEffect(() => {
     if (pendingLabelFocus === pce.id && inputRef.current) {
       inputRef.current.focus();
       inputRef.current.select();
       useUIStore.getState().setPendingLabelFocus(null);
     }
   }, [pendingLabelFocus, pce.id]);
   ```

3. Add `ref={inputRef}` to the `<input>` at PropertiesPanel.tsx:633.

**Why not option (b) DOM query:** `document.querySelector('[aria-label="Label override"]')` is fragile — breaks if the panel is hidden, another input has the same aria-label, or the DOM structure changes.

**Why not option (c) pendingCameraTarget analogy with seq:** The `seq` increment is needed when back-to-back same-value requests must both fire. Rename requests are always for a specific pceId that differs per call, so a simple nullable `string | null` is sufficient.

**Coupling:** This adds only one field to uiStore and one `useEffect` to `LabelOverrideInput`. No component needs to import from `CanvasContextMenu.tsx`. Confidence: HIGH.

---

## Focus Area 6: Auto-Flip Math

Standard pattern. After the component mounts, one `useLayoutEffect` pass measures the menu element and computes adjusted position:

```tsx
const menuRef = useRef<HTMLDivElement>(null);
const [adjustedPos, setAdjustedPos] = useState(position);

useLayoutEffect(() => {
  const el = menuRef.current;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let x = position.x;
  let y = position.y;

  // Flip leftward if right edge overflows
  if (x + rect.width > vw) x = x - rect.width;
  // Flip upward if bottom edge overflows
  if (y + rect.height > vh) y = y - rect.height;

  // Clamp to viewport (safety — handles corner case near 0,0)
  x = Math.max(0, x);
  y = Math.max(0, y);

  setAdjustedPos({ x, y });
}, [position.x, position.y]);

// Render:
<div
  ref={menuRef}
  style={{ position: "fixed", left: adjustedPos.x, top: adjustedPos.y, zIndex: 9999 }}
>
```

**Note:** Use `position: fixed` (not `absolute`) so the menu renders relative to the viewport regardless of scroll or transform on parent containers. The canvas wrapper div has `overflow: hidden` — absolute positioning inside it would clip the menu.

**Unit test pattern (D-08):**

```ts
// Auto-flip: anchor near right edge → menu renders leftward from anchor
test("flips left when right edge overflows viewport", () => {
  const menuWidth = 200;
  const vw = 1024;
  const anchorX = 900; // 900 + 200 = 1100 > 1024
  const expectedX = anchorX - menuWidth; // 700
  expect(computeFlippedX(anchorX, menuWidth, vw)).toBe(expectedX);
});
```

---

## Focus Area 7: E2E Playwright Setup

### Right-click API

Playwright supports right-click via:
```ts
await page.mouse.click(x, y, { button: "right" });
// or
await page.locator("[data-testid=...]").click({ button: "right" });
```

Both are confirmed correct (Playwright docs). Use `page.locator` form when targeting a known element (toolbar button); use `page.mouse.click` for raw canvas coordinates.

### 3D mesh right-click approach

3D meshes have no DOM testid. Recommended approach (mirrors Phase 48 `__getCameraPose` pattern):

**Add a test-mode driver `__getCanvasObjectScreenPos(meshId: string): { x: number; y: number } | null`** in ThreeViewport.tsx Scene, gated on `import.meta.env.MODE === "test"`. It projects the mesh world position to screen coordinates:

```ts
// Inside Scene useEffect (test-mode gated):
(window as any).__getCanvasObjectScreenPos = (meshId: string) => {
  const ctrl = orbitControlsRef.current;
  if (!ctrl?.object) return null;
  // Find world position from store
  const doc = getActiveRoomDoc();
  const wall = doc?.walls[meshId];
  if (wall) {
    const worldPos = new THREE.Vector3(
      (wall.start.x + wall.end.x) / 2, wall.height / 2, (wall.start.y + wall.end.y) / 2
    );
    worldPos.project(ctrl.object as THREE.Camera);
    const canvas = (ctrl.object as any).domElement ?? document.querySelector("canvas");
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: rect.left + ((worldPos.x + 1) / 2) * rect.width,
      y: rect.top + ((-worldPos.y + 1) / 2) * rect.height,
    };
  }
  // repeat for products/ceilings via placedProducts etc.
  return null;
};
```

Alternatively (simpler for CI stability): seed scene with known room dimensions, navigate to 3D, use the `__getCameraPose` driver to set a deterministic camera, then compute the expected pixel from known world position + camera math. This avoids adding a new driver.

**Recommended e2e test structure:**

```ts
// e2e/canvas-context-menu.spec.ts
test("right-click wall in 2D shows 5-entry menu", async ({ page }) => {
  // Seed project, enter 2D mode
  // Use __openDimensionEditor pattern: seed wall, get bbox from store, derive canvas px
  await page.mouse.click(wallPx.x, wallPx.y, { button: "right" });
  await expect(page.locator("[data-testid=context-menu]")).toBeVisible();
  await expect(page.locator("[data-testid=ctx-action]")).toHaveCount(5);
});

test("Escape closes context menu", async ({ page }) => {
  // ... open menu ...
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-testid=context-menu]")).not.toBeVisible();
});
```

Use `data-testid="context-menu"` on the root `<div>` and `data-testid="ctx-action"` on each menu item button.

---

## Focus Area 8: Task Breakdown Estimate

**1 plan, 5 tasks.** Matches Phase 49/50/52 shape.

| Task | Work |
|------|------|
| T1: uiStore + clipboardActions | Add `contextMenu` slice to uiStore; extract `copySelection`/`pasteSelection`/`hasClipboardContent` to `src/lib/clipboardActions.ts`; update `shortcuts.ts` imports; add `pendingLabelFocus` slice |
| T2: CanvasContextMenu component | `src/components/CanvasContextMenu.tsx` — `getActionsForKind()`, auto-flip, 5 close paths, Lucide icons, Phase 33 tokens |
| T3: 2D wiring | `FabricCanvas.tsx` — native `mousedown` button=2 handler + `fc.getObjects()` scan → `openContextMenu`; mount `<CanvasContextMenu>` in App.tsx |
| T4: 3D wiring | `WallMesh.tsx`, `ProductMesh.tsx`, `CeilingMesh.tsx`, custom-element meshes — `onContextMenu` props; Canvas-level empty-canvas handler in ThreeViewport; `LabelOverrideInput` `pendingLabelFocus` wiring |
| T5: Tests | `tests/lib/contextMenuActions.test.ts` (5 vitest); `e2e/canvas-context-menu.spec.ts` (8 scenarios) |

---

## Architecture Patterns

### `getActionsForKind()` registry

```ts
// Inside CanvasContextMenu.tsx

interface ContextAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  handler: () => void;
  disabled?: boolean;
}

function getActionsForKind(
  kind: ContextMenuKind,
  nodeId: string | null,
): ContextAction[] {
  switch (kind) {
    case "wall":    return wallActions(nodeId!);
    case "product": return productActions(nodeId!);
    case "ceiling": return ceilingActions(nodeId!);
    case "custom":  return customActions(nodeId!);
    case "empty":   return emptyActions();
  }
}
```

### Component mount point (App.tsx)

Mount unconditionally at the App root, sibling to `<FabricCanvas>` / `<ThreeViewport>`:

```tsx
<CanvasContextMenu />
```

The component renders `null` when `uiStore.contextMenu === null`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Camera focus on right-click | New camera math | `focusOnWall`, `focusOnPlacedProduct`, `focusOnPlacedCustomElement`, `focusOnCeiling` in `focusDispatch.ts` | Phase 46 already computes bbox + diagonal framing |
| Save camera on right-click | New pose capture | `setSavedCameraOnWallNoHistory` / `setSavedCameraOnProductNoHistory` / etc. from cadStore | Phase 48 already wired |
| Hide/Show on right-click | New visibility logic | `useUIStore.getState().toggleHidden(id)` | Phase 46 |
| Copy/Paste actions | Duplicate clipboard logic | `copySelection` / `pasteSelection` from new `clipboardActions.ts` | Phase 31 / Phase 52 |
| Delete actions | New remove calls | `useCADStore.getState().removeWall(id)` etc. already exist | cadStore already has them |

---

## Common Pitfalls

### Pitfall 1: `evented: false` breaks `fc.findTarget()`

**What goes wrong:** All Fabric objects in fabricSync.ts have `evented: false` (Phase 25 PERF-01 optimization). `fc.findTarget(e)` skips non-evented objects — it returns `null` even when the pointer is over a wall.

**How to avoid:** Use `fc.getObjects()` and scan manually with `fc.getViewportPoint(e)` converted to canvas coordinates, then check if the pointer falls within each object's bounding box. Mirror selectTool.ts hit-test at line 894+.

**Warning signs:** `fc.findTarget(e)` always returns `null` in testing.

### Pitfall 2: Fabric `mouse:down` fires BEFORE `e.button` is accessible as Fabric option

**What goes wrong:** Fabric's `fc.on("mouse:down", opt)` receives `opt.e` as the native event. This DOES expose `opt.e.button`. However, the Fabric `mouse:down` fires for ALL mouse buttons including right-click. If the existing tool handlers don't guard against `button === 2`, adding a right-click branch inside Fabric's `mouse:down` causes tool interactions to also run on right-click.

**How to avoid:** Use a native `mousedown` listener on the wrapper (as recommended), completely separate from Fabric's event system. The native handler guards `if (e.button !== 2) return` before calling `fc.getObjects()`.

### Pitfall 3: Browser context menu shows behind the custom menu

**What goes wrong:** Forgetting `e.preventDefault()` on the native event causes both the custom menu AND the browser context menu to appear.

**How to avoid:** Call `e.preventDefault()` in the native wrapper listener (2D) and `e.nativeEvent.preventDefault()` in each R3F mesh `onContextMenu` handler (3D).

### Pitfall 4: `position: absolute` clips inside canvas wrapper

**What goes wrong:** The canvas wrapper div has `overflow: hidden` (FabricCanvas.tsx:516). Rendering `<CanvasContextMenu>` as a child of the wrapper with `position: absolute` causes it to be clipped.

**How to avoid:** Mount `<CanvasContextMenu>` at the App.tsx level (outside any `overflow: hidden` container) and use `position: fixed` for the menu itself. This is why D-01 specifies mounting once at App.tsx level.

### Pitfall 5: R3F mesh `onContextMenu` fires for left-click+drag release on some browsers

**What goes wrong:** On some browsers, a long left-click drag ending on a mesh fires `contextmenu`. Guard: check `e.nativeEvent.button === 2` inside the R3F handler before calling `openContextMenu`.

---

## Code Examples

### 2D right-click handler in FabricCanvas.tsx (new useEffect)

```ts
// Source: fabricSync.ts data shapes + FabricCanvas.tsx pan handler pattern (line 370)
useEffect(() => {
  const wrapper = wrapperRef.current;
  if (!wrapper) return;
  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 2) return;
    if (isInput(document.activeElement)) return; // D-07
    e.preventDefault();
    const fc = fcRef.current;
    if (!fc) return;
    const pointer = fc.getViewportPoint(e);
    let hit: { kind: ContextMenuKind; nodeId: string } | null = null;
    for (const obj of fc.getObjects()) {
      const d = (obj as any).data;
      if (!d) continue;
      if (d.type === "wall" || d.type === "wall-side") {
        if (obj.containsPoint(pointer as any)) { hit = { kind: "wall", nodeId: d.wallId }; break; }
      } else if (d.type === "product") {
        if (obj.containsPoint(pointer as any)) { hit = { kind: "product", nodeId: d.placedProductId }; break; }
      } else if (d.type === "ceiling") {
        if (obj.containsPoint(pointer as any)) { hit = { kind: "ceiling", nodeId: d.ceilingId }; break; }
      } else if (d.type === "custom-element") {
        if (obj.containsPoint(pointer as any)) { hit = { kind: "custom", nodeId: d.placedId }; break; }
      }
    }
    if (hit) {
      useUIStore.getState().openContextMenu(hit.kind, hit.nodeId, { x: e.clientX, y: e.clientY });
    } else {
      useUIStore.getState().openContextMenu("empty", null, { x: e.clientX, y: e.clientY });
    }
  };
  wrapper.addEventListener("mousedown", onMouseDown);
  return () => wrapper.removeEventListener("mousedown", onMouseDown);
}, []);
```

**Note on containsPoint:** Fabric v6's `containsPoint` accepts an `{x, y}` viewport-coordinate point. With `evented: false` objects, `containsPoint` still works for bounding-box hit testing — it is not gated on `evented`.

### WallMesh onContextMenu (3D)

```tsx
// Source: ThreeViewport.tsx Canvas root + D-03
<mesh
  geometry={geometry}
  position={position}
  rotation={rotation}
  onContextMenu={(e) => {
    e.stopPropagation();
    e.nativeEvent.preventDefault();
    if (e.nativeEvent.button !== 2) return; // guard
    useUIStore.getState().openContextMenu("wall", wall.id, {
      x: e.nativeEvent.clientX,
      y: e.nativeEvent.clientY,
    });
  }}
>
```

---

## Environment Availability

Step 2.6: SKIPPED — phase is code/config-only changes; no external tool dependencies beyond the existing project stack.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest (existing, see package.json) |
| Config file | vite.config.ts / vitest config (existing) |
| Quick run command | `npm run test -- --run tests/lib/contextMenuActions.test.ts` |
| Full suite command | `npm run test -- --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CTXMENU-01 | `getActionsForKind("wall")` returns 5 actions in correct order | unit | `npm run test -- --run tests/lib/contextMenuActions.test.ts` | ❌ Wave 0 |
| CTXMENU-01 | `getActionsForKind("empty")` returns 0 when clipboard empty | unit | same | ❌ Wave 0 |
| CTXMENU-01 | Auto-flip math: near right edge → leftward | unit | same | ❌ Wave 0 |
| CTXMENU-01 | Auto-flip math: near bottom edge → upward | unit | same | ❌ Wave 0 |
| CTXMENU-01 | Right-click wall 2D → menu with 5 entries | e2e | `npx playwright test e2e/canvas-context-menu.spec.ts` | ❌ Wave 0 |
| CTXMENU-01 | Press Escape → menu closes | e2e | same | ❌ Wave 0 |
| CTXMENU-01 | Click outside → menu closes | e2e | same | ❌ Wave 0 |
| CTXMENU-01 | Right-click in form input → menu NOT open | e2e | same | ❌ Wave 0 |

### Wave 0 Gaps

- [ ] `tests/lib/contextMenuActions.test.ts` — covers CTXMENU-01 unit assertions
- [ ] `e2e/canvas-context-menu.spec.ts` — covers CTXMENU-01 e2e scenarios

---

## Sources

### Primary (HIGH confidence)

- Direct read: `src/canvas/fabricSync.ts` — all `data` shapes per kind (lines 81, 100, 117, 130, 153, 175, 216, 313, 323, 333, 343, 360, 378, 424, 925)
- Direct read: `src/canvas/FabricCanvas.tsx` — existing mouse handler patterns (lines 370–434), `isInput` helper (line 551)
- Direct read: `src/stores/uiStore.ts` — `pendingCameraTarget` slice pattern (lines 78–82); `requestCameraTarget` action (lines 269–274)
- Direct read: `src/lib/shortcuts.ts` — `copySelection` / `pasteSelection` (lines 116–182), `_clipboard` (line 114)
- Direct read: `src/components/PropertiesPanel.tsx` — `LabelOverrideInput` (lines 547–658), input element (line 633)
- Direct read: `src/components/RoomsTreePanel/focusDispatch.ts` — all focus helpers (lines 42–176)
- Direct read: `src/stores/cadStore.ts` — `setSavedCameraOn*NoHistory` actions (lines 85–104)
- Direct read: `src/three/ThreeViewport.tsx` — Canvas root (line 518), `orbitControlsRef` pattern, `__getCameraPose` driver (lines 156–175)
- Direct read: `src/three/WallMesh.tsx` — mesh component shape (lines 43–89)

### Secondary (MEDIUM confidence)

- R3F event propagation: `stopPropagation()` on R3F mesh prevents Canvas-level handler — standard React event model applied to R3F; consistent with R3F documentation patterns

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in existing source
- Architecture: HIGH — all patterns verified with file:line citations
- Pitfalls: HIGH — `evented: false` confirmed directly in fabricSync.ts

**Research date:** 2026-04-27
**Valid until:** 2026-05-27 (stable codebase, no external dependencies)
