import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("GestureChip (GH #86)", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  it("component exists at src/components/ui/GestureChip.tsx", () => {
    expect(fs.existsSync(path.resolve("src/components/ui/GestureChip.tsx"))).toBe(true);
  });
  it("2D copy matches contract", () => {
    const src = fs.readFileSync(path.resolve("src/components/ui/GestureChip.tsx"), "utf-8");
    expect(src).toMatch(/Drag to pan/);
    expect(src).toMatch(/Wheel to zoom/);
  });
  it("3D copy matches contract", () => {
    const src = fs.readFileSync(path.resolve("src/components/ui/GestureChip.tsx"), "utf-8");
    expect(src).toMatch(/L-drag rotate/);
  });
  it("uses localStorage key ui:gestureChip:dismissed", () => {
    const src = fs.readFileSync(path.resolve("src/components/ui/GestureChip.tsx"), "utf-8");
    expect(src).toMatch(/ui:gestureChip:dismissed/);
  });
});
