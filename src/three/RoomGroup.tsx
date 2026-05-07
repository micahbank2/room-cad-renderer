// src/three/RoomGroup.tsx
// Phase 47: per-room mesh group wrapper for multi-room rendering (NORMAL/EXPLODE)
// and single-room rendering (SOLO). Plan 02 fills the body.
import { useMemo } from "react";
import type { RoomDoc } from "@/types/cad";
import type { Product } from "@/types/product";
import WallMesh from "./WallMesh";
import NicheMesh from "./NicheMesh";
import ProductMesh from "./ProductMesh";
import CeilingMesh from "./CeilingMesh";
import FloorMesh from "./FloorMesh";
import CustomElementMesh from "./CustomElementMesh";
import StairMesh from "./StairMesh";
import { computeRoomBboxCenter } from "./cutawayDetection";
import { getFloorTexture } from "./floorTexture";

type DisplayMode = "normal" | "solo" | "explode";

export interface RoomGroupProps {
  roomDoc: RoomDoc;
  offsetX: number;
  productLibrary: Product[];
  selectedIds: string[];
  hiddenIds: Set<string>;
  customCatalog: Record<string, { id: string; name: string }>;
}

/**
 * Phase 47 D-03: compute X-axis offsets per room for the current displayMode.
 * - "normal" / "solo" → all offsets 0
 * - "explode" → cumulative sum of max(width, length) * 1.25 in Object.keys order
 *
 * Object.keys order is stable per ES2015+ spec (research §5). For SOLO mode
 * the helper still returns 0 for every room — callers iterate only the active
 * room separately.
 */
export function computeRoomOffsets(
  rooms: Record<string, RoomDoc>,
  displayMode: DisplayMode,
): Record<string, number> {
  const out: Record<string, number> = {};
  if (displayMode !== "explode") {
    for (const id of Object.keys(rooms)) out[id] = 0;
    return out;
  }
  let cumulative = 0;
  for (const [id, doc] of Object.entries(rooms)) {
    out[id] = cumulative;
    const maxDim = Math.max(doc.room.width, doc.room.length);
    cumulative += maxDim * 1.25;
  }
  return out;
}

/**
 * Phase 47 D-03: per-room mesh group wrapper.
 * Renders walls + products + ceilings + customs + FloorMesh inside a
 * <group position={[offsetX,0,0]}>. Computes its OWN effectivelyHidden
 * cascade (D-12) so each room independently honors hiddenIds.
 *
 * D-04 composition: SOLO room filtering happens at the caller (Scene
 * iterates only activeRoomId). Within a rendered room, hiddenIds applies
 * exactly as Phase 46 specified — orthogonal filters.
 */
export function RoomGroup({
  roomDoc,
  offsetX,
  productLibrary,
  selectedIds,
  hiddenIds,
  customCatalog,
}: RoomGroupProps): JSX.Element | null {
  const { id: roomId, room, walls, placedProducts, placedCustomElements, ceilings, floorMaterial, stairs } = roomDoc;

  // Per-room cascade — Phase 46 D-12 logic scoped to this room's roomId.
  const effectivelyHidden = useMemo(() => {
    const out = new Set<string>();
    if (hiddenIds.has(roomId)) {
      Object.values(walls ?? {}).forEach((w) => out.add(w.id));
      Object.values(placedProducts ?? {}).forEach((p) => out.add(p.id));
      Object.values(ceilings ?? {}).forEach((c) => out.add(c.id));
      Object.values(placedCustomElements ?? {}).forEach((p) => out.add(p.id));
      // Phase 60: stair-cascade follows the same id-keyed Set (research Q6).
      Object.values(stairs ?? {}).forEach((s) => out.add(s.id));
      return out;
    }
    if (hiddenIds.has(`${roomId}:walls`)) {
      Object.values(walls ?? {}).forEach((w) => out.add(w.id));
    }
    if (hiddenIds.has(`${roomId}:ceiling`)) {
      Object.values(ceilings ?? {}).forEach((c) => out.add(c.id));
    }
    if (hiddenIds.has(`${roomId}:products`)) {
      Object.values(placedProducts ?? {}).forEach((p) => out.add(p.id));
    }
    if (hiddenIds.has(`${roomId}:custom`)) {
      Object.values(placedCustomElements ?? {}).forEach((p) => out.add(p.id));
    }
    if (hiddenIds.has(`${roomId}:stairs`)) {
      Object.values(stairs ?? {}).forEach((s) => out.add(s.id));
    }
    for (const id of hiddenIds) out.add(id);
    return out;
  }, [hiddenIds, roomId, walls, placedProducts, ceilings, placedCustomElements, stairs]);

  const halfW = room.width / 2;
  const halfL = room.length / 2;
  const floorTexture = getFloorTexture(room.width, room.length);

  // Phase 61 OPEN-01 (D-06, research Q3): per-room bbox center for niche
  // interior-face detection. Computed once per render — same shape used by
  // Phase 59 cutaway detection.
  const wallList = useMemo(() => Object.values(walls ?? {}), [walls]);
  const roomCenter = useMemo(() => computeRoomBboxCenter(wallList), [wallList]);

  return (
    <group position={[offsetX, 0, 0]}>
      <FloorMesh
        width={room.width}
        length={room.length}
        halfW={halfW}
        halfL={halfL}
        material={floorMaterial}
        fallbackTexture={floorTexture}
        floorMaterialId={roomDoc.floorMaterialId}
        floorScaleFt={roomDoc.floorScaleFt}
      />
      {Object.values(walls ?? {})
        .filter((w) => !effectivelyHidden.has(w.id))
        .map((w) => (
          <WallMesh
            key={w.id}
            wall={w}
            isSelected={selectedIds.includes(w.id)}
            roomId={roomId}
          />
        ))}
      {/* Phase 61 OPEN-01 (D-06, D-07): per-niche separate inset mesh on the
          interior face. Wall body remains solid (WallMesh skips niches in
          its holes loop), so the recess never breaks through. */}
      {Object.values(walls ?? {})
        .filter((w) => !effectivelyHidden.has(w.id))
        .flatMap((w) =>
          (w.openings ?? [])
            .filter((o) => o.type === "niche")
            .map((o) => (
              <NicheMesh key={o.id} wall={w} opening={o} roomCenter={roomCenter} />
            )),
        )}
      {Object.values(placedProducts ?? {})
        .filter((pp) => !effectivelyHidden.has(pp.id))
        .map((pp) => {
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
      {Object.values(ceilings ?? {})
        .filter((c) => !effectivelyHidden.has(c.id))
        .map((c) => (
          <CeilingMesh key={c.id} ceiling={c} isSelected={selectedIds.includes(c.id)} />
        ))}
      {Object.values(placedCustomElements ?? {})
        .filter((p) => !effectivelyHidden.has(p.id))
        .map((p) => {
          const catalog = customCatalog[p.customElementId];
          if (!catalog) return null;
          return (
            <CustomElementMesh
              key={p.id}
              placed={p}
              element={catalog as never}
              isSelected={selectedIds.includes(p.id)}
            />
          );
        })}
      {/* Phase 60 STAIRS-01 (D-06): per-room stairs. Defensive `?? {}` per
          research Pitfall 2. */}
      {Object.values(stairs ?? {})
        .filter((s) => !effectivelyHidden.has(s.id))
        .map((s) => (
          <StairMesh
            key={s.id}
            stair={s}
            roomId={roomId}
            isSelected={selectedIds.includes(s.id)}
          />
        ))}
    </group>
  );
}
