---
phase: 72-primitives-shelf
plan: "02"
subsystem: design-system
tags: [primitives, button, cva, radix-slot, tdd]
dependency_graph:
  requires: [72-01]
  provides: [Button, buttonVariants, ButtonProps]
  affects: [72-06, 72-07]
tech_stack:
  added: []
  patterns: [cva-variant-matrix, radix-slot-asChild, forwardRef]
key_files:
  created:
    - src/components/ui/Button.tsx
    - tests/primitives/button.test.tsx
  modified:
    - src/components/ui/index.ts
decisions:
  - "type='button' default spread before {...props} so explicit type='submit' overrides — D-08 Pitfall 6"
  - "Slot type prop set to undefined when asChild=true (avoids invalid prop on anchor/link children)"
metrics:
  duration: "~8 min"
  completed: "2026-05-07"
  tasks: 1
  files: 3
---

# Phase 72 Plan 02: Button Primitive — Summary

Button primitive with full cva variant/size matrix, type-safe forwardRef, asChild delegation via Radix Slot, and active state support. Foundation for ~130 button sites across 41 files.

## What Was Built

**Button.tsx** (`src/components/ui/Button.tsx`): cva-powered Button primitive with:
- 6 variants: default, destructive, outline, secondary, ghost, link
- 6 sizes: default, sm, lg, icon, icon-sm, icon-lg
- `type="button"` default (prevents accidental form submission)
- `asChild` prop via Radix Slot (delegates rendering to child element)
- `active` prop adds `data-active` attribute + `bg-accent/20 ring-1 ring-ring` styling
- `forwardRef` to native button DOM element
- Exports: `Button`, `buttonVariants`, `ButtonProps`

**Barrel export** (`src/components/ui/index.ts`): updated placeholder to export Button primitive.

**Test suite** (`tests/primitives/button.test.tsx`): 9 unit tests covering all contract points. All pass.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| RED | 033a50a | test(72-02): add failing Button tests — 9 cases |
| GREEN | 8574aba | feat(72-02): implement Button primitive |

## Deviations from Plan

**[Rule 3 - Blocking] npm packages not installed in node_modules**
- **Found during:** Test RED run
- **Issue:** 72-01 added `class-variance-authority`, `@radix-ui/react-slot`, `clsx`, and `tailwind-merge` to package.json but did not run `npm install` in the root repo. Worktree resolves node_modules from the root.
- **Fix:** Ran `npm install class-variance-authority @radix-ui/react-slot clsx tailwind-merge` in the root repo.
- **Files modified:** `/Users/micahbank/room-cad-renderer/package-lock.json` (root npm install — not committed in this plan)
- **Impact:** Unblocked; all 9 tests pass after install.

**[Rule 3 - Blocking] 72-01 files not in this worktree branch**
- **Found during:** Task start
- **Issue:** This worktree branch (`worktree-agent-a6ba4de01b74768b3`) did not have the 72-01 foundation commits. Merged `claude/v1.16-phase66` to bring in cn.ts, motion.ts, and the barrel skeleton.
- **Fix:** `git merge claude/v1.16-phase66` — clean merge, no conflicts.

## Known Stubs

None — Button is fully functional with all variants, sizes, and behavior.

## Self-Check: PASSED
