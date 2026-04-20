# Phase 30 — Smart Snapping: Human UAT Backlog

**Status:** Auto-approved by orchestrator (auto_advance = true) on 2026-04-20. Items below are perceptual checks that the automated stack cannot cover; confirm at next browser session.

## Perceptual Checks

1. **Snap lag feel (Perf)**
   - Load / create a scene with ~20+ products and several walls.
   - Drag a product around for 10+ seconds near walls and other products.
   - Expected: no perceptible lag; guides appear/disappear responsively as you cross snap tolerances.
   - Phase 25 drag fast-path preserved (grep: `NoHistory` count unchanged at 10; `computeSnap` runs only in Fabric-mutation path, no per-frame store writes).

2. **Guide line readability (SNAP-03)**
   - Drag until a snap engages.
   - Expected: accent-purple axis line (#7c5bf0 @ 0.6 opacity, 1px) clearly visible against obsidian background AND grid pattern.
   - Midpoint dot (4px radius) should be visually distinct from the axis line.

3. **Alt/Option disable feel (D-07)**
   - Start dragging a product near a wall — snap engages + guide visible.
   - Hold Alt (Windows) or Option (macOS).
   - Expected: snap releases immediately, guides disappear, object follows cursor freely (grid-snapped if `gridSnap > 0`).
   - Release Alt → smart snap re-engages.

4. **SNAP-01/02 across angles**
   - Horizontal wall → X-axis guide should appear when aligning vertically.
   - Vertical wall → Y-axis guide.
   - 45° wall → observe v1 endpoint-only behavior (documented limitation per RESEARCH Pattern 4). Acceptable if it snaps to the wall's start or end X/Y value; escalate if it feels broken.
   - Midpoint auto-center on each wall type — confirm "this is centered on this wall" reads clearly.
   - Dragging one product near another product's edge — confirm edge-to-edge snap with a guide.

5. **Guide cleanup (Pitfalls 2 + 3)**
   - Drag, release mouse → guides disappear immediately.
   - Start a drag, press V (switch to select) mid-drag → guides disappear.
   - Start a drag, press W (switch to wall tool) mid-drag → guides disappear.

## V1 Limitations (don't flag as bugs)

- Diagonal-wall snap is endpoint-only (not full perpendicular projection).
- Rotated products snap by their axis-aligned bounding box (not the true oriented edges).
- Wall-endpoint drag still uses grid-only snap (D-08b; Phase 31 owns this).

## Completion

When all 5 perceptual checks pass in a browser session, close this file with a datestamped "Confirmed" line and move to phase archive.
