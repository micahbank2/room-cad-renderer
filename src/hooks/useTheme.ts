// src/hooks/useTheme.ts
// Phase 71 — TOKEN-FOUNDATION
// useTheme hook: manages light/dark/system theme preference.
// Persists to localStorage under key "room-cad-theme".
// Applies/removes "dark" class on document.documentElement.
// Mirrors useReducedMotion.ts for the matchMedia listener pattern.

import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "room-cad-theme";
export type ThemeChoice = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export function useTheme(): {
  theme: ThemeChoice;
  resolved: ResolvedTheme;
  setTheme: (t: ThemeChoice) => void;
} {
  // Default to "light" for new users (no stored choice).
  // Existing users with a stored preference keep their choice.
  const [theme, setThemeState] = useState<ThemeChoice>(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
    return "light";
  });

  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Subscribe to OS preference — mirrors useReducedMotion pattern.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const resolved: ResolvedTheme = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  // Apply <html class="dark"> from effect, never from render path.
  useEffect(() => {
    const html = document.documentElement;
    if (resolved === "dark") html.classList.add("dark");
    else html.classList.remove("dark");
  }, [resolved]);

  const setTheme = useCallback((t: ThemeChoice) => {
    try { localStorage.setItem(STORAGE_KEY, t); } catch { /* ignore quota errors */ }
    setThemeState(t);
  }, []);

  return { theme, resolved, setTheme };
}
