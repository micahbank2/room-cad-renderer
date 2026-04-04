import { useState, useRef, useEffect, useCallback } from "react";
import * as fabric from "fabric";

// ---------- types ----------
interface Product {
  id: string;
  name: string;
  widthFt: number;
  depthFt: number;
  imageUrl: string;
}

// ---------- constants ----------
const SIDEBAR_W = 280;
const GRID_COLOR = "#e2e8f0";
const ROOM_STROKE = "#334155";
const DIM_COLOR = "#64748b";
const PRODUCT_STROKE = "#2563eb";

// ---------- helpers ----------
function getScale(
  roomW: number,
  roomH: number,
  canvasW: number,
  canvasH: number
) {
  const pad = 60;
  return Math.min((canvasW - pad * 2) / roomW, (canvasH - pad * 2) / roomH);
}

function getOrigin(
  roomW: number,
  roomH: number,
  scale: number,
  canvasW: number,
  canvasH: number
) {
  return {
    x: (canvasW - roomW * scale) / 2,
    y: (canvasH - roomH * scale) / 2,
  };
}

let idCounter = 0;
function uid() {
  return `p_${++idCounter}_${Date.now()}`;
}

// ---------- App ----------
export default function App() {
  const [roomW, setRoomW] = useState(12);
  const [roomH, setRoomH] = useState(10);

  const [prodName, setProdName] = useState("");
  const [prodW, setProdW] = useState(3);
  const [prodD, setProdD] = useState(2);
  const [prodImg, setProdImg] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fcRef = useRef<fabric.Canvas | null>(null);
  const sizeRef = useRef({ w: 600, h: 400 });

  // --- measure available canvas space ---
  const measure = useCallback(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    sizeRef.current = { w: rect.width, h: rect.height };
  }, []);

  // --- draw room + grid + labels ---
  const drawRoom = useCallback(() => {
    const fc = fcRef.current;
    if (!fc) return;

    const cW = sizeRef.current.w;
    const cH = sizeRef.current.h;

    // resize canvas to wrapper
    fc.setDimensions({ width: cW, height: cH });

    // snapshot product positions
    const snapshot: {
      id: string;
      product: Product;
      leftFrac: number;
      topFrac: number;
      angle: number;
    }[] = [];
    fc.getObjects().forEach((obj) => {
      const p = (obj as any).__product as Product | undefined;
      if (p) {
        const scale = getScale(roomW, roomH, cW, cH);
        const origin = getOrigin(roomW, roomH, scale, cW, cH);
        snapshot.push({
          id: p.id,
          product: p,
          leftFrac: ((obj.left ?? 0) - origin.x) / (roomW * scale),
          topFrac: ((obj.top ?? 0) - origin.y) / (roomH * scale),
          angle: obj.angle ?? 0,
        });
      }
    });

    fc.clear();
    fc.backgroundColor = "#f8fafc";

    const scale = getScale(roomW, roomH, cW, cH);
    const origin = getOrigin(roomW, roomH, scale, cW, cH);
    const rw = roomW * scale;
    const rh = roomH * scale;

    // grid lines
    for (let x = 0; x <= roomW; x++) {
      fc.add(
        new fabric.Line(
          [origin.x + x * scale, origin.y, origin.x + x * scale, origin.y + rh],
          { stroke: GRID_COLOR, strokeWidth: 1, selectable: false, evented: false }
        )
      );
    }
    for (let y = 0; y <= roomH; y++) {
      fc.add(
        new fabric.Line(
          [origin.x, origin.y + y * scale, origin.x + rw, origin.y + y * scale],
          { stroke: GRID_COLOR, strokeWidth: 1, selectable: false, evented: false }
        )
      );
    }

    // room outline
    fc.add(
      new fabric.Rect({
        left: origin.x,
        top: origin.y,
        width: rw,
        height: rh,
        fill: "transparent",
        stroke: ROOM_STROKE,
        strokeWidth: 2,
        selectable: false,
        evented: false,
      })
    );

    // dimension labels
    fc.add(
      new fabric.FabricText(`${roomW} ft`, {
        left: origin.x + rw / 2,
        top: origin.y + rh + 12,
        fontSize: 13,
        fontFamily: "Inter, system-ui, sans-serif",
        fill: DIM_COLOR,
        originX: "center",
        selectable: false,
        evented: false,
      })
    );
    fc.add(
      new fabric.FabricText(`${roomH} ft`, {
        left: origin.x + rw + 12,
        top: origin.y + rh / 2,
        fontSize: 13,
        fontFamily: "Inter, system-ui, sans-serif",
        fill: DIM_COLOR,
        angle: 90,
        originX: "center",
        selectable: false,
        evented: false,
      })
    );

    // dimension tick marks
    const ticks = [
      [origin.x, origin.y + rh + 4, origin.x, origin.y + rh + 10],
      [origin.x + rw, origin.y + rh + 4, origin.x + rw, origin.y + rh + 10],
      [origin.x + rw + 4, origin.y, origin.x + rw + 10, origin.y],
      [origin.x + rw + 4, origin.y + rh, origin.x + rw + 10, origin.y + rh],
    ];
    ticks.forEach(([x1, y1, x2, y2]) => {
      fc.add(
        new fabric.Line([x1, y1, x2, y2], {
          stroke: DIM_COLOR,
          strokeWidth: 1,
          selectable: false,
          evented: false,
        })
      );
    });

    // dimension lines (connecting ticks)
    fc.add(
      new fabric.Line(
        [origin.x, origin.y + rh + 7, origin.x + rw, origin.y + rh + 7],
        { stroke: DIM_COLOR, strokeWidth: 0.5, selectable: false, evented: false }
      )
    );
    fc.add(
      new fabric.Line(
        [origin.x + rw + 7, origin.y, origin.x + rw + 7, origin.y + rh],
        { stroke: DIM_COLOR, strokeWidth: 0.5, selectable: false, evented: false }
      )
    );

    // restore product objects
    snapshot.forEach(({ product, leftFrac, topFrac, angle }) => {
      placeProduct(
        fc,
        product,
        scale,
        origin,
        origin.x + leftFrac * rw,
        origin.y + topFrac * rh,
        angle
      );
    });

    fc.renderAll();
  }, [roomW, roomH]);

  function placeProduct(
    fc: fabric.Canvas,
    product: Product,
    scale: number,
    origin: { x: number; y: number },
    left: number,
    top: number,
    angle: number
  ) {
    const pw = product.widthFt * scale;
    const pd = product.depthFt * scale;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const fImg = new fabric.FabricImage(img, {
        scaleX: pw / img.width,
        scaleY: pd / img.height,
      });

      const dimLabel = new fabric.FabricText(
        `${product.widthFt}' x ${product.depthFt}'`,
        {
          fontSize: 10,
          fontFamily: "Inter, system-ui, sans-serif",
          fill: PRODUCT_STROKE,
          originX: "center",
          top: pd + 3,
          left: pw / 2,
        }
      );

      const nameLabel = new fabric.FabricText(product.name || "Product", {
        fontSize: 10,
        fontFamily: "Inter, system-ui, sans-serif",
        fill: "#1e293b",
        fontWeight: "600",
        originX: "center",
        top: -14,
        left: pw / 2,
      });

      const border = new fabric.Rect({
        width: pw,
        height: pd,
        fill: "rgba(37,99,235,0.04)",
        stroke: PRODUCT_STROKE,
        strokeWidth: 1.5,
        strokeDashArray: [4, 3],
      });

      const group = new fabric.Group([border, fImg, nameLabel, dimLabel], {
        left,
        top,
        angle,
        hasControls: true,
        hasBorders: true,
        lockScalingX: true,
        lockScalingY: true,
        cornerStyle: "circle",
        cornerSize: 7,
        cornerColor: PRODUCT_STROKE,
        borderColor: PRODUCT_STROKE,
      });

      (group as any).__product = product;

      const rw = roomW * scale;
      const rh = roomH * scale;
      group.on("moving", () => {
        const b = group.getBoundingRect();
        if (b.left < origin.x)
          group.set("left", (group.left ?? 0) + (origin.x - b.left));
        if (b.top < origin.y)
          group.set("top", (group.top ?? 0) + (origin.y - b.top));
        if (b.left + b.width > origin.x + rw)
          group.set(
            "left",
            (group.left ?? 0) - (b.left + b.width - origin.x - rw)
          );
        if (b.top + b.height > origin.y + rh)
          group.set(
            "top",
            (group.top ?? 0) - (b.top + b.height - origin.y - rh)
          );
      });

      fc.add(group);
      fc.setActiveObject(group);
      fc.renderAll();
    };
    img.src = product.imageUrl;
  }

  // --- init canvas ---
  useEffect(() => {
    if (!canvasRef.current) return;
    measure();
    const fc = new fabric.Canvas(canvasRef.current, {
      width: sizeRef.current.w,
      height: sizeRef.current.h,
      selection: true,
    });
    fcRef.current = fc;
    drawRoom();

    const onResize = () => {
      measure();
      drawRoom();
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      fc.dispose();
    };
  }, []);

  // redraw when room dims change
  useEffect(() => {
    measure();
    drawRoom();
  }, [drawRoom]);

  // --- handlers ---
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProdImg(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleAddProduct() {
    if (!prodImg) return;
    const product: Product = {
      id: uid(),
      name: prodName || "Product",
      widthFt: prodW,
      depthFt: prodD,
      imageUrl: prodImg,
    };
    setProducts((prev) => [...prev, product]);

    const fc = fcRef.current;
    if (fc) {
      const cW = sizeRef.current.w;
      const cH = sizeRef.current.h;
      const scale = getScale(roomW, roomH, cW, cH);
      const origin = getOrigin(roomW, roomH, scale, cW, cH);
      placeProduct(
        fc,
        product,
        scale,
        origin,
        origin.x + 20 + (products.length % 5) * 30,
        origin.y + 20 + (products.length % 5) * 30,
        0
      );
    }

    setProdName("");
    setProdW(3);
    setProdD(2);
    setProdImg(null);
  }

  function handleDeleteSelected() {
    const fc = fcRef.current;
    if (!fc) return;
    const active = fc.getActiveObject();
    if (active && (active as any).__product) {
      const prod = (active as any).__product as Product;
      fc.remove(active);
      setProducts((prev) => prev.filter((p) => p.id !== prod.id));
      fc.renderAll();
    }
  }

  return (
    <div style={S.wrapper}>
      {/* sidebar */}
      <div style={S.sidebar}>
        <h1 style={S.title}>Room Designer</h1>
        <p style={S.subtitle}>Place products to scale in a 2D room</p>

        {/* room size */}
        <Section label="Room Size">
          <div style={S.row}>
            <Field label="Width (ft)">
              <input
                type="number"
                min={1}
                max={100}
                value={roomW}
                onChange={(e) => setRoomW(Math.max(1, +e.target.value))}
                style={S.input}
              />
            </Field>
            <Field label="Length (ft)">
              <input
                type="number"
                min={1}
                max={100}
                value={roomH}
                onChange={(e) => setRoomH(Math.max(1, +e.target.value))}
                style={S.input}
              />
            </Field>
          </div>
        </Section>

        {/* add product */}
        <Section label="Add Product">
          <Field label="Name">
            <input
              type="text"
              value={prodName}
              placeholder="e.g. Sofa"
              onChange={(e) => setProdName(e.target.value)}
              style={S.input}
            />
          </Field>
          <div style={S.row}>
            <Field label="Width (ft)">
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={prodW}
                onChange={(e) => setProdW(Math.max(0.5, +e.target.value))}
                style={S.input}
              />
            </Field>
            <Field label="Depth (ft)">
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={prodD}
                onChange={(e) => setProdD(Math.max(0.5, +e.target.value))}
                style={S.input}
              />
            </Field>
          </div>
          <Field label="Image">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ ...S.input, padding: "5px 6px", fontSize: 12 }}
            />
          </Field>
          {prodImg && (
            <img
              src={prodImg}
              alt="preview"
              style={{
                width: 64,
                height: 64,
                objectFit: "contain",
                borderRadius: 6,
                border: "1px solid #e2e8f0",
              }}
            />
          )}
          <button
            onClick={handleAddProduct}
            disabled={!prodImg}
            style={{
              ...S.btn,
              opacity: prodImg ? 1 : 0.4,
              cursor: prodImg ? "pointer" : "not-allowed",
            }}
          >
            Place in Room
          </button>
        </Section>

        {/* placed list */}
        {products.length > 0 && (
          <Section label={`Placed (${products.length})`}>
            {products.map((p) => (
              <div key={p.id} style={S.productRow}>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</span>
                <span style={{ color: DIM_COLOR, fontSize: 11 }}>
                  {p.widthFt}' x {p.depthFt}'
                </span>
              </div>
            ))}
            <button
              onClick={handleDeleteSelected}
              style={{ ...S.btn, background: "#ef4444", marginTop: 4 }}
            >
              Delete Selected
            </button>
          </Section>
        )}

        <p style={S.hint}>
          Click a product to select. Drag to move. Use the rotation handle to
          rotate.
        </p>
      </div>

      {/* canvas */}
      <div ref={wrapperRef} style={S.canvasWrap}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

