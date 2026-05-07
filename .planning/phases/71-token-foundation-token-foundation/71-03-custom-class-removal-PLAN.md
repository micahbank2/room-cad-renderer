---
phase: 71-token-foundation-token-foundation
plan: 03
type: execute
wave: 2
depends_on: ["71-01"]
files_modified:
  - src/components/PropertiesPanel.tsx
  - src/components/Toolbar.tsx
  - src/components/Toolbar.WallCutoutsDropdown.tsx
  - src/components/WainscotPopover.tsx
  - src/components/MyTexturesList.tsx
  - src/components/WelcomeScreen.tsx
  - src/components/StatusBar.tsx
  - src/components/PropertiesPanel.OpeningSection.tsx
  - src/components/library/LibraryCard.tsx
  - src/components/MaterialCard.tsx
  - src/components/ui/FloatingSelectionToolbar.tsx
  - src/components/ui/GestureChip.tsx
autonomous: true
requirements: [TOKEN-FOUNDATION]
must_haves:
  truths:
    - "Zero `glass-panel` className references in src/"
    - "Zero `ghost-border` className references in src/"
    - "Zero `accent-glow` className references in src/"
    - "Zero `cad-grid-bg` className references in src/"
    - "Replacements applied per D-03 (glass-panel → bg-card border border-border; ghost-border → border border-border/50; accent-glow → no replacement; cad-grid-bg → no replacement on chrome)"
    - "Phase 33 D-04 commitment honored — Obsidian frosted-blur + purple-glow + dot-grid look intentionally killed"
  artifacts:
    - path: "src/"
      provides: "Custom Obsidian CSS classes deleted from all chrome surfaces"
  key_links:
    - from: "any panel component"
      to: "Pascal flat-card aesthetic"
      via: "bg-card border border-border (replaces glass-panel)"
      pattern: "bg-card.*border.*border-border"
---

<objective>
Strip the four Obsidian custom CSS classes (`glass-panel`, `ghost-border`, `accent-glow`, `cad-grid-bg`) from the 13 file usages identified in RESEARCH §File Inventory. The CSS class definitions themselves were already deleted from `src/index.css` in Plan 71-01; this plan removes the className uses across components.

