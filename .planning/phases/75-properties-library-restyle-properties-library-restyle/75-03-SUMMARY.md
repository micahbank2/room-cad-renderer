---
phase: 75-properties-library-restyle
plan: "03"
subsystem: PropertiesPanel
tags: [input-migration, design-system, primitives]
dependency_graph:
  requires: []
  provides: [PropertiesPanel-Input-migration]
  affects: [PropertiesPanel.tsx, PropertiesPanel.OpeningSection.tsx, PropertiesPanel.StairSection.tsx]
tech_stack:
  added: []
  patterns: [Input primitive via forwardRef, h-7 text-xs compact variant]
key_files:
  created: []
  modified:
    - src/components/PropertiesPanel.tsx
    - src/components/PropertiesPanel.OpeningSection.tsx
    - src/components/PropertiesPanel.StairSection.tsx
decisions:
  - "Used className='h-7 text-xs' on all compact inputs to preserve tight PropertiesPanel layout"
  - "Input primitive forwardRef supports inputRef used by LabelOverrideInput with no changes needed"
  - "OpeningSection NumericRow bg-accent preserved via className='bg-accent' passthrough"
metrics:
  duration: ~8min
  completed: "2026-05-07"
  tasks_completed: 3
  files_modified: 3
---

# Phase 75 Plan 03: PropertiesPanel Input Migration Summary

Migrated all raw `<input type="text|number">` elements in the PropertiesPanel family to the `Input` primitive. This is the largest migration file in Phase 75 (992 lines) but all changes were mechanical substitutions.

## Tasks Completed

### Task 1: PropertiesPanel.tsx
- Added `import { Input } from "@/components/ui/Input"` to existing imports
- Replaced 4 raw input sites:
  1. Product dimension grid inputs (3x `<input type="number">` in `.map()`) — `className="h-7 text-xs px-1.5"`
  2. `LabelOverrideInput` text input (uses `inputRef` via forwardRef) — `className="h-7 text-xs"`
  3. `CeilingDimInput` text input — `className="w-20 h-7 text-xs text-right"`
  4. `EditableRow` dynamic type input (text or number based on `parser` prop) — `className="w-20 h-7 text-xs text-right"`
- All `data-testid` attributes preserved verbatim
- The `inputRef` (forwardRef) pattern works identically with Input primitive

### Task 2: PropertiesPanel.OpeningSection.tsx + PropertiesPanel.StairSection.tsx
- **OpeningSection**: Added `Input` import; replaced `NumericRow`'s `<input type="number">` with `<Input>` — `className="w-16 h-7 text-xs text-right bg-accent"` (preserves accent background)
- **StairSection**: Added `Input` import; replaced 2 raw inputs:
  1. Stair label `<input type="text">` — `className="h-7 text-xs"`
  2. `NumberRow`'s `<input type="number">` — `className="flex-1 h-7 text-xs"`
- All `htmlFor`/`id` pairings preserved (e.g., `stair-label-${stair.id}`, `stair-input-${ariaLabel}`)
- `data-testid` on opening depth input preserved verbatim

### Task 3: Full Phase Grep Audit

Grep across all 8 Phase 75 target files:
```
CLEAN - no raw inputs remain
```

Legacy CSS check (glass-panel, accent-glow, etc.):
```
CLEAN - no legacy CSS
```

TypeScript check:
- Zero errors in migrated files
- Pre-existing: `tsconfig.json(17,5): error TS5101: Option 'baseUrl' is deprecated` — not new, not in scope

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Commits

- `8c3436a` — feat(75-03): PropertiesPanel — migrate all text/number inputs to Input primitive
- `6d47d58` — feat(75-03): PropertiesPanel sub-components — Input migration for opening + stair dims

## Self-Check: PASSED

- [x] PropertiesPanel.tsx modified (8c3436a)
- [x] PropertiesPanel.OpeningSection.tsx modified (6d47d58)
- [x] PropertiesPanel.StairSection.tsx modified (6d47d58)
- [x] Zero raw text/number inputs in all three files
- [x] Zero TypeScript errors in migrated files
- [x] All data-testid preserved
