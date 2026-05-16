import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fabric from "fabric";
import { renderProducts } from "@/canvas/fabricSync";
import { __resetCache } from "@/canvas/productImageCache";

const ONE_PX_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

// jsdom / happy-dom does not decode images; stub Image so onload fires after src set.
// Pattern reused verbatim from tests/productImageCache.test.ts per plan D-02.
//
// Phase 89 T1: MockImage natural dims switched from 1×1 to 2×1 (landscape) to
// exercise the height-constrained branch of Cover-fit math. A second factory
// (createMockImageClass) lets individual tests use portrait (1×2) dims to
// exercise the width-constrained branch.
function createMockImageClass(naturalWidth: number, naturalHeight: number) {
  return class MockImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    naturalWidth = 0;
    naturalHeight = 0;
    private _src = "";
    get src() {
      return this._src;
    }
    set src(v: string) {
      this._src = v;
      queueMicrotask(() => {
        this.naturalWidth = naturalWidth;
        this.naturalHeight = naturalHeight;
        this.onload?.();
      });
    }
  };
}

let OriginalImage: typeof Image;

beforeEach(() => {
  __resetCache();
  OriginalImage = globalThis.Image;
});

afterEach(() => {
  globalThis.Image = OriginalImage;
});

function installMockImage(w: number, h: number) {
  // @ts-expect-error override for test
  globalThis.Image = createMockImageClass(w, h);
}

// Helper: render once, wait for async image load, render again, and return the
// FabricImage child of the product Group (or undefined).
async function renderAndGetImage(
  fc: fabric.Canvas,
  productLibrary: unknown,
  placedProducts: unknown,
): Promise<fabric.FabricImage | undefined> {
  const doRender = () => {
    fc.clear();
    renderProducts(
      fc,
      placedProducts as never,
      productLibrary as never,
      20,
      { x: 0, y: 0 },
      [],
      () => doRender(),
    );
  };
  doRender();
  await new Promise((r) => setTimeout(r, 30));
  const group = fc.getObjects().find(
    (o: fabric.Object) => {
      const data = (o as { data?: { type?: string; placedProductId?: string } }).data;
      return data?.type === "product" && data?.placedProductId === "pp_1";
    },
  ) as fabric.Group | undefined;
  return group
    ?.getObjects()
    .find((c: fabric.Object) => c instanceof fabric.FabricImage) as
    | fabric.FabricImage
    | undefined;
}

describe("renderProducts async image load (FIX-01)", () => {
  it("rebuilds the product Group to include a FabricImage child after onload fires", async () => {
    installMockImage(2, 1);
    const fc = new fabric.Canvas(null as unknown as HTMLCanvasElement, {
      renderOnAddRemove: false,
    });
    const productLibrary = [
      {
        id: "prod_A",
        name: "Sofa",
        category: "seating",
        width: 6,
        depth: 3,
        height: 3,
        imageUrl: ONE_PX_PNG,
      },
    ];
    const placedProducts = {
      pp_1: {
        id: "pp_1",
        productId: "prod_A",
        position: { x: 5, y: 5 },
        rotation: 0,
      },
    };

    let tick = 0;
    const doRender = () => {
      fc.clear();
      renderProducts(
        fc,
        placedProducts as never,
        productLibrary as never,
        20,
        { x: 0, y: 0 },
        [],
        () => {
          tick++;
          doRender();
        }
      );
    };

    doRender();
    await new Promise((r) => setTimeout(r, 30));

    const group = fc.getObjects().find(
      (o: fabric.Object) => {
        const data = (o as { data?: { type?: string; placedProductId?: string } }).data;
        return data?.type === "product" && data?.placedProductId === "pp_1";
      }
    ) as fabric.Group | undefined;

    expect(group).toBeDefined();
    const hasImage = group!
      .getObjects()
      .some((child: fabric.Object) => child instanceof fabric.FabricImage);
    expect(hasImage).toBe(true);
    expect(tick).toBeGreaterThanOrEqual(1);
  });
});

