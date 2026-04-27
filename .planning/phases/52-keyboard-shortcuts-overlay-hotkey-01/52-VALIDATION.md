# Phase 52 — Validation Plan

**Phase:** 52-keyboard-shortcuts-overlay-hotkey-01
**Requirement:** HOTKEY-01

---

## Test Files

| File | Type | Framework | Created by |
|------|------|-----------|------------|
| `tests/lib/shortcuts.registry.test.ts` | Unit | Vitest | Task 1 |
| `e2e/keyboard-shortcuts-overlay.spec.ts` | E2E | Playwright | Task 4 |

---

## Unit Tests — tests/lib/shortcuts.registry.test.ts

### Commands

```bash
# Run in isolation
npx vitest run tests/lib/shortcuts.registry.test.ts

# Run full vitest suite (check no regressions)
npx vitest run
```

### Assertions

| Test name | Assertion | Failure signal |
|-----------|-----------|----------------|
| `SHORTCUT_DISPLAY_LIST contains all keyboard handler branches` | `SHORTCUT_DISPLAY_LIST.map(s => s.action)` contains each of the 18 EXPECTED_ACTIONS strings | Missing registry entry — developer added hotkey to App.tsx but forgot shortcuts.ts |
| `modifier-gated Copy entry precedes bare-key Ceiling entry` | `copyIdx < ceilingIdx` in SHORTCUT_DISPLAY_LIST | Iteration-order invariant violated — Ctrl+C would fire Ceiling tool |
| `modifier-gated Paste entry precedes bare-key Select entry` | `pasteIdx < selectIdx` in SHORTCUT_DISPLAY_LIST | Iteration-order invariant violated — Ctrl+V would fire Select tool |

### EXPECTED_ACTIONS list (hardcoded in test)

```
"Select tool"
"Wall tool"
"Door tool"
"Window tool"
"Ceiling tool"           ← was missing
"Reset canvas view"      ← was missing
"Toggle walk/orbit camera"
"Camera preset: Eye level"   ← was missing
"Camera preset: Top down"    ← was missing
"Camera preset: 3/4 view"    ← was missing
"Camera preset: Corner"      ← was missing
"Copy selected"          ← was missing
"Paste"                  ← was missing
"Undo"
"Redo"
"Delete selected"
"Cycle to next room"
"Open keyboard shortcuts"
```

---

## E2E Tests — e2e/keyboard-shortcuts-overlay.spec.ts

### Commands

```bash
# Run the spec in isolation
npx playwright test e2e/keyboard-shortcuts-overlay.spec.ts --project=chromium-dev

# List tests without running
npx playwright test e2e/keyboard-shortcuts-overlay.spec.ts --list

# Run full e2e suite (regression check)
npx playwright test e2e/ --project=chromium-dev
```

### Scenarios

| Test name | Steps | Pass condition |
|-----------|-------|---------------|
| `? opens HelpModal to shortcuts section` | Press `?` | `page.getByText("SHORTCUTS")` visible within 2s |
| `Escape closes the modal` | Press `?`, then `Escape` | "SHORTCUTS" text not visible after Escape |
| `backdrop click closes the modal` | Press `?`, then `page.mouse.click(10, 10)` | "SHORTCUTS" text not visible after click |
| `? is inert when a text input has focus` | Focus `input[type="number"]`, press `?` | "SHORTCUTS" text NOT visible (modal did not open) |
| `reduced-motion: modal opens instantly` | `page.emulateMedia({reducedMotion:"reduce"})`, press `?`, measure elapsed | Elapsed < 200ms (HelpModal has no animation) |

---

## TypeScript Gate

```bash
npx tsc --noEmit
```

Must exit 0. No new TypeScript errors allowed.

---

## Regression Coverage

| Phase | Spec | Regression risk |
|-------|------|-----------------|
| Phase 35 | Camera presets 1-4 fire in 3D view | buildRegistry must preserve CAM-01 guard chain |
| Phase 31 | Ctrl+C copies, Ctrl+V pastes | Iteration-order invariant: modifier entries before bare-key entries |
| Phase 49 | `e2e/wall-user-texture-first-apply.spec.ts` | App.tsx refactor must not break unrelated keyboard listeners |
| Phase 50 | `e2e/wallpaper-2d-3d-toggle.spec.ts` | Same |
| All | `HelpModal` section navigation | helpContent.tsx SHORTCUTS alias must be shape-compatible |

### Full regression command

```bash
npx playwright test e2e/ --project=chromium-dev
```

---

## Wave 0 Gaps (must be created before non-test tasks rely on them)

Both test files are created in Task 1 and Task 4 (unit) / Task 4 (e2e).
Task 2 and Task 3 verify against the unit test after modifying App.tsx and helpContent.tsx.

| File | Created in | Used in |
|------|------------|---------|
| `tests/lib/shortcuts.registry.test.ts` | Task 1 | Task 2 verify, Task 3 verify |
| `e2e/keyboard-shortcuts-overlay.spec.ts` | Task 4 | Final verification |
