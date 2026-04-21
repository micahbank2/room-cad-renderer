import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PbrErrorBoundary } from "@/three/PbrErrorBoundary";

// Swallow the console.error React logs when a boundary catches.
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

function Thrower(): JSX.Element {
  throw new Error("simulated broken texture URL");
}

function OK(): JSX.Element {
  return <div data-testid="child-ok">OK</div>;
}

describe("PbrErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <PbrErrorBoundary fallback={<div data-testid="fallback">FALLBACK</div>}>
        <OK />
      </PbrErrorBoundary>
    );
    expect(screen.getByTestId("child-ok")).toBeInTheDocument();
    expect(screen.queryByTestId("fallback")).not.toBeInTheDocument();
  });

  it("renders fallback when child throws", () => {
    render(
      <PbrErrorBoundary fallback={<div data-testid="fallback">FALLBACK</div>}>
        <Thrower />
      </PbrErrorBoundary>
    );
    expect(screen.getByTestId("fallback")).toBeInTheDocument();
    expect(screen.queryByTestId("child-ok")).not.toBeInTheDocument();
  });

  it("fallback can be an arbitrary JSX tree", () => {
    render(
      <PbrErrorBoundary
        fallback={
          <>
            <div data-testid="f1">one</div>
            <div data-testid="f2">two</div>
          </>
        }
      >
        <Thrower />
      </PbrErrorBoundary>
    );
    expect(screen.getByTestId("f1")).toBeInTheDocument();
    expect(screen.getByTestId("f2")).toBeInTheDocument();
  });
});
