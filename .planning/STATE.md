---
gsd_state_version: 1.0
milestone: v1.18
milestone_name: Pascal Visual Parity
status: executing
last_updated: "2026-05-07T21:35:59.557Z"
last_activity: 2026-05-07 -- Phase 72 execution started
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 14
  completed_plans: 7
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-07 — v1.17 partial-shipped 67+68; v1.18 Pascal Visual Parity opened; Phases 69+70 deferred to v1.19)

**Core value:** Jessica can see her future room with her actual furniture before spending money.
**Current focus:** Phase 72 — primitives-shelf

## Current Position

Phase: 72 (primitives-shelf) — EXECUTING
Milestone: v1.18 Pascal Visual Parity
Phases: 6 (71, 72, 73, 74, 75, 76) — 0 complete
Plan: 1 of 7
Status: Executing Phase 72
Last activity: 2026-05-07 -- Phase 72 execution started

## Decisions

- **D-A1 (audit-locked):** Adopt shadcn/ui v4 oklch token system as defined in pascal-visual-audit.md — 16 semantic tokens, no custom palette extensions in chrome (chart colors only for non-chrome viz). No accent purple in chrome.
- **D-A2 (audit-locked):** 10px base radius (`--radius: 0.625rem`) with sm/md/lg/xl computed; opt-in `corner-shape: squircle` as progressive enhancement (Safari/WebKit-only at writing).
- **D-A3 (audit-locked):** Font stack swap to Barlow + Geist Sans + Geist Mono. Drop IBM Plex Mono UI chrome; drop Space Grotesk display tier; UPPERCASE_SNAKE labels become mixed case throughout.
- **D-A4 (audit-locked):** Light + dark dual-mode first-class. Editor surfaces stay dark; WelcomeScreen + ProjectManager + scene-list adopt light mode (Pascal pattern).
- **D-A5 (user-confirmed):** Lucide-react icons only — drop the 10-file Material Symbols allowlist (D-33 policy stricter). Action menu's chunky top row uses lucide at 1.5x size as fallback; commission isometric PNG icon set later only if look is flat.
- **D-A6 (user-confirmed):** Floating two-row action menu **replaces** the top-left toolbar entirely — half-measures look incoherent.
- **D-A7 (user-confirmed):** Right sidebar becomes **contextual** — appears only when something is selected. PropertiesPanel un-mounts on empty selection.
- **D-A8 (sequencing):** v1.17 closed early at "shipped 67 + 68". Phases 69 (MAT-LINK-01) + 70 (LIB-REBUILD-01) deferred to v1.19 to ship in v1.18 chrome rather than be designed twice.
- **D-A9 (carry-over):** 4 legacy tests need contract updates from Phase 68 — fold into v1.18 Phase 71: `tests/snapshotMigration.test.ts:32` (asserts version 5, bump to 6), `tests/pickerMyTexturesIntegration.test.tsx` (tests removed wallpaper "MY TEXTURES" tab), `tests/WallMesh.cutaway.test.tsx` (Phase 59 ghost-spread audit on new material sites — open question whether ghost cutaway should propagate through resolved Materials), `tests/lib/contextMenuActionCounts.test.ts` (test pollution).
- [Phase 71]: Wave 0 test scaffold (Plan 00): RED tests lock useTheme + __driveTheme contract before implementation; Plan 71-01 turns GREEN
- [Phase 71]: geist npm package is Next.js-only; loaded Geist fonts via Google Fonts in index.html instead for Vite compatibility
- [Phase 71]: bg-obsidian-high (hover states) → bg-accent; bg-accent text-white (brand buttons) → bg-primary text-primary-foreground; hover:text-accent preserved as neutral hover
- [Phase 71]: snapGuides.ts #7c5bf0 preserved as canvas data per D-06a; Lighting.tsx photographic hex colors preserved
- [Phase 71]: D-03 custom class sweep applied: glass-panel → bg-card border border-border; ghost-border → border border-border/50; accent-glow → deleted; cad-grid-bg had zero runtime usages
- [Phase 71]: font-mono in data sites (StatusBar, FabricCanvas, ThreeViewport) preserved per D-10; arch→Squircle, stairs→Footprints (D-15 substitutes); helpContent.tsx icon type changed string→LucideIcon
- [Phase 71]: D-09 chrome sweep: ~100+ UPPERCASE_SNAKE labels converted to mixed case across 17 component files
- [Phase 71]: D-15 stairs e2e: data-stair-icon is on the SVG element itself (lucide Footprints), not a span with text content
- [Phase 71]: productStore addProduct: restored pre-load guard (LIB-03 safety — prevents writing empty library before load resolves)
- [Phase 71]: contextMenuActionCounts: duplicate vi.mock() caused full-suite TypeErrors; removed first incomplete mock declaration

