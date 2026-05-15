// Phase 88 Plan 01 — RED tests for canvas theme bridge.
// Validates getCanvasTheme() reads CSS tokens and resolves oklch → rgb
// at the JS boundary (D-04 + D-05). MUST FAIL on this commit: the module
// src/canvas/canvasTheme.ts does not exist yet.

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// Inject src/index.css token blocks into happy-dom document head so
// getComputedStyle(probe).color resolves --background / --border et al.
// The Tailwind v4 @theme block isn't needed — we resolve the underlying
// custom property directly via the probe div.
beforeAll(() => {
  const css = readFileSync(resolve(__dirname, "../../index.css"), "utf8");
  const style = document.createElement("style");
  // Strip the @import "tailwindcss"; line — happy-dom can't resolve it and
  // it isn't needed for raw CSS-var resolution. Keep all :root, .dark, .light
  // blocks intact.
  style.textContent = css.replace(/@import\s+"tailwindcss";?/g, "");
  document.head.appendChild(style);
});

beforeEach(() => {
  // Reset to default light mode (no class) before each test.
  document.documentElement.className = "";
});

describe("getCanvasTheme() — canvas theme bridge (D-04)", () => {
  it("returns object with all required CanvasTheme keys", async () => {
    const { getCanvasTheme } = await import("@/canvas/canvasTheme");
    const t = getCanvasTheme();
    // Smoke type-check: all required keys present.
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

  it("resolves light-mode background to near-white rgb (oklch 0.998 ≈ rgb 254)", async () => {
    const { getCanvasTheme } = await import("@/canvas/canvasTheme");
    document.documentElement.classList.remove("dark");
    const t = getCanvasTheme();
    // Near-white range — accept rgb(240..255, 240..255, 240..255) — happy-dom
    // resolves oklch(0.998 0 0) somewhere in this band.
    expect(t.background).toMatch(/^rgb\((2[4-9]\d|25[0-5]),\s*(2[4-9]\d|25[0-5]),\s*(2[4-9]\d|25[0-5])\)/);
  });

  it("resolves dark-mode background to dark rgb (oklch 0.205 ≈ rgb < 80)", async () => {
    const { getCanvasTheme } = await import("@/canvas/canvasTheme");
    document.documentElement.classList.add("dark");
    const t = getCanvasTheme();
    // Dark mode range — rgb channels well below 100.
    expect(t.background).toMatch(/^rgb\(([0-9]|[1-9][0-9]),\s*([0-9]|[1-9][0-9]),\s*([0-9]|[1-9][0-9])\)/);
  });

  it("never returns a value containing the literal 'oklch' (D-05 contract)", async () => {
    const { getCanvasTheme } = await import("@/canvas/canvasTheme");
    document.documentElement.classList.remove("dark");
    const t = getCanvasTheme();
    for (const value of Object.values(t)) {
      expect(value).not.toMatch(/oklch/);
    }
  });

  it("light-mode roomOutline reflects bumped --border (oklch 0.85, not 0.922) — D-06", async () => {
    const { getCanvasTheme } = await import("@/canvas/canvasTheme");
    document.documentElement.classList.remove("dark");
    const t = getCanvasTheme();
    // oklch(0.922 0 0) → roughly rgb(230, 230, 230)
    // oklch(0.85 0 0)  → roughly rgb(210, 210, 210)
    // After Task 4 lands the bump, the channel should be ≤ 220.
    const m = t.roomOutline.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    expect(m).not.toBeNull();
    if (m) {
      const r = parseInt(m[1], 10);
      // Old token (0.922) ≈ 230. New token (0.85) ≈ 210. Assert < 225 to
      // catch any value still in the 230 range.
      expect(r).toBeLessThan(225);
    }
  });
});
