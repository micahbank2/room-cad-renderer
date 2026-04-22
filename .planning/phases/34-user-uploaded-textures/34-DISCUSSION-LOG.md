# Phase 34: User-Uploaded Textures - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `34-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 34-user-uploaded-textures
**Areas discussed:** Upload UI & flow, Material picker integration, Delete & orphan UX, Tile-size & per-placement override

---

## Gray-Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Upload UI & flow | Entry point, drop/pick flow, bulk vs single, error surface | ✓ |
| Material picker integration | Grouping in picker, surface-type scope, sort order | ✓ |
| Delete & orphan UX | Confirm dialog, orphan indicator, reconciliation scope | ✓ |
| Tile-size & per-placement override | Catalog-only vs per-placement override, editability, VIZ-10 hedge | ✓ |

**User's choice:** All four selected (multiSelect).

---

## Upload UI & Flow

### Q1: Where should the "Upload Texture" entry point live?

| Option | Description | Selected |
|--------|-------------|----------|
| Inside material picker (Recommended) | Persistent `+ Upload Texture` tile at end of user-textures section. Zero mode switch. | ✓ |
| Modal like AddProductModal | Dedicated modal launched from a sidebar button. Familiar shape. Heavier mode switch. | |
| Sidebar tab | New top-level `TEXTURES` tab. Discovery-heavy; requires nav. | |

**User's choice:** Inside material picker.

### Q2: Drop/pick flow — one step or two?

| Option | Description | Selected |
|--------|-------------|----------|
| One-step modal (Recommended) | Drop → preview → name + tile size fields → Save, all in one modal. | ✓ |
| Two-step flow | Drop → separate "Configure Texture" panel. More guided, more clicks. | |
| Inline (no modal) | Picker row expands inline. Feels native but gets busy. | |

**User's choice:** One-step modal.

### Q3: Bulk or one at a time?

| Option | Description | Selected |
|--------|-------------|----------|
| One at a time (Recommended) | Single file per upload. Simpler pipeline + UI. | ✓ |
| Bulk drop with queue | Drop N files → queue thumbnails → fill metadata → save all. | |

**User's choice:** One at a time.

### Q4: Error surface for MIME reject / oversize / decode failure?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in modal + toast (Recommended) | Inline red error under file field; success toast. | ✓ |
| Toast only | Errors fire as toasts. Modal stays in pending state. | |
| Modal blocking dialog | Separate alert dialog. Heaviest. | |

**User's choice:** Inline in modal + toast.

---

## Material Picker Integration

### Q1: How should user textures appear in the material picker?

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated `MY TEXTURES` category tab (Recommended) | New tab in CategoryTabs. Clear mental model. | ✓ |
| Mixed into existing categories | Jessica tags category at upload. Unified but confusing. | |
| Separate section below bundled | Swimlane below bundled; no tab switch. | |

**User's choice:** Dedicated `MY TEXTURES` category tab.

### Q2: Any-surface vs surface-type tagging at upload?

| Option | Description | Selected |
|--------|-------------|----------|
| Any surface, always (Recommended) | Same texture in wall + floor + ceiling pickers. | ✓ |
| Tag surface-type at upload | Jessica classifies at upload; shows only in matching pickers. | |

**User's choice:** Any surface, always.

### Q3: Default ordering of MY TEXTURES list?

| Option | Description | Selected |
|--------|-------------|----------|
| Most recently uploaded first (Recommended) | Newest at top; matches upload-then-apply intent. | ✓ |
| Alphabetical by name | Stable long-term; better at scale. | |
| You decide | Claude picks (would pick recent-first). | |

**User's choice:** Most recently uploaded first.

---

## Delete & Orphan UX

### Q1: Confirmation when deleting a referenced texture?

| Option | Description | Selected |
|--------|-------------|----------|
| Confirm dialog with ref-count (Recommended) | "Delete {name}? {N} surfaces use it." Prevents accidental loss. | ✓ |
| Silent delete + undo toast | Immediate delete with Undo in toast. Less friction, more surprise. | |
| Silent delete, no warning | Just delete. Cheapest; worst UX when it bites. | |

**User's choice:** Confirm dialog with ref-count.

### Q2: Orphan indicator on project load?

| Option | Description | Selected |
|--------|-------------|----------|
| Silent fallback, no indicator (Recommended) | Renders at hex; matches Phase 32 missing-texture. | ✓ |
| Toast on load | One-time toast "N orphan textures fell back". | |
| Per-surface badge in PropertiesPanel | Selected surface shows ⚠️ with "Pick new material". | |

**User's choice:** Silent fallback, no indicator.

### Q3: Reconciliation scope?

| Option | Description | Selected |
|--------|-------------|----------|
| Simple lookup at render (Recommended) | `userTextureStore.get(id)` per render; missing → hex. | ✓ |
| One-time sweep on project load | Iterate surfaces → collect orphans → optionally null. | |

**User's choice:** Simple lookup at render.

---

## Tile-Size & Per-Placement Override

### Q1: Per-placement tile-size override — in scope or deferred?

| Option | Description | Selected |
|--------|-------------|----------|
| Catalog-only, defer override (Recommended) | One tile size per texture. Defer override to post-v1.8. | ✓ |
| Per-placement override now | Ship `tileSizeOverride` mirroring Phase 31 pattern. | |
| Catalog-editable after upload | No override but editable catalog entry. | |

**User's choice:** Catalog-only, defer override. (Note: catalog editability still selected in Q2.)

### Q2: Edit name / tile size after upload?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, edit from MY TEXTURES list (Recommended) | ⋮ menu → Edit modal with name + tile-size. | ✓ |
| Name only — tile size immutable | Can rename; tile size locked. Re-upload to change. | |
| No edit — delete + reupload | No edit UI. Cheapest; worst friction. | |

**User's choice:** Yes, edit from MY TEXTURES list.

### Q3: VIZ-10 / Phase 36 cache strategy hedge?

| Option | Description | Selected |
|--------|-------------|----------|
| Build conservatively on Phase 32 patterns (Recommended) | Reuse refcount dispose + non-disposing cache + `dispose={null}` as-is. | ✓ |
| Add instrumentation hooks up-front | Lifecycle log hooks for Phase 36 harness to extend. | |
| Wait for Phase 36 first | Block Phase 34 until VIZ-10 root-cause lands. Breaks sequencing. | |

**User's choice:** Build conservatively on Phase 32 patterns.

---

## Claude's Discretion

Areas explicitly deferred to Claude during planning / implementation:
- Exact `+ Upload Texture` tile visual (within D-33/D-34 token constraints)
- Progress-indicator shape during downscale/hash (spinner sufficient)
- Image-decode + downscale implementation choice (`createImageBitmap` + `OffscreenCanvas` vs `<img>` + `<canvas>`)
- Whether Edit modal is a new component or shares with Upload via `mode` prop
- SHA-256 implementation (Web Crypto `crypto.subtle.digest` default; no polyfill)
- Test-driver hook naming (follow Phase 29/30/31 pattern)

---

## Deferred Ideas

Captured during discussion, belong to other phases or future milestones:
- Per-placement tile-size override (post-v1.8 if demand appears)
- Bulk upload queue
- User-uploaded normal / roughness maps (Out of Scope v1.8)
- Per-surface orphan badge / reconciliation sweep
- Surface-type tagging at upload
- User-facing sort controls on MY TEXTURES
- Shared instrumentation hooks with Phase 36 harness (Phase 36 extends at that phase)
