import * as THREE from "three";

export type TextureChannel = "albedo" | "normal" | "roughness";

/** Single source of truth for PBR color-space assignment (D-18 / MUST-CS).
 *  Mutates and returns the same texture reference. */
export function applyColorSpace(
  tex: THREE.Texture,
  channel: TextureChannel
): THREE.Texture {
  switch (channel) {
    case "albedo":
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    case "normal":
    case "roughness":
      tex.colorSpace = THREE.NoColorSpace;
      return tex;
    default: {
      const _exhaustive: never = channel;
      throw new Error(`applyColorSpace: unknown channel "${_exhaustive}"`);
    }
  }
}
