import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/lib/serialization", () => ({
  saveProject: vi.fn().mockResolvedValue(undefined),
}));

import { useAutoSave, DEBOUNCE_MS } from "@/hooks/useAutoSave";
import { useCADStore } from "@/stores/cadStore";
import { useProjectStore } from "@/stores/projectStore";
import { saveProject } from "@/lib/serialization";

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(saveProject).mockClear();
  useCADStore.setState({
    room: { width: 20, length: 16, wallHeight: 8 },
    walls: {},
    placedProducts: {},
    past: [],
    future: [],
  });
  useProjectStore.setState({ activeId: null, activeName: "Untitled Room", saveStatus: "idle" });
});
afterEach(() => { vi.useRealTimers(); });

describe("useAutoSave hook", () => {
  it("debounce: multiple rapid mutations collapse to a single saveProject call after 2s", async () => {
    renderHook(() => useAutoSave());
    // 5 mutations 100ms apart
    for (let i = 0; i < 5; i++) {
      useCADStore.getState().placeProduct(`prod_${i}`, { x: i, y: 0 });
      await vi.advanceTimersByTimeAsync(100);
    }
    // 500ms elapsed since t=0; last mutation was at t=400ms, so debounce fires at t=2400
    // Advance to just before fire (t=2399)
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 101);
    expect(saveProject).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2);
    // Allow pending promise to resolve
    await Promise.resolve();
    expect(saveProject).toHaveBeenCalledTimes(1);
  });

  it("auto-create: with no activeId, creates new proj_ id and sets name Untitled Room", async () => {
    renderHook(() => useAutoSave());
    expect(useProjectStore.getState().activeId).toBeNull();
    useCADStore.getState().placeProduct("prod_x", { x: 1, y: 1 });
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 10);
    await Promise.resolve();
    const id = useProjectStore.getState().activeId;
    expect(id).not.toBeNull();
    expect(id).toMatch(/^proj_/);
    expect(useProjectStore.getState().activeName).toBe("Untitled Room");
  });

  it("status transitions: idle -> saving -> saved -> idle", async () => {
    renderHook(() => useAutoSave());
    useCADStore.getState().placeProduct("prod_y", { x: 1, y: 1 });
    expect(useProjectStore.getState().saveStatus).toBe("idle");
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 10);
    // After timer fires but before await resolves, status is "saving" then "saved"
    await Promise.resolve();
    await Promise.resolve();
    expect(useProjectStore.getState().saveStatus).toBe("saved");
    await vi.advanceTimersByTimeAsync(2001);
    expect(useProjectStore.getState().saveStatus).toBe("idle");
  });
});
