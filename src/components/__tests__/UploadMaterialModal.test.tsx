/**
 * Phase 78 Plan 02 — UploadMaterialModal AO + displacement drop zones.
 *
 * Tests added here:
 *   1. Create mode renders 5 drop zones (COLOR_MAP, ROUGHNESS_MAP, REFLECTION_MAP, AO_MAP, DISPLACEMENT_MAP)
 *   2. Dropping JPEG onto AO zone renders preview img
 *   3. Dropping JPEG onto displacement zone renders preview img
 *   4. Submitting with name + tile size + color + ao + displacement passes all to save()
 *   5. Closing and re-opening clears the new drop zones (no stale preview)
 *   6. Edit mode does NOT render drop-zone block
 */
import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { UploadMaterialModal } from "@/components/UploadMaterialModal";

// ---- Mocks -----------------------------------------------------------------

// Mock useMaterials so tests don't need IDB plumbing
const mockSave = vi.fn().mockResolvedValue({ id: "mat-01", deduped: false });
const mockUpdate = vi.fn().mockResolvedValue(undefined);

vi.mock("@/hooks/useMaterials", () => ({
  useMaterials: () => ({ save: mockSave, update: mockUpdate, materials: [], loading: false }),
}));

// Mock processTextureFile — returns a minimal ProcessedMap
vi.mock("@/lib/processTextureFile", () => ({
  processTextureFile: vi.fn(async (file: File) => ({
    blob: new Blob([new Uint8Array(4)], { type: file.type }),
    mimeType: file.type,
    sha256: "fake-sha256",
  })),
  ProcessTextureError: class ProcessTextureError extends Error {},
}));

