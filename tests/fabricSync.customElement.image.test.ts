// Phase 89 T3: D-03 — custom elements get image rendering via getCachedImage
// + Cover-fit + clipPath, mirroring the product image path.
//
// When CustomElement.imageUrl is set, renderCustomElements emits a single
// fabric.Group per placed element containing [rect, fImg?, labelBg, label],
// and the Group carries `data: { type: "custom-element", placedId }`. When
// imageUrl is absent, the fallback Group still emits [rect, labelBg, label]
// (no fImg child), preserving the existing colored-rect look.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fabric from "fabric";
import { renderCustomElements } from "@/canvas/fabricSync";
import { __resetCache } from "@/canvas/productImageCache";

const ONE_PX_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

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

function findCustomGroup(fc: fabric.Canvas, placedId: string): fabric.Group | undefined {
  return fc.getObjects().find((o: fabric.Object) => {
    const data = (o as { data?: { type?: string; placedId?: string } }).data;
    return data?.type === "custom-element" && data?.placedId === placedId;
  }) as fabric.Group | undefined;
}

describe("renderCustomElements image branch (Phase 89 T3)", () => {
  const placed = {
    pce_1: {
      id: "pce_1",
      customElementId: "ce_A",
      position: { x: 5, y: 5 },
      rotation: 0,
    },
  };

  it("renders a fabric.Group with rect + image + label when imageUrl is set", async () => {
    installMockImage(2, 1);
    const fc = new fabric.Canvas(null as unknown as HTMLCanvasElement, {
      renderOnAddRemove: false,
    });
    const catalog = {
      ce_A: {
        id: "ce_A",
        name: "Rug",
        color: "#ff8800",
        shape: "plane" as const,
        width: 1,
        depth: 1,
        height: 0.02,
        imageUrl: ONE_PX_PNG,
      },
    };

    const doRender = () => {
      fc.clear();
      renderCustomElements(
        fc,
        placed as never,
        catalog as never,
        20,
        { x: 0, y: 0 },
        [],
        null,
        () => doRender(),
      );
    };
    doRender();
    await new Promise((r) => setTimeout(r, 30));

    const group = findCustomGroup(fc, "pce_1");
    expect(group).toBeDefined();
    const children = group!.getObjects();
    const hasRect = children.some(
      (c) => c instanceof fabric.Rect && !((c as { data?: { type?: string } }).data?.type === "custom-element-label-backdrop"),
    );
    const hasImage = children.some((c) => c instanceof fabric.FabricImage);
    const hasLabel = children.some((c) => c instanceof fabric.FabricText);
    expect(hasRect).toBe(true);
    expect(hasImage).toBe(true);
    expect(hasLabel).toBe(true);
  });

  it("falls back to rect + label (no image child) when imageUrl is absent", () => {
    const fc = new fabric.Canvas(null as unknown as HTMLCanvasElement, {
      renderOnAddRemove: false,
    });
    const catalog = {
      ce_A: {
        id: "ce_A",
        name: "Rug",
        color: "#ff8800",
        shape: "plane" as const,
        width: 1,
        depth: 1,
        height: 0.02,
        // imageUrl OMITTED
      },
    };

    renderCustomElements(
      fc,
      placed as never,
      catalog as never,
      20,
      { x: 0, y: 0 },
      [],
      null,
      () => void 0,
    );

    const group = findCustomGroup(fc, "pce_1");
    expect(group).toBeDefined();
    const children = group!.getObjects();
    const hasImage = children.some((c) => c instanceof fabric.FabricImage);
    expect(hasImage).toBe(false);
    const hasRect = children.some((c) => c instanceof fabric.Rect);
    const hasLabel = children.some((c) => c instanceof fabric.FabricText);
    expect(hasRect).toBe(true);
    expect(hasLabel).toBe(true);
  });

  it("async load: first render no image; cache populates; onAssetReady fires; second render includes image", async () => {
    installMockImage(2, 1);
    const fc = new fabric.Canvas(null as unknown as HTMLCanvasElement, {
      renderOnAddRemove: false,
    });
    const catalog = {
      ce_A: {
        id: "ce_A",
        name: "Rug",
        color: "#ff8800",
        shape: "plane" as const,
        width: 1,
        depth: 1,
        height: 0.02,
        imageUrl: ONE_PX_PNG,
      },
    };

    let tick = 0;
    const doRender = () => {
      fc.clear();
      renderCustomElements(
        fc,
        placed as never,
        catalog as never,
        20,
        { x: 0, y: 0 },
        [],
        null,
        () => {
          tick++;
          doRender();
        },
      );
    };

    doRender();
    // After first synchronous render the Group has no image child
    let group = findCustomGroup(fc, "pce_1");
    expect(group).toBeDefined();
    let hasImageFirst = group!
      .getObjects()
      .some((c) => c instanceof fabric.FabricImage);
    expect(hasImageFirst).toBe(false);

    await new Promise((r) => setTimeout(r, 30));
    expect(tick).toBeGreaterThanOrEqual(1);

    group = findCustomGroup(fc, "pce_1");
    expect(group).toBeDefined();
    const hasImageAfter = group!
      .getObjects()
      .some((c) => c instanceof fabric.FabricImage);
    expect(hasImageAfter).toBe(true);
  });

  it("Group inherits placed-element rotation (image rotates with parent)", async () => {
    installMockImage(2, 1);
    const fc = new fabric.Canvas(null as unknown as HTMLCanvasElement, {
      renderOnAddRemove: false,
    });
    const catalog = {
      ce_A: {
        id: "ce_A",
        name: "Rug",
        color: "#ff8800",
        shape: "plane" as const,
        width: 1,
        depth: 1,
        height: 0.02,
        imageUrl: ONE_PX_PNG,
      },
    };
    const rotated = {
      pce_1: {
        id: "pce_1",
        customElementId: "ce_A",
        position: { x: 5, y: 5 },
        rotation: 45,
      },
    };

    const doRender = () => {
      fc.clear();
      renderCustomElements(
        fc,
        rotated as never,
        catalog as never,
        20,
        { x: 0, y: 0 },
        [],
        null,
        () => doRender(),
      );
    };
    doRender();
    await new Promise((r) => setTimeout(r, 30));

    const group = findCustomGroup(fc, "pce_1");
    expect(group).toBeDefined();
    expect(group!.angle).toBe(45);
    // FabricImage child carries a clipPath with absolutePositioned=false so
    // it rotates with the parent Group.
    const fImg = group!
      .getObjects()
      .find((c) => c instanceof fabric.FabricImage) as fabric.FabricImage | undefined;
    expect(fImg).toBeDefined();
    const clip = fImg!.clipPath as fabric.Rect | undefined;
    expect(clip).toBeDefined();
    expect(clip!.absolutePositioned).toBe(false);
  });
});
