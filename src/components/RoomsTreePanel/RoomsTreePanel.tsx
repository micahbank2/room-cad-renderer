// src/components/RoomsTreePanel/RoomsTreePanel.tsx
// Phase 46: Rooms hierarchy panel — top of Sidebar (D-01).

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useCADStore } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { buildRoomTree, type TreeNode } from "@/lib/buildRoomTree";
import { TreeRow } from "./TreeRow";
import type { Product } from "@/types/product";
import {
  focusOnRoom,
  focusOnWall,
  focusOnPlacedProduct,
  focusOnCeiling,
  focusOnPlacedCustomElement,
  focusOnSavedCamera,
} from "./focusDispatch";
import { buildSavedCameraSet } from "./savedCameraSet";

// ---------------------------------------------------------------------------
// Module-level stable references (avoids infinite render loops in Zustand selectors)
// ---------------------------------------------------------------------------
const EMPTY_HIDDEN_IDS = new Set<string>();
const EMPTY_CUSTOM_ELEMENTS: Record<string, { id: string; name: string }> = {};

// ---------------------------------------------------------------------------
// Storage key contract (UI-SPEC § Expand/collapse, D-03, D-13)
// ---------------------------------------------------------------------------
const STORAGE_PREFIX = "gsd:tree:room:";
const STORAGE_SUFFIX = ":expanded";

function roomStorageKey(roomId: string): string {
  return `${STORAGE_PREFIX}${roomId}${STORAGE_SUFFIX}`;
}

// ---------------------------------------------------------------------------
// Extended uiStore interface (Plan 02 / 46-02 contract additions)
// ---------------------------------------------------------------------------
interface ExtendedUIState {
  hiddenIds: Set<string>;
  toggleHidden: (id: string) => void;
}

