import { useEffect, useState } from "react";

/**
 * Returns `true` when the user has requested reduced motion via OS settings.
 * Subscribes to matchMedia changes — re-renders when the preference changes.
 * Phase 33 D-39: required guard for every new animation in Wave 2/3.
 *
 * SSR-safe: guards on `typeof window !== "undefined"` and `window.matchMedia`
 * availability so server renders don't crash.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}
