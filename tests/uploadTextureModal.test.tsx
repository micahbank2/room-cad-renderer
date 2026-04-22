/**
 * Phase 34 Plan 01 Task 2 — UploadTextureModal (create + edit modes).
 *
 * Exercises the React tree with mocked useUserTextures + processTextureFile
 * to verify the UI-SPEC §1 contract without touching IDB or OffscreenCanvas.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// Mock processTextureFile BEFORE importing the component, so the component
// picks up the mock during its module graph evaluation.
vi.mock("@/lib/processTextureFile", async () => {
  const actual = await vi.importActual<typeof import("@/lib/processTextureFile")>(
    "@/lib/processTextureFile",
  );
  return {
    ...actual,
    processTextureFile: vi.fn(),
  };
});

// Mock useUserTextures — the component calls save()/update() on it.
const saveMock = vi.fn<(input: unknown, sha256: string) => Promise<string>>();
const updateMock = vi.fn<(id: string, changes: unknown) => Promise<void>>();
vi.mock("@/hooks/useUserTextures", () => ({
  useUserTextures: () => ({
    textures: [],
    loading: false,
    save: saveMock,
    update: updateMock,
    remove: vi.fn(),
    reload: vi.fn(),
  }),
}));

import { UploadTextureModal } from "@/components/UploadTextureModal";
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
});

describe("UploadTextureModal — create mode", () => {
  it("renders UPLOAD TEXTURE heading, Upload Texture CTA, Discard, drop zone invite", () => {
    render(
      <UploadTextureModal open={true} mode="create" onClose={() => {}} />,
    );
    expect(screen.getByText("UPLOAD TEXTURE")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload Texture" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discard" })).toBeInTheDocument();
    expect(
      screen.getByText("Drag and drop a photo, or click to browse."),
    ).toBeInTheDocument();
  });

  it("Close (X) button carries aria-label 'Close upload dialog'", () => {
    render(
      <UploadTextureModal open={true} mode="create" onClose={() => {}} />,
    );
    expect(screen.getByLabelText("Close upload dialog")).toBeInTheDocument();
  });

  it("does not render when open=false", () => {
    render(
      <UploadTextureModal open={false} mode="create" onClose={() => {}} />,
    );
    expect(screen.queryByText("UPLOAD TEXTURE")).not.toBeInTheDocument();
  });

  it("surfaces inline MIME error when processTextureFile rejects with MIME_REJECTED", async () => {
    const { ProcessTextureError } = await import("@/lib/processTextureFile");
    mockedProcess.mockRejectedValue(
      new ProcessTextureError("MIME_REJECTED", "Only JPEG, PNG, and WebP are supported."),
    );
    render(
      <UploadTextureModal open={true} mode="create" onClose={() => {}} />,
    );
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input).toBeTruthy();
    Object.defineProperty(input, "files", {
      value: [makeFile("image/svg+xml", "x.svg")],
    });
    fireEvent.change(input);
    await waitFor(() => {
      expect(
        screen.getByText("Only JPEG, PNG, and WebP are supported."),
      ).toBeInTheDocument();
    });
  });

  it("invalid tile size on blur shows inline error and disables primary CTA", async () => {
    render(
      <UploadTextureModal open={true} mode="create" onClose={() => {}} />,
    );
    const tileInput = screen.getByLabelText("TILE SIZE") as HTMLInputElement;
    fireEvent.change(tileInput, { target: { value: "foo" } });
    fireEvent.blur(tileInput);
    expect(
      screen.getByText("Enter a valid size like 2', 1'6\", or 0.5"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Upload Texture" }),
    ).toBeDisabled();
  });

  it("Discard button click fires onClose", () => {
    const onClose = vi.fn();
    render(<UploadTextureModal open={true} mode="create" onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Escape key fires onClose", () => {
    const onClose = vi.fn();
    render(<UploadTextureModal open={true} mode="create" onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("successful upload path: calls save + onSaved + onClose", async () => {
    mockedProcess.mockResolvedValue({
      blob: new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }),
      mimeType: "image/jpeg",
      sha256: "abc123",
      width: 1024,
      height: 768,
    });
    saveMock.mockResolvedValue("utex_fake1");
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(
      <UploadTextureModal
        open={true}
        mode="create"
        onClose={onClose}
        onSaved={onSaved}
      />,
    );

    // Fire file selection -> processTextureFile resolves
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    Object.defineProperty(input, "files", {
      value: [makeFile("image/jpeg", "oak.jpg")],
    });
    fireEvent.change(input);
    await waitFor(() => expect(mockedProcess).toHaveBeenCalled());

    // Fill name (tile size defaults to 2')
    const nameInput = screen.getByLabelText("NAME") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Oak Floor" } });

    // Click Upload Texture
    fireEvent.click(screen.getByRole("button", { name: "Upload Texture" }));
    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
    expect(saveMock.mock.calls[0][1]).toBe("abc123");
    const payload = saveMock.mock.calls[0][0] as {
      name: string;
      tileSizeFt: number;
      mimeType: string;
    };
    expect(payload.name).toBe("Oak Floor");
    expect(payload.tileSizeFt).toBeCloseTo(2, 5);
    expect(payload.mimeType).toBe("image/jpeg");

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("utex_fake1"));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("UploadTextureModal — edit mode", () => {
  const existing = {
    id: "utex_existing",
    sha256: "dead",
    name: "Old Oak",
    tileSizeFt: 1.5,
    blob: new Blob([new Uint8Array([9])], { type: "image/jpeg" }),
    mimeType: "image/jpeg",
    createdAt: 1700000000000,
  };

  it("renders EDIT TEXTURE heading, Save Changes CTA, NO drop zone, autoFocus on Name, pre-fills values", () => {
    render(
      <UploadTextureModal
        open={true}
        mode="edit"
        existing={existing}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText("EDIT TEXTURE")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    expect(
      screen.queryByText("Drag and drop a photo, or click to browse."),
    ).not.toBeInTheDocument();
    const nameInput = screen.getByLabelText("NAME") as HTMLInputElement;
    expect(nameInput.value).toBe("Old Oak");
    expect(nameInput).toHaveFocus();
    const tileInput = screen.getByLabelText("TILE SIZE") as HTMLInputElement;
    // 1.5 ft should format as "1'6\"" or similar; we just need it non-empty
    // and parseable back to 1.5.
    expect(tileInput.value).not.toBe("");
  });

  it("Save Changes flow calls update(existing.id, {name, tileSizeFt}) + onSaved + onClose", async () => {
    updateMock.mockResolvedValue(undefined);
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(
      <UploadTextureModal
        open={true}
        mode="edit"
        existing={existing}
        onClose={onClose}
        onSaved={onSaved}
      />,
    );
    const nameInput = screen.getByLabelText("NAME") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Oak Renamed" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    expect(updateMock.mock.calls[0][0]).toBe("utex_existing");
    const changes = updateMock.mock.calls[0][1] as {
      name: string;
      tileSizeFt: number;
    };
    expect(changes.name).toBe("Oak Renamed");
    expect(changes.tileSizeFt).toBeCloseTo(1.5, 5);
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("utex_existing"));
    expect(onClose).toHaveBeenCalled();
  });
});
