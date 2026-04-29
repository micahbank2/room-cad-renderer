import type { ThreeEvent } from "@react-three/fiber";
import type { CustomElement, PlacedCustomElement } from "@/types/cad";
import { useClickDetect } from "@/hooks/useClickDetect";
import { useUIStore } from "@/stores/uiStore";

interface Props {
  placed: PlacedCustomElement;
  element: CustomElement | undefined;
  isSelected: boolean;
}

/** Render a placed custom element as a box or plane in 3D. */
export default function CustomElementMesh({ placed, element, isSelected }: Props) {
  // Phase 54 PROPS3D-01: left-click to select (drag-threshold-aware)
  const { handlePointerDown, handlePointerUp } = useClickDetect(() => {
    useUIStore.getState().select([placed.id]);
  });

  // Phase 53 CTXMENU-01: right-click → custom element context menu (6 actions).
  // v1.13 audit caught this as a missing integration — Phase 53 wired
  // Wall/Product/Ceiling but Phase 54 didn't retrofit CustomElement.
  const handleContextMenu = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    e.nativeEvent.preventDefault();
    useUIStore.getState().openContextMenu("custom", placed.id, {
      x: e.nativeEvent.clientX,
      y: e.nativeEvent.clientY,
    });
  };

  if (!element) return null;
  const sc = placed.sizeScale ?? 1;
  const w = element.width * sc;
  const d = element.depth * sc;
  const h = element.shape === "plane" ? 0.02 : element.height;
  const rotY = -(placed.rotation * Math.PI) / 180;

  const color = isSelected ? "#93c5fd" : element.color;

  return (
    <mesh
      position={[placed.position.x, h / 2, placed.position.y]}
      rotation={[0, rotY, 0]}
      castShadow
      receiveShadow
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onContextMenu={handleContextMenu}
    >
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial
        color={color}
        roughness={0.7}
        metalness={0}
      />
    </mesh>
  );
}
