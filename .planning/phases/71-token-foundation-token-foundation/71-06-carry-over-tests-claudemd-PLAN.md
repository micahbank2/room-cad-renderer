---
phase: 71-token-foundation-token-foundation
plan: 06
type: execute
wave: 4
depends_on: ["71-04", "71-05"]
files_modified:
  - tests/snapshotMigration.test.ts
  - tests/pickerMyTexturesIntegration.test.tsx
  - tests/WallMesh.cutaway.test.tsx
  - tests/lib/contextMenuActionCounts.test.ts
  - CLAUDE.md
autonomous: true
requirements: [TOKEN-FOUNDATION]
must_haves:
  truths:
    - "snapshotMigration.test.ts asserts version 6"
    - "pickerMyTexturesIntegration.test.tsx no longer references the removed wallpaper MY TEXTURES tab"
    - "WallMesh.cutaway.test.tsx asserts ghost-spread propagation through resolved Materials (locked YES per researcher recommendation)"
    - "contextMenuActionCounts.test.ts has proper beforeEach reset (no pollution)"
    - "Full vitest suite green: `npm run test`"
    - "Full Playwright suite green: `npm run test:e2e`"
    - "CLAUDE.md updated: D-33 lucide-only (allowlist deleted), D-34 Pascal spacing scale, D-03 typography (Barlow + Geist Mono), new theme system documented"
  artifacts:
    - path: "tests/snapshotMigration.test.ts"
      provides: "v6 contract assertion"
    - path: "tests/WallMesh.cutaway.test.tsx"
      provides: "Ghost-spread propagation audit covering all resolved-Material sites"
    - path: "tests/lib/contextMenuActionCounts.test.ts"
      provides: "Pollution-free test (beforeEach reset)"
    - path: "CLAUDE.md"
      provides: "Updated D-33 / D-34 / D-03; new theme system + label-casing convention sections"
  key_links:
    - from: "Phase verification gate"
      to: "Token sweep proof"
      via: "grep audit + full test suite"
      pattern: "obsidian-|text-text-|glass-panel|material-symbols"
---

<objective>
Final cleanup wave: fix the 4 v1.17 carry-over tests, update CLAUDE.md sections D-33 / D-34 / D-03 + add new theme convention, run final phase grep audit + full test suite.

