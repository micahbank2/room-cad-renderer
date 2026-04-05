import { describe, it, expect } from "vitest";
import { effectiveDimensions } from "@/types/product";
import type { Product } from "@/types/product";

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: "p1",
  name: "Real Chair",
  category: "Seating",
  width: 3,
  depth: 2,
  height: 3,
  material: "",
  imageUrl: "",
  textureUrls: [],
  ...overrides,
});

describe("fabricSync placeholder branching (LIB-03/04)", () => {
  it("orphan (undefined product) → isPlaceholder=true, 2x2x2 dims", () => {
    const d = effectiveDimensions(undefined);
    expect(d.isPlaceholder).toBe(true);
    expect(d.width).toBe(2);
    expect(d.depth).toBe(2);
    expect(d.height).toBe(2);
  });

  it("real product → isPlaceholder=false, actual dims", () => {
    const d = effectiveDimensions(makeProduct());
    expect(d.isPlaceholder).toBe(false);
    expect(d.width).toBe(3);
    expect(d.depth).toBe(2);
    expect(d.height).toBe(3);
  });

  it("null-width product → isPlaceholder=true, 2x2 fallback", () => {
    const d = effectiveDimensions(makeProduct({ width: null }));
    expect(d.isPlaceholder).toBe(true);
    expect(d.width).toBe(2);
    expect(d.depth).toBe(2);
  });

  it("null-depth product → isPlaceholder=true", () => {
    const d = effectiveDimensions(makeProduct({ depth: null }));
    expect(d.isPlaceholder).toBe(true);
  });

  it("null-height product → isPlaceholder=true", () => {
    const d = effectiveDimensions(makeProduct({ height: null }));
    expect(d.isPlaceholder).toBe(true);
  });
});
