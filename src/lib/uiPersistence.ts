/**
 * Typed localStorage helpers for UI chrome persistence (Phase 33).
 * Keys use the `ui:*` namespace to separate from CAD data (which is in IndexedDB).
 *
 * Shared consumers:
 * - Plan 04 (GH #84): `ui:propertiesPanel:sections` (readUIObject/writeUIObject)
 * - Plan 07 (gesture chip): `ui:gestureChip:dismissed` (readUIBool/writeUIBool)
 *
 * All helpers are SSR-safe and swallow localStorage errors (quota, privacy mode).
 */

/**
 * Read a JSON object from localStorage. Returns `{}` if the key is missing,
 * the value is invalid JSON, or parsing yields a non-object.
 */
export function readUIObject<T extends Record<string, unknown>>(key: string): T {
  if (typeof window === "undefined") return {} as T;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {} as T;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as T)
      : ({} as T);
  } catch {
    return {} as T;
  }
}

/**
 * Write a JSON object to localStorage. Silently no-ops on quota/error.
 */
export function writeUIObject(key: string, value: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* no-op on quota / privacy mode */
  }
}

/**
 * Read a single boolean flag from localStorage (for dismiss-style flags).
 * Returns `false` when the key is missing or not the string "true".
 */
export function readUIBool(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

/**
 * Write a single boolean flag to localStorage. Silently no-ops on error.
 */
export function writeUIBool(key: string, value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value ? "true" : "false");
  } catch {
    /* no-op */
  }
}
