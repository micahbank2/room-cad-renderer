/**
 * Phase 34 — UploadTextureModal (LIB-06/07).
 *
 * Dual-mode modal used for both new-upload (mode="create") and catalog-edit
 * (mode="edit") flows per D-11. The create flow runs a File through
 * `processTextureFile` (MIME gate + 2048px downscale + SHA-256) and persists
 * via `useUserTextures().save(...)`. The edit flow only mutates metadata
 * (name + tileSizeFt) via `useUserTextures().update(id, {...})`.
 *
 * Copy source-of-truth: 34-UI-SPEC.md §1 Copywriting Contract. Every string
 * in this file is load-bearing — grep-verified at plan acceptance.
 *
 * Design system: D-33 (lucide-react icons only, no material-symbols),
 * D-34 (canonical spacing tokens only), D-39 (useReducedMotion() guard on
 * open-fade + spinner).
 *
 * Test driver (gated by import.meta.env.MODE === "test"):
 *   `window.__driveTextureUpload(file, name, tileSizeFt)` runs the full
 *   persistence path (processTextureFile + saveUserTextureWithDedup) without
 *   mounting the modal — happy-dom cannot simulate a real file-input click
 *   round-trip cleanly, so tests exercise the modal UI separately from
 *   end-to-end persistence via this bridge.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Upload, Loader2 } from "lucide-react";
import { useUserTextures } from "@/hooks/useUserTextures";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { validateInput } from "@/canvas/dimensionEditor";
import { formatFeet } from "@/lib/geometry";
import {
  processTextureFile,
  ProcessTextureError,
  type ProcessTextureResult,
} from "@/lib/processTextureFile";
import type { UserTexture } from "@/types/userTexture";

// ---- Locked copy (UI-SPEC §Copywriting Contract) --------------------------
const COPY = {
  headingCreate: "UPLOAD TEXTURE",
  headingEdit: "EDIT TEXTURE",
  ctaCreate: "Upload Texture",
  ctaEdit: "Save Changes",
  ctaDiscard: "Discard",
  progressCreate: "Uploading\u2026",
  progressEdit: "Saving Changes\u2026",
  dropInvite: "Drag and drop a photo, or click to browse.",
  tileHelper: "Real-world repeat (e.g. 2'6\")",
  mimeError: "Only JPEG, PNG, and WebP are supported.",
  decodeError: "This file couldn't be processed. Try a different image.",
  tileError: "Enter a valid size like 2', 1'6\", or 0.5",
  nameError: "Name is required.",
  toastSaved: "Texture saved.",
  closeAria: "Close upload dialog",
} as const;

// Sonner is not yet installed in this project. Surface a minimal toast shim so
// swapping to the real `sonner` import later is a one-line change. Keeps the
// locked success copy centralized at the call site.
function toastSuccess(msg: string) {
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.info(`[toast] ${msg}`);
  }
}

export interface UploadTextureModalProps {
  open: boolean;
  mode: "create" | "edit";
  /** Required when mode="edit" — pre-fills name + tileSizeFt. */
  existing?: UserTexture;
  onClose: () => void;
  /** Fires with the saved UserTexture id after a successful save. */
  onSaved?: (id: string) => void;
}

