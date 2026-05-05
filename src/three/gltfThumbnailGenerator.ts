/**
 * Phase 58 — GLTF-INTEGRATION-01: auto-thumbnail engine for GLTF library cards.
 *
 * Owns ONE shared `THREE.WebGLRenderer` (lazy-init on first call) plus a
 * studio-lit scene + perspective camera (FOV=35°). Each GLTF parse + render
 * yields a 256×256 PNG dataURL cached in-memory keyed by gltfId.
 *
 * Total WebGL contexts after this phase: 3
 *   1) main viewport (R3F)
 *   2) Phase 45 swatch thumbnail
 *   3) Phase 58 GLTF thumbnail (this module)
 *
 * Do NOT call registerRenderer() — Phase 45 D-08 / Phase 58 D-10. The main
 * viewport owns global anisotropy; this offscreen renderer must not register.
 *
 * On parse/load failure, caches the literal sentinel `"fallback"` — the
 * UI component does string-equality on this exact value to decide whether
 * to render no thumbnail.
 *
 * Camera framing (research Q2 — overrides 58-CONTEXT D-11):
 *   distance = (maxDim / 2) / tan(fov/2) * SAFETY_FACTOR
 * 3/4 perspective: camera placed along normalized (1, 0.7, 1) offset from bbox center.
 *
 * Disposal (research Q4): on every render — success and catch — traverse the
 * parsed GLTF scene and dispose geometries + 10 PBR texture maps + materials.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { getGltf } from "@/lib/gltfStore";

const THUMB_SIZE = 256; // D-05
const FALLBACK_SENTINEL = "fallback"; // D-08 — exact literal ProductLibrary checks
const FOV_DEGREES = 35; // D-04
const SAFETY_FACTOR = 1.4; // ~40% padding (research Q2)
const VIEW_DIRECTION = new THREE.Vector3(1, 0.7, 1).normalize(); // 3/4 perspective

const thumbnailCache = new Map<string, string>(); // gltfId → dataURL OR "fallback"
const computing = new Set<string>(); // in-flight gltfIds (FIX-01 pattern)
// React StrictMode (dev) double-mounts components: the first mount's onReady
// closure becomes stale before compute resolves. Track ALL onReady callbacks
// per gltfId and fire each one on resolve so the surviving mount re-renders.
const pendingCallbacks = new Map<string, Set<() => void>>();

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;

function ensureRenderer(): THREE.WebGLRenderer {
  if (renderer) return renderer;
  const canvas = document.createElement("canvas");
  canvas.width = THUMB_SIZE;
  canvas.height = THUMB_SIZE;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(THUMB_SIZE, THUMB_SIZE);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0); // transparent (D-07)

  scene = new THREE.Scene();

  // Studio lighting (D-06)
  const dir = new THREE.DirectionalLight(0xffffff, 1.5);
  dir.position.set(2, 2, 1.5);
  scene.add(dir);
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const rim = new THREE.DirectionalLight(0xffffff, 0.3);
  rim.position.set(-1, 0.5, -1);
  scene.add(rim);

  camera = new THREE.PerspectiveCamera(FOV_DEGREES, 1, 0.1, 100);

  return renderer;
}

/**
 * Dispose all geometries + 10 PBR texture maps + materials referenced by a
 * parsed GLTF scene. Called on both success path and catch path so failed
 * parses do not leak GPU memory.
 */
function disposeGltfScene(root: THREE.Object3D): void {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    node.geometry?.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const mat of materials) {
      if (!mat) continue;
      const m = mat as THREE.MeshStandardMaterial;
      // Dispose all 10 PBR texture maps GLTFs commonly reference
      m.map?.dispose();
      m.normalMap?.dispose();
      m.roughnessMap?.dispose();
      m.metalnessMap?.dispose();
      m.aoMap?.dispose();
      m.emissiveMap?.dispose();
      m.bumpMap?.dispose();
      m.displacementMap?.dispose();
      m.alphaMap?.dispose();
      m.envMap?.dispose();
      mat.dispose();
    }
  });
}

