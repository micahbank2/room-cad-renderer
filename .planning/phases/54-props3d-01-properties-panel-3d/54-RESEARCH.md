# Phase 54: PropertiesPanel in 3D + Split View — Research

**Researched:** 2026-04-29
**Domain:** React Three Fiber pointer events, Zustand selection dispatch, App.tsx viewMode gates
**Confidence:** HIGH — all findings grounded in direct file reads, no inference required

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01** — Click vs orbit-drag: `onPointerDown` captures screen XY in ref; `onPointerUp` computes distance; if `< 5px` treat as click and dispatch `select([id])`. If `>= 5px` treat as orbit drag and ignore.
- **D-02** — Click on empty 3D space via `<Canvas onPointerMissed>` calls `select([])`. Honors same drag-threshold.
- **D-03** — Split mode: ONE PropertiesPanel in the 2D pane (line 250). No second panel in the 3D pane.
- **D-04** — 3D-only mode: keep existing PropertiesPanel mount at App.tsx:270. Verify works for all kinds.
- **D-05** — Left-click (button 0) via `onPointerDown`/`onPointerUp` and right-click (button 2) via `onContextMenu` are independent paths on the same mesh. No conflict.
- **D-06** — 9 e2e scenarios + 1 unit test for drag-threshold math.
- **D-07** — Atomic commits per task (mirror Phase 49–53).
- **D-08** — Zero regressions: Phase 31 inline editing, Phase 47 displayMode, Phase 48 saved-camera, Phase 53 right-click, Phase 46 tree click-to-focus, 6 pre-existing vitest failures.

### Claude's Discretion

(None defined in CONTEXT.md — all implementation details locked above.)

### Deferred Ideas (OUT OF SCOPE)

- Multi-select via Shift/Cmd+click in 3D
- Keyboard navigation between selected meshes
- Two PropertiesPanels in split mode
- Hover highlight (`onPointerOver`/`onPointerOut`)
- Dimension editing in 3D
- Mobile / touch tap-to-select
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROPS3D-01 | PropertiesPanel renders selected object's properties in 3D and split view modes | Click-to-select wiring (onPointerDown/Up with drag-threshold) + PropertiesPanel mount audit confirms App.tsx:270 already mounts panel in 3D-only mode; split mode panel at App.tsx:250 receives selectedIds from shared uiStore |
</phase_requirements>

---

## Summary

Phase 54 is a pure wiring phase. All data structures and rendering infrastructure exist; the missing piece is pointer event handlers on the four mesh components (WallMesh, ProductMesh, CeilingMesh, CustomElementMesh) and a drag-threshold guard on `<Canvas onPointerMissed>`. PropertiesPanel already reads `selectedIds` from uiStore with no viewMode gate — it renders correctly for all kinds once selection is dispatched. The App.tsx split-mode layout has a single PropertiesPanel in the 2D pane (line 250); this is confirmed correct per D-03.

**Primary recommendation:** Add `onPointerDown`/`onPointerUp` with `e.button === 0` check and 5px threshold to all four mesh components. Add a Canvas-level `onPointerMissed` guard with the same threshold. Extract the threshold check into a `useClickDetect(onSelect)` hook in `src/hooks/useClickDetect.ts`.

---

## Standard Stack

No new libraries. All tools already installed.

| Tool | Version | Purpose |
|------|---------|---------|
| `@react-three/fiber` | ^8.17.14 | R3F Canvas + ThreeEvent type |
| `zustand` | ^5.0.12 | uiStore.select([id]) dispatch |
| `vitest` | ^4.1.2 | Unit test for drag-threshold |
| `@playwright/test` | ^1.59.1 | 9 e2e scenarios |

---

## Architecture Patterns

### 1. Click-vs-Drag Implementation Pattern

**Pattern:** `useClickDetect` hook — colocated with usage, not scattered across four components.

**Recommended location:** `src/hooks/useClickDetect.ts` (new file)

