import { useState, useEffect, lazy, Suspense } from "react";
import type { ToolType, WallSegment, PlacedProduct } from "@/types/cad";
import { useUIStore } from "@/stores/uiStore";
import { useCADStore, useActiveWalls, getActiveRoomDoc } from "@/stores/cadStore";
import { uid } from "@/lib/geometry";
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

const ThreeViewport = lazy(() => import("@/three/ThreeViewport"));

type ViewMode = "2d" | "3d" | "split" | "library";

// Clipboard for copy/paste (module-level, not React state)
let _clipboard: { walls: WallSegment[]; products: PlacedProduct[] } | null = null;
const PASTE_OFFSET = 1; // feet offset on each paste

export default function App() {
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
        useCADStore.getState().loadSnapshot(project.snapshot);
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
      // Copy (Ctrl/Cmd+C) — copy selected walls and products to clipboard
      if (e.key.toLowerCase() === "c" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        const selectedIds = useUIStore.getState().selectedIds;
        if (selectedIds.length === 0) return;
        const doc = getActiveRoomDoc();
        if (!doc) return;
        const walls: WallSegment[] = [];
        const products: PlacedProduct[] = [];
        for (const id of selectedIds) {
          if (doc.walls[id]) walls.push(JSON.parse(JSON.stringify(doc.walls[id])));
          if (doc.placedProducts[id]) products.push(JSON.parse(JSON.stringify(doc.placedProducts[id])));
        }
        if (walls.length > 0 || products.length > 0) {
          _clipboard = { walls, products };
          e.preventDefault();
        }
        return;
      }
      // Paste (Ctrl/Cmd+V) — paste clipboard items with offset and new IDs
      if (e.key.toLowerCase() === "v" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        if (!_clipboard) return;
        e.preventDefault();
        const store = useCADStore.getState();
        const newIds: string[] = [];
        for (const w of _clipboard.walls) {
          const newId = `wall_${uid()}`;
          store.addWall(
            { x: w.start.x + PASTE_OFFSET, y: w.start.y + PASTE_OFFSET },
            { x: w.end.x + PASTE_OFFSET, y: w.end.y + PASTE_OFFSET },
          );
          // addWall creates a basic wall; apply remaining properties
          const doc = getActiveRoomDoc();
          if (doc) {
            // Find the most recently added wall (last key)
            const allIds = Object.keys(doc.walls);
            const latestId = allIds[allIds.length - 1];
            if (latestId) {
              store.updateWall(latestId, {
                thickness: w.thickness,
                height: w.height,
                openings: w.openings.map((o) => ({ ...o, id: `op_${uid()}` })),
                wallpaper: w.wallpaper ? JSON.parse(JSON.stringify(w.wallpaper)) : undefined,
                wainscoting: w.wainscoting ? JSON.parse(JSON.stringify(w.wainscoting)) : undefined,
                crownMolding: w.crownMolding ? JSON.parse(JSON.stringify(w.crownMolding)) : undefined,
                wallArt: w.wallArt?.map((a) => ({ ...a, id: `art_${uid()}` })),
              });
              newIds.push(latestId);
            }
          }
        }
        for (const p of _clipboard.products) {
          const newId = store.placeProduct(p.productId, {
            x: p.position.x + PASTE_OFFSET,
            y: p.position.y + PASTE_OFFSET,
          });
          if (p.rotation) store.rotateProduct(newId, p.rotation);
          if (p.sizeScale) store.resizeProduct(newId, p.sizeScale);
          newIds.push(newId);
        }
        // Select the pasted items
        if (newIds.length > 0) useUIStore.getState().select(newIds);
        // Offset clipboard for next paste
        _clipboard = {
          walls: _clipboard.walls.map((w) => ({
            ...w,
            start: { x: w.start.x + PASTE_OFFSET, y: w.start.y + PASTE_OFFSET },
            end: { x: w.end.x + PASTE_OFFSET, y: w.end.y + PASTE_OFFSET },
          })),
          products: _clipboard.products.map((p) => ({
            ...p,
            position: { x: p.position.x + PASTE_OFFSET, y: p.position.y + PASTE_OFFSET },
          })),
        };
        return;
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
        {isCanvas && showSidebar && (
          <Sidebar productLibrary={productLibrary} />
        )}

        {/* Show sidebar button — visible when sidebar is collapsed */}
        {isCanvas && !showSidebar && (
          <button
            onClick={toggleSidebar}
            className="absolute left-2 top-2 z-20 w-8 h-8 bg-obsidian-low rounded-sm border border-outline-variant/30 flex items-center justify-center hover:bg-obsidian-mid"
            title="SHOW SIDEBAR"
          >
            <span className="font-mono text-[10px] text-text-dim">&#9776;</span>
          </button>
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
                {["NATURAL OAK", "BRUSHED STEEL", "CONCRETE", "FABRIC"].map((mat) => (
                  <label key={mat} className="flex items-center gap-2 py-0.5 cursor-pointer">
                    <input type="checkbox" className="w-3 h-3 accent-accent rounded-none" />
                    <span className="font-mono text-[10px] text-text-dim">{mat}</span>
                  </label>
                ))}
              </div>
              <div className="pt-2">
                <span className="font-mono text-[9px] text-text-ghost tracking-widest">
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
                        BUILDING SCENE...
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
