import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import type { ToolType } from "@/types/cad";
import { useTheme } from "@/hooks/useTheme";
import { registerThemeSetter } from "@/test-utils/themeDrivers";
import { buildRegistry } from "@/lib/shortcuts";
import { useUIStore } from "@/stores/uiStore";
import {
  useCADStore,
  useActiveWalls,
  useActivePlacedProducts,
  useActivePlacedCustomElements,
} from "@/stores/cadStore";
import { useProductStore } from "@/stores/productStore";
import { useFramedArtStore } from "@/stores/framedArtStore";
import { useWainscotStyleStore } from "@/stores/wainscotStyleStore";
import { useProjectStore } from "@/stores/projectStore";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useHelpRouteSync } from "@/hooks/useHelpRouteSync";
import { getLastProjectId, loadProject } from "@/lib/serialization";
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
import { CanvasContextMenu } from "@/components/CanvasContextMenu";

const ThreeViewport = lazy(() => import("@/three/ThreeViewport"));

type ViewMode = "2d" | "3d" | "split" | "library";

export default function App() {
  // Phase 71: theme system — applies .dark class to <html>; wires test driver.
  // useEffect returns the identity-checked cleanup directly (Phase 64 acc2 pattern,
  // CLAUDE.md #7) so StrictMode double-mount does not clobber the live registration.
  const { setTheme } = useTheme();
  useEffect(() => registerThemeSetter(setTheme), [setTheme]);

  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddRoomDialog, setShowAddRoomDialog] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const setTool = useUIStore((s) => s.setTool);
  const showSidebar = useUIStore((s) => s.showSidebar);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const activeWalls = useActiveWalls();
  const wallCount = Object.keys(activeWalls).length;
  // Phase 31 Plan 03 Rule 2: comment in auto-detect effect says "walls or
  // products" but original code only watched walls. Also watch placed products
  // + placed custom elements so seeded fixtures (Phase 31 RTL specs) skip the
  // welcome screen and mount the canvas. Critical for driver-bridge install.
  const activePlacedProducts = useActivePlacedProducts();
  const activePlacedCustomElements = useActivePlacedCustomElements();
  const placedCount =
    Object.keys(activePlacedProducts).length +
    Object.keys(activePlacedCustomElements).length;

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

  // D-02: Silent restore last-active project (pointer-based)
  // Reads "room-cad-last-project" pointer; on hit → loadProject →
  // hydrate CAD + project store + skip WelcomeScreen (setHasStarted).
  // On missing/stale/throw → fall through to WelcomeScreen (D-02a).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const lastId = await getLastProjectId();
        if (cancelled || !lastId) return;
        const project = await loadProject(lastId);
        if (cancelled || !project) return;
        await useCADStore.getState().loadSnapshot(project.snapshot);
        useProjectStore.getState().setActive(project.id, project.name);
        setHasStarted(true);
      } catch (err) {
        console.error("[App] Silent restore failed", err);
        // D-02a: fall through → WelcomeScreen
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-detect if user has started (has walls or products)
  useEffect(() => {
    if (wallCount > 0 || placedCount > 0) setHasStarted(true);
  }, [wallCount, placedCount]);

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

  // Phase 52 (HOTKEY-01): keyboard shortcuts dispatched via the registry in
  // src/lib/shortcuts.ts. Adding a new shortcut means adding an entry there;
  // the help overlay and the keyboard handler stay in sync automatically.
  // Audit invariant: tests/lib/shortcuts.registry.test.ts asserts every
  // expected action string is present in SHORTCUT_DISPLAY_LIST.
  const registry = useMemo(
    () => buildRegistry({ viewMode, setTool }),
    [viewMode, setTool],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Escape always closes help first (highest priority), regardless of focus.
      if (e.key === "Escape" && useUIStore.getState().showHelp) {
        useUIStore.getState().closeHelp();
        e.preventDefault();
        return;
      }
      // Active-element guard: ignore all shortcuts when typing in a form field.
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) return;
      // While help is open, only ? re-focuses shortcuts section; everything else suppressed.
      if (useUIStore.getState().showHelp) {
        if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
          useUIStore.getState().openHelp("shortcuts");
          e.preventDefault();
        }
        return;
      }
      // Registry-driven dispatch — first match wins (iteration-order invariant honored).
      for (const entry of registry) {
        if (entry.match(e)) {
          e.preventDefault();
          entry.handler();
          return;
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [registry]);

  // Welcome screen
  if (!hasStarted) {
    return <WelcomeScreen onStart={() => setHasStarted(true)} />;
  }

  const isCanvas = viewMode === "2d" || viewMode === "3d" || viewMode === "split";

  return (
    <div className="h-full flex flex-col bg-background">
      <Toolbar
        viewMode={viewMode}
        onViewChange={setViewMode}
        onHome={() => setHasStarted(false)}
        onFloorPlanClick={() => setShowTemplatePicker(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — only on canvas views */}
        {isCanvas && showSidebar && (
          <Sidebar productLibrary={productLibrary} />
        )}

        {/* Show sidebar button — visible when sidebar is collapsed */}
        {isCanvas && !showSidebar && (
          <button
            onClick={toggleSidebar}
            className="absolute left-2 top-2 z-20 w-8 h-8 bg-card rounded-smooth-md border border-border/60 flex items-center justify-center hover:bg-popover"
            title="SHOW SIDEBAR"
          >
            <span className="font-sans text-[10px] text-muted-foreground/80">&#9776;</span>
          </button>
        )}

        {/* Library view */}
        {viewMode === "library" && (
          <div className="flex flex-1 overflow-hidden">
            {/* Library sidebar filters */}
            <aside className="w-48 shrink-0 bg-card p-4 space-y-4 overflow-y-auto">
              <div>
                <h4 className="font-sans text-[9px] text-muted-foreground/60 tracking-widest mb-2">
                  CATEGORIES
                </h4>
                {["SEATING", "STORAGE", "LIGHTING", "TABLES", "DECOR"].map((cat) => (
                  <label key={cat} className="flex items-center gap-2 py-0.5 cursor-pointer">
                    <input type="checkbox" className="w-3 h-3 accent-accent rounded-none" />
                    <span className="font-sans text-[10px] text-muted-foreground/80">{cat}</span>
                  </label>
                ))}
              </div>
              <div>
                <h4 className="font-sans text-[9px] text-muted-foreground/60 tracking-widest mb-2">
                  MATERIALS
                </h4>
                {["NATURAL OAK", "BRUSHED STEEL", "CONCRETE", "FABRIC"].map((mat) => (
                  <label key={mat} className="flex items-center gap-2 py-0.5 cursor-pointer">
                    <input type="checkbox" className="w-3 h-3 accent-accent rounded-none" />
                    <span className="font-sans text-[10px] text-muted-foreground/80">{mat}</span>
                  </label>
                ))}
              </div>
              <div className="pt-2">
                <span className="font-sans text-[9px] text-muted-foreground/60 tracking-widest">
                  RECENT IMPORTS
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
                <PropertiesPanel productLibrary={productLibrary} viewMode={viewMode} />
              </div>
            )}
            {viewMode === "split" && (
              <div className="w-1 bg-accent/30 shrink-0" />
            )}
            {(viewMode === "3d" || viewMode === "split") && (
              <div className={`${viewMode === "split" ? "w-1/2" : "flex-1"} h-full relative`}>
                <Suspense
                  fallback={
                    <div className="w-full h-full bg-background flex items-center justify-center">
                      <span className="font-mono text-[10px] text-muted-foreground/60 tracking-widest animate-pulse">
                        BUILDING SCENE...
                      </span>
                    </div>
                  }
                >
                  <ThreeViewport productLibrary={productLibrary} />
                </Suspense>
                {viewMode === "3d" && (
                  <PropertiesPanel productLibrary={productLibrary} viewMode={viewMode} />
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

      {/* Phase 53 CTXMENU-01: right-click context menu — mounted once at root */}
      <CanvasContextMenu />
    </div>
  );
}
