# Phase 75: Properties + Library Restyle — Context

**Gathered:** 2026-05-08
**Status:** Ready for planning
**Mode:** --auto (all decisions made from recommended defaults + roadmap spec + codebase scout)

<domain>
## Phase Boundary

Restyle 6 component surfaces to use Phase 72 primitives and Phase 71 tokens throughout:

1. **PropertiesPanel.tsx** + sub-components (StairSection, OpeningSection) — raw inputs → Input primitive; raw checkboxes → Switch primitive; already uses Button + PanelSection
2. **WallSurfacePanel.tsx** — raw inputs/checkboxes/selects → primitives
3. **MaterialPicker.tsx** — file-picker trigger; upload flow uses Dialog primitive
4. **ProductLibrary.tsx** — CategoryTabs (custom) → Tabs primitive
5. **RoomSettings.tsx** — raw inputs/checkbox → Input + Switch primitives
6. **AddProductModal.tsx** — wrap entire modal in Dialog primitive; migrate raw form elements

**Scout findings:**
- Zero legacy CSS classes remain (glass-panel, obsidian-*, accent-glow, ghost-border, cad-grid-bg) — Phase 71 already cleaned them
- All files already use semantic tokens (bg-background, text-muted-foreground, border-border/50)
- Phase 72 primitives already imported where needed (Button, PanelSection in PropertiesPanel)
- All required primitives exist in the barrel: Button, PanelSection, Dialog, Tabs, Switch, Input, Tooltip

**Out of scope:**
- Select primitive (no new primitives in Phase 75 — native `<select>` styled consistently with `bg-background border-border` Tailwind classes)
- WelcomeScreen / ProjectManager light mode (Phase 76)
- Final audit grep pass (Phase 76)
- New tool types (Phase 75+)
</domain>

<decisions>
## Implementation Decisions

### Branch Strategy

- **D-01:** All Phase 75 work goes on a feature branch `claude/phase-75-properties-library-restyle`. No direct commits to main. PR created by executor, merged by user.

### Form Element Migration

- **D-02:** All `<input type="text">`, `<input type="number">`, `<input type="email">`, `<input type="search">` → `Input` primitive from `@/components/ui`. The Input primitive is `React.forwardRef` and accepts all standard `InputHTMLAttributes`, so it's a drop-in replacement.
- **D-03:** All `<input type="checkbox">` → `Switch` primitive from `@/components/ui`. Switch API: `{ checked, onCheckedChange, label?, className? }`. Where label is separate from the checkbox in the current markup, collapse it into the `label` prop.
- **D-04:** Native `<select>` elements: do NOT create a Select primitive in Phase 75. Style them with `className="h-9 w-full rounded-smooth-md border border-border bg-background px-3 py-1 text-sm font-sans text-foreground"` for visual consistency with Input primitive. This is the minimum change needed for visual parity; a proper Select primitive can come later.
- **D-05:** `<input type="color">` in WallSurfacePanel: keep as native color input, just ensure its wrapper uses semantic tokens.

### AddProductModal — Dialog Wrapping

- **D-06:** AddProductModal currently renders its own overlay div + close button (not using any primitive). Wrap in `Dialog` from `@/components/ui`. The existing `Props = { onAdd, onClose }` interface stays unchanged — caller still controls open state. Dialog is uncontrolled from the outside: caller renders `<AddProductModal>` only when open, and Dialog is always open when rendered.
- **D-07:** Use `Dialog` → `DialogContent` → `DialogHeader` → `DialogTitle` + `DialogDescription` + `DialogFooter` structure. Remove the manual overlay div, the manual `X` close button (DialogClose handles it), and the manual `position: fixed` wrapper.
- **D-08:** AddProductModal's GLTF drag-drop zone and file input: style with `border-2 border-dashed border-border hover:border-ring` classes. No primitive wraps a file input — keep native `<input type="file" ref={...}>` behind a styled Button trigger.

### ProductLibrary — Tabs Migration

- **D-09:** ProductLibrary currently renders `CategoryTabs` (a custom inline component or import). Replace with `Tabs` primitive from `@/components/ui`. The Tabs primitive uses Radix UI under the hood. Category list stays the same data source (PRODUCT_CATEGORIES); only the rendering changes.
- **D-10:** If `CategoryTabs` is a separate file in `src/components/`, it can be left in place for now (other consumers may use it). Import `Tabs` in ProductLibrary.tsx directly.

### MaterialPicker — Upload Dialog

