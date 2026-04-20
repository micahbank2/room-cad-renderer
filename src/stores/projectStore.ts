import { create } from "zustand";

export type SaveStatus = "idle" | "saving" | "saved" | "failed";

interface ProjectState {
  activeId: string | null;
  activeName: string;
  saveStatus: SaveStatus;
  setActive: (id: string, name: string) => void;
  setActiveName: (name: string) => void;
  clearActive: () => void;
  setSaveStatus: (s: SaveStatus) => void;
}

export const useProjectStore = create<ProjectState>()((set) => ({
  activeId: null,
  activeName: "Untitled Room",
  saveStatus: "idle",
  setActive: (id, name) => set({ activeId: id, activeName: name }),
  setActiveName: (name) => set({ activeName: name }),
  clearActive: () => set({ activeId: null, activeName: "Untitled Room" }),
  setSaveStatus: (s) => set({ saveStatus: s }),
}));
