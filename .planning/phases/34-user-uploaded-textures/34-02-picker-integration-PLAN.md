---
phase: 34-user-uploaded-textures
plan: 02
type: execute
wave: 2
depends_on: [34-00, 34-01]
files_modified:
  - src/components/MyTexturesList.tsx
  - src/components/DeleteTextureDialog.tsx
  - src/components/FloorMaterialPicker.tsx
  - src/components/SurfaceMaterialPicker.tsx
  - src/components/WallSurfacePanel.tsx
  - src/stores/cadStore.ts
  - tests/myTexturesList.test.tsx
  - tests/deleteTextureDialog.test.tsx
autonomous: true
requirements: [LIB-06]
gap_closure: false

must_haves:
  truths:
    - "A MY TEXTURES tab appears in the floor-material picker, the ceiling (SurfaceMaterialPicker) picker, and the wall surface (WallSurfacePanel) picker"
    - "Jessica can click the + UPLOAD tile in MY TEXTURES to open UploadTextureModal in create mode"
    - "Jessica can click a texture card to apply it — floor picker dispatches setFloorMaterial with kind: 'user-texture'; ceiling dispatches updateCeiling with userTextureId; wall dispatches the wallpaper side A/B userTextureId"
    - "The ⋮ menu on a card exposes Edit (opens modal in edit mode) and Delete (opens DeleteTextureDialog)"
    - "DeleteTextureDialog shows exact ref-count copy from D-07 and only deletes on confirm"
    - "Empty state copy matches UI-SPEC: 'NO CUSTOM TEXTURES' heading + 'Upload a photo of a surface to use it on walls, floors, and ceilings.' body"
  artifacts:
    - path: "src/components/MyTexturesList.tsx"
      provides: "Shared MY TEXTURES grid + upload tile + card menu, consumed by all three pickers"
      contains: "export function MyTexturesList"
    - path: "src/components/DeleteTextureDialog.tsx"
      provides: "Ref-count confirm dialog per UI-SPEC §3"
      contains: "export function DeleteTextureDialog"
    - path: "src/stores/cadStore.ts"
      provides: "Store actions accept userTextureId refs (setFloorMaterial passes through, updateCeiling merges userTextureId, wallpaper-side action accepts it)"
      contains: "userTextureId"
  key_links:
    - from: "src/components/MyTexturesList.tsx"
      to: "src/components/UploadTextureModal.tsx"
      via: "mounts modal on + Upload click and on ⋮ → Edit"
      pattern: "UploadTextureModal"
    - from: "src/components/MyTexturesList.tsx"
      to: "src/components/DeleteTextureDialog.tsx"
      via: "mounts dialog on ⋮ → Delete"
      pattern: "DeleteTextureDialog"
    - from: "src/components/DeleteTextureDialog.tsx"
      to: "src/lib/countTextureRefs.ts"
      via: "countTextureRefs(useCADStore.getState().snapshot, id) — computed on open"
      pattern: "countTextureRefs"
    - from: "src/components/FloorMaterialPicker.tsx"
      to: "src/stores/cadStore.ts"
      via: "setFloorMaterial({ kind: 'user-texture', userTextureId, scaleFt: texture.tileSizeFt, rotationDeg: 0 })"
      pattern: "kind:\\s*\"user-texture\""
    - from: "src/components/SurfaceMaterialPicker.tsx"
      to: "src/stores/cadStore.ts"
      via: "updateCeiling(ceilingId, { userTextureId })"
      pattern: "updateCeiling.*userTextureId"
    - from: "src/components/WallSurfacePanel.tsx"
      to: "src/stores/cadStore.ts"
      via: "wallpaper-side action with userTextureId"
      pattern: "wallpaper.*userTextureId|userTextureId.*wallpaper"
---

<objective>
Wire user textures into the three existing material pickers. Create a shared `MyTexturesList` component that renders the MY TEXTURES tab content (grid of cards + upload tile + per-card ⋮ menu) and a `DeleteTextureDialog` with the locked ref-count copywriting. Extend `cadStore` actions so they accept `userTextureId` references for floor / ceiling / wall surfaces.

Purpose: This is where LIB-06 delivers — Jessica navigates to the picker she's already using, opens MY TEXTURES, and applies an uploaded texture to a real surface. The picker integration also hosts the delete (D-07) and edit (D-11) flows.

