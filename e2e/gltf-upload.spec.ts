import { test, expect, type Page } from "@playwright/test";

// Phase 55 GLTF-UPLOAD-01: upload a synthetic GLB via the driver and via the modal.
//
// Driver test: __driveUploadGltf bypasses the modal and directly saves to IDB,
// asserting the gltfId returned matches the "gltf_" prefix pattern.
//
// Modal test: Opens AddProductModal, uploads a GLB file, submits — verifies the
// product appears in the product library afterward.

// Minimal scene snapshot to bypass WelcomeScreen (mirrors canvas-context-menu.spec.ts pattern).
// Must include at least one wall so App.tsx hasStarted auto-detects and skips WelcomeScreen.
const SNAPSHOT = {
  version: 2,
  rooms: {
    room_main: {
      id: "room_main",
      name: "Main Room",
      room: { width: 20, length: 16, wallHeight: 8 },
      walls: {
        wall_1: {
          id: "wall_1",
          start: { x: 2, y: 2 },
          end: { x: 18, y: 2 },
          thickness: 0.5,
          height: 8,
          openings: [],
        },
      },
      placedProducts: {},
      placedCustomElements: {},
    },
  },
  activeRoomId: "room_main",
};

async function seedScene(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try { localStorage.setItem("room-cad-onboarding-completed", "1"); } catch {}
  });
  await page.goto("/");
  await page.evaluate(async (snap) => {
    // @ts-expect-error — window.__cadStore installed in test mode
    await (window as unknown as { __cadStore?: { getState: () => { loadSnapshot: (s: unknown) => Promise<void> } } }).__cadStore?.getState().loadSnapshot(snap);
  }, SNAPSHOT);
}

// Minimal synthetic GLB (16 bytes: GLB magic header only).
// Phase 56 will parse it via GLTFLoader; Phase 55 only needs IDB storage.
const GLB_BYTES = Buffer.from([
  0x67, 0x6c, 0x54, 0x46, // magic "glTF"
  0x02, 0x00, 0x00, 0x00, // version 2
  0x10, 0x00, 0x00, 0x00, // total length 16
  0x00, 0x00, 0x00, 0x00, // JSON chunk length 0
]);

test.describe("GLTF-UPLOAD-01 — gltf/glb upload + IDB storage", () => {

  test("driver path: driveUploadGltf saves blob to IDB and returns gltf_ id", async ({ page }) => {
    await seedScene(page);
    await page.waitForLoadState("networkidle");

    // Use __driveUploadGltf driver (installed by installGltfDrivers in main.tsx)
    const gltfId = await page.evaluate(async (bytes: number[]) => {
      const blob = new Blob([new Uint8Array(bytes)], { type: "model/gltf-binary" });
      const id = await (window as unknown as { __driveUploadGltf?: (blob: Blob, name: string) => Promise<string> }).__driveUploadGltf?.(blob, "test-sofa.glb");
      return id as string | undefined;
    }, Array.from(GLB_BYTES));

    expect(gltfId).toBeTruthy();
    expect(gltfId).toMatch(/^gltf_/);
  });

  test("modal UI path: AddProductModal submit with GLB sets product in library", async ({ page }) => {
    await seedScene(page);
    await page.waitForLoadState("networkidle");

    // Switch to Library view mode via the toolbar
    await page.locator('[data-testid="view-mode-library"]').click();

    // Find and click the add product button (shown in library view header)
    const addBtn = page.locator('button:has-text("+ ADD PRODUCT")').first();
    await addBtn.waitFor({ timeout: 5000 });
    await addBtn.click();

    // Wait for modal to appear — AddProductModal has no role="dialog", use the modal heading
    const modalHeading = page.locator('h2:has-text("ADD PRODUCT")');
    await modalHeading.waitFor({ timeout: 3000 });

    // Fill the product name (required)
    const nameInput = page.locator('input[placeholder*="EAMES"]');
    await nameInput.fill("Test Sofa GLB");

    // Upload GLB via the GLTF file input
    const gltfInput = page.locator('[data-testid="gltf-file-input"]');
    await gltfInput.setInputFiles({
      name: "test-sofa.glb",
      mimeType: "model/gltf-binary",
      buffer: GLB_BYTES,
    });

    // Confirm no size error appeared
    await expect(page.locator('text=/FILE EXCEEDS/')).not.toBeVisible({ timeout: 1000 });

    // Submit the form
    await page.click('button:has-text("ADD TO REGISTRY")');

    // Wait for modal to close (heading disappears)
    await expect(modalHeading).not.toBeVisible({ timeout: 5000 });

    // Verify product appears in library
    await expect(
      page.locator('text=/test sofa glb/i').first()
    ).toBeVisible({ timeout: 3000 });
  });

});
