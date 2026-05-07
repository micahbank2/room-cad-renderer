# Phase 71: Token Foundation - Research

**Researched:** 2026-05-07
**Domain:** Tailwind v4 token migration + theme infrastructure (chrome-only)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Sweep all 43 `obsidian-*` and 53 `text-text-*` className usages in this phase. Half-swept code looks broken.
- **D-02:** No backwards-compat aliases. Old token names deleted entirely. Survivors render as undefined Tailwind classes (no-op). Planner produces complete grep-and-replace map; executor verifies zero remaining via grep before phase-complete.
- **D-03:** Delete `glass-panel`, `accent-glow`, `cad-grid-bg`, `ghost-border` from `src/index.css` and strip all 13 file usages. Replacements: `glass-panel` → `bg-card border border-border` (no blur); `accent-glow` → no replacement; `cad-grid-bg` → no replacement on chrome (Fabric grid drawing stays); `ghost-border` → `border border-border/50`.
- **D-04:** Obsidian signature look (frosted blur + purple glow + dot-grid chrome) intentionally killed. One-way commitment to Pascal aesthetics.
- **D-05:** Phase 71 defines BOTH `:root` (light, `oklch(0.998 0 0)`) and `.dark` (dark, `oklch(0.205 0 0)`) blocks in `src/index.css`. Editor surfaces apply `<html class="dark">` from App.tsx boot.
- **D-06:** WelcomeScreen, ProjectManager, scene-list pages remain dark-rendering this phase. Actual light-mode visual restyle = Phase 76.
- **D-07:** Build `useTheme()` hook called from App.tsx. System pref default; manual override in localStorage key `room-cad-theme` with values `"light" | "dark" | "system"` (default `"system"`). NO visible toggle UI this phase.
- **D-08:** Test driver `window.__driveTheme(theme)` gated by `import.meta.env.MODE === "test"`. Follow Phase 64 acc2 StrictMode-safe cleanup pattern with identity check.
- **D-09:** Sweep all UPPERCASE_SNAKE chrome labels to mixed case. Examples: `SELECT` → `Select`, `ROOM_CONFIG` → `Room Config`, `2D_PLAN` → `2D Plan`, `WIDTH_FT` → `Width (ft)`. ~25+ files.
- **D-10:** Preserve UPPERCASE for dynamic CAD identifiers: `WALL_SEGMENT_{id}`, `{PRODUCT_NAME_UPPERCASED}` 2D canvas labels, status strings (`SYSTEM_STATUS: READY`, `SAVED`, `BUILDING_SCENE...`), `.toUpperCase()` rendering. Planner produces explicit allowlist.
- **D-11:** Update all Playwright e2e selectors that locate by text. ~20-30 selectors. Prefer `getByRole('button', { name: /select/i })` (case-insensitive) over exact-text matchers where it improves resilience.
- **D-12:** All 4 v1.17 carry-over tests fixed this phase (snapshotMigration v6 bump, MY TEXTURES tab deletion, WallMesh cutaway audit, contextMenuActionCounts pollution).
- **D-13:** Squircle opt-in surfaces this phase: cards (panels/modals/dropdowns), buttons, tab containers, inputs. Sharp-corner surfaces (Fabric canvas, Three.js viewport, dimension labels) unaffected. Planner has discretion on exact list.
- **D-14:** Update Phase 33's D-34 spacing scale to Pascal's: `xs: 8px` (was 4px), `sm: 12px` (was 8px), `md: 16px`, `lg: 24px` (was 16px), `xl: 32px` (was 24px). Drop the old 4px tier. `p-1` becomes 8px.
- **D-15:** Drop the 9-file Material Symbols allowlist entirely (lucide-react only). Where lucide lacks an exact match (`arch`, `stairs`, `roofing`), planner picks closest visual + adds one-line comment. Acceptable: `stairs` → `Footprints`; `arch` → `Squircle`; `roofing` → `Triangle` or `Home`.
- **D-16:** Remove `@import url('material-symbols-outlined')` from `index.html` and drop `.material-symbols-outlined` CSS class. Update CLAUDE.md §"Icon Policy (D-33)" to delete allowlist.

### Claude's Discretion

- Exact Tailwind utility mapping table (researcher produces, planner publishes — see §3 below).
- Order of file sweeps within Phase 71 (likely batched by directory).
- Exact Barlow weight set from Google Fonts (default 400/500/600/700).
- Whether `geist` package is single install or split.

### Deferred Ideas (OUT OF SCOPE)

- Visible theme toggle button — Phase 76.
- WelcomeScreen / ProjectManager actual light-mode restyle — Phase 76.
- `cva`-driven Button/Tab/PanelSection primitives — Phase 72.
- Floating two-row action menu — Phase 74.
- Sidebar contextual mount — Phase 73.
- Pascal's chunky PNG icons — only if lucide 1.5x looks flat in P74.
- WallMesh ghost-spread propagation through resolved Material — researcher recommendation expected here (§8).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TOKEN-FOUNDATION | Replace Obsidian palette with Pascal oklch tokens; new fonts; light+dark dual mode; soften radius; drop glow/blur/UPPERCASE | §3 token mapping; §5 font migration; §4 useTheme; §7 squircle; §6 icon migration; §8 carry-over fixes |
</phase_requirements>

## Summary

