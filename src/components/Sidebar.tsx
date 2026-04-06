import { useState } from "react";
import type { Product } from "@/types/product";
import { useActiveRoom, useActiveWalls, useActivePlacedProducts } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import RoomSettings from "./RoomSettings";
import SidebarProductPicker from "./SidebarProductPicker";
import FloorMaterialPicker from "./FloorMaterialPicker";
import CustomElementsPanel from "./CustomElementsPanel";
import FramedArtLibrary from "./FramedArtLibrary";
import WainscotLibrary from "./WainscotLibrary";

interface Props {
  productLibrary: Product[];
}

function CollapsibleSection({
  label,
  defaultOpen = true,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between mb-2 py-1"
      >
        <h3 className="font-mono text-xs text-text-ghost tracking-widest uppercase">
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

export default function Sidebar({ productLibrary: _productLibrary }: Props) {
  const room = useActiveRoom() ?? { width: 20, length: 16, wallHeight: 8 };
  const walls = useActiveWalls();
  const placedProducts = useActivePlacedProducts();
  const wallCount = Object.keys(walls).length;
  const productCount = Object.keys(placedProducts).length;
  const showGrid = useUIStore((s) => s.showGrid);
  const toggleGrid = useUIStore((s) => s.toggleGrid);
  const gridSnap = useUIStore((s) => s.gridSnap);
  const setGridSnap = useUIStore((s) => s.setGridSnap);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <aside className="w-64 shrink-0 bg-obsidian-low flex flex-col overflow-hidden">
      {/* Sidebar header with collapse button */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="font-mono text-xs text-text-ghost tracking-widest">PANELS</span>
        <button
          onClick={toggleSidebar}
          className="font-mono text-base text-text-ghost hover:text-text-primary px-1"
          title="COLLAPSE_SIDEBAR"
        >
          &#x25C0;
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        <CollapsibleSection label="ROOM_CONFIG">
          <RoomSettings />
        </CollapsibleSection>

        <CollapsibleSection label="SYSTEM_STATS" defaultOpen={false}>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="font-mono text-[10px] text-text-dim">AREA</span>
              <span className="font-mono text-[10px] text-accent-light">
                {(room.width * room.length).toFixed(0)} SQ_FT
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-mono text-[10px] text-text-dim">WALLS</span>
              <span className="font-mono text-[10px] text-accent-light">{wallCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-mono text-[10px] text-text-dim">PRODUCTS</span>
              <span className="font-mono text-[10px] text-accent-light">{productCount}</span>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection label="LAYERS" defaultOpen={false}>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={toggleGrid}
                className="w-3 h-3 accent-accent rounded-none"
              />
              <span className="font-mono text-[10px] text-text-dim">GRID</span>
            </label>
          </div>
        </CollapsibleSection>

        <CollapsibleSection label="FLOOR_MATERIAL">
          <FloorMaterialPicker />
        </CollapsibleSection>

        <CollapsibleSection label="SNAP" defaultOpen={false}>
          <select
            value={gridSnap}
            onChange={(e) => setGridSnap(+e.target.value)}
            className="w-full px-2 py-1 text-[10px]"
          >
            <option value={0}>OFF</option>
            <option value={0.25}>3_INCH</option>
            <option value={0.5}>6_INCH</option>
            <option value={1}>1_FOOT</option>
          </select>
        </CollapsibleSection>

        {/* Custom Elements (Phase 14) — has its own internal header */}
        <CustomElementsPanel />

        {/* Framed Art Library (Phase 15) — has its own internal header */}
        <FramedArtLibrary />

        {/* Wainscoting Style Library (Phase 16) — has its own internal header */}
        <WainscotLibrary />

        <CollapsibleSection label="PRODUCT_LIBRARY">
          <SidebarProductPicker />
        </CollapsibleSection>
      </div>
    </aside>
  );
}
