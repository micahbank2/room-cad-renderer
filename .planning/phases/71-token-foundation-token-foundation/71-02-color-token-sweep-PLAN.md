---
phase: 71-token-foundation-token-foundation
plan: 02
type: execute
wave: 2
depends_on: ["71-01"]
files_modified:
  - src/components/**/*.tsx
  - src/canvas/**/*.tsx
  - src/three/**/*.tsx
  - src/App.tsx
  - src/pages/**/*.tsx
autonomous: true
requirements: [TOKEN-FOUNDATION]
must_haves:
  truths:
    - "Zero `obsidian-*` className references remain in src/"
    - "Zero `text-text-*` className references remain in src/"
    - "All chrome `accent-*` purple references either dropped or remapped to neutral semantic tokens"
    - "All `border-outline-variant*` references swept to `border-border*`"
    - "App still builds and renders (npm run build + npm run dev manual smoke)"
    - "Snap guide hardcoded #7c5bf0 in src/canvas/snapGuides.ts PRESERVED (canvas data, not chrome)"
    - "3D Lighting hex colors PRESERVED (photographic intent, not chrome)"
  artifacts:
    - path: "src/"
      provides: "All chrome surface files using new Pascal token classNames"
  key_links:
    - from: "any UI component"
      to: "Pascal tokens"
      via: "bg-background / bg-card / bg-popover / bg-primary / bg-secondary / bg-accent / text-foreground / text-muted-foreground / border-border / border-ring"
      pattern: "bg-(background|card|popover|primary|secondary|muted|accent|destructive)|text-(foreground|muted-foreground|primary-foreground|accent-foreground)|border-(border|ring|input)"
---

<objective>
Mechanical sweep across ~96 src/ files: replace all Obsidian-era color classNames with Pascal semantic tokens. Zero behavior change — pure className grep-and-replace using the table below.

