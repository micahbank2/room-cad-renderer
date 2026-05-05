import type { WainscotStyleItem } from "@/types/wainscotStyle";
import { resolveKnobs } from "@/types/wainscotStyle";

/** All style renderers take the wall's local metrics + the style item and
 *  return a JSX group positioned in WALL-LOCAL coordinates:
 *    - x: 0 at wall center, ±halfLen at edges
 *    - y: 0 at wall center, -halfH at floor
 *    - z: 0 at wall center, +thickness/2 is the active face
 *  The caller (WallMesh) wraps the result in a group that rotates 180° around
 *  Y for side B. All coordinates stay in wall-local space. */
/**
 * Phase 59 CUTAWAY-01 (RESEARCH Q6 sub-task A): optional ghostProps spread
 * by every internal <meshStandardMaterial>. When undefined, materials use
 * the opaque defaults (transparent: true, opacity: 1.0, depthWrite: true)
 * — kept constant per Q3 (avoids Phase 49 BUG-02 shader-recompile trap).
 */
export interface GhostMaterialProps {
  transparent: true;
  opacity: number;
  depthWrite: boolean;
}

const DEFAULT_OPAQUE_GHOST: GhostMaterialProps = {
  transparent: true,
  opacity: 1.0,
  depthWrite: true,
};

export interface WainscotRenderCtx {
  length: number; // wall length (ft)
  halfLen: number; // length/2
  halfH: number; // wall height / 2
  thickness: number; // wall thickness
  item: WainscotStyleItem;
  /** Phase 59 CUTAWAY-01: opacity uniforms threaded from WallMesh isGhosted. */
  ghostProps?: GhostMaterialProps;
}

const chairCapHeight = 0.17;
const chairCapDepth = 0.25;
const railHeight = 0.33;

function ChairCap({ length, halfH, thickness, height, color, ghost }: { length: number; halfH: number; thickness: number; height: number; color: string; ghost: GhostMaterialProps }) {
  return (
    <mesh
      position={[0, -halfH + height - chairCapHeight / 2, thickness / 2 + chairCapDepth / 2]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[length, chairCapHeight, chairCapDepth]} />
      <meshStandardMaterial color={color} roughness={0.6} metalness={0} {...ghost} />
    </mesh>
  );
}

