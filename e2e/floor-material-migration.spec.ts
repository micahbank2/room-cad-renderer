/**
 * Phase 51 — DEBT-05: end-to-end FloorMaterial legacy data-URL migration spec.
 *
 * Asserts that loading a v2 snapshot with { kind: "custom", imageUrl: "data:..." }
 * floor material results in:
 * 1. floorMaterial.kind === "user-texture" in live store state
 * 2. No "data:image/" substring in the serialized store rooms JSON
 * 3. Clean v2 snapshots (no legacy FloorMaterial) still load without regression
 */
import { test, expect } from "@playwright/test";

// Minimal valid 1×1 JPEG (43 bytes) — same fixture used in Phase 49 BUG-02 spec.
// Small enough for CI; produces a valid data:image/ string in the v2 snapshot.
const TINY_JPEG_B64 = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVAD/2Q==",
  "base64",
).toString("base64");
const LEGACY_DATA_URL = `data:image/jpeg;base64,${TINY_JPEG_B64}`;

// Minimal v2 snapshot with one room that has a legacy custom FloorMaterial.
const LEGACY_V2_SNAPSHOT = {
  version: 2,
  activeRoomId: "room_main",
  rooms: {
    room_main: {
      id: "room_main",
      name: "Main Room",
      room: { width: 12, length: 10, wallHeight: 8 },
      walls: {
        wall_1: {
          id: "wall_1",
          start: { x: 2, y: 2 },
          end: { x: 10, y: 2 },
          thickness: 0.5,
          height: 8,
          openings: [],
        },
      },
      placedProducts: {},
      floorMaterial: {
        kind: "custom",
        imageUrl: LEGACY_DATA_URL,
        scaleFt: 4,
        rotationDeg: 0,
      },
    },
  },
};

test.describe("DEBT-05 — FloorMaterial legacy data-URL migration", () => {
  test.beforeEach(async ({ page }) => {
    // Skip onboarding overlay
    await page.addInitScript(() => {
      try {
        localStorage.setItem("room-cad-onboarding-completed", "1");
      } catch {
        /* unavailable on about:blank */
      }
    });
    await page.goto("/");
    // Wait for app to initialize and __cadStore to be installed
    await page.waitForFunction(
      () => typeof (window as unknown as { __cadStore?: unknown }).__cadStore !== "undefined",
      { timeout: 10_000 },
    );
  });

  test("v2 legacy FloorMaterial is rewritten to user-texture on loadSnapshot", async ({
    page,
  }) => {
    await page.evaluate(async (snap) => {
      // @ts-expect-error — window.__cadStore installed in test mode (Phase 36)
      await (window as unknown as { __cadStore: { getState: () => { loadSnapshot: (s: unknown) => Promise<void> } } }).__cadStore.getState().loadSnapshot(snap);
    }, LEGACY_V2_SNAPSHOT);

    const floorMaterial = await page.evaluate(() => {
      // @ts-expect-error — window.__cadStore installed in test mode
      const state = (window as unknown as { __cadStore: { getState: () => { rooms: Record<string, { floorMaterial?: unknown }> } } }).__cadStore.getState();
      return state.rooms?.["room_main"]?.floorMaterial ?? null;
    });

    expect(floorMaterial).not.toBeNull();
    expect((floorMaterial as any).kind).toBe("user-texture");
    expect(typeof (floorMaterial as any).userTextureId).toBe("string");
    expect((floorMaterial as any).userTextureId).toMatch(/^utex_/);
    expect((floorMaterial as any).imageUrl).toBeUndefined();
  });

  test("saved project JSON contains no data:image/ string after migration", async ({
    page,
  }) => {
    await page.evaluate(async (snap) => {
      // @ts-expect-error — window.__cadStore installed in test mode (Phase 36)
      await (window as unknown as { __cadStore: { getState: () => { loadSnapshot: (s: unknown) => Promise<void> } } }).__cadStore.getState().loadSnapshot(snap);
    }, LEGACY_V2_SNAPSHOT);

    // Serialize the live rooms state and assert no data URL present
    const roomsJSON = await page.evaluate(() => {
      // @ts-expect-error — window.__cadStore installed in test mode
      const state = (window as unknown as { __cadStore: { getState: () => { rooms: unknown } } }).__cadStore.getState();
      return JSON.stringify(state.rooms ?? {});
    });

    expect(roomsJSON).not.toContain("data:image/");
    // Size assertion: rooms JSON without embedded base64 should be well under 10KB
    expect(new TextEncoder().encode(roomsJSON).length).toBeLessThan(10_000);
  });

  test("v2 snapshot with NO custom FloorMaterial loads correctly (no regression)", async ({
    page,
  }) => {
    const CLEAN_V2 = {
      version: 2,
      activeRoomId: "room_main",
      rooms: {
        room_main: {
          id: "room_main",
          name: "Main Room",
          room: { width: 12, length: 10, wallHeight: 8 },
          walls: {
            wall_1: {
              id: "wall_1",
              start: { x: 2, y: 2 },
              end: { x: 10, y: 2 },
              thickness: 0.5,
              height: 8,
              openings: [],
            },
          },
          placedProducts: {},
        },
      },
    };

    await page.evaluate(async (snap) => {
      // @ts-expect-error — window.__cadStore installed in test mode (Phase 36)
      await (window as unknown as { __cadStore: { getState: () => { loadSnapshot: (s: unknown) => Promise<void> } } }).__cadStore.getState().loadSnapshot(snap);
    }, CLEAN_V2);

    const floorMaterial = await page.evaluate(() => {
      // @ts-expect-error — window.__cadStore installed in test mode
      const state = (window as unknown as { __cadStore: { getState: () => { rooms: Record<string, { floorMaterial?: unknown }> } } }).__cadStore.getState();
      return state.rooms?.["room_main"]?.floorMaterial ?? null;
    });

    // No floorMaterial set → the room loaded cleanly; undefined is correct
    expect(floorMaterial).toBeNull();
  });
});
