const cache = new Map<string, HTMLImageElement>();
const loading = new Set<string>();

export function getCachedImage(
  productId: string,
  url: string,
  onReady: () => void
): HTMLImageElement | null {
  const hit = cache.get(productId);
  if (hit) return hit;
  if (loading.has(productId)) return null;

  loading.add(productId);
  const img = new Image();
  img.onload = () => {
    loading.delete(productId);
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      cache.set(productId, img);
      onReady();
    }
  };
  img.onerror = () => {
    loading.delete(productId);
  };
  img.src = url;
  return null;
}

export function invalidateProduct(productId: string): void {
  cache.delete(productId);
}

// Test-only helper to reset module state between tests
export function __resetCache(): void {
  cache.clear();
  loading.clear();
}
