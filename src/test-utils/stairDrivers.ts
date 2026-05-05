// src/test-utils/stairDrivers.ts
// Phase 60 STAIRS-01: window-level drivers for e2e + test access.
// Gated by import.meta.env.MODE === "test"; production no-op.

import { useCADStore } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { setPendingStair } from "@/canvas/tools/stairTool";
import type { Stair, Point } from "@/types/cad";

declare global {
  interface Window {
    /** Place a stair directly via cadStore.addStair (skips tool / preview). */
    __drivePlaceStair?: (
      roomId: string,
      position: Point,
      partial?: Partial<Stair>,
    ) => string;
    /** Count of stairs in a room. */
    __getStairCount?: (roomId: string) => number;
    /** Read full Stair object for a given (roomId, stairId). */
    __getStairConfig?: (roomId: string, stairId: string) => Stair | null;
    /** Apply a width delta via resizeStairWidth (history). */
    __driveResizeStairWidth?: (
      roomId: string,
      stairId: string,
      deltaFt: number,
    ) => void;
    /** Activate stair tool with default config (toolbar bypass). */
    __driveSetStairTool?: () => void;
    /** Read all stair IDs in a room (Object.keys). */
    __listStairIds?: (roomId: string) => string[];
    /**
     * D-04 origin-asymmetry verifier (E2): given a candidate cursor at
     * `cursorBottomCenter` (feet), the stair tool's pre-snap translation
     * pushes to bbox-center along the rotated UP axis by totalRunFt/2.
     * This driver exposes the post-snap bottom-step center given a (cursor,
     * config, snappedBboxCenter) triple, so e2e can assert the bottom-step
     * edge sits flush against a wall after smart-snap.
     */
    __computeStairBottomCenterFromSnappedBbox?: (
      snappedBboxCenter: Point,
      rotationDeg: number,
      totalRunFt: number,
    ) => Point;
    /** Open the context menu on a stair node (mimics right-click handler). */
    __driveOpenStairContextMenu?: (
      stairId: string,
      pos: { x: number; y: number },
    ) => void;
    /** Programmatically select a stair (mirrors Phase 54 click-to-select). */
    __driveSelectStair?: (stairId: string) => string[];
  }
}

export function installStairDrivers(): void {
  if (typeof window === "undefined") return;
  if (import.meta.env.MODE !== "test") return;

  window.__drivePlaceStair = (roomId, position, partial) => {
    return useCADStore.getState().addStair(roomId, { position, ...partial });
  };

  window.__getStairCount = (roomId) => {
    const stairs = useCADStore.getState().rooms[roomId]?.stairs ?? {};
    return Object.keys(stairs).length;
  };

  window.__getStairConfig = (roomId, stairId) => {
    return useCADStore.getState().rooms[roomId]?.stairs?.[stairId] ?? null;
  };

  window.__driveResizeStairWidth = (roomId, stairId, deltaFt) => {
    const s = useCADStore.getState().rooms[roomId]?.stairs?.[stairId];
    if (!s) return;
    const newWidth = (s.widthFtOverride ?? 3) + deltaFt;
    useCADStore.getState().resizeStairWidth(roomId, stairId, newWidth);
  };

  window.__driveSetStairTool = () => {
    setPendingStair({
      rotation: 0,
      widthFt: 3,
      stepCount: 12,
      riseIn: 7,
      runIn: 11,
    });
    useUIStore.getState().setTool("stair");
  };

  window.__listStairIds = (roomId) => {
    const stairs = useCADStore.getState().rooms[roomId]?.stairs ?? {};
    return Object.keys(stairs);
  };

  window.__driveOpenStairContextMenu = (stairId, pos) => {
    useUIStore.getState().openContextMenu("stair", stairId, pos);
  };

  window.__driveSelectStair = (stairId) => {
    useUIStore.getState().select([stairId]);
    return useUIStore.getState().selectedIds;
  };

  window.__computeStairBottomCenterFromSnappedBbox = (
    snappedBboxCenter,
    rotationDeg,
    totalRunFt,
  ) => {
    // Mirror the inverse translation from stairTool.ts:
    // commitBottomCenter = snappedBboxCenter - UP * (totalRunFt / 2).
    // UP at rotation=0 is (0, -1); rotation rotates +y CCW in 2D feet space.
    const r = (rotationDeg * Math.PI) / 180;
    const upX = -Math.sin(r);
    const upY = -Math.cos(r);
    const halfRun = totalRunFt / 2;
    return {
      x: snappedBboxCenter.x - upX * halfRun,
      y: snappedBboxCenter.y - upY * halfRun,
    };
  };
}

export {};
