import { describe, it, expect } from "vitest";
import { searchProducts, type Product } from "@/types/product";

function makeProduct(name: string, id: string = name): Product {
  return {
    id,
    name,
    category: "Seating",
    width: 1,
    depth: 1,
    height: 1,
    material: "",
    imageUrl: "",
    textureUrls: [],
  };
}

const eames = makeProduct("Eames Lounge Chair", "prod_eames");
const desk = makeProduct("Oak Desk", "prod_desk");
const sofa = makeProduct("Blue Sofa", "prod_sofa");
const products = [eames, desk, sofa];

describe("product name search (LIB-05)", () => {
  it("case-insensitive substring match: 'EAMES' matches 'Eames Lounge Chair'", () => {
    expect(searchProducts("EAMES", products)).toEqual([eames]);
  });

  it("case-insensitive substring match: 'lounge' matches 'Eames Lounge Chair'", () => {
    expect(searchProducts("lounge", products)).toEqual([eames]);
  });

  it("empty search string returns full product list", () => {
    expect(searchProducts("", products)).toEqual(products);
  });

  it("whitespace-only search returns full list (trimmed)", () => {
    expect(searchProducts("   ", products)).toEqual(products);
  });

  it("no match returns empty array", () => {
    expect(searchProducts("xyz-not-present", products)).toEqual([]);
  });

  it("matches multiple products when substring is shared", () => {
    const a = makeProduct("Red Chair", "a");
    const b = makeProduct("Blue Chair", "b");
    const c = makeProduct("Oak Desk", "c");
    expect(searchProducts("chair", [a, b, c])).toEqual([a, b]);
  });
});
