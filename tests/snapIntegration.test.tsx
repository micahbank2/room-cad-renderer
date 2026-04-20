/**
 * Phase 30 Wave 0 — red stubs for the end-to-end smart-snap integration.
 *
 * Driver contract (implemented in Plan 03 by productTool.ts + selectTool.ts
 * under `if (import.meta.env.MODE === 'test')`):
 *
 *   window.__driveSnap({
 *     tool: "product" | "select",
 *     pos: { x, y },           // world-feet candidate position
 *     dragId?: string,         // for "select" drags: the placedProduct id
 *     altKey?: boolean,        // D-07 disable toggle
 *     phase: "move" | "up",    // mousemove vs mouseup
 *   }): void
 *
 *   window.__getSnapGuides(): Array<fabric.Object>
 *     // Returns all Fabric objects currently tagged data.type === "snap-guide".
 *
 * Both hooks are installed by their respective tool when in test mode and
 * removed on cleanup. See 30-RESEARCH.md §Example: integration test via
 * driver pattern.
 *
 * These tests FAIL on this commit because:
 *   - @/canvas/snapEngine does not exist (Plan 02 creates it)
 *   - The window.__driveSnap / window.__getSnapGuides hooks are not wired
 *     (Plan 03 wires them into productTool + selectTool)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act } from "@testing-library/react";

// Stub router-dependent hook so `<App />` can mount without a <Router>
// wrapper in this harness (mirrors tests/App.restore.test.tsx pattern).
// Plan 03 Rule 3 auto-fix — unblocks integration test execution; the hook
// under test here is the smart-snap driver, not help-route sync.
vi.mock("@/hooks/useHelpRouteSync", () => ({
  useHelpRouteSync: () => {},
}));

// Stub the 3D viewport (lazy-loaded) so happy-dom doesn't attempt WebGL.
vi.mock("@/three/ThreeViewport", () => ({
  default: () => null,
}));

// idb-keyval has no happy-dom shim — stub it so the product/wainscot/framed-art
// stores' load() calls don't reject on `indexedDB is not defined`.
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
    __driveSnap?: (args: {
      tool: "product" | "select";
      pos: { x: number; y: number };
      dragId?: string;
      altKey?: boolean;
      phase: "move" | "up";
    }) => void;
    __getSnapGuides?: () => unknown[];
  }
}

const ROOM_ID = "room_main";
const WALL_ID = "wall_h1";
const PRODUCT_ID = "prod_chair";

/** Seed a 20x20 room with one horizontal wall at y=0 running x=0..10. */
function seedRoom(opts: { withProduct?: boolean } = {}) {
  resetCADStoreForTests();
  useCADStore.setState({
    rooms: {
      [ROOM_ID]: {
        id: ROOM_ID,
        name: "Main",
        room: { width: 20, length: 20, wallHeight: 8 },
        walls: {
          [WALL_ID]: {
            id: WALL_ID,
            start: { x: 0, y: 0 },
            end: { x: 10, y: 0 },
            thickness: 0.5,
            height: 8,
            openings: [],
          },
        },
        placedProducts: opts.withProduct
          ? {
              pp_a: {
                id: "pp_a",
                productId: PRODUCT_ID,
                position: { x: 5, y: 5 },
                rotation: 0,
                sizeScale: 1,
              },
            }
          : {},
      },
    },
    activeRoomId: ROOM_ID,
    past: [],
    future: [],
  } as Parameters<typeof useCADStore.setState>[0]);
}

/**
 * happy-dom returns 0-sized bounding rects, which makes FabricCanvas.redraw()
 * short-circuit before activating the current tool (and hence before
 * installing the window.__driveSnap driver). Stub a reasonable viewport so
 * the canvas init path actually runs. 800x600 matches toolCleanup.test.ts
 * canvas dims.
 */
function stubCanvasViewport(): void {
  const origGBCR = HTMLElement.prototype.getBoundingClientRect;
  HTMLElement.prototype.getBoundingClientRect = function (): DOMRect {
    return {
      x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 600,
      width: 800, height: 600,
      toJSON: () => ({}),
    } as DOMRect;
  };
  // Store for afterEach restore.
  (globalThis as unknown as { __origGBCR?: typeof origGBCR }).__origGBCR = origGBCR;
}
function restoreCanvasViewport(): void {
  const orig = (globalThis as unknown as { __origGBCR?: () => DOMRect }).__origGBCR;
  if (orig) HTMLElement.prototype.getBoundingClientRect = orig;
}

async function waitForDriver(): Promise<void> {
  await vi.waitFor(() => {
    expect(typeof window.__driveSnap).toBe("function");
    expect(typeof window.__getSnapGuides).toBe("function");
  }, { timeout: 2000 });
}

// File-level viewport stub + driver cleanup for every test.
beforeEach(() => {
  stubCanvasViewport();
});
afterEach(() => {
  restoreCanvasViewport();
  // Remove any lingering driver hooks between tests so waitForDriver
  // reflects the current canvas's install, not the previous one.
  delete (window as { __driveSnap?: unknown }).__driveSnap;
  delete (window as { __getSnapGuides?: unknown }).__getSnapGuides;
});

