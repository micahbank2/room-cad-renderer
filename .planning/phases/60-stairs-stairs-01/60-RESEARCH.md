---
phase: 60-stairs-stairs-01
type: research
created: 2026-05-04
status: ready-for-planning
confidence: HIGH
---

# Phase 60: Stairs (STAIRS-01) — Research

**Researched:** 2026-05-04
**Domain:** New top-level CAD primitive (`Stair`), 2D fabric symbol + 3D stacked-box rendering, integration with Phase 30/31/46/47/48/53/54 pipelines
**Confidence:** HIGH (all 6 questions answered against source code; only Q1 has a forced fallback decision)

## Summary

The 17 locked decisions in CONTEXT.md cover the design surface. This research confirms that all 6 open questions have unambiguous answers in the existing codebase. No new patterns or libraries are needed — Phase 60 is purely additive integration with established Phase 30/31/46/47/48/53/54 pipelines.

**Primary recommendation:** Plan as **1 plan, 7 tasks** (atomic-commits per D-16). Use Material Symbols `stairs` glyph (Phase 33 D-33 allowlist exception), reuse Product action-set in CanvasContextMenu with kind label override, and bump snapshot v3 → v4 with idempotent passthrough migration. Stair is consume-only in the snap engine for v1.15 (snaps TO walls; nothing snaps to stairs).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01** Stair is new top-level entity (`RoomDoc.stairs: Record<string, Stair>`), NOT a customElement kind. Schema: `id, position (bottom-step center), rotation, riseIn, runIn, widthFtOverride?, stepCount, labelOverride?, savedCameraPos?, savedCameraTarget?`
- **D-02** Continuous degree rotation; Shift-snap-15° (NOT 4-cardinal — overrides REQUIREMENTS.md)
- **D-03** 2D symbol = `fabric.Group` of {outline rect, parallel step lines, UP arrow, optional label}. No diagonal break-line.
- **D-04** `position` = bottom-step center (NOT bbox center). Stair extends AWAY in UP direction defined by rotation.
- **D-05** Smart-snap to wall edges via Phase 30 `computeSnap()`. Alt disables smart-snap, grid-snap remains.
- **D-06** 3D = `stepCount` separate `<boxGeometry>` meshes stacked + offset. Hardcoded color `#cdc7b8`, roughness 0.7.
- **D-07** Edge handles: width-only (left/right). Top/bottom edge handles HIDDEN. Rise/run/stepCount are PropertiesPanel-only.
- **D-08** PropertiesPanel inputs: width (ft+in), rise (in, 4-9), run (in, 9-13), stepCount (3-30), rotation (0-359), label (max 40 chars). Live-edit via `*NoHistory`; Enter/blur commits.
- **D-09** No per-stair material override in v1.15.
- **D-10** Tree groupKey `"stairs"` per room. Empty state: "No stairs in this room".
- **D-11** 3D wrapping `<group>` + 2D `data: { type: "stair", stairId }` for click + right-click discrimination.
- **D-12** Snapshot version bump (3 → 4). v3 loads with empty `stairs: {}` per RoomDoc.
- **D-13** Defaults: 7" rise × 11" run × 36" width × 12 steps.
- **D-14** Saved camera per stair (mirror Phase 48 PlacedProduct fields).
- **D-15** Test coverage: 4 unit + 3 component + 6 e2e.
- **D-16** Atomic commits per task.
- **D-17** Zero regressions; 4 pre-existing vitest failures must remain exactly 4.

### Claude's Discretion
- Internal task ordering inside the 1 plan
- Lucide vs Material Symbols icon fallback (this research recommends Material Symbols)
- Whether to add stair-edge targets to snap scene (this research recommends NO — consume-only)
- Reuse vs new branch in `getActionsForKind` (this research recommends NEW branch with same actions as product)

### Deferred Ideas (OUT OF SCOPE)
Stair landings, multi-flight, spiral, L-shape, curved/winding, handrails, floor opening / ceiling cut, per-step materials, IBC validator, carpet, "stair to nowhere" detection.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STAIRS-01 | New stair primitive: toolbar tool, 2D top-down symbol, 3D stacked-box, rise/run/width/stepCount config in PropertiesPanel | All 6 questions resolved; integration paths confirmed in source |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Phase 33 D-33 — Icon policy:** lucide-react for new chrome icons. Material Symbols allowed in `Toolbar.tsx` for CAD-domain glyphs. Do NOT add `material-symbols-outlined` outside the allowlist.
- **Phase 33 D-34 — Spacing:** Use canonical 4/8/16/24/32 px scale. PropertiesPanel is on the per-file zero-arbitrary-values list.
- **Phase 31 — Override pattern:** `widthFtOverride ?? defaultWidth` resolver (do NOT mix with `sizeScale`).
- **Phase 30 — Snap pattern:** `__pending__` sentinel id for placement-time exclude-self.
- **GitHub Issues rule:** Plan must reference Issue #19 (REQUIREMENTS.md STAIRS-01).
- **GSD execution rule:** Atomic commit per task, mirror Phase 49–59 cadence.

