# Phase 21: Deferred Feature Verification - Research

**Researched:** 2026-04-06
**Domain:** Feature verification + undo-history fix for existing v1.3 code
**Confidence:** HIGH

## Summary

All three deferred features (POLISH-03 copy wall side, POLISH-04 frame color override, POLISH-06 sidebar scroll) shipped as code in Phase 19 (v1.3 polish pass) and the code is present and structurally complete. The data models, store actions, and UI components all exist. However, there is one confirmed bug that must be fixed: the frame color picker floods undo history because `updateWallArt` pushes a history entry on every `onChange` event (every pixel of color picker drag). The sidebar has a potential flexbox scroll issue (missing `min-h-0`). The copy-wall-side feature appears fully functional but needs runtime verification.

**Primary recommendation:** Add `updateWallArtNoHistory` action to cadStore (following the existing NoHistory pattern used by 7 other actions), wire the frame color picker to use it, and verify sidebar scroll behavior. No new features to build -- this is verification + one targeted fix.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| POLISH-03 | User can copy wall treatments from SIDE_A to SIDE_B with one click | `copyWallSide` store action exists (cadStore.ts:777-817), UI button exists (WallSurfacePanel.tsx:116-124). Deep clones via JSON.parse/stringify. Copies wallpaper, wainscoting, crown molding, and wall art. Needs runtime verification only. |
| POLISH-04 | User can override frame color on individual wall art placements | `frameColorOverride` field exists on WallArt type (cad.ts:67), color picker exists in WallSurfacePanel.tsx:345-355, 3D rendering uses override (WallMesh.tsx:206). **Bug: picker uses `updateWallArt` which pushes history on every onChange -- needs `updateWallArtNoHistory` + commit-on-blur pattern.** |
| POLISH-06 | User can scroll all sidebar panels without content clipping when all sections are expanded | Sidebar uses `overflow-hidden` on outer aside + `overflow-y-auto` on inner div (Sidebar.tsx:57,71). Six CollapsibleSection wrappers present. **Potential issue: `flex-1` without `min-h-0` may prevent shrinking below content height in some browsers.** |
</phase_requirements>

## POLISH-03: Copy Wall Side -- Detailed Findings

### Data Model (HIGH confidence)
Wall treatments are stored per-side using `{ A?: T; B?: T }` maps on WallSegment:
- `wallpaper?: { A?: Wallpaper; B?: Wallpaper }` (cad.ts:31)
- `wainscoting?: { A?: WainscotConfig; B?: WainscotConfig }` (cad.ts:33)
- `crownMolding?: { A?: CrownConfig; B?: CrownConfig }` (cad.ts:35)
- `wallArt?: WallArt[]` where each item has `side?: WallSide` defaulting to "A" (cad.ts:64)

### Store Action (HIGH confidence)
`copyWallSide(wallId, from, to)` at cadStore.ts:777-817:
- Pushes history before mutation (single undo entry for the whole copy)
- Deep clones wallpaper, wainscoting, crown molding via `JSON.parse(JSON.stringify(...))`
- Removes ALL existing target-side wall art, then clones source-side art with new IDs
- This is a **full replace** operation, not a merge

### UI Button (HIGH confidence)
`WallSurfacePanel.tsx:116-124` renders `COPY_TO_SIDE_B` (or A) button:
- Appears below the SIDE_A / SIDE_B toggle
- Calls `copyWallSide(wall.id, activeSide, target)` where target is the opposite side
- Button is always visible when a wall is selected (no conditional gating)

### Known Behavior to Document
- Copying destroys existing target-side art without confirmation (by design -- undo is the recovery path)
- Deep clone is correct (no shared reference bugs)

### Verification Needed
- Runtime test: apply treatments to Side A, copy to Side B, confirm both sides match
- Runtime test: edit Side A after copy, confirm Side B does not change (deep clone)
- Runtime test: undo after copy restores original Side B state

## POLISH-04: Frame Color Override -- Detailed Findings

### Data Model (HIGH confidence)
`WallArt.frameColorOverride?: string` at cad.ts:65-67. Optional hex string. When set, overrides the library `FrameStyle`'s default color for this specific placement.

