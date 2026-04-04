# Phase 1: 2D Canvas Polish - Research

**Researched:** 2026-04-04
**Domain:** Fabric.js v6 interactive canvas + HTML5 DOM integration + Zustand auto-save
**Confidence:** HIGH

## Summary

Phase 1 is a targeted interaction polish pass on the existing 2D Fabric canvas. Five
requirements (EDIT-06, EDIT-07, EDIT-08, EDIT-09, SAVE-02) all sit on top of
infrastructure that already exists in the codebase: the store-driven render loop, tool
activate/deactivate lifecycle, Zustand + Immer with history snapshots, and
`idb-keyval` project persistence via `saveProject()`.

The single hardest item technically is the async image fix (EDIT-09). The current code
in `src/canvas/fabricSync.ts` (lines 155-168) creates a raw `<img>` synchronously and
checks `imgEl.complete && imgEl.naturalWidth > 0` inside a synchronous redraw, which
nearly always evaluates false for base64 data URLs from IndexedDB. Fabric v6's
`FabricImage.fromURL()` is Promise-based and is the correct fix. Because `renderProducts`
runs inside a synchronous full-redraw, the practical pattern is two-phase: render a
placeholder group immediately, kick off the promise, and call `fc.renderAll()` (or
swap the image child into the existing group) when the image resolves.

The other four items are patterns Fabric v6 and the browser DOM support directly:
HTML5 drag-and-drop from sidebar cards onto the canvas wrapper element (DOM-level,
NOT a Fabric tool), custom `fabric.Control` objects for the Canva-style rotation arc,
an absolutely-positioned HTML `<input>` overlaid on the Fabric canvas for inline
dimension editing, and `useCADStore.subscribe()` + a debounce wrapper for auto-save.

**Primary recommendation:** Implement each requirement as a thin, additive layer on top
of the existing systems. Do NOT refactor the full-redraw model, the module-level tool
singletons, or the `(fc as any).__cleanup` pattern during this phase — those are
documented tech debt (see CONCERNS.md) and touching them expands scope significantly.

## Project Constraints (from CLAUDE.md)

These directives from `/Users/micahbank/room-cad-renderer/CLAUDE.md` are authoritative:

- **Tech stack is locked:** React 18 (NOT 19), Fabric.js v6, Three.js via R3F v8 + drei v9, Zustand v5 + Immer, Tailwind v4, idb-keyval. No new frameworks.
- **Store-driven rendering:** Zustand is the single source of truth. Both 2D (Fabric) and 3D (R3F) read from the same store. New features MUST flow through `cadStore` actions — never mutate Fabric objects directly as source-of-truth.
- **All geometry in feet:** scale + origin applied only at render time. New code preserves this invariant.
- **Tool lifecycle pattern:** `activate*(fc, scale, origin)` attaches listeners and stores cleanup on `(fc as any).__xToolCleanup`; `deactivate*()` reads and calls it. Match this pattern for any Fabric event handlers.
- **Design tokens:** Use `obsidian-*`, `accent`, `accent-light`, `text-text-*` tokens. Font-mono (IBM Plex Mono) for all UI chrome/labels/values; Inter for prose only.
- **No backend, local-first:** All persistence is IndexedDB via `idb-keyval`.
- **GSD workflow:** All file-changing tools must go through a GSD command (this is a GSD phase, so that is satisfied).
- **No tests currently exist:** `package.json` test script exits 1. Phase 1 adds validation infrastructure (see Validation Architecture).

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Drag-drop Placement (EDIT-07):**
- **D-01:** Use HTML5 drag-and-drop API. Product cards in the sidebar library become draggable; drop onto the canvas. Ghost preview follows the cursor.
- **D-02:** Dropped products snap to the grid (currently 0.5ft / 6 inches) — consistent with existing snap-to-grid.
- **D-03:** On drop, the newly-placed product is auto-selected so Jessica can immediately nudge position or rotate without an extra click.
- **D-04:** Keep the existing click-to-place flow (productTool.ts) as a secondary path. Drag-drop is primary, click-to-place remains a fallback.

**Rotation Handles (EDIT-08):**
- **D-05:** Selected products show a corner-dot-plus-arc handle (Figma/Canva style) — small circle above the product connected by a thin line. Drag in an arc to rotate.
- **D-06:** Rotation snaps to 15° increments by default. Holding Shift disables snapping for free rotation.
- **D-07:** Moving a selected product uses direct drag on the product body. Rotation handle is the only visible affordance — move is implicit.

**Dimension Editing (EDIT-06):**
- **D-08:** Double-clicking a wall dimension label opens an inline HTML text field overlaid at the label position. Enter commits, Escape cancels.
- **D-09:** Wall resize moves the end point only. Start point stays fixed; end point moves along the wall's current direction. If another wall shares the moved endpoint (corner), that connected wall's start point moves with it.
- **D-10:** Input format is plain feet as a number (e.g., "12" = 12 feet). `formatFeet()` continues to handle display. No fractional inch parsing needed.

**Auto-save (SAVE-02):**
- **D-11:** Auto-save triggers 2 seconds after the last change (debounced). Applies to all cadStore mutations.
- **D-12:** A subtle status indicator shows "Saving..." → "Saved" and fades out.
- **D-13:** If no project yet, auto-save creates one named "Untitled Room". Work is never lost.

### Claude's Discretion