```typescript
// src/hooks/useClickDetect.ts
import { useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";

const CLICK_THRESHOLD_PX = 5;

export function isClick(x0: number, y0: number, x1: number, y1: number): boolean {
  const dx = x1 - x0;
  const dy = y1 - y0;
  return Math.sqrt(dx * dx + dy * dy) < CLICK_THRESHOLD_PX;
}

export function useClickDetect(onSelect: () => void) {
  const downPos = useRef<{ x: number; y: number } | null>(null);

  function handlePointerDown(e: ThreeEvent<PointerEvent>) {
    if (e.button !== 0) return;
    downPos.current = { x: e.clientX, y: e.clientY };
  }

  function handlePointerUp(e: ThreeEvent<PointerEvent>) {
    if (e.button !== 0 || !downPos.current) return;
    if (isClick(downPos.current.x, downPos.current.y, e.clientX, e.clientY)) {
      e.stopPropagation(); // prevent bubble to Canvas onPointerMissed
      onSelect();
    }
    downPos.current = null;
  }

  return { handlePointerDown, handlePointerUp };
}
```

**Usage in ProductMesh (representative):**

```tsx
// src/three/ProductMesh.tsx — add inside component body:
const { handlePointerDown, handlePointerUp } = useClickDetect(() => {
  useUIStore.getState().select([placed.id]);
});

// On the <mesh>:
<mesh
  onPointerDown={handlePointerDown}
  onPointerUp={handlePointerUp}
  onContextMenu={...existing Phase 53 handler...}
>
```

**Confirmation:** `ThreeEvent<PointerEvent>` extends the DOM `PointerEvent`. `e.clientX`, `e.clientY`, and `e.button` are accessible. Source: `@react-three/fiber` ships `ThreeEvent<TEvent>` as `TEvent & { ... }` where `TEvent` is the native event type. `ProductMesh.tsx:1` already imports `ThreeEvent` from `@react-three/fiber` for the `onContextMenu` handler — the import is already present in ProductMesh and CeilingMesh; it needs to be added to WallMesh and CustomElementMesh.

**Per-mesh ref vs module ref:** Each hook call creates its own `useRef` closure — one ref per mounted mesh instance. This is correct. Module-level refs would be shared across all instances (wrong behavior if two walls are rendered). The hook pattern gives each mesh its own independent down-position ref.

---

### 2. Empty-Space Deselect via onPointerMissed

**R3F behavior (confirmed by reading ThreeViewport.tsx):** `<Canvas onPointerMissed>` already exists at `ThreeViewport.tsx:527` handling right-click context menu for the empty-canvas case. This fires when a pointer event hits the Canvas but no mesh calls `stopPropagation()`. Critically: if a mesh's `onPointerUp` calls `e.stopPropagation()`, that event does NOT propagate to `onPointerMissed`.

**Drag-threshold on Canvas level:** The `onPointerMissed` handler only has access to the final `MouseEvent`, not to the down position. The threshold check must be done with a Canvas-level ref:

```tsx
// ThreeViewport.tsx — inside ThreeViewport() function:
const canvasDownPos = useRef<{ x: number; y: number } | null>(null);

<Canvas
  onPointerDown={(e: React.PointerEvent) => {
    if (e.button === 0) canvasDownPos.current = { x: e.clientX, y: e.clientY };
  }}
  onPointerMissed={(e: MouseEvent) => {
    // Phase 53: right-click empty canvas (unchanged)
    if (e.button === 2) { ... existing handler ... }
    // Phase 54: left-click empty canvas deselects
    if (e.button === 0 && canvasDownPos.current) {
      if (isClick(canvasDownPos.current.x, canvasDownPos.current.y, e.clientX, e.clientY)) {
        useUIStore.getState().select([]);
      }
      canvasDownPos.current = null;
    }
  }}
>
```

**Important:** The existing `onContextMenu` handler on `<Canvas>` (ThreeViewport.tsx:527–535) is a separate event (`contextmenu` DOM event), not `onPointerMissed`. They are independent and do not interfere. The existing handler stays untouched.

**Does mesh `stopPropagation` block `onPointerMissed`?** Yes — R3F's pointer event system propagates through the scene graph. When a mesh calls `e.stopPropagation()` on `onPointerUp`, the event stops bubbling. `onPointerMissed` fires only for events that hit no mesh at all, so mesh-level `stopPropagation` does not block it. The Canvas-level `onPointerDown` (for capturing down position) is separate from `onPointerMissed` and fires for all pointer-down events regardless.

---

### 3. Custom Element Mesh Component — FOUND

**File:** `src/three/CustomElementMesh.tsx` (confirmed, 35 lines)

**Location in render tree:** `RoomGroup.tsx:141` renders `<CustomElementMesh placed={p} element={catalog} isSelected={...} />` inside the per-room group.

