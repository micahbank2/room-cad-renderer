// src/components/Toolbar.WallCutoutsDropdown.tsx
// Phase 61 OPEN-01 (D-03, research Q7): Wall Cutouts dropdown popover.
// Mirrors WainscotPopover.tsx — fixed-position div, 3 dismiss hooks
// (mousedown click-outside, uiStore zoom/pan change, Escape), animated
// fade-in guarded by useReducedMotion (Phase 33 D-39).
//
// Phase 71 D-15: Material Symbols `arch` replaced with `Squircle` from lucide-react.
// D-15: substitute for material-symbols 'arch'
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Frame, RectangleHorizontal, Squircle } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface Props {
  anchorRef: RefObject<HTMLButtonElement>;
  onClose: () => void;
  onPick: (kind: "archway" | "passthrough" | "niche") => void;
  /** direction="up" opens the dropdown upward from the anchor (for bottom-of-screen triggers). Default "down". */
  direction?: "up" | "down";
}

const ITEMS: Array<{
  kind: "archway" | "passthrough" | "niche";
  label: string;
  icon: "arch" | "lucide-rect" | "lucide-frame";
}> = [
  { kind: "archway", label: "Archway", icon: "arch" },
  { kind: "passthrough", label: "Passthrough", icon: "lucide-rect" },
  { kind: "niche", label: "Niche", icon: "lucide-frame" },
];

export function WallCutoutsDropdown({ anchorRef, onClose, onPick, direction = "down" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [opacity, setOpacity] = useState(0);
  const reducedMotion = useReducedMotion();

  // Position relative to the anchor button. direction="up" grows upward.
  useLayoutEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (direction === "up") {
      setPos({ top: rect.top - 4, left: rect.left });
    } else {
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
  }, [anchorRef, direction]);

  // Fade-in animation, snap if reduced-motion.
  useEffect(() => {
    if (reducedMotion) {
      setOpacity(1);
      return;
    }
    const t = requestAnimationFrame(() => setOpacity(1));
    return () => cancelAnimationFrame(t);
  }, [reducedMotion]);

  // Click-outside dismissal — guard against the anchor button (its click
  // toggles the dropdown; a stray close-then-reopen would feel buggy).
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!ref.current) return;
      if (ref.current.contains(e.target as Node)) return;
      if (anchorRef.current && anchorRef.current.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [onClose, anchorRef]);

  // Dismiss on zoom/pan change (matches WainscotPopover convention).
  useEffect(() => {
    const unsub = useUIStore.subscribe((state, prev) => {
      if (state.userZoom !== prev.userZoom || state.panOffset !== prev.panOffset) {
        onClose();
      }
    });
    return unsub;
  }, [onClose]);

  // Auto-focus + Escape dismissal.
  useEffect(() => {
    ref.current?.focus();
  }, []);

  if (!pos) return null;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      data-testid="wall-cutouts-dropdown"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        opacity,
        transition: reducedMotion ? "none" : "opacity 80ms ease-out",
        zIndex: 9999,
        transform: direction === "up" ? "translateY(-100%)" : undefined,
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
      className="bg-card border border-border rounded-smooth-md p-1 min-w-[160px] outline-none"
    >
      {ITEMS.map((item) => (
        <button
          key={item.kind}
          data-testid={`wall-cutout-${item.kind}`}
          onClick={() => onPick(item.kind)}
          className="w-full flex items-center gap-2 px-2 py-1 rounded-smooth-md font-sans text-[11px] text-foreground hover:bg-accent transition-colors"
        >
          {item.icon === "arch" && (
            <Squircle size={14} /> /* D-15: substitute for material-symbols 'arch' */
          )}
          {item.icon === "lucide-rect" && <RectangleHorizontal size={14} />}
          {item.icon === "lucide-frame" && <Frame size={14} />}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
