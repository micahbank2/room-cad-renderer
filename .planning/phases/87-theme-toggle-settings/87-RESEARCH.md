# Phase 87: Theme Toggle + Settings Popover — Research

**Researched:** 2026-05-15
**Domain:** Frontend UI — theme switching, settings affordance
**Confidence:** HIGH

## Summary

All infrastructure exists. Phase 71 (v1.18) shipped `useTheme()` (light/dark/system with localStorage + matchMedia), the boot-bridge script in `index.html` (handles system mode correctly via `prefers-color-scheme`), a test driver (`__driveTheme`), and a `.dark` class flip on `<html>`. Phase 76 added force-`.light` wrappers on three components (WelcomeScreen, ProjectManager, HelpPage) and shipped without the toggle. Phase 80 deleted the dead Settings gear button. Phase 83 established the canonical Popover-anchored-to-toolbar-button pattern (Snap popover in `FloatingToolbar.tsx`).

This phase needs ~four file changes: re-add the gear button in `TopBar`, build `SettingsPopover` body using existing `SegmentedControl`, remove three `.light` wrappers, optional CSS comment update. No new dependencies. No state plumbing — `useTheme()` is self-contained.

**Primary recommendation:** Single plan, ~4 tasks. Use existing `SegmentedControl` for Light/Dark/System. Remove all three `.light` wrappers in the same phase (WelcomeScreen, ProjectManager, HelpPage — the third is not in the brief but exists at `HelpPage.tsx:83`).

## Project Constraints (from CLAUDE.md)

- **D-09 UI labels:** mixed case for chrome — "Theme", "Light", "Dark", "System"
- **D-33 icons:** lucide-react only — use `Settings` from lucide
- **D-13 squircle:** Popover already applies `rounded-smooth-lg` via primitive
- **§7 StrictMode-safe useEffect cleanup:** any new module-level state must use identity-checked cleanup. `useTheme` already follows this; new Popover state is local React state (no concern)
- **Pascal token system (Phase 71):** use `bg-card`, `text-foreground`, `border-border`, `bg-accent/10` — NO `bg-obsidian-*` or `text-text-*`
- **No emojis in code**

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| THEME-01 | Gear icon button in TopBar right slot opens Settings popover | TopBar.tsx has exact insertion site at line 211 (where dead button comment lives); Popover primitive ready |
| THEME-02 | Popover body contains Theme segmented control (Light / Dark / System) | `SegmentedControl` exists at `src/components/ui/SegmentedControl.tsx`; iOS-style with motion pill |
| THEME-03 | Toggle wired to `useTheme().theme` + `setTheme()`, persists via localStorage | `useTheme()` already complete with localStorage + matchMedia |
| THEME-04 | WelcomeScreen, ProjectManager (and HelpPage) respect user theme — drop `.light` force-wrappers | Wrappers found at WelcomeScreen.tsx:55, ProjectManager.tsx:69, HelpPage.tsx:83 |
| THEME-05 | First-paint matches stored choice (no flash) | Boot-bridge `<script>` in index.html lines 10–18 already correct |

## Current State

### `useTheme()` hook (`src/hooks/useTheme.ts`, 55 lines)
Full API surface:
- **Returns:** `{ theme: "light" | "dark" | "system", resolved: "light" | "dark", setTheme: (t) => void }`
- **`theme`** — user's stored choice (lazy-read from `localStorage["room-cad-theme"]`, defaults to `"system"`)
- **`resolved`** — computed: if `theme === "system"`, follows `matchMedia("(prefers-color-scheme: dark)")`; else equals `theme`
- **`setTheme`** — writes to localStorage (with quota try/catch) + setState
- Effect applies/removes `<html class="dark">` whenever `resolved` changes
- Effect subscribes to `matchMedia` change events for live OS-pref updates
- **Default for new users:** `"system"` (line 23) — no override needed

