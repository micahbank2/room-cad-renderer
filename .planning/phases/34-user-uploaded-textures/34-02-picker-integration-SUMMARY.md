---
phase: 34-user-uploaded-textures
plan: 02
subsystem: ui-picker
tags: [LIB-06, phase-34, picker, my-textures, delete-dialog, cache-event]
requires: [34-00, 34-01]
provides:
  - MyTexturesList shared component (grid + upload tile + ⋮ menu)
  - DeleteTextureDialog with locked D-07 copy + user-texture-deleted CustomEvent
  - MY TEXTURES CategoryTab integrated in FloorMaterialPicker, SurfaceMaterialPicker (ceiling via CeilingPaintSection), WallSurfacePanel
  - cadStore actions accept userTextureId pass-through (no Immer change required — Plan 00 widened the types)
affects:
  - tests/App.restore.test.tsx, tests/phase31*.tsx, tests/snapIntegration.test.tsx — added createStore + values to idb-keyval mocks (cascade from picker imports)
tech_stack:
  added: []  # lucide-react already added Plan 01; CategoryTabs already shipped Phase 33
  patterns:
    - "user-texture-deleted" CustomEvent on window — Plan 03's userTextureCache will subscribe to invalidate its THREE.Texture entries
    - ObjectURL lifecycle via Map<id, url> cache, revoked on texture removal and component unmount
    - Backward-compatible picker extension: SurfaceMaterialPicker gets an optional onSelectUserTexture prop — existing callers are untouched
key_files:
  created:
    - path: src/components/MyTexturesList.tsx
      purpose: Shared MY TEXTURES tab body — grid of texture cards + UPLOAD tile + per-card ⋮ menu
    - path: src/components/DeleteTextureDialog.tsx
      purpose: Ref-count confirm dialog per D-07 + emits user-texture-deleted CustomEvent
    - path: tests/myTexturesList.test.tsx
      purpose: 9 tests — loading/empty/populated, onSelect payload, ⋮ menu, edit/delete modal mounts, selected ring
    - path: tests/deleteTextureDialog.test.tsx
      purpose: 6 tests — N=0/1/3 copy, headers, Discard, Delete Texture dispatch + event
    - path: tests/pickerMyTexturesIntegration.test.tsx
      purpose: 7 tests — MY TEXTURES tab in each picker + correct store-action payload
  modified:
    - path: src/components/FloorMaterialPicker.tsx
      change: Added CategoryTabs wrapper (PRESETS / MY TEXTURES); MY TEXTURES renders MyTexturesList with handleUserTextureSelect
    - path: src/components/SurfaceMaterialPicker.tsx
      change: Added optional onSelectUserTexture + selectedUserTextureId props; renders CategoryTabs + MyTexturesList when provided
    - path: src/components/CeilingPaintSection.tsx
      change: Passes onSelectUserTexture to SurfaceMaterialPicker; dispatches updateCeiling(id, { userTextureId, surfaceMaterialId: undefined })
    - path: src/components/WallSurfacePanel.tsx
      change: Added CategoryTabs inside WALLPAPER block; MY TEXTURES renders MyTexturesList with handleWallpaperUserTexture (kind='pattern', userTextureId, scaleFt)
    - path: tests/phase31LabelOverride.test.tsx, tests/phase31Resize.test.tsx, tests/phase31Undo.test.tsx, tests/phase31WallEndpoint.test.tsx, tests/snapIntegration.test.tsx, tests/App.restore.test.tsx
      change: Rule-3 auto-fix — added createStore + values to idb-keyval mock so picker imports don't throw at module-eval time
