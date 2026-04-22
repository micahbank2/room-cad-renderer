import { describe, it, expect, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { ProductLibrary } from "@/components/ProductLibrary";

describe("Library migration — render count regression (GH #89 blocker fix)", () => {
  beforeEach(() => {
    cleanup();
  });

  it("ProductLibrary renders exactly one LibraryCard per filtered product", () => {
    // Seed N known products via the productLibrary prop path OR via store seed
    // (actual seeding mechanism depends on ProductLibrary API — implementer chooses).
    // Pattern (resolved by Plan 05 Task 2/3):
    //   1. Seed exactly 3 products in "chairs" category + 2 in "tables"
    //   2. Mount <ProductLibrary /> (or App with library visible) with activeCategory="all"
    //   3. Assert document.querySelectorAll('[data-testid="library-card"]').length === 5
    //   4. Switch to activeCategory="chairs", assert length === 3
    const EXPECTED_ALL = 5;
    // @ts-expect-error — props shape resolved in Plan 05
    const { container } = render(<ProductLibrary /* props or wrapper */ />);
    const cards = container.querySelectorAll('[data-testid="library-card"]');
    expect(cards.length).toBe(EXPECTED_ALL);
  });

  it("CustomElementsPanel renders exactly one LibraryCard per custom element", () => {
    // Analogous assertion for CustomElementsPanel
    // expect(container.querySelectorAll('[data-testid="library-card"]').length).toBe(KNOWN_COUNT);
    // Implementation note: if CustomElementsPanel requires store seed, use useCADStore.setState
    // to inject known elements, then mount component, then assert count.
    expect(true).toBe(false); // Replace with actual assertion in Plan 05 Task 3 (RED stub)
  });
});
