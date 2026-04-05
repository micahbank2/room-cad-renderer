import { describe, it, expect, vi, beforeEach } from "vitest";

const getMock = vi.fn();
const setMock = vi.fn();
vi.mock("idb-keyval", () => ({
  get: getMock,
  set: setMock,
}));

// Import store AFTER mock — module-level subscribe is attached once here
import { useProductStore } from "@/stores/productStore";
import type { Product } from "@/types/product";

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

beforeEach(() => {
  getMock.mockReset();
  setMock.mockReset();
  // Reset store to pristine initial state before every test
  useProductStore.setState({ products: [], loaded: false });
});

describe("productStore (LIB-03)", () => {
  it("load() hydrates products from idb-keyval room-cad-products key", async () => {
    const stored: Product[] = [makeProduct({ id: "prod_a", name: "A" })];
    getMock.mockResolvedValueOnce(stored);
    await useProductStore.getState().load();
    const state = useProductStore.getState();
    expect(getMock).toHaveBeenCalledWith("room-cad-products");
    expect(state.products).toHaveLength(1);
    expect(state.products[0].name).toBe("A");
    expect(state.loaded).toBe(true);
  });

  it("load() migrates legacy record with numeric dims (pass-through as numbers)", async () => {
    const legacy = [{ id: "l1", name: "Legacy", category: "Seating", width: 3, depth: 2, height: 3, material: "", imageUrl: "", textureUrls: [] }];
    getMock.mockResolvedValueOnce(legacy);
    await useProductStore.getState().load();
    const p = useProductStore.getState().products[0];
    expect(p.width).toBe(3);
    expect(p.depth).toBe(2);
    expect(p.height).toBe(3);
  });

  it("load() migrates legacy record missing width — coerces to null", async () => {
    const legacy: any[] = [{ id: "l2", name: "NoWidth", category: "Seating", depth: 2, height: 3, material: "", imageUrl: "", textureUrls: [] }];
    getMock.mockResolvedValueOnce(legacy);
    await useProductStore.getState().load();
    const p = useProductStore.getState().products[0];
    expect(p.width).toBeNull();
    expect(p.depth).toBe(2);
    expect(p.height).toBe(3);
  });

  it("load() with no stored data sets loaded=true and products stays []", async () => {
    getMock.mockResolvedValueOnce(undefined);
    await useProductStore.getState().load();
    const state = useProductStore.getState();
    expect(state.loaded).toBe(true);
    expect(state.products).toEqual([]);
  });

  it("addProduct appends to products array", async () => {
    getMock.mockResolvedValueOnce(undefined);
    await useProductStore.getState().load();
    useProductStore.getState().addProduct(makeProduct({ id: "a" }));
    useProductStore.getState().addProduct(makeProduct({ id: "b" }));
    expect(useProductStore.getState().products.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("removeProduct filters out by id", async () => {
    getMock.mockResolvedValueOnce(undefined);
    await useProductStore.getState().load();
    useProductStore.getState().addProduct(makeProduct({ id: "a" }));
    useProductStore.getState().addProduct(makeProduct({ id: "b" }));
    useProductStore.getState().removeProduct("a");
    expect(useProductStore.getState().products.map((p) => p.id)).toEqual(["b"]);
  });

  it("updateProduct merges partial changes on matching id", async () => {
    getMock.mockResolvedValueOnce(undefined);
    await useProductStore.getState().load();
    useProductStore.getState().addProduct(makeProduct({ id: "a", name: "Old" }));
    useProductStore.getState().updateProduct("a", { name: "New", width: 5 });
    const p = useProductStore.getState().products[0];
    expect(p.name).toBe("New");
    expect(p.width).toBe(5);
    expect(p.depth).toBe(2); // unchanged
  });

  it("after load(), addProduct triggers set() call with new array", async () => {
    getMock.mockResolvedValueOnce(undefined);
    await useProductStore.getState().load();
    setMock.mockClear();
    useProductStore.getState().addProduct(makeProduct({ id: "a" }));
    expect(setMock).toHaveBeenCalledTimes(1);
    expect(setMock).toHaveBeenCalledWith("room-cad-products", expect.arrayContaining([
      expect.objectContaining({ id: "a" }),
    ]));
  });

  it("before load() resolves, mutating products does NOT trigger set() (guards empty-state overwrite)", () => {
    // loaded is false from beforeEach reset — directly mutate before calling load()
    expect(useProductStore.getState().loaded).toBe(false);
    useProductStore.getState().addProduct(makeProduct({ id: "pre" }));
    expect(setMock).not.toHaveBeenCalled();
  });
});
