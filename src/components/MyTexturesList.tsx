/**
 * Phase 34 Plan 02 Task 1 — MyTexturesList.
 *
 * Shared MY TEXTURES grid + upload tile + per-card ⋮ menu.
 * Consumed by FloorMaterialPicker, SurfaceMaterialPicker (ceiling), and
 * WallSurfacePanel as the body of their MY TEXTURES category tab.
 *
 * Locked copy (UI-SPEC §2):
 *   Empty heading:    "NO CUSTOM TEXTURES"
 *   Empty body:       "Upload a photo of a surface to use it on walls, floors, and ceilings."
 *   Upload slot:      "UPLOAD"
 *   ⋮ menu items:     "Edit" / "Delete"
 *
 * Design system:
 *   - D-33: lucide-react icons only (Plus, MoreHorizontal)
 *   - D-34: canonical spacing tokens (grid grid-cols-3 gap-4 p-4)
 *   - D-39: useReducedMotion guard on skeleton animate-pulse
 *   - Icon-only ⋮ button carries aria-label="Texture options"
 *
 * ObjectURL lifecycle: create-on-mount per-texture via useMemo Map keyed by
 * texture id; effect tracks list and revokes URLs for textures removed from
 * the list. Also revokes all on unmount.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, MoreHorizontal } from "lucide-react";
import { useUserTextures } from "@/hooks/useUserTextures";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { formatFeet } from "@/lib/geometry";
import type { UserTexture } from "@/types/userTexture";
import { UploadTextureModal } from "@/components/UploadTextureModal";
import { DeleteTextureDialog } from "@/components/DeleteTextureDialog";

export interface MyTexturesListProps {
  /** When set, the matching texture card renders with ring-accent selected state. */
  selectedId?: string;
  /** Called when Jessica clicks a texture card. Wired by each picker host
   *  to the appropriate cadStore action (setFloorMaterial / updateCeiling /
   *  wallpaper-side action). */
  onSelect: (id: string, tileSizeFt: number) => void;
}

