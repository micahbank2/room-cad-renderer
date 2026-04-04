# Phase 1: 2D Canvas Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 01-2d-canvas-polish
**Areas discussed:** Drag-drop UX, Rotation handles, Dimension editing, Auto-save behavior

---

## Drag-drop UX

### Q: How should dragging a product from the library to the canvas work?

| Option | Description | Selected |
|--------|-------------|----------|
| HTML5 drag-and-drop (Recommended) | Drag the product card from the sidebar, ghost preview, drop on canvas | ✓ |
| Click-then-click (improved) | Keep current pattern, add visual cursor indicator | |
| You decide | Claude picks | |

**User's choice:** HTML5 drag-and-drop
**Notes:** —

### Q: Should dropped products snap to grid?

| Option | Description | Selected |
|--------|-------------|----------|
| Snap to grid (Recommended) | 0.5ft / 6 inch snap consistent with wall drawing | ✓ |
| Drop exactly where released | No snap, nudge later | |
| You decide | Claude picks | |

**User's choice:** Snap to grid
**Notes:** —

### Q: After dropping, what should happen next?

| Option | Description | Selected |
|--------|-------------|----------|
| Select it (Recommended) | Auto-select for immediate adjust | ✓ |
| Stay in drag mode | Place multiples easily | |
| Return to select tool | Clean but extra click | |

**User's choice:** Select it
**Notes:** —

### Q: Keep old click-to-place method, or replace entirely?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep both (Recommended) | Drag-drop primary, click-to-place fallback | ✓ |
| Replace entirely | Drag-drop only, simpler codebase | |

**User's choice:** Keep both
**Notes:** —

---

## Rotation handles

### Q: What style of rotation handle?

| Option | Description | Selected |
|--------|-------------|----------|
| Corner dot + arc (Recommended) | Circle handle above product, arc drag | ✓ |
| Corner grab points | Four corner squares | |
| Circular ring | Full outline around product | |
| You decide | Claude picks | |

**User's choice:** Corner dot + arc (Figma/Canva style)
**Notes:** —

### Q: Should rotation snap or be free?

| Option | Description | Selected |
|--------|-------------|----------|
| Snap to 15° (Recommended) | 0/15/30/45/90/etc. Shift = free | ✓ |
| Snap to 45° only | Coarser | |
| Free rotation always | No snap | |

**User's choice:** Snap to 15° (Shift for free)
**Notes:** —

### Q: Move handles visible, or just rotation?

| Option | Description | Selected |
|--------|-------------|----------|
| Direct drag to move (Recommended) | Drag body, rotation handle is only affordance | ✓ |
| Both visible | Move icon + rotation handle | |

**User's choice:** Direct drag to move
**Notes:** —

---

## Dimension editing

### Q: How should edit input appear on double-click?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline text field on canvas (Recommended) | HTML input overlaid at label position | ✓ |
| Small popup near label | Floating card with input | |
| You decide | Claude picks | |

**User's choice:** Inline text field on canvas
**Notes:** —

### Q: What happens to wall geometry on resize?

| Option | Description | Selected |
|--------|-------------|----------|
| Move the end point (Recommended) | Start fixed, end moves; connected corners move with | ✓ |
| Resize from center | Symmetric, shifts both connected walls | |
| You decide | Claude picks | |

**User's choice:** Move the end point
**Notes:** —

### Q: What input format for dimensions?

| Option | Description | Selected |
|--------|-------------|----------|
| Just feet as a number (Recommended) | "12" = 12 feet | ✓ |
| Feet and inches (8'6") | Parser for mixed formats | |
| You decide | Claude picks | |

**User's choice:** Just feet as a number
**Notes:** —

---

## Auto-save behavior

### Q: How quickly should auto-save trigger?

| Option | Description | Selected |
|--------|-------------|----------|
| 2-second debounce (Recommended) | Balance speed vs IndexedDB load | ✓ |
| 5-second debounce | Conservative | |
| Immediate on every change | Maximum safety, could cause jank | |

**User's choice:** 2-second debounce
**Notes:** —

### Q: Visible save indicator?

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle status text (Recommended) | "Saved"/"Saving..." in status bar, fades out | ✓ |
| No indicator | Invisible | |
| You decide | Claude picks | |

**User's choice:** Subtle status text
**Notes:** —

### Q: Auto-create new projects, or only save existing ones?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-create on first change (Recommended) | "Untitled Room" default name | ✓ |
| Only auto-save named projects | Unsaved work still at risk | |
| You decide | Claude picks | |

**User's choice:** Auto-create on first change
**Notes:** Default name "Untitled Room"

---

## Claude's Discretion

- Exact debounce implementation (lodash, setTimeout, useDeferredValue)
- Ghost preview styling during drag-drop
- Inline text input styling (uses obsidian design tokens + IBM Plex Mono)
- Rotation handle visual details (accent color, size)
- EDIT-09 async image load technique (fabric.FabricImage.fromURL vs onload callback)

## Deferred Ideas

- Wall-snap during product drag
- Keyboard rotation shortcut (R key)
- Multi-select + group operations
- Auto-save version history
- Fixing AABB-ignores-rotation hit-test bug (may get touched incidentally)
- Extracting shared pxToFeet to toolUtils.ts
