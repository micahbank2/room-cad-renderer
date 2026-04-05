import * as fabric from "fabric";
import type { WallSegment, PlacedProduct } from "@/types/cad";
import type { Product } from "@/types/product";
import { effectiveDimensions, hasDimensions } from "@/types/product";
import { mitredWallCorners, angle as wallAngle } from "@/lib/geometry";
import { drawWallDimension } from "./dimensions";
import { getCachedImage } from "./productImageCache";
import { getHandleWorldPos } from "./rotationHandle";

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
  const wallList = Object.values(walls);
  for (const wall of wallList) {
    const corners = mitredWallCorners(wall, wallList);
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
  }
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
    const { width, depth, isPlaceholder } = effectiveDimensions(product);
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
  }
}
