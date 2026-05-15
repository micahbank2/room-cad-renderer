# Phase 88: Light Mode + Visual Density Polish — Context

**Captured:** 2026-05-15
**Branch:** `gsd/phase-88-light-mode-polish`
**Status:** Locked — ready for plan

## Vision

Phase 87 shipped the Theme Toggle UI (gear → Light/Dark/System) and removed the three `.light` force-wrappers on WelcomeScreen / ProjectManager / HelpPage. Phase 87 UAT surfaced four discrete chrome defects that all share the same theme + density story:

1. **FloatingToolbar disappears in 3D view** (1-line view-mode gate).
2. **2D Fabric canvas ignores light/dark theme entirely** — every grid line, wall fill, dimension label is a hardcoded dark-mode hex value, so flipping to Light leaves the canvas looking like a black-on-black rectangle.
3. **Light-mode borders are invisible** — `--border` is `oklch(0.922 0 0)` against `--background: oklch(0.998 0 0)`, ~1.1:1 contrast, well below WCAG 3:1.
4. **Chrome typography reads as tiny** on a Retina display at 100% zoom — 187 occurrences of `text-[9px]`/`[10px]`/`[11px]` across `src/`.

This is a polish phase: bug-fix-shaped work that finishes the theme story Phase 87 started. No new features.

## Milestone Placement

**D-01 — Standalone polish phase.** Like Phase 87, ships outside any v1.xx milestone. v1.20 and v1.21 closed 2026-05-15 and there is no active v1.22 yet. Listed under `## Polish Phases` in `.planning/ROADMAP.md` alongside Phase 87.

## Decisions (Locked)

### D-01 — Standalone polish phase

Phase 88 is a one-off polish phase that ships independently. No v1.22 milestone is opened for it. ROADMAP.md appends Phase 88 under the existing `## Polish Phases` section (Phase 87 is the precedent), and adds a row to the `## Progress` table once shipped. No `milestones/v1.22-REQUIREMENTS.md` file.

### D-02 — Closes 4 GH issues

Phase 88 closes these GitHub issues (referenced in PR body via `Closes #N`):

| Issue | Title | Fix surface |
|-------|-------|-------------|
| #194 | FloatingToolbar disappears in 3D view | `src/App.tsx` mount site relocation |
| #195 | 2D canvas does not respect light mode | `src/canvas/canvasTheme.ts` (new) + `FabricCanvas.tsx` + every render module |
| #196 | Light-mode borders invisible | `src/index.css` `.light` + `:root` border tokens |
| #197 | Chrome typography too small (9-11px sweep) | global `text-[Npx]` bulk replacement |

### D-03 — FloatingToolbar moves to a shared mount above the per-view-mode branch

In `src/App.tsx`, the current mount at line 268 lives inside the `(viewMode === "2d" || viewMode === "split")` branch. Hoist it to a sibling of both view-mode branches, mounted once inside the `isCanvas` container around line 263 (alongside `<RoomTabs>`), positioned absolutely so it overlays whichever canvas is active.

The toolbar already self-conditionals on `viewMode` internally — the Display Mode segmented control reads `viewMode` and renders correctly for 2D, 3D, and Split. **No internal toolbar changes are needed**, just the mount-site relocation.

Anchor approach: position the toolbar absolutely against the outer `flex flex-1 overflow-hidden` container that wraps both view branches. In Split mode it centers across the full canvas viewport (not biased to either half). Verify in QA: 2D, 3D, Split all show the toolbar centered at the bottom of the canvas area.

### D-04 — Canvas theme bridge via `getCanvasTheme()` helper

New module: `src/canvas/canvasTheme.ts`. Exports a `CanvasTheme` interface and a `getCanvasTheme()` function. The function reads the current CSS custom-property values from `document.documentElement` at call time and returns a typed color object:

```ts
export interface CanvasTheme {
  background: string;
  gridMinor: string;
  gridMajor: string;
  roomOutline: string;
  wallFill: string;
  wallStroke: string;
  wallSelectedStroke: string;
  dimensionFg: string;
  dimensionLabelBg: string;
  dimensionLabelFg: string;
  ghostPreviewFill: string;
  ghostPreviewStroke: string;
  accent: string;
  accentLight: string;
  foreground: string;
  cardBg: string;
  doorOpeningFill: string;
  windowOpeningFill: string;
}

export function getCanvasTheme(): CanvasTheme;
```

`FabricCanvas.tsx`:
- Subscribes to `useTheme().resolved` at the top of the component.
- Adds `resolved` to the `redraw()` `useCallback` dep array.
- Inside `redraw()`, computes `const theme = getCanvasTheme()` at the top and threads it as a new trailing param into every `render*()` call site.

Every render module (`grid.ts`, `dimensions.ts`, `fabricSync.ts`, `snapGuides.ts`, all tool previews under `src/canvas/tools/`) accepts a `theme: CanvasTheme` param and reads its colors from there. **Module-level hardcoded color constants are deleted**, not just shadowed.

Brand-purple accent (`#7c5bf0`) stays theme-invariant — threaded via `theme.accent` for consistency, but its value is identical in light and dark.

**No module-level caching** of the theme object. Compute fresh inside `redraw()` per StrictMode safety (CLAUDE.md §7).

### D-05 — oklch → canvas color conversion at the JS boundary

