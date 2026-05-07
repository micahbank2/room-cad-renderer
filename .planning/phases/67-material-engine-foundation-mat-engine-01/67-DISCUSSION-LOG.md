# Phase 67: Material Engine Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 67-material-engine-foundation-mat-engine-01
**Areas discussed:** Texture map slots, Required metadata fields, Library entry point, Hover/inspect UX, Cost/lead time field shape, Dedup semantics

---

## Texture Map Slots

| Option | Description | Selected |
|--------|-------------|----------|
| 1 required + 2 optional | Color required; roughness and reflection optional. Flexibility without forcing extra work for simple paints/fabrics. | ✓ |
| 1 only (color) | Just the color map. Simpler form; doesn't deliver MAT-ENGINE-01 §1 in full. | |
| All 3 required | Force color + roughness + reflection on every upload. High friction. | |

**User's choice:** 1 required + 2 optional (Recommended)
**Notes:** Matches the requirement language in MAT-ENGINE-01 verifiable section.

---

## Required Metadata Fields

| Option | Description | Selected |
|--------|-------------|----------|
| Name + tile size required; rest optional | Brand / SKU / cost / lead time skippable. Matches Pinterest-before-vendor exploration flow. | ✓ |
| Name + tile size + brand required | Brand becomes required (organizing aid). SKU / cost / lead time optional. | |
| All fields required | Strictest. Best for shopping discipline; worst for browsing. | |

**User's choice:** Name + tile size required; rest optional (Recommended)
**Notes:** Reinforces D-04/D-05 decision to keep cost/lead time as free-text strings.

---

## Library Entry Point (Phase 67 only)

| Option | Description | Selected |
|--------|-------------|----------|
| New 'Materials' section inside existing ProductLibrary | Minimal new UI; works without Phase 70's restructure; easy for Phase 70 to relocate later. | ✓ |
| Reuse MyTexturesList — add 'Save as Material' affordance | Lowest UI surface but blurs the texture/material distinction the milestone is establishing. | |
| Standalone 'Materials' button in the toolbar | Top-toolbar entry point. Simplest to ship; feels disconnected from where Jessica browses today. | |

**User's choice:** New 'Materials' section inside existing ProductLibrary (Recommended)
**Notes:** Phase 70 will lift the section into the proper top-level toggle.

---

## Hover/Inspect UX

| Option | Description | Selected |
|--------|-------------|----------|
| Hover tooltip on the library card | Brand · SKU · cost · lead time · tile size on mouseover. Matches existing LibraryCard pattern. | ✓ |
| Click-to-expand inline panel | Click expands details below the card. Better for touch; takes a click. | |
| PropertiesPanel-style side panel on selection | Click selects the Material; side panel shows full metadata. Heavier UI build. | |

**User's choice:** Hover tooltip on the library card (Recommended)
**Notes:** Empty fields gracefully omitted; reuse Phase 33 design-system tooltip primitive if available.

---

## Cost & Lead Time Field Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Free-text strings for both | Cost/lead time = string. Accommodates 'Quote on request', '2–4 weeks', 'Made to order'. | ✓ |
| Number for cost, integer days for lead time | Forces clean numeric data. Better for filter/sort but rejects messy real-world inputs. | |
| Number + unit dropdown for cost; integer days for lead time | Most structured. Biggest upload-form friction for early-exploration phase. | |

**User's choice:** Free-text strings for both (Recommended)
**Notes:** Filtering/sorting by cost is explicitly out of scope for v1.17.

---

## Dedup Semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Color-map SHA-256 = same Material; second upload links to existing entry | Matches existing UserTexture D-11 pattern. Edit the existing entry for metadata variants. | ✓ |
| Allow duplicates if metadata differs | Same color-map can back two Materials if brand/SKU differs. Better for shopping comparison; risks accidental near-duplicates. | |
| Warn on dedup, let Jessica choose | Modal asks 'link to existing or create variant?'. Most flexible; more clicks per upload. | |

**User's choice:** Color-map SHA-256 = same Material; second upload links to existing entry (Recommended)
**Notes:** Roughness/reflection map hashes are NOT part of the dedup key.

---

## Claude's Discretion

- Exact tooltip styling, animation timing, reduced-motion behavior — apply existing D-39 conventions from Phase 33.
- Whether the new Materials section in ProductLibrary uses a tab, a collapsible group, or a divider — pick what's least disruptive to the existing layout.
- Test-driver shape (`window.__driveMaterialUpload` etc.) — follow Phase 34 `__driveTextureUpload` precedent.
- Toast copy on dedup hit — short and consistent with existing texture-dedup toast.

## Open for Plan-Phase Research

- **D-09:** Whether `Material` wraps one-or-more `userTextureId` references (Material as metadata wrapper) or owns its texture maps directly (Material as new texture root). Requirements explicitly flagged this as a hypothesis to test.

## Deferred Ideas

- Structured numeric cost + lead time with filter/sort UI.
- Click-to-expand or PropertiesPanel-style Material inspector.
- Allow duplicate Materials sharing a color map (vendor variants).
- Material as new texture root (architectural alternative — researcher decides).
- Filter/sort by metadata in the library grid.
