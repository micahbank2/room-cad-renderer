import { create } from "zustand";
import type { ToolType } from "@/types/cad";

interface UIState {
  activeTool: ToolType;
  selectedIds: string[];
  showProductLibrary: boolean;
  showProperties: boolean;
  gridSnap: number; // feet, 0 = off
  showGrid: boolean;
  cameraMode: "orbit" | "walk";

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
}

export const useUIStore = create<UIState>()((set) => ({
  activeTool: "select",
  selectedIds: [],
  showProductLibrary: true,
  showProperties: true,
  gridSnap: 0.5,
  showGrid: true,
  cameraMode: "orbit",

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
}));
