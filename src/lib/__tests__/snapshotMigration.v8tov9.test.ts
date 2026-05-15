import { describe, it, expect } from "vitest";
import { migrateV8ToV9, migrateSnapshot, defaultSnapshot } from "@/lib/snapshotMigration";
import type { CADSnapshot } from "@/types/cad";

function v8Fixture(): any {
  return {
    version: 8,
    rooms: {
      room_main: {
        id: "room_main",
        name: "Main Room",
        room: { width: 20, length: 16, wallHeight: 8 },
        walls: {
          wall_a: {
            id: "wall_a",
            start: { x: 0, y: 0 },
            end: { x: 10, y: 0 },
            thickness: 0.5,
            height: 8,
            openings: [],
          },
        },
        placedProducts: {
          pp_a: {
            id: "pp_a",
            productId: "prod_sofa",
            position: { x: 5, y: 5 },
            rotation: 0,
          },
        },
        placedCustomElements: {
          pce_a: {
            id: "pce_a",
            customElementId: "ce_table",
            position: { x: 3, y: 3 },
            rotation: 0,
          },
        },
        stairs: {},
        measureLines: {},
        annotations: {},
      },
    },
    activeRoomId: "room_main",
  };
}

describe("migrateV8ToV9 (Phase 85 D-05)", () => {
  it("bumps version 8 → 9 and preserves placedProducts unchanged", () => {
    const snap = v8Fixture();
    const out = migrateV8ToV9(snap as CADSnapshot);
    expect(out.version).toBe(9);
    expect((out.rooms.room_main.placedProducts.pp_a as any).heightFtOverride).toBeUndefined();
    // Other fields untouched.
    expect(out.rooms.room_main.placedProducts.pp_a.id).toBe("pp_a");
    expect(out.rooms.room_main.placedProducts.pp_a.productId).toBe("prod_sofa");
  });

  it("preserves placedCustomElements unchanged when migrating v8 → v9", () => {
    const snap = v8Fixture();
    const out = migrateV8ToV9(snap as CADSnapshot);
    expect((out.rooms.room_main.placedCustomElements!.pce_a as any).heightFtOverride).toBeUndefined();
    expect(out.rooms.room_main.placedCustomElements!.pce_a.id).toBe("pce_a");
  });

  it("is idempotent on v9 input (returns same reference, no mutation)", () => {
    const snap: any = { ...v8Fixture(), version: 9 };
    const out = migrateV8ToV9(snap as CADSnapshot);
    expect(out.version).toBe(9);
    expect(out).toBe(snap);
  });

  it("preserves a forward-injected heightFtOverride on PlacedProduct", () => {
    const snap: any = v8Fixture();
    snap.rooms.room_main.placedProducts.pp_a.heightFtOverride = 7;
    const out = migrateV8ToV9(snap as CADSnapshot);
    expect((out.rooms.room_main.placedProducts.pp_a as any).heightFtOverride).toBe(7);
  });

  it("preserves a forward-injected heightFtOverride on PlacedCustomElement", () => {
    const snap: any = v8Fixture();
    snap.rooms.room_main.placedCustomElements.pce_a.heightFtOverride = 4.5;
    const out = migrateV8ToV9(snap as CADSnapshot);
    expect((out.rooms.room_main.placedCustomElements!.pce_a as any).heightFtOverride).toBe(4.5);
  });

  it("walls and other room state pass through unchanged", () => {
    const snap = v8Fixture();
    const out = migrateV8ToV9(snap as CADSnapshot);
    expect(Object.keys(out.rooms.room_main.walls)).toEqual(["wall_a"]);
    expect(out.rooms.room_main.walls.wall_a.thickness).toBe(0.5);
  });

  it("round-trips through JSON serialization without throwing", () => {
    const snap = v8Fixture();
    const parsed = JSON.parse(JSON.stringify(snap));
    expect(() => migrateV8ToV9(parsed as CADSnapshot)).not.toThrow();
    const out = migrateV8ToV9(parsed as CADSnapshot);
    expect(out.version).toBe(9);
  });
});

describe("migrateSnapshot routing (Phase 85 D-05)", () => {
  it("routes v8 input through migrateV8ToV9 (result is v9)", () => {
    const raw = v8Fixture();
    const out = migrateSnapshot(raw);
    expect(out.version).toBe(9);
  });

  it("v9 input passes through unchanged (same reference)", () => {
    const raw: any = { ...v8Fixture(), version: 9 };
    const out = migrateSnapshot(raw);
    expect(out.version).toBe(9);
    expect(out).toBe(raw);
  });
});

describe("defaultSnapshot (Phase 85 D-05)", () => {
  it("emits version 9", () => {
    expect(defaultSnapshot().version).toBe(9);
  });

  it("has empty stairs / measureLines / annotations on the main room (Phase 60/62 seeds preserved)", () => {
    const d = defaultSnapshot();
    expect(d.rooms.room_main.stairs).toEqual({});
    expect(d.rooms.room_main.measureLines).toEqual({});
    expect(d.rooms.room_main.annotations).toEqual({});
  });
});
