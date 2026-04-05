# Phase 2: Product Library - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 02-product-library
**Areas discussed:** (none — user deferred to Claude's discretion)

---

## Gray Areas Presented

| Area | Description |
|------|-------------|
| Library architecture & orphans | Consolidate to productStore; behavior when deleting a library product that's already placed in a project |
| Optional dimensions UX | How image-only products work: skip toggle, placeholder size, resize-later, render indicators |
| Search placement & behavior | Search location (library view vs sidebar), fuzzy vs exact, instant filter |
| Sidebar product access | Compact searchable product picker in canvas sidebar vs library-view-only |

**User's choice:** "actually just execute everything i dont wanna discuss"

Discussion skipped. Claude captured default decisions covering all four areas in CONTEXT.md.

## Claude's Discretion

All four gray areas resolved via Claude's recommended defaults:

1. **Library architecture:** New `productStore` Zustand store, existing global IndexedDB key, orphan = dashed-box placeholder with last-known name.
2. **Optional dimensions:** Skip toggle on modal, nullable dims, 2×2×2 placeholder render with dashed border (2D) and 80% opacity (3D), editable later via PropertiesPanel.
3. **Search:** Keep existing name-substring search in library view; add case-insensitive name search to new sidebar picker.
4. **Sidebar picker:** Add compact searchable product list to canvas sidebar so drag-drop doesn't require switching to library view.

## Deferred Ideas

- Post-creation product editing (name/category/image)
- Bulk image import
- Tags / custom filters
- Recently-used / favorites section
- Cloud sync (explicitly v2)
- Deletion undo / versioning
- GLB/OBJ upload (explicitly out of scope)
- AI dimension detection
