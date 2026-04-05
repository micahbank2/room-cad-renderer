import * as fabric from "fabric";
import type { WallSegment, PlacedProduct } from "@/types/cad";
import type { Product } from "@/types/product";
import { effectiveDimensions, hasDimensions } from "@/types/product";
import { wallCorners, angle as wallAngle } from "@/lib/geometry";
import { getWallHandleWorldPos } from "./wallRotationHandle";
import { drawWallDimension } from "./dimensions";
import { getCachedImage } from "./productImageCache";
import { getHandleWorldPos } from "./rotationHandle";
import { getResizeHandles } from "./resizeHandles";

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

  for (const wall of Object.values(walls)) {
    const corners = wallCorners(wall);
    const isSelected = selectedIds.includes(wall.id);

    const points = corners.map((c) => ({
      x: origin.x + c.x * scale,
      y: origin.y + c.y * scale,
    }));

    const polygon = new fabric.Polygon(points, {
      fill: WALL_FILL,
      stroke: isSelected ? WALL_SELECTED_STROKE : WALL_STROKE,
      strokeWidth: isSelected ? 2 : 1,
      selectable: false, // selection handled by tool
      evented: false,
      data: { type: "wall", wallId: wall.id },
    });

    fc.add(polygon);

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

    // Rotation handle for selected walls (EDIT-12)
    if (isSelected) {
      const h = getWallHandleWorldPos(wall);
      const hx = origin.x + h.x * scale;
      const hy = origin.y + h.y * scale;
      // Stem line from wall midpoint to handle
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
    }
  }

  // For each shared endpoint with exactly two walls meeting, compute the
  // outer-edge intersection and render a triangular cap that fills the gap
  // between the two walls' end caps.
  for (const entry of endpointUsage.values()) {
    if (entry.count !== 2) continue; // only handle simple 2-wall junctions

    const incident = Object.values(walls).filter((w) => {
      const eps = 1e-6;
      return (
        (Math.abs(w.start.x - entry.point.x) < eps && Math.abs(w.start.y - entry.point.y) < eps) ||
        (Math.abs(w.end.x - entry.point.x) < eps && Math.abs(w.end.y - entry.point.y) < eps)
      );
    });
    if (incident.length !== 2) continue;

    const cap = computeCornerCap(incident[0], incident[1], entry.point);
    if (!cap) continue;

    const capPx = cap.map((p) => ({
      x: origin.x + p.x * scale,
      y: origin.y + p.y * scale,
    }));

    fc.add(
      new fabric.Polygon(capPx, {
        fill: WALL_FILL,
        stroke: null as unknown as string,
        strokeWidth: 0,
        selectable: false,
        evented: false,
        data: { type: "wall-corner-cap" },
      })
    );
  }
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
