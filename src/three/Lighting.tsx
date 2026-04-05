export default function Lighting() {
  return (
    <>
      {/* Ambient fill */}
      <ambientLight intensity={0.4} color="#f0f0ff" />

      {/* Main directional (sun-like) */}
      <directionalLight
        position={[10, 15, 8]}
        intensity={1.2}
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

      {/* Fill light from opposite side */}
      <directionalLight position={[-8, 10, -6]} intensity={0.3} color="#e0e8ff" />

      {/* Soft hemisphere for sky/ground bounce */}
      <hemisphereLight args={["#b1e1ff", "#e8d5b0", 0.4]} />
    </>
  );
}
