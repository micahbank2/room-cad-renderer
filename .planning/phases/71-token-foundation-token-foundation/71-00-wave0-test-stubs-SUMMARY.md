---
phase: 71-token-foundation-token-foundation
plan: "00"
subsystem: test-scaffolding
tags: [tdd, theme, useTheme, test-driver, wave-0]
dependency_graph:
  requires: []
  provides: [tests/useTheme.test.tsx, tests/themeDriver.test.tsx]
  affects: [71-01-wave1-theme-hook-PLAN.md]
tech_stack:
  added: []
  patterns: [tdd-red-green, phase-64-acc2-identity-check, useReducedMotion-mirror]
key_files:
  created:
    - tests/useTheme.test.tsx
    - tests/themeDriver.test.tsx
  modified: []
decisions:
  - "Tests import from non-existent modules intentionally — RED state is the contract lock"
  - "useTheme tests mirror useReducedMotion matchMedia pattern with vi.fn() mock shape"
  - "themeDriver Test 5 manually simulates StrictMode double-mount to verify identity-check invariant"
metrics:
  duration: "~6 minutes"
  completed: "2026-05-07"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 71 Plan 00: Wave 0 Test Stubs Summary

One-liner: RED test scaffold for `useTheme` hook and `__driveTheme` test driver locking the full behavioral contract before any implementation exists.

## What Was Built

Two new test files that define the complete behavioral contract for Phase 71's theme infrastructure. Both files import modules that do not yet exist, producing "Failed to resolve import" errors on every run. That failure is intentional — it is the contract lock.

### tests/useTheme.test.tsx (8 tests)

| Test | Behavior Locked |
|------|----------------|
| 1 | Default theme is `"system"` when localStorage is empty |
| 2 | `setTheme("dark")` writes `"dark"` to localStorage key `room-cad-theme` and resolved becomes `"dark"` |
| 3 | `setTheme("light")` writes `"light"`, resolved is `"light"`, html does NOT have class `"dark"` |
| 4 | `setTheme("system")` + matchMedia `matches:true` → resolved is `"dark"`, html has class `"dark"` |
| 5 | `setTheme("system")` + matchMedia `matches:false` → resolved is `"light"`, html does NOT have `"dark"` |
| 6 | `prefers-color-scheme` change event fires → resolved updates without explicit setTheme call |
| 7 | Initial render reads stored `"light"` from localStorage → resolved is `"light"` on first render |
| 8 | matchMedia event listener is removed on unmount (identity-check: same fn ref added and removed) |

### tests/themeDriver.test.tsx (6 tests)

| Test | Behavior Locked |
|------|----------------|
| 1 | Outside test mode, `installThemeDrivers()` does NOT install `window.__driveTheme` |
| 2 | In test mode (`MODE === "test"`), `installThemeDrivers()` installs `window.__driveTheme` |
| 3 | `__driveTheme("dark")` invokes registered setter and adds `"dark"` class |
| 4 | `__driveTheme("light")` invokes registered setter and removes `"dark"` class |
| 5 | StrictMode double-mount: fn A registered + fn A cleanup called → fn B is live; `__driveTheme` uses fn B |
| 6 | Unregister via returned cleanup only nulls setter if identity matches (wrong fn reference → no-op) |

## RED Proof

Both test files fail with:

```
Error: Failed to resolve import "@/hooks/useTheme" from "tests/useTheme.test.tsx". Does the file exist?
Error: Failed to resolve import "@/test-utils/themeDrivers" from "tests/themeDriver.test.tsx". Does the file exist?
```

Exit codes: non-zero for both. This is the expected and required state for Wave 0.

## Contract Surface Locked

- Storage key: `"room-cad-theme"` (literal, referenced in both ≥2 tests)
- ThemeChoice values: `"light" | "dark" | "system"`
- Hook signature: `{ theme: ThemeChoice; resolved: ResolvedTheme; setTheme: (t: ThemeChoice) => void }`
- html class toggle: `document.documentElement.classList.add/remove("dark")`
- Driver registration: `registerThemeSetter(fn) → () => void` (identity-checked cleanup)
- Driver install: `installThemeDrivers()` — no-op in production, installs `window.__driveTheme` in test
- StrictMode safety: Phase 64 acc2 identity-check pattern

## Handoff to Plan 71-01

Plan 71-01 implements:
- `src/hooks/useTheme.ts` — turns `tests/useTheme.test.tsx` GREEN
- `src/test-utils/themeDrivers.ts` — turns `tests/themeDriver.test.tsx` GREEN

No source files were created or modified in Plan 00. Zero risk of conflicts with other Wave A plans.

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 — useTheme.test.tsx | f890eb1 | test(71-00): add failing useTheme.test.tsx (Wave 0 RED contract) |
| 2 — themeDriver.test.tsx | 6cff3ef | test(71-00): add failing themeDriver.test.tsx (Wave 0 RED contract) |

## Self-Check: PASSED
