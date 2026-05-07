---
phase: 71-token-foundation-token-foundation
plan: 00
type: execute
wave: 0
depends_on: []
files_modified:
  - tests/useTheme.test.tsx
  - tests/themeDriver.test.tsx
autonomous: true
requirements: [TOKEN-FOUNDATION]
must_haves:
  truths:
    - "useTheme test file exists and imports the (yet-to-be-built) hook"
    - "themeDriver test file exists and exercises window.__driveTheme"
    - "Both tests RED at task-end (compile-fail or assertion-fail) — proves the contract before implementation"
  artifacts:
    - path: "tests/useTheme.test.tsx"
      provides: "Tests for theme resolution, localStorage persistence, prefers-color-scheme watcher"
    - path: "tests/themeDriver.test.tsx"
      provides: "Tests for window.__driveTheme + StrictMode-safe registration"
  key_links:
    - from: "tests/useTheme.test.tsx"
      to: "src/hooks/useTheme.ts"
      via: "import { useTheme } from '@/hooks/useTheme'"
      pattern: "from\\s+['\"].*hooks/useTheme['\"]"
    - from: "tests/themeDriver.test.tsx"
      to: "window.__driveTheme"
      via: "(window as any).__driveTheme(...)"
      pattern: "__driveTheme"
---

<objective>
Wave 0: write the failing tests for `useTheme` and `__driveTheme` BEFORE the hook exists. This is the Nyquist gate from `71-VALIDATION.md` — every later plan can rely on these tests turning green as proof of correctness.

