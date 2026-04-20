---
status: partial
phase: 28-auto-save
source: [28-VERIFICATION.md]
started: 2026-04-20T20:00:00.000Z
updated: 2026-04-20T20:00:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. SAVING→SAVED toolbar animation fidelity
expected: After drawing a wall and waiting ~2s, the toolbar displays `SAVING…` (dim) then `SAVED` (success green) using the SAVE-04 surface typography and obsidian theme. No new chrome.
result: [pending]

### 2. Single save per continuous drag
expected: Dragging a placed product continuously for 3+ seconds results in exactly ONE IndexedDB write at drag-end (observable in DevTools → Application → IndexedDB → keyval-store, or via console `performance.getEntriesByType("resource")` for keyval writes). No per-frame save spam.
result: [pending]

### 3. Hard-refresh restores scene exactly
expected: After drawing a wall, waiting for SAVED, then hard-refreshing the browser tab, the canvas shows the identical wall with no WelcomeScreen flash. Silent restore uses the `room-cad-last-project` idb-keyval pointer. If the pointer is missing or `loadProject` fails, WelcomeScreen is shown as fallback (D-02a).
result: [pending]

### 4. SAVE_FAILED persistence under IndexedDB block
expected: With IndexedDB writes blocked (DevTools → Application → IndexedDB → disable or fill quota), drawing a wall causes the toolbar to display `SAVE_FAILED` in the error color. The indicator does NOT auto-fade — it remains visible until the block is cleared AND a subsequent successful save fires (which transitions to SAVED → idle). Auto-approved for code-level correctness; manual browser test confirms perceptual behavior.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
