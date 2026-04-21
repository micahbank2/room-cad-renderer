import * as THREE from "three";
import { applyColorSpace, type TextureChannel } from "./textureColorSpace";

interface CacheEntry {
  tex: THREE.Texture;
  refs: number;
  channel: TextureChannel;
}

const cache = new Map<string, CacheEntry>();
let registeredAnisotropy = 1;

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
    entry.tex.dispose();
    cache.delete(url);
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
  cache.clear();
  registeredAnisotropy = 1;
}

// ───────────────────────────────────────────────────────────────────────
// Test driver (gated). Exposes internal refcount state for integration tests.
// Follows Phase 29/30/31 convention: window-scoped, MODE === "test" only.
// ───────────────────────────────────────────────────────────────────────
export interface PbrCacheSnapshot {
  url: string;
  refs: number;
  channel: TextureChannel;
  disposed: boolean;
}

export function __getPbrCacheState(): PbrCacheSnapshot[] {
  const out: PbrCacheSnapshot[] = [];
  for (const [url, entry] of cache.entries()) {
    out.push({
      url,
      refs: entry.refs,
      channel: entry.channel,
      // three.js Texture has no public "disposed" flag; expose source.data null as a proxy
      disposed: entry.tex.source?.data == null,
    });
  }
  return out;
}

if (typeof window !== "undefined" && import.meta.env.MODE === "test") {
  (window as unknown as { __getPbrCacheState: typeof __getPbrCacheState }).__getPbrCacheState =
    __getPbrCacheState;
  (
    window as unknown as { __resetPbrCacheForTests: typeof __resetPbrCacheForTests }
  ).__resetPbrCacheForTests = __resetPbrCacheForTests;
}
