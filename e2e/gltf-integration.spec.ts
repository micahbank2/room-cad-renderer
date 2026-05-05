import { test, expect, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

/**
 * Phase 58 GLTF-INTEGRATION-01 — 3 e2e scenarios:
 *   E1: Phase 48 saved-camera × GLTF round-trip — the only untested combo.
 *       Place a GLTF product, save a camera bookmark on it, move camera away,
 *       focus via __driveFocusNode, assert pose restored within tolerance.
 *   E2: Library card shows lucide Box badge for GLTF product (DOM assertion).
 *   E3: GLTF-only product (no imageUrl) gets a rendered 256×256 PNG thumbnail
 *       after async compute resolves.
 *
 * Drivers used (Phase 48 + 56 + 57 — all pre-existing):
 *   __driveAddGltfProduct, __setTestCamera, __getCameraPose,
 *   __driveSaveCamera, __driveFocusNode, __getSavedCamera, __getActiveProductIds
 *
 * Fixture: tests/e2e/fixtures/box.glb (Khronos Box.glb, 1664 bytes).
 */

// ─── Fixture ──────────────────────────────────────────────────────────────────

const BOX_GLB_PATH = path.resolve(__dirname, "../tests/e2e/fixtures/box.glb");
const BOX_GLB_BYTES = Buffer.from(fs.readFileSync(BOX_GLB_PATH));

// ─── Saved-camera test data (matching saved-camera-cycle.spec.ts conventions) ─

const SAVED_POS: [number, number, number] = [10, 6, 12];
const SAVED_TARGET: [number, number, number] = [5, 3, 5];
const OTHER_POS: [number, number, number] = [-5, 4, -8];
const OTHER_TARGET: [number, number, number] = [0, 1, 0];

const BASE_SNAPSHOT = {
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
      ceilings: {},
    },
  },
  activeRoomId: "room_main",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function bootApp(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("room-cad-onboarding-completed", "1");
    } catch {
      /* ignore */
    }
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.evaluate(async (snap) => {
    await (
      window as unknown as {
        __cadStore?: {
          getState: () => { loadSnapshot: (s: unknown) => Promise<void> };
        };
      }
    ).__cadStore?.getState().loadSnapshot(snap);
  }, BASE_SNAPSHOT);

  await page.waitForFunction(
    () =>
      typeof (window as unknown as { __driveAddGltfProduct?: unknown })
        .__driveAddGltfProduct === "function",
    { timeout: 8000 },
  );
}