---

## Question 1 — Lucide `Stairs` icon availability

**Confidence:** HIGH (source-of-truth confirmed)

**Finding:** `lucide-react` does **NOT** export a `Stairs` icon. Only `StepForward` (a media-control "next track" play-button glyph) and `StepBack` exist (verified at `node_modules/lucide-react/dist/lucide-react.d.ts`). Neither resembles a staircase — `StepForward` is a triangle+vertical-bar play button, semantically wrong for a CAD stair tool.

**Recommendation:** Use **Material Symbols `stairs` glyph** in `Toolbar.tsx`. Phase 33 D-33 explicitly permits Material Symbols in `Toolbar.tsx` for CAD-domain glyphs (the file is on the 8-file allowlist alongside `door_front`, `window`, `roofing`). Pattern matches existing toolbar icons:

```tsx
// src/components/Toolbar.tsx — add to ToolPalette:
<button onClick={() => setTool("stair")} ...>
  <span className="material-symbols-outlined">stairs</span>
  <span>STAIRS</span>
</button>
```

For the **TreeRow** (Phase 46 `src/components/RoomsTreePanel/TreeRow.tsx`), the file currently imports only from lucide (`ChevronRight, ChevronDown, Eye, EyeOff, Camera`). Two options:

1. **(Recommended)** Add `<span className="material-symbols-outlined">stairs</span>` inline. TreeRow is NOT on the Phase 33 allowlist, but stair is unambiguously a CAD-domain glyph and matches the policy spirit. Mark with a code comment: `// Phase 33 D-33 exception — CAD-domain glyph, lucide has no equivalent`.
2. Use lucide `<StepForward />` rotated 90° via Tailwind `rotate-90` — visually closer to a staircase profile. Cheaper but visually unclear for non-developer Jessica.

**Risk:** Option 1 expands the Material Symbols allowlist by one file. Document the new entry in `CLAUDE.md` design-system section as part of this phase's atomic file change. Option 2 is hacky but stays inside the existing icon system.

**Planner action:** Pick option 1 — explicit allowlist expansion is honest. Bundle the CLAUDE.md edit into Task T01 (types + constants).

---

## Question 2 — Phase 30 snap engine integration

**Confidence:** HIGH (snapEngine.ts + buildSceneGeometry inspected)

**Finding:** Phase 30's `SceneGeometry` (`src/canvas/snapEngine.ts:65-78`) contains `wallEdges`, `wallMidpoints`, `objectBBoxes`. The `objectBBoxes` field is populated by `buildSceneGeometry()` from `placedProducts` + `placedCustomElements` (verified by reading the type signature and confirmed in `productTool.ts:48-58` — it passes `useCADStore.getState() as any, "__pending__", _productLibrary, customCatalog`).

