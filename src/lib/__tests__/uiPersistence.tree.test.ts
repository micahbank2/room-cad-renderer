import { describe, it, expect, beforeEach } from "vitest";
import { readUIObject, writeUIObject } from "@/lib/uiPersistence";

describe("uiPersistence — tree namespace (D-03)", () => {
  beforeEach(() => localStorage.clear());
  it("round-trips per-room expanded boolean under gsd:tree:room:{id}:expanded", () => {
    writeUIObject("gsd:tree:room:r1:expanded", { value: true });
    const out = readUIObject<{ value: boolean }>("gsd:tree:room:r1:expanded");
    expect(out.value).toBe(true);
  });
  it("missing key returns empty object (default state)", () => {
    expect(readUIObject("gsd:tree:room:nonexistent:expanded")).toEqual({});
  });
});
