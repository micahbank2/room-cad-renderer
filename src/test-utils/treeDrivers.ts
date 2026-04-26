// src/test-utils/treeDrivers.ts
// Phase 46: window-level drivers for e2e + RTL access. Gated by MODE === "test".
// Plan 03 fills the bodies; Plan 01 declares the API.

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
  const unimpl = (name: string) => () => {
    throw new Error(`treeDrivers.${name} unimplemented — Plan 03 wires this`);
  };
  window.__driveTreeExpand = unimpl("driveTreeExpand");
  window.__driveTreeVisibility = unimpl("driveTreeVisibility");
  window.__driveTreeSelect = unimpl("driveTreeSelect");
  window.__getTreeState = (() => {
    throw new Error("treeDrivers.getTreeState unimplemented — Plan 03 wires this");
  }) as Window["__getTreeState"];
}

export {};
