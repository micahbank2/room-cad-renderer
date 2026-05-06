// src/components/Toolbar.WallCutoutsDropdown.tsx
// Phase 61 OPEN-01 (D-03, research Q7): Wall Cutouts dropdown popover.
// Mirrors WainscotPopover.tsx — fixed-position div, 3 dismiss hooks
// (mousedown click-outside, uiStore zoom/pan change, Escape), animated
// fade-in guarded by useReducedMotion (Phase 33 D-39).
//
// Phase 33 D-33 allowlist exception: Material Symbols `arch` glyph is the
// only icon for archway — lucide has no archway equivalent.
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Frame, RectangleHorizontal } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface Props {
  anchorRef: RefObject<HTMLButtonElement>;
  onClose: () => void;
  onPick: (kind: "archway" | "passthrough" | "niche") => void;
}

const ITEMS: Array<{
  kind: "archway" | "passthrough" | "niche";
  label: string;
  icon: "arch" | "lucide-rect" | "lucide-frame";
}> = [
  { kind: "archway", label: "ARCHWAY", icon: "arch" },
  { kind: "passthrough", label: "PASSTHROUGH", icon: "lucide-rect" },
  { kind: "niche", label: "NICHE", icon: "lucide-frame" },
];

export function WallCutoutsDropdown({ anchorRef, onClose, onPick }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [opacity, setOpacity] = useState(0);
  const reducedMotion = useReducedMotion();

  // Position immediately below the anchor button.
  useLayoutEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left });
  }, [anchorRef]);

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
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
      className="glass-panel ghost-border rounded-sm p-1 min-w-[160px] outline-none"
    >
      {ITEMS.map((item) => (
        <button
          key={item.kind}
          data-testid={`wall-cutout-${item.kind}`}
          onClick={() => onPick(item.kind)}
          className="w-full flex items-center gap-2 px-2 py-1 rounded-sm font-mono text-[11px] text-text-primary hover:bg-obsidian-high transition-colors"
        >
          {item.icon === "arch" && (
            <span className="material-symbols-outlined text-[14px]">arch</span>
          )}
          {item.icon === "lucide-rect" && <RectangleHorizontal size={14} />}
          {item.icon === "lucide-frame" && <Frame size={14} />}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
