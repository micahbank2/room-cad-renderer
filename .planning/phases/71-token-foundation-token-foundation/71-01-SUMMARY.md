---
phase: 71-token-foundation-token-foundation
plan: "01"
subsystem: design-system
tags: [tokens, fonts, theme, oklch, pascal, useTheme, test-driver]
dependency_graph:
  requires: ["71-00"]
  provides: ["pascal-token-foundation", "useTheme-hook", "themeDrivers"]
  affects: ["src/index.css", "src/hooks/useTheme.ts", "src/test-utils/themeDrivers.ts", "index.html", "src/main.tsx", "src/App.tsx"]
tech_stack:
  added: ["geist (npm)", "Barlow (Google Fonts)", "Geist Sans/Mono (Google Fonts)", "oklch CSS tokens"]
  patterns: ["Phase 64 acc2 identity-check cleanup", "useReducedMotion matchMedia pattern", "installXDrivers test gate"]
key_files:
  created: ["src/hooks/useTheme.ts", "src/test-utils/themeDrivers.ts"]
  modified: ["src/index.css", "index.html", "src/main.tsx", "src/App.tsx", "package.json"]
decisions:
  - "geist npm package is Next.js-only (imports next/font/local); used Google Fonts for Geist Sans/Mono instead — same font rendering, Vite-compatible"
  - "Preserved .material-symbols-outlined removal from index.css per D-A5 (D-33 policy superseded by v1.18)"
  - "Kept .cursor-crosshair/.cursor-grab canvas overrides (still needed by canvas tools)"
metrics:
  duration_seconds: 218
  completed_date: "2026-05-07"
  tasks_completed: 3
  files_modified: 6
---

# Phase 71 Plan 01: Token Foundation — Tokens, Fonts, Radius Summary

Pascal oklch token system + Barlow/Geist fonts + `useTheme` hook + `__driveTheme` test driver; all 14 Wave 0 RED tests now GREEN.

## What Was Built

### Task 1: Pascal tokens + geist install
- Rewrote `src/index.css` entirely: replaced Obsidian CAD dark-blue palette with Pascal neutral oklch system
- `:root` defines 16 semantic tokens (light mode); `.dark` overrides for dark mode
- `--radius: 0.625rem` base with `--radius-sm/md/lg/xl` calc-derived variants
- `.rounded-smooth`, `.rounded-smooth-md/lg/xl` squircle utilities (Safari WebKit progressive enhancement)
- `--font-sans: 'Barlow', 'Geist Sans'` + `--font-mono: 'Geist Mono'`
- Deleted: all `--color-obsidian-*`, `--color-text-*`, `--color-accent-*` Obsidian tokens; `.glass-panel`, `.accent-glow`, `.cad-grid-bg`, `.ghost-border`, `.material-symbols-outlined` class definitions
- Installed `geist` npm package (for woff2 font assets; Next.js import shim not used — see Deviations)
- `npm run build` green

### Task 2: index.html update
- Removed Material Symbols stylesheet link (D-A5/D-16)
- Added Google Fonts preconnect + Barlow + Geist Sans + Geist Mono links
- Renamed title from `OBSIDIAN_CAD` to `Room CAD Renderer` (D-09)
- Added inline boot script: reads `room-cad-theme` from localStorage, applies `dark` class to `<html>` before React mounts — prevents flash-of-light-mode (D-07)

### Task 3: useTheme hook + themeDrivers driver
- `src/hooks/useTheme.ts`: `ThemeChoice = "light"|"dark"|"system"`, `ResolvedTheme = "light"|"dark"`. Reads localStorage on init, subscribes to `prefers-color-scheme` media query, applies/removes `dark` class on `document.documentElement`. Cleans up media listener on unmount.
- `src/test-utils/themeDrivers.ts`: `registerThemeSetter(fn)` with Phase 64 acc2 identity-check cleanup. `installThemeDrivers()` gated by `import.meta.env.MODE === "test"`.
- `src/main.tsx`: added `import { installThemeDrivers }` + `installThemeDrivers()` call
- `src/App.tsx`: `const { setTheme } = useTheme()` + `useEffect(() => registerThemeSetter(setTheme), [setTheme])`

## Test Results

```
tests/useTheme.test.tsx   — 8/8 passed (RED → GREEN)
tests/themeDriver.test.tsx — 6/6 passed (RED → GREEN)
Total: 14/14 tests GREEN
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] geist npm package is Next.js-only**
- **Found during:** Task 3 implementation (verifying `import 'geist/font/sans'`)
- **Issue:** `node_modules/geist/dist/sans.js` imports from `next/font/local` — running this in Vite crashes the build
- **Fix:** Load Geist Sans and Geist Mono via Google Fonts in `index.html` instead (same typeface, Vite-compatible). The geist npm package was still installed (woff2 assets are available for future direct @font-face use). The `import 'geist/font/sans'` call from the plan's acceptance criteria was omitted to keep the build green.
- **Files modified:** `index.html` (added Geist Google Fonts links)
- **Commits:** 3ec78da, 3f92e5a

## What Is NOT Done Yet (Intentional)

Plans 71-02 through 71-05 will sweep existing component files to replace:
- `bg-obsidian-*` / `text-text-*` / `bg-accent/10` Tailwind class usages
- Material Symbols `<span>` elements → Lucide icons (D-A5)
- UPPERCASE_SNAKE label strings → mixed case (D-09)
- Old font-class usages (`font-display`, `font-body`, `font-mono` referencing old fonts)

The CSS tokens are defined; the components are not yet migrated.

## Known Stubs

None — this plan is infrastructure only. No UI components were modified.

## Self-Check: PASSED

- src/hooks/useTheme.ts: FOUND
- src/test-utils/themeDrivers.ts: FOUND
- Commit 321da53 (tokens): FOUND
- Commit 3ec78da (index.html): FOUND
- Commit 3f92e5a (hook+driver): FOUND
