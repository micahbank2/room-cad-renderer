import { describe, it } from "vitest";

describe("effectiveDimensions (LIB-04)", () => {
  it.todo("returns product dims + isPlaceholder:false when all dims are numbers");
  it.todo("returns 2/2/2 + isPlaceholder:true when width is null");
  it.todo("returns 2/2/2 + isPlaceholder:true when depth is null");
  it.todo("returns 2/2/2 + isPlaceholder:true when height is null");
  it.todo("returns 2/2/2 + isPlaceholder:true when product is undefined (orphan)");
});

describe("hasDimensions (LIB-04)", () => {
  it.todo("returns true when all three dims are numbers");
  it.todo("returns false when any dim is null");
});
