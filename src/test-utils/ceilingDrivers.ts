// src/test-utils/ceilingDrivers.ts
// Phase 65 CEIL-02 (D-12): window-level drivers for ceiling-resize
// introspection + history probing. Gated by import.meta.env.MODE === "test";
// production no-op.

import { useCADStore, getActiveRoomDoc } from "@/stores/cadStore";
import { polygonBbox, resolveCeilingPoints } from "@/lib/geometry";
import type { Point } from "@/types/cad";

declare global {
  interface Window {
    /** Place a rectangular ceiling and return its id. */
    __drivePlaceCeiling?: (points: Point[], heightFt?: number) => string;
    /** Programmatically resize a ceiling axis (history-pushing). */
    __driveCeilingResizeAxis?: (
      ceilingId: string,
      axis: "width" | "depth",
      valueFt: number,
      anchor?: number,
    ) => void;
    /** Read the bbox of a ceiling's resolved (post-override) polygon. */
    __getCeilingBbox?: (ceilingId: string) => {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
      width: number;
      depth: number;
    } | null;
    /** Read the resolved (post-override) point list of a ceiling. */
    __getCeilingResolvedPoints?: (ceilingId: string) => Point[] | null;
    /** Read all 4 override fields. */
    __getCeilingOverrides?: (ceilingId: string) =>
      | {
          widthFtOverride: number | undefined;
          depthFtOverride: number | undefined;
          anchorXFt: number | undefined;
          anchorYFt: number | undefined;
        }
      | null;
    /** Read the cadStore past[].length (history depth). */
    __getCeilingHistoryLength?: () => number;
    /** Clear all 4 override fields (history-pushing). */
    __driveClearCeilingOverrides?: (ceilingId: string) => void;
  }
}

export function installCeilingDrivers(): void {
  if (typeof window === "undefined") return;
  if (import.meta.env.MODE !== "test") return;

  window.__drivePlaceCeiling = (points, heightFt = 8) => {
    return useCADStore.getState().addCeiling(points, heightFt);
  };

  window.__driveCeilingResizeAxis = (ceilingId, axis, valueFt, anchor) => {
    useCADStore.getState().resizeCeilingAxis(ceilingId, axis, valueFt, anchor);
  };

  window.__getCeilingBbox = (ceilingId) => {
    const doc = getActiveRoomDoc();
    const ceiling = doc?.ceilings?.[ceilingId];
    if (!ceiling) return null;
    const pts = resolveCeilingPoints(ceiling);
    return polygonBbox(pts);
  };

  window.__getCeilingResolvedPoints = (ceilingId) => {
    const doc = getActiveRoomDoc();
    const ceiling = doc?.ceilings?.[ceilingId];
    if (!ceiling) return null;
    return resolveCeilingPoints(ceiling).map((p) => ({ x: p.x, y: p.y }));
  };

  window.__getCeilingOverrides = (ceilingId) => {
    const doc = getActiveRoomDoc();
    const ceiling = doc?.ceilings?.[ceilingId];
    if (!ceiling) return null;
    return {
      widthFtOverride: ceiling.widthFtOverride,
      depthFtOverride: ceiling.depthFtOverride,
      anchorXFt: ceiling.anchorXFt,
      anchorYFt: ceiling.anchorYFt,
    };
  };

  window.__getCeilingHistoryLength = () => useCADStore.getState().past.length;

  window.__driveClearCeilingOverrides = (ceilingId) => {
    useCADStore.getState().clearCeilingOverrides(ceilingId);
  };
}

export {};
