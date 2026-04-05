import type { HelpSectionId } from "@/stores/uiStore";
import { SHORTCUTS } from "@/components/help/helpContent";

export interface HelpIndexEntry {
  id: string; // unique across entries
  section: HelpSectionId;
  heading: string;
  body: string;
  keywords: string[];
  /** Optional anchor id to scroll to within the section */
  anchor?: string;
}

/**
 * Flat searchable index of help content.
 * Keep keywords lowercase. Body text should contain the actual searchable prose,
 * kept short enough to render as a preview (~120 chars ideal).
 */
export const HELP_INDEX: HelpIndexEntry[] = [
  // ─── Getting Started ───────────────────────────────────────────────
  {
    id: "gs-core-loop",
    section: "getting-started",
    heading: "The core loop",
    body: "Create a room, draw walls, upload products, drag them onto the canvas, switch to 3D, then walk through at eye level.",
    keywords: ["core", "loop", "workflow", "start", "basics", "overview"],
    anchor: "help-h-core-loop",
  },
  {
    id: "gs-first-room",
    section: "getting-started",
    heading: "Your first room",
    body: "Set room dimensions in the sidebar. Default is 12x14 feet. Walls snap to 6 inches by default.",
    keywords: ["first", "room", "dimensions", "sidebar", "room config", "12x14", "setup"],
    anchor: "help-h-first-room",
  },
  {
    id: "gs-saving",
    section: "getting-started",
    heading: "Saving your work",
    body: "Everything auto-saves after 2 seconds. Reload restores your most recent project automatically.",
    keywords: ["save", "saving", "auto-save", "reload", "persistence", "storage", "autosave"],
    anchor: "help-h-saving",
  },
  {
    id: "gs-exporting",
    section: "getting-started",
    heading: "Exporting as PNG",
    body: "Click EXPORT in 3D or split view to save the current render as a PNG image.",
    keywords: ["export", "png", "image", "render", "save view", "download"],
    anchor: "help-h-exporting",
  },

  // ─── Library + 2D ─────────────────────────────────────────────────
  {
    id: "lib-uploading",
    section: "library",
    heading: "Uploading products",
    body: "Click LIBRARY then ADD_PRODUCT. Drop an image, name it, pick a category, enter dimensions in feet.",
    keywords: ["upload", "add product", "image", "product", "library", "new product"],
    anchor: "help-h-uploading",
  },
  {
    id: "lib-skip-dims",
    section: "library",
    heading: "Skipping dimensions",
    body: "Check SKIP_DIMENSIONS to upload products without sizes. They render as a placeholder dashed box.",
    keywords: ["skip", "dimensions", "nullable", "placeholder", "optional", "size", "unknown"],
    anchor: "help-h-skipping-dims",
  },
  {
    id: "lib-searching",
    section: "library",
    heading: "Searching products",
    body: "Type into the search field in the library view to filter by product name. Case-insensitive.",
    keywords: ["search", "filter", "find product", "library search"],
    anchor: "help-h-searching",
  },
  {
    id: "lib-placing",
    section: "library",
    heading: "Placing products on the canvas",
    body: "Drag a product card from the sidebar onto the 2D canvas. Snaps to grid and auto-selects.",
    keywords: ["place", "drag", "drop", "canvas", "put", "add to room", "placement"],
    anchor: "help-h-placing",
  },
  {
    id: "lib-rotation",
    section: "library",
    heading: "Rotating products",
    body: "Drag the rotation handle (dot above selected product) to rotate. Hold Shift to bypass 15 degree snap.",
    keywords: ["rotate", "rotation", "turn", "spin", "angle", "handle"],
    anchor: "help-h-placing",
  },
  {
    id: "lib-walls",
    section: "library",
    heading: "Editing walls",
    body: "Double-click a wall dimension label to type a new length. Shared corners move together.",
    keywords: ["edit", "wall", "dimension", "length", "resize", "double-click", "label"],
    anchor: "help-h-walls",
  },
  {
    id: "lib-draw-walls",
    section: "library",
    heading: "Drawing new walls",
    body: "Press W and click-click to draw walls. Hold Shift for orthogonal-only walls.",
    keywords: ["draw", "wall", "new wall", "add wall", "shift", "orthogonal", "ortho"],
    anchor: "help-h-walls",
  },
  {
    id: "lib-snap",
    section: "library",
    heading: "Snap and grid settings",
    body: "Adjust snap in the sidebar: OFF, 3_INCH, 6_INCH, or 1_FOOT. Toggle grid visibility too.",
    keywords: ["snap", "grid", "increment", "6 inch", "3 inch", "1 foot", "precision"],
    anchor: "help-h-snap-grid",
  },

  // ─── 3D + Walk + Rooms ────────────────────────────────────────────
  {
    id: "3d-views",
    section: "3d",
    heading: "View modes",
    body: "2D_PLAN is top-down, 3D_VIEW shows rendered scene, SPLIT is side-by-side, LIBRARY browses products.",
    keywords: ["view", "mode", "2d", "3d", "split", "library", "switch view"],
    anchor: "help-h-views",
  },
  {
    id: "3d-orbit",
    section: "3d",
    heading: "Orbit camera",
    body: "Default 3D mode. Drag to rotate around the room, scroll to zoom, right-drag to pan.",
    keywords: ["orbit", "camera", "rotate", "zoom", "pan", "3d navigation"],
    anchor: "help-h-orbit",
  },
  {
    id: "3d-walk",
    section: "3d",
    heading: "Walk mode",
    body: "Press E or click WALK to enter first-person. WASD to move, mouse to look, Escape to release mouse.",
    keywords: ["walk", "walkthrough", "first person", "eye level", "wasd", "fps", "pointer lock"],
    anchor: "help-h-walk",
  },
  {
    id: "3d-collision",
    section: "3d",
    heading: "Wall collision",
    body: "Walls block movement in walk mode. You can't walk through walls.",
    keywords: ["collision", "wall", "block", "walk through walls", "clipping"],
    anchor: "help-h-walk",
  },
  {
    id: "3d-rooms",
    section: "3d",
    heading: "Multi-room projects",
    body: "Add rooms with the + in room tabs. Pick a template. Cycle with Ctrl+Tab or Cmd+Tab.",
    keywords: ["multi-room", "rooms", "add room", "tabs", "templates", "ctrl+tab", "cmd+tab", "cycle"],
    anchor: "help-h-rooms",
  },
  {
    id: "3d-templates",
    section: "3d",
    heading: "Room templates",
    body: "Choose from Living Room, Bedroom, Kitchen, or Blank when adding a new room.",
    keywords: ["template", "preset", "living room", "bedroom", "kitchen", "blank", "starter"],
    anchor: "help-h-rooms",
  },
  {
    id: "3d-export",
    section: "3d",
    heading: "Exporting 3D view",
    body: "Click EXPORT from the toolbar in 3D or split view to save as PNG.",
    keywords: ["export", "3d export", "png", "screenshot", "render", "save image"],
    anchor: "help-h-export",
  },

  // ─── Shortcuts (one entry per shortcut for deep search) ──────────
  ...SHORTCUTS.map((s, i) => ({
    id: `sc-${i}`,
    section: "shortcuts" as HelpSectionId,
    heading: s.action,
    body: `${s.keys.join(" + ")} — ${s.action}${s.context ? ` (${s.context})` : ""}`,
    keywords: [
      ...s.keys.map((k) => k.toLowerCase()),
      s.group.toLowerCase(),
      ...s.action.toLowerCase().split(/\s+/),
    ],
  })),
];
