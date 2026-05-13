---
gsd_state_version: 1.0
milestone: v1.19
milestone_name: Material Linking & Library Rebuild
status: Defining requirements
last_updated: "2026-05-13T14:31:40.287Z"
last_activity: 2026-05-13
progress:
  total_phases: 20
  completed_phases: 11
  total_plans: 42
  completed_plans: 39
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-08 — v1.19 Material Linking & Library Rebuild complete; Phases 69+70+77 all shipped)

**Core value:** Jessica can see her future room with her actual furniture before spending money.
**Current focus:** v1.19 complete — ready for v1.20

## Current Position

Phase: 999.1
Plan: Not started
Milestone: v1.20 Surface Depth & Architectural Expansion
Phases: TBD (starts at Phase 78)
Status: Defining requirements
Last activity: 2026-05-13

## Decisions

- **D-A1 (audit-locked):** Adopt shadcn/ui v4 oklch token system as defined in pascal-visual-audit.md — 16 semantic tokens, no custom palette extensions in chrome (chart colors only for non-chrome viz). No accent purple in chrome.
- **D-A2 (audit-locked):** 10px base radius (`--radius: 0.625rem`) with sm/md/lg/xl computed; opt-in `corner-shape: squircle` as progressive enhancement (Safari/WebKit-only at writing).
- **D-A3 (audit-locked):** Font stack swap to Barlow + Geist Sans + Geist Mono. Drop IBM Plex Mono UI chrome; drop Space Grotesk display tier; UPPERCASE_SNAKE labels become mixed case throughout.
- **D-A4 (audit-locked):** Light + dark dual-mode first-class. Editor surfaces stay dark; WelcomeScreen + ProjectManager + scene-list adopt light mode (Pascal pattern).
- **D-A5 (user-confirmed):** Lucide-react icons only — drop the 10-file Material Symbols allowlist (D-33 policy stricter).
- **D-A6 (user-confirmed):** Floating two-row action menu **replaces** the top-left toolbar entirely.
- **D-A7 (user-confirmed):** Right sidebar becomes **contextual** — appears only when something is selected.
- **D-A8 (carry-over):** Phase 69 (MAT-LINK-01) + Phase 70 (LIB-REBUILD-01) deferred from v1.17 to v1.19 to ship in v1.18 Pascal chrome.
- **[Phase 71-76 decisions preserved]** — see v1.18 SUMMARY/VERIFICATION docs for v1.18 chrome decisions.
- [Phase 69]: Snapshot v6→v7 is trivial passthrough; GLTF finish deferred to v1.20; MaterialPicker customElementFace surface type reused for product finish
- [Phase 70]: Default library tab is Materials (not Products) — puts newest feature front and center
- [Phase 78]: MapBadge uses text-[10px] arbitrary value for sub-text indicator (smallest Pascal token text-sm=11px is too tall)

## Performance Metrics

(v1.19 — pending first phase execution)

## v1.19 Roadmap (Complete)

| Phase | Requirement | Goal | Status |
|-------|-------------|------|--------|
| 69 | MAT-LINK-01 | Finish slot on placed products — swap material without re-placing | ✅ Complete |
| 70 | LIB-REBUILD-01 | Library 3-tab rebuild: Materials / Products / Assemblies | ✅ Complete |
| 77 | TEST-CLEANUP-01 | Fix v1.18 carry-over test failures (TooltipProvider, Switch role) | ✅ Complete |
| Phase 78 P04 | 8 | 1 tasks | 3 files |

## v1.20 Roadmap

| Phase | Requirement | Goal | Status |
|-------|-------------|------|--------|
| 78 | PBR-01–04 | AO + displacement map upload; 3D rendering; card indicators | Pending |
| 79 | WIN-01–02 | Window preset size picker; PropertiesPanel post-placement | Pending |
| 80 | PARAM-01–03 | Type exact width/depth/position for placed products | Pending |
| 81 | COL-01–03 | Columns & pillars — new entity, 2D + 3D, select/edit | Pending |

## Recent Milestones

- **v1.19 Material Linking & Library Rebuild** — shipped 2026-05-08 (3 phases: 69+70+77, all complete)
- **v1.18 Pascal Visual Parity** — shipped 2026-05-08 (6 phases: 71-76, audit `passed`)
- **v1.17 Library + Material Engine** — partial-shipped 2026-05-07 (2/4 phases — 67+68; 69+70 deferred to v1.19)
- **v1.16 Maintenance Pass** — shipped 2026-05-06 (4 phases, audit `passed-with-notes`)
- **v1.15 Architectural Toolbar Expansion** — shipped 2026-05-06 (4 phases, audit `passed`)

## Accumulated Context

- **Phase 69 depends on Phases 67 + 68 (both complete).** Material entity (`src/types/material.ts`), `materialStore`, `useMaterials` hook, and `MaterialPicker` component all exist and work. Phase 69 adds `PlacedProduct.finishMaterialId?: string` and wires it through 3D rendering.
- **Phase 70 depends on Phase 69 finishing the material story.** The 3-tab library reorganization uses: existing `materialStore` (Phase 67), existing `ProductLibrary` + `CategoryTabs` → Tab primitive (v1.18 Phase 72), existing upload flows (preserve end-to-end).
- **Phase 77 (test cleanup) is independent of 69+70.** Can run in parallel with Phase 69 planning. Fixes: 5 test files missing `<TooltipProvider>` wrapper (GH #163), AddProductModal test queries `role="checkbox"` → should be `role="switch"` (GH #164).
- **v1.18 primitives fully available.** Tab, Switch, Input, Dialog, Button, PanelSection — all in `src/components/ui/`. Phase 69 and 70 should use these.
- **Snapshot version is v6.** Phase 69 will bump to v7 (adds `finishMaterialId` to `PlacedProduct`). Phase 70 adds no data changes. Follow Pattern from Phase 51 (async pre-pass via `loadSnapshot` refactor).
- **StrictMode-safe useEffect cleanup pattern (CLAUDE.md #7)** required for any new module-level registry writes in Phase 69.
- **PlacedProduct.finishMaterialId:** New optional field. Resolver pattern: `finishMaterialId ?? (catalog default)`. All 3D mesh consumers must be updated (ProductMesh, GltfProduct). Single Ctrl+Z via existing `*NoHistory` action pair pattern.

## Next Step

Run `/gsd:plan-phase 78` to plan the first phase of v1.20. ROADMAP.md Phase 78 section has the full success criteria.
