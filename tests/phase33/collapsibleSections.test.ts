import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("CollapsibleSection (GH #84)", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  it("component file exists at src/components/ui/CollapsibleSection.tsx", () => {
    expect(fs.existsSync(path.resolve("src/components/ui/CollapsibleSection.tsx"))).toBe(true);
  });
  it("uses lucide ChevronRight + ChevronDown (per D-09)", () => {
    const src = fs.readFileSync(path.resolve("src/components/ui/CollapsibleSection.tsx"), "utf-8");
    expect(src).toMatch(/ChevronRight|ChevronDown/);
  });
  it("persists state to localStorage under ui:propertiesPanel:sections", () => {
    const src = fs.readFileSync(path.resolve("src/components/ui/CollapsibleSection.tsx"), "utf-8");
    expect(src).toMatch(/ui:propertiesPanel:sections/);
  });
  it("PropertiesPanel wraps at least 'Dimensions' section in CollapsibleSection", () => {
    const src = fs.readFileSync(path.resolve("src/components/PropertiesPanel.tsx"), "utf-8");
    expect(src).toMatch(/CollapsibleSection/);
  });
});