### UI Control (HIGH confidence)
`WallSurfacePanel.tsx:344-355` renders a color input for each art item that has a frameStyle:
```tsx
{a.frameStyle && a.frameStyle !== "none" && (
  <input
    type="color"
    value={a.frameColorOverride ?? FRAME_PRESETS[a.frameStyle].color}
    onChange={(e) =>
      useCADStore.getState().updateWallArt(wall.id, a.id, {
        frameColorOverride: e.target.value,
      })
    }
    title="FRAME_COLOR_OVERRIDE"
  />
)}
```

### 3D Rendering (HIGH confidence)
`WallMesh.tsx:206` reads the override:
```tsx
const frameColor = art.frameColorOverride ?? preset?.color ?? "#ffffff";
```
All four frame sides (top, bottom, left, right) use `frameColor` for their material color (lines 240, 244, 248, 252).

### 2D Rendering
Wall art is NOT rendered in the 2D canvas (`fabricSync.ts` has no wall art rendering). This is expected -- wall art is a 3D-only feature. No frame color work needed for 2D.

### BUG: Undo History Flooding (HIGH confidence)
The color picker's `onChange` fires on every pixel of drag. Each event calls `updateWallArt()` which calls `pushHistory()`. Dragging the color picker through 20+ colors creates 20+ undo entries. This violates the success criterion "Frame color changes do not flood undo history (each picker interaction produces at most one undo entry)."

**Fix pattern (established in codebase):** The project already has 7 `*NoHistory` action variants:
- `updateWallNoHistory`, `updateOpeningNoHistory`
- `rotateProductNoHistory`, `rotateWallNoHistory`
- `resizeProductNoHistory`
- `rotateCustomElementNoHistory`, `resizeCustomElementNoHistory`

These all follow the same pattern: identical to the regular action but skip `pushHistory()`. The UI calls `NoHistory` during continuous interaction (drag/onChange) and pushes one history entry on commit (blur/mouseup).

**Required changes:**
1. Add `updateWallArtNoHistory` action to cadStore (interface + implementation)
2. Change WallSurfacePanel.tsx color picker to use `updateWallArtNoHistory` on `onChange`
3. Add `onBlur` or `onInput` (with change event on commit) that calls regular `updateWallArt` to push one history entry

### Known Edge Case
Frame color override persists across frame style changes. If user sets red override, then changes frame style to "Gold Classic," the frame renders red (not gold). This is documented as accepted behavior for v1.4 (PITFALLS.md:183-194).

## POLISH-06: Sidebar Scroll -- Detailed Findings

### Sidebar Structure (HIGH confidence)
`Sidebar.tsx:56-141`:
```tsx
<aside className="w-64 shrink-0 bg-obsidian-low flex flex-col overflow-hidden">
  {/* Header */}
  <div className="flex items-center justify-between px-4 pt-3 pb-2">...</div>
  {/* Scrollable content */}
  <div className="flex-1 overflow-y-auto p-4 space-y-4">
    <CollapsibleSection label="ROOM_CONFIG">...</CollapsibleSection>
    <CollapsibleSection label="SYSTEM_STATS" defaultOpen={false}>...</CollapsibleSection>
    <CollapsibleSection label="LAYERS" defaultOpen={false}>...</CollapsibleSection>
    <CollapsibleSection label="FLOOR_MATERIAL">...</CollapsibleSection>
    <CollapsibleSection label="SNAP" defaultOpen={false}>...</CollapsibleSection>
    <CustomElementsPanel />
    <FramedArtLibrary />
    <WainscotLibrary />
    <CollapsibleSection label="PRODUCT_LIBRARY">...</CollapsibleSection>
  </div>
</aside>
```

### Overflow Configuration
- Outer `<aside>`: `overflow-hidden` + `flex flex-col` -- prevents the aside itself from scrolling
- Inner `<div>`: `flex-1 overflow-y-auto` -- the scrollable container
- **Missing:** `min-h-0` on the inner div. In flexbox, a child with `flex-1` may refuse to shrink below its content height unless `min-height: 0` is explicitly set (CSS spec default min-height for flex items is `auto` / content size). This can cause content to overflow the parent's height without triggering the scrollbar.

### Nested Scroll Containers
- `WallSurfacePanel.tsx:297`: Art library popup uses `max-h-40 overflow-y-auto` -- this creates a nested scrollable region that may trap scroll events
- Other CollapsibleSection children do not have their own scroll containers

