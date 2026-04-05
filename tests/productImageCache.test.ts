import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getCachedImage, invalidateProduct, __resetCache } from "@/canvas/productImageCache";

const ONE_PX_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

// jsdom does not decode images; stub Image so onload fires synchronously after src set
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
    // Simulate async decode
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

describe("productImageCache", () => {
  it("cache hit/miss: returns null on miss, cached HTMLImageElement on hit", async () => {
    const onReady = vi.fn();
    const first = getCachedImage("p1", ONE_PX_PNG, onReady);
    expect(first).toBeNull();
    // wait for onload microtask
    await new Promise((r) => setTimeout(r, 10));
    const second = getCachedImage("p1", ONE_PX_PNG, onReady);
    expect(second).not.toBeNull();
  });

  it("async load: onload populates cache and invokes onReady callback exactly once", async () => {
    const onReady = vi.fn();
    getCachedImage("p2", ONE_PX_PNG, onReady);
    await new Promise((r) => setTimeout(r, 10));
    expect(onReady).toHaveBeenCalledTimes(1);
    // subsequent hits should NOT call onReady again
    getCachedImage("p2", ONE_PX_PNG, onReady);
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it("invalidateProduct removes from cache", async () => {
    const onReady = vi.fn();
    getCachedImage("p3", ONE_PX_PNG, onReady);
    await new Promise((r) => setTimeout(r, 10));
    invalidateProduct("p3");
    const after = getCachedImage("p3", ONE_PX_PNG, onReady);
    expect(after).toBeNull();
  });
});
