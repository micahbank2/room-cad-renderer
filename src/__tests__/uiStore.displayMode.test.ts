import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const LS_KEY = "gsd:displayMode";

// Helper to reload uiStore module fresh so the lazy initializer re-reads localStorage.
async function freshStore() {
  vi.resetModules();
  return (await import("@/stores/uiStore")).useUIStore;
}

describe("uiStore — Phase 47 displayMode (D-02, D-05)", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it("defaults to 'normal' when localStorage is empty", async () => {
    const useUIStore = await freshStore();
    expect(useUIStore.getState().displayMode).toBe("normal");
  });

  it("setDisplayMode('solo') updates store", async () => {
    const useUIStore = await freshStore();
    useUIStore.getState().setDisplayMode("solo");
    expect(useUIStore.getState().displayMode).toBe("solo");
  });

  it("setDisplayMode writes to localStorage 'gsd:displayMode' (D-05)", async () => {
    const useUIStore = await freshStore();
    useUIStore.getState().setDisplayMode("explode");
    expect(localStorage.getItem(LS_KEY)).toBe("explode");
  });

  it("hydrates 'explode' from localStorage on store creation (D-05)", async () => {
    localStorage.setItem(LS_KEY, "explode");
    const useUIStore = await freshStore();
    expect(useUIStore.getState().displayMode).toBe("explode");
  });

  it("hydrates 'solo' from localStorage on store creation (D-05)", async () => {
    localStorage.setItem(LS_KEY, "solo");
    const useUIStore = await freshStore();
    expect(useUIStore.getState().displayMode).toBe("solo");
  });

  it("garbage localStorage value falls back to 'normal' (D-05 unparseable case)", async () => {
    localStorage.setItem(LS_KEY, "BLAHBLAH");
    const useUIStore = await freshStore();
    expect(useUIStore.getState().displayMode).toBe("normal");
  });

  it("missing key returns 'normal' default", async () => {
    const useUIStore = await freshStore();
    expect(useUIStore.getState().displayMode).toBe("normal");
  });

  it("setDisplayMode is view-state — does NOT mutate cadStore (D-02 guarantee)", async () => {
    const useUIStore = await freshStore();
    const { useCADStore } = await import("@/stores/cadStore");
    const before = useCADStore.getState();
    useUIStore.getState().setDisplayMode("solo");
    const after = useCADStore.getState();
    expect(after.rooms).toBe(before.rooms);
    expect(after.activeRoomId).toBe(before.activeRoomId);
  });
});
