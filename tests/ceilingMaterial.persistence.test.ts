import { describe, it, expect, beforeEach } from "vitest";
import { SURFACE_MATERIALS } from "@/data/surfaceMaterials";
import { useCADStore } from "@/stores/cadStore";
import type { Ceiling } from "@/types/cad";

/**
 * FIX-02 Wave 0 RED/baseline tests.
 *
 * Two hypotheses from 26-RESEARCH.md:
 *   - Pitfall 3: Near-white ceiling presets (PLASTER #f0ebe0 vs PAINTED_DRYWALL #f5f5f5)
 *     look visually identical → user perceives "preset not rendering" when it IS rendering.
 *   - Pitfall 4: structuredClone snapshot path drops surfaceMaterialId.
 *
 * Expected outcome: these tests PASS against current main (structuredClone preserves
 * plain strings cleanly; SURFACE_MATERIALS values are distinct). If they pass, Pitfall 4
 * is ruled out and Plan 26-02 must target UI-wiring / tier-resolution / visual perception.
 * If they fail, a concrete serialization bug has been pinpointed.
 */

describe("Ceiling preset distinctness (FIX-02 Pitfall 3)", () => {
  it("ceiling presets have distinct colors", () => {
    expect(SURFACE_MATERIALS.PLASTER.color).toBe("#f0ebe0");
    expect(SURFACE_MATERIALS.WOOD_PLANK.color).toBe("#a0794f");
    expect(SURFACE_MATERIALS.PAINTED_DRYWALL.color).toBe("#f5f5f5");
    expect(SURFACE_MATERIALS.CONCRETE.color).toBe("#8a8a8a");
    // Pitfall 3 guard: PLASTER and PAINTED_DRYWALL must not be the same hex
    expect(SURFACE_MATERIALS.PLASTER.color).not.toBe(
      SURFACE_MATERIALS.PAINTED_DRYWALL.color
    );
  });

  it("ceiling preset WOOD_PLANK has roughness 0.75 and PLASTER has 0.9", () => {
    expect(SURFACE_MATERIALS.WOOD_PLANK.roughness).toBe(0.75);
    expect(SURFACE_MATERIALS.PLASTER.roughness).toBe(0.9);
  });

  it("CONCRETE is the shared both-surface preset with roughness 0.85", () => {
    expect(SURFACE_MATERIALS.CONCRETE.roughness).toBe(0.85);
    expect(SURFACE_MATERIALS.CONCRETE.surface).toBe("both");
  });
});

describe("Ceiling surfaceMaterialId structuredClone round-trip (FIX-02 Pitfall 4)", () => {
  it("surfaceMaterialId survives structuredClone", () => {
    const ceiling: Ceiling = {
      id: "c1",
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
      height: 8,
      material: "#ffffff",
      surfaceMaterialId: "WOOD_PLANK",
    };
    const clone = structuredClone(ceiling);
    expect(clone.surfaceMaterialId).toBe("WOOD_PLANK");
    expect(clone.material).toBe("#ffffff"); // tier-3 untouched
  });

  it("setting surfaceMaterialId clears paintId and limeWash (mirrors setCeilingSurfaceMaterial)", () => {
    // Pure-function simulation of the store action's effect; confirms the contract
    // that will be round-tripped. The actual store action is tested elsewhere.
    const before = {
      paintId: "FB-2005",
      limeWash: true,
      material: "#ffffff",
    };
    const after = { ...before, surfaceMaterialId: "CONCRETE" };
    delete (after as Partial<typeof after>).paintId;
    delete (after as Partial<typeof after>).limeWash;
    const clone = structuredClone(after);
    expect(clone.surfaceMaterialId).toBe("CONCRETE");
    expect((clone as { paintId?: string }).paintId).toBeUndefined();
    expect((clone as { limeWash?: boolean }).limeWash).toBeUndefined();
  });

  it("JSON round-trip (save path) preserves surfaceMaterialId", () => {
    const ceiling = {
      id: "c1",
      points: [],
      height: 8,
      material: "#ffffff",
      surfaceMaterialId: "PLASTER",
    };
    const roundTripped = JSON.parse(
      JSON.stringify(structuredClone(ceiling))
    );
    expect(roundTripped.surfaceMaterialId).toBe("PLASTER");
  });

  it("structuredClone preserves all three overlapping ceiling material fields when present", () => {
    // D-07: the three fields (material/paintId/surfaceMaterialId) remain as-is.
    // Guard that serialization does not silently collapse them.
    const ceiling: Ceiling = {
      id: "c2",
      points: [],
      height: 9,
      material: "#eeeeee",
      paintId: "FB-2005",
      limeWash: false,
      surfaceMaterialId: "PAINTED_DRYWALL",
    };
    const clone = structuredClone(ceiling);
    expect(clone.material).toBe("#eeeeee");
    expect(clone.paintId).toBe("FB-2005");
    expect(clone.limeWash).toBe(false);
    expect(clone.surfaceMaterialId).toBe("PAINTED_DRYWALL");
  });
});

