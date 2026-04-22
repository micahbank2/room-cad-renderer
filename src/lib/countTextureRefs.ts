/**
 * Phase 34 — User-Uploaded Textures.
 *
 * countTextureRefs walks a CADSnapshot and counts the number of places a given
 * `userTextureId` is referenced across all rooms. Drives the delete-confirm
 * dialog copy per D-07:
 *   "Delete {name}? {N} surfaces in this project use it. They'll fall back to
 *    their base color."
 *
 * Scan coverage (RESEARCH.md §G):
 *   - Wall wallpaper, both sides (A and B) per side — 2 per wall max
 *   - FloorMaterial when kind === "user-texture"
 *   - Ceiling.userTextureId
 *
 * Custom elements (boxes/planes) do NOT carry material assignments today —
 * no scan needed there.
 *
 * The function is pure and snapshot-shaped; it does NOT read cadStore
 * directly. Callers pass in the snapshot they want to audit (usually
 * `useCADStore.getState()`).
 */
import type { CADSnapshot } from "@/types/cad";

export function countTextureRefs(snapshot: CADSnapshot, textureId: string): number {
  let count = 0;
  for (const room of Object.values(snapshot.rooms)) {
    // Wall wallpaper per side (A/B)
    for (const wall of Object.values(room.walls ?? {})) {
      if (wall.wallpaper?.A?.userTextureId === textureId) count++;
      if (wall.wallpaper?.B?.userTextureId === textureId) count++;
    }
    // Floor material — only counts when kind is explicitly user-texture
    const fm = room.floorMaterial;
    if (fm?.kind === "user-texture" && fm.userTextureId === textureId) count++;
    // Ceilings
    for (const ceiling of Object.values(room.ceilings ?? {})) {
      if (ceiling.userTextureId === textureId) count++;
    }
  }
  return count;
}
