import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LibraryCard } from "@/components/library/LibraryCard";

/**
 * Phase 58 — GLTF-INTEGRATION-01: LibraryCard badge slot (U5).
 *
 * Asserts:
 *  U5a: When badge prop is provided → DOM contains the badge node + a wrapper
 *       carrying data-testid="library-card-badge".
 *  U5b: When badge prop omitted → no badge wrapper exists in the DOM.
 *  U5c: badge slot does NOT collide with onRemove X button (top-right) — both
 *       coexist on the same card.
 */

describe("LibraryCard badge slot (Phase 58)", () => {
  it("U5a: renders badge node + wrapper when prop provided (grid variant)", () => {
    render(
      <LibraryCard
        label="Test"
        badge={<span data-testid="test-badge">B</span>}
      />,
    );
    expect(screen.getByTestId("test-badge")).toBeInTheDocument();
    expect(screen.getByTestId("library-card-badge")).toBeInTheDocument();
  });

  it("U5a: renders badge node + wrapper when prop provided (list variant)", () => {
    render(
      <LibraryCard
        label="Test"
        variant="list"
        badge={<span data-testid="test-badge">B</span>}
      />,
    );
    expect(screen.getByTestId("test-badge")).toBeInTheDocument();
    expect(screen.getByTestId("library-card-badge")).toBeInTheDocument();
  });

  it("U5b: renders no badge wrapper when prop omitted", () => {
    const { container } = render(<LibraryCard label="Test" />);
    expect(
      container.querySelector('[data-testid="library-card-badge"]'),
    ).toBeNull();
  });

  it("U5c: badge coexists with onRemove X button (no collision)", () => {
    render(
      <LibraryCard
        label="Test"
        onRemove={() => {}}
        badge={<span data-testid="test-badge">B</span>}
      />,
    );
    expect(screen.getByTestId("test-badge")).toBeInTheDocument();
    expect(screen.getByLabelText("Remove")).toBeInTheDocument();
  });
});
