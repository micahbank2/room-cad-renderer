# Phase 79: Window Presets (WIN-PRESETS-01) — Research

**Researched:** 2026-05-13
**Domain:** CAD chrome (floating switcher) + tool bridge + Opening derivation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Ship 5 named residential presets + Custom:
  | Name | Width (ft) | Height (ft) | Sill (ft) |
  |------|-----------|-------------|-----------|
  | Small | 2 | 3 | 3 |
  | Standard | 3 | 4 | 3 |
  | Wide | 4 | 5 | 3 |
  | Picture | 6 | 4 | 1 |
  | Bathroom | 2 | 4 | 4.5 |
  | Custom | (user input) | (user input) | (user input) |
- **D-02:** Always-visible floating switcher when the Window tool is active. 6 chips. First chip (Small or last-used) auto-selected on tool activation.
- **D-03:** Switcher placement aligns with v1.18 Pascal "floating chrome" — canvas-bottom-center pill or similar. Stays visible across multiple placements.
- **D-04:** Switching a chip while tool is active updates the cursor ghost-preview live (no click-confirm).
- **D-05:** Custom chip expands inline to show three small number inputs: Width / Height / Sill. Ghost updates live as values change. No modal, no second screen.
- **D-06:** Custom inputs default to last-used preset's dimensions.
- **D-07:** PropertiesPanel.OpeningSection shows derived preset label ("Preset: Standard" / "Preset: Custom") plus a switcher control.
- **D-08:** Manual W/H/Sill editing continues to work; derived label updates automatically.
- **D-09:** **No new field on `Opening` type. No snapshot migration.** Catalog lives in `src/lib/windowPresets.ts`. `derivePreset(opening): WindowPresetId | "custom"` lookup on read. Preset switching calls existing `updateOpening` action with new dimensions — no new store action.

### Claude's Discretion
- Exact visual placement of the switcher (canvas-bottom-center pill, sidebar slot, near FloatingToolbar).
- Visual treatment (chips, segmented control, dropdown — all acceptable).
- First-time default: "Small" vs "last-used preset" — last-used is a small UX win.
- How the Custom chip visually expands (inline panel, popover, accordion).
- Preset catalog shape: const array vs typed Record — planner picks cleanest.

### Deferred Ideas (OUT OF SCOPE)
- User-defined preset catalog (Jessica saving custom sizes as named presets) — v1.21+ candidate.
- Door / archway / passthrough / niche presets — window-only this phase.
- Drag-to-size custom flow — rejected for v1.20; possibly with PARAM-01 work later.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WIN-01 | When placing a window, user picks from preset size list (or Custom) rather than typing dimensions manually | Floating switcher (new component) writes selected preset to a module-level bridge in `windowTool.ts`; `onMouseDown` reads from bridge instead of hardcoded `WINDOW_WIDTH`/4/3 (windowTool.ts lines 8, 97–99). Ghost-preview in `updatePreview()` reads same bridge for live updates. |
| WIN-02 | Selected preset is visible and editable in PropertiesPanel after placement; switching to Custom allows free-form dimension input | `PropertiesPanel.OpeningSection.tsx` `OpeningEditor` (lines 67–121) gains a preset row at top of window-type branch. `derivePreset(opening)` from `src/lib/windowPresets.ts` produces the label. Switcher onChange calls existing `updateOpening(wallId, openingId, { width, height, sillHeight })` (cadStore line 439) — single Ctrl+Z entry. Existing W/H/Sill inputs (lines 73–94) continue to work; label auto-derives. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Pattern 5 (tool cleanup closure):** `activateXTool(fc, scale, origin)` returns `() => void`; mutable state lives in closure, NOT module-level (intentional exception D-07: toolbar→tool bridges like `productTool.pendingProductId`, which is the precedent we mirror).
- **Pattern 7 (StrictMode-safe useEffect cleanup):** Any `useEffect` that writes to a module-level registry/bridge MUST return a cleanup with identity-check (`if (reg[id] === currentValue) reg[id] = null`). Phase 64 BUG-04 + Phase 58 onReady precedents.
- **D-15 (lucide-react only):** No Material Symbols. Use lucide icons; substitute with a `// D-15:` comment if no exact match.
- **D-03 (typography):** `font-sans` (Barlow) for chrome labels and chip text; `font-mono` (Geist Mono) only for data identifiers and dynamic CAD strings.
- **D-39 (reduced motion):** Any expand/collapse animation on the Custom chip MUST guard on `useReducedMotion()` and snap when matched.
- **D-09 (UI labels):** Mixed-case for chrome chip labels: "Small", "Standard", "Wide", "Picture", "Bathroom", "Custom" (NOT uppercase).
- **D-13 (squircle):** Chip container and Custom expand panel use `rounded-smooth-md` / `rounded-smooth-lg`.

