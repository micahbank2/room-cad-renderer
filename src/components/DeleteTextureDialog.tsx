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
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useUserTextures } from "@/hooks/useUserTextures";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { countTextureRefs } from "@/lib/countTextureRefs";
import { useCADStore } from "@/stores/cadStore";
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

  // Escape = Discard; Enter = confirm when not deleting.
  useEffect(() => {
    if (!open || !texture) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, texture, onClose]);

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

  if (!open || !texture) return null;

  const spinnerClass = reducedMotion ? "size-4" : "size-4 animate-spin";
  const nameUpper = texture.name.toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={deleting ? undefined : onClose}
      />

      {/* Surface */}
      <div
        className="relative w-[400px] bg-popover/90 backdrop-blur-xl border border-border/50 rounded-sm shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-6 pb-4">
          <h2 className="font-mono text-base font-medium uppercase tracking-widest text-foreground">
            DELETE TEXTURE
          </h2>
        </div>

        {/* Body — locked D-07 copy */}
        <div className="px-6 pb-4">
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
        <div className="flex justify-end gap-2 p-6 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-sm px-4 py-1 font-mono text-sm text-muted-foreground hover:text-foreground bg-accent hover:bg-secondary border border-border/50 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: 44 }}
          ><span>Discard</span></button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-sm px-4 py-1 font-mono text-sm text-error bg-accent hover:bg-error/10 border border-error/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
      </div>
    </div>
  );
}

export default DeleteTextureDialog;