function getExtendedUI(): ExtendedUIState {
  const state = useUIStore.getState() as ReturnType<typeof useUIStore.getState> & Partial<ExtendedUIState>;
  return {
    hiddenIds: state.hiddenIds ?? new Set<string>(),
    toggleHidden: state.toggleHidden ?? (() => { /* noop until Plan 02 uiStore lands */ }),
  };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface Props {
  productLibrary?: Product[];
}

// ---------------------------------------------------------------------------
// Sidebar inline CollapsibleSection clone — used only in Sidebar context.
// We inline a minimal panel wrapper so RoomsTreePanel has no dependency on
// src/components/ui/CollapsibleSection (which requires an `id` prop + uses a
// separate localStorage namespace). The Sidebar's own local CollapsibleSection
// is the canonical primitive for this context.
// ---------------------------------------------------------------------------
function PanelSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between mb-2 py-1"
      >
        <h3 className="font-mono text-base font-medium text-text-muted">
          {label}
        </h3>
        <span className="font-mono text-sm text-text-ghost">
          {open ? "\u2212" : "+"}
        </span>
      </button>
      {open && children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RoomsTreePanel
// ---------------------------------------------------------------------------
export function RoomsTreePanel({ productLibrary = [] }: Props) {
  const rooms = useCADStore((s) => s.rooms);
  const customElements = useCADStore((s) => (s as unknown as { customElements?: Record<string, { id: string; name: string }> }).customElements ?? EMPTY_CUSTOM_ELEMENTS);
  const activeRoomId = useCADStore((s) => s.activeRoomId);
  const selectedIds = useUIStore((s) => s.selectedIds);

  // hiddenIds: Plan 02 adds this to uiStore. Defensive fallback until it lands.
  // NOTE: we cannot use ?? new Set() inside the selector — that creates a new
  // object every render causing an infinite loop. Read the raw value; Zustand
  // reference-equals. If undefined, fall back to a module-level empty Set.
  const hiddenIds = useUIStore((s) => {
    const extended = s as typeof s & { hiddenIds?: Set<string> };
    return extended.hiddenIds ?? EMPTY_HIDDEN_IDS;
  });

  // ---------------------------------------------------------------------------
  // Per-room expand state — localStorage key: "gsd:tree:room:{roomId}:expanded"
  // Default: active room expanded, others collapsed (D-02)
  // ---------------------------------------------------------------------------
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const out: Record<string, boolean> = {};
    Object.keys(rooms).forEach((id) => {
      if (typeof localStorage === "undefined") {
        out[id] = id === activeRoomId;
        return;
      }
      const stored = localStorage.getItem(roomStorageKey(id));
      if (stored === "true") out[id] = true;
      else if (stored === "false") out[id] = false;
      else out[id] = id === activeRoomId; // D-02: active room expanded by default
    });
    return out;
  });

  // Reconcile when room set changes (room added / removed)
  useEffect(() => {
    setExpanded((prev) => {
      const next: Record<string, boolean> = {};
      Object.keys(rooms).forEach((id) => {
        if (id in prev) {
          next[id] = prev[id];
        } else {
          const stored =
            typeof localStorage !== "undefined"
              ? localStorage.getItem(roomStorageKey(id))
              : null;
          next[id] =
            stored === "true" ||
            (stored === null && id === activeRoomId);
        }
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, activeRoomId]);

  // ---------------------------------------------------------------------------
  // Tree shape — memoized from cadStore state
  // ---------------------------------------------------------------------------
  const tree = useMemo(
    () =>
      buildRoomTree(
        rooms,
        customElements as Record<string, { id: string; name: string }>,
        productLibrary,
      ),
    [rooms, customElements, productLibrary],
  );

  // Phase 48 D-07: derive set of leaf IDs with saved cameras from rooms state.
  const savedCameraNodeIds = useMemo(
    () => buildSavedCameraSet(rooms),
    [rooms],
  );

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const onToggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const nextValue = !prev[id];
      try {
        localStorage.setItem(roomStorageKey(id), String(nextValue));
      } catch {
        /* quota exceeded — silently ignore */
      }
      return { ...prev, [id]: nextValue };
    });
  }, []);

  const onToggleVisibility = useCallback((id: string) => {
    const { toggleHidden } = getExtendedUI();
    toggleHidden(id);
  }, []);

  const onClickRow = useCallback(
    (node: TreeNode) => {
      const cadState = useCADStore.getState();
      const doc = cadState.rooms[node.roomId];
      if (!doc) return;

      if (node.kind === "room") {
        focusOnRoom(doc);
        return;
      }
      if (node.kind === "wall") {
        const wall = doc.walls[node.id];
        if (wall) focusOnWall(wall);
        return;
      }
      if (node.kind === "product") {
        const pp = doc.placedProducts[node.id];
        if (!pp) return;
        const product = productLibrary.find((p) => p.id === pp.productId);
        if (product) focusOnPlacedProduct(pp, product);
        return;
      }
      if (node.kind === "ceiling") {
        const ceiling = (doc.ceilings ?? {})[node.id];
        if (ceiling) focusOnCeiling(doc, ceiling);
        return;
      }
      if (node.kind === "custom") {
        const placed = (doc.placedCustomElements ?? {})[node.id];
        if (!placed) return;
        const cadStateWithCustom = cadState as typeof cadState & {
          customElements?: Record<string, { id: string; name: string; widthFt?: number; depthFt?: number; heightFt?: number }>;
        };
        const catalog = (cadStateWithCustom.customElements ?? {})[
          (placed as { customElementId: string }).customElementId
        ];
        focusOnPlacedCustomElement(placed, catalog);
        return;
      }
    },
    [productLibrary],
  );

  const onDoubleClickRow = useCallback(
    (node: TreeNode) => {
      // Defense in depth: TreeRow already guards groups + rooms in its handler,
      // but enforce here too so any future caller can't accidentally trigger
      // camera moves on group / room nodes (D-02 leaf-only contract).
      if (node.kind === "group" || node.kind === "room") return;

      const cadState = useCADStore.getState();
      const doc = cadState.rooms[node.roomId];
      if (!doc) return;

      // Look up the entity to read savedCameraPos/Target (D-02 fall-through key).
      let savedPos: [number, number, number] | undefined;
      let savedTarget: [number, number, number] | undefined;
      if (node.kind === "wall") {
        const w = doc.walls[node.id];
        savedPos = w?.savedCameraPos;
        savedTarget = w?.savedCameraTarget;
      } else if (node.kind === "product") {
        const pp = doc.placedProducts[node.id];
        savedPos = pp?.savedCameraPos;
        savedTarget = pp?.savedCameraTarget;
      } else if (node.kind === "ceiling") {
        const c = (doc.ceilings ?? {})[node.id];
        savedPos = c?.savedCameraPos;
        savedTarget = c?.savedCameraTarget;
      } else if (node.kind === "custom") {
        const pce = (doc.placedCustomElements ?? {})[node.id];
        savedPos = pce?.savedCameraPos;
        savedTarget = pce?.savedCameraTarget;
      }

      // D-02 fall-through: if no saved camera, dispatch the default focus
      // (same path as single-click).
      focusOnSavedCamera(savedPos, savedTarget, () => onClickRow(node));
    },
    [onClickRow],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <PanelSection label="Rooms">
      <div role="tree" aria-label="Rooms tree">
        {tree.map((roomNode) => (
          <TreeRow
            key={roomNode.id}
            node={roomNode}
            ancestry={[]}
            depth={0}
            expanded={expanded}
            activeRoomId={activeRoomId}
            selectedIds={selectedIds}
            hiddenIds={hiddenIds}
            savedCameraNodeIds={savedCameraNodeIds}
            onToggleExpand={onToggleExpand}
            onClickRow={onClickRow}
            onToggleVisibility={onToggleVisibility}
            onDoubleClickRow={onDoubleClickRow}
          />
        ))}
      </div>
    </PanelSection>
  );
}
