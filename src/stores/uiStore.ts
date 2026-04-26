import { create } from "zustand";
import type { ToolType, WallSide } from "@/types/cad";
import type { PresetId } from "@/three/cameraPresets";

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
}));
