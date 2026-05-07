/**
 * Phase 67 Plan 01 — Wave 0 RED test for src/components/MaterialCard.tsx.
 *
 * Verifies:
 *  - thumbnail resolves from getUserTexture(colorMapId) blob URL
 *  - hover tooltip shows brand · SKU · cost · lead time · tile size
 *  - empty optional fields are gracefully omitted (no "undefined" or "··" sequences)
 *  - tile-size formatted via formatFeet
 *  - orphan: getUserTexture undefined -> placeholder + warning "Color map missing — re-upload to restore"
 *  - source code does NOT contain dangerouslySetInnerHTML (XSS guard, D-04/D-05 free-text)
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import type { Material } from "@/types/material";

// Mock getUserTexture so we can inject orphan / live cases per test.
const getUserTextureMock = vi.fn<(id: string) => Promise<unknown>>();
vi.mock("@/lib/userTextureStore", async () => {
  const actual = await vi.importActual<typeof import("@/lib/userTextureStore")>(
    "@/lib/userTextureStore",
  );
  return {
    ...actual,
    getUserTexture: (id: string) => getUserTextureMock(id),
  };
});

import { MaterialCard } from "@/components/MaterialCard";

const FAKE_BLOB = new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" });

beforeEach(() => {
  getUserTextureMock.mockReset();
  // Stub URL.createObjectURL / revokeObjectURL for happy-dom.
  if (!URL.createObjectURL) {
    URL.createObjectURL = vi.fn(() => "blob:fake-url");
  }
  if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = vi.fn();
  }
});

function makeMaterial(overrides: Partial<Material> = {}): Material {
  return {
    id: "mat_test",
    name: "Carrara Marble",
    tileSizeFt: 2.5,
    colorMapId: "utex_color1",
    colorSha256: "f".repeat(64),
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("MaterialCard — thumbnail resolution", () => {
  it("renders thumbnail from getUserTexture(colorMapId) blob URL", async () => {
    getUserTextureMock.mockResolvedValue({
      id: "utex_color1",
      sha256: "f".repeat(64),
      name: "Carrara (color)",
      tileSizeFt: 2.5,
      blob: FAKE_BLOB,
      mimeType: "image/jpeg",
      createdAt: Date.now(),
    });
    const { container } = render(<MaterialCard material={makeMaterial()} />);
    await waitFor(() => {
      const img = container.querySelector("img");
      expect(img).toBeTruthy();
      expect(img!.getAttribute("src")).toMatch(/^blob:/);
    });
    expect(getUserTextureMock).toHaveBeenCalledWith("utex_color1");
  });
});

describe("MaterialCard — orphan handling", () => {
  it("when getUserTexture returns undefined, placeholder + warning rendered", async () => {
    getUserTextureMock.mockResolvedValue(undefined);
    render(<MaterialCard material={makeMaterial()} />);
    await waitFor(() => {
      expect(
        screen.getByText("Color map missing — re-upload to restore"),
      ).toBeInTheDocument();
    });
  });
});

describe("MaterialCard — hover tooltip metadata", () => {
  beforeEach(() => {
    getUserTextureMock.mockResolvedValue({
      id: "utex_color1",
      sha256: "f".repeat(64),
      name: "Carrara (color)",
      tileSizeFt: 2.5,
      blob: FAKE_BLOB,
      mimeType: "image/jpeg",
      createdAt: Date.now(),
    });
  });

  it("hover reveals tooltip with brand · SKU · cost · lead time · tile size", async () => {
    const mat = makeMaterial({
      brand: "ACME",
      sku: "X-99",
      cost: "$5.99/sqft",
      leadTime: "2-4 weeks",
      tileSizeFt: 2.5,
    });
    const { container } = render(<MaterialCard material={mat} />);
    await waitFor(() => {
      const tooltipText = container.textContent ?? "";
      expect(tooltipText).toContain("ACME");
      expect(tooltipText).toContain("X-99");
      expect(tooltipText).toContain("$5.99/sqft");
      expect(tooltipText).toContain("2-4 weeks");
      // formatFeet(2.5) -> "2'6\""
      expect(tooltipText).toContain("2'6\"");
    });
  });

  it("empty optional metadata fields are gracefully omitted from the tooltip text", async () => {
    const mat = makeMaterial({
      brand: undefined,
      sku: undefined,
      cost: undefined,
      leadTime: undefined,
      tileSizeFt: 2,
    });
    const { container } = render(<MaterialCard material={mat} />);
    await waitFor(() => {
      const text = container.textContent ?? "";
      expect(text).not.toContain("undefined");
      // No double-separator artifact "·  ·" or " ·  · "
      expect(text).not.toMatch(/·\s+·/);
    });
  });

  it("tile size formatted via formatFeet (2.5 → '2'6\"')", async () => {
    const mat = makeMaterial({ tileSizeFt: 2.5 });
    const { container } = render(<MaterialCard material={mat} />);
    await waitFor(() => {
      expect(container.textContent ?? "").toContain("2'6\"");
    });
  });
});

describe("MaterialCard — XSS guard (no dangerouslySetInnerHTML)", () => {
  it("source code does NOT contain dangerouslySetInnerHTML", () => {
    const sourcePath = resolve("src/components/MaterialCard.tsx");
    const source = readFileSync(sourcePath, "utf-8");
    expect(source.includes("dangerouslySetInnerHTML")).toBe(false);
  });
});
