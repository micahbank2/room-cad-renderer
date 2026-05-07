// Phase 68 Plan 01 — Wave 0 RED tests for v5→v6 snapshot migration.
// `migrateV5ToV6` does not yet exist; this file is intentionally RED until Plan 02 lands it.
import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";
// @ts-expect-error — RED: symbol does not yet exist (Plan 02 will add it).
import { migrateV5ToV6 } from "@/lib/snapshotMigration";
import { listMaterials, clearAllMaterials } from "@/lib/materialStore";
import type { CADSnapshot } from "@/types/cad";

function makeV5Snapshot(overrides: Partial<CADSnapshot> = {}): CADSnapshot {
  return {
    version: 5,
    rooms: {},
    activeRoomId: null,
    ...overrides,
  } as unknown as CADSnapshot;
}

beforeEach(async () => {
  await clearAllMaterials?.();
});

describe("migrateV5ToV6 — paint migration", () => {
  it("converts wall.wallpaper.A.kind='paint' to wall.materialIdA referencing a paint Material", async () => {
    const snap = makeV5Snapshot({
      rooms: {
        r1: {
          id: "r1",
          walls: {
            w1: {
              id: "w1",
              a: { x: 0, y: 0 },
              b: { x: 10, y: 0 },
              thickness: 0.5,
              wallpaper: { A: { kind: "paint", paintId: "FB_RAILINGS_31" } },
            },
          },
        },
      },
    } as any);
    const out = await migrateV5ToV6(snap);
    const wall = (out.rooms as any).r1.walls.w1;
    expect(wall.materialIdA).toBeTruthy();
    const mats = await listMaterials();
    const m = mats.find((x) => x.id === wall.materialIdA);
    expect((m as any)?.colorHex).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe("migrateV5ToV6 — wallpaper migration", () => {
  it("wraps wallpaper kind='pattern'+userTextureId into a textured Material", async () => {
    const snap = makeV5Snapshot({
      rooms: {
        r1: {
          id: "r1",
          walls: {
            w1: {
              id: "w1",
              a: { x: 0, y: 0 },
              b: { x: 10, y: 0 },
              thickness: 0.5,
              wallpaper: {
                B: { kind: "pattern", userTextureId: "ut_xyz", scaleFt: 2 },
              },
            },
          },
        },
      },
    } as any);
    const out = await migrateV5ToV6(snap);
    const wall = (out.rooms as any).r1.walls.w1;
    expect(wall.materialIdB).toBeTruthy();
    const mats = await listMaterials();
    const m = mats.find((x) => x.id === wall.materialIdB);
    expect(m?.colorMapId).toBe("ut_xyz");
    expect(m?.tileSizeFt).toBe(2);
  });
});

describe("migrateV5ToV6 — floor migration", () => {
  it("wraps user-texture floor into Material via room.floorMaterialId", async () => {
    const snap = makeV5Snapshot({
      rooms: {
        r1: {
          id: "r1",
          walls: {},
          floorMaterial: {
            kind: "user-texture",
            userTextureId: "ut_floor",
            scaleFt: 1.5,
          },
        },
      },
    } as any);
    const out = await migrateV5ToV6(snap);
    const room = (out.rooms as any).r1;
    expect(room.floorMaterialId).toBeTruthy();
    const mats = await listMaterials();
    expect(mats.find((m) => m.id === room.floorMaterialId)?.colorMapId).toBe(
      "ut_floor"
    );
  });

  it("passes through preset id unchanged (room.floorMaterialId === 'WOOD_OAK')", async () => {
    const snap = makeV5Snapshot({
      rooms: {
        r1: {
          id: "r1",
          walls: {},
          floorMaterial: { kind: "preset", presetId: "WOOD_OAK" },
        },
      },
    } as any);
    const out = await migrateV5ToV6(snap);
    expect((out.rooms as any).r1.floorMaterialId).toBe("WOOD_OAK");
  });
});

describe("migrateV5ToV6 — ceiling migration", () => {
  it.each([
    ["surfaceMaterialId='PLASTER'", { surfaceMaterialId: "PLASTER" }],
    ["userTextureId='ut_c'", { userTextureId: "ut_c" }],
    ["paintId='FB_BLACKENED'", { paintId: "FB_BLACKENED" }],
    ["legacy material='#ffeedd'", { material: "#ffeedd" }],
  ])("converts ceiling with %s to ceiling.materialId", async (_label, fields) => {
    const snap = makeV5Snapshot({
      rooms: {
        r1: {
          id: "r1",
          walls: {},
          ceilings: { c1: { id: "c1", points: [], ...fields } },
        },
      },
    } as any);
    const out = await migrateV5ToV6(snap);
    const ceiling = (out.rooms as any).r1.ceilings.c1;
    expect(ceiling.materialId).toBeTruthy();
  });
});

describe("migrateV5ToV6 — idempotency", () => {
  it("running twice produces no new Materials and no field changes", async () => {
    const snap = makeV5Snapshot({
      rooms: {
        r1: {
          id: "r1",
          walls: {
            w1: {
              id: "w1",
              a: { x: 0, y: 0 },
              b: { x: 10, y: 0 },
              thickness: 0.5,
              wallpaper: { A: { kind: "color", color: "#abcdef" } },
            },
          },
        },
      },
    } as any);
    const out1 = await migrateV5ToV6(snap);
    const matsAfterFirst = (await listMaterials()).length;
    const out2 = await migrateV5ToV6(out1);
    expect((await listMaterials()).length).toBe(matsAfterFirst);
    expect((out2.rooms as any).r1.walls.w1.materialIdA).toBe(
      (out1.rooms as any).r1.walls.w1.materialIdA
    );
  });

  it("snapshot with version=6 short-circuits", async () => {
    const snap = { ...makeV5Snapshot(), version: 6 } as any;
    const out = await migrateV5ToV6(snap);
    expect(out).toBe(snap);
  });
});

describe("migrateV5ToV6 — graceful failure", () => {
  it("warns and preserves legacy field when material write fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const matStore = await import("@/lib/materialStore");
    vi.spyOn(matStore, "saveMaterialWithDedup").mockRejectedValueOnce(
      new Error("idb down")
    );
    const snap = makeV5Snapshot({
      rooms: {
        r1: {
          id: "r1",
          walls: {
            w1: {
              id: "w1",
              a: { x: 0, y: 0 },
              b: { x: 10, y: 0 },
              thickness: 0.5,
              wallpaper: { A: { kind: "color", color: "#abcdef" } },
            },
          },
        },
      },
    } as any);
    const out = await migrateV5ToV6(snap);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("[Phase68]"));
    expect((out.rooms as any).r1.walls.w1.wallpaper.A).toBeDefined();
    warnSpy.mockRestore();
  });
});
