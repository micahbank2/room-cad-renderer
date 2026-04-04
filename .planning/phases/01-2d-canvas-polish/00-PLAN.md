---
phase: 01-2d-canvas-polish
plan: 00
type: execute
wave: 0
depends_on: []
files_modified:
  - package.json
  - vitest.config.ts
  - tests/setup.ts
  - tests/geometry.test.ts
  - tests/cadStore.test.ts
  - tests/dragDrop.test.ts
  - tests/rotationHandle.test.ts
  - tests/dimensionEditor.test.ts
  - tests/productImageCache.test.ts
  - tests/useAutoSave.test.ts
  - tests/SaveIndicator.test.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "`npx vitest run --reporter=dot` exits 0 with all stub suites collected"
    - "`npm test` runs vitest and exits 0"
    - "jsdom environment is active so DOM APIs work inside tests"
  artifacts:
    - path: "vitest.config.ts"
      provides: "jsdom env + globals + setup file wiring"
    - path: "tests/setup.ts"
      provides: "jest-dom matchers import"
    - path: "tests/geometry.test.ts"
      provides: "stub suite for snapTo/wallLength/closestPointOnWall/formatFeet/wallCorners + resizeWall"
    - path: "tests/cadStore.test.ts"
      provides: "stub suite for placeProduct/moveProduct/rotateProduct/updateWall/undo/redo/rotateProductNoHistory"
    - path: "tests/dragDrop.test.ts"
      provides: "stub suite for coord translation + snap + place + auto-select"
    - path: "tests/rotationHandle.test.ts"
      provides: "stub suite for snap 15 / shift disables snap / world position"
    - path: "tests/dimensionEditor.test.ts"
      provides: "stub suite for overlay position + wall resize + invalid input"
    - path: "tests/productImageCache.test.ts"
      provides: "stub suite for cache hit/miss + async load"
    - path: "tests/useAutoSave.test.ts"
      provides: "stub suite for debounce + auto-create + status transitions (fake timers)"
    - path: "tests/SaveIndicator.test.tsx"
      provides: "stub suite for component render"
  key_links:
    - from: "package.json scripts.test"
      to: "vitest"
      via: "`vitest run` invocation"
      pattern: "\"test\":\\s*\"vitest run\""
    - from: "vitest.config.ts"
      to: "tests/setup.ts"
      via: "setupFiles option"
      pattern: "setupFiles.*setup"
---

<objective>
Install and configure Vitest + jsdom + testing-library so every downstream plan in Phase 1 can reference automated test commands from 01-VALIDATION.md. Create placeholder test files that each define `describe.skip` or `it.todo` stubs matching the task IDs in VALIDATION.md. These stubs will be filled in by downstream plans.

