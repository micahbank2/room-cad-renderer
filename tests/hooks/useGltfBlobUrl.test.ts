/**
 * Phase 56 GLTF-RENDER-3D-01: useGltfBlobUrl — IDB → ObjectURL lifecycle (TDD RED).
 *
 * Tests:
 * 1. Returns { url: null, loading: true } synchronously before IDB resolves
 * 2. Returns { url: "blob:...", loading: false } after IDB resolves
 * 3. Returns { url: null, error: Error, loading: false } when getGltf throws
 * 4. Two consumers of same gltfId → URL.createObjectURL called exactly once (shared cache)
 * 5. Last unmount triggers URL.revokeObjectURL; useGLTF.clear called before revokeObjectURL
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

// --- Mocks ---

// Mock getGltf from gltfStore
const mockGetGltf = vi.fn();
vi.mock("@/lib/gltfStore", () => ({
  getGltf: (...args: unknown[]) => mockGetGltf(...args),
}));

// Track useGLTF.clear calls
const mockUseGLTFClear = vi.fn();
vi.mock("@react-three/drei", () => ({
  useGLTF: Object.assign(vi.fn(), {
    clear: (...args: unknown[]) => mockUseGLTFClear(...args),
  }),
}));

// Track URL object calls
const mockCreateObjectURL = vi.fn((blob: Blob) => `blob:mock/${Date.now()}-${Math.random()}`);
const mockRevokeObjectURL = vi.fn();

import { useGltfBlobUrl, __gltfBlobUrlCache } from "@/hooks/useGltfBlobUrl";

// Synthetic GltfModel
function makeMockModel(id = "gltf_abc") {
  return {
    id,
    blob: new Blob(["fake-glb-data"], { type: "model/gltf-binary" }),
    sha256: "deadbeef",
    name: "test.glb",
    sizeBytes: 16,
    uploadedAt: Date.now(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Stub URL APIs on globalThis for jsdom
  Object.defineProperty(globalThis, "URL", {
    writable: true,
    value: {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    },
  });
  // Clear module-level cache between tests
  if (__gltfBlobUrlCache) {
    __gltfBlobUrlCache.clear();
  }
});

describe("useGltfBlobUrl", () => {
  test("1. returns { url: null, loading: true } synchronously when gltfId provided (before IDB resolves)", () => {
    // IDB fetch that never resolves within this synchronous check
    let resolvePromise!: (v: unknown) => void;
    mockGetGltf.mockReturnValue(new Promise((r) => { resolvePromise = r; }));

    const { result } = renderHook(() => useGltfBlobUrl("gltf_abc"));

    // Before IDB resolves, should be loading
    expect(result.current.url).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    // Cleanup
    resolvePromise(undefined);
  });

  test("2. returns { url: blob:..., loading: false } after IDB resolves", async () => {
    const model = makeMockModel();
    mockGetGltf.mockResolvedValue(model);
    const blobUrl = "blob:mock/resolved-url";
    mockCreateObjectURL.mockReturnValue(blobUrl);

    const { result } = renderHook(() => useGltfBlobUrl("gltf_abc"));

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.url).toBe(blobUrl);
    expect(result.current.error).toBeNull();
    expect(mockCreateObjectURL).toHaveBeenCalledWith(model.blob);
  });

  test("3. returns { url: null, error: Error, loading: false } when getGltf throws", async () => {
    const err = new Error("IDB not found");
    mockGetGltf.mockRejectedValue(err);

    const { result } = renderHook(() => useGltfBlobUrl("gltf_abc"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.url).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("IDB not found");
  });

  test("4. two consumers of same gltfId → URL.createObjectURL called exactly once", async () => {
    const model = makeMockModel();
    mockGetGltf.mockResolvedValue(model);
    const blobUrl = "blob:mock/shared-url";
    mockCreateObjectURL.mockReturnValue(blobUrl);

    // Mount two hook instances for the same gltfId
    const { result: r1 } = renderHook(() => useGltfBlobUrl("gltf_shared"));
    const { result: r2 } = renderHook(() => useGltfBlobUrl("gltf_shared"));

    await waitFor(() => {
      expect(r1.current.loading).toBe(false);
      expect(r2.current.loading).toBe(false);
    });

    // Both should return the same URL
    expect(r1.current.url).toBe(blobUrl);
    expect(r2.current.url).toBe(blobUrl);

    // ObjectURL created exactly once
    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
  });

  test("5. last unmount triggers useGLTF.clear BEFORE URL.revokeObjectURL", async () => {
    const model = makeMockModel();
    mockGetGltf.mockResolvedValue(model);
    const blobUrl = "blob:mock/cleanup-url";
    mockCreateObjectURL.mockReturnValue(blobUrl);

    const callOrder: string[] = [];
    mockUseGLTFClear.mockImplementation(() => callOrder.push("clear"));
    mockRevokeObjectURL.mockImplementation(() => callOrder.push("revoke"));

    const { result, unmount } = renderHook(() => useGltfBlobUrl("gltf_abc"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.url).toBe(blobUrl);

    // Unmount should trigger cleanup
    act(() => {
      unmount();
    });

    // clear must fire before revoke (D-01, RESEARCH §1)
    expect(callOrder[0]).toBe("clear");
    expect(callOrder[1]).toBe("revoke");
    expect(mockUseGLTFClear).toHaveBeenCalledWith(blobUrl);
    expect(mockRevokeObjectURL).toHaveBeenCalledWith(blobUrl);
  });
});
