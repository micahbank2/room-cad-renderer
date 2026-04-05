import { create } from "zustand";
import type { ToolType } from "@/types/cad";

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
}

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
}));
