import { cn } from "@/lib/cn";

// ─── Slider ────────────────────────────────────────────────────────────────

interface SliderProps {
  value: number;
  onValueChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

/**
 * Styled range input with accent track color (D-23).
 * Uses accent-color for native thumb/track styling.
 */
export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className,
}: SliderProps) {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onValueChange(e.currentTarget.valueAsNumber)}
      style={{ accentColor: "var(--color-accent)" }}
      className={cn(
        "h-2 w-full cursor-pointer appearance-none rounded-full bg-muted",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    />
  );
}
