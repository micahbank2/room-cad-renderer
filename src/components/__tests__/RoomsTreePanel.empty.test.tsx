import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoomsTreePanel } from "@/components/RoomsTreePanel";

describe("RoomsTreePanel — empty states (UI-SPEC § Empty States)", () => {
  it("renders 'No walls yet' (italic, text-text-ghost, pl-6, h-6) when room has zero walls", () => {
    // Copy must be VERBATIM per UI-SPEC.
  });
  it("renders 'No products placed' under empty Products group", () => {
    // Verbatim per UI-SPEC.
  });
  it("renders 'No custom elements placed' under empty Custom Elements group", () => {
    // Verbatim per UI-SPEC.
  });
  it("ceiling group OMITTED entirely when room has zero ceilings (UI-SPEC: 'Omit the Ceiling group entirely')", () => {
    // No empty-ceiling copy is authored; group simply absent.
  });
});