Output: 2 new components, 3 existing picker files modified, cadStore actions accepting `userTextureId`, and the store-action wiring verified by component tests.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/34-user-uploaded-textures/34-CONTEXT.md
@.planning/phases/34-user-uploaded-textures/34-RESEARCH.md
@.planning/phases/34-user-uploaded-textures/34-UI-SPEC.md
@.planning/phases/34-user-uploaded-textures/34-00-data-layer-PLAN.md
@.planning/phases/34-user-uploaded-textures/34-01-upload-modal-PLAN.md

# Picker files the executor MUST read before wiring
@src/components/FloorMaterialPicker.tsx
@src/components/SurfaceMaterialPicker.tsx
@src/components/WallSurfacePanel.tsx
@src/components/library/CategoryTabs.tsx
@src/components/library/LibraryCard.tsx
@src/stores/cadStore.ts

<interfaces>
<!-- From Plan 00 + 01 (already landed): -->
```typescript
// src/hooks/useUserTextures.ts
export function useUserTextures(): { textures: UserTexture[]; loading; save; update; remove; reload };

// src/lib/countTextureRefs.ts
export function countTextureRefs(snapshot: CADSnapshot, textureId: string): number;

// src/components/UploadTextureModal.tsx
export function UploadTextureModal(props: {
  open: boolean;
  mode: "create" | "edit";
  existing?: UserTexture;
  onClose(): void;
  onSaved?(id: string): void;
}): JSX.Element;
```

<!-- Store action shapes to CONFIRM + extend (executor reads cadStore.ts to lock the exact names). Target shapes: -->
```typescript
// Floor picker calls:
useCADStore.getState().setFloorMaterial({
  kind: "user-texture",
  userTextureId,
  scaleFt: texture.tileSizeFt,
  rotationDeg: 0,
});

// Ceiling picker calls:
useCADStore.getState().updateCeiling(ceilingId, { userTextureId });

// Wall picker calls (EXACT action name confirmed during implementation):
//   — if there's an existing setWallpaper(side, changes) style action, pass { userTextureId }
//   — if walls use a different schema, the executor adapts but the data reference stays userTextureId
```