### CollapsibleSection Behavior
- Uses local `useState` with `defaultOpen` prop
- When sidebar is collapsed and reopened, sections reset to their default open/closed state (SYSTEM_STATS, LAYERS, SNAP revert to closed)
- This is documented as accepted behavior, not a fix target

### Potential Fix
Add `min-h-0` to the scrollable inner div:
```tsx
<div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
```

## Architecture Patterns

### NoHistory Pattern for Continuous Interactions
```typescript
// In cadStore interface:
updateWallArtNoHistory: (wallId: string, artId: string, changes: Partial<WallArt>) => void;

// Implementation (same as updateWallArt but no pushHistory):
updateWallArtNoHistory: (wallId, artId, changes) =>
  set(
    produce((s: CADState) => {
      const doc = activeDoc(s);
      if (!doc || !doc.walls[wallId]?.wallArt) return;
      const item = doc.walls[wallId].wallArt!.find((a) => a.id === artId);
      if (!item) return;
      // NO pushHistory call
      Object.assign(item, changes);
    })
  ),
```

### History-Boundary Pattern for Color Pickers
The UI component pushes one history snapshot before the first change, then uses NoHistory for subsequent changes:
```tsx
// On first interaction (mousedown / focus):
useCADStore.getState().updateWallArt(wallId, artId, { frameColorOverride: value });
// On subsequent changes (onChange during drag):
useCADStore.getState().updateWallArtNoHistory(wallId, artId, { frameColorOverride: value });
```

Alternative simpler approach: always use NoHistory on onChange, and call the regular (history-pushing) version only on the input's `change` event (which fires on picker close in most browsers). For `<input type="color">`, the `input` event fires on every change, while `change` fires only when the picker closes.

**Recommended approach:** Use `onInput` with NoHistory, `onChange` with history-push. In React, `onChange` behaves like the native `input` event, so use a ref-based approach or native event listeners. The simplest reliable pattern: push history once on the color input's `focus` event, then use NoHistory for all subsequent changes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deep clone for wall side copy | Custom recursive clone | `JSON.parse(JSON.stringify(...))` | Already in place, handles all nested objects including wallArt with frameColorOverride |
| History-safe continuous updates | Custom debounce/throttle | `*NoHistory` action + commit-on-blur | Established pattern used by 7 other actions in cadStore |

## Common Pitfalls

### Pitfall 1: React onChange vs native change for color inputs
**What goes wrong:** React's `onChange` fires on every value change (like native `input` event), not on picker close (like native `change`). Using React `onChange` for both NoHistory and history-push does not separate them.
**How to avoid:** Push history on `onFocus` (fires once when picker opens), use NoHistory on `onChange` for all subsequent updates.
**Warning signs:** Multiple undo presses needed to revert a single color change.

### Pitfall 2: Missing min-h-0 on flex-1 scroll container
**What goes wrong:** Content overflows without scrollbar appearing.
**How to avoid:** Always pair `flex-1 overflow-y-auto` with `min-h-0` in flex column containers.
**Warning signs:** Content cut off at bottom of sidebar, no visible scrollbar despite content exceeding container.

### Pitfall 3: copyWallSide replaces all target-side art
**What goes wrong:** User expects "copy surface only" but gets full replacement including art destruction.
**How to avoid:** Document this as intended behavior. Undo is the recovery path.
**Warning signs:** Art on target side disappears after copy.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | vitest config via package.json scripts |
| Quick run command | `npm run test:quick` |
| Full suite command | `npm run test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| POLISH-03 | copyWallSide copies all four treatment types with deep clone | unit | `npx vitest run tests/cadStore.test.ts -t "copyWallSide"` | No -- Wave 0 |
| POLISH-03 | copyWallSide deep clone produces independent copies | unit | `npx vitest run tests/cadStore.test.ts -t "copyWallSide"` | No -- Wave 0 |
| POLISH-04 | updateWallArtNoHistory does not push history | unit | `npx vitest run tests/cadStore.test.ts -t "updateWallArtNoHistory"` | No -- Wave 0 |
| POLISH-04 | frameColorOverride field persists through updateWallArt | unit | `npx vitest run tests/cadStore.test.ts -t "frameColorOverride"` | No -- Wave 0 |
| POLISH-06 | Sidebar scroll behavior | manual-only | N/A -- visual CSS verification | N/A |

### Sampling Rate
- **Per task commit:** `npm run test:quick`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/cadStore.test.ts` -- add tests for `copyWallSide` (deep clone, all 4 treatment types)
- [ ] `tests/cadStore.test.ts` -- add tests for `updateWallArtNoHistory` (no history push)
- [ ] `tests/cadStore.test.ts` -- add tests for `frameColorOverride` persistence

