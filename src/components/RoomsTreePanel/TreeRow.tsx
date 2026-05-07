// src/components/RoomsTreePanel/TreeRow.tsx
// Phase 46: Single tree row matching UI-SPEC § Per-Row Anatomy verbatim.

import React from "react";
import { ChevronRight, ChevronDown, Eye, EyeOff, Camera } from "lucide-react";
import type { TreeNode } from "@/lib/buildRoomTree";
import { isHiddenInTree } from "@/lib/isHiddenInTree";

interface TreeRowProps {
  node: TreeNode;
  /** Ancestor ids (excluding self) from root to immediate parent. */
  ancestry: string[];
  depth: 0 | 1 | 2;
  expanded: Record<string, boolean>;
  activeRoomId: string | null;
  selectedIds: string[];
  hiddenIds: Set<string>;
  /** Label of the immediate parent row (for cascade aria-label). */
  parentLabel?: string;
  /** Phase 48 D-07: leaf-node IDs that have a saved camera angle. */
  savedCameraNodeIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onClickRow: (node: TreeNode) => void;
  onToggleVisibility: (id: string) => void;
  /** Phase 48 D-02: double-click handler — falls through to single-click default focus when no savedCamera. */
  onDoubleClickRow?: (node: TreeNode) => void;
}

const INDENT: Record<0 | 1 | 2, string> = {
  0: "pl-2",
  1: "pl-4",
  2: "pl-6",
};

