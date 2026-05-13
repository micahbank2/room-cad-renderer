/**
 * Phase 79 WIN-PRESETS-01 — Window preset catalog.
 *
 * Per D-09, this is the SINGLE source of truth for residential window
 * sizes. Openings store raw dimensions; the active preset is derived
 * on read via derivePreset(). No field is stored on the Opening type;
 * no snapshot migration is required.
 */

export type WindowPresetId =
  | "small"
  | "standard"
  | "wide"
  | "picture"
  | "bathroom";

export interface WindowPreset {
  readonly id: WindowPresetId;
  readonly label: string;
  readonly width: number;       // feet
  readonly height: number;      // feet
  readonly sillHeight: number;  // feet
}

/**
 * D-01 locked catalog. Iteration order is the chip display order in the
 * WindowPresetSwitcher. Sill heights are intentionally varied — Picture
 * is low-sill (1ft) for living-room views; Bathroom is high-sill (4.5ft)
 * for privacy.
 */
export const WINDOW_PRESETS: readonly WindowPreset[] = [
  { id: "small",    label: "Small",    width: 2, height: 3, sillHeight: 3 },
  { id: "standard", label: "Standard", width: 3, height: 4, sillHeight: 3 },
  { id: "wide",     label: "Wide",     width: 4, height: 5, sillHeight: 3 },
  { id: "picture",  label: "Picture",  width: 6, height: 4, sillHeight: 1 },
  { id: "bathroom", label: "Bathroom", width: 2, height: 4, sillHeight: 4.5 },
] as const;

const EPS = 1e-3;
const near = (a: number, b: number): boolean => Math.abs(a - b) < EPS;

/**
 * Returns the canonical preset id for an opening whose dimensions match
 * a catalog entry exactly (within 1e-3 ft tolerance), or "custom" if no
 * preset matches. Per D-09 this is derived on read — never stored.
 *
 * Note (intentional semantic quirk from CONTEXT.md <specifics>): a user
 * who picks Custom and types 3/4/3 will see "Standard" in the
 * PropertiesPanel label. This is desirable UX — free preset label
 * when dimensions match.
 */
export function derivePreset(opening: {
  width: number;
  height: number;
  sillHeight: number;
}): WindowPresetId | "custom" {
  for (const p of WINDOW_PRESETS) {
    if (
      near(p.width, opening.width) &&
      near(p.height, opening.height) &&
      near(p.sillHeight, opening.sillHeight)
    ) {
      return p.id;
    }
  }
  return "custom";
}
