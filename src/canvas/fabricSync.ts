import * as fabric from "fabric";
import type {
  WallSegment,
  PlacedProduct,
  Ceiling,
  CustomElement,
  PlacedCustomElement,
} from "@/types/cad";
import type { Product } from "@/types/product";
import { effectiveDimensions, hasDimensions } from "@/types/product";
import { wallCorners, angle as wallAngle } from "@/lib/geometry";
import { getWallHandleWorldPos } from "./wallRotationHandle";
import { drawWallDimension } from "./dimensions";
import { getCachedImage } from "./productImageCache";
import { getHandleWorldPos } from "./rotationHandle";
import { getResizeHandles } from "./resizeHandles";
import { getWallEndpointHandles, getWallThicknessHandle } from "./wallEditHandles";
import { getOpeningHandles } from "./openingEditHandles";
import { resolvePaintHex } from "@/lib/colorUtils";
import { usePaintStore } from "@/stores/paintStore";

// ---------------------------------------------------------------------------
// Lime wash pattern — cached to prevent flicker on every redraw (Pitfall 5).
// Fixed dot positions (no Math.random()) guarantee stable output.
// ---------------------------------------------------------------------------
let _cachedLimeWashPattern: fabric.Pattern | null = null;
function getLimeWashPattern(): fabric.Pattern {
  if (_cachedLimeWashPattern) return _cachedLimeWashPattern;
  const size = 32;
  const patternCanvas = document.createElement("canvas");
  patternCanvas.width = size;
  patternCanvas.height = size;
  const ctx = patternCanvas.getContext("2d")!;
  const dots = [
    [4, 7], [12, 3], [20, 15], [28, 8], [8, 22], [16, 28], [24, 20], [30, 27],
  ] as const;
  for (const [x, y] of dots) {
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  _cachedLimeWashPattern = new fabric.Pattern({ source: patternCanvas, repeat: "repeat" });
  return _cachedLimeWashPattern;
}

/** Render placed custom elements as filled rectangles on the 2D canvas. */
export function renderCustomElements(
  fc: fabric.Canvas,
  placed: Record<string, PlacedCustomElement>,
  catalog: Record<string, CustomElement>,
  scale: number,
  origin: { x: number; y: number },
  selectedIds: string[],
) {
  for (const p of Object.values(placed)) {
    const el = catalog[p.customElementId];
    if (!el) continue;
    const sc = p.sizeScale ?? 1;
    const pw = el.width * sc * scale;
    const pd = el.depth * sc * scale;
    const cx = origin.x + p.position.x * scale;
    const cy = origin.y + p.position.y * scale;
    const isSelected = selectedIds.includes(p.id);

    const rect = new fabric.Rect({
      left: cx,
      top: cy,
      width: pw,
      height: pd,
      fill: el.color + "66", // ~40% opacity
      stroke: isSelected ? "#7c5bf0" : el.color,
      strokeWidth: isSelected ? 2 : 1,
      strokeDashArray: el.shape === "plane" ? [4, 3] : undefined,
      originX: "center",
      originY: "center",
      angle: p.rotation,
      selectable: false,
      evented: false,
      data: { type: "custom-element", placedId: p.id },
    });
    fc.add(rect);

    // Name label
    const label = new fabric.FabricText(el.name.toUpperCase(), {
      left: cx,
      top: cy,
      fontSize: 9,
      fontFamily: "IBM Plex Mono",
      fill: "#e3e0f1",
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
    });
    fc.add(label);

    // Rotation handle for selected custom element (POLISH-01)
    if (isSelected && selectedIds.length === 1) {
      const sc = p.sizeScale ?? 1;
      const d = el.depth * sc;
      // Reuse the product rotation handle helper — PlacedCustomElement has
      // same position/rotation shape as PlacedProduct.
      const handlePos = getHandleWorldPos(p as unknown as import("@/types/cad").PlacedProduct, d);
      const hx = origin.x + handlePos.x * scale;
      const hy = origin.y + handlePos.y * scale;
      const line = new fabric.Line([cx, cy, hx, hy], {
        stroke: "#7c5bf0",
        strokeWidth: 1,
        selectable: false,
        evented: false,
        data: { type: "rotation-handle-line", placedId: p.id },
      });
      const circle = new fabric.Circle({
        left: hx,
        top: hy,
        radius: 5,
        fill: "#12121d",
        stroke: "#7c5bf0",
        strokeWidth: 2,
        originX: "center",
        originY: "center",
        selectable: false,
        evented: false,
        data: { type: "rotation-handle", placedId: p.id },
      });
      fc.add(line);
      fc.add(circle);

      // Corner resize handles (POLISH-01)
      const w = el.width * sc;
      const handles = getResizeHandles(p as unknown as import("@/types/cad").PlacedProduct, w, d);
      for (const key of ["ne", "nw", "sw", "se"] as const) {
        const h = handles[key];
        fc.add(
          new fabric.Rect({
            left: origin.x + h.x * scale,
            top: origin.y + h.y * scale,
            width: 10,
            height: 10,
            fill: "#12121d",
            stroke: "#7c5bf0",
            strokeWidth: 2,
            originX: "center",
            originY: "center",
            selectable: false,
            evented: false,
            data: { type: "resize-handle", corner: key, placedId: p.id },
          })
        );
      }
    }
  }
}

/** Render ceiling polygons as translucent overlays on the 2D canvas. */
export function renderCeilings(
  fc: fabric.Canvas,
  ceilings: Record<string, Ceiling>,
  scale: number,
  origin: { x: number; y: number },
  selectedIds: string[],
) {
  const customColors = usePaintStore.getState().customColors;
  for (const c of Object.values(ceilings)) {
    const pts = c.points.map((p) => ({
      x: origin.x + p.x * scale,
      y: origin.y + p.y * scale,
    }));
    const isSelected = selectedIds.includes(c.id);

    // Resolve fill: paintId takes precedence over material string
    let baseFill: string;
    if (c.paintId) {
      const hex = resolvePaintHex(c.paintId, customColors);
      baseFill = hex + "30"; // translucent overlay like the existing material path
    } else {
      baseFill = c.material.startsWith("#") ? c.material + "30" : "rgba(124,91,240,0.08)";
    }

    fc.add(
      new fabric.Polygon(pts, {
        fill: baseFill,
        stroke: isSelected ? "#7c5bf0" : "#938ea0",
        strokeWidth: isSelected ? 2 : 1,
        strokeDashArray: [4, 4],
        selectable: false,
        evented: false,
        data: { type: "ceiling", ceilingId: c.id },
      }),
    );

    // Lime wash stipple overlay
    if (c.limeWash && pts.length >= 3) {
      fc.add(
        new fabric.Polygon([...pts], {
          fill: getLimeWashPattern(),
          opacity: 0.2,
          stroke: undefined,
          strokeWidth: 0,
          selectable: false,
          evented: false,
          data: { type: "ceiling-limewash", ceilingId: c.id },
        }),
      );
    }
  }
}

const WALL_FILL = "#343440";
const WALL_STROKE = "#484554";
const WALL_SELECTED_STROKE = "#7c5bf0";
const PRODUCT_STROKE = "#7c5bf0";
const PLACEHOLDER_DASH = [6, 4];
const REAL_DASH = [4, 3];

/**
 * Render wall segments on the Fabric canvas.
 * Each wall is a polygon (4-corner thick rectangle).
 */
export function renderWalls(
  fc: fabric.Canvas,
  walls: Record<string, WallSegment>,
  scale: number,
  origin: { x: number; y: number },
  selectedIds: string[]
) {
  // Pre-compute shared endpoints so we can draw corner caps that hide the
  // visible seams where wall rectangles overlap.
  const endpointUsage = new Map<string, { point: { x: number; y: number }; halfT: number; count: number }>();
  const keyFor = (p: { x: number; y: number }) =>
    `${Math.round(p.x * 1000)},${Math.round(p.y * 1000)}`;
  for (const wall of Object.values(walls)) {
    for (const endpoint of [wall.start, wall.end]) {
      const k = keyFor(endpoint);
      const existing = endpointUsage.get(k);
      const halfT = wall.thickness / 2;
      if (existing) {
        existing.count += 1;
        existing.halfT = Math.max(existing.halfT, halfT);
      } else {
        endpointUsage.set(k, { point: endpoint, halfT, count: 1 });
      }
    }
  }

  const customColors = usePaintStore.getState().customColors;

  for (const wall of Object.values(walls)) {
    const corners = wallCorners(wall);
    const isSelected = selectedIds.includes(wall.id);

    const points = corners.map((c) => ({
      x: origin.x + c.x * scale,
      y: origin.y + c.y * scale,
    }));

    // Resolve wall fill: kind="paint" on Side A takes precedence
    let wallFill = WALL_FILL;
    const wpA = wall.wallpaper?.A;
    if (wpA?.kind === "paint" && wpA.paintId) {
      wallFill = resolvePaintHex(wpA.paintId, customColors);
    }

    const polygon = new fabric.Polygon(points, {
      fill: wallFill,
      stroke: isSelected ? WALL_SELECTED_STROKE : WALL_STROKE,
      strokeWidth: isSelected ? 2 : 1,
      selectable: false, // selection handled by tool
      evented: false,
      data: { type: "wall", wallId: wall.id },
    });

    fc.add(polygon);

    // Lime wash stipple overlay for painted walls
    if (wpA?.kind === "paint" && wpA.limeWash) {
      fc.add(
        new fabric.Polygon([...points], {
          fill: getLimeWashPattern(),
          opacity: 0.2,
          stroke: undefined,
          strokeWidth: 0,
          selectable: false,
          evented: false,
          data: { type: "wall-limewash", wallId: wall.id },
        }),
      );
    }

    // Render openings as white rectangles cut into the wall
    for (const opening of wall.openings) {
      const wallLen = Math.sqrt(
        (wall.end.x - wall.start.x) ** 2 + (wall.end.y - wall.start.y) ** 2
      );
      if (wallLen === 0) continue;

      const t = opening.offset / wallLen;
      const tEnd = (opening.offset + opening.width) / wallLen;
      const dx = wall.end.x - wall.start.x;
      const dy = wall.end.y - wall.start.y;

      const oStart = {
        x: wall.start.x + dx * t,
        y: wall.start.y + dy * t,
      };
      const oEnd = {
        x: wall.start.x + dx * tEnd,
        y: wall.start.y + dy * tEnd,
      };

      const a = wallAngle(wall.start, wall.end);
      const perpAngle = a + Math.PI / 2;
      const halfT = wall.thickness / 2;
      const pdx = Math.cos(perpAngle) * halfT;
      const pdy = Math.sin(perpAngle) * halfT;

      const openingPoints = [
        { x: origin.x + (oStart.x - pdx) * scale, y: origin.y + (oStart.y - pdy) * scale },
        { x: origin.x + (oStart.x + pdx) * scale, y: origin.y + (oStart.y + pdy) * scale },
        { x: origin.x + (oEnd.x + pdx) * scale, y: origin.y + (oEnd.y + pdy) * scale },
        { x: origin.x + (oEnd.x - pdx) * scale, y: origin.y + (oEnd.y - pdy) * scale },
      ];

      fc.add(
        new fabric.Polygon(openingPoints, {
          fill: opening.type === "door" ? "rgba(255,184,117,0.15)" : "rgba(124,91,240,0.15)",
          stroke: "#484554",
          strokeWidth: 0.5,
          selectable: false,
          evented: false,
          data: { type: "opening", openingId: opening.id, wallId: wall.id },
        })
      );
    }

    // Dimension label
    drawWallDimension(fc, wall, scale, origin);

    // Edit handles for selected walls (EDIT-12 rotate + EDIT-15/16 endpoint + thickness)
    if (isSelected) {
      // Rotation handle (EDIT-12)
      const h = getWallHandleWorldPos(wall);
      const hx = origin.x + h.x * scale;
      const hy = origin.y + h.y * scale;
      const cx = origin.x + ((wall.start.x + wall.end.x) / 2) * scale;
      const cy = origin.y + ((wall.start.y + wall.end.y) / 2) * scale;
      fc.add(
        new fabric.Line([cx, cy, hx, hy], {
          stroke: WALL_SELECTED_STROKE,
          strokeWidth: 1,
          selectable: false,
          evented: false,
        })
      );
      fc.add(
        new fabric.Circle({
          left: hx,
          top: hy,
          radius: 5,
          fill: WALL_SELECTED_STROKE,
          stroke: "#ffffff",
          strokeWidth: 1,
          originX: "center",
          originY: "center",
          selectable: false,
          evented: false,
          data: { type: "wall-rotate-handle", wallId: wall.id },
        })
      );

      // Endpoint handles (EDIT-15)
      const ep = getWallEndpointHandles(wall);
      for (const [which, point] of [["start", ep.start], ["end", ep.end]] as const) {
        fc.add(
          new fabric.Rect({
            left: origin.x + point.x * scale,
            top: origin.y + point.y * scale,
            width: 9,
            height: 9,
            fill: "#12121d",
            stroke: WALL_SELECTED_STROKE,
            strokeWidth: 2,
            originX: "center",
            originY: "center",
            selectable: false,
            evented: false,
            data: { type: "wall-endpoint-handle", wallId: wall.id, which },
          })
        );
      }

      // Thickness handle (EDIT-16)
      const th = getWallThicknessHandle(wall);
      fc.add(
        new fabric.Circle({
          left: origin.x + th.x * scale,
          top: origin.y + th.y * scale,
          radius: 4,
          fill: WALL_SELECTED_STROKE,
          stroke: "#ffffff",
          strokeWidth: 1,
          originX: "center",
          originY: "center",
          selectable: false,
          evented: false,
          data: { type: "wall-thickness-handle", wallId: wall.id },
        })
      );

      // Opening handles within this selected wall (EDIT-17/18)
      for (const op of wall.openings) {
        const oh = getOpeningHandles(wall, op);
        // Center handle (slide)
        fc.add(
          new fabric.Circle({
            left: origin.x + oh.center.x * scale,
            top: origin.y + oh.center.y * scale,
            radius: 4,
            fill: "#ffb875",
            stroke: "#ffffff",
            strokeWidth: 1,
            originX: "center",
            originY: "center",
            selectable: false,
            evented: false,
            data: { type: "opening-slide-handle", openingId: op.id },
          })
        );
        // Left + right (resize) — small squares
        for (const [which, p] of [["left", oh.left], ["right", oh.right]] as const) {
          fc.add(
            new fabric.Rect({
              left: origin.x + p.x * scale,
              top: origin.y + p.y * scale,
              width: 7,
              height: 7,
              fill: "#ffb875",
              stroke: "#ffffff",
              strokeWidth: 1,
              originX: "center",
              originY: "center",
              selectable: false,
              evented: false,
              data: { type: "opening-resize-handle", openingId: op.id, which },
            })
          );
        }
      }
    }
  }

  // Corner caps at shared endpoints. 2-wall junctions get the precise outer-
  // edge intersection (clean L/T mitre). 3+ wall junctions (WALL-01) get a
  // convex-hull cap covering all wall-end corners. Dead ends (WALL-02) get
  // a subtle square end cap extending halfT in the wall's outward direction.
  const epsPt = 1e-6;
  const wallList = Object.values(walls);
  for (const entry of endpointUsage.values()) {
    const incident = wallList.filter(
      (w) =>
        (Math.abs(w.start.x - entry.point.x) < epsPt &&
          Math.abs(w.start.y - entry.point.y) < epsPt) ||
        (Math.abs(w.end.x - entry.point.x) < epsPt &&
          Math.abs(w.end.y - entry.point.y) < epsPt),
    );

    if (incident.length === 1) {
      // WALL-02: dead-end cap — rectangle extending halfT beyond endpoint
      const w = incident[0];
      const isStart =
        Math.abs(w.start.x - entry.point.x) < epsPt &&
        Math.abs(w.start.y - entry.point.y) < epsPt;
      const cap = computeDeadEndCap(w, isStart);
      if (cap) addCapPolygon(fc, cap, scale, origin);
      continue;
    }

    if (incident.length === 2) {
      const cap = computeCornerCap(incident[0], incident[1], entry.point);
      if (cap) addCapPolygon(fc, cap, scale, origin);
      continue;
    }

    // WALL-01: 3+ walls meeting — fill convex hull of all wall-end corners
    const hullPoints: { x: number; y: number }[] = [entry.point];
    for (const w of incident) {
      const a = wallAngle(w.start, w.end);
      const perpAngle = a + Math.PI / 2;
      const halfT = w.thickness / 2;
      const pdx = Math.cos(perpAngle) * halfT;
      const pdy = Math.sin(perpAngle) * halfT;
      hullPoints.push({ x: entry.point.x - pdx, y: entry.point.y - pdy });
      hullPoints.push({ x: entry.point.x + pdx, y: entry.point.y + pdy });
    }
    const hull = convexHull(hullPoints);
    if (hull.length >= 3) addCapPolygon(fc, hull, scale, origin);
  }

  // WALL-03: mid-segment wall crossings — fill overlap at each intersection
  // where two walls cross without sharing an endpoint.
  for (let i = 0; i < wallList.length; i++) {
    for (let j = i + 1; j < wallList.length; j++) {
      const cross = midSegmentCrossing(wallList[i], wallList[j]);
      if (!cross) continue;
      const cap = computeCrossingCap(wallList[i], wallList[j], cross);
      if (cap) addCapPolygon(fc, cap, scale, origin);
    }
  }
}

function addCapPolygon(
  fc: fabric.Canvas,
  cap: { x: number; y: number }[],
  scale: number,
  origin: { x: number; y: number },
) {
  const px = cap.map((p) => ({
    x: origin.x + p.x * scale,
    y: origin.y + p.y * scale,
  }));
  fc.add(
    new fabric.Polygon(px, {
      fill: WALL_FILL,
      stroke: null as unknown as string,
      strokeWidth: 0,
      selectable: false,
      evented: false,
      data: { type: "wall-corner-cap" },
    }),
  );
}

/** Andrew's monotone chain convex hull in CCW order. */
function convexHull(
  points: { x: number; y: number }[],
): { x: number; y: number }[] {
  if (points.length < 3) return points.slice();
  const pts = points
    .slice()
    .sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (
    o: { x: number; y: number },
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: typeof pts = [];
  for (const p of pts) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) lower.pop();
    lower.push(p);
  }
  const upper: typeof pts = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/** Compute a dead-end square cap that extends the wall by halfT beyond its
 *  endpoint in the wall's outward direction. Returns 4 polygon corners. */
function computeDeadEndCap(
  wall: WallSegment,
  isStart: boolean,
): { x: number; y: number }[] | null {
  const C = isStart ? wall.start : wall.end;
  const other = isStart ? wall.end : wall.start;
  const dx = C.x - other.x;
  const dy = C.y - other.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return null;
  const ux = dx / len;
  const uy = dy / len;
  const halfT = wall.thickness / 2;
  // Cap extends halfT in the outward direction (ux, uy) from C
  const extEnd = { x: C.x + ux * halfT, y: C.y + uy * halfT };
  // Perpendicular
  const px = -uy;
  const py = ux;
  return [
    { x: C.x + px * halfT, y: C.y + py * halfT },
    { x: extEnd.x + px * halfT, y: extEnd.y + py * halfT },
    { x: extEnd.x - px * halfT, y: extEnd.y - py * halfT },
    { x: C.x - px * halfT, y: C.y - py * halfT },
  ];
}

/** Detect whether two walls cross each other in the interior of both segments
 *  (not at endpoints). Returns the intersection point or null. */
function midSegmentCrossing(
  a: WallSegment,
  b: WallSegment,
): { x: number; y: number } | null {
  const r = { x: a.end.x - a.start.x, y: a.end.y - a.start.y };
  const s = { x: b.end.x - b.start.x, y: b.end.y - b.start.y };
  const denom = r.x * s.y - r.y * s.x;
  if (Math.abs(denom) < 1e-9) return null; // parallel
  const qp = { x: b.start.x - a.start.x, y: b.start.y - a.start.y };
  const t = (qp.x * s.y - qp.y * s.x) / denom;
  const u = (qp.x * r.y - qp.y * r.x) / denom;
  // Must be STRICTLY interior (not at endpoints) — 0.02 margin to avoid
  // false positives where walls share a corner
  if (t <= 0.02 || t >= 0.98 || u <= 0.02 || u >= 0.98) return null;
  return { x: a.start.x + t * r.x, y: a.start.y + t * r.y };
}

/** Compute a cap polygon covering the overlap of two crossing walls. */
function computeCrossingCap(
  a: WallSegment,
  b: WallSegment,
  C: { x: number; y: number },
): { x: number; y: number }[] | null {
  const angA = wallAngle(a.start, a.end);
  const angB = wallAngle(b.start, b.end);
  const halfTA = a.thickness / 2;
  const halfTB = b.thickness / 2;
  // Perpendiculars (unit)
  const paX = Math.cos(angA + Math.PI / 2);
  const paY = Math.sin(angA + Math.PI / 2);
  const pbX = Math.cos(angB + Math.PI / 2);
  const pbY = Math.sin(angB + Math.PI / 2);
  // 4 corners where the two strips' edges intersect
  // A strip: lines {C +/- pA*halfTA + t*dA}
  // B strip: lines {C +/- pB*halfTB + s*dB}
  const dAx = Math.cos(angA);
  const dAy = Math.sin(angA);
  const dBx = Math.cos(angB);
  const dBy = Math.sin(angB);
  const intersect = (
    p1x: number, p1y: number, d1x: number, d1y: number,
    p2x: number, p2y: number, d2x: number, d2y: number,
  ): { x: number; y: number } | null => {
    const denom = d1x * d2y - d1y * d2x;
    if (Math.abs(denom) < 1e-9) return null;
    const t = ((p2x - p1x) * d2y - (p2y - p1y) * d2x) / denom;
    return { x: p1x + t * d1x, y: p1y + t * d1y };
  };
  const c1 = intersect(
    C.x + paX * halfTA, C.y + paY * halfTA, dAx, dAy,
    C.x + pbX * halfTB, C.y + pbY * halfTB, dBx, dBy,
  );
  const c2 = intersect(
    C.x + paX * halfTA, C.y + paY * halfTA, dAx, dAy,
    C.x - pbX * halfTB, C.y - pbY * halfTB, dBx, dBy,
  );
  const c3 = intersect(
    C.x - paX * halfTA, C.y - paY * halfTA, dAx, dAy,
    C.x - pbX * halfTB, C.y - pbY * halfTB, dBx, dBy,
  );
  const c4 = intersect(
    C.x - paX * halfTA, C.y - paY * halfTA, dAx, dAy,
    C.x + pbX * halfTB, C.y + pbY * halfTB, dBx, dBy,
  );
  if (!c1 || !c2 || !c3 || !c4) return null;
  return convexHull([c1, c2, c3, c4]);
}

/** Compute the corner-cap polygon that fills the gap between two walls
 *  meeting at shared point C. Returns null if walls are collinear or the
 *  junction doesn't require a cap (reflex corner). */
function computeCornerCap(
  wallA: WallSegment,
  wallB: WallSegment,
  C: { x: number; y: number }
): { x: number; y: number }[] | null {
  const eps = 1e-6;
  const otherA =
    Math.abs(wallA.start.x - C.x) < eps && Math.abs(wallA.start.y - C.y) < eps
      ? wallA.end
      : wallA.start;
  const otherB =
    Math.abs(wallB.start.x - C.x) < eps && Math.abs(wallB.start.y - C.y) < eps
      ? wallB.end
      : wallB.start;

  const dAx = otherA.x - C.x;
  const dAy = otherA.y - C.y;
  const lenA = Math.hypot(dAx, dAy);
  if (lenA < eps) return null;
  const dA = { x: dAx / lenA, y: dAy / lenA };

  const dBx = otherB.x - C.x;
  const dBy = otherB.y - C.y;
  const lenB = Math.hypot(dBx, dBy);
  if (lenB < eps) return null;
  const dB = { x: dBx / lenB, y: dBy / lenB };

  const cross = dA.x * dB.y - dA.y * dB.x;
  if (Math.abs(cross) < 1e-4) return null; // parallel

  const perpA = { x: -dA.y, y: dA.x };
  const perpB = { x: -dB.y, y: dB.x };

  const halfTA = wallA.thickness / 2;
  const halfTB = wallB.thickness / 2;

  // Outer edge of A: side OPPOSITE to B's direction
  //   if cross(dA,dB) > 0 (B CCW from A), outer = -perpA
  //   if cross(dA,dB) < 0 (B CW  from A), outer = +perpA
  const signA = cross > 0 ? -1 : 1;
  const signB = cross > 0 ? 1 : -1;

  // Outer edge endpoint of each wall at C
  const aOuter = { x: C.x + signA * perpA.x * halfTA, y: C.y + signA * perpA.y * halfTA };
  const bOuter = { x: C.x + signB * perpB.x * halfTB, y: C.y + signB * perpB.y * halfTB };

  // Intersection of the two outer edge lines
  // Line 1: aOuter + t*dA
  // Line 2: bOuter + s*dB
  const denom = dA.x * dB.y - dA.y * dB.x;
  const t = ((bOuter.x - aOuter.x) * dB.y - (bOuter.y - aOuter.y) * dB.x) / denom;
  const corner = { x: aOuter.x + t * dA.x, y: aOuter.y + t * dA.y };

  // Sanity cap distance
  const distFromC = Math.hypot(corner.x - C.x, corner.y - C.y);
  const maxDist = Math.max(halfTA, halfTB) * 5;
  if (distFromC > maxDist) return null;

  // Quad: C -> aOuter -> corner -> bOuter -> back to C
  return [C, aOuter, corner, bOuter];
}

/**
 * Render placed products on the Fabric canvas.
 */
export function renderProducts(
  fc: fabric.Canvas,
  placedProducts: Record<string, PlacedProduct>,
  productLibrary: Product[],
  scale: number,
  origin: { x: number; y: number },
  selectedIds: string[]
) {
  for (const pp of Object.values(placedProducts)) {
    const product = productLibrary.find((p) => p.id === pp.productId);
    const { width, depth, isPlaceholder } = effectiveDimensions(product, pp.sizeScale);
    const orphan = !product;
    const showPlaceholder = orphan || isPlaceholder;

    const pw = width * scale;
    const pd = depth * scale;
    const isSelected = selectedIds.includes(pp.id);

    const cx = origin.x + pp.position.x * scale;
    const cy = origin.y + pp.position.y * scale;

    // Border rect — placeholders always dashed + accent-colored
    const border = new fabric.Rect({
      width: pw,
      height: pd,
      fill: showPlaceholder ? "rgba(124,91,240,0.04)" : "rgba(124,91,240,0.06)",
      stroke: showPlaceholder
        ? PRODUCT_STROKE
        : isSelected
        ? PRODUCT_STROKE
        : "#94a3b8",
      strokeWidth: isSelected ? 2 : 1,
      strokeDashArray: showPlaceholder
        ? PLACEHOLDER_DASH
        : isSelected
        ? undefined
        : REAL_DASH,
      originX: "center",
      originY: "center",
    });

    // Name label
    const labelText = orphan ? "MISSING_PRODUCT" : product!.name;
    const nameLabel = new fabric.FabricText(labelText, {
      fontSize: 10,
      fontFamily: "Inter, system-ui, sans-serif",
      fill: orphan ? PRODUCT_STROKE : "#e3e0f1",
      fontWeight: "600",
      originX: "center",
      originY: "bottom",
      top: -pd / 2 - 3,
    });

    // Dimension label
    const dimText = showPlaceholder
      ? "SIZE: UNSET"
      : `${product!.width}' x ${product!.depth}'`;
    const dimLabel = new fabric.FabricText(dimText, {
      fontSize: 9,
      fontFamily: "Inter, system-ui, sans-serif",
      fill: PRODUCT_STROKE,
      originX: "center",
      originY: "top",
      top: pd / 2 + 3,
    });

    const children: fabric.FabricObject[] = [border, nameLabel, dimLabel];

    // Async image loading via cache — only for real products with images
    if (!showPlaceholder && product!.imageUrl) {
      const cachedImg = getCachedImage(product!.id, product!.imageUrl, () => fc.renderAll());
      if (cachedImg) {
        const fImg = new fabric.FabricImage(cachedImg, {
          scaleX: pw / cachedImg.naturalWidth,
          scaleY: pd / cachedImg.naturalHeight,
          originX: "center",
          originY: "center",
        });
        children.splice(1, 0, fImg); // insert after border, before labels
      }
    }

    const group = new fabric.Group(children, {
      left: cx,
      top: cy,
      originX: "center",
      originY: "center",
      angle: pp.rotation,
      selectable: false,
      evented: false,
      data: { type: "product", placedProductId: pp.id, productId: pp.productId },
    });

    fc.add(group);

    // Rotation handle — only for real-dimension products
    if (isSelected && selectedIds.length === 1 && !showPlaceholder && product && hasDimensions(product)) {
      const handlePos = getHandleWorldPos(pp, product.depth as number);
      const hx = origin.x + handlePos.x * scale;
      const hy = origin.y + handlePos.y * scale;
      const line = new fabric.Line([cx, cy, hx, hy], {
        stroke: "#7c5bf0",
        strokeWidth: 1,
        selectable: false,
        evented: false,
        data: { type: "rotation-handle-line", placedProductId: pp.id },
      });
      const circle = new fabric.Circle({
        left: hx,
        top: hy,
        radius: 5,
        fill: "#12121d",
        stroke: "#7c5bf0",
        strokeWidth: 2,
        originX: "center",
        originY: "center",
        selectable: false,
        evented: false,
        data: { type: "rotation-handle", placedProductId: pp.id },
      });
      fc.add(line);
      fc.add(circle);
    }

    // Corner resize handles for selected products (EDIT-14)
    if (isSelected && selectedIds.length === 1) {
      const handles = getResizeHandles(pp, width, depth);
      for (const key of ["ne", "nw", "sw", "se"] as const) {
        const h = handles[key];
        fc.add(
          new fabric.Rect({
            left: origin.x + h.x * scale,
            top: origin.y + h.y * scale,
            width: 10,
            height: 10,
            fill: "#12121d",
            stroke: "#7c5bf0",
            strokeWidth: 2,
            originX: "center",
            originY: "center",
            selectable: false,
            evented: false,
            data: { type: "resize-handle", corner: key, placedProductId: pp.id },
          })
        );
      }
    }
  }
}