Purpose: Lock the contract for the theme hook + driver in tests. RED state at end of Plan 00; GREEN after Plan 01 lands.
Output: Two new test files (compile/assertion failures expected — that's the point).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/71-token-foundation-token-foundation/71-CONTEXT.md
@.planning/phases/71-token-foundation-token-foundation/71-RESEARCH.md
@.planning/phases/71-token-foundation-token-foundation/71-VALIDATION.md
@src/hooks/useReducedMotion.ts
</context>

<interfaces>
The hook contract this Wave-0 plan locks (Plan 71-01 implements):

```typescript
// src/hooks/useTheme.ts (NOT YET CREATED — this plan writes tests AGAINST this contract)
type ThemeChoice = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

export function useTheme(): {
  theme: ThemeChoice;        // user's stored choice, defaults "system"
  resolved: ResolvedTheme;   // what's actually applied (system → matches OS)
  setTheme: (t: ThemeChoice) => void;  // persists to localStorage AND updates state
};

// localStorage key: "room-cad-theme"
// On resolved change: applies/removes "dark" class on document.documentElement
```

```typescript
// src/test-utils/themeDrivers.ts (NOT YET CREATED — Plan 71-01 implements)
export function registerThemeSetter(fn: (t: ThemeChoice) => void): () => void;
//   returns identity-checked unregister function (Phase 64 acc2 pattern)
export function installThemeDrivers(): void;
//   no-op unless import.meta.env.MODE === "test"
//   exposes window.__driveTheme(theme)
```
</interfaces>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Write failing useTheme.test.tsx</name>
  <read_first>
    - .planning/phases/71-token-foundation-token-foundation/71-RESEARCH.md (§Pattern 1, §Validation Architecture)
    - .planning/phases/71-token-foundation-token-foundation/71-VALIDATION.md (Wave 0 Requirements)
    - src/hooks/useReducedMotion.ts (mirror this pattern — matchMedia listener with cleanup)
    - tests/snapshotMigration.test.ts (existing vitest convention reference)
  </read_first>
  <files>tests/useTheme.test.tsx</files>
  <behavior>
    Test 1: Default theme is "system" when localStorage is empty
    Test 2: setTheme("dark") writes "dark" to localStorage key "room-cad-theme" and resolved becomes "dark"
    Test 3: setTheme("light") writes "light" and resolved becomes "light"; html.classList does NOT contain "dark"
    Test 4: setTheme("system") + matchMedia mock returning matches:true → resolved is "dark", html has class "dark"
    Test 5: setTheme("system") + matchMedia mock returning matches:false → resolved is "light", html does NOT have "dark"
    Test 6: prefers-color-scheme change event fires → resolved updates without explicit setTheme call (when theme === "system")
    Test 7: Initial render reads stored "light" from localStorage → resolved is "light" on first render
    Test 8: matchMedia event listener is removed on unmount (no leaked listeners — capture and assert)
  </behavior>
  <action>
    Create `tests/useTheme.test.tsx` using vitest + `@testing-library/react`. Mock `window.matchMedia` per-test (use `vi.fn()` returning a MediaQueryList shape with `matches`, `addEventListener`, `removeEventListener`). Mock `localStorage` via `vi.spyOn(Storage.prototype, ...)` or by clearing between tests.

    Import from the not-yet-existing module:
    ```typescript
    import { useTheme } from "@/hooks/useTheme";
    ```

    Use `renderHook` from `@testing-library/react`. Each test resets localStorage in `beforeEach`. Each test resets `document.documentElement.classList.remove("dark")` in `beforeEach` to avoid pollution (this also serves as the contextMenuActionCounts pollution-pattern reference for Plan 71-05).

    Storage key constant: `"room-cad-theme"` (literal — keep aligned with hook).

    Assertions per behavior list above. **Tests MUST fail at first run** — the module doesn't exist yet. That failure IS the contract lock.

    Cite this work as "implements TOKEN-FOUNDATION test scaffold per D-07, D-08".
  </action>
  <verify>
    <automated>npx vitest run tests/useTheme.test.tsx 2>&1 | grep -E "Cannot find module|Failed to resolve|FAIL" | head -5</automated>
  </verify>
  <acceptance_criteria>
    - File `tests/useTheme.test.tsx` exists
    - `grep -c "useTheme" tests/useTheme.test.tsx` returns at least 8 (one per test)
    - `grep -c "room-cad-theme" tests/useTheme.test.tsx` returns at least 2 (storage key referenced)
    - `grep -c "matchMedia" tests/useTheme.test.tsx` returns at least 3
    - `grep -c "prefers-color-scheme" tests/useTheme.test.tsx` returns at least 2
    - `grep "from \"@/hooks/useTheme\"\\|from '@/hooks/useTheme'" tests/useTheme.test.tsx` matches at least once
    - `npx vitest run tests/useTheme.test.tsx` exits non-zero (RED — proves contract lock)
  </acceptance_criteria>
  <done>
    Failing test file committed; the very fact that it fails compile is proof the contract is locked. Plan 71-01 will turn this GREEN.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Write failing themeDriver.test.tsx</name>
  <read_first>
    - .planning/phases/71-token-foundation-token-foundation/71-RESEARCH.md (§Pattern 2, §Anti-Patterns)
    - CLAUDE.md §"StrictMode-safe useEffect cleanup for module-level registries"
    - src/test-utils/textureDrivers.ts (existing driver pattern — mirror its install/register shape)
    - src/three/WallMesh.tsx (Phase 64 acc2 — identity-check cleanup)
  </read_first>
  <files>tests/themeDriver.test.tsx</files>
  <behavior>
    Test 1: Outside test mode, `installThemeDrivers()` does NOT install `window.__driveTheme` (it remains undefined)
    Test 2: In test mode (MODE === "test"), `installThemeDrivers()` installs `window.__driveTheme`
    Test 3: Calling `window.__driveTheme("dark")` invokes the registered setter and adds "dark" class
    Test 4: Calling `window.__driveTheme("light")` invokes the registered setter and removes "dark" class
    Test 5: StrictMode double-mount: first registerThemeSetter cleanup is called → second registration is the live one → __driveTheme uses the second; no stale ref to first
    Test 6: Unregister via returned cleanup fn nulls the setter ONLY if identity matches (passes wrong fn → no-op)
  </behavior>
  <action>
    Create `tests/themeDriver.test.tsx`. Import:
    ```typescript
    import { registerThemeSetter, installThemeDrivers } from "@/test-utils/themeDrivers";
    ```

    For Test 5 (StrictMode safety), simulate the bug pattern manually: register fn A, register fn B, then call A's cleanup — verify the live ref is still B (identity check prevents clobber). This is the Phase 64 acc2 invariant in test form.

    Use `import.meta.env.MODE` mocked via `vi.stubEnv("MODE", "test")` for Test 2-4; `vi.stubEnv("MODE", "production")` for Test 1.

    Each test resets `delete (window as any).__driveTheme` in `beforeEach` and `vi.unstubAllEnvs()` in `afterEach`.

    Cite as "implements TOKEN-FOUNDATION driver scaffold per D-08, StrictMode safety per CLAUDE.md item #7".
  </action>
  <verify>
    <automated>npx vitest run tests/themeDriver.test.tsx 2>&1 | grep -E "Cannot find module|Failed to resolve|FAIL" | head -5</automated>
  </verify>
  <acceptance_criteria>
    - File `tests/themeDriver.test.tsx` exists
    - `grep -c "__driveTheme" tests/themeDriver.test.tsx` returns at least 5
    - `grep -c "registerThemeSetter\\|installThemeDrivers" tests/themeDriver.test.tsx` returns at least 4
    - `grep "StrictMode\\|identity\\|double-mount" tests/themeDriver.test.tsx` matches at least once (test 5 must reference the pattern)
    - `grep "from \"@/test-utils/themeDrivers\"\\|from '@/test-utils/themeDrivers'" tests/themeDriver.test.tsx` matches at least once
    - `npx vitest run tests/themeDriver.test.tsx` exits non-zero (RED — proves contract lock)
  </acceptance_criteria>
  <done>
    Failing driver test committed. Plan 71-01 turns this GREEN.
  </done>
</task>

</tasks>

<verification>
Both files exist; both fail compile (module not found). The failure messages are the proof. No green required at this wave.
</verification>

<success_criteria>
- [ ] `tests/useTheme.test.tsx` exists and references the un-created `useTheme` hook
- [ ] `tests/themeDriver.test.tsx` exists and references the un-created `themeDrivers` module
- [ ] `npx vitest run tests/useTheme.test.tsx tests/themeDriver.test.tsx` exits non-zero
- [ ] Both files committed via gsd-tools commit (atomic, one commit per task)
</success_criteria>

<output>
After completion, create `.planning/phases/71-token-foundation-token-foundation/71-00-SUMMARY.md` with: tests written, expected failure messages, contract surface locked, next-plan handoff (71-01 implements `useTheme` + `themeDrivers`).
</output>
