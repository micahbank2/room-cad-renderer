# Phase 79: Window Presets (WIN-PRESETS-01) - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Placing a window becomes a single pick from a size list rather than typing dimensions every time. A small always-visible switcher next to the canvas shows 5 named residential window sizes plus Custom. After placement, the PropertiesPanel surfaces which preset is active and lets the user switch.

**In scope (WIN-01, WIN-02):**
- 5 named window presets + Custom in a floating switcher when window tool is active
- Live ghost-preview at cursor reflects the currently selected preset
- Custom flow: inline Width / Height / Sill number boxes expand in the switcher
- PropertiesPanel shows the active preset (derived from dimensions) and lets user switch preset post-placement

**Out of scope (separate phases / out of WIN-PRESETS-01):**
- Doors, archways, passthroughs, niches — Phase 61 covers those opening types
- Parametric controls for placed Products / placed Openings beyond preset switching — Phase 80 (PARAM-01)
- Editing the preset catalog itself (user-defined window sizes) — not requested
- Migration of pre-Phase 79 windows: existing windows continue working unchanged; on read, dimensions are matched against the catalog → labeled "Standard" or "Custom" with zero data migration

</domain>

<decisions>
## Implementation Decisions

### Preset Catalog (D-01)
- **D-01:** Ship **5 named residential presets + Custom**:
  | Name | Width (ft) | Height (ft) | Sill Height (ft) |
  |------|-----------|-------------|------------------|
  | Small | 2 | 3 | 3 |
  | Standard | 3 | 4 | 3 |
  | Wide | 4 | 5 | 3 |
  | Picture | 6 | 4 | 1 |
  | Bathroom | 2 | 4 | 4.5 |
  | Custom | (user input) | (user input) | (user input) |

  Planner: confirm or refine exact numbers; these are the locked categories and intended use cases. Sill heights are varied per preset — Picture is low-sill for living-room views, Bathroom is high-sill for privacy.

### Picker UX — Where & When (D-02, D-03)
- **D-02:** **Always-visible floating switcher** appears when the Window tool is active. Shows 6 chips: Small, Standard, Wide, Picture, Bathroom, Custom. First chip (Small or last-used — planner decides) is auto-selected on tool activation.
- **D-03:** Switcher placement should align with the v1.18 Pascal "floating chrome" aesthetic — canvas-bottom-center floating pill or a similar low-friction surface that doesn't block the canvas. The exact placement is **Claude's discretion** during UI / planning, but it MUST stay visible across multiple placements (the user is planning a whole house and will place several windows in succession without re-opening the switcher).
- **D-04:** Switching a preset chip while the tool is active updates the cursor ghost-preview **live** — no click-confirm step between chip-switch and ghost-update.

### Custom Flow (D-05)
- **D-05:** Clicking the **Custom** chip **expands the switcher inline** to show three small number inputs: Width (ft), Height (ft), Sill (ft). User types values — ghost preview updates live as values change. Click wall to place. No modal, no second screen, no place-then-edit flow.
- **D-06:** Default values when Custom is first selected: last-used preset's dimensions (e.g., if previously placed a Standard, Custom inputs pre-fill to 3 / 4 / 3). Reduces typing for "I want something close to Standard but slightly different."

### PropertiesPanel — Post-Placement Editing (D-07, D-08)
- **D-07:** After placement, the PropertiesPanel `OpeningSection` shows the **active preset label** (e.g., "Preset: Standard" or "Preset: Custom") plus a way to switch to another preset. The label is **derived from current dimensions** by exact-match lookup against the catalog — no stored field on Opening.
- **D-08:** Existing manual editing of widthFt / heightFt / sillHeight in PropertiesPanel continues to work unchanged. If the user manually edits a dimension after picking a preset, the derived label automatically updates: if the new dimensions match another preset, it shows that preset's name; otherwise "Custom". This is intentional — the user doesn't need to think about preset state; it's a view, not a write.

### Data Model (D-09)
- **D-09:** **No new field on `Opening` type. No snapshot migration.** The preset catalog lives in a shared constants module (e.g., `src/lib/windowPresets.ts`). The PropertiesPanel derives the active preset on read via `derivePreset(opening: Opening): WindowPresetId | "custom"`. Switching presets in the PropertiesPanel just calls the existing `updateOpening(id, { widthFt, heightFt, sillHeight })` action with the preset's dimensions — no new store action required.