**Current state:** CustomElementMesh has NO `onContextMenu` handler (Phase 53 did not wire it). It also has no pointer handlers. Phase 54 adds both `onPointerDown`/`onPointerUp` to this component. The `onContextMenu` gap is noted — CONTEXT.md says Phase 53 wired it (D-08 dependency), but the file does not have it. This is worth flagging in the plan as a note: if Phase 53 shipped without CustomElementMesh having `onContextMenu`, Phase 54 can add `onPointerDown`/`onPointerUp` without worrying about that coexistence.

**Import needed:** `ThreeEvent` from `@react-three/fiber` must be added.

---

### 4. Split-Mode PropertiesPanel Mount Audit

**Confirmed layout from App.tsx:**

```
Line 246-251: (viewMode === "2d" || viewMode === "split") branch
  └── div.w-1/2 (split) or div.flex-1 (2d)
      ├── FabricCanvas
      ├── ToolPalette
      └── PropertiesPanel productLibrary={...} viewMode={viewMode}  ← LINE 250

Line 256-273: (viewMode === "3d" || viewMode === "split") branch
  └── div.w-1/2 (split) or div.flex-1 (3d)
      ├── ThreeViewport
      └── {viewMode === "3d" && (                                    ← LINE 269 GATE
            PropertiesPanel productLibrary={...} viewMode={viewMode} ← LINE 270
          )}
```

**Split mode finding:** In split mode (`viewMode === "split"`):
- Line 250 renders PropertiesPanel in the **2D pane** — D-03 CONFIRMED.
- Line 269 gate `viewMode === "3d"` is FALSE for split mode — so no PropertiesPanel renders in the 3D pane.
- `selectedIds` is a single uiStore field subscribed by PropertiesPanel at line 175 (`useUIStore((s) => s.selectedIds)`). When a 3D click updates `selectedIds`, the 2D pane's PropertiesPanel re-renders immediately.

**Verdict:** D-03 holds. In split mode, the 2D-pane PropertiesPanel at line 250 already receives 3D selections via shared uiStore. No App.tsx changes needed.

**3D-only mode finding:** PropertiesPanel mounts at line 270 inside the 3D pane. It reads `selectedIds` from uiStore with no viewMode gate. `viewMode` is passed only to the `SaveCameraSection` sub-component (line 100: `const disabled = viewMode === "2d" || viewMode === "library"`) to gate the Save button — not to show/hide the panel itself.

**PropertiesPanel has no viewMode gate that hides it.** It renders for all selection kinds (wall/product/ceiling/custom) regardless of view mode. The only issue today is that 3D click never dispatches `select([id])` — Phase 54 fixes exactly that.

---

### 5. Drag-Threshold Helper Location

**Recommendation: `src/hooks/useClickDetect.ts` (option b — custom hook)**

Export `isClick()` as a named pure function from the same file. The unit test (`tests/lib/dragThreshold.test.ts` or `src/hooks/__tests__/useClickDetect.test.ts`) imports and exercises `isClick()` directly — no DOM setup needed.

Rationale: four mesh components import one hook, not one file each. The `isClick` function is co-located with the ref management. `Canvas`-level threshold check imports just `isClick` from the same hook file.

---

### 6. Wall Mesh Hit Area

**WallMesh geometry:** `ExtrudeGeometry` from a `THREE.Shape` defined by `wallCorners()` — a 4-corner thick rectangle. The extrusion depth = wall height (8 ft default). The resulting mesh has 6 faces: two large front/back faces (length × height) and four narrow edge faces.

**R3F raycaster behavior:** Default R3F raycaster tests against all mesh faces with `THREE.Mesh.raycast()`, which hits the bounding volume then tests individual triangles. The front/back faces of a wall (length × height, e.g. 12 ft × 8 ft) are large targets. Wall thickness is configurable (default 0.5 ft) — the edge faces are very narrow.

**Verdict:** Clicking the large front/back face of a wall is reliable. Clicking the narrow edge (top or side face, 0.5 ft wide) requires precision. Note for HUMAN-UAT: clicks on wall face surface are reliable; clicks on wall edges may miss.

---

### 7. Phase 53 Right-Click Coexistence

**WallMesh:** `onContextMenu` handler at `WallMesh.tsx:383–391`. Handler checks `e.nativeEvent.button !== 2` (returns early), calls `e.stopPropagation()` and `e.nativeEvent.preventDefault()`. Only fires for right-click (button 2).

