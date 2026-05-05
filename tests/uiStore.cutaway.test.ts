// Phase 59 CUTAWAY-01 — uiStore cutaway state + actions tests
// D-09 (with planner deviation): cutawayAutoDetectedWallId is Map<roomId, wallId|null>.
// Covers D-10 unit tests U3, U4 + setCutawayMode("off") side-effect coverage.

import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "@/stores/uiStore";

describe("uiStore cutaway state", () => {
  beforeEach(() => {
    // Reset to defaults between tests.
    useUIStore.setState({
      cutawayMode: "off",
      cutawayAutoDetectedWallId: new Map<string, string | null>(),
      cutawayManualWallIds: new Set<string>(),
    });
  });

  it("default cutawayMode is 'off' with empty Map and empty Set", () => {
    const s = useUIStore.getState();
    expect(s.cutawayMode).toBe("off");
    expect(s.cutawayAutoDetectedWallId).toBeInstanceOf(Map);
    expect(s.cutawayAutoDetectedWallId.size).toBe(0);
    expect(s.cutawayManualWallIds).toBeInstanceOf(Set);
    expect(s.cutawayManualWallIds.size).toBe(0);
  });

  it("setCutawayMode('auto') sets cutawayMode to 'auto' without touching manualWallIds", () => {
    useUIStore.getState().toggleCutawayManualWall("wall_1");
    expect(useUIStore.getState().cutawayManualWallIds.has("wall_1")).toBe(true);

    useUIStore.getState().setCutawayMode("auto");
    expect(useUIStore.getState().cutawayMode).toBe("auto");
    // Switching to 'auto' must NOT clear manual hides (only off→clear is locked).
    expect(useUIStore.getState().cutawayManualWallIds.has("wall_1")).toBe(true);
  });

  it("setCutawayMode('off') clears cutawayManualWallIds (single side-effect)", () => {
    useUIStore.getState().setCutawayMode("auto");
    useUIStore.getState().toggleCutawayManualWall("wall_1");
    useUIStore.getState().toggleCutawayManualWall("wall_2");
    expect(useUIStore.getState().cutawayManualWallIds.size).toBe(2);

    useUIStore.getState().setCutawayMode("off");
    expect(useUIStore.getState().cutawayMode).toBe("off");
    expect(useUIStore.getState().cutawayManualWallIds.size).toBe(0);
  });

  it("U3a: toggleCutawayManualWall adds a wall when not present", () => {
    useUIStore.getState().toggleCutawayManualWall("wall_a");
    const s = useUIStore.getState();
    expect(s.cutawayManualWallIds.has("wall_a")).toBe(true);
    expect(s.cutawayManualWallIds.size).toBe(1);
  });

  it("U3b: toggleCutawayManualWall removes a wall when present", () => {
    useUIStore.getState().toggleCutawayManualWall("wall_a");
    useUIStore.getState().toggleCutawayManualWall("wall_a");
    const s = useUIStore.getState();
    expect(s.cutawayManualWallIds.has("wall_a")).toBe(false);
    expect(s.cutawayManualWallIds.size).toBe(0);
  });

  it("toggleCutawayManualWall produces a NEW Set instance (immutable update)", () => {
    const before = useUIStore.getState().cutawayManualWallIds;
    useUIStore.getState().toggleCutawayManualWall("wall_a");
    const after = useUIStore.getState().cutawayManualWallIds;
    expect(after).not.toBe(before);
  });

  it("U4: clearCutawayManualWalls empties the set", () => {
    useUIStore.getState().toggleCutawayManualWall("wall_a");
    useUIStore.getState().toggleCutawayManualWall("wall_b");
    expect(useUIStore.getState().cutawayManualWallIds.size).toBe(2);

    useUIStore.getState().clearCutawayManualWalls();
    expect(useUIStore.getState().cutawayManualWallIds.size).toBe(0);
  });

  it("setCutawayAutoDetectedWall writes wallId at roomId key", () => {
    useUIStore.getState().setCutawayAutoDetectedWall("room_1", "wall_north");
    expect(useUIStore.getState().cutawayAutoDetectedWallId.get("room_1")).toBe(
      "wall_north",
    );
  });

  it("setCutawayAutoDetectedWall is idempotent — same value does NOT replace the Map (compare-then-set)", () => {
    useUIStore.getState().setCutawayAutoDetectedWall("room_1", "wall_x");
    const before = useUIStore.getState().cutawayAutoDetectedWallId;

    useUIStore.getState().setCutawayAutoDetectedWall("room_1", "wall_x");
    const after = useUIStore.getState().cutawayAutoDetectedWallId;

    // Same instance — no spurious React renders.
    expect(after).toBe(before);
  });

  it("setCutawayAutoDetectedWall clones the Map when value differs", () => {
    useUIStore.getState().setCutawayAutoDetectedWall("room_1", "wall_a");
    const before = useUIStore.getState().cutawayAutoDetectedWallId;

    useUIStore.getState().setCutawayAutoDetectedWall("room_1", "wall_b");
    const after = useUIStore.getState().cutawayAutoDetectedWallId;

    expect(after).not.toBe(before);
    expect(after.get("room_1")).toBe("wall_b");
  });

  it("setCutawayAutoDetectedWall accepts null wallId (top-down disable)", () => {
    useUIStore.getState().setCutawayAutoDetectedWall("room_1", "wall_a");
    useUIStore.getState().setCutawayAutoDetectedWall("room_1", null);
    expect(useUIStore.getState().cutawayAutoDetectedWallId.get("room_1")).toBeNull();
  });

  it("setCutawayAutoDetectedWall keys remain independent across rooms", () => {
    useUIStore.getState().setCutawayAutoDetectedWall("room_1", "wall_a");
    useUIStore.getState().setCutawayAutoDetectedWall("room_2", "wall_b");
    const m = useUIStore.getState().cutawayAutoDetectedWallId;
    expect(m.get("room_1")).toBe("wall_a");
    expect(m.get("room_2")).toBe("wall_b");
  });
});
