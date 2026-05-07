// tests/themeDriver.test.tsx
// Wave 0 — Plan 71-00: RED test scaffold for themeDrivers module.
// Implements TOKEN-FOUNDATION driver scaffold per D-08,
// StrictMode safety per CLAUDE.md item #7 (Phase 64 acc2 identity-check pattern).
//
// The module this file imports does NOT exist yet. These tests will fail with
// "Cannot find module" or import errors — that is intentional. Plan 71-01
// implements themeDrivers and turns these GREEN.
//
// Contract this file locks:
//   registerThemeSetter(fn) → returns identity-checked unregister fn
//   installThemeDrivers()   → no-op in production; installs window.__driveTheme in test mode
//   window.__driveTheme(t)  → calls the registered setter (if any)
//
// StrictMode double-mount safety (CLAUDE.md #7, Phase 64 acc2):
//   Register fn A → register fn B → call A's cleanup → live ref is still B.
//   The identity check `if (setThemeRef === fn) setThemeRef = null` prevents
//   a stale first-mount ref from clobbering the live second-mount registration.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { registerThemeSetter, installThemeDrivers } from "@/test-utils/themeDrivers";

type ThemeChoice = "light" | "dark" | "system";

// ---------------------------------------------------------------------------
// beforeEach / afterEach — reset driver state between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Clear any installed driver so tests don't bleed into each other.
  delete (window as { __driveTheme?: unknown }).__driveTheme;
  // Unstub env in case a previous test stubbed it.
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
  delete (window as { __driveTheme?: unknown }).__driveTheme;
});

// ---------------------------------------------------------------------------
// Tests — installThemeDrivers environment gate
// ---------------------------------------------------------------------------

describe("installThemeDrivers — environment gate", () => {
  it("Test 1: outside test mode, installThemeDrivers() does NOT install window.__driveTheme", () => {
    vi.stubEnv("MODE", "production");

    installThemeDrivers();

    expect((window as { __driveTheme?: unknown }).__driveTheme).toBeUndefined();
  });

  it("Test 2: in test mode (MODE === 'test'), installThemeDrivers() installs window.__driveTheme", () => {
    vi.stubEnv("MODE", "test");

    installThemeDrivers();

    expect((window as { __driveTheme?: unknown }).__driveTheme).toBeTypeOf("function");
  });
});

// ---------------------------------------------------------------------------
// Tests — window.__driveTheme invokes the registered setter
// ---------------------------------------------------------------------------

describe("window.__driveTheme — invokes registered setter", () => {
  it("Test 3: __driveTheme('dark') invokes the registered setter and adds 'dark' class to html", () => {
    vi.stubEnv("MODE", "test");
    installThemeDrivers();

    document.documentElement.classList.remove("dark");

    // Register a setter that mimics what useTheme + App.tsx would register.
    const mockSetter = vi.fn((t: ThemeChoice) => {
      if (t === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    });

    const unregister = registerThemeSetter(mockSetter);

    (window as { __driveTheme?: (t: ThemeChoice) => void }).__driveTheme!("dark");

    expect(mockSetter).toHaveBeenCalledWith("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    unregister();
  });

  it("Test 4: __driveTheme('light') invokes the registered setter and removes 'dark' class", () => {
    vi.stubEnv("MODE", "test");
    installThemeDrivers();

    document.documentElement.classList.add("dark"); // start in dark

    const mockSetter = vi.fn((t: ThemeChoice) => {
      if (t === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    });

    const unregister = registerThemeSetter(mockSetter);

    (window as { __driveTheme?: (t: ThemeChoice) => void }).__driveTheme!("light");

    expect(mockSetter).toHaveBeenCalledWith("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    unregister();
    document.documentElement.classList.remove("dark");
  });
});

// ---------------------------------------------------------------------------
// Tests — StrictMode safety (Phase 64 acc2 identity-check pattern)
// ---------------------------------------------------------------------------

describe("registerThemeSetter — StrictMode double-mount safety", () => {
  it("Test 5: StrictMode double-mount — first cleanup called → second registration is the live one; __driveTheme uses fn B, not stale fn A", () => {
    vi.stubEnv("MODE", "test");
    installThemeDrivers();

    const fnA = vi.fn();
    const fnB = vi.fn();

    // Simulate React StrictMode: first mount registers fn A
    const cleanupA = registerThemeSetter(fnA);

    // StrictMode unmounts immediately → call fn A's cleanup
    cleanupA();

    // Second mount registers fn B (the live mount)
    registerThemeSetter(fnB);

    // __driveTheme should invoke fn B, not the stale fn A
    (window as { __driveTheme?: (t: ThemeChoice) => void }).__driveTheme!("dark");

    expect(fnB).toHaveBeenCalledWith("dark");
    // fn A must NOT be called — it was the discarded first-mount instance
    expect(fnA).not.toHaveBeenCalled();
  });

  it("Test 6: unregister via returned cleanup fn nulls the setter ONLY if identity matches (wrong fn reference → no-op)", () => {
    vi.stubEnv("MODE", "test");
    installThemeDrivers();

    const realSetter = vi.fn();
    const wrongFn = vi.fn();

    // Register the real setter
    registerThemeSetter(realSetter);

    // Attempt to unregister with a DIFFERENT function reference — must be no-op
    // (identity check: if (setThemeRef === wrongFn) — fails, so ref is preserved)
    const fakeCleanup = registerThemeSetter(wrongFn);

    // Re-register the real setter (simulating the real use case) and then
    // call the wrong cleanup; real setter should still be callable.
    registerThemeSetter(realSetter);
    fakeCleanup(); // clears wrongFn if it was the current ref (it was, via second call)

    // realSetter was the last registered; fakeCleanup only cleared wrongFn
    // (which was the ref at time of that registration call). After fakeCleanup,
    // realSetter is the live ref.
    //
    // This test verifies the identity-check semantics: cleanup only clears the
    // ref if the closure's fn matches the current module-level ref.
    (window as { __driveTheme?: (t: ThemeChoice) => void }).__driveTheme!("light");

    expect(realSetter).toHaveBeenCalledWith("light");
  });
});
