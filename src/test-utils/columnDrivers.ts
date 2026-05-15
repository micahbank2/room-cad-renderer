// src/test-utils/columnDrivers.ts
// Phase 86 COL-01: e2e + RTL test drivers for column placement and inspection.
//
// StrictMode-safe install/cleanup pattern (mirror Phase 85 numericInputDrivers):
// installColumnDrivers() returns a cleanup fn that removes the global hooks
// ONLY if they still reference the same closure that installed them
// (identity check), so a StrictMode double-mount doesn't clobber the
// remount's registration.
//
// Gated by `import.meta.env.MODE === "test"` — production tree-shakes.

import { useCADStore } from "@/stores/cadStore";
import type { Column } from "@/types/cad";

declare global {
  interface Window {
    __drivePlaceColumn?: (xFt: number, yFt: number) => string;
    __getColumnCount?: () => number;
    __getColumnConfig?: (columnId: string) => Column | null;
  }
}

export function installColumnDrivers(): () => void {
  if (import.meta.env.MODE !== "test") return () => {};

  const place = (xFt: number, yFt: number): string => {
    const cad = useCADStore.getState();
    const roomId = cad.activeRoomId;
    if (!roomId) throw new Error("installColumnDrivers: no active room");
    const room = cad.rooms[roomId];
    if (!room) throw new Error("installColumnDrivers: active room missing");
    return cad.addColumn(roomId, {
      position: { x: xFt, y: yFt },
      widthFt: 1,
      depthFt: 1,
      heightFt: room.room.wallHeight,
      rotation: 0,
      shape: "box",
    });
  };

  const count = (): number => {
    const cad = useCADStore.getState();
    const roomId = cad.activeRoomId;
    if (!roomId) return 0;
    return Object.keys(cad.rooms[roomId]?.columns ?? {}).length;
  };

  const config = (columnId: string): Column | null => {
    const cad = useCADStore.getState();
    const roomId = cad.activeRoomId;
    if (!roomId) return null;
    return cad.rooms[roomId]?.columns?.[columnId] ?? null;
  };

  window.__drivePlaceColumn = place;
  window.__getColumnCount = count;
  window.__getColumnConfig = config;

  return () => {
    // Identity check — StrictMode double-mount safe (CLAUDE.md §7).
    if (window.__drivePlaceColumn === place) {
      window.__drivePlaceColumn = undefined;
    }
    if (window.__getColumnCount === count) {
      window.__getColumnCount = undefined;
    }
    if (window.__getColumnConfig === config) {
      window.__getColumnConfig = undefined;
    }
  };
}
