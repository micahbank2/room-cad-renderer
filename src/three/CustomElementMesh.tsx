import type { ThreeEvent } from "@react-three/fiber";
import type { CustomElement, PlacedCustomElement } from "@/types/cad";
import type { FaceDirection } from "@/types/material";
import { useClickDetect } from "@/hooks/useClickDetect";
import { useUIStore } from "@/stores/uiStore";
import { useResolvedMaterial } from "./useResolvedMaterial";

interface Props {
  placed: PlacedCustomElement;
  element: CustomElement | undefined;
  isSelected: boolean;
}

/**
 * Phase 68 D-07 — BoxGeometry face index → FaceDirection mapping.
 *
 * Three.js BoxGeometry constructs material slots in the order:
 *   [+X, -X, +Y, -Y, +Z, -Z]
 *
 * In our world: +Y is up (THREE default), so +Y = top of the box, -Y = bottom.
 * +X is "east" (positive plan-X), +Z is "north" (positive plan-Y maps to
 * world Z in this scene). The two horizontal axes pair as east/west and
 * north/south for the four side faces.
 *
 * Order of this array MUST match material slot order so React `key={face}`
 * children attach to the correct material-N slot.
 */
export const FACE_ORDER: ReadonlyArray<FaceDirection> = [
  "east", // 0 = +X
  "west", // 1 = -X
  "top", // 2 = +Y
  "bottom", // 3 = -Y
  "north", // 4 = +Z
  "south", // 5 = -Z
];

/**
 * Per-face material renderer. One <FaceMaterial> per box face so the
 * useResolvedMaterial hook is called at a real React component boundary
 * (Rules of Hooks — six independent hook calls per box, one per face).
 *
 * Each face independently resolves placed.faceMaterials?.[faceName]:
 * - resolved + colorHex   → flat-color meshStandardMaterial
 * - resolved + colorMap   → textured meshStandardMaterial (direct map prop)
 * - resolved with neither → fall back to fallbackColor
 * - not resolved (null)   → fall back to fallbackColor (legacy element.color)
 */
function FaceMaterial({
  faceName,
  faceIndex,
  placedMaterialId,
  fallbackColor,
  width,
  height,
  isSelected,
}: {
  faceName: FaceDirection;
  faceIndex: number;
  placedMaterialId: string | undefined;
  fallbackColor: string;
  width: number;
  height: number;
  isSelected: boolean;
}) {
  // Phase 68 Plan 04 — face has no per-surface scaleFt (v1.17 scope; faces
  // inherit Material.tileSizeFt). Pass undefined → resolver uses material default.
  const resolved = useResolvedMaterial(placedMaterialId, undefined, width, height);
  const attach = `material-${faceIndex}` as const;
  const baseColor = isSelected ? "#93c5fd" : fallbackColor;

  // Suppress unused warning for parity with sibling faces — faceName aids debug.
  void faceName;

  if (resolved?.colorHex) {
    return (
      <meshStandardMaterial
        attach={attach}
        color={isSelected ? "#93c5fd" : resolved.colorHex}
        roughness={resolved.roughness}
        metalness={resolved.metalness}
      />
    );
  }
  if (resolved?.colorMap) {
    return (
      <meshStandardMaterial
        attach={attach}
        color={isSelected ? "#93c5fd" : "#ffffff"}
        roughness={resolved.roughness}
        metalness={resolved.metalness}
        map={resolved.colorMap}
        roughnessMap={resolved.roughnessMap ?? undefined}
        metalnessMap={resolved.reflectionMap ?? undefined}
      />
    );
  }
  // Legacy fallback — flat color from CustomElement.color (D-01 safety net).
  return (
    <meshStandardMaterial
      attach={attach}
      color={baseColor}
      roughness={0.7}
      metalness={0}
    />
  );
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

  // Phase 68 D-07 — per-face dimensions for tile-size repeat math:
  //   +Y/top, -Y/bottom faces use w × d
  //   +X/east, -X/west faces use d × h
  //   +Z/north, -Z/south faces use w × h
  const faceDims: Record<FaceDirection, [number, number]> = {
    east: [d, h],
    west: [d, h],
    top: [w, d],
    bottom: [w, d],
    north: [w, h],
    south: [w, h],
  };

  const faceMats = placed.faceMaterials ?? {};
  const fallbackColor = element.color;

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
      {FACE_ORDER.map((face, idx) => (
        <FaceMaterial
          key={face}
          faceName={face}
          faceIndex={idx}
          placedMaterialId={faceMats[face]}
          fallbackColor={fallbackColor}
          width={faceDims[face][0]}
          height={faceDims[face][1]}
          isSelected={isSelected}
        />
      ))}
    </mesh>
  );
}
