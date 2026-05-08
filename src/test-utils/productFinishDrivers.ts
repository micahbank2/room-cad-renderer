/**
 * Phase 69 MAT-LINK-01: test driver for product finish application.
 * Mirrors src/test-utils/themeDrivers.ts identity-check cleanup pattern.
 * Gated by import.meta.env.MODE === "test".
 */
import { useCADStore } from "@/stores/cadStore";

export interface ProductFinishDriver {
  apply(placedId: string, materialId: string | undefined): void;
}

declare global {
  interface Window {
    __driveProductFinish?: ProductFinishDriver;
  }
}

export function installProductFinishDrivers(): () => void {
  if (import.meta.env.MODE !== "test") return () => {};
  if (typeof window === "undefined") return () => {};
  const driver: ProductFinishDriver = {
    apply(placedId, materialId) {
      useCADStore.getState().applyProductFinish(placedId, materialId);
    },
  };
  window.__driveProductFinish = driver;
  return () => {
    // Identity-check cleanup (CLAUDE.md StrictMode-safe pattern).
    if (window.__driveProductFinish === driver) {
      window.__driveProductFinish = undefined;
    }
  };
}
