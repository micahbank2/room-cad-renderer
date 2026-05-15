import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("PanelSection (Phase 72 — replaces CollapsibleSection)", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  it("component file exists at src/components/ui/PanelSection.tsx", () => {
    expect(fs.existsSync(path.resolve("src/components/ui/PanelSection.tsx"))).toBe(true);
  });
  it("uses lucide ChevronRight (per D-13)", () => {
    const src = fs.readFileSync(path.resolve("src/components/ui/PanelSection.tsx"), "utf-8");
    expect(src).toMatch(/ChevronRight/);
  });
  it("persists state to localStorage under ui:propertiesPanel:sections", () => {
    const src = fs.readFileSync(path.resolve("src/components/ui/PanelSection.tsx"), "utf-8");
    expect(src).toMatch(/ui:propertiesPanel:sections/);
  });
  it("Per-entity inspectors wrap sections in PanelSection (post-Phase 82)", () => {
    // Phase 82 decomposed PropertiesPanel into per-entity inspectors. At least
    // one of them must keep wrapping sections in PanelSection and never reach
    // for the deprecated CollapsibleSection.
    const inspectors = [
      "src/components/inspectors/WallInspector.tsx",
      "src/components/inspectors/ProductInspector.tsx",
      "src/components/inspectors/CeilingInspector.tsx",
      "src/components/inspectors/CustomElementInspector.tsx",
    ];
    const sources = inspectors.map((p) => fs.readFileSync(path.resolve(p), "utf-8"));
    expect(sources.some((src) => /PanelSection/.test(src))).toBe(true);
    sources.forEach((src) => {
      expect(src).not.toMatch(/CollapsibleSection/);
    });
  });
});
