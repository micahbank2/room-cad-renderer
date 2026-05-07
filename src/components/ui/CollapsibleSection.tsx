import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { readUIObject, writeUIObject } from "@/lib/uiPersistence";

const STORAGE_KEY = "ui:propertiesPanel:sections";

/**
 * Phase 33 D-06/D-07/D-08/D-09 (GH #84): Collapsible section wrapper for
 * PropertiesPanel. Persists open state to localStorage per section ID.
 * Defaults to open on first visit. Respects prefers-reduced-motion.
 *
 * Scope boundary: this primitive is used ONLY by PropertiesPanel. The inline
 * CollapsibleSection in Sidebar.tsx (pre-Phase-33) is intentionally left alone.
 */
export function CollapsibleSection({
  id,
  label,
  children,
  defaultOpen = true,
}: {
  id: string;
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState<boolean>(() => {
    const state = readUIObject<Record<string, boolean>>(STORAGE_KEY);
    return state[id] ?? defaultOpen;
  });

  useEffect(() => {
    const state = readUIObject<Record<string, boolean>>(STORAGE_KEY);
    state[id] = open;
    writeUIObject(STORAGE_KEY, state);
  }, [id, open]);

  const chevronTransition = reduced ? "none" : "transform 150ms ease-out";
  const heightTransition = reduced ? "none" : "max-height 200ms ease-out";

  return (
    <div data-collapsible-id={id} className="group">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 py-1 text-muted-foreground hover:text-foreground"
        aria-expanded={open}
        aria-label={label}
      >
        {open ? (
          <ChevronDown
            size={12}
            className="text-muted-foreground/60 group-hover:text-accent"
            style={{ transition: chevronTransition }}
          />
        ) : (
          <ChevronRight
            size={12}
            className="text-muted-foreground/60 group-hover:text-accent"
            style={{ transition: chevronTransition }}
          />
        )}
        <span className="font-sans text-sm font-medium">{label}</span>
      </button>
      <div
        style={{
          maxHeight: open ? 9999 : 0,
          overflow: "hidden",
          transition: heightTransition,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Phase 33 Plan 04 — test driver (gated, mirrors Plan 00 README contract).
if (import.meta.env.MODE === "test" && typeof window !== "undefined") {
  (window as unknown as {
    __driveCollapsibleSection?: {
      getPersisted: () => Record<string, boolean>;
      getOpen: (id: string) => boolean;
      toggle: (id: string) => void;
    };
  }).__driveCollapsibleSection = {
    getPersisted: () => readUIObject<Record<string, boolean>>(STORAGE_KEY),
    getOpen: (id: string) => {
      const el = document.querySelector(`[data-collapsible-id="${id}"]`);
      const btn = el?.querySelector("button");
      return btn?.getAttribute("aria-expanded") === "true";
    },
    toggle: (id: string) => {
      const el = document.querySelector(`[data-collapsible-id="${id}"]`);
      const btn = el?.querySelector("button") as HTMLButtonElement | null;
      btn?.click();
    },
  };
}
