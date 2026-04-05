import { create } from "zustand";
import { produce } from "immer";
import { get, set } from "idb-keyval";
import type { FramedArtItem, FrameStyle } from "@/types/framedArt";

const FRAMED_ART_KEY = "room-cad-framed-art";

interface FramedArtState {
  items: FramedArtItem[];
  loaded: boolean;
  load: () => Promise<void>;
  addItem: (item: Omit<FramedArtItem, "id">) => string;
  removeItem: (id: string) => void;
  updateItem: (id: string, changes: Partial<FramedArtItem>) => void;
}

function uid() {
  return `fart_${Math.random().toString(36).slice(2, 10)}`;
}

export const useFramedArtStore = create<FramedArtState>()((setState) => ({
  items: [],
  loaded: false,

  load: async () => {
    const stored = await get<FramedArtItem[]>(FRAMED_ART_KEY);
    if (stored && Array.isArray(stored)) {
      // Coerce any legacy records to current shape
      const migrated: FramedArtItem[] = stored.map((i) => ({
        id: i.id,
        name: i.name ?? "UNTITLED",
        imageUrl: i.imageUrl ?? "",
        frameStyle: (i.frameStyle ?? "thin-black") as FrameStyle,
      }));
      setState({ items: migrated, loaded: true });
    } else {
      setState({ loaded: true });
    }
  },

  addItem: (item) => {
    const id = uid();
    setState(
      produce((s: FramedArtState) => {
        s.items.push({ id, ...item });
      })
    );
    return id;
  },

  removeItem: (id) =>
    setState(
      produce((s: FramedArtState) => {
        s.items = s.items.filter((x) => x.id !== id);
      })
    ),

  updateItem: (id, changes) =>
    setState(
      produce((s: FramedArtState) => {
        const it = s.items.find((x) => x.id === id);
        if (it) Object.assign(it, changes);
      })
    ),
}));

// Persist to IndexedDB after load() completes (prevents wiping on initial render)
useFramedArtStore.subscribe((state, prev) => {
  if (state.loaded && state.items !== prev.items) {
    set(FRAMED_ART_KEY, state.items).catch(() => {});
  }
});
