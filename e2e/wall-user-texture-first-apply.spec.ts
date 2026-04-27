/**
 * Phase 49 — BUG-02: wall user-texture first-apply regression spec.
 *
 * Asserts that a user-uploaded texture renders in 3D on FIRST apply —
 * without requiring any 2D↔3D view toggle workaround.
 *
 * Uses Phase 49 test drivers:
 *   window.__seedUserTexture  — writes texture blob to IDB + pre-warms cache
 *   window.__getWallMeshMapResolved — checks material.map is non-null for a wall
 *
 * Does NOT use toHaveScreenshot — per feedback_playwright_goldens_ci.md,
 * OS-suffixed goldens are platform-coupled. Functional assertions only.
 */
import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { resolve } from "path";

// Minimal valid 1×1 JPEG (43 bytes) — enough for THREE.TextureLoader to produce
// a valid THREE.Texture without needing a real image file.
// Generated from a known-good 1×1 white JPEG.
const TINY_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVAD/2Q==",
  "base64"
);

// Snapshot with one wall — same minimal shape used across Phase 48/49 specs.
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

const WALL_ID = "wall_1";

async function seedAndEnter3D(page: import("@playwright/test").Page): Promise<void> {
  // Skip onboarding overlay
  await page.addInitScript(() => {
    try {
      localStorage.setItem("room-cad-onboarding-completed", "1");
    } catch {
      /* unavailable on about:blank */
    }
  });

  await page.goto("/");

  // Purge IDB texture keyspace for a clean slate
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase("room-cad-user-textures");
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  });
  await page.reload();
  await page.waitForLoadState("domcontentloaded");

  // Seed CAD snapshot with one wall
  await page.evaluate(async (snap) => {
    // @ts-expect-error — window.__cadStore installed in test mode (Phase 36)
    (window as unknown as { __cadStore: { getState: () => { loadSnapshot: (s: unknown) => void } } }).__cadStore.getState().loadSnapshot(snap);
  }, SNAPSHOT);

  // Switch to 3D view
  await page.getByTestId("view-mode-3d").click();

  // Wait for ThreeViewport to mount (__wallMeshMaterials appears after WallMesh
  // test-mode useEffect fires the first time)
  await page.waitForFunction(
    () => typeof (window as unknown as { __seedUserTexture?: unknown }).__seedUserTexture === "function",
    { timeout: 10_000 },
  );
}

test.describe("BUG-02 — wall user-texture first-apply", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("texture renders in 3D on first apply without view toggle", async ({ page }) => {
    await seedAndEnter3D(page);

    // Seed texture to IDB + pre-warm cache via test driver
    const textureBlob = TINY_JPEG;
    const textureId = await page.evaluate(
      async ({ blobBytes, mimeType }: { blobBytes: number[]; mimeType: string }) => {
        const blob = new Blob([new Uint8Array(blobBytes)], { type: mimeType });
        return (
          window as unknown as { __seedUserTexture: (b: Blob, n: string, s: number) => Promise<string> }
        ).__seedUserTexture(blob, "test-tex", 2);
      },
      { blobBytes: Array.from(textureBlob), mimeType: "image/jpeg" },
    );

    expect(textureId).toMatch(/^utex_/);

    // Apply user texture to wall side A via cadStore
    await page.evaluate(
      ({ wallId, texId }: { wallId: string; texId: string }) => {
        // @ts-expect-error — window.__cadStore installed in test mode
        (window as unknown as { __cadStore: { getState: () => { setWallpaper: (id: string, side: string, wp: unknown) => void } } }).__cadStore.getState().setWallpaper(wallId, "A", {
          kind: "pattern",
          userTextureId: texId,
          scaleFt: 2,
        });
      },
      { wallId: WALL_ID, texId: textureId },
    );

    // Assert: material.map must be non-null within 1500ms of setWallpaper call.
    // This is the BUG-02 regression gate — without the fix, this times out.
    await page.waitForFunction(
      ({ wallId }: { wallId: string }) => {
        const fn = (window as unknown as { __getWallMeshMapResolved?: (id: string) => boolean }).__getWallMeshMapResolved;
        return fn ? fn(wallId) : false;
      },
      { wallId: WALL_ID },
      { timeout: 1500 },
    );

    // Post-wait confirmation
    const resolved = await page.evaluate(
      ({ wallId }: { wallId: string }) =>
        (window as unknown as { __getWallMeshMapResolved: (id: string) => boolean }).__getWallMeshMapResolved(wallId),
      { wallId: WALL_ID },
    );
    expect(resolved).toBe(true);
  });

  test("texture still renders after switching 2D→3D→2D→3D", async ({ page }) => {
    // Lightweight BUG-03 smoke: confirms BUG-02 fix doesn't regress on one toggle.
    // Full BUG-03 coverage (VIZ-10 harness extension for user-uploaded textures
    // across 5 toggle cycles) ships in Phase 50.
    await seedAndEnter3D(page);

    const textureBlob = TINY_JPEG;
    const textureId = await page.evaluate(
      async ({ blobBytes, mimeType }: { blobBytes: number[]; mimeType: string }) => {
        const blob = new Blob([new Uint8Array(blobBytes)], { type: mimeType });
        return (
          window as unknown as { __seedUserTexture: (b: Blob, n: string, s: number) => Promise<string> }
        ).__seedUserTexture(blob, "test-tex-toggle", 2);
      },
      { blobBytes: Array.from(textureBlob), mimeType: "image/jpeg" },
    );

    // Apply texture
    await page.evaluate(
      ({ wallId, texId }: { wallId: string; texId: string }) => {
        // @ts-expect-error — window.__cadStore installed in test mode
        (window as unknown as { __cadStore: { getState: () => { setWallpaper: (id: string, side: string, wp: unknown) => void } } }).__cadStore.getState().setWallpaper(wallId, "A", {
          kind: "pattern",
          userTextureId: texId,
          scaleFt: 2,
        });
      },
      { wallId: WALL_ID, texId: textureId },
    );

    // Wait for first-apply to resolve
    await page.waitForFunction(
      ({ wallId }: { wallId: string }) => {
        const fn = (window as unknown as { __getWallMeshMapResolved?: (id: string) => boolean }).__getWallMeshMapResolved;
        return fn ? fn(wallId) : false;
      },
      { wallId: WALL_ID },
      { timeout: 1500 },
    );

    // Toggle 2D → 3D → 2D → 3D
    await page.getByTestId("view-mode-2d").click();
    await page.getByTestId("view-mode-3d").click();
    await page.getByTestId("view-mode-2d").click();
    await page.getByTestId("view-mode-3d").click();

    // Wait for WallMesh to remount and re-register in __wallMeshMaterials
    await page.waitForFunction(
      ({ wallId }: { wallId: string }) => {
        const fn = (window as unknown as { __getWallMeshMapResolved?: (id: string) => boolean }).__getWallMeshMapResolved;
        return fn ? fn(wallId) : false;
      },
      { wallId: WALL_ID },
      { timeout: 3000 },
    );

    const resolvedAfterToggle = await page.evaluate(
      ({ wallId }: { wallId: string }) =>
        (window as unknown as { __getWallMeshMapResolved: (id: string) => boolean }).__getWallMeshMapResolved(wallId),
      { wallId: WALL_ID },
    );
    expect(resolvedAfterToggle).toBe(true);
  });
});
