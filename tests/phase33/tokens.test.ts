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
  it("canonicalizes --radius-lg to 8px (was 6px)", () => {
    expect(css).toMatch(/--radius-lg:\s*8px/);
  });
  it("does NOT define named --spacing-* tokens (collides with Tailwind v4 container scale, e.g. max-w-2xl)", () => {
    expect(css).not.toMatch(/--spacing-xs:/);
    expect(css).not.toMatch(/--spacing-sm:/);
    expect(css).not.toMatch(/--spacing-md:/);
    expect(css).not.toMatch(/--spacing-lg:/);
    expect(css).not.toMatch(/--spacing-xl:/);
    expect(css).not.toMatch(/--spacing-2xl:/);
  });
});
