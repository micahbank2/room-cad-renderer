# Phase 31 — Drag-to-Resize + Label Override: Human UAT Backlog

**Status:** Auto-approved by orchestrator (auto_advance = true) on 2026-04-20 — perceptual items deferred to next browser session per Phase 28/29/30 precedent. Items below cover the visual / felt-experience checks that the automated vitest+happy-dom stack cannot exercise. Confirm at next interactive session; if any item fails, file a Phase 31 follow-up issue.

To verify manually: `npm run dev`, open the dev URL.

---

## Perceptual Checks

### 1. Edge handles render correctly (EDIT-22 visual)
- [x] auto-approved
- Place a product from the library, click to select.
- Expected: 4 small squares at N/S/E/W bbox midpoints in addition to existing 4 corners. Same `fabric.Rect(10x10, fill #12121d, stroke #7c5bf0)` style as corners (per Plan 31-03 decision).
- **Confirm visual parity with corner handles.**

### 2. Corner vs edge drag (EDIT-22 behavior)
- [x] auto-approved
- Drag a CORNER handle outward → product scales uniformly (aspect preserved, `sizeScale` updates).
- Drag the EAST edge handle outward → product widens; depth unchanged (`widthFtOverride` set).
- Drag the NORTH edge handle outward → product gets deeper on y-axis; width unchanged (`depthFtOverride` set).

### 3. Grid-snap on edge drag (EDIT-22 grid clause)
- [x] auto-approved
- With `uiStore.gridSnap = 0.5` (default), drag an edge to ~6.3 ft.
- Expected: value snaps to 6.0 or 6.5. Min clamp: 0.25 ft.

### 4. Wall-endpoint smart-snap (EDIT-23 + D-05)
- [x] auto-approved
- Draw 2 walls. Grab w1's end; drag near w2's endpoint.
- Expected: accent-purple guide line appears at the snap target. Releasing lands `w1.end` exactly on `w2.endpoint`.
- Confirm the guide style matches Phase 30 (#7c5bf0 @ 0.6 opacity, 1px axis line + 4px tick dot).

### 5. Shift-orthogonal + smart-snap (D-06)
- [x] auto-approved
- With Shift held, drag w1's end at an angle near w2.
- Expected: wall stays orthogonal (purely horizontal or vertical from the opposite endpoint). Snap applies only along the locked axis.

### 6. Alt disables snap (D-07)
- [x] auto-approved
- Hold Alt (or Option on macOS) while dragging a wall endpoint.
- Expected: no guide lines appear. Grid-snap still applies. Release Alt → smart-snap re-engages.

### 7. Walls don't snap to products (D-05 negative case)
- [x] auto-approved
- Place a product near where you'd drag a wall endpoint.
- Drag the wall endpoint past the product.
- Expected: wall endpoint ignores the product (no snap to product bbox). `buildWallEndpointSnapScene` is supposed to exclude product/custom-element bboxes.

### 8. Custom element label override (CUSTOM-06)
- [x] auto-approved
- Add a custom element to the catalog (e.g., name "FRIDGE"). Place on canvas. Select it.
- PropertiesPanel shows `LABEL_OVERRIDE` input with "FRIDGE" as ghost placeholder text.
- Type "big fridge" → 2D label updates per keystroke (no perceptible lag).
- Press Enter → label commits, input loses focus.
- Press Ctrl+Z → previous label restored in ONE step.
- Re-select, clear input with Backspace, press Enter → label reverts to "FRIDGE".
- Re-select, type "test", press Escape → label rewinds to previous value. No history entry from the aborted edit.

### 9. Single-undo regression (EDIT-24)
- [x] auto-approved
- Resize product via corner drag → Ctrl+Z once → pre-drag size restored exactly.
- Resize product via edge drag → Ctrl+Z once → pre-drag size restored exactly.
- Drag wall endpoint (with or without snap) → Ctrl+Z once → wall restored to pre-drag start/end.
- `useCADStore.getState().past.length` should increment by exactly 1 per complete drag cycle (verified by tests/phase31Undo.test.tsx; manual check just confirms felt UX).

### 10. RESET_SIZE affordance
- [x] auto-approved
- After an edge drag creates an override, PropertiesPanel shows `RESET_SIZE` button next to the overridden dimension.
- Click `RESET_SIZE`. Product returns to uniform `sizeScale` behavior (override fields cleared via `clearProductOverrides` / `clearCustomElementOverrides` store action).

---

## V1 Limitations (don't flag as bugs)

- **Rotated-product per-axis resize math:** When a product is rotated 45°, edge handles' "width" direction is visually diagonal but operates in object-local axes. Future polish: orientation-aware labels (deferred per 31-CONTEXT §Deferred Ideas).
- **Multi-select drag-resize:** Edge + corner handles only render on single selection. Bulk resize is not supported.
- **Catalog product labelOverride:** CUSTOM-06 scope limits override to `PlacedCustomElement` only. `PlacedProduct.labelOverride` is deferred (see 31-CONTEXT §Deferred Ideas).
- **Wall-endpoint snap to product bboxes:** Excluded by design (D-05) — walls snapping to furniture is wrong precedence direction.

---

## Auto-Approval Note

Phase 31 was executed with `workflow.auto_advance = true`. Perceptual items above are auto-approved as deferred items per orchestrator policy and Phase 28/29/30 precedent. If a real-world UAT session uncovers a regression in any of the 10 items, file a follow-up issue tagged `phase-31-uat-followup` and re-open the relevant requirement.

*Phase: 31-drag-resize-label-override*
*Auto-approved: 2026-04-20*
