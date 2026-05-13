// src/lib/buildRoomTree.ts
import type { RoomDoc } from "@/types/cad";
import type { Product } from "@/types/product";
import { wallCardinalLabel } from "./wallLabels";

export type TreeNodeKind = "room" | "group" | "wall" | "ceiling" | "product" | "custom" | "stair";

export interface TreeNode {
  id: string;
  kind: TreeNodeKind;
  label: string;
  roomId: string;
  groupKey?: "walls" | "ceiling" | "products" | "custom" | "stairs";
  children?: TreeNode[];
}

interface CustomElementCatalogEntry { id: string; name: string; }

/**
 * Phase 46 D-04/D-05/D-06: derive the visible tree shape from store data.
 * Full implementation per UI-SPEC § Per-Row Anatomy and § Empty States.
 */
export function buildRoomTree(
  rooms: Record<string, RoomDoc>,
  customElements: Record<string, CustomElementCatalogEntry>,
  productLibrary: Product[],
): TreeNode[] {
  const productById = new Map(productLibrary.map((p) => [p.id, p]));

  return Object.values(rooms).map((doc) => {
    const center = { x: doc.room.width / 2, y: doc.room.length / 2 };
    const groups: TreeNode[] = [];

    // Walls — ALWAYS emit (Plan 03 renders 'No walls yet' copy when children empty).
    const wallEntries = Object.values(doc.walls);
    groups.push({
      id: `${doc.id}:walls`, kind: "group", label: "Walls",
      roomId: doc.id, groupKey: "walls",
      children: wallEntries.map((wall, idx) => ({
        id: wall.id, kind: "wall" as const,
        // Phase 81 IA-03 (D-04): user-set name wins; fall back to default cardinal label.
        label: wall.name?.trim() || wallCardinalLabel(wall, center, idx),
        roomId: doc.id,
      })),
    });

    // Ceiling — OMIT if empty (UI-SPEC § Empty States).
    const ceilingEntries = Object.values(doc.ceilings ?? {});
    if (ceilingEntries.length > 0) {
      groups.push({
        id: `${doc.id}:ceiling`, kind: "group", label: "Ceiling",
        roomId: doc.id, groupKey: "ceiling",
        children: ceilingEntries.map((c, idx) => ({
          id: c.id, kind: "ceiling" as const,
          label: ceilingEntries.length === 1 ? "Ceiling" : `Ceiling ${idx + 1}`,
          roomId: doc.id,
        })),
      });
    }

    // Products — ALWAYS emit. D-05 dup-name + (N) index starts at 2.
    const productEntries = Object.values(doc.placedProducts);
    const productNameCounts = new Map<string, number>();
    groups.push({
      id: `${doc.id}:products`, kind: "group", label: "Products",
      roomId: doc.id, groupKey: "products",
      children: productEntries.map((pp) => {
        const product = productById.get(pp.productId);
        const baseName = product?.name ?? "Unknown product";
        const count = (productNameCounts.get(baseName) ?? 0) + 1;
        productNameCounts.set(baseName, count);
        const label = count === 1 ? baseName : `${baseName} (${count})`;
        return { id: pp.id, kind: "product" as const, label, roomId: doc.id };
      }),
    });

    // Custom elements — ALWAYS emit. labelOverride wins (Phase 31), no index suffix.
    const customEntries = Object.values(doc.placedCustomElements ?? {});
    const customNameCounts = new Map<string, number>();
    groups.push({
      id: `${doc.id}:custom`, kind: "group", label: "Custom elements",
      roomId: doc.id, groupKey: "custom",
      children: customEntries.map((placed) => {
        const override = (placed as { labelOverride?: string }).labelOverride;
        if (override) {
          return { id: placed.id, kind: "custom" as const, label: override, roomId: doc.id };
        }
        const catalog = customElements[(placed as { customElementId: string }).customElementId];
        const baseName = catalog?.name ?? "Custom element";
        const count = (customNameCounts.get(baseName) ?? 0) + 1;
        customNameCounts.set(baseName, count);
        const label = count === 1 ? baseName : `${baseName} (${count})`;
        return { id: placed.id, kind: "custom" as const, label, roomId: doc.id };
      }),
    });

    // Phase 60 STAIRS-01 (D-10): stairs group — ALWAYS emit. labelOverride
    // wins; otherwise auto-numbered "Stairs (N)" starting at 2.
    // Defensive `?? {}` per research Pitfall 2.
    const stairEntries = Object.values(doc.stairs ?? {});
    const stairNameCounts = new Map<string, number>();
    groups.push({
      id: `${doc.id}:stairs`, kind: "group", label: "Stairs",
      roomId: doc.id, groupKey: "stairs",
      children: stairEntries.map((s) => {
        const override = s.labelOverride;
        if (override) {
          return { id: s.id, kind: "stair" as const, label: override, roomId: doc.id };
        }
        const baseName = "Stairs";
        const count = (stairNameCounts.get(baseName) ?? 0) + 1;
        stairNameCounts.set(baseName, count);
        const label = count === 1 ? baseName : `${baseName} (${count})`;
        return { id: s.id, kind: "stair" as const, label, roomId: doc.id };
      }),
    });

    return {
      id: doc.id, kind: "room" as const, label: doc.name,
      roomId: doc.id, children: groups,
    };
  });
}
