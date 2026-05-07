---
phase: 71-token-foundation-token-foundation
plan: 04
type: execute
wave: 3
depends_on: ["71-02", "71-03"]
files_modified:
  - src/components/**/*.tsx (font + icon + rounded sweeps)
  - src/index.css (any leftover font-display references)
autonomous: true
requirements: [TOKEN-FOUNDATION]
must_haves:
  truths:
    - "Zero `material-symbols-outlined` references in src/ (D-15 / D-16 — drop the 10-file allowlist entirely)"
    - "Zero `font-display` className references in src/ (4 files — Barlow handles all chrome typography)"
    - "Chrome `font-mono` uses remapped to `font-sans` (Barlow); data sites preserved per D-10 allowlist"
    - "All `rounded-sm` chrome surfaces remapped to `rounded-md` or `rounded-smooth-md` (per D-13 surface list)"
    - "10 Material Symbols sites use lucide-react equivalents (per D-15 mapping table)"
  artifacts:
    - path: "src/components/Toolbar.tsx"
      provides: "lucide-react icons replacing Material Symbols glyphs"
      contains: "lucide-react"
    - path: "src/"
      provides: "Pascal-aligned typography (Barlow chrome, Geist Mono data) + 10px squircle corners"
  key_links:
    - from: "any chrome icon site"
      to: "lucide-react"
      via: "import { LayoutGrid, Footprints, Undo2, ... } from 'lucide-react'"
      pattern: "from\\s+['\"]lucide-react['\"]"
    - from: "any card / button / dropdown / input chrome"
      to: "Pascal squircle"
      via: "rounded-smooth-md (or rounded-md fallback)"
      pattern: "rounded-(smooth-)?(md|lg|xl)"
---

<objective>
Combined font + radius + icon sweep across the chrome. Three concerns share this plan because they touch the same files (Toolbar, ProductLibrary, modals) and benefit from a single coordinated pass.