- Exact debounce implementation (lodash debounce, custom timeout, or useDeferredValue) — pick what integrates cleanly with Zustand subscriptions.
- Ghost preview styling during drag-drop — pick per existing design tokens.
- Inline text input styling — use obsidian-* tokens and IBM Plex Mono.
- Rotation handle visual details (color, size, line thickness) — use accent tokens.
- EDIT-09 exact technique (`FabricImage.fromURL()` async vs onload callback).

### Deferred Ideas (OUT OF SCOPE)

- Aligning products to walls / wall-snap during drag.
- Keyboard-driven rotation (R key for 90°).
- Multi-select + group rotate/move.
- Auto-save version history / restore previous versions.
- Fixing the AABB-ignores-rotation hit-test bug (may get touched naturally when adding rotation handles — flag for planner).
- Extracting shared `pxToFeet` to `toolUtils.ts`.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EDIT-06 | Edit wall dimensions by double-clicking the dimension label | HTML overlay input pattern (§Architecture Patterns §4); `formatFeet()` + number-parse roundtrip in `src/lib/geometry.ts`; wall-endpoint move semantics in D-09 |
| EDIT-07 | Drag products from library onto canvas | HTML5 DnD API with dataTransfer (§Architecture Patterns §2); `getBoundingClientRect()` coord translation; existing `pxToFeet` + `snapPoint` from `src/lib/geometry.ts`; `placeProduct` action already exists in cadStore |
| EDIT-08 | Rotate placed products via drag handles in 2D | Fabric v6 custom `fabric.Control` with render + actionHandler (§Architecture Patterns §3); `rotateProduct` action exists; 15° snap via `Math.round(angle/15)*15`; Shift-modifier mirrors wallTool orthogonal pattern |
| EDIT-09 | Product images render visibly on 2D canvas (async bug) | Fabric v6 `FabricImage.fromURL()` Promise-based API (§Architecture Patterns §1); two-phase render (placeholder → image resolve → `fc.renderAll()`); module-level image cache keyed by `product.id` to avoid reloading on every redraw |
| SAVE-02 | Auto-save with debounce so work is never lost | `useCADStore.subscribe()` + 2s debounce (§Architecture Patterns §5); existing `saveProject()` in `src/lib/serialization.ts`; active project ID lifted from `ProjectManager.tsx` to App.tsx or a new Zustand store |

## Standard Stack

### Core (already installed — DO NOT add new deps)
| Library | Version (installed) | Purpose | Why Standard |
|---------|---------------------|---------|--------------|
| fabric | ^6.9.1 | 2D canvas, image loading, custom controls | The project's chosen 2D engine. v6 is Promise-based and written in TypeScript. |
| zustand | ^5.0.12 | State + subscribe for auto-save trigger | v5 has first-class `subscribe` and `subscribeWithSelector` middleware. |
| immer | ^11.1.4 | Immutable store updates | Already used in every cadStore action. |
| idb-keyval | ^6.2.2 | Persist project snapshots | Already the persistence layer via `saveProject()`. |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react | ^18.3.1 | UI, hooks, effects | For the DOM overlay input + auto-save effect in App.tsx. |
| tailwindcss | ^4.2.2 | Styling tokens | For inline input, save indicator, ghost drag preview, rotation handle if done in CSS. |

### Do NOT Add
| Library | Why Not |
|---------|---------|
| lodash / lodash.debounce | 24KB+ for a 10-line debounce utility. Hand-roll a setTimeout-based debounce or a 5-line generic. |
| zustand-debounce | External library for auto-save is overkill when `subscribe` + `setTimeout` is ~15 lines. |
| react-dnd / dnd-kit | The decision is explicit HTML5 drag-and-drop. These libraries add complexity for a single drag-source / single drop-target use case. |
| Interact.js / custom rotation libs | Fabric v6's `fabric.Control` handles rotation handle rendering + hit-testing natively. |

**No new installs required.** All five requirements are implementable with the currently-installed dependency set.

## Architecture Patterns

### Recommended File Additions
```
src/
  canvas/
    tools/
      toolUtils.ts        # NEW (optional): shared pxToFeet helper — only if naturally refactoring
    dragDrop.ts           # NEW: drop event handling on canvas wrapper (EDIT-07)
    productImageCache.ts  # NEW: module-level Map<productId, HTMLImageElement> (EDIT-09)
    rotationHandle.ts     # NEW: custom fabric.Control factory + hit test (EDIT-08)
    dimensionEditor.ts    # NEW: overlay input logic + wall length commit (EDIT-06)
  stores/
    projectStore.ts       # NEW (recommended): active project ID + name + save status (SAVE-02)
  hooks/
    useAutoSave.ts        # NEW: subscribes to cadStore, debounces, calls saveProject (SAVE-02)
  components/
    SaveIndicator.tsx     # NEW: "Saving..." / "Saved" fade (SAVE-02)
    DraggableProductCard.tsx  # NEW or modify ProductLibrary: draggable=true + dragstart handler (EDIT-07)
```

All new files live alongside existing siblings and follow the existing camelCase-for-utilities, PascalCase-for-components convention.

### Pattern 1: Async Image Loading via FabricImage.fromURL (EDIT-09)

**What:** Fabric v6 `FabricImage.fromURL()` returns a `Promise<FabricImage>`. Replace the broken synchronous pattern in `fabricSync.ts`.

**When to use:** Whenever rendering a product that has an `imageUrl`.

**Key insight:** `renderProducts` is called from a synchronous `redraw()`. Two viable approaches:

