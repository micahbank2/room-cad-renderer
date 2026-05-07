// src/test-utils/textureDrivers.ts
// Phase 68 follow-up: window-level driver for texture upload (`__driveTextureUpload`).
// Gated by import.meta.env.MODE === "test"; production no-op.
//
// Extracted from UploadTextureModal.tsx after Phase 68-06 removed the wallpaper
// "MY TEXTURES" tab. The previous module-eval install lived inside
// UploadTextureModal.tsx and only registered when something imported that module
// at boot. Once WallSurfacePanel stopped importing MyTexturesList (which
// transitively imported UploadTextureModal), the driver vanished from the
// production app and three legacy e2e specs that exercise wallpaper / floor /
// ceiling user-texture flows broke with "__driveTextureUpload not installed".
//
// Mirrors src/test-utils/measureDrivers.ts (Phase 62) registration pattern.
//
// Bypasses the React tree so vitest cases can exercise the persistence path
// end-to-end without simulating drag-drop or file-input events (happy-dom
// cannot synthesize a real `change` event against a native <input type="file">
// with `.files` populated in a way that satisfies React's controlled-input
// contract). Returns the saved id (or dedup id).

import { processTextureFile } from "@/lib/processTextureFile";

declare global {
  interface Window {
    __driveTextureUpload?: (
      file: File,
      name: string,
      tileSizeFt: number,
    ) => Promise<string>;
  }
}

export function installTextureDrivers(): void {
  if (typeof window === "undefined") return;
  if (import.meta.env.MODE !== "test") return;

  window.__driveTextureUpload = async (file, textureName, tileSizeFt) => {
    const result = await processTextureFile(file);
    const { saveUserTextureWithDedup } = await import("@/lib/userTextureStore");
    const { id } = await saveUserTextureWithDedup(
      {
        name: textureName,
        tileSizeFt,
        blob: result.blob,
        mimeType: result.mimeType,
      },
      result.sha256,
    );
    return id;
  };
}
