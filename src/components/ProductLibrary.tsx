import { useState } from "react";
import type { Product } from "@/types/product";
import { PRODUCT_CATEGORIES, hasDimensions } from "@/types/product";
import { useUIStore } from "@/stores/uiStore";
import { setPendingProduct } from "@/canvas/tools/productTool";
import { DRAG_MIME } from "@/canvas/dragDrop";

interface Props {
  products: Product[];
  onAdd: (product: Product) => void;
  onRemove: (id: string) => void;
  onOpenAddModal: () => void;
}

export default function ProductLibrary({
  products,
  onAdd,
  onRemove,
  onOpenAddModal,
}: Props) {
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [search, setSearch] = useState("");
  const setTool = useUIStore((s) => s.setTool);

  const categories = ["ALL", ...PRODUCT_CATEGORIES];

  const filtered = products.filter((p) => {
    const matchesCategory =
      activeCategory === "ALL" ||
      p.category.toUpperCase() === activeCategory.toUpperCase();
    const matchesSearch =
      !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  function handlePlace(productId: string) {
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
              YOUR_LIBRARY
            </span>
            <h1 className="font-display font-bold text-2xl text-text-primary tracking-tight">
              PRODUCT_REGISTRY
            </h1>
          </div>
          <button
            onClick={onOpenAddModal}
            className="font-mono text-[10px] tracking-widest px-4 py-2 bg-accent text-white rounded-sm hover:opacity-90 active:scale-95 transition-all shadow-[0_0_15px_rgba(124,91,240,0.2)]"
          >
            + ADD_PRODUCT
          </button>
        </div>
        <span className="font-mono text-sm text-accent-light">
          {filtered.length} ITEMS
        </span>
      </div>

      {/* Filters */}
      <div className="px-6 pb-3 shrink-0">
        <input
          type="text"
          placeholder="SEARCH_ASSETS..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 px-3 py-1.5 text-xs mb-3"
        />
        <div className="flex gap-1.5 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`font-mono text-[9px] tracking-widest px-2.5 py-1 rounded-sm transition-colors ${
                activeCategory === cat
                  ? "bg-accent/20 text-accent-light border border-accent/30"
                  : "text-text-ghost hover:text-text-dim border border-transparent"
              }`}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <span className="material-symbols-outlined text-4xl text-text-ghost mb-3">
              inventory_2
            </span>
            <span className="font-mono text-[10px] text-text-ghost tracking-widest">
              NO_ITEMS_FOUND
            </span>
            <button
              onClick={onOpenAddModal}
              className="mt-3 font-mono text-[10px] tracking-widest px-4 py-1.5 text-accent border border-accent/30 rounded-sm hover:bg-accent/10 transition-colors"
            >
              + ADD_PRODUCT
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((p) => (
              <div
                key={p.id}
                draggable
                onDragStart={(e) => {
                  const product = p;
                  e.dataTransfer.setData(DRAG_MIME, product.id);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                className="group bg-obsidian-low border border-outline-variant/0 hover:border-outline-variant/20 rounded-sm overflow-hidden transition-all duration-200"
              >
                {/* Image */}
                <div className="aspect-[4/3] bg-obsidian-deepest flex items-center justify-center overflow-hidden relative">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-3xl text-text-ghost">
                      chair
                    </span>
                  )}
                  {/* Category badge */}
                  <span className="absolute top-2 left-2 font-mono text-[8px] tracking-widest px-2 py-0.5 bg-accent/80 text-white rounded-sm">
                    {p.category.toUpperCase()}
                  </span>
                  {/* Hover actions */}
                  <div className="absolute inset-0 bg-obsidian-deepest/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                    <button
                      onClick={() => handlePlace(p.id)}
                      className="font-mono text-[9px] tracking-widest px-3 py-1.5 bg-accent text-white rounded-sm hover:opacity-90"
                    >
                      PLACE
                    </button>
                    <button
                      onClick={() => onRemove(p.id)}
                      className="font-mono text-[9px] tracking-widest px-2 py-1.5 bg-red-900/40 text-red-400 rounded-sm hover:bg-red-900/60"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3 space-y-1">
                  <div className="font-mono text-xs text-text-primary font-medium tracking-wide truncate">
                    {p.name.toUpperCase().replace(/\s/g, "_")}
                  </div>
                  <div className="font-mono text-[10px] text-text-ghost">
                    {hasDimensions(p)
                      ? `W ${p.width} × D ${p.depth} × H ${p.height} FT`
                      : "SIZE: UNSET"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
