// src/test-utils/savedCameraDrivers.ts
// Phase 48: window-level drivers for e2e + RTL access. Gated by MODE === "test".
// Plan 03 fills the bodies; Plan 01 declares the API.

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
     * Phase 48 BLOCKER-2 fix: e2e needs to pick a valid product id without
     * hard-coding seed shape. Returns ids in the active room (empty if none).
     * Stub throws — Plan 03 fills the body.
     */
    __getActiveProductIds?: () => string[];
    /**
     * Phase 48 BLOCKER-2 fix: declared here so the e2e spec compiles.
     * Implementation is installed by ThreeViewport in Plan 02 Task 3 alongside
     * installCameraCapture — NOT by installSavedCameraDrivers — because
     * orbitControlsRef is module-local to ThreeViewport's Scene component.
     */
    __getCameraPose?: () => { position: [number, number, number]; target: [number, number, number] } | null;
  }
}

/**
 * Phase 48: install savedCamera test drivers. Production no-op.
 * Plan 01 declares the API with stub bodies that throw.
 * Plan 03 fills the bodies and wires main.tsx to call this.
 *
 * NOTE: __getCameraPose is NOT installed here — Plan 02 Task 3 installs it
 * inside ThreeViewport's Scene useEffect because orbitControlsRef is local
 * to that component.
 */
export function installSavedCameraDrivers(): void {
  if (typeof window === "undefined") return;
  if (import.meta.env.MODE !== "test") return;

  window.__driveSaveCamera = ((..._args: unknown[]) => {
    throw new Error("savedCameraDrivers.driveSaveCamera unimplemented — Plan 48-03 wires this");
  }) as Window["__driveSaveCamera"];

  window.__driveFocusNode = ((_id: string) => {
    throw new Error("savedCameraDrivers.driveFocusNode unimplemented — Plan 48-03 wires this");
  }) as Window["__driveFocusNode"];

  window.__getSavedCamera = ((..._args: unknown[]) => {
    throw new Error("savedCameraDrivers.getSavedCamera unimplemented — Plan 48-03 wires this");
  }) as Window["__getSavedCamera"];

  window.__getActiveProductIds = (() => {
    throw new Error("savedCameraDrivers.getActiveProductIds unimplemented — Plan 48-03 wires this");
  }) as Window["__getActiveProductIds"];
}

export {};
