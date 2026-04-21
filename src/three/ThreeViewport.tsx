import * as THREE from "three";
import { Suspense, useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, PointerLockControls } from "@react-three/drei";
import { registerRenderer } from "./pbrTextureCache";
import { useActiveRoom, useActiveRoomDoc, useActiveWalls, useActivePlacedProducts, useActiveCeilings, useActivePlacedCustomElements, useCustomElements } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import type { Product } from "@/types/product";
import { angle as wallAngleRad } from "@/lib/geometry";
import WallMesh from "./WallMesh";
import ProductMesh from "./ProductMesh";
import CeilingMesh from "./CeilingMesh";
import FloorMesh from "./FloorMesh";
import CustomElementMesh from "./CustomElementMesh";
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
  const ceilings = useActiveCeilings();
  const placedCustoms = useActivePlacedCustomElements();
  const customCatalog = useCustomElements();
  const activeDoc = useActiveRoomDoc();
  const floorMaterial = activeDoc?.floorMaterial;
  const selectedIds = useUIStore((s) => s.selectedIds);
  const cameraMode = useUIStore((s) => s.cameraMode);
  const wallSideCameraTarget = useUIStore((s) => s.wallSideCameraTarget);

  const halfW = room.width / 2;
  const halfL = room.length / 2;

  const floorTexture = getFloorTexture(room.width, room.length);

  // Register the renderer once so pbrTextureCache applies device anisotropy (clamped ≤8).
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    registerRenderer(gl);
  }, [gl]);

  // D-09: preserve orbit camera position+target across mode switches
  const orbitPosRef = useRef<[number, number, number]>([halfW + 15, 12, halfL + 15]);
  const orbitTargetRef = useRef<[number, number, number]>([halfW, room.wallHeight / 3, halfL]);
  const orbitControlsRef = useRef<any>(null);

  // Camera animation target (smooth lerp)
  const cameraAnimTarget = useRef<{ pos: THREE.Vector3; look: THREE.Vector3 } | null>(null);

  // 05.1 fix: restore saved camera position when returning to orbit mode
  useEffect(() => {
    if (cameraMode !== "orbit") return;
    const ctrl = orbitControlsRef.current;
    if (!ctrl?.object) return;
    const [x, y, z] = orbitPosRef.current;
    ctrl.object.position.set(x, y, z);
    ctrl.update();
  }, [cameraMode]);

  // MIC-35: animate camera to face selected wall side
  useEffect(() => {
    if (!wallSideCameraTarget || cameraMode !== "orbit") return;
    const wall = walls[wallSideCameraTarget.wallId];
    if (!wall) return;
    // Wall center in 3D (x = 2D x, z = 2D y, y = height/2)
    const cx = (wall.start.x + wall.end.x) / 2;
    const cz = (wall.start.y + wall.end.y) / 2;
    const cy = wall.height / 2;
    // Wall perpendicular in 2D: rotate direction 90° CCW
    const a = wallAngleRad(wall.start, wall.end);
    const perpAngle = a + Math.PI / 2;
    // Side A = left (-perp), Side B = right (+perp)
    // Camera should be on the chosen side, looking at the wall
    const sign = wallSideCameraTarget.side === "A" ? -1 : 1;
    const dist = 8; // feet back from wall
    const nx = Math.cos(perpAngle) * sign;
    const nz = Math.sin(perpAngle) * sign;
    // Camera position: wall center + normal * distance (in 3D coords: x→x, y→up, z→z)
    const camPos = new THREE.Vector3(cx + nx * dist, cy + 2, cz + nz * dist);
    const lookAt = new THREE.Vector3(cx, cy, cz);
    cameraAnimTarget.current = { pos: camPos, look: lookAt };
    useUIStore.getState().clearWallSideCameraTarget();
  }, [wallSideCameraTarget, walls, cameraMode]);

  // Smooth camera animation via useFrame
  useFrame(() => {
    if (!cameraAnimTarget.current) return;
    const ctrl = orbitControlsRef.current;
    if (!ctrl?.object) return;
    const { pos, look } = cameraAnimTarget.current;
    const cam = ctrl.object as THREE.Camera;
    const speed = 0.08;
    cam.position.lerp(pos, speed);
    ctrl.target.lerp(look, speed);
    ctrl.update();
    // Stop when close enough
    if (cam.position.distanceTo(pos) < 0.05) {
      cam.position.copy(pos);
      ctrl.target.copy(look);
      ctrl.update();
      orbitPosRef.current = [pos.x, pos.y, pos.z];
      orbitTargetRef.current = [look.x, look.y, look.z];
      cameraAnimTarget.current = null;
    }
  });

  return (
    <>
      <Lighting />

      {/* Floor — procedural wood by default, or user-chosen material (FLOOR-01/02/03) */}
      <FloorMesh
        width={room.width}
        length={room.length}
        halfW={halfW}
        halfL={halfL}
        material={floorMaterial}
        fallbackTexture={floorTexture}
      />

      {/* Ambient PBR bounce — D-08 (bundled local HDR) */}
      <Suspense fallback={null}>
        <Environment files="/hdr/studio_small_09_1k.hdr" />
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

      {/* Ceilings — overhead polygon surfaces */}
      {Object.values(ceilings).map((c) => (
        <CeilingMesh key={c.id} ceiling={c} isSelected={selectedIds.includes(c.id)} />
      ))}

      {/* Custom elements (Phase 14) */}
      {Object.values(placedCustoms).map((p) => (
        <CustomElementMesh
          key={p.id}
          placed={p}
          element={customCatalog[p.customElementId]}
          isSelected={selectedIds.includes(p.id)}
        />
      ))}

      {cameraMode === "orbit" ? (
        <OrbitControls
          ref={orbitControlsRef}
          target={orbitTargetRef.current}
          // Polar 0 = camera directly above target (looks down); π/2 = horizontal;
          // π = directly below target (looks up). Allow ~60° of "look up" — enough
          // to see the ceiling without letting the camera flip or clip under the floor.
          maxPolarAngle={Math.PI * 0.85}
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
          WALK MODE · WASD to move · Mouse to look · ESC to exit
        </div>
      )}
    </div>
  );
}
