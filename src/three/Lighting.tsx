export default function Lighting() {
  return (
    <>
      {/* Ambient fill — neutral warm to avoid blue cast on white walls */}
      <ambientLight intensity={0.5} color="#fff8f0" />

      {/* Main directional (sun-like) */}
      <directionalLight
        position={[10, 15, 8]}
        intensity={1.0}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-bias={-0.001}
      />

      {/* Fill light from opposite side — warm neutral */}
      <directionalLight position={[-8, 10, -6]} intensity={0.3} color="#f5f0e8" />

      {/* Soft hemisphere for sky/ground bounce — neutral */}
      <hemisphereLight args={["#faf8f5", "#e8d5b0", 0.35]} />
    </>
  );
}
