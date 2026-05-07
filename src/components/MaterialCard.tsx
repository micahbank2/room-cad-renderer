/**
 * Phase 67 — MaterialCard (MAT-ENGINE-01).
 *
 * Library card for a Material entry. Wraps the Phase 33 LibraryCard primitive
 * conceptually (we replicate its layout rather than importing because we
 * need the hover-tooltip surface); thumbnail is lazy-resolved from the
 * underlying UserTexture (D-09 wrapper) on mount.
 *
 * Hover tooltip (D-07): plain-text composition of brand · SKU · cost ·
 * lead time · tile size. Empty optional fields are filtered out so users
 * never see "undefined" or "·  ·" double-separator artifacts. All free-text
 * D-04/D-05 fields are escape-rendered via React's default {value}
 * interpolation, never via raw HTML injection (RESEARCH.md Pitfall 5).
 *
 * Orphan path: if getUserTexture(colorMapId) returns undefined, render a
 * placeholder thumbnail + the warning copy "Color map missing — re-upload
 * to restore". This is the first place a user sees the missing blob;
 * Phase 68 surface renderers will inherit the same fallback for applied
 * Materials.
 *
 * Pattern #7 (StrictMode-safety): the blob-URL useEffect returns a cleanup
 * that calls URL.revokeObjectURL with identity check — prevents leaks on
 * StrictMode double-mount.
 */
import { useEffect, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { formatFeet } from "@/lib/geometry";
import { getUserTexture } from "@/lib/userTextureStore";
import type { Material } from "@/types/material";

export interface MaterialCardProps {
  material: Material;
  onClick?: () => void;
  /** Optional ⋮ menu handler — host wires edit/delete actions. */
  onMore?: () => void;
}

const ORPHAN_WARNING = "Color map missing — re-upload to restore";

export function MaterialCard({
  material,
  onClick,
  onMore,
}: MaterialCardProps): JSX.Element {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [orphan, setOrphan] = useState(false);
  const [hover, setHover] = useState(false);

  // Lazy-resolve color blob URL on mount. Pattern #7 cleanup with identity
  // check so StrictMode double-mount doesn't leak the URL or revoke the
  // remount's freshly-created URL.
  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;
    (async () => {
      const tex = await getUserTexture(material.colorMapId);
      if (cancelled) return;
      if (!tex) {
        setOrphan(true);
        setThumbnailUrl(null);
        return;
      }
      createdUrl = URL.createObjectURL(tex.blob);
      setOrphan(false);
      setThumbnailUrl(createdUrl);
    })();
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [material.colorMapId]);

  // Tooltip text composition: brand · SKU · cost · lead time · tile size.
  // Empty fields filtered out via Boolean coercion. tileSize always shown.
  const tooltipParts: string[] = [];
  if (material.brand) tooltipParts.push(material.brand);
  if (material.sku) tooltipParts.push(material.sku);
  if (material.cost) tooltipParts.push(material.cost);
  if (material.leadTime) tooltipParts.push(material.leadTime);
  tooltipParts.push(formatFeet(material.tileSizeFt));
  const tooltipText = tooltipParts.join(" · ");

  const handleMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMore?.();
  };

  return (
    <div
      data-testid={`material-card-${material.id}`}
      className="group relative border border-border/50 rounded-md cursor-pointer transition-colors flex flex-col p-2 bg-card hover:bg-accent"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* ⋮ options button */}
      {onMore && (
        <button
          type="button"
          aria-label="Material options"
          onClick={handleMoreClick}
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/60 hover:text-foreground z-10"
          style={{ minHeight: 44, minWidth: 44, padding: 4 }}
        >
          <MoreHorizontal className="size-4" />
        </button>
      )}

      {/* Hover tooltip (positioned ABOVE the card per RESEARCH.md Open Q4).
          Always rendered (so a11y tooling and test assertions can read it);
          opacity toggles on hover. */}
      <div
        role="tooltip"
        className={`absolute bottom-full left-0 mb-1 z-20 bg-secondary border border-border/50 rounded-sm px-2 py-1 font-mono text-sm text-muted-foreground truncate max-w-xs pointer-events-none shadow-lg transition-opacity ${
          hover ? "opacity-100" : "opacity-0"
        }`}
      >
        {orphan ? ORPHAN_WARNING : tooltipText}
      </div>

      {/* Thumbnail */}
      <div className="aspect-square rounded-sm bg-accent overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={material.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {orphan && (
              <span className="font-mono text-sm text-muted-foreground/60 px-2 text-center">
                {ORPHAN_WARNING}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Name + tile size */}
      <div className="mt-2 flex flex-col gap-1">
        <span className="font-mono text-sm font-medium uppercase text-foreground truncate">
          {material.name.toUpperCase()}
        </span>
        <span className="font-mono text-sm text-foreground">
          {formatFeet(material.tileSizeFt)}
        </span>
      </div>
    </div>
  );
}

export default MaterialCard;
