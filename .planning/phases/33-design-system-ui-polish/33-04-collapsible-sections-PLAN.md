---
phase: 33-design-system-ui-polish
plan: 04
type: execute
wave: 2
depends_on: [00, 01, 02, 03]
files_modified:
  - src/components/ui/CollapsibleSection.tsx
  - src/lib/uiPersistence.ts
  - src/components/PropertiesPanel.tsx
autonomous: true
requirements:
  - "GH #84"
must_haves:
  truths:
    - "Each PropertiesPanel named section ('Position', 'Dimensions', 'Rotation', 'Material') can be collapsed and expanded via a chevron click"
    - "Open/collapse state persists across page reload via localStorage key 'ui:propertiesPanel:sections'"
    - "Clicking anywhere on the section header row toggles (not just the chevron)"
    - "Default state on first visit: all sections expanded"
    - "When prefers-reduced-motion matches, height transition is skipped (instant snap open/closed)"
  artifacts:
    - path: "src/components/ui/CollapsibleSection.tsx"
      provides: "Reusable collapsible wrapper with localStorage persistence"
      min_lines: 40
    - path: "src/lib/uiPersistence.ts"
      provides: "Typed localStorage helpers for ui:* keys"
    - path: "src/components/PropertiesPanel.tsx"
      provides: "Named sections wrapped in CollapsibleSection"
      contains: "CollapsibleSection"
  key_links:
    - from: "src/components/ui/CollapsibleSection.tsx"
      to: "localStorage ['ui:propertiesPanel:sections']"
      via: "readState() / writeState()"
      pattern: "ui:propertiesPanel:sections"
    - from: "src/components/ui/CollapsibleSection.tsx"
      to: "src/hooks/useReducedMotion.ts"
      via: "useReducedMotion() guard on transition"
      pattern: "useReducedMotion"
    - from: "src/components/PropertiesPanel.tsx"
      to: "src/components/ui/CollapsibleSection.tsx"
      via: "JSX wrapper around each Plan-02-introduced section"
      pattern: "<CollapsibleSection"
---

<objective>
Ship GH #84 — wrap each named PropertiesPanel section (introduced in Plan 02) in a `<CollapsibleSection>` primitive that persists open/closed state to localStorage and respects `prefers-reduced-motion`.

Purpose: Jessica can collapse panels she's not using, reducing visual load. State survives reload. Chrome collapse is NOT CAD data (no undo).

Output: `src/components/ui/CollapsibleSection.tsx` reusable primitive; `src/lib/uiPersistence.ts` helper; PropertiesPanel.tsx uses the wrapper for each section.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/33-design-system-ui-polish/33-UI-SPEC.md
@.planning/phases/33-design-system-ui-polish/33-CONTEXT.md
@src/hooks/useReducedMotion.ts
@src/components/PropertiesPanel.tsx
@src/components/Sidebar.tsx

<interfaces>
**Plan 03 delivered `useReducedMotion` hook — consume it.**

**Plan 02 delivered named sections** in PropertiesPanel with stable IDs (`id="position"`, `id="dimensions"`, `id="rotation"`, `id="material"`).

**Existing inline CollapsibleSection at `src/components/Sidebar.tsx:17-42`** uses +/- glyphs + `useState` (NO persistence). Per research: LEAVE SIDEBAR'S INLINE VERSION ALONE. This plan creates a NEW `src/components/ui/CollapsibleSection.tsx` used ONLY by PropertiesPanel.

**localStorage contract (D-06):**
- Key: `ui:propertiesPanel:sections`
- Value: JSON object `{ [sectionId: string]: boolean }` — `true` = open, `false` = collapsed
- Missing key or missing section ID → default `true` (D-07 — all expanded on first visit)

**Component signature:**
```typescript
export function CollapsibleSection({
  id,
  label,
  children,
  defaultOpen = true,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}): JSX.Element
```

**Animation (UI-SPEC Animation table):**
- Duration: 200ms ease-out height transition
- Chevron rotation: 150ms ease-out
- Reduced-motion: skip transition, snap instantly

