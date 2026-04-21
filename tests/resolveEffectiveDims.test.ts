/**
 * Phase 31 Wave 0 — Red stubs for the per-axis override resolver
 * (`resolveEffectiveDims` + `resolveEffectiveCustomDims`).
 *
 * These tests lock the EDIT-22 D-02 contract:
 *   effective dim = override ?? (libraryDim × sizeScale)
 *
 * They MUST fail on this commit — the new exports do not yet live in
 * `src/types/product.ts`. Plan 31-02 adds them as wrappers around the
 * existing `effectiveDimensions` helper (which keeps its old signature
 * for non-placed callers like productTool placement preview).
 *
 * Driver-bridge contracts advertised here for Plan 31-02 / Plan 31-03:
 *   window.__driveResize / __driveLabelOverride — see tests/phase31*.test.tsx
 */
import { describe, it, expect } from "vitest";
import {
  resolveEffectiveDims,
  resolveEffectiveCustomDims,
  PLACEHOLDER_DIM_FT,
} from "@/types/product";
import type { Product } from "@/types/product";
import type { PlacedProduct, PlacedCustomElement, CustomElement } from "@/types/cad";

// --- Fixtures -------------------------------------------------------------

function makeProduct(overrides: Partial<Product> = {}): Product {
  // NOTE: use `in` checks (not ??) so explicit null values propagate.
  // Fixes a Wave 0 test-fixture bug where `width: null` was coerced to 4.
  return {
    id: overrides.id ?? "prod-1",
    name: overrides.name ?? "Couch",
    category: overrides.category ?? "Seating",
    width: "width" in overrides ? (overrides.width as number | null) : 4,
    depth: "depth" in overrides ? (overrides.depth as number | null) : 2,
    height: "height" in overrides ? (overrides.height as number | null) : 3,
    material: overrides.material ?? "fabric",
    imageUrl: overrides.imageUrl ?? "",
    textureUrls: overrides.textureUrls ?? [],
    modelUrl: overrides.modelUrl,
  };
}

function makeCustomElement(overrides: Partial<CustomElement> = {}): CustomElement {
  return {
    id: overrides.id ?? "ce-1",
    name: overrides.name ?? "Fridge",
    shape: overrides.shape ?? "box",
    width: overrides.width ?? 3,
    depth: overrides.depth ?? 3,
    height: overrides.height ?? 6,
    color: overrides.color ?? "#cccccc",
  };
}

// --- resolveEffectiveDims (PlacedProduct) ---------------------------------

describe("resolveEffectiveDims (D-02 — override ?? libraryDim × sizeScale)", () => {
  it("no overrides → libraryDim × sizeScale", () => {
    const product = makeProduct({ width: 4, depth: 2, height: 3 });
    const placed: Pick<PlacedProduct, "sizeScale" | "widthFtOverride" | "depthFtOverride"> = { sizeScale: 2 };
    const result = resolveEffectiveDims(product, placed);
    expect(result.width).toBeCloseTo(8);
    expect(result.depth).toBeCloseTo(4);
    expect(result.height).toBeCloseTo(3);
    expect(result.isPlaceholder).toBe(false);
  });

  it("widthFtOverride wins over sizeScale × libraryWidth", () => {
    const product = makeProduct({ width: 4, depth: 2, height: 3 });
    const placed = { sizeScale: 2, widthFtOverride: 10 };
    const result = resolveEffectiveDims(product, placed);
    expect(result.width).toBeCloseTo(10);
    expect(result.depth).toBeCloseTo(4); // sizeScale still applies to depth
    expect(result.height).toBeCloseTo(3);
  });

  it("depthFtOverride wins over sizeScale × libraryDepth", () => {
    const product = makeProduct({ width: 4, depth: 2, height: 3 });
    const placed = { sizeScale: 2, depthFtOverride: 5 };
    const result = resolveEffectiveDims(product, placed);
    expect(result.width).toBeCloseTo(8);
    expect(result.depth).toBeCloseTo(5);
    expect(result.height).toBeCloseTo(3);
  });

  it("both width + depth overrides win independently", () => {
    const product = makeProduct({ width: 4, depth: 2, height: 3 });
    const placed = { sizeScale: 2, widthFtOverride: 10, depthFtOverride: 5 };
    const result = resolveEffectiveDims(product, placed);
    expect(result.width).toBeCloseTo(10);
    expect(result.depth).toBeCloseTo(5);
    expect(result.height).toBeCloseTo(3);
  });

  it("orphan product (undefined) → placeholder fallback (2x2x2, isPlaceholder:true)", () => {
    const result = resolveEffectiveDims(undefined, { sizeScale: 1 });
    expect(result.width).toBeCloseTo(PLACEHOLDER_DIM_FT);
    expect(result.depth).toBeCloseTo(PLACEHOLDER_DIM_FT);
    expect(result.height).toBeCloseTo(PLACEHOLDER_DIM_FT);
    expect(result.isPlaceholder).toBe(true);
  });

  it("product with null width takes placeholder path", () => {
    const product = makeProduct({ width: null });
    const result = resolveEffectiveDims(product, {});
    expect(result.isPlaceholder).toBe(true);
  });

  it("missing sizeScale defaults to 1", () => {
    const product = makeProduct({ width: 4, depth: 2, height: 3 });
    const result = resolveEffectiveDims(product, {});
    expect(result.width).toBeCloseTo(4);
    expect(result.depth).toBeCloseTo(2);
    expect(result.height).toBeCloseTo(3);
    expect(result.isPlaceholder).toBe(false);
  });
});

// --- resolveEffectiveCustomDims (PlacedCustomElement) ---------------------

describe("resolveEffectiveCustomDims (D-02 — override ?? libraryDim × sizeScale)", () => {
  it("no overrides, sizeScale=1 → returns library dims unchanged", () => {
    const el = makeCustomElement({ width: 3, depth: 3, height: 7 });
    const placed: Pick<PlacedCustomElement, "sizeScale" | "widthFtOverride" | "depthFtOverride"> = { sizeScale: 1 };
    const result = resolveEffectiveCustomDims(el, placed);
    expect(result.width).toBeCloseTo(3);
    expect(result.depth).toBeCloseTo(3);
    expect(result.height).toBeCloseTo(7);
  });

  it("widthFtOverride wins over sizeScale × libraryWidth", () => {
    const el = makeCustomElement({ width: 3, depth: 3, height: 7 });
    const result = resolveEffectiveCustomDims(el, { sizeScale: 1, widthFtOverride: 6 });
    expect(result.width).toBeCloseTo(6);
    expect(result.depth).toBeCloseTo(3);
    expect(result.height).toBeCloseTo(7);
  });

  it("undefined custom element → placeholder (2x2x2)", () => {
    const result = resolveEffectiveCustomDims(undefined, {});
    expect(result.width).toBeCloseTo(PLACEHOLDER_DIM_FT);
    expect(result.depth).toBeCloseTo(PLACEHOLDER_DIM_FT);
    expect(result.height).toBeCloseTo(PLACEHOLDER_DIM_FT);
  });

  it("D-02: override takes precedence over sizeScale on per-axis basis", () => {
    const el = makeCustomElement({ width: 3, depth: 3, height: 7 });
    const result = resolveEffectiveCustomDims(el, { sizeScale: 2, depthFtOverride: 4 });
    expect(result.width).toBeCloseTo(6); // sizeScale × library
    expect(result.depth).toBeCloseTo(4); // override wins
  });
});