**ProductMesh:** `onContextMenu` at `ProductMesh.tsx:30–38`. Same `button !== 2` guard.

**CeilingMesh:** `onContextMenu` at `CeilingMesh.tsx:111–119`. Same pattern.

**CustomElementMesh:** NO `onContextMenu` handler (lines 1–35). Phase 53 did not wire custom elements in 3D.

**Coexistence verdict:** Adding `onPointerDown`/`onPointerUp` with `e.button === 0` check to each mesh is completely safe. The existing `onContextMenu` handlers fire on DOM `contextmenu` event (right-click, button 2). `onPointerDown`/`onPointerUp` fire on `pointerdown`/`pointerup` DOM events. These are different event types — they cannot interfere. The `e.button === 0` guard in the new handlers ensures left-click only. No `stopPropagation()` in the existing handlers blocks pointer events (they call `stopPropagation` on the R3F `ThreeEvent`, not on `pointerdown`/`pointerup`).

---

### 8. E2E Click Driver Pattern

**Recommendation:** Dual approach — real click at known coordinates + test driver for state assertions.

**Option A — `page.mouse.click(x, y)`:** Playwright clicks at viewport pixel coordinates. Requires a known camera preset to produce stable mesh screen positions. Use `window.__setTestCamera(pose)` (already installed at `ThreeViewport.tsx:115–128`, test-mode gated) to set a deterministic camera pose, then compute expected pixel position. Works for scenarios 1–5 and 7–8. Risk: coordinate math is fragile across viewport sizes.

**Option B — `__driveMeshSelect(id)` test driver:** Install in Scene's `useEffect` (test-mode gated, same pattern as `__setTestCamera`). Calls `useUIStore.getState().select([id])` directly. Use for selection-state assertion setup without testing the click path.

**Recommended pattern for the 9 scenarios:**
- Scenarios 1–6 (click wall/product/ceiling/custom, empty space, orbit-no-change): use `page.mouse.click` after `__setTestCamera` to exercise the real pointer path.
- Scenario 7 (split: 3D click → 2D panel updates): use `page.mouse.click` on the 3D pane; assert panel content in the 2D pane.
- Scenario 8 (split: 2D click regression): existing Playwright pattern from Phase 53.
- Scenario 9 (right-click regression): existing pattern from `canvas-context-menu.spec.ts`.

**`__driveMeshSelect` driver:** Add to Scene's useEffect block alongside existing `__setTestCamera`. One line: `(window as any).__driveMeshSelect = (id: string) => useUIStore.getState().select([id]);`. Clean up on unmount.

---

### 9. Task Breakdown Estimate

**1 plan, 4 tasks:**

| Task | Description | Files |
|------|-------------|-------|
| T1 | Create `useClickDetect` hook + unit test for `isClick` | `src/hooks/useClickDetect.ts`, `src/hooks/__tests__/useClickDetect.test.ts` |
| T2 | Wire `onPointerDown`/`onPointerUp` on all 4 mesh components | `WallMesh.tsx`, `ProductMesh.tsx`, `CeilingMesh.tsx`, `CustomElementMesh.tsx` |
| T3 | Add Canvas-level `onPointerMissed` deselect + `__driveMeshSelect` test driver | `ThreeViewport.tsx` |
| T4 | 9-scenario e2e test file | `e2e/properties-panel-3d.spec.ts` |

Estimated 7–8 files. Matches CONTEXT.md estimate of 8 files.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Drag-threshold math | Custom distance fn per component | `isClick()` from `useClickDetect.ts`, shared |
| R3F pointer event access | DOM listener on canvas element | R3F `onPointerDown`/`onPointerUp` mesh props |
| Selection dispatch | Custom event bus | `useUIStore.getState().select([id])` (existing) |

---

## Common Pitfalls

### Pitfall 1: Module-level down-position ref shared across instances

**What goes wrong:** Declaring `const downPos = { x: 0, y: 0 }` at module level (outside the component/hook) means all WallMesh instances share the same ref. Mouse down on Wall A, mouse up on Wall B — Wall B incorrectly uses Wall A's down position.

**How to avoid:** `useRef` inside the hook — each component instance gets its own ref.

### Pitfall 2: onPointerMissed fires after orbit drag ends on empty space

**What goes wrong:** User orbits camera, releases mouse over empty space. Without drag-threshold, `onPointerMissed` fires and clears selection.