/**
 * Parse a GLTF blob from IDB, render a 256×256 PNG of it, and return the dataURL.
 * Returns FALLBACK_SENTINEL on any failure (missing IDB entry, parse error, etc).
 */
export async function computeGltfThumbnail(gltfId: string): Promise<string> {
  let parsedScene: THREE.Group | null = null;
  try {
    const model = await getGltf(gltfId);
    if (!model) return FALLBACK_SENTINEL;
    const buf = await model.blob.arrayBuffer();
    const gltf = await new GLTFLoader().parseAsync(buf, "");
    parsedScene = gltf.scene;

    parsedScene.updateMatrixWorld(true, true); // Pitfall 1 — must precede Box3
    const bbox = new THREE.Box3().setFromObject(parsedScene);
    const size = bbox.getSize(new THREE.Vector3());
    const center = bbox.getCenter(new THREE.Vector3());

    // FOV-based framing (research Q2 — overrides CONTEXT D-11 diagonal formula)
    const fovRad = (FOV_DEGREES * Math.PI) / 180;
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = (maxDim / 2) / Math.tan(fovRad / 2);

    const r = ensureRenderer();
    if (!scene || !camera) throw new Error("renderer init failed");

    scene.add(parsedScene);
    camera.position
      .copy(center)
      .add(VIEW_DIRECTION.clone().multiplyScalar(distance * SAFETY_FACTOR));
    camera.near = Math.max(distance * 0.01, 0.001);
    camera.far = distance * 10;
    camera.updateProjectionMatrix();
    camera.lookAt(center);

    r.render(scene, camera);
    const dataUrl = r.domElement.toDataURL("image/png");

    scene.remove(parsedScene);
    disposeGltfScene(parsedScene);
    return dataUrl;
  } catch {
    if (parsedScene && scene) {
      scene.remove(parsedScene);
      disposeGltfScene(parsedScene);
    }
    return FALLBACK_SENTINEL;
  }
}

/**
 * Lazy compute on first library render. Returns synchronously:
 *   - dataURL string (incl. "fallback" sentinel) → cached; render accordingly
 *   - undefined → compute in flight; caller must wait for onReady to re-render
 *
 * onReady fires once per cache miss when async work resolves (success OR failure).
 * Mirrors getCachedSilhouette semantics from src/lib/gltfSilhouette.ts (Phase 57).
 */
export function getCachedGltfThumbnail(
  gltfId: string,
  onReady: () => void,
): string | undefined {
  const hit = thumbnailCache.get(gltfId);
  if (hit !== undefined) return hit; // dataURL OR "fallback"

  // Register this caller's onReady callback (StrictMode-safe — every render gets
  // its own closure, all are tracked, all fire on resolve).
  let callbacks = pendingCallbacks.get(gltfId);
  if (!callbacks) {
    callbacks = new Set();
    pendingCallbacks.set(gltfId, callbacks);
  }
  callbacks.add(onReady);

  if (computing.has(gltfId)) return undefined;

  computing.add(gltfId);
  void (async () => {
    try {
      const result = await computeGltfThumbnail(gltfId);
      thumbnailCache.set(gltfId, result);
    } catch {
      thumbnailCache.set(gltfId, FALLBACK_SENTINEL);
    } finally {
      computing.delete(gltfId);
      const cbs = pendingCallbacks.get(gltfId);
      pendingCallbacks.delete(gltfId);
      cbs?.forEach((cb) => cb());
    }
  })();
  return undefined;
}

/** Test-only helper — invoked from beforeEach in vitest. */
export function __resetGltfThumbnailCache(): void {
  thumbnailCache.clear();
  computing.clear();
  pendingCallbacks.clear();
}

if (typeof window !== "undefined" && import.meta.env.MODE === "test") {
  (
    window as unknown as {
      __resetGltfThumbnailCache: typeof __resetGltfThumbnailCache;
    }
  ).__resetGltfThumbnailCache = __resetGltfThumbnailCache;
}