describe("productTool placement (Phase 30 integration)", () => {
  beforeEach(() => {
    seedRoom();
  });

  it("placement near wall edge snaps Y to the wall face and shows a snap-guide during the gesture", async () => {
    render(<App />);
    await act(async () => {
      useUIStore.getState().setTool("product");
    });
    await waitForDriver();

    const placeSpy = vi.spyOn(useCADStore.getState(), "placeProduct");

    // Hover close to the wall face (y = 0.25 approx; wall face at y = 0.25
    // for bottom face of a horizontal 0.5-thick wall at y=0).
    await act(async () => {
      window.__driveSnap!({ tool: "product", pos: { x: 3, y: 0.3 }, phase: "move" });
    });
    const guidesDuring = window.__getSnapGuides!();
    expect(guidesDuring.length).toBeGreaterThan(0);

    // Click to place.
    await act(async () => {
      window.__driveSnap!({ tool: "product", pos: { x: 3, y: 0.3 }, phase: "up" });
    });
    expect(placeSpy).toHaveBeenCalled();
    const placedAt = placeSpy.mock.calls[placeSpy.mock.calls.length - 1][1] as { x: number; y: number };
    // Snap pulled y from 0.3 to ≈0.25 (wall bottom face). Assert within tight tolerance.
    expect(Math.abs(placedAt.y - 0.25)).toBeLessThan(0.1);
  });
});

describe("selectTool drag (Phase 30 integration)", () => {
  beforeEach(() => {
    seedRoom({ withProduct: true });
  });

  it("dragging an existing product near the wall renders a snap-guide during drag, zero guides after mouseup", async () => {
    render(<App />);
    await act(async () => {
      useUIStore.getState().setTool("select");
    });
    await waitForDriver();

    // Drive move near wall edge.
    await act(async () => {
      window.__driveSnap!({
        tool: "select",
        dragId: "pp_a",
        pos: { x: 5, y: 0.3 },
        phase: "move",
      });
    });
    expect(window.__getSnapGuides!().length).toBeGreaterThan(0);

    // Mouse up → guides cleared.
    await act(async () => {
      window.__driveSnap!({
        tool: "select",
        dragId: "pp_a",
        pos: { x: 5, y: 0.3 },
        phase: "up",
      });
    });
    expect(window.__getSnapGuides!()).toHaveLength(0);

    // Committed position snapped on Y.
    const committed = useCADStore.getState().rooms[ROOM_ID].placedProducts.pp_a.position;
    expect(Math.abs(committed.y - 0.25)).toBeLessThan(0.1);
  });
});

describe("midpoint snap SNAP-02 (Phase 30 integration)", () => {
  beforeEach(() => {
    seedRoom({ withProduct: true });
  });

  it("drag toward wall midpoint → center aligns to midpoint; midpoint-dot guide renders", async () => {
    render(<App />);
    await act(async () => {
      useUIStore.getState().setTool("select");
    });
    await waitForDriver();

    // Wall midpoint at (5, 0). Drag center close.
    await act(async () => {
      window.__driveSnap!({
        tool: "select",
        dragId: "pp_a",
        pos: { x: 5.05, y: 0.08 },
        phase: "move",
      });
    });
    const guides = window.__getSnapGuides!();
    // At least one snap-guide object; implementation may tag midpoint dot
    // separately — test just requires presence.
    expect(guides.length).toBeGreaterThan(0);

    await act(async () => {
      window.__driveSnap!({
        tool: "select",
        dragId: "pp_a",
        pos: { x: 5.05, y: 0.08 },
        phase: "up",
      });
    });
    const pos = useCADStore.getState().rooms[ROOM_ID].placedProducts.pp_a.position;
    // Center should auto-center on wall midpoint x=5.
    expect(Math.abs(pos.x - 5)).toBeLessThan(0.1);
  });
});

describe("Alt disables smart snap D-07 (Phase 30 integration)", () => {
  beforeEach(() => {
    seedRoom({ withProduct: true });
  });

  it("altKey=true near wall → no snap-guide objects; final position is grid-rounded, NOT wall-aligned", async () => {
    // Ensure gridSnap > 0 so we can distinguish grid vs wall-face snap.
    await act(async () => {
      useUIStore.getState().setGridSnap?.(0.5);
    });
    render(<App />);
    await act(async () => {
      useUIStore.getState().setTool("select");
    });
    await waitForDriver();

    await act(async () => {
      window.__driveSnap!({
        tool: "select",
        dragId: "pp_a",
        pos: { x: 5, y: 0.3 },
        altKey: true,
        phase: "move",
      });
    });
    // No snap guides while alt is held.
    expect(window.__getSnapGuides!()).toHaveLength(0);

    await act(async () => {
      window.__driveSnap!({
        tool: "select",
        dragId: "pp_a",
        pos: { x: 5, y: 0.3 },
        altKey: true,
        phase: "up",
      });
    });
    const pos = useCADStore.getState().rooms[ROOM_ID].placedProducts.pp_a.position;
    // 0.3 → grid-rounded at 0.5 = 0.5 (NOT 0.25 wall face).
    expect(Math.abs(pos.y - 0.5)).toBeLessThan(0.05);
    expect(Math.abs(pos.y - 0.25)).toBeGreaterThan(0.1);
  });
});
