import * as THREE from "three";
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { useCADStore } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import type { Product } from "@/types/product";
import WallMesh from "./WallMesh";
import ProductMesh from "./ProductMesh";
import Lighting from "./Lighting";
import { getFloorTexture } from "./floorTexture";

interface Props {
  productLibrary: Product[];
}

function Scene({ productLibrary }: Props) {
  const room = useCADStore((s) => s.room);
  const walls = useCADStore((s) => s.walls);
  const placedProducts = useCADStore((s) => s.placedProducts);
  const selectedIds = useUIStore((s) => s.selectedIds);

  const halfW = room.width / 2;
  const halfL = room.length / 2;

  const floorTexture = getFloorTexture(room.width, room.length);

  return (
    <>
      <Lighting />

      {/* Floor — D-05 wood-plank procedural texture */}
      <mesh
        position={[halfW, 0, halfL]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[room.width, room.length]} />
        <meshStandardMaterial map={floorTexture} roughness={0.75} metalness={0.0} />
      </mesh>

      {/* Ambient PBR bounce — D-08 */}
      <Suspense fallback={null}>
        <Environment preset="apartment" />
      </Suspense>

      {/* Floor grid helper */}
      <gridHelper
        args={[Math.max(room.width, room.length), Math.max(room.width, room.length), "#9ca3af", "#d1d5db"]}
        position={[halfW, 0.01, halfL]}
      />

      {/* Walls */}
      {Object.values(walls).map((wall) => (
        <WallMesh
          key={wall.id}
          wall={wall}
          isSelected={selectedIds.includes(wall.id)}
        />
      ))}

      {/* Products — orphan-safe: product may be undefined, ProductMesh renders placeholder */}
      {Object.values(placedProducts).map((pp) => {
        const product = productLibrary.find((p) => p.id === pp.productId);
        return (
          <ProductMesh
            key={pp.id}
            placed={pp}
            product={product}
            isSelected={selectedIds.includes(pp.id)}
          />
        );
      })}

      <OrbitControls
        target={[halfW, room.wallHeight / 3, halfL]}
        maxPolarAngle={Math.PI / 2}
        minDistance={3}
        maxDistance={80}
        enableDamping
        dampingFactor={0.1}
      />
    </>
  );
}

export default function ThreeViewport({ productLibrary }: Props) {
  const room = useCADStore((s) => s.room);
  const halfW = room.width / 2;
  const halfL = room.length / 2;

  return (
    <div className="w-full h-full bg-obsidian-deepest">
      <Canvas
        shadows="soft"
        gl={{ preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
        camera={{
          position: [halfW + 15, 12, halfL + 15],
          fov: 50,
          near: 0.1,
          far: 200,
        }}
      >
        <Scene productLibrary={productLibrary} />
      </Canvas>
    </div>
  );
}
