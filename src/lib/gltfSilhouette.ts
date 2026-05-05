/**
 * Phase 57 — GLTF-RENDER-2D-01: Top-down silhouette compute + async cache.
 *
 * Pipeline (D-01 through D-05):
 *   1. loadGltfScene(gltfId)   — getGltf → blob.arrayBuffer → GLTFLoader.parseAsync
 *   2. extractTopDownPoints    — scene.updateMatrixWorld(true,true) → traverse meshes →
 *                                project (x, z) tuples after applying matrixWorld (D-02)
 *   3. convexHull2D            — Andrew's monotone chain (~30 LoC, no library)
 *   4. computeTopDownSilhouette — wraps 2 + 3; returns null on empty/degenerate
 *   5. getCachedSilhouette     — module-level Map cache + Set in-flight guard
 *                                mirrors productImageCache.ts FIX-01 pattern exactly
 *
 * Sentinel semantics (D-08) for getCachedSilhouette return:
 *   Hull       → render fabric.Polygon
 *   null       → permanent failure (corrupt file / degenerate hull) → render fabric.Rect
 *   undefined  → compute in progress → render fabric.Rect placeholder
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { getGltf } from "@/lib/gltfStore";

export type Hull = Array<[number, number]>;

// ─── Geometry: Andrew's monotone chain convex hull (2D) ──────────────────────

function cross2D(
  O: [number, number],
  A: [number, number],
  B: [number, number],
): number {
  return (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0]);
}

/** Andrew's monotone chain — O(n log n). Returns CCW-ordered hull. */
export function convexHull2D(points: Hull): Hull {
  const n = points.length;
  if (n < 3) return [...points];

  const sorted: Hull = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  const lower: Hull = [];
  for (const p of sorted) {
    while (
      lower.length >= 2 &&
      cross2D(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: Hull = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (
      upper.length >= 2 &&
      cross2D(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }

  // Remove the duplicated end-points where the two halves meet.
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

// ─── Mesh traversal & projection ─────────────────────────────────────────────

function extractTopDownPoints(scene: THREE.Group): Hull {
  // CRITICAL (D-02): force matrixWorld to reflect node transforms before traverse.
  // Freshly parsed scenes have identity matrixWorld until updateMatrixWorld is called.
  scene.updateMatrixWorld(true, true);

  const points: Hull = [];
  const v = new THREE.Vector3();

  scene.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const geo = node.geometry as THREE.BufferGeometry | undefined;
    const pos = geo?.attributes?.position;
    if (!pos) return;

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(node.matrixWorld);
      points.push([v.x, v.z]); // top-down projection — drop Y
    }
  });

  return points;
}

/**
 * Compute the top-down convex-hull silhouette of a parsed GLTF scene.
 * Returns null for empty geometry or degenerate hulls (< 3 vertices) — D-08.
 */
export function computeTopDownSilhouette(scene: THREE.Group): Hull | null {
  const raw = extractTopDownPoints(scene);
  if (raw.length === 0) return null;
  const hull = convexHull2D(raw);
  if (hull.length < 3) return null;
  return hull;
}

// ─── Async loader (non-React, plain Three.js) ────────────────────────────────

async function loadGltfScene(gltfId: string): Promise<THREE.Group | null> {
  const model = await getGltf(gltfId);
  if (!model) return null;
  const buf = await model.blob.arrayBuffer();
  const loader = new GLTFLoader();
  // path="" is correct for self-contained .glb files (Phase 55 stores blob as-is).
  // .gltf files referencing external .bin would need loadAsync(blobUrl) — not in scope.
  const gltf = await loader.parseAsync(buf, "");
  return gltf.scene;
}

// ─── Async cache (mirrors productImageCache.ts FIX-01 pattern exactly) ───────

const silhouetteCache = new Map<string, Hull | null>();
const computing = new Set<string>();

/**
 * Lazy compute on first 2D render. Returns synchronously:
 *   - Hull       → cached & valid; render polygon
 *   - null       → cached & failed; render rect fallback
 *   - undefined  → compute in flight; render rect placeholder (will re-render via onReady)
 *
 * onReady fires once per cache miss when async work resolves (success OR failure).
 * Mirrors getCachedImage(productId, url, onReady) semantics from productImageCache.ts.
 */
export function getCachedSilhouette(
  gltfId: string,
  onReady: () => void,
): Hull | null | undefined {
  if (silhouetteCache.has(gltfId)) {
    return silhouetteCache.get(gltfId) ?? null;
  }
  if (computing.has(gltfId)) return undefined;

  computing.add(gltfId);
  void (async () => {
    try {
      const scene = await loadGltfScene(gltfId);
      const hull = scene ? computeTopDownSilhouette(scene) : null;
      silhouetteCache.set(gltfId, hull);
    } catch {
      // Sentinel: corrupt file or unparseable — permanent rect fallback (D-08)
      silhouetteCache.set(gltfId, null);
    } finally {
      computing.delete(gltfId);
      onReady();
    }
  })();
  return undefined;
}

/** Test-only helper to reset module state between tests (mirrors productImageCache.__resetCache). */
export function __resetSilhouetteCache(): void {
  silhouetteCache.clear();
  computing.clear();
}
