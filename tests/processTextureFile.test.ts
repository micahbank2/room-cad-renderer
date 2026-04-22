/**
 * Phase 34 Plan 01 Task 1 — processTextureFile pipeline.
 *
 * Tests the injectable-seam API (decode + drawToBlob injected so jsdom tests
 * can avoid OffscreenCanvas / createImageBitmap which happy-dom doesn't ship).
 *
 * LIB-07: MIME whitelist + 2048px downscale + SHA-256 dedup key on the
 * DOWNSCALED JPEG bytes.
 */
import { describe, it, expect } from "vitest";
import {
  processTextureFile,
  ProcessTextureError,
  ALLOWED_MIME_TYPES,
  MAX_EDGE_PX,
} from "@/lib/processTextureFile";

function makeFile(type: string, name = "x"): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type });
}

function fakeDecode(width: number, height: number) {
  return async () => ({
    width,
    height,
    close: () => {},
    source: "fake-bitmap",
  });
}

/** Encodes w+h into the blob bytes so we can verify sha256 stability. */
function fakeDrawToBlob() {
  return async (_src: unknown, w: number, h: number): Promise<Blob> =>
    new Blob(
      [new Uint8Array([w & 0xff, (w >> 8) & 0xff, h & 0xff, (h >> 8) & 0xff, 0xde, 0xad])],
      { type: "image/jpeg" },
    );
}

describe("processTextureFile — MIME whitelist (LIB-07)", () => {
  it("rejects image/svg+xml with MIME_REJECTED + exact UI-SPEC copy", async () => {
    const file = makeFile("image/svg+xml", "x.svg");
    await expect(processTextureFile(file)).rejects.toMatchObject({
      code: "MIME_REJECTED",
      message: "Only JPEG, PNG, and WebP are supported.",
    });
  });

  it("rejects image/gif with MIME_REJECTED", async () => {
    const file = makeFile("image/gif", "x.gif");
    await expect(processTextureFile(file)).rejects.toBeInstanceOf(ProcessTextureError);
    await expect(processTextureFile(file)).rejects.toMatchObject({ code: "MIME_REJECTED" });
  });

  it("accepts image/jpeg", async () => {
    const file = makeFile("image/jpeg", "oak.jpg");
    const res = await processTextureFile(file, {
      decode: fakeDecode(800, 600),
      drawToBlob: fakeDrawToBlob(),
    });
    expect(res.mimeType).toBe("image/jpeg");
    expect(res.width).toBe(800);
    expect(res.height).toBe(600);
  });

  it("accepts image/png", async () => {
    const file = makeFile("image/png", "oak.png");
    const res = await processTextureFile(file, {
      decode: fakeDecode(512, 512),
      drawToBlob: fakeDrawToBlob(),
    });
    expect(res.mimeType).toBe("image/jpeg"); // output always jpeg
  });

  it("accepts image/webp", async () => {
    const file = makeFile("image/webp", "oak.webp");
    const res = await processTextureFile(file, {
      decode: fakeDecode(256, 256),
      drawToBlob: fakeDrawToBlob(),
    });
    expect(res.mimeType).toBe("image/jpeg");
  });

  it("exposes ALLOWED_MIME_TYPES constant containing exactly jpeg/png/webp", () => {
    expect(ALLOWED_MIME_TYPES.has("image/jpeg")).toBe(true);
    expect(ALLOWED_MIME_TYPES.has("image/png")).toBe(true);
    expect(ALLOWED_MIME_TYPES.has("image/webp")).toBe(true);
    expect(ALLOWED_MIME_TYPES.size).toBe(3);
  });
});

