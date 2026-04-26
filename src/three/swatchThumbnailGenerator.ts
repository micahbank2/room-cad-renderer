/**
 * Phase 45 — THUMB-01: Auto-generated material swatch thumbnail engine.
 *
 * Owns ONE shared `THREE.WebGLRenderer` (lazy-init on first call) plus a
 * studio-lit scene + plane mesh used to render every material swatch.
 * Per-material results are cached in-memory keyed by `material.id`.
 *
 * On PBR-load failure, resolves to the literal sentinel `"fallback"` —
 * Plan 02's UI component does string-equality on this exact value to
 * decide whether to render a solid hex tile fallback (D-07).
 *
 * Design constraints (locked by 45-RESEARCH.md):
 *   - D-01: raw THREE only (no R3F wrapper, no OffscreenCanvas).
 *   - D-02: in-memory cache only (no IndexedDB persistence).
 *   - D-05: studio lighting — NOT scene-matching.
 *   - D-07: literal `"fallback"` sentinel — must not change.
 *   - Reuse pbrTextureCache.loadPbrSet — DO NOT call registerRenderer()
 *     (main viewport owns global anisotropy).
 */

import * as THREE from "three";
import { loadPbrSet } from "./pbrTextureCache";
import type { SurfaceMaterial } from "@/data/surfaceMaterials";

const THUMB_SIZE = 128; // px
const FALLBACK_SENTINEL = "fallback"; // D-07 — exact literal Plan 02 component checks
const UV_REPEAT = 1.5; // 1–2 tile repeats visible at swatch size

const thumbnailCache = new Map<string, string>(); // materialId → dataURL OR "fallback"

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let planeMesh: THREE.Mesh | null = null;

function ensureRenderer(): THREE.WebGLRenderer {
  if (renderer) return renderer;
  const canvas = document.createElement("canvas");
  canvas.width = THUMB_SIZE;
  canvas.height = THUMB_SIZE;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(THUMB_SIZE, THUMB_SIZE);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0); // transparent background (D-05)

  scene = new THREE.Scene();

  // Studio lighting — D-05 (NOT scene-matching)
  const dir = new THREE.DirectionalLight(0xffffff, 1.5);
  dir.position.set(2, 2, 1.5); // ~45° elevation / ~30° azimuth
  scene.add(dir);
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const rim = new THREE.DirectionalLight(0xffffff, 0.3);
  rim.position.set(-1, 0.5, -1);
  scene.add(rim);

  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10);
  camera.position.set(0.6, 0.6, 1.2); // ~30° off-axis
  camera.lookAt(0, 0, 0);

  const geo = new THREE.PlaneGeometry(1, 1);
  planeMesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial());
  scene.add(planeMesh);

  return renderer;
}

export async function generateThumbnail(material: SurfaceMaterial): Promise<string> {
  const cached = thumbnailCache.get(material.id);
  if (cached !== undefined) return cached;

  const r = ensureRenderer();

  let mat: THREE.MeshStandardMaterial;
  try {
    if (material.pbr) {
      const maps = await loadPbrSet({
        albedo: material.pbr.albedo,
        normal: material.pbr.normal,
        roughness: material.pbr.roughness,
      });
      for (const tex of [maps.albedo, maps.normal, maps.roughness]) {
        tex.repeat.set(UV_REPEAT, UV_REPEAT);
        tex.needsUpdate = true;
      }
      mat = new THREE.MeshStandardMaterial({
        map: maps.albedo,
        normalMap: maps.normal,
        roughnessMap: maps.roughness,
        metalness: 0,
      });
    } else {
      mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(material.color),
        roughness: material.roughness,
        metalness: 0,
      });
    }
  } catch {
    // D-07: silent fallback — Plan 02 component renders solid hex tile when it sees this sentinel.
    // Cache the failure so we don't retry on every picker render.
    thumbnailCache.set(material.id, FALLBACK_SENTINEL);
    return FALLBACK_SENTINEL;
  }

  (planeMesh as THREE.Mesh).material = mat;
  r.render(scene as THREE.Scene, camera as THREE.PerspectiveCamera);
  const dataURL = r.domElement.toDataURL("image/png");
  mat.dispose();
  thumbnailCache.set(material.id, dataURL);
  return dataURL;
}

export function getThumbnail(materialId: string): string | undefined {
  return thumbnailCache.get(materialId);
}

export async function generateBatch(materials: SurfaceMaterial[]): Promise<void> {
  for (const m of materials) {
    await generateThumbnail(m); // sequential — avoids 11 concurrent WebGL renders (D-02)
  }
}

/** Test-only helper — invoked from beforeEach in vitest. */
export function __resetSwatchThumbnailCache(): void {
  thumbnailCache.clear();
}

if (typeof window !== "undefined" && import.meta.env.MODE === "test") {
  (window as unknown as {
    __resetSwatchThumbnailCache: typeof __resetSwatchThumbnailCache;
  }).__resetSwatchThumbnailCache = __resetSwatchThumbnailCache;
  (window as unknown as {
    __getMaterialThumbnail: (id: string) => string | undefined;
  }).__getMaterialThumbnail = (id: string) => getThumbnail(id);
}
