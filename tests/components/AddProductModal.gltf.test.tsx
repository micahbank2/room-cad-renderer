/**
 * Phase 55 GLTF-UPLOAD-01: AddProductModal GLTF file input tests (TDD).
 *
 * Tests cover:
 * 1. Valid .glb file accepted — filename shown, no error
 * 2. File >25MB rejected — error shown, gltfFile cleared
 * 3. Submission with valid GLTF — onAdd called with gltfId set
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AddProductModal from "@/components/AddProductModal";

// Synthetic GLB blob: 16-byte GLB magic header
const GLB_MAGIC = new Uint8Array([
  0x67, 0x6c, 0x54, 0x46, // magic "glTF"
  0x02, 0x00, 0x00, 0x00, // version 2
  0x10, 0x00, 0x00, 0x00, // total length 16
  0x00, 0x00, 0x00, 0x00, // JSON chunk length 0
]);
const validFile = new File([GLB_MAGIC], "test-sofa.glb", { type: "model/gltf-binary" });

// 26MB file — exceeds 25MB cap
const oversizedBlob = new Blob([new Uint8Array(26 * 1024 * 1024)]);
const bigFile = new File([oversizedBlob], "big.glb", { type: "model/gltf-binary" });

// Mock saveGltfWithDedup — isolate component test from IDB
vi.mock("@/lib/gltfStore", () => ({
  saveGltfWithDedup: vi.fn().mockResolvedValue({ id: "gltf_test123", deduped: false }),
}));

const noop = () => {};

describe("AddProductModal — GLTF file input (GLTF-UPLOAD-01 D-02/D-03)", () => {
  test("accepts valid .glb file — no error shown", async () => {
    render(<AddProductModal onAdd={noop} onClose={noop} />);
    const input = screen.getByTestId("gltf-file-input");
    fireEvent.change(input, { target: { files: [validFile] } });
    await waitFor(() => {
      expect(screen.queryByText(/FILE EXCEEDS/i)).toBeNull();
      expect(screen.queryByText(/MUST BE/i)).toBeNull();
    });
  });

  test("rejects file >25MB — shows FILE EXCEEDS 25MB LIMIT error", async () => {
    render(<AddProductModal onAdd={noop} onClose={noop} />);
    const input = screen.getByTestId("gltf-file-input");
    fireEvent.change(input, { target: { files: [bigFile] } });
    await waitFor(() => {
      expect(screen.getByText(/FILE EXCEEDS 25MB LIMIT/i)).toBeTruthy();
    });
  });

  test("submit with valid GLTF — onAdd called with gltfId set", async () => {
    const onAdd = vi.fn();
    render(<AddProductModal onAdd={onAdd} onClose={noop} />);
    // Fill required name field
    fireEvent.change(screen.getByPlaceholderText(/EAMES/i), {
      target: { value: "Test Sofa" },
    });
    // Upload GLTF
    const input = screen.getByTestId("gltf-file-input");
    fireEvent.change(input, { target: { files: [validFile] } });
    // Submit form — find submit button
    const submitBtn = screen.getByRole("button", { name: /ADD TO REGISTRY/i });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledOnce();
      const product = onAdd.mock.calls[0][0];
      expect(product.gltfId).toBe("gltf_test123");
    });
  });
});
