// src/components/RoomsTreePanel/TreeRow.tsx
// Phase 46: Single tree row matching UI-SPEC § Per-Row Anatomy verbatim.

import React from "react";
import { ChevronRight, ChevronDown, Eye, EyeOff, Camera, Footprints } from "lucide-react";
import type { TreeNode } from "@/lib/buildRoomTree";
import { isHiddenInTree } from "@/lib/isHiddenInTree";
import { InlineEditableText } from "@/components/ui/InlineEditableText";

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
  /**
   * Phase 81 Plan 03 (D-03): inline-rename commit handler. Called by
   * InlineEditableText.onCommit. Parent dispatches to the appropriate
   * per-kind store action (renameWall / renameRoom / labelOverride).
   */
  onRename?: (node: TreeNode, name: string) => void;
  /**
   * Phase 81 Plan 03 (D-03): saved-camera focus handler, MOVED from
   * dbl-click to camera-icon click. Fires only on leaf rows that have a
   * saved camera (`savedCameraNodeIds.has(node.id)`).
   */
  onSavedCameraFocus?: (node: TreeNode) => void;
  /**
   * Phase 81 Plan 02 (D-02): leaf-only hover handlers. Fires on mouseenter
   * of the row container; the parent RoomsTreePanel dispatches to
   * useUIStore.setHoveredEntityId. NOT fired for room or group header rows
   * (rooms have no single canvas object; group headers are pure tree chrome).
   */
  onHoverEnter?: (id: string) => void;
  onHoverLeave?: () => void;
}

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

  // Phase 81 Plan 03 (D-03): row-local inline-rename edit state.
  // Groups never enter edit mode; rooms + leaves both rename via parent dispatcher.
  const [isEditing, setIsEditing] = React.useState(false);

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
    "group relative flex items-center h-6 pr-2 pl-8 rounded-smooth-md cursor-pointer",
    "hover:bg-accent/30",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
  ];
  if (selected) rowBase.push("bg-accent/20 text-accent-foreground");
  if (isActiveRoom) rowBase.push("bg-accent text-accent-foreground");
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
    "flex-1 text-left font-sans truncate overflow-hidden text-ellipsis whitespace-nowrap",
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
          // Phase 81 Plan 03 (D-03): dbl-click now opens inline rename
          // (replaces the Phase 48 saved-camera dispatch — that affordance
          // moved to the Camera icon button below). Groups are tree chrome
          // and stay non-editable; rooms + leaves all rename via parent.
          if (isGroup) return;
          setIsEditing(true);
        }}

        // Phase 81 Plan 02 (D-02): leaf-only hover dispatch. Leaves (walls,
        // products, ceilings, custom-elements, stairs) have a corresponding
        // canvas object that gets the accent-purple outline. Room rows have
        // no single canvas counterpart; group headers are pure tree chrome —
        // skip both.
        onMouseEnter={() => {
          if (isGroup || isRoom) return;
          props.onHoverEnter?.(node.id);
        }}
        onMouseLeave={() => {
          if (isGroup || isRoom) return;
          props.onHoverLeave?.();
        }}
      >
        {/* D-01: Pascal spine — 1px vertical line at left:21px */}
        <div className="absolute top-0 bottom-0 left-[21px] w-px bg-border/50 pointer-events-none" />
        {/* D-02: Pascal branch — horizontal tick from left:21px spanning 11px */}
        <div className="absolute top-1/2 left-[21px] h-px w-[11px] bg-border/50 pointer-events-none" />
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

        {/* Phase 71 D-15: stair leaf icon — Footprints substitute for material-symbols 'stairs' */}
        {node.kind === "stair" && (
          <Footprints
            size={14}
            className="text-muted-foreground/80 mr-1"
            aria-hidden="true"
            data-stair-icon
          />
          // D-15: substitute for material-symbols 'stairs'
        )}

        {/* Label — editable (InlineEditableText) when isEditing, otherwise
            a button (data-tree-row for test driver targeting).
            Phase 81 Plan 03 (D-03): dbl-click on the row sets isEditing → swap. */}
        {isEditing ? (
          // Phase 81 Plan 03 (D-03): InlineEditableText handles Enter (commit)
          // and Escape (cancel) internally. We wrap with onKeyDown + onBlur on
          // a span so that Escape also exits edit-mode (InlineEditableText's
          // cancel() path does NOT call onCommit; without this wrapper the
          // input would stay open after Escape).
          <span
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                // Defer one tick so InlineEditableText's own Escape handler
                // (which calls cancel + blur) runs first.
                setTimeout(() => setIsEditing(false), 0);
              }
            }}
            onBlur={() => {
              // If commit() short-circuits (skipNextBlur after Escape) or
              // succeeds, both paths should exit edit-mode. setTimeout pushes
              // to next tick so InlineEditableText finishes its blur handler.
              setTimeout(() => setIsEditing(false), 0);
            }}
            className="flex-1 min-w-0"
          >
            <InlineEditableText
              value={node.label}
              maxLength={40}
              onLivePreview={() => { /* no-op: tree row is commit-only (no live tree updates) */ }}
              onCommit={(v) => {
                props.onRename?.(node, v);
                setIsEditing(false);
              }}
              data-testid={`tree-row-edit-${node.id}`}
              className={labelClass}
            />
          </span>
        ) : (
          <button
            data-tree-row
            className={labelClass}
            title={node.label}
            aria-label={`Rename ${node.label}`}
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
        )}

        {/* Phase 81 Plan 03 (D-03): saved-camera affordance migrated from
            row dbl-click to an interactive Camera-icon button. aria-label
            is mixed-case per D-09. Click dispatches via parent's
            onSavedCameraFocus handler. */}
        {hasSavedCamera && (
          <button
            data-saved-camera-button
            title={`Focus saved camera on ${node.label}`}
            aria-label={`Focus saved camera on ${node.label}`}
            className="w-6 h-6 flex items-center justify-center text-foreground hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            onClick={(e) => {
              e.stopPropagation();
              props.onSavedCameraFocus?.(node);
            }}
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
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
            onRename={props.onRename}
            onSavedCameraFocus={props.onSavedCameraFocus}
            onHoverEnter={props.onHoverEnter}
            onHoverLeave={props.onHoverLeave}
          />
        ))
      }

      {/* Empty-state rows — UI-SPEC § Empty States VERBATIM (italic, text-muted-foreground/60, pl-6, h-6) */}
      {isGroup && node.children && node.children.length === 0 && (
        <div className="flex items-center h-6 pl-6 pr-2 italic text-muted-foreground/60 font-sans text-sm">
          {node.groupKey === "walls" && "No walls yet"}
          {node.groupKey === "products" && "No products placed"}
          {node.groupKey === "custom" && "No custom elements placed"}
          {node.groupKey === "stairs" && "No stairs in this room"}
        </div>
      )}
    </div>
  );
}
