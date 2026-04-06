import { useState } from "react";
import { useProductStore } from "@/stores/productStore";
import { searchProducts } from "@/types/product";
import { DRAG_MIME } from "@/canvas/dragDrop";

export default function SidebarProductPicker() {
  const [search, setSearch] = useState("");
  const products = useProductStore((s) => s.products);
  const filtered = searchProducts(search, products);

  return (
    <div>
      <h3 className="font-mono text-[10px] text-text-ghost tracking-widest uppercase mb-2">
        PRODUCT_LIBRARY
      </h3>
      <input
        type="text"
        placeholder="SEARCH..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-2 py-1 text-[10px] mb-2 font-mono bg-obsidian-deepest border border-outline-variant/30 text-text-primary placeholder:text-text-ghost"
      />
      <div className="space-y-1 max-h-64 overflow-y-auto" data-testid="picker-list">
        {filtered.length === 0 && (
          <div className="font-mono text-[9px] text-text-ghost py-2 text-center">
            {products.length === 0 ? "NO_PRODUCTS_YET" : "NO_MATCHES"}
          </div>
        )}
        {filtered.map((p) => (
          <div
            key={p.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(DRAG_MIME, p.id);
              e.dataTransfer.effectAllowed = "copy";
            }}
            className="flex items-center gap-2 p-1.5 hover:bg-obsidian-high cursor-grab rounded-sm"
            data-testid="picker-row"
          >
            {p.imageUrl ? (
              <img
                src={p.imageUrl}
                alt=""
                className="w-8 h-8 object-cover rounded-sm shrink-0"
              />
            ) : (
              <div className="w-8 h-8 bg-obsidian-high rounded-sm shrink-0" />
            )}
            <span className="font-mono text-[10px] text-text-dim truncate">
              {p.name.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
