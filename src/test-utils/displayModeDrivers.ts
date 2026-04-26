// src/test-utils/displayModeDrivers.ts
// Phase 47: window-level drivers for e2e + RTL access. Gated by MODE === "test".
import { useUIStore } from "@/stores/uiStore";

declare global {
  interface Window {
    __driveDisplayMode?: (mode: "normal" | "solo" | "explode") => void;
    __getDisplayMode?: () => "normal" | "solo" | "explode";
  }
}

/**
 * Phase 47: window-level drivers for e2e + test access.
 * Gated by import.meta.env.MODE === "test"; production no-op.
 */
export function installDisplayModeDrivers(): void {
  if (typeof window === "undefined") return;
  if (import.meta.env.MODE !== "test") return;

  window.__driveDisplayMode = (mode) => {
    useUIStore.getState().setDisplayMode(mode);
  };

  window.__getDisplayMode = () => {
    return useUIStore.getState().displayMode;
  };
}

export {};
