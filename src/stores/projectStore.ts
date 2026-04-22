import { create } from "zustand";

export type SaveStatus = "idle" | "saving" | "saved" | "failed";

interface ProjectState {
  activeId: string | null;
  activeName: string;
  /**
   * Phase 33 GH #88 — ephemeral draft name for inline-edit live preview.
   * `null` means "not editing". Auto-save (`useAutoSave.ts:72`) subscribes ONLY
   * to `activeName`, so writes to `draftName` do NOT trigger debounced save
   * (genuine bypass per D-23 / checker warning 4).
   */
  draftName: string | null;
  saveStatus: SaveStatus;
  setActive: (id: string, name: string) => void;
  /** Commits directly to activeName — triggers auto-save subscription. */
  setActiveName: (name: string) => void;
  /** Ephemeral live-preview write. Auto-save does NOT subscribe. */
  setDraftName: (name: string | null) => void;
  /**
   * Flushes `draftName → activeName` in a single `set()` call, then clears
   * `draftName`. Auto-save fires exactly once per commit via the existing
   * `activeName` subscription. Empty (after trim) reverts (D-27).
   */
  commitDraftName: () => void;
  clearActive: () => void;
  setSaveStatus: (s: SaveStatus) => void;
}

export const useProjectStore = create<ProjectState>()((set, get) => ({
  activeId: null,
  activeName: "Untitled Room",
  draftName: null,
  saveStatus: "idle",
  setActive: (id, name) => set({ activeId: id, activeName: name, draftName: null }),
  setActiveName: (name) => set({ activeName: name }),
  setDraftName: (name) => set({ draftName: name }),
  commitDraftName: () => {
    const draft = get().draftName;
    if (draft === null) return; // nothing to commit
    const trimmed = draft.trim().slice(0, 60);
    if (trimmed.length === 0) {
      // D-27: empty commit → revert (do not overwrite activeName)
      set({ draftName: null });
      return;
    }
    set({ activeName: trimmed, draftName: null });
  },
  clearActive: () =>
    set({ activeId: null, activeName: "Untitled Room", draftName: null }),
  setSaveStatus: (s) => set({ saveStatus: s }),
}));
