---
phase: 33-design-system-ui-polish
plan: 00
type: execute
wave: 0
depends_on: []
files_modified:
  - tests/phase33/README.md
  - tests/phase33/tokens.test.ts
  - tests/phase33/typography.test.ts
  - tests/phase33/spacingAudit.test.ts
  - tests/phase33/collapsibleSections.test.ts
  - tests/phase33/libraryCard.test.ts
  - tests/phase33/phase33LibraryMigration.test.tsx
  - tests/phase33/floatingToolbar.test.ts
  - tests/phase33/gestureChip.test.ts
  - tests/phase33/rotationPresets.test.ts
  - tests/phase33/inlineTitleEdit.test.ts
  - tests/phase33/useReducedMotion.test.ts
autonomous: true
requirements:
  - "GH #83"
  - "GH #84"
  - "GH #85"
  - "GH #86"
  - "GH #87"
  - "GH #88"
  - "GH #89"
  - "GH #90"
must_haves:
  truths:
    - "Every Wave 1/2/3 plan has a failing test scaffold in tests/phase33/"
    - "Test drivers documented for each issue and gated by import.meta.env.MODE === 'test'"
    - "Library migration test scaffolded for count regression assertion (Plan 05 blocker fix)"
  artifacts:
    - path: "tests/phase33/"
      provides: "Phase 33 test directory"
    - path: "tests/phase33/tokens.test.ts"
      provides: "Wave 1 Plan 01 verification"
    - path: "tests/phase33/typography.test.ts"
      provides: "GH #83 verification"
    - path: "tests/phase33/spacingAudit.test.ts"
      provides: "GH #90 grep-based audit"
    - path: "tests/phase33/collapsibleSections.test.ts"
      provides: "GH #84 component + driver tests"
    - path: "tests/phase33/libraryCard.test.ts"
      provides: "GH #89 component tests"
    - path: "tests/phase33/phase33LibraryMigration.test.tsx"
      provides: "GH #89 count-regression assertion (Plan 05)"
    - path: "tests/phase33/floatingToolbar.test.ts"
      provides: "GH #85 driver tests"
    - path: "tests/phase33/gestureChip.test.ts"
      provides: "GH #86 tests"
    - path: "tests/phase33/rotationPresets.test.ts"
      provides: "GH #87 single-undo tests"
    - path: "tests/phase33/inlineTitleEdit.test.ts"
      provides: "GH #88 tests mirroring Phase 31 driver shape"
    - path: "tests/phase33/useReducedMotion.test.ts"
      provides: "D-39 hook test"
  key_links:
    - from: "tests/phase33/*.test.ts"
      to: "Vitest runner (vitest.config.ts)"
      via: "npm test -- --run phase33"
      pattern: "phase33"
---

<objective>
Create RED test scaffolds for every Wave 1/2/3 plan, gated per VALIDATION.md. These tests MUST fail until the corresponding plans implement the behavior (TDD red-stub pattern from Phase 29/30/31).

Purpose: Lock per-issue contracts BEFORE implementation so downstream plans have a concrete target. Mirror the Phase 31 driver shape (`window.__drive*` gated by `import.meta.env.MODE === "test"`).

Output: `tests/phase33/` directory with 11 test files and a README documenting the driver contracts.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/33-design-system-ui-polish/33-VALIDATION.md
@.planning/phases/33-design-system-ui-polish/33-RESEARCH.md
@.planning/phases/33-design-system-ui-polish/33-UI-SPEC.md

<interfaces>
<!-- Existing Phase 31 driver shape to mirror for inlineTitleEdit tests -->
<!-- From src/components/PropertiesPanel.tsx:292-403 LabelOverrideInput + window.__driveLabelOverride -->

Existing test driver pattern (gated):
```typescript
if (import.meta.env.MODE === "test") {
  (window as any).__driveLabelOverride = {
    type: (text: string) => { /* simulates keystroke */ },
    commit: () => { /* Enter */ },
    cancel: () => { /* Escape */ },
    getDraft: () => string,
  };
}
```

