// src/test-utils/savedCameraDrivers.ts
// Phase 48: window-level drivers for e2e + RTL access. Gated by MODE === "test".

import { useCADStore } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";

declare global {
  interface Window {
    __driveSaveCamera?: (
      kind: "wall" | "product" | "ceiling" | "custom",
      id: string,
      pos: [number, number, number],
      target: [number, number, number],
    ) => void;
    __driveFocusNode?: (id: string) => void;
    __getSavedCamera?: (
      kind: "wall" | "product" | "ceiling" | "custom",
      id: string,
    ) => { pos: [number, number, number]; target: [number, number, number] } | null;
    /**
     * E2E helper — returns placedProduct ids in the active room. Lets the spec
     * pick a valid id without hard-coding seed shape.
     */
    __getActiveProductIds?: () => string[];
    /**
     * Installed by ThreeViewport's Scene useEffect (orbitControlsRef is local
     * there). Declared here so the test types compile.
     */
    __getCameraPose?: () => { position: [number, number, number]; target: [number, number, number] } | null;
  }
}

type Kind = "wall" | "product" | "ceiling" | "custom";

function activeRoom() {
  const cad = useCADStore.getState();
  return cad.rooms[cad.activeRoomId] ?? null;
}

/**
 * Phase 48: install savedCamera test drivers. Production no-op.
 */
export function installSavedCameraDrivers(): void {
  if (typeof window === "undefined") return;
  if (import.meta.env.MODE !== "test") return;

  window.__driveSaveCamera = (kind: Kind, id: string, pos, target) => {
    const cad = useCADStore.getState() as ReturnType<typeof useCADStore.getState> & {
      setSavedCameraOnWallNoHistory?: (id: string, p: [number,number,number], t: [number,number,number]) => void;
      setSavedCameraOnProductNoHistory?: (id: string, p: [number,number,number], t: [number,number,number]) => void;
      setSavedCameraOnCeilingNoHistory?: (id: string, p: [number,number,number], t: [number,number,number]) => void;
      setSavedCameraOnCustomElementNoHistory?: (id: string, p: [number,number,number], t: [number,number,number]) => void;
    };
    if (kind === "wall") cad.setSavedCameraOnWallNoHistory?.(id, pos, target);
    else if (kind === "product") cad.setSavedCameraOnProductNoHistory?.(id, pos, target);
    else if (kind === "ceiling") cad.setSavedCameraOnCeilingNoHistory?.(id, pos, target);
    else if (kind === "custom") cad.setSavedCameraOnCustomElementNoHistory?.(id, pos, target);
  };

  window.__driveFocusNode = (id: string) => {
    const room = activeRoom();
    if (!room) return;
    const ui = useUIStore.getState() as ReturnType<typeof useUIStore.getState> & {
      requestCameraTarget?: (pos: [number,number,number], tgt: [number,number,number]) => void;
    };
    const wall = room.walls?.[id];
    if (wall?.savedCameraPos && wall?.savedCameraTarget) {
      ui.requestCameraTarget?.(wall.savedCameraPos, wall.savedCameraTarget);
      return;
    }
    const pp = room.placedProducts?.[id];
    if (pp?.savedCameraPos && pp?.savedCameraTarget) {
      ui.requestCameraTarget?.(pp.savedCameraPos, pp.savedCameraTarget);
      return;
    }
    const ceiling = room.ceilings?.[id];
    if (ceiling?.savedCameraPos && ceiling?.savedCameraTarget) {
      ui.requestCameraTarget?.(ceiling.savedCameraPos, ceiling.savedCameraTarget);
      return;
    }
    const pce = room.placedCustomElements?.[id];
    if (pce?.savedCameraPos && pce?.savedCameraTarget) {
      ui.requestCameraTarget?.(pce.savedCameraPos, pce.savedCameraTarget);
    }
  };

  window.__getSavedCamera = (kind: Kind, id: string) => {
    const room = activeRoom();
    if (!room) return null;
    const entity =
      kind === "wall" ? room.walls?.[id] :
      kind === "product" ? room.placedProducts?.[id] :
      kind === "ceiling" ? room.ceilings?.[id] :
      kind === "custom" ? room.placedCustomElements?.[id] : null;
    if (!entity) return null;
    const e = entity as { savedCameraPos?: [number,number,number]; savedCameraTarget?: [number,number,number] };
    if (!e.savedCameraPos || !e.savedCameraTarget) return null;
    return { pos: e.savedCameraPos, target: e.savedCameraTarget };
  };

  window.__getActiveProductIds = () => {
    const room = activeRoom();
    if (!room) return [];
    return Object.keys(room.placedProducts ?? {});
  };
}

export {};