decisions:
  - id: D-02-stub-delete-dialog-first
    label: "Task 1 landed a minimal DeleteTextureDialog stub (heading only) so its test 8 (⋮ → Delete opens dialog) could green without Task 2 being complete. Task 2 then replaced the stub with the full ref-count + event implementation."
    rationale: "Keeps TDD cycles per-task green. An explicit stub-then-replace is clearer than ordering Tasks 1 and 2 as one fused TDD run, and matches the plan's preferred approach."
  - id: D-02-wallpaper-side-action
    label: "Wallpaper-side store action discovered via WallSurfacePanel read: setWallpaper(wallId, side, wallpaper | undefined). No new action needed — the existing signature already accepts a full Wallpaper object, and Wallpaper.userTextureId is already optional (Plan 00 widened the type)."
    rationale: "Plan expected 'wallpaper-side action accepts it' without new API surface. Verified by test — setWallpaper gets called with { kind: 'pattern', userTextureId, scaleFt } and persists correctly."
  - id: D-02-object-url-cache
    label: "MyTexturesList uses a ref-backed Map<id, ObjectURL> + setUrlVersion counter pattern for re-renders, not useMemo"
    rationale: "useMemo against `textures` identity creates fresh URLs every list re-render (IDs stable but array identity changes after save/remove). Ref + diff-on-effect revokes only when an id leaves the list and avoids the allocate/revoke churn. setUrlVersion bump after the first Map insert ensures initial thumbnails paint without waiting for the next textures update."
  - id: D-02-cache-event-contract
    label: "window.dispatchEvent(new CustomEvent('user-texture-deleted', { detail: { id } })) fires AFTER a successful remove()"
    rationale: "Plan 03 cache will addEventListener('user-texture-deleted', e => cache.delete(e.detail.id)). Using a DOM event instead of a shared-module callback keeps Plan 02 dependency-free from Plan 03's userTextureCache module — consistent with D-05 (shared-cache via acquireTexture) pattern from Phase 32 but for the orphan-invalidation side of the lifecycle."
  - id: D-02-rule-3-mock-cascade
    label: "Auto-fixed 6 tests (phase31* x 4, snapIntegration, App.restore) by adding createStore + values to their idb-keyval mocks"
    rationale: "Rule 3 scope — direct consequence of my picker edits. Picker imports MyTexturesList → useUserTextures → userTextureStore.ts, which calls createStore at module eval. Without the mock extension these test files fail to load. Kept the mock additions minimal (just the two missing exports) to avoid expanding out-of-scope test behavior."
metrics:
  duration_minutes: 30
  tasks_completed: 3
  commits: 6
  files_created: 5
  files_modified: 10
  tests_added: 22  # 9 MyTexturesList + 6 DeleteTextureDialog + 7 picker integration
  tests_passing: 22
  suite_baseline: "6 pre-existing LIB-03/04/05 failures unchanged (500 pass / 6 fail / 3 todo across 75 test files)"
  completed: 2026-04-22
---

# Phase 34 Plan 02: Picker Integration Summary

**One-liner:** Shared MyTexturesList + DeleteTextureDialog components land the user-facing surface of LIB-06; all three material pickers (floor, ceiling via CeilingPaintSection, wall surface) expose a MY TEXTURES tab that dispatches the correct `userTextureId`-carrying cadStore action; delete flow emits the `user-texture-deleted` CustomEvent that Plan 03's cache will subscribe to.

## Delivered

### 1. `src/components/MyTexturesList.tsx` (Task 1)

**Prop contract (locked for picker consumption):**
```typescript
export interface MyTexturesListProps {
  selectedId?: string;  // current applied userTextureId for this surface
  onSelect: (id: string, tileSizeFt: number) => void;
}
```

**States rendered:**
- **Loading** — 3 skeleton tiles (`bg-obsidian-highest` with `animate-pulse`, guarded by `useReducedMotion`).
- **Empty** — `NO CUSTOM TEXTURES` heading + body copy (locked) + inline UploadSlot.
- **Populated** — `grid grid-cols-3 gap-4 p-4` of `<TextureCard />` followed by `<UploadSlot />`.

**Per-card ⋮ menu:**
- Icon: lucide `MoreHorizontal` (D-33).
- `aria-label="Texture options"` (D-33 icon-only a11y).
- Revealed on card hover via `opacity-0 group-hover:opacity-100`.
- Dropdown: Edit → opens UploadTextureModal in edit mode; Delete → opens DeleteTextureDialog.
- Close-on-outside-click via `window.addEventListener("click", ...)` with `data-texture-menu` boundary marker.

**ObjectURL lifecycle:** See D-02-object-url-cache. Revokes on texture removal from list and on unmount.

### 2. `src/components/DeleteTextureDialog.tsx` (Task 2)

**Prop contract:**
```typescript
export interface DeleteTextureDialogProps {
  open: boolean;
  texture: UserTexture | null;
  onClose: () => void;
  onDeleted?: (id: string) => void;
}
export const USER_TEXTURE_DELETED_EVENT = "user-texture-deleted";
```

**Locked D-07 copy:**
| Count | Body |
|-------|------|
| 0 | `Delete {NAME}? This texture isn't used by any surface.` |
| 1 | `Delete {NAME}? 1 surface in this project use it. They'll fall back to their base color.` |
| N>1 | `Delete {NAME}? {N} surfaces in this project use it. They'll fall back to their base color.` |

(Grammatically the N=1 copy reads "use it" not "uses it" — locked per plan Task 2 spec to avoid pluralization branching.)

