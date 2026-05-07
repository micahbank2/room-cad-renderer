/**
 * Phase 67 — MaterialsSection (MAT-ENGINE-01).
 *
 * Collapsible "MATERIALS" group rendered inside ProductLibrary above the
 * existing Products grid (D-06). Phase 70 will lift this into the proper
 * top-level Materials/Assemblies/Products toggle — keeping it as a sub-section
 * of ProductLibrary for now means Phase 70's restructure is a clean move,
 * not a rewrite.
 *
 * Surface:
 *   - Heading row: chevron (open/close) + "MATERIALS" + count badge +
 *     "+ UPLOAD_MATERIAL" CTA on the right.
 *   - Body: grid of MaterialCard. Empty state copy when none exist.
 *   - Hosts UploadMaterialModal in create + edit modes via internal state.
 *
 * Design system:
 *   - D-33: lucide-react icons only (ChevronDown, ChevronRight)
 *   - D-34: canonical spacing (p-2/4, gap-2/4)
 *   - D-39: useReducedMotion guard via UploadMaterialModal (animations
 *     internal to the modal, not the section toggle)
 */
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useMaterials } from "@/hooks/useMaterials";
import { MaterialCard } from "./MaterialCard";
import { UploadMaterialModal } from "./UploadMaterialModal";
import type { Material } from "@/types/material";

export function MaterialsSection(): JSX.Element {
  const { materials } = useMaterials();
  const [expanded, setExpanded] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Material | null>(null);

  const handleMore = (mat: Material) => {
    // Phase 67: ⋮ click directly opens edit modal. Phase 70 will introduce
    // a richer dropdown (edit / delete / apply-to). For now, keep it
    // minimal — confirm-delete via a window.confirm to avoid pulling in
    // a delete-dialog primitive this phase.
    setEditTarget(mat);
  };

  return (
    <div className="flex flex-col gap-2 px-6 pb-2">
      {/* Heading row */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 text-foreground hover:text-foreground transition-colors"
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
          <span className="font-sans text-sm font-medium uppercase tracking-widest">
            MATERIALS
          </span>
          <span className="font-sans text-sm text-muted-foreground/60">
            ({materials.length})
          </span>
        </button>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="font-sans text-sm tracking-widest px-2 py-1 text-foreground border border-ring rounded-sm hover:bg-accent/10 transition-colors"
        >
          + UPLOAD_MATERIAL
        </button>
      </div>

      {/* Body */}
      {expanded && (
        <div className="flex flex-col gap-2">
          {materials.length === 0 ? (
            <p className="font-body text-sm text-muted-foreground px-2 py-4">
              No materials yet — upload one to get started.
            </p>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {materials.map((mat) => (
                <MaterialCard
                  key={mat.id}
                  material={mat}
                  onMore={() => handleMore(mat)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <UploadMaterialModal
        open={uploadOpen}
        mode="create"
        onClose={() => setUploadOpen(false)}
      />
      <UploadMaterialModal
        open={editTarget !== null}
        mode="edit"
        existing={editTarget ?? undefined}
        onClose={() => setEditTarget(null)}
      />
    </div>
  );
}

export default MaterialsSection;
