---
phase: 33-design-system-ui-polish
plan: 01
type: execute
wave: 1
depends_on: [00]
files_modified:
  - package.json
  - package-lock.json
  - src/index.css
autonomous: true
requirements:
  - "GH #83"
  - "GH #90"
must_haves:
  truths:
    - "lucide-react is installed and importable from src/"
    - "src/index.css @theme block defines typography tokens (display/base/sm) using the correct Tailwind v4 prefix so they expose as `text-display` / `text-base` / `text-sm` utilities"
    - "src/index.css @theme block defines spacing/radius canonical scale"
    - "--radius-lg is 8px (canonicalized from 6px), no rounded-lg regressions in visible components"
    - "--spacing-md (12px) is NOT added (removed per checker constraint)"
    - "Plan 01 owns src/index.css for Wave 1 — no other Wave 1 plan writes to this file"
  artifacts:
    - path: "package.json"
      provides: "lucide-react dependency entry"
      contains: "lucide-react"
    - path: "src/index.css"
      provides: "Canonical Phase 33 tokens with Tailwind v4 utility exposure"
  key_links:
    - from: "src/index.css"
      to: "Tailwind v4 compile output"
      via: "@theme {} block with v4-correct prefix"
      pattern: "28px"
    - from: "package.json"
      to: "node_modules/lucide-react"
      via: "npm install"
      pattern: "\"lucide-react\""
---

