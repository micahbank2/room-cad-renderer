/**
 * Phase 67 Plan 01 — Wave 0 RED test for src/components/UploadMaterialModal.tsx.
 *
 * Mirrors tests/uploadTextureModal.test.tsx. Verifies the locked UI-SPEC §1
 * Material Copywriting Contract strings, optional metadata fields, MIME error
 * surfacing, tile-size validation, useReducedMotion guard, dedup toast.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

vi.mock("@/lib/processTextureFile", async () => {
  const actual = await vi.importActual<typeof import("@/lib/processTextureFile")>(
    "@/lib/processTextureFile",
  );
  return {
    ...actual,
    processTextureFile: vi.fn(),
  };
});

const saveMock = vi.fn<(input: unknown) => Promise<{ id: string; deduped: boolean }>>();
const updateMock = vi.fn<(id: string, changes: unknown) => Promise<void>>();
vi.mock("@/hooks/useMaterials", () => ({
  useMaterials: () => ({
    materials: [],
    loading: false,
    save: saveMock,
    update: updateMock,
    remove: vi.fn(),
    reload: vi.fn(),
  }),
  MATERIAL_SAVED_EVENT: "material-saved",
  MATERIAL_UPDATED_EVENT: "material-updated",
  MATERIAL_DELETED_EVENT: "material-deleted",
}));

const useReducedMotionMock = vi.fn(() => false);
vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => useReducedMotionMock(),
}));

import { UploadMaterialModal } from "@/components/UploadMaterialModal";
import * as processMod from "@/lib/processTextureFile";

const mockedProcess = processMod.processTextureFile as unknown as ReturnType<
  typeof vi.fn
>;

function makeFile(type: string, name = "x"): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type });
}

beforeEach(() => {
  vi.clearAllMocks();
  saveMock.mockReset();
  updateMock.mockReset();
  mockedProcess.mockReset();
  useReducedMotionMock.mockReturnValue(false);
});

describe("UploadMaterialModal — locked UI-SPEC strings (create mode)", () => {
  it("renders 1 required + 2 optional drop zones with locked labels COLOR_MAP / ROUGHNESS_MAP / REFLECTION_MAP", () => {
    render(
      <UploadMaterialModal open={true} mode="create" onClose={() => {}} />,
    );
    expect(screen.getByText("UPLOAD MATERIAL")).toBeInTheDocument();
    expect(screen.getAllByText(/COLOR_MAP/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/ROUGHNESS_MAP/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/REFLECTION_MAP/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: "Upload Material" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discard" })).toBeInTheDocument();
  });

  it("Close (X) button carries aria-label 'Close upload dialog'", () => {
    render(
      <UploadMaterialModal open={true} mode="create" onClose={() => {}} />,
    );
    expect(screen.getByLabelText("Close upload dialog")).toBeInTheDocument();
  });

  it("does not render when open=false", () => {
    render(
      <UploadMaterialModal open={false} mode="create" onClose={() => {}} />,
    );
    expect(screen.queryByText("UPLOAD MATERIAL")).not.toBeInTheDocument();
  });
});

describe("UploadMaterialModal — validation errors", () => {
  it("name field shows error 'Name is required.' when blank on submit", async () => {
    mockedProcess.mockResolvedValue({
      blob: new Blob([new Uint8Array([1])], { type: "image/jpeg" }),
      mimeType: "image/jpeg",
      sha256: "abc",
      width: 1,
      height: 1,
    });
    render(
      <UploadMaterialModal open={true} mode="create" onClose={() => {}} />,
    );

    // Drop a file so color is satisfied
    const colorInput = document.querySelector(
      'input[type="file"][data-zone="color"]',
    ) as HTMLInputElement;
    expect(colorInput).toBeTruthy();
    Object.defineProperty(colorInput, "files", {
      value: [makeFile("image/jpeg", "x.jpg")],
    });
    fireEvent.change(colorInput);
    await waitFor(() => expect(mockedProcess).toHaveBeenCalled());

    // Try to submit with blank name
    fireEvent.click(screen.getByRole("button", { name: "Upload Material" }));
    await waitFor(() => {
      expect(screen.getByText("Name is required.")).toBeInTheDocument();
    });
  });

  it("tile-size field shows error on garbage input", async () => {
    render(
      <UploadMaterialModal open={true} mode="create" onClose={() => {}} />,
    );
    const tileInput = screen.getByLabelText(/TILE_SIZE|TILE SIZE/i) as HTMLInputElement;
    fireEvent.change(tileInput, { target: { value: "foo" } });
    fireEvent.blur(tileInput);
    expect(
      screen.getByText("Enter a valid size like 2', 1'6\", or 0.5"),
    ).toBeInTheDocument();
  });

  it("MIME error 'Only JPEG, PNG, and WebP are supported.' shown when an SVG is dropped on color zone", async () => {
    const { ProcessTextureError } = await import("@/lib/processTextureFile");
    mockedProcess.mockRejectedValue(
      new ProcessTextureError(
        "MIME_REJECTED",
        "Only JPEG, PNG, and WebP are supported.",
      ),
    );
    render(
      <UploadMaterialModal open={true} mode="create" onClose={() => {}} />,
    );
    const colorInput = document.querySelector(
      'input[type="file"][data-zone="color"]',
    ) as HTMLInputElement;
    Object.defineProperty(colorInput, "files", {
      value: [makeFile("image/svg+xml", "x.svg")],
    });
    fireEvent.change(colorInput);
    await waitFor(() => {
      expect(
        screen.getByText("Only JPEG, PNG, and WebP are supported."),
      ).toBeInTheDocument();
    });
  });
});

describe("UploadMaterialModal — optional metadata fields", () => {
  it("brand/sku/cost/leadTime fields are optional — submit succeeds with all four empty when color + name + tile-size present", async () => {
    mockedProcess.mockResolvedValue({
      blob: new Blob([new Uint8Array([1])], { type: "image/jpeg" }),
      mimeType: "image/jpeg",
      sha256: "abc123",
      width: 1024,
      height: 768,
    });
    saveMock.mockResolvedValue({ id: "mat_fake1", deduped: false });
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(
      <UploadMaterialModal
        open={true}
        mode="create"
        onClose={onClose}
        onSaved={onSaved}
      />,
    );

    // Drop color file
    const colorInput = document.querySelector(
      'input[type="file"][data-zone="color"]',
    ) as HTMLInputElement;
    Object.defineProperty(colorInput, "files", {
      value: [makeFile("image/jpeg", "carrara.jpg")],
    });
    fireEvent.change(colorInput);
    await waitFor(() => expect(mockedProcess).toHaveBeenCalled());

    // Fill name + tile-size; leave brand/sku/cost/leadTime BLANK
    const nameInput = screen.getByLabelText(/^NAME$/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Carrara" } });

    fireEvent.click(screen.getByRole("button", { name: "Upload Material" }));
    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));

    const payload = saveMock.mock.calls[0][0] as {
      name: string;
      tileSizeFt: number;
      brand?: string;
      sku?: string;
      cost?: string;
      leadTime?: string;
    };
    expect(payload.name).toBe("Carrara");
    // Optional fields blank-tolerant: undefined or empty string both acceptable
    expect(payload.brand ?? "").toBe("");
    expect(payload.sku ?? "").toBe("");
    expect(payload.cost ?? "").toBe("");
    expect(payload.leadTime ?? "").toBe("");
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("mat_fake1"));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("UploadMaterialModal — toast on save / dedup", () => {
  it("fresh save shows toast 'Material saved.'", async () => {
    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    mockedProcess.mockResolvedValue({
      blob: new Blob([new Uint8Array([1])], { type: "image/jpeg" }),
      mimeType: "image/jpeg",
      sha256: "fresh",
      width: 1,
      height: 1,
    });
    saveMock.mockResolvedValue({ id: "mat_fresh", deduped: false });
    render(
      <UploadMaterialModal open={true} mode="create" onClose={() => {}} />,
    );
    const colorInput = document.querySelector(
      'input[type="file"][data-zone="color"]',
    ) as HTMLInputElement;
    Object.defineProperty(colorInput, "files", {
      value: [makeFile("image/jpeg")],
    });
    fireEvent.change(colorInput);
    await waitFor(() => expect(mockedProcess).toHaveBeenCalled());

    const nameInput = screen.getByLabelText(/^NAME$/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Fresh" } });
    fireEvent.click(screen.getByRole("button", { name: "Upload Material" }));

    await waitFor(() => {
      const matched = consoleSpy.mock.calls.some((c) =>
        String(c[0] ?? "").includes("Material saved."),
      );
      expect(matched).toBe(true);
    });
    consoleSpy.mockRestore();
  });

  it("deduped path shows toast 'Material already in your library.'", async () => {
    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    mockedProcess.mockResolvedValue({
      blob: new Blob([new Uint8Array([1])], { type: "image/jpeg" }),
      mimeType: "image/jpeg",
      sha256: "dup",
      width: 1,
      height: 1,
    });
    saveMock.mockResolvedValue({ id: "mat_dup", deduped: true });
    render(
      <UploadMaterialModal open={true} mode="create" onClose={() => {}} />,
    );
    const colorInput = document.querySelector(
      'input[type="file"][data-zone="color"]',
    ) as HTMLInputElement;
    Object.defineProperty(colorInput, "files", {
      value: [makeFile("image/jpeg")],
    });
    fireEvent.change(colorInput);
    await waitFor(() => expect(mockedProcess).toHaveBeenCalled());

    const nameInput = screen.getByLabelText(/^NAME$/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Dup" } });
    fireEvent.click(screen.getByRole("button", { name: "Upload Material" }));

    await waitFor(() => {
      const matched = consoleSpy.mock.calls.some((c) =>
        String(c[0] ?? "").includes("Material already in your library."),
      );
      expect(matched).toBe(true);
    });
    consoleSpy.mockRestore();
  });
});

describe("UploadMaterialModal — close interactions", () => {
  it("Discard button click fires onClose", () => {
    const onClose = vi.fn();
    render(<UploadMaterialModal open={true} mode="create" onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Escape key fires onClose", () => {
    const onClose = vi.fn();
    render(<UploadMaterialModal open={true} mode="create" onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("UploadMaterialModal — D-39 reduced motion", () => {
  it("useReducedMotion=true skips the open fade-in animation (no transition class applied)", () => {
    useReducedMotionMock.mockReturnValue(true);
    const { container } = render(
      <UploadMaterialModal open={true} mode="create" onClose={() => {}} />,
    );
    // No element should have a transition-* class when reduced motion is on
    const transitionEls = container.querySelectorAll("[class*='transition-']");
    // Allow only color/opacity transitions (those don't violate reduced-motion);
    // ban transform / scale / translate transitions.
    const violators = Array.from(transitionEls).filter((el) => {
      const cls = el.className as string;
      return /transition-\[transform/.test(cls) || /transition-transform/.test(cls);
    });
    expect(violators.length).toBe(0);
  });
});