## Summary

Phase 79 is a thin, additive surface over a well-established pattern. The Window tool already exists (`src/canvas/tools/windowTool.ts`, 124 lines) and follows Pattern 5 cleanup-closure exactly. The PropertiesPanel.OpeningSection already exposes per-opening W/H/Sill inputs with the Phase 31 single-undo `update` + `updateNoHistory` pair. The Opening data model already carries `width` / `height` / `sillHeight` — D-09 means no schema change.

Three new surfaces are added:
1. **`src/lib/windowPresets.ts`** — canonical catalog + `derivePreset(opening)` lookup.
2. **A new floating chrome component** (e.g. `WindowPresetSwitcher.tsx`) that mounts when `activeTool === "window"`, positioned alongside `FloatingToolbar` at canvas-bottom but offset upward so the two surfaces don't overlap.
3. **A module-level preset bridge** in `windowTool.ts` (mirror `productTool.pendingProductId` + `setPendingProduct`).

Plus a small additive row in `PropertiesPanel.OpeningSection.tsx` for the preset label + switcher on window-type openings.

**Primary recommendation:** Mirror `productTool.ts` for the bridge mechanic, mirror `FloatingToolbar` for the chrome mount + visual language, and reuse the existing `Button` primitive for chips (NOT `SegmentedControl` — the Custom chip needs to expand inline, which a `<motion.div>` animated radio group doesn't support cleanly).

## Files This Phase Will Touch

| File | Type | What Changes |
|------|------|-------------|
| `src/lib/windowPresets.ts` | NEW | Catalog (5 presets + types) + `derivePreset(opening): WindowPresetId \| "custom"` |
| `src/canvas/tools/windowTool.ts` | MODIFY | Add module-level `currentWindowPreset` + `setCurrentWindowPreset` (mirror `productTool.pendingProductId` lines 18–24). Replace hardcoded `WINDOW_WIDTH` / `4` / `3` (lines 8, 30, 80, 87, 91, 97–99) with values read from bridge. Add test driver `window.__driveWindowPreset` gated by `import.meta.env.MODE === "test"`. |
| `src/components/WindowPresetSwitcher.tsx` | NEW | Floating chip-row + Custom inline panel. Mounted by `App.tsx` (or `FabricCanvas` wrapper) when `activeTool === "window"`. Writes to bridge via `setCurrentWindowPreset`. Uses `useReducedMotion` for Custom expand. |
| `src/App.tsx` | MODIFY | Add `<WindowPresetSwitcher />` next to `<FloatingToolbar />` (line 263 area), conditionally rendered on `activeTool === "window"`. |
| `src/components/PropertiesPanel.OpeningSection.tsx` | MODIFY | In `OpeningEditor` (lines 67–121), add a preset row at top of window-type branch (i.e., when `opening.type === "window"`). Uses `derivePreset()` to compute the label; switcher chips call `update(wall.id, opening.id, { width, height, sillHeight })`. |
| `tests/windowPresets.test.ts` | NEW | Unit tests for catalog shape + `derivePreset()` |
| `tests/windowTool.preset.test.tsx` | NEW | Integration test exercising `__driveWindowPreset` + window-tool placement using vitest + happy-dom (mirror `phase31Resize.test.tsx` setup) |
| `tests/e2e/specs/window-presets.spec.ts` | NEW | E2E placement flow + PropertiesPanel switcher (Playwright; mirror `preset-toolbar-and-hotkeys.spec.ts`) |

## Standard Stack

No external dependencies — everything needed is already in the project.

### Already Available
| Component | Location | Use For |
|-----------|----------|---------|
| `Button` | `src/components/ui/Button.tsx` | Preset chips (preferred over `SegmentedControl` — see Architecture Patterns) |
| `Input` | `src/components/ui/Input.tsx` | Custom W/H/Sill numeric inputs |
| `useReducedMotion` | `src/hooks/useReducedMotion.ts` | Guard Custom-expand animation (D-39) |
| `springTransition` | `src/lib/motion.ts` | Pascal-aligned `motion/react` spring (matches Phase 33 conventions) |
| `motion/react` (Framer Motion) | dep | `AnimatePresence` + `motion.div` for Custom expand |
| `cn` helper | `src/lib/cn.ts` | Tailwind class composition |
| `useUIStore` | `src/stores/uiStore.ts` | Subscribe to `activeTool` (line 33) so the switcher unmounts when tool changes |
| `useCADStore` | `src/stores/cadStore.ts` | `updateOpening` (line 439) — already supports `{ width, height, sillHeight }` partial |

**Installation:** none. All packages already present.

## Architecture Patterns

### Recommended File Layout
```
src/
├── lib/windowPresets.ts                 # NEW — catalog + derivePreset
├── canvas/tools/windowTool.ts           # MODIFY — bridge + use bridge values
├── components/
│   ├── WindowPresetSwitcher.tsx         # NEW — floating chrome
│   └── PropertiesPanel.OpeningSection.tsx  # MODIFY — preset row for windows
└── App.tsx                              # MODIFY — mount switcher
```

### Pattern 1: Catalog Module (`src/lib/windowPresets.ts`)

```ts
// Recommended shape — array of records, exported types + helper.
export type WindowPresetId = "small" | "standard" | "wide" | "picture" | "bathroom";

export interface WindowPreset {
  id: WindowPresetId;
  label: string;
  width: number;
  height: number;
  sillHeight: number;
}

export const WINDOW_PRESETS: readonly WindowPreset[] = [
  { id: "small",    label: "Small",    width: 2, height: 3, sillHeight: 3 },
  { id: "standard", label: "Standard", width: 3, height: 4, sillHeight: 3 },
  { id: "wide",     label: "Wide",     width: 4, height: 5, sillHeight: 3 },
  { id: "picture",  label: "Picture",  width: 6, height: 4, sillHeight: 1 },
  { id: "bathroom", label: "Bathroom", width: 2, height: 4, sillHeight: 4.5 },
];

// Use a tolerance to absorb float-formatting (e.g., 4.5 from numeric input
// round-tripping through a string draft).
const EPS = 1e-3;
const near = (a: number, b: number) => Math.abs(a - b) < EPS;

export function derivePreset(opening: { width: number; height: number; sillHeight: number }):
  WindowPresetId | "custom" {
  for (const p of WINDOW_PRESETS) {
    if (near(p.width, opening.width) &&
        near(p.height, opening.height) &&
        near(p.sillHeight, opening.sillHeight)) {
      return p.id;
    }
  }
  return "custom";
}
```

**Why this shape:** Array preserves iteration order (matters for chip display); `derivePreset()` returns either the canonical id (so PropertiesPanel can highlight the correct chip) or "custom" (so Custom row shows). Const-array + readonly avoids accidental mutation.

### Pattern 2: Toolbar → Tool Bridge (mirror `productTool.ts` lines 18–34)

```ts
// In windowTool.ts — ADD near top, BEFORE activateWindowTool():

/** Currently selected preset for the next placement. Module-scoped per
 *  CLAUDE.md D-07 — this is the switcher → tool bridge (public API),
 *  not per-activation state. Default "standard" matches the historical
 *  hardcoded 3×4 @ sill 3. */
let currentWindowPreset: { width: number; height: number; sillHeight: number } = {
  width: 3, height: 4, sillHeight: 3,
};

export function setCurrentWindowPreset(p: { width: number; height: number; sillHeight: number }) {
  currentWindowPreset = p;
}

// Inside activateWindowTool — replace hardcoded values:
//   line 30: const halfWin = currentWindowPreset.width / 2;
//   line 80: const hit = findClosestWall(feet, currentWindowPreset.width);
//   line 87: const hit = findClosestWall(feet, currentWindowPreset.width);
//   line 97: width: currentWindowPreset.width,
//   line 98: height: currentWindowPreset.height,
//   line 99: sillHeight: currentWindowPreset.sillHeight,
```

**CRITICAL — Pattern 7 compliance for the switcher useEffect:** The switcher writes to the module-level bridge via a `useEffect`. To survive StrictMode double-mount, the cleanup must NOT clear the bridge on unmount (unmount happens during tool-switch, when the next-activated tool may already be live). Instead, the bridge defaults to "standard" at module load and is overwritten each time the switcher re-mounts. Identity-check cleanup applies to the test-driver install, not to the bridge itself (matches `productTool.ts` lines 246–252).

### Pattern 3: Floating Chrome Mount

Look at `src/App.tsx` lines 260–264:
```tsx
<div className="flex-1 h-full relative">
  <FabricCanvas productLibrary={productLibrary} />
  <FloatingToolbar viewMode={viewMode} onViewChange={setViewMode} />
  {/* WindowPresetSwitcher goes here, sibling of FloatingToolbar */}
</div>
```

`FloatingToolbar` is positioned at canvas-bottom-center via fixed/absolute classes inside its own component. The `WindowPresetSwitcher` should sit slightly above `FloatingToolbar` (e.g., `bottom-20` if FloatingToolbar is `bottom-4`) so they don't overlap, and it conditionally renders only when `activeTool === "window"`.

### Pattern 4: Chip Component (use `Button`, NOT `SegmentedControl`)

`SegmentedControl` (src/components/ui/SegmentedControl.tsx) uses a sliding `motion.div` layoutId pill and assumes equal-width segments. The Custom chip needs to expand inline to reveal three numeric inputs — that breaks the equal-width assumption. Use a row of `<Button variant="ghost" size="sm">` with manual active-state styling: `bg-accent/10 ring-1 ring-accent/40` matches Phase 74 FloatingToolbar.

### Pattern 5: Single-Undo for Preset Switching in PropertiesPanel

Mirror existing rows in `OpeningEditor` (lines 73–94): preset chips in PropertiesPanel call `update(wall.id, opening.id, { width: P.width, height: P.height, sillHeight: P.sillHeight })` (the **commit** action, not `updateNoHistory`). One chip click = one undo entry. Existing `updateOpening` (cadStore.ts line 439) is sufficient — D-09 confirms no new action needed.

### Anti-Patterns to Avoid
- **Don't add `presetId` to `Opening`** — D-09 locks "derive on read." Even tempting cases (multiple presets with identical dimensions in some future taxonomy) don't justify it.
- **Don't write a snapshot migration** — D-09 also locks zero migration cost. Existing windows naturally derive to "standard" (3/4/3) or "custom" — both correct.
- **Don't put the catalog inside `windowTool.ts`** — PropertiesPanel needs the same catalog; share via `src/lib/windowPresets.ts`.
- **Don't use `SegmentedControl`** — see Pattern 4 rationale.
- **Don't clear the preset bridge on switcher unmount** — see Pattern 2 / Pitfall 1.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Window placement event handling | New mouse handlers | Existing `windowTool.activateWindowTool` | Already handles Fabric mouse events, snap-to-wall, ghost preview, Escape cancel, auto-revert to select |
| Numeric input with single-undo commit | New input component | Phase 31 `NumericRow` pattern from `PropertiesPanel.OpeningSection.tsx` lines 123–187 | Already implements `onPreview` (live ghost via `updateNoHistory`) + `onCommit` (single undo entry); proven across 5+ Phase 61 fields |
| Floating chrome positioning | New CSS layout | Mirror `FloatingToolbar.tsx` | Already establishes the Pascal canvas-bottom-center pill aesthetic + Tooltip wiring |
| Reduced-motion guarding | New media-query hook | `useReducedMotion()` from `src/hooks/useReducedMotion.ts` | Already used by `SegmentedControl`, `WallCutoutsDropdown`, `FloatingToolbar` |
| Tool cleanup contract | New cleanup framework | `() => void` return from `activate*Tool` | Pattern 5 — `windowTool.ts` already conforms; the bridge addition doesn't break it |

## Runtime State Inventory

This is NOT a rename/refactor phase — it's an additive feature. Inventory check confirmed:
- Stored data: None — D-09 mandates zero migration; existing Opening records derive correctly with no changes.
- Live service config: None — local-first app, no external services.
- OS-registered state: None.
- Secrets/env vars: None.
- Build artifacts: None — TypeScript additions only.

**Nothing found in any category — verified by D-09 locked decision (no schema change, no migration).**

## Common Pitfalls

### Pitfall 1: StrictMode Double-Mount Clobbering the Bridge

**What goes wrong:** Switcher mounts, writes `currentWindowPreset = small`. StrictMode unmounts. If the unmount cleanup clears the bridge, then re-mount writes the bridge again — but in between, the tool may have read a stale (or default) value.

**Why it happens:** Pattern 7 — React StrictMode (active in dev via `src/main.tsx`) double-mounts components. Effect-write-then-cleanup-clear races with the live tool's reads.

**How to avoid:** Don't clear the bridge on unmount. The bridge defaults to "standard" at module load. Each mount of the switcher writes the current selection synchronously (during render, not in `useEffect`) via a `useLayoutEffect` or simply by calling `setCurrentWindowPreset` in the chip onClick handler directly. Add an identity-check cleanup ONLY for the test-driver install, mirroring `productTool.ts` lines 246–252.

**Warning signs:** First placement after activating Window tool uses 3/4/3 instead of the user's selection; placements after a 2D↔3D toggle silently regress to defaults.

### Pitfall 2: Ghost Preview Doesn't Update on Chip Change

**What goes wrong:** User clicks "Wide" chip; ghost preview at cursor still shows 3ft-wide rectangle until they move the mouse.

**Why it happens:** `windowTool.updatePreview()` is only called from `onMouseMove`. Changing the bridge doesn't trigger a redraw.

**How to avoid:** Two options — (a) when the switcher writes to the bridge, also call a public `windowTool.refreshPreview()` that re-runs the last `updatePreview()` with cached pointer state; or (b) skip explicit refresh and accept that the ghost updates on next mousemove (the user is almost certainly about to move the cursor anyway). **Recommend option (b)** — simpler, no new public API surface, behavior matches what users do naturally. Validate during UAT.

**Warning signs:** UAT feedback "the size didn't change until I moved the mouse" — if reported, retrofit option (a).

### Pitfall 3: Hardcoded WINDOW_WIDTH Leaks Through `findClosestWall` Tolerance

**What goes wrong:** `findClosestWall(feet, WINDOW_WIDTH)` (windowTool.ts lines 80, 87) uses the width as a snap tolerance. With Wide (4ft) or Picture (6ft), the tolerance becomes larger — placements near walls more aggressively snap to a wall.

**Why it happens:** Phase 30 smart-snap uses width as a half-extent for wall-hit testing.

**How to avoid:** Pass `currentWindowPreset.width` consistently. The behavior change (wider window → wider snap radius) is geometrically correct and matches how doors already work — verify with a quick e2e placement test for Picture (6ft) at a wall corner. No code change required beyond using the bridge value.

**Warning signs:** Picture window can't be placed near corners; placements that worked at 3ft fail at 6ft.

### Pitfall 4: Custom Inputs and Preset-Derivation Round-Trip

**What goes wrong:** User picks Custom, types W=3, H=4, Sill=3. `derivePreset()` returns "standard" because dimensions match. PropertiesPanel shows "Preset: Standard" even though the user explicitly chose Custom.

**Why it happens:** D-09 derives on read with no stored state. This is the **intentional** semantic quirk from CONTEXT.md `<specifics>` ("Custom 3/4/3 gets labeled Standard").

**How to avoid:** Don't try to avoid — this is intended behavior. Verify during UAT.

### Pitfall 5: Reduced-Motion Failure on Custom Expand

**What goes wrong:** Custom chip expands with a smooth height animation; users with `prefers-reduced-motion: reduce` still see the animation.

**Why it happens:** Forgetting D-39.

**How to avoid:** Guard the `motion.div` expand on `useReducedMotion()` — when true, render the expanded panel synchronously with no transition (mirror `SegmentedControl.tsx` lines 60–62 pattern).

## Code Examples

### Bridge mirror — `windowTool.ts` modification

```ts
// At top of src/canvas/tools/windowTool.ts, AFTER imports:

/** Phase 79 WIN-PRESETS-01: switcher → tool bridge (CLAUDE.md D-07 exception
 *  parallel to productTool.pendingProductId). The switcher writes the active
 *  preset; the tool reads on every mousemove + mousedown. */
let currentWindowPreset: { width: number; height: number; sillHeight: number } = {
  width: 3, height: 4, sillHeight: 3,
};

export function setCurrentWindowPreset(p: {
  width: number; height: number; sillHeight: number;
}): void {
  currentWindowPreset = { ...p };
}

export function getCurrentWindowPreset(): {
  width: number; height: number; sillHeight: number;
} {
  return currentWindowPreset;
}
```

### Test driver — mirror Phase 31 `__driveResize` pattern

```ts
// Inside activateWindowTool, after the existing event registrations:
if (import.meta.env.MODE === "test") {
  const driveHook = (presetIdOrCustom: string | {
    width: number; height: number; sillHeight: number
  }) => {
    if (typeof presetIdOrCustom === "string") {
      // Resolve by id from catalog
      const p = WINDOW_PRESETS.find((x) => x.id === presetIdOrCustom);
      if (p) setCurrentWindowPreset({
        width: p.width, height: p.height, sillHeight: p.sillHeight,
      });
    } else {
      setCurrentWindowPreset(presetIdOrCustom);
    }
  };
  (window as unknown as { __driveWindowPreset?: typeof driveHook }).__driveWindowPreset = driveHook;
  // ... return cleanup that does identity-check delete
}
```

## State of the Art

No state-of-the-art ecosystem to research — this is internal pattern reuse. The relevant precedents within the codebase:

| Pattern | Source Phase | File Reference |
|---------|--------------|----------------|
| Module-level toolbar→tool bridge | Phase 30 PROD-08 | `src/canvas/tools/productTool.ts` lines 18–34 |
| Floating chrome canvas-bottom-center | Phase 74 TOOLBAR-REWORK | `src/components/FloatingToolbar.tsx` lines 1–48 |
| Phase 31 single-undo `update` + `updateNoHistory` pair | Phase 31 EDIT-22 | `PropertiesPanel.OpeningSection.tsx` lines 67–121 |
| `__driveX` test driver gated by `import.meta.env.MODE === "test"` | Phase 31 | `productTool.ts` lines 168–236 |
| StrictMode-safe useEffect identity-check cleanup | Phase 64 BUG-04 | CLAUDE.md Pattern 7 |
| `useReducedMotion()` guard on animations | Phase 33 D-39 | `src/components/ui/SegmentedControl.tsx` line 32 |

## Open Questions

1. **Should the switcher store last-used preset in `uiStore` or in `localStorage`?**
   - What we know: D-06 says Custom defaults pre-fill from last-used; D-02 says first-time chip can be last-used.
   - What's unclear: persistence across page reloads vs in-memory only.
   - Recommendation: **In-memory only** for v1.20. Initialize bridge default to "standard". If Jessica asks for cross-reload memory, add a 1-line localStorage write later. Keeps scope tight.

2. **Should the switcher hide when Window tool deactivates, or animate out?**
   - What we know: D-02 says "always-visible when window tool is active."
   - What's unclear: hard mount/unmount vs `AnimatePresence` fade.
   - Recommendation: Use `AnimatePresence` with `springTransition(reduced)` to match the PropertiesPanel slide pattern from App.tsx lines 265–278.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| React 18 | Component | ✓ | 18.3.1 | — |
| Fabric.js | Window tool | ✓ | 6.9.1 | — |
| Zustand | Stores | ✓ | 5.0.12 | — |
| motion/react | Custom-expand animation | ✓ | (installed; used by SegmentedControl) | CSS transitions |
| lucide-react | Chip icons (if any) | ✓ | (installed) | — |
| Tailwind v4 | Styling | ✓ | 4.2.2 | — |

All available, no version concerns.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Unit framework | vitest + happy-dom (existing in `tests/`) |
| E2E framework | Playwright (existing in `tests/e2e/specs/`) |
| Config file | `vite.config.ts` (vitest), `playwright.config.ts` (e2e) |
| Quick run command | `npm run test -- windowPresets` |
| Full suite command | `npm run test && npm run test:e2e` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| WIN-01 | Preset catalog produces correct widths/heights/sills | unit | `npm run test -- windowPresets.test` | ❌ Wave 0 |
| WIN-01 | `derivePreset()` returns id for exact match, "custom" otherwise | unit | `npm run test -- windowPresets.test` | ❌ Wave 0 |
| WIN-01 | Clicking chip writes bridge; `addOpening` uses bridge values on click | integration | `npm run test -- windowTool.preset.test` | ❌ Wave 0 |
| WIN-01 | Custom chip W/H/Sill inputs flow through to `addOpening` | integration | `npm run test -- windowTool.preset.test` | ❌ Wave 0 |
| WIN-01 | E2E: select Window tool → pick "Wide" chip → click wall → 4ft window appears | e2e | `npx playwright test window-presets` | ❌ Wave 0 |
| WIN-02 | PropertiesPanel shows derived label "Preset: Standard" for 3/4/3 window | integration | `npm run test -- windowTool.preset.test` | ❌ Wave 0 |
| WIN-02 | Switching preset chip in PropertiesPanel updates Opening dimensions in one undo entry | integration | `npm run test -- windowTool.preset.test` | ❌ Wave 0 |
| WIN-02 | Manual edit of W in PropertiesPanel re-derives label to "Custom" | integration | `npm run test -- windowTool.preset.test` | ❌ Wave 0 |
| WIN-02 | E2E: place window → open PropertiesPanel → click "Wide" preset → window resizes | e2e | `npx playwright test window-presets` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test -- windowPresets windowTool.preset`
- **Per wave merge:** `npm run test && npx playwright test window-presets`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/windowPresets.test.ts` — catalog shape + `derivePreset()` coverage
- [ ] `tests/windowTool.preset.test.tsx` — bridge + driver + PropertiesPanel preset row (vitest + happy-dom; mirror `phase31Resize.test.tsx`)
- [ ] `tests/e2e/specs/window-presets.spec.ts` — full placement + PropertiesPanel switch flow (Playwright; mirror `preset-toolbar-and-hotkeys.spec.ts`)
- [ ] Test driver `window.__driveWindowPreset` installed in `windowTool.ts` (gated by `import.meta.env.MODE === "test"`)

## Sources

### Primary (HIGH confidence)
- `src/canvas/tools/windowTool.ts` (lines 1–124) — current tool implementation
- `src/canvas/tools/productTool.ts` (lines 18–34, 168–236) — bridge + test driver precedent
- `src/components/PropertiesPanel.OpeningSection.tsx` (lines 67–187) — Phase 31 single-undo pattern
- `src/components/FloatingToolbar.tsx` (lines 1–80) — Pascal floating chrome aesthetic
- `src/components/ui/SegmentedControl.tsx` — `useReducedMotion()` guard pattern
- `src/stores/cadStore.ts` (lines 439–502) — `updateOpening` signature confirmed
- `src/types/cad.ts` (lines 92–105, 391–414) — Opening interface + defaults
- `CLAUDE.md` — Pattern 5 (closure cleanup), Pattern 7 (StrictMode), D-09/D-13/D-15/D-39

### Secondary (MEDIUM confidence)
- `tests/phase31Resize.test.tsx` — vitest + happy-dom integration test setup
- `tests/e2e/specs/preset-toolbar-and-hotkeys.spec.ts` — e2e flow naming convention

### Tertiary (LOW confidence)
- None — all findings verified against source.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already in project
- Architecture: HIGH — direct mirror of `productTool.ts` bridge pattern
- Pitfalls: HIGH — derived from documented CLAUDE.md patterns + Phase 64 precedent
- Test surface: HIGH — vitest + Playwright e2e structure already exists

**Research date:** 2026-05-13
**Valid until:** 2026-06-13 (30 days — codebase patterns stable)
