// Phase 89 T4 — D-05: cache invalidation on imageUrl update.
//
// `productImageCache.invalidateProduct(id)` exists but was uncalled until
// Phase 89. The bug: a user re-uploads a photo for an existing product, the
// store updates, but the 2D canvas keeps serving the OLD cached
// HTMLImageElement until app reload.
//
// Phase 89 wires invalidation in two store actions:
//   - productStore.updateProduct(id, changes) — if "imageUrl" in changes
//   - cadStore.updateCustomElement(id, changes) — same trigger
//
// "imageUrl" in changes (rather than changes.imageUrl !== undefined) is
// deliberate so explicit clears (imageUrl: undefined) also invalidate.

import { describe, it, expect, vi, beforeEach } from "vitest";

const { getMock, setMock, invalidateMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  setMock: vi.fn(),
  invalidateMock: vi.fn(),
}));

vi.mock("idb-keyval", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    get: getMock,
    set: setMock,
  };
});

vi.mock("@/canvas/productImageCache", () => ({
  invalidateProduct: invalidateMock,
  getCachedImage: vi.fn(() => null),
  __resetCache: vi.fn(),
}));

import { useProductStore } from "@/stores/productStore";
import { useCADStore } from "@/stores/cadStore";
import type { Product } from "@/types/product";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod_invalidation_test",
    name: "Test",
    category: "Seating",
    width: 3,
    depth: 2,
    height: 3,
    material: "",
    imageUrl: "data:image/png;base64,AAAA",
    textureUrls: [],
    ...overrides,
  };
}

describe("productStore.updateProduct (Phase 89 D-05 — cache invalidation)", () => {
  beforeEach(() => {
    getMock.mockReset();
    setMock.mockReset();
    setMock.mockResolvedValue(undefined);
    invalidateMock.mockReset();
    // Pre-load a product so updateProduct has a target.
    useProductStore.setState({
      products: [makeProduct()],
      loaded: true,
    });
  });

  it("calls invalidateProduct when changes contain imageUrl (string)", () => {
    useProductStore
      .getState()
      .updateProduct("prod_invalidation_test", { imageUrl: "data:image/png;base64,BBBB" });
    expect(invalidateMock).toHaveBeenCalledWith("prod_invalidation_test");
    expect(invalidateMock).toHaveBeenCalledTimes(1);
  });

  it("does NOT call invalidateProduct when changes have no imageUrl key", () => {
    useProductStore
      .getState()
      .updateProduct("prod_invalidation_test", { name: "Renamed" });
    expect(invalidateMock).not.toHaveBeenCalled();
  });

  it("calls invalidateProduct when imageUrl is explicitly set to undefined (clear)", () => {
    useProductStore
      .getState()
      .updateProduct("prod_invalidation_test", { imageUrl: undefined } as Partial<Product>);
    expect(invalidateMock).toHaveBeenCalledWith("prod_invalidation_test");
    expect(invalidateMock).toHaveBeenCalledTimes(1);
  });
});

describe("cadStore.updateCustomElement (Phase 89 D-05 — cache invalidation)", () => {
  beforeEach(() => {
    invalidateMock.mockReset();
    // Seed catalog with a known custom element. Reset top-level customElements
    // catalog only; leave the rest of the store snapshot intact (other tests
    // exercise it).
    useCADStore.setState({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(useCADStore.getState() as any),
      customElements: {
        ce_test: {
          id: "ce_test",
          name: "Rug",
          color: "#ff8800",
          shape: "plane",
          width: 4,
          depth: 6,
          height: 0.02,
          imageUrl: "data:image/png;base64,AAAA",
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  it("calls invalidateProduct when changes contain imageUrl", () => {
    useCADStore
      .getState()
      .updateCustomElement("ce_test", { imageUrl: "data:image/png;base64,BBBB" });
    expect(invalidateMock).toHaveBeenCalledWith("ce_test");
    expect(invalidateMock).toHaveBeenCalledTimes(1);
  });

  it("does NOT call invalidateProduct when changes have no imageUrl key", () => {
    useCADStore.getState().updateCustomElement("ce_test", { color: "#ff0000" });
    expect(invalidateMock).not.toHaveBeenCalled();
  });
});