<objective>
Lay the foundation for Phase 33 by (1) installing `lucide-react` (NOT currently in package.json per research blocker #1), (2) adding canonical typography/spacing/radius tokens to `src/index.css` `@theme {}` block using the CORRECT Tailwind v4 naming prefix so they expose as `text-*` utilities, (3) canonicalizing `--radius-lg` from `6px` to `8px` AND proving no existing component regresses visually (research pitfall #3 / #7).

Purpose: Waves 2 and 3 consume these tokens and icons. Without this plan, every downstream plan blocks.

**Ownership invariant (checker blocker fix):** Plan 01 is the ONLY Wave 1 plan that writes to `src/index.css`. The Tailwind v4 token-naming correction that was previously queued in Plan 02 Task 1 has been pulled into this plan (Task 2) to eliminate the Wave 1 parallel-write hazard. Plan 02 exits this wave with `src/index.css` untouched.

Output: `package.json` with `lucide-react` dep, `src/index.css` with new tokens (v4-correct naming), audit doc of rounded-lg / 12px-spacing sites for Plan 03 to execute.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/33-design-system-ui-polish/33-UI-SPEC.md
@.planning/phases/33-design-system-ui-polish/33-RESEARCH.md
@src/index.css

<interfaces>
Current `src/index.css` tokens (lines 46-48, verified):
```css
--radius-sm: 2px;
--radius-md: 4px;
--radius-lg: 6px;   /* <-- canonicalize to 8px */
```

Current `@theme` block already uses Tailwind v4 conventions (verified): colors defined as `--color-obsidian-base` expose as `bg-obsidian-base` utility. Per Tailwind v4 docs, font-sizes must use the `--text-*` prefix (NOT `--font-size-*`) to expose as `text-{name}` utilities.

Target additions per UI-SPEC "Token Additions" — using the CORRECT v4 prefix:
```css
/* Typography — v4 naming: --text-* exposes as text-* utility */
--text-display: 28px;
--text-base: 13px;
--text-sm: 11px;

/* Spacing — v4 naming: --spacing-* exposes as p-*, m-*, gap-*, etc. */
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-lg: 16px;
--spacing-xl: 24px;
--spacing-2xl: 32px;

/* DO NOT add --spacing-md: 12px (dropped per checker D5) */
```

lucide-react import shape (verified per Plan 04+ contract):
```typescript
import { ChevronRight, ChevronDown, Copy, Trash2, X } from "lucide-react";
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install lucide-react and verify importable</name>
  <files>package.json, package-lock.json</files>
  <read_first>
    - package.json (confirm lucide-react NOT present)
    - .planning/phases/33-design-system-ui-polish/33-RESEARCH.md § "Standard Stack" and § "Environment Availability" (blocking dependency note)
  </read_first>
  <action>
    Run:
    ```bash
    npm install lucide-react
    ```

    Then verify:
    1. `package.json` dependencies section contains `"lucide-react"` with a pinned version (`^0.441.0` or current latest).
    2. Confirm via `npm ls lucide-react`.
    3. Commit `package.json` + `package-lock.json` together.

    IMPORTANT: DO NOT import lucide icons anywhere in `src/` in this task — downstream plans will do that. This task's job is only to install.
  </action>
  <verify>
    <automated>grep -q "\"lucide-react\"" package.json &amp;&amp; npm ls lucide-react 2>&amp;1 | grep -q "lucide-react@"</automated>
  </verify>
  <acceptance_criteria>
    - `grep "\"lucide-react\"" package.json` returns a match
    - `npm ls lucide-react` prints a version (no "not found")
    - `package-lock.json` is updated (shows in git diff)
    - No `lucide-react` imports added to `src/` yet (defer to Plans 04-09)
  </acceptance_criteria>
  <done>lucide-react installed and importable; version pinned in package.json.</done>
</task>

<task type="auto">
  <name>Task 2: Add canonical Phase 33 tokens to src/index.css @theme block with correct Tailwind v4 prefix; canonicalize --radius-lg to 8px</name>
  <files>src/index.css</files>
  <read_first>
    - src/index.css (entire file — small enough; need full context to avoid breaking existing tokens AND to confirm Tailwind v4 namespace convention already in use for colors)
    - .planning/phases/33-design-system-ui-polish/33-UI-SPEC.md § "Spacing Scale", "Typography", "Border Radius", "Token Additions"
    - Tailwind v4 @theme documentation: --text-* is the canonical prefix for font-size utilities (bg-* uses --color-*, text-size uses --text-*)
  </read_first>
  <action>
    Edit `src/index.css` `@theme {}` block to add tokens using the CORRECT Tailwind v4 naming prefix.

    **Determine the prefix by inspection:** Read the existing `@theme` block. If existing tokens like `--color-obsidian-base` resolve to `bg-obsidian-base`, that confirms v4 convention is active. For font-sizes, v4 requires the prefix `--text-*` (NOT `--font-size-*`). Use `--text-*` so the tokens expose as `text-display` / `text-base` / `text-sm` utilities without requiring `text-[var(...)]` arbitrary-value workarounds.

    **Typography (3 tokens — v4 naming):**
    ```css
    /* Phase 33 — Typography scale (D-03, 3 CSS tokens → 6 semantic roles).
       v4 naming: --text-* exposes as text-{name} utility class. */
    --text-display: 28px;
    --text-base: 13px;
    --text-sm: 11px;
    ```

    **Spacing (5 tokens — 12px excluded per checker):**
    ```css
    /* Phase 33 — Canonical spacing scale (D-34; 12px dropped per checker D5).
       v4 naming: --spacing-* exposes as p-{name}/m-{name}/gap-{name}. */
    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-lg: 16px;
    --spacing-xl: 24px;
    --spacing-2xl: 32px;
    ```

    **Radius (canonicalize existing):**
    Change existing `--radius-lg: 6px;` to `--radius-lg: 8px;`. Leave `--radius-sm: 2px` and `--radius-md: 4px` unchanged.

    DO NOT add `--spacing-md: 12px`. The checker requires it dropped.

    **Verify utility exposure after edit:**
    Run `npm run build` and grep the compiled CSS for a rule binding `.text-display { font-size: 28px }` OR inspect via the dev server. If the prefix is wrong, Tailwind will silently skip utility generation — the test suite MUST catch this (tokens.test.ts accepts either `--font-size-display` or `--text-display` regex, but the build-output assertion in this task confirms the utility was actually generated).

    **Wave 1 ownership invariant:** After this task, `src/index.css` is NOT touched again by any Wave 1 plan. Plan 02 does NOT write to this file (its former Task 1 has been absorbed into this task).
  </action>
  <verify>
    <automated>grep -qE "\-\-text-display:\s*28px" src/index.css &amp;&amp; grep -qE "\-\-text-base:\s*13px" src/index.css &amp;&amp; grep -qE "\-\-text-sm:\s*11px" src/index.css &amp;&amp; grep -qE "\-\-spacing-xs:\s*4px" src/index.css &amp;&amp; grep -qE "\-\-radius-lg:\s*8px" src/index.css &amp;&amp; ! grep -qE "\-\-spacing-md:\s*12px" src/index.css &amp;&amp; npm run build 2>&amp;1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - `grep "\-\-text-display: 28px" src/index.css` matches
    - `grep "\-\-text-base: 13px" src/index.css` matches
    - `grep "\-\-text-sm: 11px" src/index.css` matches
    - `grep "\-\-spacing-xs: 4px" src/index.css` matches
    - `grep "\-\-spacing-sm: 8px" src/index.css` matches
    - `grep "\-\-spacing-lg: 16px" src/index.css` matches
    - `grep "\-\-spacing-xl: 24px" src/index.css` matches
    - `grep "\-\-spacing-2xl: 32px" src/index.css` matches
    - `grep "\-\-radius-lg: 8px" src/index.css` matches (changed from 6px)
    - `grep "\-\-spacing-md: 12px" src/index.css` returns nothing
    - `npm run build` succeeds
    - Compiled CSS in `dist/assets/*.css` contains a rule with `font-size:28px` attached to a `.text-display` selector (OR equivalent — Tailwind v4 generates utility classes from @theme tokens). Verify via: `grep -oE "\.text-display[^{]*\{[^}]*28px" dist/assets/*.css 2>/dev/null` returns a match.
    - `npm test -- --run tests/phase33/tokens.test.ts` is GREEN
  </acceptance_criteria>
  <done>Tokens added with v4-correct prefix, --radius-lg canonicalized, 12px spacing not introduced, utilities confirmed in compiled CSS.</done>
</task>

<task type="auto">
  <name>Task 3: Audit rounded-lg + gap-3/p-3/m-3 usage; document non-regressions per research pitfall #3/#7</name>
  <files>.planning/phases/33-design-system-ui-polish/33-01-AUDIT.md</files>
  <read_first>
    - src/components/Toolbar.tsx
    - src/components/Sidebar.tsx
    - src/components/PropertiesPanel.tsx
    - src/components/RoomSettings.tsx
    - .planning/phases/33-design-system-ui-polish/33-RESEARCH.md § "Pitfall 3: --radius-lg change breaks existing components" and § "Pitfall 7: 12px spacing removal"
  </read_first>
  <action>
    The `--radius-lg: 6px → 8px` and Tailwind's `gap-3/p-3/m-3` (which compiles to 12px) are silent breaking changes. Produce an audit doc at `.planning/phases/33-design-system-ui-polish/33-01-AUDIT.md` with:

    1. `grep -rn "rounded-lg" src/components/ src/canvas/ src/three/ 2>/dev/null` — list all files + line numbers using Tailwind's `rounded-lg` utility (which resolves to `var(--radius-lg)` in v4).
    2. For each match: annotate `KEEP` (2px change acceptable) or `FIX` (visible breakage — migrate to explicit class in a later plan).
    3. `grep -rn "\bp-3\b\|\bm-3\b\|\bgap-3\b" src/components/Toolbar.tsx src/components/Sidebar.tsx src/components/PropertiesPanel.tsx src/components/RoomSettings.tsx` — list all 12px-equivalent usages in the 4 D-35 target files.
    4. For each match in the 4 target files: assign remap (`p-2` for 8px OR `p-4` for 16px) for Plan 03 to execute.

    Format:
    ```markdown
    # Phase 33 Plan 01 — Radius/Spacing Audit

    ## --radius-lg: 6px → 8px impact

    | File:Line | Current | Accept Change? | Notes |
    |-----------|---------|----------------|-------|
    | src/components/Foo.tsx:42 | rounded-lg on modal | KEEP | 2px larger; acceptable |

    ## 12px spacing sites in D-35 target files (remap list for Plan 03)

    | File:Line | Current | Remap | Rationale |
    |-----------|---------|-------|-----------|
    | src/components/Toolbar.tsx:88 | gap-3 | gap-2 (8px) | tight toolbar |
    ```

    This audit doc is informational — it does NOT change source code. Plan 03 consumes this list.
  </action>
  <verify>
    <automated>test -f .planning/phases/33-design-system-ui-polish/33-01-AUDIT.md &amp;&amp; grep -q "radius-lg" .planning/phases/33-design-system-ui-polish/33-01-AUDIT.md</automated>
  </verify>
  <acceptance_criteria>
    - `.planning/phases/33-design-system-ui-polish/33-01-AUDIT.md` exists
    - Audit contains a table of `rounded-lg` usages with KEEP/FIX decision per match
    - Audit contains a remap table for `p-3`/`m-3`/`gap-3` in Toolbar/Sidebar/PropertiesPanel/RoomSettings
    - Source files (Toolbar.tsx etc.) were NOT modified — audit is read-only analysis
  </acceptance_criteria>
  <done>Audit doc published; Plan 03 has a concrete remap list to execute.</done>
</task>

</tasks>

<verification>
```bash
# Token tests green
npm test -- --run tests/phase33/tokens.test.ts

# lucide-react resolvable
npm ls lucide-react | grep -q "lucide-react@"

# Build still works and utilities generated
npm run build 2>&1 | tail -5
grep -oE "\.text-display[^{]*\{[^}]*28px" dist/assets/*.css 2>/dev/null | head -1  # expect match

# Wave 1 ownership invariant: Plan 02 must NOT list src/index.css in its files_modified
grep -q "src/index.css" .planning/phases/33-design-system-ui-polish/33-02-typography-PLAN.md && echo "FAIL: Plan 02 still lists src/index.css" || echo "OK"
```
</verification>

<success_criteria>
- [ ] `lucide-react` installed (package.json + lock)
- [ ] 6 new CSS tokens in `src/index.css` using `--text-*` + `--spacing-*` v4 prefix
- [ ] `--radius-lg: 8px` (was 6px)
- [ ] No `--spacing-md: 12px` added
- [ ] Compiled CSS exposes `.text-display { font-size: 28px }` (or equivalent v4 utility binding)
- [ ] Plan 01 AUDIT.md written with remap decisions
- [ ] `tests/phase33/tokens.test.ts` is GREEN
- [ ] `npm run build` succeeds
- [ ] Plan 02's `files_modified` does NOT include `src/index.css`
</success_criteria>

<output>
After completion, create `.planning/phases/33-design-system-ui-polish/33-01-SUMMARY.md` documenting:
- lucide-react version installed
- All tokens added (list) + v4 prefix used
- Audit findings: rounded-lg count + 12px remap count
- Confirmation that Plan 01 owns src/index.css for Wave 1 (no parallel-write hazard)
- Downstream: Plans 02, 03 unblocked
</output>
</output>
