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
export function effectiveDimensions(
  p: Product | undefined | null,
  scale: number = 1,
): {
  width: number;
  depth: number;
  height: number;
  isPlaceholder: boolean;
} {
  const s = scale > 0 ? scale : 1;
  if (!p || p.width == null || p.depth == null || p.height == null) {
    return {
      width: PLACEHOLDER_DIM_FT * s,
      depth: PLACEHOLDER_DIM_FT * s,
      height: PLACEHOLDER_DIM_FT,
      isPlaceholder: true,
    };
  }
  return {
    width: p.width * s,
    depth: p.depth * s,
    height: p.height,
    isPlaceholder: false,
  };
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

// ---------------------------------------------------------------------------
// Phase 31 — per-axis override resolvers (D-02)
// ---------------------------------------------------------------------------
// NOTE: existing `effectiveDimensions` ABOVE is intentionally LEFT UNCHANGED
// (anti-pattern guard from RESEARCH). Non-placed callers (placement preview,
// productTool) keep using effectiveDimensions(product, scale).

import type { PlacedProduct, PlacedCustomElement, CustomElement } from "@/types/cad";

/**
 * D-02: effective render dims for a placed product, honoring per-axis overrides.
 *   width  = widthFtOverride  ?? (libraryWidth × sizeScale)
 *   depth  = depthFtOverride  ?? (libraryDepth × sizeScale)
 *   height = libraryHeight    (no override; sizeScale never applied to height per existing contract)
 */
export function resolveEffectiveDims(
  product: Product | undefined | null,
  placed: Pick<PlacedProduct, "sizeScale" | "widthFtOverride" | "depthFtOverride">,
): { width: number; depth: number; height: number; isPlaceholder: boolean } {
  const scale = placed.sizeScale && placed.sizeScale > 0 ? placed.sizeScale : 1;
  const isPlaceholder =
    !product ||
    product.width == null ||
    product.depth == null ||
    product.height == null;
  const baseW = isPlaceholder ? PLACEHOLDER_DIM_FT : (product!.width as number);
  const baseD = isPlaceholder ? PLACEHOLDER_DIM_FT : (product!.depth as number);
  const baseH = isPlaceholder ? PLACEHOLDER_DIM_FT : (product!.height as number);
  return {
    width: placed.widthFtOverride ?? baseW * scale,
    depth: placed.depthFtOverride ?? baseD * scale,
    height: baseH,
    isPlaceholder,
  };
}

/**
 * D-02: effective render dims for a placed custom element, honoring per-axis overrides.
 * Custom elements always have numeric dims when defined, so no isPlaceholder flag.
 */
export function resolveEffectiveCustomDims(
  el: CustomElement | undefined,
  placed: Pick<PlacedCustomElement, "sizeScale" | "widthFtOverride" | "depthFtOverride">,
): { width: number; depth: number; height: number } {
  const scale = placed.sizeScale && placed.sizeScale > 0 ? placed.sizeScale : 1;
  if (!el) {
    return {
      width: PLACEHOLDER_DIM_FT,
      depth: PLACEHOLDER_DIM_FT,
      height: PLACEHOLDER_DIM_FT,
    };
  }
  return {
    width: placed.widthFtOverride ?? el.width * scale,
    depth: placed.depthFtOverride ?? el.depth * scale,
    height: el.height,
  };
}
