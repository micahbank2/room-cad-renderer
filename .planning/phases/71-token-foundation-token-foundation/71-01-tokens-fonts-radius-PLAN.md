---
phase: 71-token-foundation-token-foundation
plan: 01
type: execute
wave: 1
depends_on: ["71-00"]
files_modified:
  - src/index.css
  - index.html
  - package.json
  - package-lock.json
  - src/main.tsx
  - src/App.tsx
  - src/hooks/useTheme.ts
  - src/test-utils/themeDrivers.ts
autonomous: true
requirements: [TOKEN-FOUNDATION]
must_haves:
  truths:
    - "Pascal's oklch tokens defined in :root (light) AND .dark (dark) blocks"
    - "Radius scale uses --radius: 0.625rem with calc-derived sm/md/lg/xl"
    - "Squircle utility classes .rounded-smooth / -md / -lg / -xl exist"
    - "Barlow loaded from Google Fonts; Geist Sans + Geist Mono via geist npm package"
    - "Material Symbols link removed from index.html"
    - "Boot script in index.html applies dark class before React mounts (no flash)"
    - "useTheme hook resolves theme + applies html class; tests/useTheme.test.tsx GREEN"
    - "window.__driveTheme works in test mode; tests/themeDriver.test.tsx GREEN"
    - "App.tsx wires registerThemeSetter with StrictMode-safe identity-check cleanup"
  artifacts:
    - path: "src/index.css"
      provides: "@theme block with Pascal oklch tokens, radius scale, squircle utilities; Obsidian tokens + custom classes deleted"
      contains: "oklch(0.205 0 0)"
    - path: "index.html"
      provides: "Barlow font preload + theme-bootstrap script"
      contains: "Barlow"
    - path: "src/hooks/useTheme.ts"
      provides: "useTheme hook (theme/resolved/setTheme), localStorage persistence, prefers-color-scheme listener"
      exports: ["useTheme"]
    - path: "src/test-utils/themeDrivers.ts"
      provides: "registerThemeSetter (identity-check cleanup), installThemeDrivers (gated by MODE=test)"
      exports: ["registerThemeSetter", "installThemeDrivers"]
    - path: "package.json"
      provides: "geist dependency added"
      contains: "geist"
  key_links:
    - from: "src/main.tsx"
      to: "geist fonts + installThemeDrivers"
      via: "import 'geist/font/sans'; import 'geist/font/mono'; installThemeDrivers()"
      pattern: "geist/font/sans|installThemeDrivers"
    - from: "src/App.tsx"
      to: "useTheme + registerThemeSetter"
      via: "useTheme(); registerThemeSetter(setTheme) inside useEffect"
      pattern: "useTheme\\(\\)|registerThemeSetter"
    - from: "index.html"
      to: "localStorage room-cad-theme"
      via: "inline boot script"
      pattern: "room-cad-theme"
---

<objective>
Define the Pascal token foundation in CSS AND ship the `useTheme` hook + test driver. This plan turns Plan 71-00's RED tests GREEN. After this plan, every later sweep (Plans 71-02, 71-03, 71-04, 71-05) has new tokens, fonts, and a working theme system to map onto.

Purpose: Replace Obsidian palette + IBM Plex / Inter / Space Grotesk + Material Symbols at the source-file level; add the theme infrastructure that Phase 76 will build on.
Output: New `@theme {}` block (Pascal oklch tokens light + dark), Barlow + Geist font stack, theme-bootstrap script, useTheme hook, themeDrivers test driver, App.tsx + main.tsx wiring.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/71-token-foundation-token-foundation/71-CONTEXT.md
@.planning/phases/71-token-foundation-token-foundation/71-RESEARCH.md
@.planning/competitive/pascal-visual-audit.md
@src/index.css
@index.html
@src/main.tsx
@src/App.tsx
@src/hooks/useReducedMotion.ts
@src/test-utils/textureDrivers.ts
</context>

<interfaces>
Hook contract (from Plan 71-00 tests — must satisfy these):

```typescript
type ThemeChoice = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

export function useTheme(): {
  theme: ThemeChoice;
  resolved: ResolvedTheme;
  setTheme: (t: ThemeChoice) => void;
};
```

