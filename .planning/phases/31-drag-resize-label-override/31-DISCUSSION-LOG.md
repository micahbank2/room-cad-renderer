# Phase 31: Drag-to-Resize + Label Override - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 31-drag-resize-label-override
**Areas discussed:** Product resize axis mode, Wall endpoint smart-snap, Label override UX, Label override scope, Single-undo hardening

---

## Product Resize Axis Mode (EDIT-22)

| Option | Description | Selected |
|--------|-------------|----------|
| 1A | Keep uniform `sizeScale` only — corners resize uniformly, no edge handles, no schema change | |
| 1B | Split to per-axis scale — add `widthScale` + `depthScale`, migrate from `sizeScale` | |
| 1C | Lazy per-axis overrides — keep `sizeScale`, add optional `widthFtOverride` / `depthFtOverride` set only when edge dragged | ✓ |

**User's choice:** 1C (recommended default)
**Notes:** Least-invasive migration path. Uniform aspect-locked behavior remains the default; overrides only set when user deliberately breaks aspect ratio via edge handle. No migration risk for existing saved projects.

---

## Wall Endpoint Smart-Snap Integration (EDIT-23, closes D-08b)

### 2a. Snap targets

| Option | Description | Selected |
|--------|-------------|----------|
| Endpoints only | Other wall endpoints — clean corner alignment | |
| Endpoints + midpoints | Add wall midpoints as snap targets | ✓ |
| + product bboxes | Also snap wall endpoints to product edges | |

**User's choice:** Endpoints + midpoints
**Notes:** Product bboxes excluded — walls snapping to couches is the wrong precedence direction.

### 2b. Shift-orthogonal vs smart-snap

| Option | Description | Selected |
|--------|-------------|----------|
| Shift-orthogonal wins | Lock axis; smart-snap applies only along locked axis | ✓ |
| Smart-snap wins | Orthogonal suggestion overridden by smart-snap target | |
| Mutually exclusive | Shift disables smart-snap entirely | |

**User's choice:** Shift-orthogonal wins
**Notes:** Compute orthogonal-constrained candidate first, then pass that 1-axis candidate into `computeSnap()` with axis-restricted targets.

### 2c. Alt/Option disables smart-snap on endpoint drag

| Option | Description | Selected |
|--------|-------------|----------|
| Yes | Same convention as Phase 30 product drag | ✓ |
| No | Smart-snap always on during endpoint drag | |

**User's choice:** Yes
**Notes:** Preserves Phase 30 Alt-disable pattern documented in CLAUDE.md.

---

## Label Override UX (CUSTOM-06)

### 3a. Commit timing

| Option | Description | Selected |
|--------|-------------|----------|
| Live every keystroke | History entry per keypress | |
| Live preview + commit on Enter/blur | Canvas updates live; history entry on Enter or blur | ✓ |
| Commit on blur only | No live preview | |

**User's choice:** Live preview + commit on Enter/blur
**Notes:** Mirrors Phase 29 dimension editor pattern (EDIT-20/21).

### 3b. Undo granularity

| Option | Description | Selected |
|--------|-------------|----------|
| One entry per commit | Single undo reverts whole edit session | ✓ |
| One per keystroke | Noisy undo stack | |

**User's choice:** One entry per commit

### 3c. Placeholder

| Option | Description | Selected |
|--------|-------------|----------|
| Catalog name as placeholder | Ghost text shows default | ✓ |
| Empty placeholder | Generic "Label" placeholder | |

**User's choice:** Catalog name as placeholder

### 3d. Max length

| Option | Description | Selected |
|--------|-------------|----------|
| 40 chars | Fits 9pt IBM Plex Mono at typical zoom | ✓ |
| 60 | More flexibility | |
| Unlimited | No constraint | |

**User's choice:** 40 chars

---

## Label Override Scope

| Option | Description | Selected |
|--------|-------------|----------|
| 4A | Custom elements only — per CUSTOM-06 literal wording | ✓ |
| 4B | Extend to catalog `PlacedProduct` too | |

**User's choice:** 4A
**Notes:** Extending to catalog products is a separate capability — tracked as deferred idea for future phase.

---

## Single-Undo Hardening (EDIT-24)

| Option | Description | Selected |
|--------|-------------|----------|
| 5A | Audit + regression tests; rely on existing D-03 pattern | ✓ |
| 5B | Refactor to explicit `beginDrag()` / `endDrag()` transaction API | |

**User's choice:** 5A
**Notes:** D-03 drag-transaction pattern already ships and is battle-tested. New red tests will lock the contract for product-resize (corner + edge) and wall-endpoint.

---

## Claude's Discretion

- Exact pixel size/color of new edge handles (match existing corner style)
- Exact placement of label-override input within PropertiesPanel hierarchy
- Test driver naming conventions (`window.__startDragResize`, etc.)
- Whether to add a "RESET" affordance or rely on empty-field-reverts semantics

## Deferred Ideas

- Label override on catalog `PlacedProduct` (future phase)
- Non-aspect-locked custom element resize beyond per-axis (exotic shape editing)
- Multi-select drag-resize
- Rotated-product orientation-aware resize labels
- Wall endpoint snap to product bbox edges
