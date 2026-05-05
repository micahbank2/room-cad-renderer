import { useState } from "react";
import { Box } from "lucide-react";
import type { Product } from "@/types/product";
import { PRODUCT_CATEGORIES } from "@/types/product";
import { useUIStore } from "@/stores/uiStore";
import { setPendingProduct } from "@/canvas/tools/productTool";
import { LibraryCard, CategoryTabs } from "@/components/library";
import type { CategoryTab } from "@/components/library";
import { getCachedGltfThumbnail } from "@/three/gltfThumbnailGenerator";

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

  const filtered = products.filter((p) => {
    const matchesCategory =
      activeCategory === "all" ||
      p.category.toLowerCase() === activeCategory.toLowerCase();
    const matchesSearch =
      !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const tabList: CategoryTab[] = [
    { id: "all", label: "All", count: products.length },
    ...PRODUCT_CATEGORIES.map((cat) => ({
      id: cat.toLowerCase(),
      label: cat,
      count: products.filter(
        (p) => p.category.toLowerCase() === cat.toLowerCase(),
      ).length,
    })),
  ];

  function handlePlace(productId: string) {
    setSelectedId(productId);
    setPendingProduct(productId);
    setTool("product");
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4 shrink-0">
        <div className="flex items-start justify-between mb-1">
          <div>
            <span className="font-mono text-[10px] text-text-ghost tracking-widest block mb-1">
              YOUR LIBRARY
            </span>
            <h1 className="font-display font-bold text-2xl text-text-primary tracking-tight">
              PRODUCT REGISTRY
            </h1>
          </div>
          <button
            onClick={onOpenAddModal}
            className="font-mono text-[10px] tracking-widest px-4 py-2 bg-accent text-white rounded-sm hover:opacity-90 active:scale-95 transition-all shadow-[0_0_15px_rgba(124,91,240,0.2)]"
          >
            + ADD PRODUCT
          </button>
        </div>
        <span className="font-mono text-sm text-accent-light">
          {filtered.length} ITEMS
        </span>
      </div>

      {/* Filters */}
      <div className="px-6 pb-3 shrink-0 space-y-3">
        <input
          type="text"
          placeholder="SEARCH ASSETS..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 px-3 py-1.5 text-xs"
        />
        <CategoryTabs
          tabs={tabList}
          activeId={activeCategory}
          onChange={setActiveCategory}
        />
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <span className="material-symbols-outlined text-4xl text-text-ghost mb-3">
              inventory_2
            </span>
            <span className="font-mono text-[10px] text-text-ghost tracking-widest">
              NO ITEMS FOUND
            </span>
            <button
              onClick={onOpenAddModal}
              className="mt-3 font-mono text-[10px] tracking-widest px-4 py-1.5 text-accent border border-accent/30 rounded-sm hover:bg-accent/10 transition-colors"
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
                      className="text-text-dim"
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
  );
}

export default ProductLibrary;
