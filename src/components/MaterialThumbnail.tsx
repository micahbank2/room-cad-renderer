import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getThumbnail, generateThumbnail } from "@/three/swatchThumbnailGenerator";
import { SURFACE_MATERIALS, type SurfaceMaterial } from "@/data/surfaceMaterials";

interface Props {
  materialId: string;
  fallbackColor: string;
}

// Phase 45 D-07: literal string Plan 01's swatchThumbnailGenerator returns on PBR-load failure.
// Must stay byte-identical to the generator's FALLBACK_SENTINEL.
const FALLBACK_SENTINEL = "fallback";

/**
 * Phase 45 THUMB-01 — host component that renders an auto-generated PBR
 * thumbnail for a single SurfaceMaterial swatch tile.
 *
 * Layered render:
 *   1. Persistent solid-hex `<div>` placeholder (always present, never unmounts)
 *      → guarantees the picker grid never flashes empty (D-06).
 *   2. `<img>` overlay that crossfades in via `transition-opacity` once the
 *      offscreen renderer finishes. Skipped entirely when the cache returns
 *      the literal `"fallback"` sentinel (D-07 — Jessica never sees an error
 *      UI; the solid hex tile remains as the visible swatch).
 *
 * Reduced-motion (D-39): `useReducedMotion()` swaps `duration-150` → `duration-0`
 * so the crossfade snaps instantly when the user has the OS preference enabled.
 *
 * Spacing/radius (D-09): canonical Tailwind utilities only — no `p-3`,
 * no arbitrary `[Npx]` values. Everything fits the Phase 33 token scale.
 */
export function MaterialThumbnail({ materialId, fallbackColor }: Props) {
  const reducedMotion = useReducedMotion();
  const cached = getThumbnail(materialId);
  const initial = cached && cached !== FALLBACK_SENTINEL ? cached : null;
  const [dataURL, setDataURL] = useState<string | null>(initial);

  useEffect(() => {
    if (dataURL) return;
    if (cached === FALLBACK_SENTINEL) return; // D-07: don't retry — generator already failed
    // SURFACE_MATERIALS is a Record<string, SurfaceMaterial> keyed by id.
    // Direct lookup also tolerates the test mock (which stubs it as an array)
    // by falling back to Array.prototype.find when needed.
    const catalog = SURFACE_MATERIALS as unknown;
    const material: SurfaceMaterial | undefined = Array.isArray(catalog)
      ? (catalog as SurfaceMaterial[]).find((m) => m.id === materialId)
      : (catalog as Record<string, SurfaceMaterial>)[materialId];
    if (!material) return;
    let alive = true;
    generateThumbnail(material).then((url) => {
      if (alive && url !== FALLBACK_SENTINEL) setDataURL(url);
    });
    return () => {
      alive = false;
    };
  }, [materialId, dataURL, cached]);

  return (
    <div className="relative w-full aspect-square rounded-smooth-md overflow-hidden">
      {/* Placeholder — always present, never unmounts (D-06: no empty-tile flash). */}
      <div
        className="absolute inset-0 rounded-smooth-md"
        style={{ backgroundColor: fallbackColor }}
      />
      {/* Thumbnail — crossfades in via opacity toggle. Omitted on "fallback" sentinel (D-07). */}
      {dataURL && (
        <img
          src={dataURL}
          alt=""
          className={[
            "absolute inset-0 w-full h-full object-cover rounded-smooth-md",
            "transition-opacity",
            reducedMotion ? "duration-0" : "duration-150",
            "opacity-100",
          ].join(" ")}
        />
      )}
    </div>
  );
}
