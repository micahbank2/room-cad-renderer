import type { Product } from "@/types/product";
import { useActiveRoom, useActiveWalls, useActivePlacedProducts } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import RoomSettings from "./RoomSettings";
import SidebarProductPicker from "./SidebarProductPicker";
import FloorMaterialPicker from "./FloorMaterialPicker";

interface Props {
  productLibrary: Product[];
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

  return (
    <aside className="w-56 shrink-0 bg-obsidian-low flex flex-col overflow-y-auto">
      {/* Room config */}
      <div className="p-4 space-y-4">
        <div>
          <h3 className="font-mono text-[10px] text-text-ghost tracking-widest uppercase mb-3">
            ROOM_CONFIG
          </h3>
          <RoomSettings />
        </div>

        {/* Quick stats */}
        <div>
          <h3 className="font-mono text-[10px] text-text-ghost tracking-widest uppercase mb-2">
            SYSTEM_STATS
          </h3>
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
        </div>

        {/* Grid/Layers */}
        <div>
          <h3 className="font-mono text-[10px] text-text-ghost tracking-widest uppercase mb-2">
            LAYERS
          </h3>
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
        </div>

        {/* Floor material (FLOOR-01/02/03) */}
        <FloorMaterialPicker />

        {/* Grid snap */}
        <div>
          <h3 className="font-mono text-[10px] text-text-ghost tracking-widest uppercase mb-2">
            SNAP
          </h3>
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
        </div>

        {/* Product picker (LIB-05) */}
        <div>
          <SidebarProductPicker />
        </div>
      </div>
    </aside>
  );
}
