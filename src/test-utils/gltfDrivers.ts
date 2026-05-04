// src/test-utils/gltfDrivers.ts
// Phase 55 GLTF-UPLOAD-01: window-level driver for e2e test.
// Gated by MODE === "test". Mirrors Phase 49 userTextureDrivers.ts pattern.
//
// driveUploadGltf — saves blob to IDB via saveGltfWithDedup (same code path
// as AddProductModal's async handleSubmit), then returns the gltfId so e2e
// tests can assert the IDB entry exists. Full product store insertion happens
// through the modal UI in the UI scenario.

import { saveGltfWithDedup } from "@/lib/gltfStore";

/**
 * Write a GLTF/GLB blob directly to IDB via the same saveGltfWithDedup path
 * that AddProductModal uses. Returns the gltfId for assertion in e2e tests.
 *
 * @param blob  Raw GLTF/GLB bytes
 * @param name  Original filename
 * @returns     gltfId string (prefixed "gltf_")
 */
export async function driveUploadGltf(blob: Blob, name: string): Promise<string> {
  if (import.meta.env.MODE !== "test") {
    throw new Error("driveUploadGltf must not be called outside test mode");
  }
  const { id: gltfId } = await saveGltfWithDedup({ blob, name });
  return gltfId;
}

/**
 * Phase 55: install GLTF test drivers. Production no-op.
 */
export function installGltfDrivers(): void {
  if (typeof window === "undefined") return;
  if (import.meta.env.MODE !== "test") return;

  (window as unknown as { __driveUploadGltf: typeof driveUploadGltf }).__driveUploadGltf =
    driveUploadGltf;
}

declare global {
  interface Window {
    __driveUploadGltf?: (blob: Blob, name: string) => Promise<string>;
  }
}

export {};
