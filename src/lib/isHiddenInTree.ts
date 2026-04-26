// src/lib/isHiddenInTree.ts
/**
 * Phase 46 D-12: visibility cascade resolver.
 * `ancestry` = [roomId, groupKey?, leafId] from root to leaf.
 * Returns true if any id in ancestry is in hiddenIds.
 */
export function isHiddenInTree(
  ancestry: string[],
  hiddenIds: Set<string>,
): boolean {
  return ancestry.some((id) => hiddenIds.has(id));
}
