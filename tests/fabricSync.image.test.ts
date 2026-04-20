import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fabric from "fabric";
import { renderProducts } from "@/canvas/fabricSync";
import { __resetCache } from "@/canvas/productImageCache";

const ONE_PX_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

// jsdom / happy-dom does not decode images; stub Image so onload fires after src set.
// Pattern reused verbatim from tests/productImageCache.test.ts per plan D-02.
class MockImage {
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
      this.naturalWidth = 1;
      this.naturalHeight = 1;
      this.onload?.();
    });
  }
}

let OriginalImage: typeof Image;

beforeEach(() => {
  __resetCache();
  OriginalImage = globalThis.Image;
  // @ts-expect-error override for test
  globalThis.Image = MockImage;
});

afterEach(() => {
  globalThis.Image = OriginalImage;
});

describe("renderProducts async image load (FIX-01)", () => {
  it("rebuilds the product Group to include a FabricImage child after onload fires", async () => {
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

    // Simulate what FabricCanvas.redraw() does: on each pass, clear the canvas
    // and re-invoke renderProducts. The onImageReady callback stands in for
    // the React tick state change that triggers the next redraw.
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

    // First render — image cache miss, Group built WITHOUT FabricImage
    doRender();

    // Wait for MockImage onload → cache onReady → onImageReady → re-render
    await new Promise((r) => setTimeout(r, 30));

    // Assertion: the product Group MUST now contain a FabricImage child
    // because the onImageReady callback triggered a Group rebuild.
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