### Boot bridge (`index.html` lines 10–18) — VERIFIED CORRECT
```js
var t = localStorage.getItem('room-cad-theme') || 'system';
var dark = t === 'dark' || (t === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
if (dark) document.documentElement.classList.add('dark');
```
Handles system mode via `prefers-color-scheme`. No flash on reload. No change needed.

### Dead Settings button site (`src/components/TopBar.tsx` lines 211–212)
```tsx
{/* Phase 80 audit removal: Settings button had no onClick handler — dead.
    Re-introduce when the theme/settings drawer ships (tracked in v1.21 backlog). */}
```
Insertion point clearly marked. Gear sits after the Help button (line 196–209) in the right slot. No vertical separator before it (Help is the trailing element today).

### Popover primitive (`src/components/ui/Popover.tsx`, 40 lines)
- Re-exports `Popover` (Root), `PopoverTrigger`
- Custom `PopoverContent` — z-50, w-72, `rounded-smooth-lg`, `border-border`, `bg-card`, `p-4`, `shadow-md`, fade+zoom animations, side-aware slide
- Radix handles Escape + outside-click close automatically
- Used in `FloatingToolbar.tsx` (Snap popover) — canonical precedent

### SegmentedControl primitive (`src/components/ui/SegmentedControl.tsx`, 72 lines) — PERFECT FIT
- Props: `value`, `onValueChange`, `options: { value, label }[]`, `className`
- iOS-style with sliding `motion.div` pill (layoutId animates between segments)
- Respects `useReducedMotion()`
- `role="group"` + per-button `role="radio"` + `aria-checked` — a11y correct out of the box
- `bg-muted/50` track, active segment gets `bg-card` shadow

### `.light` force-wrapper sites (3 total)
| File | Line | Wrapper |
|------|------|---------|
| `src/components/WelcomeScreen.tsx` | 55 | `<div className="light h-full flex flex-col bg-background">` |
| `src/components/ProjectManager.tsx` | 69 | `<div className="light space-y-3">` |
| `src/components/HelpPage.tsx` | 83 | `<div className="light min-h-screen bg-background text-foreground flex flex-col font-sans">` |

CSS definition: `src/index.css` line 53 — `.light { ... oklch tokens ... }`. The class itself can stay (in case it's useful as a utility for "always-light" surfaces later), but all three call sites should drop the `light ` prefix.

### Test driver (`src/test-utils/themeDrivers.ts`, 43 lines)
- `window.__driveTheme(theme)` exposed in test mode only
- `registerThemeSetter` uses identity-checked cleanup (StrictMode safe per CLAUDE.md §7)
- Already wired: `main.tsx:49` installs the driver, `App.tsx:50` registers the setter via `useEffect`
- For Phase 87 e2e: driver writes to `setTheme`, which already updates UI. Driver does NOT need extension unless tests want to assert the gear/popover state — in which case standard Playwright clicks suffice (no driver needed).

## Standard Stack

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@radix-ui/react-popover` | (installed) | Popover Root + Trigger | Existing primitive, used by Snap popover |
| `lucide-react` | (installed) | `Settings` gear icon | D-33 — only icon library allowed |
| `motion/react` | (installed) | SegmentedControl pill animation | Already a SegmentedControl dependency |

No new packages needed.

## Settings Popover Spec (Opinionated)

### Recommended structure

```tsx
// In TopBar.tsx, replace the Phase 80 audit-removal comment block at lines 211–212
const [settingsOpen, setSettingsOpen] = useState(false);
const { theme, setTheme } = useTheme();

// ... in the right slot, after the Help Tooltip:
<Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
  <Tooltip>
    <TooltipTrigger asChild>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Settings"
          data-testid="topbar-settings"
        >
          <Settings size={16} />
        </Button>
      </PopoverTrigger>
    </TooltipTrigger>
    <TooltipContent side="bottom">Settings</TooltipContent>
  </Tooltip>
  <PopoverContent
    side="bottom"
    align="end"
    sideOffset={6}
    className="w-64"
    data-testid="settings-popover"
  >
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="font-sans text-xs font-medium text-muted-foreground">
          Theme
        </label>
        <SegmentedControl
          value={theme}
          onValueChange={(v) => setTheme(v as ThemeChoice)}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
            { value: "system", label: "System" },
          ]}
          data-testid="theme-segmented-control"
        />
      </div>
    </div>
  </PopoverContent>
