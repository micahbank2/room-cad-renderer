import { useState } from "react";
import { Box, Layers, Package } from "lucide-react";
import type { Product } from "@/types/product";
import { PRODUCT_CATEGORIES } from "@/types/product";
import { useUIStore } from "@/stores/uiStore";
import { setPendingProduct } from "@/canvas/tools/productTool";
import { LibraryCard } from "@/components/library";
import type { CategoryTab } from "@/components/library";
import { Tabs, TabsList, TabsTrigger, Input } from "@/components/ui";
import { getCachedGltfThumbnail } from "@/three/gltfThumbnailGenerator";
import { MaterialsSection } from "./MaterialsSection";

interface Props {
  products: Product[];
  onAdd: (product: Product) => void;
  onRemove: (id: string) => void;
  onOpenAddModal: () => void;
}

export function ProductLibrary({
  products,
  onRemove,
  onOpenAddModal,
}: Props) {
  // Top-level 3-tab toggle state
  const [activeLibraryTab, setActiveLibraryTab] = useState<
    "materials" | "products" | "assemblies"
  >("materials");

  // Products tab state
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Phase 58: re-render tick when an async GLTF thumbnail compute resolves.
  const [, setThumbTick] = useState(0);
  const onThumbReady = () => setThumbTick((t) => t + 1);
  const setTool = useUIStore((s) => s.setTool);

  /**
   * Phase 58 D-09 thumbnail-source priority:
   *   1. imageUrl (user-uploaded image wins)
   *   2. gltfId  (auto-rendered GLTF thumbnail; "fallback" sentinel → undefined)
   *   3. undefined (placeholder)
   * Note: gltfId thumbnail is NOT written back to Product.imageUrl — render-time only.
   */
  function resolveThumbnail(p: Product): string | undefined {
    if (p.imageUrl) return p.imageUrl;
    if (p.gltfId) {
      const cached = getCachedGltfThumbnail(p.gltfId, onThumbReady);
      if (cached === "fallback") return undefined;
      return cached; // dataURL OR undefined (in-flight)
    }
    return undefined;
  }

  // Products in PRODUCT_CATEGORIES filter directly; rest land in "Uncategorized"
  const KNOWN_CATEGORIES_LOWER = new Set(
    PRODUCT_CATEGORIES.map((c) => c.toLowerCase()),
  );

  const filtered = products.filter((p) => {
    const catLower = p.category?.toLowerCase() ?? "";
    const matchesCategory =
      activeCategory === "all" ||
      (activeCategory === "uncategorized" && !KNOWN_CATEGORIES_LOWER.has(catLower)) ||
      catLower === activeCategory.toLowerCase();
    const matchesSearch =
      !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Count uncategorized products
  const uncategorizedCount = products.filter(
    (p) => !KNOWN_CATEGORIES_LOWER.has(p.category?.toLowerCase() ?? ""),
  ).length;

  const tabList: CategoryTab[] = [
    { id: "all", label: "All", count: products.length },
    ...PRODUCT_CATEGORIES.map((cat) => ({
      id: cat.toLowerCase(),
      label: cat,
      count: products.filter(
        (p) => p.category?.toLowerCase() === cat.toLowerCase(),
      ).length,
    })),
    { id: "uncategorized", label: "Uncategorized", count: uncategorizedCount },
  ];

  function handlePlace(productId: string) {
    setSelectedId(productId);
    setPendingProduct(productId);
    setTool("product");
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Top-level 3-way tab toggle (replaces the old PRODUCT REGISTRY header) */}
      <div className="px-6 pt-6 pb-3 shrink-0">
        <Tabs
          value={activeLibraryTab}
          onValueChange={(v) =>
            setActiveLibraryTab(v as "materials" | "products" | "assemblies")
          }
        >
          <TabsList className="rounded-smooth-md w-full">
            <TabsTrigger
              value="materials"
              className="font-sans text-sm font-medium flex-1"
            >
              Materials
            </TabsTrigger>
            <TabsTrigger
              value="products"
              className="font-sans text-sm font-medium flex-1"
            >
              Products
            </TabsTrigger>
            <TabsTrigger
              value="assemblies"
              className="font-sans text-sm font-medium flex-1"
            >
              Assemblies
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Materials panel */}
      {activeLibraryTab === "materials" && (
        <div className="flex-1 overflow-y-auto">
          {/* MaterialsSection owns its upload button and category sub-tabs */}
          <MaterialsSection />
        </div>
      )}

      {/* Products panel */}
      {activeLibraryTab === "products" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Products header with Add Product button */}
          <div className="px-6 pb-3 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <span className="font-sans text-sm text-foreground">
                {filtered.length} items
              </span>
              <button
                onClick={onOpenAddModal}
                className="font-sans text-[10px] tracking-widest px-4 py-2 bg-primary text-primary-foreground rounded-smooth-md hover:opacity-90 active:scale-95 transition-all shadow-[0_0_15px_rgba(124,91,240,0.2)]"
              >
                + ADD PRODUCT
              </button>
            </div>
            <Input
              type="text"
              placeholder="SEARCH ASSETS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full mb-3"
            />
            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
              <TabsList className="flex-wrap gap-1">
                {tabList.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id}>
                    {tab.label}
                    {tab.count > 0 && (
                      <span className="ml-1 font-mono text-[9px] text-muted-foreground/60">
                        {tab.count}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Package size={36} className="text-muted-foreground/60 mb-3" /> {/* D-15: substitute for material-symbols 'inventory_2' */}
                <span className="font-sans text-[10px] text-muted-foreground/60 tracking-widest">
                  NO ITEMS FOUND
                </span>
                <button
                  onClick={onOpenAddModal}
                  className="mt-3 font-sans text-[10px] tracking-widest px-4 py-1.5 text-foreground border border-ring rounded-smooth-md hover:bg-accent/10 transition-colors"
                >
                  + ADD PRODUCT
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((p) => (
                  <LibraryCard
                    key={p.id}
                    thumbnail={resolveThumbnail(p)}
                    label={p.name}
                    selected={selectedId === p.id}
                    onClick={() => handlePlace(p.id)}
                    onRemove={() => onRemove(p.id)}
                    variant="grid"
                    badge={
                      p.gltfId ? (
                        <Box
                          size={12}
                          className="text-muted-foreground/80"
                          data-testid="gltf-badge"
                        />
                      ) : undefined
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assemblies panel — placeholder */}
      {activeLibraryTab === "assemblies" && (
        <div className="flex-1 overflow-y-auto px-6">
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <Layers className="w-8 h-8 opacity-40" />
            <p className="font-sans text-sm text-center leading-snug">
              Coming soon — pre-built combos like<br />kitchen cabinetry and bathroom sets
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductLibrary;