function BackingPanel({ length, halfH, thickness, height, backDepth, color, ghost }: { length: number; halfH: number; thickness: number; height: number; backDepth: number; color: string; ghost: GhostMaterialProps }) {
  return (
    <mesh
      position={[0, -halfH + height / 2, thickness / 2 + backDepth / 2]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[length, height, backDepth]} />
      <meshStandardMaterial color={color} roughness={0.7} metalness={0} {...ghost} />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────────
// RECESSED PANEL — current look: frame with inset panel
// ─────────────────────────────────────────────────────────────────
function renderRecessed(ctx: WainscotRenderCtx): React.ReactNode {
  const { length, halfH, thickness, item } = ctx;
  const ghost = ctx.ghostProps ?? DEFAULT_OPAQUE_GHOST;
  const { panelWidth, stileWidth, depth } = resolveKnobs(item);
  const height = item.heightFt;
  const color = item.color;
  const backDepth = 0.05;

  const interiorWidth = length - 2 * stileWidth;
  const panelCount = Math.max(1, Math.round(interiorWidth / panelWidth));
  const actualPanelWidth = (interiorWidth - (panelCount - 1) * stileWidth) / panelCount;

  const panelAreaHeight = height - chairCapHeight - 2 * railHeight;
  const panelCenterY = -halfH + railHeight + panelAreaHeight / 2;

  const meshes: React.ReactNode[] = [];
  // Recessed backing
  meshes.push(<BackingPanel key="back" length={length} halfH={halfH} thickness={thickness} height={height} backDepth={backDepth} color={color} ghost={ghost} />);

  // Top rail
  const topRailY = -halfH + height - chairCapHeight - railHeight / 2;
  meshes.push(
    <mesh key="top-rail" position={[0, topRailY, thickness / 2 + depth / 2]} castShadow receiveShadow>
      <boxGeometry args={[length, railHeight, depth]} />
      <meshStandardMaterial color={color} roughness={0.65} metalness={0} {...ghost} />
    </mesh>
  );
  // Bottom rail
  const bottomRailY = -halfH + railHeight / 2;
  meshes.push(
    <mesh key="bottom-rail" position={[0, bottomRailY, thickness / 2 + depth / 2]} castShadow receiveShadow>
      <boxGeometry args={[length, railHeight, depth]} />
      <meshStandardMaterial color={color} roughness={0.65} metalness={0} {...ghost} />
    </mesh>
  );
  // Stiles
  for (let i = 0; i <= panelCount; i++) {
    const stileX = -length / 2 + stileWidth / 2 + i * (actualPanelWidth + stileWidth);
    meshes.push(
      <mesh
        key={`stile-${i}`}
        position={[stileX, panelCenterY, thickness / 2 + depth / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[stileWidth, panelAreaHeight, depth]} />
        <meshStandardMaterial color={color} roughness={0.65} metalness={0} {...ghost} />
      </mesh>
    );
  }
  // Chair cap
  meshes.push(<ChairCap key="cap" length={length} halfH={halfH} thickness={thickness} height={height} color={color} ghost={ghost} />);
  return <group>{meshes}</group>;
}

// ─────────────────────────────────────────────────────────────────
// RAISED PANEL — panels stick OUT beyond the frame plane
// ─────────────────────────────────────────────────────────────────
function renderRaised(ctx: WainscotRenderCtx): React.ReactNode {
  const { length, halfH, thickness, item } = ctx;
  const ghost = ctx.ghostProps ?? DEFAULT_OPAQUE_GHOST;
  const { panelWidth, stileWidth, depth } = resolveKnobs(item);
  const height = item.heightFt;
  const color = item.color;
  const backDepth = 0.05;
  const raiseDepth = depth + 0.06; // panels protrude further than frame

  const interiorWidth = length - 2 * stileWidth;
  const panelCount = Math.max(1, Math.round(interiorWidth / panelWidth));
  const actualPanelWidth = (interiorWidth - (panelCount - 1) * stileWidth) / panelCount;

  const panelAreaHeight = height - chairCapHeight - 2 * railHeight;
  const panelCenterY = -halfH + railHeight + panelAreaHeight / 2;

  const meshes: React.ReactNode[] = [];
  meshes.push(<BackingPanel key="back" length={length} halfH={halfH} thickness={thickness} height={height} backDepth={backDepth} color={color} ghost={ghost} />);

  // Rails at frame depth
  const topRailY = -halfH + height - chairCapHeight - railHeight / 2;
  const bottomRailY = -halfH + railHeight / 2;
  [topRailY, bottomRailY].forEach((y, i) => {
    meshes.push(
      <mesh key={`rail-${i}`} position={[0, y, thickness / 2 + depth / 2]} castShadow receiveShadow>
        <boxGeometry args={[length, railHeight, depth]} />
        <meshStandardMaterial color={color} roughness={0.65} metalness={0} {...ghost} />
      </mesh>
    );
  });
  // Stiles
  for (let i = 0; i <= panelCount; i++) {
    const stileX = -length / 2 + stileWidth / 2 + i * (actualPanelWidth + stileWidth);
    meshes.push(
      <mesh key={`stile-${i}`} position={[stileX, panelCenterY, thickness / 2 + depth / 2]} castShadow receiveShadow>
        <boxGeometry args={[stileWidth, panelAreaHeight, depth]} />
        <meshStandardMaterial color={color} roughness={0.65} metalness={0} {...ghost} />
      </mesh>
    );
  }
  // Raised panels (thinner but stick OUT further)
  for (let i = 0; i < panelCount; i++) {
    const panelX = -length / 2 + stileWidth + actualPanelWidth / 2 + i * (actualPanelWidth + stileWidth);
    meshes.push(
      <mesh key={`panel-${i}`} position={[panelX, panelCenterY, thickness / 2 + raiseDepth / 2]} castShadow receiveShadow>
        <boxGeometry args={[actualPanelWidth - 0.1, panelAreaHeight - 0.1, raiseDepth]} />
        <meshStandardMaterial color={color} roughness={0.65} metalness={0} {...ghost} />
      </mesh>
    );
  }
  meshes.push(<ChairCap key="cap" length={length} halfH={halfH} thickness={thickness} height={height} color={color} ghost={ghost} />);
  return <group>{meshes}</group>;
}

// ─────────────────────────────────────────────────────────────────
// BEADBOARD — narrow vertical planks with v-grooves
// ─────────────────────────────────────────────────────────────────
function renderBeadboard(ctx: WainscotRenderCtx): React.ReactNode {
  const { length, halfH, thickness, item } = ctx;
  const ghost = ctx.ghostProps ?? DEFAULT_OPAQUE_GHOST;
  const { plankWidth, depth } = resolveKnobs(item);
  const height = item.heightFt;
  const color = item.color;
  const grooveWidth = 0.02;

  const plankAreaHeight = height - chairCapHeight;
  const plankCenterY = -halfH + plankAreaHeight / 2;
  const stride = plankWidth + grooveWidth;
  const plankCount = Math.max(1, Math.floor(length / stride));
  const totalW = plankCount * stride - grooveWidth;
  const startX = -totalW / 2 + plankWidth / 2;

  const meshes: React.ReactNode[] = [];
  for (let i = 0; i < plankCount; i++) {
    const x = startX + i * stride;
    meshes.push(
      <mesh key={`plank-${i}`} position={[x, plankCenterY, thickness / 2 + depth / 2]} castShadow receiveShadow>
        <boxGeometry args={[plankWidth, plankAreaHeight, depth]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0} {...ghost} />
      </mesh>
    );
  }
  meshes.push(<ChairCap key="cap" length={length} halfH={halfH} thickness={thickness} height={height} color={color} ghost={ghost} />);
  return <group>{meshes}</group>;
}

// ─────────────────────────────────────────────────────────────────
// BOARD AND BATTEN — flat backing + wide vertical battens
// ─────────────────────────────────────────────────────────────────
function renderBoardBatten(ctx: WainscotRenderCtx): React.ReactNode {
  const { length, halfH, thickness, item } = ctx;
  const ghost = ctx.ghostProps ?? DEFAULT_OPAQUE_GHOST;
  const { battenWidth, panelWidth, depth } = resolveKnobs(item);
  const height = item.heightFt;
  const color = item.color;
  const backDepth = 0.04;

  const battenAreaHeight = height - chairCapHeight;
  const battenCenterY = -halfH + battenAreaHeight / 2;
  const stride = battenWidth + panelWidth;
  const battenCount = Math.max(2, Math.round(length / stride) + 1);
  const actualStride = (length - battenWidth) / (battenCount - 1);

  const meshes: React.ReactNode[] = [];
  // Backing
  meshes.push(
    <mesh
      key="back"
      position={[0, -halfH + battenAreaHeight / 2, thickness / 2 + backDepth / 2]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[length, battenAreaHeight, backDepth]} />
      <meshStandardMaterial color={color} roughness={0.7} metalness={0} {...ghost} />
    </mesh>
  );
  // Battens
  for (let i = 0; i < battenCount; i++) {
    const x = -length / 2 + battenWidth / 2 + i * actualStride;
    meshes.push(
      <mesh key={`batten-${i}`} position={[x, battenCenterY, thickness / 2 + depth / 2]} castShadow receiveShadow>
        <boxGeometry args={[battenWidth, battenAreaHeight, depth]} />
        <meshStandardMaterial color={color} roughness={0.65} metalness={0} {...ghost} />
      </mesh>
    );
  }
  // Horizontal top band (stops where chair cap begins)
  const topBandY = -halfH + battenAreaHeight - battenWidth / 2;
  meshes.push(
    <mesh key="top-band" position={[0, topBandY, thickness / 2 + depth / 2]} castShadow receiveShadow>
      <boxGeometry args={[length, battenWidth, depth]} />
      <meshStandardMaterial color={color} roughness={0.65} metalness={0} {...ghost} />
    </mesh>
  );
  meshes.push(<ChairCap key="cap" length={length} halfH={halfH} thickness={thickness} height={height} color={color} ghost={ghost} />);
  return <group>{meshes}</group>;
}

// ─────────────────────────────────────────────────────────────────
// SHIPLAP — horizontal overlapping planks
// ─────────────────────────────────────────────────────────────────
function renderShiplap(ctx: WainscotRenderCtx): React.ReactNode {
  const { length, halfH, thickness, item } = ctx;
  const ghost = ctx.ghostProps ?? DEFAULT_OPAQUE_GHOST;
  const { plankHeight, depth } = resolveKnobs(item);
  const height = item.heightFt;
  const color = item.color;
  const gap = 0.02;

  const areaHeight = height - chairCapHeight;
  const stride = plankHeight + gap;
  const plankCount = Math.max(1, Math.floor(areaHeight / stride));
  const totalH = plankCount * stride - gap;
  const startY = -halfH + totalH - plankHeight / 2;

  const meshes: React.ReactNode[] = [];
  for (let i = 0; i < plankCount; i++) {
    const y = startY - i * stride;
    meshes.push(
      <mesh key={`plank-${i}`} position={[0, y, thickness / 2 + depth / 2]} castShadow receiveShadow>
        <boxGeometry args={[length, plankHeight, depth]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0} {...ghost} />
      </mesh>
    );
  }
  meshes.push(<ChairCap key="cap" length={length} halfH={halfH} thickness={thickness} height={height} color={color} ghost={ghost} />);
  return <group>{meshes}</group>;
}

// ─────────────────────────────────────────────────────────────────
// FLAT PANEL — just a slab + chair cap, no panels/stiles
// ─────────────────────────────────────────────────────────────────
function renderFlat(ctx: WainscotRenderCtx): React.ReactNode {
  const { length, halfH, thickness, item } = ctx;
  const ghost = ctx.ghostProps ?? DEFAULT_OPAQUE_GHOST;
  const { depth } = resolveKnobs(item);
  const height = item.heightFt;
  const color = item.color;

  const areaHeight = height - chairCapHeight;
  const centerY = -halfH + areaHeight / 2;

  return (
    <group>
      <mesh position={[0, centerY, thickness / 2 + depth / 2]} castShadow receiveShadow>
        <boxGeometry args={[length, areaHeight, depth]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0} {...ghost} />
      </mesh>
      <ChairCap length={length} halfH={halfH} thickness={thickness} height={height} color={color} ghost={ghost} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────
// ENGLISH GRID — multi-row grid of recessed panels
// ─────────────────────────────────────────────────────────────────
function renderEnglishGrid(ctx: WainscotRenderCtx): React.ReactNode {
  const { length, halfH, thickness, item } = ctx;
  const ghost = ctx.ghostProps ?? DEFAULT_OPAQUE_GHOST;
  const { panelWidth, stileWidth, gridRows, depth } = resolveKnobs(item);
  const height = item.heightFt;
  const color = item.color;
  const backDepth = 0.05;
  const rows = Math.max(1, gridRows);

  const interiorWidth = length - 2 * stileWidth;
  const colCount = Math.max(1, Math.round(interiorWidth / panelWidth));
  const actualColWidth = (interiorWidth - (colCount - 1) * stileWidth) / colCount;

  const areaHeight = height - chairCapHeight - (rows + 1) * railHeight;
  const rowHeight = areaHeight / rows;

  const meshes: React.ReactNode[] = [];
  meshes.push(<BackingPanel key="back" length={length} halfH={halfH} thickness={thickness} height={height} backDepth={backDepth} color={color} ghost={ghost} />);

  // Horizontal rails (rows+1 of them)
  for (let r = 0; r <= rows; r++) {
    const y = -halfH + r * (rowHeight + railHeight) + railHeight / 2;
    meshes.push(
      <mesh key={`rail-${r}`} position={[0, y, thickness / 2 + depth / 2]} castShadow receiveShadow>
        <boxGeometry args={[length, railHeight, depth]} />
        <meshStandardMaterial color={color} roughness={0.65} metalness={0} {...ghost} />
      </mesh>
    );
  }
  // Vertical stiles in each row
  for (let r = 0; r < rows; r++) {
    const rowCenterY = -halfH + railHeight + r * (rowHeight + railHeight) + rowHeight / 2;
    for (let c = 0; c <= colCount; c++) {
      const stileX = -length / 2 + stileWidth / 2 + c * (actualColWidth + stileWidth);
      meshes.push(
        <mesh
          key={`stile-${r}-${c}`}
          position={[stileX, rowCenterY, thickness / 2 + depth / 2]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[stileWidth, rowHeight, depth]} />
          <meshStandardMaterial color={color} roughness={0.65} metalness={0} {...ghost} />
        </mesh>
      );
    }
  }
  meshes.push(<ChairCap key="cap" length={length} halfH={halfH} thickness={thickness} height={height} color={color} ghost={ghost} />);
  return <group>{meshes}</group>;
}

// ─────────────────────────────────────────────────────────────────
// DISPATCHER
// ─────────────────────────────────────────────────────────────────
export function renderWainscotStyle(ctx: WainscotRenderCtx): React.ReactNode {
  switch (ctx.item.style) {
    case "recessed-panel":
      return renderRecessed(ctx);
    case "raised-panel":
      return renderRaised(ctx);
    case "beadboard":
      return renderBeadboard(ctx);
    case "board-and-batten":
      return renderBoardBatten(ctx);
    case "shiplap":
      return renderShiplap(ctx);
    case "flat-panel":
      return renderFlat(ctx);
    case "english-grid":
      return renderEnglishGrid(ctx);
    default:
      return renderRecessed(ctx);
  }
}
