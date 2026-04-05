import * as THREE from "three";

/** Returns {x, y} tile repeat for a room of given feet dimensions, assuming `tileFt` per tile. */
export function tileRepeatFor(roomW: number, roomL: number, tileFt = 4): { x: number; y: number } {
  return { x: roomW / tileFt, y: roomL / tileFt };
}

/** Paints a 512x512 warm-oak wood-plank pattern to an offscreen canvas and returns a THREE.CanvasTexture. */
export function createFloorTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Base warm oak fill
  ctx.fillStyle = "#c9a87a";
  ctx.fillRect(0, 0, size, size);

  // 4 planks per tile, horizontal seams
  const plankH = size / 4;
  const plankColors = ["#b8966a", "#c9a87a", "#a88456", "#d4b486"];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = plankColors[i % plankColors.length];
    ctx.fillRect(0, i * plankH, size, plankH);

    // Grain streaks
    ctx.strokeStyle = "rgba(90, 60, 30, 0.15)";
    ctx.lineWidth = 1;
    for (let g = 0; g < 6; g++) {
      const y = i * plankH + Math.random() * plankH;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y + (Math.random() - 0.5) * 4);
      ctx.stroke();
    }

    // Plank seam (dark line between planks)
    ctx.strokeStyle = "rgba(40, 25, 10, 0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, i * plankH);
    ctx.lineTo(size, i * plankH);
    ctx.stroke();
  }

  // Vertical plank-end seams (stagger by row)
  ctx.strokeStyle = "rgba(40, 25, 10, 0.5)";
  ctx.lineWidth = 2;
  const endSeams = [[size * 0.3], [size * 0.6], [size * 0.45], [size * 0.75]];
  for (let i = 0; i < 4; i++) {
    for (const x of endSeams[i]) {
      ctx.beginPath();
      ctx.moveTo(x, i * plankH);
      ctx.lineTo(x, (i + 1) * plankH);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let cached: THREE.CanvasTexture | null = null;

/** Returns the memoized floor texture with repeat set to match room dimensions. */
export function getFloorTexture(roomW: number, roomL: number): THREE.CanvasTexture {
  if (!cached) cached = createFloorTexture();
  const { x, y } = tileRepeatFor(roomW, roomL);
  cached.repeat.set(x, y);
  cached.needsUpdate = true;
  return cached;
}

/** For tests only — clears the module memoization. */
export function __resetFloorTextureCache() {
  cached = null;
}
