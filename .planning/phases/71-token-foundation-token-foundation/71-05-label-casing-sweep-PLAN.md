---
phase: 71-token-foundation-token-foundation
plan: 05
type: execute
wave: 3
depends_on: ["71-02", "71-03"]
files_modified:
  - src/components/**/*.tsx (~25 files with UPPERCASE_SNAKE chrome labels)
  - tests/e2e/specs/*.spec.ts (~20-30 selectors)
autonomous: true
requirements: [TOKEN-FOUNDATION]
must_haves:
  truths:
    - "All UPPERCASE_SNAKE chrome labels in src/components/ swept to mixed case (e.g. SELECT → Select, ROOM_CONFIG → Room Config)"
    - "Dynamic CAD identifiers preserved (WALL_SEGMENT_{id}, .toUpperCase() product names, status strings)"
    - "Playwright e2e selectors updated to match new mixed-case labels (case-insensitive regex preferred where it improves resilience)"
  artifacts:
    - path: "src/components/Toolbar.tsx"
      provides: "Mixed-case button labels (Select, Wall, Door, Window, etc.)"
    - path: "src/components/Sidebar.tsx (or RoomSettings)"
      provides: "Mixed-case section headers (Room Config, System Stats, Layers, Snap)"
  key_links:
    - from: "any chrome label site"
      to: "mixed case rendering"
      via: "Title Case strings replace UPPERCASE_SNAKE"
      pattern: ">[A-Z][a-z][^<]*<"
---

<objective>
Sweep ~25 files of UPPERCASE_SNAKE chrome labels to mixed case (per D-09), preserving dynamic CAD identifiers (per D-10). Update ~20-30 Playwright selectors to match.

Purpose: Pascal aesthetic uses sentence-case chrome; UPPERCASE feels heavy and Obsidian-era.
Output: Toolbar reads "Select / Wall / Door / Window" not "SELECT / WALL / DOOR / WINDOW". CAD data labels (wall IDs, status, product names) still UPPERCASE.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/71-token-foundation-token-foundation/71-CONTEXT.md
@.planning/phases/71-token-foundation-token-foundation/71-RESEARCH.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Sweep UPPERCASE_SNAKE chrome labels to mixed case (~25 files)</name>
  <read_first>
    - .planning/phases/71-token-foundation-token-foundation/71-CONTEXT.md (D-09 chrome sweep, D-10 data preservation allowlist)
    - .planning/phases/71-token-foundation-token-foundation/71-RESEARCH.md (§Token Mapping ¶ font-mono dual semantics)
    - src/components/Toolbar.tsx (most-affected file — read first to understand the current rendering shape)
    - src/canvas/fabricSync.ts (DATA site — confirm WALL_SEGMENT_{id} and product .toUpperCase() rendering — DO NOT TOUCH)
  </read_first>
  <files>
    src/components/Toolbar.tsx,
    src/components/Sidebar.tsx,
    src/components/PropertiesPanel.tsx,
    src/components/RoomSettings.tsx,
    src/components/StatusBar.tsx,
    src/components/ProductLibrary.tsx,
    src/components/AddProductModal.tsx,
    src/components/WelcomeScreen.tsx,
    src/components/TemplatePickerDialog.tsx,
    src/components/HelpModal.tsx,
    src/components/help/HelpSearch.tsx,
    src/components/ProjectManager.tsx,
    src/components/CustomElementsPanel.tsx,
    src/components/MaterialCard.tsx,
    src/components/library/LibraryCard.tsx,
    src/components/RoomsTreePanel/TreeRow.tsx,
    src/components/WainscotPopover.tsx,
    src/components/Toolbar.WallCutoutsDropdown.tsx,
    src/components/MyTexturesList.tsx,
    src/components/PropertiesPanel.OpeningSection.tsx
    (and any others surfaced by grep — see action)
  </files>
  <action>
    CHROME labels to sweep (per D-09, partial list from CONTEXT.md):

    | OLD UPPERCASE_SNAKE       | NEW Mixed Case           |
    |---------------------------|--------------------------|
    | `SELECT`                  | `Select`                 |
    | `WALL`                    | `Wall`                   |
    | `DOOR`                    | `Door`                   |
    | `WINDOW`                  | `Window`                 |
    | `ROOM_CONFIG`             | `Room Config`            |
    | `SYSTEM_STATS`            | `System Stats`           |
    | `LAYERS`                  | `Layers`                 |
    | `SNAP`                    | `Snap`                   |
    | `LIBRARY`                 | `Library`                |
    | `LENGTH`                  | `Length`                 |
    | `THICKNESS`               | `Thickness`              |
    | `HEIGHT`                  | `Height`                 |
    | `WIDTH_FT`                | `Width (ft)`             |
    | `DEPTH_FT`                | `Depth (ft)`             |
    | `MATERIAL_FINISH`         | `Material Finish`        |
    | `2D_PLAN`                 | `2D Plan`                |
    | `3D_VIEW`                 | `3D View`                |
    | `SPLIT`                   | `Split`                  |
    | `DESIGN_YOUR_SPACE`       | `Design Your Space`      |
    | `OBSIDIAN_CAD`            | `Room CAD Renderer`      |
    | `MY_TEXTURES`             | `My Textures`            |
    | `MY_MODELS`               | `My Models`              |
    | `WAINSCOTING`             | `Wainscoting`            |
    | `STAIRS`                  | `Stairs`                 |
    | `OPENING`                 | `Opening`                |
    | `CUSTOM_ELEMENTS`         | `Custom Elements`        |

    Workflow:
    1. `grep -rEn "[A-Z]{3,}_[A-Z_]+" src/components/ > /tmp/upper-snake-sites.txt` to enumerate. Filter false positives (constants, enum values, type names).
    2. Inside JSX text nodes ONLY (between `>` and `<` in `<span>SELECT</span>` shape, OR in `aria-label="SELECT"` strings, OR in `title="..."` props): apply mapping table.
    3. Constants in TypeScript code (e.g. `STAGES`, `PRIORITIES` arrays, `STORAGE_KEY = "ROOM_CONFIG"` etc.): leave alone — those are data, not chrome.

    PRESERVE per D-10 allowlist (DO NOT sweep these — they are dynamic data):
    - `src/canvas/fabricSync.ts`: `WALL_SEGMENT_${id}` template strings (Phase 33 D-10 dynamic identifiers)
    - `src/canvas/fabricSync.ts`: `.toUpperCase()` calls on product/element name labels
    - `src/components/StatusBar.tsx`: dynamic status string values like `READY`, `SAVED`, `BUILDING_SCENE...`, `SAVING`, `SAVE_FAILED` (Phase 28 contract)
      → SWEEP only the static label `SYSTEM_STATUS:` → `System Status:`. KEEP the dynamic value rendering.
    - `src/components/MeasureLineLabel.tsx` if exists: dynamic numeric values
    - Any `.toUpperCase()` call rendered in 2D Fabric overlay (data labels by design)

    Aria-label sweep guidance: `aria-label="SELECT"` → `aria-label="Select"`. Where lucide-react icons are used (post Plan 71-04), aria-labels become the only accessible name — make them descriptive ("Select tool") rather than terse ("Select").

    Cite as "implements D-09 chrome label sweep, D-10 data-site preservation".
  </action>
  <verify>
    <automated>UPPER=$(grep -rEn ">\s*[A-Z][A-Z_]{2,}\s*<" src/components/ | grep -v "WALL_SEGMENT_\|STAGES\|PRIORITIES\|TIERS\|INDUSTRIES\|COMPETITORS\|ROLES\|STRENGTHS\|OPP_STAGES\|OPP_TYPES\|CONTACT_ROLES\|RELATIONSHIP" | wc -l); echo "Remaining chrome UPPER_SNAKE: $UPPER"; [ "$UPPER" -le "5" ] && grep -q "WALL_SEGMENT_" src/canvas/fabricSync.ts && npm run build 2>&1 | tail -3</automated>
  </verify>
  <acceptance_criteria>
    - `grep -rEn ">\\s*[A-Z][A-Z_]{2,}\\s*<" src/components/ | wc -l` returns <= 5 (essentially zero chrome UPPERCASE survivors; 5-line tolerance for false positives)
    - `grep -q "WALL_SEGMENT_" src/canvas/fabricSync.ts` matches (data preserved)
    - `grep -q "OBSIDIAN_CAD" src/` returns nothing (title swept across the codebase, including index.html which Plan 71-01 already handled)
    - `grep ">Select<\\|>Wall<\\|>Door<" src/components/Toolbar.tsx` matches >= 4 (replacement labels visible in Toolbar)
    - `npm run build` exits 0
  </acceptance_criteria>
  <done>Chrome reads sentence-case; data identifiers preserved.</done>
</task>

<task type="auto">
  <name>Task 2: Update Playwright e2e selectors to match new labels</name>
  <read_first>
    - tests/e2e/specs/preset-toolbar-and-hotkeys.spec.ts (most likely affected)
    - tests/e2e/specs/*.spec.ts (other e2e specs)
    - .planning/phases/71-token-foundation-token-foundation/71-CONTEXT.md (D-11 selector update guidance)
    - .planning/phases/71-token-foundation-token-foundation/71-RESEARCH.md (§Risk #5 toHaveScreenshot audit)
  </read_first>
  <files>tests/e2e/specs/*.spec.ts</files>
  <action>
    Step A — Audit `toHaveScreenshot` usage (RESEARCH §Risk #5 LOW confidence). Run:
    ```bash
    grep -rln "toHaveScreenshot" tests/
    ```
    If any found → flag in summary; per user MEMORY, OS-coupled goldens should be replaced with in-run pixelmatch (out of scope for this phase — note in summary, file as Phase 999.x backlog if found).

    Step B — Sweep selectors. For each spec file:
    1. Find `getByText("SELECT")`, `getByLabel("WALL")`, `getByText(/SELECT/)`, etc.
    2. Update to mixed case OR (preferably for resilience) use `getByRole('button', { name: /select/i })` (case-insensitive regex) per D-11.

    Concrete replacements likely needed (researcher estimate ~20-30 sites):

    | OLD selector                       | NEW selector                                       |
    |-----------------------------------|----------------------------------------------------|
    | `getByText("SELECT")`             | `getByRole('button', { name: /select/i })`        |
    | `getByText("WALL")`               | `getByRole('button', { name: /^wall$/i })`        |
    | `getByText("DOOR")`               | `getByRole('button', { name: /door/i })`          |
    | `getByText("WINDOW")`             | `getByRole('button', { name: /window/i })`        |
    | `getByText("STAIRS")`             | `getByRole('button', { name: /stairs/i })`        |
    | `getByText("2D_PLAN")`            | `getByRole('button', { name: /2d plan/i })`       |
    | `getByText("3D_VIEW")`            | `getByRole('button', { name: /3d view/i })`       |
    | `getByLabel("LENGTH")`            | `getByLabel(/length/i)`                            |
    | `getByLabel("WIDTH_FT")`          | `getByLabel(/width \(ft\)/i)`                      |

    Where the test asserts on a UPPERCASE string that's now mixed case in the DOM, update the assertion accordingly.

    Step C — Run e2e (smoke):
    ```bash
    npx playwright test tests/e2e/specs/preset-toolbar-and-hotkeys.spec.ts --project=chromium-dev
    ```
    Confirm green. If broken selectors remain, surface in summary.

    Cite as "implements D-11 e2e selector update".
  </action>
  <verify>
    <automated>! grep -rEn 'getByText\("(SELECT|WALL|DOOR|WINDOW|2D_PLAN|3D_VIEW|ROOM_CONFIG|LIBRARY|STAIRS)"\)' tests/ && ! grep -rEn 'getByLabel\("(LENGTH|THICKNESS|WIDTH_FT|HEIGHT|DEPTH_FT)"\)' tests/ && npx playwright test tests/e2e/specs/preset-toolbar-and-hotkeys.spec.ts --project=chromium-dev --reporter=line 2>&1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - `grep -rEn 'getByText\\("(SELECT|WALL|DOOR|WINDOW|2D_PLAN|3D_VIEW)"\\)' tests/ | wc -l` returns `0`
    - `grep -rEn 'getByLabel\\("(LENGTH|WIDTH_FT|THICKNESS|HEIGHT)"\\)' tests/ | wc -l` returns `0`
    - At least one spec uses `getByRole('button', { name: /select/i })` style (D-11 resilience adoption — `grep -c "name: /[a-z]/i" tests/e2e/specs/preset-toolbar-and-hotkeys.spec.ts` returns >= 1)
    - `npx playwright test tests/e2e/specs/preset-toolbar-and-hotkeys.spec.ts --project=chromium-dev` exits 0
    - `toHaveScreenshot` audit result documented in summary (zero found expected; if found, flag for backlog)
  </acceptance_criteria>
  <done>Selectors stable against future label tweaks; preset-toolbar e2e green.</done>
</task>

</tasks>

<verification>
- Chrome labels mixed-case; data labels still UPPERCASE
- Playwright preset-toolbar spec green with new selectors
- toHaveScreenshot audit complete (no goldens expected; documented if found)
</verification>

<success_criteria>
- [ ] ~25 component files swept to mixed case
- [ ] Data preservation allowlist honored (D-10)
- [ ] e2e selectors updated; case-insensitive regex preferred for resilience (D-11)
- [ ] preset-toolbar e2e green
</success_criteria>

<output>
After completion, create `.planning/phases/71-token-foundation-token-foundation/71-05-SUMMARY.md` with: file count swept, data preservation sites confirmed, e2e selector counts updated, toHaveScreenshot audit result.
</output>
