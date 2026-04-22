import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("FloatingSelectionToolbar (GH #85)", () => {
  it("component exists at src/components/ui/FloatingSelectionToolbar.tsx", () => {
    expect(fs.existsSync(path.resolve("src/components/ui/FloatingSelectionToolbar.tsx"))).toBe(
      true,
    );
  });
  it("uses lucide Copy + Trash2 (per D-11)", () => {
    const src = fs.readFileSync(
      path.resolve("src/components/ui/FloatingSelectionToolbar.tsx"),
      "utf-8",
    );
    expect(src).toMatch(/Copy/);
    expect(src).toMatch(/Trash2/);
  });
  it("uiStore exposes isDragging + setDragging (bridge for drag-hide per D-13)", () => {
    const src = fs.readFileSync(path.resolve("src/stores/uiStore.ts"), "utf-8");
    expect(src).toMatch(/isDragging/);
    expect(src).toMatch(/setDragging/);
  });
  it("selectTool calls setDragging on drag start/end", () => {
    const src = fs.readFileSync(path.resolve("src/canvas/tools/selectTool.ts"), "utf-8");
    expect(src).toMatch(/setDragging/);
  });
});
