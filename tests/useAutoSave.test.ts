import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/lib/serialization", () => ({
  saveProject: vi.fn().mockResolvedValue(undefined),
}));

import { useAutoSave, DEBOUNCE_MS, FADE_MS } from "@/hooks/useAutoSave";
import { useCADStore, resetCADStoreForTests } from "@/stores/cadStore";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";
import { saveProject } from "@/lib/serialization";

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(saveProject).mockClear();
  vi.mocked(saveProject).mockResolvedValue(undefined);
  resetCADStoreForTests();
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

  // ─────────────────────────────────────────────────────────────────────
  // Phase 28 stubs — SAVE-05 / SAVE-06 hardening
  // These tests describe behavior that Plans 02 / 03 will implement.
  // Expected initial state: several FAIL (red) — that's correct TDD.
  // ─────────────────────────────────────────────────────────────────────

  it("rename triggers save when activeId is non-null", async () => {
    // D-05: renaming an already-saved project auto-saves the new name
    renderHook(() => useAutoSave());
    useProjectStore.getState().setActive("proj_existing", "A");
    await vi.advanceTimersByTimeAsync(10);
    // Baseline: setActive alone should NOT fire a save (no edit yet)
    // Now rename
    useProjectStore.getState().setActiveName("B");
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 10);
    await Promise.resolve();
    await Promise.resolve();
    expect(saveProject).toHaveBeenCalled();
    // Last call should be with the renamed value
    const calls = vi.mocked(saveProject).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[1]).toBe("B");
  });

  it("ui-store mutations do not trigger save", async () => {
    // D-05b: tool/selection/grid changes are session state — not scene data
    renderHook(() => useAutoSave());
    useUIStore.getState().setTool("wall");
    useUIStore.getState().toggleGrid();
    useUIStore.getState().setGridSnap(1);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 1000);
    await Promise.resolve();
    expect(saveProject).not.toHaveBeenCalled();
  });

  it("save failure sets saveStatus to failed", async () => {
    // D-04: on saveProject rejection, saveStatus flips to "failed"
    vi.mocked(saveProject).mockRejectedValueOnce(new Error("QuotaExceededError"));
    renderHook(() => useAutoSave());
    useCADStore.getState().placeProduct("prod_fail", { x: 1, y: 1 });
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 10);
    // Flush rejection microtasks
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    // Cast: "failed" is not yet in SaveStatus union — Plan 02 extends it
    expect(useProjectStore.getState().saveStatus).toBe("failed" as any);
  });

  it("failed status does not auto-fade", async () => {
    // D-04a: SAVE_FAILED persists until the next successful save
    vi.mocked(saveProject).mockRejectedValueOnce(new Error("QuotaExceededError"));
    renderHook(() => useAutoSave());
    useCADStore.getState().placeProduct("prod_fail2", { x: 1, y: 1 });
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 10);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    // Advance far past FADE_MS
    await vi.advanceTimersByTimeAsync(FADE_MS + 3000);
    await Promise.resolve();
    expect(useProjectStore.getState().saveStatus).toBe("failed" as any);
  });

  it("subsequent successful save clears failed", async () => {
    // D-04a: after failure, the next successful save transitions failed -> saved -> idle
    vi.mocked(saveProject).mockRejectedValueOnce(new Error("QuotaExceededError"));
    renderHook(() => useAutoSave());
    useCADStore.getState().placeProduct("prod_fail3", { x: 1, y: 1 });
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 10);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(useProjectStore.getState().saveStatus).toBe("failed" as any);
    // Next save resolves
    vi.mocked(saveProject).mockResolvedValueOnce(undefined);
    useCADStore.getState().placeProduct("prod_ok", { x: 2, y: 2 });
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 10);
    await Promise.resolve();
    await Promise.resolve();
    expect(useProjectStore.getState().saveStatus).toBe("saved");
    await vi.advanceTimersByTimeAsync(FADE_MS + 10);
    expect(useProjectStore.getState().saveStatus).toBe("idle");
  });

  it("drag produces exactly one save at drag-end", async () => {
    // SAVE-05: rapid mutation burst (simulated drag) collapses to 1 save
    renderHook(() => useAutoSave());
    // Simulate a drag — 50 rapid mutations within the debounce window
    for (let i = 0; i < 50; i++) {
      useCADStore.getState().placeProduct(`drag_${i}`, { x: i, y: 0 });
      await vi.advanceTimersByTimeAsync(10); // 10ms between frames
    }
    // 500ms elapsed mid-burst; debounce timer was reset on each call
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 10);
    await Promise.resolve();
    await Promise.resolve();
    expect(vi.mocked(saveProject).mock.calls.length).toBe(1);
  });
});
