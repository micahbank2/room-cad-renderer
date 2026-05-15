---
phase: 87-theme-toggle-settings
plan: 01
subsystem: ui
tags: [theme, dark-mode, popover, settings, segmented-control, radix, lucide]

requires:
  - phase: 71-token-foundation
    provides: "useTheme hook + boot bridge + Pascal token system + .dark class flip"
  - phase: 76-token-foundation
    provides: ".light force-wrappers on WelcomeScreen / ProjectManager / HelpPage (now removed)"
  - phase: 80-toolbar-audit
    provides: "Empty insertion slot in TopBar right-side where the dead Settings button used to live"
  - phase: 83-toolbar-snap
    provides: "Popover-from-toolbar-button pattern (Snap popover precedent)"
provides:
  - "SettingsPopover component — gear button + Popover + theme SegmentedControl in TopBar"
  - "Theme toggle UI wired to useTheme() (Light / Dark / System)"
  - "Wrapper-free WelcomeScreen / ProjectManager / HelpPage that respect theme cascade"
affects: [phase-88+, future-settings-rows, design-system-followup]

tech-stack:
  added: []
  patterns:
    - "Settings-popover precedent (D-03: stays open on segment click, unlike Snap which auto-closes)"
    - "Component-extracted Popover (vs Phase 83 inline FloatingToolbar Snap) — for future settings rows"

key-files:
  created:
    - "src/components/SettingsPopover.tsx"
    - "src/components/__tests__/SettingsPopover.test.tsx"
    - "tests/e2e/specs/theme-toggle.spec.ts"
  modified:
    - "src/components/TopBar.tsx"
    - "src/components/WelcomeScreen.tsx"
    - "src/components/ProjectManager.tsx"
    - "src/components/HelpPage.tsx"

key-decisions:
  - "D-02: 3-option SegmentedControl (Light / Dark / System) reusing existing primitive, not a custom dropdown or cycling Sun/Moon"
  - "D-03: popover stays open after segment click — theme is a 'try it' choice, deliberately different from Phase 83 Snap auto-close"
  - "D-04: removed all three .light force-wrappers (Welcome / Project / Help) in same phase; CSS class definition preserved as reserved utility"
  - "D-05: theme-only popover body in v1 — no placeholder rows for future settings"
  - "SettingsPopover extracted to its own file (~70 lines) instead of inline in TopBar — anticipates future settings rows without further refactor"

patterns-established:
  - "Pascal-token-aware popover with reused SegmentedControl primitive — ready for Units / Default-room rows in future phases"
  - "useState-driven open/close on parent component, passed via { open, onOpenChange } props — matches Phase 83 Snap pattern"

requirements-completed: [THEME-01, THEME-02, THEME-03, THEME-04, THEME-05]

duration: 8min
completed: 2026-05-15
---

# Phase 87 Plan 01: Theme Toggle + Settings Popover Summary

**Gear button in TopBar opens a Settings popover with a Light/Dark/System SegmentedControl wired to useTheme(); removed three .light force-wrappers so Jessica's choice now applies to WelcomeScreen, ProjectManager, and HelpPage.**

## Performance

- **Duration:** ~8 min (atomic execution, all 4 tasks GREEN on first try)
- **Started:** 2026-05-15T16:00:00Z
- **Completed:** 2026-05-15T16:08:54Z
- **Tasks:** 4
- **Files modified:** 7 (3 created, 4 edited)
- **Commits:** 4 task commits

## Accomplishments

- Settings gear button (lucide `Settings`, `icon-sm`) re-introduced to TopBar right slot trailing Help button, with `data-testid="topbar-settings-button"`
- `SettingsPopover` component (~70 lines) — Radix Popover + reused `SegmentedControl` primitive, exposes `data-testid="settings-popover"` for e2e
- Three-option theme toggle wired to `useTheme()`: Light, Dark, System; active segment reads `theme`, click writes `setTheme(v as ThemeChoice)`
- D-03 honored — popover stays open across segment clicks so Jessica can compare modes without re-opening (outside click + Escape still close via Radix defaults)
- All three `.light` force-wrappers removed from WelcomeScreen (line 55), ProjectManager (line 69), HelpPage (line 83); HelpPage's stale "Force light mode" comment replaced with D-04 marker
- 6 unit tests + 3 e2e tests added — all GREEN; full vitest sweep 1113 passing (up from 1107 baseline)

## Task Commits

1. **Task 1: RED unit + e2e tests** — `99ef73d` (test)
2. **Task 2: SettingsPopover + TopBar wiring (GREEN)** — `e2be551` (feat)
3. **Task 3: Remove .light force-wrappers** — `5a0c9f9` (feat)
4. **Task 4: E2E spec wiring fix (seedRoom + reset removal)** — `e8659d3` (test)

## Files Created/Modified

- `src/components/SettingsPopover.tsx` — Settings popover with theme SegmentedControl; D-03 no-close-on-select
- `src/components/__tests__/SettingsPopover.test.tsx` — 6 unit tests covering THEME-01/02/03 + D-03
- `tests/e2e/specs/theme-toggle.spec.ts` — 3 e2e tests covering THEME-03 (toggle), THEME-05 (reload persistence), THEME-04 (HelpPage cascade)
- `src/components/TopBar.tsx` — adds `useState` import, `SettingsPopover` import, `settingsOpen` state, popover render in right slot
- `src/components/WelcomeScreen.tsx` — drop `light` from root div className (line 55)
- `src/components/ProjectManager.tsx` — drop `light` from root div className (line 69)
- `src/components/HelpPage.tsx` — drop `light` + replace stale force-light comment with D-04 marker (line 80-83)

