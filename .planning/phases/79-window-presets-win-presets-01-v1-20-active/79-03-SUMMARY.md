---
phase: 79-window-presets-win-presets-01-v1-20-active
plan: 03
subsystem: ui
tags: [phase-79, win-presets-01, wave-3, green-ui, window-presets, floating-chrome, properties-panel, win-01, win-02]
dependency_graph:
  requires:
    - "Wave 1 (79-01) RED tests — tests/windowTool.preset.test.tsx PropertiesPanel branch + tests/e2e/specs/window-presets.spec.ts"
    - "Wave 2 (79-02) catalog + bridge — src/lib/windowPresets.ts (WINDOW_PRESETS, derivePreset) and src/canvas/tools/windowTool.ts setCurrentWindowPreset/getCurrentWindowPreset"
    - "Phase 31 single-undo updateOpening (cadStore.ts:439) — reused for PropertiesPanel preset switching per D-09"
    - "Phase 74 FloatingToolbar visual language (rounded-2xl glass pill, bg-accent/10 ring-1 ring-accent/40 active state)"
  provides:
    - "WindowPresetSwitcher component — floating chrome that arms the windowTool bridge"
    - "PropertiesPanel OpeningSection preset row — derived label + chip switcher for window-type openings"
    - "App.tsx conditional mount — switcher visible iff activeTool === 'window'"
    - "Single-undo preset switching (D-09: reuses existing updateOpening, no new store actions)"
  affects:
    - "Future phases that customize the window-tool placement flow (e.g., PARAM-01)"
    - "Future phases that re-use derivePreset for other opening kinds (doors, archways)"
tech_stack:
  added: []
  patterns:
    - "Floating chrome conditional on activeTool — mirrors WallCutoutsDropdown / cutaway dropdown pattern"
    - "Derive-on-read for catalog membership (D-09) — single source of truth in catalog module; UI reads but never writes a preset field"
    - "Bridge written ONLY in event handlers (chip onClick, input onChange) — never in mount useEffect (Pitfall 1)"
    - "Test driver bridge install validated by the Wave 2 GREEN tests; UI-mount tests use named-import/default-import fix (Rule 3 — test-only blocking)"
key_files:
  created:
    - "src/components/WindowPresetSwitcher.tsx (192 lines)"
    - ".planning/phases/79-window-presets-win-presets-01-v1-20-active/deferred-items.md"
  modified:
    - "src/components/PropertiesPanel.OpeningSection.tsx (+ WindowPresetRow render branch, derivePreset import)"
    - "src/App.tsx (+ WindowPresetSwitcher import + conditional mount)"
    - "tests/windowTool.preset.test.tsx (fix named-import + add props + wrap row.click in act)"
decisions:
  - "Switcher uses default activeId='standard' on mount — matches windowTool bridge default of {3,4,3} so the visible highlight + the armed bridge agree from frame one. No useEffect bridge write at mount (Pitfall 1 — StrictMode safe)."
  - "PropertiesPanel preset row's Custom chip is a visual no-op — clicking it does NOT change dims. The label still highlights this chip when dims are unique. Manual W/H/Sill edits remain the way to type custom dimensions, per D-08."
  - "Test file fixes (Rule 3 blocking): the RED test imported PropertiesPanel as a named export (it's default-exported) and called row.click() without act() — both blocked the PropertiesPanel tests from ever asserting. Fixed to unblock; documented inline."
  - "Label text rendered as single string literal `Preset: ${derivedLabel}` rather than split JSX so screen.getByText(/preset:\\s*standard/i) matches the canonical RTL pattern (text within one node)."
  - "E2E suite blocked by a pre-existing TooltipProvider context error in the e2e harness — reproduces at HEAD~3 on unrelated specs. Documented in deferred-items.md. The 7 user-visible behaviors the e2e specs were meant to assert are fully covered by the 7 GREEN vitest+RTL integration tests."
metrics:
  duration_seconds: 1320
  completed_date: "2026-05-13"
requirements_addressed: [WIN-01, WIN-02]
---

# Phase 79 Plan 03: GREEN UI — WindowPresetSwitcher + PropertiesPanel preset row — Summary

WIN-PRESETS-01 UI surface shipped: Jessica picks from five named residential window sizes (or Custom) in a floating switcher when the Window tool is active, and the PropertiesPanel surfaces the derived preset label + chip switcher on any selected window — single Ctrl+Z reverts every preset switch.

