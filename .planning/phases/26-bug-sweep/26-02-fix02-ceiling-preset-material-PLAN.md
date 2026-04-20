---
phase: 26-bug-sweep
plan: 02
type: execute
wave: 2
depends_on: [26-00]
files_modified:
  - src/three/CeilingMesh.tsx
  - src/components/CeilingPaintSection.tsx
  - tests/ceilingMaterial.persistence.test.ts
autonomous: true
requirements: [FIX-02]
must_haves:
  truths:
    - "Selecting any ceiling preset in CeilingPaintSection writes surfaceMaterialId to the active ceiling via setCeilingSurfaceMaterial and the CeilingMesh re-renders with the preset's color + roughness"
    - "Preset selection persists across structuredClone snapshot / reload (D-11) — surfaceMaterialId survives the save path"
    - "Ceiling preset fix stays at color + roughness parity with FloorMesh preset path (D-06) — NO texture loading"
    - "Three overlapping ceiling material fields (material / paintId / surfaceMaterialId) remain AS-IS (D-07) — no type-model collapse"
    - "Tier-resolution order (surfaceMaterialId → paintId → legacy material) is preserved"
  artifacts:
    - path: "src/three/CeilingMesh.tsx"
      provides: "Tier-1 preset branch that renders correctly (color + roughness from SURFACE_MATERIALS)"
      contains: "SURFACE_MATERIALS"
    - path: "src/components/CeilingPaintSection.tsx"
      provides: "Preset picker that writes surfaceMaterialId via setCeilingSurfaceMaterial"
      contains: "setCeilingSurfaceMaterial"
    - path: "tests/ceilingMaterial.persistence.test.ts"
      provides: "GREEN regression guard for preset distinctness + round-trip"
      contains: "surfaceMaterialId"
  key_links:
    - from: "CeilingPaintSection.tsx preset click"
      to: "cadStore setCeilingSurfaceMaterial"
      via: "onSelect handler writing the chosen preset id"
      pattern: "setCeilingSurfaceMaterial"
    - from: "CeilingMesh.tsx useMemo"
      to: "SURFACE_MATERIALS[ceiling.surfaceMaterialId]"
      via: "Tier-1 branch returning { color, roughness } (parity with FloorMesh)"
      pattern: "SURFACE_MATERIALS\\["
---

