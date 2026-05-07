# Phase 71: Token Foundation - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the Obsidian CAD palette with Pascal's oklch token system at the CSS-token level. Swap fonts (Barlow + Geist Sans + Geist Mono), soften the radius scale to 10px squircle, and ship light + dark dual-mode plumbing. **ZERO behavior change** — Zustand stores, snapshot v6, hotkeys, test drivers, snap engine, dimension editor, auto-save all continue unchanged.

### In scope (this phase)

- `src/index.css` `@theme {}` block: full 16-token oklch palette (`:root` light + `.dark` dark) per pascal-visual-audit.md, plus radius scale + font stack
- `index.html`: replace IBM Plex Mono / Inter / Space Grotesk Google Fonts link with Barlow weights + drop Plex
- `package.json`: add `geist` package (provides Geist Sans + Geist Mono)
- `useTheme()` hook (new file): `prefers-color-scheme` detection + localStorage manual override + applies `.dark` class on `<html>`
- Sweep all **43 files** using `obsidian-*` className references → Pascal token names
- Sweep all **53 files** using `text-text-*` className references → Pascal foreground tokens
- Remove the **4 custom CSS classes** (`glass-panel`, `accent-glow`, `cad-grid-bg`, `ghost-border`) and strip all **13 file usages**
- Replace all **9 files** still using `material-symbols-outlined` icons with lucide-react equivalents (drop the D-33 allowlist)
- Sweep UPPERCASE_SNAKE chrome labels → mixed case (~25+ files); preserve dynamic CAD identifiers (`WALL_SEGMENT_{id}`, status strings)
- Update affected Playwright/test selectors to match new mixed-case labels (~20-30 selectors estimated)
- Update CLAUDE.md Phase 33 §D-33 (icon policy) and §D-34 (spacing scale) to reflect new state
- Fix the 4 v1.17 carry-over tests (snapshotMigration v6, removed MY TEXTURES tab, WallMesh cutaway ghost-spread, contextMenuActionCounts pollution)

### Out of scope (deferred to later v1.18 phases)

- Component primitives via `cva` (Button / Tab / PanelSection / etc.) — Phase 72
- Sidebar restyle + contextual mount — Phase 73
- Floating two-row action menu / toolbar replacement — Phase 74
- Properties + library panel rework — Phase 75
- WelcomeScreen / ProjectManager **actual** light-mode restyle (visual flip) — Phase 76
- Theme toggle UI button — Phase 76
- Marketing / scene-list pages light surface implementation — Phase 76

</domain>

<decisions>
## Implementation Decisions

### Token Migration Scope

- **D-01:** Sweep all 43 `obsidian-*` and 53 `text-text-*` className usages **in this phase**. *Rationale:* half-swept code (some panels Pascal-gray, others Obsidian-blue) looks broken — worse than doing it all at once. Confirmed user choice.
- **D-02:** No backwards-compat aliases. Old `obsidian-*` and `text-text-*` token names are deleted entirely. Any reference that survives the sweep will render as an undefined Tailwind class (no-op). The planner must produce a complete grep-and-replace mapping table; the executor verifies zero remaining references via grep before phase-complete.

### Custom CSS Class Removal

- **D-03:** Delete `glass-panel`, `accent-glow`, `cad-grid-bg`, `ghost-border` from `src/index.css` and strip all 13 file usages. Replacements:
  - `glass-panel` → flat `bg-card border border-border` (no `backdrop-filter: blur`)
  - `accent-glow` → no replacement (no glow on active states; rely on `bg-primary` color contrast)
  - `cad-grid-bg` → no replacement on chrome surfaces (FabricCanvas grid drawing is data, not chrome — that stays)
  - `ghost-border` → `border border-border/50`
- **D-04:** The Obsidian signature look (frosted blur + purple glow + dot-grid chrome) is intentionally killed. One-way commitment to Pascal aesthetics.

### Light + Dark Mode Plumbing

