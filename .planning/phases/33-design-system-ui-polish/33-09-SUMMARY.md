---
phase: 33-design-system-ui-polish
plan: 09
subsystem: ui-inline-edit
tags: [ui, inline-edit, store, auto-save, phase-31-reuse]
requirements: [GH-88]
dependency_graph:
  requires: [33-00, 33-01, 33-02, 33-03]
  provides:
    - "InlineEditableText primitive (src/components/ui/InlineEditableText.tsx) — reusable inline-edit input with Phase 31 invariants"
    - "projectStore.draftName / setDraftName / commitDraftName — genuine auto-save bypass for keystroke live-preview (D-23)"
    - "cadStore.renameRoomNoHistory — genuine pushHistory bypass for keystroke live-preview"
  affects:
    - src/stores/projectStore.ts
    - src/stores/cadStore.ts
    - src/components/Toolbar.tsx
    - src/components/ProjectManager.tsx
    - src/components/RoomTabs.tsx
tech-stack:
  added: []
  patterns:
    - "Phase 31 LabelOverrideInput skipNextBlurRef / originalRef invariants generalized into a reusable primitive"
    - "Ephemeral draft field (draftName) — auto-save subscription-gated bypass without semantic theater"
    - "active-only editable tab pattern (click inactive tab = switch; click active tab label = edit)"
key-files:
  created:
    - src/components/ui/InlineEditableText.tsx
  modified:
    - src/stores/projectStore.ts
    - src/stores/cadStore.ts
    - src/components/Toolbar.tsx
    - src/components/ProjectManager.tsx
    - src/components/RoomTabs.tsx
decisions:
  - "Document title relocated from ProjectManager sidebar input to Toolbar center slot (research open question #1, matches UI-SPEC + Pascal affordance)"
  - "Auto-save bypass implemented via new projectStore.draftName field (option a — genuine bypass) rather than a NoHistory rename of setActiveName (option b — semantic theater). Auto-save only watches activeName, so draftName writes don't trigger debounced save."
  - "Dropped .toUpperCase() transform on room tab labels — edits now reflect literal user input. Users wanting UPPERCASE can type it."
  - "Room tab edit gated to active tab only — clicking an inactive tab switches rooms (preserves primary UX); clicking the active tab's label enters edit mode."
metrics:
  duration: "~10 minutes"
  completed: "2026-04-22"
---

# Phase 33 Plan 09: Inline Editable Titles Summary

One-liner: Inline-edit primitive (Phase 31 LabelOverrideInput generalized) wired to the Toolbar document title and active room tab, with genuine auto-save and pushHistory bypasses — keystrokes preview live without flooding save debounces or undo history.

## What Shipped

- **InlineEditableText primitive** (`src/components/ui/InlineEditableText.tsx`, 140 lines): generic inline-edit input preserving every Phase 31 invariant — `skipNextBlurRef`, `originalRef`, `useEffect` reseed on external value change, empty-commit revert (D-27), Enter/blur commit, Escape cancel, client-enforced `maxLength` default 60. Exposes `window.__driveInlineTitleEdit` test driver gated by `import.meta.env.MODE === "test"`.
- **projectStore genuine auto-save bypass**: added `draftName: string | null`, `setDraftName(name)`, `commitDraftName()`. `useAutoSave.ts:72` subscribes only to `activeName`, so keystrokes writing to `draftName` do NOT fire debounced save. Commit flushes `draftName → activeName` in a single `set()`, triggering the subscriber exactly once per edit session. This resolves checker warning 4 — the bypass is real, not a rename.
- **cadStore genuine pushHistory bypass**: added `renameRoomNoHistory(id, name)` — identical mutation to `renameRoom` but omits `pushHistory(s)`. Keystroke preview in RoomTabs uses this; Enter/blur commits via the original `renameRoom`, producing exactly one undo entry per session.
- **Toolbar integration**: document title moved from ProjectManager sidebar input to Toolbar center slot (replaces the old `flex-1` spacer), bound to `setDraftName` (live-preview) and `commitDraftName` (Enter/blur). `data-testid="inline-doc-title"` for the driver.
- **ProjectManager simplification**: editable `<input>` replaced with a read-only display (`Editing: <name>`). Save / Load / New / Delete buttons retained.
- **RoomTabs active-tab editing**: active room tab renders `InlineEditableText` (live-preview → `renameRoomNoHistory`, commit → `renameRoom`); inactive tabs render a plain `<span>` that switches rooms on click. `.toUpperCase()` display transform dropped — editable labels show literal user input. Delete affordance (`×`) preserved.

## Deviations from Plan

None — plan executed exactly as written. Decision on option (a) vs option (b) for the auto-save bypass was locked in the plan frontmatter; followed as specified.

## Commits

- `0c7b829` — feat(33-09): add draftName bypass to projectStore and renameRoomNoHistory to cadStore
- `13a2af0` — feat(33-09): create InlineEditableText primitive from Phase 31 LabelOverrideInput
- `d2a9f60` — feat(33-09): wire inline-editable doc title in Toolbar and room tabs

## Verification

- `npm run build` — passes (no new TypeScript errors).
- `npx vitest run tests/phase33/inlineTitleEdit.test.ts` — 5/5 pass:
  - `InlineEditableText.tsx` file exists
  - Contains `skipNextBlurRef` (Phase 31 Pitfall 4)
  - projectStore exposes `draftName` + `commitDraftName`
  - cadStore exposes `renameRoomNoHistory`
  - Toolbar renders `InlineEditableText`

## Preserved Invariants

- Plan 02 typography on Toolbar (brand `font-display`, view tabs `font-mono text-sm font-normal`, right action icons untouched).
- Plan 03 spacing on Toolbar (`h-14 px-4` header, `mr-6` section gaps, `gap-2` right cluster).
- Phase 31 LabelOverrideInput pattern generalized without altering the source; `src/components/PropertiesPanel.tsx` untouched.
- Phase 28 auto-save semantics (single debounced save per commit) — verified by construction since only `activeName` has an auto-save subscriber and `commitDraftName` writes it exactly once per session.

## Known Stubs

None.

## Closes

- GH #88

## Self-Check: PASSED

- `src/components/ui/InlineEditableText.tsx` — FOUND
- `src/stores/projectStore.ts` contains `draftName` + `commitDraftName` — FOUND
- `src/stores/cadStore.ts` contains `renameRoomNoHistory` — FOUND
- `src/components/Toolbar.tsx` contains `InlineEditableText` + `inline-doc-title` — FOUND
- `src/components/RoomTabs.tsx` contains `InlineEditableText` + `renameRoomNoHistory` — FOUND
- Commits `0c7b829`, `13a2af0`, `d2a9f60` — FOUND