1. **Two-phase render (RECOMMENDED):** Render the group with just the border + labels immediately. Kick off `FabricImage.fromURL()`. When it resolves, either (a) insert the image into the existing group and call `fc.renderAll()`, OR (b) cache the decoded `HTMLImageElement` keyed by `product.id` so the NEXT redraw renders the image synchronously.

2. **Image cache (SIMPLEST, recommended):** Maintain a module-level `Map<productId, HTMLImageElement>` in `src/canvas/productImageCache.ts`. On first render miss, create an `<img>`, attach `onload` that writes to the cache and calls `fc.renderAll()`. Subsequent redraws find the cached, decoded image and render synchronously via `new fabric.FabricImage(htmlImgEl, {...})`.

**Why the cache pattern wins here:** The codebase already does a full redraw on every store change. That redraw will fire again on the `renderAll()` triggered by the image load — and at that point the cache is populated, so the image renders synchronously. Minimal change to `renderProducts` signature; no need to make the function async.

**Example:**
```typescript
// src/canvas/productImageCache.ts
const cache = new Map<string, HTMLImageElement>();
const loading = new Set<string>();

export function getCachedImage(
  productId: string,
  url: string,
  onReady: () => void
): HTMLImageElement | null {
  const hit = cache.get(productId);
  if (hit) return hit;
  if (loading.has(productId)) return null;

  loading.add(productId);
  const img = new Image();
  img.onload = () => {
    cache.set(productId, img);
    loading.delete(productId);
    onReady();
  };
  img.onerror = () => { loading.delete(productId); };
  img.src = url;
  return null;
}

export function invalidateProduct(productId: string) {
  cache.delete(productId);
}
```

Then in `renderProducts`, pass `() => fc.renderAll()` as `onReady`. On cache miss, skip adding the image child; on hit, add `new fabric.FabricImage(htmlImgEl, {...})`.

