import { FB_COLORS } from "@/data/farrowAndBall";
import type { PaintColor } from "@/types/paint";

/**
 * Resolve a paintId to its hex color string.
 *
 * Resolution order:
 * 1. F&B catalog (static)
 * 2. Custom colors array (from cadStore.customPaints)
 * 3. Fallback (default "#f8f5ef" — warm off-white)
 */
export function resolvePaintHex(
  paintId: string,
  customColors: PaintColor[],
  fallback = "#f8f5ef"
): string {
  const fb = FB_COLORS.find((c) => c.id === paintId);
  if (fb) return fb.hex;
  const custom = customColors.find((c) => c.id === paintId);
  if (custom) return custom.hex;
  return fallback;
}
