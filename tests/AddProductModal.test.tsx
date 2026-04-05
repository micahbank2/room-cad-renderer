import { describe, it } from "vitest";

describe("AddProductModal Skip Dimensions (LIB-04)", () => {
  it.todo("renders SKIP_DIMENSIONS checkbox");
  it.todo("toggling Skip greys out width/depth/height inputs (opacity-40 + pointer-events-none)");
  it.todo("submit with skipDims=true calls onAdd with width:null, depth:null, height:null");
  it.todo("submit with skipDims=false calls onAdd with numeric width/depth/height");
});