/**
 * FIX-02 Plan 26-02 GREEN regression guard.
 *
 * Diagnosis (Plan 26-02 Outcome A, Pitfall 3): The production code path is
 * functionally correct — setCeilingSurfaceMaterial writes surfaceMaterialId,
 * CeilingMesh's tier-1 branch consumes it, the snapshot round-trip preserves it.
 * The user-facing bug reported in issue #43 was most likely Pitfall 3: near-white
 * ceiling presets (PLASTER #f0ebe0 vs PAINTED_DRYWALL #f5f5f5) look visually
 * near-identical, producing the "nothing changes" perception.
 *
 * These integration tests lock in the real store path end-to-end so a future
 * refactor cannot silently regress either (a) the setter contract, (b) the
 * snapshot round-trip, or (c) the preset catalog values a user actually sees.
 */

describe("FIX-02 regression guard: store → snapshot → clone end-to-end", () => {
  beforeEach(() => {
    // Reset the store to a known shape between tests.
    const roomId = "test_room_ceilings";
    useCADStore.setState({
      rooms: {
        [roomId]: {
          id: roomId,
          name: "Test",
          room: { width: 20, length: 16, wallHeight: 8 },
          walls: {},
          placedProducts: {},
          ceilings: {},
        },
      },
      activeRoomId: roomId,
      past: [],
      future: [],
    });
  });

  it("setCeilingSurfaceMaterial persists through the live store's snapshot path", () => {
    const store = useCADStore.getState();
    const ceilingId = store.addCeiling(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
      8
    );
    useCADStore.getState().setCeilingSurfaceMaterial(ceilingId, "WOOD_PLANK");

    // Live store state
    const live = useCADStore.getState();
    const roomDoc = live.rooms[live.activeRoomId!];
    expect(roomDoc.ceilings?.[ceilingId].surfaceMaterialId).toBe("WOOD_PLANK");

    // Simulate the pushHistory / save snapshot path: structuredClone of rooms
    const cloned = structuredClone(live.rooms);
    expect(cloned[live.activeRoomId!].ceilings?.[ceilingId].surfaceMaterialId).toBe(
      "WOOD_PLANK"
    );

    // Simulate IDB save (JSON) + reload
    const jsonRoundTrip = JSON.parse(JSON.stringify(cloned));
    expect(
      jsonRoundTrip[live.activeRoomId!].ceilings[ceilingId].surfaceMaterialId
    ).toBe("WOOD_PLANK");
  });

  it("setCeilingSurfaceMaterial clears paintId and limeWash (store integration)", () => {
    const store = useCADStore.getState();
    const ceilingId = store.addCeiling([], 8);
    // Seed paintId + limeWash first, then switch to a surface material
    useCADStore.getState().updateCeiling(ceilingId, { paintId: "FB-2005", limeWash: true });
    useCADStore.getState().setCeilingSurfaceMaterial(ceilingId, "CONCRETE");

    const live = useCADStore.getState();
    const c = live.rooms[live.activeRoomId!].ceilings?.[ceilingId];
    expect(c?.surfaceMaterialId).toBe("CONCRETE");
    expect(c?.paintId).toBeUndefined();
    expect(c?.limeWash).toBeUndefined();
  });

  it("tier-1 color resolution: WOOD_PLANK yields #a0794f (not the legacy fallback)", () => {
    // Mirrors CeilingMesh tier-1 resolution — if this breaks, CeilingMesh's
    // tier branch has to be updated in lockstep.
    const preset = SURFACE_MATERIALS.WOOD_PLANK;
    expect(preset).toBeDefined();
    expect(preset.color).toBe("#a0794f");
    expect(preset.roughness).toBe(0.75);
    // Sanity: ceiling fallback hex is NOT WOOD_PLANK's color
    expect(preset.color).not.toBe("#f5f5f5");
  });

  it("CONCRETE and WOOD_PLANK are visibly distinct (Pitfall 3 mitigation)", () => {
    // Per 26-00 SUMMARY and Plan 26-02 Outcome A: manual smoke MUST cycle
    // CONCRETE (#8a8a8a gray) ↔ WOOD_PLANK (#a0794f amber) to verify the
    // render path — PLASTER/PAINTED_DRYWALL alone differ too subtly at a glance.
    expect(SURFACE_MATERIALS.CONCRETE.color).toBe("#8a8a8a");
    expect(SURFACE_MATERIALS.WOOD_PLANK.color).toBe("#a0794f");
    expect(SURFACE_MATERIALS.CONCRETE.color).not.toBe(
      SURFACE_MATERIALS.WOOD_PLANK.color
    );
  });
});