describe("processTextureFile — 2048px downscale (LIB-07)", () => {
  it("exposes MAX_EDGE_PX = 2048", () => {
    expect(MAX_EDGE_PX).toBe(2048);
  });

  it("downscales 4000x3000 landscape to 2048x1536", async () => {
    const file = makeFile("image/jpeg");
    const res = await processTextureFile(file, {
      decode: fakeDecode(4000, 3000),
      drawToBlob: fakeDrawToBlob(),
    });
    expect(res.width).toBe(2048);
    expect(res.height).toBe(1536);
  });

  it("downscales 3000x4000 portrait to 1536x2048", async () => {
    const file = makeFile("image/jpeg");
    const res = await processTextureFile(file, {
      decode: fakeDecode(3000, 4000),
      drawToBlob: fakeDrawToBlob(),
    });
    expect(res.width).toBe(1536);
    expect(res.height).toBe(2048);
  });

  it("downscales 3000x3000 square to 2048x2048", async () => {
    const file = makeFile("image/jpeg");
    const res = await processTextureFile(file, {
      decode: fakeDecode(3000, 3000),
      drawToBlob: fakeDrawToBlob(),
    });
    expect(res.width).toBe(2048);
    expect(res.height).toBe(2048);
  });

  it("does NOT upscale 1024x768 (passes through unchanged)", async () => {
    const file = makeFile("image/jpeg");
    const res = await processTextureFile(file, {
      decode: fakeDecode(1024, 768),
      drawToBlob: fakeDrawToBlob(),
    });
    expect(res.width).toBe(1024);
    expect(res.height).toBe(768);
  });

  it("passes 2048x2048 through unchanged (boundary)", async () => {
    const file = makeFile("image/jpeg");
    const res = await processTextureFile(file, {
      decode: fakeDecode(2048, 2048),
      drawToBlob: fakeDrawToBlob(),
    });
    expect(res.width).toBe(2048);
    expect(res.height).toBe(2048);
  });
});

describe("processTextureFile — SHA-256 dedup key (LIB-07)", () => {
  it("produces a lowercase hex sha256 string", async () => {
    const file = makeFile("image/jpeg");
    const res = await processTextureFile(file, {
      decode: fakeDecode(100, 100),
      drawToBlob: fakeDrawToBlob(),
    });
    expect(res.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("identical decoded content (same w/h after downscale) produces identical sha256", async () => {
    // Two different source sizes that downscale to the same final w/h AND
    // produce identical blob bytes (since fakeDrawToBlob only encodes w/h):
    const a = await processTextureFile(makeFile("image/jpeg"), {
      decode: fakeDecode(4000, 3000),
      drawToBlob: fakeDrawToBlob(),
    });
    const b = await processTextureFile(makeFile("image/png"), {
      decode: fakeDecode(4000, 3000),
      drawToBlob: fakeDrawToBlob(),
    });
    expect(a.sha256).toBe(b.sha256);
  });

  it("different decoded content produces different sha256", async () => {
    const a = await processTextureFile(makeFile("image/jpeg"), {
      decode: fakeDecode(1000, 1000),
      drawToBlob: fakeDrawToBlob(),
    });
    const b = await processTextureFile(makeFile("image/jpeg"), {
      decode: fakeDecode(500, 500),
      drawToBlob: fakeDrawToBlob(),
    });
    expect(a.sha256).not.toBe(b.sha256);
  });
});

describe("processTextureFile — decode failure", () => {
  it("wraps decode errors into ProcessTextureError with DECODE_FAILED + exact copy", async () => {
    const file = makeFile("image/jpeg");
    await expect(
      processTextureFile(file, {
        decode: async () => {
          throw new Error("bitmap blew up");
        },
        drawToBlob: fakeDrawToBlob(),
      }),
    ).rejects.toMatchObject({
      code: "DECODE_FAILED",
      message: "This file couldn't be processed. Try a different image.",
    });
  });

  it("wraps drawToBlob errors into ProcessTextureError with DECODE_FAILED", async () => {
    const file = makeFile("image/jpeg");
    await expect(
      processTextureFile(file, {
        decode: fakeDecode(100, 100),
        drawToBlob: async () => {
          throw new Error("canvas blew up");
        },
      }),
    ).rejects.toMatchObject({ code: "DECODE_FAILED" });
  });
});
