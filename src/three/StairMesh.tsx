// src/three/StairMesh.tsx
// Phase 60 STAIRS-01 (D-06): 3D stair rendering — N stacked box meshes.
//
// Layout: each step is a `widthFt × riseFt × runFt` box. Step i is offset:
//   x: 0 (centered on stair width)
//   y: riseFt * (i + 0.5)   (vertical center of step i)
//   z: runFt * (i + 0.5)    (along the UP axis, in local space)
//
// Wrapping <group> applies stair.position (bottom-step center, D-04) and
// stair.rotation. Phase 53 right-click + Phase 54 click-to-select wire to
// useUIStore via useClickDetect (mirror ProductMesh / GltfProduct pattern).
//
// Selection outline: single bbox edges-geometry (mirror Phase 56 GltfProduct
// Box3Helper pattern) — 1 draw call regardless of stepCount.

import * as THREE from "three";
import { useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { Stair } from "@/types/cad";
import { DEFAULT_STAIR_WIDTH_FT } from "@/types/cad";
import { useUIStore } from "@/stores/uiStore";
import { useClickDetect } from "@/hooks/useClickDetect";

interface Props {
  stair: Stair;
  isSelected: boolean;
  /** Reserved for future per-room dispatching; unused in v1.15 (saved-camera
   *  uses activeRoomId implicitly via cadStore.setSavedCameraOnStairNoHistory). */
  roomId?: string;
}

const STAIR_COLOR = "#cdc7b8";
const STAIR_ROUGHNESS = 0.7;
const SELECTION_OUTLINE_COLOR = "#7c5bf0";

export default function StairMesh({ stair, isSelected }: Props) {
  const widthFt = stair.widthFtOverride ?? DEFAULT_STAIR_WIDTH_FT;
  const riseFt = stair.riseIn / 12;
  const runFt = stair.runIn / 12;

  // Phase 54: click to select.
  const { handlePointerDown, handlePointerUp } = useClickDetect(() => {
    useUIStore.getState().select([stair.id]);
  });

  // Phase 53: right-click to open context menu.
  const onContextMenu = (e: ThreeEvent<MouseEvent>) => {
    if (e.nativeEvent.button !== 2) return;
    e.stopPropagation();
    e.nativeEvent.preventDefault();
    useUIStore.getState().openContextMenu("stair", stair.id, {
      x: e.nativeEvent.clientX,
      y: e.nativeEvent.clientY,
    });
  };

  // Selection outline: full-envelope bbox edges (Phase 56 Box3Helper mirror).
  // 1 draw call regardless of stepCount; consistent visual with Phase 31
  // resize-handle accent stroke. Centered on the envelope center which is
  // offset from local origin by half-extents along Y and Z (since steps are
  // stacked from y=0 upward and z=0 onward in local space).
  const outlineGeometry = useMemo(() => {
    if (!isSelected) return null;
    const totalRise = riseFt * stair.stepCount;
    const totalRun = runFt * stair.stepCount;
    const min = new THREE.Vector3(-widthFt / 2, 0, 0);
    const max = new THREE.Vector3(widthFt / 2, totalRise, totalRun);
    const helper = new THREE.Box3Helper(new THREE.Box3(min, max));
    return helper.geometry;
  }, [isSelected, widthFt, riseFt, runFt, stair.stepCount]);

  // 3D rotation: positive Y-axis rotation in three.js coordinates. Stair.rotation
  // is in 2D-feet space where +rotation rotates the +y axis (UP in 2D feet) to
  // the +x axis. In three.js floor plane (XZ), 2D-y maps to 3D-z; so we rotate
  // around three.js Y-axis by the SAME degree value (sign matches the 2D
  // convention used by ProductMesh: rotY = -rotation*PI/180). However,
  // because the local stair extends in +z (positive UP in local space here)
  // while 2D UP is -y_fabric_feet, we use rotY = -(rotation * pi / 180) to
  // keep visual orientation consistent with the 2D arrow direction.
  const rotY = -(stair.rotation * Math.PI) / 180;

  return (
    <group
      position={[stair.position.x, 0, stair.position.y]}
      rotation={[0, rotY, 0]}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onContextMenu={onContextMenu}
    >
      {Array.from({ length: stair.stepCount }, (_, i) => (
        <mesh
          key={i}
          position={[0, riseFt * (i + 0.5), runFt * (i + 0.5)]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[widthFt, riseFt, runFt]} />
          <meshStandardMaterial color={STAIR_COLOR} roughness={STAIR_ROUGHNESS} />
        </mesh>
      ))}
      {isSelected && outlineGeometry && (
        <lineSegments geometry={outlineGeometry}>
          <lineBasicMaterial color={SELECTION_OUTLINE_COLOR} linewidth={2} />
        </lineSegments>
      )}
    </group>
  );
}