**Styling (UI-SPEC Interaction Contracts):**
- Chevron: `ChevronRight` (collapsed) / `ChevronDown` (expanded), 12px, `text-text-ghost`, `text-accent` on hover
- Header className: `w-full flex items-center gap-2 py-1 text-text-muted hover:text-text-primary`
- Header label className: `font-mono text-sm font-medium` (h2 role per Plan 02)
- Click target: entire header button row

**Test driver contract (documented in Plan 00 README):**
```typescript
if (import.meta.env.MODE === "test") {
  (window as any).__driveCollapsibleSection = {
    toggle: (id: string) => { /* click header */ },
    getOpen: (id: string) => boolean,
    getPersisted: () => readState(),
  };
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create src/lib/uiPersistence.ts — typed localStorage helpers for ui:* keys</name>
  <files>src/lib/uiPersistence.ts</files>
  <read_first>
    - src/lib/ (check for existing persistence patterns)
    - .planning/phases/33-design-system-ui-polish/33-RESEARCH.md § "Recommended Structure Additions"
  </read_first>
  <action>
    Create `src/lib/uiPersistence.ts` exporting two helper functions:

    ```typescript
    /**
     * Typed localStorage helpers for UI chrome persistence (Phase 33).
     * Keys use the `ui:*` namespace to separate from CAD data.
     */

    /**
     * Read a JSON object from localStorage. Returns {} if missing / invalid.
     */
    export function readUIObject<T extends Record<string, any>>(key: string): T {
      if (typeof window === "undefined") return {} as T;
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return {} as T;
        const parsed = JSON.parse(raw);
        return (parsed && typeof parsed === "object") ? parsed : ({} as T);
      } catch {
        return {} as T;
      }
    }

    /**
     * Write a JSON object to localStorage. Silently no-ops on quota/error.
     */
    export function writeUIObject(key: string, value: Record<string, any>): void {
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* no-op on quota / privacy mode */
      }
    }

    /**
     * Read a single boolean flag from localStorage (for dismiss-style flags).
     */
    export function readUIBool(key: string): boolean {
      if (typeof window === "undefined") return false;
      try {
        return window.localStorage.getItem(key) === "true";
      } catch {
        return false;
      }
    }

    /**
     * Write a single boolean flag.
     */
    export function writeUIBool(key: string, value: boolean): void {
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(key, value ? "true" : "false");
      } catch { /* no-op */ }
    }
    ```

    These helpers also serve Plan 07 (`ui:gestureChip:dismissed` uses `readUIBool`/`writeUIBool`).
  </action>
  <verify>
    <automated>test -f src/lib/uiPersistence.ts &amp;&amp; grep -E "export function (readUIObject|writeUIObject|readUIBool|writeUIBool)" src/lib/uiPersistence.ts | wc -l | grep -q "^4$"</automated>
  </verify>
  <acceptance_criteria>
    - `src/lib/uiPersistence.ts` exists
    - Exports 4 functions: `readUIObject`, `writeUIObject`, `readUIBool`, `writeUIBool`
    - All functions SSR-safe (`typeof window !== "undefined"` guard)
    - All functions catch localStorage errors silently
  </acceptance_criteria>
  <done>Typed localStorage helpers ready for Plan 04 + Plan 07 consumption.</done>
</task>

<task type="auto">
  <name>Task 2: Create src/components/ui/CollapsibleSection.tsx with chevron + localStorage + reduced-motion</name>
  <files>src/components/ui/CollapsibleSection.tsx</files>
  <read_first>
    - src/hooks/useReducedMotion.ts (Plan 03 output)
    - src/lib/uiPersistence.ts (Task 1 output)
    - src/components/Sidebar.tsx:17-42 (existing inline CollapsibleSection reference — DO NOT replace, just mirror the pattern)
    - .planning/phases/33-design-system-ui-polish/33-UI-SPEC.md § "Interaction Contracts" → "Collapsible Properties Sections"
  </read_first>
  <action>
    Create `src/components/ui/CollapsibleSection.tsx`:

    ```typescript
    import { useEffect, useState, useRef } from "react";
    import { ChevronRight, ChevronDown } from "lucide-react";
    import { useReducedMotion } from "@/hooks/useReducedMotion";
    import { readUIObject, writeUIObject } from "@/lib/uiPersistence";

    const STORAGE_KEY = "ui:propertiesPanel:sections";

    /**
     * Phase 33 D-06/D-07/D-08/D-09: Collapsible section wrapper for PropertiesPanel.
     * Persists open state to localStorage per section ID.
     * Defaults to open on first visit. Respects prefers-reduced-motion.
     */
    export function CollapsibleSection({
      id,
      label,
      children,
      defaultOpen = true,
    }: {
      id: string;
      label: string;
      children: React.ReactNode;
      defaultOpen?: boolean;
    }) {
      const reduced = useReducedMotion();
      const [open, setOpen] = useState<boolean>(() => {
        const state = readUIObject<Record<string, boolean>>(STORAGE_KEY);
        return state[id] ?? defaultOpen;
      });

      useEffect(() => {
        const state = readUIObject<Record<string, boolean>>(STORAGE_KEY);
        state[id] = open;
        writeUIObject(STORAGE_KEY, state);
      }, [id, open]);

      return (
        <div data-collapsible-id={id} className="group">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-full flex items-center gap-2 py-1 text-text-muted hover:text-text-primary"
            aria-expanded={open}
          >
            {open ? (
              <ChevronDown
                size={12}
                className="text-text-ghost group-hover:text-accent"
                style={{ transition: reduced ? "none" : "transform 150ms ease-out" }}
              />
            ) : (
              <ChevronRight
                size={12}
                className="text-text-ghost group-hover:text-accent"
                style={{ transition: reduced ? "none" : "transform 150ms ease-out" }}
              />
            )}
            <span className="font-mono text-sm font-medium">{label}</span>
          </button>
          <div
            style={{
              maxHeight: open ? 9999 : 0,
              overflow: "hidden",
              transition: reduced ? "none" : "max-height 200ms ease-out",
            }}
          >
            {children}
          </div>
        </div>
      );
    }

    // Test driver — gated
    if (import.meta.env.MODE === "test") {
      (window as any).__driveCollapsibleSection = {
        getPersisted: () => readUIObject<Record<string, boolean>>(STORAGE_KEY),
        getOpen: (id: string) => {
          const el = document.querySelector(`[data-collapsible-id="${id}"]`);
          const btn = el?.querySelector("button");
          return btn?.getAttribute("aria-expanded") === "true";
        },
        toggle: (id: string) => {
          const el = document.querySelector(`[data-collapsible-id="${id}"]`);
          const btn = el?.querySelector("button") as HTMLButtonElement | null;
          btn?.click();
        },
      };
    }
    ```

    Key invariants:
    - `open` init reads localStorage synchronously (no flicker)
    - `useEffect` writes localStorage on every toggle
    - Reduced-motion branch: `transition: "none"` in both chevron rotation and max-height
    - `aria-expanded` on button for accessibility + driver access
    - `data-collapsible-id` for driver to locate
  </action>
  <verify>
    <automated>npm test -- --run tests/phase33/collapsibleSections.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `src/components/ui/CollapsibleSection.tsx` exists
    - Imports `ChevronRight`, `ChevronDown` from `lucide-react`
    - Imports `useReducedMotion` from `@/hooks/useReducedMotion`
    - Imports `readUIObject`, `writeUIObject` from `@/lib/uiPersistence`
    - Contains `STORAGE_KEY = "ui:propertiesPanel:sections"`
    - Contains `aria-expanded` on button
    - Contains reduced-motion guard on transition style
    - Test driver `__driveCollapsibleSection` gated by `import.meta.env.MODE === "test"`
    - `tests/phase33/collapsibleSections.test.ts` first 3 assertions GREEN
  </acceptance_criteria>
  <done>Reusable CollapsibleSection primitive ready for PropertiesPanel consumption.</done>
</task>

<task type="auto">
  <name>Task 3: Wrap PropertiesPanel named sections in CollapsibleSection</name>
  <files>src/components/PropertiesPanel.tsx</files>
  <read_first>
    - src/components/PropertiesPanel.tsx (Plan 02 output — find Plan-02-introduced section headers with stable IDs)
    - src/components/ui/CollapsibleSection.tsx (Task 2 output)
    - .planning/phases/33-design-system-ui-polish/33-RESEARCH.md § "Pitfall 5" (do not skip introducing section headers first)
  </read_first>
  <action>
    For each named section Plan 02 introduced (IDs `position`, `dimensions`, `rotation`, `material`), wrap the group in a `<CollapsibleSection>`:

    ```tsx
    import { CollapsibleSection } from "@/components/ui/CollapsibleSection";

    // Before (Plan 02 output):
    <h3 id="position" className="font-mono text-sm font-medium text-text-muted">Position</h3>
    <div>{/* position inputs */}</div>

    // After (Plan 04):
    <CollapsibleSection id="position" label="Position">
      {/* position inputs */}
    </CollapsibleSection>
    ```

    Apply to all 4 named sections. Each section wrapper:
    - Uses the same `id` from Plan 02's stable IDs
    - Keeps the same visible label ("Position", "Dimensions", "Rotation", "Material")
    - Wraps all children (inputs) that belong to that group

    **Scope limits:**
    - Only PropertiesPanel — do NOT modify Sidebar.tsx's inline CollapsibleSection (per research note: leave legacy in place)
    - Do NOT change behavior of the input values — only wrap the rendering
    - Preserve Plan 02's mixed-case h2 role on the label (CollapsibleSection already renders `font-mono text-sm font-medium`)

    If PropertiesPanel has conditional blocks (different for walls vs products vs custom-elements), wrap each block's section headers independently — each entity type gets its own Collapsible instances reading the same localStorage.
  </action>
  <verify>
    <automated>grep -c "<CollapsibleSection" src/components/PropertiesPanel.tsx | awk '{exit ($1 &gt;= 3 ? 0 : 1)}' &amp;&amp; npm test -- --run tests/phase33/collapsibleSections.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `grep "<CollapsibleSection" src/components/PropertiesPanel.tsx` matches at least 3 times (position, dimensions, rotation — material may be optional depending on entity type)
    - `grep "id=\"position\"" src/components/PropertiesPanel.tsx` matches
    - `grep "id=\"dimensions\"" src/components/PropertiesPanel.tsx` matches
    - `grep "id=\"rotation\"" src/components/PropertiesPanel.tsx` matches
    - `grep "CollapsibleSection" src/components/PropertiesPanel.tsx` shows import at top
    - Full suite of `tests/phase33/collapsibleSections.test.ts` GREEN
    - `npm run build` succeeds (no TS errors)
  </acceptance_criteria>
  <done>PropertiesPanel sections are collapsible; state persists across reloads.</done>
</task>

</tasks>

<verification>
```bash
# Component tests green
npm test -- --run tests/phase33/collapsibleSections.test.ts

# Manual verification of localStorage contract
# (in browser) open dev tools, collapse "Position", reload → should stay collapsed
# Documented in HUMAN-UAT.md

# Build clean
npm run build 2>&1 | tail -3
```
</verification>

<success_criteria>
- [ ] `src/lib/uiPersistence.ts` exists with 4 helpers
- [ ] `src/components/ui/CollapsibleSection.tsx` exists with lucide chevron + localStorage + reduced-motion
- [ ] PropertiesPanel wraps at least 3 sections (Position, Dimensions, Rotation) in CollapsibleSection
- [ ] `tests/phase33/collapsibleSections.test.ts` GREEN
- [ ] Toggle state persists across reload (manual UAT)
- [ ] `npm run build` succeeds
</success_criteria>

<output>
After completion, create `.planning/phases/33-design-system-ui-polish/33-04-SUMMARY.md` documenting:
- Number of sections wrapped
- localStorage key schema
- Test driver shape
- Closes #84
- Notes: Sidebar.tsx inline CollapsibleSection intentionally NOT migrated (scope boundary)
</output>
