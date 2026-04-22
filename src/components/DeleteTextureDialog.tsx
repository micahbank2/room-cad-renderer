/**
 * Phase 34 Plan 02 Task 2 — DeleteTextureDialog (STUB — replaced in Task 2).
 *
 * Task 1 (MyTexturesList) needs this component to mount during the
 * "⋮ → Delete opens dialog" test. This minimal stub renders the locked
 * DELETE TEXTURE heading so Task 1's tests can pass. Task 2 replaces it
 * with the full ref-count + event-dispatching implementation.
 */
import React from "react";
import type { UserTexture } from "@/types/userTexture";

export interface DeleteTextureDialogProps {
  open: boolean;
  texture: UserTexture | null;
  onClose: () => void;
  onDeleted?: (id: string) => void;
}

export function DeleteTextureDialog(props: DeleteTextureDialogProps): JSX.Element | null {
  if (!props.open || !props.texture) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-obsidian-deepest/80" onClick={props.onClose} />
      <div className="relative w-[400px] bg-obsidian-mid/90 border border-outline-variant/20 rounded-sm p-6">
        <h2 className="font-mono text-base font-medium uppercase tracking-widest text-text-primary">
          DELETE TEXTURE
        </h2>
      </div>
    </div>
  );
}

export default DeleteTextureDialog;
