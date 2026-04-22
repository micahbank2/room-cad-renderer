---
phase: 33-design-system-ui-polish
plan: 03
type: execute
wave: 1
depends_on: [00, 01]
files_modified:
  - src/components/Toolbar.tsx
  - src/components/Sidebar.tsx
  - src/components/PropertiesPanel.tsx
  - src/components/RoomSettings.tsx
  - src/hooks/useReducedMotion.ts
  - CLAUDE.md
autonomous: true
requirements:
  - "GH #90"
must_haves:
  truths:
    - "Zero `p-[Npx]`, `m-[Npx]`, `rounded-[Npx]`, `gap-[Npx]` arbitrary values exist in Toolbar.tsx / Sidebar.tsx / PropertiesPanel.tsx / RoomSettings.tsx"
    - "Material Symbols kept ONLY on the 8 allowlist files identified in research (33 occurrences); no new MS imports added in Phase 33 UI chrome"
    - "src/hooks/useReducedMotion.ts exports a hook subscribing to matchMedia('(prefers-reduced-motion: reduce)')"
    - "CLAUDE.md documents the icon policy (lucide for UI chrome; MS for CAD glyphs) and the canonical spacing scale (4/8/16/24/32)"
  artifacts:
    - path: "src/components/Toolbar.tsx"
      provides: "Zero arbitrary Tailwind values"
    - path: "src/components/Sidebar.tsx"
      provides: "Zero arbitrary Tailwind values"
    - path: "src/components/PropertiesPanel.tsx"
      provides: "Zero arbitrary Tailwind values"
    - path: "src/components/RoomSettings.tsx"
      provides: "Zero arbitrary Tailwind values"
    - path: "src/hooks/useReducedMotion.ts"
      provides: "Shared reduced-motion hook for all Phase 33 animations"
    - path: "CLAUDE.md"
      provides: "Documented icon policy + canonical spacing scale"
  key_links:
    - from: "src/hooks/useReducedMotion.ts"
      to: "window.matchMedia"
      via: "matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change')"
      pattern: "prefers-reduced-motion"
---

<objective>
Ship GH #90 — normalize spacing, border-radius, and icon policy across the 4 highest-traffic UI files. Zero arbitrary `p-[Npx]`, `m-[Npx]`, `rounded-[Npx]`, `gap-[Npx]` values remain. Also ship the shared `useReducedMotion()` hook (D-39) that Plans 04 / 06 / 07 depend on.

Purpose: Canonicalize the visual scale so Wave 2 + 3 components consume consistent values. Eliminate design drift in the 4 files Jessica touches most.

Output: 4 target files pass the `spacingAudit.test.ts`, `useReducedMotion` hook exists and passes its test, CLAUDE.md documents the icon policy.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/33-design-system-ui-polish/33-UI-SPEC.md
@.planning/phases/33-design-system-ui-polish/33-RESEARCH.md
@.planning/phases/33-design-system-ui-polish/33-01-AUDIT.md

<interfaces>
**Canonical spacing scale (from Plan 01):**
- `--spacing-xs: 4px` (gap-1, p-1)
- `--spacing-sm: 8px` (gap-2, p-2)
- `--spacing-lg: 16px` (gap-4, p-4)
- `--spacing-xl: 24px` (gap-6, p-6)
- `--spacing-2xl: 32px` (gap-8, p-8)

**Radius (from Plan 01):**
- `--radius-sm: 2px` (rounded-sm)
- `--radius-md: 4px` (rounded-md)
- `--radius-lg: 8px` (rounded-lg — now 8px, was 6px)

**Arbitrary-value remap strategy (from research Pitfall 7 + Plan 01 AUDIT):**
- `p-3/m-3/gap-3` (12px) → choose `p-2` (8px) for tight spots, `p-4` (16px) for default rows — follow Plan 01 AUDIT.md remap table
- `text-[10px]` → `text-[11px]` or use `text-xs` token; for identifier-size text, keep as-is only if called out in D-04
- `min-w-[72px]` / `shadow-[...]` → these are not spacing — audit case-by-case, many will stay (not spacing)

