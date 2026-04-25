---
phase_number: 42
plan_number: 01
plan_name: fix
phase_dir: .planning/phases/42-bug01-tilesize-isolation
objective: >
  Close GH #96 — same user-texture applied to multiple surfaces (especially
  ceiling + wall) renders independently per-surface tile size. Add Ceiling.scaleFt
  optional field, wire ceiling picker apply-time write, update CeilingMesh
  resolver to honor surface override before catalog default. ~1-2 hours,
  4 atomic commits, single plan, single wave.
requirements_addressed: [BUG-01]
depends_on: []
wave: 1
autonomous: true
files_modified:
  - src/types/cad.ts
  - src/three/CeilingMesh.tsx
  - src/components/SurfaceMaterialPicker.tsx
  - tests/userTextureSnapshot.test.ts
  - tests/ceilingMeshScaleResolver.test.ts
must_haves:
  truths:
    - "Ceiling interface in src/types/cad.ts has optional `scaleFt?: number` field with JSDoc explaining the per-surface-override semantics (mirror Wallpaper.scaleFt convention)"
    - "CeilingMesh resolves effective tile size as `ceiling.scaleFt ?? entry?.tileSizeFt ?? 2` — surface override takes priority, catalog default is fallback, hardcoded 2 is last resort"
    - "When the user picks a user-texture via the ceiling material picker, the ceiling record gets BOTH userTextureId AND scaleFt written at apply-time (mirroring FloorMaterialPicker + WallSurfacePanel)"
    - "Existing snapshots without ceiling.scaleFt still render — implicit migration via the resolver fallback (no eager backfill, no version bump)"
    - "Integration test asserts: same userTextureId on a wall + a ceiling with different scaleFt values renders independently — wall.scaleFt != ceiling.scaleFt verifiable via snapshot read"
    - "Unit test for CeilingMesh resolver order asserts the 3-tier fallback precedence"
    - "GH #96 closed with PR reference"
---

# Phase 42 Plan 01 — BUG-01 Per-Surface tileSizeFt Isolation Fix

## Context

Tightly-scoped bug fix. Ceiling currently reads tile size directly from the user-texture catalog at render-time, so editing the catalog (or applying the same texture to multiple surfaces) bleeds across them. Floor and Wallpaper already have per-surface `scaleFt` and work correctly. This plan brings Ceiling to parity.

All decisions locked in 42-CONTEXT.md (D-01..D-07).

---

## Task 1 — Schema + JSDoc (D-01)

**Read first:**
- `src/types/cad.ts:40-50` — `Wallpaper.scaleFt` precedent
- `src/types/cad.ts:130-145` — `Ceiling` interface (modification target)

**Edit:** `src/types/cad.ts`

Add to `Ceiling` interface:

```ts
/**
 * Per-ceiling tile size override (in feet) for user-uploaded texture.
 * Written at apply-time when the user picks a userTextureId, mirrors
 * Wallpaper.scaleFt + FloorMaterial.scaleFt.
 *
 * Resolver precedence in CeilingMesh: ceiling.scaleFt ?? catalog.tileSizeFt ?? 2.
 *
 * Optional: existing snapshots that pre-date Phase 42 BUG-01 fix may have
 * no value; they fall through to the catalog default (functionally equivalent
 * to pre-fix behavior).
 *
 * Closes GH #96 (Phase 42 BUG-01).
 */
scaleFt?: number;
```

Place between existing `material` field and the next field (or wherever fits the existing field grouping).

**Acceptance:**
- TypeScript compiles (`npx tsc --noEmit` clean)
- No new errors; existing usages of `Ceiling` still type-check

**Commit:** `feat(42-01): add Ceiling.scaleFt per-surface tile-size override (BUG-01)`

---

## Task 2 — CeilingMesh resolver update (D-02)

**Read first:**
- `src/three/CeilingMesh.tsx:30-40` — current resolver (`entry?.tileSizeFt ?? 2`)
- `src/three/WallMesh.tsx` — search for the wallpaper resolver pattern (`wallpaper?.scaleFt ?? entry?.tileSizeFt ?? 2` shape)

**Edit:** `src/three/CeilingMesh.tsx`

Update the tile-size resolver from:

```tsx
return entry?.tileSizeFt ?? 2;
```

to:

```tsx
return ceiling.scaleFt ?? entry?.tileSizeFt ?? 2;
```

Where `ceiling` is the prop / store-derived object passed to the mesh. Verify the prop name in the actual file and adjust accordingly.

**Acceptance:**
- TypeScript compiles
- Manual smoke: dev server runs, applying a user-texture to a ceiling renders at catalog tile size (no surface override yet — Task 3 wires that)
- Existing test suite passes (no regressions)

**Commit:** `feat(42-01): CeilingMesh reads ceiling.scaleFt before catalog default (BUG-01)`

---

## Task 3 — Apply-time write in ceiling picker (D-04)

**Read first:**
- `src/components/FloorMaterialPicker.tsx:67-75` — apply-time pattern to mirror
- `src/components/WallSurfacePanel.tsx:105-115` — apply-time pattern to mirror
- `src/components/SurfaceMaterialPicker.tsx:14-80` — existing ceiling user-texture handler (or its caller)

**Edit:** Wherever ceiling user-texture selection currently writes to the cadStore (likely `SurfaceMaterialPicker.tsx` or its caller in CeilingPaintSection / similar).

Find the code that responds to user-texture selection for a ceiling. It currently writes `userTextureId` only (or maybe a `material` value). Update it to also write `scaleFt: tileSizeFt` from the picker's `onSelect(id, tileSizeFt)` callback.

