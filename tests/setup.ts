import "@testing-library/jest-dom";

// jsdom does not implement HTMLCanvasElement 2D context — stub a minimal one so
// modules that draw to a canvas (e.g., procedural texture generators) can run in tests.
if (typeof HTMLCanvasElement !== "undefined" && !HTMLCanvasElement.prototype.getContext) {
  // no-op; leave native
}
const origGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: unknown[]) {
  if (type === "2d") {
    const ctx: Record<string, unknown> = {
      canvas: this,
      fillStyle: "#000",
      strokeStyle: "#000",
      lineWidth: 1,
      fillRect: () => {},
      strokeRect: () => {},
      clearRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fill: () => {},
      closePath: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      drawImage: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
      putImageData: () => {},
      createImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
      measureText: () => ({ width: 0 }),
      fillText: () => {},
      strokeText: () => {},
      arc: () => {},
      rect: () => {},
      setTransform: () => {},
      transform: () => {},
      getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
      setLineDash: () => {},
      getLineDash: () => [],
      // Phase 30 — additional path-building methods Fabric calls when
      // rendering Rect/Circle with rounded corners. happy-dom ships without
      // these; missing methods throw "not a function" during fc.renderAll().
      bezierCurveTo: () => {},
      quadraticCurveTo: () => {},
      arcTo: () => {},
      ellipse: () => {},
      clip: () => {},
      isPointInPath: () => false,
      isPointInStroke: () => false,
    };
    return ctx as unknown as CanvasRenderingContext2D;
  }
  // @ts-expect-error - passthrough
  return origGetContext ? origGetContext.call(this, type, ...rest) : null;
} as typeof HTMLCanvasElement.prototype.getContext;

// Phase 31 Plan 03 Rule 3 deviation — happy-dom returns 0-sized layout rects
// for every element, which makes FabricCanvas.redraw() short-circuit before it
// ever activates the current tool (the activate path is where the test-mode
// driver bridges install). Stub a 800x600 viewport on every HTMLElement so
// canvas-mounted integration tests (Phase 30 snapIntegration, Phase 31
// driver-based suites) all see a non-zero rect without each file repeating
// the stub. Snap integration suite already overrides this to 800x600 so the
// values agree.
if (typeof HTMLElement !== "undefined") {
  const _origGBCR = HTMLElement.prototype.getBoundingClientRect;
  HTMLElement.prototype.getBoundingClientRect = function (): DOMRect {
    // Honor any per-test override that returned non-zero from the original
    // implementation; only stub when happy-dom's default 0-size would make
    // the canvas init bail.
    const native = _origGBCR ? _origGBCR.call(this) : null;
    if (native && (native.width > 0 || native.height > 0)) return native;
    return {
      x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 600,
      width: 800, height: 600,
      toJSON: () => ({}),
    } as DOMRect;
  };
}