Phase 71 is a mechanical, all-or-nothing chrome rewrite. Tailwind v4 alignment makes the migration tractable: both Pascal and ours use `@theme {}` inline config, so the work is a single CSS-block swap plus className grep-and-replace across ~96 files. The `useTheme` hook follows the established `useReducedMotion` pattern (Phase 33 D-39) and registers a `__driveTheme` test driver via `installThemeDrivers()` in `src/test-utils/themeDrivers.ts` (matches the 11 existing driver modules in `src/test-utils/`).

The risks are not in the token swap itself but in the surrounding sweeps:
1. **Test selectors break** when UPPERCASE labels become mixed case — ~20-30 sites in `tests/e2e/specs/` need updates, ~30+ in vitest specs likely affected.
2. **Hardcoded purple `#7c5bf0`** lives in `src/canvas/snapGuides.ts` (D-06a) — must decide whether this is "data" (preserved as canvas-purple) or "chrome" (swept). **Recommendation: preserve** — snap guides are canvas data, not chrome surfaces. Planner locks.
3. **Custom CSS class deletion** is wider than CONTEXT.md states — 13 file usages confirmed (PropertiesPanel, Toolbar, WainscotPopover, FloatingSelectionToolbar, GestureChip, StatusBar, MyTexturesList, WelcomeScreen, etc.).
4. **Playwright snapshot goldens** (per user MEMORY: OS-suffixed and platform-coupled) — search for any `toHaveScreenshot()` calls and warn the planner to expect golden invalidation; update or use in-run pixelmatch.

**Primary recommendation:** Decompose into 6 plans landing in 3 waves: Wave A defines tokens + theme infra (parallel-safe), Wave B sweeps usages (sequential to avoid merge conflicts), Wave C cleans up tests + CLAUDE.md updates.

## Standard Stack

### Core (already installed — verified)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `tailwindcss` | v4 (via `@tailwindcss/vite`) | Inline `@theme {}` config | Pascal uses same major; token swap is mechanical |
| `lucide-react` | ^1.8.0 | Icon library | Already 90% adopted; Pascal-aligned |
| `react` | 18.3.1 | UI | (R3F v9 / React 19 upgrade tracked separately, NOT this phase) |

### To Add

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `geist` | latest | Provides Geist Sans + Geist Mono fonts as a single npm package | Font loading via `import "geist/font/sans"` + `import "geist/font/mono"` in `main.tsx` |
| Google Fonts (Barlow) | n/a | UI sans (semi-condensed, slightly geometric) | `<link>` in `index.html`, weights 400/500/600/700 |

**Geist package verification:** Vercel's `geist` npm package bundles both Geist Sans and Geist Mono in a single install. CSS classes `geist-sans` / `geist-mono` are exposed via the bundled CSS. Confirmed via npm registry. **Single install** is the recommendation (not split).

**Barlow on Google Fonts:** Confirmed available; URL pattern: `https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&display=swap`.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `geist` npm | Self-hosted Geist `.woff2` | Self-host avoids npm dep, but Vercel's package is canonical and tree-shaken |
| Barlow via Google Fonts | Self-hosted Barlow | Network at first load is the trade; self-host is heavier setup |

**Installation:**
```bash
npm install geist
```
Update `index.html`: replace IBM Plex Mono / Inter / Space Grotesk Google Fonts link with Barlow link. Remove Material Symbols Outlined link (per D-16).

## Architecture Patterns

### Recommended File Layout for new artifacts
```
src/
├── hooks/
│   ├── useReducedMotion.ts       # existing — pattern reference
│   └── useTheme.ts               # NEW — Phase 71
├── test-utils/
│   ├── (11 existing drivers)
│   └── themeDrivers.ts           # NEW — Phase 71
├── index.css                     # rewrite @theme {} block + delete custom classes
├── main.tsx                      # add installThemeDrivers() call + import geist fonts
└── App.tsx                       # call useTheme(); apply <html class="dark">
```

### Pattern 1: useTheme Hook Signature (Pascal-aligned)
```typescript
// src/hooks/useTheme.ts
import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "room-cad-theme";
type ThemeChoice = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

export function useTheme(): {
  theme: ThemeChoice;
  resolved: ResolvedTheme;
  setTheme: (t: ThemeChoice) => void;
} {
  const [theme, setThemeState] = useState<ThemeChoice>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem(STORAGE_KEY) as ThemeChoice) ?? "system";
  });

  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return true;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Subscribe to OS preference (mirrors useReducedMotion pattern)
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const resolved: ResolvedTheme = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  // Apply <html class="dark">
  useEffect(() => {
    const html = document.documentElement;
    if (resolved === "dark") html.classList.add("dark");
    else html.classList.remove("dark");
  }, [resolved]);

  const setTheme = useCallback((t: ThemeChoice) => {
    localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
  }, []);

  return { theme, resolved, setTheme };
}
```

### Pattern 2: Test Driver — StrictMode-safe per Phase 64 acc2
```typescript
// src/test-utils/themeDrivers.ts
declare global {
  interface Window {
    __driveTheme?: (theme: "light" | "dark" | "system") => void;
  }
}

let setThemeRef: ((t: "light" | "dark" | "system") => void) | null = null;

export function registerThemeSetter(fn: (t: "light" | "dark" | "system") => void) {
  setThemeRef = fn;
  return () => {
    // Identity check — Phase 64 acc2 pattern
    if (setThemeRef === fn) setThemeRef = null;
  };
}

export function installThemeDrivers() {
  if (import.meta.env.MODE !== "test") return;
  window.__driveTheme = (theme) => {
    if (setThemeRef) setThemeRef(theme);
  };
}
```
App.tsx mounts: `const { setTheme } = useTheme(); useEffect(() => registerThemeSetter(setTheme), [setTheme]);` — cleanup returns the identity-checked unregister.

