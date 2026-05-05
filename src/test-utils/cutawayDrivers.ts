// src/test-utils/cutawayDrivers.ts
// Phase 59 CUTAWAY-01: window-level drivers for e2e + test access.
// Gated by import.meta.env.MODE === "test"; production no-op.

import { useUIStore } from "@/stores/uiStore";

declare global {
  interface Window {
    /** Read auto-detected cutaway wall id for a given room. */
    __getCutawayWallId?: (roomId: string) => string | null;
    /** Set cutawayMode (toolbar Cutaway button bypass). */
    __driveSetCutawayMode?: (mode: "off" | "auto") => void;
    /** Read current cutawayMode. */
    __getCutawayMode?: () => "off" | "auto";
    /** Toggle a wall's manual-cutaway state (right-click bypass). */
    __toggleCutawayManualWall?: (wallId: string) => void;
    /** Read whether a wall is in cutawayManualWallIds. */
    __isCutawayManualWall?: (wallId: string) => boolean;
    /**
     * Best-effort opacity readout for a wall's BASE meshStandardMaterial.
     * Returns 0.15 when ghosted, 1.0 when opaque, null if mesh not found
     * or not yet mounted. Not authoritative for overlay (wallpaper, art)
     * material sites — those mirror the same opacity but each have their
     * own R3F-managed material instance.
     *
     * Implementation: derives the EXPECTED opacity by reading uiStore +
     * looking up the wall's room id. Avoids reaching into the R3F scene
     * graph (which would couple tests to internals).
     */
    __getWallExpectedOpacity?: (wallId: string, roomId: string) => number;
    /** Phase 5.1 cameraMode setter (walk-mode E5 test). */
    __driveSetCameraMode?: (mode: "orbit" | "walk") => void;
    /** Phase 59: diagnostic — read live camera elevation (asin(-fwd.y)) for debugging E4. */
    __getCameraElevationRad?: () => number | null;
  }
}

/** Phase 59: install cutaway test drivers. Production no-op. */
export function installCutawayDrivers(): void {
  if (typeof window === "undefined") return;
  if (import.meta.env.MODE !== "test") return;

  window.__driveSetCutawayMode = (mode) => {
    useUIStore.getState().setCutawayMode(mode);
  };

  window.__getCutawayMode = () => {
    return useUIStore.getState().cutawayMode;
  };

  window.__getCutawayWallId = (roomId) => {
    return useUIStore.getState().cutawayAutoDetectedWallId.get(roomId) ?? null;
  };

  window.__toggleCutawayManualWall = (wallId) => {
    useUIStore.getState().toggleCutawayManualWall(wallId);
  };

  window.__isCutawayManualWall = (wallId) => {
    return useUIStore.getState().cutawayManualWallIds.has(wallId);
  };

  window.__getWallExpectedOpacity = (wallId, roomId) => {
    const s = useUIStore.getState();
    const cameraMode = s.cameraMode;
    if (cameraMode === "walk") return 1.0;
    const isManualGhosted = s.cutawayManualWallIds.has(wallId);
    const isAutoGhosted =
      s.cutawayMode === "auto" &&
      s.cutawayAutoDetectedWallId.get(roomId) === wallId;
    return isManualGhosted || isAutoGhosted ? 0.15 : 1.0;
  };

  window.__driveSetCameraMode = (mode) => {
    useUIStore.getState().setCameraMode(mode);
  };

  window.__getCameraElevationRad = () => {
    // Read camera pose via Phase 48 cameraCapture bridge (already test-mode-installed).
    const cap = useUIStore.getState().getCameraCapture?.();
    if (!cap) return null;
    const [px, py, pz] = cap.pos;
    const [tx, ty, tz] = cap.target;
    // Forward = (target - pos), normalized.
    const fx = tx - px;
    const fy = ty - py;
    const fz = tz - pz;
    const len = Math.sqrt(fx * fx + fy * fy + fz * fz);
    if (len < 1e-6) return null;
    const fwdYNormalized = fy / len;
    // elevation above horizon: looking horizontal → 0, looking down → π/2.
    return Math.asin(-fwdYNormalized);
  };
}

export {};
