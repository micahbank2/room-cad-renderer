import { create } from "zustand";
import type { ToolType, WallSide } from "@/types/cad";

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
  showSidebar: boolean;

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
  toggleSidebar: () => void;
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
  showSidebar: true,

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
  toggleSidebar: () => set((s) => ({ showSidebar: !s.showSidebar })),
}));
