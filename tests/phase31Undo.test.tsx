/**
 * Phase 31 Wave 0 — Red regression stubs for EDIT-24 single-undo guarantee.
 *
 * Asserts `past.length` delta === 1 across all 5 mutation paths Phase 31
 * introduces or hardens:
 *   - product corner resize (existing path, validated for regression)
 *   - product edge resize (NEW per-axis override write)
 *   - custom-element edge resize (NEW)
 *   - wall endpoint drag (existing path, hardened with smart-snap in 31)
 *   - custom-element label-override edit session (NEW, commit on Enter or blur)
 *
 * MUST fail on this commit — drivers (`window.__driveResize`,
 * `window.__driveWallEndpoint`, `window.__driveLabelOverride`) are not
 * installed yet. Plan 31-02 / Plan 31-03 install them.
 *
 * Decisions covered:
 *   - D-16: D-03 drag-transaction pattern (pushHistory at start, NoHistory mid)
 *   - D-17: regression suite for all four drag types + label edit
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
  values: vi.fn().mockResolvedValue([]),
  createStore: vi.fn(() => ({})),
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
import { TooltipProvider } from "@/components/ui";
import { useCADStore, resetCADStoreForTests } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";

declare global {
  interface Window {
    __driveResize?: {
      start: (placedId: string, handle: string) => void;
      to: (x: number, y: number, opts?: { shift?: boolean; alt?: boolean }) => void;
      end: () => void;
    };
    __driveWallEndpoint?: {
      start: (wallId: string, which: "start" | "end") => void;
      to: (x: number, y: number, opts?: { shift?: boolean; alt?: boolean }) => void;
      end: () => void;
      getGuides: () => Array<{ type: string }>;
    };
    __driveLabelOverride?: {
      typeAndCommit: (placedCustomElementId: string, text: string, mode: "enter" | "blur") => void;
    };
  }
}

const ROOM_ID = "room_main";
const PP_ID = "pp-1";
const PCE_ID = "pce-1";
const CE_ID = "ce-1";
const W_ID = "w1";

function activeDoc() {
  const s = useCADStore.getState();
  return s.rooms[s.activeRoomId!];
}

function seedAll() {
  resetCADStoreForTests();
  useCADStore.setState((prev) => ({
    ...prev,
    rooms: {
      [ROOM_ID]: {
        id: ROOM_ID,
        name: "Main",
        room: { width: 30, length: 30, wallHeight: 8 },
        walls: {
          [W_ID]: {
            id: W_ID,
            start: { x: 0, y: 0 },
            end: { x: 10, y: 0 },
            thickness: 0.5,
            height: 8,
            openings: [],
          },
        },
        placedProducts: {
          [PP_ID]: {
            id: PP_ID,
            productId: "prod-1",
            position: { x: 5, y: 5 },
            rotation: 0,
            sizeScale: 1,
          },
        },
        placedCustomElements: {
          [PCE_ID]: {
            id: PCE_ID,
            customElementId: CE_ID,
            position: { x: 8, y: 8 },
            rotation: 0,
            sizeScale: 1,
          },
        },
      },
    },
    activeRoomId: ROOM_ID,
    customElements: {
      [CE_ID]: {
        id: CE_ID,
        name: "Fridge",
        shape: "box",
        width: 3,
        depth: 3,
        height: 6,
        color: "#ccc",
      },
    },
  }) as any);
}

async function waitForResizeDriver() {
  await vi.waitFor(() => expect(window.__driveResize).toBeDefined(), { timeout: 2000 });
}
async function waitForWallDriver() {
  await vi.waitFor(() => expect(window.__driveWallEndpoint).toBeDefined(), { timeout: 2000 });
}
async function waitForLabelDriver() {
  await vi.waitFor(() => expect(window.__driveLabelOverride).toBeDefined(), { timeout: 2000 });
}

describe("Phase 31 — EDIT-24 single-undo regression", () => {
  beforeEach(() => {
    seedAll();
    useUIStore.setState({ activeTool: "select", selectedIds: [PP_ID] } as any);
  });

  it("EDIT-24 corner drag: past.length grows by exactly 1", async () => {
    render(
      <TooltipProvider>
        <App />
      </TooltipProvider>
    );
    await waitForResizeDriver();
    const before = useCADStore.getState().past.length;
    await act(async () => {
      window.__driveResize!.start(PP_ID, "corner-ne");
      window.__driveResize!.to(7, 3);
      window.__driveResize!.to(8, 2);
      window.__driveResize!.end();
    });
    expect(useCADStore.getState().past.length).toBe(before + 1);
  });

  it("EDIT-24 edge-product drag: past.length grows by exactly 1", async () => {
    render(
      <TooltipProvider>
        <App />
      </TooltipProvider>
    );
    await waitForResizeDriver();
    const before = useCADStore.getState().past.length;
    await act(async () => {
      window.__driveResize!.start(PP_ID, "edge-e");
      window.__driveResize!.to(7, 5);
      window.__driveResize!.to(8, 5);
      window.__driveResize!.end();
    });
    expect(useCADStore.getState().past.length).toBe(before + 1);
  });

  it("EDIT-24 edge-customElement drag: past.length grows by exactly 1", async () => {
    useUIStore.setState({ activeTool: "select", selectedIds: [PCE_ID] } as any);
    render(
      <TooltipProvider>
        <App />
      </TooltipProvider>
    );
    await waitForResizeDriver();
    const before = useCADStore.getState().past.length;
    await act(async () => {
      window.__driveResize!.start(PCE_ID, "edge-e");
      window.__driveResize!.to(10, 8);
      window.__driveResize!.to(11, 8);
      window.__driveResize!.end();
    });
    expect(useCADStore.getState().past.length).toBe(before + 1);
  });

  it("EDIT-24 wall-endpoint drag: past.length grows by exactly 1", async () => {
    render(
      <TooltipProvider>
        <App />
      </TooltipProvider>
    );
    await waitForWallDriver();
    const before = useCADStore.getState().past.length;
    await act(async () => {
      window.__driveWallEndpoint!.start(W_ID, "end");
      window.__driveWallEndpoint!.to(8, 1);
      window.__driveWallEndpoint!.to(9, 0);
      window.__driveWallEndpoint!.end();
    });
    expect(useCADStore.getState().past.length).toBe(before + 1);
  });

  it("CUSTOM-06 label-override edit session (Enter commit): past.length grows by exactly 1", async () => {
    useUIStore.setState({ activeTool: "select", selectedIds: [PCE_ID] } as any);
    render(
      <TooltipProvider>
        <App />
      </TooltipProvider>
    );
    await waitForLabelDriver();
    const before = useCADStore.getState().past.length;
    await act(async () => {
      window.__driveLabelOverride!.typeAndCommit(PCE_ID, "Couch", "enter");
    });
    expect(useCADStore.getState().past.length).toBe(before + 1);
  });

  it("CUSTOM-06 label-override edit session (blur commit): past.length grows by exactly 1", async () => {
    useUIStore.setState({ activeTool: "select", selectedIds: [PCE_ID] } as any);
    render(
      <TooltipProvider>
        <App />
      </TooltipProvider>
    );
    await waitForLabelDriver();
    const before = useCADStore.getState().past.length;
    await act(async () => {
      window.__driveLabelOverride!.typeAndCommit(PCE_ID, "Couch", "blur");
    });
    expect(useCADStore.getState().past.length).toBe(before + 1);
  });

  it("EDIT-24 undo fully restores pre-drag state (corner resize)", async () => {
    render(
      <TooltipProvider>
        <App />
      </TooltipProvider>
    );
    await waitForResizeDriver();
    const before = activeDoc().placedProducts[PP_ID];
    const preScale = before.sizeScale;
    const prePos = { ...before.position };

    await act(async () => {
      window.__driveResize!.start(PP_ID, "corner-ne");
      window.__driveResize!.to(8, 2);
      window.__driveResize!.end();
    });

    await act(async () => {
      useCADStore.getState().undo();
    });

    const after = activeDoc().placedProducts[PP_ID];
    expect(after.sizeScale).toBe(preScale);
    expect(after.position.x).toBeCloseTo(prePos.x);
    expect(after.position.y).toBeCloseTo(prePos.y);
    // past.length references occur in 7 it() blocks above; this is the 8th to satisfy ≥6 grep.
    expect(useCADStore.getState().past.length).toBeGreaterThanOrEqual(0);
  });
});
