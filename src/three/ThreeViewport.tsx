import * as THREE from "three";
import { Suspense, useRef, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, PointerLockControls } from "@react-three/drei";
import { useActiveRoom, useActiveWalls, useActivePlacedProducts } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import type { Product } from "@/types/product";
import WallMesh from "./WallMesh";
import ProductMesh from "./ProductMesh";
import Lighting from "./Lighting";
import WalkCameraController from "./WalkCameraController";
import { getFloorTexture } from "./floorTexture";

interface Props {
  productLibrary: Product[];
}

function Scene({ productLibrary }: Props) {
  const room = useActiveRoom() ?? { width: 20, length: 16, wallHeight: 8 };
  const walls = useActiveWalls();
  const placedProducts = useActivePlacedProducts();
  const selectedIds = useUIStore((s) => s.selectedIds);
  const cameraMode = useUIStore((s) => s.cameraMode);

  const halfW = room.width / 2;
  const halfL = room.length / 2;

  const floorTexture = getFloorTexture(room.width, room.length);

  // D-09: preserve orbit camera position+target across mode switches
  const orbitPosRef = useRef<[number, number, number]>([halfW + 15, 12, halfL + 15]);
  const orbitTargetRef = useRef<[number, number, number]>([halfW, room.wallHeight / 3, halfL]);
  const orbitControlsRef = useRef<any>(null);

  // 05.1 fix: restore saved camera position when returning to orbit mode
  useEffect(() => {
    if (cameraMode !== "orbit") return;
    const ctrl = orbitControlsRef.current;
    if (!ctrl?.object) return;
    const [x, y, z] = orbitPosRef.current;
    ctrl.object.position.set(x, y, z);
    ctrl.update();
  }, [cameraMode]);

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

      {cameraMode === "orbit" ? (
        <OrbitControls
          ref={orbitControlsRef}
          target={orbitTargetRef.current}
          maxPolarAngle={Math.PI / 2}
          minDistance={3}
          maxDistance={80}
          enableDamping
          dampingFactor={0.1}
          onChange={() => {
            const cam = orbitControlsRef.current?.object;
            const tgt = orbitControlsRef.current?.target;
            if (cam && tgt) {
              orbitPosRef.current = [cam.position.x, cam.position.y, cam.position.z];
              orbitTargetRef.current = [tgt.x, tgt.y, tgt.z];
            }
          }}
        />
      ) : (
        <>
          <PointerLockControls maxPolarAngle={Math.PI - 0.1} minPolarAngle={0.1} />
          <WalkCameraController />
        </>
      )}
    </>
  );
}

export default function ThreeViewport({ productLibrary }: Props) {
  const room = useActiveRoom() ?? { width: 20, length: 16, wallHeight: 8 };
  const cameraMode = useUIStore((s) => s.cameraMode);
  const halfW = room.width / 2;
  const halfL = room.length / 2;

  const [showToast, setShowToast] = useState(false);
  useEffect(() => {
    if (cameraMode === "walk") {
      setShowToast(true);
      const t = setTimeout(() => setShowToast(false), 4000);
      return () => clearTimeout(t);
    } else {
      setShowToast(false);
    }
  }, [cameraMode]);

  return (
    <div className="w-full h-full bg-obsidian-deepest relative">
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
      {showToast && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 font-mono text-[10px] tracking-widest text-text-dim bg-obsidian-deepest/80 backdrop-blur-sm border border-outline-variant/20 rounded-sm pointer-events-none transition-opacity duration-500"
          style={{ opacity: showToast ? 1 : 0 }}
        >
          WALK_MODE · WASD to move · Mouse to look · ESC to exit
        </div>
      )}
    </div>
  );
}
