import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Wave 0 vitest for THUMB-01 — covers cases a..e plus single-renderer invariant.
 *
 * Mock structure mirrors `tests/pbrTextureCache.test.ts` (canonical pattern):
 *   `vi.mock("three", async () => { const actual = await vi.importActual<typeof import("three")>("three"); ... })`
 *
 * `loadPbrSet` is mocked to (a) return synthetic textures for happy-path URLs and
 * (b) reject for any URL containing "fail" — exercises D-07 fallback sentinel.
 */

const renderCalls: { count: number } = { count: 0 };
const rendererCtorCalls: { count: number } = { count: 0 };

vi.mock("three", async () => {
  const actual = await vi.importActual<typeof import("three")>("three");
  class MockRenderer {
    domElement = {
      toDataURL: (_type?: string) => "data:image/png;base64,FAKE",
    };
    outputColorSpace = actual.SRGBColorSpace;
    constructor() {
      rendererCtorCalls.count++;
    }
    setSize() {}
    setClearColor() {}
    render() {
      renderCalls.count++;
    }
    dispose() {}
  }
  return { ...actual, WebGLRenderer: MockRenderer };
});

vi.mock("@/three/pbrTextureCache", async () => {
  const THREE = await vi.importActual<typeof import("three")>("three");
  return {
    loadPbrSet: vi.fn(
      async (urls: { albedo: string; normal: string; roughness: string }) => {
        if (
          urls.albedo.includes("fail") ||
          urls.normal.includes("fail") ||
          urls.roughness.includes("fail")
        ) {
          throw new Error("texture load failed");
        }
        const make = () => {
          const t = new THREE.Texture();
          t.repeat = new THREE.Vector2(1, 1);
          return t;
        };
        return { albedo: make(), normal: make(), roughness: make() };
      }
    ),
  };
});

const flatMat = {
  id: "TEST_FLAT",
  name: "Flat",
  color: "#888888",
  roughness: 0.5,
} as any;
const pbrMat = {
  id: "TEST_PBR",
  name: "PBR",
  color: "#444444",
  roughness: 0.5,
  pbr: {
    albedo: "/ok/a.png",
    normal: "/ok/n.png",
    roughness: "/ok/r.png",
  },
} as any;
const failMat = {
  id: "TEST_FAIL",
  name: "Fail",
  color: "#222222",
  roughness: 0.5,
  pbr: {
    albedo: "/fail/a.png",
    normal: "/ok/n.png",
    roughness: "/ok/r.png",
  },
} as any;

beforeEach(async () => {
  renderCalls.count = 0;
  rendererCtorCalls.count = 0;
  const mod = await import("@/three/swatchThumbnailGenerator");
  mod.__resetSwatchThumbnailCache();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("swatchThumbnailGenerator", () => {
  it("THUMB-01-a: generateThumbnail returns a data:image/png URL for a flat material", async () => {
    const mod = await import("@/three/swatchThumbnailGenerator");
    const result = await mod.generateThumbnail(flatMat);
    expect(result).toMatch(/^data:image\/png/);
  });

  it("THUMB-01-b: second call with same material returns cached identical string and renders only once", async () => {
    const mod = await import("@/three/swatchThumbnailGenerator");
    const first = await mod.generateThumbnail(flatMat);
    const second = await mod.generateThumbnail(flatMat);
    expect(second).toBe(first); // identical reference (===)
    expect(renderCalls.count).toBe(1);
  });

  it("THUMB-01-c: PBR load failure resolves to literal 'fallback' sentinel (no throw, cached failure)", async () => {
    const mod = await import("@/three/swatchThumbnailGenerator");
    const first = await mod.generateThumbnail(failMat);
    expect(first).toBe("fallback");
    // Second call returns cached fallback — no retry, no throw
    const second = await mod.generateThumbnail(failMat);
    expect(second).toBe("fallback");
  });

  it("THUMB-01-d: generateBatch populates the cache for every material", async () => {
    const mod = await import("@/three/swatchThumbnailGenerator");
    await mod.generateBatch([flatMat, pbrMat, failMat]);
    expect(mod.getThumbnail(flatMat.id)).toBeDefined();
    expect(mod.getThumbnail(pbrMat.id)).toBeDefined();
    expect(mod.getThumbnail(failMat.id)).toBeDefined();
    // Sanity — failMat resolved to the sentinel
    expect(mod.getThumbnail(failMat.id)).toBe("fallback");
  });

  it("THUMB-01-e: __resetSwatchThumbnailCache clears the cache so next call re-renders", async () => {
    const mod = await import("@/three/swatchThumbnailGenerator");
    await mod.generateThumbnail(flatMat);
    expect(mod.getThumbnail(flatMat.id)).toBeDefined();
    mod.__resetSwatchThumbnailCache();
    expect(mod.getThumbnail(flatMat.id)).toBeUndefined();
    const renderCountBefore = renderCalls.count;
    await mod.generateThumbnail(flatMat);
    expect(renderCalls.count).toBe(renderCountBefore + 1);
  });

  it("Single-renderer invariant: 5 sequential generateThumbnail calls construct WebGLRenderer exactly ONCE", async () => {
    const mod = await import("@/three/swatchThumbnailGenerator");
    const mats = [
      { ...flatMat, id: "M1" },
      { ...flatMat, id: "M2" },
      { ...flatMat, id: "M3" },
      { ...flatMat, id: "M4" },
      { ...flatMat, id: "M5" },
    ];
    for (const m of mats) {
      await mod.generateThumbnail(m);
    }
    expect(rendererCtorCalls.count).toBe(1);
    expect(renderCalls.count).toBe(5);
  });
});