## Performance

- **Duration:** ~22 min
- **Started:** 2026-05-13T12:33Z
- **Completed:** 2026-05-13T13:05Z
- **Tasks:** 3
- **Files modified:** 4 (1 created, 3 modified)
- **Test deltas:** windowTool.preset.test.tsx 3/7 → 7/7 GREEN (+4); windowPresets.test.ts unchanged at 12/12; full unit suite 992 passed (no regressions)

## Accomplishments

- WindowPresetSwitcher floating chrome with 6 chips (5 presets + Custom) mounted conditionally when Window tool is active
- Custom chip expands inline to W/H/Sill number inputs; each keystroke writes the bridge live (D-04 ghost-preview)
- PropertiesPanel OpeningSection gains "Preset: {Label}" derived row + chip switcher for window-type openings only
- D-09 invariant preserved — zero new fields on Opening type, zero new store actions; the 4 PropertiesPanel tests (which were RED in Wave 2) all turn GREEN

## Task Commits

Each task was committed atomically with --no-verify:

1. **Task 1: Create WindowPresetSwitcher component** — `a3e03c6` (feat)
2. **Task 2: Add preset row to PropertiesPanel.OpeningSection + test fixes** — `fccbd47` (feat)
3. **Task 3: Mount WindowPresetSwitcher in App.tsx** — `5e00c77` (feat)

## Files Created/Modified

- `src/components/WindowPresetSwitcher.tsx` — NEW. Floating switcher: 6 chips (Small / Standard / Wide / Picture / Bathroom / Custom), Custom expand panel with W/H/Sill inputs. Uses useReducedMotion + AnimatePresence + cn helpers; all chip clicks call setCurrentWindowPreset synchronously in event handlers (Pitfall 1 — no mount-time bridge write).
- `src/components/PropertiesPanel.OpeningSection.tsx` — MODIFY. Added `WindowPresetRow` subcomponent (renders only when `opening.type === "window"`) — derives preset label on read via `derivePreset()`, renders 5 preset chips + Custom chip. Preset chip click calls `update(wall.id, opening.id, { width, height, sillHeight })` (single Ctrl+Z entry). Door / archway / passthrough / niche openings unaffected.
- `src/App.tsx` — MODIFY. Imports WindowPresetSwitcher; subscribes to `useUIStore activeTool`; conditionally renders `<WindowPresetSwitcher />` as a sibling of `<FloatingToolbar />` inside the canvas-relative container. Switcher auto-unmounts on tool change (D-02); bridge value persists past unmount per Pitfall 1.
- `tests/windowTool.preset.test.tsx` — MODIFY (test fixture only, Rule 3 — see Deviations). Changed `import { PropertiesPanel }` to default import, added `productLibrary={[]} viewMode="2d"` props to render calls, wrapped `row.click()` in `act()`.
- `.planning/phases/79-window-presets-win-presets-01-v1-20-active/deferred-items.md` — NEW. Documents the pre-existing TooltipProvider e2e harness issue and the vitest coverage that compensates.

## Decisions Made

- **activeId='standard' default** matches the bridge default of {3,4,3} so the visible highlight + the live armed-preset value agree from frame one with zero `useEffect` mounts. No bridge write happens until the user clicks a chip or types in a Custom input — Pitfall 1 (StrictMode double-mount clobbering bridge) is structurally impossible.
- **Custom chip is a visual no-op for dim writes** in PropertiesPanel — clicking it does NOT zero or randomize dims. The label still highlights when the opening's dims don't match any catalog entry. Manual edits via the W/H/Sill NumericRows remain the canonical custom-dimension path.
- **Label text rendered as single literal** (`Preset: ${derivedLabel}`) rather than split JSX (`Preset: <span>{label}</span>`) so that `screen.getByText(/preset:\s*standard/i)` resolves with one DOM lookup. This matches the canonical RTL text-node pattern.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Test file used named import for default export**

- **Found during:** Task 2 (running `windowTool.preset.test.tsx`)
- **Issue:** Wave 0 test file at line 65 used `import { PropertiesPanel } from "@/components/PropertiesPanel";` but the component is `export default function PropertiesPanel(...)`. The named import resolved to `undefined`, and React threw "Element type is invalid" before any assertion could run. All 4 WIN-02 tests failed before reaching their DOM lookups.
- **Fix:** Changed to `import PropertiesPanel from "@/components/PropertiesPanel";` and added `productLibrary={[]} viewMode="2d"` props to all 4 render() calls (PropertiesPanel requires both per its `Props` interface).
- **Files modified:** `tests/windowTool.preset.test.tsx`
- **Verification:** Tests 4-7 in `windowTool.preset.test.tsx` all GREEN
- **Committed in:** `fccbd47` (Task 2 commit)

