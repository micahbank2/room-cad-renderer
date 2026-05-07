/**
 * Phase 68 Plan 05 — Async fabric.Pattern cache for Material textures.
 *
 * Module-level cache keyed by `${materialId}|${tileSizeFt}|${pixelsPerFoot}`.
 * Synchronous cache hit returns the existing Pattern; cache miss returns null
 * synchronously, kicks off an async load, and invokes the optional onReady
 * callback once the Pattern resolves so the caller can `fc.requestRenderAll()`.
 *
 * Inflight-load deduplication: concurrent calls for the same key share a single
 * promise. URL.createObjectURL is paired with URL.revokeObjectURL so blob URLs
 * don't leak.
 *
 * Non-disposing by design (mirrors src/three/wallpaperTextureCache.ts) — Fabric
 * Patterns wrap a backing canvas, so they survive any Fabric.Canvas teardown
 * within the same JS realm. Re-entry from a remount reuses the cached Pattern.
 */
import * as fabric from "fabric";
import type { Material } from "@/types/material";
import { getUserTexture } from "@/lib/userTextureStore";

const patternCache = new Map<string, fabric.Pattern>();
const inflightLoads = new Map<string, Promise<fabric.Pattern | null>>();

/**
 * Look up (or kick off async load for) a fabric.Pattern for the given Material.
 *
 * Returns null synchronously when:
 *   - Material has no colorMapId (caller should use colorHex / fallback fill).
 *   - Cache miss → async load is queued; onReady fires once Pattern resolves.
 *
 * Returns the cached Pattern synchronously on hit.
 */
export function getMaterialPattern(
  material: Material,
  tileSizeFt: number,
  pixelsPerFoot: number,
  onReady?: (pattern: fabric.Pattern) => void,
): fabric.Pattern | null {
  if (!material.colorMapId) return null;
  const key = `${material.id}|${tileSizeFt}|${pixelsPerFoot}`;

  const hit = patternCache.get(key);
  if (hit) return hit;

  const inflight = inflightLoads.get(key);
  if (inflight) {
    if (onReady) {
      inflight.then((p) => {
        if (p) onReady(p);
      });
    }
    return null;
  }

  const promise = (async (): Promise<fabric.Pattern | null> => {
    let blobUrl: string | null = null;
    try {
      const ut = await getUserTexture(material.colorMapId!);
      if (!ut?.blob) {
        inflightLoads.delete(key);
        return null;
      }
      blobUrl = URL.createObjectURL(ut.blob);
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = (err) => rej(err);
        im.src = blobUrl!;
      });

      const tileSizePx = Math.max(8, Math.round(tileSizeFt * pixelsPerFoot));
      const canvas = document.createElement("canvas");
      canvas.width = tileSizePx;
      canvas.height = tileSizePx;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(blobUrl);
        inflightLoads.delete(key);
        return null;
      }
      ctx.drawImage(img, 0, 0, tileSizePx, tileSizePx);
      URL.revokeObjectURL(blobUrl);
      blobUrl = null;

      const pattern = new fabric.Pattern({ source: canvas, repeat: "repeat" });
      patternCache.set(key, pattern);
      inflightLoads.delete(key);
      if (onReady) onReady(pattern);
      return pattern;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[Phase68] fabric pattern load failed", err);
      if (blobUrl) {
        try {
          URL.revokeObjectURL(blobUrl);
        } catch {
          /* ignore */
        }
      }
      inflightLoads.delete(key);
      return null;
    }
  })();

  inflightLoads.set(key, promise);
  return null;
}

/** Test helper — clears both caches. NOT exported in production UI. */
export function clearMaterialPatternCache(): void {
  patternCache.clear();
  inflightLoads.clear();
}