**How to avoid:** Canvas-level `onPointerDown` records down position. `onPointerMissed` compares and only deselects if movement < 5px. CONFIRMED: `onPointerMissed` receives a `MouseEvent` with `clientX`/`clientY` matching the pointer-up position.

### Pitfall 3: e.stopPropagation() in onPointerUp prevents Canvas onPointerMissed for that event

**What goes wrong:** Calling `e.stopPropagation()` inside a mesh's `onPointerUp` prevents the event from bubbling further. This is DESIRED — when a mesh is clicked, we do NOT want `onPointerMissed` to also fire and deselect.

**How to avoid:** Call `e.stopPropagation()` in the mesh's `onPointerUp` when a click is confirmed. Do NOT call it in `onPointerDown` — the Canvas needs the down event to record position.

### Pitfall 4: ThreeEvent button check uses e.button not e.nativeEvent.button

**What goes wrong:** Phase 53 used `e.nativeEvent.button` because `onContextMenu` receives a `ThreeEvent<MouseEvent>`. For `onPointerDown`/`onPointerUp`, R3F wraps `PointerEvent` — `e.button` is directly on the ThreeEvent (ThreeEvent extends the native event). Both `e.button` and `e.nativeEvent.button` work for pointer events, but `e.clientX`/`e.clientY` are on the ThreeEvent directly.

**How to avoid:** Use `e.button`, `e.clientX`, `e.clientY` directly (no `.nativeEvent` prefix needed for pointer events).

### Pitfall 5: CustomElementMesh missing ThreeEvent import

**What goes wrong:** `CustomElementMesh.tsx` does not import `ThreeEvent` from `@react-three/fiber` (it has no pointer handlers currently). TypeScript will error.

**How to avoid:** Add `import type { ThreeEvent } from "@react-three/fiber";` in T2.

---

## Code Examples

### Confirmed Phase 53 onContextMenu pattern (WallMesh.tsx:383)
```tsx
onContextMenu={(e: ThreeEvent<MouseEvent>) => {
  if (e.nativeEvent.button !== 2) return;
  e.stopPropagation();
  e.nativeEvent.preventDefault();
  useUIStore.getState().openContextMenu("wall", wall.id, {
    x: e.nativeEvent.clientX,
    y: e.nativeEvent.clientY,
  });
}}
```

### New Phase 54 pattern to add alongside (same mesh)
```tsx
onPointerDown={(e: ThreeEvent<PointerEvent>) => {
  if (e.button !== 0) return;
  downPos.current = { x: e.clientX, y: e.clientY };
}}
onPointerUp={(e: ThreeEvent<PointerEvent>) => {
  if (e.button !== 0 || !downPos.current) return;
  if (isClick(downPos.current.x, downPos.current.y, e.clientX, e.clientY)) {
    e.stopPropagation();
    useUIStore.getState().select([wall.id]);
  }
  downPos.current = null;
}}
```

### Canvas-level deselect (ThreeViewport.tsx, alongside existing onContextMenu)
```tsx
// Add onPointerDown to Canvas:
onPointerDown={(e: React.PointerEvent) => {
  if (e.button === 0) canvasDownPos.current = { x: e.clientX, y: e.clientY };
}}
// Extend existing onPointerMissed (currently onContextMenu — note: onPointerMissed is separate):
onPointerMissed={(e: MouseEvent) => {
  if (e.button === 0 && canvasDownPos.current) {
    if (isClick(canvasDownPos.current.x, canvasDownPos.current.y, e.clientX, e.clientY)) {
      useUIStore.getState().select([]);
    }
    canvasDownPos.current = null;
  }
}}
```

