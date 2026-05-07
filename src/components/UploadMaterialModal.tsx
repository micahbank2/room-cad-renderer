/**
 * Phase 67 — UploadMaterialModal (MAT-ENGINE-01).
 *
 * Dual-mode modal used for both new-upload (mode="create") and catalog-edit
 * (mode="edit") flows. Mirrors UploadTextureModal but with:
 *   - 1 required color drop zone + 2 optional (roughness, reflection)
 *   - 4 optional metadata fields (brand, sku, cost, leadTime) all blank-tolerant
 *   - Locked UI-SPEC §1 Material Copywriting Contract strings
 *   - Toast-on-dedup ("Material already in your library.") vs. toast-on-save
 *
 * Build path (per RESEARCH.md anti-pattern note): NEW modal — do NOT extend
 * UploadTextureModal. The Phase 34 modal is at locked UI-SPEC for textures;
 * adding 2 zones + 4 fields + a mode switch would force every existing
 * texture test to account for new branches.
 *
 * Design system:
 *   - D-33: lucide-react icons only (Upload, X, Loader2)
 *   - D-34: canonical spacing tokens (p-1/2/4/6, gap-1/2/4, rounded-smooth-md/md)
 *   - D-39: useReducedMotion guard on open transition + spinner
 *
 * Pattern #7 (StrictMode-safety): no useEffect mutates a module-level
 * registry. The Escape-key listener uses standard removeEventListener
 * cleanup. Test driver bridge lives in useMaterials.ts (already
 * module-eval-installed); not duplicated here.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Upload, Loader2 } from "lucide-react";
import { useMaterials } from "@/hooks/useMaterials";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { validateInput } from "@/canvas/dimensionEditor";
import { formatFeet } from "@/lib/geometry";
import {
  processTextureFile,
  ProcessTextureError,
} from "@/lib/processTextureFile";
import type { Material } from "@/types/material";

// ---- Locked copy (UI-SPEC §1 Material Copywriting Contract — D-07/D-08/D-39) --
const COPY = {
  headingCreate: "UPLOAD MATERIAL",
  headingEdit: "EDIT MATERIAL",
  ctaCreate: "Upload Material",
  ctaEdit: "Save Changes",
  ctaDiscard: "Discard",
  progressCreate: "Uploading…",
  progressEdit: "Saving Changes…",
  colorLabel: "COLOR_MAP",
  roughnessLabel: "ROUGHNESS_MAP",
  reflectionLabel: "REFLECTION_MAP",
  optionalTag: "OPTIONAL",
  dropInvite: "Drag and drop a photo, or click to browse.",
  tileLabel: "TILE_SIZE",
  tileHelper: "Real-world repeat (e.g. 2'6\")",
  brandLabel: "BRAND",
  brandPlaceholder: "Vendor or maker (optional)",
  skuLabel: "SKU",
  skuPlaceholder: "Product code (optional)",
  costLabel: "COST",
  costPlaceholder: "$5.99/sqft, Quote on request (optional)",
  leadTimeLabel: "LEAD_TIME",
  leadTimePlaceholder: "2–4 weeks, In stock (optional)",
  mimeError: "Only JPEG, PNG, and WebP are supported.",
  decodeError: "This file couldn't be processed. Try a different image.",
  tileError: "Enter a valid size like 2', 1'6\", or 0.5",
  nameError: "Name is required.",
  toastSaved: "Material saved.",
  toastDeduped: "Material already in your library.",
  closeAria: "Close upload dialog",
} as const;

// Sonner is not yet installed. Same toast shim as UploadTextureModal so the
// future swap is a one-line change.
function toastSuccess(msg: string) {
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.info(`[toast] ${msg}`);
  }
}

interface ProcessedMap {
  blob: Blob;
  mimeType: string;
  sha256: string;
  file: File;
  previewUrl: string;
}

export interface UploadMaterialModalProps {
  open: boolean;
  mode: "create" | "edit";
  /** Required when mode="edit" — pre-fills name + tileSizeFt + metadata. */
  existing?: Material;
  onClose: () => void;
  /** Fires with the saved Material id after a successful save. */
  onSaved?: (id: string) => void;
}