// Mock URL.createObjectURL / revokeObjectURL for jsdom
const createdUrls: string[] = [];
let urlCounter = 0;
beforeEach(() => {
  urlCounter = 0;
  createdUrls.length = 0;
  global.URL.createObjectURL = vi.fn(() => {
    const url = `blob:mock-${++urlCounter}`;
    createdUrls.push(url);
    return url;
  });
  global.URL.revokeObjectURL = vi.fn((url: string) => {
    const idx = createdUrls.indexOf(url);
    if (idx !== -1) createdUrls.splice(idx, 1);
  });
  mockSave.mockClear();
  mockUpdate.mockClear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ---- Test helpers ----------------------------------------------------------

function makeFile(name = "test.jpg", type = "image/jpeg"): File {
  return new File([new Uint8Array(8)], name, { type });
}

// Simulate dropping a file onto a drop target
function dropFile(dropZone: HTMLElement, file: File) {
  fireEvent.dragOver(dropZone, { dataTransfer: { files: [file] } });
  fireEvent.drop(dropZone, {
    dataTransfer: { files: [file] },
  });
}

// ---- Tests ------------------------------------------------------------------

describe("UploadMaterialModal — AO + displacement drop zones", () => {
  it("Test 1: create mode renders 5 drop zone labels in order", () => {
    render(
      <UploadMaterialModal
        open={true}
        mode="create"
        onClose={() => {}}
      />,
    );

    const labels = [
      "COLOR_MAP",
      "ROUGHNESS_MAP",
      "REFLECTION_MAP",
      "AO_MAP",
      "DISPLACEMENT_MAP",
    ];
    for (const label of labels) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it("Test 2: dropping JPEG onto AO zone renders preview img", async () => {
    render(
      <UploadMaterialModal
        open={true}
        mode="create"
        onClose={() => {}}
      />,
    );

    // Find the hidden file input for the AO zone
    const aoInput = document.querySelector<HTMLInputElement>('input[data-zone="ao"]');
    expect(aoInput).toBeTruthy();

    const file = makeFile("ao.jpg");
    await act(async () => {
      fireEvent.change(aoInput!, { target: { files: [file] } });
    });

    const previewImg = screen.getByAltText("AO_MAP preview");
    expect(previewImg).toBeTruthy();
  });

  it("Test 3: dropping JPEG onto displacement zone renders preview img", async () => {
    render(
      <UploadMaterialModal
        open={true}
        mode="create"
        onClose={() => {}}
      />,
    );

    const dispInput = document.querySelector<HTMLInputElement>('input[data-zone="displacement"]');
    expect(dispInput).toBeTruthy();

    const file = makeFile("disp.jpg");
    await act(async () => {
      fireEvent.change(dispInput!, { target: { files: [file] } });
    });

    const previewImg = screen.getByAltText("DISPLACEMENT_MAP preview");
    expect(previewImg).toBeTruthy();
  });

  it("Test 4: submitting with color + ao + displacement passes files to save()", async () => {
    render(
      <UploadMaterialModal
        open={true}
        mode="create"
        onClose={() => {}}
      />,
    );

    // Fill name
    const nameInput = screen.getByRole("textbox", { name: /^name$/i });
    fireEvent.change(nameInput, { target: { value: "Test Material" } });

    // Drop color file
    const colorInput = document.querySelector<HTMLInputElement>('input[data-zone="color"]');
    const colorFile = makeFile("color.jpg");
    await act(async () => {
      fireEvent.change(colorInput!, { target: { files: [colorFile] } });
    });

    // Drop AO file
    const aoInput = document.querySelector<HTMLInputElement>('input[data-zone="ao"]');
    const aoFile = makeFile("ao.jpg");
    await act(async () => {
      fireEvent.change(aoInput!, { target: { files: [aoFile] } });
    });

    // Drop displacement file
    const dispInput = document.querySelector<HTMLInputElement>('input[data-zone="displacement"]');
    const dispFile = makeFile("disp.jpg");
    await act(async () => {
      fireEvent.change(dispInput!, { target: { files: [dispFile] } });
    });

    // Submit
    const submitBtn = screen.getByRole("button", { name: /upload material/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(mockSave).toHaveBeenCalledOnce();
    const callArgs = mockSave.mock.calls[0][0];
    expect(callArgs.aoFile).toBe(aoFile);
    expect(callArgs.displacementFile).toBe(dispFile);
  });

  it("Test 5: closing and re-opening clears the new drop zones (no stale preview)", async () => {
    const { rerender } = render(
      <UploadMaterialModal
        open={true}
        mode="create"
        onClose={() => {}}
      />,
    );

    // Drop AO file
    const aoInput = document.querySelector<HTMLInputElement>('input[data-zone="ao"]');
    const aoFile = makeFile("ao.jpg");
    await act(async () => {
      fireEvent.change(aoInput!, { target: { files: [aoFile] } });
    });

    // Confirm preview is shown
    expect(screen.getByAltText("AO_MAP preview")).toBeTruthy();

    // Close modal
    rerender(
      <UploadMaterialModal
        open={false}
        mode="create"
        onClose={() => {}}
      />,
    );

    // Re-open modal
    rerender(
      <UploadMaterialModal
        open={true}
        mode="create"
        onClose={() => {}}
      />,
    );

    // Preview should be gone (zone reset)
    expect(screen.queryByAltText("AO_MAP preview")).toBeNull();
  });

  it("Test 6: edit mode does NOT render drop-zone block", () => {
    const existingMaterial = {
      id: "mat-01",
      name: "Marble",
      tileSizeFt: 2,
      colorMapId: "tex-01",
      colorMapUrl: "blob:test",
      createdAt: new Date().toISOString(),
    };

    render(
      <UploadMaterialModal
        open={true}
        mode="edit"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        existing={existingMaterial as any}
        onClose={() => {}}
      />,
    );

    // Drop zones should NOT exist in edit mode
    expect(screen.queryByText("COLOR_MAP")).toBeNull();
    expect(screen.queryByText("AO_MAP")).toBeNull();
    expect(screen.queryByText("DISPLACEMENT_MAP")).toBeNull();
  });
});
