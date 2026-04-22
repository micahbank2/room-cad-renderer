import { describe, it, expect, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { ProductLibrary } from "@/components/ProductLibrary";
import CustomElementsPanel from "@/components/CustomElementsPanel";
import { useCADStore } from "@/stores/cadStore";
import type { Product } from "@/types/product";

const SEED_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Sofa A",
    category: "Seating",
    width: 6,
    depth: 3,
    height: 3,
    material: "fabric",
    imageUrl: "",
    textureUrls: [],
  },
  {
    id: "p2",
    name: "Sofa B",
    category: "Seating",
    width: 6,
    depth: 3,
    height: 3,
    material: "fabric",
    imageUrl: "",
    textureUrls: [],
  },
  {
    id: "p3",
    name: "Chair C",
    category: "Seating",
    width: 3,
    depth: 3,
    height: 3,
    material: "fabric",
    imageUrl: "",
    textureUrls: [],
  },
  {
    id: "p4",
    name: "Table D",
    category: "Tables",
    width: 4,
    depth: 2,
    height: 2.5,
    material: "wood",
    imageUrl: "",
    textureUrls: [],
  },
  {
    id: "p5",
    name: "Table E",
    category: "Tables",
    width: 4,
    depth: 2,
    height: 2.5,
    material: "wood",
    imageUrl: "",
    textureUrls: [],
  },
];

describe("Library migration — render count regression (GH #89 blocker fix)", () => {
  beforeEach(() => {
    cleanup();
  });

  it("ProductLibrary renders exactly one LibraryCard per filtered product (all filter)", () => {
    const { container } = render(
      <ProductLibrary
        products={SEED_PRODUCTS}
        onAdd={() => {}}
        onRemove={() => {}}
        onOpenAddModal={() => {}}
      />,
    );
    const cards = container.querySelectorAll('[data-testid="library-card"]');
    // Default activeCategory is "all" → all 5 products rendered.
    expect(cards.length).toBe(SEED_PRODUCTS.length);
  });

  it("ProductLibrary card count never exceeds filtered data length", () => {
    // Invariant form: seed 0 products → 0 cards (placeholder shown instead).
    const { container } = render(
      <ProductLibrary
        products={[]}
        onAdd={() => {}}
        onRemove={() => {}}
        onOpenAddModal={() => {}}
      />,
    );
    const cards = container.querySelectorAll('[data-testid="library-card"]');
    expect(cards.length).toBe(0);
  });
});

describe("CustomElementsPanel migration — render count regression (GH #89)", () => {
  beforeEach(() => {
    cleanup();
    // Seed customElements in cadStore. The store keeps customElements as a
    // top-level field (see cadStore.addCustomElement). We set it directly
    // to bypass history push for the test seed.
    useCADStore.setState((prev) => ({
      ...(prev as any),
      customElements: {
        ce1: {
          id: "ce1",
          name: "Wainscot A",
          shape: "box",
          width: 3,
          depth: 2,
          height: 2.5,
          color: "#8a7b65",
        },
        ce2: {
          id: "ce2",
          name: "Wainscot B",
          shape: "box",
          width: 3,
          depth: 2,
          height: 2.5,
          color: "#8a7b65",
        },
        ce3: {
          id: "ce3",
          name: "Crown C",
          shape: "plane",
          width: 4,
          depth: 2,
          height: 2.5,
          color: "#cccccc",
        },
      },
    }));
  });

  it("renders exactly one LibraryCard per custom element", () => {
    const { container } = render(<CustomElementsPanel />);
    const cards = container.querySelectorAll('[data-testid="library-card"]');
    expect(cards.length).toBe(3);
  });
});
