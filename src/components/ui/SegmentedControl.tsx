import { useId } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { springTransition } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// ─── SegmentedControl ──────────────────────────────────────────────────────

export interface SegmentedControlOption {
  value: string;
  label: string;
}

interface SegmentedControlProps {
  value: string;
  onValueChange: (v: string) => void;
  options: SegmentedControlOption[];
  className?: string;
}

/**
 * iOS-style segmented control with a sliding motion.div pill behind the
 * active segment. Uses layoutId for cross-segment animation (D-21).
 */
export function SegmentedControl({
  value,
  onValueChange,
  options,
  className,
}: SegmentedControlProps) {
  const groupId = useId();
  const reduced = useReducedMotion();

  return (
    <div
      role="group"
      className={cn(
        "flex items-center bg-muted/50 p-1 rounded-smooth-md",
        className
      )}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={isActive}
            onClick={() => onValueChange(opt.value)}
            className={cn(
              "relative flex-1 px-3 py-1.5 text-sm font-sans font-medium",
              "rounded-smooth-md transition-colors",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isActive && (
              <motion.div
                layoutId={`seg-pill-${groupId}`}
                className="absolute inset-0 bg-card shadow-sm rounded-smooth-md"
                transition={springTransition(reduced)}
                style={{ zIndex: -1 }}
              />
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
