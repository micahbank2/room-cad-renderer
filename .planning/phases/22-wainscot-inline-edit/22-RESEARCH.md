# Phase 22: Wainscot Inline Edit - Research

**Researched:** 2026-04-06
**Domain:** 2D canvas inline editing, wainscot data model, Fabric.js double-click events
**Confidence:** HIGH

## Summary

Phase 22 adds a double-click inline edit popover for wainscot style and height on walls in the 2D canvas. The codebase already has an established precedent for canvas-overlaid inline editing: the dimension label editor (EDIT-06) uses a double-click on a wall's dimension label to show an absolutely-positioned `<input>` over the canvas. The wainscot popover follows the same pattern but with a richer UI (style dropdown + height input instead of a single text input).

The wainscot data model is well-defined. `WainscotConfig` on `WallSegment.wainscoting[side]` stores `enabled`, `heightFt`, `color`, and an optional `styleItemId` referencing the `WainscotStyleItem` library (persisted in IndexedDB via `wainscotStyleStore`). Seven wainscot styles exist. The store action `toggleWainscoting()` handles both enabling/disabling and updating style/height in a single call with history support.

**Primary recommendation:** Add a second `mouse:dblclick` handler in `FabricCanvas.tsx` that hit-tests selected walls with wainscoting, then renders an absolutely-positioned React popover (not a Fabric object) containing a style `<select>` and height `<input>`. Follow the dimension editor pattern exactly: React state for visibility/position, `onBlur`/Escape to dismiss, store action to commit.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| POLISH-02 | User can double-click a wainscoted wall to inline-edit wainscot style and height | Dimension editor precedent (EDIT-06) provides exact pattern. `toggleWainscoting()` store action handles updates. `hitTestStore()` in selectTool identifies wall hits. `WainscotStyleItem` library provides style options. |
</phase_requirements>

## Standard Stack

No new dependencies required. All existing libraries are sufficient.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | ^18.3.1 | Popover rendering as React component overlaid on canvas | Already used for dimension editor overlay |
| Fabric.js | ^6.9.1 | `mouse:dblclick` event for triggering popover | Already used for dimension label double-click |
| Zustand | ^5.0.12 | `cadStore.toggleWainscoting()` for committing changes | Existing store action, no new actions needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| wainscotStyleStore | local | Read `items[]` for style dropdown options | Populate the style `<select>` in the popover |

## Architecture Patterns

### Existing Precedent: Dimension Label Inline Editor (EDIT-06)

This is the exact pattern to follow. Located in `src/canvas/FabricCanvas.tsx` lines 199-226 and 344-398.

**How it works:**
1. A `mouse:dblclick` handler is registered on the Fabric canvas in a `useEffect` (line 200-226)
2. The handler calls `hitTestDimLabel()` to check if the click is on a dimension label
3. On hit, React state is set: `setEditingWallId(wall.id)` and `setPendingValue(...)`
4. The component renders an absolutely-positioned `<input>` element over the canvas (lines 382-398)
5. Position is computed from wall midpoint via `computeLabelPx()` which converts feet to pixels using `scale` and `origin`
6. Commit on Enter/blur, cancel on Escape

**Key code reference (FabricCanvas.tsx lines 344-364):**
```typescript
let overlayStyle: React.CSSProperties | null = null;
if (editingWallId) {
  const wall = getActiveRoomDoc()?.walls[editingWallId];
  const wrapper = wrapperRef.current;
  if (wall && wrapper) {
    const rect = wrapper.getBoundingClientRect();
    const { userZoom, panOffset } = useUIStore.getState();
    const { scale, origin } = getViewTransform(
      room.width, room.length, rect.width, rect.height, userZoom, panOffset
    );
    const label = computeLabelPx(wall, scale, origin);
    overlayStyle = {
      position: "absolute",
      left: label.x - 32,
      top: label.y - 10,
      width: 64,
      height: 20,
      zIndex: 10,
    };
  }
}
```