The placement tool **consumes** the snap scene (snaps to wall edges + other objects' bboxes) using `__pending__` as the exclude-self sentinel. It does NOT add the placement-in-progress object's bbox to the scene.

**Recommendation: Stairs are CONSUME-ONLY in v1.15.** Concretely:

- Stair tool calls `computeSnap()` against an unmodified `SceneGeometry` containing only wall edges + existing product/customElement bboxes
- Other primitives (products, customElements, walls) do NOT snap to stairs because `buildSceneGeometry` doesn't include `RoomDoc.stairs` in `objectBBoxes`
- Defer "snap-to-stairs" to v1.16 if Jessica reports needing it

**Why not contribute snap targets:**
- Stair bbox is well-defined (`width × totalRunFt = width × stepCount × runIn/12`) but uniform-bbox snap on a stair feels semantically wrong. Walls and products want to align with each other; stairs are positional anchors not alignment targets.
- Adding stairs to `buildSceneGeometry` requires schema reasoning across that pure module (Phase 30 D-01 — pure, caller passes state in). Touching `buildSceneGeometry` risks regression on existing primitives. Out of scope for D-17 zero-regression guarantee.
- v1.15 is "ship the primitive". v1.16 can extend.

**Stair tool implementation pattern (mirror productTool.ts:36-254):**

```ts
// src/canvas/tools/stairTool.ts
let pendingStairConfig: { rotation: number; widthFt: number; stepCount: number; runIn: number } | null = null;

export function setPendingStair(cfg: typeof pendingStairConfig) { pendingStairConfig = cfg; }

export function activateStairTool(fc, scale, origin): () => void {
  let cachedScene: SceneGeometry | null = null;
  const ensureScene = () => {
    if (!cachedScene) {
      cachedScene = buildSceneGeometry(useCADStore.getState() as any, "__pending__", _productLibrary, useCADStore.getState().customElements ?? {});
    }
    return cachedScene;
  };
  // snapFor identical to productTool.ts:65-105 except bbox uses stair footprint:
  //   width = pendingStairConfig.widthFt
  //   depth = pendingStairConfig.stepCount * pendingStairConfig.runIn / 12   ← totalRunFt
  //   bbox center = feet (the click position; D-04 says position = bottom-step center,
  //     but for SNAP we use the bbox CENTER, then translate at commit time so
  //     bottom-step lands on the snapped point — see Pitfall below).
  // ...
  // onMouseDown: useCADStore.getState().addStair(roomId, { ...DEFAULT_STAIR, position: snapped, rotation: pendingStairConfig.rotation });
  return () => { /* cleanup mirrors productTool.ts:238-253 */ };
}
```

**Pitfall — D-04 origin asymmetry:** `position` is bottom-step center (D-04), but Phase 30's `axisAlignedBBoxOfRotated()` expects the bbox CENTER as input. The stair tool MUST compute `bboxCenter = position + (rotation-aware offset of totalRunFt/2 along UP axis)` before passing to `axisAlignedBBoxOfRotated`. Without this, snap guides will appear `totalRunFt/2` off from where the user expects. Test E9 ("smart-snap snaps stair flush to wall") will catch this.

---

## Question 3 — Snapshot v3 → v4 migration

**Confidence:** HIGH (snapshotMigration.ts read in full)

**Finding:** The snapshot system is at v3, NOT v2. There are TWO inconsistencies the planner must address:

1. **`src/types/cad.ts:209` says `version: 2;` — STALE.** Actual current version is 3 (`defaultSnapshot()` at `snapshotMigration.ts:13` writes `version: 3`; `cadStore.ts:155` writes `version: 3`; `migrateFloorMaterials` at `snapshotMigration.ts:127-141` bumps to 3).
2. Some test fixtures + serializer call sites still write `version: 2` (e.g., `ProjectManager.tsx:35`, `TemplatePickerDialog.tsx:60`, `useAutoSave.ts:30`, `cadStore.paint.test.ts:86,99`). This is a pre-existing v2/v3 drift that has been gracefully handled by `migrateSnapshot()` v2-passthrough at `snapshotMigration.ts:58-68`. **Do NOT clean this up in Phase 60** — out of scope and risks regression.

**v4 migration shape — recommended pattern:**

```ts
// src/lib/snapshotMigration.ts — modify migrateSnapshot:

export function migrateSnapshot(raw: unknown): CADSnapshot {
  // v4 passthrough — already migrated, no mutations needed
  if (raw && typeof raw === "object" && (raw as CADSnapshot).version === 4 && (raw as CADSnapshot).rooms) {
    return raw as CADSnapshot;
  }
  // v3 → v4 migration: ensure stairs: {} on every RoomDoc
  if (raw && typeof raw === "object" && (raw as CADSnapshot).version === 3 && (raw as CADSnapshot).rooms) {
    const snap = raw as CADSnapshot;
    for (const doc of Object.values(snap.rooms)) {
      if (!doc.stairs) (doc as RoomDoc).stairs = {};
    }
    snap.version = 4;
    return snap;
  }
  // v2 passthrough — keep as-is, then upgrade through v3 logic on next save
  // (existing v2 → v3 handled below; let it fall through, then re-enter at v3)
  if (/* v2 case */) { ... }
  // ... rest unchanged
}

// Also update defaultSnapshot():
export function defaultSnapshot(): CADSnapshot {
  return {
    version: 4,                                          // ← was 3
    rooms: { room_main: { ...mainRoom, stairs: {} } },   // ← add stairs init
    activeRoomId: "room_main",
  };
}
```

**Type changes in `src/types/cad.ts`:**
- `CADSnapshot.version: 2;` → `CADSnapshot.version: 4;` (literal type)
- `RoomDoc.stairs?: Record<string, Stair>;` (new optional field)
- New `Stair` interface per D-01 schema

**Other version-3-literal call sites to bump to 4:**
- `cadStore.ts:155` — `version: 3,` → `version: 4,`
- `defaultSnapshot()` in `snapshotMigration.ts:13`
- Optional: `ProjectManager.tsx:35`, `TemplatePickerDialog.tsx:60`, `useAutoSave.ts:30`, `cadStore.paint.test.ts:86,99` — these write v2 today and are still tolerated. **Recommend leaving alone** to keep diff minimal and avoid touching unrelated tests.

**Test fixture change:** Any existing snapshot fixtures used by stair-specific tests should write `version: 4` and include `stairs: {}` per RoomDoc. Mirror `cadStore.paint.test.ts:86` style.

**Risk:** Forgetting the migration step on a v3 → v4 jump means `RoomDoc.stairs` is `undefined` at read time and the `Object.values(doc.stairs ?? {})` defensive fallback is mandatory at every consumer site (3D RoomGroup, 2D fabricSync, tree builder, PropertiesPanel). Recommend adding `?? {}` defensive defaults at each consumer rather than relying on migration alone — Phase 51's FloorMaterial migration learned this lesson.

---

## Question 4 — PropertiesPanel kind discriminator

**Confidence:** HIGH (PropertiesPanel.tsx:174-310 inspected)

**Finding:** PropertiesPanel uses **sequential `if (entity)` blocks**, not a single switch. The pattern (read at `src/components/PropertiesPanel.tsx:202-310`):

```tsx
const wall = id ? walls[id] : undefined;
const pp   = id ? placedProducts[id] : undefined;        // (read via similar selector)
const ceiling = id ? ceilings[id] : undefined;
const pce  = id ? placedCustomElements[id] : undefined;
// ...
if (!wall && !pp && !ceiling && !pce) {
  return <EmptySelectionState />;
}
return (
  <>
    {wall && <WallSection wall={wall} />}
    {ceiling && <CeilingSection ceiling={ceiling} />}
    {pp && <ProductSection pp={pp} />}
    {pce && <CustomElementSection pce={pce} />}
  </>
);
```

**Recommendation — exact integration:**

1. Add `const stair = id ? stairs[id] : undefined;` (after the `pce` line)
2. Extend the early-return guard: `if (!wall && !pp && !ceiling && !pce && !stair) { return <EmptySelectionState />; }`
3. Add `{stair && <StairSection stair={stair} />}` in the render fragment
4. New `StairSection` component co-located in PropertiesPanel.tsx OR new file `PropertiesPanel.StairSection.tsx`

**Recommend:** new file `src/components/PropertiesPanel.StairSection.tsx` (~150 lines: rise/run/width/stepCount/rotation/label inputs + Save Camera button). Keeps PropertiesPanel.tsx from growing unboundedly. Mirrors how the Phase 33 zero-arbitrary-values constraint is enforced per-file — smaller files = easier audit.

**Save Camera button reuse:** PropertiesPanel.tsx:86-138 has a `<SavedCameraSection>` component already parameterized by `kind: "wall" | "product" | "ceiling" | "custom"`. **Extend the union to include `"stair"`** and add the `else if (kind === "stair") cadState.setSavedCameraOnStairNoHistory?.(id, capture.pos, capture.target);` branch (matching the existing 4 kinds). This keeps Save Camera UI consistent and avoids re-implementing the full save/clear flow.

---

## Question 5 — Phase 53 menu kind discrimination

**Confidence:** HIGH (CanvasContextMenu.tsx read in full)

**Finding:** `getActionsForKind(kind, nodeId)` at `src/components/CanvasContextMenu.tsx:33-135` is a switch-by-string. Current kinds: `"wall" | "product" | "ceiling" | "custom" | "empty"` (defined in `src/stores/uiStore.ts:154`).

The 6 actions stairs need (Focus camera, Save camera here, Hide/Show, Copy, Paste, Delete) match the **product** action set EXACTLY (`CanvasContextMenu.tsx:102-109`):

```tsx
if (kind === "product") {
  return [
    ...baseActions,                                  // focus, save-cam, hide-show
    { id: "copy",   label: "Copy",   ... },
    { id: "paste",  label: "Paste",  ... },
    { id: "delete", label: "Delete", ..., handler: () => store.removeProduct(nodeId) },
  ];
}
```

**Recommendation — add NEW branch (don't reuse):**

```tsx
if (kind === "stair") {
  return [
    ...baseActions,
    { id: "copy",   label: "Copy",   icon: <Copy size={14} />,      handler: () => copySelection() },
    { id: "paste",  label: "Paste",  icon: <Clipboard size={14} />, handler: () => pasteSelection() },
    { id: "delete", label: "Delete", icon: <Trash2 size={14} />,    handler: () => { if (nodeId) store.removeStair(nodeId); }, destructive: true },
  ];
}
```

**Why new branch (not product reuse):** the `delete` handler calls `store.removeProduct(nodeId)` for products and must call `store.removeStair(nodeId)` for stairs — a kind-specific store action. A new branch keeps the dispatch explicit. Code duplication is 5 lines and worth the clarity.

**Required changes in baseActions block (`CanvasContextMenu.tsx:38-83`):**

1. `focusCamera()` — add `else if (kind === "stair") { const s = doc.stairs?.[nodeId]; if (s) focusOnStair(s); }` (new dispatch fn `focusOnStair` in `src/components/RoomsTreePanel/focusDispatch.ts`).
2. `saveCameraHere()` — add `else if (kind === "stair") store.setSavedCameraOnStairNoHistory(nodeId, capture.pos, capture.target);`
3. `ContextMenuKind` union in `uiStore.ts:154,159,397` — extend to include `"stair"`.

**Copy/paste support:** Phase 60 should support copy/paste of stairs. Verify `src/lib/clipboardActions.ts` `copySelection()` and `pasteSelection()` already detect stair IDs from `selectedIds` and serialize them. If not, this is a small extension (mirror the placedCustomElement copy/paste branch). **Recommend a quick read of clipboardActions.ts during planning** to confirm; if it's selection-id-keyed without per-kind logic, no change needed.

---

## Question 6 — Phase 46 hiddenIds + tree integration

**Confidence:** HIGH (RoomsTreePanel.tsx + buildRoomTree.ts inspected)

**Finding:**

1. **`hiddenIds: Set<string>` is keyed by entity id (NOT kind-scoped).** Confirmed at `RoomsTreePanel.tsx:23` (module-level `EMPTY_HIDDEN_IDS = new Set<string>()`), used at line 105-108 with raw selector. Stair IDs (prefixed `stair_<uid>` per D-01) join the same Set. No collision risk because all id prefixes are distinct (`wall_`, `pp_`, `op_`, `prod_`, `proj_`, `stair_`).
2. **Visibility cascade** (Phase 46 D-12) — read `src/lib/buildRoomTree.ts` to confirm. The current groupKey union is `"walls" | "ceiling" | "products" | "custom"` (line 13). Stairs add a 5th group. Cascade is enforced at the room level — hiding a Room hides descendants.
3. **Empty state copy** — current pattern uses placeholder text in TreeRow rendering. `"No stairs in this room"` matches the established convention. Implementation site is in `RoomsTreePanel.tsx` rendering loop (or `TreeRow.tsx`).
4. **Click-to-focus camera** — Phase 46 dispatches via `focusDispatch.ts` (`focusOnRoom`, `focusOnWall`, `focusOnPlacedProduct`, `focusOnCeiling`, `focusOnPlacedCustomElement`, `focusOnSavedCamera`). Add `focusOnStair(stair: Stair, doc: RoomDoc)` mirroring `focusOnPlacedProduct`. Camera target = stair's `position` (bottom-step center); camera position = positioned at stair's UP-end (top of stairs) at eye level — pick a sensible default.

**Recommendation — exact integration in `buildRoomTree.ts`:**

```ts
// src/lib/buildRoomTree.ts — add new groupKey and entries
groupKey?: "walls" | "ceiling" | "products" | "custom" | "stairs";
// ...
const stairEntries = Object.values(doc.stairs ?? {});
if (stairEntries.length > 0 || alwaysShowEmptyGroups) {
  treeNodes.push({
    roomId: doc.id, groupKey: "stairs", id: `${doc.id}-stairs-group`, label: "STAIRS",
    children: stairEntries.map((s) => ({
      id: s.id, label: s.labelOverride ?? "STAIRS", ...
    })),
  });
}
```

**TreeRow icon:** Use Material Symbols `stairs` glyph (per Q1 finding). Current TreeRow.tsx imports only lucide; add a single `<span className="material-symbols-outlined">stairs</span>` site with an inline comment. Alternatively, use `<StepForward className="rotate-90" />` from lucide — falls within Phase 33 D-33 strict reading. **Recommend Material Symbols** for visual clarity; the lucide rotated-step-forward looks like an arrow, not a staircase.

---

## Standard Stack

No new dependencies. All required infrastructure already in tree:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| three | ^0.183.2 | 3D box mesh stack | Already in stack |
| @react-three/fiber | ^8.17.14 | StairMesh declarative rendering | Already used in RoomGroup |
| fabric | ^6.9.1 | 2D stair symbol Group | Already used in fabricSync.ts |
| zustand | ^5.0.12 | addStair/updateStair/removeStair | Already used in cadStore |
| immer | ^11.1.4 | Immutable patches in store actions | Already used |
| lucide-react | (existing) | Most TreeRow icons | Used everywhere; no Stairs export |
| material-symbols-outlined | (CSS) | `stairs` glyph (CAD-domain exception) | Phase 33 D-33 allowlisted in Toolbar.tsx |

## Architecture Patterns

### Mirror productTool.ts for stairTool.ts
- Module-scoped `pendingStair*` config + `setPendingStair()` setter (D-07 toolbar→tool bridge precedent)
- `activateStairTool(fc, scale, origin)` returns cleanup fn
- Closure-state for cached `SceneGeometry` (invalidate on placement)
- `onMouseMove` renders snap guides; `onMouseDown` commits with snapped position
- Test-mode driver `__drivePlaceStair` gated by `import.meta.env.MODE === "test"`

### Mirror PlacedProduct/PlacedCustomElement for Stair
- `id: stair_${uid()}` prefix (D-01)
- `position: Point` field (semantics differ from products — see Pitfall 1)
- `rotation: number` continuous degrees
- Override field for width: `widthFtOverride?: number` (Phase 31 pattern)
- Saved camera: `savedCameraPos?: [number, number, number]; savedCameraTarget?: [number, number, number];`
- Store actions: `addStair`, `updateStair` + `updateStairNoHistory`, `removeStair`, `setSavedCameraOnStairNoHistory`, `clearStairSavedCameraNoHistory`, `resizeStairWidth` + `resizeStairWidthNoHistory`

### 3D component shape (mirror CustomElementMesh.tsx)
- Wrapping `<group>` carries `onClick` (Phase 54) + `onContextMenu` (Phase 53) handlers
- Selection outline shown when `isSelected`
- Hidden state: skip render entirely when `hiddenIds.has(stair.id)`

### 2D fabric.Group shape (mirror fabricSync.ts:989-1071)
- `data: { type: "stair", stairId: s.id }` for click + right-click discrimination
- Group contains: outline rect, N step lines, arrow polygon, optional label text

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Snap-to-wall during stair placement | Custom snap math | Phase 30 `computeSnap()` + `buildSceneGeometry()` |
| Width drag handles | Custom Fabric resize | Phase 31 edge-handle drag pattern (writes `widthFtOverride`) |
| Click-to-select stair in 3D | Custom raycaster | Phase 54 `useClickDetect` + wrapping `<group>` |
| Right-click menu for stair | Custom context menu | Phase 53 `CanvasContextMenu` + `getActionsForKind("stair", id)` |
| Tree visibility cascade | Per-kind hide logic | Phase 46 `hiddenIds: Set<string>` + tree groupKey |
| Saved camera per stair | Custom camera state | Phase 48 mirror of `setSavedCameraOnProductNoHistory` |
| Snapshot version migration | Custom version handler | Phase 51 `migrateSnapshot()` v3→v4 passthrough pattern |

## Common Pitfalls

### Pitfall 1: D-04 origin asymmetry breaks snap
**What goes wrong:** `position` is bottom-step center. Phase 30 `axisAlignedBBoxOfRotated()` expects bbox CENTER. Without translation, snap guides appear `totalRunFt/2` off.
**Prevention:** In `stairTool.ts`, compute `bboxCenter = position + rotateVec({x: 0, y: totalRunFt/2}, rotation)` before calling `axisAlignedBBoxOfRotated`. After snap, reverse the translation: commit `position = snappedBboxCenter - rotateVec(...)`. Test E9 catches this.

### Pitfall 2: Defensive `?? {}` on `RoomDoc.stairs`
**What goes wrong:** Migration writes `stairs: {}` but new RoomDocs created via `createRoom` action might forget. Consumer crashes with `Cannot iterate undefined`.
**Prevention:** Every consumer site (`Object.values(doc.stairs ?? {})`) plus add `stairs: {}` to the `createRoom` action's RoomDoc factory.

### Pitfall 3: `Stair.position` semantics drift
**What goes wrong:** PlacedProduct.position is "center". Stair.position is "bottom-step center". Code that copies product position→stair (e.g., paste-from-clipboard) will misplace the stair.
**Prevention:** Document the distinction in `cad.ts` JSDoc. In clipboard-paste, if pasting a stair, treat `position` as bottom-step center. If pasting a product into a stair slot (cross-kind paste — probably blocked), reject the paste.

### Pitfall 4: Snapshot version `2` is stale type, current value is `3`
**What goes wrong:** Type literal `version: 2;` in cad.ts:209 is stale; runtime value is 3. Bumping the type to 4 silently allows v3 snapshots through TS but they fail at the migration step if not handled.
**Prevention:** Bump type to `version: 4;` AND add explicit v3 → v4 migration arm. Never just bump the literal.

### Pitfall 5: 4 pre-existing vitest failures (D-17)
**What goes wrong:** Adding 7 new unit/component tests + touching cadStore + types may accidentally fix or break one of the 4 known-failing tests, throwing the gate count off.
**Prevention:** Run `npm test 2>&1 | grep -c "FAIL"` before and after each task. Document baseline. If count drifts, identify which test changed state and document.

## Code Examples

### Stair store actions (mirror cadStore product actions)
```ts
// src/stores/cadStore.ts — add to actions
addStair: (roomId: string, partial: Partial<Stair>) => set((s) => {
  const doc = s.rooms[roomId];
  if (!doc) return;
  pushHistory(s);
  if (!doc.stairs) doc.stairs = {};
  const id = `stair_${uid()}`;
  doc.stairs[id] = {
    id, position: { x: 0, y: 0 }, rotation: 0,
    riseIn: 7, runIn: 11, stepCount: 12,
    ...partial,
  };
}),

updateStair: (roomId, id, patch) => set((s) => {
  const stair = s.rooms[roomId]?.stairs?.[id];
  if (!stair) return;
  pushHistory(s);
  Object.assign(stair, patch);
}),

updateStairNoHistory: (roomId, id, patch) => set((s) => {
  const stair = s.rooms[roomId]?.stairs?.[id];
  if (!stair) return;
  Object.assign(stair, patch);
}),

removeStair: (roomId, id) => set((s) => {
  const doc = s.rooms[roomId];
  if (!doc?.stairs?.[id]) return;
  pushHistory(s);
  delete doc.stairs[id];
}),
```

### StairMesh.tsx (per D-06)
```tsx
// src/three/StairMesh.tsx
import { Stair } from "@/types/cad";

export function StairMesh({ stair, isSelected, onClick, onContextMenu }: Props) {
  const widthFt = stair.widthFtOverride ?? 3;
  const riseFt = stair.riseIn / 12;
  const runFt = stair.runIn / 12;
  return (
    <group
      position={[stair.position.x, 0, stair.position.y]}
      rotation={[0, (stair.rotation * Math.PI) / 180, 0]}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {Array.from({ length: stair.stepCount }, (_, i) => (
        <mesh
          key={i}
          position={[0, riseFt * (i + 0.5), runFt * (i + 0.5)]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[widthFt, riseFt, runFt]} />
          <meshStandardMaterial color="#cdc7b8" roughness={0.7} />
        </mesh>
      ))}
      {isSelected && <SelectionOutline width={widthFt} runFt={runFt * stair.stepCount} riseFt={riseFt * stair.stepCount} />}
    </group>
  );
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 1.x + Playwright 1.x (existing infrastructure) |
| Config file | `vite.config.ts` + `playwright.config.ts` |
| Quick run command | `npm test -- --run --reporter=basic` |
| Full suite command | `npm test && npm run test:e2e` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STAIRS-01 | `addStair` writes default stair to RoomDoc | unit | `npm test -- tests/stores/cadStore.stairs.test.ts -t "addStair"` | ❌ Wave 0 |
| STAIRS-01 | `updateStair` patches stair, preserves other fields | unit | `npm test -- tests/stores/cadStore.stairs.test.ts -t "updateStair"` | ❌ Wave 0 |
| STAIRS-01 | `removeStair` deletes entry | unit | `npm test -- tests/stores/cadStore.stairs.test.ts -t "removeStair"` | ❌ Wave 0 |
| STAIRS-01 | `*NoHistory` variants don't push undo | unit | `npm test -- tests/stores/cadStore.stairs.test.ts -t "NoHistory"` | ❌ Wave 0 |
| STAIRS-01 | PropertiesPanel shows stair-specific inputs | component | `npm test -- tests/components/PropertiesPanel.stair.test.tsx` | ❌ Wave 0 |
| STAIRS-01 | Rise input dispatches updateStairNoHistory live; commits on Enter | component | `npm test -- tests/components/PropertiesPanel.stair.test.tsx -t "rise input"` | ❌ Wave 0 |
| STAIRS-01 | Width edge-handle drag updates widthFtOverride | component | `npm test -- tests/components/PropertiesPanel.stair.test.tsx -t "width drag"` | ❌ Wave 0 |
| STAIRS-01 | Toolbar stair tool → click → stair placed | e2e | `npx playwright test e2e/stairs.spec.ts -g "place"` | ❌ Wave 0 |
| STAIRS-01 | Smart-snap to wall edge | e2e | `npx playwright test e2e/stairs.spec.ts -g "snap"` | ❌ Wave 0 |
| STAIRS-01 | 3D renders 12 stacked box meshes | e2e | `npx playwright test e2e/stairs.spec.ts -g "3D"` | ❌ Wave 0 |
| STAIRS-01 | Right-click in 2D and 3D → menu opens | e2e | `npx playwright test e2e/stairs.spec.ts -g "right-click"` | ❌ Wave 0 |
| STAIRS-01 | Click stair in 3D → PropertiesPanel updates | e2e | `npx playwright test e2e/stairs.spec.ts -g "click select"` | ❌ Wave 0 |
| STAIRS-01 | Tree shows stairs node with icon | e2e | `npx playwright test e2e/stairs.spec.ts -g "tree"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --run --reporter=basic tests/stores/cadStore.stairs.test.ts tests/components/PropertiesPanel.stair.test.tsx`
- **Per wave merge:** `npm test && npx playwright test e2e/stairs.spec.ts`
- **Phase gate:** Full suite green (modulo 4 pre-existing vitest failures per D-17) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/stores/cadStore.stairs.test.ts` — covers STAIRS-01 unit cases U1–U4
- [ ] `tests/components/PropertiesPanel.stair.test.tsx` — covers STAIRS-01 component cases C1–C3
- [ ] `e2e/stairs.spec.ts` — covers STAIRS-01 e2e scenarios E1–E6
- [ ] `src/test-utils/stairDrivers.ts` — `__drivePlaceStair`, `__getStairCount`, `__getStairConfig`, `__driveResizeStairWidth`

## Environment Availability

Skip — phase has no external dependencies. All code-only changes inside the existing browser-React stack.

## Open Questions

None blocking. All 6 CONTEXT.md questions resolved with HIGH confidence.

## Sources

### Primary (HIGH confidence)
- `src/types/cad.ts` (read in full) — RoomDoc, PlacedProduct, CADSnapshot shapes; version literal stale at 2
- `src/canvas/tools/productTool.ts` (read in full) — placement tool template
- `src/canvas/snapEngine.ts` lines 1-120 — SceneGeometry shape, computeSnap signature
- `src/lib/snapshotMigration.ts` (read in full) — migrateSnapshot v1→v2→v3 pattern, defaultSnapshot, migrateFloorMaterials
- `src/components/CanvasContextMenu.tsx` (read in full) — getActionsForKind switch, ContextMenuKind union
- `src/components/PropertiesPanel.tsx` lines 1-310 — sequential `if (entity)` discriminator, SavedCameraSection kind union
- `src/components/RoomsTreePanel/RoomsTreePanel.tsx` lines 1-120 — hiddenIds is Set<string>, EMPTY_HIDDEN_IDS module-level
- `src/lib/buildRoomTree.ts` (grep'd) — groupKey union `"walls" | "ceiling" | "products" | "custom"`
- `src/stores/uiStore.ts` (grep'd) — ContextMenuKind = `"wall" | "product" | "ceiling" | "custom" | "empty"`
- `node_modules/lucide-react/dist/lucide-react.d.ts` — verified Stairs icon does not exist; only StepForward/StepBack
- `CLAUDE.md` — Phase 33 D-33 icon allowlist policy
- `.planning/phases/60-stairs-stairs-01/60-CONTEXT.md` — 17 locked decisions

### Secondary (MEDIUM confidence)
- (none — all findings have HIGH-confidence source backing)

### Tertiary (LOW confidence)
- (none)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new deps; all reuse of in-tree libraries verified by grep
- Architecture: HIGH — productTool.ts template explicitly readable, mirror pattern established Phase 49–59
- Pitfalls: HIGH — origin asymmetry (Pitfall 1) is a forced consequence of D-04 + Phase 30 bbox API; rest derived from source

**Research date:** 2026-05-04
**Valid until:** 2026-06-04 (1 month — none of the dependencies are fast-moving)
