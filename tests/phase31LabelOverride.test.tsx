/**
 * Phase 31 Wave 0 — Red RTL stubs for the CUSTOM-06 label-override input
 * (PropertiesPanel) and the fabricSync render-site lookup.
 *
 * Driver contract (installed by PropertiesPanel.tsx in Plan 31-02 / Plan 31-03
 * when `import.meta.env.MODE === "test"`):
 *
 *   window.__driveLabelOverride = {
 *     typeAndCommit(placedCustomElementId, text, "enter"|"blur"): void,
 *   };
 *
 * Optional helper for fabricSync render assertions (also installed in test mode):
 *   window.__getCustomElementLabel(pceId): string  // uppercased label text on canvas
 *
 * MUST fail on this commit — neither bridge nor input field exists yet.
 *
 * Decisions covered (.planning/phases/31-drag-resize-label-override/31-CONTEXT.md):
 *   - D-09: live preview on keystroke, no debounce
 *   - D-10: history commit on Enter or blur (not per keystroke)
 *   - D-11: empty-string reverts to catalog name
 *   - D-12: maxLength 40
 *   - D-13: PlacedCustomElement.labelOverride field
 *   - D-14: fabricSync renders override?.toUpperCase() ?? catalog.name.toUpperCase()
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, fireEvent, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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
    __driveLabelOverride?: {
      typeAndCommit: (placedCustomElementId: string, text: string, mode: "enter" | "blur") => void;
    };
    __getCustomElementLabel?: (pceId: string) => string;
  }
}

const ROOM_ID = "room_main";
const PCE_ID = "pce-1";
const CE_ID = "ce-1";

function activeDoc() {
  const s = useCADStore.getState();
  return s.rooms[s.activeRoomId!];
}

function seed(opts: { labelOverride?: string } = {}) {
  resetCADStoreForTests();
  useCADStore.setState((prev) => ({
    ...prev,
    rooms: {
      [ROOM_ID]: {
        id: ROOM_ID,
        name: "Main",
        room: { width: 20, length: 20, wallHeight: 8 },
        walls: {},
        placedProducts: {},
        placedCustomElements: {
          [PCE_ID]: {
            id: PCE_ID,
            customElementId: CE_ID,
            position: { x: 5, y: 5 },
            rotation: 0,
            sizeScale: 1,
            ...(opts.labelOverride !== undefined ? { labelOverride: opts.labelOverride } : {}),
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
  useUIStore.setState({ activeTool: "select", selectedIds: [PCE_ID] } as any);
}

describe("CUSTOM-06 — PropertiesPanel label-override input", () => {
  beforeEach(() => seed());

  it("renders an input with placeholder = uppercase catalog name (D-11) and maxLength=40 (D-12)", async () => {
    render(<App />);
    // Use placeholder lookup — Plan 31-03 input uses placeholder = "FRIDGE"
    const input = await screen.findByPlaceholderText(/FRIDGE/i);
    expect(input).toBeDefined();
    expect((input as HTMLInputElement).maxLength).toBe(40);
  });

  it("D-09 live preview: each keystroke updates labelOverride immediately (no debounce)", async () => {
    render(<App />);
    const input = await screen.findByPlaceholderText(/FRIDGE/i);
    const user = userEvent.setup();

    await user.type(input, "c");
    expect(activeDoc().placedCustomElements?.[PCE_ID]?.labelOverride).toBe("c");

    await user.type(input, "o");
    expect(activeDoc().placedCustomElements?.[PCE_ID]?.labelOverride).toBe("co");
  });

  it("D-09 live preview does NOT push history per keystroke", async () => {
    render(<App />);
    const input = await screen.findByPlaceholderText(/FRIDGE/i);
    const before = useCADStore.getState().past.length;
    const user = userEvent.setup();
    await user.type(input, "couch");
    // Up to 5 keystrokes — history must NOT have grown by 5.
    expect(useCADStore.getState().past.length - before).toBeLessThan(2);
  });

  it("D-10 commit on Enter writes exactly 1 history entry over the session", async () => {
    render(<App />);
    await vi.waitFor(() => expect(window.__driveLabelOverride).toBeDefined(), { timeout: 2000 });
    const before = useCADStore.getState().past.length;
    await act(async () => {
      window.__driveLabelOverride!.typeAndCommit(PCE_ID, "couch", "enter");
    });
    expect(useCADStore.getState().past.length).toBe(before + 1);
    expect(activeDoc().placedCustomElements?.[PCE_ID]?.labelOverride).toBe("couch");
  });

  it("D-10 commit on blur writes exactly 1 history entry over the session", async () => {
    render(<App />);
    await vi.waitFor(() => expect(window.__driveLabelOverride).toBeDefined(), { timeout: 2000 });
    const before = useCADStore.getState().past.length;
    await act(async () => {
      window.__driveLabelOverride!.typeAndCommit(PCE_ID, "couch", "blur");
    });
    expect(useCADStore.getState().past.length).toBe(before + 1);
  });

  it("D-11 empty string commit reverts labelOverride to undefined (catalog name shown)", async () => {
    seed({ labelOverride: "Old" });
    render(<App />);
    await vi.waitFor(() => expect(window.__driveLabelOverride).toBeDefined(), { timeout: 2000 });
    await act(async () => {
      window.__driveLabelOverride!.typeAndCommit(PCE_ID, "", "enter");
    });
    expect(activeDoc().placedCustomElements?.[PCE_ID]?.labelOverride).toBeUndefined();
  });

  it("Escape cancels live-preview, reverts to pre-edit value (mirror Phase 29)", async () => {
    seed({ labelOverride: "Original" });
    render(<App />);
    const input = await screen.findByPlaceholderText(/FRIDGE/i);
    const user = userEvent.setup();
    await user.clear(input);
    await user.type(input, "new");
    await user.keyboard("{Escape}");
    expect(activeDoc().placedCustomElements?.[PCE_ID]?.labelOverride).toBe("Original");
  });

  it("D-14 fabricSync renders override?.toUpperCase() at the label site", async () => {
    seed({ labelOverride: "Mini Fridge" });
    render(<App />);
    await vi.waitFor(() => expect(window.__getCustomElementLabel).toBeDefined(), { timeout: 2000 });
    const labelText = window.__getCustomElementLabel!(PCE_ID);
    expect(labelText).toBe("MINI FRIDGE");
  });

  it("D-13 override persists through save/load round-trip (snapshot serialize)", async () => {
    seed({ labelOverride: "Bob" });
    const snap = JSON.parse(JSON.stringify(useCADStore.getState()));
    expect(snap.rooms[ROOM_ID].placedCustomElements[PCE_ID].labelOverride).toBe("Bob");

    // Round-trip: clear store, then loadSnapshot reads the JSON back.
    resetCADStoreForTests();
    expect(activeDoc().placedCustomElements?.[PCE_ID]).toBeUndefined();

    useCADStore.getState().loadSnapshot({
      version: 2,
      rooms: snap.rooms,
      activeRoomId: snap.activeRoomId,
      customElements: snap.customElements,
    });

    expect(activeDoc().placedCustomElements?.[PCE_ID]?.labelOverride).toBe("Bob");
  });
});
