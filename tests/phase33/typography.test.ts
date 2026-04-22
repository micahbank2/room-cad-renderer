import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Files whose section-header render path MUST shift to mixed-case per D-03/D-05.
const TARGETS = [
  "src/components/PropertiesPanel.tsx",
  "src/components/Sidebar.tsx",
  "src/components/Toolbar.tsx",
];

describe("Phase 33 typography — mixed-case section headers", () => {
  it("PropertiesPanel has a mixed-case 'Position' or 'Rotation' or 'Dimensions' header", () => {
    const src = fs.readFileSync(path.resolve("src/components/PropertiesPanel.tsx"), "utf-8");
    // At least one of these mixed-case section labels must appear as a string literal
    const mixedCase = /["'`](?:Position|Rotation|Dimensions|Material)["'`]/.test(src);
    expect(mixedCase).toBe(true);
  });
  it("Sidebar has at least one mixed-case section header (not UPPERCASE-only)", () => {
    const src = fs.readFileSync(path.resolve("src/components/Sidebar.tsx"), "utf-8");
    const mixedCase = /["'`](?:Room config|Properties|Library|Project)["'`]/.test(src);
    expect(mixedCase).toBe(true);
  });
});
