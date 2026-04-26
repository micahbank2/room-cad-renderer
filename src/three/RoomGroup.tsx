// src/three/RoomGroup.tsx
// Phase 47: per-room mesh group wrapper for multi-room rendering (NORMAL/EXPLODE)
// and single-room rendering (SOLO). Plan 02 fills the body; Plan 01 declares
// the contract so unit tests fail with assertion mismatches (not import errors).
import type { RoomDoc } from "@/types/cad";
import type { Product } from "@/types/product";

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
 * Phase 47 D-03: per-room <group position={[offsetX,0,0]}> wrapper.
 * STUB: Plan 02 implements walls/products/ceilings/customs render
 * with effectivelyHidden cascade (D-04 composition).
 */
export function RoomGroup(_props: RoomGroupProps): JSX.Element | null {
  return null;
}

/**
 * Phase 47 D-03: compute X-axis offsets per room.
 * - NORMAL → all offsets are 0
 * - EXPLODE → cumulative sum of max(width,length) * 1.25 in Object.keys order
 * - SOLO → callers iterate only the active room (offset 0); helper still returns 0 for all
 *
 * STUB: returns {}. Plan 02 implements the math from 47-CONTEXT.md D-03.
 */
export function computeRoomOffsets(
  _rooms: Record<string, RoomDoc>,
  _displayMode: DisplayMode,
): Record<string, number> {
  return {};
}