Purpose: Close the test debt and document the new state so Phase 72 / 73 / 74 / 75 / 76 inherit accurate conventions.
Output: All 4 carry-over tests green; CLAUDE.md reflects post-Phase-71 state; full suite green.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/71-token-foundation-token-foundation/71-CONTEXT.md
@.planning/phases/71-token-foundation-token-foundation/71-RESEARCH.md
@CLAUDE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix snapshotMigration v5→v6 + delete pickerMyTexturesIntegration MY TEXTURES tests</name>
  <read_first>
    - tests/snapshotMigration.test.ts (line 32 specifically — `expect(d.version).toBe(5)`)
    - tests/pickerMyTexturesIntegration.test.tsx (entire file — assess what to delete vs keep)
    - .planning/phases/71-token-foundation-token-foundation/71-RESEARCH.md (§Carry-Over Test Inventory — Test 1, Test 2, Open Question #6)
    - src/lib/serialization.ts and src/types/cad.ts (verify defaultSnapshot returns version 6)
    - src/components/FloorMaterialPicker.tsx and src/components/SurfaceMaterialPicker.tsx (verify MY TEXTURES tab removed in Phase 68)
  </read_first>
  <files>tests/snapshotMigration.test.ts, tests/pickerMyTexturesIntegration.test.tsx</files>
  <action>
    **Step A — snapshotMigration v6 bump:**
    1. First verify source-of-truth: `grep -n "version:\|version =" src/lib/serialization.ts src/types/cad.ts src/lib/snapshot*.ts 2>/dev/null`. Confirm `defaultSnapshot` (or equivalent) returns `version: 6`. If it still returns 5, the source needs the bump too — do that first (this should already be done given Phase 62 was MEASURE-01 v5 and Phase 68 likely bumped to v6 for MAT-APPLY-01).
    2. Edit `tests/snapshotMigration.test.ts:32`: change `expect(d.version).toBe(5)` → `expect(d.version).toBe(6)`.
    3. If migration logic exists in the source (e.g. `migrateV5toV6`), add a quick test asserting an v5 snapshot loads correctly via `loadSnapshot()`. If no migration logic exists yet, simply update the version assertion.

    **Step B — pickerMyTexturesIntegration cleanup:**
    1. Read entire test file. Identify which tests reference the removed wallpaper "MY TEXTURES" tab (these are the ones that fail).
    2. Delete those `it(...)` / `test(...)` blocks. Keep tests that cover the SURVIVING picker behavior (e.g. floor material picker, surface material picker default tab still works).
    3. If after deletion the file has no remaining tests, delete the entire file (and remove from any `vitest.config` includes if listed explicitly).
    4. Run `npx vitest run tests/pickerMyTexturesIntegration.test.tsx` → green.

    Cite as "implements D-12 carry-over tests 1 and 2".
  </action>
  <verify>
    <automated>grep -q "expect(d.version).toBe(6)" tests/snapshotMigration.test.ts && npx vitest run tests/snapshotMigration.test.ts tests/pickerMyTexturesIntegration.test.tsx 2>&1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - `grep "expect(d.version).toBe(6)" tests/snapshotMigration.test.ts` matches exactly 1
    - `grep -c "MY TEXTURES\|MY_TEXTURES" tests/pickerMyTexturesIntegration.test.tsx` returns `0` (or file deleted)
    - `npx vitest run tests/snapshotMigration.test.ts` exits 0
    - `npx vitest run tests/pickerMyTexturesIntegration.test.tsx` exits 0 (or skipped if file deleted)
  </acceptance_criteria>
  <done>Two of four carry-over tests green.</done>
</task>

<task type="auto">
  <name>Task 2: Fix WallMesh.cutaway ghost-spread + contextMenuActionCounts pollution</name>
  <read_first>
    - tests/WallMesh.cutaway.test.tsx (entire file — current 13 site count assertion)
    - src/three/WallMesh.tsx (current count of `<meshStandardMaterial>` sites; check Phase 67/68 added resolved-Material sites)
    - tests/lib/contextMenuActionCounts.test.ts (entire file — find the pollution source)
    - .planning/phases/71-token-foundation-token-foundation/71-RESEARCH.md (§Carry-Over Test Inventory — Test 3 PROPAGATE locked YES; Test 4 beforeEach reset)
    - .planning/phases/71-token-foundation-token-foundation/71-CONTEXT.md (D-12)
  </read_first>
  <files>tests/WallMesh.cutaway.test.tsx, tests/lib/contextMenuActionCounts.test.ts, src/three/WallMesh.tsx (only if propagation gap exists)</files>
  <action>
    **Step A — WallMesh.cutaway audit (locked decision: PROPAGATE through resolved Materials):**
    1. `grep -c "<meshStandardMaterial\|meshPhysicalMaterial" src/three/WallMesh.tsx` → current site count.
    2. Read each `<meshStandardMaterial>` site and confirm whether `{...ghost}` (or whatever the cutaway opacity-spread prop is — check Phase 59 source) reaches it.
    3. If a resolved-Material site (post Phase 67/68) lacks the spread → ADD IT in `src/three/WallMesh.tsx`. Per researcher: "ghosting should still hide the wall in cutaway view; otherwise behavior is inconsistent for unmaterialized vs. materialized walls." Locked YES per CONTEXT.md D-12.
    4. Update `tests/WallMesh.cutaway.test.tsx` site count assertion to match current actual count (e.g. 13 → 14 if a new resolved-Material site exists).
    5. Add new explicit assertions for any new resolved-Material site to ensure ghost-spread propagation.

    **Step B — contextMenuActionCounts pollution:**
    1. Read `tests/lib/contextMenuActionCounts.test.ts`. The pollution is most likely shared mutable state (a module-scoped `Map`, a registered Zustand selector, or a `vi.mock` that doesn't reset).
    2. Add or fix `beforeEach`:
    ```typescript
    beforeEach(() => {
      vi.clearAllMocks();
      // Reset whatever module-level state pollutes (likely cadStore or contextMenuRegistry)
      useCADStore.setState(initialCadState);  // or equivalent reset
    });
    ```
    3. If the pollution is a global registry, also clear it in `afterEach`.
    4. Run the test in isolation AND as part of the full suite:
    ```bash
    npx vitest run tests/lib/contextMenuActionCounts.test.ts
    npx vitest run  # full unit suite
    ```
    Both must be green.

    Cite as "implements D-12 carry-over tests 3 and 4, ghost-spread propagation locked YES per researcher recommendation".
  </action>
  <verify>
    <automated>npx vitest run tests/WallMesh.cutaway.test.tsx tests/lib/contextMenuActionCounts.test.ts 2>&1 | tail -10 && npx vitest run 2>&1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - `npx vitest run tests/WallMesh.cutaway.test.tsx` exits 0
    - `npx vitest run tests/lib/contextMenuActionCounts.test.ts` exits 0 in isolation
    - `npx vitest run` (full unit suite) exits 0 — proves no pollution remains
    - `grep "beforeEach" tests/lib/contextMenuActionCounts.test.ts` matches >= 1
    - If new resolved-Material site exists: `grep -c "ghost\\|opacity\\|cutaway" src/three/WallMesh.tsx` matches the new site count (1 + previous count)
  </acceptance_criteria>
  <done>All 4 carry-over tests green; full unit suite green.</done>
</task>

<task type="auto">
  <name>Task 3: Update CLAUDE.md (D-33, D-34, D-03, new theme convention) + final phase grep audit</name>
  <read_first>
    - CLAUDE.md (entire "Design System (Phase 33 — v1.7.5)" section + "Architecture > State Management Conventions" + "Conventions > UI Label Convention")
    - .planning/phases/71-token-foundation-token-foundation/71-CONTEXT.md (D-09 mixed-case, D-13 squircle, D-14 spacing, D-15/D-16 lucide-only, D-07/D-08 theme)
  </read_first>
  <files>CLAUDE.md</files>
  <action>
    Update the following CLAUDE.md sections — for each, READ the current content first, then apply the listed change:

    **§"Icon Policy (D-33)" — REPLACE WITH:**
    ```markdown
    ### Icon Policy (D-33, updated Phase 71)

    **lucide-react only across the chrome.** The Phase 33 Material Symbols allowlist (10 files) was deleted in Phase 71 (v1.18 TOKEN-FOUNDATION) per D-15.

    Where lucide-react lacks an exact match for a CAD-domain glyph (`stairs`, `arch`, `roofing`), use the closest visual lucide icon and add a one-line comment marking the substitution: `// D-15: substitute for material-symbols 'stairs'`. Acceptable substitutes: stairs → Footprints, arch → Squircle, roofing → Triangle or Home, window → RectangleVertical.

    Do NOT add `material-symbols-outlined` imports anywhere. Do NOT re-introduce the Material Symbols `<link>` in `index.html`.
    ```

    **§"Canonical Spacing + Radius (D-34)" — REPLACE THE TABLE WITH (per D-14):**
    ```markdown
    ### Canonical Spacing + Radius (D-34, updated Phase 71)

    Pascal-aligned spacing scale, defined in `src/index.css` `@theme {}` block:

    | Token | Value | Tailwind utility |
    |-------|-------|------------------|
    | `--spacing-xs` | 8px | `p-1` (under new scale) / `gap-1` |
    | `--spacing-sm` | 12px | `p-2` (under new scale) / `gap-2` |
    | `--spacing-md` | 16px | `p-3` / `p-4` / `gap-3` / `gap-4` |
    | `--spacing-lg` | 24px | `p-6` / `gap-6` |
    | `--spacing-xl` | 32px | `p-8` / `gap-8` |
    | `--radius` | 0.625rem (10px) | base; `--radius-lg` resolves to this |
    | `--radius-sm` | calc(var(--radius) - 4px) (6px) | `rounded-sm` |
    | `--radius-md` | calc(var(--radius) - 2px) (8px) | `rounded-md` |
    | `--radius-lg` | var(--radius) (10px) | `rounded-lg` |
    | `--radius-xl` | calc(var(--radius) + 4px) (14px) | `rounded-xl` |

    Phase 71 dropped the old 4px spacing tier; `p-1` now resolves to 8px. Component files that used `p-1` for tight density may need explicit review (most should remain `p-1` under the new scale; some may want `p-0.5` if Tailwind's stop is desired — verify visually).

    **Squircle utilities (D-13):** `.rounded-smooth` / `.rounded-smooth-md` / `.rounded-smooth-lg` / `.rounded-smooth-xl` apply `corner-shape: squircle` (Safari/WebKit progressive enhancement; Chrome/Firefox fall back to `border-radius`). Apply to cards, modals, dropdowns, buttons, tab containers, inputs. Do NOT apply to Fabric canvas, Three.js viewport, or dimension labels (sharp by design).
    ```

    **§"Typography (D-03)" — REPLACE WITH:**
    ```markdown
    ### Typography (D-03, updated Phase 71)

    Pascal-aligned font stack:

    - `--font-sans: 'Barlow', 'Geist Sans', system-ui, sans-serif` — chrome (`font-sans` Tailwind utility)
    - `--font-mono: 'Geist Mono', ui-monospace, ...` — data sites only (`font-mono` Tailwind utility)

    Sources:
    - Barlow loaded from Google Fonts in `index.html`
    - Geist Sans + Geist Mono via the `geist` npm package (imported in `src/main.tsx`: `import "geist/font/sans"; import "geist/font/mono"`)

    The Phase 33 Space Grotesk display tier was dropped — Barlow handles all chrome typography (large headings via `text-display: 28px`, body via `text-base: 13px`, captions via `text-sm: 11px`).

    **font-mono dual semantics:** UI chrome uses `font-sans` (Barlow). Data labels — wall IDs, status strings (`SAVED`, `BUILDING_SCENE...`), `.toUpperCase()` product/element names rendered in 2D Fabric overlay, dynamic CAD identifiers — keep `font-mono` (Geist Mono).
    ```

    **§"UI Label Convention (Obsidian CAD Theme)" — REPLACE WITH:**
    ```markdown
    ### UI Label Convention (D-09, updated Phase 71)

    Mixed-case for chrome (sentence case or Title Case as appropriate):
    - Section headers: `Room Config`, `System Stats`, `Layers`, `Snap`
    - Tool labels: `Select`, `Wall`, `Door`, `Window`
    - View labels: `2D Plan`, `3D View`, `Library`, `Split`
    - Property labels: `Length`, `Thickness`, `Height`, `Width (ft)`, `Material Finish`

    UPPERCASE preserved (D-10) for dynamic CAD identifiers (data, not chrome):
    - `WALL_SEGMENT_{id}` — wall IDs in 2D overlay
    - `{PRODUCT_NAME_UPPERCASED}` — product/element labels rendered via `.toUpperCase()`
    - Status string values: `READY`, `SAVED`, `BUILDING_SCENE...`, `SAVING`, `SAVE_FAILED` (the dynamic value; the surrounding `System Status:` label is mixed case)
    ```

    **NEW SECTION — add after Typography section:**
    ```markdown
    ### Theme System (Phase 71 — v1.18)

    Light + dark dual mode via Tailwind v4 class-based dark mode. `.dark` class on `<html>` flips all token values.

    - **Hook:** `src/hooks/useTheme.ts` — returns `{ theme, resolved, setTheme }`.
      - `theme`: user choice (`"light" | "dark" | "system"`, default `"system"`)
      - `resolved`: actual rendering mode (`"light" | "dark"`)
      - `setTheme`: persists to `localStorage` under key `room-cad-theme` and applies `<html class="dark">` via effect
    - **Boot bridge:** Inline `<script>` in `index.html` reads localStorage and applies `dark` class BEFORE React mounts (prevents flash of light mode).
    - **Test driver:** `window.__driveTheme(theme)` exposed via `installThemeDrivers()` in `src/test-utils/themeDrivers.ts`. Gated by `import.meta.env.MODE === "test"`. StrictMode-safe via identity-check cleanup (CLAUDE.md §"StrictMode-safe useEffect cleanup" pattern).
    - **No visible toggle UI** in this phase — Phase 76 lands the toggle alongside StatusBar / Settings rework.
    - **WelcomeScreen + ProjectManager + scene-list pages** remain dark-rendering until Phase 76 (D-06).
    ```

    Then run the FINAL PHASE 71 GREP AUDIT shell command to prove no Obsidian survivors anywhere in `src/`:
    ```bash
    ! grep -rln "obsidian-\|text-text-\|cad-grid-bg\|glass-panel\|accent-glow\|ghost-border\|material-symbols\|font-display" src/
    ```
    This must exit 0. If any survivors → fix in this task before commit.

    Run full test suite as final gate:
    ```bash
    npm run test && npm run test:e2e
    ```

    Cite as "implements D-12 documentation update, completes TOKEN-FOUNDATION".
  </action>
  <verify>
    <automated>! grep -rln "obsidian-\|text-text-\|cad-grid-bg\|glass-panel\|accent-glow\|ghost-border\|material-symbols\|font-display" src/ && grep -q "Pascal-aligned spacing scale" CLAUDE.md && grep -q "lucide-react only across the chrome" CLAUDE.md && grep -q "Theme System (Phase 71 — v1.18)" CLAUDE.md && grep -q "Barlow" CLAUDE.md && npm run test 2>&1 | tail -5 && npm run test:e2e 2>&1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - `grep -rln "obsidian-\\|text-text-\\|cad-grid-bg\\|glass-panel\\|accent-glow\\|ghost-border\\|material-symbols\\|font-display" src/ | wc -l` returns `0` (PHASE GATE — final grep audit clean)
    - `grep -q "Pascal-aligned spacing scale" CLAUDE.md` matches
    - `grep -q "lucide-react only across the chrome" CLAUDE.md` matches
    - `grep -q "Theme System (Phase 71" CLAUDE.md` matches
    - `grep -q "Barlow" CLAUDE.md` matches >= 1
    - `grep -q "room-cad-theme" CLAUDE.md` matches (storage key documented)
    - `grep -q "10 file allowlist\\|10-file allowlist" CLAUDE.md` returns 0 (old D-33 allowlist text gone)
    - `npm run test` exits 0
    - `npm run test:e2e` exits 0
  </acceptance_criteria>
  <done>CLAUDE.md reflects post-Phase-71 state; phase grep audit + full suite GREEN.</done>
</task>

</tasks>

<verification>
- All 4 carry-over tests green
- CLAUDE.md sections D-33, D-34, D-03 updated
- New "Theme System (Phase 71)" section added
- Final phase grep audit returns zero hits
- Full vitest + Playwright suite green
</verification>

<success_criteria>
- [ ] snapshotMigration v6 assertion green
- [ ] pickerMyTexturesIntegration cleaned up (or deleted)
- [ ] WallMesh.cutaway propagates ghost spread to all resolved-Material sites
- [ ] contextMenuActionCounts has clean beforeEach reset
- [ ] CLAUDE.md D-33, D-34, D-03 + label convention + theme system sections updated
- [ ] Final grep audit returns zero Obsidian survivors
- [ ] Full test suite green
</success_criteria>

<output>
After completion, create `.planning/phases/71-token-foundation-token-foundation/71-06-SUMMARY.md` with: 4 carry-over tests fixed, CLAUDE.md sections updated, final phase grep audit result, full test counts. This is the final plan summary; gsd-executor will follow up with a phase-level SUMMARY.
</output>
