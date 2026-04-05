import { describe, it, expect } from "vitest";
import {
  effectiveDimensions,
  hasDimensions,
  PLACEHOLDER_DIM_FT,
  type Product,
} from "@/types/product";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod_test",
    name: "Test Product",
    category: "Seating",
    width: 3,
    depth: 2,
    height: 3,
    material: "",
    imageUrl: "",
    textureUrls: [],
    ...overrides,
  };
}

describe("effectiveDimensions (LIB-04)", () => {
  it("returns product dims + isPlaceholder:false when all dims are numbers", () => {
    const p = makeProduct({ width: 3, depth: 2, height: 3 });
    expect(effectiveDimensions(p)).toEqual({
      width: 3,
      depth: 2,
      height: 3,
      isPlaceholder: false,
    });
  });

  it("returns 2/2/2 + isPlaceholder:true when width is null", () => {
    const p = makeProduct({ width: null });
    expect(effectiveDimensions(p)).toEqual({
      width: PLACEHOLDER_DIM_FT,
      depth: PLACEHOLDER_DIM_FT,
      height: PLACEHOLDER_DIM_FT,
      isPlaceholder: true,
    });
  });

  it("returns 2/2/2 + isPlaceholder:true when depth is null", () => {
    const p = makeProduct({ depth: null });
    expect(effectiveDimensions(p)).toEqual({
      width: 2,
      depth: 2,
      height: 2,
      isPlaceholder: true,
    });
  });

  it("returns 2/2/2 + isPlaceholder:true when height is null", () => {
    const p = makeProduct({ height: null });
    expect(effectiveDimensions(p)).toEqual({
      width: 2,
      depth: 2,
      height: 2,
      isPlaceholder: true,
    });
  });

  it("returns 2/2/2 + isPlaceholder:true when product is undefined (orphan)", () => {
    expect(effectiveDimensions(undefined)).toEqual({
      width: 2,
      depth: 2,
      height: 2,
      isPlaceholder: true,
    });
  });

  it("returns 2/2/2 + isPlaceholder:true when product is null", () => {
    expect(effectiveDimensions(null)).toEqual({
      width: 2,
      depth: 2,
      height: 2,
      isPlaceholder: true,
    });
  });
});

describe("hasDimensions (LIB-04)", () => {
  it("returns true when all three dims are numbers", () => {
    expect(hasDimensions(makeProduct({ width: 3, depth: 2, height: 3 }))).toBe(true);
  });

  it("returns false when any dim is null", () => {
    expect(hasDimensions(makeProduct({ width: null }))).toBe(false);
    expect(hasDimensions(makeProduct({ depth: null }))).toBe(false);
    expect(hasDimensions(makeProduct({ height: null }))).toBe(false);
  });
});
