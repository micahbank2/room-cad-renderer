---
phase: 07-placement-interaction-fixes
plan: 01
subsystem: canvas-tools
tags: [edit-10, edit-11, edit-13, preview, auto-revert, live-dim]
requires: [wallTool, doorTool, windowTool, uiStore]
provides: [door/window placement preview, tool auto-revert, live wall length label]
affects:
  - src/canvas/tools/wallTool.ts
  - src/canvas/tools/doorTool.ts
  - src/canvas/tools/windowTool.ts
decisions:
  - "EDIT-10: solved via live preview rather than click-location change. The click math was correct (door centers on wall-projected click); the UX problem was that users couldn't SEE where the door would land. A translucent preview rectangle appearing on the wall as the cursor moves eliminates the surprise."
  - "EDIT-11: tool auto-reverts to Select after EVERY placement (not after a series). One wall/door/window per tool activation."
  - "EDIT-13: live length label rendered as fabric.Group (Rect + Text) at preview line midpoint, using formatFeet() for display."
  - "EDIT-12 and EDIT-14 deferred to Phase 7.1 — wall rotation has shared-endpoint complications, product resize requires per-placement dimension overrides (new data-model field). Both out of scope for this smaller PR."
metrics:
  requirements_closed: [EDIT-10, EDIT-11, EDIT-13]
  requirements_deferred: [EDIT-12, EDIT-14]
---

# Phase 7 Plan: Placement & Interaction Fixes

## Goal

Placing walls, doors, and windows feels precise: you see where things land before clicking, tools stop persisting after one placement, and wall length is visible as you draw.

## Tasks

- [x] EDIT-10: Add live placement preview to doorTool (translucent orange rect on wall showing where door lands)
- [x] EDIT-10: Same for windowTool (translucent purple rect)
- [x] EDIT-11: Auto-revert to Select after placing a door (call `setTool("select")` after addOpening)
- [x] EDIT-11: Same for window and wall tools
- [x] EDIT-13: Live length label at midpoint of wall preview line, formatted as feet+inches
- [x] EDIT-13: Label cleanup in wall-tool cleanup()

## Deferred to Phase 7.1

- EDIT-12 (rotate placed walls/doors/windows): needs a design decision on pivot point (midpoint vs endpoint), and handling of shared-endpoint breakage. Doors/windows can't rotate independently of their host wall.
- EDIT-14 (live size tag while resizing products): requires first adding resize handles to products, which requires a per-placement dimension override field on PlacedProduct (new data-model work).

## Verification

- [x] Wall tool: click to start, move cursor — see dashed line + length label. Drag to different lengths → label updates live. Click to place → tool reverts to Select.
- [x] Door tool: hover near a wall — translucent orange rect previews the door on the wall. Click → door placed, tool reverts to Select.
- [x] Window tool: hover near a wall — translucent purple rect previews the window. Click → window placed, tool reverts to Select.
- [x] Escape while drawing a wall: preview + label clear.
- [x] Escape from door/window tool: preview clears, tool reverts to Select.
