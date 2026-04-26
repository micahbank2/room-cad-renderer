// src/components/RoomsTreePanel/savedCameraSet.ts
// Phase 48 D-07: derives the set of leaf-node IDs that have a saved camera angle.
// RoomsTreePanel calls this inside useMemo to feed TreeRow's hasSavedCamera prop.
// Plan 03 fills the body; Plan 01 declares the contract so component tests fail
// with assertion mismatches (icon not in DOM) instead of import errors.

import type { RoomDoc } from "@/types/cad";

/**
 * Phase 48 D-07: returns the set of leaf-node IDs (walls, products, ceilings,
 * custom elements) whose backing entity has `savedCameraPos !== undefined`.
 * Group rows and room rows are NEVER included (D-07 leaf-only).
 *
 * STUB: returns empty Set. Plan 03 fills the body iterating
 * walls / placedProducts / ceilings / placedCustomElements across all rooms.
 */
export function buildSavedCameraSet(
  _rooms: Record<string, RoomDoc>,
): Set<string> {
  return new Set<string>();
}
