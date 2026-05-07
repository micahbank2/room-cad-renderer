/**
 * Phase 67 Plan 01 — Wave 0 RED Playwright e2e for Material upload flow.
 *
 * Verifies the user-facing happy path:
 *   1. Open the app, drive the Material upload bridge with a JPEG fixture.
 *   2. Reload the page; Material persists (IDB store room-cad-materials).
 *   3. Re-drive with the SAME JPEG; second result reports deduped:true.
 *
 * Uses window.__driveMaterialUpload bridge (mirrors Phase 34's
 * window.__driveTextureUpload precedent) to bypass the file-input
 * synthesis brittle in headless Chromium.
 */
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test.describe("Phase 67 — Material upload + reload + dedup", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("room-cad-onboarding-completed", "1");
      } catch {
        /* noop */
      }
    });
    await page.goto("/");
    // Wipe both stores to start clean.
    await page.evaluate(async () => {
      await Promise.all([
        new Promise<void>((res) => {
          const req = indexedDB.deleteDatabase("room-cad-user-textures");
          req.onsuccess = () => res();
          req.onerror = () => res();
          req.onblocked = () => res();
        }),
        new Promise<void>((res) => {
          const req = indexedDB.deleteDatabase("room-cad-materials");
          req.onsuccess = () => res();
          req.onerror = () => res();
          req.onblocked = () => res();
        }),
      ]);
    });
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
  });

  test("upload Material via __driveMaterialUpload bridge, reload, and dedup the same JPEG", async ({
    page,
  }) => {
    const fixturePath = resolve("tests/e2e/fixtures/sample-wallpaper.jpg");
    const bytes = readFileSync(fixturePath);
    const b64 = bytes.toString("base64");

    // Step 1: drive the upload.
    const first = await page.evaluate(
      async (args: { b64: string }) => {
        const blob = await fetch(`data:image/jpeg;base64,${args.b64}`).then((r) =>
          r.blob(),
        );
        const file = new File([blob], "carrara.jpg", { type: "image/jpeg" });
        const drive = (window as unknown as {
          __driveMaterialUpload?: (input: {
            name: string;
            tileSizeFt: number;
            colorFile: File;
          }) => Promise<{ id: string; deduped: boolean }>;
        }).__driveMaterialUpload;
        if (!drive) {
          throw new Error("__driveMaterialUpload not installed — check --mode test");
        }
        return await drive({ name: "Carrara", tileSizeFt: 2.5, colorFile: file });
      },
      { b64 },
    );
    expect(first.deduped).toBe(false);
    expect(first.id.startsWith("mat_")).toBe(true);

    // Step 2: reload — Material persists.
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    const persisted = await page.evaluate(async () => {
      const drv = (window as unknown as {
        __getMaterials?: () => Promise<Array<{ id: string; name: string }>>;
      }).__getMaterials;
      if (!drv) throw new Error("__getMaterials not installed");
      return await drv();
    });
    expect(persisted.length).toBe(1);
    expect(persisted[0].name).toBe("Carrara");

    // Step 3: dedup — re-upload SAME bytes.
    const second = await page.evaluate(
      async (args: { b64: string }) => {
        const blob = await fetch(`data:image/jpeg;base64,${args.b64}`).then((r) =>
          r.blob(),
        );
        const file = new File([blob], "carrara-again.jpg", { type: "image/jpeg" });
        const drive = (window as unknown as {
          __driveMaterialUpload?: (input: {
            name: string;
            tileSizeFt: number;
            colorFile: File;
          }) => Promise<{ id: string; deduped: boolean }>;
        }).__driveMaterialUpload;
        return await drive!({
          name: "Carrara Renamed",
          tileSizeFt: 3,
          colorFile: file,
        });
      },
      { b64 },
    );
    expect(second.deduped).toBe(true);
    expect(second.id).toBe(first.id);

    // Still exactly one Material row.
    const after = await page.evaluate(async () => {
      const drv = (window as unknown as {
        __getMaterials?: () => Promise<Array<{ id: string }>>;
      }).__getMaterials;
      return await drv!();
    });
    expect(after.length).toBe(1);
  });
});
