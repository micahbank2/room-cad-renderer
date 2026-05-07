import type { ReactNode } from "react";
import { X } from "lucide-react";

export interface LibraryCardProps {
  /** Thumbnail image URL; undefined -> placeholder background. */
  thumbnail?: string;
  /** Label text, rendered truncated. */
  label: string;
  /** Selected state — applies accent border + tint. */
  selected?: boolean;
  /** Click handler for the card body. */
  onClick?: () => void;
  /** Optional remove handler; when provided a hover-revealed X button is shown. */
  onRemove?: () => void;
  /** Layout variant. */
  variant?: "grid" | "list";
  /**
   * Phase 58: optional top-LEFT corner badge slot (e.g., capability indicator).
   * Slot is generic — caller controls icon + styling. Always-visible (does not
   * hover-reveal). Positioned opposite the hover-revealed X button (top-right).
   */
  badge?: ReactNode;
}

/**
 * Shared library card primitive (Phase 33 GH #89).
 *
 * Root element includes `data-testid="library-card"` for count-regression tests.
 * Styling uses canonical Plan 01/03 tokens (rounded-md, rounded-sm, p-2, gap-4).
 *
 * Phase 58: optional top-LEFT badge slot for capability indicators (e.g. lucide
 * Box icon for products with a real GLTF model). The slot is always-visible and
 * does not collide with the hover-revealed X button at top-right.
 */
export function LibraryCard({
  thumbnail,
  label,
  selected = false,
  onClick,
  onRemove,
  variant = "grid",
  badge,
}: LibraryCardProps) {
  const baseClasses =
    "group relative border border-border/50 rounded-md cursor-pointer transition-colors";
  const stateClasses = selected
    ? "border-accent/60 bg-accent/10"
    : "bg-card hover:bg-accent";

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.();
  };

  if (variant === "list") {
    return (
      <div
        data-testid="library-card"
        className={`${baseClasses} ${stateClasses} flex items-center gap-2 p-2`}
        onClick={onClick}
      >
        <div className="w-8 h-8 rounded-sm bg-accent overflow-hidden shrink-0 relative">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : null}
          {badge ? (
            <div
              data-testid="library-card-badge"
              className="absolute top-0.5 left-0.5 z-10 pointer-events-none"
            >
              {badge}
            </div>
          ) : null}
        </div>
        <span className="font-mono text-sm text-muted-foreground truncate flex-1">
          {label}
        </span>
        {onRemove ? (
          <button
            type="button"
            onClick={handleRemoveClick}
            aria-label="Remove"
            className="opacity-0 group-hover:opacity-100 text-muted-foreground/60 hover:text-error transition-opacity shrink-0"
          >
            <X size={12} />
          </button>
        ) : null}
      </div>
    );
  }

  // grid variant (default)
  return (
    <div
      data-testid="library-card"
      className={`${baseClasses} ${stateClasses} flex flex-col p-2`}
      onClick={onClick}
    >
      {onRemove ? (
        <button
          type="button"
          onClick={handleRemoveClick}
          aria-label="Remove"
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-muted-foreground/60 hover:text-error transition-opacity z-10"
        >
          <X size={12} />
        </button>
      ) : null}
      {badge ? (
        <div
          data-testid="library-card-badge"
          className="absolute top-1 left-1 z-10 pointer-events-none"
        >
          {badge}
        </div>
      ) : null}
      <div className="aspect-square rounded-sm bg-accent overflow-hidden">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : null}
      </div>
      <span className="font-mono text-sm text-muted-foreground truncate mt-2">
        {label}
      </span>
    </div>
  );
}
