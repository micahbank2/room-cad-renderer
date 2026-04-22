---
phase: 33-design-system-ui-polish
plan: 06
type: execute
wave: 3
depends_on: [00, 01, 02, 03, 04, 05]
files_modified:
  - src/stores/uiStore.ts
  - src/canvas/tools/selectTool.ts
  - src/components/ui/FloatingSelectionToolbar.tsx
  - src/canvas/FabricCanvas.tsx
autonomous: true
requirements:
  - "GH #85"
must_haves:
  truths:
    - "Selecting a product or custom-element or wall in the 2D canvas surfaces a floating toolbar above the bbox"
    - "The floating toolbar contains Duplicate (lucide Copy) and Delete (lucide Trash2) buttons"
    - "The toolbar hides during active drag (via uiStore.isDragging bridge) and reappears on drag end"
    - "The toolbar clamps to the canvas viewport: flips below if no room above, clamps left/right to viewport edges"
    - "Clicking Duplicate creates a duplicate with single-undo using pre-researched cadStore API; clicking Delete removes with single-undo"
    - "3D viewport does NOT get a floating toolbar in Phase 33 (D-10 scope)"
  artifacts:
    - path: "src/stores/uiStore.ts"
      provides: "isDragging state + setDragging action (drag-state bridge per research Pitfall 2)"
      contains: "isDragging"
    - path: "src/canvas/tools/selectTool.ts"
      provides: "Calls setDragging(true/false) on drag start/end (mirrors D-07 setPendingProduct bridge pattern)"
      contains: "setDragging"
    - path: "src/components/ui/FloatingSelectionToolbar.tsx"
      provides: "Toolbar React component subscribing to selection + bbox + isDragging"
    - path: "src/canvas/FabricCanvas.tsx"
      provides: "Mount point for FloatingSelectionToolbar overlay"
  key_links:
    - from: "src/canvas/tools/selectTool.ts"
      to: "src/stores/uiStore.ts"
      via: "useUIStore.getState().setDragging(true/false) called at drag start + end"
      pattern: "setDragging"
    - from: "src/components/ui/FloatingSelectionToolbar.tsx"
      to: "src/stores/uiStore.ts"
      via: "useUIStore(s => s.isDragging) subscription"
      pattern: "isDragging"
    - from: "src/components/ui/FloatingSelectionToolbar.tsx"
      to: "fc.getActiveObject().getBoundingRect()"
      via: "Fabric screen-coord bbox"
      pattern: "getBoundingRect"
---

<objective>
Ship GH #85 — floating selection toolbar in the 2D canvas. Selecting a product/wall/custom-element surfaces a glass-panel mini-toolbar above the bbox with Duplicate and Delete buttons. Hides during drag.

Purpose: Pascal-parity affordance. Discoverable alternative to keyboard shortcuts (Delete key, Cmd+D).

