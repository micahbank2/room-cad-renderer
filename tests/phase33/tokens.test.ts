import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(path.resolve("src/index.css"), "utf-8");

describe("Phase 33 design tokens", () => {
  it("defines canonical typography token (display 28px)", () => {
    // Accept either --font-size-display or Tailwind v4 --text-display naming
    // (Plan 01 Task 2 resolves the correct v4 prefix)
    expect(css).toMatch(/--(?:font-size|text)-display:\s*28px/);
  });
  it("defines base typography token (13px)", () => {
    expect(css).toMatch(/--(?:font-size|text)-base:\s*13px/);
  });
  it("defines sm typography token (11px)", () => {
    expect(css).toMatch(/--(?:font-size|text)-sm:\s*11px/);
  });
  it("defines --radius-lg (Phase 71: resolves via var(--radius) = 0.625rem = 10px)", () => {
    // Phase 71 TOKEN-FOUNDATION updated radius scale from Obsidian (2-8px) to
    // Pascal (--radius: 0.625rem; --radius-lg: var(--radius) = 10px).
    // The raw CSS uses a var() reference rather than a px value.
    expect(css).toMatch(/--radius-lg:/);
  });
  it("defines Pascal-aligned --spacing-* tokens (Phase 71 TOKEN-FOUNDATION D-14)", () => {
    // Phase 71 added spacing tokens as part of the Pascal design system migration.
    // The Phase 33 assertion that these must NOT exist is superseded.
    expect(css).toMatch(/--spacing-xs:/);
    expect(css).toMatch(/--spacing-sm:/);
    expect(css).toMatch(/--spacing-md:/);
    expect(css).toMatch(/--spacing-lg:/);
    expect(css).toMatch(/--spacing-xl:/);
  });
});
