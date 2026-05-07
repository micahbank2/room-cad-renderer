# Requirements — v1.18 Pascal Visual Parity

Chrome-only rewrite to make Room CAD Renderer look extremely similar to Pascal Editor. Adopts Pascal's design tokens, font stack, radius scale, layout patterns, and floating action menu. Every existing behavior, store, snapshot v6, hotkey, and test driver continues to work — the 800+ existing test suite catches regressions.

Continues phase numbering from 70 → starts at **Phase 71**. Six-phase milestone, ~5–7 days. Audit doc `.planning/competitive/pascal-visual-audit.md` is the research input — no separate `research/` pass for v1.18.

## Active Requirements

### Token Foundation

- [x] **TOKEN-FOUNDATION** — Replace the Obsidian CAD palette with Pascal's oklch token system, swap fonts, soften the radius scale, and ship light + dark dual-mode. **Phase 71.**
  - **Verifiable:** Open the app → entire UI renders in Pascal's neutral grays (no `#7c5bf0` purple anywhere in chrome — only on charts if/when added). Buttons / cards / inputs all show ~10px rounded corners. UI text is Barlow / Geist Sans (no monospace IBM Plex anywhere except code blocks). Toggle theme → smooth swap to light mode, every surface adapts cleanly. Editor canvas remains dark by default; WelcomeScreen / ProjectManager / scene-list pages render light by default.
  - **Acceptance:** `src/index.css` `@theme {}` block replaced with the 16-token oklch palette from pascal-visual-audit.md (background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, sidebar*, chart-1..5). Radius vars `--radius: 0.625rem` + sm/md/lg/xl computed; opt-in `corner-shape: squircle` via `.rounded-smooth*` classes. Font vars switch to Barlow + Geist Sans + Geist Mono; `geist` package added; Google Fonts link for Barlow added to `index.html`. `.dark` class on body controls theme; `useTheme()` hook (system pref + manual override) exposed. All `obsidian-*` color vars and the `accent-glow`/`glass-panel`/`cad-grid-bg`/`ghost-border` custom CSS classes removed. Phase 33 `D-33` icon policy updated to drop the 10-file Material Symbols allowlist (lucide-only). Phase 33 `D-34` spacing scale replaced with Pascal's (8/12/16/24/32). 4 carry-over tests from v1.17 (snapshot v6 assertion, removed wallpaper "MY TEXTURES" tab, WallMesh cutaway ghost-spread audit, contextMenuActionCounts pollution) folded into this phase's cleanup pass.
  - **Hypothesis to test:** Tailwind v4 `@theme {}` block direct swap is mechanical with no upstream regressions. Concern: any `bg-obsidian-*` or `text-text-*` className references that survive will render as undefined classes (no-op). Plan-phase research grep-counts every `obsidian-`/`text-text-`/`accent-glow` reference and produces a per-file migration map.

### Primitives Shelf

- [ ] **PRIMITIVES-SHELF** — Build the component primitive library Pascal-style — every button, tab, panel section, segmented control, switch, slider, tooltip, and dialog comes from a `cva`-driven primitive that respects the new tokens. **Phase 72.**
  - **Verifiable:** Click any button in the app → consistent variant family (default / destructive / outline / secondary / ghost / link) and size scale (default / sm / lg / icon / icon-sm / icon-lg). Open a dialog → unified blur + spring animation (no abrupt mount). Click a Tab → active state shows muted-background pill (no neon glow). Expand a panel section → spring-animated height transition with chevron rotation. All inputs, switches, sliders use the new tokens.
  - **Acceptance:** `src/components/ui/` shelf created with `button.tsx`, `tab.tsx`, `panel-section.tsx`, `segmented-control.tsx`, `switch.tsx`, `slider.tsx`, `tooltip.tsx`, `dialog.tsx`, `input.tsx`, `popover.tsx`. Each uses `cva` for variants. New deps: `class-variance-authority`, `motion` (framer-motion v12), `@radix-ui/react-slot` (for `asChild`), `tw-animate-css`. ~30 existing button sites + ~5 tab sites + ~5 panel sites migrated to the new primitives in this phase (rest follow in Phases 73-76). Reduced motion: each primitive's animation guards on the existing `useReducedMotion()` hook from Phase 33 D-39.
  - **Hypothesis to test:** Migration of existing buttons can be incremental — primitives ship in Phase 72 but old inline-styled buttons keep working until their site is touched. Concern: `cva` adds a runtime build step; verify Vite v8 + Tailwind v4 plays well with `tw-animate-css` (Pascal uses it cleanly with the same stack).

### Sidebar Restyle

