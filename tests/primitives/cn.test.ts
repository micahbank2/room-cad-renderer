import { describe, it, expect } from "vitest";
import { cn } from "@/lib/cn";

describe("cn()", () => {
  it("merges simple className strings", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("resolves Tailwind background color conflict (last wins)", () => {
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
  });

  it("filters falsy values (undefined, null, false)", () => {
    expect(cn(undefined, null, false, "visible")).toBe("visible");
  });

  it("resolves Tailwind padding conflict (last wins)", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("resolves Tailwind text color conflict (last wins)", () => {
    expect(cn("text-foreground", "text-muted-foreground")).toBe(
      "text-muted-foreground"
    );
  });
});
