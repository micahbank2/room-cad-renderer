# Phase 87: Theme Toggle + Settings Popover — Context

**Captured:** 2026-05-15
**Branch:** `gsd/phase-87-theme-toggle`
**Status:** Locked — ready for plan

## Vision

Jessica can flip the app between Light, Dark, and System mode from a gear button in the top bar. The three "force-light" wrappers shipped in Phase 76 (WelcomeScreen, ProjectManager, HelpPage) come off so her choice actually sticks across every surface. All theme infrastructure exists from Phase 71 (`useTheme()`, boot bridge, `__driveTheme` test driver) — this phase is purely the missing affordance + wrapper removal.

## Milestone Placement

This is a standalone polish phase. It ships outside any v1.xx milestone — v1.20 and v1.21 closed (2026-05-15) and there is no active v1.22 yet. No new milestone REQUIREMENTS.md file. ROADMAP.md gets the phase listed in the regular `Phases` progress table.

## Decisions (Locked)

### D-01 — Standalone polish phase

Phase 87 is a one-off polish phase that ships independently. No v1.22 milestone is opened for it. ROADMAP.md adds a `## Polish Phases` section (or appends to existing if present) listing Phase 87, and adds a row in the `## Progress` table once shipped. No `milestones/v1.22-REQUIREMENTS.md` file.

### D-02 — Segmented control for theme toggle

Reuse the existing `src/components/ui/SegmentedControl.tsx` primitive. Three options in this order: **Light / Dark / System**. Mixed-case labels per D-09 chrome convention. Active option reads from `useTheme().theme`, click writes via `setTheme(value)`. Cast at the call site: `(v) => setTheme(v as ThemeChoice)` because `SegmentedControl.onValueChange` is typed `(v: string) => void`.

Rejected alternatives: cycling Sun/Moon button (hides System), dropdown menu (extra click), three separate icon buttons (no grouping affordance).

### D-03 — Popover stays open until outside click or Escape

Default Radix Popover dismissal behavior — do NOT call `setOpen(false)` inside the segmented-control `onValueChange` handler. This is intentionally different from the Phase 83 Snap popover (which auto-closes) because theme is a "try it" choice, not "set and forget". Jessica should be able to click Light → Dark → System and feel the difference without re-opening the popover each time. Outside click and Escape still close it via Radix defaults.

### D-04 — Remove all three `.light` force-wrappers

Drop the `light` className from the root div in all three files:

- `src/components/WelcomeScreen.tsx:55` — `<div className="light h-full flex flex-col bg-background">` → drop `light `
- `src/components/ProjectManager.tsx:69` — `<div className="light space-y-3">` → drop `light `
- `src/components/HelpPage.tsx:83` — `<div className="light min-h-screen bg-background text-foreground flex flex-col font-sans">` → drop `light `

The `.light` CSS class definition in `src/index.css` (line 53) stays in place — it's harmless as a future utility for always-light surfaces (print preview, export thumbnails) and removing it touches more than this phase needs. Optional cosmetic comment refresh on the class definition can land in the same commit if convenient, but is NOT required for the phase to ship.

If removing wrappers reveals dark-mode visual bugs on WelcomeScreen / ProjectManager / HelpPage (low-contrast text, hardcoded light colors), file as GH issues with `bug` + `backlog` labels and triage as a follow-up phase. Phase 87 is THEME-04 = wrappers gone, not THEME-04 = wrappers gone AND all three surfaces look perfect in dark mode.

### D-05 — Theme-only popover content in v1

The Settings popover renders exactly one section in this phase: header label "Theme" + segmented control. No placeholder rows for future settings ("Units (coming soon)", "Default room size", etc). Future settings extend the popover body without API change. Avoid invitation to ask "when?".

## Out of Scope

Explicitly deferred:

- Visual polish of WelcomeScreen / ProjectManager / HelpPage in dark mode (file as bugs if discovered)
- Settings beyond Theme (Units, Default Room, Reduced Motion override, Snap default)
- Tooltip on the gear button mentioning the keyboard shortcut (there is no shortcut for Settings; tooltip just says "Settings")
- Animation polish beyond what Radix Popover + SegmentedControl give by default
- Persisting popover open state across reloads (it should always boot closed)

## Linked Issues / Spec

No GitHub issue tracks this directly. The need surfaced from Phase 76 UAT feedback — Jessica noticed Help / Welcome / ProjectManager were stuck in light mode regardless of her preference, and there was no way to set a preference anyway. CONTEXT.md serves as the spec; PLAN.md links back to this file.

## Requirements Summary (for traceability)

| ID | Behavior | Surfaces |
|----|----------|----------|
| THEME-01 | Gear button in TopBar right slot opens Settings popover | `TopBar.tsx` |
| THEME-02 | Popover body contains Theme segmented control (Light / Dark / System) | `TopBar.tsx`, `SegmentedControl` primitive |
| THEME-03 | Toggle wired to `useTheme().theme` + `setTheme()`, persists via localStorage | `useTheme` hook (existing, no changes) |
| THEME-04 | WelcomeScreen, ProjectManager, HelpPage respect user theme — drop `.light` force-wrappers | `WelcomeScreen.tsx`, `ProjectManager.tsx`, `HelpPage.tsx` |
| THEME-05 | First-paint matches stored choice (no flash) | `index.html` boot bridge (existing, no changes) |
