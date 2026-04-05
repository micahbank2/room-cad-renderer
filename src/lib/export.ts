import { formatExportFilename } from "./exportFilename";

/**
 * Export the current 3D viewport as a PNG image.
 * Finds the Three.js canvas inside the `.bg-obsidian-deepest` wrapper and uses toDataURL.
 * 3D-only per SAVE-03 / D-14 — no 2D fallback.
 */
export function exportRenderedImage(filename?: string) {
  const threeCanvas = document.querySelector(
    ".bg-obsidian-deepest canvas"
  ) as HTMLCanvasElement | null;

  if (!threeCanvas) {
    alert("Switch to 3D view to export render.");
    return;
  }

  downloadCanvas(threeCanvas, filename ?? formatExportFilename());
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export the 2D CAD view as PNG.
 */
export function export2DImage(filename = "room-floorplan.png") {
  const fabricCanvas = document.querySelector(
    ".lower-canvas"
  ) as HTMLCanvasElement | null;
  if (!fabricCanvas) {
    alert("No 2D canvas found.");
    return;
  }
  downloadCanvas(fabricCanvas, filename);
}
