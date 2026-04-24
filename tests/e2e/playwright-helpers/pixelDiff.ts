/**
 * Pixel-diff comparator for within-run cycle stability assertions.
 *
 * Phase 36 Plan 02 (CI fix): specs originally compared each cycle to a
 * committed platform-specific golden PNG. On CI (Linux) those goldens were
 * missing because they'd been generated on macOS. The stored-golden design
 * also coupled the test to absolute rendering output, which isn't what
 * VIZ-10 actually tests — the real invariant is "texture survives N mount
 * cycles", i.e. cycle 2..N should match cycle 1 within ≤1% pixel delta.
 *
 * This helper captures cycle 1 as the in-run baseline and compares every
 * subsequent cycle buffer to that baseline. Platform-agnostic, no stored
 * goldens required.
 */
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

export interface PixelDiffResult {
  /** Pixels that differ between the two images. */
  diffPixels: number;
  /** Total pixels in each image. */
  totalPixels: number;
  /** Ratio of differing pixels (0..1). */
  mismatchRatio: number;
}

/**
 * Compare two PNG buffers and return the mismatch ratio.
 *
 * Throws if the two images have different dimensions — dimension drift
 * during a test run is itself a regression signal worth surfacing loudly.
 */
export function comparePng(
  actual: Buffer,
  expected: Buffer,
  threshold = 0.1,
): PixelDiffResult {
  const actualPng = PNG.sync.read(actual);
  const expectedPng = PNG.sync.read(expected);

  if (
    actualPng.width !== expectedPng.width ||
    actualPng.height !== expectedPng.height
  ) {
    throw new Error(
      `Image dimensions drifted: actual=${actualPng.width}x${actualPng.height} ` +
        `expected=${expectedPng.width}x${expectedPng.height}`,
    );
  }

  const { width, height } = actualPng;
  const diffBuffer = new PNG({ width, height });
  const diffPixels = pixelmatch(
    actualPng.data,
    expectedPng.data,
    diffBuffer.data,
    width,
    height,
    { threshold },
  );

  const totalPixels = width * height;
  return {
    diffPixels,
    totalPixels,
    mismatchRatio: diffPixels / totalPixels,
  };
}
