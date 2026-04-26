import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "@/stores/uiStore";

describe("uiStore — pendingCameraTarget", () => {
  beforeEach(() => useUIStore.getState().clearPendingCameraTarget?.());
  it("requestCameraTarget increments seq monotonically", () => {
    useUIStore.getState().requestCameraTarget([1, 2, 3], [4, 5, 6]);
    const s1 = useUIStore.getState().pendingCameraTarget?.seq ?? 0;
    useUIStore.getState().requestCameraTarget([7, 8, 9], [0, 0, 0]);
    const s2 = useUIStore.getState().pendingCameraTarget?.seq ?? 0;
    expect(s2).toBeGreaterThan(s1);
  });
  it("clearPendingCameraTarget nulls", () => {
    useUIStore.getState().requestCameraTarget([1, 2, 3], [0, 0, 0]);
    useUIStore.getState().clearPendingCameraTarget();
    expect(useUIStore.getState().pendingCameraTarget).toBeNull();
  });
});