## Performance Metrics

(v1.18 — pending first phase execution)

## v1.18 Roadmap

| Phase | Requirement | Goal | Status |
|-------|-------------|------|--------|
| 71 | TOKEN-FOUNDATION | Replace Obsidian palette with Pascal oklch tokens; new fonts; light+dark | Pending |
| 72 | PRIMITIVES-SHELF | Button/Tab/PanelSection/Segmented/Switch/Slider via cva + motion/react | Pending |
| 73 | SIDEBAR-RESTYLE | Tree spine geometry; contextual right sidebar | Pending |
| 74 | TOOLBAR-REWORK | Floating two-row action menu replaces top-left toolbar | Pending |
| 75 | PROPERTIES-LIBRARY-RESTYLE | MaterialPicker / ProductLibrary / RoomSettings restyle | Pending |
| 76 | MODALS-WELCOME-FINAL | Modal primitives + light-mode Welcome/ProjectManager + carry-over test cleanup | Pending |
| Phase 71 P00 | 6 | 2 tasks | 2 files |
| Phase 71 P01 | 218 | 3 tasks | 6 files |
| Phase 71 P02 | 461 | 1 tasks | 55 files |
| Phase 71 P03 | 8 | 1 tasks | 12 files |
| Phase 71 P04 | 11m | 3 tasks | 48 files |
| Phase 71 P05 | 11 | 2 tasks | 19 files |
| Phase 71 P06 | 45 | 3 tasks | 16 files |

## Recent Milestones

- **v1.17 Library + Material Engine** — partial-shipped 2026-05-07 (2/4 phases — 67 MAT-ENGINE-01 + 68 MAT-APPLY-01; 69+70 deferred to v1.19)
- **v1.16 Maintenance Pass** — shipped 2026-05-06 (4 phases, audit `passed-with-notes`)
- **v1.15 Architectural Toolbar Expansion** — shipped 2026-05-06 (4 phases, audit `passed`)
- **v1.14 Real 3D Models** — shipped 2026-05-05 (4 phases, audit `passed`)

## Accumulated Context

- **Audit doc is the research source for v1.18.** `.planning/competitive/pascal-visual-audit.md` contains the full token map, component patterns, screenshots, and migration cost matrix. No separate `research/` pass needed for this milestone.
- **Pascal repo cloned at `/tmp/pascal-editor`** (shallow, gitignored). Bun-installed; can be rebooted with `cd /tmp/pascal-editor && bun dev` for live reference. Port 3002.
- **Tailwind v4 alignment is the lucky coincidence** — both stacks use `@theme {}` blocks. Token swap is mechanical, not a rewrite.
- **800+ existing tests catch behavior regressions.** v1.18 is chrome-only; any failed Playwright/vitest in Phase 71+ flags real (non-chrome) breakage.
- **StrictMode-safe useEffect cleanup pattern (CLAUDE.md #7)** still applies. v1.18 will introduce new motion/react `<motion.div layout>` instances — verify no module-level registry writes inside their effects.
- **Pattern from Phase 68 carry-over fix:** when extracting test drivers, put them in `src/test-utils/*Drivers.ts` with `installXDrivers()` exports + import from `main.tsx`. Decouples driver registration from UI mount paths.
- **Phase 33 D-33 / D-34 / D-03 / D-39 design tokens** were the v1.7.5 baseline — v1.18 supersedes D-33 (Material Symbols dropped) and D-34 (new spacing scale) but D-39 (reduced motion) stays compatible.

## Next Step

Run `/gsd:plan-phase 71` to plan TOKEN-FOUNDATION. Audit doc + the ROADMAP.md detail for Phase 71 are the research input — no separate research pass needed.