export function UploadTextureModal(props: UploadTextureModalProps): JSX.Element | null {
  const { open, mode, existing, onClose, onSaved } = props;
  const reducedMotion = useReducedMotion();
  const { save, update } = useUserTextures();

  // ---- Form state ---------------------------------------------------------
  const [name, setName] = useState<string>(() => existing?.name ?? "");
  const [rawTileSize, setRawTileSize] = useState<string>(() =>
    existing ? formatFeet(existing.tileSizeFt) : "2'",
  );
  const [tileSizeError, setTileSizeError] = useState<string | null>(null);
  const [pipelineResult, setPipelineResult] = useState<ProcessTextureResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);

  // Reset transient state when the modal opens so stale fileError /
  // pipelineResult from a prior session never leaks across open/close cycles.
  useEffect(() => {
    if (!open) return;
    setName(existing?.name ?? "");
    setRawTileSize(existing ? formatFeet(existing.tileSizeFt) : "2'");
    setTileSizeError(null);
    setPipelineResult(null);
    setFileError(null);
    setProcessing(false);
    setSaving(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    // `previewUrl` intentionally excluded to avoid a revoke/create loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing]);

  // Edit-mode autoFocus (create mode's focal point is the drop zone).
  useEffect(() => {
    if (!open) return;
    if (mode !== "edit") return;
    nameRef.current?.focus();
  }, [open, mode]);

  // Escape key -> Discard.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Revoke preview object URL on unmount.
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  // ---- Validation --------------------------------------------------------
  const parsedTileSize = useMemo(() => validateInput(rawTileSize), [rawTileSize]);
  const nameTrimmed = name.trim();

  const unchangedInEditMode =
    mode === "edit" &&
    existing !== undefined &&
    nameTrimmed === existing.name &&
    parsedTileSize !== null &&
    Math.abs(parsedTileSize - existing.tileSizeFt) < 1e-6;

  const primaryDisabled =
    saving ||
    processing ||
    nameTrimmed.length === 0 ||
    parsedTileSize === null ||
    (mode === "create" && !pipelineResult) ||
    unchangedInEditMode;

  // ---- File selection -----------------------------------------------------
  const handleFile = useCallback(async (file: File) => {
    setFileError(null);
    setProcessing(true);
    try {
      const result = await processTextureFile(file);
      setPipelineResult(result);
      // Replace any prior preview URL.
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(result.blob);
      });
    } catch (err) {
      setPipelineResult(null);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      if (err instanceof ProcessTextureError) {
        setFileError(err.message);
      } else {
        setFileError(COPY.decodeError);
      }
    } finally {
      setProcessing(false);
    }
  }, []);

  const openFilePicker = useCallback(() => {
    fileRef.current?.click();
  }, []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) void handleFile(f);
    },
    [handleFile],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) void handleFile(f);
    },
    [handleFile],
  );

  // ---- Submit handlers ----------------------------------------------------
  const handleTileSizeBlur = useCallback(() => {
    setTileSizeError(validateInput(rawTileSize) === null ? COPY.tileError : null);
  }, [rawTileSize]);

  const submit = useCallback(async () => {
    if (primaryDisabled) return;
    const tileFt = parsedTileSize!;
    if (mode === "create") {
      if (!pipelineResult) return;
      setSaving(true);
      try {
        const id = await save(
          {
            name: nameTrimmed,
            tileSizeFt: tileFt,
            blob: pipelineResult.blob,
            mimeType: pipelineResult.mimeType,
          },
          pipelineResult.sha256,
        );
        toastSuccess(COPY.toastSaved);
        onSaved?.(id);
        onClose();
      } finally {
        setSaving(false);
      }
    } else {
      if (!existing) return;
      setSaving(true);
      try {
        await update(existing.id, { name: nameTrimmed, tileSizeFt: tileFt });
        toastSuccess(COPY.toastSaved);
        onSaved?.(existing.id);
        onClose();
      } finally {
        setSaving(false);
      }
    }
  }, [
    primaryDisabled,
    parsedTileSize,
    mode,
    pipelineResult,
    save,
    nameTrimmed,
    onSaved,
    onClose,
    existing,
    update,
  ]);

  if (!open) return null;

  // D-39: Skip open/close + spinner motion under prefers-reduced-motion.
  const surfaceTransition = reducedMotion
    ? ""
    : " transition-[opacity,transform] duration-150 ease-out";
  const spinnerClass = reducedMotion ? "size-4" : "size-4 animate-spin";

  const heading = mode === "create" ? COPY.headingCreate : COPY.headingEdit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop — click = Discard */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Surface */}
      <div
        className={`relative w-[520px] bg-popover/90 backdrop-blur-xl border border-border/50 rounded-smooth-md shadow-2xl${surfaceTransition}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="font-sans text-base font-medium uppercase tracking-widest text-foreground">
            {heading}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close upload dialog"
            className="text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 pt-0 flex flex-col gap-4">
          {mode === "create" && (
            <>
              {pipelineResult && previewUrl ? (
                <div className="flex flex-col gap-2">
                  <img
                    src={previewUrl}
                    alt="Texture preview"
                    className="w-40 h-30 rounded-smooth-md border border-border/50 object-cover"
                    style={{ width: 160, height: 120 }}
                  />
                  <button
                    type="button"
                    onClick={openFilePicker}
                    className="text-foreground text-[11px] font-sans text-left hover:text-foreground"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div
                  onClick={openFilePicker}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  className={`rounded-md border-2 border-dashed p-8 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
                    dragOver
                      ? "border-accent bg-accent/5"
                      : "border-border/40 bg-card"
                  }`}
                >
                  <Upload
                    className={`size-6 ${dragOver ? "text-foreground" : "text-muted-foreground/80"}`}
                  />
                  <p className="font-body text-sm text-muted-foreground">
                    {COPY.dropInvite}
                  </p>
                </div>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onInputChange}
                className="hidden"
              />

              {fileError && (
                <p className="font-sans text-[11px] text-error">{fileError}</p>
              )}
            </>
          )}

          {/* Name field */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="utex-name"
              className={`font-sans text-sm font-medium uppercase tracking-wide ${
                mode === "edit" ? "text-foreground" : "text-muted-foreground/80"
              }`}
            >
              NAME
            </label>
            <input
              id="utex-name"
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Oak Floor"
              maxLength={40}
              autoFocus={mode === "edit"}
              className="bg-card border border-border/50 rounded-smooth-md px-2 py-1 text-sm font-sans text-foreground w-full placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Tile size field */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="utex-tile-size"
              className="font-sans text-sm font-medium uppercase tracking-wide text-muted-foreground/80"
            >
              TILE SIZE
            </label>
            <p className="font-body text-[11px] text-muted-foreground/60">
              {COPY.tileHelper}
            </p>
            <input
              id="utex-tile-size"
              type="text"
              value={rawTileSize}
              onChange={(e) => {
                setRawTileSize(e.target.value);
                if (tileSizeError) setTileSizeError(null);
              }}
              onBlur={handleTileSizeBlur}
              placeholder="2'"
              className={`bg-card border rounded-smooth-md px-2 py-1 text-sm font-sans text-foreground w-full placeholder:text-muted-foreground/60 ${
                tileSizeError ? "border-error" : "border-border/50"
              }`}
            />
            {tileSizeError && (
              <p className="font-sans text-[11px] text-error">{tileSizeError}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-6 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-smooth-md px-4 py-1 font-sans text-sm text-muted-foreground hover:text-foreground bg-accent hover:bg-secondary border border-border/50 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: 44 }}
          >
            <span>Discard</span>
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={primaryDisabled}
            className="rounded-smooth-md px-4 py-1 font-sans text-sm text-foreground bg-accent hover:bg-accent/90 border-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ minHeight: 44 }}
          >
            {saving || processing ? (
              <>
                <Loader2 className={spinnerClass} />
                {mode === "create" ? (
                  <span>Uploading…</span>
                ) : (
                  <span>Saving Changes…</span>
                )}
              </>
            ) : mode === "create" ? (
              <span>Upload Texture</span>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UploadTextureModal;

// __driveTextureUpload now lives in src/test-utils/textureDrivers.ts and is
// installed unconditionally from src/main.tsx. The previous module-eval install
// in this file required UploadTextureModal to be transitively imported by an
// always-mounted UI surface. After Phase 68-06 removed the wallpaper "MY
// TEXTURES" tab (and with it the WallSurfacePanel → MyTexturesList →
// UploadTextureModal import chain), the driver vanished from the bundle in
// production, breaking three legacy e2e specs. Decoupling driver registration
// from UI mount is the architectural fix.
