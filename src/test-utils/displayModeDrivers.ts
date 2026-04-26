// src/test-utils/displayModeDrivers.ts
// Phase 47: window-level drivers for e2e + RTL access. Gated by MODE === "test".
// Plan 02 fills the bodies; Plan 01 declares the API.

declare global {
  interface Window {
    __driveDisplayMode?: (mode: "normal" | "solo" | "explode") => void;
    __getDisplayMode?: () => "normal" | "solo" | "explode";
  }
}

export function installDisplayModeDrivers(): void {
  if (typeof window === "undefined") return;
  if (import.meta.env.MODE !== "test") return;
  const unimpl = (name: string) => () => {
    throw new Error(`displayModeDrivers.${name} unimplemented — Plan 47-02 wires this`);
  };
  window.__driveDisplayMode = unimpl("driveDisplayMode") as Window["__driveDisplayMode"];
  window.__getDisplayMode = (() => {
    throw new Error("displayModeDrivers.getDisplayMode unimplemented — Plan 47-02 wires this");
  }) as Window["__getDisplayMode"];
}

export {};