export function MyTexturesList({ selectedId, onSelect }: MyTexturesListProps): JSX.Element {
  const { textures, loading } = useUserTextures();
  const reducedMotion = useReducedMotion();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserTexture | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserTexture | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // ObjectURL cache: id -> blob URL. Rebuilt when textures change; stale
  // entries are revoked. All revoked on unmount.
  const urlCacheRef = useRef<Map<string, string>>(new Map());
  const [urlVersion, setUrlVersion] = useState(0);

  useEffect(() => {
    const cache = urlCacheRef.current;
    const liveIds = new Set(textures.map((t) => t.id));
    // Revoke URLs for textures no longer in the list.
    for (const [id, url] of cache.entries()) {
      if (!liveIds.has(id)) {
        URL.revokeObjectURL(url);
        cache.delete(id);
      }
    }
    // Create URLs for new textures.
    let added = false;
    for (const t of textures) {
      if (!cache.has(t.id)) {
        cache.set(t.id, URL.createObjectURL(t.blob));
        added = true;
      }
    }
    if (added) setUrlVersion((v) => v + 1);
  }, [textures]);

  useEffect(
    () => () => {
      // Revoke all on unmount.
      const cache = urlCacheRef.current;
      for (const url of cache.values()) URL.revokeObjectURL(url);
      cache.clear();
    },
    [],
  );

  // Close ⋮ menu when clicking outside (simple window-listener pattern).
  useEffect(() => {
    if (menuOpenId === null) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-texture-menu]")) return;
      setMenuOpenId(null);
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [menuOpenId]);

  const handleOpenUpload = useCallback(() => {
    setUploadOpen(true);
  }, []);

  const handleMenuToggle = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpenId((cur) => (cur === id ? null : id));
  }, []);

  const handleEdit = useCallback((t: UserTexture) => {
    setEditTarget(t);
    setMenuOpenId(null);
  }, []);

  const handleDelete = useCallback((t: UserTexture) => {
    setDeleteTarget(t);
    setMenuOpenId(null);
  }, []);

  const skeletonBg = reducedMotion
    ? "bg-secondary"
    : "bg-secondary animate-pulse";

  // ---- Render ----------------------------------------------------------

  let body: React.ReactNode;
  if (loading) {
    body = (
      <div className="grid grid-cols-3 gap-4 p-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            data-testid="texture-skeleton"
            className={`${skeletonBg} rounded-md aspect-square`}
          />
        ))}
      </div>
    );
  } else if (textures.length === 0) {
    body = (
      <div className="py-8 px-4 text-center flex flex-col items-center gap-4">
        <h3 className="font-sans text-base font-medium uppercase tracking-widest text-muted-foreground/80">
          NO CUSTOM TEXTURES
        </h3>
        <p className="font-body text-base text-muted-foreground max-w-xs">
          Upload a photo of a surface to use it on walls, floors, and ceilings.
        </p>
        <UploadSlot onClick={handleOpenUpload} />
      </div>
    );
  } else {
    body = (
      <div className="grid grid-cols-3 gap-4 p-4">
        {textures.map((t) => (
          <TextureCard
            key={t.id}
            texture={t}
            thumbnailUrl={urlCacheRef.current.get(t.id)}
            selected={t.id === selectedId}
            menuOpen={menuOpenId === t.id}
            onSelect={() => onSelect(t.id, t.tileSizeFt)}
            onMenuToggle={(e) => handleMenuToggle(t.id, e)}
            onEdit={() => handleEdit(t)}
            onDelete={() => handleDelete(t)}
          />
        ))}
        <UploadSlot onClick={handleOpenUpload} />
      </div>
    );
  }

  // Force consumer re-render when URL cache grows (thumbnail fill-in).
  void urlVersion;

  return (
    <>
      {body}
      <UploadTextureModal
        open={uploadOpen}
        mode="create"
        onClose={() => setUploadOpen(false)}
      />
      <UploadTextureModal
        open={editTarget !== null}
        mode="edit"
        existing={editTarget ?? undefined}
        onClose={() => setEditTarget(null)}
      />
      <DeleteTextureDialog
        open={deleteTarget !== null}
        texture={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}

// ---- Sub-components ---------------------------------------------------

interface TextureCardProps {
  texture: UserTexture;
  thumbnailUrl: string | undefined;
  selected: boolean;
  menuOpen: boolean;
  onSelect: () => void;
  onMenuToggle: (e: React.MouseEvent) => void;
  onEdit: () => void;
  onDelete: () => void;
}

function TextureCard({
  texture,
  thumbnailUrl,
  selected,
  menuOpen,
  onSelect,
  onMenuToggle,
  onEdit,
  onDelete,
}: TextureCardProps): JSX.Element {
  const base =
    "group relative border border-border/50 rounded-md cursor-pointer transition-colors flex flex-col p-2";
  const state = selected
    ? "border-accent/60 bg-accent/10 ring-2 ring-accent ring-offset-1 ring-offset-card"
    : "bg-card hover:bg-accent";

  return (
    <div
      data-testid={`texture-card-${texture.id}`}
      className={`${base} ${state}`}
      onClick={onSelect}
    >
      {/* ⋮ options button — icon-only, aria-labeled for a11y. */}
      <div data-texture-menu className="absolute top-1 right-1">
        <button
          type="button"
          aria-label="Texture options"
          onClick={onMenuToggle}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/60 hover:text-foreground"
          style={{ minHeight: 44, minWidth: 44, padding: 4 }}
        >
          <MoreHorizontal className="size-4" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-6 z-10 bg-secondary border border-border/50 rounded-smooth-md shadow-lg">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="block w-full text-left px-2 py-1 font-sans text-sm text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
            ><span>Edit</span></button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="block w-full text-left px-2 py-1 font-sans text-sm text-error hover:bg-accent cursor-pointer"
            ><span>Delete</span></button>
          </div>
        )}
      </div>

      {/* Thumbnail */}
      <div className="aspect-square rounded-smooth-md bg-accent overflow-hidden">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={texture.name} className="w-full h-full object-cover" />
        ) : null}
      </div>

      {/* Name + tile size */}
      <div className="mt-2 flex flex-col gap-1">
        <span className="font-sans text-sm font-medium uppercase text-foreground truncate">
          {texture.name.toUpperCase()}
        </span>
        <span className="font-sans text-sm text-foreground">
          {formatFeet(texture.tileSizeFt)}
        </span>
      </div>
    </div>
  );
}

interface UploadSlotProps {
  onClick: () => void;
}

function UploadSlot({ onClick }: UploadSlotProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="aspect-square bg-card border-2 border-dashed border-border/60 rounded-md flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-accent/50 transition-colors"
    >
      <Plus className="size-5 text-muted-foreground/60" />
      <span className="font-sans text-sm text-muted-foreground/60">UPLOAD</span>
    </button>
  );
}

export default MyTexturesList;
