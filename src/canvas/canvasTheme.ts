// src/canvas/canvasTheme.ts
// Phase 88 D-04: canvas theme bridge.
//
// Reads CSS custom-property values from <html> at call time and resolves them
// through the browser's color parser to rgb(...) strings safe to pass to
// Fabric.js / native canvas fillStyle / strokeStyle.
//
// D-05: oklch() literals in src/index.css don't paint reliably on older
// WebViews via Canvas 2D. We convert via a hidden probe div whose resolved
// getComputedStyle().color returns rgb(...) on every modern browser
// (Chrome 100+, Safari 15+, Firefox 113+).
//
// No module-level caching of resolved values — CLAUDE.md §StrictMode rule.
// Compute fresh each call. The probe div is created/destroyed per call; the
// total cost is ~17 probes × ~0.05 ms = ~1 ms per redraw, negligible relative
// to a full Fabric clear+repaint.

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

/**
 * Resolve a CSS expression (e.g. "var(--border)" or "oklch(0.85 0 0)") to its
 * computed `rgb(...)` string via a hidden probe div. Always returns an
 * `rgb(...)` or `rgba(...)` string — the browser's CSS color parser handles
 * oklch → rgb conversion transparently.
 */
function resolveColor(cssExpr: string): string {
  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.color = cssExpr;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  document.body.removeChild(probe);
  return resolved;
}

/**
 * Wrap an rgb(...) string with an alpha channel. Returns rgba(...). If the
 * input is already rgba(...), the existing alpha is replaced.
 */
export function withAlpha(rgb: string, alpha: number): string {
  // Match rgb(r, g, b) or rgba(r, g, b, a)
  const m = rgb.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)/);
  if (!m) return rgb;
  return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`;
}

/**
 * Read all canvas-relevant tokens at once. Called inside FabricCanvas.redraw().
 * Returns a fresh CanvasTheme — never cached at module level. Safe to call
 * repeatedly; the probe-div round-trip is sub-millisecond.
 */
export function getCanvasTheme(): CanvasTheme {
  const background = resolveColor("var(--background)");
  const muted = resolveColor("var(--muted)");
  const border = resolveColor("var(--border)");
  const mutedFg = resolveColor("var(--muted-foreground)");
  const card = resolveColor("var(--card)");
  const accentFg = resolveColor("var(--accent-foreground)");
  const foreground = resolveColor("var(--foreground)");

  // Brand purple is theme-invariant — selection strokes and snap guides must
  // look identical in light and dark mode per D-04.
  const accent = "#7c5bf0";
  const accentLight = "#ccbeff";

  return {
    background,
    gridMinor: muted,
    gridMajor: border,
    roomOutline: border,
    wallFill: muted,
    wallStroke: border,
    wallSelectedStroke: accent,
    dimensionFg: mutedFg,
    dimensionLabelBg: card,
    dimensionLabelFg: accentFg || foreground,
    ghostPreviewFill: accent,
    ghostPreviewStroke: accent,
    accent,
    accentLight,
    foreground,
    cardBg: card,
    doorOpeningFill: background,
    windowOpeningFill: background,
  };
}