**Event contract — Plan 03 must subscribe:**
```typescript
window.addEventListener("user-texture-deleted", (e: CustomEvent<{ id: string }>) => {
  userTextureCache.delete(e.detail.id);  // or equivalent invalidation
});
```
Dispatched after a successful `useUserTextures().remove(texture.id)` call, before `onClose()`.

**In-flight state:** Delete Texture button becomes `Deleting…` with `Loader2` spinner (animate-spin guarded by `useReducedMotion`).

### 3. Picker Integration (Task 3)

| Picker | Integration | Dispatch |
|--------|-------------|----------|
| `FloorMaterialPicker` | `CategoryTabs` (PRESETS / MY TEXTURES) wraps the existing preset grid + legacy UPLOAD IMAGE flow. | `setFloorMaterial({ kind: "user-texture", userTextureId, scaleFt: tileSizeFt, rotationDeg: 0 })` |
| `SurfaceMaterialPicker` (ceiling) | Backward-compat: new optional `onSelectUserTexture` + `selectedUserTextureId` props. When omitted, the flat grid renders as before. When provided, `CategoryTabs` + `MyTexturesList` take over. | `updateCeiling(ceilingId, { userTextureId, surfaceMaterialId: undefined })` — passed in from `CeilingPaintSection`. |
| `WallSurfacePanel` | New `CategoryTabs` inside the existing WALLPAPER section, above the color/upload controls. | `setWallpaper(wall.id, activeSide, { kind: "pattern", userTextureId, scaleFt: tileSizeFt })` |

**Wallpaper-side action name:** `setWallpaper(wallId: string, side: WallSide, wallpaper: Wallpaper | undefined)` — existing action. No new API surface (D-02-wallpaper-side-action).

**cadStore changes:** none needed. `setFloorMaterial`, `updateCeiling`, `setWallpaper` all accept objects with `userTextureId` because Plan 00 widened `FloorMaterial`, `Ceiling`, and `Wallpaper` to carry the optional field.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] idb-keyval mock cascade**
- **Found during:** Task 3 full-suite run — 5 test files that mount `<App />` (phase31 x 4 + snapIntegration) and the App.restore suite started failing because their `vi.mock("idb-keyval", ...)` didn't export `createStore` or `values`, which are now transitively required by the picker components through `useUserTextures` → `userTextureStore.ts`.
- **Fix:** Added `createStore: vi.fn(() => ({}))` and `values: vi.fn().mockResolvedValue([])` to 6 test mocks.
- **Files modified:** `tests/phase31LabelOverride.test.tsx`, `tests/phase31Resize.test.tsx`, `tests/phase31Undo.test.tsx`, `tests/phase31WallEndpoint.test.tsx`, `tests/snapIntegration.test.tsx`, `tests/App.restore.test.tsx`
- **Commit:** `c6ec7d4` (same commit as picker wiring).
- **Impact on contract:** None — only mock-shape additions; test assertions unchanged.

**2. [D-02-stub-delete-dialog-first] TDD ordering within the plan**
- **Found during:** Task 1 writing — test 8 mounts `<DeleteTextureDialog />` on ⋮ → Delete, but Task 2 is expected to produce the full component. A one-file stub with just the `DELETE TEXTURE` heading let Task 1's test green on its own; Task 2's GREEN step replaced the stub with the full ref-count + event implementation.
- **Fix:** Landed minimal `DeleteTextureDialog` stub alongside `MyTexturesList` in Task 1 GREEN commit; Task 2 GREEN completely rewrote it.
- **Commits:** `bf6a485` (Task 1 GREEN, stub), `633fd1b` (Task 2 GREEN, full impl).
- **Impact on contract:** None — behavior after Task 2 matches the plan verbatim.

## Test Coverage

| File | Tests | Covers |
|------|-------|--------|
| `tests/myTexturesList.test.tsx` | 9 | Loading skeleton count, empty heading + body copy, populated UPPERCASE names, UPLOAD tile, onSelect payload shape, ⋮ menu items, aria-label, Edit → opens edit modal, Delete → opens delete dialog, selected ring class |
| `tests/deleteTextureDialog.test.tsx` | 6 | N=0 / N=1 / N=3 body copy (with "surface"/"surfaces" + "use it"/"They'll fall back to their base color"), header "DELETE TEXTURE", Discard/Delete Texture CTAs, Discard does not remove, Delete Texture calls remove + dispatches `user-texture-deleted` CustomEvent + fires onDeleted + onClose |
| `tests/pickerMyTexturesIntegration.test.tsx` | 7 | FloorMaterialPicker MY TEXTURES tab + setFloorMaterial dispatch shape; SurfaceMaterialPicker ceiling tab + updateCeiling with userTextureId + surfaceMaterialId: undefined; WallSurfacePanel MY TEXTURES + setWallpaper dispatch (kind=pattern, userTextureId); empty-state preservation with zero textures |
| **Total** | **22** | All pass. Zero regressions — full suite 500 pass / 6 pre-existing fail (LIB-03/04/05) / 3 todo. |