**Locked decision (research open question #2 resolved):** `_dragActive` exposure uses a **uiStore bridge** (`isDragging` + `setDragging`) mirroring the D-07 pattern (`setPendingProduct`, `setSelectToolProductLibrary`). `selectTool.ts` imports uiStore and calls `setDragging(true)` at drag start, `setDragging(false)` at drag end.

**Locked decision (checker warning 5 fix — pre-researched cadStore API):**
- `duplicateProduct` does NOT exist in cadStore. Plan 06 implements duplication inline using `placeProduct(productId, position)` (verified at cadStore.ts:316-327, which pushes history and returns the new id) with a position offset. This preserves single-undo (one `pushHistory` call).
- `removeProduct` exists at cadStore.ts:816 (calls pushHistory).
- `removePlacedCustomElement` exists at cadStore.ts:712 (calls pushHistory).
- `removeWall` exists at cadStore.ts:294 (calls pushHistory).
- Placed-id prefixes verified: `pp_` = placed product (cadStore.ts:317), walls via `wall_`, custom-element placements use the `placedCustomElements` map (id shape verified by inspection of Plan 31 code).

Output: uiStore has `isDragging` + `setDragging`; selectTool calls both; new overlay component mounts inside FabricCanvas wrapper with verbatim action calls.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/33-design-system-ui-polish/33-UI-SPEC.md
@.planning/phases/33-design-system-ui-polish/33-RESEARCH.md
@src/stores/uiStore.ts
@src/canvas/tools/selectTool.ts
@src/canvas/FabricCanvas.tsx
@src/hooks/useReducedMotion.ts

<interfaces>
uiStore additions:
  isDragging: boolean  (default false)
  setDragging: (v: boolean) => void

selectTool.ts currently has module-local `_dragActive` flag (11 refs per research). This plan does NOT remove that flag — it adds bridge calls to uiStore.setDragging at the same sites as _dragActive toggles. Keeps the existing fast-path (Phase 25 PERF-01) intact.

Example bridge site (mirrors D-07 pattern):
```typescript
// In selectTool.ts, at drag start:
_dragActive = true;
try { useUIStore.getState().setDragging(true); } catch {}

// At drag end:
_dragActive = false;
try { useUIStore.getState().setDragging(false); } catch {}
```

**cadStore actions (verified by pre-research — checker warning 5 fix):**
- Product placement: `placeProduct(productId: string, position: Point): string` at cadStore.ts:316. Pushes history. Creates `{ id: "pp_" + uid(), productId, position, rotation: 0 }`. Returns new id.
- Product removal: `removeProduct(id: string): void` at cadStore.ts:816. Pushes history.
- Custom-element placement removal: `removePlacedCustomElement(id: string): void` at cadStore.ts:712. Pushes history.
- Wall removal: `removeWall(id: string): void` at cadStore.ts:294. Pushes history.
- There is NO `duplicateProduct` action. Duplication is implemented in the component via `placeProduct(original.productId, offsetPosition)`.

**NOTE on duplicate semantics:** `placeProduct` creates a fresh PlacedProduct with `rotation: 0`. This means "duplicate" in Phase 33 produces a placement at the same `productId` with a 0.5ft offset but rotation reset to 0. If rotation-preserving duplicate is needed, the implementer must escalate to D-40 (a new decision in CONTEXT.md) rather than invent a new cadStore action in Plan 06. Scope discipline: Phase 33 accepts rotation-reset duplicate as MVP.

Fabric bbox:
  fc.getActiveObject()?.getBoundingRect() returns { left, top, width, height } in SCREEN coords (accounts for viewport transform per Fabric v6 API).

Position math (UI-SPEC Interaction Contracts):
  toolbarTop = bbox.top - toolbarHeight - 8   // 8px gap per --spacing-sm
  if toolbarTop < 0: toolbarTop = bbox.top + bbox.height + 8  // flip below
  toolbarLeft = bbox.left + bbox.width/2 - toolbarWidth/2
  toolbarLeft = clamp(toolbarLeft, 0, wrapperWidth - toolbarWidth)

Styling (UI-SPEC):
  className: "glass-panel rounded-lg px-2 py-1 flex items-center gap-2"
  Duplicate button: Copy icon 14px, hover: bg-accent/20 text-accent-light
  Delete button: Trash2 icon 14px, hover: bg-error/20 text-error
  Enter animation: 150ms ease-out fade+translateY(4px) guarded by useReducedMotion

Visibility (D-13):
  selectedIds.length >= 1 AND !isDragging

Scope limit (D-10): 2D canvas only. No 3D toolbar in Phase 33.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add isDragging + setDragging to uiStore; wire selectTool bridge</name>
  <files>src/stores/uiStore.ts, src/canvas/tools/selectTool.ts</files>
  <read_first>
    - src/stores/uiStore.ts (full file — match existing shape of other actions)
    - src/canvas/tools/selectTool.ts (full file — find ALL 11 _dragActive reference sites)
    - CLAUDE.md "Tool cleanup pattern" and D-07 bridge exception documentation
    - .planning/phases/33-design-system-ui-polish/33-RESEARCH.md Pitfall 2
  </read_first>
  <action>
    **Part A — uiStore.ts:**

    Add to UIState interface:
    ```typescript
    isDragging: boolean;
    setDragging: (v: boolean) => void;
    ```

    Add to the store `set`-returning object:
    ```typescript
    isDragging: false,
    setDragging: (v) => set({ isDragging: v }),
    ```

    Place next to other interaction-state flags (near `selectedIds` / `activeTool`).

    **Part B — selectTool.ts bridge:**

    Import uiStore at top:
    ```typescript
    import { useUIStore } from "@/stores/uiStore";
    ```

    At EVERY site where `_dragActive = true` is set (drag start):
    ```typescript
    _dragActive = true;
    try { useUIStore.getState().setDragging(true); } catch {}
    ```

    At EVERY site where `_dragActive = false` is set (drag end):
    ```typescript
    _dragActive = false;
    try { useUIStore.getState().setDragging(false); } catch {}
    ```

    Use try/catch wrapper to avoid throwing in SSR/test edge cases (matches D-07 existing bridge style).

    **CRITICAL:** Do NOT remove `_dragActive` — it's still used by Phase 25 PERF-01 drag fast-path. Only ADD the bridge. Per research's 11 references, there should be ~2-3 toggle sites (mouse:down vs mouse:up, drag-start vs drag-end for resize and move).
  </action>
  <verify>
    <automated>grep -q "isDragging" src/stores/uiStore.ts &amp;&amp; grep -q "setDragging" src/stores/uiStore.ts &amp;&amp; grep -q "setDragging" src/canvas/tools/selectTool.ts &amp;&amp; grep -q "_dragActive" src/canvas/tools/selectTool.ts</automated>
  </verify>
  <acceptance_criteria>
    - `grep "isDragging" src/stores/uiStore.ts` matches
    - `grep "setDragging" src/stores/uiStore.ts` matches (action definition)
    - `grep "setDragging" src/canvas/tools/selectTool.ts` matches (at least 2 call sites — start + end)
    - `grep "_dragActive" src/canvas/tools/selectTool.ts` still matches (legacy flag preserved)
    - Both drag-start and drag-end paths call setDragging
    - `npm run build` succeeds
    - `tests/phase33/floatingToolbar.test.ts` "uiStore exposes" + "selectTool calls setDragging" assertions GREEN
  </acceptance_criteria>
  <done>uiStore bridge live; drag-hide contract testable.</done>
</task>

<task type="auto">
  <name>Task 2: Create FloatingSelectionToolbar component (handlers stubbed — Task 3 wires)</name>
  <files>src/components/ui/FloatingSelectionToolbar.tsx</files>
  <read_first>
    - src/stores/uiStore.ts (Task 1 output)
    - src/canvas/FabricCanvas.tsx (understand how the canvas ref is exposed)
    - .planning/phases/33-design-system-ui-polish/33-UI-SPEC.md sections "Floating Selection Toolbar" + "Animation"
    - src/hooks/useReducedMotion.ts (Plan 03)
  </read_first>
  <action>
    Create `src/components/ui/FloatingSelectionToolbar.tsx`:

    ```typescript
    import { useEffect, useRef, useState } from "react";
    import { Copy, Trash2 } from "lucide-react";
    import type * as fabric from "fabric";
    import { useUIStore } from "@/stores/uiStore";
    import { useCADStore } from "@/stores/cadStore";
    import { useReducedMotion } from "@/hooks/useReducedMotion";

    interface Props {
      fc: fabric.Canvas | null;
      wrapperRef: React.RefObject<HTMLElement>;
    }

    const GAP = 8;  // --spacing-sm
    const TOOLBAR_HEIGHT = 32;

    export function FloatingSelectionToolbar({ fc, wrapperRef }: Props) {
      const selectedIds = useUIStore(s => s.selectedIds);
      const isDragging = useUIStore(s => s.isDragging);
      const reduced = useReducedMotion();

      const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
      const toolbarRef = useRef<HTMLDivElement>(null);

      const visible = selectedIds.length >= 1 && !isDragging && pos !== null;

      function recompute() {
        if (!fc || !wrapperRef.current) { setPos(null); return; }
        const obj = fc.getActiveObject();
        if (!obj) { setPos(null); return; }
        const bbox = obj.getBoundingRect();
        const toolbarWidth = toolbarRef.current?.offsetWidth ?? 96;
        const wrapperRect = wrapperRef.current.getBoundingClientRect();

        let top = bbox.top - TOOLBAR_HEIGHT - GAP;
        if (top < 0) top = bbox.top + bbox.height + GAP;  // flip below
        let left = bbox.left + bbox.width / 2 - toolbarWidth / 2;
        left = Math.max(0, Math.min(left, wrapperRect.width - toolbarWidth));
        setPos({ top, left });
      }

      useEffect(() => {
        if (!fc) return;
        recompute();
        fc.on("selection:created", recompute);
        fc.on("selection:updated", recompute);
        fc.on("selection:cleared", () => setPos(null));
        fc.on("object:modified", recompute);
        fc.on("after:render", recompute);
        return () => {
          fc.off("selection:created", recompute);
          fc.off("selection:updated", recompute);
          fc.off("object:modified", recompute);
          fc.off("after:render", recompute);
        };
      }, [fc, selectedIds.length]);

      function handleDuplicate() {
        // Task 3 wires — uses placeProduct + offset (see task 3 action block for exact code).
      }

      function handleDelete() {
        // Task 3 wires — branches by id prefix (see task 3 action block).
      }

      if (!visible) return null;
      return (
        <div
          ref={toolbarRef}
          style={{
            position: "absolute",
            top: pos!.top,
            left: pos!.left,
            transition: reduced ? "none" : "opacity 150ms ease-out, transform 150ms ease-out",
          }}
          className="glass-panel rounded-lg px-2 py-1 flex items-center gap-2 z-20"
        >
          <button
            type="button"
            onClick={handleDuplicate}
            className="p-1 rounded-sm text-text-muted hover:bg-accent/20 hover:text-accent-light"
            aria-label="Duplicate"
          >
            <Copy size={14} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="p-1 rounded-sm text-text-muted hover:bg-error/20 hover:text-error"
            aria-label="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      );
    }

    // Test driver — gated
    if (import.meta.env.MODE === "test") {
      (window as any).__driveFloatingToolbar = {
        isVisible: () => !!document.querySelector('[aria-label="Duplicate"]'),
        getPosition: () => {
          const btn = document.querySelector('[aria-label="Duplicate"]')?.parentElement as HTMLElement | null;
          if (!btn) return null;
          return { top: btn.offsetTop, left: btn.offsetLeft };
        },
        clickDuplicate: () => (document.querySelector('[aria-label="Duplicate"]') as HTMLButtonElement | null)?.click(),
        clickDelete: () => (document.querySelector('[aria-label="Delete"]') as HTMLButtonElement | null)?.click(),
      };
    }
    ```

    Task 3 fills in the two handlers with the pre-researched exact cadStore calls.
  </action>
  <verify>
    <automated>test -f src/components/ui/FloatingSelectionToolbar.tsx &amp;&amp; grep -q "Copy" src/components/ui/FloatingSelectionToolbar.tsx &amp;&amp; grep -q "Trash2" src/components/ui/FloatingSelectionToolbar.tsx &amp;&amp; npm run build 2>&amp;1 | tail -3</automated>
  </verify>
  <acceptance_criteria>
    - Component file exists
    - Imports Copy + Trash2 from lucide-react
    - Uses useUIStore for selectedIds + isDragging
    - Has recompute subscribed to fabric selection events
    - Contains `flip below` fallback when top < 0
    - Contains clamp logic for left within wrapper bounds
    - Uses `glass-panel rounded-lg` styling
    - Test driver `__driveFloatingToolbar` gated by import.meta.env.MODE
    - `npm run build` succeeds
  </acceptance_criteria>
  <done>Toolbar component renders; button actions stubbed for Task 3.</done>
</task>

<task type="auto">
  <name>Task 3: Wire Duplicate + Delete with exact pre-researched cadStore API; mount toolbar inside FabricCanvas wrapper</name>
  <files>src/components/ui/FloatingSelectionToolbar.tsx, src/canvas/FabricCanvas.tsx</files>
  <read_first>
    - src/stores/cadStore.ts:316-327 (placeProduct — confirm signature: `placeProduct(productId, position): string`, pushes history)
    - src/stores/cadStore.ts:816-825 (removeProduct — pushes history)
    - src/stores/cadStore.ts:712-720 (removePlacedCustomElement — pushes history)
    - src/stores/cadStore.ts:294-... (removeWall — pushes history)
    - src/canvas/FabricCanvas.tsx (full — find the wrapper div that contains the canvas; identify where to mount overlay)
    - .planning/phases/33-design-system-ui-polish/33-UI-SPEC.md "Destructive confirmation" row (no dialog; Ctrl+Z is enough)
  </read_first>
  <action>
    **Part A — wire Duplicate handler (VERBATIM, pre-researched):**

    `duplicateProduct` does NOT exist. Use `placeProduct(productId, position)` with a 0.5ft offset. This pushes a single history entry per D-20. Note the MVP limitation: `placeProduct` creates `{ rotation: 0 }`, so rotation does NOT copy — documented as D-40 candidate in SUMMARY.

    Replace the stub `handleDuplicate` with EXACTLY this body:

    ```typescript
    function handleDuplicate() {
      const id = selectedIds[0];
      if (!id) return;
      const cad = useCADStore.getState();
      const activeRoomId = cad.activeRoomId;
      if (!activeRoomId) return;
      const room = cad.rooms[activeRoomId];
      if (!room) return;

      if (id.startsWith("pp_")) {
        const original = room.placedProducts[id];
        if (!original) return;
        // placeProduct pushes history internally and returns the new id.
        cad.placeProduct(original.productId, {
          x: original.position.x + 0.5,
          y: original.position.y + 0.5,
        });
        // Note (D-40 scope boundary): rotation resets to 0 — acceptable Phase 33 MVP.
      } else if (id.startsWith("wall_")) {
        // Walls: no duplicate MVP in Phase 33. Silently no-op — users can draw a new wall.
        return;
      } else {
        // Custom elements: no placeProduct analog verified in scope; defer to follow-up.
        // If room.placedCustomElements?.[id] exists, implementer can escalate to add
        // a placeCustomElement duplicate path, but Phase 33 accepts "Duplicate disabled
        // for custom elements" as MVP scope.
        return;
      }
    }
    ```

    **Part B — wire Delete handler (VERBATIM, pre-researched):**

    Replace the stub `handleDelete` with EXACTLY this body:

    ```typescript
    function handleDelete() {
      const id = selectedIds[0];
      if (!id) return;
      const cad = useCADStore.getState();
      if (id.startsWith("pp_")) {
        cad.removeProduct(id);
      } else if (id.startsWith("wall_")) {
        cad.removeWall(id);
      } else {
        // Placed custom element removal — removePlacedCustomElement pushes history (cadStore.ts:712)
        cad.removePlacedCustomElement?.(id);
      }
    }
    ```

    Each action calls `pushHistory` internally → exactly one `past[]` entry per click → single-undo invariant preserved.

    **Part C — mount inside FabricCanvas:**

    In `src/canvas/FabricCanvas.tsx`:
    1. Import `FloatingSelectionToolbar` from `@/components/ui/FloatingSelectionToolbar`
    2. Add a `wrapperRef` if one doesn't exist — the outer div that wraps the canvas element
    3. Pass `fc` (the fabric canvas instance stored in a ref) and `wrapperRef`:
       ```tsx
       <div ref={wrapperRef} className="relative ...">
         <canvas ref={canvasRef} />
         <FloatingSelectionToolbar fc={fabricCanvasRef.current} wrapperRef={wrapperRef} />
       </div>
       ```

    The wrapper MUST be `position: relative` so the absolute-positioned toolbar anchors correctly.
  </action>
  <verify>
    <automated>npm test -- --run tests/phase33/floatingToolbar.test.ts &amp;&amp; grep -q "FloatingSelectionToolbar" src/canvas/FabricCanvas.tsx &amp;&amp; grep -q "placeProduct" src/components/ui/FloatingSelectionToolbar.tsx &amp;&amp; grep -q "removeProduct" src/components/ui/FloatingSelectionToolbar.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `grep "placeProduct(original.productId" src/components/ui/FloatingSelectionToolbar.tsx` matches (exact duplicate impl)
    - `grep "removeProduct(id)" src/components/ui/FloatingSelectionToolbar.tsx` matches
    - `grep "removeWall(id)" src/components/ui/FloatingSelectionToolbar.tsx` matches
    - `grep "removePlacedCustomElement" src/components/ui/FloatingSelectionToolbar.tsx` matches
    - FabricCanvas.tsx imports and mounts `FloatingSelectionToolbar`
    - Wrapper div around canvas has `position: relative` (inline or Tailwind `relative`)
    - `tests/phase33/floatingToolbar.test.ts` full suite GREEN
    - Manual smoke: select a product in dev, toolbar appears above, click Delete → product removed, Ctrl+Z → restored
  </acceptance_criteria>
  <done>Floating toolbar functional end-to-end. Duplicate uses `placeProduct` + offset (rotation resets — D-40 candidate); Delete branches on id prefix.</done>
</task>

</tasks>

<verification>
```bash
npm test -- --run tests/phase33/floatingToolbar.test.ts
npm run build 2>&1 | tail -3
```
</verification>

<success_criteria>
- [ ] uiStore.isDragging + setDragging added
- [ ] selectTool bridges _dragActive to setDragging
- [ ] FloatingSelectionToolbar component exists with Copy + Trash2
- [ ] Mounted inside FabricCanvas wrapper (position: relative)
- [ ] Duplicate wired to `placeProduct(original.productId, offsetPosition)` (pre-researched)
- [ ] Delete wired to `removeProduct` / `removeWall` / `removePlacedCustomElement` by id prefix
- [ ] `tests/phase33/floatingToolbar.test.ts` GREEN
- [ ] No 3D toolbar added (D-10 scope preserved)
</success_criteria>

<output>
After completion, create `.planning/phases/33-design-system-ui-polish/33-06-SUMMARY.md` documenting:
- uiStore bridge added (isDragging)
- selectTool bridge sites (count)
- cadStore actions wired for duplicate (`placeProduct`) and delete (`removeProduct`/`removeWall`/`removePlacedCustomElement`)
- Scope note: rotation resets on duplicate (D-40 candidate for Phase 34)
- Scope note: wall + custom-element duplicate deferred (MVP)
- Closes #85
- 3D toolbar deferred (backlog per D-10; create separate GH issue)
</output>
</output>
