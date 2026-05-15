// src/three/ColumnMesh.tsx
// Phase 86 COL-01 (D-01, D-03, D-05): 3D rendering of a column primitive.
//
// Layout: a single boxGeometry(widthFt, heightFt, depthFt) centered at
// (column.position.x, heightFt/2, column.position.y). Floor sits at y=0;
// the box rises to y=heightFt. Group rotation around Y matches the 2D
// convention used by StairMesh: rotY = -(rotation * pi / 180).
//
// D-01 box-only enforcement: non-"box" shapes render null (cylinder reserved
// for future v1.21+).
//
// Phase 78 material pipeline: useResolvedMaterial with surface dims = the
// rectangular envelope; v1.20 ships uniform tile-size (scaleFt=undefined).
//
// Selection outline: single bbox edges-geometry (Phase 56 Box3Helper mirror).

import * as THREE from "three";
import { useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { Column } from "@/types/cad";
import { useUIStore } from "@/stores/uiStore";
import { useClickDetect } from "@/hooks/useClickDetect";
import { useResolvedMaterial } from "./useResolvedMaterial";

interface Props {
  column: Column;
  isSelected: boolean;
  /** Reserved for future per-room dispatching (matches StairMesh). */
  roomId?: string;
}

const COLUMN_DEFAULT_COLOR = "#f5f5f5";
const COLUMN_DEFAULT_ROUGHNESS = 0.85;
const SELECTION_OUTLINE_COLOR = "#7c5bf0";

export default function ColumnMesh({ column, isSelected }: Props) {
  const { widthFt, depthFt, heightFt } = column;

  // Hooks must be called UNCONDITIONALLY at the top of the body (Rules of Hooks).
  // We call useResolvedMaterial regardless of shape; the early-return below
  // for non-box shapes is safe because every hook above runs first.
  const resolved = useResolvedMaterial(
    column.materialId,
    undefined, // scaleFt — v1.20 ships uniform tile-size
    Math.max(widthFt, depthFt),
    heightFt,
  );

  // Phase 54: click to select.
  const { handlePointerDown, handlePointerUp } = useClickDetect(() => {
    useUIStore.getState().select([column.id]);
  });

  // Selection outline geometry (re-derived on size change).
  const outlineGeometry = useMemo(() => {
    if (!isSelected) return null;
    const min = new THREE.Vector3(-widthFt / 2, 0, -depthFt / 2);
    const max = new THREE.Vector3(widthFt / 2, heightFt, depthFt / 2);
    const helper = new THREE.Box3Helper(new THREE.Box3(min, max));
    return helper.geometry;
  }, [isSelected, widthFt, depthFt, heightFt]);

  // D-01: v1.20 ships "box" only.
  if (column.shape !== "box") return null;

  // Phase 53: right-click to open context menu.
  const onContextMenu = (e: ThreeEvent<MouseEvent>) => {
    if (e.nativeEvent.button !== 2) return;
    e.stopPropagation();
    e.nativeEvent.preventDefault();
    useUIStore.getState().openContextMenu("column", column.id, {
      x: e.nativeEvent.clientX,
      y: e.nativeEvent.clientY,
    });
  };

  // Match StairMesh convention: rotY = -(rotation * pi / 180).
  const rotY = -(column.rotation * Math.PI) / 180;

  return (
    <group
      position={[column.position.x, heightFt / 2, column.position.y]}
      rotation={[0, rotY, 0]}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onContextMenu={onContextMenu}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[widthFt, heightFt, depthFt]} />
        {resolved ? (
          <meshStandardMaterial
            map={resolved.colorMap ?? undefined}
            roughnessMap={resolved.roughnessMap ?? undefined}
            aoMap={resolved.aoMap ?? undefined}
            displacementMap={resolved.displacementMap ?? undefined}
            color={resolved.colorHex ?? COLUMN_DEFAULT_COLOR}
            roughness={resolved.roughness ?? COLUMN_DEFAULT_ROUGHNESS}
            metalness={resolved.metalness ?? 0}
          />
        ) : (
          <meshStandardMaterial
            color={COLUMN_DEFAULT_COLOR}
            roughness={COLUMN_DEFAULT_ROUGHNESS}
          />
        )}
      </mesh>
      {isSelected && outlineGeometry && (
        <lineSegments geometry={outlineGeometry}>
          <lineBasicMaterial color={SELECTION_OUTLINE_COLOR} linewidth={2} />
        </lineSegments>
      )}
    </group>
  );
}
