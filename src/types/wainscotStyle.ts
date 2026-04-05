export type WainscotStyle =
  | "recessed-panel"
  | "raised-panel"
  | "beadboard"
  | "board-and-batten"
  | "shiplap"
  | "flat-panel"
  | "english-grid";

export interface WainscotStyleItem {
  id: string; // "wain_..."
  name: string;
  style: WainscotStyle;
  heightFt: number; // chair rail height, default 3
  color: string; // hex
  // Style-specific knobs (optional; each style uses its own subset)
  panelWidth?: number; // recessed / raised / flat / english-grid
  plankWidth?: number; // beadboard
  battenWidth?: number; // board-and-batten
  plankHeight?: number; // shiplap
  stileWidth?: number; // recessed / raised / english-grid
  gridRows?: number; // english-grid
  depth?: number; // protrusion from wall face, default 0.18
}

export interface StyleMeta {
  label: string;
  // which knob fields this style uses (controls builder UI)
  knobs: Array<
    | "panelWidth"
    | "plankWidth"
    | "battenWidth"
    | "plankHeight"
    | "stileWidth"
    | "gridRows"
    | "depth"
  >;
  defaults: Partial<WainscotStyleItem>;
}

export const STYLE_META: Record<WainscotStyle, StyleMeta> = {
  "recessed-panel": {
    label: "RECESSED_PANEL",
    knobs: ["panelWidth", "stileWidth", "depth"],
    defaults: { panelWidth: 1.5, stileWidth: 0.33, depth: 0.18, heightFt: 3 },
  },
  "raised-panel": {
    label: "RAISED_PANEL",
    knobs: ["panelWidth", "stileWidth", "depth"],
    defaults: { panelWidth: 1.5, stileWidth: 0.33, depth: 0.18, heightFt: 3 },
  },
  beadboard: {
    label: "BEADBOARD",
    knobs: ["plankWidth", "depth"],
    defaults: { plankWidth: 0.25, depth: 0.1, heightFt: 3 },
  },
  "board-and-batten": {
    label: "BOARD_AND_BATTEN",
    knobs: ["battenWidth", "panelWidth", "depth"],
    defaults: { battenWidth: 0.33, panelWidth: 2, depth: 0.15, heightFt: 4 },
  },
  shiplap: {
    label: "SHIPLAP",
    knobs: ["plankHeight", "depth"],
    defaults: { plankHeight: 0.5, depth: 0.1, heightFt: 4 },
  },
  "flat-panel": {
    label: "FLAT_PANEL",
    knobs: ["depth"],
    defaults: { depth: 0.08, heightFt: 3 },
  },
  "english-grid": {
    label: "ENGLISH_GRID",
    knobs: ["panelWidth", "stileWidth", "gridRows", "depth"],
    defaults: { panelWidth: 1.5, stileWidth: 0.33, gridRows: 2, depth: 0.18, heightFt: 5 },
  },
};

export const ALL_STYLES: WainscotStyle[] = [
  "recessed-panel",
  "raised-panel",
  "beadboard",
  "board-and-batten",
  "shiplap",
  "flat-panel",
  "english-grid",
];

/** Merge style defaults into item so renderers always see filled values. */
export function resolveKnobs(item: WainscotStyleItem): Required<
  Pick<
    WainscotStyleItem,
    "panelWidth" | "plankWidth" | "battenWidth" | "plankHeight" | "stileWidth" | "gridRows" | "depth"
  >
> {
  const d = STYLE_META[item.style].defaults;
  return {
    panelWidth: item.panelWidth ?? d.panelWidth ?? 1.5,
    plankWidth: item.plankWidth ?? d.plankWidth ?? 0.25,
    battenWidth: item.battenWidth ?? d.battenWidth ?? 0.33,
    plankHeight: item.plankHeight ?? d.plankHeight ?? 0.5,
    stileWidth: item.stileWidth ?? d.stileWidth ?? 0.33,
    gridRows: item.gridRows ?? d.gridRows ?? 2,
    depth: item.depth ?? d.depth ?? 0.18,
  };
}
