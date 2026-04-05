export interface Product {
  id: string;
  name: string;
  category: string;
  width: number | null;   // feet, null = unspecified (LIB-04)
  depth: number | null;   // feet, null = unspecified
  height: number | null;  // feet, null = unspecified
  material: string;
  imageUrl: string;       // data URL or blob URL
  modelUrl?: string;      // .glb/.obj blob URL
  textureUrls: string[];
}

export const PRODUCT_CATEGORIES = [
  "Seating",
  "Tables",
  "Storage",
  "Beds",
  "Lighting",
  "Rugs",
  "Decor",
  "Appliances",
  "Other",
] as const;

/** Placeholder dimension for null-dim / orphan products (feet). */
export const PLACEHOLDER_DIM_FT = 2;

/** True if all three dimensions are real numbers. */
export function hasDimensions(p: Product): boolean {
  return typeof p.width === "number" && typeof p.depth === "number" && typeof p.height === "number";
}

/**
 * Returns effective render dimensions for a product.
 * If product is undefined (orphan) OR any dim is null, returns 2x2x2 + isPlaceholder:true.
 */
export function effectiveDimensions(p: Product | undefined | null): {
  width: number;
  depth: number;
  height: number;
  isPlaceholder: boolean;
} {
  if (!p || p.width == null || p.depth == null || p.height == null) {
    return {
      width: PLACEHOLDER_DIM_FT,
      depth: PLACEHOLDER_DIM_FT,
      height: PLACEHOLDER_DIM_FT,
      isPlaceholder: true,
    };
  }
  return { width: p.width, depth: p.depth, height: p.height, isPlaceholder: false };
}

/**
 * Case-insensitive substring name filter (LIB-05).
 * Empty / whitespace-only query returns the full list.
 */
export function searchProducts(query: string, products: Product[]): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return products;
  return products.filter((p) => p.name.toLowerCase().includes(q));
}
