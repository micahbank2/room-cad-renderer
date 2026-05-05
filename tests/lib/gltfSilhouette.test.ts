/**
 * Phase 57 — GLTF-RENDER-2D-01: gltfSilhouette unit tests (TDD).
 *
 * U1–U4: pure compute on synthetic THREE.Group (no GLTF parse)
 * U5–U6: getCachedSilhouette async + cache (mocked getGltf + GLTFLoader)
 *
 * Tests are RED before implementation; GREEN after Task 1 lands.
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import * as THREE from "three";

// Mock IDB layer + GLTFLoader so unit tests need neither real fixture nor IDB.
// NOTE: vi.clearAllMocks() in beforeEach resets call history but ALSO drops
// mockResolvedValue(...) implementations. We re-arm them inside beforeEach.
vi.mock("@/lib/gltfStore", () => ({
  getGltf: vi.fn(),
}));

vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: vi.fn(),
}));

import {
  computeTopDownSilhouette,
  getCachedSilhouette,
  __resetSilhouetteCache,
} from "@/lib/gltfSilhouette";
import { getGltf } from "@/lib/gltfStore";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

function makeBoxScene(): THREE.Group {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2)));
  return g;
}

function makeEmptyScene(): THREE.Group {
  return new THREE.Group();
}

/** 9-point 3×3 grid of meshes (1×1×1 boxes at integer x/z). Top-down points
 *  cover an area whose convex hull is exactly the 4 outer corners. The 4
 *  edge-mid + center points are interior to the hull and must be discarded. */
function makeGridScene(): THREE.Group {
  const g = new THREE.Group();
  for (let x = -1; x <= 1; x++) {
    for (let z = -1; z <= 1; z++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01));
      m.position.set(x, 0, z);
      g.add(m);
    }
  }
  return g;
}

describe("gltfSilhouette", () => {
  beforeEach(() => {
    __resetSilhouetteCache();
    vi.clearAllMocks();
    // Re-arm GLTFLoader mock as a class-form constructor. parseAsync resolves
    // to a fresh box scene per call (fresh scene avoids cross-test mutation
    // of matrixWorld via scene.updateMatrixWorld).
    (GLTFLoader as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      function (this: { parseAsync: (buf: ArrayBuffer, p: string) => Promise<{ scene: THREE.Group }> }) {
        this.parseAsync = async () => ({ scene: makeBoxScene() });
      } as unknown as () => unknown,
    );
  });

  // U1 — synthetic BoxGeometry returns ≥3 vertices
  test("U1: computeTopDownSilhouette returns hull.length >= 3 for box scene", () => {
    const scene = makeBoxScene();
    const hull = computeTopDownSilhouette(scene);
    expect(hull).not.toBeNull();
    expect(hull!.length).toBeGreaterThanOrEqual(3);
  });

  // U2 — Y-axis dropped; tuples are length-2
  test("U2: returned tuples are [x, z] length-2 (Y axis dropped)", () => {
    const scene = makeBoxScene();
    const hull = computeTopDownSilhouette(scene);
    expect(hull).not.toBeNull();
    expect(hull!.every((p) => Array.isArray(p) && p.length === 2)).toBe(true);
    expect(hull!.every((p) => typeof p[0] === "number" && typeof p[1] === "number")).toBe(true);
  });

  // U3 — interior-point rejection on a 3×3 grid
  test("U3: 3×3 grid → convex hull is exactly the 4 outer corners", () => {
    const scene = makeGridScene();
    const hull = computeTopDownSilhouette(scene);
    expect(hull).not.toBeNull();
    // Each grid cell is a 0.01ft cube with 8 vertices ≈ same x,z. The
    // hull collapses near-duplicate points to the 4 outer corners
    // (x ∈ {-1.005, 1.005}, z ∈ {-1.005, 1.005}).
    expect(hull!.length).toBe(4);
  });

  // U4 — empty scene returns null
  test("U4: empty scene (no meshes) → returns null", () => {
    const scene = makeEmptyScene();
    const result = computeTopDownSilhouette(scene);
    expect(result).toBeNull();
  });

  // U5 — synchronous cache hit
  test("U5: getCachedSilhouette synchronous hit returns cached hull, no onReady", async () => {
    (getGltf as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "gltf_u5",
      blob: new Blob([new Uint8Array([1, 2, 3])], { type: "model/gltf-binary" }),
      sha256: "sha-u5",
      name: "u5.glb",
      sizeBytes: 3,
      uploadedAt: Date.now(),
    });

    const onReady1 = vi.fn();
    const first = getCachedSilhouette("gltf_u5", onReady1);
    expect(first).toBeUndefined(); // first call: kicks off async load

    // Wait for onReady1 to fire (microtask + macrotask flush)
    await new Promise<void>((resolve) => {
      const tick = () => {
        if (onReady1.mock.calls.length > 0) resolve();
        else setTimeout(tick, 5);
      };
      tick();
    });

    expect(onReady1).toHaveBeenCalledTimes(1);

    // Second call — cache hit, sync, no onReady2 invocation
    const onReady2 = vi.fn();
    const second = getCachedSilhouette("gltf_u5", onReady2);
    expect(second).not.toBeUndefined();
    expect(second).not.toBeNull();
    expect(Array.isArray(second)).toBe(true);
    expect(onReady2).not.toHaveBeenCalled();
  });

  // U6 — cache miss returns undefined; onReady fires; subsequent call returns hull
  test("U6: getCachedSilhouette miss → undefined → onReady → cached hull", async () => {
    (getGltf as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "gltf_u6",
      blob: new Blob([new Uint8Array([4, 5, 6])], { type: "model/gltf-binary" }),
      sha256: "sha-u6",
      name: "u6.glb",
      sizeBytes: 3,
      uploadedAt: Date.now(),
    });

    const onReady = vi.fn();
    const initial = getCachedSilhouette("gltf_u6", onReady);
    expect(initial).toBeUndefined();

    // While computing, a second call before resolution returns undefined too
    const inFlight = getCachedSilhouette("gltf_u6", vi.fn());
    expect(inFlight).toBeUndefined();

    await new Promise<void>((resolve) => {
      const tick = () => {
        if (onReady.mock.calls.length > 0) resolve();
        else setTimeout(tick, 5);
      };
      tick();
    });

    expect(onReady).toHaveBeenCalledTimes(1);

    const after = getCachedSilhouette("gltf_u6", vi.fn());
    expect(after).not.toBeUndefined();
    // hull should be a non-null array of >= 3 [x, z] tuples
    expect(Array.isArray(after)).toBe(true);
    expect((after as Array<[number, number]>).length).toBeGreaterThanOrEqual(3);
  });
});
