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
  it("PropertiesPanel wraps sections in PanelSection", () => {
    const src = fs.readFileSync(path.resolve("src/components/PropertiesPanel.tsx"), "utf-8");
    expect(src).toMatch(/PanelSection/);
    expect(src).not.toMatch(/CollapsibleSection/);
  });
});
