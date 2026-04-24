/**
 * Camera Presets — Phase 35 CAM-01
 *
 * Pure preset-pose module. Exports:
 *  - PresetId / CameraPose / PresetMeta types
 *  - PRESETS: single-source-of-truth metadata array (id, hotkey, label, lucide icon name)
 *  - getPresetPose(presetId, room): pure function returning { position, target }
 *
 * Coordinate system: R3F world coords — Y is up, X = floorplan x, Z = floorplan y.
 * Room origin is (0, 0, 0); far corner is (room.width, *, room.length).
 *
 * Preset pose contracts:
 *
 *  - "eye-level": camera at corner (0, 5.5, 0) looking toward room center at
 *    eye-height (halfW, 5.5, halfL). Corner-stand + center-look is the planner's
 *    concrete resolution of CAM-01's "eye-level looking toward room center."
 *    FLAGGED FOR HUMAN-UAT: Jessica may prefer facing the longest wall or the
 *    door; revisit if human review requests a different framing.
 *
 *  - "top-down": straight-down orthographic-style view from Y = 1.5 × max(width, length)
 *    centered over the room, looking at (halfW, 0, halfL).
 *
 *  - "three-quarter": LOCKED TO THE LITERAL v1.7.5 BASELINE per Phase 35 CONTEXT D-05
 *    (see .planning/phases/35-camera-presets/35-CONTEXT.md §D-05). Pose is
 *    `[halfW + 15, 12, halfL + 15]` / `[halfW, halfL / 2, halfL]`. DO NOT derive
 *    geometrically — users have a mental model of "how 3D looks by default" and
 *    rebasing silently changes the look without being asked.
 *
 *  - "corner": camera at far room corner (width, wallHeight - 0.5, length) looking
 *    at opposite corner (0, wallHeight - 0.5, 0). Provides a full-room oblique view.
 */

export type PresetId = "eye-level" | "top-down" | "three-quarter" | "corner";

export type CameraPose = {
  position: [number, number, number];
  target: [number, number, number];
};

export type PresetMeta = {
  id: PresetId;
  /** Bare hotkey — Phase 35 CAM-01 (`1`/`2`/`3`/`4`). */
  key: "1" | "2" | "3" | "4";
  /** Mixed-case per Phase 33 D-03 — used for button aria-label + tooltip. */
  label: string;
  /** lucide-react icon component name (Phase 33 D-33). */
  iconName: "PersonStanding" | "Map" | "Box" | "CornerDownRight";
};

/**
 * Single source of truth for preset metadata. Toolbar iterates over this to
 * render buttons; App.tsx hotkey handler matches `e.key` against `key` here;
 * Plan 35-02 test drivers read from this list. Adding a new preset requires
 * one edit: append to this array + add a `case` in `getPresetPose`.
 */
export const PRESETS: readonly PresetMeta[] = [
  { id: "eye-level", key: "1", label: "Eye level", iconName: "PersonStanding" },
  { id: "top-down", key: "2", label: "Top down", iconName: "Map" },
  { id: "three-quarter", key: "3", label: "3/4 view", iconName: "Box" },
  { id: "corner", key: "4", label: "Corner", iconName: "CornerDownRight" },
];

/**
 * Pure function — given a preset id + room dimensions, return the R3F camera pose.
 * No React, no THREE, no side effects.
 */
export function getPresetPose(
  presetId: PresetId,
  room: { width: number; length: number; wallHeight: number },
): CameraPose {
  const halfW = room.width / 2;
  const halfL = room.length / 2;
  const H = room.wallHeight;

  switch (presetId) {
    case "eye-level":
      // CAM-01: stand at room corner (0, 5.5, 0), look toward center at eye-height.
      // HUMAN-UAT flag: corner-stand framing may need revision per Jessica's preference.
      return {
        position: [0, 5.5, 0],
        target: [halfW, 5.5, halfL],
      };

    case "top-down":
      // CAM-01: Y = 1.5 × max(roomWidth, roomLength); look straight down at center.
      return {
        position: [halfW, 1.5 * Math.max(room.width, room.length), halfL],
        target: [halfW, 0, halfL],
      };

    case "three-quarter":
      // D-05 LITERAL v1.7.5 BASELINE — do NOT derive geometrically.
      return {
        position: [halfW + 15, 12, halfL + 15],
        target: [halfW, halfL / 2, halfL],
      };

    case "corner":
      // CAM-01: far corner (width, H - 0.5, length) looking at origin corner.
      return {
        position: [room.width, H - 0.5, room.length],
        target: [0, H - 0.5, 0],
      };
  }
}
