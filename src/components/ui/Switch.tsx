import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { springTransition } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// ─── Switch ────────────────────────────────────────────────────────────────

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label?: string;
  className?: string;
}

/**
 * Toggle switch with motion knob slide (D-22).
 * On = bg-accent, off = bg-muted. Knob moves via `layout` prop.
 */
export function Switch({ checked, onCheckedChange, label, className }: SwitchProps) {
  const reduced = useReducedMotion();

  const track = (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full",
        "transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        checked ? "bg-accent" : "bg-muted",
        "justify-start px-0.5",
        className
      )}
    >
      <motion.span
        layout
        transition={springTransition(reduced)}
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm",
          checked ? "ml-auto" : ""
        )}
      />
    </button>
  );

  if (label) {
    return (
      <label className="flex items-center gap-2 cursor-pointer select-none">
        {track}
        <span className="text-sm font-sans text-foreground">{label}</span>
      </label>
    );
  }

  return track;
}
