---
phase: 52-keyboard-shortcuts-overlay-hotkey-01
plan: 01
status: complete
shipped: 2026-04-27
requirements_completed: [HOTKEY-01]
---

# Plan 52-01 SUMMARY — Keyboard Shortcuts Registry + Overlay (HOTKEY-01)

## What was built

A single-source-of-truth registry for keyboard shortcuts, consumed by both `App.tsx`'s keyboard handler and `HelpModal`'s shortcuts overlay. Adding a new shortcut now means adding one entry to `src/lib/shortcuts.ts` — the help cheat sheet auto-updates.

## Tasks executed

| Task | Files | Commit |
|------|-------|--------|
| T1 — Build registry + coverage-gate | `src/lib/shortcuts.ts`, `tests/lib/shortcuts.registry.test.ts` | (registry commit) |
| T2 — Refactor App.tsx keyboard handler | `src/App.tsx` (-132 / +26 lines) | (App.tsx commit) |
| T3 — Migrate helpContent SHORTCUTS to alias | `src/components/help/helpContent.tsx` | (helpContent commit) |
| T4 — New e2e spec (5 scenarios) | `e2e/keyboard-shortcuts-overlay.spec.ts` | (e2e commit) |

## Key changes

- **`src/lib/shortcuts.ts` (NEW):** `SHORTCUT_DISPLAY_LIST` (26 entries) + `buildRegistry(ctx)` factory. 7 previously missing shortcuts now displayed: Ceiling tool (C), Reset canvas view (0), Camera Presets 1-4, Copy (Ctrl+C), Paste (Ctrl+V).
- **`src/App.tsx`:** Keyboard handler is now a registry-driven loop. Removed the inline `Record<string, ToolType>` map, the inline 0/E/PRESETS/Copy/Paste/Cmd+Tab branches, and module-level `_clipboard` + `PASTE_OFFSET` (moved into shortcuts.ts).
- **One-char bug fix:** `?` now calls `openHelp("shortcuts")` explicitly. Previously `openHelp()` with no arg fell back to last-active section, so `?` could open the wrong tab.
- **`src/components/help/helpContent.tsx`:** Local `Shortcut` interface and 19-entry `SHORTCUTS` array deleted. `SHORTCUTS` is now an alias for `SHORTCUT_DISPLAY_LIST` from the registry. Consumer (`helpIndex.ts:179`) untouched.
- **Coverage-gate test:** asserts every expected action string is present + iteration-order invariants (Copy before Ceiling, Paste before Select). 3 unit tests, 100% pass.
- **e2e spec:** 5 scenarios on chromium-dev + chromium-preview, 10/10 GREEN.

## Iteration-order invariant (load-bearing)

Modifier-gated entries (Ctrl+C, Ctrl+V, Ctrl+Tab) MUST come before bare-key entries (C ceiling, V select, etc.) in the registry. Documented in shortcuts.ts comment block + asserted by 2 ordering tests. The App.tsx registry loop returns on first match — wrong order means `Ctrl+C` activates the Ceiling tool instead of copying.

## Deviations from acceptance text

REQUIREMENTS.md HOTKEY-01 acceptance text says "New `KeyboardShortcutsOverlay` component using lucide icons." This phase intentionally did NOT build a new component:

- **Why no new component:** HelpModal already IS the overlay. Building a duplicate violates the single-source-of-truth principle (D-01) — users would have to learn two help systems. The user-approved CONTEXT.md (D-01, D-06, Out of Scope section) explicitly locks this trade-off.
- **Why Material Symbols stayed:** The `icon: "keyboard"` reference in `helpContent.tsx:11` is on the CLAUDE.md D-33 Material Symbols allowlist (HelpModal is one of 8 exempted files). Migrating to lucide here would violate the per-file allowlist convention.

The plan-checker explicitly flagged these as warnings (not blockers) and noted "CONTEXT.md decisions take precedence over raw acceptance text" — discuss-phase is where user-approved deviations are recorded.

## D-03 + D-04 (verification-only)

- **D-03 reduced-motion guard:** zero work needed. HelpModal mounts via `if (!showHelp) return null` — no CSS animation/transition class anywhere. e2e spec test 5 asserts this structurally.
- **D-04 inert-on-form-input:** existing guard at App.tsx:133-138 was already sufficient. Verified by e2e spec test 4.

## Test results

- `npx vitest run tests/lib/shortcuts.registry.test.ts` — 3/3 GREEN
- `npx vitest run` — 645 pass, 6 pre-existing failures (unchanged baseline)
- `npx playwright test e2e/keyboard-shortcuts-overlay.spec.ts` — 5/5 GREEN on chromium-dev + chromium-preview
- `npx playwright test e2e/wall-user-texture-first-apply.spec.ts e2e/saved-camera-cycle.spec.ts e2e/display-mode-cycle.spec.ts e2e/tree-empty-states.spec.ts` — Phase 46-50 regression, 7/7 GREEN
- `npx tsc --noEmit` — clean (only pre-existing baseUrl deprecation warning)

## Note on execution

The first attempt to spawn gsd-executor timed out at 18 minutes with no commits. Execution completed inline by the orchestrator instead. All 4 tasks committed atomically per D-07. No work lost.