Purpose: Honor D-04's one-way commitment — kill the Obsidian frosted-blur + purple-glow + dot-grid signature look.
Output: Pascal-flat panels (no backdrop blur, no purple glow, no dot grid on chrome surfaces).
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
  <name>Task 1: Strip glass-panel + ghost-border + accent-glow + cad-grid-bg from all 13 files</name>
  <read_first>
    - .planning/phases/71-token-foundation-token-foundation/71-RESEARCH.md (§File Inventory — exact 7 + 10 + 2 + 1 file lists; §Risk #2 the 47 chrome accent refs)
    - .planning/phases/71-token-foundation-token-foundation/71-CONTEXT.md (D-03 replacements, D-04 one-way commitment)
    - Each of the 13 listed files (read before editing)
  </read_first>
  <files>
    src/components/PropertiesPanel.tsx,
    src/components/Toolbar.tsx,
    src/components/Toolbar.WallCutoutsDropdown.tsx,
    src/components/WainscotPopover.tsx,
    src/components/MyTexturesList.tsx,
    src/components/WelcomeScreen.tsx,
    src/components/StatusBar.tsx,
    src/components/PropertiesPanel.OpeningSection.tsx,
    src/components/library/LibraryCard.tsx,
    src/components/MaterialCard.tsx,
    src/components/ui/FloatingSelectionToolbar.tsx,
    src/components/ui/GestureChip.tsx
  </files>
  <action>
    Apply the EXACT replacement table from D-03:

    | OLD className          | NEW className                              |
    |------------------------|--------------------------------------------|
    | `glass-panel`          | `bg-card border border-border`             |
    | `ghost-border`         | `border border-border/50`                  |
    | `accent-glow`          | (delete — no replacement; no glow)         |
    | `cad-grid-bg`          | (delete — no chrome dot grid)              |

    Per-file workflow:

    **`src/components/PropertiesPanel.tsx`** — has `glass-panel`. Replace each occurrence with `bg-card border border-border`. If a parent already has `border` from another className, drop the duplicate.

    **`src/components/Toolbar.tsx`** — has `glass-panel` AND `accent-glow` AND `ghost-border`. Replace `glass-panel` per table; DELETE `accent-glow` (the active-tool indicator now relies on `bg-primary` color contrast — D-03 explicitly says "no replacement"); replace `ghost-border` per table.

    **`src/components/Toolbar.WallCutoutsDropdown.tsx`** — has `glass-panel` AND `ghost-border`. Apply per table.

    **`src/components/WainscotPopover.tsx`** — has `glass-panel` AND `ghost-border`. Apply per table.

    **`src/components/MyTexturesList.tsx`** — has `ghost-border`. Apply per table.

    **`src/components/WelcomeScreen.tsx`** — has `ghost-border`. Apply per table.

    **`src/components/StatusBar.tsx`** — has `ghost-border`. Apply per table.

    **`src/components/PropertiesPanel.OpeningSection.tsx`** — has `ghost-border`. Apply per table.

    **`src/components/library/LibraryCard.tsx`** — has `ghost-border`. Apply per table.

    **`src/components/MaterialCard.tsx`** — has `ghost-border`. Apply per table.

    **`src/components/ui/FloatingSelectionToolbar.tsx`** — has `glass-panel`. Apply per table.

    **`src/components/ui/GestureChip.tsx`** — has `glass-panel`. Apply per table.

    PRESERVE (per RESEARCH §Pitfall #5):
    - `src/canvas/grid.ts` — Fabric canvas grid drawing is DATA, not chrome. Do not touch.
    - Any `accent-glow` references inside `.planning/` docs or comments (only sweep runtime `*.tsx` / `*.ts`).

    For any file where deleting `accent-glow` leaves a tag with no className artifact, audit visually post-build to ensure the active-tool / active-button still reads as "selected" via Pascal `bg-primary` contrast (D-03 explicitly lets contrast carry the visual). If a button looks too flat, the fix is per-site `aria-pressed:bg-primary aria-pressed:text-primary-foreground` or similar — but DO NOT add accent-glow back. D-04 is one-way.

    Cite as "implements D-03 custom class sweep, D-04 one-way commitment".
  </action>
  <verify>
    <automated>! grep -rln "glass-panel\|ghost-border\|accent-glow\|cad-grid-bg" src/ && npm run build 2>&1 | tail -3 && npm run test:quick 2>&1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - `grep -rln "glass-panel" src/ | wc -l` returns `0`
    - `grep -rln "ghost-border" src/ | wc -l` returns `0`
    - `grep -rln "accent-glow" src/ | wc -l` returns `0`
    - `grep -rln "cad-grid-bg" src/ | wc -l` returns `0`
    - `grep -c "bg-card border border-border" src/components/PropertiesPanel.tsx` returns >= 1 (proves replacement landed)
    - `grep -c "border border-border/50" src/components/StatusBar.tsx` returns >= 1
    - `npm run build` exits 0
    - `npm run test:quick` exits 0
  </acceptance_criteria>
  <done>Custom Obsidian classes wiped from chrome. Pascal flat-card aesthetic in place.</done>
</task>

</tasks>

<verification>
- Zero custom-class survivors in `src/`
- Build + quick test green
- Fabric canvas grid (data) preserved
</verification>

<success_criteria>
- [ ] All 13 files swept
- [ ] grep audit clean
- [ ] Build green
- [ ] No regression in quick tests
</success_criteria>

<output>
After completion, create `.planning/phases/71-token-foundation-token-foundation/71-03-SUMMARY.md` with: 13 files swept, replacement decisions per file, any visual flatness areas to watch in Phase 76 / 72 (component primitives).
</output>
