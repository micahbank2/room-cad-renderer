import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";

// ─────────────────────────────────────────────────────────────────────
// Phase 28 — Plan 01 Task 3: Silent-restore stubs for SAVE-05 / D-02
//
// These tests describe behavior that Plan 03 will implement:
//   - On mount, read the "room-cad-last-project" pointer from idb-keyval.
//   - If present AND loadProject() returns a project, skip WelcomeScreen.
//   - Otherwise (no pointer, stale pointer, throw), fall through to
//     WelcomeScreen.
//
// Expected initial state: tests FAIL (red) — the current App.tsx line
// 64-74 hydration uses listProjects() (most-recent-saved) and does NOT
// set hasStarted, so WelcomeScreen still renders.
// ─────────────────────────────────────────────────────────────────────

// Mock idb-keyval so we can control the last-project pointer per test.
vi.mock("idb-keyval", () => ({
  get: vi.fn(),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
}));

// Mock serialization to stub loadProject / listProjects / getLastProjectId.
// getLastProjectId delegates to the idb-keyval `get` mock so individual
// tests can control the pointer value per-case via vi.mocked(get).
vi.mock("@/lib/serialization", async () => {
  const idb = await import("idb-keyval");
  return {
    saveProject: vi.fn().mockResolvedValue(undefined),
    setLastProjectId: vi.fn().mockResolvedValue(undefined),
    getLastProjectId: vi.fn(async () => {
      const id = await idb.get("room-cad-last-project");
      return id ?? null;
    }),
    loadProject: vi.fn(),
    deleteProject: vi.fn().mockResolvedValue(undefined),
    listProjects: vi.fn().mockResolvedValue([]),
  };
});

// Stub the 3D viewport (lazy-loaded) so happy-dom doesn't explode on WebGL.
vi.mock("@/three/ThreeViewport", () => ({
  default: () => null,
}));

// useHelpRouteSync uses react-router hooks; stub to keep tests router-free.
vi.mock("@/hooks/useHelpRouteSync", () => ({
  useHelpRouteSync: () => {},
}));

// Stub stores that perform idb-keyval loads we don't care about here.
vi.mock("@/stores/productStore", () => ({
  useProductStore: Object.assign(
    (selector: (s: unknown) => unknown) => selector({
      products: [],
      addProduct: () => {},
      removeProduct: () => {},
    }),
    { getState: () => ({ load: vi.fn(), products: [], addProduct: () => {}, removeProduct: () => {} }) },
  ),
}));
vi.mock("@/stores/framedArtStore", () => ({
  useFramedArtStore: Object.assign(
    (selector: (s: unknown) => unknown) => selector({ items: [] }),
    { getState: () => ({ load: vi.fn(), items: [] }) },
  ),
}));
vi.mock("@/stores/wainscotStyleStore", () => ({
  useWainscotStyleStore: Object.assign(
    (selector: (s: unknown) => unknown) => selector({ styles: [] }),
    { getState: () => ({ load: vi.fn(), styles: [] }) },
  ),
}));

import { get } from "idb-keyval";
import { loadProject } from "@/lib/serialization";
import { resetCADStoreForTests } from "@/stores/cadStore";
import { useProjectStore } from "@/stores/projectStore";

function fakeSnapshot() {
  return {
    version: 2,
    activeRoomId: "room_main",
    rooms: {
      room_main: {
        id: "room_main",
        name: "Main Room",
        room: { width: 20, length: 16, wallHeight: 8 },
        walls: {
          wall_x: {
            id: "wall_x",
            start: { x: 0, y: 0 },
            end: { x: 10, y: 0 },
            thickness: 0.5,
            height: 8,
            openings: [],
          },
        },
        placedProducts: {},
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  resetCADStoreForTests();
  useProjectStore.setState({
    activeId: null,
    activeName: "Untitled Room",
    saveStatus: "idle",
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("App silent restore (D-02, D-02a, D-02b)", () => {
  it("silent restore: valid pointer loads project and skips WelcomeScreen (room-cad-last-project)", async () => {
    vi.mocked(get).mockResolvedValueOnce("proj_abc");
    vi.mocked(loadProject).mockResolvedValueOnce({
      id: "proj_abc",
      name: "Living Room",
      updatedAt: Date.now(),
      snapshot: fakeSnapshot() as any,
    });

    const AppModule = await import("@/App");
    const App = AppModule.default;
    render(<App />);

    // WelcomeScreen must NOT be visible after silent restore lands.
    await waitFor(() => {
      expect(screen.queryByText("DESIGN YOUR SPACE")).not.toBeInTheDocument();
    });
    // The active project should be set to the restored id.
    expect(useProjectStore.getState().activeId).toBe("proj_abc");
  });

  it("no pointer: falls through to WelcomeScreen", async () => {
    vi.mocked(get).mockResolvedValueOnce(undefined);

    const AppModule = await import("@/App");
    const App = AppModule.default;
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("DESIGN YOUR SPACE")).toBeInTheDocument();
    });
    expect(useProjectStore.getState().activeId).toBeNull();
  });

  it("stale pointer: loadProject returns null — falls through to WelcomeScreen", async () => {
    vi.mocked(get).mockResolvedValueOnce("proj_stale");
    vi.mocked(loadProject).mockResolvedValueOnce(null);

    const AppModule = await import("@/App");
    const App = AppModule.default;
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("DESIGN YOUR SPACE")).toBeInTheDocument();
    });
    expect(useProjectStore.getState().activeId).toBeNull();
    // D-02b: loadProject must be called with the pointer id (Plan 03 implements
    // pointer-based restore; current App uses listProjects(), so this fails
    // until Plan 03 ships).
    expect(vi.mocked(loadProject)).toHaveBeenCalledWith("proj_stale");
  });

  it("loadProject throws: falls through to WelcomeScreen without unhandled rejection", async () => {
    vi.mocked(get).mockResolvedValueOnce("proj_x");
    vi.mocked(loadProject).mockRejectedValueOnce(new Error("QuotaExceededError"));

    const unhandled: unknown[] = [];
    const handler = (ev: PromiseRejectionEvent) => {
      unhandled.push(ev.reason);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("unhandledrejection", handler);
    }

    const AppModule = await import("@/App");
    const App = AppModule.default;
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("DESIGN YOUR SPACE")).toBeInTheDocument();
    });

    if (typeof window !== "undefined") {
      window.removeEventListener("unhandledrejection", handler);
    }
    expect(unhandled.length).toBe(0);
  });
});
