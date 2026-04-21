/**
 * Phase 31 Wave 0 — Red stubs for the EXTENDED resize-handle pure module
 * (corner + edge handles, rotation-aware, with corner-priority hit-test).
 *
 * These tests lock the EDIT-22 contract in executable form BEFORE Wave 1
 * extends `src/canvas/resizeHandles.ts`. They MUST all fail on this commit:
 * the new exports (`getEdgeHandles`, `hitTestEdgeHandle`,
 * `hitTestAnyResizeHandle`, `edgeDragToAxisValue`, `EDGE_HANDLE_HIT_RADIUS_FT`)
 * do not exist yet — vitest will produce "is not a function" / module-resolution
 * errors. Plan 31-02 turns them green.
 *
 * Decisions covered (see .planning/phases/31-drag-resize-label-override/31-CONTEXT.md):
 *   - D-01: Per-axis edge handles (N/S/E/W midpoints) write override fields
 *   - D-03: Corner→sizeScale, Edge→one-axis override
 *   - Pitfall 1 (31-RESEARCH.md): Corners win ties over edges (small products)
 *   - Pitfall 2 (31-RESEARCH.md): Edge drag uses object-LOCAL axes (rotation-invariant intent)
 *
 * Driver-bridge contract advertised here for Plan 31-02 / Plan 31-03:
 *   window.__driveResize = { start, to, end } — see tests/phase31Resize.test.tsx
 *
 * All coordinates in feet. Canvas convention: +y is south (down on screen).
 */
import { describe, it, expect } from "vitest";
import {
  getEdgeHandles,
  hitTestEdgeHandle,
  hitTestAnyResizeHandle,
  edgeDragToAxisValue,
  EDGE_HANDLE_HIT_RADIUS_FT,
} from "@/canvas/resizeHandles";
import type { PlacedProduct } from "@/types/cad";

// --- Fixtures -------------------------------------------------------------

function pp(opts: Partial<PlacedProduct> & { x?: number; y?: number; rotation?: number } = {}): PlacedProduct {
  return {
    id: opts.id ?? "pp-1",
    productId: opts.productId ?? "prod-1",
    position: opts.position ?? { x: opts.x ?? 0, y: opts.y ?? 0 },
    rotation: opts.rotation ?? 0,
    sizeScale: opts.sizeScale ?? 1,
  };
}

// --- EDGE_HANDLE_HIT_RADIUS_FT --------------------------------------------

describe("EDGE_HANDLE_HIT_RADIUS_FT", () => {
  it("exports the locked edge hit radius (matches corner radius for visual parity)", () => {
    expect(EDGE_HANDLE_HIT_RADIUS_FT).toBe(0.5);
  });
});

// --- getEdgeHandles -------------------------------------------------------

describe("getEdgeHandles", () => {
  it("rotation=0, width=4, depth=2, position=(10,10) returns N/S/E/W midpoints (canvas y-down)", () => {
    const handles = getEdgeHandles(pp({ x: 10, y: 10, rotation: 0 }), 4, 2);
    expect(handles.n.x).toBeCloseTo(10);
    expect(handles.n.y).toBeCloseTo(9); // -hd
    expect(handles.s.x).toBeCloseTo(10);
    expect(handles.s.y).toBeCloseTo(11); // +hd
    expect(handles.e.x).toBeCloseTo(12); // +hw
    expect(handles.e.y).toBeCloseTo(10);
    expect(handles.w.x).toBeCloseTo(8); // -hw
    expect(handles.w.y).toBeCloseTo(10);
  });

  it("rotation=90 rotates the local-axis handles (n moves to local-w world position)", () => {
    // rotation matrix for +90 (CCW in math, but canvas y-down means screen rotates CW).
    // Local n = (0, -hd) -> world: x = 0*cos90 - (-hd)*sin90 = hd, y = 0*sin90 + (-hd)*cos90 = 0.
    // With position (10,10), n_world ≈ (10 + 1, 10 + 0) = (11, 10).
    const handles = getEdgeHandles(pp({ x: 10, y: 10, rotation: 90 }), 4, 2);
    expect(handles.n.x).toBeCloseTo(11);
    expect(handles.n.y).toBeCloseTo(10);
    // Local e = (hw, 0) -> world: x = hw*cos90 - 0 = 0, y = hw*sin90 + 0 = hw = 2.
    expect(handles.e.x).toBeCloseTo(10);
    expect(handles.e.y).toBeCloseTo(12);
  });

  it("rotation=45, width=2, depth=2, position=(0,0): e world ≈ (cos45, sin45)", () => {
    const handles = getEdgeHandles(pp({ x: 0, y: 0, rotation: 45 }), 2, 2);
    const expected = Math.SQRT1_2; // cos45 = sin45 = 1/√2
    expect(handles.e.x).toBeCloseTo(expected, 5);
    expect(handles.e.y).toBeCloseTo(expected, 5);
  });
});

