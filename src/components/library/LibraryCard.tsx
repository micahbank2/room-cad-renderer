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
}

/**
 * Shared library card primitive (Phase 33 GH #89).
 *
 * Root element includes `data-testid="library-card"` for count-regression tests.
 * Styling uses canonical Plan 01/03 tokens (rounded-md, rounded-sm, p-2, gap-4).
 */
export function LibraryCard({
  thumbnail,
  label,
  selected = false,
  onClick,
  onRemove,
  variant = "grid",
}: LibraryCardProps) {
  const baseClasses =
    "group relative ghost-border rounded-md cursor-pointer transition-colors";
  const stateClasses = selected
    ? "border-accent/60 bg-accent/10"
    : "bg-obsidian-low hover:bg-obsidian-high";

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
        <div className="w-8 h-8 rounded-sm bg-obsidian-high overflow-hidden shrink-0">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : null}
        </div>
        <span className="font-mono text-sm text-text-muted truncate flex-1">
          {label}
        </span>
        {onRemove ? (
          <button
            type="button"
            onClick={handleRemoveClick}
            aria-label="Remove"
            className="opacity-0 group-hover:opacity-100 text-text-ghost hover:text-error transition-opacity shrink-0"
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
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-text-ghost hover:text-error transition-opacity z-10"
        >
          <X size={12} />
        </button>
      ) : null}
      <div className="aspect-square rounded-sm bg-obsidian-high overflow-hidden">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : null}
      </div>
      <span className="font-mono text-sm text-text-muted truncate mt-2">
        {label}
      </span>
    </div>
  );
}