async function seedGltfProduct(
  page: Page,
): Promise<{ gltfId: string; productId: string; placedId: string }> {
  const byteArray = Array.from(BOX_GLB_BYTES);
  const result = await page.evaluate(async (bytes: number[]) => {
    const win = window as unknown as {
      __driveAddGltfProduct?: (
        blob: Blob,
        name: string,
      ) => Promise<{ gltfId: string; productId: string; placedId: string }>;
    };
    const blob = new Blob([new Uint8Array(bytes)], {
      type: "model/gltf-binary",
    });
    return win.__driveAddGltfProduct?.(blob, "box.glb");
  }, byteArray);
  if (!result) throw new Error("__driveAddGltfProduct returned undefined");
  return result;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Phase 58 — GLTF-INTEGRATION-01", () => {
  /**
   * E1: Phase 48 saved-camera × GLTF round-trip.
   *
   * Flow: place GLTF → enter 3D → set camera A → save bookmark on placedProduct →
   *       move camera to B → __driveFocusNode(placedId) → assert camera ≈ A.
   */
  test("E1: saved camera survives navigate-away + focus restore on GLTF product", async ({
    page,
  }) => {
    await bootApp(page);
    const { placedId } = await seedGltfProduct(page);
    expect(placedId).toMatch(/^pp_/);

    // Switch to 3D so __getCameraPose / __setTestCamera become installed.
    await page.getByTestId("view-mode-3d").click();
    await page.waitForFunction(
      () =>
        typeof (window as unknown as { __getCameraPose?: unknown })
          .__getCameraPose === "function",
      { timeout: 10_000 },
    );

    // 1) Set known camera pose A.
    await page.evaluate(([pos, target]) => {
      (
        window as unknown as {
          __setTestCamera?: (p: {
            position: [number, number, number];
            target: [number, number, number];
          }) => void;
        }
      ).__setTestCamera?.({ position: pos, target });
    }, [SAVED_POS, SAVED_TARGET] as const);

    // 2) Save bookmark on the GLTF product.
    await page.evaluate(([id, pos, target]) => {
      (
        window as unknown as {
          __driveSaveCamera?: (
            kind: string,
            id: string,
            pos: [number, number, number],
            target: [number, number, number],
          ) => void;
        }
      ).__driveSaveCamera?.("product", id, pos, target);
    }, [placedId, SAVED_POS, SAVED_TARGET] as const);

    // Read-back assertion — bookmark persisted.
    const stored = await page.evaluate((id) => {
      return (
        (
          window as unknown as {
            __getSavedCamera?: (
              kind: string,
              id: string,
            ) => {
              pos: [number, number, number];
              target: [number, number, number];
            } | null;
          }
        ).__getSavedCamera?.("product", id) ?? null
      );
    }, placedId);
    expect(stored).not.toBeNull();
    expect(stored!.pos[0]).toBeCloseTo(SAVED_POS[0], 4);
    expect(stored!.target[2]).toBeCloseTo(SAVED_TARGET[2], 4);

    // 3) Move camera to B.
    await page.evaluate(([pos, target]) => {
      (
        window as unknown as {
          __setTestCamera?: (p: {
            position: [number, number, number];
            target: [number, number, number];
          }) => void;
        }
      ).__setTestCamera?.({ position: pos, target });
    }, [OTHER_POS, OTHER_TARGET] as const);

    // 4) Focus by tree-row driver (Phase 48).
    await page.evaluate((id) => {
      (
        window as unknown as { __driveFocusNode?: (id: string) => void }
      ).__driveFocusNode?.(id);
    }, placedId);

    // 5) Phase 46 reduced-motion → snap. Allow one React tick.
    await page.waitForTimeout(120);

    // 6) Assert camera pose ≈ A (1 decimal tolerance per Phase 48 precedent).
    const post = await page.evaluate(() => {
      return (
        (
          window as unknown as {
            __getCameraPose?: () => {
              position: [number, number, number];
              target: [number, number, number];
            } | null;
          }
        ).__getCameraPose?.() ?? null
      );
    });
    expect(post).not.toBeNull();
    expect(post!.position[0]).toBeCloseTo(SAVED_POS[0], 1);
    expect(post!.position[1]).toBeCloseTo(SAVED_POS[1], 1);
    expect(post!.position[2]).toBeCloseTo(SAVED_POS[2], 1);
    expect(post!.target[0]).toBeCloseTo(SAVED_TARGET[0], 1);
  });

  /**
   * E2: Library shows Box badge for GLTF product (DOM assertion).
   */
  test("E2: GLTF product card shows Box badge in library", async ({ page }) => {
    await bootApp(page);
    await seedGltfProduct(page);

    // Open library view via toolbar toggle.
    await page.getByTestId("view-mode-library").click();

    // Assert badge present on the GLTF product's card.
    const card = page.getByTestId("library-card").first();
    await expect(card).toBeVisible();
    await expect(card.getByTestId("library-card-badge")).toBeVisible();
  });

  /**
   * E3: GLTF-only product (no imageUrl) gets a rendered thumbnail after compute.
   */
  test("E3: GLTF-only product gets auto-thumbnail after compute", async ({
    page,
  }) => {
    await bootApp(page);
    await seedGltfProduct(page);

    await page.getByTestId("view-mode-library").click();
    await page.getByTestId("library-card").first().waitFor();

    // Wait for thumbnail compute → first <img src> is a data:image/png URL.
    await page.waitForFunction(
      () => {
        const card = document.querySelector('[data-testid="library-card"]');
        const img = card?.querySelector("img");
        const src = img?.getAttribute("src");
        return Boolean(src && src.startsWith("data:image/png;base64,"));
      },
      undefined,
      { timeout: 10_000 },
    );

    const src = await page.evaluate(() => {
      const img = document.querySelector('[data-testid="library-card"] img');
      return img?.getAttribute("src") ?? null;
    });
    expect(src).toMatch(/^data:image\/png;base64,/);
  });
});