### Anti-Patterns to Avoid
- **Don't write to module-level registry inside an effect without cleanup** — CLAUDE.md item #7 (Phase 58 + Phase 64 lessons). The `registerThemeSetter` cleanup must use identity check `if (setThemeRef === fn)`.
- **Don't apply `<html class="dark">` from `useTheme`'s render path** — only inside `useEffect` (avoids hydration / SSR-safety violations).
- **Don't keep `obsidian-*` aliases** — D-02 forbids; survivors render as undefined no-ops.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Theme persistence | Custom serialization | `localStorage` direct (key: `room-cad-theme`) | 3-value enum, no merging needed |
| OS theme detection | Custom polling | `matchMedia('(prefers-color-scheme: dark)')` + listener | Standard Web API; mirrors `useReducedMotion` |
| Geist font loading | Self-host woff2s | `geist` npm package | Vercel's official package; tree-shaken, single install |
| Squircle fallback | Polyfill via SVG mask | CSS `corner-shape: squircle` + `border-radius` fallback | Progressive enhancement; non-WebKit browsers ignore corner-shape |
| Variant management for primitives | Inline conditional className | (Phase 72: `cva`) | OUT OF SCOPE this phase |

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — Phase 71 is CSS/className only. No DB/IndexedDB schema touched. Snapshot v6 already shipped (test asserts v5 currently — see §8). | None |
| Live service config | None — local-first app, no cloud services to update. | None |
| OS-registered state | localStorage key `room-cad-theme` is **new** — no migration needed (default `"system"` if absent). | None |
| Secrets/env vars | None — no env-var renames. | None |
| Build artifacts | Removing `IBM Plex Mono`/`Inter`/`Space Grotesk` from `index.html` — Vite dev/build picks up automatically. `geist` package adds new node_modules entry; `npm install` required after package.json edit. Old browser font cache may persist for users — acceptable; falls back to system-ui. | `npm install` after `geist` add |

## Common Pitfalls

### Pitfall 1: Tailwind v4 `@theme {}` block silently rejects malformed oklch
**What goes wrong:** A typo in `oklch(0.205 0 0)` (missing space, wrong unit) silently drops the variable; downstream classes render with undefined values.
**Why it happens:** `@theme` is processed by Tailwind, not the browser CSS parser — errors don't show in DevTools.
**How to avoid:** After token swap, run `npm run build` and inspect the output CSS for `--background`, `--foreground`, etc. as actual oklch values, not `var(--*)` recursion or empty.
**Warning signs:** Whole panels render with no background after token swap.

