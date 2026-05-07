/**
 * Phase 34 Plan 02 Task 2 — DeleteTextureDialog.
 *
 * Ref-count confirm dialog per UI-SPEC §3 + locked D-07 copy. Opens from
 * MyTexturesList's ⋮ → Delete menu. On confirm: removes the texture from
 * IDB (via useUserTextures().remove), dispatches the `user-texture-deleted`
 * CustomEvent on window (Plan 03's userTextureCache subscribes to clear its
 * THREE.Texture entry), fires onDeleted, then onClose.
 *
 * Locked copy:
 *   - Header:         "DELETE TEXTURE"
 *   - Body (N === 0): "Delete {NAME}? This texture isn't used by any surface."
 *   - Body (N >= 1):  "Delete {NAME}? {N} surface{s} in this project use it.
 *                      They'll fall back to their base color."
 *   - Discard button: "Discard"
 *   - Confirm button: "Delete Texture" / "Deleting…" while in flight
 *
 * Design system: lucide-react only (D-33), canonical tokens (D-34),
 * useReducedMotion guard on spinner (D-39).
 */
import React, { useCallback, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useUserTextures } from "@/hooks/useUserTextures";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { countTextureRefs } from "@/lib/countTextureRefs";
import { useCADStore } from "@/stores/cadStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui";
import type { UserTexture } from "@/types/userTexture";
import type { CADSnapshot } from "@/types/cad";

export interface DeleteTextureDialogProps {
  open: boolean;
  texture: UserTexture | null;
  onClose: () => void;
  onDeleted?: (id: string) => void;
}

/** Event fired after a texture is successfully removed. Plan 03's
 *  userTextureCache listens for this to invalidate its cached THREE.Texture. */
export const USER_TEXTURE_DELETED_EVENT = "user-texture-deleted";

export function DeleteTextureDialog(props: DeleteTextureDialogProps): JSX.Element | null {
  const { open, texture, onClose, onDeleted } = props;
  const reducedMotion = useReducedMotion();
  const { remove } = useUserTextures();

  // countTextureRefs only reads snapshot.rooms; subscribe to just that slice
  // so the selector returns a stable reference and doesn't trigger React 18's
  // "getSnapshot should be cached" infinite loop.
  const rooms = useCADStore((s: any) => s.rooms);

  const count = useMemo(() => {
    if (!texture) return 0;
    const snapshot = { rooms: rooms ?? {} } as unknown as CADSnapshot;
    return countTextureRefs(snapshot, texture.id);
  }, [rooms, texture]);

  const [deleting, setDeleting] = useState(false);

  // Escape is handled natively by Radix via onOpenChange; manual window listener removed.

  const handleDelete = useCallback(async () => {
    if (!texture || deleting) return;
    setDeleting(true);
    try {
      await remove(texture.id);
      // Plan 03's userTextureCache subscribes to this event to invalidate.
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(USER_TEXTURE_DELETED_EVENT, {
            detail: { id: texture.id },
          }),
        );
      }
      onDeleted?.(texture.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  }, [texture, deleting, remove, onDeleted, onClose]);

  const spinnerClass = reducedMotion ? "size-4" : "size-4 animate-spin";
  const nameUpper = texture?.name.toUpperCase() ?? "";

  return (
    <Dialog open={open && !!texture} onOpenChange={(o) => { if (!o && !deleting) onClose(); }}>
      <DialogContent className="w-[400px] max-w-[400px]">
        {/* Header */}
        <DialogHeader>
          <DialogTitle className="text-base font-medium uppercase tracking-widest">
            DELETE TEXTURE
          </DialogTitle>
        </DialogHeader>

        {/* Body — locked D-07 copy */}
        <div className="py-2">
          {count === 0 ? (
            <p className="font-body text-base text-muted-foreground">
              Delete{" "}
              <span className="text-foreground uppercase">{nameUpper}</span>
              ? This texture isn't used by any surface.
            </p>
          ) : (
            <p className="font-body text-base text-muted-foreground">
              Delete{" "}
              <span className="text-foreground uppercase">{nameUpper}</span>?{" "}
              {count} surface{count === 1 ? "" : "s"} in this project use it.
              They'll fall back to their base color.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-smooth-md px-4 py-1 font-sans text-sm text-muted-foreground hover:text-foreground bg-accent hover:bg-secondary border border-border/50 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: 44 }}
          ><span>Discard</span></button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-smooth-md px-4 py-1 font-sans text-sm text-error bg-accent hover:bg-error/10 border border-error/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ minHeight: 44 }}
          >
            {deleting ? (
              <>
                <Loader2 className={spinnerClass} />
                <span>Deleting…</span>
              </>
            ) : (
              <span>Delete Texture</span>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DeleteTextureDialog;
