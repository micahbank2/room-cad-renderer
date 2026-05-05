import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";

/**
 * Phase 58 — GLTF-INTEGRATION-01: vitest for gltfThumbnailGenerator.
 *
 * Mock structure mirrors tests/swatchThumbnailGenerator.test.ts:
 *   - vi.mock("three", ...) — replaces WebGLRenderer with a MockRenderer that
 *     stubs render() + domElement.toDataURL().
 *   - vi.mock("@/lib/gltfStore") — controls getGltf() resolution per test.
 *   - vi.mock("three/examples/jsm/loaders/GLTFLoader.js") — controls parseAsync.
 *
 * U1: computeGltfThumbnail returns a string starting with "data:image/png;base64,"
 *     when given a valid synthetic-Box GLTF.
 * U2: getCachedGltfThumbnail synchronous cache hit returns the cached dataURL
 *     without invoking onReady.
 * U3: getCachedGltfThumbnail cache miss returns undefined immediately; onReady
 *     fires after async resolves; second call then returns the dataURL.
 * U4: getCachedGltfThumbnail returns the literal "fallback" sentinel when
 *     getGltf resolves to undefined.
 */

const renderCalls: { count: number } = { count: 0 };

vi.mock("three", async () => {
  const actual = await vi.importActual<typeof import("three")>("three");
  class MockRenderer {
    domElement = {
      toDataURL: (_type?: string) => "data:image/png;base64,GLTFFAKE",
    };
    outputColorSpace = actual.SRGBColorSpace;
    setSize() {}
    setClearColor() {}
    render() {
      renderCalls.count++;
    }
    dispose() {}
  }
  return { ...actual, WebGLRenderer: MockRenderer };
});

vi.mock("@/lib/gltfStore", () => ({
  getGltf: vi.fn(),
}));

vi.mock("three/examples/jsm/loaders/GLTFLoader.js", async () => {
  const actual = await vi.importActual<typeof import("three")>("three");
  return {
    GLTFLoader: class {
      async parseAsync() {
        const g = new actual.Group();
        g.add(
          new actual.Mesh(
            new actual.BoxGeometry(2, 2, 2),
            new actual.MeshStandardMaterial({ color: 0xff8800 }),
          ),
        );
        return { scene: g };
      }
    },
  };
});

beforeEach(async () => {
  renderCalls.count = 0;
  const mod = await import("@/three/gltfThumbnailGenerator");
  mod.__resetGltfThumbnailCache();
  // Default: getGltf returns a valid model
  const { getGltf } = await import("@/lib/gltfStore");
  (getGltf as unknown as ReturnType<typeof vi.fn>).mockReset();
  (getGltf as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: "gltf_test",
    blob: new Blob([new Uint8Array([1, 2, 3])]),
    sha256: "deadbeef",
    name: "test.glb",
    sizeBytes: 3,
    uploadedAt: 0,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("gltfThumbnailGenerator", () => {
  it("U1: computeGltfThumbnail returns a data:image/png URL for a synthetic GLTF", async () => {
    const mod = await import("@/three/gltfThumbnailGenerator");
    const result = await mod.computeGltfThumbnail("gltf_test");
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it("U2: getCachedGltfThumbnail synchronous cache hit returns cached dataURL without invoking onReady", async () => {
    const mod = await import("@/three/gltfThumbnailGenerator");
    // Warm cache: kick off compute and let it resolve
    const onReady1 = vi.fn();
    const initial = mod.getCachedGltfThumbnail("gltf_test", onReady1);
    expect(initial).toBeUndefined();
    // Wait for async compute to complete
    await new Promise<void>((resolve) => {
      const check = () => {
        if (onReady1.mock.calls.length > 0) resolve();
        else setTimeout(check, 5);
      };
      check();
    });
    // Second call: should be a synchronous cache hit; onReady2 NOT invoked
    const onReady2 = vi.fn();
    const cached = mod.getCachedGltfThumbnail("gltf_test", onReady2);
    expect(cached).toMatch(/^data:image\/png;base64,/);
    expect(onReady2).not.toHaveBeenCalled();
  });

  it("U3: cache miss returns undefined; onReady fires after resolve; subsequent call returns dataURL", async () => {
    const mod = await import("@/three/gltfThumbnailGenerator");
    const onReady = vi.fn();
    const first = mod.getCachedGltfThumbnail("gltf_test", onReady);
    expect(first).toBeUndefined();
    // Wait for onReady
    await new Promise<void>((resolve) => {
      const check = () => {
        if (onReady.mock.calls.length > 0) resolve();
        else setTimeout(check, 5);
      };
      check();
    });
    expect(onReady).toHaveBeenCalledTimes(1);
    // Subsequent call returns synchronously
    const second = mod.getCachedGltfThumbnail("gltf_test", vi.fn());
    expect(second).toMatch(/^data:image\/png;base64,/);
  });

  it("U4: getCachedGltfThumbnail caches 'fallback' sentinel when getGltf resolves to undefined", async () => {
    const { getGltf } = await import("@/lib/gltfStore");
    (getGltf as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
    const mod = await import("@/three/gltfThumbnailGenerator");
    const onReady = vi.fn();
    const first = mod.getCachedGltfThumbnail("gltf_missing", onReady);
    expect(first).toBeUndefined();
    await new Promise<void>((resolve) => {
      const check = () => {
        if (onReady.mock.calls.length > 0) resolve();
        else setTimeout(check, 5);
      };
      check();
    });
    // Second call should return the literal "fallback" sentinel
    const second = mod.getCachedGltfThumbnail("gltf_missing", vi.fn());
    expect(second).toBe("fallback");
  });
});
