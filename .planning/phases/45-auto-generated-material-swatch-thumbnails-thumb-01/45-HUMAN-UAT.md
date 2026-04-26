---
status: partial
phase: 45-auto-generated-material-swatch-thumbnails-thumb-01
source: [45-VERIFICATION.md]
started: 2026-04-25T20:42:00Z
updated: 2026-04-25T20:42:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Cold-mount PBR fidelity (floor picker, fresh page load)
expected: Hex placeholder tiles flash briefly (<200ms), then crossfade to rendered PBR thumbnails. All 11 swatches resolve — no permanent flat-hex tiles unless that specific PBR set genuinely failed to load.
result: [pending]

### 2. Warm-cache instant render (surface switch)
expected: Switching active surface (floor → ceiling → floor) renders the second mount instantaneously — thumbnails appear without a placeholder flash because the in-memory cache is already warm.
result: [pending]

### 3. PBR materials texture detail (CONCRETE, PLASTER, WOOD_PLANK)
expected: Tiles show real texture detail (grain / weave / surface variation) under studio light — not flat color paint chips.
result: [pending]

### 4. Flat-color materials lit appearance (8 non-PBR materials)
expected: WOOD_OAK, WOOD_WALNUT, TILE_WHITE, TILE_BLACK, CARPET, MARBLE, STONE, PAINTED_DRYWALL show lit color planes from the same studio rig (subtle shading from directional light) — visually distinct from raw hex paint chips.
result: [pending]

### 5. Reduced-motion respect (macOS Reduce Motion = ON)
expected: With Reduce Motion enabled, thumbnails snap in with NO crossfade animation (duration-0). With Reduce Motion off, the 150ms opacity transition is visible.
result: [pending]

### 6. First-mount perceived performance (full 11-material grid)
expected: <200ms total cold-render time per RESEARCH.md target — no perceptible jank, no UI freeze during generateBatch.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
