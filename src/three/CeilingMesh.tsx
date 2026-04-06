import { useMemo } from "react";
import * as THREE from "three";
import type { Ceiling } from "@/types/cad";
import { resolvePaintHex } from "@/lib/colorUtils";
import { usePaintStore } from "@/stores/paintStore";

interface Props {
  ceiling: Ceiling;
  isSelected: boolean;
}

/** Ceiling rendered as a horizontal polygon mesh at its height, facing down. */
export default function CeilingMesh({ ceiling, isSelected }: Props) {
  const customColors = usePaintStore((s) => s.customColors);
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    if (ceiling.points.length === 0) return new THREE.ShapeGeometry(shape);
    shape.moveTo(ceiling.points[0].x, ceiling.points[0].y);
    for (let i = 1; i < ceiling.points.length; i++) {
      shape.lineTo(ceiling.points[i].x, ceiling.points[i].y);
    }
    shape.closePath();
    const geom = new THREE.ShapeGeometry(shape);
    // ShapeGeometry sits in XY; rotate to XZ (ground plane), then flip normal to face down
    geom.rotateX(Math.PI / 2);
    return geom;
  }, [ceiling.points]);

  const color = ceiling.paintId
    ? resolvePaintHex(ceiling.paintId, customColors)
    : ceiling.material.startsWith("#") ? ceiling.material : "#f5f5f5";
  const roughness = ceiling.limeWash ? 0.95 : 0.8;

  return (
    <mesh
      geometry={geometry}
      position={[0, ceiling.height, 0]}
      receiveShadow
    >
      <meshStandardMaterial
        color={color}
        side={THREE.DoubleSide}
        roughness={roughness}
        metalness={0}
        emissive={isSelected ? "#7c5bf0" : "#000000"}
        emissiveIntensity={isSelected ? 0.2 : 0}
      />
    </mesh>
  );
}