// --- hitTestEdgeHandle ----------------------------------------------------

describe("hitTestEdgeHandle", () => {
  it("pointer exactly on north handle returns 'n'", () => {
    const product = pp({ x: 0, y: 0, rotation: 0 });
    expect(hitTestEdgeHandle({ x: 0, y: -1 }, product, 4, 2)).toBe("n");
  });

  it("pointer 0.4ft from east handle (within EDGE_HANDLE_HIT_RADIUS_FT=0.5) returns 'e'", () => {
    const product = pp({ x: 0, y: 0, rotation: 0 });
    expect(hitTestEdgeHandle({ x: 2 + 0.3, y: 0.2 }, product, 4, 2)).toBe("e");
  });

  it("pointer 0.6ft from all handles returns null", () => {
    const product = pp({ x: 0, y: 0, rotation: 0 });
    // Place pointer in a corner-area gap, far from all 4 edge midpoints.
    expect(hitTestEdgeHandle({ x: 5, y: 5 }, product, 4, 2)).toBeNull();
  });
});

// --- hitTestAnyResizeHandle (Pitfall 1) -----------------------------------

describe("hitTestAnyResizeHandle (Pitfall 1 — corners win ties)", () => {
  it("Pitfall 1: corner wins tie over edge for small product where NE corner and N edge overlap pointer", () => {
    // Tiny product: width=0.5, depth=0.5 → ne corner at (0.25,-0.25), n edge at (0,-0.25).
    // Pointer at (0.2, -0.25) is within 0.5 of BOTH. Corner must win.
    const product = pp({ x: 0, y: 0, rotation: 0 });
    const result = hitTestAnyResizeHandle({ x: 0.2, y: -0.25 }, product, 0.5, 0.5);
    expect(result).toEqual({ kind: "corner", which: "ne" });
  });

  it("pointer near an edge midpoint only (not corner) returns edge match", () => {
    const product = pp({ x: 0, y: 0, rotation: 0 });
    // width=4, depth=2. n midpoint at (0,-1). Pointer (0,-1) — corners at (±2,-1) are 2ft away.
    const result = hitTestAnyResizeHandle({ x: 0, y: -1 }, product, 4, 2);
    expect(result).toEqual({ kind: "edge", which: "n" });
  });

  it("pointer far from all 8 handles returns null", () => {
    const product = pp({ x: 0, y: 0, rotation: 0 });
    expect(hitTestAnyResizeHandle({ x: 50, y: 50 }, product, 4, 2)).toBeNull();
  });
});

// --- edgeDragToAxisValue --------------------------------------------------

describe("edgeDragToAxisValue", () => {
  it("rotation=0, edge='e', pointer=(3,0) returns { axis:'width', valueFt:6 } (2×|lx|)", () => {
    const product = pp({ x: 0, y: 0, rotation: 0 });
    const result = edgeDragToAxisValue("e", { x: 3, y: 0 }, product);
    expect(result.axis).toBe("width");
    expect(result.valueFt).toBeCloseTo(6);
  });

  it("rotation=0, edge='n', pointer=(0,-2) returns { axis:'depth', valueFt:4 }", () => {
    const product = pp({ x: 0, y: 0, rotation: 0 });
    const result = edgeDragToAxisValue("n", { x: 0, y: -2 }, product);
    expect(result.axis).toBe("depth");
    expect(result.valueFt).toBeCloseTo(4);
  });

  it("Pitfall 2: rotation=90, edge='e', pointer in WORLD space rotates back to object-local lx", () => {
    // With rotation=90, the local e-axis points along world +y. Pointer at world (0,3) is local lx=3.
    const product = pp({ x: 0, y: 0, rotation: 90 });
    const result = edgeDragToAxisValue("e", { x: 0, y: 3 }, product);
    expect(result.axis).toBe("width");
    expect(result.valueFt).toBeCloseTo(6);
  });

  it("clamps upper bound to 50ft", () => {
    const product = pp({ x: 0, y: 0, rotation: 0 });
    const result = edgeDragToAxisValue("e", { x: 100, y: 0 }, product);
    expect(result.valueFt).toBeCloseTo(50);
  });

  it("clamps lower bound to 0.25ft", () => {
    const product = pp({ x: 0, y: 0, rotation: 0 });
    const result = edgeDragToAxisValue("e", { x: 0.05, y: 0 }, product);
    expect(result.valueFt).toBeCloseTo(0.25);
  });
});