*(Test file exists, new test cases needed within it)*

## Code Examples

### copyWallSide store action (already implemented)
```typescript
// Source: src/stores/cadStore.ts:777-817
copyWallSide: (wallId, from, to) =>
  set(
    produce((s: CADState) => {
      const doc = activeDoc(s);
      if (!doc || !doc.walls[wallId]) return;
      pushHistory(s);
      const wall = doc.walls[wallId];
      // Deep clones wallpaper, wainscoting, crown molding
      // Removes target-side art, clones source-side art with new IDs
    })
  ),
```

### Frame color picker (needs fix)
```typescript
// Source: src/components/WallSurfacePanel.tsx:345-355
// CURRENT (buggy -- floods history):
<input
  type="color"
  value={a.frameColorOverride ?? FRAME_PRESETS[a.frameStyle].color}
  onChange={(e) =>
    useCADStore.getState().updateWallArt(wall.id, a.id, {
      frameColorOverride: e.target.value,
    })
  }
/>

// FIX: use onFocus to push history once, onChange for NoHistory updates
<input
  type="color"
  value={a.frameColorOverride ?? FRAME_PRESETS[a.frameStyle].color}
  onFocus={() =>
    useCADStore.getState().updateWallArt(wall.id, a.id, {
      frameColorOverride: a.frameColorOverride ?? FRAME_PRESETS[a.frameStyle].color,
    })
  }
  onChange={(e) =>
    useCADStore.getState().updateWallArtNoHistory(wall.id, a.id, {
      frameColorOverride: e.target.value,
    })
  }
/>
```

### Sidebar scroll fix
```tsx
// Source: src/components/Sidebar.tsx:71
// CURRENT:
<div className="flex-1 overflow-y-auto p-4 space-y-4">

// FIX:
<div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
```

## File Inventory

| File | Relevance | Changes Needed |
|------|-----------|----------------|
| `src/stores/cadStore.ts` | POLISH-04 | Add `updateWallArtNoHistory` action (interface + implementation) |
| `src/components/WallSurfacePanel.tsx` | POLISH-04 | Fix frame color picker to use NoHistory + onFocus pattern |
| `src/components/Sidebar.tsx` | POLISH-06 | Add `min-h-0` to scrollable container |
| `src/types/cad.ts` | All | No changes needed -- types already correct |
| `src/three/WallMesh.tsx` | POLISH-04 | No changes needed -- already reads `frameColorOverride` |
| `tests/cadStore.test.ts` | All | Add test cases for copyWallSide, updateWallArtNoHistory |

## Sources

### Primary (HIGH confidence)
- Direct code inspection of `src/stores/cadStore.ts` (copyWallSide at lines 777-817, updateWallArt at lines 527-537)
- Direct code inspection of `src/components/WallSurfacePanel.tsx` (copy button at 116-124, frame color picker at 344-355)
- Direct code inspection of `src/components/Sidebar.tsx` (overflow setup at lines 57, 71)
- Direct code inspection of `src/types/cad.ts` (frameColorOverride at line 67, WallSide types)
- Direct code inspection of `src/three/WallMesh.tsx` (frameColor usage at line 206)
- `.planning/research/PITFALLS.md` (pitfalls 3-6, 9-10 directly relevant)

### Secondary (MEDIUM confidence)
- `.planning/milestones/v1.3-phases/19-v1-2-polish-pass/19-VERIFICATION.md` (all three features marked SATISFIED in v1.3 verification)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, all existing code
- Architecture: HIGH - established NoHistory pattern, straightforward CSS fix
- Pitfalls: HIGH - all identified in prior research, confirmed by code inspection

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable -- no external dependencies)
