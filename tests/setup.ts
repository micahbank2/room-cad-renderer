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
    };
    return ctx as unknown as CanvasRenderingContext2D;
  }
  // @ts-expect-error - passthrough
  return origGetContext ? origGetContext.call(this, type, ...rest) : null;
} as typeof HTMLCanvasElement.prototype.getContext;
