/**
 * Phase 31 Wave 0 — Red stubs for the new placement-mutation store actions
 * (`updatePlacedCustomElement`, `updatePlacedCustomElementNoHistory`,
 * `clearProductOverrides`, `clearCustomElementOverrides`).
 *
 * Locks the CUSTOM-06 + EDIT-22 D-13 / Pitfall 4 contracts:
 *   - `updateCustomElement` (existing) mutates the CATALOG entry
 *   - `updatePlacedCustomElement` (NEW) mutates the PLACEMENT instance
 *   - These are distinct — confusing them renames every couch of a type
 *
 * MUST fail on this commit — the new actions do not exist on cadStore yet.
 * Plan 31-02 / 31-03 add them following the `updateWall` / `updateWallNoHistory`
 * pattern with D-03 single-undo semantics.
 *
 * Driver-bridge contract advertised here for Plan 31-02 / Plan 31-03:
 *   window.__driveLabelOverride = { typeAndCommit } — see tests/phase31LabelOverride.test.tsx
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useCADStore, resetCADStoreForTests } from "@/stores/cadStore";

const ROOM_ID = "room_main";
const PCE_ID = "pce-1";
const CE_ID = "ce-1";
const PP_ID = "pp-1";
const PROD_ID = "prod-1";

function activeDoc() {
  const s = useCADStore.getState();
  return s.rooms[s.activeRoomId!];
}

function seed() {
  resetCADStoreForTests();
  useCADStore.setState((prev) => ({
    ...prev,
    rooms: {
      [ROOM_ID]: {
        id: ROOM_ID,
        name: "Main",
        room: { width: 20, length: 20, wallHeight: 8 },
        walls: {},
        placedProducts: {
          [PP_ID]: {
            id: PP_ID,
            productId: PROD_ID,
            position: { x: 5, y: 5 },
            rotation: 0,
            sizeScale: 1,
          },
        },
        placedCustomElements: {
          [PCE_ID]: {
            id: PCE_ID,
            customElementId: CE_ID,
            position: { x: 8, y: 8 },
            rotation: 0,
            sizeScale: 1,
          },
        },
      },
    },
    activeRoomId: ROOM_ID,
    // Catalog is at the snapshot root level (per cadStore convention)
    customElements: {
      [CE_ID]: {
        id: CE_ID,
        name: "Fridge",
        shape: "box",
        width: 3,
        depth: 3,
        height: 6,
        color: "#cccccc",
      },
    },
  }) as any);
}

// --- updatePlacedCustomElement (Pitfall 4) --------------------------------

describe("updatePlacedCustomElement (Pitfall 4 — distinct from updateCustomElement)", () => {
  beforeEach(() => seed());

  it("writes labelOverride onto the PLACEMENT, not the catalog", () => {
    useCADStore.getState().updatePlacedCustomElement(PCE_ID, { labelOverride: "Big Fridge" });
    const placed = activeDoc().placedCustomElements?.[PCE_ID];
    expect(placed?.labelOverride).toBe("Big Fridge");

    // Catalog name unchanged — Pitfall 4 protection
    const root = useCADStore.getState() as any;
    expect(root.customElements[CE_ID].name).toBe("Fridge");
  });

  it("pushes exactly 1 history entry per call", () => {
    const before = useCADStore.getState().past.length;
    useCADStore.getState().updatePlacedCustomElement(PCE_ID, { labelOverride: "Big Fridge" });
    expect(useCADStore.getState().past.length).toBe(before + 1);
  });

  it("non-existent id is a no-op (no throw, no history push)", () => {
    const before = useCADStore.getState().past.length;
    expect(() => {
      useCADStore.getState().updatePlacedCustomElement("nonexistent", { labelOverride: "x" });
    }).not.toThrow();
    expect(useCADStore.getState().past.length).toBe(before);
  });

  it("partial update preserves other fields (position, rotation unchanged)", () => {
    useCADStore.getState().updatePlacedCustomElement(PCE_ID, { labelOverride: "Big Fridge" });
    const placed = activeDoc().placedCustomElements?.[PCE_ID]!;
    expect(placed.position).toEqual({ x: 8, y: 8 });
    expect(placed.rotation).toBe(0);
    expect(placed.sizeScale).toBe(1);
  });

  it("supports widthFtOverride and depthFtOverride in the Partial", () => {
    useCADStore.getState().updatePlacedCustomElement(PCE_ID, {
      widthFtOverride: 4.5,
      depthFtOverride: 2.5,
    });
    const placed = activeDoc().placedCustomElements?.[PCE_ID]!;
    expect(placed.widthFtOverride).toBeCloseTo(4.5);
    expect(placed.depthFtOverride).toBeCloseTo(2.5);
  });
});

// --- updatePlacedCustomElementNoHistory -----------------------------------

describe("updatePlacedCustomElementNoHistory (mid-drag / live-preview path)", () => {
  beforeEach(() => seed());

  it("same mutation semantics as updatePlacedCustomElement", () => {
    useCADStore.getState().updatePlacedCustomElementNoHistory(PCE_ID, { labelOverride: "Live" });
    expect(activeDoc().placedCustomElements?.[PCE_ID]?.labelOverride).toBe("Live");
  });

  it("does NOT push a history entry", () => {
    const before = useCADStore.getState().past.length;
    useCADStore.getState().updatePlacedCustomElementNoHistory(PCE_ID, { labelOverride: "Live" });
    expect(useCADStore.getState().past.length).toBe(before);
  });
});

// --- clearProductOverrides / clearCustomElementOverrides ------------------

describe("clearProductOverrides / clearCustomElementOverrides (D-02 reset)", () => {
  beforeEach(() => seed());

  it("clearProductOverrides sets widthFtOverride + depthFtOverride to undefined; sizeScale untouched", () => {
    // Set overrides first.
    useCADStore.setState((s) => {
      const doc = s.rooms[s.activeRoomId!];
      doc.placedProducts[PP_ID].widthFtOverride = 7;
      doc.placedProducts[PP_ID].depthFtOverride = 3;
      doc.placedProducts[PP_ID].sizeScale = 1.5;
      return s;
    });

    const before = useCADStore.getState().past.length;
    useCADStore.getState().clearProductOverrides(PP_ID);

    const pp = activeDoc().placedProducts[PP_ID];
    expect(pp.widthFtOverride).toBeUndefined();
    expect(pp.depthFtOverride).toBeUndefined();
    expect(pp.sizeScale).toBe(1.5); // sizeScale NOT touched (D-02)
    expect(useCADStore.getState().past.length).toBe(before + 1);
  });

  it("clearCustomElementOverrides clears overrides on a placedCustomElement; sizeScale untouched", () => {
    useCADStore.setState((s) => {
      const doc = s.rooms[s.activeRoomId!];
      doc.placedCustomElements![PCE_ID].widthFtOverride = 5;
      doc.placedCustomElements![PCE_ID].depthFtOverride = 4;
      doc.placedCustomElements![PCE_ID].sizeScale = 2;
      return s;
    });

    useCADStore.getState().clearCustomElementOverrides(PCE_ID);

    const pce = activeDoc().placedCustomElements?.[PCE_ID]!;
    expect(pce.widthFtOverride).toBeUndefined();
    expect(pce.depthFtOverride).toBeUndefined();
    expect(pce.sizeScale).toBe(2);
  });

  it("clearProductOverrides on non-existent id is a no-op", () => {
    const before = useCADStore.getState().past.length;
    expect(() => useCADStore.getState().clearProductOverrides("nonexistent")).not.toThrow();
    expect(useCADStore.getState().past.length).toBe(before);
  });
});
