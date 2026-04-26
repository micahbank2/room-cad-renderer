import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "@/stores/uiStore";

describe("uiStore — Phase 46 hiddenIds (transient, D-13)", () => {
  beforeEach(() => useUIStore.getState().clearHidden?.());
  it("initial state is empty Set", () => {
    expect(useUIStore.getState().hiddenIds).toBeInstanceOf(Set);
    expect(useUIStore.getState().hiddenIds.size).toBe(0);
  });
  it("toggleHidden adds then removes", () => {
    useUIStore.getState().toggleHidden("w1");
    expect(useUIStore.getState().hiddenIds.has("w1")).toBe(true);
    useUIStore.getState().toggleHidden("w1");
    expect(useUIStore.getState().hiddenIds.has("w1")).toBe(false);
  });
  it("setHidden idempotent", () => {
    useUIStore.getState().setHidden("p1", true);
    useUIStore.getState().setHidden("p1", true);
    expect(useUIStore.getState().hiddenIds.size).toBe(1);
  });
  it("clearHidden empties the set", () => {
    useUIStore.getState().setHidden("p1", true);
    useUIStore.getState().setHidden("p2", true);
    useUIStore.getState().clearHidden();
    expect(useUIStore.getState().hiddenIds.size).toBe(0);
  });
});