<objective>
Fix FIX-02: Selecting a ceiling preset visibly changes the 3D ceiling material and persists across project save/reload (issue #43). Per research (26-RESEARCH.md), the tier-resolution code structure is correct — the root cause is one of four candidates that Wave 0 narrows:
1. UI path not calling `setCeilingSurfaceMaterial` for presets (wrong setter, or conditional not firing).
2. Ceiling prop identity stale (React memoization blocking re-render).
3. Near-white presets look identical (Pitfall 3 — not a bug, user perception).
4. `surfaceMaterialId` dropped on save/reload (Pitfall 4 — Wave 0 likely disproves this).

**Pre-fix gate:** Read 26-00 SUMMARY to identify which candidate is live before writing code. Ship only the minimum fix needed.

Preserve (per decisions):
- Color + roughness parity with `FloorMesh` preset path (D-06) — NO texture loading for ceiling presets.
- Three material fields kept AS-IS (D-07) — do not collapse to a discriminated union.
- Tier-resolution order `surfaceMaterialId → paintId → legacy material` preserved.

Purpose: Jessica sees the 3D ceiling visibly change when she clicks a preset, and it's still that preset when she reloads the project.

Output: Minimal fix (< 20 lines per research) + GREEN Wave 0 tests + parity confirmation with FloorMesh.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/26-bug-sweep/26-CONTEXT.md
@.planning/phases/26-bug-sweep/26-RESEARCH.md
@.planning/phases/26-bug-sweep/26-VALIDATION.md
@.planning/phases/26-bug-sweep/26-00-wave0-red-tests-SUMMARY.md

@src/three/CeilingMesh.tsx
@src/three/FloorMesh.tsx
@src/components/CeilingPaintSection.tsx
@src/data/surfaceMaterials.ts
@src/stores/cadStore.ts
@src/types/cad.ts
@tests/ceilingMaterial.test.ts
@tests/ceilingMaterial.persistence.test.ts

<interfaces>
<!-- Current production code shape — touch only what Wave 0 identifies as the real bug. -->

From src/three/CeilingMesh.tsx (lines 30-48 — Tier resolution — DO NOT change tier order per D-07):
```typescript
const { color, roughness } = useMemo(() => {
  if (ceiling.surfaceMaterialId) {                      // Tier 1
    const mat = SURFACE_MATERIALS[ceiling.surfaceMaterialId];
    if (mat) return { color: mat.color, roughness: mat.roughness };
  }
  if (ceiling.paintId) {                                // Tier 2
    return { color: resolvePaintHex(ceiling.paintId, customColors), roughness: ceiling.limeWash ? 0.95 : 0.8 };
  }
  return {                                              // Tier 3 (legacy)
    color: ceiling.material.startsWith("#") ? ceiling.material : "#f5f5f5",
    roughness: 0.8,
  };
}, [ceiling.surfaceMaterialId, ceiling.paintId, ceiling.limeWash, ceiling.material, customColors]);
```

From src/three/FloorMesh.tsx (lines 37-55 — parity target for preset branch — color + roughness ONLY, no texture):
```typescript
if (material.kind === "preset" && material.presetId) {
  const preset = FLOOR_PRESETS[material.presetId as FloorPresetId];
  if (preset) {
    return { texture: null, color: preset.color, roughness: preset.roughness };
  }
}
```

From src/components/CeilingPaintSection.tsx (line ~42 — current preset write path):
```typescript
onSelect={(id) => setCeilingSurfaceMaterial(ceilingId, id)}
```

From src/stores/cadStore.ts (lines 445-460 — store action; DO NOT MODIFY unless Wave 0 confirms bug here):
```typescript
setCeilingSurfaceMaterial: (ceilingId, materialId) =>
  set(produce((s) => {
    const doc = activeDoc(s);
    if (!doc?.ceilings?.[ceilingId]) return;
    pushHistory(s);
    const c = doc.ceilings[ceilingId];
    if (materialId) {
      c.surfaceMaterialId = materialId;
      delete c.paintId;
      delete c.limeWash;
    } else {
      delete c.surfaceMaterialId;
    }
  })),
```

From src/data/surfaceMaterials.ts (concrete ceiling entries used in assertions):
```typescript
PLASTER:         { color: "#f0ebe0", roughness: 0.9,  surface: "ceiling" }
WOOD_PLANK:      { color: "#a0794f", roughness: 0.75, surface: "ceiling" }
PAINTED_DRYWALL: { color: "#f5f5f5", roughness: 0.8,  surface: "ceiling" }
CONCRETE:        { color: "#8a8a8a", roughness: 0.85, surface: "both" }
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 2-01: Diagnose FIX-02 root cause from Wave 0 outcome, then apply the minimum fix</name>
  <files>src/three/CeilingMesh.tsx, src/components/CeilingPaintSection.tsx, tests/ceilingMaterial.persistence.test.ts</files>
  <read_first>
    - .planning/phases/26-bug-sweep/26-00-wave0-red-tests-SUMMARY.md (CRITICAL — reports whether structuredClone round-trip passed; narrows the root cause)
    - src/three/CeilingMesh.tsx (all 66 lines — exact tier resolution and memo dep array)
    - src/three/FloorMesh.tsx (all 72 lines — parity reference; preset branch is lines 48-53)
    - src/components/CeilingPaintSection.tsx (all ~102 lines — the UI write path; verify it actually calls setCeilingSurfaceMaterial for ALL preset entries, including CONCRETE which has surface: "both")
    - src/data/surfaceMaterials.ts (confirm ceiling entries haven't been filtered incorrectly — especially `materialsForSurface("ceiling")` returns PLASTER, WOOD_PLANK, PAINTED_DRYWALL, CONCRETE)
    - src/stores/cadStore.ts (lines 98-132 snapshot(); lines 445-460 setCeilingSurfaceMaterial — DO NOT modify unless Wave 0 proves a bug here)
    - src/three/ThreeViewport.tsx (verify Scene passes ceiling from a live Zustand subscription, not a stale prop)
    - .planning/phases/26-bug-sweep/26-RESEARCH.md (Pitfalls 2, 3, 4 and "FIX-02 Candidate Fix Shape")
  </read_first>
  <behavior>
    - `setCeilingSurfaceMaterial(ceilingId, "WOOD_PLANK")` → `snapshot()` → cloned value has `surfaceMaterialId === "WOOD_PLANK"` (verified by Wave 0 test already).
    - `CeilingMesh` re-renders when `surfaceMaterialId` changes, producing `{ color: "#a0794f", roughness: 0.75 }` for WOOD_PLANK.
    - Preset selection persists through `structuredClone(toPlain(state.rooms))` — the snapshot path used by pushHistory and save.
    - All four ceiling-applicable presets (PLASTER, WOOD_PLANK, PAINTED_DRYWALL, CONCRETE) are selectable and produce distinct visible results — at minimum WOOD_PLANK (#a0794f) and CONCRETE (#8a8a8a) are visibly distinct from PLASTER/PAINTED_DRYWALL.
    - Tier order `surfaceMaterialId → paintId → legacy material` is unchanged (D-07).
    - No texture-loading code added to CeilingMesh (D-06).
  </behavior>
  <action>
    Step 1 — Diagnose (MANDATORY, BEFORE editing production code):

    (a) Read `.planning/phases/26-bug-sweep/26-00-wave0-red-tests-SUMMARY.md`. Note whether the structuredClone round-trip test passed (expected) or failed (surprising).

    (b) Run `npm run dev`, open the app, create a ceiling, open the ceiling panel, click WOOD_PLANK (amber brown, clearly distinct from plaster). Observe the 3D viewport. Record one of the following outcomes:
    - **Outcome A:** WOOD_PLANK does change the color → FIX-02 is "Pitfall 3" (near-white presets look alike). No production code fix needed; the fix is making preset entries more visually distinct OR Plan SUMMARY records that the original bug is perception-only, not render-broken. Close issue #43 with this evidence per D-04 analogue.
    - **Outcome B:** Clicking WOOD_PLANK does NOT change the 3D color → inspect with React DevTools: is `CeilingMesh` re-rendering? Is `ceiling.surfaceMaterialId` actually `"WOOD_PLANK"` in the store (check via `useCADStore.getState().rooms[activeRoomId].ceilings`)?
      - If store value is correct but mesh doesn't re-render → **Pitfall 2** (memo/subscription staleness). Fix in CeilingMesh or ThreeViewport.
      - If store value is NOT updating → **UI bug** in CeilingPaintSection. Fix there.
    - **Outcome C:** Preset works in session but reverts on reload → **Pitfall 4** confirmed despite Wave 0; investigate `snapshotMigration.ts` for ceiling field stripping, or `serialization.ts` for a save-path transformation.

    Step 2 — Apply the minimum fix matching the diagnosed outcome:

    **If Outcome A (perception only):**
    - No production code change.
    - Document in SUMMARY: "FIX-02 was Pitfall 3 — preset selection works correctly. User-facing resolution: issue #43 closed as stale per D-04 analogue; visual distinctness between PLASTER (#f0ebe0) and PAINTED_DRYWALL (#f5f5f5) noted as a backlog polish item."
    - Verification: existing Wave 0 tests stay GREEN.

    **If Outcome B, store updates but mesh doesn't re-render (Pitfall 2):**
    - Inspect how `CeilingMesh` receives its `ceiling` prop. If it comes through a parent that memoizes the ceilings dictionary, ensure each `CeilingMesh` subscribes to its own ceiling via a selector, e.g.:
    ```typescript
    // Inside CeilingMesh, replace prop subscription with selector:
    const ceiling = useCADStore((s) => {
      const doc = s.activeRoomId ? s.rooms[s.activeRoomId] : undefined;
      return doc?.ceilings?.[ceilingId];
    });
    ```
    OR ensure the parent destructures the ceilings dict freshly on each store change so each ceiling object identity updates. Minimize the change — do not refactor ThreeViewport structure.
    - Keep tier order unchanged.

    **If Outcome B, store NOT updating (UI bug):**
    - In `src/components/CeilingPaintSection.tsx`, verify the preset onSelect handler:
    ```typescript
    onSelect={(id) => setCeilingSurfaceMaterial(ceilingId, id)}
    ```
    - Common bug shape: onSelect wired to the wrong setter (e.g., `setCeilingPaint` instead of `setCeilingSurfaceMaterial`), or preset click falls through a `paintId` branch that wins over the surfaceMaterial write.
    - Fix the handler to call `setCeilingSurfaceMaterial(ceilingId, id)` for preset IDs from `SURFACE_MATERIALS`.

    **If Outcome C (persistence drop):**
    - Grep for `surfaceMaterialId` in serialization / migration paths:
      `grep -rn "surfaceMaterialId" src/lib/ src/stores/`
    - Most likely: a migration function or a save transform strips unknown fields. Fix by adding `surfaceMaterialId` to the preserved field list.
    - ALSO extend `tests/ceilingMaterial.persistence.test.ts` with a full `snapshot()` → `JSON.stringify` → `JSON.parse` → asserted-still-present chain that exercises the actual production save path (`saveProject`/`loadProject` can be stubbed with the in-memory snapshot for the unit test).

    Step 3 — Extend the persistence test file with a GREEN regression guard that locks in whichever fix path was taken:

    (a) If Outcomes B/C produced a code change, add a test in `tests/ceilingMaterial.persistence.test.ts`:
    ```typescript
    it("setCeilingSurfaceMaterial write is observable via snapshot()", () => {
      // Use the real store to exercise the full path
      const { useCADStore } = require("@/stores/cadStore");
      const store = useCADStore.getState();
      // ... minimal setup: add room, add ceiling, call setCeilingSurfaceMaterial,
      // then compute a snapshot-shaped object and assert surfaceMaterialId === "WOOD_PLANK"
    });
    ```

    (b) If Outcome A (no fix), no test addition — existing Wave 0 tests already guard against Pitfall 3 and 4.

    Commit message: `fix(26-02): {one-line diagnosis}` — examples:
    - `fix(26-02): subscribe CeilingMesh to live ceiling selector (FIX-02 Pitfall 2)`
    - `fix(26-02): wire preset click to setCeilingSurfaceMaterial (FIX-02 UI bug)`
    - `fix(26-02): preserve surfaceMaterialId through save path (FIX-02 Pitfall 4)`
    - `docs(26-02): close FIX-02 as perception-only (Pitfall 3)`

    Step 4 — Sanity-check parity with FloorMesh:
    - `grep -n "TextureLoader\|textureLoader" src/three/CeilingMesh.tsx` MUST return zero matches (D-06 guard — ceiling presets do not load textures).
    - Tier order in CeilingMesh useMemo unchanged: `surfaceMaterialId` check comes before `paintId` check, which comes before legacy `material`.
  </action>
  <verify>
    <automated>npm run test -- --run tests/ceilingMaterial.test.ts tests/ceilingMaterial.persistence.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `grep -n "TextureLoader" src/three/CeilingMesh.tsx` returns zero matches (D-06 parity with FloorMesh preset path — no texture loading).
    - `grep -n "ceiling.surfaceMaterialId" src/three/CeilingMesh.tsx` returns at least 2 matches (tier check + dep array — tier order preserved).
    - `grep -n "setCeilingSurfaceMaterial" src/components/CeilingPaintSection.tsx` returns at least 1 match (UI wired correctly).
    - `grep -n "surfaceMaterialId" src/stores/cadStore.ts` returns its pre-fix occurrences unchanged unless Outcome C required a serialization fix (in which case at least one additional match appears in a serialization file and is documented in SUMMARY).
    - `npm run test -- --run tests/ceilingMaterial.test.ts tests/ceilingMaterial.persistence.test.ts` all passing (GREEN).
    - Plan SUMMARY explicitly names which Outcome (A/B/C) was diagnosed and which fix was applied.
    - Three ceiling material fields unchanged in src/types/cad.ts (D-07 guard): `grep -c "surfaceMaterialId\|paintId\|material:" src/types/cad.ts` returns same count as pre-plan.
  </acceptance_criteria>
  <done>
    Diagnosed Outcome recorded; minimum fix applied to matching file only; persistence test extended as a regression guard; tier order + three-field model + no-texture constraint all preserved; full suite GREEN.
  </done>
</task>

</tasks>

<verification>
- `npm run test -- --run` full suite passes.
- Manual smoke is captured in Plan 03 (D-10, D-12): select each of PLASTER → WOOD_PLANK → PAINTED_DRYWALL → CONCRETE in the ceiling panel; visible change between at least PLASTER and WOOD_PLANK; save project, hard-refresh, reopen → preset persists.
- Parity with FloorMesh preset path (color + roughness only, no texture) is visually confirmed in 3D viewport.
</verification>

<success_criteria>
- FIX-02 closed (either by code fix or as Pitfall 3 perception-only with recorded evidence).
- `surfaceMaterialId` round-trip test GREEN.
- No changes to `surfaceMaterialId → paintId → material` tier order or Ceiling type field set (D-07).
- No texture loading added for ceiling presets (D-06).
</success_criteria>

<output>
After completion, create `.planning/phases/26-bug-sweep/26-02-fix02-ceiling-preset-material-SUMMARY.md` recording:
1. Which Outcome (A / B-memo / B-UI / C-persistence) was diagnosed.
2. Exact files + lines changed (or "no code change" for Outcome A).
3. Visual confirmation steps taken during diagnosis.
4. Any deferred backlog items (e.g., preset visual distinctness polish if Outcome A).
</output>