Purpose: Land Pascal typography (Barlow + Geist Mono), Pascal radius (10px squircle), and lucide-only icons in one cohesive pass.
Output: Chrome reads as Pascal — no IBM Plex Mono in UI labels, no 2px sharp corners on cards/buttons, no Material Symbols.
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
  <name>Task 1: font-mono / font-display sweep — chrome → Barlow, data → Geist Mono</name>
  <read_first>
    - .planning/phases/71-token-foundation-token-foundation/71-CONTEXT.md (D-09 mixed case sweep, D-10 data-site preservation allowlist)
    - .planning/phases/71-token-foundation-token-foundation/71-RESEARCH.md (§Font Migration Plan, §Open Question #3)
    - src/index.css (post Plan 71-01 — confirm font-sans = Barlow, font-mono = Geist Mono)
  </read_first>
  <files>~50 files using `font-mono` or `font-display` (run grep to enumerate)</files>
  <action>
    Two-pass sweep with allowlist for data sites:

    **Pass 1 — `font-display` (4 files):** Delete the className entirely. Pascal has no display tier; Barlow at the existing `text-display: 28px` carries hero text. The token `--font-display` was already deleted in Plan 71-01.

    **Pass 2 — `font-mono` (50 files): split chrome vs. data per D-10 allowlist.**

    DATA sites (KEEP `font-mono` → resolves to Geist Mono):
    - `src/canvas/dimensions.ts` — Fabric wall dimension labels (data — physical measurements)
    - `src/canvas/fabricSync.ts` — `WALL_SEGMENT_{id}` labels and `{PRODUCT_NAME}` UPPERCASE labels (D-10 dynamic identifiers)
    - `src/components/StatusBar.tsx` — `SYSTEM_STATUS: READY` / `SAVED` / `BUILDING_SCENE...` strings (D-10 status strings)
    - `src/components/MeasureLineLabel.tsx` (if exists) — measurement values (data)
    - Any place rendering an ID via `.toUpperCase()` on a CAD identifier (D-10)

    CHROME sites (sweep `font-mono` → `font-sans`):
    - All other UI: section headers, panel headers, button labels, tab labels, property field labels (LENGTH/WIDTH labels become mixed case in Plan 71-05 anyway)
    - Toolbar, Sidebar, PropertiesPanel, ProductLibrary, modals, popovers, welcome screen, status bar (the chrome PARTS — not the dynamic status string itself)

    Workflow:
    1. `grep -rln "font-mono" src/ > /tmp/font-mono-sites.txt`
    2. For each file: open and decide per allowlist. If unsure, prefer `font-sans` (Pascal default chrome).
    3. Special case: `<StatusBar>` has BOTH chrome ("SYSTEM_STATUS:" label is chrome — sweep) AND data ("READY" / "SAVED" — keep). Keep the dynamic value `font-mono`, sweep the static label.

    Cite as "implements D-10 chrome/data split per font-mono dual-semantics".
  </action>
  <verify>
    <automated>grep -rln "font-display" src/ | wc -l | tr -d '\n' | { read n; [ "$n" = "0" ]; } && grep -c "font-mono" src/canvas/fabricSync.ts | tr -d '\n' | { read n; [ "$n" -ge "1" ]; } && npm run build 2>&1 | tail -3</automated>
  </verify>
  <acceptance_criteria>
    - `grep -rln "font-display" src/ | wc -l` returns `0`
    - `grep -rln "font-mono" src/canvas/ | wc -l` returns >= 1 (data sites preserved)
    - `grep -rln "font-mono" src/components/Toolbar.tsx` (chrome) returns 0 occurrences (`grep -c` returns 0)
    - `grep -rln "font-mono" src/components/StatusBar.tsx` returns >= 1 (dynamic status value preserved) — note: this is acceptable because the static label was swept
    - `npm run build` exits 0
  </acceptance_criteria>
  <done>Chrome runs Barlow; data labels run Geist Mono; build green.</done>
</task>

<task type="auto">
  <name>Task 2: rounded-sm sweep — chrome surfaces → rounded-smooth-md (or rounded-md fallback)</name>
  <read_first>
    - .planning/phases/71-token-foundation-token-foundation/71-CONTEXT.md (D-13 squircle opt-in surfaces)
    - .planning/phases/71-token-foundation-token-foundation/71-RESEARCH.md (§Squircle Progressive Enhancement)
    - src/index.css (post Plan 71-01 — confirm `.rounded-smooth-md` exists)
  </read_first>
  <files>~41 files using `rounded-sm` (run grep to enumerate)</files>
  <action>
    Per D-13 surface allowlist for squircle:
    - **Cards (panels, modals, dropdowns):** sweep `rounded-sm` → `rounded-smooth-md`
    - **Buttons:** sweep `rounded-sm` → `rounded-smooth-md`
    - **Tab containers:** sweep `rounded-sm` → `rounded-smooth-md`
    - **Inputs:** sweep `rounded-sm` → `rounded-smooth-md`

    Sharp-corner surfaces (per D-13 — DO NOT sweep):
    - Fabric canvas elements (any `rounded-sm` inside `src/canvas/` — sharp by design)
    - Three.js viewport overlays
    - Dimension labels (sharp — per D-13)

    Heuristic for ambiguous sites: if the className surrounds an interactive surface (button, card, input) → `rounded-smooth-md`. If it's a "tag", "badge", or visual indicator with text content → `rounded-md` (gentler 8px, no squircle — keeps tighter visual rhythm).

    Workflow:
    1. `grep -rln "rounded-sm" src/ > /tmp/rounded-sm-sites.txt`
    2. For each file: classify per allowlist. Most `rounded-sm` in `src/components/` should become `rounded-smooth-md`.
    3. Skip `src/canvas/` and `src/three/` matches.

    Cite as "implements D-13 squircle surface allowlist".
  </action>
  <verify>
    <automated>grep -rln "rounded-sm" src/components/ | wc -l | tr -d '\n' | { read n; [ "$n" -le "5" ]; } && grep -rln "rounded-smooth" src/components/ | wc -l | tr -d '\n' | { read n; [ "$n" -ge "10" ]; } && npm run build 2>&1 | tail -3</automated>
  </verify>
  <acceptance_criteria>
    - `grep -rln "rounded-sm" src/components/ | wc -l` returns <= 5 (badges/tags exempted; everything else swept)
    - `grep -rln "rounded-smooth" src/components/ | wc -l` returns >= 10 (broad adoption proves sweep happened)
    - `grep "rounded-sm" src/canvas/` and `grep "rounded-sm" src/three/` results unchanged from before sweep (sharp-corner data preserved)
    - `npm run build` exits 0
  </acceptance_criteria>
  <done>Chrome surfaces show 10px squircle corners (Safari) / rounded-md fallback (Chrome).</done>
</task>

<task type="auto">
  <name>Task 3: Material Symbols → lucide-react icon migration (10 files)</name>
  <read_first>
    - .planning/phases/71-token-foundation-token-foundation/71-CONTEXT.md (D-15 / D-16 lucide-only commitment)
    - .planning/phases/71-token-foundation-token-foundation/71-RESEARCH.md (§Icon Migration Plan — exact glyph → lucide mapping)
    - Each of the 10 allowlist files (read before editing)
  </read_first>
  <files>
    src/components/Toolbar.tsx,
    src/components/Toolbar.WallCutoutsDropdown.tsx,
    src/components/WelcomeScreen.tsx,
    src/components/TemplatePickerDialog.tsx,
    src/components/HelpModal.tsx,
    src/components/AddProductModal.tsx,
    src/components/ProductLibrary.tsx,
    src/components/RoomsTreePanel/TreeRow.tsx,
    src/components/help/HelpSearch.tsx
  </files>
  <action>
    Apply the EXACT mapping table from RESEARCH §Icon Migration Plan:

    | Material Symbols glyph | lucide-react import | Notes                                  |
    |------------------------|---------------------|----------------------------------------|
    | `grid_view`            | `LayoutGrid`        | direct                                 |
    | `directions_walk`      | `Footprints`        | D-15 substitute                        |
    | `undo`                 | `Undo2`             | direct                                 |
    | `redo`                 | `Redo2`             | direct                                 |
    | `door_front`           | `DoorOpen`          | direct                                 |
    | `window`               | `RectangleVertical` | D-15 substitute (no exact lucide)      |
    | `roofing`              | `Triangle`          | D-15 substitute                        |
    | `stairs`               | `Footprints`        | D-15 substitute (or custom inline SVG) |
    | `arch`                 | `Squircle`          | D-15 substitute                        |
    | `zoom_in`              | `ZoomIn`            | direct                                 |
    | `zoom_out`             | `ZoomOut`           | direct                                 |
    | `fit_screen`           | `Maximize`          | direct                                 |

    Per-file workflow:

    1. Open file. Identify each `<span className="material-symbols-outlined">{glyph}</span>` site (or whatever the project's render shape is).
    2. Add import: `import { LayoutGrid, Footprints, Undo2, ... } from "lucide-react";`
    3. Replace each `<span>...</span>` site with `<LayoutGrid className="..." />` (or whatever lucide-react component name maps).
    4. For substituted glyphs (where lucide lacks an exact match), add a one-line comment: `// D-15: substitute for material-symbols 'arch'`.
    5. For `stairs` in `src/components/RoomsTreePanel/TreeRow.tsx` (Phase 60 — was the second D-33 allowlist site): use `Footprints` and the D-15 comment.
    6. After all sites swept, the file should have ZERO `material-symbols` references.

    Sizing: lucide-react icons default to 24×24. Match existing icon sizing via `className="w-4 h-4"` (16px) or `className="w-5 h-5"` (20px) per existing visual weight.

    Per D-16: the `.material-symbols-outlined` CSS class was already deleted in Plan 71-01. The Material Symbols `<link>` was removed from `index.html` in Plan 71-01. This task only sweeps the className uses inside JSX.

    Cite as "implements D-15 icon migration, D-16 allowlist removal".
  </action>
  <verify>
    <automated>! grep -rln "material-symbols-outlined" src/ && for f in src/components/Toolbar.tsx src/components/Toolbar.WallCutoutsDropdown.tsx src/components/WelcomeScreen.tsx src/components/TemplatePickerDialog.tsx src/components/HelpModal.tsx src/components/AddProductModal.tsx src/components/ProductLibrary.tsx src/components/RoomsTreePanel/TreeRow.tsx src/components/help/HelpSearch.tsx; do grep -q "from ['\"]lucide-react['\"]" "$f" || { echo "MISSING lucide import: $f"; exit 1; }; done && npm run build 2>&1 | tail -3</automated>
  </verify>
  <acceptance_criteria>
    - `grep -rln "material-symbols-outlined" src/ | wc -l` returns `0` (D-16 enforced)
    - `grep -rln "material-symbols" src/ | wc -l` returns `0` (catches stragglers)
    - All 9 files (Toolbar.tsx, Toolbar.WallCutoutsDropdown.tsx, WelcomeScreen.tsx, TemplatePickerDialog.tsx, HelpModal.tsx, AddProductModal.tsx, ProductLibrary.tsx, RoomsTreePanel/TreeRow.tsx, help/HelpSearch.tsx) import from `lucide-react`
    - `grep -c "// D-15:" src/components/RoomsTreePanel/TreeRow.tsx` returns >= 1 (substitute comment for stairs)
    - `npm run build` exits 0
    - `npm run test:quick` exits 0
  </acceptance_criteria>
  <done>Icon chrome is lucide-only. D-33 allowlist deleted in CLAUDE.md update (Plan 71-05).</done>
</task>

</tasks>

<verification>
- Zero `font-display`, zero `material-symbols`, zero chrome `font-mono` (data-site allowlist preserved)
- Pascal squircle adopted on cards/buttons/inputs/tabs
- All 9 lucide-react migration files import from lucide-react
- `npm run build && npm run test:quick` green
</verification>

<success_criteria>
- [ ] font-mono dual-semantics split correctly (chrome → Barlow, data → Geist Mono)
- [ ] rounded-sm chrome surfaces swept to rounded-smooth-md (Fabric/Three preserved)
- [ ] All 10 Material Symbols files use lucide-react
- [ ] Build + test:quick green
</success_criteria>

<output>
After completion, create `.planning/phases/71-token-foundation-token-foundation/71-04-SUMMARY.md` with: font sites swept (chrome vs. data counts), rounded-sm sites swept, icon substitutions made (lucide names + D-15 substitute comments).
</output>
