# Phase 42: Per-Surface tileSizeFt Bug Fix (BUG-01) — Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Close [GH #96](https://github.com/micahbank2/room-cad-renderer/issues/96) — when the same user-uploaded texture is applied to multiple surfaces (especially a ceiling + something else), each surface must honor its own tile size independently. Currently ceilings read tile size directly from the user-texture catalog entry, so editing the catalog (or picking a different default) bleeds across all surfaces using that texture.

**Final v1.9 phase. Closes the milestone.**

**In scope:**
- Add per-ceiling tile-size override field (mirroring `Wallpaper.scaleFt` + `FloorMaterial.scaleFt`)
- Wire ceiling picker to write the override at apply-time (mirroring wall/floor pickers)
- Update `CeilingMesh` render path to read from ceiling override, fall back to catalog default
- Migration for existing ceilings with `userTextureId` but no override (backfill from catalog at first read)
- Tests asserting per-surface isolation (same `userTextureId` on two surfaces can have different tile sizes)

**Out of scope:**
- Renaming `scaleFt` → `tileSizeFt` across the existing schema (Floor + Wallpaper already use `scaleFt`; rename would touch dozens of files for naming-only churn)
- Full TILE-01 design-effect override UI (deferred to v2.0+ Phase 999.3 per Phase 39 rescope)
- Per-surface rotation / offset / seam-smoothing (always out of scope; Phase 999.x backlog)
- Properties-panel UI for editing the ceiling tile size after apply — the apply-time write is the bug fix; per-placement edit UI is a separate enhancement
</domain>

<decisions>
## Implementation Decisions

### Field name
- **D-01:** Add `Ceiling.scaleFt?: number` — match the existing schema convention used by `Wallpaper.scaleFt` and `FloorMaterial.scaleFt`. Do NOT introduce a new `tileSizeFt` field name on `Ceiling`.
- **Reason:** REQUIREMENTS BUG-01 used `tileSizeFt` because that's the user-facing UI label. The schema field is consistently `scaleFt` across Floor and Wallpaper. Naming consistency at the schema level beats matching the doc's literal name. The user-facing label can stay "Tile size" — the mismatch is internal-only.

### Resolver order in CeilingMesh
- **D-02:** `CeilingMesh` resolves the effective tile size as `ceiling.scaleFt ?? entry?.tileSizeFt ?? 2`. Surface-level override takes priority; catalog default is the fallback; hardcoded 2 is the last resort if neither is present.
- **Reason:** Mirrors the precedent from Wallpaper rendering (where surface `scaleFt` overrides catalog). Catalog default still seeds the override at apply-time, so the fallback path is only hit by snapshots that pre-date this change.

### Migration / backfill
- **D-03:** No formal `CADSnapshot.version` bump. Existing snapshots without `ceiling.scaleFt` resolve to `entry?.tileSizeFt` per D-02's resolver — this is functionally equivalent to today's behavior, so no data is lost. Backfill is implicit-on-render; we do NOT eagerly re-write existing snapshots.
- **Reason:** Implicit backfill is non-invasive — old snapshots keep working. Eager backfill would require migrating all existing user projects (writing IDB), which is more risk than benefit for a bug that only manifests when a texture is shared across surfaces. Snapshots written after this phase will have the override populated at apply-time.

### Apply-time write (ceiling picker)
- **D-04:** When a user picks a user-texture for a ceiling (via `SurfaceMaterialPicker` → ceiling tab), the picker writes BOTH `userTextureId` AND `scaleFt` to the ceiling record. Mirrors `FloorMaterialPicker.handleUserTextureSelect` and `WallSurfacePanel.handleWallpaperUserTexture`.
- **Reason:** Apply-time write is what isolates this surface from future catalog edits. If the user later edits the catalog `tileSizeFt`, this ceiling's override sticks. This is the actual bug fix — D-02's resolver is the read path; D-04's apply-time write is the write path.

### Properties panel scope
- **D-05:** OUT of scope. The Properties panel's "edit tile size for this ceiling" UI does NOT exist yet — the bug report's reference to the ceiling Properties panel was about reading the catalog default at render. Adding a per-placement edit UI is the deferred TILE-01 scope (v2.0+ / Phase 999.3). This phase only fixes the apply-time write + render-path resolver.
- **Reason:** Scope discipline. The bug closes when same-texture-on-multiple-surfaces renders independently. Per-placement edit UI is a separate feature.

### Test strategy
- **D-06:** Two new test cases: (a) unit test for `CeilingMesh` resolver order (`ceiling.scaleFt ?? catalog.tileSizeFt ?? 2`), (b) integration test asserting that applying same `userTextureId` to a wall AND a ceiling with different `scaleFt` values renders both independently. Existing Wallpaper / Floor isolation behavior also gets a regression-guard test.
- **Reason:** Without an integration-level test, a future refactor could re-introduce the catalog-read pattern and silently regress. The unit test catches the resolver path; the integration test catches schema-level isolation.

