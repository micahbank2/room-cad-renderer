// src/lib/buildRoomTree.ts
import type { RoomDoc } from "@/types/cad";
import type { Product } from "@/types/product";

export type TreeNodeKind = "room" | "group" | "wall" | "ceiling" | "product" | "custom";

export interface TreeNode {
  id: string;
  kind: TreeNodeKind;
  label: string;
  roomId: string;
  groupKey?: "walls" | "ceiling" | "products" | "custom";
  children?: TreeNode[];
}

/**
 * Phase 46 D-04/D-05/D-06: derive the visible tree shape from store data.
 * STUB: Plan 02 implements. Returns [] so component tests RED-fail with
 * empty-tree assertions (not import errors).
 */
export function buildRoomTree(
  rooms: Record<string, RoomDoc>,
  customElements: Record<string, unknown>,
  productLibrary: Product[],
): TreeNode[] {
  return [];
}
