import { useState } from "react";
import { X } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { readUIBool, writeUIBool } from "@/lib/uiPersistence";

/**
 * Phase 33 GH #86 — GestureChip
 *
 * Persistent gesture affordance chip shown in bottom-left of both 2D and 3D
 * canvas viewports. Different copy per mode (D-16 Copywriting Contract).
 * Dismissible with X button; dismissal persists across reloads via
 * localStorage. Hides during active 2D drag via the Plan 06 uiStore bridge
 * (D-15 + D-18).
 *
 * Known limitation: 3D orbit drags do NOT set uiStore.isDragging (that bridge
 * is wired only for the 2D selectTool), so the chip stays visible during
 * 3D rotation. Acceptable per D-18 scope; future enhancement if it becomes
 * noisy in practice.
 */

const DISMISS_KEY = "ui:gestureChip:dismissed";

const COPY_2D = "Drag to pan  \u2022  Wheel to zoom";
const COPY_3D = "L-drag rotate  \u2022  R-drag pan  \u2022  Wheel zoom";

export function GestureChip({ mode }: { mode: "2d" | "3d" }) {
  const isDragging = useUIStore((s) => s.isDragging);
  const [dismissed, setDismissed] = useState<boolean>(() => readUIBool(DISMISS_KEY));

  if (dismissed || isDragging) return null;

  function handleDismiss() {
    writeUIBool(DISMISS_KEY, true);
    setDismissed(true);
  }

  const text = mode === "2d" ? COPY_2D : COPY_3D;

  return (
    <div
      className="glass-panel rounded-lg px-2 py-1 flex items-center gap-2 text-text-dim font-mono text-sm absolute bottom-2 left-2 z-10 pointer-events-auto"
      data-gesture-chip-mode={mode}
    >
      <span>{text}</span>
      <button
        type="button"
        onClick={handleDismiss}
        className="text-text-ghost hover:text-text-muted"
        aria-label="Dismiss gesture hint"
      >
        <X size={10} />
      </button>
    </div>
  );
}

// Test driver — gated to test mode only
if (import.meta.env.MODE === "test") {
  (window as any).__driveGestureChip = {
    isVisible: () => !!document.querySelector("[data-gesture-chip-mode]"),
    getMode: (): "2d" | "3d" | null => {
      const el = document.querySelector("[data-gesture-chip-mode]");
      return (el?.getAttribute("data-gesture-chip-mode") as "2d" | "3d") ?? null;
    },
    dismiss: () => {
      const btn = document.querySelector(
        '[aria-label="Dismiss gesture hint"]',
      ) as HTMLButtonElement | null;
      btn?.click();
    },
    getPersistedDismissed: () => readUIBool(DISMISS_KEY),
  };
}