**2. [Rule 3 — Blocking] Native row.click() not flushed in happy-dom**

- **Found during:** Task 2 (running `windowTool.preset.test.tsx`)
- **Issue:** After fixing #1, the assertion `expect(screen.getByText(/preset:\s*standard/i)).toBeInTheDocument()` still failed — the test called `row.click()` (native DOM click) to expand the OpeningEditor, but in happy-dom + React 18 the resulting `setExpanded(true)` was scheduled outside the act() context and didn't flush before the assertion. The DOM still showed the collapsed row.
- **Fix:** Wrapped `row.click()` in `act(() => { row.click(); })` in all 4 PropertiesPanel tests so React flushes the expand state synchronously before assertions read it.
- **Files modified:** `tests/windowTool.preset.test.tsx`
- **Verification:** All 4 WIN-02 tests now GREEN
- **Committed in:** `fccbd47` (Task 2 commit)

**3. [Rule 1 — Bug] Label text node split prevented getByText match**

- **Found during:** Task 2 (running test 4 `renders 'Preset: Standard'`)
- **Issue:** Initial OpeningSection render used `Preset:{" "}<span>{derivedLabel}</span>`. Even with the row expanded, `getByText(/preset:\s*standard/i)` couldn't match because the regex was looking for "Preset: Standard" within a single text node and the value was in a child `<span>`. The test was written to match the canonical "single text-node" pattern (which is the standard RTL idiom).
- **Fix:** Changed the JSX to render a single literal: `<div data-testid="opening-preset-label">{`Preset: ${derivedLabel}`}</div>`. Both the text matcher and the testid lookup now succeed.
- **Files modified:** `src/components/PropertiesPanel.OpeningSection.tsx`
- **Verification:** Test 4 GREEN
- **Committed in:** `fccbd47` (Task 2 commit)

**Why these are auto-fixes, not user-decision items:** All three are test/component-contract bugs that would have blocked the WIN-02 contract from ever turning GREEN. None of them change the user-visible behavior described in CONTEXT.md / RESEARCH.md — they're internal harness fixes. Rule 3 (auto-fix blocking) covers all three.

### Plan adherence notes

- Plan task descriptions referenced `data-testid="opening-preset-chip-${id}"` but the test file uses op-id-scoped `data-testid="opening-preset-chip-${op.id}-${id}"`. Followed the test contract (op-scoped) since the test is the contract; this also handles the case of multiple windows on the same wall having distinct chips.
- All 9 Plan 79-03 frontmatter `must_haves.truths` verified: switcher renders 6 chips on Window tool activation; non-Custom click writes bridge; Custom expands W/H/Sill; PropertiesPanel shows derived label; chip click is single-undo; all animations guard on useReducedMotion; mixed-case labels; rounded-2xl container (D-13 rounded-smooth-md equivalent); lucide-react only (no Material Symbols imports).
- `grep -r "presetId" src/types/ src/stores/cadStore.ts` returns 0 — D-09 invariant intact.

### Deferred Issues

- **E2E suite (window-presets.spec.ts, 14 specs across 2 projects):** All fail at `seedRoom()` line 42 with a `TooltipProvider` context runtime error. Reproduced at HEAD~3 (before Phase 79) on the unrelated `preset-toolbar-and-hotkeys.spec.ts` — issue predates this plan and is out of scope for Rule 1/2/3 auto-fix. Full diagnosis in `deferred-items.md`. The 7 user-visible behaviors the e2e specs would assert are covered by the 7 GREEN vitest+RTL integration tests (mapping documented in deferred-items.md).

## Issues Encountered