export function TreeRow(props: TreeRowProps) {
  const {
    node,
    ancestry,
    depth,
    expanded,
    activeRoomId,
    selectedIds,
    hiddenIds,
    parentLabel,
  } = props;

  const isRoom = node.kind === "room";
  const isGroup = node.kind === "group";
  // Phase 48 D-07: leaf = not room, not group.
  const isLeaf = !isRoom && !isGroup;
  const hasSavedCamera = isLeaf && props.savedCameraNodeIds.has(node.id);

  // Groups always open (UI-SPEC § Expand/collapse: "always expanded by default, no persistence").
  const isOpen = isRoom ? (expanded[node.id] ?? false) : true;

  const selfHidden = hiddenIds.has(node.id);
  // cascadeHidden: any ancestor is hidden
  const cascadeHidden = isHiddenInTree(ancestry, hiddenIds);
  // parentOnlyHidden: cascade applies but self is NOT in hiddenIds
  const parentOnlyHidden = cascadeHidden && !selfHidden;

  const selected = selectedIds.includes(node.id);
  const isActiveRoom = isRoom && node.id === activeRoomId;

  // ---------------------------------------------------------------------------
  // Row container classes — h-6 (24px) per UI-SPEC § Row height contract
  // ---------------------------------------------------------------------------
  const rowBase = [
    "group flex items-center h-6 pr-2 rounded-sm cursor-pointer",
    INDENT[depth],
    "hover:bg-accent",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
  ];
  if (selected) rowBase.push("bg-secondary border-l-2 border-accent");
  if (parentOnlyHidden) rowBase.push("opacity-50");
  const rowClass = rowBase.join(" ");

  // ---------------------------------------------------------------------------
  // Label typography + color — UI-SPEC § Typography + § Color
  // ---------------------------------------------------------------------------
  const labelSize =
    depth === 0 ? "text-base font-medium" :
    depth === 1 ? "text-sm font-medium" :
    "text-sm";

  const labelColor =
    selected || isActiveRoom ? "text-foreground" :
    parentOnlyHidden ? "text-muted-foreground/60 italic" :
    selfHidden ? "text-muted-foreground/60" :
    "text-foreground";

  const labelClass = [
    "flex-1 text-left font-mono truncate overflow-hidden text-ellipsis whitespace-nowrap",
    labelSize,
    labelColor,
  ].join(" ");

  // ---------------------------------------------------------------------------
  // Eye icon color tokens — UI-SPEC § Color visibility-state table
  // ---------------------------------------------------------------------------
  const eyeColor =
    parentOnlyHidden ? "text-muted-foreground/60 opacity-50" :
    selfHidden ? "text-muted-foreground" :
    "text-muted-foreground/80 hover:text-accent";

  // ---------------------------------------------------------------------------
  // aria-labels — VERBATIM per UI-SPEC § Copywriting Contract
  // ---------------------------------------------------------------------------
  const eyeAria =
    parentOnlyHidden
      ? `${node.label} hidden because ${parentLabel ?? "parent"} is hidden`
      : selfHidden
      ? `Show ${node.label} in 3D view`
      : `Hide ${node.label} from 3D view`;

  const chevronAria = isOpen ? `Collapse ${node.label}` : `Expand ${node.label}`;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div data-tree-node={node.id} data-tree-kind={node.kind}>
      {/* Row */}
      <div
        className={rowClass}
        {...(selected ? { "aria-current": "true" as const } : {})}
        onClick={() => {
          // UI-SPEC § Interaction: group header click is NO-OP for selection
          if (isGroup) return;
          props.onClickRow(node);
        }}
        onDoubleClick={() => {
          // Phase 48 D-02: groups ignored (matches single-click NO-OP semantics).
          if (isGroup) return;
          props.onDoubleClickRow?.(node);
        }}
      >
        {/* Chevron — ROOM ROWS ONLY per UI-SPEC § Per-Row Anatomy */}
        {isRoom ? (
          <button
            data-tree-chevron
            aria-label={chevronAria}
            aria-expanded={isOpen}
            className="text-muted-foreground/60 hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            onClick={(e) => {
              e.stopPropagation();
              props.onToggleExpand(node.id);
            }}
          >
            {isOpen
              ? <ChevronDown className="w-4 h-4" />
              : <ChevronRight className="w-4 h-4" />
            }
          </button>
        ) : depth === 2 ? (
          /* Leaf-row spacer — aligns label column with room rows (UI-SPEC § Per-Row Anatomy) */
          <span className="w-4 h-4" aria-hidden="true" />
        ) : null}

        {/* 4px gap between chevron/spacer and label */}
        <span className="w-1" aria-hidden="true" />

        {/* Phase 60 STAIRS-01: per-kind icon for stair leaf nodes.
            Phase 33 D-33 exception — CAD-domain glyph; lucide-react has
            no Stairs export. CLAUDE.md Material Symbols allowlist updated
            to include this file. */}
        {node.kind === "stair" && (
          <span
            className="material-symbols-outlined text-muted-foreground/80 mr-1"
            style={{ fontSize: 14 }}
            aria-hidden="true"
            data-stair-icon
          >
            stairs
          </span>
        )}

        {/* Label button — data-tree-row for test driver targeting */}
        <button
          data-tree-row
          className={labelClass}
          title={node.label}
          onClick={(e) => {
            if (isGroup) {
              e.stopPropagation();
              return;
            }
            // Row container onClick handles selection; this button bubbles up
          }}
        >
          {node.label}
        </button>

        {/* Phase 48 D-07: leaf-only saved-camera indicator. */}
        {hasSavedCamera && (
          <span
            title="Has saved camera angle"
            aria-hidden="true"
            className="text-foreground flex items-center justify-center"
            data-saved-camera-indicator
          >
            <Camera className="w-3.5 h-3.5" />
          </span>
        )}

        {/* Eye-icon button — UI-SPEC § Per-Row Anatomy: w-6 h-6, inner glyph w-3.5 h-3.5 */}
        <button
          data-tree-eye
          data-dimmed={parentOnlyHidden ? "true" : "false"}
          aria-label={eyeAria}
          className={`w-6 h-6 flex items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${eyeColor}`}
          onClick={(e) => {
            e.stopPropagation();
            props.onToggleVisibility(node.id);
          }}
        >
          {selfHidden || parentOnlyHidden
            ? <EyeOff className="w-3.5 h-3.5" />
            : <Eye className="w-3.5 h-3.5" />
          }
        </button>
      </div>

      {/* Children */}
      {isOpen && node.children && node.children.length > 0 &&
        node.children.map((child) => (
          <TreeRow
            key={child.id}
            node={child}
            ancestry={[...ancestry, node.id]}
            depth={(Math.min(depth + 1, 2)) as 0 | 1 | 2}
            expanded={expanded}
            activeRoomId={activeRoomId}
            selectedIds={selectedIds}
            hiddenIds={hiddenIds}
            parentLabel={node.label}
            savedCameraNodeIds={props.savedCameraNodeIds}
            onToggleExpand={props.onToggleExpand}
            onClickRow={props.onClickRow}
            onToggleVisibility={props.onToggleVisibility}
            onDoubleClickRow={props.onDoubleClickRow}
          />
        ))
      }

      {/* Empty-state rows — UI-SPEC § Empty States VERBATIM (italic, text-muted-foreground/60, pl-6, h-6) */}
      {isGroup && node.children && node.children.length === 0 && (
        <div className="flex items-center h-6 pl-6 pr-2 italic text-muted-foreground/60 font-mono text-sm">
          {node.groupKey === "walls" && "No walls yet"}
          {node.groupKey === "products" && "No products placed"}
          {node.groupKey === "custom" && "No custom elements placed"}
          {node.groupKey === "stairs" && "No stairs in this room"}
        </div>
      )}
    </div>
  );
}