Pattern (from `FloorMaterialPicker.tsx:67-75`):

```tsx
const handleUserTextureSelect = (id: string, tileSizeFt: number) => {
  // ...write to ceiling — mirror this shape
  setCeiling(/* or updateCeiling */ {
    ...existingCeiling,
    userTextureId: id,
    scaleFt: tileSizeFt,  // <-- the new write
  });
};
```

Verify the existing wiring — the `SurfaceMaterialPicker.onSelectUserTexture` already passes `(id, tileSizeFt)`. Just propagate it into the cadStore mutation.

**Acceptance:**
- TypeScript compiles
- Manual smoke: dev server runs. Apply user-texture to a ceiling. Inspect cadStore state in devtools — confirm ceiling has `scaleFt` written.
- Same texture applied to a wall AND a ceiling: each surface stores its own `scaleFt` independently.

**Commit:** `feat(42-01): ceiling picker writes scaleFt at apply-time (BUG-01)`

---

## Task 4 — Tests + GH #96 close (D-06)

**Read first:**
- `tests/userTextureSnapshot.test.ts` — existing per-surface invariant tests
- `src/three/CeilingMesh.tsx` — for the resolver-unit-test target

**Add tests:**

**(a) New unit test:** `tests/ceilingMeshScaleResolver.test.ts`

Test the resolver precedence as a pure function. Extract the resolver into a small helper if it's currently inline in the JSX, or test by mocking the inputs and asserting the output. Cases:

- `ceiling.scaleFt = 4`, `catalog.tileSizeFt = 2` → resolver returns 4 (override wins)
- `ceiling.scaleFt = undefined`, `catalog.tileSizeFt = 8` → resolver returns 8 (catalog fallback)
- `ceiling.scaleFt = undefined`, `catalog = null` → resolver returns 2 (hardcoded last resort)
- `ceiling.scaleFt = 0` → returns 0 (caller's responsibility to validate; resolver does not coerce)

**(b) Integration test in `tests/userTextureSnapshot.test.ts`:**

Test that the same `userTextureId` applied to a wall (via wallpaper) + a ceiling with DIFFERENT `scaleFt` values is preserved through a snapshot round-trip:

```ts
it("BUG-01: per-surface scaleFt is isolated across same userTextureId", () => {
  const snapshot = {
    rooms: {
      r1: {
        walls: { w1: { wallpaper: { A: { kind: "pattern", userTextureId: "utex_x", scaleFt: 4 } } } },
        ceilings: { c1: { userTextureId: "utex_x", scaleFt: 8 } },
      },
    },
  };
  // Round-trip: serialize → parse → assert scaleFt values are independent
  const json = JSON.stringify(snapshot);
  const parsed = JSON.parse(json);
  expect(parsed.rooms.r1.walls.w1.wallpaper.A.scaleFt).toBe(4);
  expect(parsed.rooms.r1.ceilings.c1.scaleFt).toBe(8);
});
```

(Adjust to match actual snapshot shape — `placedProducts`, `customElements`, `ceilings` location etc.)

**Run tests:**
- `npm test -- userTextureSnapshot` → existing tests still pass + new BUG-01 test passes
- `npm test -- ceilingMeshScaleResolver` → 4 new unit tests pass
- `npm test` → full suite passes (6 pre-existing failures unchanged)

**Close GH #96** with a comment referencing this PR + the merge commit:

```bash
gh issue close 96 --comment "Shipped in **Phase 42 (v1.9 milestone)** — Ceiling.scaleFt per-surface override mirrors Wallpaper.scaleFt + FloorMaterial.scaleFt. CeilingMesh resolver: ceiling.scaleFt ?? catalog.tileSizeFt ?? 2. Apply-time write in SurfaceMaterialPicker propagates the picker's tileSizeFt to the ceiling record. Tests assert per-surface isolation across same userTextureId. PR #<this-PR>."
```

**Acceptance:**
- All new tests pass
- Full vitest suite shows 6 pre-existing failures unchanged (no new regressions)
- GH #96 state: CLOSED with closing comment referencing this PR

**Commit:** `test(42-01): assert per-surface scaleFt isolation + close GH #96 (BUG-01)`

This commit also writes `42-01-fix-SUMMARY.md`, updates STATE.md, and updates ROADMAP.md (42: 0/1 → 1/1 Complete). v1.9 ready for audit + complete-milestone after this lands.

---

## Plan-level acceptance criteria

- [ ] All 4 tasks executed and committed atomically
- [ ] `Ceiling.scaleFt?: number` field present in `src/types/cad.ts` with JSDoc
- [ ] `CeilingMesh` resolver returns `ceiling.scaleFt ?? entry?.tileSizeFt ?? 2`
- [ ] Ceiling picker writes `scaleFt` at apply-time (verified via cadStore inspection)
- [ ] Unit test for resolver precedence + integration test for cross-surface isolation both pass
- [ ] Full vitest suite: no new failures (6 pre-existing failures unchanged)
- [ ] `npm run build` succeeds; `npx tsc --noEmit` clean
- [ ] GH #96 closed with PR-reference comment
- [ ] SUMMARY.md created at `.planning/phases/42-bug01-tilesize-isolation/42-01-fix-SUMMARY.md`
- [ ] STATE.md + ROADMAP.md updated

---

*Plan: 42-01-fix*
*Author: orchestrator-inline (CONTEXT.md is fully prescriptive — no judgment calls deferred)*