Driver contract:

```typescript
export function registerThemeSetter(fn: (t: ThemeChoice) => void): () => void;
export function installThemeDrivers(): void;  // no-op unless MODE === "test"
declare global { interface Window { __driveTheme?: (theme: ThemeChoice) => void } }
```

Reference for StrictMode-safe pattern: `src/three/WallMesh.tsx` (Phase 64 acc2) — identity-check cleanup. CLAUDE.md item #7.
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Install geist + rewrite src/index.css with Pascal tokens</name>
  <read_first>
    - package.json (current dependencies — confirm geist absent)
    - .planning/competitive/pascal-visual-audit.md (lines 48-160 for :root and .dark blocks)
    - .planning/phases/71-token-foundation-token-foundation/71-CONTEXT.md (D-01..D-16)
    - .planning/phases/71-token-foundation-token-foundation/71-RESEARCH.md (§Token Mapping Table, §Squircle, §Common Pitfalls)
    - src/index.css (current file)
  </read_first>
  <files>package.json, package-lock.json, src/index.css</files>
  <action>
    Step A — Install geist:
    Run `npm install geist`. Verify `node_modules/geist/font/sans.css` and `node_modules/geist/font/mono.css` exist post-install.

    Step B — Full rewrite of `src/index.css`:

    Replace ENTIRE file contents with:

    ```css
    @import "tailwindcss";

    /* Pascal Visual Parity — v1.18 Phase 71 (TOKEN-FOUNDATION).
       Replaces Obsidian CAD palette with Pascal's oklch system + Barlow/Geist fonts.
       Implements D-01..D-16. */

    :root {
      --background: oklch(0.998 0 0);
      --foreground: oklch(0.145 0 0);
      --card: oklch(0.998 0 0);
      --card-foreground: oklch(0.145 0 0);
      --popover: oklch(0.998 0 0);
      --popover-foreground: oklch(0.145 0 0);
      --primary: oklch(0.205 0 0);
      --primary-foreground: oklch(0.985 0 0);
      --secondary: oklch(0.97 0 0);
      --secondary-foreground: oklch(0.205 0 0);
      --muted: oklch(0.97 0 0);
      --muted-foreground: oklch(0.556 0 0);
      --accent: oklch(0.97 0 0);
      --accent-foreground: oklch(0.205 0 0);
      --destructive: oklch(0.577 0.245 27.325);
      --border: oklch(0.922 0 0);
      --input: oklch(0.922 0 0);
      --ring: oklch(0.708 0 0);

      --radius: 0.625rem;
    }

    .dark {
      --background: oklch(0.205 0 0);
      --foreground: oklch(0.985 0 0);
      --card: oklch(0.205 0 0);
      --card-foreground: oklch(0.985 0 0);
      --popover: oklch(0.235 0 0);
      --popover-foreground: oklch(0.985 0 0);
      --primary: oklch(0.985 0 0);
      --primary-foreground: oklch(0.205 0 0);
      --secondary: oklch(0.235 0 0);
      --secondary-foreground: oklch(0.985 0 0);
      --muted: oklch(0.235 0 0);
      --muted-foreground: oklch(0.708 0 0);
      --accent: oklch(0.235 0 0);
      --accent-foreground: oklch(0.985 0 0);
      --destructive: oklch(0.577 0.245 27.325);
      --border: oklch(0.235 0 0);
      --input: oklch(0.235 0 0);
      --ring: oklch(0.439 0 0);
    }

    @theme {
      --color-background: var(--background);
      --color-foreground: var(--foreground);
      --color-card: var(--card);
      --color-card-foreground: var(--card-foreground);
      --color-popover: var(--popover);
      --color-popover-foreground: var(--popover-foreground);
      --color-primary: var(--primary);
      --color-primary-foreground: var(--primary-foreground);
      --color-secondary: var(--secondary);
      --color-secondary-foreground: var(--secondary-foreground);
      --color-muted: var(--muted);
      --color-muted-foreground: var(--muted-foreground);
      --color-accent: var(--accent);
      --color-accent-foreground: var(--accent-foreground);
      --color-destructive: var(--destructive);
      --color-border: var(--border);
      --color-input: var(--input);
      --color-ring: var(--ring);

      --radius-sm: calc(var(--radius) - 4px);
      --radius-md: calc(var(--radius) - 2px);
      --radius-lg: var(--radius);
      --radius-xl: calc(var(--radius) + 4px);

      /* D-14: Pascal-aligned spacing scale (was 4/8/16/24 in Phase 33) */
      --spacing-xs: 8px;
      --spacing-sm: 12px;
      --spacing-md: 16px;
      --spacing-lg: 24px;
      --spacing-xl: 32px;

      /* Fonts (D-15 / D-16 — drop Material Symbols + Plex/Inter/SpaceGrotesk) */
      --font-sans: 'Barlow', 'Geist Sans', system-ui, sans-serif;
      --font-mono: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace;

      /* Phase 33 typography (preserved) */
      --text-display: 28px;
      --text-base: 13px;
      --text-sm: 11px;
    }

    /* D-13: Squircle progressive enhancement — Safari/WebKit only.
       Chrome/Firefox/Edge ignore corner-shape and render border-radius alone. */
    .rounded-smooth     { border-radius: var(--radius-lg); corner-shape: squircle; }
    .rounded-smooth-md  { border-radius: var(--radius-md); corner-shape: squircle; }
    .rounded-smooth-lg  { border-radius: var(--radius-lg); corner-shape: squircle; }
    .rounded-smooth-xl  { border-radius: var(--radius-xl); corner-shape: squircle; }

    body {
      font-family: var(--font-sans);
      background-color: var(--background);
      color: var(--foreground);
    }
    ```

    DELETED in this rewrite (per D-03/D-04/D-15/D-16):
    - `@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono...')` line
    - All `--color-obsidian-*` tokens
    - `--color-accent-light/dim/deep/glow/subtle`
    - `--color-text-primary/muted/dim/ghost`
    - `--color-outline` / `--color-outline-variant`
    - `--shadow-glow*` tokens
    - `--font-display`, `--font-body` (only `--font-sans` and `--font-mono` survive)
    - `.glass-panel`, `.accent-glow`, `.cad-grid-bg`, `.ghost-border` class definitions
    - `.material-symbols-outlined` class definition

    PRESERVE: any Phase 33 typography helpers (`--text-display: 28px`, `--text-base: 13px`, `--text-sm: 11px`) — kept in the @theme block above.

    Step C — Sanity build:
    Run `npm run build`. Tailwind v4 silently rejects malformed oklch (RESEARCH §Pitfalls #1) — if build succeeds and you see no `--background` / `--foreground` warnings, tokens parsed correctly.

    Cite as "implements D-01..D-06, D-13, D-14, D-15, D-16 token foundation".
  </action>
  <verify>
    <automated>test -f node_modules/geist/font/sans.css && grep -c "obsidian-\|--color-text-\|glass-panel\|accent-glow\|cad-grid-bg\|ghost-border\|material-symbols\|IBM+Plex\|Space+Grotesk\|font-display:\|font-body:" src/index.css | tr -d '\n' | { read n; [ "$n" = "0" ]; } && grep -q "oklch(0.205 0 0)" src/index.css && grep -q "oklch(0.998 0 0)" src/index.css && grep -q "Barlow" src/index.css && grep -q "Geist Mono" src/index.css && grep -q "corner-shape: squircle" src/index.css && npm run build 2>&1 | tail -3</automated>
  </verify>
  <acceptance_criteria>
    - `node_modules/geist/font/sans.css` exists and `node_modules/geist/font/mono.css` exists
    - `package.json` has `geist` under `dependencies`
    - `grep -c "obsidian-" src/index.css` returns `0`
    - `grep -c "text-text-" src/index.css` returns `0`
    - `grep -c "glass-panel\|accent-glow\|cad-grid-bg\|ghost-border\|material-symbols" src/index.css` returns `0`
    - `grep -c "IBM+Plex\|Space+Grotesk\|font-display:\|font-body:" src/index.css` returns `0`
    - `grep "oklch(0.205 0 0)" src/index.css` matches >= 2 (one in `:root --primary`, one in `.dark --background`)
    - `grep "oklch(0.998 0 0)" src/index.css` matches >= 1
    - `grep "Barlow" src/index.css` matches >= 1
    - `grep "Geist Mono" src/index.css` matches >= 1
    - `grep "corner-shape: squircle" src/index.css` matches >= 4
    - `grep "0.625rem" src/index.css` matches >= 1
    - `npm run build` exits 0 (no Tailwind v4 token rejection)
  </acceptance_criteria>
  <done>Pascal tokens live; build green; geist installed; subsequent sweeps have a target.</done>
</task>

<task type="auto">
  <name>Task 2: Update index.html — Barlow + theme bootstrap script + drop Material Symbols</name>
  <read_first>
    - index.html (current — has Material Symbols link + OBSIDIAN_CAD title)
    - .planning/phases/71-token-foundation-token-foundation/71-RESEARCH.md (§Code Examples — index.html swap, §Common Pitfalls #2 boot flash)
    - .planning/phases/71-token-foundation-token-foundation/71-CONTEXT.md (D-07 storage key, D-09 mixed-case, D-16 Material Symbols removal)
  </read_first>
  <files>index.html</files>
  <action>
    Rewrite `index.html` to:

    ```html
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Room CAD Renderer</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script>
          (function () {
            try {
              var t = localStorage.getItem('room-cad-theme') || 'system';
              var dark = t === 'dark' || (t === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
              if (dark) document.documentElement.classList.add('dark');
            } catch (e) {}
          })();
        </script>
      </head>
      <body>
        <div id="root"></div>
        <script type="module" src="/src/main.tsx"></script>
      </body>
    </html>
    ```

    DELETE the existing `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined...">` (D-16).
    UPDATE `<title>OBSIDIAN_CAD</title>` → `<title>Room CAD Renderer</title>` (mixed case per D-09).

    The bootstrap script reads localStorage key `room-cad-theme` (matches D-07) and applies the `dark` class BEFORE React mounts — prevents flash-of-light-mode (RESEARCH §Pitfalls #2).

    Cite as "implements D-07 boot-flash mitigation, D-09 mixed-case title, D-16 Material Symbols removal".
  </action>
  <verify>
    <automated>! grep -q "Material+Symbols\|Material Symbols\|OBSIDIAN_CAD" index.html && grep -q "Barlow" index.html && grep -q "room-cad-theme" index.html && grep -q "prefers-color-scheme" index.html</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "Material+Symbols\|Material Symbols" index.html` returns `0`
    - `grep -c "OBSIDIAN_CAD" index.html` returns `0`
    - `grep "Barlow" index.html` matches >= 1
    - `grep "room-cad-theme" index.html` matches exactly 1 (only inside boot script)
    - `grep "prefers-color-scheme" index.html` matches >= 1
    - `grep "<title>Room CAD Renderer</title>" index.html` matches exactly 1
  </acceptance_criteria>
  <done>Fonts swapped, boot script live, title de-Obsidian'd, no Material Symbols loader.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Implement useTheme hook + themeDrivers test driver</name>
  <read_first>
    - tests/useTheme.test.tsx (Plan 71-00 — RED tests this implementation must turn GREEN)
    - tests/themeDriver.test.tsx (Plan 71-00 — RED tests)
    - src/hooks/useReducedMotion.ts (mirror this matchMedia + cleanup pattern exactly)
    - src/test-utils/textureDrivers.ts (existing driver pattern for installXDrivers shape)
    - src/three/WallMesh.tsx (Phase 64 acc2 — identity-check cleanup the driver MUST follow)
    - .planning/phases/71-token-foundation-token-foundation/71-RESEARCH.md (§Pattern 1, §Pattern 2)
    - CLAUDE.md §"StrictMode-safe useEffect cleanup for module-level registries"
  </read_first>
  <files>src/hooks/useTheme.ts, src/test-utils/themeDrivers.ts</files>
  <behavior>
    Test 1 (useTheme): Default theme is "system" when localStorage empty
    Test 2 (useTheme): setTheme("dark") writes localStorage["room-cad-theme"]="dark", resolved="dark", html.classList contains "dark"
    Test 3 (useTheme): setTheme("light") removes "dark" class
    Test 4 (useTheme): theme="system" + matchMedia matches=true → resolved="dark"
    Test 5 (useTheme): theme="system" + matchMedia matches=false → resolved="light"
    Test 6 (useTheme): prefers-color-scheme change event updates resolved
    Test 7 (useTheme): localStorage prefilled with "light" → first render resolved="light"
    Test 8 (useTheme): matchMedia listener removed on unmount
    Test 1 (driver): Outside test mode, window.__driveTheme is undefined
    Test 2 (driver): In test mode, window.__driveTheme is a function
    Test 3-4 (driver): __driveTheme calls registered setter
    Test 5 (driver): StrictMode double-mount — second registration is the live ref; first cleanup must not clobber it
    Test 6 (driver): Identity-check unregister — passing wrong fn is a no-op
  </behavior>
  <action>
    Step A — Create `src/hooks/useTheme.ts`:

    ```typescript
    import { useEffect, useState, useCallback } from "react";

    const STORAGE_KEY = "room-cad-theme";
    export type ThemeChoice = "light" | "dark" | "system";
    export type ResolvedTheme = "light" | "dark";

    export function useTheme(): {
      theme: ThemeChoice;
      resolved: ResolvedTheme;
      setTheme: (t: ThemeChoice) => void;
    } {
      const [theme, setThemeState] = useState<ThemeChoice>(() => {
        if (typeof window === "undefined") return "system";
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "light" || stored === "dark" || stored === "system") return stored;
        return "system";
      });

      const [systemDark, setSystemDark] = useState<boolean>(() => {
        if (typeof window === "undefined" || !window.matchMedia) return true;
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
      });

      // Subscribe to OS preference (mirrors useReducedMotion pattern).
      useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return;
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
      }, []);

      const resolved: ResolvedTheme = theme === "system" ? (systemDark ? "dark" : "light") : theme;

      // Apply <html class="dark"> from effect, never from render path.
      useEffect(() => {
        const html = document.documentElement;
        if (resolved === "dark") html.classList.add("dark");
        else html.classList.remove("dark");
      }, [resolved]);

      const setTheme = useCallback((t: ThemeChoice) => {
        try { localStorage.setItem(STORAGE_KEY, t); } catch {}
        setThemeState(t);
      }, []);

      return { theme, resolved, setTheme };
    }
    ```

    Step B — Create `src/test-utils/themeDrivers.ts` with the StrictMode-safe identity-check cleanup pattern from Phase 64 acc2:

    ```typescript
    import type { ThemeChoice } from "@/hooks/useTheme";

    declare global {
      interface Window {
        __driveTheme?: (theme: ThemeChoice) => void;
      }
    }

    let setterRef: ((t: ThemeChoice) => void) | null = null;

    /** Register the setter and return an identity-checked unregister. */
    export function registerThemeSetter(fn: (t: ThemeChoice) => void): () => void {
      setterRef = fn;
      return () => {
        // Phase 64 acc2 — identity check prevents StrictMode double-mount clobber.
        if (setterRef === fn) setterRef = null;
      };
    }

    /** Install window.__driveTheme — gated to test mode only. */
    export function installThemeDrivers(): void {
      if (import.meta.env.MODE !== "test") return;
      window.__driveTheme = (theme: ThemeChoice) => {
        if (setterRef) setterRef(theme);
      };
    }
    ```

    Step C — Wire `src/main.tsx`. Add at the top with the other imports:

    ```typescript
    import "geist/font/sans";
    import "geist/font/mono";
    ```

    And after the existing `install*` driver calls (search file for `install` to find the spot), add:

    ```typescript
    import { installThemeDrivers } from "./test-utils/themeDrivers";
    // ...
    installThemeDrivers();
    ```

    If main.tsx has no other `install*` calls, add the import + call near `createRoot(...)`.

    Step D — Wire `src/App.tsx`. Read App.tsx; find a sensible mount point near the existing top-level state. Add:

    ```typescript
    import { useTheme } from "@/hooks/useTheme";
    import { registerThemeSetter } from "@/test-utils/themeDrivers";
    import { useEffect } from "react";

    // Inside the App component body, near top:
    const { setTheme } = useTheme();
    useEffect(() => registerThemeSetter(setTheme), [setTheme]);
    ```

    The useEffect returns the identity-checked cleanup directly (Phase 64 acc2 pattern).

    Step E — Run the Plan 71-00 tests. Both must pass:
    - `npx vitest run tests/useTheme.test.tsx`
    - `npx vitest run tests/themeDriver.test.tsx`

    Cite as "implements D-07 useTheme + D-08 driver, StrictMode safety per CLAUDE.md item #7".
  </action>
  <verify>
    <automated>test -f src/hooks/useTheme.ts && test -f src/test-utils/themeDrivers.ts && grep -q "room-cad-theme" src/hooks/useTheme.ts && grep -q "if (setterRef === fn)" src/test-utils/themeDrivers.ts && grep -q "installThemeDrivers" src/main.tsx && grep -q "geist/font/sans" src/main.tsx && grep -q "useTheme\|registerThemeSetter" src/App.tsx && npx vitest run tests/useTheme.test.tsx tests/themeDriver.test.tsx 2>&1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - File `src/hooks/useTheme.ts` exists; exports `useTheme` (named export)
    - File `src/test-utils/themeDrivers.ts` exists; exports `registerThemeSetter` and `installThemeDrivers`
    - `grep "room-cad-theme" src/hooks/useTheme.ts` matches >= 1
    - `grep "if (setterRef === fn)" src/test-utils/themeDrivers.ts` matches exactly 1 (identity-check cleanup)
    - `grep "import.meta.env.MODE" src/test-utils/themeDrivers.ts` matches >= 1 (test-mode gate)
    - `grep "geist/font/sans" src/main.tsx` matches exactly 1
    - `grep "geist/font/mono" src/main.tsx` matches exactly 1
    - `grep "installThemeDrivers" src/main.tsx` matches >= 1
    - `grep "useTheme" src/App.tsx` matches >= 1
    - `grep "registerThemeSetter" src/App.tsx` matches >= 1
    - `npx vitest run tests/useTheme.test.tsx` exits 0 (Plan 71-00 RED → GREEN)
    - `npx vitest run tests/themeDriver.test.tsx` exits 0 (Plan 71-00 RED → GREEN)
  </acceptance_criteria>
  <done>Theme system live; Wave 0 tests GREEN; ready for sweeps in Wave 2.</done>
</task>

</tasks>

<verification>
- Tokens parse without Tailwind v4 silent rejection (`npm run build` green)
- `useTheme` and `themeDrivers` tests green (Plan 71-00 contract satisfied)
- Theme bootstrap script in `index.html` prevents boot flash
- StrictMode-safe identity-check cleanup verified in test 5 of Plan 71-00 driver tests
- No Obsidian / IBM Plex / Material Symbols / custom-class survivors in `src/index.css` or `index.html`
</verification>

<success_criteria>
- [ ] Pascal oklch tokens defined in `:root` and `.dark` blocks
- [ ] `geist` package installed; fonts imported in `main.tsx`
- [ ] Barlow loaded via Google Fonts in `index.html`
- [ ] Theme bootstrap script prevents flash-of-light-mode
- [ ] `useTheme` hook + `themeDrivers` ship; tests from Plan 71-00 are GREEN
- [ ] App.tsx wires `registerThemeSetter` with identity-check cleanup
- [ ] `npm run build` green
- [ ] All four custom Obsidian CSS classes deleted from `src/index.css`
</success_criteria>

<output>
After completion, create `.planning/phases/71-token-foundation-token-foundation/71-01-SUMMARY.md` with: tokens added, fonts swapped, hook + driver shipped, test status (Plan 71-00 RED→GREEN), what's NOT yet done (className sweeps remain in Plans 71-02..71-04).
</output>
