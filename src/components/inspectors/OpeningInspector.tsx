// src/components/inspectors/OpeningInspector.tsx
//
// Phase 82 Plan 82-03 (IA-05) — opening sub-inspector.
// Mounted by WallInspector when uiStore.selectedOpeningId matches an
// opening on the currently-selected wall. Shows a "← Back to wall"
// breadcrumb (clears selectedOpeningId) and a per-opening-type tab set:
//
//   Window: Preset / Dimensions / Position (Preset default)
//   Door / Archway / Passthrough / Niche: Type / Dimensions / Position
//
// Phase 79 invariants (verbatim — DO NOT MODIFY):
//   - D-07 single-undo: applyPreset → ONE update(wall.id, opening.id, ...)
//     call → exactly one past.length increment per chip click.
//   - D-08 derive-on-read: derivePreset(opening) on every render; no
//     presetId field on Opening type.
//   - D-06 data-testids preserved verbatim from the Phase 79 chip row
//     (opening-preset-label, opening-preset-chip-{id}-{presetId},
//     opening-preset-chip-{id}-custom).

import { useState } from "react";
import type { WallSegment, Opening } from "@/types/cad";
import { clampNicheDepth } from "@/types/cad";
import { useCADStore } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import {
  WINDOW_PRESETS,
  derivePreset,
  type WindowPresetId,
} from "@/lib/windowPresets";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/Tabs";
import { NumericRow } from "@/components/PropertiesPanel.OpeningSection";
import { cn } from "@/lib/cn";

interface Props {
  wall: WallSegment;
  opening: Opening;
}

type WindowTab = "preset" | "dimensions" | "position";
type OtherTab = "type" | "dimensions" | "position";

