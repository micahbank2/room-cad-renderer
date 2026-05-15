import { PanelSection } from "@/components/ui";
import type { Product } from "@/types/product";
import { useUIStore } from "@/stores/uiStore";
import { useCADStore } from "@/stores/cadStore";
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
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  // Phase 84 D-02 (IA-08): contextual visibility gates.
  // - Custom Elements: visible during select/product workflows.
  // - Wainscot + Framed Art: wall-surface catalog managers — gated by
  //   activeTool === "select" AND a wall being selected.
  // Phase 84 D-04: product-library auto-expands while product tool is active.
  const activeTool = useUIStore((s) => s.activeTool);
  const selectedIds = useUIStore((s) => s.selectedIds);
  const walls = useCADStore((s) => s.rooms[s.activeRoomId ?? ""]?.walls ?? {});
  const wallSelected = selectedIds.length === 1 && !!walls[selectedIds[0]];
  const customElementsVisible =
    activeTool === "select" || activeTool === "product";
  const wallSurfaceVisible = activeTool === "select" && wallSelected;

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

      {/* Scrollable content
          Phase 81 Plan 01 (IA-02): every section is wrapped in the shared
          PanelSection primitive with a stable sidebar-* id. Only the Rooms tree
          defaults open; every secondary section defaults closed and persists
          its expanded state to localStorage["ui:propertiesPanel:sections"]. */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        <PanelSection id="sidebar-rooms-tree" label="Rooms" defaultOpen={true}>
          <RoomsTreePanel productLibrary={productLibrary} />
        </PanelSection>

        <PanelSection id="sidebar-room-config" label="Room config" defaultOpen={false}>
          <RoomSettings />
        </PanelSection>

        {/* Phase 80 audit removals: System Stats, Layers (now in toolbar grid toggle).
            Phase 83 D-04: Snap moved to FloatingToolbar Utility group. */}

        {customElementsVisible && (
          <PanelSection id="sidebar-custom-elements" label="Custom elements" defaultOpen={false}>
            <CustomElementsPanel />
          </PanelSection>
        )}

        {wallSurfaceVisible && (
          <PanelSection id="sidebar-framed-art" label="Framed art library" defaultOpen={false}>
            <FramedArtLibrary />
          </PanelSection>
        )}

        {wallSurfaceVisible && (
          <PanelSection id="sidebar-wainscoting" label="Wainscoting library" defaultOpen={false}>
            <WainscotLibrary />
          </PanelSection>
        )}

        <PanelSection
          id="sidebar-product-library"
          label="Product library"
          defaultOpen={false}
          forceOpen={activeTool === "product"}
        >
          <SidebarProductPicker />
        </PanelSection>
      </div>
    </aside>
  );
}
