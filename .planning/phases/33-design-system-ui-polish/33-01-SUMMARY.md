---
phase: 33-design-system-ui-polish
plan: 01
subsystem: design-system
tags: [foundation, tokens, tailwind-v4, lucide, radius, spacing, typography]
requirements: [GH-83, GH-90]
dependency-graph:
  requires:
    - "Tailwind v4 @theme block in src/index.css"
    - "Wave 0 red-stub tests (tokens.test.ts, typography.test.ts)"
  provides:
    - "lucide-react dependency installed (importable from src/)"
    - "--text-display / --text-base / --text-sm typography tokens (v4-correct prefix)"
    - "--spacing-xs / sm / lg / xl / 2xl canonical scale"
    - "--radius-lg canonicalized to 8px"
    - "33-01-AUDIT.md remap list for Plan 03"
  affects:
    - "src/index.css (sole writer for Wave 1)"
    - "package.json, package-lock.json"
tech-stack:
  added:
    - "lucide-react@1.8.0"
  patterns:
    - "Tailwind v4 --text-* / --spacing-* prefix convention for utility exposure"
key-files:
  created:
    - ".planning/phases/33-design-system-ui-polish/33-01-AUDIT.md"
    - ".planning/phases/33-design-system-ui-polish/33-01-SUMMARY.md"
  modified:
    - "package.json"
    - "package-lock.json"
    - "src/index.css"
decisions:
  - "Installed lucide-react@1.8.0 (npm resolved latest; plan referenced ^0.441.0 as example but did not pin; latest accepted)"
  - "Used Tailwind v4 --text-* prefix (not --font-size-*) so tokens expose as text-display/text-base/text-sm utilities without arbitrary-value workarounds"
  - "Canonicalized --radius-lg from 6px to 8px per D-34; audit found zero rounded-lg source consumers so regression risk is zero"
  - "Dropped --spacing-md (12px) per checker D5; documented 6 gap-3/px-3/py-3/pt-3 remap sites for Plan 03 execution"
metrics:
  duration: "~2 minutes"
  tasks-completed: 3
  files-modified: 3
  files-created: 2
  tests-green: "6/6 tokens.test.ts"
  completed-at: "2026-04-22T13:43:30Z"
---

# Phase 33 Plan 01: Foundation Tokens Summary

Installed lucide-react, added Phase 33 typography/spacing tokens to `src/index.css` using Tailwind v4's `--text-*` / `--spacing-*` prefix convention (so utilities auto-generate), canonicalized `--radius-lg` from 6px → 8px, and produced a ready-to-execute remap audit for Plan 03.

## What Shipped

1. **lucide-react@1.8.0 installed** — added to `package.json` dependencies + `package-lock.json`. Verified via `npm ls lucide-react`. No imports in `src/` yet (deferred to Plans 04–09 per plan contract).

2. **6 new tokens + 1 canonicalization in `src/index.css` `@theme {}` block:**
   - `--text-display: 28px` — hero headings (Space Grotesk)
   - `--text-base: 13px` — h1 + body roles
   - `--text-sm: 11px` — h2 + label + value roles
   - `--spacing-xs: 4px`, `--spacing-sm: 8px`, `--spacing-lg: 16px`, `--spacing-xl: 24px`, `--spacing-2xl: 32px`
   - `--radius-lg: 6px → 8px` (canonicalization)
   - **NOT added:** `--spacing-md: 12px` (dropped per checker D5)

3. **33-01-AUDIT.md** — remap list for Plan 03:
   - `rounded-lg` usages in `src/`: **0** → radius canonicalization is visually safe
   - 12px-spacing sites in 4 D-35 target files: **6** (5 in Toolbar.tsx, 1 in Sidebar.tsx; PropertiesPanel.tsx + RoomSettings.tsx already compliant)

## Wave 1 Ownership Invariant

Plan 01 is the sole writer of `src/index.css` for Wave 1. Plan 02's `files_modified` must not include `src/index.css`. Verified via plan-file inspection during planning phase (checker-enforced).

## Verification Results

- `grep --text-display: 28px src/index.css` → match
- `grep --radius-lg: 8px src/index.css` → match
- `grep --spacing-md: 12px src/index.css` → no match (correctly absent)
- `npm run build` → succeeds (454ms, no errors; compiled CSS contains `--text-display:28px` and `--radius-lg:8px`)
- `npm test -- --run tests/phase33/tokens.test.ts` → 6 passed, 0 failed
- `npm ls lucide-react` → `lucide-react@1.8.0` resolved

### Tailwind v4 utility generation note

The compiled CSS includes the `--text-display` / `--spacing-*` token values under `:root`, but Tailwind v4 only emits `.text-display { font-size: var(--text-display) }` rules when the utility class appears in a source file. Since no Wave 1 plan consumes the typography utilities yet (Wave 2/3 will), the `.text-display` class-rule is expected to be absent until component files reference it. The token layer is in place; utility emission is downstream-consumer-driven. This is correct Tailwind v4 behavior, not a gap.

## Deviations from Plan

**Auto-fixed (Rule 3 – blocking):** lucide-react version.
- **Found during:** Task 1.
- **Issue:** Plan referenced `^0.441.0` as "or current latest". `npm install lucide-react` resolved `1.8.0` as current latest.
- **Fix:** Accepted `1.8.0` — plan explicitly allows latest; no pin required beyond what npm installed.
- **Files modified:** package.json, package-lock.json.
- **Commit:** 42082d7.

No other deviations.

## Deferred / Out of Scope

- **Typography semantic-role tests (`tests/phase33/typography.test.ts`)** — still RED after Plan 01. Expected: those tests assert Sidebar/PropertiesPanel section headers use mixed-case, which is Plan 02/03's job. Plan 01's success criteria explicitly scope this as "GREEN where depending on token presence; NOT the semantic role tests — those go green in later plans."
- **Arbitrary `text-[10px]` / `text-[11px]` values in Toolbar/Sidebar** — audit notes this but leaves to Plan 03's scope (per plan Task 3 contract, which targets only `rounded-lg` + 12px-spacing).

## Downstream Unblocked

- **Plan 02 (typography mixed-case)** — tokens available; `text-sm` / `text-base` / `text-display` utilities will auto-generate once components reference them.
- **Plan 03 (spacing + hook)** — 33-01-AUDIT.md provides concrete remap list (6 sites).
- **Plans 04–09** — lucide-react importable for chevron/copy/trash/X icons.

## Commits

| Hash | Type | Message |
|------|------|---------|
| 42082d7 | chore | install lucide-react dependency |
| dfb9809 | feat | add Phase 33 typography/spacing tokens, canonicalize --radius-lg |
| 09f4c4e | docs | audit rounded-lg + gap-3/p-3/m-3 usage for Plan 03 remap |

## Self-Check: PASSED

- `[x]` FOUND: package.json contains `"lucide-react": "^1.8.0"`
- `[x]` FOUND: src/index.css contains all 6 new tokens + canonicalized radius-lg
- `[x]` FOUND: .planning/phases/33-design-system-ui-polish/33-01-AUDIT.md
- `[x]` FOUND commit 42082d7 (lucide-react install)
- `[x]` FOUND commit dfb9809 (tokens)
- `[x]` FOUND commit 09f4c4e (audit)
- `[x]` `npm run build` succeeds
- `[x]` 6/6 tokens.test.ts green
