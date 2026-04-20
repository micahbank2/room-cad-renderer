import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { effectiveDimensions } from "@/types/product";
import type { Product } from "@/types/product";

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: "p1",
  name: "Real Chair",
  category: "Seating",
  width: 3,
  depth: 2,
  height: 3,
  material: "",
  imageUrl: "",
  textureUrls: [],
  ...overrides,
});

describe("fabricSync placeholder branching (LIB-03/04)", () => {
  it("orphan (undefined product) → isPlaceholder=true, 2x2x2 dims", () => {
    const d = effectiveDimensions(undefined);
    expect(d.isPlaceholder).toBe(true);
    expect(d.width).toBe(2);
    expect(d.depth).toBe(2);
    expect(d.height).toBe(2);
  });

  it("real product → isPlaceholder=false, actual dims", () => {
    const d = effectiveDimensions(makeProduct());
    expect(d.isPlaceholder).toBe(false);
    expect(d.width).toBe(3);
    expect(d.depth).toBe(2);
    expect(d.height).toBe(3);
  });

  it("null-width product → isPlaceholder=true, 2x2 fallback", () => {
    const d = effectiveDimensions(makeProduct({ width: null }));
    expect(d.isPlaceholder).toBe(true);
    expect(d.width).toBe(2);
    expect(d.depth).toBe(2);
  });

  it("null-depth product → isPlaceholder=true", () => {
    const d = effectiveDimensions(makeProduct({ depth: null }));
    expect(d.isPlaceholder).toBe(true);
  });

  it("null-height product → isPlaceholder=true", () => {
    const d = effectiveDimensions(makeProduct({ height: null }));
    expect(d.isPlaceholder).toBe(true);
  });
});

describe("Phase 25 Wave 0 — canvas fast-path contract", () => {
  it("renderOnAddRemove disabled", () => {
    // Source-level guard — Wave 2 (D-02) sets renderOnAddRemove: false on
    // the fabric.Canvas init. Pre-migration this assertion FAILS RED because
    // the default (true) is still in effect.
    const src = readFileSync(
      resolve(process.cwd(), "src/canvas/FabricCanvas.tsx"),
      "utf8",
    );
    expect(src).toContain("renderOnAddRemove: false");
  });

  it("fast path does not clear canvas during drag", () => {
    // Source-level guard for D-01 / D-03 (fast-path drag contract):
    //
    //   1. The product-drag branch of onMouseMove must use the Fabric fast
    //      path — mutating the Fabric Group's left/top directly and calling
    //      fc.requestRenderAll() — rather than pushing a store update that
    //      triggers a full redraw via moveProduct on every move.
    //
    //   2. The onMouseMove handler must NOT call fc.clear() on moves.
    //
    // Pre-migration this FAILS RED because the current selectTool calls
    // `useCADStore.getState().moveProduct(dragId, snapped)` inside the
    // mouse:move product-drag branch (line ~630 of selectTool.ts).
    //
    // Wave 2 refactors this to:
    //   - Set `fabricObj.left = ...; fabricObj.top = ...;`
    //   - Call `fc.requestRenderAll()`
    //   - Defer the single moveProduct/updateWall commit to mouse:up.
    const src = readFileSync(
      resolve(process.cwd(), "src/canvas/tools/selectTool.ts"),
      "utf8",
    );

    // Locate the onMouseMove function body.
    const mmStart = src.indexOf("const onMouseMove");
    expect(mmStart).toBeGreaterThanOrEqual(0);
    const mmRest = src.slice(mmStart);
    const mmEndIdx = mmRest.indexOf("const onMouseUp");
    const mmBody = mmEndIdx > 0 ? mmRest.slice(0, mmEndIdx) : mmRest;

    // Fast-path requirement: requestRenderAll must appear in mouse:move.
    expect(mmBody).toContain("requestRenderAll");

    // No clear: onMouseMove must not invoke fc.clear() during drag ticks.
    expect(mmBody).not.toMatch(/\bfc\.clear\s*\(/);

    // History-free drag: the product-drag branch must NOT call the
    // history-pushing `moveProduct` action on every move. (updateWallNoHistory
    // is allowed for non-product branches; this check targets moveProduct
    // specifically, which is the committing variant.)
    expect(mmBody).not.toMatch(/\.moveProduct\s*\(/);
  });
});
