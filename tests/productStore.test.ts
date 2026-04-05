import { describe, it } from "vitest";

describe("productStore (LIB-03)", () => {
  it.todo("load() hydrates products from idb-keyval room-cad-products key");
  it.todo("load() migrates legacy non-null width/depth/height to number|null");
  it.todo("addProduct appends a product to state");
  it.todo("removeProduct filters out by id");
  it.todo("updateProduct applies partial changes by id");
  it.todo("subscribe persists to idb-keyval only when loaded=true");
  it.todo("subscribe does NOT persist before load() resolves (guards empty-state overwrite)");
});
