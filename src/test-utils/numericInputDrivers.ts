// src/test-utils/numericInputDrivers.ts
// Phase 85 D-05: test-mode driver for numeric inspector inputs.
//
// Gated by import.meta.env.MODE === "test". StrictMode-safe via identity-check
// cleanup (CLAUDE.md §7 — Phase 58 + Phase 64 trap).
//
// Used by Plan 85-02 (ProductInspector) + Plan 85-03 (CustomElementInspector)
// to drive numeric W/D/H/X/Y inputs from tests. The inspector components call
// `installNumericInputDrivers()` in a useEffect and invoke the returned
// cleanup on unmount.
//
// Contract: __driveNumericInput(testid, value) finds the input via
// data-testid, sets .value to the stringified number, dispatches an "input"
// event (so React reads the new value), then dispatches a "blur" event
// (so the inspector commits on the standard commit-on-blur path).

declare global {
  interface Window {
    __driveNumericInput?: (testid: string, value: number) => void;
  }
}

/**
 * Install window.__driveNumericInput. Returns a cleanup fn that clears
 * the global ONLY if the current driver identity matches the one this
 * call installed (identity check — guards against StrictMode double-mount
 * clobbering a remount's registration per CLAUDE.md §7).
 *
 * Production (MODE !== "test"): no-op + cleanup is also a no-op.
 */
export function installNumericInputDrivers(): () => void {
  if (typeof window === "undefined") return () => {};
  if (import.meta.env.MODE !== "test") return () => {};

  const driver = (testid: string, value: number) => {
    const el = document.querySelector(
      `[data-testid="${testid}"]`,
    ) as HTMLInputElement | null;
    if (!el) {
      throw new Error(
        `__driveNumericInput: no element with data-testid="${testid}"`,
      );
    }
    el.focus();
    // React tracks input values via a property descriptor — set via the
    // native setter so React's onChange fires correctly.
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;
    if (nativeSetter) nativeSetter.call(el, String(value));
    else el.value = String(value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
  };

  window.__driveNumericInput = driver;
  return () => {
    if (window.__driveNumericInput === driver) {
      window.__driveNumericInput = undefined;
    }
  };
}

export {};
