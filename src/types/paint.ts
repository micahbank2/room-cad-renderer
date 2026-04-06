export interface PaintColor {
  id: string;           // "fb_001" for F&B, "custom_xxx" for user
  name: string;         // "Elephant's Breath" or user name
  hex: string;          // "#f0ece0" — canonical sRGB
  source: "farrow-ball" | "custom";
  hueFamily?: string;   // "WHITES" | "NEUTRALS" | "BLUES" | "GREENS" | "PINKS" | "YELLOWS" | "BLACKS"
}
