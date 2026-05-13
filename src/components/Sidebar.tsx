import { PanelSection } from "@/components/ui";
import type { Product } from "@/types/product";
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


export default function Sidebar({ productLibrary }: Props) {
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
        <PanelSection id="sidebar-room-config" label="Room config">
          <RoomSettings />
        </PanelSection>

        {/* Phase 80 audit removals (dead code / duplicates):
            - "System stats" panel — debug chrome with no audience
            - "Layers" panel — single Show Grid checkbox already in FloatingToolbar
            Snap stays here until Phase 83 wires it into the FloatingToolbar utility group. */}

        <PanelSection id="sidebar-snap" label="Snap" defaultOpen={false}>
          <select
            value={gridSnap}
            onChange={(e) => setGridSnap(+e.target.value)}
            className="w-full px-2 py-1 text-[10px]"
          >
            <option value={0}>Off</option>
            <option value={0.25}>3 inch</option>
            <option value={0.5}>6 inch</option>
            <option value={1}>1 foot</option>
          </select>
        </PanelSection>

        {/* Custom Elements (Phase 14) — has its own internal header */}
        <CustomElementsPanel />

        {/* Framed Art Library (Phase 15) — has its own internal header */}
        <FramedArtLibrary />

        {/* Wainscoting Style Library (Phase 16) — has its own internal header */}
        <WainscotLibrary />

        <PanelSection id="sidebar-product-library" label="Product library">
          <SidebarProductPicker />
        </PanelSection>
      </div>
    </aside>
  );
}