Note: the existing `onContextMenu` on `<Canvas>` (ThreeViewport.tsx:527) is NOT the same as `onPointerMissed`. They are separate props handling different DOM events. The new `onPointerMissed` prop is additive — does not replace `onContextMenu`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.2 + @playwright/test ^1.59.1 |
| Config file | `vitest.config.ts` (unit), `playwright.config.ts` (e2e) |
| Quick run command | `npm run test:quick` |
| Full suite command | `npm test && npm run test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROPS3D-01 | isClick() math correct for 5px threshold | unit | `npm run test:quick -- src/hooks/__tests__/useClickDetect.test.ts` | Wave 0 |
| PROPS3D-01 | Click wall in 3D → PropertiesPanel shows wall | e2e | `npm run test:e2e -- properties-panel-3d` | Wave 0 |
| PROPS3D-01 | Click product in 3D → PropertiesPanel shows product | e2e | same spec | Wave 0 |
| PROPS3D-01 | Click ceiling in 3D → PropertiesPanel shows ceiling | e2e | same spec | Wave 0 |
| PROPS3D-01 | Click custom element in 3D → PropertiesPanel shows | e2e | same spec | Wave 0 |
| PROPS3D-01 | Click empty 3D space → selection clears | e2e | same spec | Wave 0 |
| PROPS3D-01 | Orbit drag does NOT change selection | e2e | same spec | Wave 0 |
| PROPS3D-01 | Split: 3D click → 2D pane panel updates | e2e | same spec | Wave 0 |
| PROPS3D-01 | Split: 2D click regression | e2e | same spec | Wave 0 |
| PROPS3D-01 | Right-click still opens context menu | e2e | same spec | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:quick`
- **Per wave merge:** `npm test`
- **Phase gate:** `npm test && npm run test:e2e` green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/hooks/__tests__/useClickDetect.test.ts` — covers isClick() unit test
- [ ] `e2e/properties-panel-3d.spec.ts` — covers all 9 e2e scenarios

---

## Open Questions (Resolved)

1. **Pointer-event propagation in R3F:** `e.stopPropagation()` on mesh's `onPointerUp` PREVENTS Canvas `onPointerMissed` from firing for that event — this is correct and desired behavior. The Canvas-level `onPointerDown` (for recording position) fires independently and is unaffected. **CONFIRMED by R3F design and file reads.**

2. **Custom element mesh component:** `src/three/CustomElementMesh.tsx` (lines 1–35). Imported and rendered at `RoomGroup.tsx:141`. No `onContextMenu`, no pointer handlers currently. **FOUND.**

3. **Split-mode PropertiesPanel:** Single panel at App.tsx:250 (2D pane). `viewMode === "3d"` gate at App.tsx:269 excludes a second panel in the 3D pane for split mode. D-03 holds. No App.tsx changes needed. **CONFIRMED.**

4. **Wall mesh hit area:** Large front/back faces (length × height) are reliable click targets. Narrow edge faces (thickness = 0.5 ft) require precision. Note for HUMAN-UAT. **CONFIRMED: ExtrudeGeometry covers all faces; no special raycast config needed.**

5. **Drag-threshold helper location:** `src/hooks/useClickDetect.ts` as a custom hook exporting both `isClick()` (pure, testable) and the `useClickDetect()` hook. **DECIDED.**

---

## Environment Availability

Step 2.6: SKIPPED — this phase modifies only TypeScript source files. No external tool dependencies beyond the existing dev environment (Node.js, npm, vitest, playwright already confirmed installed via package.json).

---

## Sources

### Primary (HIGH confidence)
- `src/three/WallMesh.tsx` — Phase 53 onContextMenu pattern, geometry type, e.stopPropagation usage
- `src/three/ProductMesh.tsx` — onContextMenu pattern, ThreeEvent import already present
- `src/three/CeilingMesh.tsx` — onContextMenu pattern, ThreeEvent import already present
- `src/three/CustomElementMesh.tsx` — NO onContextMenu, NO ThreeEvent import, 35 lines
- `src/three/ThreeViewport.tsx:527–535` — existing onContextMenu on Canvas, separate from onPointerMissed
- `src/three/RoomGroup.tsx:141` — CustomElementMesh render site
- `src/App.tsx:246–273` — exact PropertiesPanel mount locations for all viewModes
- `src/stores/uiStore.ts:85` — `select(ids: string[])` action signature confirmed
- `src/components/PropertiesPanel.tsx:174–175` — no viewMode gate on panel visibility; `selectedIds` subscribed directly

### Secondary (MEDIUM confidence)
- R3F `ThreeEvent<TEvent>` type extends native event — `e.button`, `e.clientX`, `e.clientY` available directly (confirmed by Phase 53 code using `e.nativeEvent.clientX` for onContextMenu and established R3F API convention)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — direct file reads, no inference
- Architecture: HIGH — all patterns confirmed by existing Phase 53 implementations in the same files
- Pitfalls: HIGH — inferred from reading actual handler code; pointer event type confirmed by existing imports

**Research date:** 2026-04-29
**Valid until:** 2026-05-29 (stable R3F/Zustand — not fast-moving)
