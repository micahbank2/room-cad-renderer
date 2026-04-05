import { useState, useEffect, lazy, Suspense } from "react";
import type { ToolType } from "@/types/cad";
import { useUIStore } from "@/stores/uiStore";
import { useCADStore, useActiveWalls } from "@/stores/cadStore";
import { useProductStore } from "@/stores/productStore";
import { useFramedArtStore } from "@/stores/framedArtStore";
import { useWainscotStyleStore } from "@/stores/wainscotStyleStore";
import { useProjectStore } from "@/stores/projectStore";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useHelpRouteSync } from "@/hooks/useHelpRouteSync";
import { listProjects } from "@/lib/serialization";
import Toolbar from "@/components/Toolbar";
import { ToolPalette } from "@/components/Toolbar";
import Sidebar from "@/components/Sidebar";
import StatusBar from "@/components/StatusBar";
import PropertiesPanel from "@/components/PropertiesPanel";
import ProductLibrary from "@/components/ProductLibrary";
import AddProductModal from "@/components/AddProductModal";
import HelpModal from "@/components/HelpModal";
import OnboardingOverlay from "@/components/onboarding/OnboardingOverlay";
import { useOnboardingStore } from "@/stores/onboardingStore";
import WelcomeScreen from "@/components/WelcomeScreen";
import RoomTabs from "@/components/RoomTabs";
import AddRoomDialog from "@/components/AddRoomDialog";
import TemplatePickerDialog from "@/components/TemplatePickerDialog";
import FabricCanvas from "@/canvas/FabricCanvas";

const ThreeViewport = lazy(() => import("@/three/ThreeViewport"));

type ViewMode = "2d" | "3d" | "split" | "library";

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddRoomDialog, setShowAddRoomDialog] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const setTool = useUIStore((s) => s.setTool);
  const activeWalls = useActiveWalls();
  const wallCount = Object.keys(activeWalls).length;

  useAutoSave();
  useHelpRouteSync();

  const productLibrary = useProductStore((s) => s.products);
  const handleAddProduct = useProductStore((s) => s.addProduct);
  const handleRemoveProduct = useProductStore((s) => s.removeProduct);

  // Single load on mount — fixes dual-loader race
  useEffect(() => {
    useProductStore.getState().load();
    useFramedArtStore.getState().load();
    useWainscotStyleStore.getState().load();
  }, []);

  // Hydrate last-saved project on mount (SAVE-02 reload support)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const projects = await listProjects();
      if (cancelled || projects.length === 0) return;
      const latest = projects[0];
      useCADStore.getState().loadSnapshot(latest.snapshot);
      useProjectStore.getState().setActive(latest.id, latest.name);
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-detect if user has started (has walls or products)
  useEffect(() => {
    if (wallCount > 0) setHasStarted(true);
  }, [wallCount]);

  // Auto-start onboarding tour the first time the canvas is shown
  useEffect(() => {
    if (!hasStarted) return;
    const st = useOnboardingStore.getState();
    if (!st.completed && !st.running) {
      // Small delay so DOM has time to render + toolbar mounts
      const id = window.setTimeout(() => {
        // Re-check in case user interacts quickly
        const now = useOnboardingStore.getState();
        if (!now.completed && !now.running) now.start();
      }, 400);
      return () => window.clearTimeout(id);
    }
  }, [hasStarted]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Escape always closes help first (highest priority), regardless of focus
      if (e.key === "Escape" && useUIStore.getState().showHelp) {
        useUIStore.getState().closeHelp();
        e.preventDefault();
        return;
      }

      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) return;

      // "?" opens help (Shift+/ on US layout). Check both key and shifted "/"
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        useUIStore.getState().openHelp();
        e.preventDefault();
        return;
      }

      // Ignore tool shortcuts while help is open
      if (useUIStore.getState().showHelp) return;

      const shortcuts: Record<string, ToolType> = {
        v: "select", w: "wall", d: "door", n: "window", c: "ceiling",
      };
      const tool = shortcuts[e.key.toLowerCase()];
      if (tool && viewMode !== "library") setTool(tool);
      // "0" resets canvas view (fit-to-view) — Phase 6 NAV-03
      if (e.key === "0" && (viewMode === "2d" || viewMode === "split")) {
        useUIStore.getState().resetView();
      }
      // D-03: 'e' toggles camera mode in 3D/split views
      if (e.key.toLowerCase() === "e" && (viewMode === "3d" || viewMode === "split")) {
        useUIStore.getState().toggleCameraMode();
      }
      // D-10: Ctrl/Cmd+Tab cycles active room forward
      if (e.key === "Tab" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const st = useCADStore.getState();
        const ids = Object.keys(st.rooms);
        if (ids.length < 2 || !st.activeRoomId) return;
        const i = ids.indexOf(st.activeRoomId);
        st.switchRoom(ids[(i + 1) % ids.length]);
      }
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
      <Toolbar
        viewMode={viewMode}
        onViewChange={setViewMode}
        onHome={() => setHasStarted(false)}
        onFloorPlanClick={() => setShowTemplatePicker(true)}
      />

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
          <div className="flex flex-1 flex-col overflow-hidden">
            {isCanvas && <RoomTabs onAddClick={() => setShowAddRoomDialog(true)} />}
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
          </div>
        )}
      </div>

      <AddRoomDialog open={showAddRoomDialog} onClose={() => setShowAddRoomDialog(false)} />
      <TemplatePickerDialog
        open={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        showUploadOptions
      />

      <StatusBar />

      {/* Add Product Modal */}
      {showAddModal && (
        <AddProductModal
          onAdd={handleAddProduct}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Help Modal */}
      <HelpModal />

      {/* Onboarding tour */}
      <OnboardingOverlay />
    </div>
  );
}