Tokens in `src/index.css` are stored as `oklch(...)` literals. `getComputedStyle(document.documentElement).getPropertyValue("--border")` returns the literal string `"oklch(0.85 0 0)"`. Fabric.js v6 forwards this straight to HTML5 Canvas 2D `fillStyle` — which supports oklch on Chrome 111+/Safari 16.4+ but silently paints transparent black on older WebViews.

**Use the hidden-div resolution trick** to convert oklch → `rgb(...)` at the JS boundary:

```ts
// inside getCanvasTheme()
const probe = document.createElement("div");
probe.style.color = "var(--border)";
document.body.appendChild(probe);
const resolvedBorder = getComputedStyle(probe).color;  // "rgb(217, 217, 217)"
document.body.removeChild(probe);
```

The browser converts CSS `var(--border)` through its oklch parser into the computed `color` property as `rgb(...)`. Cache the probe div (create once at module scope, reuse) to avoid DOM thrash. Memoize results in a `Map<string, string>` keyed on the CSS variable name — but the cache must be invalidated when the theme flips. Easiest: derive the cache map fresh per `getCanvasTheme()` call (cheap — 17 probes total, < 1 ms).

### D-06 — Border tokens bump in `.light` block to `oklch(0.85 0 0)`

In `src/index.css`, both `:root` (line 23-24) and `.light` (line 69-70) currently have:
```
--border: oklch(0.922 0 0);
--input: oklch(0.922 0 0);
```

Bump both to `oklch(0.85 0 0)` (WCAG 3:1 against `--background: oklch(0.998 0 0)`). Affects `--border` and `--input`. `--ring` stays at `oklch(0.708 0 0)` (already accent-adjacent and meets contrast).

**Dark mode untouched** — the `.dark` block at line 30-49 is not modified. Verify after the bump that dark-mode chrome is visually unchanged.

Out of scope: `--muted` darkening for sidebar contrast. If Jessica notes sidebar-on-background distinction is still weak, file as a follow-up bug.

### D-07 — Typography sweep: one-step bump

Programmatic replacement across `src/`:

| Current | New | Occurrences |
|---------|-----|-------------|
| `text-[9px]` | `text-[11px]` | 63 |
| `text-[10px]` | `text-[12px]` | 71 |
| `text-[11px]` | `text-[13px]` | 53 |
| `text-xs` (12px) | unchanged | 54 (leave as-is) |

**Exceptions — DO NOT BUMP:**

| File | Line | Class | Reason |
|------|------|-------|--------|
| `src/canvas/FabricCanvas.tsx` | 800 | `text-[11px]` (dimension-edit input) | Sits in canvas-scaled space; bigger font visually breaks the inline editor |
| `src/canvas/FabricCanvas.tsx` | 835 | `text-[12px]` (annotation input) | Same — canvas overlay must stay compact |

Mechanical search-and-replace with these two lines explicitly preserved. Single commit. Followed by a visual smoke test on top bar / sidebar / right inspector / floating toolbar / settings popover for any clipped or wrapped chrome.

## Out of Scope

- `--muted` token darkening for card-on-background contrast (file as follow-up if Jessica reports)
- Two-step typography bump (9→12, 10→13, 11→14) — collapses density hierarchy; one-step bump is the conservative pass
- Bumping `text-xs` (12px) — would invert the hierarchy with the bumped `text-[13px]` tier
- Per-component layout fix-ups beyond the 2 known DO-NOT-BUMP exceptions — if a button clips, document in 88-02-SUMMARY.md, file as a separate bug
- Light-mode visual polish of WelcomeScreen / ProjectManager / HelpPage chrome beyond what falls out of D-06 (Phase 87 already deferred these)
- Replacing `oklch()` tokens with hex aliases in CSS — convert at JS boundary instead (D-05), keep CSS single-source

## Linked Issues / Spec

| GH Issue | Title | Closed by |
|----------|-------|-----------|
| #194 | FloatingToolbar disappears in 3D | Plan 88-01 Task 2 |
| #195 | 2D canvas does not respect light mode | Plan 88-01 Task 3 |
| #196 | Light-mode borders invisible | Plan 88-01 Task 4 |
| #197 | Chrome typography too small | Plan 88-02 Task 1 |

PR body will list all four with `Closes #N`. Issues should already be labeled `bug` + `in-progress` (or labeled at plan time per CLAUDE.md global rule).

## Requirements Summary (for traceability)

| ID | Behavior | Surfaces |
|----|----------|----------|
| POLISH-01 (#194) | FloatingToolbar visible in 2D, 3D, and Split view modes | `src/App.tsx` |
| POLISH-02 (#195) | 2D canvas grid / walls / dimensions / openings / tool previews repaint with theme-appropriate colors when user toggles Light/Dark | `src/canvas/canvasTheme.ts` (new), `FabricCanvas.tsx`, `grid.ts`, `dimensions.ts`, `fabricSync.ts`, `snapGuides.ts`, `tools/*.ts` |
| POLISH-03 (#196) | Light-mode `--border` and `--input` tokens meet WCAG 3:1 against `--background` | `src/index.css` |
| POLISH-04 (#197) | Chrome `text-[9/10/11px]` density bumped one step across `src/` except 2 canvas-overlay exceptions | global sweep across `src/` |