## Phase-Level Gate

1. [x] `npx vitest run tests/myTexturesList.test.tsx tests/deleteTextureDialog.test.tsx tests/pickerMyTexturesIntegration.test.tsx` — 22/22 green
2. [x] `npx vitest run` — 500 passing, 6 pre-existing LIB-03/04/05 + AddProductModal + SidebarProductPicker failures (no new failures)
3. [x] All D-07 copywriting strings grep-verifiable — see per-task acceptance below
4. [x] All 3 pickers integrate MyTexturesList — grep-verified
5. [x] `user-texture-deleted` CustomEvent emitted — verified by test
6. [x] `onSelect` dispatches produce the correct store action shapes — verified

## Self-Check: PASSED

Files verified:
- FOUND: `src/components/MyTexturesList.tsx`
- FOUND: `src/components/DeleteTextureDialog.tsx`
- FOUND: `tests/myTexturesList.test.tsx`
- FOUND: `tests/deleteTextureDialog.test.tsx`
- FOUND: `tests/pickerMyTexturesIntegration.test.tsx`
- MODIFIED: `src/components/FloorMaterialPicker.tsx`, `src/components/SurfaceMaterialPicker.tsx`, `src/components/CeilingPaintSection.tsx`, `src/components/WallSurfacePanel.tsx`

Commits verified:
- RED Task 1: `02a35f4` (test(34-02): add failing test for MyTexturesList)
- GREEN Task 1: `bf6a485` (feat(34-02): implement MyTexturesList shared picker content)
- RED Task 2: `03c8517` (test(34-02): add failing test for DeleteTextureDialog)
- GREEN Task 2: `633fd1b` (feat(34-02): implement DeleteTextureDialog with ref-count + cache-invalidation event)
- RED Task 3: `7ee3d8d` (test(34-02): add failing picker integration tests)
- GREEN Task 3: `c6ec7d4` (feat(34-02): wire MY TEXTURES tab into floor / ceiling / wall pickers)

Acceptance grep checks:
- `grep -q "export function MyTexturesList" src/components/MyTexturesList.tsx` — OK
- `grep -q "NO CUSTOM TEXTURES" src/components/MyTexturesList.tsx` — OK
- `grep -q "Upload a photo of a surface to use it on walls, floors, and ceilings." src/components/MyTexturesList.tsx` — OK
- `grep -q ">UPLOAD<" src/components/MyTexturesList.tsx` — OK
- `grep -q "aria-label=\"Texture options\"" src/components/MyTexturesList.tsx` — OK
- `grep -q "export function DeleteTextureDialog" src/components/DeleteTextureDialog.tsx` — OK
- `grep -q "user-texture-deleted" src/components/DeleteTextureDialog.tsx` — OK
- `grep -q "They'll fall back to their base color." src/components/DeleteTextureDialog.tsx` — OK
- `grep -q "countTextureRefs" src/components/DeleteTextureDialog.tsx` — OK
- `grep -c "material-symbols-outlined" src/components/MyTexturesList.tsx src/components/DeleteTextureDialog.tsx` — 0 (D-33)
- `grep -qE 'kind:\s*"user-texture"' src/components/FloorMaterialPicker.tsx` — OK
- `grep -qE 'updateCeiling\([^)]*userTextureId' src/components/CeilingPaintSection.tsx` — OK
- `grep -q "userTextureId" src/components/WallSurfacePanel.tsx` — OK

## Next Steps — Plan 03 (Wave 3)

Plan 03 consumes this plan's delivered surface by:

1. Subscribing to the `user-texture-deleted` CustomEvent on `window` to invalidate cached `THREE.Texture` entries when a texture is deleted.
2. Reading `userTextureId` from `Wallpaper` / `FloorMaterial` / `Ceiling` in the 3D render path; looking up the `UserTexture` blob via `getUserTexture(id)`; creating a `THREE.Texture` from `URL.createObjectURL(blob)` with `SRGBColorSpace` and caching via the Phase 32 refcount dispose pattern.
3. Handling the orphan case (D-08/D-09): `getUserTexture(id)` returns undefined → surface renders at its base hex color (no toast, no badge).

No further cadStore changes required.