Existing store APIs (verified from grep):
- projectStore: activeName, setActiveName(name) — no NoHistory variant (Plan 09 adds draftName bypass, NOT a NoHistory alias)
- cadStore: renameRoom(id, name) — calls pushHistory; renameRoomNoHistory added in Plan 09 (genuine bypass)
- cadStore: rotateProduct(id, angle), rotateProductNoHistory(id, angle) — verified lines 340, 351
- cadStore.past[]/future[] — history arrays for single-undo assertions
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create phase33 test directory with README + driver contract stubs</name>
  <files>tests/phase33/README.md</files>
  <read_first>
    - .planning/phases/33-design-system-ui-polish/33-VALIDATION.md (sampling rate, per-task map)
    - .planning/phases/33-design-system-ui-polish/33-RESEARCH.md § "Validation Architecture" (test file list, driver contracts)
    - src/components/PropertiesPanel.tsx:292-403 (Phase 31 LabelOverrideInput reference)
    - tests/setup.ts (jsdom setup, check if localStorage reset is wired)
  </read_first>
  <action>
    Create `tests/phase33/README.md` with:

    1. Purpose: "Phase 33 Design System + UI Polish test contracts. Tests start RED; each Wave 1/2/3 plan turns them GREEN as it implements."
    2. Driver contracts table (name → signature → plan that implements):
       - `window.__driveCollapsibleSection`: { toggle(id: string): void; getOpen(id: string): boolean; getPersisted(): Record<string, boolean> } → Plan 04
       - `window.__driveFloatingToolbar`: { isVisible(): boolean; getPosition(): {top: number, left: number} | null; clickDuplicate(): void; clickDelete(): void } → Plan 06
       - `window.__driveRotationPreset`: { click(presetDeg: number): void; getRotation(id: string): number; getHistoryLength(): number } → Plan 08
       - `window.__driveInlineTitleEdit`: mirror `__driveLabelOverride` shape — { type(v: string): void; commit(): void; cancel(): void; getDraft(): string; getCommitted(): string } → Plan 09
       - `window.__driveGestureChip`: { isVisible(): boolean; dismiss(): void; getMode(): "2d" | "3d"; getPersistedDismissed(): boolean } → Plan 07
       - `window.__driveReducedMotion`: { setMatches(v: boolean): void; read(): boolean } → Plan 03
    3. All drivers gated by `import.meta.env.MODE === "test"` (Phase 31 convention).
    4. Run command: `npm test -- --run phase33` (returns ~11 suites).

    Ensure file is committed even if tests are not yet wired.
  </action>
  <verify>
    <automated>test -f tests/phase33/README.md &amp;&amp; grep -q "__driveCollapsibleSection" tests/phase33/README.md</automated>
  </verify>
  <acceptance_criteria>
    - `tests/phase33/README.md` exists
    - README contains driver names: `__driveCollapsibleSection`, `__driveFloatingToolbar`, `__driveRotationPreset`, `__driveInlineTitleEdit`, `__driveGestureChip`, `__driveReducedMotion`
    - README references `npm test -- --run phase33`
  </acceptance_criteria>
  <done>README committed with 6 driver contracts documented.</done>
</task>