### Recommended Approach for Wainscot Popover

**New React state in FabricCanvas.tsx:**
```typescript
const [wainscotEditWallId, setWainscotEditWallId] = useState<string | null>(null);
const [wainscotEditSide, setWainscotEditSide] = useState<WallSide>("A");
```

**Double-click handler addition:**
The existing `mouse:dblclick` handler (line 200-226) currently only checks for dimension label hits. The wainscot hit-test should be added to this same handler (or a separate one), checking:
1. Is the double-clicked point on a wall? (reuse `hitTestStore` or `closestPointOnWall`)
2. Does that wall have wainscoting enabled on either side?
3. If yes, set `wainscotEditWallId` and `wainscotEditSide`

**Popover positioning:**
Compute the wall midpoint in pixels (same as dimension label), then offset slightly. The popover should be wider than the dimension editor (~180px wide, ~80px tall) to accommodate a `<select>` and a number input.

**Popover component (inline in FabricCanvas or extracted):**
```
+----------------------------+
| WAINSCOT_EDIT              |
| STYLE: [dropdown     v]   |
| HEIGHT: [3.00] FT          |
+----------------------------+
```

**Dismissal:**
- Click outside: use a click-away listener (check if click target is inside popover)
- Escape key: keydown listener
- Both should clear `wainscotEditWallId` to null

**Store update:**
Call `toggleWainscoting(wallId, side, true, newHeight, color, newStyleItemId)` on every change. This pushes history and updates the wall, triggering both 2D redraw and 3D re-render.

### Anti-Patterns to Avoid
- **Do NOT use Fabric.js objects for the popover**: The dimension editor correctly uses a React-rendered HTML element overlaid on the canvas. Fabric text inputs would be far more complex and less accessible.
- **Do NOT create a new store action**: `toggleWainscoting` already handles all the fields. Just call it with `enabled: true` and the updated values.
- **Do NOT require the wall to be selected first**: The double-click should work on any wainscoted wall, selecting it in the process. However, checking if wainscoting is enabled requires knowing which side -- default to Side A, or check both sides.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Wall hit-testing | Custom distance calc | `closestPointOnWall()` from `geometry.ts` + `HIT_THRESHOLD` pattern from `selectTool.ts` | Already battle-tested, handles all wall orientations |
| Feet-to-pixel conversion | Manual math | `getViewTransform()` from `FabricCanvas.tsx` | Accounts for zoom and pan |
| Style list | Hardcoded array | `useWainscotStyleStore((s) => s.items)` | User-created styles, persisted in IndexedDB |

## Common Pitfalls

### Pitfall 1: Double-click conflicts with dimension label editor
**What goes wrong:** Both the existing dimension label dblclick handler and the new wainscot handler fire on the same event.
**Why it happens:** Both handlers listen on `mouse:dblclick` and check different hit regions.
**How to avoid:** In the existing dblclick handler (line 204), if the dimension label is hit, return early before checking for wainscot. If neither hits, do nothing. Order: dimension label first (more specific), wainscot second (broader wall body).
**Warning signs:** Double-clicking a wall opens both the dimension editor AND the wainscot popover.

### Pitfall 2: Side ambiguity on double-click
**What goes wrong:** User double-clicks a wall but it's unclear which side's wainscoting to edit.
**Why it happens:** A wall can have wainscoting on Side A, Side B, or both.
**How to avoid:** Default to the `activeWallSide` from `uiStore` if both sides have wainscoting. If only one side has it, auto-select that side. If neither side has wainscoting, do not show the popover.
**Warning signs:** Popover shows wrong side's settings, or doesn't appear on a wainscoted wall.

### Pitfall 3: Popover position goes off-screen after zoom/pan
**What goes wrong:** After zooming in or panning, the popover's computed position may be outside the visible canvas area.
**Why it happens:** Position is computed once on double-click but the canvas view can change.
**How to avoid:** Dismiss the popover on zoom/pan events (set `wainscotEditWallId` to null when `userZoom` or `panOffset` changes). This matches user expectation -- the popover is transient.
**Warning signs:** Popover floats in wrong position after scrolling.

