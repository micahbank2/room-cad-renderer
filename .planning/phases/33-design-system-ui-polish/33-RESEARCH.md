# Phase 33: Design System & UI Polish — Research

**Researched:** 2026-04-21
**Domain:** Design system tokens + component refactor for React/Tailwind v4 + Fabric.js v6 + React Three Fiber app
**Confidence:** HIGH (codebase findings) / HIGH (pattern reuse)

## Summary

Phase 33 ships 8 visual/interaction polish items (GH #83–#90) as a unified design-system pass. The research phase verified concrete file locations, existing patterns to mirror (Phase 31 label override, Phase 25 `_dragActive`), and surfaced **one critical blocker: `lucide-react` is NOT currently installed** despite CONTEXT.md/UI-SPEC claiming it is. The planner MUST add it as Wave 1 Task 0. All other findings align with the UI-SPEC contract.

**Primary recommendation:** Execute Wave 1 as tokens-first (`src/index.css` `@theme {}` extension + `useReducedMotion` hook + lucide-react install + `grep` audit for #90), Wave 2 as shared primitives (`<LibraryCard>`, `<CategoryTabs>`, `<CollapsibleSection>`), Wave 3 as application (#85/#86/#87/#88 + #90 application pass). Reuse the Phase 31 `LabelOverrideInput` component shape verbatim for #88 — the commit/cancel/skipNextBlur/test-driver pattern is battle-tested.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01** Foundation-first wave structure: Wave 1 = typography + spacing/radius tokens (#83 + #90 audit/tokenize); Wave 2 = library chrome (#89) + collapsible Properties (#84); Wave 3 = interactions (#85 toolbar, #86 gesture chip, #87 rotation chips, #88 inline-edit, #90 application pass).
- **D-02** Waves run sequentially (later waves consume earlier tokens). Planner orders within each wave.
- **D-03** 5-tier type ramp consolidated to 3 CSS tokens (`--font-size-display: 28px`, `--font-size-base: 13px`, `--font-size-sm: 11px`) with 2 weights (500 medium, 400 regular). Mixed-case for h1/h2/label/body in new UI chrome.
- **D-04** UPPERCASE preserved for: dynamic CAD identifiers (`WALL_SEGMENT_{id}`, `{PRODUCT_NAME}`), status strings (`SAVED`, `BUILDING_SCENE...`), and unit value labels (`LENGTH`, `WIDTH_FT`).
- **D-05** Value-type labels in PropertiesPanel (inputs, numeric fields) remain font-mono for alignment; only section headers and button text shift to mixed-case.
- **D-06** Collapsible section state → localStorage key `ui:propertiesPanel:sections` (NOT uiStore).
- **D-07** Default = all sections expanded on first visit.
- **D-08** Respect `prefers-reduced-motion`; baseline animation 200ms ease-out height transition.
- **D-09** Chevron: lucide `ChevronRight` (collapsed) / `ChevronDown` (expanded), left of header row; entire row = click target.
- **D-10** Floating selection toolbar: **2D canvas only** in Phase 33. 3D deferred.
- **D-11** Actions: `Duplicate` (lucide `Copy`), `Delete` (lucide `Trash2`). No Lock, no Focus camera.
- **D-12** Position: 8px (`--spacing-sm`) above selection bbox; clamps to canvas viewport edges; flips below if no room above.
- **D-13** Visibility: `selectedIds.length >= 1 && !_dragActive`. Reuse Phase 25 `_dragActive` flag.
- **D-14** No new keyboard shortcuts — Delete/Cmd+D already wired.
- **D-15** Gesture chip: dismissible via `×` (lucide `X`); dismissed state → localStorage `ui:gestureChip:dismissed`.
- **D-16** 2D copy: `Drag to pan • Wheel to zoom`. 3D copy: `L-drag rotate • R-drag pan • Wheel zoom`.
- **D-17** Bottom-left of canvas viewport, glass-panel style.
- **D-18** Hides during active drag (not just on dismiss).
- **D-19** Rotation presets: `-90°`, `-45°`, `0°`, `+45°`, `+90°`. No fine-tune.
- **D-20** Each click = single undo via `rotateProduct` / equivalent custom-element setter → `pushHistory`.
- **D-21** Works for products AND custom elements.
- **D-22** Chip row right of numeric rotation input; selected chip highlighted when `rotation === preset`.
- **D-23** Inline-edit reuses Phase 31 `labelOverride` live-preview pattern (keystroke live-preview, Enter/blur commits, Escape reverts).
- **D-24** Hover affordance: `cursor: text`, subtle underline. No edit icon.
- **D-25** Single-click enters edit mode.
- **D-26** Doc title → `projectStore.activeName` (auto-save wired via Phase 28). Room name → `cadStore.rooms[id].name`.
- **D-27** Trim whitespace, max 60 chars, empty commit → revert.
- **D-28** `<LibraryCard>` + `<CategoryTabs>` extracted to new `src/components/library/` folder.
- **D-29/D-30** Props contracts per UI-SPEC.
- **D-31** Library migration order: ProductLibrary → Custom Elements → Wainscot → Paint/Material. Each own PR. Stop on shape mismatch.
- **D-32** Auto-generated thumbnails OUT of scope.
- **D-33** lucide-react for new UI chrome; Material Symbols **kept** for existing CAD glyphs (grep confirms 33 occurrences across 8 files ≥ 5 threshold).
- **D-34** Canonical spacing scale: `4, 8, 16, 24, 32` (12px DROPPED per checker). Radius `sm: 2px`, `md: 4px`, `lg: 8px` (canonicalize from current 6px).
- **D-35** Zero `rounded-[Npx]`/`p-[Npx]`/`m-[Npx]` arbitrary values in Toolbar/Sidebar/PropertiesPanel + any modal post-phase.
- **D-36** Incremental PRs — one per GH issue #83–#90. Each PR body: `Closes #N` + `Spec: .planning/phases/33-design-system-ui-polish/33-NN-PLAN.md`.
- **D-37** No phase-wrapper PR required.
- **D-38** No feature flag.
- **D-39** Every new animation guards on `window.matchMedia('(prefers-reduced-motion: reduce)').matches`. Extract shared `useReducedMotion()` hook.

### Claude's Discretion
- Exact px within approved scale, font sizes in ramp (research Pascal as reference), 200ms animation baseline, gesture chip exact wording, whether to extract `useReducedMotion()` (planner decides — RECOMMENDATION: YES).
- Floating toolbar offset from bbox (8px baseline, tweak).
- Whether room tabs share inline-edit component with doc title or per-tab wrapper.

### Deferred Ideas (OUT OF SCOPE)
- 3D floating selection toolbar (follow-up backlog, create GH issue tagged `ux` + `backlog`).
- Right-click context menu (existing separate issue).
- Per-node saved cameras (Tier 2).
- Auto-generated library thumbnails (#77, separate).
- Keyboard shortcuts overlay (#72).
- In-app feedback dialog (separate).
- `.claude/rules/` split, store split, Zod validation, guide image upload (all Tier 3/4).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GH #83 | Typography overhaul (mixed-case hierarchy, monospace for values) | Token addition to `src/index.css @theme`; ~25 component files use `font-mono text-[10px/11px] tracking-widest` — the mixed-case flip is a search-and-replace across headers and button labels. UPPERCASE sites (D-04) identified below. |
| GH #84 | Collapsible PropertiesPanel sections | PropertiesPanel.tsx is 490 lines, currently a single flat `glass-panel` container with sub-blocks for ceiling/wall/product/custom-element. Introduce `<CollapsibleSection>` wrapper. Sidebar.tsx lines 17–42 already has a `CollapsibleSection` inline component using `useState` + `+/−` glyphs — can be extended/replaced. |
| GH #85 | Floating selection toolbar | FabricCanvas.tsx mount point identified. `selectedIds` in uiStore; `_dragActive` flag exists on `selectTool` module (grep: 11 references in `src/canvas/tools/selectTool.ts`). NOT on cadStore — CONTEXT.md statement "cadStore `_dragActive`" is imprecise; correct reference is selectTool module-level flag. Planner must expose/subscribe. |
| GH #86 | Gesture affordance chip | 2D: mount inside FabricCanvas wrapper; 3D: mount outside R3F Canvas (DOM overlay). OrbitControls `onChange` exists but NO explicit `onStart`/`onEnd` wired — pointer-event listeners on canvas parent are simplest for drag detection. |
| GH #87 | Rotation preset chips | `rotateProduct(id, angle)` + `rotateProductNoHistory` exist at `src/stores/cadStore.ts:340,351`. Custom-element equivalent at lines 728, 737 (`doc.placedCustomElements[id].rotation = angle`). Single-click = one history entry via the history-pushing variant. |
| GH #88 | Inline-editable doc title + room tab labels | Doc title lives in `ProjectManager.tsx` (sidebar, NOT Toolbar — UI-SPEC mapping is wrong on this). Current input is a plain `<input value={projectName} onChange={setActiveName}>`. Room tab labels in `RoomTabs.tsx` line 32 `room.name.toUpperCase()`. Reuse `LabelOverrideInput` shape from `PropertiesPanel.tsx:292-403`. |
| GH #89 | Unified library card | 5 library surfaces: ProductLibrary.tsx (174 lines), FramedArtLibrary.tsx (138), WainscotLibrary.tsx (277), CustomElementsPanel.tsx (172), FloorMaterialPicker.tsx (140) + SurfaceMaterialPicker.tsx (39) + PaintSection.tsx (68). Each has its own card layout. Extract to `src/components/library/LibraryCard.tsx` + `CategoryTabs.tsx`. |
| GH #90 | Spacing/icon normalization audit | Top-traffic arbitrary-value files (grep confirmed): Toolbar.tsx (~20 sites incl. `text-[10px]`, `text-[14px]`, `text-[18px]`, `min-w-[72px]`, `shadow-[...]`), PropertiesPanel.tsx (~15 sites incl. `text-[11px]`, `w-20 px-1`), Sidebar.tsx (~6 sites), RoomTabs.tsx (~3 sites). Material Symbols: **33 occurrences / 8 files** → KEEP (≥ 5 threshold per D-33). |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Tool cleanup pattern:** Every new tool/interaction activated on Fabric canvas must return a `() => void` cleanup. Floating toolbar mount/unmount should follow this shape even though it's React-side (subscribe to selection + cleanup effect).
- **Obsidian-CAD theme non-negotiable:** obsidian-* palette, accent purple `#7c5bf0`, IBM Plex Mono for UI chrome, Space Grotesk for hero, Inter for prose. NO new color tokens, only the type/spacing/radius additions in UI-SPEC.
- **CSS classes to preserve:** `glass-panel`, `ghost-border`, `accent-glow`, `cad-grid-bg`, `material-symbols-outlined`. The gesture chip and floating toolbar MUST reuse `glass-panel`.
- **Single-undo pattern:** Every mutation = exactly one `past[]` entry. Rotation chips (#87) each click = one entry. Inline-edit title (#88) follows Phase 31: keystrokes use `*NoHistory`, commit uses history-pushing variant.
- **Label convention:** UPPERCASE preserved for identifiers, status strings, and unit labels; mixed-case applies only to section headers + button labels (D-03/D-04/D-05).
- **Code identifiers untouched:** All CSS class names, `data-testid`, store keys stay as-is. Only display labels shift case.
- **GSD workflow:** File changes go through `/gsd:execute-phase`; each GH issue = 1 PR with `Closes #N` body.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| lucide-react | ^0.441.0 (latest stable) | New UI chrome icons: `ChevronRight`, `ChevronDown`, `Copy`, `Trash2`, `X`, optional `Check` | **NOT CURRENTLY INSTALLED** — package.json scan confirms zero `lucide-react` imports in `src/`. D-33 and UI-SPEC both erroneously state it's installed. Planner MUST add `npm install lucide-react` as first action in Wave 1. Bundle cost ~500 bytes per icon tree-shaken. |
| React 18 + Zustand 5 + Immer 11 | existing | Store mutations for rotation chips, label commit, section-state persistence | Pattern established in Phases 28/31 |
| Tailwind CSS v4 | ^4.2.2 | `@theme {}` block is the single source of truth for tokens | Design system already lives here |
| Fabric.js v6 | ^6.9.1 | 2D canvas + selection bbox API for floating toolbar positioning | Selection bbox available via `fc.getActiveObject()?.getBoundingRect()` (screen coords) |
| `@react-three/drei` | ^9.122.0 | `OrbitControls` — has `onChange` wired; no `onStart`/`onEnd` callback in current setup | Gesture chip 3D uses DOM pointer events on canvas parent (simpler than R3F event bus) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | ^4.1.2 | Unit + integration tests (existing harness, ~50 test files) | All Phase 33 automated validation |
| `@testing-library/react` (inferred from existing `*.test.tsx` files) | existing | React component testing for collapsible, rotation chips, inline-edit | Component-level behavior tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| lucide-react | Stay with Material Symbols for new UI | User-decision D-33 → dual icon libraries (MS for CAD glyphs, lucide for chrome). Settled. |
| localStorage for section state | `uiStore` Zustand + persistence middleware | User decision D-06: direct localStorage. Survives reload, bypasses undo. |
| R3F event hooks for 3D drag detection | DOM `pointerdown`/`pointerup` on canvas parent | DOM listeners simpler; drei `OrbitControls` does not expose `onStart`/`onEnd` callbacks in current version by default, though `controls.current?.addEventListener('start', ...)` is available. Use whichever the planner prefers. |

**Installation:**
```bash
npm install lucide-react
```

**Version verification (required Wave 1 Task 0):**
```bash
npm view lucide-react version
```

## Architecture Patterns

### Recommended Structure Additions
```
src/
├── components/
│   ├── library/                        # NEW — D-28
│   │   ├── LibraryCard.tsx             # <LibraryCard> — thumbnail + label + selected/hover + onRemove
│   │   ├── CategoryTabs.tsx            # <CategoryTabs> — horizontal tab strip w/ active underline
│   │   └── index.ts                    # re-export
│   ├── ui/                             # NEW — shared UI primitives
│   │   ├── CollapsibleSection.tsx      # <CollapsibleSection> — chevron + localStorage persistence
│   │   ├── GestureChip.tsx             # #86 — mounts in 2D + 3D viewports
│   │   ├── FloatingSelectionToolbar.tsx# #85 — 2D only, mounts in FabricCanvas wrapper
│   │   └── InlineEditableText.tsx      # #88 — reused by doc title + room tab labels
│   └── …
├── hooks/
│   └── useReducedMotion.ts             # NEW — D-39 shared hook
└── lib/
    └── uiPersistence.ts                # NEW — typed localStorage helpers (`ui:*` keys)
```

### Pattern 1: Section Collapsibility with localStorage (D-06, D-09)
**What:** Wrapper component that reads/writes `localStorage['ui:propertiesPanel:sections']` as `{ [sectionId]: boolean }`.
**When to use:** All PropertiesPanel section wrappers in Wave 2.
**Example:**
```typescript
// src/components/ui/CollapsibleSection.tsx
// Source: mirrors src/components/Sidebar.tsx:17-42 existing CollapsibleSection shape
// but extracted, extended with localStorage persistence and lucide chevron.
import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const STORAGE_KEY = "ui:propertiesPanel:sections";

function readState(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

export function CollapsibleSection({ id, label, children }: {
  id: string; label: string; children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState<boolean>(() => readState()[id] ?? true); // D-07 default open
  useEffect(() => {
    const s = readState();
    s[id] = open;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }, [id, open]);
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 py-1 text-text-muted hover:text-text-primary"
      >
        {open
          ? <ChevronDown size={12} className="text-text-ghost group-hover:text-accent" />
          : <ChevronRight size={12} className="text-text-ghost group-hover:text-accent" />
        }
        <span className="font-mono text-[11px] font-medium">{label}</span>
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
```

### Pattern 2: Phase 31 Live-Preview Inline Edit (D-23) — VERBATIM REUSE
**What:** Extract `PropertiesPanel.tsx:292-403 LabelOverrideInput` into `src/components/ui/InlineEditableText.tsx` with generic `onCommit`, `onLivePreview`, `originalValue` props.
**When to use:** Doc title (ProjectManager) + room tab labels (RoomTabs). Both call `projectStore.setActiveName` / `cadStore.renameRoom` respectively.
**Key invariants from Phase 31 (do not change):**
1. `skipNextBlurRef` — Escape calls `.blur()` which fires `onBlur → commit()`. Escape's `cancel()` sets the ref so the blur handler skips the commit with stale draft.
2. Live preview writes use the `*NoHistory` store variant; commit uses the history-pushing variant.
3. `useEffect` reseeds state when the bound `id` changes (selection swap).
4. Test driver `window.__drive*` gated by `import.meta.env.MODE === 'test'`.

### Pattern 3: Floating Toolbar Positioning (D-12, D-13)
**What:** React overlay anchored to the FabricCanvas wrapper div, position computed from Fabric's active object bbox.
**How:**
- Fabric v6: `fc.getActiveObject()?.getBoundingRect()` returns `{left, top, width, height}` in SCREEN coords (accounts for viewportTransform / zoom / pan). This is the correct API.
- Subscribe to Fabric events: `selection:created`, `selection:updated`, `selection:cleared`, `object:modified`, `after:render` to update overlay position.
- Drag-active signal: selectTool already sets `_dragActive` flag (11 references in `src/canvas/tools/selectTool.ts`). Planner exports a subscription hook (`useSelectToolDragActive()`) or adds `_dragActive` to uiStore — RECOMMEND adding a small bridge in `selectTool` that calls a setter on uiStore at drag-start/end (mirrors existing `setSelectToolProductLibrary` / `setPendingProduct` D-07 bridges).
- Position logic: `top = bbox.top - 40 - 8; left = bbox.left + bbox.width/2 - toolbarWidth/2`. If `top < 0`, flip: `top = bbox.top + bbox.height + 8`. Clamp `left` to `[0, wrapper.width - toolbarWidth]`.

### Pattern 4: Icon Migration (D-33)
**Grep result verified: 33 Material Symbols occurrences across 8 files**: Toolbar.tsx (15), WelcomeScreen.tsx (4), TemplatePickerDialog.tsx (4), HelpModal.tsx (3), AddProductModal.tsx (2), HelpSearch.tsx (2), ProductLibrary.tsx (2), index.css (1). All are CAD-domain glyphs (grid_view, directions_walk, undo, redo, door_front, window, roofing, zoom_in, zoom_out, fit_screen, etc.).
**Action per D-33:** KEEP Material Symbols. Document in CLAUDE.md that MS is reserved for the glyphs in those 8 files + new UI chrome uses lucide. Do NOT migrate existing MS sites in Phase 33.

### Anti-Patterns to Avoid
- **DO NOT** make `<LibraryCard>` category-aware (i.e., no `variant: "product" | "wainscot"`). Keep it shape-agnostic — just thumbnail+label+selected+onRemove. Per-library logic stays in the library component.
- **DO NOT** batch the 5 library migrations into one PR. D-31 says stop on shape mismatch. One library per PR under #89.
- **DO NOT** store section expand state in uiStore. D-06 explicitly routes to localStorage because session-scoped uiStore resets on reload.
- **DO NOT** introduce CSS-only collapsible without the reduced-motion check. D-39 requires runtime gate via `useReducedMotion()`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Icon primitives | Custom SVG for chevron/copy/trash/X | lucide-react | Already in the D-33 plan; tree-shaken; 500B per icon; designer-matched stroke. |
| Text selection bbox in 2D | Custom bbox math from store data | `fc.getActiveObject()?.getBoundingRect()` | Fabric handles pan/zoom/rotation in the screen-space bbox output. Reinventing risks Phase 7-style drift. |
| Reduced-motion detection | Check media query in each component | Shared `useReducedMotion()` hook | Subscribe once, re-render on OS setting change via `matchMedia.addEventListener`. |
| Per-icon size/color mapping | Pass className to `<span material-symbols-outlined>` per site | lucide `<ChevronRight size={12} className="text-accent" />` | Fewer runtime surprises; TypeScript-typed props. |
| `transition: max-height` animation | Hand-tuning heights | CSS `max-height: open ? 9999 : 0` + transition, OR `grid-template-rows: 0fr/1fr` pattern | Standard React-Tailwind collapsible. `grid` pattern is slightly smoother for variable content. |
| Keyboard shortcuts for duplicate/delete | Register new key handlers in toolbar | D-14: NO new shortcuts; existing Delete key works | Floating toolbar is pure UX affordance. |

**Key insight:** Every polish item in Phase 33 has a proven pattern elsewhere in the codebase (Phase 31 for inline-edit, Phase 25 for drag state, existing `Sidebar.tsx CollapsibleSection` for section wrapping). The phase is extraction + tokenization + affordance, not novel interaction design.

## Common Pitfalls

### Pitfall 1: Drift between token add and token consume
**What goes wrong:** Wave 3 components consume `--font-size-sm` before Wave 1 defines it, or Wave 2 `LibraryCard` uses `rounded-md` when the `--radius-md` token hasn't been added.
**Why it happens:** Parallel execution within a wave, or Wave 2 starts before Wave 1 merges.
**How to avoid:** Enforce D-01/D-02: waves run SEQUENTIALLY. Wave 1 PR merges before Wave 2 planning begins. Planner MUST make Wave 1 the single source of `src/index.css` modifications.
**Warning signs:** `vitest` + visual smoke reveals `undefined` CSS vars or missing `rounded-md` class in compiled CSS.

### Pitfall 2: `_dragActive` subscription gap
**What goes wrong:** Floating toolbar flickers during drag because the `_dragActive` flag lives on selectTool module (not cadStore or uiStore), and React re-renders on selection but doesn't re-render on drag-state change.
**Why it happens:** CONTEXT.md Integration Point says "Phase 25 `_dragActive` drag fast-path signal in `cadStore`" — but `_dragActive` is actually in `src/canvas/tools/selectTool.ts` (11 refs), NOT cadStore (0 refs in store).
**How to avoid:** Add a uiStore signal `isDragging: boolean` with `setDragging(v)` action. Update selectTool's drag-start/drag-end to also call `useUIStore.getState().setDragging(v)`. Floating toolbar subscribes to this.
**Warning signs:** Toolbar visible while user is actively dragging object.

### Pitfall 3: `--radius-lg` change breaks existing components
**What goes wrong:** UI-SPEC canonicalizes `--radius-lg: 6px → 8px`. Any existing component using `rounded-lg` (Tailwind resolves to `var(--radius-lg)`) will shift by 2px.
**Why it happens:** Silent breaking change in Wave 1.
**How to avoid:** Wave 1 PR includes a grep for `rounded-lg` usage and either (a) confirms visually acceptable, or (b) resolves cases individually. Same check for `--spacing-md: 12px` drop — planner must grep for `gap-3`, `p-3`, `m-3` (which Tailwind v4 maps to 12px) in the 4 target files and remap.
**Warning signs:** Visual regression in modals, cards, or floating chip.

### Pitfall 4: Inline-edit Escape re-commits stale draft (Phase 31 re-discovery)
**What goes wrong:** User types new name, presses Escape. Handler calls `cancel()` + `.blur()`. `onBlur` fires `commit()` with the stale draft still in closure, overwriting the reverted value.
**Why it happens:** Known issue — Phase 31 solved with `skipNextBlurRef` (PropertiesPanel.tsx:311).
**How to avoid:** Copy the `skipNextBlurRef` pattern verbatim into `InlineEditableText`. Test driver MUST cover the Escape-then-blur cycle.
**Warning signs:** Tests showing Escape doesn't revert.

### Pitfall 5: PropertiesPanel does not have named sections yet
**What goes wrong:** #84 assumes PropertiesPanel is already sectioned. It isn't — it's a flat glass-panel with implicit groups (ceiling block, wall block, product block, custom-element block). Applying `<CollapsibleSection>` requires first introducing the section IDs/headers.
**Why it happens:** PropertiesPanel.tsx has no explicit "Position", "Dimensions", "Material", "Rotation" sub-headers — those are implied by UI-SPEC labels but not yet rendered as headers.
**How to avoid:** Plan #84 in two parts: (1) introduce sub-section headers ("Position", "Dimensions", etc.) with stable IDs, (2) wrap each in `<CollapsibleSection id="...">`. Don't skip step 1.
**Warning signs:** Implementation task that just wraps the existing code in one collapsible for the whole panel.

### Pitfall 6: Doc title edit location mismatch
**What goes wrong:** UI-SPEC says "document title in Toolbar" for #88. Codebase says it lives in `ProjectManager.tsx` in the sidebar (line 72 `<input value={projectName} onChange={setActiveName}>`).
**Why it happens:** Toolbar.tsx has only the brand "OBSIDIAN CAD" (line 42) — no project-name binding currently.
**How to avoid:** Planner MUST decide: (a) relocate the project-name input to Toolbar as the inline-edit target (matches Pascal, matches UI-SPEC), OR (b) apply the inline-edit pattern to the existing ProjectManager input (lower risk, less visible). RECOMMENDATION: (a) — relocate to Toolbar, make `ProjectManager.tsx` show a read-only name + save/load. Closer to Pascal's layout.
**Warning signs:** Feature ships but Jessica reaches for the title where Pascal puts it (toolbar) and can't find it.

### Pitfall 7: 12px spacing removal breaks existing gaps
**What goes wrong:** Tailwind v4's `gap-3`, `p-3`, `m-3` compile to 12px. Codebase grep shows widespread `gap-3`, `p-3` usage.
**Why it happens:** D-34 removes 12px from the token set but Tailwind's arbitrary `p-3` class still emits `0.75rem`.
**How to avoid:** D-35 scope is per-file (Toolbar, Sidebar, PropertiesPanel, modals). Remap `p-3` → `p-2` or `p-4` in those 4 files. Other files keep Tailwind's default 12px (acceptable — only the 4 target files need zero arbitrary values). Document this in CLAUDE.md.
**Warning signs:** Planner tries to purge 12px globally → days of visual regressions.

## Runtime State Inventory

**Not applicable** — Phase 33 is UI polish with no rename/refactor/migration component. Verified:
- Stored data: No changes to cadStore/projectStore/productStore/paintStore data shapes. localStorage keys `ui:propertiesPanel:sections` and `ui:gestureChip:dismissed` are NEW; no migration from pre-existing storage.
- Live service config: None — local-first app.
- OS-registered state: None.
- Secrets/env vars: None — phase adds zero env-dependent features.
- Build artifacts: Adding `lucide-react` to `package.json` + `package-lock.json` requires `npm install`. No stale build artifacts.

## Code Examples

### Reading Fabric selection bbox for floating toolbar (#85)
```typescript
// Source: Fabric v6 docs + existing usage in src/canvas/tools/selectTool.ts
import type * as fabric from "fabric";

export function getSelectionScreenBbox(fc: fabric.Canvas): DOMRect | null {
  const obj = fc.getActiveObject();
  if (!obj) return null;
  // getBoundingRect returns absolute screen coords accounting for viewport transform
  const { left, top, width, height } = obj.getBoundingRect();
  return new DOMRect(left, top, width, height);
}

// Subscribe to events that should recompute position:
fc.on("selection:created", updateToolbarPos);
fc.on("selection:updated", updateToolbarPos);
fc.on("selection:cleared", hideToolbar);
fc.on("object:modified", updateToolbarPos);
fc.on("after:render", updateToolbarPos); // covers pan/zoom
```

### Rotation preset chip store call (#87) — single undo
```typescript
// Source: src/stores/cadStore.ts:340 (rotateProduct) — existing history-pushing variant
import { useCADStore } from "@/stores/cadStore";

function RotationChip({ pp, preset }: { pp: PlacedProduct; preset: number }) {
  const rotateProduct = useCADStore(s => s.rotateProduct);
  const isActive = Math.abs(pp.rotation - preset) < 0.5;
  return (
    <button
      onClick={() => rotateProduct(pp.id, preset)} // single history entry
      className={`px-2 py-0.5 rounded-sm font-mono text-[11px] border ${
        isActive
          ? "bg-accent/20 text-accent-light border-accent/30"
          : "bg-obsidian-high text-text-dim border-outline-variant/20"
      }`}
    >
      {preset > 0 ? `+${preset}°` : `${preset}°`}
    </button>
  );
}
```

### Inline-editable title — extraction target (#88)
```typescript
// Extracted from src/components/PropertiesPanel.tsx:292-403 LabelOverrideInput
// Generic: onCommit, onLivePreview, originalValue props
// Preserves: skipNextBlurRef, live-preview per keystroke, Escape revert via *NoHistory variant
export function InlineEditableText({
  value,
  onLivePreview,    // NoHistory write per keystroke
  onCommit,         // history-pushing write on Enter/blur
  maxLength = 60,   // D-27 max 60 chars (Phase 31 used 40)
  placeholder,
  className,
}: {
  value: string;
  onLivePreview: (v: string) => void;
  onCommit: (v: string) => void;
  maxLength?: number;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  const originalRef = useRef(value);
  const skipNextBlurRef = useRef(false);
  useEffect(() => { setDraft(value); originalRef.current = value; }, [value]);

  function commit() {
    if (skipNextBlurRef.current) { skipNextBlurRef.current = false; return; }
    const trimmed = draft.trim();
    if (trimmed === "") { cancel(); return; } // D-27 empty → revert
    onCommit(trimmed.slice(0, maxLength));
    originalRef.current = trimmed;
  }
  function cancel() {
    skipNextBlurRef.current = true;
    onLivePreview(originalRef.current);
    setDraft(originalRef.current);
  }
  return (
    <input
      type="text"
      value={draft}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={e => { setDraft(e.target.value); onLivePreview(e.target.value); }}
      onKeyDown={e => {
        if (e.key === "Enter") { commit(); (e.target as HTMLInputElement).blur(); }
        if (e.key === "Escape") { cancel(); (e.target as HTMLInputElement).blur(); }
      }}
      onBlur={commit}
      className={className}
    />
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flat PropertiesPanel, implicit sub-groups | Explicit `<CollapsibleSection>` wrappers w/ localStorage | Phase 33 Wave 2 | Users reduce visual load; power users persist their layout. |
| UPPERCASE-everywhere Obsidian CAD | Mixed-case for headers + button labels; UPPERCASE preserved for identifiers + status + unit values | Phase 33 Wave 1 (#83) | Readability up; CAD personality preserved for the 40% of labels that stay UPPERCASE. |
| Arbitrary `px` values scattered in Toolbar/Sidebar/PropertiesPanel | Canonical 4/8/16/24/32 + radius 2/4/8 | Phase 33 Wave 1/3 (#90) | Zero arbitrary values in 4 target files post-phase. |
| Material Symbols everywhere | Dual icon system: MS for CAD glyphs (33 occurrences locked), lucide for new UI chrome | Phase 33 Wave 1 (#83/#90) + Wave 3 (#85/#86) | Professional chrome icons w/o disrupting existing CAD glyphs. |

**Deprecated/outdated:**
- `src/components/Sidebar.tsx:17-42` inline `CollapsibleSection` with `+/−` glyphs — replaced by `src/components/ui/CollapsibleSection.tsx` with lucide chevron. Leave legacy Sidebar one in place until explicit migration task (out of scope for #84 which is PropertiesPanel-only).

## Open Questions

1. **Doc title location (Toolbar vs ProjectManager sidebar input)**
   - What we know: UI-SPEC says Toolbar; codebase has it in ProjectManager sidebar.
   - What's unclear: Whether user wants the project name relocated to the Toolbar header as part of #88, or whether the existing sidebar input just becomes inline-editable with Phase 31 pattern.
   - Recommendation: Plan #88 with Toolbar relocation (matches Pascal, matches UI-SPEC intent). Add a small toolbar center slot showing the project name with inline-edit behavior. Update `ProjectManager.tsx` to remove the input (show read-only name with Save/Load/New buttons).

2. **`_dragActive` exposure mechanism**
   - What we know: selectTool module has `_dragActive` flag (11 refs). cadStore does NOT have it.
   - What's unclear: Whether to (a) add a small uiStore signal + bridge from selectTool (recommended, parallels D-07 existing bridges), or (b) export a subscriber from selectTool module.
   - Recommendation: Add `uiStore.isDragging: boolean` + `setDragging(v)`. Mirror D-07 bridge pattern (like `setSelectToolProductLibrary`).

3. **Whether `<CategoryTabs>` should be headless or styled**
   - What we know: 5 library surfaces each have slightly different category shapes (ProductLibrary uses `PRODUCT_CATEGORIES` constant; WainscotLibrary has style metadata; FramedArt has no categories).
   - What's unclear: Whether `<CategoryTabs>` is worth extracting if 1 of 4 target libraries doesn't need categories.
   - Recommendation: Extract anyway — ProductLibrary, WainscotLibrary, Paint picker all have categories; FramedArt can skip. Shape: `{ id, label, count? }[]`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js + npm | All phase work | ✓ | npm lockfile present | — |
| vitest | Automated validation | ✓ | ^4.1.2 | — |
| @testing-library/react (implicit via test files) | Component tests | ✓ (inferred from existing `*.test.tsx`) | — | — |
| lucide-react | #84/#85/#86/#88 icons | ✗ | — | **BLOCKING — must install. No fallback chosen per D-33 (would mean staying on Material Symbols for chrome, which user already rejected).** |
| tailwindcss | Token emission | ✓ | ^4.2.2 | — |
| fabric | #85 bbox API | ✓ | ^6.9.1 | — |

**Missing dependencies with no fallback:**
- `lucide-react` — Wave 1 Task 0 MUST be `npm install lucide-react`. Without it, #84 (chevron), #85 (Copy/Trash2), #86 (X), #88 (potentially) cannot ship.

**Missing dependencies with fallback:**
- None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.2 + jsdom (inferred from existing `*.test.tsx` setup.ts) |
| Config file | `vitest.config.ts` (not read — assume default + tests/setup.ts) |
| Quick run command | `npm run test:quick` (vitest run --reporter=dot) |
| Full suite command | `npm run test` (vitest run) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GH #83 | Typography tokens present in compiled CSS | integration | `vitest run tests/phase33Tokens.test.ts -t "font-size tokens"` | ❌ Wave 0 |
| GH #83 | Section headers render mixed-case (not UPPERCASE) | unit | `vitest run tests/phase33Typography.test.tsx` | ❌ Wave 0 |
| GH #84 | CollapsibleSection persists open state to localStorage | unit | `vitest run tests/CollapsibleSection.test.tsx` | ❌ Wave 0 |
| GH #84 | CollapsibleSection respects prefers-reduced-motion | unit | same file as above | ❌ Wave 0 |
| GH #85 | Floating toolbar appears on selection, hides on drag | integration | `vitest run tests/FloatingSelectionToolbar.test.tsx` | ❌ Wave 0 |
| GH #85 | Duplicate/Delete buttons wire to cadStore actions (single undo each) | unit | same file | ❌ Wave 0 |
| GH #86 | GestureChip shows 2D copy in 2D mode, 3D copy in 3D | unit | `vitest run tests/GestureChip.test.tsx` | ❌ Wave 0 |
| GH #86 | Dismiss button writes `ui:gestureChip:dismissed=true` to localStorage | unit | same file | ❌ Wave 0 |
| GH #87 | Each rotation chip click pushes exactly one history entry | unit | `vitest run tests/phase33RotationChips.test.tsx` | ❌ Wave 0 |
| GH #87 | Active chip highlights when rotation === preset | unit | same file | ❌ Wave 0 |
| GH #88 | InlineEditableText Enter commits, Escape reverts (Phase 31 invariants) | unit | `vitest run tests/InlineEditableText.test.tsx` | ❌ Wave 0 |
| GH #88 | Doc-title commit calls `projectStore.setActiveName` | integration | same file | ❌ Wave 0 |
| GH #88 | Room-tab commit calls `cadStore.renameRoom` | integration | same file | ❌ Wave 0 |
| GH #89 | LibraryCard renders thumbnail + label, onRemove on hover | unit | `vitest run tests/LibraryCard.test.tsx` | ❌ Wave 0 |
| GH #89 | CategoryTabs sets active correctly | unit | `vitest run tests/CategoryTabs.test.tsx` | ❌ Wave 0 |
| GH #89 | Each migrated library renders same product count pre/post migration | integration (one per library) | `vitest run tests/phase33LibraryMigration.test.tsx` | ❌ Wave 0 |
| GH #90 | Zero `p-[Npx]`, `m-[Npx]`, `rounded-[Npx]` in 4 target files | lint/grep | `bash tests/phase33-no-arbitrary-values.sh` | ❌ Wave 0 |
| GH #90 | MS count in non-D33-allowlist files is zero (no new MS usage) | lint/grep | same script | ❌ Wave 0 |
| useReducedMotion | Hook returns current media-query value, re-renders on change | unit | `vitest run tests/useReducedMotion.test.tsx` | ❌ Wave 0 |
| Visual smoke | Manual UAT per-issue (Jessica) | manual-only | `npm run dev` + HUMAN-UAT.md checklist | N/A (manual) |

**Manual-only justification:** Visual polish (spacing, radii, fonts, chevron position, floating toolbar offset tuning) resists automated assertion. Snapshot tests churn. Per D-38, Jessica is the sole user — HUMAN-UAT.md per issue is the final gate. Automated tests cover behavior (selection, persistence, single-undo, reduced-motion, localStorage keys); visuals are Jessica's sign-off.

### Sampling Rate
- **Per task commit:** `npm run test:quick -- {newTestFile}.test.ts` (single-file subset)
- **Per wave merge:** `npm run test` (full suite green)
- **Phase gate:** Full suite green + per-issue HUMAN-UAT.md filled before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `npm install lucide-react` — WAVE 1 TASK 0 (blocking)
- [ ] `tests/phase33Tokens.test.ts` — validates `@theme` tokens compiled (can read `document.documentElement.style` or computed styles)
- [ ] `tests/phase33Typography.test.tsx` — mixed-case section headers
- [ ] `tests/CollapsibleSection.test.tsx` — persistence + reduced-motion
- [ ] `tests/FloatingSelectionToolbar.test.tsx` — appearance + drag-hide + action wiring
- [ ] `tests/GestureChip.test.tsx` — 2D/3D copy + dismiss
- [ ] `tests/phase33RotationChips.test.tsx` — single-undo per click + active highlight
- [ ] `tests/InlineEditableText.test.tsx` — Phase 31 invariants generalized
- [ ] `tests/LibraryCard.test.tsx` + `tests/CategoryTabs.test.tsx` — shared primitive shape
- [ ] `tests/phase33LibraryMigration.test.tsx` — one test per migrated library (4 libraries)
- [ ] `tests/useReducedMotion.test.tsx` — media-query subscription
- [ ] `tests/phase33-no-arbitrary-values.sh` — grep-based gate for D-35 compliance
- [ ] `tests/setup.ts` — may need `localStorage` mock reset between tests (check existing setup)

**Framework install:** None needed. vitest + React Testing Library already in place per existing `*.test.tsx` files.

## Sources

### Primary (HIGH confidence)
- `src/stores/projectStore.ts` (23 lines — full file read) — confirms `activeName` + `setActiveName` API for #88 doc title
- `src/components/PropertiesPanel.tsx:292-403` — Phase 31 `LabelOverrideInput` reference implementation for #88
- `src/stores/cadStore.ts:340-358, 728-737` — rotation store actions (`rotateProduct` + `*NoHistory` variants) for #87
- `src/components/Toolbar.tsx:1-288` — current toolbar layout, no project-name binding
- `src/components/RoomTabs.tsx:1-64` — full room-tab rendering, `room.name.toUpperCase()` at line 32
- `src/canvas/FabricCanvas.tsx:1-100 + grep` — selectedIds subscription wiring, `_dragActive` scope in selectTool module
- `src/canvas/tools/selectTool.ts` (grep: 11 `_dragActive` refs) — drag state lives here, not cadStore
- `src/index.css:46-48` — current radius tokens (sm 2px, md 4px, lg 6px; UI-SPEC canonicalizes lg → 8px)
- `package.json` — confirms lucide-react NOT installed (CRITICAL), vitest ^4.1.2, fabric ^6.9.1
- grep `material-symbols`: **33 occurrences / 8 files** verified matches D-33 threshold
- grep `toUpperCase`: 13 files with `.toUpperCase()`, 25+ components with `tracking-widest` UPPERCASE styling

### Secondary (MEDIUM confidence)
- Fabric v6 `getBoundingRect()` screen-coords behavior — cross-referenced with existing `src/canvas/wallEndpointSnap.ts` patterns; standard API

### Tertiary (LOW confidence)
- None — all decisions grounded in verified codebase facts or locked UI-SPEC decisions.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — package.json verified; lucide-react gap detected definitively
- Architecture: HIGH — file paths and line numbers verified via Read + Grep
- Pitfalls: HIGH — each pitfall grounded in specific codebase finding (Phase 31 ref, drag-state location, PropertiesPanel structure, doc-title location)
- Validation: MEDIUM — test files named but not yet written; coverage plan is prescriptive

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (30 days — stable codebase, tokens locked by UI-SPEC)
