// src/three/NicheMesh.tsx
// Phase 61 OPEN-01 (D-06, D-07, research Q3 + Q6).
//
// Niche = recessed cutout that does NOT pass through the wall. Rendered as a
// separate 5-plane group on the wall's INTERIOR face (toward the room
// centroid). The wall body is left solid (WallMesh skips niches in its
// holes loop) so the back face never breaks through to the exterior.
//
// Position math (research Q3, sign-convention CORRECTION applied):
//   - Wall direction unit vector U = (Ux, Uz) in XZ world plane
//   - Outward normal N_out (Phase 59 helper, points AWAY from room)
//   - Interior face = wall midpoint + N_in × T/2 (N_in = -N_out)
//   - Niche front-face center sits on the interior face
//   - Group center is offset from front by N_out × depth/2 (recess INTO
//     the wall body, AWAY from the room — opposite to N_in)
//
// Box rotation: rotation.y = -atan2(Uz, Ux) (matches WallMesh.tsx:88-95)
//
// Test fixture: wall (0,0)→(10,0), thickness 0.5, niche offset 4 width 2
// depthFt 0.4 (clamp pre-applied), room interior at +Z:
//   - frontX = 5.0, frontZ = +0.25 (interior face)
//   - groupCenterZ = 0.25 + (-1)*0.20 = 0.05  (Wait: outNormal=(0,0,-1),
//     so centerZ = 0.25 + (-1) × 0.20 = 0.05. Box back wall at local-Z = -0.20
//     → world Z = 0.05 + (-0.20) (rotated) ... see comment block below.)
//
// All planes use WALL_BASE_COLOR meshStandardMaterial with DoubleSide so
// either face is visible (matches the wall body convention).

import { useMemo } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { WallSegment, Opening } from "@/types/cad";
import { clampNicheDepth } from "@/types/cad";
import { wallLength } from "@/lib/geometry";
import { computeOutwardNormalInto } from "./cutawayDetection";
import { WALL_BASE_COLOR } from "./WallMesh";
import { useUIStore } from "@/stores/uiStore";

interface Props {
  wall: WallSegment;
  opening: Opening;
  roomCenter: { x: number; y: number };
}

// Module-level scratch — reused per render; never allocated inside the hot path.
const _outNormal = new THREE.Vector3();

export default function NicheMesh({ wall, opening, roomCenter }: Props) {
  const { groupPos, groupRot, w, h, d } = useMemo(() => {
    computeOutwardNormalInto(wall, roomCenter, _outNormal);
    const len = wallLength(wall);
    if (len < 1e-6) {
      // Degenerate wall — render at origin; wall geometry is already invalid.
      return {
        groupPos: [0, 0, 0] as [number, number, number],
        groupRot: [0, 0, 0] as [number, number, number],
        w: opening.width,
        h: opening.height,
        d: clampNicheDepth(opening.depthFt ?? 0.5, wall.thickness),
      };
    }
    const Ux = (wall.end.x - wall.start.x) / len;
    const Uz = (wall.end.y - wall.start.y) / len;
    // Center along the wall, in 2D plan coords (x ↔ x, y ↔ z).
    const centerAlongX = wall.start.x + Ux * (opening.offset + opening.width / 2);
    const centerAlongZ = wall.start.y + Uz * (opening.offset + opening.width / 2);
    // Interior-face position: wall midpoint shifted by N_in (= -outNormal) × T/2.
    const frontX = centerAlongX + -_outNormal.x * (wall.thickness / 2);
    const frontZ = centerAlongZ + -_outNormal.z * (wall.thickness / 2);
    // Recess goes INTO the wall (opposite to N_in, i.e. in the +outNormal direction).
    const depth = clampNicheDepth(opening.depthFt ?? 0.5, wall.thickness);
    const centerX = frontX + _outNormal.x * (depth / 2);
    const centerZ = frontZ + _outNormal.z * (depth / 2);
    const centerY = opening.sillHeight + opening.height / 2;
    // Wall rotation around Y — match WallMesh convention (Euler(0, -angle, 0)).
    const wallAngleY = Math.atan2(Uz, Ux);
    return {
      groupPos: [centerX, centerY, centerZ] as [number, number, number],
      groupRot: [0, -wallAngleY, 0] as [number, number, number],
      w: opening.width,
      h: opening.height,
      d: depth,
    };
  }, [wall, opening, roomCenter]);

  // Group-local axes (after the outer rotation):
  //   +X = along the wall (start → end)
  //   +Y = world up
  //   +Z = OUT of the wall body, INTO the room (since rotation.y = -wallAngle
  //         aligns local +X with the wall direction; perpendicular local +Z
  //         points along +N_in → toward the room interior, away from the
  //         outward normal).
  // Open-front means the front face (local +Z = +d/2) is OMITTED. We render:
  //   - back at z = -d/2
  //   - top    at y = +h/2 (faces -Y → into niche)
  //   - bottom at y = -h/2 (faces +Y)
  //   - left   at x = -w/2 (faces +X)
  //   - right  at x = +w/2 (faces -X)
  // All planes use DoubleSide (matches the wall convention) so users can
  // see the recess from any angle.
  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    useUIStore.getState().select([opening.id]);
  };
  const onContextMenu = (e: ThreeEvent<MouseEvent>) => {
    if (e.nativeEvent.button !== 2) return;
    e.stopPropagation();
    e.nativeEvent.preventDefault();
    useUIStore.getState().openContextMenu(
      "opening",
      opening.id,
      { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY },
      wall.id,
    );
  };

  return (
    <group position={groupPos} rotation={groupRot} onPointerUp={onPointerUp} onContextMenu={onContextMenu}>
      {/* Back wall — closes the recess at the deep end. */}
      <mesh position={[0, 0, -d / 2]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color={WALL_BASE_COLOR} roughness={0.85} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      {/* Top face */}
      <mesh position={[0, h / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={WALL_BASE_COLOR} roughness={0.85} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      {/* Bottom face */}
      <mesh position={[0, -h / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={WALL_BASE_COLOR} roughness={0.85} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      {/* Left face */}
      <mesh position={[-w / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[d, h]} />
        <meshStandardMaterial color={WALL_BASE_COLOR} roughness={0.85} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      {/* Right face */}
      <mesh position={[w / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[d, h]} />
        <meshStandardMaterial color={WALL_BASE_COLOR} roughness={0.85} metalness={0} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