Purpose: Make the chrome render in Pascal grays (per D-04 one-way commitment).
Output: Every file using `obsidian-*`, `text-text-*`, or chrome-context `accent-*` purple now uses Pascal semantic classNames.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/71-token-foundation-token-foundation/71-CONTEXT.md
@.planning/phases/71-token-foundation-token-foundation/71-RESEARCH.md
@src/index.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Sweep obsidian-* + text-text-* + outline-variant classNames across src/</name>
  <read_first>
    - .planning/phases/71-token-foundation-token-foundation/71-RESEARCH.md (§Token Mapping Table — the EXACT replacement table to apply)
    - .planning/phases/71-token-foundation-token-foundation/71-CONTEXT.md (D-01 sweep ALL, D-02 no aliases)
    - src/index.css (confirm Plan 71-01 landed Pascal tokens — sweep target available)
  </read_first>
  <files>All `*.tsx` and `*.ts` files in `src/` matching the patterns below</files>
  <action>
    Use the EXACT replacement table from RESEARCH.md §Token Mapping Table. Apply to ALL files in `src/`:

    | OLD className              | NEW className                   |
    |----------------------------|---------------------------------|
    | `bg-obsidian-deepest`      | `bg-background`                 |
    | `bg-obsidian-base`         | `bg-background`                 |
    | `bg-obsidian-low`          | `bg-card`                       |
    | `bg-obsidian-mid`          | `bg-popover`                    |
    | `bg-obsidian-high`         | `bg-accent`                     |
    | `bg-obsidian-highest`      | `bg-secondary`                  |
    | `bg-obsidian-bright`       | `bg-secondary`                  |
    | `text-text-primary`        | `text-foreground`               |
    | `text-text-muted`          | `text-muted-foreground`         |
    | `text-text-dim`            | `text-muted-foreground/80`      |
    | `text-text-ghost`          | `text-muted-foreground/60`      |
    | `border-outline-variant/20`| `border-border/50`              |
    | `border-outline-variant/30`| `border-border/60`              |
    | `border-outline-variant`   | `border-border`                 |
    | `border-outline`           | `border-border`                 |

    Also sweep opacity variants (e.g. `bg-obsidian-low/80` → `bg-card/80`, `text-text-primary/50` → `text-foreground/50`).

    For chrome `accent` references (47 files per RESEARCH §File Inventory):
    - `text-accent-light` → `text-foreground` (Pascal has no "light accent" — drop the purple emphasis per D-A1)
    - `text-accent-dim` → `text-muted-foreground`
    - `text-accent-deep` → `text-foreground`
    - `text-accent` (in chrome buttons / hover indicators) → `text-foreground` (let `bg-primary` carry contrast instead)
    - `bg-accent/10`, `bg-accent/20` → `bg-accent/10`, `bg-accent/20` (KEEP — Pascal's `accent` is now neutral so opacity overlays still read as gentle hover)
    - `bg-accent` (filled "active" buttons that meant brand purple) → `bg-primary` (Pascal's filled-button color)
    - `bg-accent` (hover/highlight states) → keep as `bg-accent` (Pascal neutral)
    - `border-accent/30` (focus rings) → `border-ring`
    - `border-accent` → `border-primary`
    - `accent-glow` className uses are removed in Plan 71-03 (custom-class sweep) — leave them alone here

    **Per-site disambiguation rule for `bg-accent`:** if the surrounding code reads "active state" or "filled / brand" → `bg-primary`. If it reads "hover / highlight / subtle wash" → keep `bg-accent`. When ambiguous, prefer `bg-accent` (the neutral default has the lowest visual cost; brand-purple users were the minority).

    PRESERVE (do NOT sweep):
    - `src/canvas/snapGuides.ts` — `const GUIDE_COLOR = "#7c5bf0"` (canvas data per RESEARCH §Risk #1; planner locks: PRESERVE)
    - `src/three/Lighting.tsx` — hex colors `#fff8f0`, `#f5f0e8` (photographic intent per RESEARCH §Risk #3; PRESERVE)
    - 2D Fabric canvas inline grid colors (RESEARCH §code_context — Fabric inline colors are not chrome)
    - Any `accent-*` references inside test files, comments, or `.planning/` (this plan ONLY sweeps `src/` runtime code)
    - Custom CSS classes (`glass-panel`, `accent-glow`, `cad-grid-bg`, `ghost-border`) — Plan 71-03 owns those
    - `font-mono` / `font-display` references — Plan 71-04 owns those
    - `material-symbols-outlined` — Plan 71-04 owns those
    - UPPERCASE_SNAKE labels — Plan 71-05 owns those

    Sweep workflow (file-by-file is safer than rg -r global):
    1. `grep -rln "obsidian-\|text-text-\|outline-variant" src/` → list files
    2. For each file: open, apply mapping, save, run `npm run test:quick` to confirm no broken imports/types
    3. After ALL files swept, run grep audit (verify command below)

    Cite as "implements D-01 / D-02 color token sweep per RESEARCH §Token Mapping Table".
  </action>
  <verify>
    <automated>! grep -rln "obsidian-\|text-text-\|outline-variant" src/ && ! grep -rln "accent-light\|accent-dim\|accent-deep" src/ && npm run build 2>&1 | tail -3 && npm run test:quick 2>&1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - `grep -rln "obsidian-" src/ | wc -l` returns `0`
    - `grep -rln "text-text-" src/ | wc -l` returns `0`
    - `grep -rln "border-outline-variant\|border-outline " src/ | wc -l` returns `0`
    - `grep -rln "text-accent-light\|text-accent-dim\|text-accent-deep" src/ | wc -l` returns `0`
    - `grep -q '"#7c5bf0"' src/canvas/snapGuides.ts` (PRESERVED — must still match)
    - `grep -q '#fff8f0\|#f5f0e8' src/three/Lighting.tsx` (PRESERVED — must still match)
    - `npm run build` exits 0
    - `npm run test:quick` exits 0 (no broken imports / type errors introduced)
  </acceptance_criteria>
  <done>
    Chrome surfaces use Pascal semantic tokens; canvas data + 3D photographic colors preserved; build + quick tests green.
  </done>
</task>

</tasks>

<verification>
- Zero `obsidian-`, `text-text-`, `outline-variant`, `accent-light/dim/deep` survivors in `src/`
- snapGuides hardcoded purple preserved
- Lighting hex colors preserved
- `npm run build && npm run test:quick` green
</verification>

<success_criteria>
- [ ] Color token sweep complete; grep audit clean
- [ ] Build green
- [ ] Quick test suite green (no type/import regressions)
- [ ] Canvas + 3D photographic data preserved
</success_criteria>

<output>
After completion, create `.planning/phases/71-token-foundation-token-foundation/71-02-SUMMARY.md` with: file count swept, mapping decisions made for ambiguous `bg-accent` sites, preserved sites confirmed.
</output>
