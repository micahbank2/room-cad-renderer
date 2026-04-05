import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { WainscotStyleItem } from "@/types/wainscotStyle";
import { renderWainscotStyle } from "@/three/wainscotStyles";

interface Props {
  item: WainscotStyleItem;
}

/** Tiny 3D preview of one wainscoting style on an 8'-long, 8'-tall, 0.5'-thick wall. */
export default function WainscotPreview3D({ item }: Props) {
  const length = 8;
  const height = 8;
  const thickness = 0.5;
  const halfLen = length / 2;
  const halfH = height / 2;

  return (
    <div className="w-full aspect-video bg-obsidian-base rounded-sm border border-outline-variant/30 overflow-hidden">
      <Canvas
        shadows
        camera={{ position: [4, 1.5, 5], fov: 45 }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 6, 4]} intensity={1.0} castShadow />
        <directionalLight position={[-3, 3, 2]} intensity={0.3} />

        {/* Floor */}
        <mesh position={[0, -halfH - 0.01, 1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[12, 8]} />
          <meshStandardMaterial color="#2a2833" roughness={0.9} />
        </mesh>

        {/* Preview wall */}
        <group position={[0, 0, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[length, height, thickness]} />
            <meshStandardMaterial color="#f8f5ef" roughness={0.85} />
          </mesh>
          {renderWainscotStyle({ length, halfLen, halfH, thickness, item })}
        </group>

        <OrbitControls
          enablePan={false}
          minDistance={4}
          maxDistance={12}
          maxPolarAngle={Math.PI / 2}
          target={[0, -1, 0]}
        />
      </Canvas>
    </div>
  );
}