<!-- Locked copywriting (UI-SPEC §2, §3, Copywriting Contract): -->
```
MY TEXTURES tab label:               "MY TEXTURES"
Upload slot label:                   "UPLOAD"
Empty state heading:                 "NO CUSTOM TEXTURES"
Empty state body:                    "Upload a photo of a surface to use it on walls, floors, and ceilings."
⋮ menu item 1:                       "Edit"
⋮ menu item 2:                       "Delete"
Delete dialog header:                "DELETE TEXTURE"
Delete confirm (N>0):                "Delete {NAME}? {N} surface{s} in this project use it. They'll fall back to their base color."
Delete confirm (N=0):                "Delete {NAME}? This texture isn't used by any surface."
Delete dismiss:                      "Discard"
Delete destructive CTA:              "Delete Texture"
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: MyTexturesList shared component (grid + upload tile + ⋮ menu)</name>
  <files>src/components/MyTexturesList.tsx, tests/myTexturesList.test.tsx</files>
  <read_first>
    - .planning/phases/34-user-uploaded-textures/34-UI-SPEC.md §2 (MyTexturesList — ENTIRE section) + "Interaction States" MY TEXTURES tab states + "Empty state"
    - src/components/library/LibraryCard.tsx (read ENTIRELY — confirm props: `thumbnail`, `selected`, `onRemove`, and any existing slot for overlay content)
    - src/components/library/CategoryTabs.tsx (confirm `CategoryTab[]` shape + `onChange` signature)
    - src/hooks/useUserTextures.ts (from Plan 00)
    - src/components/UploadTextureModal.tsx (from Plan 01 — integration point)
    - src/hooks/useReducedMotion.ts (D-39 guard on skeleton pulse)
    - CLAUDE.md §Design System (D-33 icon policy, D-34 spacing tokens, D-39 reduced motion)
  </read_first>
  <behavior>
    - Renders grid `grid grid-cols-3 gap-4 p-4` of texture cards + trailing `+ UPLOAD` tile
    - Order: textures sorted most-recent-first (already guaranteed by listUserTextures / useUserTextures hook)
    - Empty state: replaces grid with centered column containing heading `"NO CUSTOM TEXTURES"`, body prose, and upload slot
    - Selecting a card: calls `onSelect(texture.id, texture.tileSizeFt)` prop
    - Clicking + UPLOAD tile: opens UploadTextureModal with `mode="create"`
    - Per-card ⋮ button: `aria-label="Texture options"`, lucide MoreHorizontal icon, `absolute top-1 right-1`. Revealed on card hover (`opacity-0 group-hover:opacity-100`)
    - ⋮ menu items: Edit → opens UploadTextureModal with `mode="edit"` and `existing={texture}`; Delete → opens DeleteTextureDialog
    - Uses `useUserTextures()` for data; passes loading/populated/empty states correctly
    - Loading state (before first list resolves): 3 skeleton tiles `bg-obsidian-highest animate-pulse rounded-md` (or static bg when reduced motion)
    - Props: `{ selectedId?: string; onSelect(id: string, tileSizeFt: number): void }`
  </behavior>
  <action>
    Create `src/components/MyTexturesList.tsx`. Icons from `lucide-react`: `Plus`, `MoreHorizontal`. No `material-symbols-outlined`.

    Structure:
    1. Top-level `useUserTextures()` for `{ textures, loading }`.
    2. Local state: `uploadOpen: boolean`, `editTarget: UserTexture | null`, `deleteTarget: UserTexture | null`, `menuOpenId: string | null`.
    3. If loading → render 3 skeleton tiles `<div className={`bg-obsidian-highest rounded-md ${reducedMotion ? "" : "animate-pulse"} aspect-square`} />` inside the grid shell.
    4. Else if `textures.length === 0` → empty state:
       ```tsx
       <div className="py-8 px-4 text-center flex flex-col items-center gap-4">
         <h3 className="font-mono text-base font-medium uppercase tracking-widest text-text-dim">NO CUSTOM TEXTURES</h3>
         <p className="font-body text-base text-text-muted max-w-xs">Upload a photo of a surface to use it on walls, floors, and ceilings.</p>
         <UploadSlot onClick={() => setUploadOpen(true)} />
       </div>
       ```
    5. Else render `<div className="grid grid-cols-3 gap-4 p-4">` with one `<TextureCard />` per texture + trailing `<UploadSlot />`.
    6. `<TextureCard>` (inner sub-component): reuses `LibraryCard` with `thumbnail={URL.createObjectURL(texture.blob)}` (memoize the URL per texture id — revoke on unmount via useEffect cleanup). `selected={texture.id === selectedId}`. Overlay: name line (`font-mono text-[11px] font-medium uppercase text-text-primary`) + tile size line (`font-mono text-[11px] text-accent-light` — format via `formatFeet(texture.tileSizeFt)` or a simple `${Math.floor(ft)}'${inches ? inches + '"' : ''}` helper). Click card → `onSelect(texture.id, texture.tileSizeFt)`.
    7. ⋮ button on card: `absolute top-1 right-1 min-h-[44px] min-w-[44px] opacity-0 group-hover:opacity-100 transition-opacity` with `aria-label="Texture options"` — toggles `menuOpenId`. Dropdown `bg-obsidian-highest border border-outline-variant/20 rounded-sm shadow-lg absolute right-0 top-6 z-10` with two items: Edit + Delete. Delete item text `text-error`.
    8. `<UploadSlot>` inner: tile-shaped `LibraryCard`-equivalent with `Plus` icon (20px) over label `"UPLOAD"` (font-mono 11px). Background `bg-obsidian-low border-2 border-dashed border-outline-variant/30 rounded-md`. Hover: `border-accent/50`. Click → `setUploadOpen(true)`.
    9. Modal mounts at bottom of component tree:
       ```tsx
       <UploadTextureModal open={uploadOpen} mode="create" onClose={() => setUploadOpen(false)} />
       <UploadTextureModal open={editTarget !== null} mode="edit" existing={editTarget ?? undefined} onClose={() => setEditTarget(null)} />
       <DeleteTextureDialog open={deleteTarget !== null} texture={deleteTarget} onClose={() => setDeleteTarget(null)} />
       ```
    10. ObjectURL lifecycle: `useMemo(() => new Map())` by texture id OR a `useEffect` that tracks `textures.map(t => t.id)` and revokes URLs when a texture disappears from the list.

    Write `tests/myTexturesList.test.tsx`. Mock `useUserTextures` with `vi.mock`. >= 7 cases:
    1. Loading state → 3 elements with class `rounded-md` rendered (skeleton count)
    2. Empty state (textures=[]) → `screen.getByText("NO CUSTOM TEXTURES")` + `screen.getByText(/Upload a photo of a surface to use it on walls, floors, and ceilings\./)` visible
    3. Populated (2 textures) → both names rendered uppercase, UPLOAD tile present as last item
    4. Click on a texture card → `onSelect` called with `(texture.id, texture.tileSizeFt)`
    5. Click on UPLOAD tile → UploadTextureModal mounts with `open=true`, `mode="create"` (assert by checking for `"UPLOAD TEXTURE"` heading)
    6. Click ⋮ → menu visible with `"Edit"` and `"Delete"` items; ⋮ button has `aria-label="Texture options"`
    7. Click ⋮ → Edit → UploadTextureModal opens in edit mode with `existing` prop set (assert `"EDIT TEXTURE"` heading visible)
    8. Click ⋮ → Delete → DeleteTextureDialog mounts (assert `"DELETE TEXTURE"` heading visible; create a stub DeleteTextureDialog if Task 2 hasn't landed yet — but since depends_on covers it, task ordering within the plan means Task 2 lands first in the same wave)
    9. `selectedId === texture.id` → card has `ring-2 ring-accent` class
  </action>
  <verify>
    <automated>npx vitest run tests/myTexturesList.test.tsx</automated>
  </verify>
  <acceptance_criteria>
    - [ ] `grep -q "export function MyTexturesList" src/components/MyTexturesList.tsx` succeeds
    - [ ] `grep -q "NO CUSTOM TEXTURES" src/components/MyTexturesList.tsx` succeeds (exact empty-state heading)
    - [ ] `grep -q "Upload a photo of a surface to use it on walls, floors, and ceilings." src/components/MyTexturesList.tsx` succeeds
    - [ ] `grep -q ">UPLOAD<" src/components/MyTexturesList.tsx` succeeds (upload slot label)
    - [ ] `grep -q "aria-label=\"Texture options\"" src/components/MyTexturesList.tsx` succeeds (D-33 icon-only button a11y)
    - [ ] `grep -q "from \"lucide-react\"" src/components/MyTexturesList.tsx` succeeds AND `grep -c "material-symbols-outlined" src/components/MyTexturesList.tsx` returns 0
    - [ ] `grep -q "grid grid-cols-3 gap-4 p-4" src/components/MyTexturesList.tsx` succeeds (spacing tokens D-34)
    - [ ] `! grep -qE "(p|m|gap)-3[^0-9]|(p|m|gap)-\\[(12|3)px\\]" src/components/MyTexturesList.tsx` (no 12px)
    - [ ] `grep -q "useReducedMotion" src/components/MyTexturesList.tsx` succeeds (D-39 guard on skeleton pulse)
    - [ ] `grep -q ">Edit<" src/components/MyTexturesList.tsx` AND `grep -q ">Delete<" src/components/MyTexturesList.tsx` succeed (⋮ menu items)
    - [ ] `npx vitest run tests/myTexturesList.test.tsx` passes with >= 7 tests green
  </acceptance_criteria>
  <done>
    Shared picker-content component is complete and testable. All three picker hosts can drop `<MyTexturesList onSelect={...} />` into their MY TEXTURES tab body.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: DeleteTextureDialog with ref-count + cache invalidation on confirm</name>
  <files>src/components/DeleteTextureDialog.tsx, tests/deleteTextureDialog.test.tsx</files>
  <read_first>
    - .planning/phases/34-user-uploaded-textures/34-UI-SPEC.md §3 (DeleteTextureDialog — ENTIRE section) + Delete dialog states table
    - src/lib/countTextureRefs.ts (from Plan 00)
    - src/hooks/useUserTextures.ts (from Plan 00 — uses `.remove(id)`)
    - src/stores/cadStore.ts (read to confirm the exact selector for the full snapshot — typically `useCADStore(state => ({ rooms: state.rooms, activeRoomId: state.activeRoomId, customElements: state.customElements, customPaints: state.customPaints, recentPaints: state.recentPaints, version: 2 }))` or a `buildSnapshot()` helper)
    - .planning/phases/34-user-uploaded-textures/34-CONTEXT.md D-07 (locked copy)
  </read_first>
  <behavior>
    - Props: `{ open: boolean; texture: UserTexture | null; onClose(): void; onDeleted?(id: string): void }`
    - On mount (when `open && texture`): compute `count = countTextureRefs(snapshot, texture.id)`
    - Render header `"DELETE TEXTURE"`
    - Body copy:
      - When `count === 0`: `"Delete ${TEXTURE_NAME_UPPERCASED}? This texture isn't used by any surface."`
      - When `count === 1`: `"Delete ${TEXTURE_NAME_UPPERCASED}? 1 surface in this project use it. They'll fall back to their base color."` — NOTE: UI-SPEC uses `{s}` pluralization where `s === "" when N === 1`. The grammatically-correct render is "1 surface in this project uses it" — the UI-SPEC explicitly locks the copy as "use it" for all N > 0 to avoid pluralization complexity. Use exactly: `` `Delete ${NAME}? ${count} surface${count === 1 ? "" : "s"} in this project use it. They'll fall back to their base color.` ``
      - When `count > 1`: plural `"surfaces"`
    - Footer: Discard button + destructive "Delete Texture" button
    - Discard click / backdrop click / Escape → `onClose()` (no delete)
    - Delete Texture click → `useUserTextures().remove(texture.id)` → `onDeleted?(texture.id)` → `onClose()`
    - After confirm, also calls `clearUserTextureCache(texture.id)` — this function is introduced in Plan 03, so FOR THIS PLAN, the Delete Texture handler calls `useUserTextures().remove(id)` only; Plan 03 extends the handler (or exports a cache-invalidation hook) when it creates userTextureCache.ts. ALTERNATIVELY: define a local `invalidateTextureCache` no-op now and swap to the real one in Plan 03. Simplest: emit a `"user-texture-deleted"` CustomEvent on `window` and let Plan 03's cache subscribe to it.
    - Per UI-SPEC: Delete button shows `Deleting…` label + Loader2 spinner while in flight (reduced-motion guard)
  </behavior>
  <action>
    Create `src/components/DeleteTextureDialog.tsx` using the same modal shell pattern as UploadTextureModal (fixed-position centered, `bg-obsidian-deepest/80 backdrop-blur-sm` backdrop, `bg-obsidian-mid/90 backdrop-blur-xl border border-outline-variant/20 rounded-sm`). Width `w-[400px]`. Icons from `lucide-react` only.

    Key structure:
    1. `useCADStore(state => state)` to get the full store state; pass to `countTextureRefs` via a small helper that constructs a snapshot (or reuse an existing snapshot builder — `grep -n "getCurrentSnapshot\\|buildSnapshot" src/stores/cadStore.ts` to find it).
    2. `const count = useMemo(() => texture ? countTextureRefs(snapshot, texture.id) : 0, [snapshot, texture?.id])`.
    3. `const { remove } = useUserTextures()`.
    4. Header: `"DELETE TEXTURE"` — `font-mono text-base font-medium uppercase tracking-widest text-text-primary`.
    5. Body: Inter 13px prose. Render the locked copy exactly:
       ```tsx
       {count === 0 ? (
         <p className="font-body text-base text-text-muted">
           Delete <span className="text-text-primary uppercase">{texture.name}</span>? This texture isn't used by any surface.
         </p>
       ) : (
         <p className="font-body text-base text-text-muted">
           Delete <span className="text-text-primary uppercase">{texture.name}</span>? {count} surface{count === 1 ? "" : "s"} in this project use it. They'll fall back to their base color.
         </p>
       )}
       ```
    6. Footer: Discard + Delete Texture buttons. Discard uses the standard secondary button style. Delete Texture: `rounded-sm px-4 py-1 font-mono text-sm text-error bg-obsidian-high hover:bg-error/10 border border-error/30`.
    7. Delete handler:
       ```typescript
       async function handleDelete() {
         if (!texture) return;
         setDeleting(true);
         try {
           await remove(texture.id);
           // Emit event for userTextureCache (Plan 03 subscribes)
           window.dispatchEvent(new CustomEvent("user-texture-deleted", { detail: { id: texture.id } }));
           onDeleted?.(texture.id);
           onClose();
         } finally {
           setDeleting(false);
         }
       }
       ```
    8. In-flight state: Delete button shows `Loader2` spin + label `"Deleting…"` (reduced-motion guards the spin).
    9. Keyboard: Escape = onClose. Enter when count resolved + not deleting = confirm.

    Write `tests/deleteTextureDialog.test.tsx`. Mock `useUserTextures` and `countTextureRefs`. Render inside a minimal CADStore provider or mock `useCADStore` directly. >= 6 cases:
    1. count=0 → body contains `"This texture isn't used by any surface."` (exact string) AND texture name UPPERCASE
    2. count=1 → body contains `"1 surface in this project use it. They'll fall back to their base color."`
    3. count=3 → body contains `"3 surfaces in this project use it."` (plural)
    4. Discard click → `onClose` called, `remove` NOT called
    5. Delete Texture click → `remove(texture.id)` called, `window.dispatchEvent` called with `user-texture-deleted` type + `{ id }` detail, `onDeleted(texture.id)` called, `onClose` called
    6. Header renders `"DELETE TEXTURE"` (exact copy)
    7. Delete button text `"Delete Texture"`, Discard button text `"Discard"`
  </action>
  <verify>
    <automated>npx vitest run tests/deleteTextureDialog.test.tsx</automated>
  </verify>
  <acceptance_criteria>
    - [ ] `grep -q "export function DeleteTextureDialog" src/components/DeleteTextureDialog.tsx` succeeds
    - [ ] `grep -q "DELETE TEXTURE" src/components/DeleteTextureDialog.tsx` succeeds (header copy)
    - [ ] `grep -q ">Delete Texture<" src/components/DeleteTextureDialog.tsx` succeeds (destructive CTA copy)
    - [ ] `grep -q ">Discard<" src/components/DeleteTextureDialog.tsx` succeeds
    - [ ] `grep -q "They'll fall back to their base color." src/components/DeleteTextureDialog.tsx` succeeds (locked D-07 copy fragment)
    - [ ] `grep -q "This texture isn't used by any surface." src/components/DeleteTextureDialog.tsx` succeeds (N=0 copy)
    - [ ] `grep -q "countTextureRefs" src/components/DeleteTextureDialog.tsx` succeeds (ref-count integration)
    - [ ] `grep -q "user-texture-deleted" src/components/DeleteTextureDialog.tsx` succeeds (cache-invalidation event)
    - [ ] `grep -q "useReducedMotion" src/components/DeleteTextureDialog.tsx` succeeds (D-39)
    - [ ] `grep -c "material-symbols-outlined" src/components/DeleteTextureDialog.tsx` returns 0 (D-33)
    - [ ] `npx vitest run tests/deleteTextureDialog.test.tsx` passes with >= 6 tests green
  </acceptance_criteria>
  <done>
    Delete flow complete with locked ref-count copy. Cache-invalidation event published for Plan 03 to subscribe. Plan 02 Task 3 will wire this dialog into MyTexturesList's ⋮ → Delete menu action.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Wire MY TEXTURES tab into FloorMaterialPicker + SurfaceMaterialPicker + WallSurfacePanel + cadStore action extension</name>
  <files>src/components/FloorMaterialPicker.tsx, src/components/SurfaceMaterialPicker.tsx, src/components/WallSurfacePanel.tsx, src/stores/cadStore.ts, tests/pickerMyTexturesIntegration.test.tsx</files>
  <read_first>
    - src/components/FloorMaterialPicker.tsx (read ENTIRELY — find the CategoryTabs usage site + how `setFloorMaterial` is called for custom data-URL path today)
    - src/components/SurfaceMaterialPicker.tsx (read ENTIRELY — find where bundled materials are listed; identify if this picker handles ceiling only or all surfaces)
    - src/components/WallSurfacePanel.tsx (read ENTIRELY — find wallpaper-side state + store action that mutates wallpaper.{A,B})
    - src/stores/cadStore.ts (read setFloorMaterial, updateCeiling, and any wallpaper-side action; confirm they accept the new userTextureId field OR extend them)
    - src/types/cad.ts (from Plan 00 — confirm Wallpaper/FloorMaterial/Ceiling shape)
    - src/components/library/CategoryTabs.tsx (confirm `{ id, label, count? }` entry shape)
  </read_first>
  <behavior>
    - Each of the 3 pickers gets a new `MY TEXTURES` CategoryTab entry (id=`my-textures`, label=`MY TEXTURES`, count=textures.length when >0)
    - When MY TEXTURES is the active tab, the bundled-material grid is replaced by `<MyTexturesList selectedId={...} onSelect={...} />`
    - FloorMaterialPicker `onSelect(id, tileSizeFt)` dispatches `setFloorMaterial({ kind: "user-texture", userTextureId: id, scaleFt: tileSizeFt, rotationDeg: 0 })`
    - SurfaceMaterialPicker (when the host is a ceiling context) `onSelect(id)` dispatches `updateCeiling(ceilingId, { userTextureId: id })`
    - WallSurfacePanel `onSelect(id, tileSizeFt)` dispatches the wall's wallpaper-side action with `{ userTextureId: id, scaleFt: tileSizeFt, rotationDeg: 0 }` (exact action name discovered by reading the file)
    - cadStore actions already accept these shapes after Plan 00's type extensions, BUT Immer reducers may need trivial patch: executor verifies `setFloorMaterial` passes the whole object through (no field filtering); `updateCeiling` uses a merge pattern (should already work); wallpaper-side action similarly merges changes
    - `selectedId` on MyTexturesList reflects current surface: for floor, `room.floorMaterial?.userTextureId`; for ceiling, `ceiling.userTextureId`; for wall, `wall.wallpaper?.[side]?.userTextureId`
  </behavior>
  <action>
    For EACH picker file:

    1. Import `MyTexturesList` from `@/components/MyTexturesList`, `useUserTextures` from `@/hooks/useUserTextures`.
    2. Add MY TEXTURES entry to the existing `CategoryTabs` `tabs` prop array:
       ```typescript
       const { textures: userTextures } = useUserTextures();
       const tabs: CategoryTab[] = [
         ...existingTabs,
         { id: "my-textures", label: "MY TEXTURES", count: userTextures.length > 0 ? userTextures.length : undefined },
       ];
       ```
    3. Conditionally render body:
       ```tsx
       {activeTab === "my-textures" ? (
         <MyTexturesList selectedId={currentSelectedUserTextureId} onSelect={handleUserTextureSelect} />
       ) : (
         /* existing bundled-material grid */
       )}
       ```
    4. Implement `handleUserTextureSelect` per picker type (exact action names TBD by file read):
       - Floor: `useCADStore.getState().setFloorMaterial({ kind: "user-texture", userTextureId: id, scaleFt: tileSizeFt, rotationDeg: 0 })`
       - Ceiling: `useCADStore.getState().updateCeiling(ceilingId, { userTextureId: id })` — note: also clear `surfaceMaterialId` when setting userTextureId so render precedence is clean: `updateCeiling(ceilingId, { userTextureId: id, surfaceMaterialId: undefined })`
       - Wall: `setWallpaperSide(wallId, side, { userTextureId: id, scaleFt: tileSizeFt, rotationDeg: 0 })` (verify exact action name during implementation — if the action is named differently like `updateWallpaper` or `setWallWallpaper`, use that name; record the exact signature in the summary)

    5. `currentSelectedUserTextureId`:
       - Floor: `useCADStore(state => state.rooms[state.activeRoomId!]?.floorMaterial?.userTextureId)`
       - Ceiling: `useCADStore(state => state.rooms[state.activeRoomId!]?.ceilings?.[ceilingId]?.userTextureId)`
       - Wall: `useCADStore(state => state.rooms[state.activeRoomId!]?.walls?.[wallId]?.wallpaper?.[side]?.userTextureId)`

    6. `cadStore.ts` changes — verify during implementation:
       - `setFloorMaterial` already accepts a `FloorMaterial` object and pushes it into `room.floorMaterial` via Immer. No change needed because Plan 00 widened the type.
       - `updateCeiling(id, patch: Partial<Ceiling>)` merges the patch. No change needed.
       - Wallpaper-side action: whatever the existing shape, ensure it accepts `userTextureId` in the patch. If it uses a tight `{ imageUrl, scaleFt, rotationDeg }` input type, widen it to include `userTextureId?: string`.

    Write `tests/pickerMyTexturesIntegration.test.tsx` with >= 5 cases:
    1. FloorMaterialPicker: user-textures tab visible with label `"MY TEXTURES"`; count badge reflects `useUserTextures().textures.length`
    2. FloorMaterialPicker: click MY TEXTURES → MyTexturesList renders → click a texture card → `setFloorMaterial` called with exactly `{ kind: "user-texture", userTextureId: "utex_abc", scaleFt: 2.5, rotationDeg: 0 }`
    3. SurfaceMaterialPicker (ceiling context): MY TEXTURES tab visible; onSelect dispatches `updateCeiling(ceilingId, { userTextureId: "utex_abc", surfaceMaterialId: undefined })`
    4. WallSurfacePanel: MY TEXTURES tab visible; onSelect dispatches wallpaper-side action with `userTextureId`
    5. When `useUserTextures().textures.length === 0`, MY TEXTURES tab still appears (empty state inside) — verify by clicking it and finding empty-state copy

    Mock `useUserTextures` return value in tests; mock `useCADStore` action spies with `vi.fn()`.
  </action>
  <verify>
    <automated>npx vitest run tests/pickerMyTexturesIntegration.test.tsx</automated>
  </verify>
  <acceptance_criteria>
    - [ ] `grep -q "MyTexturesList" src/components/FloorMaterialPicker.tsx` AND `grep -q "MyTexturesList" src/components/SurfaceMaterialPicker.tsx` AND `grep -q "MyTexturesList" src/components/WallSurfacePanel.tsx` — all 3 picker files integrate the shared component
    - [ ] `grep -q "id: \"my-textures\"" src/components/FloorMaterialPicker.tsx` succeeds (tab entry)
    - [ ] `grep -q "label: \"MY TEXTURES\"" src/components/FloorMaterialPicker.tsx` succeeds (tab label)
    - [ ] `grep -qE "kind:\\s*\"user-texture\"" src/components/FloorMaterialPicker.tsx` succeeds (floor dispatch)
    - [ ] `grep -qE "updateCeiling\\([^)]*userTextureId" src/components/SurfaceMaterialPicker.tsx` succeeds (ceiling dispatch)
    - [ ] `grep -q "userTextureId" src/components/WallSurfacePanel.tsx` succeeds (wall dispatch)
    - [ ] `grep -q "useUserTextures" src/components/FloorMaterialPicker.tsx` succeeds
    - [ ] `npx vitest run tests/pickerMyTexturesIntegration.test.tsx` passes with >= 5 tests green
    - [ ] Full test suite passes: `npx vitest run`
    - [ ] No 12px arbitrary spacing introduced in any of the 3 picker files: `! grep -qE "(p|m|gap)-\\[(12|3)px\\]" src/components/FloorMaterialPicker.tsx src/components/SurfaceMaterialPicker.tsx src/components/WallSurfacePanel.tsx`
    - [ ] No material-symbols imports added to the 3 picker files in the new MY TEXTURES code paths: `grep -c "material-symbols-outlined" src/components/MyTexturesList.tsx src/components/DeleteTextureDialog.tsx` returns 0 (existing picker files may retain their CAD-glyph imports per D-33 allowlist)
  </acceptance_criteria>
  <done>
    All three pickers expose MY TEXTURES. Each dispatches the correct store mutation with `userTextureId` so the snapshot carries ID references only (foundational for LIB-08 verified in Plan 03). Delete + Edit flows reachable via ⋮ menu.
  </done>
</task>

</tasks>

<verification>
Phase-level gate:
1. `npx vitest run tests/myTexturesList.test.tsx tests/deleteTextureDialog.test.tsx tests/pickerMyTexturesIntegration.test.tsx` — all green
2. `npx vitest run` — full suite green
3. All D-07 copywriting strings grep-verifiable (see per-task acceptance_criteria)
4. All 3 pickers integrate `MyTexturesList` (grep-verified across files)
5. The `user-texture-deleted` CustomEvent is emitted on delete confirm (verified by test)
6. `onSelect` dispatches produce the correct store action shapes for floor/ceiling/wall (verified by vi.fn spies)
</verification>

<success_criteria>
- MyTexturesList + DeleteTextureDialog built per UI-SPEC §2 and §3 with all locked copy
- Every material picker host exposes MY TEXTURES tab
- LIB-06 success path verified end-to-end via integration test: pick file → save → card appears → click card → store action fired with userTextureId reference
- D-07 ref-count copy renders correctly for count=0, 1, and N>1
- D-11 Edit path wired (⋮ menu → Edit → UploadTextureModal in edit mode)
- D-06 most-recent-first order preserved (inherits from useUserTextures)
- D-33 icon policy: new components use lucide-react only
- D-34 spacing: no 12px arbitrary values introduced in new files
- D-39: useReducedMotion guard present on animations
</success_criteria>

<output>
After completion, create `.planning/phases/34-user-uploaded-textures/34-02-picker-integration-SUMMARY.md` documenting:
- MyTexturesList prop shape + ObjectURL lifecycle decision
- DeleteTextureDialog prop shape + `user-texture-deleted` event contract (Plan 03 subscribes)
- Exact wallpaper-side store action name discovered during WallSurfacePanel read
- Whether `cadStore.setFloorMaterial` / `updateCeiling` needed type-level widening (expected: no, because Plan 00 extended cad.ts)
- Any deviation from RESEARCH.md §D OQ-01 (WallSurfacePanel structure)
</output>
