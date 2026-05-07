import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { readUIObject, writeUIObject } from "@/lib/uiPersistence";
import { springTransition } from "@/lib/motion";

const STORAGE_KEY = "ui:propertiesPanel:sections";

/**
 * Phase 72 Plan 03 — PanelSection
 *
 * Replacement for CollapsibleSection with proper spring-animated height via
 * motion/react AnimatePresence + chevron rotation. Persists open/closed to the
 * SAME localStorage key as CollapsibleSection for backward continuity.
 *
 * Props are identical to CollapsibleSection so callers can swap 1-for-1:
 *   { id, label, children, defaultOpen? }
 *
 * Decisions:
 *  - D-12: AnimatePresence initial={false} prevents animation on first mount
 *  - D-13: entire header row is the click target (not just the chevron)
 *  - D-14: data-panel-id replaces data-collapsible-id
 *  - D-02: all animation gated on useReducedMotion()
 */
export function PanelSection({
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

  return (
    <div data-panel-id={id} className="group">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 py-1 text-muted-foreground hover:text-foreground"
        aria-expanded={open}
        aria-label={label}
      >
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={springTransition(reduced)}
          style={{ display: "flex", alignItems: "center" }}
        >
          <ChevronRight
            size={12}
            className="text-muted-foreground/60 group-hover:text-accent"
          />
        </motion.span>
        <span className="font-sans text-sm font-medium">{label}</span>
      </button>

      {/* CRITICAL: initial={false} prevents animation on first mount (Pitfall 1) */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={springTransition(reduced)}
            style={{ overflow: "hidden" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Phase 72 Plan 03 — test driver (gated, mirrors __driveCollapsibleSection contract)
if (import.meta.env.MODE === "test" && typeof window !== "undefined") {
  (window as unknown as {
    __drivePanelSection?: {
      getPersisted: () => Record<string, boolean>;
      getOpen: (id: string) => boolean;
      toggle: (id: string) => void;
    };
  }).__drivePanelSection = {
    getPersisted: () => readUIObject<Record<string, boolean>>(STORAGE_KEY),
    getOpen: (id: string) => {
      const el = document.querySelector(`[data-panel-id="${id}"]`);
      const btn = el?.querySelector("button");
      return btn?.getAttribute("aria-expanded") === "true";
    },
    toggle: (id: string) => {
      const el = document.querySelector(`[data-panel-id="${id}"]`);
      const btn = el?.querySelector("button") as HTMLButtonElement | null;
      btn?.click();
    },
  };
}
