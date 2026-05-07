import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Button } from "@/components/ui/Button";

describe("Button primitive", () => {
  it("Test 1: renders a button element by default", () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole("button", { name: "Click me" });
    expect(btn.tagName.toLowerCase()).toBe("button");
  });

  it("Test 2: defaults type to 'button' (prevents accidental form submission)", () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("type", "button");
  });

  it("Test 3: renders all 6 variants with distinct class sets", () => {
    const variants = [
      "default",
      "destructive",
      "outline",
      "secondary",
      "ghost",
      "link",
    ] as const;

    const classMap: Record<string, string> = {
      default: "bg-primary",
      destructive: "bg-destructive",
      outline: "border",
      secondary: "bg-secondary",
      ghost: "hover:bg-accent",
      link: "underline-offset-4",
    };

    for (const variant of variants) {
      const { unmount } = render(
        <Button variant={variant} data-testid={`btn-${variant}`}>
          {variant}
        </Button>
      );
      const btn = screen.getByTestId(`btn-${variant}`);
      expect(btn.className).toContain(classMap[variant]);
      unmount();
    }
  });

  it("Test 4: renders all 6 sizes with correct height/width classes", () => {
    const sizeMap: Record<string, string> = {
      default: "h-9",
      sm: "h-7",
      lg: "h-10",
      icon: "w-9",
      "icon-sm": "w-7",
      "icon-lg": "w-10",
    };

    for (const [size, expectedClass] of Object.entries(sizeMap)) {
      const { unmount } = render(
        <Button size={size as any} data-testid={`btn-${size}`}>
          {size}
        </Button>
      );
      const btn = screen.getByTestId(`btn-${size}`);
      expect(btn.className).toContain(expectedClass);
      unmount();
    }
  });

  it("Test 5: active prop adds data-active attribute and active styling", () => {
    render(<Button active>Active button</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("data-active");
    expect(btn.className).toContain("bg-accent/10");
    expect(btn.className).toContain("text-foreground");
  });

  it("Test 6: asChild renders child element instead of button", () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );
    const link = screen.getByRole("link", { name: "Link Button" });
    expect(link.tagName.toLowerCase()).toBe("a");
    expect(link).toHaveAttribute("href", "/test");
  });

  it("Test 7: className prop merges with variant classes (via cn())", () => {
    render(<Button className="my-custom-class">Custom</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("my-custom-class");
    expect(btn.className).toContain("bg-primary");
  });

  it("Test 8: forwards ref to the button element", () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref button</Button>);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName.toLowerCase()).toBe("button");
  });

  it("Test 9: disabled prop applies disabled styling", () => {
    render(<Button disabled>Disabled</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn.className).toContain("disabled:opacity-50");
  });
});