### Plan structure
- **D-07:** Single plan, 4 tasks: (1) schema + migration-by-resolver, (2) ceiling picker apply-time write, (3) CeilingMesh resolver update, (4) tests + GH issue close. ~1-2 hours of focused work; no waves.
- **Reason:** Tightly scoped bug fix. No need for multi-plan / multi-wave structure. Each task gets its own atomic commit so the fix can be reverted in pieces if needed.

### Claude's Discretion
- Exact wording of the `scaleFt` JSDoc comment on `Ceiling`
- Whether the integration test lives in `tests/userTextureSnapshot.test.ts` (existing file with cross-surface assertions) or a new dedicated file — pick whichever produces a cleaner diff
- Test assertions: byte-level pixel diff vs. resolver-output equality — pick whichever is faster + more reliable

</decisions>

<specifics>
## Specific Ideas

- **Existing pattern to mirror:** `WallSurfacePanel.tsx:105-110` — `handleWallpaperUserTexture(id, tileSizeFt)` writes `{ kind: "pattern", userTextureId: id, scaleFt: tileSizeFt }` to the wall side. The ceiling equivalent in `SurfaceMaterialPicker` (or wherever ceiling user-texture selection happens) needs to do the same.
- **Existing resolver shape to mirror:** `WallMesh.tsx` reads `wallpaper?.scaleFt ?? userTexture?.tileSizeFt ?? 2` when computing repeat. CeilingMesh currently reads `entry?.tileSizeFt ?? 2` (no surface override layer). Add the override layer.
- **Catalog edit semantics stay unchanged:** The user can still edit `tileSizeFt` on the catalog entry via UploadTextureModal in edit mode. That edit affects:
  - The default applied at NEXT apply (for any future surface that picks this texture)
  - Surfaces that have NO override (i.e. snapshots from before this phase, or if the apply-time write was skipped for some reason)
  - It does NOT affect surfaces that already have their own `scaleFt` written — those stick.
- **No `Ceiling` schema bump needed:** The new field is optional (`scaleFt?: number`). TypeScript narrows correctly; existing code that doesn't reference it stays untouched. CADSnapshot version stays at 2.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before implementing:**

### Requirements
- `.planning/REQUIREMENTS.md` §BUG-01 (acceptance criteria)
- [GH #96](https://github.com/micahbank2/room-cad-renderer/issues/96) (bug report with reproduction steps)

### Existing schema + render
- `src/types/cad.ts:40-50` — `Wallpaper` interface (existing `scaleFt?: number` precedent)
- `src/types/cad.ts:130-145` — `Ceiling` interface (target — add `scaleFt?: number`)
- `src/types/cad.ts:149-160` — `FloorMaterial` interface (existing `scaleFt: number` precedent)
- `src/types/userTexture.ts:22` — catalog `tileSizeFt: number`
- `src/three/CeilingMesh.tsx:30-40` — current resolver (`entry?.tileSizeFt ?? 2`); update target

### Existing apply-time wiring (mirror these)
- `src/components/FloorMaterialPicker.tsx:67-75` — `handleUserTextureSelect` writes `scaleFt` to FloorMaterial
- `src/components/WallSurfacePanel.tsx:105-115` — `handleWallpaperUserTexture` writes `scaleFt` to Wallpaper
- `src/components/SurfaceMaterialPicker.tsx:14-80` — passed via `onSelectUserTexture` callback to ceiling consumers

### Test precedent
- `tests/userTextureSnapshot.test.ts` — existing per-surface invariant tests (LIB-08); good place for the new isolation test
- `tests/CeilingMesh*.test.tsx` (if any) — unit test target for the resolver

</canonical_refs>

<deferred>
## Deferred Ideas

- **Schema rename `scaleFt` → `tileSizeFt`** — would unify naming with REQUIREMENTS doc but touches Floor + Wallpaper code without functional benefit. Out of scope; the user-facing UI label is already "Tile size" so end-users see consistency.
- **Per-placement edit UI** — Properties-panel field to change `scaleFt` after apply, without re-picking the texture. Deferred to v2.0+ as part of Phase 999.3 (full design-effect override).
- **CADSnapshot version bump** — D-03 keeps version 2. If a future phase adds a new ceiling field that DOES require migration, bump then.
- **Eager backfill of existing snapshots** — D-03 keeps the migration implicit-on-render. Eager backfill is non-trivial (would require IDB writes for every existing project) and unnecessary for this fix.

</deferred>

---

*Phase: 42-bug01-tilesize-isolation*
*Context gathered: 2026-04-25*
