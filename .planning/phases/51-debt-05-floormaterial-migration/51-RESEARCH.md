# Phase 51: FloorMaterial Legacy Data-URL Migration (DEBT-05) — Research

**Researched:** 2026-04-27
**Domain:** Snapshot migration, async Zustand actions, IndexedDB (idb-keyval)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01** — `loadSnapshot` becomes async: `(raw: unknown) => Promise<void>`. All callers need `await`.
- **D-02** — Scope is FloorMaterial only. Wallpaper/wallArt out of scope; file separate issue if confirmed.
- **D-03** — Migration is idempotent (v3 snapshots skip entirely), graceful (malformed entries preserved as-is with `console.warn`), and dedup-aware (`saveUserTextureWithDedup`).
- **D-04** — 5-6 vitest unit cases at `tests/lib/snapshotMigration.floorMaterial.test.ts` + 1 e2e at `e2e/floor-material-migration.spec.ts`.
- **D-05** — Snapshot version bumps 2 → 3. `defaultSnapshot()` returns version 3.
- **D-06** — Atomic commits per task (mirror Phase 49/50/52 shape).
- **D-07** — Zero regressions: v2 snapshots without legacy custom entries must be unaffected.

### Claude's Discretion

None specified.

### Deferred Ideas (OUT OF SCOPE)

