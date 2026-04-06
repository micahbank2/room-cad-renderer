import { create } from "zustand";
import type { PaintColor } from "@/types/paint";
import { useCADStore } from "./cadStore";

interface PaintState {
  customColors: PaintColor[];
}

/**
 * paintStore — pure in-memory derived view of cadStore.customPaints.
 *
 * IMPORTANT: This store has NO idb-keyval persistence. Custom paints live in
 * cadStore.customPaints (part of CADSnapshot) so they participate in undo/redo
 * and project save/load automatically.
 *
 * To ADD or REMOVE custom paints, call cadStore actions directly:
 *   useCADStore.getState().addCustomPaint(item)
 *   useCADStore.getState().removeCustomPaint(id)
 */
export const usePaintStore = create<PaintState>()(() => ({
  customColors: [],
}));

// Sync from cadStore — paintStore is a derived view, never the source of truth
useCADStore.subscribe((state) => {
  const customs: PaintColor[] = (state as any).customPaints ?? [];
  if (customs !== usePaintStore.getState().customColors) {
    usePaintStore.setState({ customColors: customs });
  }
});
