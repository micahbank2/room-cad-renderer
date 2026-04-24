// Phase 36 Plan 01 — fixture upload helper.
// Reads a fixture file, base64-encodes in Node, then ships the bytes across
// via `page.evaluate` to Phase 34's `window.__driveTextureUpload` driver.
// Returns the persisted user-texture id (IDB key), which spec files feed
// into cadStore actions (setWallpaper/setFloorMaterial/etc.).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Page } from "@playwright/test";

export async function uploadTexture(
  page: Page,
  fixturePath: string,
  name: string,
  tileSizeFt: number,
  mimeType: "image/jpeg" | "image/png" = "image/jpeg",
): Promise<string> {
  const absPath = resolve(fixturePath);
  const bytes = readFileSync(absPath);
  const b64 = bytes.toString("base64");

  const id = await page.evaluate(
    async (args: { b64: string; name: string; tileSizeFt: number; mimeType: string }) => {
      const { b64, name, tileSizeFt, mimeType } = args;
      const blob = await fetch(`data:${mimeType};base64,${b64}`).then((r) => r.blob());
      const file = new File([blob], `${name}.${mimeType.split("/")[1]}`, { type: mimeType });
      const drive = (window as unknown as {
        __driveTextureUpload?: (f: File, n: string, t: number) => Promise<string>;
      }).__driveTextureUpload;
      if (!drive) {
        throw new Error("__driveTextureUpload not installed — check --mode test");
      }
      return await drive(file, name, tileSizeFt);
    },
    { b64, name, tileSizeFt, mimeType },
  );

  return id;
}