export function OpeningInspector({ wall, opening }: Props) {
  const update = useCADStore((s) => s.updateOpening);
  const updateNoHistory = useCADStore((s) => s.updateOpeningNoHistory);
  const setSelectedOpeningId = useUIStore((s) => s.setSelectedOpeningId);

  const isWindow = opening.type === "window";
  const [activeTab, setActiveTab] = useState<WindowTab | OtherTab>(
    isWindow ? "preset" : "type",
  );

  // D-09 mixed-case for chrome (Title Case here).
  const kindLabel = opening.type.toUpperCase();

  return (
    // D-03: key forces a fresh mount + default activeTab on opening swap.
    <div className="space-y-2" key={opening.id}>
      <button
        type="button"
        data-testid="opening-back-to-wall"
        onClick={() => setSelectedOpeningId(null)}
        className="font-sans text-xs text-muted-foreground hover:text-foreground"
      >
        ← Back to wall
      </button>

      <div className="font-sans text-xs text-foreground">
        {kindLabel} @ {opening.offset.toFixed(1)}'
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as WindowTab | OtherTab)}
      >
        <TabsList>
          {isWindow ? (
            <>
              <TabsTrigger value="preset">Preset</TabsTrigger>
              <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
              <TabsTrigger value="position">Position</TabsTrigger>
            </>
          ) : (
            <>
              <TabsTrigger value="type">Type</TabsTrigger>
              <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
              <TabsTrigger value="position">Position</TabsTrigger>
            </>
          )}
        </TabsList>

        {isWindow && (
          <TabsContent value="preset">
            <WindowPresetBody wall={wall} opening={opening} update={update} />
          </TabsContent>
        )}

        {!isWindow && (
          <TabsContent value="type">
            <div className="space-y-1">
              <p className="font-sans text-xs text-muted-foreground">
                Type:{" "}
                {opening.type.charAt(0).toUpperCase() + opening.type.slice(1)}
              </p>
              {/* Future: hinge side / swing direction for doors. */}
            </div>
          </TabsContent>
        )}

        <TabsContent value="dimensions">
          <div className="space-y-1">
            <NumericRow
              label="Width"
              unit="ft"
              value={opening.width}
              onPreview={(v) =>
                updateNoHistory(wall.id, opening.id, { width: v })
              }
              onCommit={(v) => update(wall.id, opening.id, { width: v })}
            />
            <NumericRow
              label="Height"
              unit="ft"
              value={opening.height}
              placeholder={
                opening.type === "passthrough" ? "Wall height" : undefined
              }
              onPreview={(v) =>
                updateNoHistory(wall.id, opening.id, { height: v })
              }
              onCommit={(v) => update(wall.id, opening.id, { height: v })}
            />
            <NumericRow
              label="Sill"
              unit="ft"
              value={opening.sillHeight}
              onPreview={(v) =>
                updateNoHistory(wall.id, opening.id, { sillHeight: v })
              }
              onCommit={(v) => update(wall.id, opening.id, { sillHeight: v })}
            />
          </div>
        </TabsContent>

        <TabsContent value="position">
          <div className="space-y-1">
            <NumericRow
              label="Offset"
              unit="ft"
              value={opening.offset}
              onPreview={(v) =>
                updateNoHistory(wall.id, opening.id, { offset: v })
              }
              onCommit={(v) => update(wall.id, opening.id, { offset: v })}
            />
            {opening.type === "niche" && (
              <NumericRow
                label="Depth"
                unit="in"
                value={(opening.depthFt ?? 0.5) * 12}
                onPreview={(inches) => {
                  const ft = inches / 12;
                  updateNoHistory(wall.id, opening.id, { depthFt: ft });
                }}
                onCommit={(inches) => {
                  const ft = clampNicheDepth(inches / 12, wall.thickness);
                  update(wall.id, opening.id, { depthFt: ft });
                }}
                dataTestId={`opening-depth-${opening.id}`}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * VERBATIM lift from PropertiesPanel.OpeningSection.tsx WindowPresetRow
 * (L87–163). D-07 / D-08 invariants preserved by NOT EDITING this body.
 *
 * Function signature mirrors the original — `update` is passed in so we
 * can reuse the same store action without re-subscribing.
 */
function WindowPresetBody({
  wall,
  opening,
  update,
}: {
  wall: WallSegment;
  opening: Opening;
  update: (
    wallId: string,
    openingId: string,
    changes: Partial<Opening>,
  ) => void;
}) {
  const derivedId: WindowPresetId | "custom" = derivePreset({
    width: opening.width,
    height: opening.height,
    sillHeight: opening.sillHeight,
  });
  const derivedLabel =
    derivedId === "custom"
      ? "Custom"
      : (WINDOW_PRESETS.find((p) => p.id === derivedId)?.label ?? "Custom");

  function applyPreset(p: {
    width: number;
    height: number;
    sillHeight: number;
  }) {
    update(wall.id, opening.id, {
      width: p.width,
      height: p.height,
      sillHeight: p.sillHeight,
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        data-testid="opening-preset-label"
        className="text-sm font-sans text-muted-foreground"
      >
        {`Preset: ${derivedLabel}`}
      </div>
      <div className="flex flex-wrap gap-1">
        {WINDOW_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            data-testid={`opening-preset-chip-${opening.id}-${p.id}`}
            onClick={() => applyPreset(p)}
            className={cn(
              "px-2 py-0.5 text-xs font-sans rounded-smooth-md border transition-colors",
              derivedId === p.id
                ? "bg-accent/10 ring-1 ring-accent/40 border-transparent text-foreground"
                : "border-border hover:bg-accent text-muted-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
        {/* Custom chip — no-op on click (Custom = "use current values"); the
            label still highlights this chip when dims don't match a preset. */}
        <button
          type="button"
          data-testid={`opening-preset-chip-${opening.id}-custom`}
          onClick={() => {
            /* no-op: user edits W/H/Sill manually in the Dimensions tab */
          }}
          className={cn(
            "px-2 py-0.5 text-xs font-sans rounded-smooth-md border transition-colors",
            derivedId === "custom"
              ? "bg-accent/10 ring-1 ring-accent/40 border-transparent text-foreground"
              : "border-border hover:bg-accent text-muted-foreground",
          )}
        >
          Custom
        </button>
      </div>
    </div>
  );
}
