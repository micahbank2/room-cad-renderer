import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";

// motion/react layoutId requires no special mocking since happy-dom renders
// the <motion.div> as a plain div — layout animations are noop in test env.

function TwoTabSetup({ initialValue = "a", onValueChange = vi.fn() } = {}) {
  return (
    <Tabs value={initialValue} onValueChange={onValueChange}>
      <TabsList>
        <TabsTrigger value="a">Tab A</TabsTrigger>
        <TabsTrigger value="b">Tab B</TabsTrigger>
      </TabsList>
      <TabsContent value="a">Content A</TabsContent>
      <TabsContent value="b">Content B</TabsContent>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("renders TabsTrigger buttons", () => {
    render(<TwoTabSetup />);
    expect(screen.getByRole("tab", { name: "Tab A" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Tab B" })).toBeDefined();
  });

  it("active TabsTrigger has aria-selected true", () => {
    render(<TwoTabSetup initialValue="a" />);
    const tabA = screen.getByRole("tab", { name: "Tab A" });
    const tabB = screen.getByRole("tab", { name: "Tab B" });
    expect(tabA.getAttribute("aria-selected")).toBe("true");
    expect(tabB.getAttribute("aria-selected")).toBe("false");
  });

  it("clicking inactive TabsTrigger calls onValueChange", () => {
    const onValueChange = vi.fn();
    render(<TwoTabSetup initialValue="a" onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("tab", { name: "Tab B" }));
    expect(onValueChange).toHaveBeenCalledWith("b");
  });

  it("TabsContent renders only for active value", () => {
    render(<TwoTabSetup initialValue="a" />);
    expect(screen.getByText("Content A")).toBeDefined();
    expect(screen.queryByText("Content B")).toBeNull();
  });

  it("TabsList renders with tablist role", () => {
    render(<TwoTabSetup />);
    expect(screen.getByRole("tablist")).toBeDefined();
  });
});
