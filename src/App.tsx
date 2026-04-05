import { useState, useEffect, lazy, Suspense } from "react";
import type { ToolType } from "@/types/cad";
import { useUIStore } from "@/stores/uiStore";
import { useCADStore } from "@/stores/cadStore";
import { useProductStore } from "@/stores/productStore";
import { useAutoSave } from "@/hooks/useAutoSave";
import Toolbar from "@/components/Toolbar";
import { ToolPalette } from "@/components/Toolbar";
import Sidebar from "@/components/Sidebar";
import StatusBar from "@/components/StatusBar";
import PropertiesPanel from "@/components/PropertiesPanel";
import ProductLibrary from "@/components/ProductLibrary";
import AddProductModal from "@/components/AddProductModal";
import WelcomeScreen from "@/components/WelcomeScreen";
import FabricCanvas from "@/canvas/FabricCanvas";

const ThreeViewport = lazy(() => import("@/three/ThreeViewport"));

type ViewMode = "2d" | "3d" | "split" | "library";

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const [showAddModal, setShowAddModal] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const setTool = useUIStore((s) => s.setTool);
  const wallCount = useCADStore((s) => Object.keys(s.walls).length);

  useAutoSave();

  const productLibrary = useProductStore((s) => s.products);
  const handleAddProduct = useProductStore((s) => s.addProduct);
  const handleRemoveProduct = useProductStore((s) => s.removeProduct);

  // Single load on mount — fixes dual-loader race
  useEffect(() => {
    useProductStore.getState().load();
  }, []);

  // Auto-detect if user has started (has walls or products)
  useEffect(() => {
    if (wallCount > 0) setHasStarted(true);
  }, [wallCount]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) return;

      const shortcuts: Record<string, ToolType> = {
        v: "select", w: "wall", d: "door", n: "window",
      };
      const tool = shortcuts[e.key.toLowerCase()];
      if (tool && viewMode !== "library") setTool(tool);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [setTool, viewMode]);

  // Welcome screen
  if (!hasStarted) {
    return <WelcomeScreen onStart={() => setHasStarted(true)} />;
  }

  const isCanvas = viewMode === "2d" || viewMode === "3d" || viewMode === "split";

  return (
    <div className="h-full flex flex-col bg-obsidian-base">
      <Toolbar viewMode={viewMode} onViewChange={setViewMode} onHome={() => setHasStarted(false)} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — only on canvas views */}
        {isCanvas && (
          <Sidebar productLibrary={productLibrary} />
        )}

        {/* Library view */}
        {viewMode === "library" && (
          <div className="flex flex-1 overflow-hidden">
            {/* Library sidebar filters */}
            <aside className="w-48 shrink-0 bg-obsidian-low p-4 space-y-4 overflow-y-auto">
              <div>
                <h4 className="font-mono text-[9px] text-text-ghost tracking-widest mb-2">
                  CATEGORIES
                </h4>
                {["SEATING", "STORAGE", "LIGHTING", "TABLES", "DECOR"].map((cat) => (
                  <label key={cat} className="flex items-center gap-2 py-0.5 cursor-pointer">
                    <input type="checkbox" className="w-3 h-3 accent-accent rounded-none" />
                    <span className="font-mono text-[10px] text-text-dim">{cat}</span>
                  </label>
                ))}
              </div>
              <div>
                <h4 className="font-mono text-[9px] text-text-ghost tracking-widest mb-2">
                  MATERIALS
                </h4>
                {["NATURAL_OAK", "BRUSHED_STEEL", "CONCRETE", "FABRIC"].map((mat) => (
                  <label key={mat} className="flex items-center gap-2 py-0.5 cursor-pointer">
                    <input type="checkbox" className="w-3 h-3 accent-accent rounded-none" />
                    <span className="font-mono text-[10px] text-text-dim">{mat}</span>
                  </label>
                ))}
              </div>
              <div className="pt-2">
                <span className="font-mono text-[9px] text-text-ghost tracking-widest">
                  RECENT_IMPORTS
                </span>
              </div>
            </aside>

            {/* Product grid */}
            <ProductLibrary
              products={productLibrary}
              onAdd={handleAddProduct}
              onRemove={handleRemoveProduct}
              onOpenAddModal={() => setShowAddModal(true)}
            />
          </div>
        )}

        {/* Canvas views */}
        {isCanvas && (
          <div className="flex flex-1 overflow-hidden">
            {(viewMode === "2d" || viewMode === "split") && (
              <div className={`${viewMode === "split" ? "w-1/2" : "flex-1"} h-full relative`}>
                <FabricCanvas productLibrary={productLibrary} />
                <ToolPalette />
                <PropertiesPanel productLibrary={productLibrary} />
              </div>
            )}
            {viewMode === "split" && (
              <div className="w-1 bg-accent/30 shrink-0" />
            )}
            {(viewMode === "3d" || viewMode === "split") && (
              <div className={`${viewMode === "split" ? "w-1/2" : "flex-1"} h-full relative`}>
                <Suspense
                  fallback={
                    <div className="w-full h-full bg-obsidian-deepest flex items-center justify-center">
                      <span className="font-mono text-[10px] text-text-ghost tracking-widest animate-pulse">
                        BUILDING_SCENE...
                      </span>
                    </div>
                  }
                >
                  <ThreeViewport productLibrary={productLibrary} />
                </Suspense>
                {viewMode === "3d" && (
                  <PropertiesPanel productLibrary={productLibrary} />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <StatusBar />

      {/* Add Product Modal */}
      {showAddModal && (
        <AddProductModal
          onAdd={handleAddProduct}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