- [ ] **SIDEBAR-RESTYLE** — Restyle the Phase 46 rooms tree with Pascal's spine-and-branches geometry, and convert the right sidebar to contextual mount (only appears when something is selected). **Phase 73.**
  - **Verifiable:** Open the app → left sidebar shows the rooms tree with subtle 1px gray vertical line at left:21px and horizontal branch lines at 21px-32px (matches Pascal's `bg-border/50` spine pattern). Each tree row hovers with `bg-accent/30`, active rows with `bg-accent`. Click an empty canvas → right sidebar disappears, canvas fills the freed space. Click a wall / product / ceiling / custom-element → right sidebar slides in (spring animation) showing the relevant properties. Re-click empty canvas → sidebar collapses again.
  - **Acceptance:** `src/components/RoomsTreePanel/` restyled with new tree-node line geometry. Right sidebar wrapper (Sidebar.tsx) gates content behind `selectedIds.length > 0` with `<motion.aside>` enter/exit animation. PropertiesPanel un-mounts cleanly (no test-driver registration loss — Phase 68 lesson learned: register in `src/test-utils/*Drivers.ts`, not in component bodies). Tree double-click camera-focus + per-node visibility eye-icon (Phase 46/47 features) preserved.
  - **Hypothesis to test:** Contextual right sidebar may break tests that assume PropertiesPanel is always mounted. Plan-phase research greps `getByText("PROPERTIES")` / similar in Playwright + vitest specs. Open question: do RoomSettings (room-level config) belong in the always-mounted left sidebar or move to a Room context view in the right rail?

### Toolbar Rework (Floating Action Menu)

- [ ] **TOOLBAR-REWORK** — Replace the top-left toolbar entirely with Pascal's floating two-row action menu at canvas-bottom-center. Top row: chunky tool icons (lucide at 1.5x size as fallback). Bottom row: flat tool icons. **Phase 74.**
  - **Verifiable:** Open the app → no left vertical toolbar. Floating glass pill at canvas-bottom-center holds two rows of tools: top row = building blocks (Wall, Floor, Ceiling, Door, Window, Wall Art, Wainscoting, Crown, Stair, Custom Element) at 1.5x size; bottom row = manipulation tools (Select V, Pan, Zoom, Undo Ctrl+Z, Redo Ctrl+Shift+Z, Grid, Display Mode segmented, View Mode 2D/3D/Split). Active tool gets a darker fill ring. Click a building-block icon → tool activates; canvas cursor switches; existing keyboard shortcuts (V/W/D/N) still work. Hover any icon → tooltip pops.
  - **Acceptance:** New `src/components/ActionMenu/` replaces `src/components/Toolbar.tsx` mounting. Uses `motion/react` for layout + AnimatePresence (rows show/hide based on `mode === 'build' | 'manipulate'`). Style mirrors Pascal's `fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-border bg-background/90 shadow-2xl backdrop-blur-md`. All existing tool activation flows (`useUIStore.activeTool`) untouched. Toolbar.tsx deleted from disk in this phase. Display mode (NORMAL/SOLO/EXPLODE from Phase 47) becomes a SegmentedControl primitive instance in the bottom row. View mode (2D/3D/Split) likewise.
  - **Hypothesis to test:** Lucide-icon fallback at 1.5x size may feel under-weight vs Pascal's chunky 3D PNG icons. Visual review at end of Phase 74 decides whether to commission isometric icon set in a v1.18 follow-up phase. Open question: where does the "Save / Open project" UI live now that the left toolbar is gone? Likely top-bar or floating top-right button.

### Properties + Library Restyle

- [ ] **PROPERTIES-LIBRARY-RESTYLE** — Apply the new tokens, primitives, and animation patterns to MaterialPicker (Phase 68), ProductLibrary, RoomSettings, PropertiesPanel, AddProductModal, and supporting library surfaces. **Phase 75.**
  - **Verifiable:** Click an upload button → Pascal-style dialog (rounded, blurred backdrop, spring entry). Open the MaterialPicker → grid of material thumbnails on the new neutral background, hover shows soft accent fill, click applies (single Ctrl+Z still reverts). Open the ProductLibrary → reflects Pascal's card pattern with Barlow names and Geist Sans metadata. RoomSettings collapsible sections use the new PanelSection primitive with spring expand/collapse.
  - **Acceptance:** Every TSX file under `src/components/` matching `MaterialPicker | ProductLibrary | RoomSettings | PropertiesPanel | WallSurfacePanel | AddProductModal | UploadTextureModal | UploadMaterialModal | MyTexturesList | LibraryCard` migrated to use new tokens + primitives. Custom CSS classes `glass-panel` / `accent-glow` / `cad-grid-bg` removed from these files. Phase 68 MaterialPicker grid responsiveness preserved. Phase 67 Material upload form keeps validation + dedup.
  - **Hypothesis to test:** ProductLibrary list-style vs grid-style may need refresh — Pascal uses card grids for collections. Plan-phase research evaluates whether the existing list works in the new typography or needs re-layout. Concern: GLTF Box badge from Phase 58 may need restyle.

### Modals + WelcomeScreen + Final

- [ ] **MODALS-WELCOME-FINAL** — Modal/Dialog primitives finalized; WelcomeScreen + ProjectManager adopt light mode (Pascal pattern: editor dark, marketing/empty light); final QA pass + audit. **Phase 76.**
  - **Verifiable:** Open the app on a fresh device → WelcomeScreen renders in light mode (`oklch(0.998 0 0)` background, dark Barlow heading, dark body text), feels like a marketing page. Click "Continue to editor" → smooth transition to the dark editor (theme class swap on body). Open ProjectManager → also light mode. Help modal, all dialogs use the unified primitives. Delete confirmation, error toasts, all chrome consistent. No `obsidian-*` references anywhere in the codebase.
  - **Acceptance:** WelcomeScreen.tsx + ProjectManager.tsx + ShareJoinPage (if exists) restyled for light mode. Theme switch logic: editor surfaces apply `<html class="dark">`, marketing surfaces apply `<html class="">` (light). HelpModal.tsx, ConfirmDialog.tsx, ErrorBoundary fallback adopt new primitives. Final grep audit: zero `obsidian-` / zero `text-text-` / zero `accent-glow` / zero `cad-grid-bg` references in `src/`. Carry-over tests from v1.17 verified passing on the new chrome (snapshot v6, removed MY TEXTURES tab, cutaway ghost-spread, contextMenu pollution all clean). Audit doc updated with "what landed" section.
  - **Hypothesis to test:** Light mode for marketing surfaces may need different treatment for the canvas preview thumbnail in WelcomeScreen — the dashed-border empty state from Pascal doesn't necessarily translate. Plan-phase research designs the light-mode WelcomeScreen specifically.

## Out of Scope (this milestone)

| Item | Reason |
|------|--------|
| **MAT-LINK-01** ([#26](https://github.com/micahbank2/room-cad-renderer/issues/26) — Product–Material Linking) | Carried over from v1.17. Defer to **v1.19** so it ships in v1.18 chrome rather than be designed twice. |
| **LIB-REBUILD-01** ([#24](https://github.com/micahbank2/room-cad-renderer/issues/24) — Library rebuild with Materials/Assemblies/Products toggle) | Carried over from v1.17. Defer to **v1.19** so it ships in v1.18 chrome. |
| **Commissioned isometric PNG icon set** | Lucide-icon fallback at 1.5x first; revisit at end of v1.18 only if look is flat. Cost-deferred. |
| **PBR maps extension** ([#81](https://github.com/micahbank2/room-cad-renderer/issues/81) — AO + displacement + emissive) | v1.19+ candidate. v1.18 is chrome-only. |
| **CAM-05** ([#127](https://github.com/micahbank2/room-cad-renderer/issues/127) EXPLODE saved-camera offset) | Re-deferred. |
| **Cloud sync** ([#30](https://github.com/micahbank2/room-cad-renderer/issues/30)) | Local-first. Indefinite defer. |
| **Parametric object controls** ([#28](https://github.com/micahbank2/room-cad-renderer/issues/28)) | v1.19+ candidate. |
| **Window presets** ([#20](https://github.com/micahbank2/room-cad-renderer/issues/20)) | Cosmetic; defer. |
| **Columns + levels/platforms** ([#19](https://github.com/micahbank2/room-cad-renderer/issues/19) partial) | Defer to v1.19+. |
| **R3F v9 / React 19 upgrade** ([#56](https://github.com/micahbank2/room-cad-renderer/issues/56)) | Tracked separately. v1.18 motion/react v12 works on React 18 + R3F v8. |
| **Plain English documentation** ([#31](https://github.com/micahbank2/room-cad-renderer/issues/31), [#32](https://github.com/micahbank2/room-cad-renderer/issues/32), [#33](https://github.com/micahbank2/room-cad-renderer/issues/33)) | Docs-only milestone defer. |
| **Functional changes of any kind** | v1.18 is chrome-only by design. Bugs surfaced during the visual rewrite get logged for v1.19 unless they block a phase. |

## Validated Requirements (Earlier Milestones)

See `.planning/milestones/v1.0-REQUIREMENTS.md` through `.planning/milestones/v1.17-REQUIREMENTS.md`. All v1.0–v1.16 shipped; v1.17 partial-shipped (MAT-ENGINE-01 + MAT-APPLY-01 validated; MAT-LINK-01 + LIB-REBUILD-01 deferred to v1.19).

## Traceability

| Requirement | Phase | Plans |
|-------------|-------|-------|
| TOKEN-FOUNDATION | Phase 71 | TBD (planning) |
| PRIMITIVES-SHELF | Phase 72 | TBD (planning) |
| SIDEBAR-RESTYLE | Phase 73 | TBD (planning) |
| TOOLBAR-REWORK | Phase 74 | TBD (planning) |
| PROPERTIES-LIBRARY-RESTYLE | Phase 75 | TBD (planning) |
| MODALS-WELCOME-FINAL | Phase 76 | TBD (planning) |

---

*Last updated: 2026-05-07 — v1.18 roadmap created; 6/6 requirements mapped to Phases 71-76; success criteria + dependencies populated; plans pending /gsd:plan-phase*
