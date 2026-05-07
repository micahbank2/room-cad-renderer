// tests/useTheme.test.tsx
// Wave 0 — Plan 71-00: RED test scaffold for useTheme hook.
// Implements TOKEN-FOUNDATION test contract per D-07, D-08.
//
// The hook this file imports does NOT exist yet. These tests will fail with
// "Cannot find module" or import errors — that is intentional. Plan 71-01
// implements useTheme and turns these GREEN.
//
// Each test documents one behavioral requirement for the hook. The failure
// of the test suite IS the contract lock — no implementation can silently
// diverge from what is specified here.
//
// Storage key: "room-cad-theme"
// Possible values: "light" | "dark" | "system" (default "system")
// On resolved change: adds/removes "dark" class on document.documentElement

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTheme } from "@/hooks/useTheme";

// ---------------------------------------------------------------------------
// matchMedia mock factory
// ---------------------------------------------------------------------------

function makeMatchMedia(matches: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];

  const mql: MediaQueryList = {
    matches,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
      if (type === "change") {
        listeners.push(listener as (e: MediaQueryListEvent) => void);
      }
    }),
    removeEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
      if (type === "change") {
        const idx = listeners.indexOf(listener as (e: MediaQueryListEvent) => void);
        if (idx !== -1) listeners.splice(idx, 1);
      }
    }),
    dispatchEvent: vi.fn(),
  };

  // Expose a helper so tests can fire a change event.
  const fireChange = (newMatches: boolean) => {
    const evt = { matches: newMatches, media: mql.media } as MediaQueryListEvent;
    listeners.forEach((fn) => fn(evt));
  };

  return { mql, fireChange, listeners };
}

// ---------------------------------------------------------------------------
// beforeEach / afterEach — reset shared global state between tests
// ---------------------------------------------------------------------------

const STORAGE_KEY = "room-cad-theme";

beforeEach(() => {
  // Clear persisted theme so each test starts from a clean slate.
  localStorage.removeItem(STORAGE_KEY);
  // Remove "dark" class so tests that check html.classList start clean.
  document.documentElement.classList.remove("dark");
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useTheme — default state", () => {
  it("Test 1: default theme is 'system' when localStorage is empty", () => {
    const { mql } = makeMatchMedia(false);
    vi.spyOn(window, "matchMedia").mockReturnValue(mql);

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("system");
  });
});

describe("useTheme — setTheme persistence and resolved value", () => {
  it("Test 2: setTheme('dark') writes 'dark' to localStorage and resolved becomes 'dark'", () => {
    const { mql } = makeMatchMedia(false);
    vi.spyOn(window, "matchMedia").mockReturnValue(mql);

    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("dark");
    });

    expect(localStorage.getItem(STORAGE_KEY)).toBe("dark");
    expect(result.current.resolved).toBe("dark");
  });

  it("Test 3: setTheme('light') writes 'light', resolved is 'light', html does NOT have class 'dark'", () => {
    const { mql } = makeMatchMedia(true); // OS says dark, but explicit 'light' overrides
    vi.spyOn(window, "matchMedia").mockReturnValue(mql);

    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("light");
    });

    expect(localStorage.getItem(STORAGE_KEY)).toBe("light");
    expect(result.current.resolved).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

describe("useTheme — system mode resolution via matchMedia", () => {
  it("Test 4: setTheme('system') + matchMedia.matches=true → resolved is 'dark', html has class 'dark'", () => {
    const { mql } = makeMatchMedia(true);
    vi.spyOn(window, "matchMedia").mockReturnValue(mql);

    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("system");
    });

    expect(result.current.resolved).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("Test 5: setTheme('system') + matchMedia.matches=false → resolved is 'light', html does NOT have class 'dark'", () => {
    const { mql } = makeMatchMedia(false);
    vi.spyOn(window, "matchMedia").mockReturnValue(mql);

    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("system");
    });

    expect(result.current.resolved).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

describe("useTheme — OS preference change event watcher", () => {
  it("Test 6: prefers-color-scheme change event → resolved updates without explicit setTheme call (when theme === 'system')", () => {
    const { mql, fireChange } = makeMatchMedia(false); // starts light
    vi.spyOn(window, "matchMedia").mockReturnValue(mql);

    const { result } = renderHook(() => useTheme());

    // Initial state: system, OS says light → resolved 'light'
    expect(result.current.resolved).toBe("light");

    // OS flips to dark
    act(() => {
      fireChange(true);
    });

    expect(result.current.resolved).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});

describe("useTheme — localStorage initial read", () => {
  it("Test 7: initial render reads stored 'light' from localStorage → resolved is 'light' on first render", () => {
    localStorage.setItem(STORAGE_KEY, "light");

    const { mql } = makeMatchMedia(true); // OS says dark, but stored is 'light'
    vi.spyOn(window, "matchMedia").mockReturnValue(mql);

    const { result } = renderHook(() => useTheme());

    // Must reflect stored preference, not OS preference
    expect(result.current.theme).toBe("light");
    expect(result.current.resolved).toBe("light");
  });
});

describe("useTheme — cleanup on unmount", () => {
  it("Test 8: matchMedia event listener is removed on unmount (no leaked listeners)", () => {
    const { mql } = makeMatchMedia(false);
    vi.spyOn(window, "matchMedia").mockReturnValue(mql);

    const { unmount } = renderHook(() => useTheme());

    // Listener should be registered while mounted
    expect(mql.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));

    unmount();

    // After unmount, removeEventListener must have been called for the same fn
    expect(mql.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    // The function passed to removeEventListener must be the same reference
    // as the one passed to addEventListener (identity check).
    const addedFn = (mql.addEventListener as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => c[0] === "change",
    )?.[1];
    const removedFn = (mql.removeEventListener as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => c[0] === "change",
    )?.[1];
    expect(addedFn).toBeDefined();
    expect(removedFn).toBeDefined();
    expect(addedFn).toBe(removedFn);
  });
});
