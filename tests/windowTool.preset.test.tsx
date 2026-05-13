/**
 * Phase 79 Wave 0 — RED integration tests for window-preset bridge + PropertiesPanel row.
 *
 * MUST fail on this commit — the bridge / driver / PropertiesPanel preset row
 * are not yet implemented. Wave 1 wires the bridge in `windowTool.ts`, Wave 2
 * adds the PropertiesPanel preset row.
 *
 * Driver contract (installed by windowTool.ts in Wave 1 when
 * `import.meta.env.MODE === "test"`):
 *
 *   window.__driveWindowPreset = (
 *     idOrCustom: "small" | "standard" | "wide" | "picture" | "bathroom"
 *               | { width: number; height: number; sillHeight: number }
 *   ) => void;
 *
 * Public-API bridge (also Wave 1):
 *   setCurrentWindowPreset(p) / getCurrentWindowPreset() in @/canvas/tools/windowTool
 *
 * Decisions covered (.planning/phases/79-window-presets-win-presets-01-v1-20-active):
 *   - D-02 / D-04: switcher chip change writes bridge live
 *   - D-05: Custom flow accepts arbitrary W/H/Sill
 *   - D-07 / D-08: PropertiesPanel derives label on read; manual edit re-derives
 *   - D-09: existing updateOpening action used for preset switching (single undo)
 *
 * Total: 7 it() blocks.
 *
 * Mirror: tests/phase31Resize.test.tsx (vitest + happy-dom + <App /> harness).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, act, screen } from "@testing-library/react";

// Stub router-dependent hook so <App /> can mount.
vi.mock("@/hooks/useHelpRouteSync", () => ({ useHelpRouteSync: () => {} }));
// Stub the 3D viewport — happy-dom has no WebGL.
vi.mock("@/three/ThreeViewport", () => ({ default: () => null }));
// Stub idb-keyval + serialization (no IndexedDB in happy-dom).
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
// These imports MUST resolve to fail at runtime (no module) — RED state.
// @ts-expect-error Wave 1 will create this module.
import {
  setCurrentWindowPreset,
  getCurrentWindowPreset,
} from "@/canvas/tools/windowTool";
// PropertiesPanel will gain a preset row in Wave 2. Import for tests below.
// Phase 79-03 Wave 3 [Rule 3 - blocking]: PropertiesPanel exports `default`,
// not a named export. The RED test as written imports `{ PropertiesPanel }`
// and renders `undefined`, blocking all 4 WIN-02 assertions before they can
// inspect the DOM. Switched to the canonical default import to unblock.
import PropertiesPanel from "@/components/PropertiesPanel";

declare global {
  interface Window {
    __driveWindowPreset?: (
      idOrCustom:
        | "small"
        | "standard"
        | "wide"
        | "picture"
        | "bathroom"
        | { width: number; height: number; sillHeight: number }
    ) => void;
  }
}

const ROOM_ID = "room_main";
const WALL_ID = "wall_w1";

function activeDoc() {
  const s = useCADStore.getState();
  return s.rooms[s.activeRoomId!];
}

function seedRoomWithWall() {
  resetCADStoreForTests();
  useCADStore.setState((prev) => ({
    ...prev,
    rooms: {
      [ROOM_ID]: {
        id: ROOM_ID,
        name: "Main",
        room: { width: 20, length: 20, wallHeight: 8 },
        walls: {
          [WALL_ID]: {
            id: WALL_ID,
            start: { x: 0, y: 5 },
            end: { x: 20, y: 5 },
            thickness: 0.5,
            height: 8,
            openings: [],
          },
        },
        placedProducts: {},
      },
    },
    activeRoomId: ROOM_ID,
  }) as any);
}

async function waitForDriver() {
  await vi.waitFor(
    () => expect(window.__driveWindowPreset).toBeDefined(),
    { timeout: 2000 }
  );
}

describe("Phase 79 — window-preset bridge (WIN-01)", () => {
  beforeEach(() => {
    seedRoomWithWall();
    useUIStore.setState({ activeTool: "window", selectedIds: [] } as any);
  });

  it("__driveWindowPreset('wide') writes bridge to {4,5,3}", async () => {
    render(
      <TooltipProvider>
        <App />
      </TooltipProvider>
    );
    await waitForDriver();
    act(() => {
      window.__driveWindowPreset!("wide");
    });
    const bridge = getCurrentWindowPreset();
    expect(bridge.width).toBe(4);
    expect(bridge.height).toBe(5);
    expect(bridge.sillHeight).toBe(3);
  });

  it("after __driveWindowPreset('picture'), addOpening uses 6/4/1 (not 3/4/3 default)", async () => {
    render(
      <TooltipProvider>
        <App />
      </TooltipProvider>
    );
    await waitForDriver();
    act(() => {
      window.__driveWindowPreset!("picture");
    });
    // Simulate the tool's onMouseDown body — it should read the bridge.
    act(() => {
      const p = getCurrentWindowPreset();
      useCADStore.getState().addOpening(WALL_ID, {
        type: "window",
        offset: 5,
        width: p.width,
        height: p.height,
        sillHeight: p.sillHeight,
      });
    });
    const op = activeDoc().walls[WALL_ID].openings[0];
    expect(op.width).toBe(6);
    expect(op.height).toBe(4);
    expect(op.sillHeight).toBe(1);
  });

  it("__driveWindowPreset accepts a custom {W,H,Sill} object", async () => {
    render(
      <TooltipProvider>
        <App />
      </TooltipProvider>
    );
    await waitForDriver();
    act(() => {
      window.__driveWindowPreset!({ width: 5.5, height: 3.5, sillHeight: 2 });
    });
    const bridge = getCurrentWindowPreset();
    expect(bridge.width).toBe(5.5);
    expect(bridge.height).toBe(3.5);
    expect(bridge.sillHeight).toBe(2);
  });
});

describe("Phase 79 — PropertiesPanel preset row (WIN-02)", () => {
  beforeEach(() => {
    seedRoomWithWall();
    // Seed an opening to inspect the panel.
    useCADStore.getState().addOpening(WALL_ID, {
      type: "window",
      offset: 5,
      width: 3,
      height: 4,
      sillHeight: 3,
    });
    useUIStore.setState({
      activeTool: "select",
      selectedIds: [WALL_ID],
    } as any);
    // Clear bridge so it doesn't bleed across tests.
    setCurrentWindowPreset({ width: 3, height: 4, sillHeight: 3 });
  });

  it("renders 'Preset: Standard' for an Opening with 3/4/3", () => {
    render(
      <TooltipProvider>
        <PropertiesPanel productLibrary={[]} viewMode="2d" />
      </TooltipProvider>
    );
    // Expand the opening row.
    const wall = activeDoc().walls[WALL_ID];
    const op = wall.openings[0];
    const row = screen.queryByTestId(`opening-row-${op.id}`);
    // Wave 3 [Rule 3 - blocking]: native .click() does not flush React state
    // updates in happy-dom; wrap in act() so the OpeningEditor expand state
    // settles before the assertion reads it.
    if (row) act(() => { row.click(); });
    expect(screen.getByText(/preset:\s*standard/i)).toBeInTheDocument();
  });

  it("renders 'Preset: Custom' for an Opening with 5/3/2", () => {
    // Mutate the opening to non-catalog dimensions.
    const wall = activeDoc().walls[WALL_ID];
    const op = wall.openings[0];
    act(() => {
      useCADStore.getState().updateOpening(WALL_ID, op.id, {
        width: 5,
        height: 3,
        sillHeight: 2,
      });
    });
    render(
      <TooltipProvider>
        <PropertiesPanel productLibrary={[]} viewMode="2d" />
      </TooltipProvider>
    );
    const row = screen.queryByTestId(`opening-row-${op.id}`);
    // Wave 3 [Rule 3 - blocking]: native .click() does not flush React state
    // updates in happy-dom; wrap in act() so the OpeningEditor expand state
    // settles before the assertion reads it.
    if (row) act(() => { row.click(); });
    expect(screen.getByText(/preset:\s*custom/i)).toBeInTheDocument();
  });

  it("clicking 'Wide' chip in PropertiesPanel calls updateOpening with 4/5/3 and increments past.length by 1", () => {
    const wall = activeDoc().walls[WALL_ID];
    const op = wall.openings[0];
    render(
      <TooltipProvider>
        <PropertiesPanel productLibrary={[]} viewMode="2d" />
      </TooltipProvider>
    );
    const row = screen.queryByTestId(`opening-row-${op.id}`);
    // Wave 3 [Rule 3 - blocking]: native .click() does not flush React state
    // updates in happy-dom; wrap in act() so the OpeningEditor expand state
    // settles before the assertion reads it.
    if (row) act(() => { row.click(); });
    const beforePast = useCADStore.getState().past.length;
    const wideChip = screen.getByTestId(`opening-preset-chip-${op.id}-wide`);
    act(() => {
      wideChip.click();
    });
    const afterPast = useCADStore.getState().past.length;
    const updated = activeDoc().walls[WALL_ID].openings[0];
    expect(updated.width).toBe(4);
    expect(updated.height).toBe(5);
    expect(updated.sillHeight).toBe(3);
    expect(afterPast - beforePast).toBe(1);
  });

  it("manually editing width 3 → 5 re-derives label from 'Standard' to 'Custom'", () => {
    const wall = activeDoc().walls[WALL_ID];
    const op = wall.openings[0];
    render(
      <TooltipProvider>
        <PropertiesPanel productLibrary={[]} viewMode="2d" />
      </TooltipProvider>
    );
    const row = screen.queryByTestId(`opening-row-${op.id}`);
    // Wave 3 [Rule 3 - blocking]: native .click() does not flush React state
    // updates in happy-dom; wrap in act() so the OpeningEditor expand state
    // settles before the assertion reads it.
    if (row) act(() => { row.click(); });
    expect(screen.getByText(/preset:\s*standard/i)).toBeInTheDocument();
    act(() => {
      useCADStore.getState().updateOpening(WALL_ID, op.id, { width: 5 });
    });
    expect(screen.queryByText(/preset:\s*standard/i)).not.toBeInTheDocument();
    expect(screen.getByText(/preset:\s*custom/i)).toBeInTheDocument();
  });
});
