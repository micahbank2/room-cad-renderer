/**
 * Phase 31 Wave 0 — Red integration stubs for wall-endpoint smart-snap drag,
 * exercised through the `window.__driveWallEndpoint` driver bridge. Closes
 * Phase 30 D-08b deferral.
 *
 * Driver contract (installed by selectTool.ts in Plan 31-02 / Plan 31-03 when
 * `import.meta.env.MODE === "test"`):
 *
 *   window.__driveWallEndpoint = {
 *     start(wallId, "start"|"end"): void,
 *     to(feetX, feetY, opts?: { shift?: boolean; alt?: boolean }): void,
 *     end(): void,
 *     getGuides(): Array<{ type: string }>,
 *   };
 *
 * MUST fail on this commit — bridge not installed yet.
 *
 * Decisions covered (.planning/phases/31-drag-resize-label-override/31-CONTEXT.md):
 *   - D-05: snap to other wall endpoints + midpoints, NEVER product bboxes
 *   - D-06: Shift-orthogonal locks the constrained axis; smart-snap can still
 *           apply on the FREE axis but must not break the lock
 *   - D-07: Alt disables smart-snap; grid-snap still applies
 *   - D-08: snap guides reuse Phase 30 accent-purple renderer
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, act } from "@testing-library/react";

vi.mock("@/hooks/useHelpRouteSync", () => ({ useHelpRouteSync: () => {} }));
vi.mock("@/three/ThreeViewport", () => ({ default: () => null }));
vi.mock("idb-keyval", () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/serialization", () => ({
  saveProject: vi.fn().mockResolvedValue(undefined),
  setLastProjectId: vi.fn().mockResolvedValue(undefined),
  getLastProjectId: vi.fn().mockResolvedValue(null),
  loadProject: vi.fn().mockResolvedValue(null),
  deleteProject: vi.fn().mockResolvedValue(undefined),
  listProjects: vi.fn().mockResolvedValue([]),
}));

import App from "@/App";
import { useCADStore, resetCADStoreForTests } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";

declare global {
  interface Window {
    __driveWallEndpoint?: {
      start: (wallId: string, which: "start" | "end") => void;
      to: (feetX: number, feetY: number, opts?: { shift?: boolean; alt?: boolean }) => void;
      end: () => void;
      getGuides: () => Array<{ type: string }>;
    };
  }
}

const ROOM_ID = "room_main";

function activeDoc() {
  const s = useCADStore.getState();
  return s.rooms[s.activeRoomId!];
}

function seedTwoWalls(opts: { withProductAt?: { x: number; y: number } } = {}) {
  resetCADStoreForTests();
  useCADStore.setState((prev) => ({
    ...prev,
    rooms: {
      [ROOM_ID]: {
        id: ROOM_ID,
        name: "Main",
        room: { width: 30, length: 30, wallHeight: 8 },
        walls: {
          w1: {
            id: "w1",
            start: { x: 0, y: 0 },
            end: { x: 10, y: 0 },
            thickness: 0.5,
            height: 8,
            openings: [],
          },
          w2: {
            id: "w2",
            start: { x: 15, y: 0 },
            end: { x: 15, y: 10 },
            thickness: 0.5,
            height: 8,
            openings: [],
          },
        },
        placedProducts: opts.withProductAt
          ? {
              "pp-1": {
                id: "pp-1",
                productId: "prod-1",
                position: opts.withProductAt,
                rotation: 0,
                sizeScale: 1,
              },
            }
          : {},
      },
    },
    activeRoomId: ROOM_ID,
  }) as any);
}

async function waitForDriver() {
  await vi.waitFor(() => expect(window.__driveWallEndpoint).toBeDefined(), { timeout: 2000 });
}

describe("Phase 31 — wall-endpoint smart-snap (EDIT-23)", () => {
  beforeEach(() => {
    seedTwoWalls();
    useUIStore.setState({ activeTool: "select" } as any);
  });

  it("D-05 snap to other wall endpoint within tolerance", async () => {
    render(<App />);
    await waitForDriver();
    await act(async () => {
      window.__driveWallEndpoint!.start("w1", "end");
      window.__driveWallEndpoint!.to(14.9, 0.1);
      window.__driveWallEndpoint!.end();
    });
    const w1 = activeDoc().walls.w1;
    expect(w1.end.x).toBeCloseTo(15, 1);
    expect(w1.end.y).toBeCloseTo(0, 1);
  });

  it("D-05 snap to wall midpoint (w2 midpoint at (15,5))", async () => {
    render(<App />);
    await waitForDriver();
    await act(async () => {
      window.__driveWallEndpoint!.start("w1", "end");
      window.__driveWallEndpoint!.to(14.9, 4.9);
      window.__driveWallEndpoint!.end();
    });
    const w1 = activeDoc().walls.w1;
    expect(w1.end.x).toBeCloseTo(15, 1);
    expect(w1.end.y).toBeCloseTo(5, 1);
  });

  it("D-06 shift-orthogonal locks axis; horizontal wall stays horizontal", async () => {
    render(<App />);
    await waitForDriver();
    await act(async () => {
      window.__driveWallEndpoint!.start("w1", "end");
      window.__driveWallEndpoint!.to(12, 3, { shift: true });
      window.__driveWallEndpoint!.end();
    });
    const w1 = activeDoc().walls.w1;
    // Y must equal start.y (locked horizontal)
    expect(w1.end.y).toBe(w1.start.y);
  });

  it("D-07 alt disables smart-snap; grid-snap still applies", async () => {
    useUIStore.setState({ gridSnap: 1.0 } as any);
    render(<App />);
    await waitForDriver();
    let guideCount = -1;
    await act(async () => {
      window.__driveWallEndpoint!.start("w1", "end");
      window.__driveWallEndpoint!.to(14.9, 0.1, { alt: true });
      guideCount = window.__driveWallEndpoint!.getGuides().length;
      window.__driveWallEndpoint!.end();
    });
    const w1 = activeDoc().walls.w1;
    // Grid-snapped to 1.0
    expect(w1.end.x).toBe(15);
    expect(w1.end.y).toBe(0);
    // No snap guides when Alt held
    expect(guideCount).toBe(0);
  });

  it("D-05 negative: walls do NOT snap to product bboxes", async () => {
    seedTwoWalls({ withProductAt: { x: 14.8, y: 0.2 } });
    useUIStore.setState({ activeTool: "select", gridSnap: 0.5 } as any);
    render(<App />);
    await waitForDriver();
    await act(async () => {
      window.__driveWallEndpoint!.start("w1", "end");
      window.__driveWallEndpoint!.to(14.8, 0.2);
      window.__driveWallEndpoint!.end();
    });
    const w1 = activeDoc().walls.w1;
    // Endpoint should snap to wall w2 endpoint (15,0), NOT to product bbox edges
    // (a product-bbox snap would yield e.g. 13.8 = product center − half-width).
    // Either snapped to the wall endpoint OR fell back to grid — both acceptable;
    // snap to a product-derived target is NOT acceptable.
    const snappedToProduct = Math.abs(w1.end.x - 13.8) < 0.1 || Math.abs(w1.end.x - 15.8) < 0.1;
    expect(snappedToProduct).toBe(false);
  });

  it("guides clear after drag end", async () => {
    render(<App />);
    await waitForDriver();
    await act(async () => {
      window.__driveWallEndpoint!.start("w1", "end");
      window.__driveWallEndpoint!.to(14.9, 0.1);
      window.__driveWallEndpoint!.end();
    });
    expect(window.__driveWallEndpoint!.getGuides().length).toBe(0);
  });
});
