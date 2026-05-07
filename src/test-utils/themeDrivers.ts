// src/test-utils/themeDrivers.ts
// Phase 71 — TOKEN-FOUNDATION
// Test driver for the useTheme hook.
//
// registerThemeSetter: called from App.tsx useEffect; returns identity-checked cleanup.
//   StrictMode safety (CLAUDE.md #7, Phase 64 acc2): cleanup only nulls the module-level
//   ref if the closed-over fn === the current ref, preventing a stale first-mount ref
//   from clobbering the live second-mount registration.
//
// installThemeDrivers: installs window.__driveTheme (test mode only).
//   Called from main.tsx alongside other install* functions.

import type { ThemeChoice } from "@/hooks/useTheme";

declare global {
  interface Window {
    __driveTheme?: (theme: ThemeChoice) => void;
  }
}

let setterRef: ((t: ThemeChoice) => void) | null = null;

/** Register the theme setter and return an identity-checked unregister function.
 *  Called from App.tsx inside a useEffect so the cleanup runs on unmount.
 *  Phase 64 acc2 pattern: if (setterRef === fn) prevents StrictMode double-mount clobber. */
export function registerThemeSetter(fn: (t: ThemeChoice) => void): () => void {
  setterRef = fn;
  return () => {
    // Identity check: only clear the ref if it is still the fn we registered.
    // This prevents the first-mount cleanup (fired by React StrictMode) from
    // nulling the second-mount registration.
    if (setterRef === fn) setterRef = null;
  };
}

/** Install window.__driveTheme — no-op unless import.meta.env.MODE === "test". */
export function installThemeDrivers(): void {
  if (import.meta.env.MODE !== "test") return;
  window.__driveTheme = (theme: ThemeChoice) => {
    if (setterRef) setterRef(theme);
  };
}
