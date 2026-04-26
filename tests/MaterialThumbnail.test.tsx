import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import React from "react";

const reducedMotionMock = vi.fn(() => false);

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => reducedMotionMock(),
}));

const getThumbnailMock = vi.fn<(id: string) => string | undefined>();
const generateThumbnailMock = vi.fn<(m: any) => Promise<string>>();

vi.mock("@/three/swatchThumbnailGenerator", () => ({
  getThumbnail: (id: string) => getThumbnailMock(id),
  generateThumbnail: (m: any) => generateThumbnailMock(m),
  generateBatch: vi.fn(async () => {}),
}));

// Catalog lookup the component performs to hand the full SurfaceMaterial to generateThumbnail.
vi.mock("@/data/surfaceMaterials", () => ({
  SURFACE_MATERIALS: [
    { id: "TEST_MAT", name: "Test", color: "#abcdef", roughness: 0.5 },
  ],
  materialsForSurface: () => [],
}));

// Import AFTER mocks are registered.
import { MaterialThumbnail } from "@/components/MaterialThumbnail";

beforeEach(() => {
  reducedMotionMock.mockReset().mockReturnValue(false);
  getThumbnailMock.mockReset();
  generateThumbnailMock.mockReset();
});

afterEach(() => cleanup());

describe("MaterialThumbnail", () => {
  it("renders an <img> with the cached dataURL when getThumbnail returns one", () => {
    const dataURL = "data:image/png;base64,AAAA";
    getThumbnailMock.mockReturnValue(dataURL);
    const { container } = render(
      <MaterialThumbnail materialId="TEST_MAT" fallbackColor="#abcdef" />,
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.getAttribute("src")).toBe(dataURL);
  });

  it("renders NO <img> when getThumbnail returns the 'fallback' sentinel", () => {
    getThumbnailMock.mockReturnValue("fallback");
    const { container } = render(
      <MaterialThumbnail materialId="TEST_MAT" fallbackColor="#abcdef" />,
    );
    expect(container.querySelector("img")).toBeNull();
    // Placeholder div should still be present with the fallback color.
    const placeholder = container.querySelector('[style*="background"]');
    expect(placeholder).not.toBeNull();
  });

  it("calls generateThumbnail on cache miss and renders <img> after promise resolves", async () => {
    const dataURL = "data:image/png;base64,BBBB";
    getThumbnailMock.mockReturnValue(undefined);
    generateThumbnailMock.mockResolvedValue(dataURL);

    const { container } = render(
      <MaterialThumbnail materialId="TEST_MAT" fallbackColor="#abcdef" />,
    );

    // Initial render: no img
    expect(container.querySelector("img")).toBeNull();

    await waitFor(() => {
      const img = container.querySelector("img");
      expect(img).not.toBeNull();
      expect(img!.getAttribute("src")).toBe(dataURL);
    });

    expect(generateThumbnailMock).toHaveBeenCalledTimes(1);
  });

  it("uses duration-150 when reduced motion is OFF", () => {
    const dataURL = "data:image/png;base64,CCCC";
    getThumbnailMock.mockReturnValue(dataURL);
    reducedMotionMock.mockReturnValue(false);

    const { container } = render(
      <MaterialThumbnail materialId="TEST_MAT" fallbackColor="#abcdef" />,
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.className).toContain("duration-150");
    expect(img!.className).not.toContain("duration-0");
  });

  it("uses duration-0 when reduced motion is ON (D-39 guard)", () => {
    const dataURL = "data:image/png;base64,DDDD";
    getThumbnailMock.mockReturnValue(dataURL);
    reducedMotionMock.mockReturnValue(true);

    const { container } = render(
      <MaterialThumbnail materialId="TEST_MAT" fallbackColor="#abcdef" />,
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.className).toContain("duration-0");
    expect(img!.className).not.toContain("duration-150");
  });

  it("always renders the fallback-color placeholder div (never empty)", () => {
    getThumbnailMock.mockReturnValue(undefined);
    generateThumbnailMock.mockReturnValue(new Promise(() => {})); // never resolves

    const { container } = render(
      <MaterialThumbnail materialId="TEST_MAT" fallbackColor="#abcdef" />,
    );
    const placeholder = container.querySelector('[style*="background"]');
    expect(placeholder).not.toBeNull();
  });
});