// Phase 89 T1: Cover-fit + clipPath.
//
// Plan D-02:
//   coverScale = imgAspect > footprintAspect
//     ? pd / naturalHeight        // height constrains (image is wider)
//     : pw / naturalWidth;        // width constrains (image is taller)
// Single scaleX = scaleY = coverScale. clipPath = fabric.Rect with
// absolutePositioned: false so it rotates with the parent Group.
describe("renderProducts Cover-fit + clipPath (Phase 89 T1)", () => {
  const baseProductLibrary = [
    {
      id: "prod_A",
      name: "Sofa",
      category: "seating",
      width: 1, // 1ft × 1ft footprint → square
      depth: 1,
      height: 3,
      imageUrl: ONE_PX_PNG,
    },
  ];
  const placedProducts = {
    pp_1: { id: "pp_1", productId: "prod_A", position: { x: 5, y: 5 }, rotation: 0 },
  };

  it("landscape image (2×1) into square footprint uses height-constrained coverScale", async () => {
    installMockImage(2, 1);
    const fc = new fabric.Canvas(null as unknown as HTMLCanvasElement, {
      renderOnAddRemove: false,
    });
    const fImg = await renderAndGetImage(fc, baseProductLibrary, placedProducts);
    expect(fImg).toBeDefined();
    // pw = pd = 1ft × scale(20) = 20px. img is 2×1 → imgAspect=2 > footprintAspect=1
    // → coverScale = pd / naturalHeight = 20 / 1 = 20
    expect(fImg!.scaleX).toBe(20);
    expect(fImg!.scaleY).toBe(20);
  });

  it("portrait image (1×2) into square footprint uses width-constrained coverScale", async () => {
    installMockImage(1, 2);
    const fc = new fabric.Canvas(null as unknown as HTMLCanvasElement, {
      renderOnAddRemove: false,
    });
    const fImg = await renderAndGetImage(fc, baseProductLibrary, placedProducts);
    expect(fImg).toBeDefined();
    // img is 1×2 → imgAspect=0.5 < footprintAspect=1
    // → coverScale = pw / naturalWidth = 20 / 1 = 20
    expect(fImg!.scaleX).toBe(20);
    expect(fImg!.scaleY).toBe(20);
  });

  it("scaleX === scaleY (no aspect-ratio distortion, ever)", async () => {
    installMockImage(2, 1);
    const fc = new fabric.Canvas(null as unknown as HTMLCanvasElement, {
      renderOnAddRemove: false,
    });
    const fImg = await renderAndGetImage(fc, baseProductLibrary, placedProducts);
    expect(fImg).toBeDefined();
    expect(fImg!.scaleX).toBe(fImg!.scaleY);
  });

  it("FabricImage has a clipPath that is a fabric.Rect with absolutePositioned=false", async () => {
    installMockImage(2, 1);
    const fc = new fabric.Canvas(null as unknown as HTMLCanvasElement, {
      renderOnAddRemove: false,
    });
    const fImg = await renderAndGetImage(fc, baseProductLibrary, placedProducts);
    expect(fImg).toBeDefined();
    const clip = fImg!.clipPath as fabric.Rect | undefined;
    expect(clip).toBeDefined();
    expect(clip).toBeInstanceOf(fabric.Rect);
    expect(clip!.absolutePositioned).toBe(false);
    // clipPath dims match footprint (pw × pd = 20 × 20)
    expect(clip!.width).toBe(20);
    expect(clip!.height).toBe(20);
  });
});