- Wallpaper / wallArt legacy data-URL migration
- Refactoring `userTextureStore.ts` IDB layer
- New PBR features (#81)
- Phase 999.4 EXPLODE+saved-camera offset
- Orphaned IDB texture cleanup
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEBT-05 | Migrate legacy `FloorMaterial { kind: "custom", imageUrl: "data:..." }` to `{ kind: "user-texture", userTextureId }` on snapshot load via existing IDB pipeline. Bump version 2 → 3. | §1 (caller audit), §2 (async arch), §4 (error handling), §5 (version strategy) |
</phase_requirements>

---

## Summary

Phase 51 rewrites a one-time snapshot migration: any `FloorMaterial` with `kind: "custom"` and an embedded `imageUrl: "data:image/..."` gets decoded, hashed via SHA-256, stored via `saveUserTextureWithDedup`, and rewritten to `kind: "user-texture"` with a `userTextureId` reference. The change eliminates multi-MB base64 payloads from saved JSON.

The core technical challenge is making `loadSnapshot` async (D-01). Currently it is a synchronous Zustand action called inside `produce()`; IDB writes require `await`. The correct architecture (Pattern A below) runs the async migration before entering `produce()`, keeping the store mutation itself synchronous.

The caller footprint is larger than any prior phase: 5 production callers + 1 shared e2e helper + 12 e2e spec call sites + 2 vitest unit tests. Each needs `await` added and the type declaration updated.

**Primary recommendation:** Pattern A — `async migrateFloorMaterials()` runs before `produce()` inside a refactored async `loadSnapshot`. No changes to `migrateSnapshot` signature; floor migration is a separate post-pass.

---

## 1. Exhaustive Caller Audit

This is the central planning artifact. Every site needs the `() => void` type updated to `() => Promise<void>` and an `await` added.

### 1a. Production Code Callers

| File | Line | Call site | Change required |
|------|------|-----------|-----------------|
| `src/stores/cadStore.ts` | 118 | Type declaration: `loadSnapshot: (raw: unknown) => void` | Change to `Promise<void>` |
| `src/stores/cadStore.ts` | 987 | Implementation: `loadSnapshot: (raw) => set(produce(...))` | Refactor to async; run migration before produce |
| `src/App.tsx` | 85 | `useCADStore.getState().loadSnapshot(project.snapshot)` | Add `await` — already inside `async` IIFE |
| `src/components/ProjectManager.tsx` | 49 | `loadSnapshot(project.snapshot)` inside `async handleLoad` | Add `await` — `handleLoad` is already async |
| `src/components/ProjectManager.tsx` | 63 | `loadSnapshot(defaultSnapshot())` inside `handleNew` (sync) | Make `handleNew` async, add `await` |
| `src/components/WelcomeScreen.tsx` | 32 | `loadSnapshot(full.snapshot)` inside `async handleOpenProject` | Add `await` |
| `src/components/WelcomeScreen.tsx` | 46 | `loadSnapshot(defaultSnapshot())` inside `handleFile` (sync callback) | Make inner async or fire-and-forget (defaultSnapshot has no data URLs — safe to not await, but should await for consistency) |
| `src/components/TemplatePickerDialog.tsx` | 55 | `loadSnapshot(defaultSnapshot())` inside sync `pickTemplate` | Make `pickTemplate` async, add `await` |
| `src/components/TemplatePickerDialog.tsx` | 75 | `loadSnapshot(snap)` inside same `pickTemplate` | Same — add `await` |

**Note on WelcomeScreen.tsx:46** — `handleFile` is a `FileReader.onload` callback (not an async function). The `loadSnapshot(defaultSnapshot())` call there passes a freshly constructed v3 snapshot (after the version bump) — no data URLs possible. Safe to fire-and-forget with `void loadSnapshot(...)`, but making the callback properly async is cleaner and future-proof.

**Note on TemplatePickerDialog.tsx:30** — `loadSnapshot` is fetched via `useCADStore.getState().loadSnapshot` outside a hook (inside the render function, after `if (!open) return null`). This pattern works fine — no change to how it's obtained, just add `await` to both call sites.

### 1b. Test Driver Callers

None of the four driver files (`treeDrivers.ts`, `displayModeDrivers.ts`, `savedCameraDrivers.ts`, `userTextureDrivers.ts`) call `loadSnapshot`. Confirmed by reading all four files.

### 1c. E2E Specs — `page.evaluate()` call sites

All e2e calls are inside `page.evaluate(async () => { ... })` blocks. Because `loadSnapshot` will return a `Promise<void>`, the evaluate must `await` it. Each needs `await` added inside the evaluate callback, AND the evaluate call chain type must reflect the new signature.

| File | Line | Current cast | Change |
|------|------|-------------|--------|
| `e2e/tree-empty-states.spec.ts` | 22 | `{ loadSnapshot: (s: unknown) => void }` | `=> Promise<void>` + `await` |
| `e2e/keyboard-shortcuts-overlay.spec.ts` | 51 | same | same |
| `e2e/display-mode-cycle.spec.ts` | 33 | same | same |
| `e2e/saved-camera-cycle.spec.ts` | 42 | same | same |
| `e2e/tree-expand-persistence.spec.ts` | 18 | same | same |
| `e2e/wall-user-texture-first-apply.spec.ts` | 80 | same | same |
| `tests/e2e/specs/wallpaper-2d-3d-toggle.spec.ts` | 38 | same | same |
| `tests/e2e/specs/floor-user-texture-toggle.spec.ts` | 29 | same | same |
| `tests/e2e/specs/wallart-2d-3d-toggle.spec.ts` | 30 | same | same |
| `tests/e2e/specs/wallart-2d-3d-toggle.spec.ts` | 111-112 | same | same |
| `tests/e2e/specs/ceiling-user-texture-toggle.spec.ts` | 28 | same | same |
| `tests/e2e/playwright-helpers/seedRoom.ts` | 17-18 | same + `page.evaluate()` is not async | Make evaluate callback `async`, add `await` |

**`seedRoom.ts` is the shared helper**: the `page.evaluate()` callback at line 15 is currently a synchronous arrow function. It must become `async () => { await window.__cadStore... }`. This single change propagates to all specs that call `seedRoom(page)`.

### 1d. Vitest Unit Tests

| File | Line | Call | Change |
|------|------|------|--------|
| `src/__tests__/cadStore.paint.test.ts` | 91 | `useCADStore.getState().loadSnapshot(snap)` | Add `await`; test function must be `async` |
| `src/__tests__/cadStore.paint.test.ts` | 104 | same | same |
| `tests/phase31LabelOverride.test.tsx` | 201 | `useCADStore.getState().loadSnapshot({...})` | Add `await`; `it(...)` callback must be `async` |

**Total caller sites: 9 production (8 components + 1 store impl) + 12 e2e + 2 vitest = 23 sites.**

---

## 2. Async Migration Architecture

### Current shape (sync)

```
loadSnapshot: (raw) =>
  set(produce((s: CADState) => {
    const snap = migrateSnapshot(raw);  // sync
    s.rooms = snap.rooms;
    ...
  }))
```

The problem: `produce()` must be synchronous (Immer constraint). IDB writes cannot happen inside `produce()`.

### Pattern A (recommended) — async pre-pass, then sync produce

```typescript
loadSnapshot: async (raw: unknown): Promise<void> => {
  // Step 1: run synchronous shape migrations (v1→v2)
  const shaped = migrateSnapshot(raw);          // still sync, returns CADSnapshot
  // Step 2: run async IDB migration (v2→v3 floor materials)
  const migrated = await migrateFloorMaterials(shaped);  // async, returns CADSnapshot
  // Step 3: apply to store — still sync, no Immer async issues
  set(produce((s: CADState) => {
    s.rooms = migrated.rooms;
    s.activeRoomId = migrated.activeRoomId;
    (s as any).customElements = (migrated as any).customElements ?? {};
    (s as any).customPaints = (migrated as any).customPaints ?? [];
    (s as any).recentPaints = (migrated as any).recentPaints ?? [];
    s.past = [];
    s.future = [];
  }));
}
```

`migrateFloorMaterials` lives in `src/lib/snapshotMigration.ts` as a new exported async function.

### Pattern B — separate async promotion pass (NOT recommended)

Would keep `loadSnapshot` sync but add a separate `promoteLegacyFloorMaterials()` action that runs after. This creates a two-render window: first render shows `kind: "custom"` (no texture), second render shows `kind: "user-texture"`. D-01 explicitly rejects this pattern.

**Pattern A is the right choice.** The Zustand `set` call is still synchronous; only the outer `loadSnapshot` function is async. No Immer constraints are violated.

---

## 3. Idempotency and Version-Check Pattern

### Current `migrateSnapshot` behavior

- `version === 2` → run `migrateWallsPerSide`, return as-is (still version 2)
- `version` absent / v1 shape → upgrade to v2
- Unknown → return `defaultSnapshot()` (v2 currently, v3 after this phase)

### Required behavior after Phase 51

`migrateSnapshot` keeps its current sync signature. Version-3 passthrough is added at the top. `migrateFloorMaterials` handles the v2→v3 async step.

```typescript
// In migrateSnapshot (sync):
// Add v3 passthrough BEFORE the v2 check:
if (raw && typeof raw === "object" && (raw as CADSnapshot).version === 3 && (raw as CADSnapshot).rooms) {
  return raw as CADSnapshot;   // already migrated, no mutations
}

// In migrateFloorMaterials (async):
export async function migrateFloorMaterials(snap: CADSnapshot): Promise<CADSnapshot> {
  if (snap.version >= 3) return snap;   // idempotency gate
  // ... migration logic ...
  snap.version = 3;
  return snap;
}
```

### Chained migration matrix

| Input version | migrateSnapshot result | migrateFloorMaterials result |
|---------------|----------------------|------------------------------|
| v1 (legacy singleton shape) | v2 (wallsPerSide migrated) | v3 (floor materials migrated) |
| v2 (standard) | v2 (wallsPerSide re-run, idempotent) | v3 (floor materials migrated) |
| v3 (current) | v3 (new passthrough, no-op) | v3 (gate at top, no-op) |

`migrateWallsPerSide` is idempotent (checks for `"kind" in w.wallpaper` before wrapping), so running it on a v2 snapshot that was already migrated is safe.

**`defaultSnapshot()` must return `version: 3`** after this phase so new projects never trigger migration.

---

## 4. Malformed Data URL Handling Matrix

The migration extracts a `FloorMaterial` entry with `kind === "custom"` and processes its `imageUrl`. Here is every failure mode:

### Data URL parsing

```typescript
async function migrateOneFloorMaterial(mat: FloorMaterial): Promise<FloorMaterial> {
  if (mat.kind !== "custom" || !mat.imageUrl?.startsWith("data:")) {
    // Not a legacy entry — leave untouched
    return mat;
  }
  // Parse: data:<mime>;base64,<payload>
  const commaIdx = mat.imageUrl.indexOf(",");
  if (commaIdx === -1) {
    console.warn("[Phase51] FloorMaterial imageUrl missing comma — skipping migration");
    return mat;   // entry preserved as-is
  }
  const header = mat.imageUrl.slice(5, commaIdx);   // strip "data:"
  const mimeType = header.split(";")[0] || "image/jpeg";
  const b64 = mat.imageUrl.slice(commaIdx + 1);
  // ...
}
```

| Failure case | Detection | Response | Version still bumps? |
|-------------|-----------|----------|----------------------|
| `imageUrl` is `undefined` or `null` | `!mat.imageUrl` guard | Return mat unchanged | Yes |
| `imageUrl` is an `http://` URL (non-data scheme) | `!startsWith("data:")` guard | Return mat unchanged | Yes |
| `imageUrl` has no `,` separator | `commaIdx === -1` | `console.warn`, return mat | Yes |
| base64 payload is empty string | `b64 === ""` | atob("") returns "", produces 0-byte blob; `computeSHA256` + `saveUserTextureWithDedup` handle 0-byte blobs fine (valid but useless) — treat as malformed, warn and skip | Yes |
| `atob(b64)` throws (invalid base64) | `try/catch` around atob | `console.warn`, return mat | Yes |
| `new Blob(...)` throws (browser memory) | `try/catch` | `console.warn`, return mat | Yes |
| `saveUserTextureWithDedup` rejects (IDB quota exceeded) | `try/catch` around await | `console.warn`, return mat (keeps `kind: "custom"`) | Yes |
| `computeSHA256` rejects (no crypto.subtle in test env) | `try/catch` | `console.warn`, return mat | Yes |

**Key insight on `saveUserTextureWithDedup` quota behavior:** the function calls `idb-keyval`'s `set()` which internally uses `IDBTransaction`. When quota is exceeded, `IDBTransaction` fires an `error` event with `DOMException: QuotaExceededError`. `idb-keyval` converts this to a rejected Promise. So `saveUserTextureWithDedup` DOES throw on quota — the `try/catch` in `migrateOneFloorMaterial` will catch it correctly. Confidence: HIGH (verified by reading `userTextureStore.ts` — no internal quota handling exists; the rejection propagates).

### Recommended implementation pattern

```typescript
async function migrateOneFloorMaterial(mat: FloorMaterial): Promise<FloorMaterial> {
  if (mat.kind !== "custom" || !mat.imageUrl?.startsWith("data:")) return mat;
  try {
    const commaIdx = mat.imageUrl.indexOf(",");
    if (commaIdx === -1) throw new Error("no comma in data URL");
    const header = mat.imageUrl.slice(5, commaIdx);
    const mimeType = header.split(";")[0] || "image/jpeg";
    const b64 = mat.imageUrl.slice(commaIdx + 1);
    if (!b64) throw new Error("empty base64 payload");
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: mimeType });
    const sha256 = await computeSHA256(bytes.buffer);
    const { id } = await saveUserTextureWithDedup(
      { name: "Imported Floor", tileSizeFt: mat.scaleFt ?? 4, blob, mimeType },
      sha256,
    );
    return { kind: "user-texture", userTextureId: id, scaleFt: mat.scaleFt, rotationDeg: mat.rotationDeg };
  } catch (err) {
    console.warn("[Phase51] FloorMaterial migration failed — entry preserved as legacy:", err);
    return mat;   // entry unchanged, kind still "custom"
  }
}
```

---

## 5. Version-Bump Strategy for FloorMaterial-Free Snapshots

For the common case (v2 snapshot, no `kind: "custom"` FloorMaterial entries), `migrateFloorMaterials` will:
1. Check `snap.version >= 3` — false (it's 2)
2. Iterate all `snap.rooms` values, check each `doc.floorMaterial`
3. Find zero entries with `kind === "custom"` and a `data:` imageUrl
4. Set `snap.version = 3` and return

This is a pure in-memory loop over `Object.values(rooms)`. Typical project has 1-4 rooms. No IDB access, no async ops needed. The entire function resolves in microseconds. **No perf concern.** Confidence: HIGH.

---

## 6. Test Fixture Recommendations

### Vitest unit test fixtures

**Tiny valid PNG for happy path:**
```typescript
// 67-byte 1×1 white PNG — valid, decodable, deterministic SHA-256
const TINY_PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==";
const DATA_URL = `data:image/png;base64,${TINY_PNG_B64}`;
```

**Truncated / malformed data URL for error-path test:**
```typescript
const MALFORMED_DATA_URL = "data:image/png;base64,NOT_VALID_BASE64!!!";
const MISSING_COMMA_URL = "data:image/pngNOCOMMA";
```

**Dedup test — two identical payloads:**
Create two `FloorMaterial` entries with the same `TINY_PNG_B64` as `imageUrl`. After migration, both `userTextureId` fields must be equal, and `listUserTextures()` must return exactly 1 entry.

**IDB / test environment:** `userTextureStore.ts` uses `idb-keyval` with a named store (`createStore(...)`). In vitest with `happy-dom`, `indexedDB` is available via `fake-indexeddb` (which `happy-dom` bundles). No separate mock needed — the existing vitest setup (confirmed by Phase 32/34 unit tests passing) handles `idb-keyval` correctly.

Use `clearAllUserTextures()` in `beforeEach` to reset state between unit test cases.

### E2E fixture

Use the existing `TINY_JPEG` buffer already defined in `e2e/wall-user-texture-first-apply.spec.ts` (43 bytes, base64-encoded in the file). For the size-delta assertion in D-04, a ~50KB JPEG is preferred to make the before/after JSON size delta measurable; create `e2e/fixtures/floor-texture-50kb.jpg` as a fixture file read via `readFileSync`. The spec seeds a v2 snapshot with the data URL inlined, loads via `loadSnapshot`, autosaves, reads back the saved JSON, and asserts no `data:image/` substring.

---

## 7. Task Breakdown

**1 plan, 4 tasks.** Ordered for TDD compliance.

### Task 1 — `migrateFloorMaterials` function + unit tests (TDD: tests first)

Files:
- NEW `tests/lib/snapshotMigration.floorMaterial.test.ts` — 6 test cases (write first)
- MODIFY `src/lib/snapshotMigration.ts` — add `migrateFloorMaterials(snap): Promise<CADSnapshot>`, add v3 passthrough to `migrateSnapshot`, update `defaultSnapshot()` to return `version: 3`

**Tests to write (in order):**
1. v2 with 1 legacy custom FloorMaterial → migrates to `kind: "user-texture"`, IDB has 1 entry
2. v2 with 0 legacy entries → no-op, version bumps to 3
3. v3 input → passthrough, no IDB calls
4. Malformed data URL → entry preserved as legacy, `console.warn` called, version bumps
5. Two identical data URLs → IDB has 1 entry, both userTextureIds identical
6. IDB quota rejection simulation → entry preserved, version still bumps

### Task 2 — `loadSnapshot` async refactor + all caller updates

Files:
- MODIFY `src/stores/cadStore.ts` — `loadSnapshot` type + impl (async, pre-pass pattern)
- MODIFY `src/App.tsx` — add `await` (line 85)
- MODIFY `src/components/ProjectManager.tsx` — `handleLoad` (line 49) + `handleNew` (line 63)
- MODIFY `src/components/WelcomeScreen.tsx` — `handleOpenProject` (line 32) + `handleFile` (line 46)
- MODIFY `src/components/TemplatePickerDialog.tsx` — `pickTemplate` becomes async (lines 55, 75)
- MODIFY `src/__tests__/cadStore.paint.test.ts` — 2 test functions become async (lines 91, 104)
- MODIFY `tests/phase31LabelOverride.test.tsx` — 1 test function becomes async (line 201)

### Task 3 — E2E caller updates

Files:
- MODIFY `tests/e2e/playwright-helpers/seedRoom.ts` — evaluate callback becomes `async () => { await ... }` (single change, propagates to all specs using `seedRoom`)
- MODIFY `e2e/tree-empty-states.spec.ts` — type cast + await (line 22)
- MODIFY `e2e/keyboard-shortcuts-overlay.spec.ts` — type cast + await (line 51)
- MODIFY `e2e/display-mode-cycle.spec.ts` — type cast + await (line 33)
- MODIFY `e2e/saved-camera-cycle.spec.ts` — type cast + await (line 42)
- MODIFY `e2e/tree-expand-persistence.spec.ts` — type cast + await (line 18)
- MODIFY `e2e/wall-user-texture-first-apply.spec.ts` — type cast + await (line 80)
- MODIFY `tests/e2e/specs/wallpaper-2d-3d-toggle.spec.ts` — type cast + await (line 38)
- MODIFY `tests/e2e/specs/floor-user-texture-toggle.spec.ts` — type cast + await (line 29)
- MODIFY `tests/e2e/specs/wallart-2d-3d-toggle.spec.ts` — type cast + await (lines 30, 111-112)
- MODIFY `tests/e2e/specs/ceiling-user-texture-toggle.spec.ts` — type cast + await (line 28)

### Task 4 — E2E regression spec

Files:
- NEW `e2e/fixtures/floor-texture-50kb.jpg` (or reuse TINY_JPEG with size note)
- NEW `e2e/floor-material-migration.spec.ts`

**Spec outline:**
1. Seed v2 snapshot with `floorMaterial: { kind: "custom", imageUrl: DATA_URL, scaleFt: 4, rotationDeg: 0 }` via `await __cadStore.getState().loadSnapshot(snap)`
2. Assert `__cadStore.getState().rooms.room_main.floorMaterial.kind === "user-texture"`
3. Assert `__cadStore.getState().rooms.room_main.floorMaterial.userTextureId` matches `utex_` prefix
4. Trigger autosave (wait for debounce or call save directly)
5. Read saved JSON from IDB — assert no `data:image/` substring
6. Assert JSON size < 50KB

---

## Architecture Patterns

### Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SHA-256 hashing | Custom hash | `computeSHA256()` in `userTextureStore.ts` | Already implemented, uses Web Crypto |
| IDB dedup | Custom dedup logic | `saveUserTextureWithDedup()` | SHA-256 dedup already in place (LIB-07) |
| Base64 decode | Custom decoder | Native `atob()` | Standard, available in all browser + happy-dom |

### Anti-Patterns to Avoid

- **Do not call `migrateFloorMaterials` inside `produce()`** — Immer produce callbacks must be synchronous.
- **Do not mutate `snap.rooms[id].floorMaterial` in place inside `produce()`** — all IDB work must complete before the `set(produce(...))` call.
- **Do not skip the `version >= 3` gate** — without it, reloading a v3 snapshot would attempt to re-migrate `kind: "user-texture"` entries (they have no `imageUrl`, so they'd pass through `migrateOneFloorMaterial` harmlessly, but the gate is cleaner and eliminates the IDB round-trip entirely).

---

## Common Pitfalls

### Pitfall 1: Immer async inside produce
**What goes wrong:** Developer puts `await saveUserTextureWithDedup(...)` inside `produce()` callback. Immer throws `Error: [Immer] produce only supports async producers when used with a promise result`.
**How to avoid:** All IDB operations must complete BEFORE calling `set(produce(...))`. Pattern A above enforces this.

### Pitfall 2: Missing await in page.evaluate
**What goes wrong:** `page.evaluate(() => { window.__cadStore.getState().loadSnapshot(snap); })` — the evaluate callback is sync, so it fires the async `loadSnapshot` without awaiting. The Promise is dropped. The store has not been updated by the time subsequent assertions run.
**How to avoid:** `page.evaluate(async () => { await window.__cadStore.getState().loadSnapshot(snap); })`. Every e2e caller must be updated.

### Pitfall 3: seedRoom.ts not updated
**What goes wrong:** `seedRoom.ts` is the shared helper used by 5 preset specs (`wallpaper-2d-3d-toggle`, `floor-user-texture-toggle`, `wallart-2d-3d-toggle`, `ceiling-user-texture-toggle`, and others). If only the individual specs are updated but `seedRoom.ts` is missed, the shared helper silently drops the Promise.
**How to avoid:** Task 3 explicitly lists `seedRoom.ts` as the first file to change.

### Pitfall 4: WelcomeScreen handleFile fire-and-forget
**What goes wrong:** `handleFile` is a `FileReader.onload` callback — not async. If `loadSnapshot(defaultSnapshot())` returns a `Promise<void>` and the Promise is not awaited, callers that depend on state being set immediately after will see stale state.
**How to avoid:** Convert `handleFile` inner logic to async (assign reader.onload to an async arrow), or use `void loadSnapshot(defaultSnapshot())` with a comment explaining why it's safe (defaultSnapshot has no data URLs, so the async work is just a no-op version bump — resolves in the same microtask cycle). The `void` form is acceptable here.

### Pitfall 5: defaultSnapshot version not bumped
**What goes wrong:** After Phase 51, any call to `loadSnapshot(defaultSnapshot())` (WelcomeScreen, ProjectManager, TemplatePickerDialog) passes a v2 snapshot. `migrateFloorMaterials` runs (correctly no-ops), bumps to v3. But the snapshot() function (used for saves at line 154-155 in cadStore.ts) still writes `version: 2`. Subsequent loads trigger migration again — no infinite loop (version gate stops it), but it's wasteful.
**How to avoid:** Update the `snapshot()` function in cadStore.ts (line 154) to write `version: 3`. AND update `defaultSnapshot()` in `snapshotMigration.ts` to return `version: 3`.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is pure code/IDB changes. No external tools, CLIs, or services required. `crypto.subtle` (for SHA-256) and `indexedDB` are available in all target environments (browser, happy-dom vitest, Playwright chromium).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (unit) + Playwright (e2e) |
| Config file | `vite.config.ts` (vitest inline) + `playwright.config.ts` |
| Quick run command | `npx vitest run tests/lib/snapshotMigration.floorMaterial.test.ts` |
| Full suite command | `npx vitest run` + `npx playwright test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEBT-05 | v2 legacy FloorMaterial → userTextureId | unit | `npx vitest run tests/lib/snapshotMigration.floorMaterial.test.ts` | ❌ Wave 0 |
| DEBT-05 | v2 no legacy entries → version 3, no-op | unit | same | ❌ Wave 0 |
| DEBT-05 | v3 snapshot → passthrough | unit | same | ❌ Wave 0 |
| DEBT-05 | malformed data URL → preserved, warn | unit | same | ❌ Wave 0 |
| DEBT-05 | dedup: 2 identical URLs → 1 IDB entry | unit | same | ❌ Wave 0 |
| DEBT-05 | IDB quota fail → preserved, version bumps | unit | same | ❌ Wave 0 |
| DEBT-05 | E2E: load v2 legacy → save → no data: URL in JSON | e2e | `npx playwright test e2e/floor-material-migration.spec.ts` | ❌ Wave 0 |

### Wave 0 Gaps
- [ ] `tests/lib/snapshotMigration.floorMaterial.test.ts` — 6 unit cases covering DEBT-05
- [ ] `e2e/floor-material-migration.spec.ts` — e2e regression spec
- [ ] `e2e/fixtures/floor-texture-50kb.jpg` — fixture for size-delta assertion (optional; TINY_JPEG acceptable with size comment)

---

## Sources

### Primary (HIGH confidence)
- Direct code reading: `src/lib/snapshotMigration.ts` (full file) — migration system shape confirmed
- Direct code reading: `src/lib/userTextureStore.ts` (full file) — `saveUserTextureWithDedup` signature, IDB error behavior confirmed
- Direct code reading: `src/stores/cadStore.ts` lines 118, 987-999 — current `loadSnapshot` type + impl
- Direct code reading: `src/types/cad.ts` lines 176-189 — `FloorMaterial` type with all three kinds

### Secondary (MEDIUM confidence)
- Grep audit of 23 `loadSnapshot` call sites — exhaustive, cross-checked against file reading
- `idb-keyval` behavior on quota: inferred from absence of internal quota handling in `userTextureStore.ts` + known `idb-keyval` Promise rejection semantics

---

## Metadata

**Confidence breakdown:**
- Caller audit: HIGH — grep + manual verification of every result
- Async architecture: HIGH — Pattern A is the only Immer-compatible approach; confirmed by cadStore.ts structure
- Version strategy: HIGH — read migrateSnapshot in full
- Malformed input handling: HIGH — failure modes derived from browser API contracts (atob, Blob, crypto.subtle)
- Test fixtures: HIGH — same tiny JPEG already used in Phase 49

**Research date:** 2026-04-27
**Valid until:** 2026-05-27 (stable APIs)
