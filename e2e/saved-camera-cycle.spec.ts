import { test, expect, type Page } from "@playwright/test";

const SAVED_POS: [number, number, number] = [10, 6, 12];
const SAVED_TARGET: [number, number, number] = [5, 3, 5];
const OTHER_POS: [number, number, number] = [-5, 4, -8];
const OTHER_TARGET: [number, number, number] = [0, 1, 0];

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
      placedProducts: {
        pp_test: {
          id: "pp_test",
          productId: "test_product_lib_id",
          position: { x: 5, y: 5 },
          rotation: 0,
        },
      },
      placedCustomElements: {},
    },
  },
  activeRoomId: "room_main",
};

async function seedAndEnter3D(page: Page): Promise<void> {
  await page.evaluate(async (snap) => {
    // @ts-expect-error — window.__cadStore installed in test mode (Phase 36)
    (window as unknown as { __cadStore: { getState: () => { loadSnapshot: (s: unknown) => void } } }).__cadStore.getState().loadSnapshot(snap);
  }, SNAPSHOT);
  await page.getByTestId("view-mode-3d").click();
}

test.describe("Phase 48 — saved-camera Save → Focus cycle (CAM-04)", () => {
  test.beforeEach(async ({ page }) => {
    // D-08: reduced-motion uses Phase 46's snap path → camera move is instant.
    await page.emulateMedia({ reducedMotion: "reduce" });

    // Skip onboarding overlay so it doesn't block clicks.
    await page.addInitScript(() => {
      try {
        localStorage.setItem("room-cad-onboarding-completed", "1");
      } catch {
        /* unavailable on about:blank */
      }
    });

    await page.goto("/");
    await seedAndEnter3D(page);
  });

  test("save → focus round-trip via window drivers", async ({ page }) => {
    const productId = await page.evaluate(() => {
      return (window as unknown as { __getActiveProductIds?: () => string[] }).__getActiveProductIds?.()[0] ?? null;
    });
    expect(productId).not.toBeNull();

    // Set a known camera pose.
    await page.evaluate(([pos, target]) => {
      (window as unknown as { __setTestCamera?: (p: { position: [number,number,number]; target: [number,number,number] }) => void }).__setTestCamera?.({ position: pos, target });
    }, [SAVED_POS, SAVED_TARGET] as const);

    // Save the bookmark via driver.
    await page.evaluate(([id, pos, target]) => {
      (window as unknown as { __driveSaveCamera?: (kind: string, id: string, pos: [number,number,number], target: [number,number,number]) => void }).__driveSaveCamera?.("product", id, pos, target);
    }, [productId!, SAVED_POS, SAVED_TARGET] as const);

    // Read back via driver.
    const stored = await page.evaluate((id) => {
      return (window as unknown as { __getSavedCamera?: (kind: string, id: string) => { pos: [number,number,number]; target: [number,number,number] } | null }).__getSavedCamera?.("product", id) ?? null;
    }, productId!);
    expect(stored).not.toBeNull();
    expect(stored!.pos[0]).toBeCloseTo(SAVED_POS[0], 4);
    expect(stored!.target[2]).toBeCloseTo(SAVED_TARGET[2], 4);

    // Move camera elsewhere.
    await page.evaluate(([pos, target]) => {
      (window as unknown as { __setTestCamera?: (p: { position: [number,number,number]; target: [number,number,number] }) => void }).__setTestCamera?.({ position: pos, target });
    }, [OTHER_POS, OTHER_TARGET] as const);

    // Trigger Focus via double-click driver.
    await page.evaluate((id) => {
      (window as unknown as { __driveFocusNode?: (id: string) => void }).__driveFocusNode?.(id);
    }, productId!);

    // Under reduced-motion, the camera snaps. Assert pose matches saved tuple.
    const post = await page.evaluate(() => {
      return (window as unknown as { __getCameraPose?: () => { position: [number,number,number]; target: [number,number,number] } | null }).__getCameraPose?.() ?? null;
    });
    expect(post).not.toBeNull();
    expect(post!.position[0]).toBeCloseTo(SAVED_POS[0], 1);
    expect(post!.position[1]).toBeCloseTo(SAVED_POS[1], 1);
    expect(post!.position[2]).toBeCloseTo(SAVED_POS[2], 1);
    expect(post!.target[0]).toBeCloseTo(SAVED_TARGET[0], 1);
  });

  // Reload-persistence test deferred: Phase 28 autosave only fires when
  // projectStore.activeId is non-null. Setting up that lifecycle from a fresh
  // page load is non-trivial and out-of-scope for this CAM-04 ship.
  // Snapshot serialization round-trip is covered by the unit test at
  // src/stores/__tests__/cadStore.savedCamera.test.ts (JSON.parse(JSON.stringify(rooms))).
});
