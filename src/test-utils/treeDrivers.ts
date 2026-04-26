// src/test-utils/treeDrivers.ts
// Phase 46 Plan 03: live test drivers (replaces Wave 0 throw stubs).
// Gated by import.meta.env.MODE === "test" — production unaffected.

import { useUIStore } from "@/stores/uiStore";

declare global {
  interface Window {
    __driveTreeExpand?: (roomId: string) => void;
    __driveTreeVisibility?: (id: string) => void;
    __driveTreeSelect?: (id: string) => void;
    __getTreeState?: () => {
      expanded: Record<string, boolean>;
      hiddenIds: string[];
      selectedIds: string[];
    };
  }
}

export function installTreeDrivers(): void {
  if (typeof window === "undefined") return;
  if (import.meta.env.MODE !== "test") return;

  window.__driveTreeExpand = (roomId: string) => {
    const el = document.querySelector(
      `[data-tree-node="${roomId}"] [data-tree-chevron]`,
    ) as HTMLElement | null;
    el?.click();
  };

  window.__driveTreeVisibility = (id: string) => {
    const el = document.querySelector(
      `[data-tree-node="${id}"] [data-tree-eye]`,
    ) as HTMLElement | null;
    el?.click();
  };

  window.__driveTreeSelect = (id: string) => {
    const el = document.querySelector(
      `[data-tree-node="${id}"] [data-tree-row]`,
    ) as HTMLElement | null;
    el?.click();
  };

  window.__getTreeState = () => {
    const expanded: Record<string, boolean> = {};
    document.querySelectorAll('[data-tree-kind="room"]').forEach((el) => {
      const id = (el as HTMLElement).dataset.treeNode;
      const chevron = el.querySelector("[data-tree-chevron]");
      const expandedAttr = chevron?.getAttribute("aria-expanded");
      if (id) expanded[id] = expandedAttr === "true";
    });

    const state = useUIStore.getState() as ReturnType<typeof useUIStore.getState> & {
      hiddenIds?: Set<string>;
    };

    return {
      expanded,
      hiddenIds: Array.from(state.hiddenIds ?? new Set<string>()),
      selectedIds: state.selectedIds,
    };
  };
}

export {};