</Popover>
```

### Why segmented control (not dropdown or cycling icon)
- **Discoverable** — all three options visible at once; Jessica doesn't need to learn that clicking a sun toggles to a moon
- **Matches Tailwind docs UX** — pattern she's likely seen
- **Already built and styled** — zero new component cost
- **Accessible** — `role="radio"` semantics free

Alternative considered: single Sun/Moon button that cycles. Rejected — three-state cycle is harder to discover, "System" is invisible.

### File location
Inline in `TopBar.tsx` for v1 (~30 lines). If a second setting lands later (Units, Default room), extract to `src/components/SettingsPopover.tsx`. Premature extraction now would bloat the diff without payoff.

## Architecture Patterns

### Popover-from-toolbar-button pattern (Phase 83 precedent)
Wrap `Tooltip` around `PopoverTrigger asChild` around `Button`. Tooltip + Popover compose cleanly. Local React state controls open/close. Radix handles Escape, focus trap, outside-click close.

### Theme write path
User clicks segment → `setTheme(v)` → localStorage write + setState → `useTheme` effect adds/removes `.dark` on `<html>` → Pascal token CSS vars flip → entire UI re-renders new colors. No manual re-render needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 3-way option toggle | Custom radio group | `SegmentedControl` | Already built, animated, a11y-correct |
| Popover positioning + dismiss | Custom dropdown | `Popover` primitive | Radix handles Escape, focus, outside-click |
| `prefers-color-scheme` detection | Custom matchMedia logic | `useTheme()` | Already handles system mode + live OS-pref updates |
| Persist theme across reloads | Custom localStorage code | `useTheme().setTheme()` | Already wraps localStorage with try/catch |

## Common Pitfalls

### Pitfall 1: Removing `.light` reveals dark-mode bugs
**What goes wrong:** WelcomeScreen, ProjectManager, HelpPage have never been visually tested in dark mode (force-light since Phase 76). Hard-coded light colors or low-contrast text may surface.
**How to avoid:** Visual check during UAT. Run dev server, toggle to Dark, visit all three surfaces. Look for: invisible text (light-on-light), white containers on dark background, inline `style` overrides.
**Warning signs:** Buttons or borders that disappear; text that looks washed out.

### Pitfall 2: Popover open state needs explicit close on segment click
**What goes wrong:** User selects "Dark" — popover stays open with no visual confirmation since the toggle is right there.
**How to avoid:** Per Phase 83 precedent, the Snap popover closes on selection (line 484: `setSnapPopoverOpen(false)`). For Settings popover, leaving it open is OK — segmented control is visually responsive (pill slides). Recommend KEEPING IT OPEN so Jessica can compare options without re-opening. Snap closes because it's a "set and forget" choice; theme is a "try it" choice.

### Pitfall 3: First paint flash if boot script changes
**What goes wrong:** Modifying the boot script can cause a flash of unstyled or wrong-themed content.
**How to avoid:** DO NOT touch `index.html` boot bridge. Already correct.

### Pitfall 4: `<html class="dark light">` conflict
**What goes wrong:** If `.light` wrapper isn't removed and user picks Dark, the `<html>` has `dark` class but a nested `.light` div overrides tokens via cascade. Some surfaces stay light while others go dark.
**How to avoid:** Remove all three `.light` wrappers in this phase. This is THEME-04. Not deferrable.

### Pitfall 5: SegmentedControl value type mismatch
**What goes wrong:** `SegmentedControl.onValueChange` is typed `(v: string) => void`. `setTheme` expects `ThemeChoice`.
**How to avoid:** Cast at the call site: `onValueChange={(v) => setTheme(v as ThemeChoice)}`. Safe because options array is the only source.

## Code Examples

### TopBar gear button insertion (replaces lines 211–212)
See "Settings Popover Spec" above. Add `Settings` to lucide imports (line 17–24 of TopBar.tsx). Add `useState` import (line 1).

### Wrapper removal — WelcomeScreen.tsx line 55
```diff
- <div className="light h-full flex flex-col bg-background">
+ <div className="h-full flex flex-col bg-background">
```
Same shape for ProjectManager.tsx:69 (`light space-y-3` → `space-y-3`) and HelpPage.tsx:83.

### Optional: index.css line 50–51 comment update
The CSS class definition itself can stay (might be useful later as `.light` utility for always-light surfaces like print preview). Update the comment to reflect new reality:
```diff
- /* Force-light wrapper — used by WelcomeScreen + ProjectManager.
-    Overrides .dark on <html> so these surfaces always render in light mode. */
+ /* Force-light utility — overrides .dark on <html> for always-light surfaces.
+    Phase 87: removed from WelcomeScreen / ProjectManager / HelpPage which now
+    respect the user's theme choice. Reserved for future print/export surfaces. */
```

## Plan Decomposition

**Recommended: single plan `87-01-theme-toggle-settings`, 4 atomic tasks**

1. **Task A — Settings popover in TopBar** (RED+GREEN)
   - Re-add gear button + Popover + SegmentedControl wired to `useTheme()`
   - Add `data-testid`s for e2e: `topbar-settings`, `settings-popover`, `theme-segmented-control`
   - Unit/integration test: click gear → popover opens; click "Dark" → `<html>` gets `.dark` class; click "Light" → class removed
2. **Task B — Remove `.light` force-wrappers** (single commit, low risk)
   - Three string deletions across WelcomeScreen, ProjectManager, HelpPage
   - Optional: refresh comment on `.light` CSS class
3. **Task C — E2E test: theme persistence across reload**
   - Playwright: click gear → Dark → reload page → assert `<html>` has `dark` class on first paint (boot bridge validation)
4. **Task D — UAT note: visual check on light mode** (manual)
   - Dev server, toggle Dark + Light + System, visit Welcome / Help / ProjectManager. Flag any contrast/color bugs.

Don't split B into its own plan — the wrappers are 3 line edits, atomic. If dark mode reveals bugs on those screens, surface them in the UAT and triage as carry-over GH issues (THEME-04 ships when wrappers are gone; visual polish is separate).

## Open Questions for Plan Phase

1. **Phase 87 milestone home:** standalone phase, or open new v1.22 milestone? Recommendation: standalone polish phase. No active v1.22 theme; opening one for a one-plan phase is overkill.
2. **Toggle UX:** Recommended — three-segment control (Light / Dark / System) using existing `SegmentedControl`. See "Why segmented control" above. Confirm with user.
3. **Future settings placeholder rows:** Recommendation — ship Theme only. Don't add "Units (coming soon)" placeholder. v1 ships smaller; adding placeholders invites the user to ask "when?"
4. **Drop `.light` wrappers in this phase or defer?** Recommendation — drop now. Three wrappers is small. If dark-mode bugs surface on Welcome/Help/ProjectManager, file as GH issues and ship them as visual polish in a follow-up phase.
5. **System mode default:** Already implemented — `useTheme` defaults new users to `"system"` (line 23). No change needed. Confirm this is the intended default.
6. **HelpPage `.light` wrapper:** Not in original brief but exists at `HelpPage.tsx:83`. Recommendation — include in THEME-04. Otherwise Help opens in light mode even when user picks Dark, which is inconsistent.

## Open Questions

1. **Popover close-on-selection behavior**
   - What we know: Snap popover closes on selection (Phase 83). Other tooling docs (Tailwind) keep theme toggles persistent.
   - What's unclear: Jessica's preference. Letting the popover stay open while she compares Light/Dark/System feels right.
   - Recommendation: Keep open. If UAT feedback says otherwise, one-line change.

## Runtime State Inventory

This phase is mostly additive UI; one category needs explicit mention.

| Category | Items Found | Action Required |
|----------|-------------|-------------------|
| Stored data | localStorage key `room-cad-theme` already in use since Phase 71. No schema change. Existing values (`"light"` / `"dark"` / `"system"`) valid. | None — existing storage works as-is |
| Live service config | None — local-first app | None |
| OS-registered state | `prefers-color-scheme` media query (read-only, OS-managed) | None — already wired in `useTheme` |
| Secrets/env vars | None | None |
| Build artifacts | None | None |

## Environment Availability

Pure code/config changes, no external dependencies. **Step 2.6: SKIPPED (no external dependencies identified)**.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (unit/integration) + Playwright (e2e) |
| Config file | `vitest.config.ts`, `playwright.config.ts` |
| Quick run command | `npm run test -- --run` (Vitest) or `npm run test:e2e -- --grep "theme"` |
| Full suite command | `npm run test && npm run test:e2e` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| THEME-01 | Gear button in TopBar opens popover | integration | `npm run test -- TopBar.test` | Wave 0 — create `src/components/__tests__/TopBar.test.tsx` |
| THEME-02 | Popover contains 3-option segmented control | integration | same as above | Wave 0 |
| THEME-03 | Click "Dark" → `<html class="dark">`; "Light" → class removed; persists localStorage | integration | same | Wave 0 |
| THEME-04 | WelcomeScreen / ProjectManager / HelpPage have no `.light` class on root | integration | `npm run test -- WelcomeScreen.test ProjectManager.test HelpPage.test` | Wave 0 — likely needs new test files |
| THEME-05 | Theme persists across reload (first-paint correct) | e2e | `npm run test:e2e -- --grep "theme persistence"` | Wave 0 — new spec |

### Sampling Rate
- **Per task commit:** `npm run test -- TopBar` (or whatever file is being edited)
- **Per wave merge:** Full unit suite + scoped e2e: `npm run test && npm run test:e2e -- --grep "theme"`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/__tests__/TopBar.test.tsx` — Settings popover test cases (THEME-01..03)
- [ ] `e2e/theme-persistence.spec.ts` — reload + first-paint test (THEME-05)
- [ ] Possibly: `src/components/__tests__/WelcomeScreen.test.tsx` — assert `<root>` does NOT have `light` class (or check ProjectManager / HelpPage similarly). May be easier to add an e2e visual smoke or simply rely on the diff being a 3-line removal.

## Sources

### Primary (HIGH confidence)
- `src/hooks/useTheme.ts` — full API surface read
- `src/components/ui/Popover.tsx` — primitive shape verified
- `src/components/ui/SegmentedControl.tsx` — exact match for toggle
- `src/components/TopBar.tsx` — insertion site identified (line 211)
- `src/components/FloatingToolbar.tsx` — Phase 83 Popover precedent (lines 447–499)
- `index.html` — boot bridge correct (lines 10–18)
- `src/test-utils/themeDrivers.ts` — driver already wired in main.tsx + App.tsx
- `src/index.css` — `.light` token block (lines 50–80)
- `./CLAUDE.md` — Phase 71 design system section, D-09 / D-33 / §7 patterns

### Secondary (MEDIUM confidence)
- None needed — all findings verified in-repo

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all primitives already exist in-repo
- Architecture: HIGH — Phase 83 precedent + Phase 71 hook are exact patterns
- Pitfalls: HIGH — `.light` wrapper removal risk is concrete and bounded

**Research date:** 2026-05-15
**Valid until:** 30 days (theme system is stable; no external deps to drift)