### Pitfall 4: Stale style list
**What goes wrong:** Wainscot style store hasn't loaded from IndexedDB yet when the popover opens.
**Why it happens:** `wainscotStyleStore.load()` is async and may not have completed.
**How to avoid:** The store's `loaded` flag should be checked. In practice, `App.tsx` likely loads the store on mount, so this should already be handled. Verify that `load()` is called early.
**Warning signs:** Empty style dropdown on first double-click.

## Code Examples

### Existing double-click handler pattern (FabricCanvas.tsx:200-226)
```typescript
// Double-click on wall dim label to edit (EDIT-06)
useEffect(() => {
  const fc = fcRef.current;
  const wrapper = wrapperRef.current;
  if (!fc || !wrapper) return;
  const onDblClick = (opt: { e: Event }) => {
    const pointer = fc.getViewportPoint(opt.e as any);
    const rect = wrapper.getBoundingClientRect();
    const r = getActiveRoomDoc()?.room ?? { width: 20, length: 16, wallHeight: 8 };
    const { userZoom, panOffset } = useUIStore.getState();
    const { scale, origin } = getViewTransform(
      r.width, r.length, rect.width, rect.height, userZoom, panOffset
    );
    const storeWalls = getActiveRoomDoc()?.walls ?? {};
    for (const wall of Object.values(storeWalls)) {
      if (hitTestDimLabel(pointer, wall, scale, origin)) {
        // ... set editing state
        return;
      }
    }
  };
  fc.on("mouse:dblclick", onDblClick as any);
  return () => { fc.off("mouse:dblclick", onDblClick as any); };
}, []);
```

### toggleWainscoting store action (cadStore.ts:475-495)
```typescript
toggleWainscoting: (wallId, side, enabled, heightFt = 3, color = "#ffffff", styleItemId) =>
  set(
    produce((s: CADState) => {
      const doc = activeDoc(s);
      if (!doc || !doc.walls[wallId]) return;
      pushHistory(s);
      const wall = doc.walls[wallId];
      if (!wall.wainscoting) wall.wainscoting = {};
      if (enabled) {
        wall.wainscoting[side] = {
          enabled: true,
          heightFt,
          color,
          ...(styleItemId ? { styleItemId } : {}),
        };
      } else {
        delete wall.wainscoting[side];
      }
      if (!wall.wainscoting.A && !wall.wainscoting.B) delete wall.wainscoting;
    })
  ),
```

### WallSurfacePanel wainscot dropdown (WallSurfacePanel.tsx:208-230)
```typescript
<select
  value={wains.styleItemId ?? ""}
  onChange={(e) => {
    const id = e.target.value || undefined;
    const selected = id ? wainscotStyles.find((s) => s.id === id) : null;
    toggleWainscoting(
      wall.id,
      activeSide,
      true,
      selected?.heightFt ?? wains.heightFt,
      selected?.color ?? wains.color,
      id
    );
  }}
  className="w-full font-mono text-[11px] bg-obsidian-high text-accent-light border border-outline-variant/30 px-1 py-0.5 rounded-sm"
>
  <option value="">(LEGACY_DEFAULT)</option>
  {wainscotStyles.map((it) => (
    <option key={it.id} value={it.id}>
      {it.name.toUpperCase()} . {STYLE_META[it.style].label}
    </option>
  ))}
</select>
```

## Data Model Summary

### WainscotConfig (src/types/cad.ts:8-15)
```typescript
export interface WainscotConfig {
  enabled: boolean;
  styleItemId?: string;     // FK to WainscotStyleItem in wainscotStyleStore
  heightFt: number;         // default 3 (36")
  color: string;            // hex, legacy fallback
}
```