### Claude's Discretion
- Exact visual placement of the floating switcher (canvas-bottom-center pill, sidebar slot, or other Pascal-aligned location).
- Switcher visual treatment (chips, segmented control, dropdown — all are acceptable as long as it stays visible while the window tool is active).
- Whether the first-time default is "Small" or "last-used preset" — both are fine; last-used is a small UX win.
- How the "Custom" chip visually expands to reveal the W/H/Sill inputs (inline panel, popover, accordion — designer's call).
- Whether the preset catalog is exported as a const array or a typed Record — pick whichever planner finds cleanest.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Opening data model + window tool
- `src/types/cad.ts` §lines 95-100 — `Opening` interface with `type` / `widthFt` / `heightFt` / `sillHeight` fields (no `presetId` will be added — see D-09)
- `src/types/cad.ts` §lines 395-415 — existing `defaultOpeningDimensions()` returns `{width: 3, height: 4, sillHeight: 3}` for windows; the new preset catalog supersedes this default for windows
- `src/canvas/tools/windowTool.ts` — current window tool hardcodes `WINDOW_WIDTH = 3` (line 8), `height = 4`, `sillHeight = 3` (lines 98-99); this is the entry point that needs the switcher integration
- `src/components/PropertiesPanel.OpeningSection.tsx` — existing per-Opening editor (187 lines); will gain preset label + preset switcher

### Phase 61 OPEN-01 Wall Cutouts pattern (reference for opening-type UX consistency)
- `.planning/phases/61-*` — OPEN-01 introduced the toolbar dropdown pattern for choosing opening *type* (door / window / archway / passthrough / niche). Phase 79 is a separate concern (sizing the window after type is chosen) and uses a different chrome surface (floating switcher near canvas, not toolbar dropdown).

### Phase 31 single-undo + override resolver (reference)
- `.planning/phases/31-*-PLAN.md` — established the `update*` + `update*NoHistory` action-pair pattern. Phase 79 does NOT need a new resolver because dimensions are written directly to Opening; preset is purely derived.

### v1.18 Pascal Visual Parity (chrome aesthetic)
- `CLAUDE.md` §"Design System (Phase 71 — v1.18)" — Pascal oklch tokens, Barlow + Geist fonts, `rounded-smooth` squircle utilities, `bg-accent/10` for active interactive states. The new switcher uses these tokens.
- Phase 74 (TOOLBAR-REWORK) — established the "floating glass pill at canvas-bottom-center" pattern; the window-preset switcher should visually echo this.

### Roadmap + requirements
- `.planning/ROADMAP.md` §Phase 79 — goal + success criteria
- `.planning/REQUIREMENTS.md` §WIN-01 + WIN-02 — acceptance criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/canvas/tools/windowTool.ts` — already implements click-on-wall placement with ghost preview (`opacity: 0.4`, dashed stroke). Switcher just needs to update the ghost's `width` / `height` / `sillHeight` values when chip changes.
- `src/components/PropertiesPanel.OpeningSection.tsx` — already renders `widthFt` / `heightFt` / `sillHeight` inputs for placed openings. Adding the preset label + switcher is additive, not a rewrite.
- v1.18 primitives (`Button`, `SegmentedControl`, `Input`) — switcher chips can use `SegmentedControl` or a row of `Button` variants; Custom inputs use `Input` primitive.
- Phase 30 smart-snap system — windows already snap to wall midpoints / endpoints; no snap changes needed.

### Established Patterns
- **Tool-activation closure pattern** (CLAUDE.md Pattern 5): `activateXTool(fc, scale, origin)` returns a `cleanup: () => void`. The window tool already follows this. The switcher will need a bridge — likely a module-level `currentWindowPreset: WindowPresetId` ref (like `productTool.pendingProductId` per CLAUDE.md D-07 intentional exception) that the React switcher writes and the tool reads.
- **Module-level public-API bridge with StrictMode-safe cleanup** (CLAUDE.md Pattern 7) — the switcher's "currentPreset" state needs to survive React StrictMode double-mounts. The pattern from Phase 64 BUG-04 applies: `useEffect` with identity-check cleanup.
- **`updateOpening` action** in `cadStore` — exists and is sufficient for preset switching in PropertiesPanel; no new store actions required.
- **Reduced motion** (CLAUDE.md D-39) — any switcher animations must guard on `useReducedMotion()`.

### Integration Points
- **Toolbar / canvas chrome:** wherever the v1.18 floating chrome lives is where the switcher mounts. Planner / UI agent should locate the existing floating-chrome layout container.
- **`windowTool.ts`:** read the "current preset" via the bridge; on click-to-place, use those dimensions (instead of the hardcoded `WINDOW_WIDTH`).
- **`PropertiesPanel.OpeningSection.tsx`:** add a preset row at top of the window-section branch — label + switcher control. Below it, the existing W/H/Sill numeric inputs remain for fine-tuning.
- **Test driver:** add `window.__driveWindowPreset(presetId)` gated by `import.meta.env.MODE === "test"` so e2e tests can switch presets without DOM hunting (matches Phase 31 `__driveResize` precedent).

</code_context>

<specifics>
## Specific Ideas

- The user explicitly chose Option B "Residential set with varied sill heights" over the minimal roadmap-example set ("2×3, 3×4, 4×5, Custom" all at sill=3). Justification: Jessica is planning a real home and needs both an eye-level bedroom window AND a low-sill picture window for the living room — uniform sill height can't express that distinction. Picture window's low 1ft sill is a specific signal the user values.
- "Always-visible switcher" chosen over the cheaper dropdown alternative because Jessica will place windows in rapid succession across many rooms — re-opening a dropdown each time is friction the user wants to avoid.
- "Derive from dimensions" chosen over storing `presetId` because the user wants zero data migration cost AND because the user accepts the small semantic quirk ("Custom 3/4/3 gets labeled Standard") as actually-good UX (free preset label when dimensions match).

</specifics>

<deferred>
## Deferred Ideas

- **User-defined preset catalog** — letting Jessica save a custom size as a named preset for re-use. Not in scope for WIN-PRESETS-01. If she asks for this after using the feature, it's a candidate for a v1.21+ phase.
- **Door / archway / passthrough / niche presets** — Phase 79 is window-only per WIN-01/WIN-02. The same pattern (catalog + switcher + derive-on-read) is reusable for other opening types but is out of scope here. If valuable after this ships, file as a v1.21 feature request.
- **Drag-to-size custom flow** — considered as option 4 in Custom-flow discussion, rejected for v1.20. Could reappear later as a CAD-power-user feature alongside Phase 80 PARAM-01 work.

</deferred>

---

*Phase: 79-window-presets-win-presets-01-v1-20-active*
*Context gathered: 2026-05-13*
