// src/components/RoomsTreePanel/savedCameraSet.ts
// Phase 48 D-07: derives the set of leaf-node IDs that have a saved camera angle.
// RoomsTreePanel calls this inside useMemo to feed TreeRow's hasSavedCamera prop.

import type { RoomDoc } from "@/types/cad";

/**
 * Phase 48 D-07: returns the set of leaf-node IDs (walls, products, ceilings,
 * custom elements) whose backing entity has `savedCameraPos !== undefined`.
 * Group rows and room rows are NEVER included (D-07 leaf-only).
 */
export function buildSavedCameraSet(
  rooms: Record<string, RoomDoc>,
): Set<string> {
  const out = new Set<string>();
  for (const room of Object.values(rooms)) {
    for (const w of Object.values(room.walls ?? {})) {
      if (w.savedCameraPos !== undefined) out.add(w.id);
    }
    for (const pp of Object.values(room.placedProducts ?? {})) {
      if (pp.savedCameraPos !== undefined) out.add(pp.id);
    }
    for (const c of Object.values(room.ceilings ?? {})) {
      if (c.savedCameraPos !== undefined) out.add(c.id);
    }
    for (const pce of Object.values(room.placedCustomElements ?? {})) {
      if (pce.savedCameraPos !== undefined) out.add(pce.id);
    }
    // Phase 60 STAIRS-01 (D-14): stair saved-camera mirror.
    for (const s of Object.values(room.stairs ?? {})) {
      if (s.savedCameraPos !== undefined) out.add(s.id);
    }
  }
  return out;
}