**Material Symbols allowlist (from research D-33 — 8 files / 33 occurrences):**
Toolbar.tsx, WelcomeScreen.tsx, TemplatePickerDialog.tsx, HelpModal.tsx, AddProductModal.tsx, HelpSearch.tsx, ProductLibrary.tsx, index.css.
Downstream plans MUST NOT add new Material Symbols imports — only lucide for new UI chrome.

**useReducedMotion hook shape (D-39):**
```typescript
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create src/hooks/useReducedMotion.ts hook (D-39 shared utility)</name>
  <files>src/hooks/useReducedMotion.ts</files>
  <read_first>
    - .planning/phases/33-design-system-ui-polish/33-UI-SPEC.md § "Animation" (reduced-motion fallbacks)
    - .planning/phases/33-design-system-ui-polish/33-CONTEXT.md D-39
    - src/hooks/ (check if directory exists; create if not)
  </read_first>
  <action>
    Create `src/hooks/useReducedMotion.ts` with the exact shape documented in the Interfaces block. Key invariants:

    1. SSR-safe: guard with `typeof window !== "undefined"` for initial state
    2. Subscribe to `matchMedia('(prefers-reduced-motion: reduce)')` via `addEventListener('change', handler)` — NOT the deprecated `addListener`
    3. Cleanup: `removeEventListener('change', handler)` on unmount
    4. Named export `useReducedMotion` returning `boolean`

    ```typescript
    import { useEffect, useState } from "react";

    /**
     * Returns `true` when the user has requested reduced motion via OS settings.
     * Subscribes to matchMedia changes — re-renders when the preference changes.
     * Phase 33 D-39: required guard for every new animation in Wave 2/3.
     */
    export function useReducedMotion(): boolean {
      const [reduced, setReduced] = useState<boolean>(() => {
        if (typeof window === "undefined" || !window.matchMedia) return false;
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      });

      useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return;
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
      }, []);

      return reduced;
    }
    ```

    Additionally, if a test driver is helpful:
    ```typescript
    // Test driver (gated)
    if (import.meta.env.MODE === "test") {
      (window as any).__driveReducedMotion = {
        read: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      };
    }
    ```

    This is optional — `__driveReducedMotion` can be skipped if tests rely on jsdom's default (not reduced).
  </action>
  <verify>
    <automated>npm test -- --run tests/phase33/useReducedMotion.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `src/hooks/useReducedMotion.ts` exists
    - File exports `useReducedMotion` (named export)
    - File contains `matchMedia` and `prefers-reduced-motion` strings
    - File contains `addEventListener('change'` (not deprecated `addListener`)
    - `tests/phase33/useReducedMotion.test.ts` GREEN
  </acceptance_criteria>
  <done>Shared useReducedMotion hook ready for Plans 04/06/07 consumption.</done>
</task>

<task type="auto">
  <name>Task 2: Execute spacing/radius normalization in the 4 target files per Plan 01 AUDIT</name>
  <files>src/components/Toolbar.tsx, src/components/Sidebar.tsx, src/components/PropertiesPanel.tsx, src/components/RoomSettings.tsx</files>
  <read_first>
    - .planning/phases/33-design-system-ui-polish/33-01-AUDIT.md (consume the remap table)
    - src/components/Toolbar.tsx, src/components/Sidebar.tsx, src/components/PropertiesPanel.tsx, src/components/RoomSettings.tsx
    - .planning/phases/33-design-system-ui-polish/33-UI-SPEC.md § "Spacing Scale" + § "Border Radius"
  </read_first>
  <action>
    Execute the remap table from `33-01-AUDIT.md` across the 4 target files. Follow these rules:

    **Arbitrary padding/margin/gap values:**
    - `p-[4px]` → `p-1`; `p-[8px]` → `p-2`; `p-[12px]` → `p-2` or `p-4` per AUDIT; `p-[16px]` → `p-4`; `p-[24px]` → `p-6`; `p-[32px]` → `p-8`
    - Same logic for `m-[Npx]`, `gap-[Npx]`, and directional variants (`px`, `py`, `pt`, etc.)
    - Any 12px-equivalent (`p-3`, `m-3`, `gap-3`) → remap to `p-2`, `p-4`, `gap-2`, or `gap-4` per AUDIT

    **Arbitrary radius values:**
    - `rounded-[2px]` → `rounded-sm`
    - `rounded-[4px]` → `rounded-md`
    - `rounded-[6px]` → `rounded-lg` (but note: `--radius-lg` is now 8px; AUDIT flagged any visible 2px shift)
    - `rounded-[8px]` → `rounded-lg`

    **Arbitrary text sizes (D-04 exception handling):**
    - `text-[10px]`, `text-[11px]` — promote to canonical `text-sm` (or the Tailwind binding for `--font-size-sm`). If a specific site NEEDS `text-[10px]` for identifier alignment (tight status label), leave as-is only if documented in AUDIT as "EXCEPTION".
    - `text-[13px]` → `text-base` (or binding for `--font-size-base`)

    **Non-spacing arbitrary values (leave alone):**
    - `min-w-[72px]`, `shadow-[...]`, `bg-[url(...)]`, `h-[calc(...)]`, color arbitrary values → NOT covered by this plan (scope is spacing/radius/text only per audit regex in test).

    **Verification:** The `spacingAudit.test.ts` regex `\b(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|rounded)-\[\d+px\]` must find ZERO matches in all 4 files after this task. Run that test repeatedly until green.
  </action>
  <verify>
    <automated>npm test -- --run tests/phase33/spacingAudit.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `grep -E "(p|m|gap|rounded)-\[[0-9]+px\]" src/components/Toolbar.tsx` returns nothing
    - `grep -E "(p|m|gap|rounded)-\[[0-9]+px\]" src/components/Sidebar.tsx` returns nothing
    - `grep -E "(p|m|gap|rounded)-\[[0-9]+px\]" src/components/PropertiesPanel.tsx` returns nothing
    - `grep -E "(p|m|gap|rounded)-\[[0-9]+px\]" src/components/RoomSettings.tsx` returns nothing
    - `tests/phase33/spacingAudit.test.ts` GREEN
    - `npm run build` succeeds without Tailwind warnings
  </acceptance_criteria>
  <done>4 target files have zero arbitrary spacing/radius values; canonical scale enforced.</done>
</task>

<task type="auto">
  <name>Task 3: Document icon policy + canonical spacing in CLAUDE.md</name>
  <files>CLAUDE.md</files>
  <read_first>
    - CLAUDE.md (project-level — read existing patterns section to match style)
    - .planning/phases/33-design-system-ui-polish/33-CONTEXT.md D-33, D-34
    - .planning/phases/33-design-system-ui-polish/33-UI-SPEC.md § "Design System" icon policy note
  </read_first>
  <action>
    Add a new section to `CLAUDE.md` (place it right after the "Key Patterns" or "Design System Tokens" section) titled `## Design System (Phase 33)`:

    ```markdown
    ## Design System (Phase 33 — v1.7.5)

    ### Icon Policy (D-33)

    Two icon libraries coexist:

    - **lucide-react** — ALL new UI chrome icons (chevrons, Copy, Trash2, X, Check, etc.). Stroke-based, tree-shaken. Introduced Phase 33.
    - **Material Symbols** — RESERVED for the 8 existing files using CAD-domain glyphs:
      - `src/components/Toolbar.tsx` (grid_view, directions_walk, undo, redo, door_front, window, roofing, zoom_in/out, fit_screen)
      - `src/components/WelcomeScreen.tsx`
      - `src/components/TemplatePickerDialog.tsx`
      - `src/components/HelpModal.tsx`
      - `src/components/AddProductModal.tsx`
      - `src/components/HelpSearch.tsx`
      - `src/components/ProductLibrary.tsx`
      - `src/index.css`

    Do NOT add new `material-symbols-outlined` imports outside the allowlist. Do NOT migrate existing Material Symbols sites — they're CAD-specific glyphs that lucide doesn't have equivalents for.

    ### Canonical Spacing + Radius (D-34)

    Defined in `src/index.css` `@theme {}` block:

    | Token | Value | Tailwind utility |
    |-------|-------|------------------|
    | `--spacing-xs` | 4px | `p-1` / `gap-1` |
    | `--spacing-sm` | 8px | `p-2` / `gap-2` |
    | `--spacing-lg` | 16px | `p-4` / `gap-4` |
    | `--spacing-xl` | 24px | `p-6` / `gap-6` |
    | `--spacing-2xl` | 32px | `p-8` / `gap-8` |
    | `--radius-sm` | 2px | `rounded-sm` |
    | `--radius-md` | 4px | `rounded-md` |
    | `--radius-lg` | 8px | `rounded-lg` |

    **NOTE:** 12px spacing (`p-3`, `m-3`, `gap-3`) is NOT in the canonical scale. Per-file rule: in `Toolbar.tsx`, `Sidebar.tsx`, `PropertiesPanel.tsx`, `RoomSettings.tsx`, zero `p-[Npx]`/`m-[Npx]`/`gap-[Npx]`/`rounded-[Npx]` arbitrary values should exist. Other files may use Tailwind default spacing (`p-3` compiles to 12px, acceptable outside the 4 target files).

    ### Typography (D-03)

    5-tier ramp, 3 CSS tokens, 2 weights:

    - `--font-size-display: 28px` (Space Grotesk 500 — hero)
    - `--font-size-base: 13px` (Inter 400 body / IBM Plex Mono 500 h1)
    - `--font-size-sm: 11px` (IBM Plex Mono 500 h2 / 400 label / 400 value)

    UPPERCASE preserved for: dynamic CAD identifiers, status strings, unit value labels, tool mode labels, brand. Mixed-case for: section headers, panel headers, button labels, tab labels.

    ### Reduced Motion (D-39)

    Every new animation in Phase 33 guards on `useReducedMotion()` from `src/hooks/useReducedMotion.ts`. When `matches === true`, snap open/closed instead of animating.
    ```

    Place this section BEFORE the existing `## Project` or `## GSD Workflow Enforcement` section so it's findable at the top level.
  </action>
  <verify>
    <automated>grep -q "## Design System (Phase 33" CLAUDE.md &amp;&amp; grep -q "lucide-react" CLAUDE.md &amp;&amp; grep -q "useReducedMotion" CLAUDE.md</automated>
  </verify>
  <acceptance_criteria>
    - `CLAUDE.md` contains the new `## Design System (Phase 33 — v1.7.5)` section
    - Section documents lucide-react vs Material Symbols policy with the 8-file allowlist
    - Section documents the canonical spacing scale + radius values
    - Section documents reduced-motion requirement
  </acceptance_criteria>
  <done>CLAUDE.md has Phase 33 design system documentation. Downstream plans can reference it.</done>
</task>

</tasks>

<verification>
```bash
# Spacing audit green
npm test -- --run tests/phase33/spacingAudit.test.ts

# Reduced motion hook green
npm test -- --run tests/phase33/useReducedMotion.test.ts

# No new Material Symbols in non-allowlist files
grep -l "material-symbols" src/components/ | sort > /tmp/current_ms.txt
diff /tmp/current_ms.txt <(echo -e "src/components/AddProductModal.tsx\nsrc/components/HelpModal.tsx\nsrc/components/HelpSearch.tsx\nsrc/components/ProductLibrary.tsx\nsrc/components/TemplatePickerDialog.tsx\nsrc/components/Toolbar.tsx\nsrc/components/WelcomeScreen.tsx")  # expect empty diff

# Build compiles
npm run build 2>&1 | tail -3
```
</verification>

<success_criteria>
- [ ] `src/hooks/useReducedMotion.ts` exists and test-green
- [ ] 4 target files have zero arbitrary spacing/radius values
- [ ] `tests/phase33/spacingAudit.test.ts` GREEN
- [ ] CLAUDE.md documents icon policy + canonical scale + reduced-motion
- [ ] No new Material Symbols files introduced
- [ ] `npm run build` succeeds
</success_criteria>

<output>
After completion, create `.planning/phases/33-design-system-ui-polish/33-03-SUMMARY.md` documenting:
- Count of arbitrary values remapped (per file)
- useReducedMotion hook shipped
- CLAUDE.md additions
- Closes #90
- Downstream: Plans 04 (uses useReducedMotion), 06, 07 unblocked
</output>