Source: [Fabric.js v6 upgrade guide](https://fabricjs.com/docs/upgrading/upgrading-to-fabric-60/) — confirms `FabricImage` class rename and Promise-based API.

### Pattern 2: HTML5 Drag-and-Drop onto Canvas Wrapper (EDIT-07)

**What:** DOM-level drag from sidebar product card to the canvas wrapper `<div>`. NOT a Fabric tool — Fabric's `drop:` events are not used here because drag initiates in React-land from the sidebar.

**When to use:** The primary product-placement flow.

**Source card side (sidebar product list item):**
```tsx
<div
  draggable
  onDragStart={(e) => {
    e.dataTransfer.setData("application/x-room-cad-product", product.id);
    e.dataTransfer.effectAllowed = "copy";
    // Optional custom drag image:
    // e.dataTransfer.setDragImage(thumbEl, 20, 20);
  }}
>
  {/* card content */}
</div>
```

**Drop target side (FabricCanvas wrapper `<div>`):**
```tsx
// In FabricCanvas.tsx, on the wrapperRef div
const onDragOver = (e: DragEvent) => {
  if (e.dataTransfer.types.includes("application/x-room-cad-product")) {
    e.preventDefault(); // REQUIRED to allow drop
    e.dataTransfer.dropEffect = "copy";
  }
};
const onDrop = (e: DragEvent) => {
  e.preventDefault();
  const productId = e.dataTransfer.getData("application/x-room-cad-product");
  if (!productId) return;
  const rect = wrapperRef.current!.getBoundingClientRect();
  const px = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  // Use the current scale/origin computed for this redraw
  const feet = { x: (px.x - origin.x) / scale, y: (px.y - origin.y) / scale };
  const gridSnap = useUIStore.getState().gridSnap;
  const snapped = gridSnap > 0 ? snapPoint(feet, gridSnap) : feet;
  const newId = useCADStore.getState().placeProduct(productId, snapped);
  // D-03: auto-select
  useUIStore.getState().select([newId]);
};
```

**Gotcha:** `placeProduct` currently does NOT return the new ID. It must be modified to return the new `id` string to support D-03 auto-select. This is a small, safe addition to the action.

**Ghost preview (D-01):** Two options:
- (a) Use the browser's native drag image (set via `e.dataTransfer.setDragImage()` with a cloned thumbnail).
- (b) Track dragover position in React state and render an absolutely-positioned div. Option (a) is simpler and sufficient.

Sources: [Smashing Magazine HTML5 DnD + React](https://www.smashingmagazine.com/2020/02/html-drag-drop-api-react/), [React Flow drag-drop example](https://reactflow.dev/examples/interaction/drag-and-drop).

### Pattern 3: Custom Rotation Handle via fabric.Control (EDIT-08)

**What:** Fabric v6 `fabric.Control` class supports custom `render` and `actionHandler` functions. This is the native mechanism for per-object interactive handles.

**Catch:** The current architecture sets `selectable: false, evented: false` on all product groups (see `fabricSync.ts` line 176-177) because selection is handled via `selectTool.ts`'s custom store-based hit-testing. Fabric's built-in controls only render on objects with `selectable: true` and that are the canvas's `activeObject`.

**Two implementation approaches:**

1. **Embrace Fabric selection for products only:** When a product is selected via `selectTool`, set `selectable: true, evented: true` on that one group and call `fc.setActiveObject(group)`. Configure `lockScalingX/Y/Flip/SkewingX/Y = true` so only rotation works. Provide a single custom `fabric.Control` at `y: -0.5` (above) with render function drawing a line + circle. Fabric handles the drag math; we intercept via `actionHandler` to snap to 15° and write to `cadStore.rotateProduct()`. Restore `selectable: false` on deselect.

2. **Hand-rolled handle (fits existing architecture better):** Since all interaction currently goes through `selectTool`'s store-based hit-testing, extend `selectTool` to (a) render a handle when `selectedIds.length === 1 && type === "product"` — done by adding a Fabric `Circle + Line` group during `renderProducts` when selected, and (b) hit-test the handle position in `mouse:down` before falling through to body drag. The handle drag updates rotation via `rotateProduct()`.

**Recommendation:** Approach 2. Reasons: (a) preserves the existing custom hit-testing architecture that `selectTool` already implements, (b) avoids the invariant flip of `selectable` / `evented` which would require special-case logic everywhere, (c) keeps rotation handle rendering in the same `fabricSync.ts` render layer where products are drawn.

**15° snap + Shift-free-rotate:**
```typescript
const SNAP_DEG = 15;
const raw = (Math.atan2(dy, dx) * 180) / Math.PI + 90; // +90 because handle is above
const snapped = shiftHeld ? raw : Math.round(raw / SNAP_DEG) * SNAP_DEG;
const normalized = ((snapped % 360) + 360) % 360;
useCADStore.getState().rotateProduct(id, normalized);
```

**Handle visual:** small circle (r=5px) with 1px line connecting to top edge of product. Use `accent` (#7c5bf0) stroke, `obsidian-base` fill. Render offset perpendicular to the product's rotation: `handleOffset = 0.8ft above product top edge in product-local space`, then rotate by `pp.rotation` to get world coords.

**History snapshot note:** Because `rotateProduct` calls `pushHistory` on every call, dragging the handle at 60fps will fill the 50-entry history stack in under a second. Throttle history: only snapshot on `mouseDown` (capture initial rotation), then on `mouseUp` (commit final). During drag, use a new store action `rotateProductNoHistory(id, angle)` that skips `pushHistory`. This is analogous to the existing `moveProduct` issue and is documented as tech debt in CONCERNS.md, but IS worth addressing here because rotation is the first new continuous-drag interaction being added.

Sources: [Fabric.js custom-controls demo](https://fabricjs.com/demos/custom-controls/), [HackerNoon: Customize Rotate Icons in Fabric.js](https://hackernoon.com/how-to-customize-rotate-icons-in-fabricjs-a-comprehensive-guide-for-programmers), [Fabric v6 Custom Controls Discussion #9708](https://github.com/fabricjs/fabric.js/discussions/9708).

### Pattern 4: HTML Overlay Input for Inline Dimension Editing (EDIT-06)

**What:** Absolutely-positioned HTML `<input>` rendered as a sibling of the `<canvas>`, positioned using the same `scale`/`origin` transform that placed the label on the canvas.

**When to use:** On double-click of a wall dimension label.

**Double-click detection:** Fabric v6 supports `mouse:dblclick` on the canvas. Use that event to hit-test against dimension label positions (computed in `dimensions.ts`'s `drawWallDimension`) in the same store-driven hit-testing style as `selectTool`.

**Input positioning:**
```typescript
// In FabricCanvas.tsx, compute overlay coords using same scale/origin
const midX = origin.x + ((wall.start.x + wall.end.x) / 2) * scale;
const midY = origin.y + ((wall.start.y + wall.end.y) / 2) * scale;
// perpendicular offset same as drawWallDimension (offsetDist = 14)
const labelX = midX + Math.cos(perpAngle) * 14;
const labelY = midY + Math.sin(perpAngle) * 14;

// Render as:
<input
  style={{
    position: "absolute",
    left: labelX - 30, top: labelY - 10,
    width: 60, height: 20,
  }}
  className="font-mono text-[11px] bg-obsidian-high text-accent-light border border-accent rounded-none px-1"
  autoFocus
  value={pending}
  onChange={(e) => setPending(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") cancel();
  }}
  onBlur={commit}
/>
```

**Wall resize math (D-09):** Keep `wall.start` fixed. Unit direction vector from start to end. New `wall.end = start + unitVec * newLength`. For shared-corner propagation: scan all other walls for those whose `start` OR `end` matches the old `wall.end` (within epsilon). For each match, update THAT endpoint to the new `wall.end`. Parse input: `parseFloat(input.trim())` → validate > 0 → if invalid, cancel silently.

**Epsilon for corner matching:** Use 0.01 feet (~1/8 inch). Smaller than grid snap, larger than floating-point noise.

**Edge case:** If two walls share one endpoint AND both share the OTHER endpoint (degenerate), skip propagation. Log a warning.

### Pattern 5: Auto-Save via Zustand subscribe + Debounce (SAVE-02)

**What:** Subscribe to `useCADStore` changes in a top-level React effect. Debounce by 2 seconds. On fire, call `saveProject(activeId, activeName, snapshot)`.

**Active project state:** Currently active project ID and name live in `ProjectManager.tsx` component state, which means App.tsx can't read them. Lift this to a new Zustand `projectStore` (recommended) OR to App.tsx state that's passed as props into ProjectManager. Recommend a store because multiple components need it: SaveIndicator, ProjectManager, auto-save hook.

```typescript
// src/stores/projectStore.ts
interface ProjectState {
  activeId: string | null;
  activeName: string;
  saveStatus: "idle" | "saving" | "saved";
  setActive: (id: string, name: string) => void;
  setSaveStatus: (s: "idle" | "saving" | "saved") => void;
}
```

**Debounced subscribe:**
```typescript
// src/hooks/useAutoSave.ts
import { useEffect } from "react";
import { useCADStore } from "@/stores/cadStore";
import { useProjectStore } from "@/stores/projectStore";
import { saveProject } from "@/lib/serialization";
import { uid } from "@/lib/geometry";

const DEBOUNCE_MS = 2000;

export function useAutoSave() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let fadeTimer: ReturnType<typeof setTimeout> | null = null;

    const unsub = useCADStore.subscribe((state, prevState) => {
      // Ignore if only past/future changed (undo/redo is its own trigger, but
      // snapshot contents differ so room/walls/placedProducts also change — ok).
      if (
        state.room === prevState.room &&
        state.walls === prevState.walls &&
        state.placedProducts === prevState.placedProducts
      ) return;

      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        const proj = useProjectStore.getState();
        let id = proj.activeId;
        let name = proj.activeName;
        if (!id) {
          // D-13: auto-create
          id = `proj_${uid()}`;
          name = "Untitled Room";
          useProjectStore.getState().setActive(id, name);
        }
        useProjectStore.getState().setSaveStatus("saving");
        const { room, walls, placedProducts } = useCADStore.getState();
        await saveProject(id, name, { room, walls, placedProducts });
        useProjectStore.getState().setSaveStatus("saved");
        if (fadeTimer) clearTimeout(fadeTimer);
        fadeTimer = setTimeout(() => {
          useProjectStore.getState().setSaveStatus("idle");
        }, 2000);
      }, DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (timer) clearTimeout(timer);
      if (fadeTimer) clearTimeout(fadeTimer);
    };
  }, []);
}
```

Call `useAutoSave()` once in `App.tsx`.

**SaveIndicator component:** Reads `saveStatus` from `projectStore`, renders a tiny label in the StatusBar area: idle = hidden, saving = "SAVING…" text-text-dim, saved = "SAVED" text-success. Use CSS transition for fade (opacity 200ms).

**Reference:** [Zustand subscribe debounce discussion #1179](https://github.com/pmndrs/zustand/discussions/1179).

### Anti-Patterns to Avoid

- **DO NOT make `renderProducts` async.** It's called inside a synchronous `redraw()` chain — making it async cascades into every caller and breaks the tool activate/deactivate ordering. Use the image cache instead.
- **DO NOT trigger auto-save on `past`/`future` array mutations.** They change on every action. Compare `room`/`walls`/`placedProducts` directly (shown above).
- **DO NOT use Fabric's built-in drag-and-drop events for EDIT-07.** Drag source is a React component outside the canvas; DOM-level `dragover`/`drop` on the wrapper is correct.
- **DO NOT store the overlay `<input>` element in Fabric.** The input is a React-rendered HTML element absolutely-positioned over the canvas — NOT a Fabric object.
- **DO NOT snapshot history on every rotation drag frame.** Pattern: capture snapshot on mousedown, skip on move, the move action mutates in place without pushHistory, then on mouseup a finalizing action can push (or just rely on the mousedown snapshot as the undo boundary).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Async image loading | Custom img preloader + event system | `FabricImage.fromURL()` or cached HTMLImageElement + `onload` | Fabric v6 handles dispose/CORS/decode edge cases |
| Canvas-relative mouse coordinates | Manual offset calc walking the DOM | `wrapperRef.current.getBoundingClientRect()` | Handles scroll, zoom, nested offsets |
| Rotation handle math | Custom event listeners + angle tracking | `fabric.Control.actionHandler` (option 1) or reuse `selectTool` patterns (option 2) | Fabric's Control or the existing patterns are well-tested |
| Debounce | Your own complex util | Plain `setTimeout` + `clearTimeout` in a closure (~10 lines) | No lodash needed; avoids bundle bloat |
| Drag-drop data payload serialization | JSON in dataTransfer | `dataTransfer.setData(customMime, productId)` | Browser-native, works across frames |
| Wall length formatting | Custom inch parser | Keep existing `formatFeet()`, parse input as `parseFloat(str)` per D-10 | User decided: plain feet only, no fractional inch input |

**Key insight:** Every requirement in this phase has a well-established browser/Fabric API. The project already installs every library needed.

## Common Pitfalls

### Pitfall 1: FabricImage.fromURL silent failure with base64 data URLs
**What goes wrong:** Very large base64 data URLs (Jessica uploads a 4MB phone photo) can trigger browser-internal decoding slowness or memory pressure. Image may load but render at 0x0 if decode fails silently.
**Why it happens:** Browsers decode images lazily; `img.onload` fires but `naturalWidth` can still be 0 briefly in some Chrome versions, or the decode can fail silently for corrupted/oversize data URLs.
**How to avoid:** After `onload`, verify `img.naturalWidth > 0 && img.naturalHeight > 0` before adding to cache. On failure, mark the product as "image-failed" and render with just the border.
**Warning signs:** Product groups render with empty space where image should be.

### Pitfall 2: Drop event fires without dragover preventDefault
**What goes wrong:** `drop` event never fires, cursor shows "not allowed" icon during drag.
**Why it happens:** HTML5 DnD requires `dragover` handler to call `e.preventDefault()` to mark the element as a valid drop target.
**How to avoid:** Always attach BOTH `dragover` (with `e.preventDefault()`) AND `drop` handlers. Verify via DevTools event listeners.
**Warning signs:** Drag visual shows "not allowed"; drop does nothing.

### Pitfall 3: Auto-save triggered by undo/redo writes old snapshot back over itself
**What goes wrong:** User undoes 5 steps → subscribe fires 5 times → debounced save writes the undone state → on refresh, redo history is lost (which is expected) BUT if user then edits, their new edit races with the pending debounced save of the undone state.
**Why it happens:** Undo mutates `room`/`walls`/`placedProducts` same as a forward edit.
**How to avoid:** This is actually acceptable — saving the undone state IS the desired behavior. The only risk is if the debounce fires DURING a rapid undo-redo sequence. The 2-second debounce naturally absorbs this; each new action resets the timer.
**Warning signs:** "Saved" label flickers during rapid undo.

### Pitfall 4: Rotation handle hit-test ignored product rotation
**What goes wrong:** Handle is drawn at the rotated position, but hit-test uses unrotated coords → clicking the handle misses.
**Why it happens:** The handle world position must be computed by rotating the local offset `(0, -handleDist)` by `pp.rotation` around product center.
**How to avoid:** Use a single source of truth — a `getHandleWorldPos(pp, product)` function used by BOTH the render and hit-test paths.
**Warning signs:** Handle visible but unclickable after rotation.

### Pitfall 5: Inline input loses focus on canvas redraw
**What goes wrong:** User double-clicks label, input appears, user types, store mutation somewhere triggers `redraw()` which triggers re-mount of the wrapper → input unmounts and loses focus/value.
**Why it happens:** React re-renders if the input is conditionally mounted inside FabricCanvas and a sibling triggers re-render.
**How to avoid:** Keep the input ALWAYS mounted (use `visibility: hidden` or conditionally via a key that doesn't change on canvas redraw). Store input state in a ref, not in a state that cascades.
**Warning signs:** Typing single characters at a time; focus drops.

### Pitfall 6: Tool lifecycle interferes with drag-drop drop target
**What goes wrong:** The `deactivateAllTools` → `activateCurrentTool` cycle runs on every `redraw()` (FabricCanvas.tsx line 81-82). If `redraw()` fires during a drag (e.g., a Zustand update from elsewhere), Fabric event listeners get reattached but the DOM-level `dragover` on the wrapper is unaffected. Verify that the `drop` handler is attached to the wrapper `<div>`, not to Fabric's canvas internals.
**How to avoid:** Attach `dragover`/`drop` listeners ONCE in the mount effect (the one with the empty deps array), not inside `redraw()`. They don't depend on scale/origin.

### Pitfall 7: Overlay input coordinates drift on canvas resize
**What goes wrong:** Jessica resizes the window → canvas recomputes scale/origin → input still positioned at old coords.
**How to avoid:** Input position must recompute from current `scale`/`origin` on every render pass. Store `(wallId, mode)` in state, derive x/y at render time.

## Code Examples

### EDIT-09 — Fabric v6 image loading (recommended cache pattern)
```typescript
// In renderProducts() inside fabricSync.ts
const cachedImg = getCachedImage(product.id, product.imageUrl, () => fc.renderAll());
if (cachedImg) {
  const fImg = new fabric.FabricImage(cachedImg, {
    scaleX: pw / cachedImg.naturalWidth,
    scaleY: pd / cachedImg.naturalHeight,
    originX: "center",
    originY: "center",
  });
  children.splice(1, 0, fImg); // insert after border
}
```
Source: [Fabric.js v6 upgrade guide](https://fabricjs.com/docs/upgrading/upgrading-to-fabric-60/)

### EDIT-07 — HTML5 drop handler with snap
```typescript
// In FabricCanvas.tsx mount effect
useEffect(() => {
  const wrapper = wrapperRef.current;
  if (!wrapper) return;
  const onDragOver = (e: DragEvent) => {
    if (!e.dataTransfer?.types.includes("application/x-room-cad-product")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const productId = e.dataTransfer?.getData("application/x-room-cad-product");
    if (!productId) return;
    // Recompute scale/origin from current room + canvas dims
    const rect = wrapper.getBoundingClientRect();
    const cW = rect.width, cH = rect.height;
    const { room } = useCADStore.getState();
    const scale = getScale(room.width, room.length, cW, cH);
    const origin = getOrigin(room.width, room.length, scale, cW, cH);
    const feet = {
      x: (e.clientX - rect.left - origin.x) / scale,
      y: (e.clientY - rect.top - origin.y) / scale,
    };
    const gridSnap = useUIStore.getState().gridSnap;
    const snapped = gridSnap > 0 ? snapPoint(feet, gridSnap) : feet;
    const newId = useCADStore.getState().placeProduct(productId, snapped);
    useUIStore.getState().select([newId]);
  };
  wrapper.addEventListener("dragover", onDragOver);
  wrapper.addEventListener("drop", onDrop);
  return () => {
    wrapper.removeEventListener("dragover", onDragOver);
    wrapper.removeEventListener("drop", onDrop);
  };
}, []);
```
Source: [Smashing Magazine: HTML Drag and Drop API in React](https://www.smashingmagazine.com/2020/02/html-drag-drop-api-react/)

### EDIT-08 — 15° snap with Shift override
```typescript
const SNAP_DEG = 15;
function computeRotation(
  productCenter: Point,
  handlePos: Point, // in feet
  shiftHeld: boolean
): number {
  const dx = handlePos.x - productCenter.x;
  const dy = handlePos.y - productCenter.y;
  // +90 because the handle lives above the product (angle 0 = pointing up)
  const raw = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  const angle = shiftHeld ? raw : Math.round(raw / SNAP_DEG) * SNAP_DEG;
  return ((angle % 360) + 360) % 360;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `fabric.Image.fromURL(url, callback)` (v5) | `FabricImage.fromURL(url, options).then(...)` (v6, Promise) | Fabric v6 release (~2024) | All async Fabric APIs are Promise-based |
| `fabric.Image`, `fabric.Text`, `fabric.Object` | `FabricImage`, `FabricText`, `FabricObject` (reserved word rename) | Fabric v6 | Imports change; fabric.Canvas unchanged |
| Callback pattern `.then()` handlers everywhere | `await` + async/await | Fabric v6 | Cleaner error handling via try/catch |
| Zustand v4 `subscribe` with equality fn | Zustand v5 `subscribe(listener)` or `subscribeWithSelector` middleware | Zustand v5 | More consistent with `useSyncExternalStore` |

**Deprecated/outdated:**
- `new fabric.Image(imgEl, opts)` synchronous path: works but `new fabric.FabricImage(imgEl, opts)` is the v6 canonical name. Both are supported in v6.9.x; use `FabricImage` for consistency.
- `fabricjs-customise-controls-extension` (no longer maintained): use native `fabric.Control` in v6.

## Open Questions

1. **Should rotation handle use Fabric's built-in control system or a hand-rolled handle in selectTool?**
   - What we know: Both work. Hand-rolled fits existing hit-test architecture; Fabric controls are the idiomatic v6 pattern.
   - What's unclear: Whether forcing `selectable: true` only on the single selected product group breaks any invariants in `fabricSync.ts` (lines 176-177 set everything `evented: false`).
   - Recommendation: Hand-rolled in selectTool (Approach 2). Lower risk, consistent with existing tool patterns. Revisit in a later tech-debt phase if multi-object controls become desirable.

2. **Does wall-resize corner propagation need to handle T-intersections (3+ walls sharing a vertex)?**
   - What we know: Current wallTool doesn't explicitly support T-intersections — walls can overlap freely.
   - What's unclear: How common this is in Jessica's real floor plans.
   - Recommendation: Propagate to ALL walls sharing the endpoint (epsilon 0.01ft). If three walls share a corner, all three move. Simpler to specify and matches user mental model.

3. **Should auto-save silently handle IndexedDB quota-exceeded errors?**
   - What we know: No current error handling in `saveProject()`.
   - What's unclear: How Jessica should be notified if storage fills up.
   - Recommendation: Wrap `saveProject` in try/catch; on error, set `saveStatus: "error"` with a red indicator. Out of strict scope but a 5-line addition.

## Environment Availability

Phase 1 has no external runtime dependencies beyond what's already in `package.json` and the browser. Skipping the availability table — all browsers Jessica would use support:
- HTML5 drag-and-drop API (universal)
- `getBoundingClientRect()` (universal)
- IndexedDB via `idb-keyval` (already working per SAVE-01)
- `crypto.randomUUID()` (universal modern browsers — only relevant if we also fix `uid()`, which is out of scope)

**No missing dependencies.**

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (to install — none currently present) |
| Config file | none — see Wave 0 |
| Quick run command | `npx vitest run --reporter=dot` |
| Full suite command | `npx vitest run` |

**Rationale:** Vitest is the idiomatic test runner for Vite projects. Shares the Vite config, supports TypeScript out of the box, no separate Babel/ts-jest setup. Alternative is adding a Playwright e2e layer later, but for Phase 1 the testable surfaces are pure functions + store mutations + small DOM-integrated utilities — all covered by Vitest + jsdom.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EDIT-06 | Double-click dim label opens overlay input at correct coords | unit (pure fn) | `npx vitest run tests/dimensionEditor.test.ts -t "position"` | ❌ Wave 0 |
| EDIT-06 | Wall length commit: new end = start + unitVec * newLen | unit | `npx vitest run tests/geometry.test.ts -t "resize wall"` | ❌ Wave 0 |
| EDIT-06 | Shared-corner propagation updates connected walls | unit (store) | `npx vitest run tests/cadStore.test.ts -t "wall resize corner"` | ❌ Wave 0 |
| EDIT-06 | Invalid input ("abc", "-5", "0") cancels silently | unit | `npx vitest run tests/dimensionEditor.test.ts -t "invalid input"` | ❌ Wave 0 |
| EDIT-07 | Drop handler converts clientX/Y → feet with current scale/origin | unit | `npx vitest run tests/dragDrop.test.ts -t "coord translation"` | ❌ Wave 0 |
| EDIT-07 | Drop calls placeProduct with snapped position | integration | `npx vitest run tests/dragDrop.test.ts -t "snap + place"` | ❌ Wave 0 |
| EDIT-07 | Post-drop: newly placed product is in selectedIds | integration (store) | `npx vitest run tests/dragDrop.test.ts -t "auto-select"` | ❌ Wave 0 |
| EDIT-07 | Dragover preventDefault required for drop to fire | manual-only | visual test | — (browser behavior) |
| EDIT-08 | 15° snap: angles round to nearest 15° | unit | `npx vitest run tests/rotationHandle.test.ts -t "snap 15"` | ❌ Wave 0 |
| EDIT-08 | Shift held: returns raw angle unchanged | unit | `npx vitest run tests/rotationHandle.test.ts -t "shift disables snap"` | ❌ Wave 0 |
| EDIT-08 | Handle world position computed correctly for rotated product | unit | `npx vitest run tests/rotationHandle.test.ts -t "world position"` | ❌ Wave 0 |
| EDIT-08 | rotateProduct store action mutates rotation field | unit (store) | `npx vitest run tests/cadStore.test.ts -t "rotate"` | ❌ Wave 0 |
| EDIT-09 | productImageCache returns null on miss, img on hit | unit | `npx vitest run tests/productImageCache.test.ts -t "cache hit/miss"` | ❌ Wave 0 |
| EDIT-09 | onReady fires after img onload, cache populated | unit | `npx vitest run tests/productImageCache.test.ts -t "async load"` | ❌ Wave 0 |
| EDIT-09 | Product with imageUrl renders FabricImage child in group | manual-only | visual test in 2D view | — (Fabric rendering) |
| SAVE-02 | Debounce: multiple rapid mutations → single save after 2s | unit (fake timers) | `npx vitest run tests/useAutoSave.test.ts -t "debounce"` | ❌ Wave 0 |
| SAVE-02 | No active project → auto-creates "Untitled Room" on first save | unit | `npx vitest run tests/useAutoSave.test.ts -t "auto-create"` | ❌ Wave 0 |
| SAVE-02 | saveStatus transitions: idle → saving → saved → idle | unit | `npx vitest run tests/useAutoSave.test.ts -t "status transitions"` | ❌ Wave 0 |
| SAVE-02 | SaveIndicator renders correct text for each status | unit (component) | `npx vitest run tests/SaveIndicator.test.tsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=dot` (full quick suite — ~20 tests, should run in <2s)
- **Per wave merge:** `npx vitest run` with verbose reporter
- **Phase gate:** Full suite green + manual browser verification of EDIT-07 drop visual, EDIT-08 rotation visual, EDIT-09 image rendering before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Install: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom happy-dom`
- [ ] `vitest.config.ts` — extend `vite.config.ts`, add `test.environment: "jsdom"`, `test.globals: true`
- [ ] `tests/setup.ts` — `import "@testing-library/jest-dom"`
- [ ] Wire `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`
- [ ] `tests/geometry.test.ts` — cover existing `snapTo`, `distance`, `angle`, `wallLength`, `closestPointOnWall`, `formatFeet`, `wallCorners` (seeds future phases' coverage too)
- [ ] `tests/cadStore.test.ts` — cover `placeProduct`, `moveProduct`, `rotateProduct`, `updateWall`, `removeSelected`, `undo`/`redo`, new `rotateProductNoHistory` (if added)
- [ ] `tests/dragDrop.test.ts` — coord translation + placeProduct+select integration
- [ ] `tests/rotationHandle.test.ts` — snap math + world-position math
- [ ] `tests/dimensionEditor.test.ts` — overlay position + input validation
- [ ] `tests/productImageCache.test.ts` — cache contract with mocked Image
- [ ] `tests/useAutoSave.test.ts` — fake timers, mocked idb-keyval
- [ ] `tests/SaveIndicator.test.tsx` — component render for each status

## Sources

### Primary (HIGH confidence)
- [Fabric.js v6 Upgrade Guide](https://fabricjs.com/docs/upgrading/upgrading-to-fabric-60/) — confirmed `FabricImage.fromURL()` Promise API + class renames (`FabricImage`, `FabricText`, `FabricObject`)
- [FabricImage Docs](https://fabricjs.com/api/classes/fabricimage/) — `fromURL(url, options, imageOptions)` signature
- [Fabric.js custom-controls demo](https://fabricjs.com/demos/custom-controls/) — official pattern for custom controls with render + actionHandler
- `src/canvas/fabricSync.ts` lines 155-168 — confirmed EDIT-09 bug location
- `src/stores/cadStore.ts` — verified `rotateProduct`, `placeProduct`, `moveProduct` action signatures
- `src/lib/serialization.ts` — verified `saveProject(id, name, snapshot)` signature
- `src/canvas/tools/selectTool.ts` — verified existing hit-test + drag architecture
- `package.json` — verified installed versions: fabric ^6.9.1, zustand ^5.0.12, immer ^11.1.4, react ^18.3.1

### Secondary (MEDIUM confidence, verified against official sources)
- [Smashing Magazine: HTML Drag and Drop API in React](https://www.smashingmagazine.com/2020/02/html-drag-drop-api-react/) — React DnD integration patterns (verified against MDN behavior)
- [Zustand subscribe debouncing discussion #1179](https://github.com/pmndrs/zustand/discussions/1179) — official pattern for debounced store subscription
- [Fabric.js Custom Controls Discussion #9708](https://github.com/fabricjs/fabric.js/discussions/9708) — community-verified v6 custom control patterns
- [Fabric v6 Starting Guide (Medium)](https://medium.com/@samruddhi.thakre0111/starting-with-fabric-js-v6-whats-new-and-how-to-use-it-without-getting-confused-2f14a370ba7d) — confirms Promise-based async patterns
- [React Flow drag-drop example](https://reactflow.dev/examples/interaction/drag-and-drop) — production pattern for `application/x-*` MIME DnD payloads

### Tertiary (LOW confidence — flagged for validation in-browser)
- Exact keydown ordering for Shift-state during Fabric mouse events (snap toggle at drag start vs drag move) — validate empirically during EDIT-08 implementation.
- Whether `img.naturalWidth === 0` false-positive can occur on Safari/iOS for base64 URLs — noted as pitfall, handled defensively.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in active use; versions confirmed from package.json.
- Architecture patterns: HIGH — all five patterns directly supported by existing in-tree code or documented Fabric v6 / browser APIs.
- Pitfalls: MEDIUM-HIGH — pitfalls 1-5 are well-documented browser/Fabric quirks; pitfalls 6-7 are derived from reading the existing code.
- Validation architecture: HIGH — Vitest is the canonical Vite test runner; no test framework currently installed so Wave 0 install is required.

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (30 days — stable stack, no breaking changes expected)
