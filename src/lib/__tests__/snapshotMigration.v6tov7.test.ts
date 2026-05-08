import { describe, it, expect } from "vitest";
import { migrateV6ToV7 } from "@/lib/snapshotMigration";
import type { CADSnapshot } from "@/types/cad";

function v6Fixture(): any {
  return {
    version: 6,
    rooms: {
      room_main: {
        id: "room_main",
        name: "Main Room",
        room: { width: 20, length: 16, wallHeight: 8 },
        walls: {},
        placedProducts: {
          pp_a: { id: "pp_a", productId: "prod_x", position: { x: 5, y: 5 }, rotation: 0 },
        },
        stairs: {}, measureLines: {}, annotations: {},
      },
    },
    activeRoomId: "room_main",
  };
}

describe("migrateV6ToV7", () => {
  it("bumps version 6 → 7 and preserves placedProducts unchanged", () => {
    const snap = v6Fixture();
    const out = migrateV6ToV7(snap as CADSnapshot);
    expect(out.version).toBe(7);
    expect((out.rooms.room_main.placedProducts.pp_a as any).finishMaterialId).toBeUndefined();
  });

  it("is idempotent on v7 input", () => {
    const snap: any = { ...v6Fixture(), version: 7 };
    const out = migrateV6ToV7(snap as CADSnapshot);
    expect(out.version).toBe(7);
  });

  it("preserves a forward-injected finishMaterialId", () => {
    const snap: any = v6Fixture();
    snap.rooms.room_main.placedProducts.pp_a.finishMaterialId = "mat_x";
    const out = migrateV6ToV7(snap as CADSnapshot);
    expect((out.rooms.room_main.placedProducts.pp_a as any).finishMaterialId).toBe("mat_x");
  });

  it("round-trips through JSON serialization without throwing", () => {
    const snap = v6Fixture();
    const parsed = JSON.parse(JSON.stringify(snap));
    expect(() => migrateV6ToV7(parsed as CADSnapshot)).not.toThrow();
    const out = migrateV6ToV7(parsed as CADSnapshot);
    expect(out.version).toBe(7);
  });
});
