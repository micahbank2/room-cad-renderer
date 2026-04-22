---
phase: 33
name: Design System & UI Polish
milestone: v1.7.5
gathered: 2026-04-21
status: Ready for planning
---

# Phase 33: Design System & UI Polish — Context

<domain>
## Phase Boundary

Ship 8 polish items from the Pascal Editor competitive audit (GH issues #83–#90) as a unified design-system pass. The app should read as a peer-grade interior design tool — consistent typography, collapsible clutter, lightweight affordances, unified library chrome.

**In scope:** Visual + interaction polish on EXISTING features.
**Out of scope:** New capabilities. Architectural refactors (Zod, store split, `.claude/rules/` — those are Tier 3 in the audit, not v1.7.5). 3D realism work (Phases 34–36).

</domain>

<decisions>
## Implementation Decisions

### Sequencing / Wave Structure
- **D-01:** Foundation-first wave structure:
  - **Wave 1** — Typography tokens (#83) + spacing/radius/icon scale (#90 audit + tokenization). These land first so later items consume canonical values, not drift again.
  - **Wave 2** — Shared library chrome (#89 `<LibraryCard>` + `<CategoryTabs>`) + collapsible Properties sections (#84).
  - **Wave 3** — Interaction affordances: floating selection toolbar (#85), inline-editable titles (#88), rotation preset chips (#87), gesture chip (#86), icon normalize (#90 application pass).
- **D-02:** Planner determines Wave ordering within each wave; Waves run sequentially (later waves consume earlier waves' tokens).

### Typography (#83)
- **D-03:** 5-tier type ramp, defined in `src/index.css` `@theme {}` block:
  - `display` — hero/landing only (Space Grotesk, existing usage preserved)
  - `h1` — top-level section headers (e.g. "Room config", "Properties") — mixed-case, font-mono, larger weight
  - `h2` — panel sub-heads (e.g. "Position", "Dimensions", "Material") — mixed-case, font-mono
  - `body` — descriptive prose (Inter)
  - `label` — font-mono UI chrome (button labels, property names) — mixed-case
- **D-04:** UPPERCASE preserved for: dynamic identifiers (`WALL_SEGMENT_{id}`, product names via `.toUpperCase().replace(/\s/g, "_")`), status strings (`SYSTEM_STATUS: READY`, `SAVED`, `BUILDING_SCENE...`), and unit values (`LENGTH`, `WIDTH_FT` when shown as a value label, not a section header).
- **D-05:** Value-type labels in PropertiesPanel (inputs, numeric fields) stay font-mono for alignment; only the section headers and button text shift to mixed-case.

### Collapsible Properties Sections (#84)
- **D-06:** Persist expand/collapse state to **localStorage** under key `ui:propertiesPanel:sections` (not `uiStore` Zustand — UI chrome, not app state; survives reload).
- **D-07:** Default = all sections expanded on first visit.
- **D-08:** Respect `prefers-reduced-motion` — skip height transition, snap open/closed. Default animation: 200ms ease-out height transition.
- **D-09:** Chevron: lucide-react `ChevronRight` (collapsed) / `ChevronDown` (expanded), placed at left of section header row; entire row is the click target.

### Floating Selection Toolbar (#85)
- **D-10:** Scope in Phase 33: **2D canvas only.** 3D selection toolbar deferred to backlog (999.x).
- **D-11:** Actions Phase 33: `Duplicate` (lucide `Copy`), `Delete` (lucide `Trash2`). No Lock, no Focus camera (Tier 2/3 in audit).
- **D-12:** Positioning: screen-space anchor above selection bbox; 8px gap; clamps to canvas viewport edges (flips below if no room above).
- **D-13:** Visibility rules: appears when `uiStore.selectedIds.length >= 1`; hides during active drag/resize (reuse Phase 25 `_dragActive` signal); reappears on drag-end.
- **D-14:** Keyboard shortcuts already work (Delete, Cmd+D for duplicate if not already) — toolbar is pure UX affordance, NOT new functionality. No new shortcut registration.

### Gesture Chip (#86)
- **D-15:** Persistent chip, dismissible with × button. Dismissed state stored in localStorage `ui:gestureChip:dismissed`.
- **D-16:** Context-aware: different copy in 2D vs 3D.
  - 2D: `Drag to pan • Wheel to zoom`
  - 3D: `L-drag rotate • R-drag pan • Wheel zoom`
- **D-17:** Placement: bottom-left of active canvas viewport. Glass-panel style (`glass-panel` custom class), `text-text-dim`, small.
- **D-18:** Hides during active drag (not just dismissed) so it doesn't occlude feedback during interaction.

### Rotation Preset Chips (#87)
- **D-19:** Preset set: `-90°`, `-45°`, `0°` (reset), `+45°`, `+90°`. No fine-tune (±15°) — keeps chip row narrow.
- **D-20:** Each click = single undo entry via normal `updatePlacedProduct` / `updatePlacedCustomElement` → pushHistory. No batching.
- **D-21:** Works for products AND custom-elements (reuse existing rotation-setter pattern).
- **D-22:** Rendered as chip row to the right of the numeric rotation input; selected chip highlighted when `rotation === preset`.

### Inline-Editable Titles (#88)
- **D-23:** Reuse Phase 31 `labelOverride` live-preview pattern: Enter/blur commits, Escape reverts, keystroke live-preview.
- **D-24:** Affordance on hover: cursor changes to `text`, subtle underline in `text-text-dim`. No edit-icon — keeps chrome minimal.
- **D-25:** Single-click enters edit mode (not double-click — titles are obvious edit targets, matches Pascal).
- **D-26:** Commits write to `projectStore.activeName` (for doc title) / `cadStore.rooms[id].name` (for room tabs); auto-save is already wired via Phase 28.
- **D-27:** Validation: trim whitespace; max 60 chars; empty commit → revert to previous name (no save).

### Library Card Unification (#89)
- **D-28:** **Full component extraction.** New `src/components/library/` folder with `LibraryCard.tsx` + `CategoryTabs.tsx`.
- **D-29:** `<LibraryCard>` props: `thumbnail`, `label`, `selected`, `onClick`, `onRemove?`, `variant?: "grid" | "list"`. Font-mono label, obsidian-CAD theme consistent.
- **D-30:** `<CategoryTabs>` props: `tabs: {id, label, count?}[]`, `activeId`, `onChange`. Horizontal tab strip, obsidian-CAD theme.
- **D-31:** Migrate in order (each its own PR under #89): ProductLibrary → Custom Elements → Wainscot Library → Paint / Material picker. Stops if any migration hits unexpected shape mismatch — remaining libraries left on old pattern, gap tracked.
- **D-32:** Auto-generated thumbnails explicitly OUT of scope — uses existing uploaded images or placeholder (issue cites #77 as separate task).

### Iconography Normalization (#90)
- **D-33:** Planner first runs `grep -rn "material-symbols" src/` + counts usage sites.
  - If < 5 sites: drop Material Symbols, lucide-only across the app. Remove Google Fonts import for MS.
  - If ≥ 5 sites: keep both; document in CLAUDE.md that MS is reserved for specific CAD-domain glyphs (list them), lucide for all UI chrome.
- **D-34:** Canonical spacing / radius scale documented in `src/index.css` `@theme {}` block:
  - Spacing: 4, 8, 12, 16, 24, 32 (matches Tailwind 1/2/3/4/6/8)
  - Radius: `sm: 2px` (existing), `md: 4px`, `lg: 8px`. No arbitrary values.
- **D-35:** Application pass: replace every `rounded-[Npx]` and `p-[Npx]`/`m-[Npx]` in `src/components/Toolbar.tsx`, `src/components/Sidebar.tsx`, `src/components/PropertiesPanel.tsx`, and any modal component with canonical scale values. Grep confirms zero arbitrary values in those 4 high-traffic files post-Phase.

### Ship Strategy
- **D-36:** **Incremental PRs** — one PR per GH issue #83–#90. Each PR body: `Closes #N` + `Spec: .planning/phases/33-design-system-ui-polish/33-NN-PLAN.md`.
- **D-37:** Phase 33 does NOT require a "phase wrapper" PR if all 8 individual PRs merge clean. VERIFICATION.md references the 8 merged PRs.
- **D-38:** No feature flag / preview gate — Jessica is the sole user; she sees progression during development; final state lands incrementally on main.

### Reduced Motion
- **D-39:** Every new animation introduced in this phase (collapsible sections, floating toolbar enter/exit, inline-edit cursor blink if any, chevron rotate) MUST check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` and skip/snap. Add a shared `useReducedMotion()` hook if one doesn't exist.

### Claude's Discretion
- Specific px values within the approved 4/8/12/16/24 scale
- Specific font sizes in the 5-tier ramp (research Pascal's ramp as reference, land values that work with existing obsidian-CAD theme)
- Animation timing constants (200ms ease-out as baseline)
- Exact gesture chip copy wording
- Whether to extract `useReducedMotion()` hook (probably yes) — planner decides
- Floating toolbar pixel offset from selection bbox (8px baseline, tweak for ergonomics)
- Whether room tab labels use the same inline-edit component as doc title or a per-tab wrapper

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Competitive audit source
- `.planning/competitive/pascal-audit.md` — All 8 GH issues traced back to specific Pascal patterns in this doc. § "UX/UI observations" (lines 110–137) for UI chrome. § "Prioritized adopt list" → Tier 1 items 1, 2, 3, 5, 6 map to #83–#90. "Visual / interaction design patterns worth copying" lists inline edit, right-click menus (deferred), camera focus (deferred).

### GitHub issues (acceptance criteria)
- [#83 Typography overhaul](https://github.com/micahbank2/room-cad-renderer/issues/83)
- [#84 Collapsible Properties sections](https://github.com/micahbank2/room-cad-renderer/issues/84)
- [#85 Floating selection mini-toolbar](https://github.com/micahbank2/room-cad-renderer/issues/85)
- [#86 Canvas gesture affordance chip](https://github.com/micahbank2/room-cad-renderer/issues/86)
- [#87 Rotation preset chips](https://github.com/micahbank2/room-cad-renderer/issues/87)
- [#88 Inline-editable doc title + room tabs](https://github.com/micahbank2/room-cad-renderer/issues/88)
- [#89 Unified library card + category tabs](https://github.com/micahbank2/room-cad-renderer/issues/89)
- [#90 Spacing/rounded/iconography consistency pass](https://github.com/micahbank2/room-cad-renderer/issues/90)

### Prior-phase patterns to reuse (MANDATORY — don't reinvent)
- `CLAUDE.md` § "Drag-to-Resize + Label Override (shipped Phase 31)" — **#88 inline-edit reuses Phase 31 live-preview pattern** (Enter/blur commits, Escape reverts, keystroke live-preview, max 40→60 chars extension ok)
- `CLAUDE.md` § "Auto-save (shipped Phase 28)" — **#88 doc-title commits write to `projectStore.activeName` which auto-save already watches** — no new save wiring
- `CLAUDE.md` § "Keyboard Shortcuts" — **#85 toolbar is visual affordance only**; Delete/Cmd+D shortcuts already exist, no new key registration
- `src/index.css` `@theme {}` block — single source of truth for design tokens. Every token added in this phase goes here.

### Roadmap + state
- `.planning/ROADMAP.md` § "Phase 33: Design System & UI Polish" — 8 success criteria mapped to GH issues
- `.planning/STATE.md` — v1.7.5 active milestone
- `CLAUDE.md` — obsidian-CAD theme palette, font families, naming patterns (all 8 items must preserve)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/index.css` `@theme {}` block — design tokens (obsidian-* palette, accent purple, font families, existing `--radius-sm: 2px`). Extending this block is the canonical token-add location.
- `glass-panel` / `ghost-border` / `accent-glow` / `cad-grid-bg` CSS classes — reusable for gesture chip (#86) and floating toolbar (#85) backgrounds.
- Phase 31 `labelOverride` pattern in `src/components/PropertiesPanel.tsx` — reuse shape for #88 inline-editable titles.
- `src/stores/uiStore.ts` — already holds visibility flags (`showGrid`, `showProductLibrary`, `showProperties`); add runtime-only toggles here if any; localStorage-persisted state (#84 section expand, #86 chip dismissed) bypasses uiStore.
- Phase 25 `_dragActive` drag fast-path signal in `cadStore` — #85 floating toolbar reads this to hide during drag.
- `cadStore.updatePlacedProduct` / `updatePlacedCustomElement` — #87 rotation chip writes go through these (single-undo per click).
- lucide-react — already installed. `ChevronRight`, `ChevronDown`, `Copy`, `Trash2`, `Check`, `X` cover Phase 33 needs.

### Established Patterns
- All UI labels go font-mono per obsidian-CAD theme. Mixed-case shift in #83 preserves font-mono; only changes CASE.
- Persistence split: CAD data → cadStore → IndexedDB via `useAutoSave`; UI chrome → uiStore (session) or direct localStorage (survives reload). #84 + #86 dismissal go direct to localStorage.
- Section / panel components live in `src/components/`; shared library primitives will go in new `src/components/library/` subdir (#89).
- Each drag/mutation pushes exactly one undo entry (Phase 25/31 pattern). #87 rotation chips follow this.

### Integration Points
- `src/components/PropertiesPanel.tsx` — touched by #83 (mixed-case labels), #84 (collapsible wrapper), #87 (rotation chip row).
- `src/components/Toolbar.tsx` — touched by #83 (labels), #88 (inline-editable doc title), #90 (spacing/radius normalize).
- `src/components/Sidebar.tsx` — touched by #83 (headers), #90 (spacing normalize).
- `src/canvas/FabricCanvas.tsx` — touched by #85 (floating toolbar mount point), #86 (2D gesture chip mount).
- `src/three/ThreeViewport.tsx` — touched by #86 (3D gesture chip mount).
- `src/components/ProductLibrary.tsx` + Custom Elements + Wainscot + Paint/Material panels — all migrated by #89.
- `src/index.css` — touched by #83 (type ramp tokens) + #90 (spacing/radius tokens).

</code_context>

<specifics>
## Specific Ideas

- Jessica is the sole user. Polish trade-offs favor her ergonomics over generalizable SaaS polish (e.g., no multi-user preview flags, no A/B).
- Pascal Editor competitive audit (pascal-audit.md) is the design reference for all 8 items. Downstream agents should READ the audit's UX/UI observations section, not just the GH issues.
- Phase 31 live-preview pattern is the proven reference for #88 inline-edit — reuse shape, don't reinvent.
- obsidian-CAD theme (dark obsidian palette + accent purple) is non-negotiable. Every new component matches.

</specifics>

<deferred>
## Deferred Ideas

Not in Phase 33 scope — noted for future phases / backlog:

- **3D selection floating toolbar** — screen-space projection math is non-trivial; deferred to a follow-up. Create GH backlog issue tagged `ux` + `backlog`.
- **Right-click context menu** on canvas objects (Pascal has this) — Tier 1 in audit but not in v1.7.5 issue list. Stays open as existing issue.
- **Per-node saved cameras** — Tier 2 in audit, bigger lift.
- **Auto-generated library thumbnails (#77)** — separate issue, out of #89 scope.
- **Keyboard shortcuts cheat-sheet overlay (`?` hotkey)** — Tier 1 in audit, exists as separate issue #72.
- **In-app feedback dialog** — Tier 1 in audit, separate issue.
- **`.claude/rules/` subdirectory split** — Tier 3 architectural refactor; not v1.7.5.
- **Store split (uiStore → uiStore + viewerStore)** — Tier 3 architectural refactor.
- **Zod runtime validation of CADSnapshot** — Tier 3.
- **Guide image upload** — Tier 4 experimental.

</deferred>

---

*Phase: 33-design-system-ui-polish*
*Context gathered: 2026-04-21*
*Next: `/gsd:ui-phase 33` (recommended — this phase is frontend-heavy; UI-SPEC.md locks visual tokens before planning) or `/gsd:plan-phase 33`*
