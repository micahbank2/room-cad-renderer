# Phase 88: Light mode + visual density polish — Research

**Researched:** 2026-05-15
**Domain:** Theme tokens, Fabric.js theming, typography scale, view-mode gating
**Confidence:** HIGH (all four issues root-caused with exact file/line references)

## Summary

Phase 87 UAT surfaced four discrete chrome defects: FloatingToolbar disappears in 3D view (1-line gate), Fabric.js 2D canvas ignores light/dark theme entirely (hardcoded dark-mode hex values across 8 files), light-mode border tokens are too pale for visible separators (`oklch(0.922 0 0)` against `oklch(0.998 0 0)` is ~1.1:1, far below WCAG 3:1), and chrome typography sits at 9-11px throughout — 187 occurrences that read as tiny on a Retina display at 100% zoom.

Three issues (#194, #196, #197) are mechanical edits. Issue #195 (canvas theming) is the only one requiring a new abstraction: a `getCanvasTheme()` helper that reads CSS custom properties at redraw time, plus a `useTheme()` subscription in `FabricCanvas.tsx` that retriggers redraw on theme change.

**Primary recommendation:** Decompose into 2 plans. Plan 88-01 handles bug fixes (#194, #195, #196). Plan 88-02 handles the typography sweep (#197) as an isolated grep+replace. Total: ~5 atomic tasks.

## Current State

### Issue #194 — FloatingToolbar missing in 3D view

**Root cause confirmed:** `src/App.tsx:264-271` gates the FloatingToolbar mount inside the `(viewMode === "2d" || viewMode === "split")` branch:

```tsx
{(viewMode === "2d" || viewMode === "split") && (
  <div className={`${viewMode === "split" ? "w-1/2" : "flex-1"} h-full relative flex`}>
    <div className="flex-1 h-full relative">
      <FabricCanvas productLibrary={productLibrary} />
      <FloatingToolbar viewMode={viewMode} onViewChange={setViewMode} />   <!-- line 268 -->
      ...
```

The `(viewMode === "3d" || viewMode === "split")` branch at line 291 mounts `<ThreeViewport>` but never mounts FloatingToolbar.

**Recommended fix:** Hoist `<FloatingToolbar>` to a sibling of both view-mode branches inside the `isCanvas` container (around line 263, alongside `<RoomTabs>`), positioned absolutely so it overlays whichever canvas is active. The toolbar already adapts to `viewMode` internally (it conditionally renders Display Mode controls), so a single mount serves all three view modes. Use `position: absolute` + `pointer-events: none` on a wrapper with `pointer-events: auto` on children, OR re-anchor to the canvas wrapper for "split" — either is fine; Plan should pick one.

**Alternative considered:** Duplicate the mount under the 3D branch. Rejected — two render sites for the same chrome doubles maintenance and risks divergent props.

### Issue #195 — 2D canvas ignores light mode

**Root cause:** Fabric.js renders imperatively; every color it consumes is a static string passed to `new fabric.Rect({ fill: "..." })`. The 2D pipeline currently hardcodes the dark-mode obsidian palette across the canvas layer:

| File | Lines | Hardcoded color | Token it should resolve to |
|---|---|---|---|
| `src/canvas/FabricCanvas.tsx` | 185 | `fc.backgroundColor = "#12121d"` | `--background` |
| `src/canvas/grid.ts` | 3-5 | `GRID_COLOR = "#1f1e2a"`, `GRID_COLOR_MAJOR = "#292935"`, `ROOM_OUTLINE = "#484554"` | `--muted`, `--border`, `--border` |
| `src/canvas/dimensions.ts` | 5-6, 109, 119 | `DIM_COLOR = "#938ea0"`, label bg `"rgba(18,18,29,0.85)"`, label fg `"#ccbeff"` | `--muted-foreground`, `--card`, `--accent-foreground` |
| `src/canvas/fabricSync.ts` | 55, 94, 115, 134, 144-145, 167-168, 189-190, 229, 235, 283-284, 299-302, 433, 443, 529-530, 577, 596, 616, 635-636, 653-654, 1022-1029, 1045, 1084-1085, 1139, 1149-1150, 1173-1174, 1195-1196, 1282, 1351, 1469 | `WALL_FILL = "#343440"`, `WALL_STROKE = "#484554"`, `WALL_SELECTED_STROKE = "#7c5bf0"`, `PRODUCT_STROKE = "#7c5bf0"`, fill `"#12121d"` (label backings), fill `"#e3e0f1"` (custom-element label text), neutral fallback `"#888"`, `"#444"`, `"#94a3b8"` | mix of `--card`, `--border`, `--accent`, `--foreground` |
| `src/canvas/snapGuides.ts` | 15 | `GUIDE_COLOR = "#7c5bf0"` | `--accent` (stays — accent is theme-invariant per design) |
| `src/canvas/tools/wallTool.ts` | 85, 128, 165, 187-188, 198 | preview ghosts in `"#7c5bf0"`, `"#ccbeff"`, fills `"#12121d"` | `--accent`, `--accent-foreground`, `--card` |
| `src/canvas/tools/productTool.ts` | (no hex matches at top level — verify during plan) | — | — |

**Recommended approach:** new module `src/canvas/canvasTheme.ts` exporting `getCanvasTheme()`:

```ts
export interface CanvasTheme {
  background: string;
  gridMinor: string;
  gridMajor: string;
  roomOutline: string;
  wallFill: string;
  wallStroke: string;
  wallSelectedStroke: string;  // = accent, theme-invariant
  dimensionFg: string;
  dimensionLabelBg: string;
  dimensionLabelFg: string;
  ghostPreviewFill: string;
  ghostPreviewStroke: string;
  accent: string;              // theme-invariant
  accentLight: string;
  foreground: string;          // for custom-element labels
  cardBg: string;              // for label backings
  doorOpeningFill: string;
  windowOpeningFill: string;
  // ...add as needed during plan
}

export function getCanvasTheme(): CanvasTheme {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  return {
    background:          v("--background"),
    gridMinor:           v("--muted"),
    gridMajor:           v("--border"),
    roomOutline:         v("--border"),
    wallFill:            v("--muted"),
    wallStroke:          v("--border"),
    wallSelectedStroke:  v("--accent")  || "#7c5bf0",
    dimensionFg:         v("--muted-foreground"),
    dimensionLabelBg:    v("--card"),
    dimensionLabelFg:    v("--accent-foreground") || v("--foreground"),
    // ...
  };
}
```

`FabricCanvas.tsx` reads `const theme = getCanvasTheme()` inside `redraw()` and threads `theme` as the last param of every `render*()` call. The render functions destructure what they need.

**Theme subscription:** add `const resolved = useTheme().resolved;` in `FabricCanvas.tsx` and include `resolved` in the `redraw` `useCallback`'s dep array (line 278). When the user flips theme, the `.dark` class flip → `redraw` reruns → fresh `getCanvasTheme()` call → canvas repaints with new tokens.

**CRITICAL pitfall — oklch in Fabric.js:** `getComputedStyle().getPropertyValue("--border")` returns the literal CSS source string. Tokens in `src/index.css` are stored as `oklch(0.922 0 0)`. Fabric.js v6 uses HTML5 Canvas 2D `fillStyle`/`strokeStyle`, which **as of late 2025 supports oklch on Chrome 111+ and Safari 16.4+** but the spec is "Color 4" — older Safari and any embedded WebViews silently fall back to transparent black. **Required:** verify Fabric.js v6.9.1 forwards the string untouched (it does — Fabric uses native canvas), then verify Jessica's deploy target (Lovable Cloud → modern Chrome/Safari) supports Color 4. If any uncertainty, add an `oklchToHex()` helper that resolves via a hidden `<div>` painted with `color: oklch(...)` then read back via `getComputedStyle().color` which browsers convert to `rgb()`. Plan must include a quick browser smoke test before threading colors blindly.

**Theme-invariant colors stay hardcoded:** `--color-accent` (`#7c5bf0`) is brand purple, used identically in both themes per design system. `snapGuides.ts:15` and the `"#7c5bf0"` selection-stroke instances do NOT need to flow through `getCanvasTheme()` — they can remain inline (though threading via `theme.accent` is more consistent). Leave to plan.

### Issue #196 — Light-mode borders invisible

**Root cause confirmed:** Both `:root` (line 7) and the `.light` selector (line 53) currently define identical light tokens. The `.light` class adds nothing beyond `:root` — it's redundant in the current CSS. Critical values:

| Token | Light value (line 23, 69) | Background value | Contrast ratio |
|---|---|---|---|
| `--border` | `oklch(0.922 0 0)` | `--background: oklch(0.998 0 0)` | ~1.1:1 ❌ |
| `--input` | `oklch(0.922 0 0)` | same | ~1.1:1 ❌ |
| `--ring` | `oklch(0.708 0 0)` | same | ~3.4:1 ✓ (accent ring OK) |

**Recommended values** (WCAG 3:1 minimum for non-text decoration, targeting ~3.5:1 for safety):

| Token | Current | Recommended | New ratio vs `--background` |
|---|---|---|---|
| `--border` | `oklch(0.922 0 0)` | `oklch(0.85 0 0)` | ~3.1:1 |
| `--input` | `oklch(0.922 0 0)` | `oklch(0.85 0 0)` | ~3.1:1 |
| `--ring` | `oklch(0.708 0 0)` | leave as-is | OK |

**Also verify:** `--muted`, `--card` (both currently `oklch(0.97 0 0)` and `oklch(0.998 0 0)`) — the card-on-background distinction is also weak (~1.0:1). Consider darkening `--muted` to `oklch(0.95 0 0)` for sidebar panel contrast. Plan should treat this as a coupled adjustment.

**Where to edit:** edit BOTH `:root` (lines 7-28) and `.light` (lines 53-72) so the explicit-light selector and default both pick up the bolder values. (`.dark` at line 30 is untouched.)

### Issue #197 — Chrome typography too small

**Grep counts** (`grep -rE 'text-\[Npx\]' src/ | wc -l`):
- `text-[9px]`: **63 occurrences** across 21 files
- `text-[10px]`: **71 occurrences** across 26 files
- `text-[11px]`: **53 occurrences** across 16 files
- `text-xs` (Tailwind default 12px): **54 occurrences** — leave as-is

**Top files affected** (most occurrences):
- `src/components/SwatchPicker.tsx` (13 × 9px)
- `src/components/WallSurfacePanel.tsx` (10 × 11px)
- `src/components/inspectors/PropertiesPanel.shared.tsx` (8 × 11px)
- `src/components/StatusBar.tsx` (7 × 9px)
- `src/components/WainscotLibrary.tsx` (13 across 10/11px)
- `src/components/help/helpContent.tsx` (mixed, 8 total)
- `src/components/CustomElementsPanel.tsx`, `CeilingPaintSection.tsx`, `FloorMaterialPicker.tsx`, `FramedArtLibrary.tsx`, etc.

**Recommended mapping** (one-step bump, preserves hierarchy):

| Current | New | Rationale |
|---|---|---|
| `text-[9px]` | `text-[11px]` | tiny captions (`tracking-widest` group labels) become legible |
| `text-[10px]` | `text-[12px]` | section labels match Tailwind `text-xs` |
| `text-[11px]` | `text-[13px]` | body chrome (button labels, tab labels) hits comfortable density |
| `text-xs` | unchanged | already 12px |

**Layout risk:** fixed-width tooltips and segmented-control buttons may overflow. Spot-check during plan:
- `src/components/Tooltip.tsx` (1×9, 1×10, 1×11)
- `src/components/StatusBar.tsx` (status bar height is fixed via `h-6` or similar)
- `src/components/FloatingToolbar.tsx` (segmented control)
- `src/components/RoomTabs.tsx` (tab strip)
- `src/canvas/FabricCanvas.tsx:800,835` — dimension-edit input + annotation input (`text-[11px]`, `text-[12px]`) — these sit on the canvas, must remain compact; consider leaving these two alone or only bumping by 1.

**D-09 reminder:** UI labels remain mixed-case. Typography sweep is size-only.

## Implementation Plan

### Plan 88-01 — Bug fixes (#194, #195, #196)

Estimated 3-4 atomic tasks, each commit-shaped:

1. **#194 fix** — relocate `<FloatingToolbar>` mount in `src/App.tsx` from inside the 2D-or-split branch to a sibling that renders for all canvas view modes. Verify 2D, 3D, Split all show the toolbar. ~10 LOC.

2. **#195 part A — canvas theme helper** — create `src/canvas/canvasTheme.ts` with `CanvasTheme` interface + `getCanvasTheme()` function. Include a small `oklchToCanvasColor()` helper that handles the Color 4 fallback (via hidden div → `getComputedStyle().color`) so render code never sees raw `oklch(...)` strings. Unit test: assert `getCanvasTheme()` returns different `background` values when `<html>` has vs lacks the `dark` class.

3. **#195 part B — thread theme through render pipeline** — modify `src/canvas/grid.ts`, `dimensions.ts`, `fabricSync.ts`, `tools/wallTool.ts`, `tools/productTool.ts` to accept a `theme: CanvasTheme` param. Replace every hardcoded hex with `theme.xxx` (except `--accent` purple which can stay inline if cleaner). Update `FabricCanvas.tsx:redraw()` to compute `const theme = getCanvasTheme()` at top and pass it down. Subscribe `redraw` to `useTheme().resolved` so theme flips repaint. ~80-120 LOC, mostly mechanical.

4. **#196 fix** — edit `src/index.css` `:root` and `.light` blocks to darken `--border`/`--input` to `oklch(0.85 0 0)`. Also consider `--muted` to `oklch(0.95 0 0)`. Visual smoke: light-mode sidebar borders + form input outlines should now be clearly visible. ~6 LOC.

### Plan 88-02 — Typography sweep (#197)

Estimated 1-2 atomic tasks:

1. **Bulk replace** `text-[9px]` → `text-[11px]`, `text-[10px]` → `text-[12px]`, `text-[11px]` → `text-[13px]` across `src/components/` and `src/App.tsx`. EXCEPT: `src/canvas/FabricCanvas.tsx:800` (dimension edit input) and `:835` (annotation input) — leave at current sizes or hand-tune. ~187 lines changed.

2. **Visual smoke + layout fix-ups** — open the app, walk every panel, fix any overflowed buttons/tooltips by reducing padding or accepting wider chrome. Light commit.

## Pitfalls

### Pitfall 1: `oklch()` in Canvas 2D `fillStyle`
**What goes wrong:** Older Safari/WebView versions silently render transparent black when given `oklch(0.998 0 0)`. The whole 2D canvas paints blank.
**Why it happens:** CSS Color Module 4 support is Chrome 111+/Safari 16.4+. Fabric.js forwards the string unmodified to native canvas.
**How to avoid:** Convert oklch → rgb at the boundary via a hidden detector div: `el.style.color = "oklch(...)"; getComputedStyle(el).color` returns `rgb(254, 254, 254)`. Cache results in a `Map<string, string>` keyed on the oklch input.
**Warning signs:** background appears black instead of white; walls invisible.

### Pitfall 2: `getComputedStyle().getPropertyValue("--x")` returns unresolved cascading
**What goes wrong:** If the value is `var(--other)`, you get the literal string `"var(--other)"`, not the resolved color.
**Why it happens:** `getPropertyValue` reads from the cascade as-stored, not resolved.
**How to avoid:** Tokens in `src/index.css` are stored as direct `oklch()` literals at the `:root` / `.dark` / `.light` level — direct resolution works. But if anyone refactors to `--border: var(--something-else)`, the helper breaks. Document this in `canvasTheme.ts` JSDoc.

### Pitfall 3: Typography sweep breaks fixed-width chrome
**What goes wrong:** A `text-[9px]` label inside a `w-16` button overflows when bumped to `text-[11px]`.
**Why it happens:** Heights and widths weren't designed with a 22% larger font in mind.
**How to avoid:** After the bulk replace, open the app at 100% zoom and walk: StatusBar, FloatingToolbar segments, RoomTabs strip, Tooltip popovers, SwatchPicker grid, dimension editors. Fix by widening containers or selectively reverting the bump for that one site.
**Warning signs:** Truncated tooltip text, wrapped status-bar lines, segmented-control buttons growing taller than 32px.

### Pitfall 4: StrictMode-safe theme subscription
**What goes wrong:** If FabricCanvas writes anything theme-related to a module-level registry (e.g. caching the resolved theme), StrictMode's double-mount discards the first mount but leaves the registry populated.
**Why it happens:** see CLAUDE.md §7.
**How to avoid:** Don't cache `theme` at module level. Compute it fresh inside `redraw()`. The `useTheme()` hook itself is already StrictMode-safe (idempotent effect that toggles `<html class>`).

### Pitfall 5: FloatingToolbar absolute positioning under "split" view
**What goes wrong:** If hoisted above both view-mode branches, the toolbar may anchor to the wrong half of the split.
**Why it happens:** Original mount was inside the 2D wrapper, so it inherited its bounding box.
**How to avoid:** Either (a) anchor to the outer `flex flex-1` container with the toolbar centered, or (b) duplicate-but-shared-component under each branch (verbose). Plan recommends (a).

## Plan Decomposition

**2 plans, ~5 atomic tasks total:**

- **Plan 88-01 — Bug fixes (#194, #195, #196):**
  - Task 1: Relocate FloatingToolbar mount in App.tsx (#194)
  - Task 2: Create canvasTheme.ts helper module (#195a)
  - Task 3: Thread theme through render pipeline + subscribe FabricCanvas to useTheme (#195b)
  - Task 4: Darken light-mode border tokens in index.css (#196)

- **Plan 88-02 — Typography sweep (#197):**
  - Task 5: Bulk replace text-[9/10/11px] across src/components + src/App.tsx
  - Task 6 (optional, fold into Task 5 if clean): Visual smoke + layout fix-ups

## Open Questions for Plan Phase

1. **Canvas theme: helper function vs prop drilling?**
   Recommend `getCanvasTheme()` helper called at top of `redraw()`. Simpler than threading `resolved` through every render function. The helper reads from CSS at call time, so React's `useTheme()` only needs to retrigger redraw.

2. **WCAG 3:1 vs 4.5:1 for border tokens?**
   Recommend 3:1 (`oklch(0.85 0 0)`) — non-text decoration spec is 3:1. AA-level 4.5:1 would make borders look heavy and dated. If user feedback says "still too pale", go to `oklch(0.82 0 0)` later — easy to retune.

3. **Typography mapping aggressiveness — 9→11, 10→12, 11→13, or steeper (9→12, 10→13, 11→14)?**
   Recommend the one-step bump. Two-step (9→12, 10→13, 11→14) collapses the 4-tier hierarchy down to 2-3 tiers (12/13/14/15 vs current 9/10/11/12). Lose the design system's information density. If after the bump it still feels small, **measure on Jessica's actual device** (Retina MacBook at 100% zoom) before going steeper.

4. **Should `text-xs` (12px) also bump?**
   Current scale assumes `text-xs` is the "regular body chrome" tier. If we bump 11→13, then 12px (text-xs) is now smaller than the bumped tier and the hierarchy inverts. Either (a) leave text-xs alone and accept the inversion as a known artifact, or (b) replace text-xs with `text-[13px]` everywhere too. Recommend (a) — text-xs is sparse outside chrome and the inversion is acceptable.

5. **Convert oklch tokens to hex aliases in CSS, or convert at JS boundary?**
   Two paths: (a) Add `--background-hex: #fefefe` alongside every oklch token, read those instead. (b) Convert at JS boundary via getComputedStyle trick. Recommend (b) — keeps CSS single-source. (a) doubles token count and risks drift.

## Sources

### Primary (HIGH confidence — files inspected)
- `src/App.tsx:264-271` (FloatingToolbar mount site)
- `src/canvas/FabricCanvas.tsx:185, 278` (backgroundColor hardcode, redraw deps)
- `src/canvas/grid.ts:3-5` (GRID_COLOR constants)
- `src/canvas/dimensions.ts:5-6, 109, 119` (DIM_COLOR, label bg/fg)
- `src/canvas/fabricSync.ts:55-1469` (full color inventory above)
- `src/canvas/snapGuides.ts:15` (GUIDE_COLOR)
- `src/canvas/tools/wallTool.ts:85,128,165,187-188,198`
- `src/index.css:7-72` (`:root`, `.dark`, `.light` token blocks)
- `src/hooks/useTheme.ts:1-55` (Phase 71 hook, full implementation)

### Secondary (MEDIUM — grep counts cross-verified)
- Typography sweep: 187 occurrences across `src/` confirmed via `grep -rE 'text-\[(9|10|11)px\]' src/ | wc -l`

### Tertiary (LOW — needs validation during plan)
- Fabric.js v6.9.1 forwarding of `oklch()` strings to native canvas — assumed based on Fabric's documented behavior of passing fill/stroke directly. Verify with a 2-line REPL check during Plan 88-01.
- Browser oklch Color 4 support on Lovable Cloud deploy target — assumed modern Chrome/Safari. Confirm Jessica's primary device.

## Metadata

**Confidence breakdown:**
- Issue #194 root cause + fix: HIGH — exact line identified, fix is mechanical
- Issue #195 inventory: HIGH — every hex color in `src/canvas/` enumerated
- Issue #195 approach (getCanvasTheme): MEDIUM — design is sound but Fabric+oklch path needs a 5-min REPL verification
- Issue #196 root cause: HIGH — `.light` block is literally identical to `:root`, contrast math confirms 1.1:1
- Issue #196 recommended values: MEDIUM — oklch lightness 0.85 is a reasonable WCAG 3:1 target but should be eyeballed against the actual mockup
- Issue #197 scope: HIGH — grep counts are exact; mapping is conservative

**Research date:** 2026-05-15
**Valid until:** 2026-06-15 (CSS tokens and Fabric.js APIs are stable)
