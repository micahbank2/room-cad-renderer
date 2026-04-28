---
phase: 52-keyboard-shortcuts-overlay-hotkey-01
type: context
created: 2026-04-27
status: ready-for-research
requirements: [HOTKEY-01]
depends_on: [Phase 33 (design tokens), existing HelpModal infrastructure]
---

# Phase 52: Keyboard Shortcuts Overlay (HOTKEY-01) — Context

## Goal

Pressing `?` (Shift + /) opens a keyboard shortcuts overlay listing all app hotkeys grouped by category. The overlay auto-discovers shortcuts from a single source of truth so the displayed list never drifts from the actual keyboard handler. Source: [GH #72](https://github.com/micahbank2/room-cad-renderer/issues/72).

## Pre-existing infrastructure (discovered during scout)

- `?` already opens `HelpModal` via the keyboard handler at `src/App.tsx:124-265`
- `HelpModal` (`src/components/HelpModal.tsx`) is a full multi-section help system with backdrop click + Escape close
- `HelpSectionId` enum in `src/stores/uiStore.ts` already includes `"shortcuts"` as one of 4 sections
- `SHORTCUTS` array at `src/components/help/helpContent.tsx:23` lists 19 hotkeys grouped (Tools / Editing / 3D & Walk / Rooms / Help)
- Help search supports cross-section search across shortcut keywords

**The infrastructure is 80% built. Phase 52 finishes the remaining 20%.**

## Decisions

### D-01 — Build a shared `shortcuts.ts` registry as single source of truth

Per acceptance criteria: "Auto-discovers shortcuts from a single source-of-truth (avoid duplicating the list — read from existing keyboard handler in App.tsx or a new shared `shortcuts.ts` registry)."

**Approach:** Create `src/lib/shortcuts.ts` with a typed registry of all keyboard shortcuts. Each entry includes:
- `keys: string[]` (for display)
- `match: (e: KeyboardEvent) => boolean` (for the handler — encapsulates modifier checks, key normalization)
- `action: string` (human-readable description)
- `group: "Tools" | "Editing" | "View" | "Camera Presets" | "3D & Walk" | "Rooms" | "Help" | "Selection"` (for overlay grouping)
- `context?: string` (optional UI gate hint, e.g. "3D or split view")
- `inertWhenFormFocused?: boolean` (default true — matches CAM-01 active-element guard precedent)

**Both consumers read from this registry:**
1. `src/App.tsx` keyboard handler — replaces the inline shortcut object map with a registry-driven lookup
2. `src/components/help/helpContent.tsx` — `SHORTCUTS` array becomes a derived view of the registry (or is replaced by registry import)

**Why registry over status-quo:**
- Acceptance demands single source of truth
- Drift recurs every milestone otherwise (Camera Presets `1`/`2`/`3`/`4` already missing from current SHORTCUTS — exhibit A)
- Each future phase that adds a hotkey naturally adds it to the registry; the help modal updates "for free"

**Why NOT a new `KeyboardShortcutsOverlay` component (despite acceptance saying "new component"):**
- HelpModal already IS the overlay
- Spinning up a duplicate component creates two help systems users have to learn
- Acceptance intent is "the cheat sheet works" — the existing modal achieves that

### D-02 — Audit + complete missing shortcuts

The current `SHORTCUTS` array is missing real shortcuts wired in `App.tsx`:
- Camera Presets: `1` (Eye-level), `2` (Top-down), `3` (3-quarter), `4` (Corner) — Phase 35
- Selection: `Cmd+C` / `Ctrl+C` (Copy), `Cmd+V` / `Ctrl+V` (Paste) — Phase 31
- View / Tool variants: any others surfaced during research

**Phase 52 audits ALL keyboard handler branches in `src/App.tsx`** and ensures every active hotkey has a registry entry.

**Verification gate:** A vitest unit test asserts the registry's `match()` predicates collectively cover all the keyboard handler branches. If a future contributor adds a hotkey to App.tsx but forgets the registry, the test fails.

### D-03 — Reduced-motion guard on modal entrance animation (D-39 from Phase 33)

Verify the existing HelpModal entrance animation (if any) respects `useReducedMotion()`. If no animation exists, no guard needed. If animation exists without guard, add one. Follow Phase 33's `useReducedMotion` hook pattern.

### D-04 — Inert when focus is in a form input (CAM-01 precedent)

The `?` key MUST NOT open the overlay when the user is typing in a text input, textarea, or contenteditable element. Mirrors Phase 35's CAM-01 active-element guard for camera preset hotkeys.

**Implementation:** Add active-element check at the `?` handler site in App.tsx (or in the registry's `match()` for the help-open shortcut).

### D-05 — Dedicated e2e spec for the overlay

Create `e2e/keyboard-shortcuts-overlay.spec.ts` with:
1. Press `?` → overlay opens, "shortcuts" section is active
2. Press `Escape` → overlay closes
3. Click backdrop → overlay closes
4. Focus a text input, press `?` → overlay does NOT open (inert guard)
5. With reduced-motion enabled, opening is instant (no animation delay measurable)

**Reuse pattern:** mirror Phase 49/50 e2e spec setup — addInitScript to dismiss onboarding, seed minimal project to bypass WelcomeScreen.

### D-06 — Keep Material Symbols icon for the section tab

`HelpModal` is on the CLAUDE.md D-33 Material Symbols allowlist. The existing `icon: "keyboard"` reference in `helpContent.tsx:11` stays. Do NOT migrate to lucide.

### D-07 — Atomic commits per task

Mirror Phase 49/50 atomic-commit pattern. One commit per logical change.

### D-08 — Zero regressions

The fix MUST NOT break:
- Existing HelpModal section navigation (getting-started / shortcuts / library / 3d)
- Existing keyboard handler behavior in App.tsx (all current shortcuts still work)
- Phase 35 preset hotkeys
- Phase 31 copy/paste hotkeys
- Phase 49/50 e2e specs

## Out of scope

- Replacing HelpModal with a new `KeyboardShortcutsOverlay` component (acceptance text suggests it, but existing modal IS the overlay; building duplicate violates D-01 single-source-of-truth principle)
- Adding new shortcuts that don't currently exist (this is an audit + registry phase, not a feature-add phase)
- Refactoring HelpModal layout / search / section system
- Adding tooltips that show keyboard shortcuts on Toolbar buttons (separate feature)

## Files we expect to touch (estimate)

- `src/lib/shortcuts.ts` — NEW registry file
- `src/App.tsx` — refactor keyboard handler to consume registry
- `src/components/help/helpContent.tsx` — `SHORTCUTS` derived from registry (or replaced by import)
- `src/components/help/helpIndex.ts` — update import if needed
- `e2e/keyboard-shortcuts-overlay.spec.ts` — NEW e2e spec
- `tests/lib/shortcuts.registry.test.ts` — NEW unit test (registry coverage gate)

Estimated 1 plan, 3-4 tasks. Mid-size phase, larger than 49/50 because it touches the keyboard-handler source.

## Open questions for research phase

1. **Existing modal entrance animation:** does HelpModal currently animate in? If yes, what's the animation? Determines D-03 scope.
2. **Inert-when-input behavior:** does the current `?` handler already check active element? If yes, D-04 may be a no-op verification.
3. **Registry shape:** specific TypeScript shape for `Shortcut` and how `match()` predicates encapsulate modifiers — researcher proposes the type.
4. **Migration approach:** should `SHORTCUTS` in `helpContent.tsx` be deleted entirely (consumers re-import from registry), or kept as a derived constant for backwards compatibility? Researcher recommends.
5. **Selection shortcuts:** does Phase 31 actually wire Cmd+C / Cmd+V at the App.tsx level, or is it elsewhere? Researcher confirms with file:line.
