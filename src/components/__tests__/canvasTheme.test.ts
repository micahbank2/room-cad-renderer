// Phase 88 Plan 01 — Unit tests for canvas theme bridge.
// Validates getCanvasTheme() reads CSS tokens and resolves them through the
// browser's color parser at the JS boundary (D-04 + D-05).
//
// happy-dom's getComputedStyle has limited support for CSS variable resolution
// through .dark / .light class cascades — so these tests inject token values
// directly via inline style properties on document.documentElement. That keeps
// the test deterministic and independent of happy-dom's CSS engine quirks while
// still exercising the real getCanvasTheme() probe-div code path.

import { describe, it, expect, beforeEach, afterEach } from "vitest";

function setTokens(tokens: Record<string, string>) {
  const html = document.documentElement;
  for (const [k, v] of Object.entries(tokens)) {
    html.style.setProperty(k, v);
  }
}

function clearTokens() {
  const html = document.documentElement;
  const props = [
    "--background", "--muted", "--border", "--muted-foreground",
    "--card", "--accent-foreground", "--foreground",
  ];
  for (const p of props) html.style.removeProperty(p);
  html.className = "";
}

// Representative light-mode rgb values that mirror what oklch(0.998 0 0) etc.
// would resolve to in a real browser. We use rgb() directly so happy-dom's
// getComputedStyle returns the same string.
const LIGHT_TOKENS = {
  "--background": "rgb(254, 254, 254)",   // oklch(0.998)
  "--muted":       "rgb(247, 247, 247)",  // oklch(0.97)
  "--border":      "rgb(210, 210, 210)",  // oklch(0.85)  — Task 4 bump
  "--muted-foreground": "rgb(115, 115, 115)",  // oklch(0.556)
  "--card":        "rgb(254, 254, 254)",
  "--accent-foreground": "rgb(45, 45, 45)",
  "--foreground":  "rgb(30, 30, 30)",
};

const DARK_TOKENS = {
  "--background": "rgb(47, 47, 47)",      // oklch(0.205)
  "--muted":       "rgb(56, 56, 56)",
  "--border":      "rgb(56, 56, 56)",
  "--muted-foreground": "rgb(170, 170, 170)",
  "--card":        "rgb(47, 47, 47)",
  "--accent-foreground": "rgb(245, 245, 245)",
  "--foreground":  "rgb(245, 245, 245)",
};

const OLD_LIGHT_BORDER = "rgb(235, 235, 235)"; // oklch(0.922) — pre-Task-4

describe("getCanvasTheme() — canvas theme bridge (D-04)", () => {
  beforeEach(() => clearTokens());
  afterEach(() => clearTokens());

  it("returns object with all required CanvasTheme keys", async () => {
    setTokens(LIGHT_TOKENS);
    const { getCanvasTheme } = await import("@/canvas/canvasTheme");
    const t = getCanvasTheme();
    expect(t).toHaveProperty("background");
    expect(t).toHaveProperty("gridMinor");
    expect(t).toHaveProperty("gridMajor");
    expect(t).toHaveProperty("roomOutline");
    expect(t).toHaveProperty("wallFill");
    expect(t).toHaveProperty("wallStroke");
    expect(t).toHaveProperty("accent");
    expect(t).toHaveProperty("foreground");
    expect(t).toHaveProperty("cardBg");
  });

  it("resolves light-mode background to near-white rgb", async () => {
    setTokens(LIGHT_TOKENS);
    const { getCanvasTheme } = await import("@/canvas/canvasTheme");
    const t = getCanvasTheme();
    expect(t.background).toMatch(/^rgb\((2[4-9]\d|25[0-5]),\s*(2[4-9]\d|25[0-5]),\s*(2[4-9]\d|25[0-5])\)/);
  });

  it("resolves dark-mode background to dark rgb", async () => {
    setTokens(DARK_TOKENS);
    const { getCanvasTheme } = await import("@/canvas/canvasTheme");
    const t = getCanvasTheme();
    expect(t.background).toMatch(/^rgb\(([0-9]|[1-9][0-9]),\s*([0-9]|[1-9][0-9]),\s*([0-9]|[1-9][0-9])\)/);
  });

  it("never returns a value containing the literal 'oklch' (D-05 contract)", async () => {
    setTokens(LIGHT_TOKENS);
    const { getCanvasTheme } = await import("@/canvas/canvasTheme");
    const t = getCanvasTheme();
    for (const value of Object.values(t)) {
      expect(value).not.toMatch(/oklch/);
    }
  });

  it("light-mode roomOutline reflects bumped --border (D-06)", async () => {
    setTokens(LIGHT_TOKENS);
    const { getCanvasTheme } = await import("@/canvas/canvasTheme");
    const t = getCanvasTheme();
    // After D-06 bump (Task 4), border is oklch(0.85 0 0) ≈ rgb(210,210,210).
    // Pre-bump it was oklch(0.922 0 0) ≈ rgb(235, 235, 235).
    const m = t.roomOutline.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    expect(m).not.toBeNull();
    if (m) {
      const r = parseInt(m[1], 10);
      expect(r).toBeLessThan(225);
    }
    // Sanity guard: should not still be the old 235 value.
    expect(t.roomOutline).not.toBe(OLD_LIGHT_BORDER);
  });
});
