// src/test-utils/gltfDrivers.ts
// Phase 55 GLTF-UPLOAD-01: window-level driver for e2e test.
// Gated by MODE === "test". Mirrors Phase 49 userTextureDrivers.ts pattern.
//
// driveUploadGltf — saves blob to IDB via saveGltfWithDedup (same code path
// as AddProductModal's async handleSubmit), then returns the gltfId so e2e
// tests can assert the IDB entry exists. Full product store insertion happens
// through the modal UI in the UI scenario.
//
// Phase 56 addition:
// driveAddGltfProduct — combines driveUploadGltf + productStore.addProduct +
// cadStore.placeProduct to seed a full GLTF product in a single driver call.

import { saveGltfWithDedup } from "@/lib/gltfStore";
import { useProductStore } from "@/stores/productStore";
import { useCADStore } from "@/stores/cadStore";
import { uid } from "@/lib/geometry";
import * as fabric from "fabric";

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
 * Phase 56: Combined driver that:
 * 1. Saves GLB blob to IDB (via saveGltfWithDedup)
 * 2. Adds a Product with gltfId to the productStore
 * 3. Places the product into the active room's center via cadStore.placeProduct
 *
 * Returns { gltfId, productId, placedId } so e2e tests can assert 3D rendering.
 *
 * @param blob  Raw GLTF/GLB bytes
 * @param name  Original filename (e.g. "box.glb")
 * @param dims  Product dimensions in feet (default 3×3×3)
 */
export async function driveAddGltfProduct(
  blob: Blob,
  name: string,
  dims: { width: number; depth: number; height: number } = { width: 3, depth: 3, height: 3 },
): Promise<{ gltfId: string; productId: string; placedId: string }> {
  if (import.meta.env.MODE !== "test") {
    throw new Error("driveAddGltfProduct must not be called outside test mode");
  }

  // 1. Save to IDB
  const { id: gltfId } = await saveGltfWithDedup({ blob, name });

  // 2. Add product to productStore
  const productId = `prod_${uid()}`;
  useProductStore.getState().addProduct({
    id: productId,
    name: `Test ${name}`,
    category: "Other",
    width: dims.width,
    depth: dims.depth,
    height: dims.height,
    material: "none",
    imageUrl: "",
    textureUrls: [],
    gltfId,
  });

  // 3. Place in active room (center of a 20x16ft room = position {x:10, y:8})
  const cadState = useCADStore.getState();
  const activeRoomId = cadState.activeRoomId;
  if (!activeRoomId) throw new Error("No active room");
  const placedId = cadState.placeProduct(productId, { x: 10, y: 8 });

  return { gltfId, productId, placedId };
}

/**
 * Phase 57 regression-helper: add an image-only Product (no gltfId) and place
 * it in the active room. Used by the e2e spec's "rect regression" scenario
 * to confirm image-only products still render as fabric.Rect.
 *
 * @param dims  Optional dimensions (default 3×3×3 ft)
 */
export function driveAddImageProduct(
  dims: { width: number; depth: number; height: number } = { width: 3, depth: 3, height: 3 },
): { productId: string; placedId: string } {
  if (import.meta.env.MODE !== "test") {
    throw new Error("driveAddImageProduct must not be called outside test mode");
  }
  const productId = `prod_${uid()}`;
  useProductStore.getState().addProduct({
    id: productId,
    name: "Test Image Product",
    category: "Other",
    width: dims.width,
    depth: dims.depth,
    height: dims.height,
    material: "none",
    imageUrl: "",
    textureUrls: [],
  });
  const cadState = useCADStore.getState();
  const activeRoomId = cadState.activeRoomId;
  if (!activeRoomId) throw new Error("No active room");
  const placedId = cadState.placeProduct(productId, { x: 10, y: 8 });
  return { productId, placedId };
}

/**
 * Phase 57: Returns "polygon" | "rect" | null for the first shape child
 * inside the fabric.Group wrapping the given placedProductId.
 *
 * Walks fc.getObjects(), finds the Group whose data.placedProductId matches,
 * inspects whether its first shape child (non-text, non-image) is a Polygon
 * or a Rect. Returns null when the canvas isn't registered, the group isn't
 * found, or no shape child exists.
 *
 * Requires window.__fabricCanvas to be registered by FabricCanvas.tsx
 * (test mode only — gated by import.meta.env.MODE === "test").
 */
export function getProductRenderShape(
  placedProductId: string,
): "polygon" | "rect" | null {
  if (typeof window === "undefined") return null;
  const fc = (window as unknown as { __fabricCanvas?: fabric.Canvas }).__fabricCanvas;
  if (!fc) return null;

  const group = fc
    .getObjects()
    .find(
      (obj) =>
        (obj as fabric.Group & { data?: { placedProductId?: string } }).data
          ?.placedProductId === placedProductId,
    ) as fabric.Group | undefined;
  if (!group) return null;

  const shapeChild = group
    .getObjects()
    .find((o) => o instanceof fabric.Polygon || o instanceof fabric.Rect);
  if (!shapeChild) return null;

  return shapeChild instanceof fabric.Polygon ? "polygon" : "rect";
}

/**
 * Phase 55 + 56 + 57: install GLTF test drivers. Production no-op.
 */
export function installGltfDrivers(): void {
  if (typeof window === "undefined") return;
  if (import.meta.env.MODE !== "test") return;

  const w = window as unknown as {
    __driveUploadGltf: typeof driveUploadGltf;
    __driveAddGltfProduct: typeof driveAddGltfProduct;
    __driveAddImageProduct: typeof driveAddImageProduct;
    __getProductRenderShape: typeof getProductRenderShape;
  };
  w.__driveUploadGltf = driveUploadGltf;
  w.__driveAddGltfProduct = driveAddGltfProduct;
  w.__driveAddImageProduct = driveAddImageProduct;
  w.__getProductRenderShape = getProductRenderShape;
}

declare global {
  interface Window {
    __driveUploadGltf?: (blob: Blob, name: string) => Promise<string>;
    __driveAddGltfProduct?: (
      blob: Blob,
      name: string,
      dims?: { width: number; depth: number; height: number },
    ) => Promise<{ gltfId: string; productId: string; placedId: string }>;
    // Phase 57 — image-only product helper (regression scenario E2)
    __driveAddImageProduct?: (
      dims?: { width: number; depth: number; height: number },
    ) => { productId: string; placedId: string };
    // Phase 57 — shape introspection driver
    __getProductRenderShape?: (placedProductId: string) => "polygon" | "rect" | null;
    // Phase 57 — registered by FabricCanvas.tsx in test mode
    __fabricCanvas?: fabric.Canvas;
  }
}

export {};
