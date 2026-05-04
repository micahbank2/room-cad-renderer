/**
 * Phase 56 GLTF-RENDER-3D-01: ProductMesh GLTF branching — 3 component tests (TDD).
 *
 * Tests:
 * 6. product.gltfId = undefined → ProductMesh renders ProductBox (no GLTF path)
 * 7. product.gltfId = "gltf_abc", useGltfBlobUrl returns { url: null, loading: true } → ProductBox
 * 8. ErrorBoundary catches error thrown by GltfProduct → ProductBox rendered (error fallback)
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// --- Mocks set up before any imports ---

// Control useGltfBlobUrl return value per-test
const mockUseGltfBlobUrl = vi.fn(() => ({ url: null, error: null, loading: false }));
vi.mock("@/hooks/useGltfBlobUrl", () => ({
  useGltfBlobUrl: (...args: unknown[]) => mockUseGltfBlobUrl(...args),
}));

// ProductBox as a testable DOM element
vi.mock("@/three/ProductBox", () => ({
  ProductBox: (props: Record<string, unknown>) => (
    <div data-testid="product-box" data-width={String(props.width)} />
  ),
}));

// GltfProduct — default to a normal render; tests can override to throw
const mockGltfProductImpl = vi.fn(({ url }: { url: string }) => (
  <div data-testid="gltf-product" data-url={url} />
));
vi.mock("@/three/GltfProduct", () => ({
  default: (props: { url: string }) => mockGltfProductImpl(props),
}));

// Stub drei to avoid WebGL calls
vi.mock("@react-three/drei", () => ({
  useGLTF: Object.assign(vi.fn(), { clear: vi.fn() }),
}));

// Stub useProductTexture (used internally by the real ProductBox, but we mock ProductBox)
vi.mock("@/three/productTextureCache", () => ({
  useProductTexture: vi.fn(() => null),
}));

// Stub click/store hooks
vi.mock("@/hooks/useClickDetect", () => ({
  useClickDetect: vi.fn(() => ({
    handlePointerDown: vi.fn(),
    handlePointerUp: vi.fn(),
  })),
}));
vi.mock("@/stores/uiStore", () => ({
  useUIStore: { getState: vi.fn(() => ({ select: vi.fn(), openContextMenu: vi.fn() })) },
}));

// Import AFTER mocks
import ProductMesh from "@/three/ProductMesh";

// Helpers
function makePlaced(overrides = {}) {
  return {
    id: "pp_test",
    productId: "prod_test",
    position: { x: 0, y: 0 },
    rotation: 0,
    sizeScale: 1,
    widthFtOverride: undefined,
    depthFtOverride: undefined,
    ...overrides,
  };
}
function makeProduct(overrides = {}) {
  return {
    id: "prod_test",
    name: "Test Product",
    category: "Seating",
    width: 3,
    depth: 3,
    height: 3,
    material: "fabric",
    imageUrl: "",
    textureUrls: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseGltfBlobUrl.mockReturnValue({ url: null, error: null, loading: false });
  mockGltfProductImpl.mockImplementation(({ url }: { url: string }) => (
    <div data-testid="gltf-product" data-url={url} />
  ));
});

describe("ProductMesh — GLTF branching (Phase 56 D-08)", () => {
  test("6. product.gltfId = undefined → renders ProductBox (no GLTF path)", () => {
    mockUseGltfBlobUrl.mockReturnValue({ url: null, error: null, loading: false });

    const placed = makePlaced();
    const product = makeProduct(); // no gltfId

    render(<ProductMesh placed={placed as never} product={product as never} isSelected={false} />);

    // ProductBox should render, GltfProduct should not
    expect(screen.getByTestId("product-box")).toBeTruthy();
    expect(screen.queryByTestId("gltf-product")).toBeNull();
  });

  test("7. product.gltfId present + url=null (loading) → renders ProductBox (loading fallback)", () => {
    // IDB fetch in-flight: url is null
    mockUseGltfBlobUrl.mockReturnValue({ url: null, error: null, loading: true });

    const placed = makePlaced();
    const product = makeProduct({ gltfId: "gltf_abc" });

    render(<ProductMesh placed={placed as never} product={product as never} isSelected={false} />);

    // Should show ProductBox fallback while IDB fetch is in flight
    expect(screen.getByTestId("product-box")).toBeTruthy();
    expect(screen.queryByTestId("gltf-product")).toBeNull();
  });

  test("8. ErrorBoundary catches error thrown by GltfProduct → renders ProductBox (error fallback)", () => {
    // URL is resolved so we enter the Suspense/ErrorBoundary path
    mockUseGltfBlobUrl.mockReturnValue({ url: "blob:mock/test-url", error: null, loading: false });

    // GltfProduct throws during render (simulates useGLTF parse failure)
    mockGltfProductImpl.mockImplementation(() => {
      throw new Error("GLTF parse failure");
    });

    const placed = makePlaced();
    const product = makeProduct({ gltfId: "gltf_abc" });

    // Suppress React's console.error for the expected uncaught error
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<ProductMesh placed={placed as never} product={product as never} isSelected={false} />);

    // ErrorBoundary catches the throw → ProductBox fallback renders
    expect(screen.getByTestId("product-box")).toBeTruthy();
    expect(screen.queryByTestId("gltf-product")).toBeNull();

    consoleError.mockRestore();
  });
});
