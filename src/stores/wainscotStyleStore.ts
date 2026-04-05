import { create } from "zustand";
import { produce } from "immer";
import { get, set } from "idb-keyval";
import type { WainscotStyleItem } from "@/types/wainscotStyle";

const WAINSCOT_KEY = "room-cad-wainscot-styles";

interface WainscotStyleState {
  items: WainscotStyleItem[];
  loaded: boolean;
  load: () => Promise<void>;
  addItem: (item: Omit<WainscotStyleItem, "id">) => string;
  updateItem: (id: string, changes: Partial<WainscotStyleItem>) => void;
  removeItem: (id: string) => void;
}

function uid() {
  return `wain_${Math.random().toString(36).slice(2, 10)}`;
}

export const useWainscotStyleStore = create<WainscotStyleState>()((setState) => ({
  items: [],
  loaded: false,

  load: async () => {
    const stored = await get<WainscotStyleItem[]>(WAINSCOT_KEY);
    if (stored && Array.isArray(stored)) {
      setState({ items: stored, loaded: true });
    } else {
      setState({ loaded: true });
    }
  },

  addItem: (item) => {
    const id = uid();
    setState(
      produce((s: WainscotStyleState) => {
        s.items.push({ id, ...item });
      })
    );
    return id;
  },

  updateItem: (id, changes) =>
    setState(
      produce((s: WainscotStyleState) => {
        const it = s.items.find((x) => x.id === id);
        if (it) Object.assign(it, changes);
      })
    ),

  removeItem: (id) =>
    setState(
      produce((s: WainscotStyleState) => {
        s.items = s.items.filter((x) => x.id !== id);
      })
    ),
}));

// Persist after load() completes
useWainscotStyleStore.subscribe((state, prev) => {
  if (state.loaded && state.items !== prev.items) {
    set(WAINSCOT_KEY, state.items).catch(() => {});
  }
});
