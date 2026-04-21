import * as THREE from "three";
import { applyColorSpace, type TextureChannel } from "./textureColorSpace";

interface CacheEntry {
  tex: THREE.Texture;
  refs: number;
  channel: TextureChannel;
}

const cache = new Map<string, CacheEntry>();
let registeredAnisotropy = 1;

/**
 * Debounced disposal: when refs hit 0, we don't dispose synchronously — we schedule a dispose
 * after a grace window. This prevents view-mode toggles (2D ↔ 3D) from unmounting and re-mounting
 * a consumer within a frame and throwing away the texture just to reload it immediately. If a
 * re-acquire lands within the grace window, the pending dispose is cancelled and the cached
 * texture is reused. See 32-05-PLAN.md for regression context.
 */
let disposeGraceMs = 3000;
const pendingDispose = new Map<string, ReturnType<typeof setTimeout>>();

/** Plan 03 calls this once from ThreeViewport with the active renderer. */
export function registerRenderer(gl: THREE.WebGLRenderer): void {
  const max = gl.capabilities.getMaxAnisotropy();
  registeredAnisotropy = Math.min(8, Math.max(1, max));
  // Apply retroactively to already-cached textures
  for (const entry of cache.values()) {
    entry.tex.anisotropy = registeredAnisotropy;
    entry.tex.needsUpdate = true;
  }
}

function configureTexture(tex: THREE.Texture, channel: TextureChannel): THREE.Texture {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = registeredAnisotropy;
  applyColorSpace(tex, channel);
  tex.needsUpdate = true;
  return tex;
}

export function acquireTexture(
  url: string,
  channel: TextureChannel
): Promise<THREE.Texture> {
  // Cancel any pending dispose for this URL — we're re-acquiring inside the grace window.
  const pendingTimer = pendingDispose.get(url);
  if (pendingTimer !== undefined) {
    clearTimeout(pendingTimer);
    pendingDispose.delete(url);
  }

  const existing = cache.get(url);
  if (existing) {
    existing.refs += 1;
    return Promise.resolve(existing.tex);
  }
  return new Promise<THREE.Texture>((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => {
        const entry = cache.get(url);
        if (entry) {
          // Another acquire landed first; use its tex and bump
          entry.refs += 1;
          tex.dispose();
          resolve(entry.tex);
          return;
        }
        configureTexture(tex, channel);
        cache.set(url, { tex, refs: 1, channel });
        resolve(tex);
      },
      undefined,
      (err) => {
        cache.delete(url);
        reject(err instanceof Error ? err : new Error(`Failed to load ${url}`));
      }
    );
  });
}

export function releaseTexture(url: string): void {
  const entry = cache.get(url);
  if (!entry) return;
  entry.refs -= 1;
  if (entry.refs <= 0) {
    // Don't dispose synchronously — view-mode toggles unmount+remount within a frame.
    // Schedule dispose; acquireTexture() will cancel if re-acquired within grace.
    if (pendingDispose.has(url)) {
      clearTimeout(pendingDispose.get(url)!);
    }
    if (disposeGraceMs <= 0) {
      // Synchronous path for tests / legacy strict-mode consumers.
      entry.tex.dispose();
      cache.delete(url);
      return;
    }
    const timer = setTimeout(() => {
      pendingDispose.delete(url);
      const current = cache.get(url);
      // Guard: refs may have gone back up via acquire during the grace window;
      // only dispose if still at 0.
      if (current && current.refs <= 0) {
        current.tex.dispose();
        cache.delete(url);
      }
    }, disposeGraceMs);
    pendingDispose.set(url, timer);
  }
}

export interface PbrSet {
  albedo: THREE.Texture;
  normal: THREE.Texture;
  roughness: THREE.Texture;
}

export function loadPbrSet(urls: {
  albedo: string;
  normal: string;
  roughness: string;
}): Promise<PbrSet> {
  return Promise.all([
    acquireTexture(urls.albedo, "albedo"),
    acquireTexture(urls.normal, "normal"),
    acquireTexture(urls.roughness, "roughness"),
  ]).then(([albedo, normal, roughness]) => ({ albedo, normal, roughness }));
}

/** Test-only: wipe cache. Never call from production code. */
export function __resetPbrCacheForTests(): void {
  for (const t of pendingDispose.values()) clearTimeout(t);
  pendingDispose.clear();
  cache.clear();
  registeredAnisotropy = 1;
  disposeGraceMs = 3000;
}

/** Test-only: override the dispose grace window (ms). Default is 3000. Pass 0 for synchronous dispose. */
export function __setDisposeGraceMsForTests(ms: number): void {
  disposeGraceMs = ms;
}
