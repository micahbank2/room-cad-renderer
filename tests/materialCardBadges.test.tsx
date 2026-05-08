/**
 * Phase 78 Plan 04 — TDD RED: MapBadge presence indicators on MaterialCard.
 *
 * Tests:
 *  1. Full PBR Material (all 5 mapIds set) → 5 badges: COLOR, ROUGH, REFL, AO, DISP
 *  2. Textured Material with only colorMapId → 1 badge (COLOR)
 *  3. Paint Material (colorHex set, no colorMapId) → 0 badges
 *  4. Paint Material with colorHex AND aoMapId → 1 badge (AO only, no COLOR)
 *  5. Badge style: font-mono, bg-accent/20, text-muted-foreground, uppercase, rounded-smooth
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import type { Material } from "@/types/material";

// Mock getUserTexture so async blob fetch doesn't interfere with badge assertions.
const getUserTextureMock = vi.fn<(id: string) => Promise<unknown>>();
vi.mock("@/lib/userTextureStore", async () => {
  const actual = await vi.importActual<typeof import("@/lib/userTextureStore")>(
    "@/lib/userTextureStore",
  );
  return {
    ...actual,
    getUserTexture: (id: string) => getUserTextureMock(id),
  };
});

import { MaterialCard } from "@/components/MaterialCard";

beforeEach(() => {
  getUserTextureMock.mockReset();
  // Stub URL methods for happy-dom.
  if (!URL.createObjectURL) {
    URL.createObjectURL = vi.fn(() => "blob:fake-url");
  }
  if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = vi.fn();
  }
  // Default: texture resolves (non-orphan), but badges are synchronous so it doesn't matter.
  getUserTextureMock.mockResolvedValue(undefined);
});

function makeMaterial(overrides: Partial<Material> = {}): Material {
  return {
    id: "mat_badge_test",
    name: "Badge Test",
    tileSizeFt: 2,
    colorMapId: undefined,
    colorSha256: undefined,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("MaterialCard — MapBadge presence indicators", () => {
  it("Test 1: all 5 mapIds set → 5 badges rendered in order COLOR, ROUGH, REFL, AO, DISP", () => {
    const mat = makeMaterial({
      colorMapId: "utex_color",
      roughnessMapId: "utex_rough",
      reflectionMapId: "utex_refl",
      aoMapId: "utex_ao",
      displacementMapId: "utex_disp",
    });
    render(<MaterialCard material={mat} />);

    const container = screen.getByTestId("material-card-badges");
    const badges = container.querySelectorAll("[data-testid^='map-badge-']");
    expect(badges).toHaveLength(5);

    const labels = Array.from(badges).map((b) => b.textContent?.trim());
    expect(labels).toEqual(["COLOR", "ROUGH", "REFL", "AO", "DISP"]);
  });

  it("Test 2: textured Material with only colorMapId → 1 badge (COLOR)", () => {
    const mat = makeMaterial({ colorMapId: "utex_color" });
    render(<MaterialCard material={mat} />);

    const container = screen.getByTestId("material-card-badges");
    const badges = container.querySelectorAll("[data-testid^='map-badge-']");
    expect(badges).toHaveLength(1);
    expect(badges[0].textContent?.trim()).toBe("COLOR");
  });

  it("Test 3: paint Material (colorHex, no colorMapId) → 0 badges", () => {
    const mat = makeMaterial({ colorHex: "#f5f0e8" });
    render(<MaterialCard material={mat} />);

    const container = screen.getByTestId("material-card-badges");
    const badges = container.querySelectorAll("[data-testid^='map-badge-']");
    expect(badges).toHaveLength(0);
  });

  it("Test 4: paint Material with colorHex AND aoMapId → only AO badge, no COLOR badge", () => {
    const mat = makeMaterial({ colorHex: "#e0d8d0", aoMapId: "utex_ao" });
    render(<MaterialCard material={mat} />);

    const container = screen.getByTestId("material-card-badges");
    const badges = container.querySelectorAll("[data-testid^='map-badge-']");
    expect(badges).toHaveLength(1);
    expect(badges[0].getAttribute("data-testid")).toBe("map-badge-ao");
    expect(badges[0].textContent?.trim()).toBe("AO");

    // No COLOR badge
    expect(
      container.querySelector("[data-testid='map-badge-color']"),
    ).toBeNull();
  });

  it("Test 5: badge uses font-mono, bg-accent/20, text-muted-foreground, uppercase, rounded-smooth classes", () => {
    const mat = makeMaterial({ colorMapId: "utex_color" });
    render(<MaterialCard material={mat} />);

    const badge = screen.getByTestId("map-badge-color");
    const cls = badge.className;
    expect(cls).toContain("font-mono");
    expect(cls).toContain("bg-accent/20");
    expect(cls).toContain("text-muted-foreground");
    expect(cls).toContain("uppercase");
    expect(cls).toContain("rounded-smooth");
  });
});