Purpose: Wave 0 is a foundational prerequisite for the Nyquist validation contract. Without it, every task downstream references a MISSING command.
Output: Working test infrastructure, 9 stub test files, `npm test` and `npx vitest run --reporter=dot` both exit 0.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-2d-canvas-polish/01-VALIDATION.md
@.planning/phases/01-2d-canvas-polish/01-RESEARCH.md
@package.json
@vite.config.ts
@tsconfig.json
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Install test dependencies and add npm scripts</name>
  <read_first>
    - /Users/micahbank/room-cad-renderer/package.json (current deps, type=commonjs, scripts)
    - /Users/micahbank/room-cad-renderer/.planning/phases/01-2d-canvas-polish/01-VALIDATION.md (Wave 0 requirements)
  </read_first>
  <files>package.json</files>
  <action>
    Run exactly: `npm install -D vitest@^2 @testing-library/react@^16 @testing-library/jest-dom@^6 @testing-library/user-event@^14 jsdom@^25`

    Then edit package.json:
    - Replace `"test": "echo \"Error: no test specified\" && exit 1"` with `"test": "vitest run"`
    - Add `"test:watch": "vitest"`
    - Add `"test:quick": "vitest run --reporter=dot"`

    Keep "type": "commonjs" as-is (Vite handles ESM internally).
  </action>
  <verify>
    <automated>test -f package.json && node -e "const p=require('./package.json'); if(!p.devDependencies.vitest)throw 'no vitest'; if(p.scripts.test!=='vitest run')throw 'bad script'; console.log('ok')"</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q '"vitest":' package.json` succeeds
    - `grep -q '"jsdom":' package.json` succeeds
    - `grep -q '"@testing-library/react":' package.json` succeeds
    - `grep -q '"@testing-library/jest-dom":' package.json` succeeds
    - `grep -q '"test": "vitest run"' package.json` succeeds
    - `grep -q '"test:watch": "vitest"' package.json` succeeds
    - `grep -q '"test:quick": "vitest run --reporter=dot"' package.json` succeeds
    - `node_modules/vitest/package.json` exists
  </acceptance_criteria>
  <done>Vitest and testing-library installed as dev deps; `npm test` invokes vitest.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Create vitest.config.ts and tests/setup.ts</name>
  <read_first>
    - /Users/micahbank/room-cad-renderer/vite.config.ts (for path alias pattern)
    - /Users/micahbank/room-cad-renderer/tsconfig.json (for @/* path alias)
  </read_first>
  <files>vitest.config.ts, tests/setup.ts</files>
  <action>
    Create /Users/micahbank/room-cad-renderer/vitest.config.ts with this exact content:

    ```ts
    import { defineConfig } from "vitest/config";
    import react from "@vitejs/plugin-react";
    import path from "path";

    export default defineConfig({
      plugins: [react()],
      resolve: {
        alias: {
          "@": path.resolve(__dirname, "./src"),
        },
      },
      test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./tests/setup.ts"],
        include: ["tests/**/*.{test,spec}.{ts,tsx}"],
      },
    });
    ```

    Create /Users/micahbank/room-cad-renderer/tests/setup.ts with this exact content:

    ```ts
    import "@testing-library/jest-dom";
    ```
  </action>
  <verify>
    <automated>test -f vitest.config.ts && test -f tests/setup.ts && grep -q "jsdom" vitest.config.ts && grep -q "@testing-library/jest-dom" tests/setup.ts</automated>
  </verify>
  <acceptance_criteria>
    - `test -f /Users/micahbank/room-cad-renderer/vitest.config.ts` succeeds
    - `test -f /Users/micahbank/room-cad-renderer/tests/setup.ts` succeeds
    - `grep -q 'environment: "jsdom"' vitest.config.ts` succeeds
    - `grep -q 'globals: true' vitest.config.ts` succeeds
    - `grep -q 'setupFiles' vitest.config.ts` succeeds
    - `grep -q '"@": path.resolve' vitest.config.ts` succeeds
    - `grep -q 'include:.*tests' vitest.config.ts` succeeds
    - `grep -q '@testing-library/jest-dom' tests/setup.ts` succeeds
  </acceptance_criteria>
  <done>Vitest config active with jsdom + globals + setup file + @/ alias.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Create 9 stub test files matching VALIDATION.md task IDs</name>
  <read_first>
    - /Users/micahbank/room-cad-renderer/.planning/phases/01-2d-canvas-polish/01-VALIDATION.md (per-task verification map; test names like "cache hit/miss", "snap 15", "debounce", "resize wall", etc.)
  </read_first>
  <files>tests/geometry.test.ts, tests/cadStore.test.ts, tests/dragDrop.test.ts, tests/rotationHandle.test.ts, tests/dimensionEditor.test.ts, tests/productImageCache.test.ts, tests/useAutoSave.test.ts, tests/SaveIndicator.test.tsx</files>
  <action>
    Create each file with `describe` blocks that use `it.todo()` for the test names enumerated in 01-VALIDATION.md. Using `it.todo` (not `it.skip`) means vitest collects and passes them while flagging as todo. Exact content per file:

    /Users/micahbank/room-cad-renderer/tests/geometry.test.ts:
    ```ts
    import { describe, it } from "vitest";
    describe("geometry helpers", () => {
      it.todo("snapTo rounds to nearest increment");
      it.todo("distance between two points");
      it.todo("angle between two points");
      it.todo("wallLength of a segment");
      it.todo("closestPointOnWall returns t in [0,1]");
      it.todo("formatFeet renders feet and inches");
      it.todo("wallCorners returns 4 corners in order");
      it.todo("resize wall: keeps start fixed, moves end along unit vector");
    });
    ```

    /Users/micahbank/room-cad-renderer/tests/cadStore.test.ts:
    ```ts
    import { describe, it } from "vitest";
    describe("cadStore actions", () => {
      it.todo("placeProduct returns new id and adds to placedProducts");
      it.todo("moveProduct updates position");
      it.todo("rotateProduct updates rotation and pushes history");
      it.todo("rotate: rotateProductNoHistory updates rotation without pushing history");
      it.todo("updateWall: wall resize corner propagates to shared-endpoint walls");
      it.todo("undo restores prior snapshot");
      it.todo("redo re-applies undone snapshot");
    });
    ```

    /Users/micahbank/room-cad-renderer/tests/dragDrop.test.ts:
    ```ts
    import { describe, it } from "vitest";
    describe("drag-drop placement", () => {
      it.todo("coord translation: clientX/Y minus rect + origin divided by scale yields feet");
      it.todo("snap + place: dropped point snaps to grid then calls placeProduct");
      it.todo("auto-select: newly placed product id is set in uiStore.selectedIds");
    });
    ```

    /Users/micahbank/room-cad-renderer/tests/rotationHandle.test.ts:
    ```ts
    import { describe, it } from "vitest";
    describe("rotation handle math", () => {
      it.todo("snap 15: raw 22deg rounds to 15, 23deg rounds to 30");
      it.todo("shift disables snap: raw angle passes through unchanged");
      it.todo("world position: handle offset rotates with product rotation");
    });
    ```

    /Users/micahbank/room-cad-renderer/tests/dimensionEditor.test.ts:
    ```ts
    import { describe, it } from "vitest";
    describe("dimension editor overlay", () => {
      it.todo("position: overlay x/y matches drawWallDimension perpendicular offset");
      it.todo("invalid input: non-numeric or <=0 parseFloat results cancel silently");
    });
    ```

    /Users/micahbank/room-cad-renderer/tests/productImageCache.test.ts:
    ```ts
    import { describe, it } from "vitest";
    describe("productImageCache", () => {
      it.todo("cache hit/miss: returns null on miss, cached HTMLImageElement on hit");
      it.todo("async load: onload populates cache and invokes onReady callback exactly once");
    });
    ```

    /Users/micahbank/room-cad-renderer/tests/useAutoSave.test.ts:
    ```ts
    import { describe, it } from "vitest";
    describe("useAutoSave hook", () => {
      it.todo("debounce: multiple rapid mutations collapse to a single saveProject call after 2s");
      it.todo("auto-create: with no activeId, creates new proj_ id and sets name Untitled Room");
      it.todo("status transitions: idle -> saving -> saved -> idle");
    });
    ```

    /Users/micahbank/room-cad-renderer/tests/SaveIndicator.test.tsx:
    ```ts
    import { describe, it } from "vitest";
    describe("SaveIndicator component", () => {
      it.todo("renders nothing when status is idle");
      it.todo("renders SAVING when status is saving");
      it.todo("renders SAVED when status is saved");
    });
    ```
  </action>
  <verify>
    <automated>npx vitest run --reporter=dot 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - All 8 test files exist under `/Users/micahbank/room-cad-renderer/tests/`
    - `grep -c "it.todo" tests/geometry.test.ts` returns 8
    - `grep -c "it.todo" tests/cadStore.test.ts` returns 7
    - `grep -c "it.todo" tests/dragDrop.test.ts` returns 3
    - `grep -c "it.todo" tests/rotationHandle.test.ts` returns 3
    - `grep -c "it.todo" tests/dimensionEditor.test.ts` returns 2
    - `grep -c "it.todo" tests/productImageCache.test.ts` returns 2
    - `grep -c "it.todo" tests/useAutoSave.test.ts` returns 3
    - `grep -c "it.todo" tests/SaveIndicator.test.tsx` returns 3
    - `npx vitest run --reporter=dot` exits 0
    - `npx vitest run` output contains "todo" markers (not failures)
  </acceptance_criteria>
  <done>All 8 stub test files exist with `it.todo` entries covering every row in 01-VALIDATION.md; vitest run exits 0.</done>
</task>

</tasks>

<verification>
- `npm test` exits 0
- `npx vitest run --reporter=dot` exits 0 and completes in < 5 seconds
- No test file is empty; each contains a `describe` + at least one `it.todo`
</verification>

<success_criteria>
Test infrastructure is live. Every downstream plan can now add real `it()` tests to these files and reference `npx vitest run tests/<file>.ts -t "<name>"` from VALIDATION.md.
</success_criteria>

<output>
After completion, create `.planning/phases/01-2d-canvas-polish/01-00-SUMMARY.md` describing installed versions, config file shape, and the test file stubs created.
</output>