<task type="auto">
  <name>Task 2: Write RED test scaffolds for Plans 01/02/03 (tokens, typography, spacing)</name>
  <files>tests/phase33/tokens.test.ts, tests/phase33/typography.test.ts, tests/phase33/spacingAudit.test.ts, tests/phase33/useReducedMotion.test.ts</files>
  <read_first>
    - .planning/phases/33-design-system-ui-polish/33-UI-SPEC.md § "Token Additions to src/index.css" (expected values)
    - .planning/phases/33-design-system-ui-polish/33-VALIDATION.md § "Wave 0 Requirements"
    - src/index.css (current @theme block for contrast)
    - src/components/Toolbar.tsx, src/components/Sidebar.tsx, src/components/PropertiesPanel.tsx (for grep targets)
  </read_first>
  <action>
    Create 4 RED test files (each MUST fail right now):

    **tests/phase33/tokens.test.ts** (Plan 01 verification):
    ```typescript
    import { describe, it, expect } from "vitest";
    import fs from "node:fs";
    import path from "node:path";

    const css = fs.readFileSync(path.resolve("src/index.css"), "utf-8");

    describe("Phase 33 design tokens", () => {
      it("defines canonical typography token (display 28px)", () => {
        // Accept either --font-size-display or Tailwind v4 --text-display naming
        // (Plan 01 Task 2 resolves the correct v4 prefix)
        expect(css).toMatch(/--(?:font-size|text)-display:\s*28px/);
      });
      it("defines base typography token (13px)", () => {
        expect(css).toMatch(/--(?:font-size|text)-base:\s*13px/);
      });
      it("defines sm typography token (11px)", () => {
        expect(css).toMatch(/--(?:font-size|text)-sm:\s*11px/);
      });
      it("defines canonical spacing tokens (4/8/16/24/32)", () => {
        expect(css).toMatch(/--spacing-xs:\s*4px/);
        expect(css).toMatch(/--spacing-sm:\s*8px/);
        expect(css).toMatch(/--spacing-lg:\s*16px/);
        expect(css).toMatch(/--spacing-xl:\s*24px/);
        expect(css).toMatch(/--spacing-2xl:\s*32px/);
      });
      it("canonicalizes --radius-lg to 8px (was 6px)", () => {
        expect(css).toMatch(/--radius-lg:\s*8px/);
      });
      it("does NOT define --spacing-md 12px (dropped per checker)", () => {
        expect(css).not.toMatch(/--spacing-md:\s*12px/);
      });
    });
    ```

    **tests/phase33/typography.test.ts** (Plan 02 / GH #83):
    ```typescript
    import { describe, it, expect } from "vitest";
    import fs from "node:fs";
    import path from "node:path";

    // Files whose section-header render path MUST shift to mixed-case per D-03/D-05.
    const TARGETS = [
      "src/components/PropertiesPanel.tsx",
      "src/components/Sidebar.tsx",
      "src/components/Toolbar.tsx",
    ];

    describe("Phase 33 typography — mixed-case section headers", () => {
      it("PropertiesPanel has a mixed-case 'Position' or 'Rotation' or 'Dimensions' header", () => {
        const src = fs.readFileSync(path.resolve("src/components/PropertiesPanel.tsx"), "utf-8");
        // At least one of these mixed-case section labels must appear as a string literal
        const mixedCase = /["'`](?:Position|Rotation|Dimensions|Material)["'`]/.test(src);
        expect(mixedCase).toBe(true);
      });
      it("Sidebar has at least one mixed-case section header (not UPPERCASE-only)", () => {
        const src = fs.readFileSync(path.resolve("src/components/Sidebar.tsx"), "utf-8");
        const mixedCase = /["'`](?:Room config|Properties|Library|Project)["'`]/.test(src);
        expect(mixedCase).toBe(true);
      });
    });
    ```

    **tests/phase33/spacingAudit.test.ts** (Plan 03 / GH #90):
    ```typescript
    import { describe, it, expect } from "vitest";
    import fs from "node:fs";
    import path from "node:path";

    const TARGET_FILES = [
      "src/components/Toolbar.tsx",
      "src/components/Sidebar.tsx",
      "src/components/PropertiesPanel.tsx",
      "src/components/RoomSettings.tsx",
    ];

    // Arbitrary Tailwind values: p-[Npx], m-[Npx], rounded-[Npx], gap-[Npx]
    const ARBITRARY_RE = /\b(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|rounded)-\[\d+px\]/g;

    describe("Phase 33 spacing audit (GH #90) — zero arbitrary values in 4 target files", () => {
      TARGET_FILES.forEach((file) => {
        it(`${file} has zero arbitrary p-[Npx]/m-[Npx]/rounded-[Npx]/gap-[Npx]`, () => {
          const src = fs.readFileSync(path.resolve(file), "utf-8");
          const matches = src.match(ARBITRARY_RE) || [];
          expect(matches).toEqual([]);
        });
      });
    });
    ```

    **tests/phase33/useReducedMotion.test.ts** (Plan 03 / D-39):
    ```typescript
    import { describe, it, expect } from "vitest";
    import fs from "node:fs";
    import path from "node:path";

    describe("useReducedMotion hook (D-39)", () => {
      it("hook file exists at src/hooks/useReducedMotion.ts", () => {
        expect(fs.existsSync(path.resolve("src/hooks/useReducedMotion.ts"))).toBe(true);
      });
      it("exports useReducedMotion named export", () => {
        const src = fs.readFileSync(path.resolve("src/hooks/useReducedMotion.ts"), "utf-8");
        expect(src).toMatch(/export\s+(?:function\s+useReducedMotion|const\s+useReducedMotion)/);
      });
      it("subscribes to window.matchMedia('(prefers-reduced-motion: reduce)')", () => {
        const src = fs.readFileSync(path.resolve("src/hooks/useReducedMotion.ts"), "utf-8");
        expect(src).toMatch(/prefers-reduced-motion/);
        expect(src).toMatch(/matchMedia/);
      });
    });
    ```

    All tests MUST fail right now (no tokens changed yet, no hook exists). This is the RED state.
  </action>
  <verify>
    <automated>npm test -- --run tests/phase33/tokens.test.ts tests/phase33/typography.test.ts tests/phase33/spacingAudit.test.ts tests/phase33/useReducedMotion.test.ts 2>&amp;1 | grep -E "FAIL|failed" | head -5</automated>
  </verify>
  <acceptance_criteria>
    - 4 files exist in `tests/phase33/`
    - Running them returns RED (at least some FAIL) before any Wave 1 work
    - Each test file imports `describe/it/expect` from vitest
    - tokens.test.ts checks typography tokens (display/base/sm), `--radius-lg: 8px`, spacing tokens, AND absence of `--spacing-md: 12px`
    - spacingAudit.test.ts covers Toolbar, Sidebar, PropertiesPanel, RoomSettings
  </acceptance_criteria>
  <done>4 Wave 1 RED test files committed, failing.</done>
</task>

<task type="auto">
  <name>Task 3: Write RED test scaffolds for Plans 04-09 (wave 2 + wave 3) + library migration count regression</name>
  <files>tests/phase33/collapsibleSections.test.ts, tests/phase33/libraryCard.test.ts, tests/phase33/phase33LibraryMigration.test.tsx, tests/phase33/floatingToolbar.test.ts, tests/phase33/gestureChip.test.ts, tests/phase33/rotationPresets.test.ts, tests/phase33/inlineTitleEdit.test.ts</files>
  <read_first>
    - src/components/PropertiesPanel.tsx:292-403 (LabelOverrideInput reference for inline-edit test shape)
    - src/stores/cadStore.ts:340-358 (rotateProduct + NoHistory variants)
    - src/stores/cadStore.ts:1031 (renameRoom calls pushHistory — confirms genuine bypass needed)
    - src/hooks/useAutoSave.ts:72 (activeName subscription — confirms Plan 09 draftName bypass is required)
    - .planning/phases/33-design-system-ui-polish/33-UI-SPEC.md § "Interaction Contracts"
    - tests/setup.ts (check render helpers / localStorage handling)
  </read_first>
  <action>
    Create 7 RED test files — each asserts behavior that Plans 04-09 will implement:

    **tests/phase33/collapsibleSections.test.ts** (Plan 04 / GH #84):
    ```typescript
    import { describe, it, expect, beforeEach } from "vitest";
    import fs from "node:fs";
    import path from "node:path";

    describe("CollapsibleSection (GH #84)", () => {
      beforeEach(() => { localStorage.clear(); });
      it("component file exists at src/components/ui/CollapsibleSection.tsx", () => {
        expect(fs.existsSync(path.resolve("src/components/ui/CollapsibleSection.tsx"))).toBe(true);
      });
      it("uses lucide ChevronRight + ChevronDown (per D-09)", () => {
        const src = fs.readFileSync(path.resolve("src/components/ui/CollapsibleSection.tsx"), "utf-8");
        expect(src).toMatch(/ChevronRight|ChevronDown/);
      });
      it("persists state to localStorage under ui:propertiesPanel:sections", () => {
        const src = fs.readFileSync(path.resolve("src/components/ui/CollapsibleSection.tsx"), "utf-8");
        expect(src).toMatch(/ui:propertiesPanel:sections/);
      });
      it("PropertiesPanel wraps at least 'Dimensions' section in CollapsibleSection", () => {
        const src = fs.readFileSync(path.resolve("src/components/PropertiesPanel.tsx"), "utf-8");
        expect(src).toMatch(/CollapsibleSection/);
      });
    });
    ```

    **tests/phase33/libraryCard.test.ts** (Plan 05 / GH #89 — interface tests):
    ```typescript
    import { describe, it, expect } from "vitest";
    import fs from "node:fs";
    import path from "node:path";

    describe("Unified LibraryCard + CategoryTabs (GH #89)", () => {
      it("LibraryCard exists at src/components/library/LibraryCard.tsx", () => {
        expect(fs.existsSync(path.resolve("src/components/library/LibraryCard.tsx"))).toBe(true);
      });
      it("CategoryTabs exists at src/components/library/CategoryTabs.tsx", () => {
        expect(fs.existsSync(path.resolve("src/components/library/CategoryTabs.tsx"))).toBe(true);
      });
      it("LibraryCard exports accept thumbnail/label/selected/onClick/onRemove/variant props", () => {
        const src = fs.readFileSync(path.resolve("src/components/library/LibraryCard.tsx"), "utf-8");
        expect(src).toMatch(/thumbnail/);
        expect(src).toMatch(/label/);
        expect(src).toMatch(/selected/);
        expect(src).toMatch(/onRemove/);
      });
      it("ProductLibrary migrates to LibraryCard", () => {
        const src = fs.readFileSync(path.resolve("src/components/ProductLibrary.tsx"), "utf-8");
        expect(src).toMatch(/LibraryCard/);
      });
      it("LibraryCard renders with data-testid='library-card' for count-regression test", () => {
        const src = fs.readFileSync(path.resolve("src/components/library/LibraryCard.tsx"), "utf-8");
        expect(src).toMatch(/data-testid="library-card"/);
      });
    });
    ```

    **tests/phase33/phase33LibraryMigration.test.tsx** (Plan 05 / GH #89 — count-regression blocker fix):
    ```typescript
    import { describe, it, expect, beforeEach } from "vitest";
    import { render, cleanup } from "@testing-library/react";
    import { ProductLibrary } from "@/components/ProductLibrary";
    import { useCADStore } from "@/stores/cadStore";

    describe("Library migration — render count regression (GH #89 blocker fix)", () => {
      beforeEach(() => { cleanup(); });

      it("ProductLibrary renders exactly one LibraryCard per filtered product", () => {
        // Seed N known products via the productLibrary prop path OR via store seed
        // (actual seeding mechanism depends on ProductLibrary API — implementer chooses).
        // Pattern:
        //   1. Seed exactly 3 products in "chairs" category + 2 in "tables"
        //   2. Mount <ProductLibrary /> (or App with library visible) with activeCategory="all"
        //   3. Assert document.querySelectorAll('[data-testid="library-card"]').length === 5
        //   4. Switch to activeCategory="chairs", assert length === 3
        const EXPECTED_ALL = 5;
        const { container } = render(<ProductLibrary /* props or wrapper */ />);
        const cards = container.querySelectorAll('[data-testid="library-card"]');
        expect(cards.length).toBe(EXPECTED_ALL);
      });

      it("CustomElementsPanel renders exactly one LibraryCard per custom element", () => {
        // Analogous assertion for CustomElementsPanel
        // expect(container.querySelectorAll('[data-testid="library-card"]').length).toBe(KNOWN_COUNT);
        // Implementation note: if CustomElementsPanel requires store seed, use useCADStore.setState
        // to inject known elements, then mount component, then assert count.
        expect(true).toBe(true); // Replace with actual assertion in Plan 05 Task 3
      });
    });
    ```

    Note: Exact seeding mechanism (store-driven vs. prop-driven) is resolved during Plan 05 execution. The test file exists in Wave 0 as a RED skeleton with the count-assertion pattern locked in. Plan 05 Task 2 + Task 3 fill in the concrete seed + mount.

    **tests/phase33/floatingToolbar.test.ts** (Plan 06 / GH #85):
    ```typescript
    import { describe, it, expect } from "vitest";
    import fs from "node:fs";
    import path from "node:path";

    describe("FloatingSelectionToolbar (GH #85)", () => {
      it("component exists at src/components/ui/FloatingSelectionToolbar.tsx", () => {
        expect(fs.existsSync(path.resolve("src/components/ui/FloatingSelectionToolbar.tsx"))).toBe(true);
      });
      it("uses lucide Copy + Trash2 (per D-11)", () => {
        const src = fs.readFileSync(path.resolve("src/components/ui/FloatingSelectionToolbar.tsx"), "utf-8");
        expect(src).toMatch(/Copy/);
        expect(src).toMatch(/Trash2/);
      });
      it("uiStore exposes isDragging + setDragging (bridge for drag-hide per D-13)", () => {
        const src = fs.readFileSync(path.resolve("src/stores/uiStore.ts"), "utf-8");
        expect(src).toMatch(/isDragging/);
        expect(src).toMatch(/setDragging/);
      });
      it("selectTool calls setDragging on drag start/end", () => {
        const src = fs.readFileSync(path.resolve("src/canvas/tools/selectTool.ts"), "utf-8");
        expect(src).toMatch(/setDragging/);
      });
    });
    ```

    **tests/phase33/gestureChip.test.ts** (Plan 07 / GH #86):
    ```typescript
    import { describe, it, expect, beforeEach } from "vitest";
    import fs from "node:fs";
    import path from "node:path";

    describe("GestureChip (GH #86)", () => {
      beforeEach(() => { localStorage.clear(); });
      it("component exists at src/components/ui/GestureChip.tsx", () => {
        expect(fs.existsSync(path.resolve("src/components/ui/GestureChip.tsx"))).toBe(true);
      });
      it("2D copy matches contract", () => {
        const src = fs.readFileSync(path.resolve("src/components/ui/GestureChip.tsx"), "utf-8");
        expect(src).toMatch(/Drag to pan/);
        expect(src).toMatch(/Wheel to zoom/);
      });
      it("3D copy matches contract", () => {
        const src = fs.readFileSync(path.resolve("src/components/ui/GestureChip.tsx"), "utf-8");
        expect(src).toMatch(/L-drag rotate/);
      });
      it("uses localStorage key ui:gestureChip:dismissed", () => {
        const src = fs.readFileSync(path.resolve("src/components/ui/GestureChip.tsx"), "utf-8");
        expect(src).toMatch(/ui:gestureChip:dismissed/);
      });
    });
    ```

    **tests/phase33/rotationPresets.test.ts** (Plan 08 / GH #87 — includes single-undo store test, NO .todo fallback):
    ```typescript
    import { describe, it, expect, beforeEach } from "vitest";
    import fs from "node:fs";
    import path from "node:path";
    import { useCADStore } from "@/stores/cadStore";

    describe("Rotation preset chips — file-level contracts (GH #87)", () => {
      it("PropertiesPanel includes a RotationPresetChips row", () => {
        const src = fs.readFileSync(path.resolve("src/components/PropertiesPanel.tsx"), "utf-8");
        const hasPresets = /RotationPresetChips|data-rotation-preset/.test(src);
        expect(hasPresets).toBe(true);
      });
      it("test driver window.__driveRotationPreset documented", () => {
        const readme = fs.readFileSync(path.resolve("tests/phase33/README.md"), "utf-8");
        expect(readme).toMatch(/__driveRotationPreset/);
      });
      it("PropertiesPanel uses rotateProduct (history-pushing), NOT rotateProductNoHistory, in the preset block", () => {
        const src = fs.readFileSync(path.resolve("src/components/PropertiesPanel.tsx"), "utf-8");
        const presetBlock = src.match(/RotationPresetChips[\s\S]{0,800}/);
        if (presetBlock) {
          expect(presetBlock[0]).toMatch(/rotateProduct\(/);
          expect(presetBlock[0]).not.toMatch(/rotateProductNoHistory/);
        } else {
          // If chips are implemented differently, still require history-pushing action
          expect(src).toMatch(/rotateProduct\(/);
        }
      });
    });

    // Store-level behavior test — pure jsdom, no React/Fabric/R3F needed.
    // D-20 invariant: one click = exactly one past[] entry.
    describe("Rotation preset — single-undo invariant (D-20)", () => {
      let productId: string;

      beforeEach(() => {
        // Reset store to a clean state with one room + one placed product
        const store = useCADStore.getState();
        // Seed minimum viable scene:
        //   - activeRoomId set
        //   - one placedProduct at rotation=0
        // Implementation note: use store.addRoom + store.placeProduct, or setState directly.
        // Exact shape depends on cadStore API — Plan 00 author fills in the seed path.
        productId = store.placeProduct("seed-product-id", { x: 0, y: 0 });
      });

      it("one rotateProduct call increments past.length by exactly 1", () => {
        const before = useCADStore.getState().past.length;
        useCADStore.getState().rotateProduct(productId, 45);
        const after = useCADStore.getState().past.length;
        expect(after - before).toBe(1);
      });

      it("rotateProductNoHistory does NOT increment past.length", () => {
        const before = useCADStore.getState().past.length;
        useCADStore.getState().rotateProductNoHistory(productId, 90);
        const after = useCADStore.getState().past.length;
        expect(after - before).toBe(0);
      });
    });
    ```

    **tests/phase33/inlineTitleEdit.test.ts** (Plan 09 / GH #88):
    ```typescript
    import { describe, it, expect } from "vitest";
    import fs from "node:fs";
    import path from "node:path";

    describe("InlineEditableText (GH #88) — reuses Phase 31 LabelOverrideInput pattern", () => {
      it("component exists at src/components/ui/InlineEditableText.tsx", () => {
        expect(fs.existsSync(path.resolve("src/components/ui/InlineEditableText.tsx"))).toBe(true);
      });
      it("uses skipNextBlurRef (Phase 31 pitfall 4 invariant)", () => {
        const src = fs.readFileSync(path.resolve("src/components/ui/InlineEditableText.tsx"), "utf-8");
        expect(src).toMatch(/skipNextBlurRef/);
      });
      it("projectStore exposes draftName + commitDraftName (genuine auto-save bypass per D-23)", () => {
        const src = fs.readFileSync(path.resolve("src/stores/projectStore.ts"), "utf-8");
        expect(src).toMatch(/draftName/);
        expect(src).toMatch(/commitDraftName/);
      });
      it("cadStore exposes renameRoomNoHistory", () => {
        const src = fs.readFileSync(path.resolve("src/stores/cadStore.ts"), "utf-8");
        expect(src).toMatch(/renameRoomNoHistory/);
      });
      it("Toolbar renders the InlineEditableText for project name (relocated from ProjectManager per research recommendation)", () => {
        const src = fs.readFileSync(path.resolve("src/components/Toolbar.tsx"), "utf-8");
        expect(src).toMatch(/InlineEditableText/);
      });
    });
    ```

    All tests MUST fail right now (components don't exist). Red state is desired.
  </action>
  <verify>
    <automated>npm test -- --run tests/phase33/collapsibleSections.test.ts tests/phase33/libraryCard.test.ts tests/phase33/phase33LibraryMigration.test.tsx tests/phase33/floatingToolbar.test.ts tests/phase33/gestureChip.test.ts tests/phase33/rotationPresets.test.ts tests/phase33/inlineTitleEdit.test.ts 2>&amp;1 | grep -E "FAIL|failed" | head -12</automated>
  </verify>
  <acceptance_criteria>
    - 7 test files exist in `tests/phase33/`
    - All 7 FAIL when run right now (components/hooks/store actions don't exist yet)
    - collapsibleSections.test.ts checks localStorage key `ui:propertiesPanel:sections`
    - phase33LibraryMigration.test.tsx contains `querySelectorAll('[data-testid="library-card"]')` and asserts count equals seeded-product count
    - floatingToolbar.test.ts checks uiStore `isDragging` + `setDragging`, and selectTool bridge
    - gestureChip.test.ts checks 2D copy `Drag to pan` + 3D copy `L-drag rotate`
    - rotationPresets.test.ts contains `expect(after - before).toBe(1)` for single-undo AND `expect(after - before).toBe(0)` for NoHistory — NO `.todo` fallback
    - inlineTitleEdit.test.ts checks `skipNextBlurRef`, `draftName`, `commitDraftName`, `renameRoomNoHistory`, and Toolbar relocation
  </acceptance_criteria>
  <done>7 Wave 2/3 RED test files committed, failing as expected. Count-regression test scaffolded for Plan 05 blocker fix.</done>
</task>

</tasks>

<verification>
After this plan runs, executing `npm test -- --run phase33` returns ~11 RED suites. Every downstream plan (01-09) turns its specific test GREEN on completion.

Single grep-based sanity check:
```bash
ls tests/phase33/*.test.* | wc -l   # expect 11 (10 .ts + 1 .tsx)
```
</verification>

<success_criteria>
- [ ] `tests/phase33/` exists with 11 test files + README
- [ ] All tests are RED (failing) at end of this plan — no implementation has happened
- [ ] Driver contracts documented in README for Plans 04, 06, 07, 08, 09
- [ ] `npm test -- --run phase33` returns results (even if RED) — no syntax errors
- [ ] Count-regression test `phase33LibraryMigration.test.tsx` scaffolded
- [ ] Single-undo test `rotationPresets.test.ts` has real `expect(after - before).toBe(1)` (no `.todo`)
</success_criteria>

<output>
After completion, create `.planning/phases/33-design-system-ui-polish/33-00-SUMMARY.md` documenting:
- 11 test files created
- Current pass/fail counts (expect ~0 passing, 20+ failing)
- Driver contract README path
- Which plan will green each file
</output>
</output>
