/**
 * Phase 31 Wave 0 — Red integration stubs for product resize drag (corner +
 * edge handles), exercised through the `window.__driveResize` driver bridge.
 *
 * Driver contract (installed by selectTool.ts in Plan 31-02 / Plan 31-03 when
 * `import.meta.env.MODE === "test"`):
 *
 *   window.__driveResize = {
 *     start(placedId, "corner-ne"|"corner-nw"|"corner-sw"|"corner-se"
 *                    |"edge-n"|"edge-s"|"edge-e"|"edge-w"): void,
 *     to(feetX, feetY, opts?: { shift?: boolean; alt?: boolean }): void,
 *     end(): void,
 *   };
 *
 * MUST fail on this commit — the bridge is not installed yet.
 *
 * Decisions covered (.planning/phases/31-drag-resize-label-override/31-CONTEXT.md):
 *   - D-01 / D-03: corner→sizeScale, edge→one-axis override
 *   - EDIT-22 grid-snap clause: edge values rounded to uiStore.gridSnap
 *   - D-02 reset: clearProductOverrides reverts to sizeScale-driven uniform
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, act } from "@testing-library/react";

// Stub router-dependent hook so <App /> can mount (mirrors snapIntegration.test.tsx).
vi.mock("@/hooks/useHelpRouteSync", () => ({ useHelpRouteSync: () => {} }));
// Stub the 3D viewport — happy-dom has no WebGL.
vi.mock("@/three/ThreeViewport", () => ({ default: () => null }));
// Stub idb-keyval + serialization (no IndexedDB in happy-dom).
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
    __driveResize?: {
      start: (
        placedId: string,
        handle:
          | "corner-ne"
          | "corner-nw"
          | "corner-sw"
          | "corner-se"
          | "edge-n"
          | "edge-s"
          | "edge-e"
          | "edge-w",
      ) => void;
      to: (feetX: number, feetY: number, opts?: { shift?: boolean; alt?: boolean }) => void;
      end: () => void;
    };
  }
}

const ROOM_ID = "room_main";
const PP_ID = "pp-1";
const PROD_ID = "prod-1";

function activeDoc() {
  const s = useCADStore.getState();
  return s.rooms[s.activeRoomId!];
}

function seedRoomWithProduct() {
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
      },
    },
    activeRoomId: ROOM_ID,
  }) as any);
}

async function waitForDriver() {
  // Driver is installed by selectTool.activate() under test-mode guard.
  await vi.waitFor(() => expect(window.__driveResize).toBeDefined(), { timeout: 2000 });
}

describe("Phase 31 — product resize drag (EDIT-22)", () => {
  beforeEach(() => {
    seedRoomWithProduct();
    useUIStore.setState({ activeTool: "select", selectedIds: [PP_ID] } as any);
  });

  it("corner drag writes sizeScale (corner path unchanged)", async () => {
    render(<App />);
    await waitForDriver();
    await act(async () => {
      window.__driveResize!.start(PP_ID, "corner-ne");
      window.__driveResize!.to(8, 2);
      window.__driveResize!.end();
    });
    const pp = activeDoc().placedProducts[PP_ID];
    expect(pp.sizeScale).not.toBe(1); // corner mutated sizeScale
    expect(pp.widthFtOverride).toBeUndefined();
    expect(pp.depthFtOverride).toBeUndefined();
  });

  it("edge-e drag writes widthFtOverride (NEW per-axis path)", async () => {
    render(<App />);
    await waitForDriver();
    const beforeScale = activeDoc().placedProducts[PP_ID].sizeScale;
    await act(async () => {
      window.__driveResize!.start(PP_ID, "edge-e");
      window.__driveResize!.to(8, 5); // 3ft east of center → width = 6ft
      window.__driveResize!.end();
    });
    const pp = activeDoc().placedProducts[PP_ID];
    expect(pp.widthFtOverride).toBeDefined();
    expect(pp.widthFtOverride!).toBeGreaterThan(0);
    expect(pp.depthFtOverride).toBeUndefined();
    expect(pp.sizeScale).toBe(beforeScale);
  });

  it("edge-n drag writes depthFtOverride (n/s axis)", async () => {
    render(<App />);
    await waitForDriver();
    await act(async () => {
      window.__driveResize!.start(PP_ID, "edge-n");
      window.__driveResize!.to(5, 1);
      window.__driveResize!.end();
    });
    const pp = activeDoc().placedProducts[PP_ID];
    expect(pp.depthFtOverride).toBeDefined();
    expect(pp.depthFtOverride!).toBeGreaterThan(0);
    expect(pp.widthFtOverride).toBeUndefined();
  });

  it("EDIT-22 grid-snap: edge drag value rounded to uiStore.gridSnap", async () => {
    useUIStore.setState({ gridSnap: 1.0 } as any);
    render(<App />);
    await waitForDriver();
    await act(async () => {
      window.__driveResize!.start(PP_ID, "edge-e");
      window.__driveResize!.to(8.3, 5); // raw width ≈ 6.6ft → snap to 7
      window.__driveResize!.end();
    });
    const pp = activeDoc().placedProducts[PP_ID];
    expect(pp.widthFtOverride).toBeDefined();
    expect(Math.round(pp.widthFtOverride!)).toBe(pp.widthFtOverride!);
  });

  it("D-02 reset: clearProductOverrides reverts widthFtOverride/depthFtOverride to undefined", async () => {
    render(<App />);
    await waitForDriver();
    await act(async () => {
      window.__driveResize!.start(PP_ID, "edge-e");
      window.__driveResize!.to(8, 5);
      window.__driveResize!.end();
    });
    const beforeScale = activeDoc().placedProducts[PP_ID].sizeScale;

    useCADStore.getState().clearProductOverrides(PP_ID);

    const pp = activeDoc().placedProducts[PP_ID];
    expect(pp.widthFtOverride).toBeUndefined();
    expect(pp.depthFtOverride).toBeUndefined();
    expect(pp.sizeScale).toBe(beforeScale);
  });

  it("edge-w drag also writes widthFtOverride (mirror axis)", async () => {
    render(<App />);
    await waitForDriver();
    await act(async () => {
      window.__driveResize!.start(PP_ID, "edge-w");
      window.__driveResize!.to(2, 5);
      window.__driveResize!.end();
    });
    const pp = activeDoc().placedProducts[PP_ID];
    expect(pp.widthFtOverride).toBeDefined();
    expect(pp.depthFtOverride).toBeUndefined();
  });
});