- **D-05:** Phase 71 defines BOTH `:root` (light, Pascal `oklch(0.998 0 0)` background) and `.dark` (dark, Pascal `oklch(0.205 0 0)` background) blocks in `src/index.css`. Editor surfaces apply `<html class="dark">` from App.tsx boot.
- **D-06:** WelcomeScreen, ProjectManager, scene-list pages remain dark-rendering in this phase. Their actual light-mode visual restyle is **Phase 76** work. Phase 71 only ensures the CSS infrastructure is in place so Phase 76 can flip them by adjusting the `dark` class on those routes.

### useTheme Hook Delivery

- **D-07:** Build `useTheme()` and call it from App.tsx to apply `<html class="dark">`. System preference (`prefers-color-scheme: dark`) is the default; user's manual override persists in localStorage under key `room-cad-theme` with values `"light" | "dark" | "system"` (default `"system"`). **No visible toggle UI in this phase** — toggle button lands in Phase 76 alongside StatusBar / Settings rework.
- **D-08:** Test driver `window.__driveTheme(theme: "light" | "dark" | "system")` (gated by `import.meta.env.MODE === "test"`) is exposed for Playwright tests to programmatically flip themes. Matches the Phase 31 test-driver pattern. Lets Phase 76 test the actual light-surface flip without the toggle UI existing yet. Must follow the Phase 64 acc2 StrictMode-safe cleanup pattern (identity check before clearing registry).

### Label Sweep

- **D-09:** Sweep all UPPERCASE_SNAKE chrome labels to mixed case in this phase. Examples: `SELECT` → `Select`, `WALL` → `Wall`, `ROOM_CONFIG` → `Room Config`, `SYSTEM_STATS` → `System Stats`, `LIBRARY` → `Library`, `SNAP` → `Snap`, `LENGTH` → `Length`, `THICKNESS` → `Thickness`, `2D_PLAN` → `2D Plan`, `3D_VIEW` → `3D View`, `WIDTH_FT` → `Width (ft)`, `MATERIAL_FINISH` → `Material Finish`. ~25+ component files.
- **D-10:** **Preserve UPPERCASE for dynamic CAD identifiers**: `WALL_SEGMENT_{id}`, `{PRODUCT_NAME_UPPERCASED}` rendering in 2D canvas labels, status strings like `SYSTEM_STATUS: READY` / `SAVED` / `BUILDING_SCENE...`, custom-element labels rendered via `.toUpperCase()`. These are data, not chrome. The planner must produce an explicit allowlist of preservation sites.
- **D-11:** Update all Playwright e2e test selectors that locate by text in the same phase. ~20-30 selectors across `tests/e2e/*.spec.ts` and component tests. Where it improves resilience, prefer `getByRole('button', { name: /select/i })` (case-insensitive regex) over exact-text matchers.

### Carry-Over Tests (per D-A9)

- **D-12:** All 4 v1.17 carry-over tests fixed in this phase:
  - `tests/snapshotMigration.test.ts:32` — bump assertion to version 6
  - `tests/pickerMyTexturesIntegration.test.tsx` — delete tests for the removed wallpaper "MY TEXTURES" tab
  - `tests/WallMesh.cutaway.test.tsx` — Phase 59 ghost-spread audit on the new resolved-Material sites; **open research question**: should ghost cutaway propagate through resolved Materials? Researcher recommends; planner locks the decision.
  - `tests/lib/contextMenuActionCounts.test.ts` — fix test pollution (likely a beforeEach/afterEach reset issue)

### Squircle Opt-In Scope

- **D-13:** Apply `corner-shape: squircle` via `.rounded-smooth` / `.rounded-smooth-md` / `.rounded-smooth-lg` / `.rounded-smooth-xl` utility classes (progressive enhancement — Safari/WebKit only at writing). Default opt-in surfaces in this phase: cards (panels, modals, dropdowns), buttons, tab containers, inputs. Sharp-corner surfaces (Fabric canvas, Three.js viewport, dimension labels) are not affected. Planner has discretion on the exact list per matched Pascal patterns.

### Spacing Scale (D-34 update)