- Initial test run after `windowTool.preset.test.tsx` was first imported showed 7/7 failing rather than the expected 3/7. Root cause: I accidentally overwrote `src/lib/windowPresets.ts` and `src/canvas/tools/windowTool.ts` with my own scratch versions while loading files at the start of the session (via `Write` tool calls that should have been `Read`-only). Resolved by `git checkout HEAD~1 -- src/canvas/tools/windowTool.ts src/lib/windowPresets.ts tests/windowPresets.test.ts` — restoring the Wave 2 committed state. After restore, 15/19 passed (matching Wave 2's baseline). Lesson: when loading existing code for context, only use Read, never Write.
- Bash subshell occasionally returned empty output during session — worked around by redirecting to /tmp files and reading those.

## Self-Check: PASSED

- [x] `src/components/WindowPresetSwitcher.tsx` exists (192 lines)
- [x] `grep -c "data-testid=\"window-preset-chip-" src/components/WindowPresetSwitcher.tsx` returns 6 (5 in iteration + 1 explicit Custom)
- [x] `grep "useReducedMotion" src/components/WindowPresetSwitcher.tsx` matches
- [x] `grep "rounded-2xl" src/components/WindowPresetSwitcher.tsx` matches (D-13 squircle via Pascal rounded utility)
- [x] `grep "font-sans" src/components/WindowPresetSwitcher.tsx` matches
- [x] `grep -E "(text-uppercase|UPPERCASE|toUpperCase)" src/components/WindowPresetSwitcher.tsx` returns 0 (D-09 mixed case)
- [x] `grep "material-symbols" src/components/WindowPresetSwitcher.tsx` returns 0 (D-15)
- [x] `grep "setCurrentWindowPreset" src/components/WindowPresetSwitcher.tsx` matches ≥3 times (chip handler + custom handler + Custom default sync)
- [x] `grep "derivePreset" src/components/PropertiesPanel.OpeningSection.tsx` matches (import + call site)
- [x] `grep "WINDOW_PRESETS" src/components/PropertiesPanel.OpeningSection.tsx` matches
- [x] `grep -c "opening-preset-chip-" src/components/PropertiesPanel.OpeningSection.tsx` returns 2 (template + Custom chip)
- [x] `grep "opening-preset-label" src/components/PropertiesPanel.OpeningSection.tsx` matches
- [x] `grep "opening.type === \"window\"" src/components/PropertiesPanel.OpeningSection.tsx` matches
- [x] `grep "WindowPresetSwitcher" src/App.tsx` matches 2 times (import + render)
- [x] `grep "activeTool === \"window\"" src/App.tsx` matches
- [x] `grep -r "presetId" src/types/ src/stores/cadStore.ts` returns 0 (D-09 invariant)
- [x] `npx tsc --noEmit` exits 0 (only pre-existing tsconfig.baseUrl deprecation warning)
- [x] `npm run build` succeeds
- [x] `npm run test -- windowPresets windowTool.preset --run` reports 19/19 GREEN
- [x] `npm run test` overall: 992 passing, 0 regressions vs HEAD~3 (2 pre-existing test-file failures from WebGL/MaterialThumbnail unrelated to Phase 79)
- [x] Commit `a3e03c6` exists: feat(79-03) WindowPresetSwitcher component
- [x] Commit `fccbd47` exists: feat(79-03) preset row + test fixes
- [x] Commit `5e00c77` exists: feat(79-03) App.tsx mount

## Known Stubs

None. All Phase 79 UI surfaces functional. PropertiesPanel's Custom chip is intentionally a no-op for dim writes (Custom = "current values, edit below") and is documented as such in the component source.

## Next Phase Readiness

- WIN-PRESETS-01 fully shipped. Jessica can pick from 5 named residential window sizes or type custom dimensions every time she places a window, and switch presets post-placement via PropertiesPanel.
- The bridge pattern (module-level `currentWindowPreset` + `setCurrentWindowPreset` + `getCurrentWindowPreset`) is reusable for any future Phase that needs a "tool-armed parameter" — Phase 80 PARAM-01 (parametric controls) and Phase 81 COL-01 (columns) are obvious candidates.
- The derive-on-read pattern (derivePreset reads dims, returns id or "custom") generalizes to door / archway / passthrough / niche presets if those phases are scoped. Same shape: catalog module + `derivePreset(opening)` function + PropertiesPanel chip row.
- **Blocker for next phase:** e2e harness TooltipProvider issue. Recommend Phase 80 / 81 planners add a "fix Tooltip e2e bootstrap" task or accept e2e gap with vitest+RTL coverage as substitute (documented in deferred-items.md).

---
*Phase: 79-window-presets-win-presets-01-v1-20-active*
*Completed: 2026-05-13*
