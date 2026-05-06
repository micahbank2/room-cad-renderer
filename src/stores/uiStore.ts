import { create } from "zustand";
import type { ToolType, WallSide } from "@/types/cad";
import type { PresetId } from "@/three/cameraPresets";

/** Phase 47 D-05: localStorage key for displayMode persistence. */
const GSD_DISPLAY_MODE_KEY = "gsd:displayMode";
const VALID_DISPLAY_MODES = ["normal", "solo", "explode"] as const;
type DisplayMode = (typeof VALID_DISPLAY_MODES)[number];

/**
 * Phase 47 D-05: synchronous lazy read at store-creation time.
 * SSR-safe via typeof window guard; quota/privacy mode falls back to "normal".
 */
function readDisplayMode(): DisplayMode {
  if (typeof window === "undefined") return "normal";
  try {
    const v = window.localStorage.getItem(GSD_DISPLAY_MODE_KEY);
    return (VALID_DISPLAY_MODES as readonly string[]).includes(v ?? "")
      ? (v as DisplayMode)
      : "normal";
  } catch {
    return "normal";
  }
}

export type HelpSectionId =
  | "getting-started"
  | "shortcuts"
  | "library"
  | "3d";

interface UIState {
  activeTool: ToolType;
  selectedIds: string[];
  showProductLibrary: boolean;
  showProperties: boolean;
  gridSnap: number; // feet, 0 = off
  showGrid: boolean;
  cameraMode: "orbit" | "walk";
  showHelp: boolean;
  activeHelpSection: HelpSectionId;
  userZoom: number; // 1.0 = auto-fit, 2.0 = 2x, etc.
  panOffset: { x: number; y: number }; // pixel offset applied on top of auto-fit origin
  activeWallSide: WallSide; // which face of the selected wall is being edited (Phase 17)
  /** When set, 3D viewport should animate camera to face this wall side. */
  wallSideCameraTarget: { wallId: string; side: WallSide; seq: number } | null;
  /**
   * Phase 35 CAM-01 (D-02): the last preset Jessica applied. Stays set
   * across manual OrbitControls drags — only cleared by applying a different
   * preset. Toolbar reads this for the active-button highlight.
   */
  activePreset: PresetId | null;
  /**
   * Phase 35 CAM-02 bridge (Research §4 Option B): selectTool-style request
   * bridge from App.tsx/Toolbar → Scene. Scene useEffect watches this ref
   * and translates into a preset tween (Plan 35-02). seq increments each
   * request so back-to-back requests for the same preset still fire.
   */
  pendingPresetRequest: { id: PresetId; seq: number } | null;
  showSidebar: boolean;
  /**
   * Phase 33 D-13: bridge flag set by selectTool during an active drag.
   * Used by FloatingSelectionToolbar to hide itself mid-drag so it doesn't
   * fight the gesture. Mirrors the D-07 bridge pattern (setPendingProduct,
   * setSelectToolProductLibrary) — selectTool still keeps its module-local
   * `_dragActive` flag for the Phase 25 PERF-01 fast path; this is the
   * store-subscribable mirror.
   */
  isDragging: boolean;

  /** Phase 46 D-13: transient view-state. NOT persisted; resets on page load. NOT pushed to undo history. */
  hiddenIds: Set<string>;

  /**
   * Phase 46: extends Phase 35 dispatch — non-preset bbox/look-at target.
   * ThreeViewport mirrors lines 252–302 useEffect for this field.
   */
  pendingCameraTarget: {
    position: [number, number, number];
    target: [number, number, number];
    seq: number;
  } | null;

