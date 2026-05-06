// src/test-utils/openingDrivers.ts
// Phase 61 OPEN-01 (D-12): window-level drivers for placement + introspection.
// Gated by import.meta.env.MODE === "test"; production no-op.
import { useCADStore, getActiveRoomDoc } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { getActionsForKind } from "@/components/CanvasContextMenu";
import { getOpeningDefaults, clampNicheDepth } from "@/types/cad";

declare global {
  interface Window {
    /** Place an archway on a wall at the given offset (ft); returns the new opening id. */
    __drivePlaceArchway?: (wallId: string, offsetFt: number) => string | null;
    /** Place a passthrough on a wall at the given offset (ft); returns the new opening id. */
    __drivePlacePassthrough?: (wallId: string, offsetFt: number) => string | null;
    /** Place a niche on a wall at the given offset (ft); optional override depth (ft). */
    __drivePlaceNiche?: (wallId: string, offsetFt: number, depthFt?: number) => string | null;
    /** Read an opening's kind. */
    __getOpeningKind?: (
      wallId: string,
      openingId: string,
    ) => "door" | "window" | "archway" | "passthrough" | "niche" | null;
    /** Read a niche's clamped depth in feet (null if not a niche or not found). */
    __getNicheDepth?: (wallId: string, openingId: string) => number | null;
    /** Phase 61: read the action count for a given context-menu kind. */
    __getOpeningContextActionCount?: () => number;
    /** Phase 61: open a 'opening' context menu (pure store dispatch). */
    __driveOpenOpeningContextMenu?: (wallId: string, openingId: string) => void;
  }
}

function findLatestOpeningId(wallId: string): string | null {
  const doc = getActiveRoomDoc();
  if (!doc) return null;
  const wall = doc.walls[wallId];
  if (!wall || wall.openings.length === 0) return null;
  return wall.openings[wall.openings.length - 1].id;
}

export function installOpeningDrivers(): void {
  if (typeof window === "undefined") return;
  if (import.meta.env.MODE !== "test") return;

  window.__drivePlaceArchway = (wallId, offsetFt) => {
    const d = getOpeningDefaults("archway");
    useCADStore.getState().addOpening(wallId, {
      type: "archway",
      offset: offsetFt,
      width: d.width,
      height: d.height,
      sillHeight: d.sillHeight,
    });
    return findLatestOpeningId(wallId);
  };

  window.__drivePlacePassthrough = (wallId, offsetFt) => {
    const doc = getActiveRoomDoc();
    const wallH = doc?.walls[wallId]?.height ?? 8;
    const d = getOpeningDefaults("passthrough", wallH);
    useCADStore.getState().addOpening(wallId, {
      type: "passthrough",
      offset: offsetFt,
      width: d.width,
      height: d.height,
      sillHeight: d.sillHeight,
    });
    return findLatestOpeningId(wallId);
  };

  window.__drivePlaceNiche = (wallId, offsetFt, depthFt) => {
    const doc = getActiveRoomDoc();
    const wall = doc?.walls[wallId];
    if (!wall) return null;
    const d = getOpeningDefaults("niche");
    const rawDepth = depthFt ?? d.depthFt ?? 0.5;
    const clamped = clampNicheDepth(rawDepth, wall.thickness);
    useCADStore.getState().addOpening(wallId, {
      type: "niche",
      offset: offsetFt,
      width: d.width,
      height: d.height,
      sillHeight: d.sillHeight,
      depthFt: clamped,
    });
    return findLatestOpeningId(wallId);
  };

  window.__getOpeningKind = (wallId, openingId) => {
    const doc = getActiveRoomDoc();
    const wall = doc?.walls[wallId];
    if (!wall) return null;
    const op = wall.openings.find((o) => o.id === openingId);
    return op?.type ?? null;
  };

  window.__getNicheDepth = (wallId, openingId) => {
    const doc = getActiveRoomDoc();
    const wall = doc?.walls[wallId];
    if (!wall) return null;
    const op = wall.openings.find((o) => o.id === openingId);
    if (!op || op.type !== "niche") return null;
    return op.depthFt ?? null;
  };

  window.__driveOpenOpeningContextMenu = (wallId, openingId) => {
    useUIStore.getState().openContextMenu(
      "opening",
      openingId,
      { x: 100, y: 100 },
      wallId,
    );
  };

  window.__getOpeningContextActionCount = () => {
    // Returns the number of actions that getActionsForKind('opening', ..., parentId)
    // produces. Caller should pre-place an opening so the lookup returns valid
    // doc context; with a fake nodeId the action count is still 4 (the actions
    // are all functional handlers, not gated on nodeId existence).
    const actions = getActionsForKind("opening", "fake-id", "fake-wall");
    return actions.length;
  };
}

export {};
