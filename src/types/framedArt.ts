export type FrameStyle =
  | "none"
  | "thin-black"
  | "thick-gold"
  | "natural-wood"
  | "museum-white"
  | "floating"
  | "ornate";

export interface FramedArtItem {
  id: string; // "fart_..."
  name: string;
  imageUrl: string; // data URL
  frameStyle: FrameStyle;
}

export interface FramePreset {
  width: number; // ft
  depth: number; // ft (protrusion from wall face)
  color: string; // hex
  label: string;
}

export const FRAME_PRESETS: Record<FrameStyle, FramePreset> = {
  none: { width: 0, depth: 0, color: "#000000", label: "NO_FRAME" },
  "thin-black": { width: 0.08, depth: 0.03, color: "#0d0d0d", label: "THIN_BLACK" },
  "thick-gold": { width: 0.25, depth: 0.08, color: "#b8912d", label: "THICK_GOLD" },
  "natural-wood": { width: 0.15, depth: 0.06, color: "#8b6b4a", label: "NATURAL_WOOD" },
  "museum-white": { width: 0.2, depth: 0.1, color: "#f4f2ee", label: "MUSEUM_WHITE" },
  floating: { width: 0.05, depth: 0.15, color: "#1a1a1a", label: "FLOATING" },
  ornate: { width: 0.35, depth: 0.12, color: "#c9a04f", label: "ORNATE_GOLD" },
};

export const FRAME_STYLES: FrameStyle[] = [
  "none",
  "thin-black",
  "thick-gold",
  "natural-wood",
  "museum-white",
  "floating",
  "ornate",
];