  setTool: (tool: ToolType) => void;
  select: (ids: string[]) => void;
  addToSelection: (id: string) => void;
  clearSelection: () => void;
  toggleProductLibrary: () => void;
  toggleProperties: () => void;
  setGridSnap: (snap: number) => void;
  toggleGrid: () => void;
  setCameraMode: (mode: "orbit" | "walk") => void;
  toggleCameraMode: () => void;
  openHelp: (section?: HelpSectionId) => void;
  closeHelp: () => void;
  toggleHelp: () => void;
  setHelpSection: (section: HelpSectionId) => void;
  setUserZoom: (zoom: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  zoomAt: (cursor: { x: number; y: number }, factor: number, baseFit: { scale: number; origin: { x: number; y: number } }) => void;
  resetView: () => void;
  setActiveWallSide: (side: WallSide) => void;
  focusWallSide: (wallId: string, side: WallSide) => void;
  clearWallSideCameraTarget: () => void;
  setActivePreset: (preset: PresetId | null) => void;
  /**
   * Phase 35: combined write — sets activePreset AND pendingPresetRequest
   * in a single set() call. Hotkey handler + Toolbar buttons + test driver
   * all call this; no code path sets one without the other.
   */
  requestPreset: (id: PresetId) => void;
  clearPendingPresetRequest: () => void;
  toggleSidebar: () => void;
  /** Phase 33 D-13: selectTool calls this at drag start/end. */
  setDragging: (v: boolean) => void;

  toggleHidden: (id: string) => void;
  setHidden: (id: string, hidden: boolean) => void;
  clearHidden: () => void;
  requestCameraTarget: (
    position: [number, number, number],
    target: [number, number, number],
  ) => void;
  clearPendingCameraTarget: () => void;

  /**
   * Phase 48 CAM-04: cross-component camera-capture bridge. ThreeViewport
   * installs this getter on Scene mount via installCameraCapture; PropertiesPanel
   * reads it from outside the R3F Canvas tree to capture the live OrbitControls
   * pose at Save-button click time. Null when no Scene is mounted (e.g. viewMode === "2d").
   */
  getCameraCapture: (() => { pos: [number, number, number]; target: [number, number, number] } | null) | null;
  /** Phase 48 CAM-04: ThreeViewport calls this on Scene mount with a capture closure. */
  installCameraCapture: (
    fn: () => { pos: [number, number, number]; target: [number, number, number] } | null,
  ) => void;
  /** Phase 48 CAM-04: ThreeViewport calls this on Scene unmount. */
  clearCameraCapture: () => void;

  /**
   * Phase 47 D-02: NORMAL/SOLO/EXPLODE display mode for 3D viewport.
   * View-state only — NO cadStore mutations, NO undo entries, NO autosave triggers.
   * Persisted to localStorage["gsd:displayMode"] (D-05).
   */
  displayMode: "normal" | "solo" | "explode";
  /** Phase 47 D-02 + D-05: setter writes to localStorage as a side effect. */
  setDisplayMode: (mode: "normal" | "solo" | "explode") => void;

  /**
   * Phase 53 CTXMENU-01: right-click context menu state.
   * null = menu closed. Opened by openContextMenu(), closed by closeContextMenu().
   */
  contextMenu: {
    /** Phase 60 STAIRS-01 adds 'stair'. Phase 61 OPEN-01 (D-11') adds 'opening'
     *  for archway / passthrough / niche / door / window. parentId = wallId
     *  for opening kind. */
    kind: "wall" | "product" | "ceiling" | "custom" | "empty" | "stair" | "opening";
    nodeId: string | null;
    position: { x: number; y: number };
    /** Phase 61 OPEN-01: when kind === 'opening', the parent wall id. */
    parentId?: string;
  } | null;
  openContextMenu: (
    kind: "wall" | "product" | "ceiling" | "custom" | "empty" | "stair" | "opening",
    nodeId: string | null,
    position: { x: number; y: number },
    parentId?: string,
  ) => void;
  closeContextMenu: () => void;

  /**
   * Phase 53 CTXMENU-01: signal for PropertiesPanel LabelOverrideInput to
   * auto-focus. Set by CanvasContextMenu "Rename label" action; cleared by
   * LabelOverrideInput after handling.
   */
  pendingLabelFocus: string | null;
  setPendingLabelFocus: (pceId: string | null) => void;

  /**
   * Phase 59 CUTAWAY-01: 3D wall-cutaway state. Session-only — NOT persisted
   * to localStorage, NOT serialized into snapshots, NOT pushed to undo history.
   *
   * - cutawayMode: toolbar Cutaway button toggles "off" ↔ "auto" (D-06).
   * - cutawayAutoDetectedWallId: Map<roomId, wallId|null> — which wall to
   *   ghost in each room when in "auto" mode. Written by ThreeViewport
   *   useFrame block per-room. DEVIATION from CONTEXT D-09 (single string)
   *   — Map is required for per-room cutaway in EXPLODE display mode (D-03).
   * - cutawayManualWallIds: Set<wallId> — walls hidden via right-click
   *   "Hide in 3D". Independent from hiddenIds (D-05).
   */
  cutawayMode: "off" | "auto";
  cutawayAutoDetectedWallId: Map<string, string | null>;
  cutawayManualWallIds: Set<string>;

  /**
   * Phase 59 CUTAWAY-01: setter cycles "off" ↔ "auto" (toolbar button).
   * Side-effect: setting "off" also clears cutawayManualWallIds (D-05
   * "Clear-all is implicit: switching cutaway mode to off clears manual hides").
   */
  setCutawayMode: (mode: "off" | "auto") => void;
  /**
   * Phase 59 CUTAWAY-01: compare-then-set writer. ThreeViewport useFrame
   * calls this every frame; if value unchanged, the Map instance is NOT
   * replaced — avoids spurious Zustand subscriber renders in WallMesh.
   */
  setCutawayAutoDetectedWall: (roomId: string, wallId: string | null) => void;
  /** Phase 59 CUTAWAY-01: per-wall right-click toggle (D-05). */
  toggleCutawayManualWall: (wallId: string) => void;
  /** Phase 59 CUTAWAY-01: empty the manual-hide set. */
  clearCutawayManualWalls: () => void;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;

export const useUIStore = create<UIState>()((set) => ({
  activeTool: "select",
  selectedIds: [],
  showProductLibrary: true,
  showProperties: true,
  gridSnap: 0.5,
  showGrid: true,
  cameraMode: "orbit",
  showHelp: false,
  activeHelpSection: "getting-started",
  userZoom: 1,
  panOffset: { x: 0, y: 0 },
  activeWallSide: "A",
  wallSideCameraTarget: null,
  activePreset: null,
  pendingPresetRequest: null,
  showSidebar: true,
  isDragging: false,
  hiddenIds: new Set<string>(),
  pendingCameraTarget: null,
  getCameraCapture: null,
  displayMode: readDisplayMode(),

  // Phase 59 CUTAWAY-01: session-only cutaway state.
  cutawayMode: "off" as const,
  cutawayAutoDetectedWallId: new Map<string, string | null>(),
  cutawayManualWallIds: new Set<string>(),

  setTool: (tool) => set({ activeTool: tool, selectedIds: [] }),
  select: (ids) => set({ selectedIds: ids }),
  addToSelection: (id) =>
    set((s) => ({ selectedIds: [...s.selectedIds, id] })),
  clearSelection: () => set({ selectedIds: [] }),
  toggleProductLibrary: () =>
    set((s) => ({ showProductLibrary: !s.showProductLibrary })),
  toggleProperties: () =>
    set((s) => ({ showProperties: !s.showProperties })),
  setGridSnap: (snap) => set({ gridSnap: snap }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  toggleCameraMode: () =>
    set((s) => ({ cameraMode: s.cameraMode === "orbit" ? "walk" : "orbit" })),
  openHelp: (section) =>
    set((s) => ({
      showHelp: true,
      activeHelpSection: section ?? s.activeHelpSection,
    })),
  closeHelp: () => set({ showHelp: false }),
  toggleHelp: () => set((s) => ({ showHelp: !s.showHelp })),
  setHelpSection: (section) => set({ activeHelpSection: section }),
  setUserZoom: (zoom) =>
    set({ userZoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)) }),
  setPanOffset: (offset) => set({ panOffset: offset }),
  zoomAt: (cursor, factor, baseFit) =>
    set((s) => {
      const currentZoom = s.userZoom;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom * factor));
      if (newZoom === currentZoom) return s;
      // World coords of cursor before zoom:
      //   scale_old = baseFit.scale * currentZoom
      //   origin_old = baseFit.origin + panOffset
      //   worldPt = (cursor - origin_old) / scale_old
      // After zoom we want cursor to still be at worldPt:
      //   scale_new = baseFit.scale * newZoom
      //   origin_new = cursor - worldPt * scale_new
      //   panOffset_new = origin_new - baseFit.origin
      const scaleOld = baseFit.scale * currentZoom;
      const originOld = {
        x: baseFit.origin.x + s.panOffset.x,
        y: baseFit.origin.y + s.panOffset.y,
      };
      const worldPt = {
        x: (cursor.x - originOld.x) / scaleOld,
        y: (cursor.y - originOld.y) / scaleOld,
      };
      const scaleNew = baseFit.scale * newZoom;
      const originNew = {
        x: cursor.x - worldPt.x * scaleNew,
        y: cursor.y - worldPt.y * scaleNew,
      };
      return {
        userZoom: newZoom,
        panOffset: {
          x: originNew.x - baseFit.origin.x,
          y: originNew.y - baseFit.origin.y,
        },
      };
    }),
  resetView: () => set({ userZoom: 1, panOffset: { x: 0, y: 0 } }),
  setActiveWallSide: (side) => set({ activeWallSide: side }),
  focusWallSide: (wallId, side) =>
    set((s) => ({
      activeWallSide: side,
      wallSideCameraTarget: { wallId, side, seq: (s.wallSideCameraTarget?.seq ?? 0) + 1 },
    })),
  clearWallSideCameraTarget: () => set({ wallSideCameraTarget: null }),
  setActivePreset: (preset) => set({ activePreset: preset }),
  requestPreset: (id) =>
    set((s) => ({
      activePreset: id,
      pendingPresetRequest: { id, seq: (s.pendingPresetRequest?.seq ?? 0) + 1 },
    })),
  clearPendingPresetRequest: () => set({ pendingPresetRequest: null }),
  toggleSidebar: () => set((s) => ({ showSidebar: !s.showSidebar })),
  setDragging: (v) => set({ isDragging: v }),
  toggleHidden: (id) =>
    set((s) => {
      const next = new Set(s.hiddenIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { hiddenIds: next };
    }),
  setHidden: (id, hidden) =>
    set((s) => {
      const next = new Set(s.hiddenIds);
      if (hidden) next.add(id);
      else next.delete(id);
      return { hiddenIds: next };
    }),
  clearHidden: () => set({ hiddenIds: new Set<string>() }),
  requestCameraTarget: (position, target) =>
    set((s) => ({
      pendingCameraTarget: {
        position, target,
        seq: (s.pendingCameraTarget?.seq ?? 0) + 1,
      },
    })),
  clearPendingCameraTarget: () => set({ pendingCameraTarget: null }),
  installCameraCapture: (fn) => set({ getCameraCapture: fn }),
  clearCameraCapture: () => set({ getCameraCapture: null }),
  setDisplayMode: (mode) => {
    set({ displayMode: mode });
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(GSD_DISPLAY_MODE_KEY, mode);
    } catch {
      // quota / privacy mode — silently swallow per Phase 35 / uiPersistence convention
    }
  },

  // Phase 53 CTXMENU-01 + Phase 61 OPEN-01 D-11' (parentId for openings)
  contextMenu: null,
  openContextMenu: (kind, nodeId, position, parentId) =>
    set({ contextMenu: { kind, nodeId, position, parentId } }),
  closeContextMenu: () => set({ contextMenu: null }),
  pendingLabelFocus: null,
  setPendingLabelFocus: (pceId) => set({ pendingLabelFocus: pceId }),

  // Phase 59 CUTAWAY-01 actions
  setCutawayMode: (mode) =>
    set((s) => {
      if (mode === "off") {
        // D-05: switching cutaway mode to off clears manual hides.
        return {
          cutawayMode: "off",
          cutawayManualWallIds: new Set<string>(),
        };
      }
      return { cutawayMode: mode };
      // Touching s avoids unused-param lint while documenting that `set`
      // here is a functional update (read current state if needed in future).
      void s;
    }),
  setCutawayAutoDetectedWall: (roomId, wallId) =>
    set((s) => {
      // Compare-then-set: if value unchanged, return same Map instance so
      // Zustand subscribers do not re-render. Required for useFrame loop.
      const current = s.cutawayAutoDetectedWallId;
      if (current.has(roomId) && current.get(roomId) === wallId) {
        return s;
      }
      const next = new Map(current);
      next.set(roomId, wallId);
      return { cutawayAutoDetectedWallId: next };
    }),
  toggleCutawayManualWall: (wallId) =>
    set((s) => {
      const next = new Set(s.cutawayManualWallIds);
      if (next.has(wallId)) next.delete(wallId);
      else next.add(wallId);
      return { cutawayManualWallIds: next };
    }),
  clearCutawayManualWalls: () =>
    set({ cutawayManualWallIds: new Set<string>() }),
}));

export type ContextMenuState = NonNullable<ReturnType<typeof useUIStore.getState>["contextMenu"]>;
export type ContextMenuKind = ContextMenuState["kind"];
