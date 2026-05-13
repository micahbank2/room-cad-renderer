---
status: partial
phase: 79-window-presets-win-presets-01-v1-20-active
source: [79-VERIFICATION.md]
started: 2026-05-13T11:14:00-04:00
updated: 2026-05-13T11:14:00-04:00
---

## Current Test

[awaiting human testing]

## Tests

### 1. Place a window from each named preset and confirm the dimensions look right
expected: Activate the Window tool, click each of the 5 named preset chips (Small, Standard, Wide, Picture, Bathroom), place a window on a wall after each pick, and visually confirm the window sizes match the catalog (e.g. Standard = 3 ft wide × 4 ft tall, sill 3 ft). The chip you picked should show an accent ring while it's active.
result: [pending]

### 2. Custom dimensions panel feels right while typing
expected: Activate Window tool, click the Custom chip. The Custom panel expands inline. Type new Width / Height / Sill values. Each keystroke "arms" the tool with your latest values. Click on a wall — the placed window should use exactly what you typed. The ghost preview while hovering should reflect the typed values too.
result: [pending]

### 3. PropertiesPanel preset row shows the right label and switching presets is a single undo
expected: Select a placed window. The PropertiesPanel should show a "Preset: {Label}" row matching the preset you used (or "Custom" for non-catalog dims). Click a different preset chip in the panel — the window's dimensions should update. Hit Ctrl+Z once — the window should revert to its prior dimensions in a single undo step (not two).
result: [pending]

### 4. E2E test suite (Playwright) — confirm pre-existing harness issue, not a Phase 79 regression
expected: The e2e spec `tests/e2e/specs/window-presets.spec.ts` exists (7 specs) but is blocked at runtime by a pre-existing `TooltipProvider` harness error. Coverage is provided by 7 GREEN vitest+RTL integration tests. Suggested human action: file a GitHub issue (`bug` + `tech-debt`) for the Tooltip / e2e bootstrap fix if not already tracked. See `deferred-items.md`.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