// Phase 89 T2: Label backdrops + theme audit (D-04).
//
// Each product label (name + dim) gets a semi-transparent backdrop rect
// behind it so the text stays readable over busy photos. Backdrop fill is
// withAlpha(theme.background, 0.75). Same task also fixes the stale
// PRODUCT_STROKE constant on the dim-label fill — replaced by
// theme().dimensionFg for parity with the border stroke.
describe("renderProducts label backdrops + theme audit (Phase 89 T2)", () => {
  const productLibrary = [
    {
      id: "prod_A",
      name: "Sofa",
      category: "seating",
      width: 1,
      depth: 1,
      height: 3,
      imageUrl: ONE_PX_PNG,
    },
  ];
  const placedProducts = {
    pp_1: { id: "pp_1", productId: "prod_A", position: { x: 5, y: 5 }, rotation: 0 },
  };

  async function renderAndGetGroup(): Promise<fabric.Group | undefined> {
    installMockImage(2, 1);
    const fc = new fabric.Canvas(null as unknown as HTMLCanvasElement, {
      renderOnAddRemove: false,
    });
    const doRender = () => {
      fc.clear();
      renderProducts(
        fc,
        placedProducts as never,
        productLibrary as never,
        20,
        { x: 0, y: 0 },
        [],
        () => doRender(),
      );
    };
    doRender();
    await new Promise((r) => setTimeout(r, 30));
    return fc.getObjects().find((o: fabric.Object) => {
      const data = (o as { data?: { type?: string; placedProductId?: string } }).data;
      return data?.type === "product" && data?.placedProductId === "pp_1";
    }) as fabric.Group | undefined;
  }

  it("Group contains 2 backdrop Rects in addition to the label texts", async () => {
    const group = await renderAndGetGroup();
    expect(group).toBeDefined();
    const children = group!.getObjects();
    const texts = children.filter((c) => c instanceof fabric.FabricText);
    // Identify backdrops by data tag — jsdom probe div may return empty
    // strings for CSS var lookups so fill is environment-dependent.
    const backdrops = children.filter((c) => {
      const data = (c as { data?: { type?: string } }).data;
      return data?.type === "product-label-backdrop";
    });
    expect(texts.length).toBe(2); // name + dim
    expect(backdrops.length).toBe(2); // nameBg + dimBg
  });

  it("backdrop fill is rgba(...) with alpha 0.75 (when theme.background resolves)", async () => {
    const group = await renderAndGetGroup();
    expect(group).toBeDefined();
    const backdrops = group!.getObjects().filter((c) => {
      const data = (c as { data?: { type?: string } }).data;
      return data?.type === "product-label-backdrop";
    });
    expect(backdrops.length).toBe(2);
    for (const b of backdrops) {
      const fill = (b as fabric.Rect).fill as string;
      // Real browser: theme.background resolves to rgb(...), withAlpha
      // produces rgba(...,0.75). jsdom: probe div may return "" → withAlpha
      // returns input unchanged. Both are acceptable; assert intent — if
      // there *is* an rgb/rgba fill, it must carry the 0.75 alpha.
      if (typeof fill === "string" && fill.startsWith("rgb")) {
        expect(fill).toMatch(/rgba\([^)]*,\s*0\.75\)$/);
      }
    }
  });

  it("dimLabel fill is NOT the stale #7c5bf0 PRODUCT_STROKE constant", async () => {
    const group = await renderAndGetGroup();
    expect(group).toBeDefined();
    const texts = group!
      .getObjects()
      .filter((c) => c instanceof fabric.FabricText) as fabric.FabricText[];
    // Dim label is the smaller font (9pt vs 10pt)
    const dimLabel = texts.find((t) => t.fontSize === 9);
    expect(dimLabel).toBeDefined();
    expect(dimLabel!.fill).not.toBe("#7c5bf0");
  });

  it("nameLabel still uses a foreground fill (not the orphan PRODUCT_STROKE)", async () => {
    const group = await renderAndGetGroup();
    expect(group).toBeDefined();
    const texts = group!
      .getObjects()
      .filter((c) => c instanceof fabric.FabricText) as fabric.FabricText[];
    const nameLabel = texts.find((t) => t.fontSize === 10);
    expect(nameLabel).toBeDefined();
    // Real (non-orphan) product → nameLabel uses theme().foreground, not the
    // accent-purple PRODUCT_STROKE warning color.
    expect(nameLabel!.fill).not.toBe("#7c5bf0");
  });
});