// ---------- tiny sub-components ----------
function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={S.section}>
      <div style={S.sectionLabel}>{label}</div>
      <div style={S.sectionBody}>{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={S.field}>
      <span style={S.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

// ---------- styles ----------
const S: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
    fontFamily: "Inter, system-ui, sans-serif",
    background: "#f1f5f9",
  },
  sidebar: {
    width: SIDEBAR_W,
    minWidth: SIDEBAR_W,
    padding: "16px 14px",
    background: "#ffffff",
    borderRight: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    overflowY: "auto",
    boxSizing: "border-box",
  },
  canvasWrap: {
    flex: 1,
    height: "100vh",
    position: "relative" as const,
    overflow: "hidden",
  },
  title: { margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" },
  subtitle: { margin: 0, fontSize: 12, color: "#94a3b8" },
  section: {
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    overflow: "hidden",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#475569",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    padding: "6px 10px",
    background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
  },
  sectionBody: {
    padding: "8px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  row: { display: "flex", gap: 6 },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    flex: 1,
  },
  fieldLabel: { fontSize: 11, color: "#64748b" },
  input: {
    padding: "5px 7px",
    border: "1px solid #cbd5e1",
    borderRadius: 5,
    fontSize: 13,
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  btn: {
    padding: "7px 10px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 5,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 2,
  },
  productRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "3px 0",
  },
  hint: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: "auto",
    lineHeight: 1.4,
  },
};
