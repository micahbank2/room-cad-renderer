---
status: partial
phase: 85-parametric-controls-v1-20
source: [85-VERIFICATION.md]
started: 2026-05-15T22:30:00-04:00
updated: 2026-05-15T22:30:00-04:00
---

## Current Test

[awaiting human testing]

## Tests

### 1. Numeric inputs change a placed product in both 2D and 3D views
expected: Click a placed product (a chair, a table — whatever you have). Right panel opens to the product inspector → Dimensions tab. You should see 5 numeric input boxes: Width / Depth / Height / X / Y. Click Width, type a new value (e.g. 6), hit Enter. The product should resize on the 2D canvas instantly. Switch to 3D view (or open Split) — the 3D mesh should also be resized. Same drill for Height — type 8, Enter. Product gets taller in both views. Same for X — type 5, Enter. Product slides horizontally to the new X position.
result: [pending]

### 2. Numeric inputs work the same way for a placed custom element
expected: Place a custom element (open the Custom Elements catalog from the sidebar when the product tool is active, drop one on the canvas). Click it. Right panel shows the custom element inspector → Dimensions tab → same 5 numeric inputs. Type new values, hit Enter, watch them apply in both 2D and 3D.
result: [pending]

### 3. Out-of-range typing silently clamps
expected: Click a product, click the Width input, type "1000" and hit Enter. The input should snap to "50" (the max). No error popup, no shake, no toast — it just clamps quietly. Type "-5" or "0.1" — should clamp to "0.5" (the min). Tells you it heard you, just inside the allowed range.
result: [pending]

### 4. Single Ctrl+Z reverts a numeric edit
expected: Make any numeric change (e.g. width 4 → 6, Enter). The product resizes. Hit Cmd+Z (or Ctrl+Z) once. Width should go back to 4. Single undo step — not multiple keystroke-by-keystroke undos.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
