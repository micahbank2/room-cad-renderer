import { create } from "zustand";
import { produce } from "immer";
import { get, set } from "idb-keyval";
import type { Product } from "@/types/product";

const PRODUCTS_KEY = "room-cad-products";

/** Persist the full products list to IndexedDB. Logs errors instead of swallowing. */
function persistProducts(products: Product[]): void {
  set(PRODUCTS_KEY, products).catch((err) => {
    console.error("[productStore] Failed to persist products to IndexedDB:", err);
  });
}

interface ProductState {
  products: Product[];
  loaded: boolean;
  load: () => Promise<void>;
  addProduct: (p: Product) => void;
  removeProduct: (id: string) => void;
  updateProduct: (id: string, changes: Partial<Product>) => void;
}

export const useProductStore = create<ProductState>()((setState, getState) => ({
  products: [],
  loaded: false,

  load: async () => {
    // Guard against double-load (React 18 strict mode)
    if (getState().loaded) return;
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

  addProduct: (p) => {
    setState(
      produce((s: ProductState) => {
        s.products.push(p);
      })
    );
    // Explicit persist — don't rely solely on subscription
    persistProducts(getState().products);
  },

  removeProduct: (id) => {
    setState(
      produce((s: ProductState) => {
        s.products = s.products.filter((x) => x.id !== id);
      })
    );
    persistProducts(getState().products);
  },

  updateProduct: (id, changes) => {
    setState(
      produce((s: ProductState) => {
        const prod = s.products.find((x) => x.id === id);
        if (prod) Object.assign(prod, changes);
      })
    );
    persistProducts(getState().products);
  },
}));