- **D-14:** Update Phase 33's D-34 canonical spacing scale to Pascal's:
  - `--spacing-xs: 8px` (was 4px)
  - `--spacing-sm: 12px` (was 8px)
  - `--spacing-md: 16px` (was — not formerly defined; was 16px ad-hoc)
  - `--spacing-lg: 24px` (was 16px)
  - `--spacing-xl: 32px` (was 24px)
  - Drop the old 4px tier (rarely used; `p-1` becomes 8px under new scale)
- The CLAUDE.md §"Canonical Spacing + Radius (D-34)" table updates to reflect the new values. Component files that used `p-1` (4px) need explicit review — most should become `p-2` (8px under new scale).

### Icon Policy (D-33 update)

- **D-15:** Drop the 9-file Material Symbols allowlist entirely (lucide-react only):
  - Replace `material-symbols-outlined` glyphs in `Toolbar.tsx`, `Toolbar.WallCutoutsDropdown.tsx`, `WelcomeScreen.tsx`, `TemplatePickerDialog.tsx`, `HelpModal.tsx`, `AddProductModal.tsx`, `HelpSearch.tsx`, `ProductLibrary.tsx`, `RoomsTreePanel/TreeRow.tsx` with closest lucide-react icons.
  - Where lucide lacks an exact match (`arch`, `stairs`, `roofing`, the CAD-specific glyphs), planner picks the closest visual + adds a one-line comment marking the substitution. Acceptable substitutes: `stairs` → `lucide-react Footprints` or custom SVG; `arch` → `lucide-react Squircle` or custom SVG; `roofing` → `lucide-react Triangle` or `Home`.
- **D-16:** Remove `@import url('material-symbols-outlined')` from `src/index.css` (if present) and drop the `.material-symbols-outlined` CSS class. Update CLAUDE.md §"Icon Policy (D-33)" to delete the 10-file allowlist and state "lucide-react only across the chrome."

### Claude's Discretion

- Exact Tailwind utility mapping table from old token names to new (e.g., `bg-obsidian-deepest` → `bg-background`, `bg-obsidian-low` → `bg-card`, `bg-obsidian-mid` → `bg-popover`, `text-text-primary` → `text-foreground`, `text-text-muted` → `text-muted-foreground`, `text-text-dim` → `text-muted-foreground/80`, `border-outline-variant` → `border-border`) — researcher produces, planner publishes
- Order of file sweeps within Phase 71 (likely batched by directory: `components/ui/*` → `components/*` → `canvas/*` → `three/*`)
- Exact Barlow weight set to load from Google Fonts (planner checks Pascal source; default 400 / 500 / 600 / 700)
- Whether to install `geist` as a single package (provides Geist Sans + Geist Mono together) or split installs

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Primary design contract

- `.planning/competitive/pascal-visual-audit.md` — Source of truth for the 16 oklch tokens (light + dark blocks), radius scale, font stack, button/tab primitive snippets. Sections to copy verbatim: `:root` (light mode) and `.dark` (dark mode).

### Roadmap and requirements

- `.planning/ROADMAP.md` §"Phase 71: Token Foundation (TOKEN-FOUNDATION)" — Goal + 5 success criteria
- `.planning/REQUIREMENTS.md` §"Token Foundation" — Verifiable + Acceptance criteria
- `.planning/STATE.md` §Decisions D-A1..D-A9 — Audit-locked + user-confirmed decisions for v1.18

### Files Phase 71 modifies (read-first targets for planner)

- `src/index.css` — Current `@theme {}` block, custom classes to delete
- `index.html` — Current Google Fonts link to replace
- `src/App.tsx` — Where `useTheme()` will be called and `dark` class applied
- `package.json` — Where `geist` dependency is added
- `CLAUDE.md` §"Design System (Phase 33 — v1.7.5)" — D-33 icon policy + D-34 spacing scale (both updated by Phase 71)

### v1.17 carry-over test files

