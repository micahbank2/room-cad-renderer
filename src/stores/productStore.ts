import { create } from "zustand";
import { produce } from "immer";
import { get, set } from "idb-keyval";
import type { Product } from "@/types/product";

const PRODUCTS_KEY = "room-cad-products";

interface ProductState {
  products: Product[];
  loaded: boolean;
  load: () => Promise<void>;
  addProduct: (p: Product) => void;
  removeProduct: (id: string) => void;
  updateProduct: (id: string, changes: Partial<Product>) => void;
}

export const useProductStore = create<ProductState>()((setState) => ({
  products: [],
  loaded: false,

  load: async () => {
    const stored = await get<Product[]>(PRODUCTS_KEY);
    if (stored && Array.isArray(stored)) {
      // Migrate legacy records: coerce non-number dims to null (LIB-04 schema change)
      const migrated: Product[] = stored.map((p) => ({
        ...p,
        width: typeof p.width === "number" ? p.width : null,
        depth: typeof p.depth === "number" ? p.depth : null,
        height: typeof p.height === "number" ? p.height : null,
        textureUrls: Array.isArray(p.textureUrls) ? p.textureUrls : [],
      }));
      setState({ products: migrated, loaded: true });
    } else {
      setState({ loaded: true });
    }
  },

  addProduct: (p) =>
    setState(
      produce((s: ProductState) => {
        s.products.push(p);
      })
    ),

  removeProduct: (id) =>
    setState(
      produce((s: ProductState) => {
        s.products = s.products.filter((x) => x.id !== id);
      })
    ),

  updateProduct: (id, changes) =>
    setState(
      produce((s: ProductState) => {
        const prod = s.products.find((x) => x.id === id);
        if (prod) Object.assign(prod, changes);
      })
    ),
}));

// Persist to IndexedDB on every products-reference change, but only AFTER load() completes
// (prevents the initial empty-state render from overwriting saved data — Pitfall 3)
useProductStore.subscribe((state, prev) => {
  if (state.loaded && state.products !== prev.products) {
    set(PRODUCTS_KEY, state.products).catch(() => {});
  }
});
