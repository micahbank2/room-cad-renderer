import { useState } from "react";
import type { Product } from "@/types/product";
import {
  useActiveRoom,
  useActiveWalls,
  useActivePlacedProducts,
} from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import RoomSettings from "./RoomSettings";
import SidebarProductPicker from "./SidebarProductPicker";
import CustomElementsPanel from "./CustomElementsPanel";
import FramedArtLibrary from "./FramedArtLibrary";
import WainscotLibrary from "./WainscotLibrary";
import { RoomsTreePanel } from "./RoomsTreePanel";

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
        <h3 className="font-sans text-base font-medium text-muted-foreground">
          {label}
        </h3>
        <span className="font-sans text-sm text-muted-foreground/60">
          {open ? "\u2212" : "+"}
        </span>
      </button>
      {open && children}
    </div>
  );
}

export default function Sidebar({ productLibrary }: Props) {
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
    <aside className="w-64 shrink-0 bg-card flex flex-col overflow-hidden">
      {/* Sidebar header with collapse button */}
      <div className="flex items-center justify-between px-4 pt-2 pb-2">
        <span className="font-sans text-sm font-medium text-muted-foreground">Panels</span>
        <button
          onClick={toggleSidebar}
          className="font-sans text-base text-muted-foreground/60 hover:text-foreground px-1"
          title="Collapse sidebar"
        >
          &#x25C0;
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        <RoomsTreePanel productLibrary={productLibrary} />
        <CollapsibleSection label="Room config">
          <RoomSettings />
        </CollapsibleSection>

        <CollapsibleSection label="System stats" defaultOpen={false}>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="font-sans text-[10px] text-muted-foreground/80">AREA</span>
              <span className="font-sans text-[10px] text-foreground">
                {(room.width * room.length).toFixed(0)} SQ FT
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans text-[10px] text-muted-foreground/80">WALLS</span>
              <span className="font-sans text-[10px] text-foreground">{wallCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans text-[10px] text-muted-foreground/80">PRODUCTS</span>
              <span className="font-sans text-[10px] text-foreground">{productCount}</span>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection label="Layers" defaultOpen={false}>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={toggleGrid}
                className="w-3 h-3 accent-accent rounded-none"
              />
              <span className="font-sans text-[10px] text-muted-foreground/80">GRID</span>
            </label>
          </div>
        </CollapsibleSection>


        <CollapsibleSection label="Snap" defaultOpen={false}>
          <select
            value={gridSnap}
            onChange={(e) => setGridSnap(+e.target.value)}
            className="w-full px-2 py-1 text-[10px]"
          >
            <option value={0}>OFF</option>
            <option value={0.25}>3 INCH</option>
            <option value={0.5}>6 INCH</option>
            <option value={1}>1 FOOT</option>
          </select>
        </CollapsibleSection>

        {/* Custom Elements (Phase 14) — has its own internal header */}
        <CustomElementsPanel />

        {/* Framed Art Library (Phase 15) — has its own internal header */}
        <FramedArtLibrary />

        {/* Wainscoting Style Library (Phase 16) — has its own internal header */}
        <WainscotLibrary />

        <CollapsibleSection label="Product library">
          <SidebarProductPicker />
        </CollapsibleSection>
      </div>
    </aside>
  );
}
