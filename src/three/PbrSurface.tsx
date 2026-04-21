import { Suspense, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import type { PbrMaps } from "@/data/surfaceMaterials";
import { acquireTexture, releaseTexture } from "./pbrTextureCache";
import { PbrErrorBoundary } from "./PbrErrorBoundary";

interface Props {
  /** Required PBR maps for the surface. */
  pbr: PbrMaps;
  /** Real-world surface dimensions in feet — drives repeat count. */
  widthFt: number;
  lengthFt: number;
  /** Fallback JSX if any map fails to load (typically a flat meshStandardMaterial). */
  fallback: ReactNode;
}

/** Wraps children-less PBR material application in per-mesh Suspense + ErrorBoundary (D-15).
 *  Returns a <meshStandardMaterial> element with all three maps + repeat configured,
 *  OR — on load error — renders `fallback` via the ErrorBoundary. */
export function PbrSurface({ pbr, widthFt, lengthFt, fallback }: Props): JSX.Element {
  return (
    <PbrErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <PbrMaterial pbr={pbr} widthFt={widthFt} lengthFt={lengthFt} />
      </Suspense>
    </PbrErrorBoundary>
  );
}

/** Internal: suspends on texture load, then emits the configured material. */
function PbrMaterial({ pbr, widthFt, lengthFt }: Omit<Props, "fallback">): JSX.Element {
  // Suspend-and-resolve via a throwable promise cache.
  const maps = useLoadedMaps(pbr);
  const repeat = useMemo(() => {
    const rx = Math.max(0.1, widthFt / Math.max(0.01, pbr.tile.wFt));
    const ry = Math.max(0.1, lengthFt / Math.max(0.01, pbr.tile.lFt));
    return new THREE.Vector2(rx, ry);
  }, [widthFt, lengthFt, pbr.tile.wFt, pbr.tile.lFt]);

  // Apply repeat on all three maps (D-04 — identical repeat across set).
  useEffect(() => {
    for (const m of [maps.albedo, maps.normal, maps.roughness]) {
      m.repeat.copy(repeat);
      m.needsUpdate = true;
    }
  }, [maps, repeat]);

  return (
    <meshStandardMaterial
      map={maps.albedo}
      normalMap={maps.normal}
      roughnessMap={maps.roughness}
      metalness={0}
      side={THREE.DoubleSide}
    />
  );
}

// Simple suspense-compatible resolver (throws promise on first read).
const pending = new Map<string, Promise<void>>();
const loaded = new Map<string, { albedo: THREE.Texture; normal: THREE.Texture; roughness: THREE.Texture }>();

function useLoadedMaps(pbr: PbrMaps) {
  const key = `${pbr.albedo}|${pbr.normal}|${pbr.roughness}`;
  // Release refs on unmount (acquire adds ref; release on unmount).
  useEffect(() => {
    return () => {
      releaseTexture(pbr.albedo);
      releaseTexture(pbr.normal);
      releaseTexture(pbr.roughness);
    };
  }, [pbr.albedo, pbr.normal, pbr.roughness]);

  const ready = loaded.get(key);
  if (ready) {
    return ready;
  }
  let p = pending.get(key);
  if (!p) {
    p = Promise.all([
      acquireTexture(pbr.albedo, "albedo"),
      acquireTexture(pbr.normal, "normal"),
      acquireTexture(pbr.roughness, "roughness"),
    ]).then(([albedo, normal, roughness]) => {
      loaded.set(key, { albedo, normal, roughness });
      pending.delete(key);
    });
    pending.set(key, p);
  }
  throw p;
}

/** Test-only: wipe resolver memoization so tests can exercise fresh loads. */
export function __resetPbrSurfaceForTests(): void {
  pending.clear();
  loaded.clear();
}
