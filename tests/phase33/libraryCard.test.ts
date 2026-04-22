import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Unified LibraryCard + CategoryTabs (GH #89)", () => {
  it("LibraryCard exists at src/components/library/LibraryCard.tsx", () => {
    expect(fs.existsSync(path.resolve("src/components/library/LibraryCard.tsx"))).toBe(true);
  });
  it("CategoryTabs exists at src/components/library/CategoryTabs.tsx", () => {
    expect(fs.existsSync(path.resolve("src/components/library/CategoryTabs.tsx"))).toBe(true);
  });
  it("LibraryCard exports accept thumbnail/label/selected/onClick/onRemove/variant props", () => {
    const src = fs.readFileSync(path.resolve("src/components/library/LibraryCard.tsx"), "utf-8");
    expect(src).toMatch(/thumbnail/);
    expect(src).toMatch(/label/);
    expect(src).toMatch(/selected/);
    expect(src).toMatch(/onRemove/);
  });
  it("ProductLibrary migrates to LibraryCard", () => {
    const src = fs.readFileSync(path.resolve("src/components/ProductLibrary.tsx"), "utf-8");
    expect(src).toMatch(/LibraryCard/);
  });
  it("LibraryCard renders with data-testid='library-card' for count-regression test", () => {
    const src = fs.readFileSync(path.resolve("src/components/library/LibraryCard.tsx"), "utf-8");
    expect(src).toMatch(/data-testid="library-card"/);
  });
});