- **D-11:** MaterialPicker's current upload trigger dispatches a CustomEvent (`open-material-upload`). Keep this event pattern unchanged — behavior is preserved. The upload modal that listens (if any) may be addressed in Phase 76. MaterialPicker itself: ensure the filter/toggle area uses semantic token classes; if it uses a custom tab-like structure, migrate to Tabs primitive.
- **D-12:** MaterialPicker grid: keep existing grid layout. Hover state: `hover:bg-accent/10` ring on material cards. Active (selected) state: `ring-2 ring-ring` on selected card. These match Phase 71 D-07 active state pattern.

### RoomSettings

- **D-13:** RoomSettings.tsx is 70 lines — smallest file. Migrate all 3–4 native inputs to `Input` primitive and the snap `<select>` stays native (see D-04). No structural changes needed.

### Sub-Components

- **D-14:** PropertiesPanel sub-components that live in separate files (e.g., `PropertiesPanel.StairSection.tsx`, `PropertiesPanel.OpeningSection.tsx`) must also have their raw `<input>` elements migrated to `Input` primitive. Same rule applies.
- **D-15:** OpeningsSection's dimension inputs (width, height, position) are `<input type="number">` — migrate to `Input` with `type="number"` prop.

### Preserved Behaviors

- **D-16:** `applySurfaceMaterial` + `applySurfaceMaterialNoHistory` single-undo apply pattern (Phase 68 contract) — NOT touched. Style changes only.
- **D-17:** GLTF Box badge top-LEFT slot in ProductLibrary — the badge rendering wiring is preserved exactly; only its CSS classes may be updated to use semantic tokens.
- **D-18:** Phase 68 `CategoryTabs` may still be imported by MaterialPicker. If so, both consumers (MaterialPicker + ProductLibrary) should be migrated to Tabs primitive in the same plan to avoid half-states.
- **D-19:** All `data-testid` attributes on form elements are preserved verbatim. No testid renames.

### Success Criteria Traceability

- **SC-1** (Dialog for uploads): AddProductModal wrapped in Dialog primitive (D-06 through D-08)
- **SC-2** (MaterialPicker grid): hover + active states use semantic accent tokens (D-12)
- **SC-3** (ProductLibrary cards + GLTF badge): Tabs migration + badge slot preserved (D-09, D-17)
- **SC-4** (RoomSettings PanelSection + Input): already uses PanelSection; inputs migrated (D-13)
- **SC-5** (legacy class removal): scout confirmed already done in Phase 71; verify stays clean after migrations

### Claude's Discretion

- Exact order of input migration within each file (top-to-bottom is fine)
- Whether to use `label` prop on Switch or keep a sibling `<label>` where current layout requires it
- Whether to add a `DialogClose` button or rely on Dialog primitive's built-in close button
- Padding / spacing adjustments inside Dialog to match current modal visual density

</decisions>

<canonical_refs>
## Canonical References

**Phase 72 Primitives (used throughout):**
- `src/components/ui/Input.tsx` — forwardRef, accepts all InputHTMLAttributes + optional `label` prop
- `src/components/ui/Switch.tsx` — `{ checked, onCheckedChange, label?, className? }`
- `src/components/ui/Dialog.tsx` — Dialog / DialogContent / DialogHeader / DialogTitle / DialogFooter / DialogClose
- `src/components/ui/Tabs.tsx` — Tabs / TabsList / TabsTrigger / TabsContent (Radix-backed)
- `src/components/ui/index.ts` — barrel, import from here

**Target Components:**
- `src/components/PropertiesPanel.tsx` — 992 lines; already uses Button + PanelSection
- `src/components/WallSurfacePanel.tsx` — 361 lines
- `src/components/MaterialPicker.tsx` — 191 lines
- `src/components/ProductLibrary.tsx` — 166 lines
- `src/components/RoomSettings.tsx` — 70 lines
- `src/components/AddProductModal.tsx` — 320 lines

**Sub-components to check:**
- `src/components/PropertiesPanel.*.tsx` (StairSection, OpeningSection, etc.)

**Phase 68 contracts to preserve:**
- `src/canvas/fabricSync.ts` — material apply pattern
- `src/stores/cadStore.ts` — `applySurfaceMaterial` / `applySurfaceMaterialNoHistory`

**Design tokens:**
- `src/index.css` — `@theme {}` block with all semantic tokens

</canonical_refs>

<deferred>
## Deferred Ideas

- Select primitive (custom dropdown with animation) — Phase 76 or later
- WelcomeScreen / ProjectManager light mode — Phase 76
- Final `obsidian-` grep audit — Phase 76
- Material upload modal restyle (the modal that receives `open-material-upload` events) — Phase 76 if separate from AddProductModal
- `<input type="color">` design-system replacement — v1.19
- Product card hover animations with motion/react — v1.19
</deferred>

---

*Phase: 75-properties-library-restyle*
*Context gathered: 2026-05-08*