export function UploadMaterialModal(
  props: UploadMaterialModalProps,
): JSX.Element | null {
  const { open, mode, existing, onClose, onSaved } = props;
  const reducedMotion = useReducedMotion();
  const { save, update } = useMaterials();

  // ---- Form state ---------------------------------------------------------
  const [name, setName] = useState<string>(() => existing?.name ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [rawTileSize, setRawTileSize] = useState<string>(() =>
    existing ? formatFeet(existing.tileSizeFt) : "2'",
  );
  const [tileSizeError, setTileSizeError] = useState<string | null>(null);

  const [brand, setBrand] = useState(() => existing?.brand ?? "");
  const [sku, setSku] = useState(() => existing?.sku ?? "");
  const [cost, setCost] = useState(() => existing?.cost ?? "");
  const [leadTime, setLeadTime] = useState(() => existing?.leadTime ?? "");

  const [colorMap, setColorMap] = useState<ProcessedMap | null>(null);
  const [roughnessMap, setRoughnessMap] = useState<ProcessedMap | null>(null);
  const [reflectionMap, setReflectionMap] = useState<ProcessedMap | null>(null);

  const [colorError, setColorError] = useState<string | null>(null);
  const [roughnessError, setRoughnessError] = useState<string | null>(null);
  const [reflectionError, setReflectionError] = useState<string | null>(null);

  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);

  const colorInputRef = useRef<HTMLInputElement | null>(null);
  const roughnessInputRef = useRef<HTMLInputElement | null>(null);
  const reflectionInputRef = useRef<HTMLInputElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);

  // Reset transient state when the modal opens.
  useEffect(() => {
    if (!open) return;
    setName(existing?.name ?? "");
    setRawTileSize(existing ? formatFeet(existing.tileSizeFt) : "2'");
    setBrand(existing?.brand ?? "");
    setSku(existing?.sku ?? "");
    setCost(existing?.cost ?? "");
    setLeadTime(existing?.leadTime ?? "");
    setNameError(null);
    setTileSizeError(null);
    setColorError(null);
    setRoughnessError(null);
    setReflectionError(null);
    setProcessing(false);
    setSaving(false);

    // Revoke any leftover preview URLs from a prior open cycle.
    setColorMap((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    setRoughnessMap((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    setReflectionMap((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }, [open, existing]);

  // Edit-mode autoFocus on Name (create mode focuses the color drop zone
  // implicitly via tab order).
  useEffect(() => {
    if (!open) return;
    if (mode !== "edit") return;
    nameRef.current?.focus();
  }, [open, mode]);

  // Escape -> Discard. Pattern #7: matching removeEventListener on cleanup.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Revoke preview object URLs on unmount.
  useEffect(
    () => () => {
      [colorMap, roughnessMap, reflectionMap].forEach((m) => {
        if (m) URL.revokeObjectURL(m.previewUrl);
      });
    },
    // Intentionally only on unmount (matching UploadTextureModal pattern).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ---- Validation --------------------------------------------------------
  const parsedTileSize = useMemo(() => validateInput(rawTileSize), [rawTileSize]);
  const nameTrimmed = name.trim();

  // Note: blank name does NOT disable the CTA — submit() surfaces the
  // "Name is required." inline error on click. Tile-size + color-map are
  // hard preconditions because users can't recover without them.
  const primaryDisabled =
    saving ||
    processing ||
    parsedTileSize === null ||
    (mode === "create" && !colorMap);

  // ---- Per-zone file handlers --------------------------------------------
  const processZone = useCallback(
    async (
      file: File,
      setError: (s: string | null) => void,
      setMap: (m: ProcessedMap | null) => void,
      currentMap: ProcessedMap | null,
    ) => {
      setError(null);
      setProcessing(true);
      try {
        const result = await processTextureFile(file);
        const previewUrl = URL.createObjectURL(result.blob);
        // Revoke prior preview URL for this zone.
        if (currentMap) URL.revokeObjectURL(currentMap.previewUrl);
        setMap({
          blob: result.blob,
          mimeType: result.mimeType,
          sha256: result.sha256,
          file,
          previewUrl,
        });
      } catch (err) {
        if (currentMap) URL.revokeObjectURL(currentMap.previewUrl);
        setMap(null);
        if (err instanceof ProcessTextureError) {
          setError(err.message);
        } else {
          setError(COPY.decodeError);
        }
      } finally {
        setProcessing(false);
      }
    },
    [],
  );

  const handleColorFile = useCallback(
    (f: File) => processZone(f, setColorError, setColorMap, colorMap),
    [processZone, colorMap],
  );
  const handleRoughnessFile = useCallback(
    (f: File) => processZone(f, setRoughnessError, setRoughnessMap, roughnessMap),
    [processZone, roughnessMap],
  );
  const handleReflectionFile = useCallback(
    (f: File) => processZone(f, setReflectionError, setReflectionMap, reflectionMap),
    [processZone, reflectionMap],
  );

  // ---- Submit ------------------------------------------------------------
  const handleTileSizeBlur = useCallback(() => {
    setTileSizeError(validateInput(rawTileSize) === null ? COPY.tileError : null);
  }, [rawTileSize]);

  const submit = useCallback(async () => {
    // Surface name error inline if user clicks submit with blank name.
    if (nameTrimmed.length === 0) {
      setNameError(COPY.nameError);
      return;
    }
    setNameError(null);
    if (parsedTileSize === null) {
      setTileSizeError(COPY.tileError);
      return;
    }

    const tileFt = parsedTileSize;

    if (mode === "create") {
      if (!colorMap) return;
      setSaving(true);
      try {
        const result = await save({
          name: nameTrimmed,
          tileSizeFt: tileFt,
          brand: brand.trim() || undefined,
          sku: sku.trim() || undefined,
          cost: cost.trim() || undefined,
          leadTime: leadTime.trim() || undefined,
          colorFile: colorMap.file,
          roughnessFile: roughnessMap?.file,
          reflectionFile: reflectionMap?.file,
        });
        toastSuccess(result.deduped ? COPY.toastDeduped : COPY.toastSaved);
        onSaved?.(result.id);
        onClose();
      } finally {
        setSaving(false);
      }
    } else {
      if (!existing) return;
      setSaving(true);
      try {
        await update(existing.id, {
          name: nameTrimmed,
          tileSizeFt: tileFt,
          brand: brand.trim() || undefined,
          sku: sku.trim() || undefined,
          cost: cost.trim() || undefined,
          leadTime: leadTime.trim() || undefined,
        });
        toastSuccess(COPY.toastSaved);
        onSaved?.(existing.id);
        onClose();
      } finally {
        setSaving(false);
      }
    }
  }, [
    nameTrimmed,
    parsedTileSize,
    mode,
    colorMap,
    roughnessMap,
    reflectionMap,
    brand,
    sku,
    cost,
    leadTime,
    save,
    update,
    onSaved,
    onClose,
    existing,
  ]);

  if (!open) return null;

  // D-39: skip transform/scale animations under prefers-reduced-motion.
  const surfaceTransition = reducedMotion
    ? ""
    : " transition-opacity duration-150 ease-out";
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
        className={`relative w-[560px] max-h-[90vh] overflow-y-auto bg-popover/90 backdrop-blur-xl border border-border/50 rounded-smooth-md shadow-2xl${surfaceTransition}`}
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
            <div className="flex flex-col gap-4">
              <DropZone
                label={COPY.colorLabel}
                required
                inputRef={colorInputRef}
                processed={colorMap}
                error={colorError}
                onFile={handleColorFile}
                inputProps={{ "data-zone": "color" }}
              />
              <DropZone
                label={COPY.roughnessLabel}
                optional
                inputRef={roughnessInputRef}
                processed={roughnessMap}
                error={roughnessError}
                onFile={handleRoughnessFile}
                inputProps={{ "data-zone": "roughness" }}
              />
              <DropZone
                label={COPY.reflectionLabel}
                optional
                inputRef={reflectionInputRef}
                processed={reflectionMap}
                error={reflectionError}
                onFile={handleReflectionFile}
                inputProps={{ "data-zone": "reflection" }}
              />
            </div>
          )}

          {/* NAME */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="mat-name"
              className="font-sans text-sm font-medium uppercase tracking-wide text-muted-foreground/80"
            >
              NAME
            </label>
            <input
              id="mat-name"
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
              placeholder="e.g. Carrara Marble"
              maxLength={40}
              className="bg-card border border-border/50 rounded-smooth-md px-2 py-1 text-sm font-sans text-foreground w-full placeholder:text-muted-foreground/60"
            />
            {nameError && (
              <p className="font-sans text-sm text-error">{nameError}</p>
            )}
          </div>

          {/* TILE_SIZE */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="mat-tile-size"
              className="font-sans text-sm font-medium uppercase tracking-wide text-muted-foreground/80"
            >
              TILE_SIZE
            </label>
            <p className="font-body text-sm text-muted-foreground/60">{COPY.tileHelper}</p>
            <input
              id="mat-tile-size"
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
              <p className="font-sans text-sm text-error">{tileSizeError}</p>
            )}
          </div>

          {/* BRAND / SKU / COST / LEAD_TIME (all optional) */}
          <MetaField
            id="mat-brand"
            label={COPY.brandLabel}
            placeholder={COPY.brandPlaceholder}
            value={brand}
            onChange={setBrand}
          />
          <MetaField
            id="mat-sku"
            label={COPY.skuLabel}
            placeholder={COPY.skuPlaceholder}
            value={sku}
            onChange={setSku}
          />
          <MetaField
            id="mat-cost"
            label={COPY.costLabel}
            placeholder={COPY.costPlaceholder}
            value={cost}
            onChange={setCost}
          />
          <MetaField
            id="mat-lead-time"
            label={COPY.leadTimeLabel}
            placeholder={COPY.leadTimePlaceholder}
            value={leadTime}
            onChange={setLeadTime}
          />
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
            <span>{COPY.ctaDiscard}</span>
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
                <span>
                  {mode === "create" ? COPY.progressCreate : COPY.progressEdit}
                </span>
              </>
            ) : (
              <span>{mode === "create" ? COPY.ctaCreate : COPY.ctaEdit}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UploadMaterialModal;

// ---- Sub-components -----------------------------------------------------

interface DropZoneProps {
  label: string;
  required?: boolean;
  optional?: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  processed: ProcessedMap | null;
  error: string | null;
  onFile: (file: File) => void;
  inputProps?: Record<string, string>;
}

function DropZone({
  label,
  required,
  optional,
  inputRef,
  processed,
  error,
  onFile,
  inputProps,
}: DropZoneProps): JSX.Element {
  const [dragOver, setDragOver] = useState(false);
  const openPicker = () => inputRef.current?.click();
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
  };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="font-sans text-sm font-medium uppercase tracking-wide text-muted-foreground/80">
          {label}
        </span>
        {required && <span className="text-error font-sans text-sm">*</span>}
        {optional && (
          <span className="font-sans text-sm text-muted-foreground/60 tracking-widest">
            OPTIONAL
          </span>
        )}
      </div>

      {processed ? (
        <div className="flex items-center gap-2">
          <img
            src={processed.previewUrl}
            alt={`${label} preview`}
            className="w-16 h-16 rounded-smooth-md border border-border/50 object-cover"
            style={{ width: 64, height: 64 }}
          />
          <button
            type="button"
            onClick={openPicker}
            className="text-foreground text-sm font-sans hover:text-foreground"
          >
            Change
          </button>
        </div>
      ) : (
        <div
          onClick={openPicker}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`rounded-smooth-md border-2 border-dashed p-4 flex flex-col items-center gap-1 cursor-pointer transition-colors ${
            dragOver
              ? "border-accent bg-accent/5"
              : "border-border/40 bg-card"
          }`}
        >
          <Upload
            className={`size-4 ${dragOver ? "text-foreground" : "text-muted-foreground/80"}`}
          />
          <p className="font-body text-sm text-muted-foreground">
            Drag and drop a photo, or click to browse.
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onInputChange}
        className="hidden"
        {...inputProps}
      />

      {error && <p className="font-sans text-sm text-error">{error}</p>}
    </div>
  );
}

interface MetaFieldProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}

function MetaField({
  id,
  label,
  placeholder,
  value,
  onChange,
}: MetaFieldProps): JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="font-sans text-sm font-medium uppercase tracking-wide text-muted-foreground/80"
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-card border border-border/50 rounded-smooth-md px-2 py-1 text-sm font-sans text-foreground w-full placeholder:text-muted-foreground/60"
      />
    </div>
  );
}
