import { useMemo } from "react";
import * as THREE from "three";
import type { WallSegment } from "@/types/cad";
import { wallLength, angle } from "@/lib/geometry";

interface Props {
  wall: WallSegment;
  isSelected: boolean;
}

export default function WallMesh({ wall, isSelected }: Props) {
  const { position, rotation, dimensions } = useMemo(() => {
    const len = wallLength(wall);
    const midX = (wall.start.x + wall.end.x) / 2;
    const midY = (wall.start.y + wall.end.y) / 2;
    const a = angle(wall.start, wall.end);

    return {
      // Convert 2D coords to 3D: x stays, z = y (depth), y = height/2 (up)
      position: new THREE.Vector3(midX, wall.height / 2, midY),
      rotation: new THREE.Euler(0, -a, 0),
      dimensions: { length: len, height: wall.height, thickness: wall.thickness },
    };
  }, [wall]);

  // Create wall geometry with openings cut out
  const geometry = useMemo(() => {
    const { length, height, thickness } = dimensions;

    if (wall.openings.length === 0) {
      return new THREE.BoxGeometry(length, height, thickness);
    }

    // For walls with openings, use CSG-like approach via shape extrusion
    const shape = new THREE.Shape();
    const halfLen = length / 2;
    const halfH = height / 2;

    // Outer rectangle (wall face)
    shape.moveTo(-halfLen, -halfH);
    shape.lineTo(halfLen, -halfH);
    shape.lineTo(halfLen, halfH);
    shape.lineTo(-halfLen, halfH);
    shape.lineTo(-halfLen, -halfH);

    // Cut openings as holes
    for (const opening of wall.openings) {
      const oLeft = opening.offset - halfLen;
      const oRight = oLeft + opening.width;
      const oBottom = opening.sillHeight - halfH;
      const oTop = oBottom + opening.height;

      const hole = new THREE.Path();
      hole.moveTo(oLeft, oBottom);
      hole.lineTo(oRight, oBottom);
      hole.lineTo(oRight, oTop);
      hole.lineTo(oLeft, oTop);
      hole.lineTo(oLeft, oBottom);
      shape.holes.push(hole);
    }

    const extrudeSettings = {
      depth: thickness,
      bevelEnabled: false,
    };

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // Center the extrusion along Z
    geo.translate(0, 0, -thickness / 2);
    return geo;
  }, [dimensions, wall.openings]);

  return (
    <mesh position={position} rotation={rotation} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color={isSelected ? "#93c5fd" : "#f8f5ef"}
        roughness={0.85}
        metalness={0.0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