- `tests/snapshotMigration.test.ts` (line 32 specifically)
- `tests/pickerMyTexturesIntegration.test.tsx`
- `tests/WallMesh.cutaway.test.tsx`
- `tests/lib/contextMenuActionCounts.test.ts`

### Pattern references for useTheme test driver

- `src/three/WallMesh.tsx` (Phase 64 acc2) — StrictMode-safe useEffect cleanup pattern with identity-check; useTheme driver follows this pattern
- `src/canvas/tools/productTool.ts` and `src/canvas/tools/selectTool.ts` (Phase 31 D-07) — `window.__drive*` test-driver pattern gated by `import.meta.env.MODE === "test"`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- Phase 33 `useReducedMotion` hook (`src/hooks/useReducedMotion.ts`) — D-39 pattern; `useTheme` should sit alongside it with identical hook conventions (matchMedia listener, cleanup on unmount, single boolean/string return)
- `src/index.css` `@theme {}` block — Tailwind v4 inline configuration (no `tailwind.config.js`), so the migration is a single-file CSS edit

### Established Patterns

- Test-mode registries (`window.__drive*` gated by `import.meta.env.MODE === "test"`) — apply this for `__driveTheme`
- StrictMode-safe useEffect cleanup with identity check (`if (reg[id] === currentValue) reg[id] = null`) — must apply to any module-level theme registry per CLAUDE.md "Phase 64" precedent
- Lucide-react already imported across most chrome files; only 9 files still on Material Symbols (per D-33 allowlist)

### Integration Points

- `src/main.tsx` — React entry; alternative location to wire `useTheme()` if App.tsx is too crowded
- `src/App.tsx` — Top-level component; applies `dark` class via `document.documentElement.classList`
- Existing test drivers (search `__drive` references) — `__driveTheme` joins them

### Constraints

- Tailwind v4: `@theme {}` block IS the config; no `tailwind.config.js` exists
- Three.js viewport (`src/three/`) reads colors from THREE.Color material instances, not from CSS tokens — no impact from token swap
- Fabric.js canvas (`src/canvas/`) uses inline color values for grid/walls/products — no impact from chrome token swap (the dot grid in chrome chrome was the `cad-grid-bg` CSS class, not the canvas grid)

</code_context>

<specifics>
## Specific Ideas

- Copy the 16 semantic oklch tokens from pascal-visual-audit.md verbatim into `:root` (light) and `.dark` (dark) blocks
- `--radius: 0.625rem` (10px) base; computed: `--radius-sm: calc(var(--radius) - 4px)` (6px) / `--radius-md: calc(var(--radius) - 2px)` (8px) / `--radius-lg: var(--radius)` (10px) / `--radius-xl: calc(var(--radius) + 4px)` (14px)
- Squircle utility classes: `.rounded-smooth { border-radius: var(--radius); corner-shape: squircle; }` plus `-md` / `-lg` / `-xl` variants
- Font load order: Google Fonts link for Barlow (weights 400/500/600/700) + `geist` npm package import in `main.tsx` for Geist Sans + Geist Mono
- localStorage key for theme: `room-cad-theme`, values `"light" | "dark" | "system"`, default `"system"`

</specifics>

<deferred>
## Deferred Ideas

- Visible theme toggle button (StatusBar / Settings) — Phase 76
- WelcomeScreen + ProjectManager actual light-mode restyle — Phase 76
- Component primitives via `cva` (Button / Tab / PanelSection / SegmentedControl / Switch / Slider / Tooltip / Dialog / Input / Popover) — Phase 72
- Floating two-row action menu replacing top-left toolbar — Phase 74
- Sidebar contextual mount (un-mount on empty selection) — Phase 73
- Pascal's chunky PNG icons (custom-room.png, blueprint.png, etc.) — commission only if lucide-react 1.5x fallback looks flat in Phase 74
- WallMesh ghost-spread propagation through resolved Material in cutaway audit — open research question for Phase 71 researcher to recommend; final lock comes via planner

</deferred>

---

*Phase: 71-token-foundation-token-foundation*
*Context gathered: 2026-05-07*