### WainscotStyleItem (src/types/wainscotStyle.ts:10-24)
```typescript
export interface WainscotStyleItem {
  id: string;               // "wain_..."
  name: string;
  style: WainscotStyle;     // one of 7 styles
  heightFt: number;
  color: string;            // hex
  // Style-specific knobs (optional)
  panelWidth?: number;
  plankWidth?: number;
  battenWidth?: number;
  plankHeight?: number;
  stileWidth?: number;
  gridRows?: number;
  depth?: number;
}
```

### 7 Wainscot Styles (src/types/wainscotStyle.ts:1-8)
| Style | Label | Default Height |
|-------|-------|---------------|
| `recessed-panel` | RECESSED_PANEL | 3 ft |
| `raised-panel` | RAISED_PANEL | 3 ft |
| `beadboard` | BEADBOARD | 3 ft |
| `board-and-batten` | BOARD_AND_BATTEN | 4 ft |
| `shiplap` | SHIPLAP | 4 ft |
| `flat-panel` | FLAT_PANEL | 3 ft |
| `english-grid` | ENGLISH_GRID | 5 ft |

### Store access pattern
- Read styles: `useWainscotStyleStore((s) => s.items)` -- returns `WainscotStyleItem[]`
- Read wall wainscoting: `wall.wainscoting?.[side]` -- returns `WainscotConfig | undefined`
- Update: `useCADStore.getState().toggleWainscoting(wallId, side, true, heightFt, color, styleItemId)`

## Key Files to Modify

| File | Change |
|------|--------|
| `src/canvas/FabricCanvas.tsx` | Add wainscot edit state, extend dblclick handler, render popover overlay |
| (optional) `src/components/WainscotPopover.tsx` | Extract popover to separate component if it grows beyond ~40 lines |

**No changes needed to:**
- `cadStore.ts` -- `toggleWainscoting` already handles all updates
- `selectTool.ts` -- double-click is handled at the FabricCanvas level, not in the tool
- `uiStore.ts` -- popover state is local to FabricCanvas, not global UI state
- `wainscotStyleStore.ts` -- read-only access
- `types/cad.ts` or `types/wainscotStyle.ts` -- no model changes

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + happy-dom |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| POLISH-02 | Double-click wainscoted wall shows popover | unit (state logic) | `npx vitest run tests/wainscotPopover.test.ts -x` | Wave 0 |
| POLISH-02 | Style change calls toggleWainscoting correctly | unit | `npx vitest run tests/wainscotPopover.test.ts -x` | Wave 0 |
| POLISH-02 | Height change calls toggleWainscoting correctly | unit | `npx vitest run tests/wainscotPopover.test.ts -x` | Wave 0 |
| POLISH-02 | Popover dismisses on Escape/click-outside | manual-only | N/A -- requires browser interaction | N/A |
| POLISH-02 | 3D view updates immediately on change | manual-only | N/A -- requires WebGL rendering | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/wainscotPopover.test.ts -x`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/wainscotPopover.test.ts` -- covers POLISH-02 state logic (hit-test for wainscoted walls, store action calls)
- Framework install: already present

## Sources

### Primary (HIGH confidence)
- `src/types/cad.ts` -- WainscotConfig interface definition (lines 8-15)
- `src/types/wainscotStyle.ts` -- WainscotStyle type, WainscotStyleItem, STYLE_META, ALL_STYLES
- `src/stores/cadStore.ts` -- toggleWainscoting action (lines 475-495)
- `src/stores/wainscotStyleStore.ts` -- wainscot style library store
- `src/canvas/FabricCanvas.tsx` -- dimension editor inline pattern (lines 199-398)
- `src/canvas/dimensionEditor.ts` -- hit-test and position computation helpers
- `src/components/WallSurfacePanel.tsx` -- existing wainscot UI controls (lines 182-234)
- `src/canvas/tools/selectTool.ts` -- wall hit-testing with closestPointOnWall

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new deps, all existing
- Architecture: HIGH -- exact precedent exists in the codebase (dimension editor)
- Pitfalls: HIGH -- identified from direct code reading

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable codebase, no external deps changing)