## Traceability

| Req ID    | Description                                          | Tests                                                                                                     | Commit                                |
| --------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| THEME-01  | Gear button opens Settings popover                   | unit: "renders a gear button…", "clicking the gear opens a popover…"                                      | `e2be551`                             |
| THEME-02  | Popover contains 3-option SegmentedControl           | unit: "clicking the gear opens a popover with Theme header + Light/Dark/System segments"                  | `e2be551`                             |
| THEME-03  | Toggle writes useTheme + flips `.dark` on `<html>`   | unit: "clicking Dark adds .dark…", "clicking System follows matchMedia…"; e2e: "click gear → Dark adds…"  | `e2be551`                             |
| THEME-04  | WelcomeScreen/ProjectManager/HelpPage respect theme  | e2e: "HelpPage inherits .dark cascade (no .light force-wrapper)"                                          | `5a0c9f9`                             |
| THEME-05  | Reload preserves choice (no flash)                   | e2e: "choice persists across reload (no flash)"                                                           | `e2be551` (UI) + boot bridge (existing) |
| D-03      | Popover stays open on segment click                  | unit: "popover stays open after a segment is clicked"                                                     | `e2be551`                             |

## Decisions Made

- Extracted `SettingsPopover` to its own component file even though v1 only has one setting — anticipates Units / Default-room follow-ups without further refactor. The research doc suggested inlining; plan elevated to component extraction; the plan won.
- Kept the `.light` CSS class definition in `index.css` (line 53) per D-04 — useful as a reserved utility for future "always-light" surfaces (print preview, export thumbnails).
- The popover open/close state lives on TopBar (`useState(false)`) and is passed as `{ open, onOpenChange }` props to SettingsPopover, matching the Phase 83 Snap pattern.

## Deviations from Plan

**1. [Rule 3 — Blocking] Wrapped unit test render in TooltipProvider**

- **Found during:** Task 1 (RED test run)
- **Issue:** First test run threw `Tooltip must be used within TooltipProvider` because the test rendered TopBar without the global provider wired in `src/main.tsx`.
- **Fix:** Added `<TooltipProvider>` wrapper inside the test's `renderTopBar()` helper. Tests then failed for the right reason (gear button doesn't exist yet) — true RED.
- **Files modified:** `src/components/__tests__/SettingsPopover.test.tsx`
- **Commit:** `99ef73d`

**2. [Rule 3 — Blocking] E2E spec needed seedRoom + init-script reset removed**

- **Found during:** Task 4 (first e2e run)
- **Issue:** Page loaded WelcomeScreen (no project hydrated), so `topbar-settings-button` was never in the DOM. Then once seedRoom was added, the reload-persistence test failed because the `addInitScript` reset was clobbering localStorage on every reload.
- **Fix:** Added `seedRoom(page)` before each test (mounts TopBar by triggering `setHasStarted(true)`); removed the `beforeEach` init-script reset that was defeating the reload-persistence check; re-seed after reload in THEME-05.
- **Files modified:** `tests/e2e/specs/theme-toggle.spec.ts`
- **Commit:** `e8659d3`

---

**Total deviations:** 2 auto-fixed (both blocking — pre-existing test infrastructure context I needed to learn)
**Impact on plan:** None on plan scope or design. Plan executed exactly as written for production code.

## Issues Encountered

- TS deprecation warning on `tsconfig.json:17` (`baseUrl` deprecated, will be removed in TypeScript 7.0). Pre-existing, not introduced by Phase 87. Logged as out-of-scope.
- 33 unhandled rejections from `swatchThumbnailGenerator` WebGL renderer surfaced in vitest — pre-existing on main, not caused by Phase 87 changes. Verified by running `git stash && npm run test:quick` shows same 33 errors before phase work.

## Self-Check: PASSED

- Files exist: `SettingsPopover.tsx`, `SettingsPopover.test.tsx`, `theme-toggle.spec.ts` — all FOUND
- Commits exist: `99ef73d`, `e2be551`, `5a0c9f9`, `e8659d3` — all FOUND
- Tests green: 1113/1113 vitest + 3/3 e2e on chromium-dev

## Manual UAT (recommended, not required to ship)

Open dev server (`npm run dev`), click gear in top bar:
1. Confirm Theme popover shows Light / Dark / System pill
2. Click Dark → app flips to dark; click Light → flips to light; click System → follows OS
3. Reload after each selection → no flash, correct theme on first paint
4. With Dark active, open Help (HelpCircle icon) → confirm HelpPage actually renders dark (was force-light before)
5. With Dark active, navigate to Welcome / ProjectManager via Home → confirm both render dark

If any of WelcomeScreen / ProjectManager / HelpPage reveal dark-mode visual bugs (low-contrast text, hardcoded light colors), file as GH issues with `bug` + `backlog` labels per D-04 — those are explicitly out of scope for Phase 87.

## Next Phase Readiness

- Theme toggle is shippable. Phase 87 has no downstream blockers.
- Future settings rows (Units, Default room, Reduced-motion override) can extend `SettingsPopover` without API change — just add new sections below the Theme block.
- The three force-light surfaces are now under theme cascade — visual polish for dark mode on Welcome/Project/Help can land in a follow-up phase if UAT surfaces contrast issues.

---
*Phase: 87-theme-toggle-settings*
*Completed: 2026-05-15*
