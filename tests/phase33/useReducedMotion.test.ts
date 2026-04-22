import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("useReducedMotion hook (D-39)", () => {
  it("hook file exists at src/hooks/useReducedMotion.ts", () => {
    expect(fs.existsSync(path.resolve("src/hooks/useReducedMotion.ts"))).toBe(true);
  });
  it("exports useReducedMotion named export", () => {
    const src = fs.readFileSync(path.resolve("src/hooks/useReducedMotion.ts"), "utf-8");
    expect(src).toMatch(/export\s+(?:function\s+useReducedMotion|const\s+useReducedMotion)/);
  });
  it("subscribes to window.matchMedia('(prefers-reduced-motion: reduce)')", () => {
    const src = fs.readFileSync(path.resolve("src/hooks/useReducedMotion.ts"), "utf-8");
    expect(src).toMatch(/prefers-reduced-motion/);
    expect(src).toMatch(/matchMedia/);
  });
});
