import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Product } from "@/types/product";

/**
 * Phase 58 — GLTF-INTEGRATION-01: ProductLibrary × GLTF (C1, C2).
 *
 * C1a: Product with gltfId → Box badge rendered (data-testid="library-card-badge").
 * C1b: Product without gltfId → no badge wrapper.
 * C2a: imageUrl wins over gltfId (D-09 priority).
 * C2b: gltfId-only → calls getCachedGltfThumbnail; uses returned dataURL.
 * C2c: neither imageUrl nor gltfId → no <img> rendered.
 *
 * We mock getCachedGltfThumbnail so component tests don't hit IDB / WebGL.
 */

vi.mock("@/three/gltfThumbnailGenerator", () => ({
  getCachedGltfThumbnail: vi.fn(),
}));

// Suppress productTool side-effects: setPendingProduct just sets a module variable
vi.mock("@/canvas/tools/productTool", () => ({
  setPendingProduct: vi.fn(),
}));

import { ProductLibrary } from "@/components/ProductLibrary";
import { getCachedGltfThumbnail } from "@/three/gltfThumbnailGenerator";

const mockedGetCached = getCachedGltfThumbnail as unknown as ReturnType<
  typeof vi.fn
>;

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    name: "Test Product",
    category: "Other",
    width: 3,
    depth: 3,
    height: 3,
    material: "none",
    imageUrl: "",
    textureUrls: [],
    ...overrides,
  };
}

beforeEach(() => {
  mockedGetCached.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("ProductLibrary × GLTF (Phase 58)", () => {
  it("C1a: renders Box badge for product with gltfId", () => {
    render(
      <ProductLibrary
        products={[makeProduct({ gltfId: "gltf_abc" })]}
        onAdd={() => {}}
        onRemove={() => {}}
        onOpenAddModal={() => {}}
      />,
    );
    const card = screen.getByTestId("library-card");
    expect(within(card).getByTestId("library-card-badge")).toBeInTheDocument();
  });

  it("C1b: renders NO badge for image-only product", () => {
    render(
      <ProductLibrary
        products={[makeProduct({ imageUrl: "data:image/png;base64,XXX" })]}
        onAdd={() => {}}
        onRemove={() => {}}
        onOpenAddModal={() => {}}
      />,
    );
    const card = screen.getByTestId("library-card");
    expect(
      within(card).queryByTestId("library-card-badge"),
    ).not.toBeInTheDocument();
  });

  it("C2a: imageUrl wins over gltfId for thumbnail (D-09 priority)", () => {
    render(
      <ProductLibrary
        products={[
          makeProduct({
            imageUrl: "data:image/png;base64,XXX",
            gltfId: "gltf_abc",
          }),
        ]}
        onAdd={() => {}}
        onRemove={() => {}}
        onOpenAddModal={() => {}}
      />,
    );
    const card = screen.getByTestId("library-card");
    const img = card.querySelector("img");
    expect(img?.getAttribute("src")).toBe("data:image/png;base64,XXX");
    expect(mockedGetCached).not.toHaveBeenCalled();
  });

  it("C2b: gltfId fallback calls getCachedGltfThumbnail and uses returned dataURL", () => {
    mockedGetCached.mockReturnValue("data:image/png;base64,GLTFTHUMB");
    render(
      <ProductLibrary
        products={[makeProduct({ gltfId: "gltf_abc" })]}
        onAdd={() => {}}
        onRemove={() => {}}
        onOpenAddModal={() => {}}
      />,
    );
    expect(mockedGetCached).toHaveBeenCalledWith(
      "gltf_abc",
      expect.any(Function),
    );
    const card = screen.getByTestId("library-card");
    const img = card.querySelector("img");
    expect(img?.getAttribute("src")).toBe("data:image/png;base64,GLTFTHUMB");
  });

  it("C2c: no imageUrl + no gltfId → no img rendered", () => {
    render(
      <ProductLibrary
        products={[makeProduct()]}
        onAdd={() => {}}
        onRemove={() => {}}
        onOpenAddModal={() => {}}
      />,
    );
    const card = screen.getByTestId("library-card");
    expect(card.querySelector("img")).toBeNull();
  });

  it("C2d: gltfId fallback caching 'fallback' sentinel → no img rendered", () => {
    mockedGetCached.mockReturnValue("fallback");
    render(
      <ProductLibrary
        products={[makeProduct({ gltfId: "gltf_bad" })]}
        onAdd={() => {}}
        onRemove={() => {}}
        onOpenAddModal={() => {}}
      />,
    );
    const card = screen.getByTestId("library-card");
    expect(card.querySelector("img")).toBeNull();
  });
});
