---
phase: 72-primitives-shelf
plan: "06"
subsystem: ui
tags: [react, typescript, button-primitive, cva, class-variance-authority, toolbar, tailwind]

requires:
  - phase: 72-02
    provides: Button primitive with cva variant/size matrix and active prop

provides:
  - Toolbar.tsx fully migrated — zero raw <button> elements
  - All 20 button sites use Button primitive (variant/size matrix)
  - Active tool states use the active prop

affects: [toolbar, tool-palette, 3d-controls, phase-74-tabs]

tech-stack:
  added: ["@radix-ui/react-slot ^1.2.4", "class-variance-authority ^0.7.1", "clsx ^2.1.1", "tailwind-merge ^3.5.0"]
  patterns: ["Button primitive usage — variant/size/active props replace raw className conditionals"]

key-files:
  created:
    - src/components/ui/Button.tsx
    - src/components/ui/index.ts
    - src/lib/cn.ts
  modified:
    - src/components/Toolbar.tsx
    - package.json
    - package-lock.json

key-decisions:
  - "Active tool glow shadow-[0_0_15px_rgba(124,91,240,0.3)] preserved as className override on Button (not baked into primitive)"
  - "View tab active state uses border-b-2 border-accent className override + rounded-none (tab-like; migrates to Tabs in Phase 74)"
  - "Bootstrapped Button.tsx + cn.ts + ui/index.ts in this worktree (from 72-02 sibling worktree source)"

patterns-established:
  - "Button active: use active prop for bg-accent/20 ring-1 ring-ring base; add className for any extra visual layering (glow)"
  - "Icon-only buttons: size='icon' (h-9 w-9)"
  - "Tab-like nav buttons: size='sm' with border-b-2 override until Tabs primitive ships"

requirements-completed: [PRIMITIVES-SHELF]

duration: 12min
completed: 2026-05-07
---

# Phase 72 Plan 06: Toolbar Button Migration Summary

**Toolbar.tsx migrated to Button primitive — all 20 raw `<button>` sites replaced with variant/size/active props from cva matrix**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-07T22:55:00Z
- **Completed:** 2026-05-07T23:07:00Z
- **Tasks:** 1
- **Files modified:** 6

## Accomplishments
- Zero raw `<button>` elements remain in Toolbar.tsx
- All 20 button sites use `Button` primitive with correct variant/size/active props
- Active tool glow effect preserved via `className` override
- All `data-testid`, `aria-label`, `aria-pressed`, `onClick`, `disabled`, and `ref` attributes preserved
- Build passes, 44 phase33 vitest tests pass with no regressions

## Task Commits

1. **Task 1: Migrate Toolbar.tsx buttons to Button primitive** - `029de7d` (feat)

## Files Created/Modified
- `src/components/Toolbar.tsx` — all ~20 raw buttons replaced with Button primitive
- `src/components/ui/Button.tsx` — bootstrapped from 72-02 sibling worktree (cva variant matrix)
- `src/components/ui/index.ts` — barrel export for Button
- `src/lib/cn.ts` — clsx + tailwind-merge utility
- `package.json` — added @radix-ui/react-slot, class-variance-authority, clsx, tailwind-merge
- `package-lock.json` — updated lock file

## Decisions Made
- Active tool glow `shadow-[0_0_15px_rgba(124,91,240,0.3)]` is preserved as a `className` prop on top of the `active` prop (which adds `bg-accent/20 ring-1 ring-ring`). This keeps the visual identity without baking the glow into the primitive.
- View-mode tab active state uses `border-b-2 border-accent rounded-none` className override (not the `active` prop) since the tab underline treatment differs from the accent fill. Phase 74 will migrate these to a proper Tabs primitive.
- Bootstrapped Button.tsx, cn.ts, and ui/index.ts in this worktree since they were created in a sibling worktree (72-02) and merged to main after this worktree diverged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Bootstrapped Button primitive + dependencies in this worktree**
- **Found during:** Task 1 (pre-migration)
- **Issue:** This worktree diverged from main before the 72-02 Button primitive merge. `src/components/ui/Button.tsx`, `src/lib/cn.ts`, `ui/index.ts`, and the required npm deps (cva, clsx, radix-slot, tailwind-merge) were all missing.
- **Fix:** Copied Button.tsx + cn.ts from the 72-02 sibling worktree source. Created ui/index.ts. Updated package.json with the 4 missing deps and ran `npm install`.
- **Files modified:** src/components/ui/Button.tsx, src/components/ui/index.ts, src/lib/cn.ts, package.json, package-lock.json
- **Verification:** Build passes, imports resolve
- **Committed in:** 029de7d (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (blocking — missing prerequisite files from earlier plan)
**Impact on plan:** Required to unblock the migration. No scope creep.

## Issues Encountered
- Worktree was created before Phase 72 plans 02-05 merged to main, so Button.tsx did not exist in this tree. Resolved by reading the source from the sibling worktree and re-creating the files.

## Next Phase Readiness
- Toolbar fully on Button primitive — ready for Phase 74 Tabs migration (view-mode tabs)
- Button variant/size matrix validated at scale across 20 real button sites

---
*Phase: 72-primitives-shelf*
*Completed: 2026-05-07*
