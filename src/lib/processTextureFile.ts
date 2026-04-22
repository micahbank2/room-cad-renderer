/**
 * Phase 34 — User-Uploaded Textures (LIB-06/07).
 *
 * Browser-side upload pipeline: File (from drop or <input>) ->
 *   MIME whitelist -> createImageBitmap decode -> OffscreenCanvas downscale
 *   to <=2048px longest edge -> JPEG re-encode -> SHA-256.
 *
 * Output is ready for `saveUserTextureWithDedup({ blob, mimeType: "image/jpeg", ... }, sha256)`.
 *
 * Injectable seam (`ProcessTextureDeps`):
 *   happy-dom ships neither `createImageBitmap` nor `OffscreenCanvas`. Tests
 *   (`tests/processTextureFile.test.ts`) pass lightweight fakes so pipeline
 *   behavior (MIME gate, downscale math, sha256 stability, error wrapping)
 *   can be verified without relying on jsdom to implement browser graphics
 *   APIs. Production callers invoke `processTextureFile(file)` with no deps;
 *   `defaultDecode` / `defaultDrawToBlob` kick in.
 *
 * Errors are surfaced as `ProcessTextureError` with a discriminated `code`:
 *   - MIME_REJECTED — file.type not in ALLOWED_MIME_TYPES
 *   - DECODE_FAILED — decode() or drawToBlob() threw (corrupt file, OOM, ...)
 * UI copy on `.message` is pre-locked by UI-SPEC §1 Copywriting Contract.
 */
import { computeSHA256 } from "./userTextureStore";

/** LIB-07 whitelist. Anything outside this set surfaces the inline
 *  "Only JPEG, PNG, and WebP are supported." error. */
export const ALLOWED_MIME_TYPES = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/** LIB-07 maximum longest-edge pixel dimension after downscale. */
export const MAX_EDGE_PX = 2048;

export type ProcessTextureErrorCode = "MIME_REJECTED" | "DECODE_FAILED";

export class ProcessTextureError extends Error {
  public readonly code: ProcessTextureErrorCode;
  constructor(code: ProcessTextureErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "ProcessTextureError";
  }
}

export interface ProcessTextureResult {
  /** Downscaled JPEG blob, <=2048px longest edge. Ready to persist. */
  blob: Blob;
  /** Always "image/jpeg" after the pipeline. */
  mimeType: string;
  /** Lowercase hex SHA-256 of `blob` bytes. LIB-07 dedup key. */
  sha256: string;
  /** Final (post-downscale) width in pixels. */
  width: number;
  /** Final (post-downscale) height in pixels. */
  height: number;
}

/** Test seam: injected decode returns { width, height, close, source }
 *  where `source` is whatever drawToBlob expects (the default pair uses
 *  ImageBitmap -> OffscreenCanvas.drawImage). */
export interface ProcessTextureDeps {
  decode?: (file: File) => Promise<{
    width: number;
    height: number;
    close: () => void;
    source: unknown;
  }>;
  drawToBlob?: (src: unknown, w: number, h: number) => Promise<Blob>;
}

async function defaultDecode(file: File) {
  // `createImageBitmap` is the fastest path to pixel data in modern browsers.
  // Returns an ImageBitmap with .width / .height and an explicit close() method.
  const bitmap = await createImageBitmap(file);
  return {
    width: bitmap.width,
    height: bitmap.height,
    close: () => bitmap.close(),
    source: bitmap,
  };
}

async function defaultDrawToBlob(src: unknown, w: number, h: number): Promise<Blob> {
  // `OffscreenCanvas` runs off the main thread and gives us a Promise-based
  // `convertToBlob` that handles encoding. JPEG@0.9 is a good tradeoff between
  // file size and visual fidelity for diffuse texture sources.
  const oc = new OffscreenCanvas(w, h);
  const ctx = oc.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  ctx.drawImage(src as CanvasImageSource, 0, 0, w, h);
  return oc.convertToBlob({ type: "image/jpeg", quality: 0.9 });
}

/**
 * Run the full upload pipeline on a File. Throws `ProcessTextureError` with
 * locked UI copy on rejection paths; returns `ProcessTextureResult` on success.
 *
 * Downscale rule: `scale = min(1, MAX_EDGE_PX / max(w, h))`. `min(1, ...)`
 * prevents upscaling small sources — passing a 1024x768 image through yields
 * the same 1024x768 dimensions (re-encoded to JPEG; the bytes still run
 * through the codec for a consistent hash domain).
 */
export async function processTextureFile(
  file: File,
  deps: ProcessTextureDeps = {},
): Promise<ProcessTextureResult> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new ProcessTextureError(
      "MIME_REJECTED",
      "Only JPEG, PNG, and WebP are supported.",
    );
  }

  const decode = deps.decode ?? defaultDecode;
  const drawToBlob = deps.drawToBlob ?? defaultDrawToBlob;

  let decoded: Awaited<ReturnType<typeof defaultDecode>>;
  try {
    decoded = await decode(file);
  } catch {
    throw new ProcessTextureError(
      "DECODE_FAILED",
      "This file couldn't be processed. Try a different image.",
    );
  }

  const scale = Math.min(1, MAX_EDGE_PX / Math.max(decoded.width, decoded.height));
  const w = Math.round(decoded.width * scale);
  const h = Math.round(decoded.height * scale);

  let blob: Blob;
  try {
    blob = await drawToBlob(decoded.source, w, h);
  } catch {
    decoded.close();
    throw new ProcessTextureError(
      "DECODE_FAILED",
      "This file couldn't be processed. Try a different image.",
    );
  }
  decoded.close();

  const bytes = await blob.arrayBuffer();
  const sha256 = await computeSHA256(bytes);

  return { blob, mimeType: "image/jpeg", sha256, width: w, height: h };
}