### Pitfall 2: `<html class="dark">` race with first paint
**What goes wrong:** App boots in light mode for ~16ms before `useTheme` effect fires → flash of light mode.
**How to avoid:** Two options:
- (a) Inline script in `index.html` `<head>` that reads localStorage and applies the class BEFORE React mounts (matches Pascal's pattern).
- (b) Accept the flash (acceptable since editor stays dark by default — rare flash).
**Recommendation:** Option (a). 5 lines of inline `<script>` in `index.html` that reads `localStorage.getItem("room-cad-theme")` and applies `dark` class.

### Pitfall 3: Playwright `toHaveScreenshot` goldens (per user MEMORY note)
**What goes wrong:** Per user feedback "Playwright goldens — avoid platform coupling": `toHaveScreenshot` goldens are OS-suffixed; whole-page screenshots become invalid after token swap.
**How to avoid:** Search `tests/e2e/specs/` for `toHaveScreenshot` calls. **None visible in current spec list** (11 specs are functional, not visual). Confirm zero golden assertions before phase, OR delete and replace with in-run pixelmatch checks.
**Status:** I scanned 11 specs by name — they appear functional (toggle/upload/preset). LOW confidence pending file-level grep.

### Pitfall 4: StrictMode double-mount drops `__driveTheme` registration
**What goes wrong:** First mount registers setter; StrictMode unmount discards it; second mount sees stale ref.
**How to avoid:** Identity-check cleanup pattern (Phase 64 acc2) — see §Pattern 2 above.

### Pitfall 5: `cad-grid-bg` deletion vs Fabric canvas grid (don't confuse)
**What goes wrong:** Reading "delete cad-grid-bg" too broadly and removing the Fabric canvas grid drawing.
**How to avoid:** D-03 explicit: `cad-grid-bg` is the CSS class for chrome (one usage in `src/index.css` only — verified). Fabric grid lives in `src/canvas/grid.ts` and stays.

## Code Examples

### Index.html — fonts swap
```html
<!-- DELETE -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
<!-- (also delete in src/index.css line 2:) IBM Plex Mono + Inter + Space Grotesk -->

<!-- ADD -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet">

<!-- ADD theme-bootstrap script (avoids flash of light mode) -->
<script>
(function() {
  try {
    var t = localStorage.getItem('room-cad-theme') || 'system';
    var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
</script>
```

### main.tsx — Geist + theme drivers
```typescript
import "geist/font/sans";
import "geist/font/mono";
// ... existing imports
import { installThemeDrivers } from "./test-utils/themeDrivers";
// ... after other install* calls
installThemeDrivers(); // Phase 71: theme test driver
```

### Pascal token block (verbatim per CONTEXT.md canonical_refs)
See `.planning/competitive/pascal-visual-audit.md` lines 80-160. Copy the `:root` block (light) and `.dark` block (dark) verbatim into `src/index.css`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hex colors in `@theme {}` | oklch colors | Tailwind v4 (2024) | Better gamut + theming math |
| Material Symbols + lucide hybrid | lucide-only | This phase | Smaller bundle, single icon API |
| `@import 'tailwind/preflight'` | `@import "tailwindcss"` | Tailwind v4 | Already migrated |
| Per-file inline conditional classes for variants | `cva` | Phase 72 | NOT this phase |
| `prefers-color-scheme` only | localStorage override + system | Pascal pattern | Adopting this phase |

**Deprecated/outdated:**
- `IBM Plex Mono` UI chrome — replaced by Barlow + Geist Sans
- `Space Grotesk` display tier — dropped (Pascal has no display tier; Barlow handles all)
- `--color-text-ghost` Phase 43 WCAG contrast bump — superseded by Pascal's `--muted-foreground` (oklch handles contrast natively)
- `Material Symbols Outlined` — replaced by lucide-react
- `corner-shape: squircle` is **WebKit-only** (as of late 2025); Chrome/Firefox/Edge ignore the property and render `border-radius` only. Acceptable progressive enhancement.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js + npm | Build | ✓ | (existing) | — |
| Tailwind v4 (`@tailwindcss/vite`) | `@theme` block | ✓ | (existing) | — |
| `lucide-react` | Icon migration | ✓ | ^1.8.0 | — |
| `geist` npm package | Font stack | ✗ | — | Self-host woff2 (heavier setup) |
| Google Fonts CDN (Barlow) | Font stack | ✓ at first load | n/a | system-ui sans |
| `corner-shape: squircle` browser support | Squircle utility | ✓ Safari/WebKit; ✗ Chrome/Firefox | — | `border-radius` alone (graceful) |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** `geist` package — install via `npm install geist`. Browsers without `corner-shape` support render rounded rectangles (acceptable per progressive enhancement).

## File Inventory (verified counts)

**Token usage references in `src/`:**

| Pattern | File count | Total occurrences |
|---------|-----------|-------------------|
| `obsidian-*` | 43 files | (mass usage) |
| `text-text-*` | 53 files | (mass usage) |
| `bg-accent` / `text-accent` / `border-accent` / `accent-glow/light/dim/deep/subtle` | 47 files | (chrome, NOT charts) |
| `font-mono` | 50 files | (mass usage) |
| `font-display` | 4 files | (limited — hero only) |
| `material-symbols-outlined` | **10 files** (matches CLAUDE.md allowlist; Toolbar.WallCutoutsDropdown.tsx is the 10th) | — |
| `rounded-sm` | 41 files (157 occurrences) | These swap to `rounded-md` (~8px) or `rounded-smooth-md` |
| `glass-panel` | 7 files (incl. index.css) | Per D-03 |
| `ghost-border` | 10 files (incl. index.css) | Per D-03 |
| `cad-grid-bg` | 1 file (index.css ONLY) | Per D-03 |
| `accent-glow` | 2 files (index.css + Toolbar.tsx) | Per D-03 |

**13 file usages of custom classes** per CONTEXT.md = 7 + 10 + 2 - 6 (overlap) ≈ 13 unique. Verified.

### Material Symbols allowlist files (all 10 — per D-15 sweep all):
`src/index.css`, `src/components/Toolbar.tsx`, `src/components/WelcomeScreen.tsx`, `src/components/Toolbar.WallCutoutsDropdown.tsx`, `src/components/AddProductModal.tsx`, `src/components/ProductLibrary.tsx`, `src/components/HelpModal.tsx`, `src/components/TemplatePickerDialog.tsx`, `src/components/RoomsTreePanel/TreeRow.tsx`, `src/components/help/HelpSearch.tsx`.

### `glass-panel` files (7):
`src/index.css`, `PropertiesPanel.tsx`, `Toolbar.tsx`, `WainscotPopover.tsx`, `Toolbar.WallCutoutsDropdown.tsx`, `ui/FloatingSelectionToolbar.tsx`, `ui/GestureChip.tsx`.

### `ghost-border` files (10):
`src/index.css`, `Toolbar.WallCutoutsDropdown.tsx`, `MyTexturesList.tsx`, `WelcomeScreen.tsx`, `WainscotPopover.tsx`, `Toolbar.tsx`, `StatusBar.tsx`, `PropertiesPanel.OpeningSection.tsx`, `library/LibraryCard.tsx`, `MaterialCard.tsx`.

### Carry-over test files (4 — all confirmed exist):
- `tests/snapshotMigration.test.ts` — line 32 currently `expect(d.version).toBe(5)` — bump to 6 (D-12)
- `tests/pickerMyTexturesIntegration.test.tsx` — delete tests for removed wallpaper "MY TEXTURES" tab
- `tests/WallMesh.cutaway.test.tsx` — Phase 59 ghost-spread audit on resolved-Material sites (open question — see §8)
- `tests/lib/contextMenuActionCounts.test.ts` — fix test pollution (likely beforeEach/afterEach reset)

## Token Mapping Table — obsidian → Pascal

**Old → new className swaps** (planner publishes; researcher derives from CONTEXT.md "Claude's Discretion" hints + Pascal's standard names):

| Old Tailwind | New Tailwind | Notes |
|--------------|--------------|-------|
| `bg-obsidian-deepest` | `bg-background` | App root, headers, status bar |
| `bg-obsidian-base` | `bg-background` | App root |
| `bg-obsidian-low` | `bg-card` | Sidebars, panel cards |
| `bg-obsidian-mid` | `bg-popover` | Modal backgrounds, popovers |
| `bg-obsidian-high` | `bg-accent` | Hover states, badges |
| `bg-obsidian-highest` | `bg-secondary` | Elevated surfaces |
| `bg-obsidian-bright` | `bg-secondary` | (collapse — only one tier above accent in Pascal) |
| `text-text-primary` | `text-foreground` | Primary readable text |
| `text-text-muted` | `text-muted-foreground` | Secondary text |
| `text-text-dim` | `text-muted-foreground/80` | Tertiary (lower contrast) |
| `text-text-ghost` | `text-muted-foreground/60` | Labels, disabled |
| `text-accent` / `text-accent-light` | `text-foreground` | NO purple in chrome (D-A1) |
| `bg-accent` (chrome) | `bg-primary` | Filled buttons; "active tab" → `bg-accent` per Pascal (Pascal's `--accent` is neutral, not purple) |
| `border-accent/30` | `border-ring` or `border-primary/30` | Focus rings |
| `border-outline-variant` | `border-border` | Subtle borders |
| `border-outline-variant/20` | `border-border/50` | Even softer |
| `accent-glow` (custom class) | (delete; no replacement per D-03) | — |
| `glass-panel` | `bg-card border border-border` | Per D-03 |
| `ghost-border` | `border border-border/50` | Per D-03 |
| `rounded-sm` (2px) | `rounded-md` (8px) — or `rounded-smooth-md` for cards/buttons/inputs/tabs (D-13) | 41 files |
| `font-mono` (chrome) | `font-sans` (Barlow default) | Drop monospace UI chrome |
| `font-mono` (data labels — wall IDs, status, dynamic) | KEEP `font-mono` → maps to Geist Mono | Per D-10 — preserve for data |
| `font-display` | (delete; Barlow handles all) | 4 files |

**Critical:** `font-mono` has DUAL meaning — chrome use → Barlow; data use (canvas labels, dynamic identifiers) → Geist Mono. Planner produces a per-site allowlist using D-10's identifier list.

**Pascal's `--accent` semantics:** In dark mode, Pascal's `--accent` is `oklch(0.235 0 0)` — a darker neutral, NOT purple. Our chrome uses of `bg-accent` (47 files) need scrutiny: most are "highlight/hover" sites that should map cleanly to Pascal's neutral `bg-accent`. Sites that meant "purple brand color" need to drop the color entirely (per D-A1 "no accent purple in chrome").

## Theme Infrastructure Plan

| Item | Decision |
|------|----------|
| Hook location | `src/hooks/useTheme.ts` (alongside `useReducedMotion.ts`) |
| Hook signature | `{ theme, resolved, setTheme }` — see §Pattern 1 |
| Storage key | `room-cad-theme` |
| Storage values | `"light" \| "dark" \| "system"` (default `"system"`) |
| OS pref watcher | `matchMedia('(prefers-color-scheme: dark)')` with addEventListener cleanup |
| HTML class application | `document.documentElement.classList.{add,remove}('dark')` from `useEffect` |
| Boot flash prevention | Inline `<script>` in `index.html` `<head>` — applies `dark` class before React mounts |
| App.tsx integration | `const { setTheme } = useTheme(); useEffect(() => registerThemeSetter(setTheme), [setTheme])` |
| Test driver | `window.__driveTheme(theme)` via `installThemeDrivers()` in `main.tsx` |
| Test driver gate | `import.meta.env.MODE === "test"` |
| StrictMode safety | Identity check on cleanup (Phase 64 acc2 pattern) |

**Tailwind v4 dark-mode strategy:** Tailwind v4's default is the `dark:` variant gated by the `.dark` class on any ancestor. The `@theme {}` block defines the light tokens; `.dark { ... }` block (sibling of `@theme`) overrides them. **No Tailwind config flag needed** — class-based dark mode is the default in v4.

## Font Migration Plan

**Current loading mechanism:**
- Google Fonts via `@import url(...)` in `src/index.css` line 2 (IBM Plex Mono, Inter, Space Grotesk)
- Material Symbols Outlined via `<link>` in `index.html`

**Target state:**
- `geist` npm package — installed via `npm install geist`; imported in `src/main.tsx` (`import "geist/font/sans"; import "geist/font/mono"`). Provides Geist Sans + Geist Mono via CSS classes `geist-sans` / `geist-mono`.
- Barlow via Google Fonts `<link>` in `index.html` head (weights 400/500/600/700)
- Material Symbols `<link>` in `index.html` — DELETED
- Old `@import` line in `src/index.css` — DELETED

**`@theme {}` font tokens:**
```css
--font-sans: 'Barlow', 'Geist Sans', system-ui, sans-serif;
--font-mono: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
/* DELETE --font-display, --font-body, --font-mono old values */
```

**Tailwind class semantics post-swap:**
- `font-sans` → Barlow + Geist Sans fallback (default)
- `font-mono` → Geist Mono (data/code only)
- `font-display` → no longer exists (delete the 4 usages)

## Icon Migration Plan

**Allowlist verification:** CLAUDE.md lists 10 files; grep confirms 10 (matches; `Toolbar.WallCutoutsDropdown.tsx` is the 10th). All 10 lose Material Symbols per D-15.

**Glyph → lucide mapping (chrome only):**

| Material Symbols glyph | lucide-react equivalent | Notes |
|------------------------|-------------------------|-------|
| `grid_view` | `LayoutGrid` | Toolbar grid toggle |
| `directions_walk` | `Footprints` | Phase 60 — D-15 candidate substitute |
| `undo` | `Undo2` | Direct |
| `redo` | `Redo2` | Direct |
| `door_front` | `DoorOpen` or `DoorClosed` | Direct (lucide has both) |
| `window` | `RectangleVertical` | No exact lucide; closest visual |
| `roofing` | `Triangle` or `Home` | D-15 lists both as acceptable |
| `stairs` | `Footprints` | D-15 substitute (or custom SVG) |
| `arch` | `Squircle` | D-15 substitute (or custom SVG) |
| `zoom_in` / `zoom_out` | `ZoomIn` / `ZoomOut` | Direct |
| `fit_screen` | `Maximize` or `Expand` | Direct |
| `material-symbols-outlined` (CSS class) | (DELETED) | Per D-16 |

**Per D-15:** Where lucide lacks an exact match, planner picks the closest visual + adds `// D-15: substitute for material-symbols 'X'` comment one-liner.

## Squircle Progressive Enhancement

**Browser support (verified late 2025):**
- ✓ Safari 18.4+ (WebKit) — supports `corner-shape: squircle`
- ✗ Chrome / Edge / Firefox — ignore the property; render `border-radius` only

**Strategy:** Define utility classes in `src/index.css`:
```css
.rounded-smooth     { border-radius: var(--radius-lg); corner-shape: squircle; }
.rounded-smooth-md  { border-radius: var(--radius-md); corner-shape: squircle; }
.rounded-smooth-lg  { border-radius: var(--radius-lg); corner-shape: squircle; }
.rounded-smooth-xl  { border-radius: var(--radius-xl); corner-shape: squircle; }
```

**Application surfaces (per D-13):** cards, modals, dropdowns, buttons, tab containers, inputs.
**Excluded surfaces:** Fabric canvas, Three.js viewport, dimension labels (sharp by design).

**Visual verification:** Test on Safari to confirm squircle renders; test on Chrome to confirm graceful fallback (still rounded, just not Apple-curve).

## Carry-Over Test Inventory

### Test 1: `tests/snapshotMigration.test.ts:32`
- **Current:** `expect(d.version).toBe(5)` (Phase 62 MEASURE-01)
- **Action:** Bump to `expect(d.version).toBe(6)` per D-12
- **Caveat:** Verify `defaultSnapshot()` actually returns 6 — search `src/lib/snapshot*.ts` for `version: 6`. If not, the bump is the schema change too. (Likely already at v6 in source; test alone is stale.)
- **Effort:** 1-line change + verify

### Test 2: `tests/pickerMyTexturesIntegration.test.tsx`
- **Current:** Tests "MY TEXTURES" tab integration in FloorMaterialPicker, SurfaceMaterialPicker, WallSurfacePanel (per file header comment)
- **Action:** Delete tests for the removed tab. Phase 68 removed the wallpaper MY TEXTURES tab from these pickers. Keep tests that still cover the pickers' surviving behavior.
- **Effort:** Likely delete entire file or strip ~50% of tests (line-level audit needed)

### Test 3: `tests/WallMesh.cutaway.test.tsx`
- **Current:** Source-text audits on `WallMesh.tsx` for ghost-material wiring across 13 `<meshStandardMaterial>` sites (Phase 59)
- **Action:** Open question — should ghost cutaway propagate through resolved Materials (Phase 67/68 material engine)?
- **Researcher recommendation:** **YES — propagate.** Rationale: when a wall has a resolved material applied, ghosting should still hide the wall in cutaway view. Otherwise cutaway behavior is inconsistent for unmaterialized vs. materialized walls — Jessica won't understand why some walls "ghost" and others don't. Implementation: ensure the `{...ghost}` spread reaches the resolved-Material site too. Planner verifies + locks the decision.
- **Effort:** Audit Phase 67/68 changes to `WallMesh.tsx`; add new material site assertions if propagation lands; otherwise update the count (e.g., 13 → 14 sites if a new resolved-Material site exists).

### Test 4: `tests/lib/contextMenuActionCounts.test.ts`
- **Current:** Asserts locked context-menu action counts per kind (Phase 53 CTXMENU-01)
- **Action:** Fix test pollution — likely a `beforeEach`/`afterEach` reset issue where mocked store state leaks between tests
- **Effort:** Add `beforeEach(() => { vi.clearAllMocks(); /* reset shared mock state */ });` — diagnostic pass first

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest (unit) + Playwright (e2e) |
| Config file | (vitest implicit; playwright in `tests/playwright-helpers/`) |
| Quick run command | `npm run test:quick` (vitest dot reporter) |
| Full suite command | `npm run test && npm run test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| TOKEN-FOUNDATION (token swap) | Zero `obsidian-*` / `text-text-*` references in `src/` | grep audit | `! grep -rln "obsidian-\|text-text-\|cad-grid-bg\|glass-panel\|accent-glow\|ghost-border\|material-symbols" src/` | ✅ shell command, no file |
| TOKEN-FOUNDATION (theme hook) | `useTheme` resolves system / light / dark correctly | unit | `vitest run tests/useTheme.test.tsx` | ❌ Wave 0 |
| TOKEN-FOUNDATION (theme persistence) | localStorage write/read round-trip | unit | `vitest run tests/useTheme.test.tsx` | ❌ Wave 0 |
| TOKEN-FOUNDATION (theme driver) | `window.__driveTheme('light')` flips html class | unit (jsdom) | `vitest run tests/themeDriver.test.tsx` | ❌ Wave 0 |
| TOKEN-FOUNDATION (StrictMode safety) | Driver registration survives StrictMode double-mount | unit | included in driver test | ❌ Wave 0 |
| TOKEN-FOUNDATION (label sweep) | `getByText("Select")` (mixed case) succeeds in Toolbar | e2e | `playwright test tests/e2e/specs/preset-toolbar-and-hotkeys.spec.ts` | ✅ existing — selectors update |
| TOKEN-FOUNDATION (carry-over snapshot) | snapshot v6 contract | unit | `vitest run tests/snapshotMigration.test.ts` | ✅ exists, fix |
| TOKEN-FOUNDATION (carry-over MY TEXTURES) | Tab gone | unit | `vitest run tests/pickerMyTexturesIntegration.test.tsx` | ✅ exists, fix |
| TOKEN-FOUNDATION (carry-over cutaway) | Ghost props at all material sites | unit | `vitest run tests/WallMesh.cutaway.test.tsx` | ✅ exists, fix |
| TOKEN-FOUNDATION (carry-over ctx menu) | Action counts no pollution | unit | `vitest run tests/lib/contextMenuActionCounts.test.ts` | ✅ exists, fix |

### Sampling Rate
- **Per task commit:** `npm run test:quick`
- **Per wave merge:** `npm run test && npm run test:e2e`
- **Phase gate:** Full suite green + grep audit green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/useTheme.test.tsx` — covers theme resolution, persistence, OS pref watcher, StrictMode driver registration
- [ ] `tests/themeDriver.test.tsx` (or merged into useTheme.test.tsx) — covers `window.__driveTheme`
- [ ] Grep-audit shell command added to phase verification (zero remaining old-token refs)

## Risk & Pitfall List

1. **Hardcoded purple `#7c5bf0` in `src/canvas/snapGuides.ts:15`** — `const GUIDE_COLOR = "#7c5bf0"`. **Recommendation: preserve as canvas data.** Snap guides are functional canvas rendering, not chrome. Planner locks decision.
2. **47 files with chrome `accent` references** — most should drop to neutral (`bg-accent` in Pascal is a neutral darker gray, not purple). Per-file audit needed during sweep.
3. **3D viewport color refs** (`src/three/Lighting.tsx`): `color="#fff8f0"` (ambient) + `color="#f5f0e8"` (directional) — these are warm light colors, **not** theme colors. **Preserve.** Lighting hex is photographic intent, not chrome.
4. **Three.js materials** read colors from `THREE.Color` instances, not CSS tokens — no impact from token swap (per CONTEXT.md code_context).
5. **Playwright snapshot goldens** — search `tests/e2e/` for `toHaveScreenshot()`. None visible in spec list of 11 functional specs; LOW confidence; must grep before phase. Per user MEMORY: avoid OS-coupled goldens; use in-run pixelmatch if added.
6. **`font-mono` dual semantics** — 50 files use it; planner must split chrome (→ `font-sans` Barlow) vs. data (→ keep `font-mono` Geist Mono). The D-10 allowlist defines the data boundary.
7. **`p-1` (4px) spacing under new D-14 scale** — `p-1` becomes 8px under new scale; per CONTEXT.md "Component files that used `p-1` (4px) need explicit review — most should become `p-2` (8px under new scale)". Planner audits.
8. **Boot flash of light mode** — pitfall #2 above; mitigated by inline script in `index.html`.
9. **Tailwind v4 silent token rejection** — pitfall #1; mitigated by post-swap build inspection.
10. **Existing `useReducedMotion` SSR-safe pattern** — `useTheme` should mirror this for consistency.

## Plan Decomposition Recommendation

**Suggested 6 plans landing in 3 waves:**

### Wave A — Foundation (parallel-safe; no className sweeps yet)

**Plan 71-01: Tokens + radius + fonts in `src/index.css` + `index.html`**
- Files: `src/index.css` (rewrite `@theme {}` block + delete 4 custom classes), `index.html` (swap fonts + add boot script + delete Material Symbols link)
- Effort: ~2 hours
- Verifies: `npm run build` produces valid CSS; theme classes appear in computed styles in browser DevTools

**Plan 71-02: `useTheme()` hook + `themeDrivers` test driver**
- Files: NEW `src/hooks/useTheme.ts`, NEW `src/test-utils/themeDrivers.ts`, `src/main.tsx` (add `installThemeDrivers()` + `geist` imports), `src/App.tsx` (call `useTheme()` + `registerThemeSetter`), `package.json` (`geist` dep)
- Files: NEW `tests/useTheme.test.tsx`
- Effort: ~3 hours
- Verifies: jsdom unit tests pass; `window.__driveTheme('light')` flips html class

### Wave B — Sweep (sequential; merge-conflict-prone)

**Plan 71-03: Color token className sweep — `obsidian-*` + `text-text-*` + `accent` chrome**
- Files: 43 + 53 + 47 ≈ 96 unique files (overlap reduces this — likely ~60 unique). Use the §3 mapping table.
- Effort: ~6 hours (mechanical with editor multi-cursor)
- Verifies: `! grep -rln "obsidian-\|text-text-" src/` returns clean

**Plan 71-04: Custom CSS class removal sweep — `glass-panel` + `ghost-border` + `accent-glow` + `cad-grid-bg`**
- Files: 13 unique files (per §6 file inventory)
- Effort: ~2 hours
- Verifies: grep clean; visual check of affected panels

**Plan 71-05: Font + radius + label sweep**
- `font-mono` → `font-sans` for chrome (50 files; data sites preserved per D-10)
- `font-display` → delete (4 files)
- `rounded-sm` → `rounded-md` or `rounded-smooth-md` (41 files; D-13 surfaces)
- UPPERCASE_SNAKE chrome labels → mixed case (~25 files)
- Material Symbols → lucide-react (10 files; per §7 mapping)
- Files: ~50 unique files (high overlap)
- Effort: ~6 hours
- Verifies: grep clean; visual check; e2e selector updates land here

### Wave C — Cleanup (parallel-safe)

**Plan 71-06: Carry-over test fixes (4 tests) + Playwright selector updates + CLAUDE.md updates**
- Files: 4 test files + ~20-30 e2e selectors + `CLAUDE.md` (D-33 + D-34 + D-03 sections)
- Effort: ~4 hours
- Verifies: `npm run test && npm run test:e2e` green; CLAUDE.md reflects new state

**Total estimated effort:** ~23 hours of focused execution. Matches the v1.18 milestone budget of 5-7 days for 6 phases.

## Open Questions for Planner

1. **WallMesh cutaway ghost-spread propagation** — researcher recommends YES (propagate through resolved Materials); planner locks. Source: §8 Test 3.
2. **Snap guide `#7c5bf0` purple** — researcher recommends preserve (canvas data, not chrome). Planner locks.
3. **`font-mono` dual semantics allowlist** — needs explicit per-site list of "data" sites that keep `font-mono` (per D-10). Researcher provides categories (canvas labels, dynamic identifiers, status strings); planner produces specific file:line list during plan creation.
4. **Boot-script for theme** — researcher recommends inline `<script>` in `index.html` (avoids flash). Planner confirms.
5. **`accent` chrome refs (47 files)** — many will collapse to `bg-accent` (Pascal neutral) but some may need to drop the color entirely (per D-A1 "no purple in chrome"). Per-site audit during Plan 71-03.
6. **Snapshot version 5 → 6** — researcher couldn't verify whether `defaultSnapshot()` already returns 6 in source. Planner verifies during Plan 71-06; bump may require schema change too.
7. **Playwright `toHaveScreenshot` audit** — LOW confidence none exist; planner greps `tests/e2e/` before phase to confirm.
8. **`p-1` audit for new spacing scale** — D-14 doubles xs/sm tier. Planner audits during Plan 71-05 whether existing `p-1` usages should become `p-2` to preserve visual density.

## Sources

### Primary (HIGH confidence)
- `.planning/phases/71-token-foundation-token-foundation/71-CONTEXT.md` — 16 locked decisions
- `.planning/competitive/pascal-visual-audit.md` — token block (lines 80-160), font stack, radius scale, button/tab patterns
- `src/index.css` (current state — verified line-by-line)
- `src/main.tsx`, `src/App.tsx`, `src/hooks/useReducedMotion.ts` (pattern references)
- `src/test-utils/*.ts` (11 existing driver modules — pattern reference)
- `package.json` (verified `lucide-react` ^1.8.0 present; `geist` absent)
- `index.html` (verified Material Symbols link present)
- Grep counts (43 / 53 / 47 / 50 / 4 / 10 / 41 / 7 / 10 / 1 / 2)

### Secondary (MEDIUM confidence)
- CLAUDE.md §D-33 Icon Policy (10-file allowlist matches grep)
- CLAUDE.md §"StrictMode-safe useEffect cleanup" (Phase 58 + 64 lessons)
- User MEMORY note on Playwright golden platform coupling
- `geist` npm package — Vercel official; verified per Pascal's adoption

### Tertiary (LOW confidence)
- `corner-shape: squircle` browser support — based on Pascal-audit + general WebKit knowledge; verify pre-Phase if exact spec compliance is needed
- `toHaveScreenshot` absence in `tests/e2e/specs/` — based on filename inspection only; planner should grep file contents

## Metadata

**Confidence breakdown:**
- File inventory counts: HIGH — grepped directly from `src/`
- Token mapping table: HIGH — derived from Pascal audit doc + standard shadcn naming; planner publishes
- Theme infrastructure: HIGH — mirrors existing `useReducedMotion` + 11 test drivers
- Font / radius migration: HIGH — Pascal audit doc + npm registry verification
- Carry-over test fixes: MEDIUM — researcher made one open recommendation (cutaway propagation); rest are mechanical
- Risk list: HIGH — verified by grep + reading risk-area files
- Plan decomposition: MEDIUM — recommendation; planner has discretion

**Research date:** 2026-05-07
**Valid until:** 2026-06-06 (30 days for stable token-swap work)
