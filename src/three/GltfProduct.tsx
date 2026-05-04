/**
 * Phase 56 GLTF-RENDER-3D-01: GltfProduct — renders a GLTF model via drei useGLTF.
 *
 * Receives a resolved (non-null) blob URL from ProductMesh after useGltfBlobUrl resolves.
 * Auto-scales to user-specified product dimensions; aligns bottom edge to Y=0.
 * Shows accent-purple bbox wireframe when selected.
 *
 * Position/rotation are handled by the parent <group> in ProductMesh (D-07).
 * This component only manages Y offset and uniform scale.
 */
import * as THREE from "three";
import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";

interface GltfProductProps {
  /** Resolved ObjectURL — always non-null (ProductMesh guards before rendering this component). */
  url: string;
  /** Target width in feet (from resolveEffectiveDims — respects Phase 31 overrides). */
  width: number;
  /** Target depth in feet. */
  depth: number;
  /** Target height in feet. */
  height: number;
  isSelected: boolean;
}

export default function GltfProduct({
  url,
  width,
  depth,
  height,
  isSelected,
}: GltfProductProps) {
  // useGLTF suspends (throws a Promise) while parsing — the <Suspense> fallback in
  // ProductMesh handles the loading state. url is always non-null here (D-07).
  const { scene } = useGLTF(url);

  // Step 1: measure the model as-loaded (arbitrary author units, e.g. mm, cm, m)
  // CRITICAL: call updateWorldMatrix first to avoid stale transforms (Pitfall 3)
  const { bbox, modelSize } = useMemo(() => {
    scene.updateWorldMatrix(true, true);
    const b = new THREE.Box3().setFromObject(scene);
    const s = new THREE.Vector3();
    b.getSize(s);
    return { bbox: b, modelSize: s };
  }, [scene]);

  // Step 2: compute uniform scale that fits model into user's specified bbox
  // Guard zero-size axes (flat planes, empty scenes) — skip axis if extent is 0
  const uniformScale = useMemo(() => {
    const candidates = [
      modelSize.x > 0 ? width / modelSize.x : Infinity,
      modelSize.y > 0 ? height / modelSize.y : Infinity,
      modelSize.z > 0 ? depth / modelSize.z : Infinity,
    ].filter(isFinite);
    if (candidates.length === 0) return 1;
    return Math.min(...candidates);
  }, [modelSize, width, height, depth]);

  // Step 3: Y offset — shift so bbox.min.y * uniformScale = 0 (model sits on floor, D-03)
  const yOffset = useMemo(
    () => -bbox.min.y * uniformScale,
    [bbox, uniformScale],
  );

  // Selection outline: bbox wireframe via Box3Helper (56-RESEARCH.md §4 recommendation)
  // 1 draw call regardless of GLTF mesh count; consistent with Phase 31 resize handle visual
  const outlineGeometry = useMemo(() => {
    if (!isSelected) return null;
    const scaledMin = bbox.min.clone().multiplyScalar(uniformScale);
    const scaledMax = bbox.max.clone().multiplyScalar(uniformScale);
    const helper = new THREE.Box3Helper(new THREE.Box3(scaledMin, scaledMax));
    return helper.geometry;
  }, [isSelected, bbox, uniformScale]);

  // GltfProduct does NOT apply X/Z position or Y rotation — those live on the parent group
  // in ProductMesh (D-07). The local position here is only the Y offset.
  return (
    <group position={[0, yOffset, 0]} scale={[uniformScale, uniformScale, uniformScale]}>
      <primitive object={scene} castShadow receiveShadow />
      {isSelected && outlineGeometry && (
        <lineSegments geometry={outlineGeometry}>
          <lineBasicMaterial color="#7c5bf0" linewidth={2} />
        </lineSegments>
      )}
    </group>
  );
}
