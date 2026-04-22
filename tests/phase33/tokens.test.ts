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
  it("defines canonical spacing tokens (4/8/16/24/32)", () => {
    expect(css).toMatch(/--spacing-xs:\s*4px/);
    expect(css).toMatch(/--spacing-sm:\s*8px/);
    expect(css).toMatch(/--spacing-lg:\s*16px/);
    expect(css).toMatch(/--spacing-xl:\s*24px/);
    expect(css).toMatch(/--spacing-2xl:\s*32px/);
  });
  it("canonicalizes --radius-lg to 8px (was 6px)", () => {
    expect(css).toMatch(/--radius-lg:\s*8px/);
  });
  it("does NOT define --spacing-md 12px (dropped per checker)", () => {
    expect(css).not.toMatch(/--spacing-md:\s*12px/);
  });
});
