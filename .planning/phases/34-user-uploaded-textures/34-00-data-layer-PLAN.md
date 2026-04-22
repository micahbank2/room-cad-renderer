---
phase: 34-user-uploaded-textures
plan: 00
type: execute
wave: 1
depends_on: []
files_modified:
  - src/types/userTexture.ts
  - src/types/cad.ts
  - src/lib/userTextureStore.ts
  - src/lib/countTextureRefs.ts
  - src/hooks/useUserTextures.ts
  - tests/userTextureStore.test.ts
  - tests/countTextureRefs.test.ts
autonomous: true
requirements: [LIB-06, LIB-07, LIB-08]
gap_closure: false

must_haves:
  truths:
    - "A UserTexture can be saved to IDB and retrieved after a simulated reload (fresh idb-keyval store instance)"
    - "Uploading bytes with identical SHA-256 twice returns the same texture id (dedup)"
    - "listUserTextures() returns textures sorted most-recent-first"
    - "CADSnapshot type accepts userTextureId references on Wallpaper, FloorMaterial, and Ceiling without breaking existing projects"
    - "countTextureRefs walks all rooms and returns integer count across wall wallpaper A/B, floor kind=user-texture, ceilings"
  artifacts:
    - path: "src/types/userTexture.ts"
      provides: "UserTexture interface + USER_TEXTURE_ID_PREFIX constant"
      contains: "interface UserTexture"
    - path: "src/lib/userTextureStore.ts"
      provides: "createStore-based named IDB keyspace + save/load/del/list + SHA-256 dedup"
      contains: "createStore(\"room-cad-user-textures\", \"textures\")"
    - path: "src/lib/countTextureRefs.ts"
      provides: "countTextureRefs(snapshot, textureId) utility"
      exports: ["countTextureRefs"]
    - path: "src/hooks/useUserTextures.ts"
      provides: "React hook returning { textures, loading, save, update, remove }"
      contains: "export function useUserTextures"
    - path: "src/types/cad.ts"
      provides: "Extended Wallpaper/FloorMaterial/Ceiling types with userTextureId"
      contains: "userTextureId"
  key_links:
    - from: "src/lib/userTextureStore.ts"
      to: "idb-keyval createStore API"
      via: "named database 'room-cad-user-textures' / store 'textures'"
      pattern: "createStore\\(\"room-cad-user-textures\""
    - from: "src/lib/userTextureStore.ts"
      to: "Web Crypto SHA-256"
      via: "crypto.subtle.digest('SHA-256', bytes)"
      pattern: "crypto\\.subtle\\.digest\\(\"SHA-256\""
    - from: "src/hooks/useUserTextures.ts"
      to: "src/lib/userTextureStore.ts"
      via: "listUserTextures / saveUserTexture / deleteUserTexture"
      pattern: "from [\"']@/lib/userTextureStore[\"']"
---

<objective>
Establish the data foundation for user-uploaded textures: a separate `room-cad-user-textures` IndexedDB keyspace (via `idb-keyval.createStore`), the `UserTexture` type, SHA-256 dedup at write time, a `useUserTextures` React hook, a `countTextureRefs` utility, and the type extensions to `Wallpaper`, `FloorMaterial`, and `Ceiling` that allow surfaces to reference a texture by `userTextureId` (string) instead of embedding Blobs.

Purpose: LIB-08 requires CADSnapshot JSON to carry zero data-URL bloat. All binary data must live in IDB, keyed by string ids. This plan produces the persistence layer and the reference schema. No UI, no 3D rendering — pure data plumbing so Plans 01 / 02 / 03 can build against a stable contract.

Output: 7 files (5 new + 2 modified) totaling one self-contained data layer that the upload modal (Plan 01), picker integration (Plan 02), and 3D render path (Plan 03) consume without coordination overhead.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/34-user-uploaded-textures/34-CONTEXT.md
@.planning/phases/34-user-uploaded-textures/34-RESEARCH.md

# Source-of-truth files the executor MUST read before coding
@src/lib/serialization.ts
@src/types/cad.ts

<interfaces>
<!-- Current idb-keyval usage pattern in serialization.ts (DEFAULT store, do not disturb): -->
```typescript
import { get, set, del, keys } from "idb-keyval";
const PROJECT_KEY_PREFIX = "room-cad-project-";
const LAST_PROJECT_POINTER = "room-cad-last-project";
// All project state reads/writes use default unnamed store.
```

<!-- Research-confirmed UserTexture shape (RESEARCH.md §B): -->
```typescript
export interface UserTexture {
  id: string;          // "utex_" + uid()
  sha256: string;      // lowercase hex SHA-256 of the downscaled JPEG bytes
  name: string;        // user-given name, <=40 chars
  tileSizeFt: number;  // decimal feet (from validateInput), must be > 0
  blob: Blob;          // downscaled JPEG blob
  mimeType: string;    // "image/jpeg" (always JPEG after downscale)
  createdAt: number;   // Date.now()
}
```

<!-- Required CADSnapshot type deltas (RESEARCH.md §E): -->
```typescript
// In Wallpaper (per-side wall treatment):
interface Wallpaper {
  imageUrl?: string;          // legacy data-URL path — keep for backward compat
  userTextureId?: string;     // NEW — references userTextureStore
  scaleFt: number;
  rotationDeg: number;
  // ... existing fields unchanged
}

// In FloorMaterial — add new kind:
interface FloorMaterial {
  kind: "preset" | "custom" | "user-texture";  // NEW union member
  presetId?: string;
  imageUrl?: string;          // legacy for kind=custom
  userTextureId?: string;     // NEW — required when kind === "user-texture"
  scaleFt: number;
  rotationDeg: number;
}

// In Ceiling — add optional field:
interface Ceiling {
  userTextureId?: string;     // NEW — takes priority over surfaceMaterialId at render
  surfaceMaterialId?: string;
  // ... existing fields unchanged
}
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: UserTexture type + CADSnapshot schema extensions</name>
  <files>src/types/userTexture.ts, src/types/cad.ts, tests/userTextureSchema.test.ts</files>
  <read_first>
    - src/types/cad.ts (read ENTIRELY — find Wallpaper, FloorMaterial, Ceiling interface declarations)
    - .planning/phases/34-user-uploaded-textures/34-RESEARCH.md §E (snapshot serialization)
    - src/lib/geometry.ts (to confirm uid() signature — used for id prefix)
  </read_first>
  <behavior>
    - UserTexture interface exists with exact 7 fields (id, sha256, name, tileSizeFt, blob, mimeType, createdAt)
    - USER_TEXTURE_ID_PREFIX exported equal to "utex_"
    - Wallpaper interface in cad.ts has optional `userTextureId?: string` alongside existing `imageUrl`
    - FloorMaterial `kind` union includes "user-texture" literal
    - Ceiling interface has optional `userTextureId?: string`
    - Existing projects (no userTextureId fields anywhere) still satisfy the types — no required fields added
  </behavior>
  <action>
    Create `src/types/userTexture.ts` exporting:
    ```typescript
    export const USER_TEXTURE_ID_PREFIX = "utex_";
    export interface UserTexture {
      id: string;
      sha256: string;      // lowercase hex
      name: string;        // <=40 chars
      tileSizeFt: number;  // >0, decimal feet from validateInput
      blob: Blob;
      mimeType: string;    // "image/jpeg" after downscale
      createdAt: number;   // Date.now()
    }
    ```

    Then modify `src/types/cad.ts`:
    1. On the `Wallpaper` interface (per side A/B wall treatment), add `userTextureId?: string;` — do NOT remove `imageUrl` (legacy backward-compat).
    2. On the `FloorMaterial` interface, widen the `kind` union to `"preset" | "custom" | "user-texture"` and add `userTextureId?: string;`.
    3. On the `Ceiling` interface, add `userTextureId?: string;`.
    4. Do NOT touch `migrateSnapshot` — per RESEARCH.md §E, missing fields default to `undefined` which maps to existing behavior. Forward-compatible by construction.

    Write a minimal schema test at `tests/userTextureSchema.test.ts` that:
    - imports the three modified types
    - asserts that `kind: "user-texture"` compiles on FloorMaterial (type-level assertion via `const _: FloorMaterial = { kind: "user-texture", userTextureId: "x", scaleFt: 1, rotationDeg: 0 }`)
    - asserts `USER_TEXTURE_ID_PREFIX === "utex_"` at runtime
  </action>
  <verify>
    <automated>npx vitest run tests/userTextureSchema.test.ts && grep -q "USER_TEXTURE_ID_PREFIX = \"utex_\"" src/types/userTexture.ts && grep -q "\"user-texture\"" src/types/cad.ts && grep -q "userTextureId" src/types/cad.ts</automated>
  </verify>
  <acceptance_criteria>
    - [ ] `src/types/userTexture.ts` exists and exports `UserTexture` interface + `USER_TEXTURE_ID_PREFIX` constant
    - [ ] `grep -q "interface UserTexture" src/types/userTexture.ts` succeeds
    - [ ] `grep -qE "kind: \"preset\" \\| \"custom\" \\| \"user-texture\"" src/types/cad.ts` succeeds (union widened)
    - [ ] `grep -c "userTextureId" src/types/cad.ts` >= 3 (Wallpaper + FloorMaterial + Ceiling)
    - [ ] `npx vitest run tests/userTextureSchema.test.ts` passes (>=2 assertions green)
    - [ ] `npx tsc --noEmit` produces zero new errors in cad.ts or userTexture.ts
  </acceptance_criteria>
  <done>
    Type-level contract for user textures lands; any plan can now reference `UserTexture` and `userTextureId` fields without compilation error. Zero runtime behavior change for existing projects.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: userTextureStore IDB keyspace + SHA-256 dedup + listing sort</name>
  <files>src/lib/userTextureStore.ts, tests/userTextureStore.test.ts</files>
  <read_first>
    - src/lib/serialization.ts (read ENTIRELY — confirm idb-keyval import style, default-store usage, key prefix pattern)
    - src/types/userTexture.ts (created in Task 1)
    - .planning/phases/34-user-uploaded-textures/34-RESEARCH.md §B (IDB keyspace design — the canonical design spec)
    - node_modules/idb-keyval/dist/index.d.ts OR the package README to confirm `createStore`, `values` signatures
  </read_first>
  <behavior>
    - Test: `saveUserTexture` writes to the `room-cad-user-textures` named store (NOT the default store) — assert by reading via `createStore("room-cad-user-textures", "textures")` directly
    - Test: `getUserTexture(id)` returns the saved UserTexture; returns `undefined` for unknown ids
    - Test: `deleteUserTexture(id)` removes the entry; subsequent `getUserTexture(id)` returns `undefined`
    - Test: `listUserTextures()` returns entries sorted by `createdAt DESC` (most recent first per D-06)
    - Test: `findTextureBySha256(hex)` returns existing UserTexture when hash matches, undefined when not
    - Test: `saveUserTextureWithDedup(partial, sha256, blob)` — if sha256 matches existing entry, returns existing id WITHOUT writing a new row; if no match, creates new entry with a fresh `utex_*` id
    - Test: `computeSHA256(bytes)` returns the lowercase hex digest of the input ArrayBuffer
    - Test: writing to `userTextureIdbStore` does NOT add keys to the default idb-keyval store (isolation check — stub `keys()` from default store and assert empty delta)
  </behavior>
  <action>
    Create `src/lib/userTextureStore.ts` with the EXACT structure from RESEARCH.md §B:

    ```typescript
    import { createStore, get, set, del, values } from "idb-keyval";
    import { uid } from "./geometry";
    import type { UserTexture } from "@/types/userTexture";
    import { USER_TEXTURE_ID_PREFIX } from "@/types/userTexture";

    export const userTextureIdbStore = createStore("room-cad-user-textures", "textures");

    export async function computeSHA256(bytes: ArrayBuffer): Promise<string> {
      const hashBuf = await crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(hashBuf))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
    }

    export async function saveUserTexture(tex: UserTexture): Promise<void> {
      await set(tex.id, tex, userTextureIdbStore);
    }

    export async function getUserTexture(id: string): Promise<UserTexture | undefined> {
      return get<UserTexture>(id, userTextureIdbStore);
    }

    export async function deleteUserTexture(id: string): Promise<void> {
      await del(id, userTextureIdbStore);
    }

    export async function listUserTextures(): Promise<UserTexture[]> {
      const all = (await values(userTextureIdbStore)) as UserTexture[];
      return all.sort((a, b) => b.createdAt - a.createdAt);
    }

    export async function findTextureBySha256(sha256: string): Promise<UserTexture | undefined> {
      const all = await listUserTextures();
      return all.find(t => t.sha256 === sha256);
    }

    export interface SaveTextureInput {
      name: string;
      tileSizeFt: number;
      blob: Blob;
      mimeType: string;
    }

    export async function saveUserTextureWithDedup(
      input: SaveTextureInput,
      sha256: string,
    ): Promise<{ id: string; deduped: boolean }> {
      const existing = await findTextureBySha256(sha256);
      if (existing) return { id: existing.id, deduped: true };
      const id = `${USER_TEXTURE_ID_PREFIX}${uid()}`;
      const tex: UserTexture = {
        id,
        sha256,
        name: input.name,
        tileSizeFt: input.tileSizeFt,
        blob: input.blob,
        mimeType: input.mimeType,
        createdAt: Date.now(),
      };
      await saveUserTexture(tex);
      return { id, deduped: false };
    }
    ```

    Write `tests/userTextureStore.test.ts` covering all eight behaviors above. Use `fake-indexeddb/auto` (already in devDeps if present — if not, use `vi.stubGlobal('indexedDB', ...)`). Each test should:
    - Reset the named store with `clear(userTextureIdbStore)` in beforeEach
    - Construct a real `Blob` via `new Blob([bytes], { type: "image/jpeg" })`
    - Verify isolation: after saving to userTextureIdbStore, `await keys()` against default store (imported from idb-keyval at top level) remains unchanged

    Export `clearAllUserTextures(): Promise<void>` helper for tests (uses `clear(userTextureIdbStore)`).
  </action>
  <verify>
    <automated>npx vitest run tests/userTextureStore.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - [ ] `grep -q "createStore(\"room-cad-user-textures\", \"textures\")" src/lib/userTextureStore.ts` succeeds
    - [ ] `grep -q "crypto.subtle.digest(\"SHA-256\"" src/lib/userTextureStore.ts` succeeds
    - [ ] `grep -q "saveUserTextureWithDedup" src/lib/userTextureStore.ts` succeeds
    - [ ] `grep -q "sort((a, b) => b.createdAt - a.createdAt)" src/lib/userTextureStore.ts` succeeds (most-recent-first sort, D-06)
    - [ ] `npx vitest run tests/userTextureStore.test.ts` passes with >= 8 test cases green
    - [ ] Isolation test proves default idb-keyval store keys are untouched after a save to `userTextureIdbStore`
    - [ ] Dedup test: same SHA-256 hex for two `saveUserTextureWithDedup` calls → second returns `{ deduped: true }` with first's id
    - [ ] `grep -qE "saveUserTexture|getUserTexture|deleteUserTexture|listUserTextures|findTextureBySha256|computeSHA256" src/lib/userTextureStore.ts` shows all 6 export names
  </acceptance_criteria>
  <done>
    `userTextureStore.ts` provides the isolated IDB data plane. SHA-256 dedup matches LIB-07 contract. Most-recent-first sort matches D-06. Default store untouched — no regressions to `saveProject` / `loadProject`.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: countTextureRefs utility + useUserTextures hook</name>
  <files>src/lib/countTextureRefs.ts, src/hooks/useUserTextures.ts, tests/countTextureRefs.test.ts, tests/useUserTextures.test.tsx</files>
  <read_first>
    - src/types/cad.ts (updated in Task 1 — confirm Wallpaper/FloorMaterial/Ceiling shape AFTER your changes)
    - src/lib/userTextureStore.ts (Task 2)
    - .planning/phases/34-user-uploaded-textures/34-RESEARCH.md §G (ref-count) and §D (hook shape)
    - src/stores/cadStore.ts (read to confirm `useCADStore.getState()` shape and the RoomDoc -> walls/ceilings layout)
    - Existing `useProductStore` or equivalent hook — find via `grep -l "useProduct" src/hooks/` — reference shape for loading pattern
  </read_first>
  <behavior>
    - `countTextureRefs(snapshot, textureId)` scans all rooms' walls (both sides A/B wallpaper.userTextureId), floorMaterial (kind === "user-texture" && userTextureId match), and ceilings (userTextureId match). Returns integer.
    - Returns 0 for textures with no references
    - Returns correct count with 1-room / 3-room / mixed surface-type scenarios (unit tests drive this)
    - `useUserTextures()` hook returns `{ textures: UserTexture[], loading: boolean, save(input, sha256), update(id, changes), remove(id) }`
    - On mount, hook calls `listUserTextures()`, sets `textures` state, sets loading false
    - `save` calls `saveUserTextureWithDedup`, triggers re-list, returns the id
    - `remove` calls `deleteUserTexture`, triggers re-list
    - `update` mutates existing texture via `set(id, { ...existing, ...changes }, userTextureIdbStore)`, re-lists
  </behavior>
  <action>
    Create `src/lib/countTextureRefs.ts` (per RESEARCH.md §G, exact implementation):

    ```typescript
    import type { CADSnapshot } from "@/types/cad";

    export function countTextureRefs(snapshot: CADSnapshot, textureId: string): number {
      let count = 0;
      for (const room of Object.values(snapshot.rooms)) {
        for (const wall of Object.values(room.walls ?? {})) {
          if (wall.wallpaper?.A?.userTextureId === textureId) count++;
          if (wall.wallpaper?.B?.userTextureId === textureId) count++;
        }
        const fm = room.floorMaterial;
        if (fm?.kind === "user-texture" && fm.userTextureId === textureId) count++;
        for (const ceiling of Object.values(room.ceilings ?? {})) {
          if (ceiling.userTextureId === textureId) count++;
        }
      }
      return count;
    }
    ```

    Create `src/hooks/useUserTextures.ts`:

    ```typescript
    import { useCallback, useEffect, useState } from "react";
    import { set } from "idb-keyval";
    import type { UserTexture } from "@/types/userTexture";
    import {
      listUserTextures,
      saveUserTextureWithDedup,
      deleteUserTexture,
      userTextureIdbStore,
      getUserTexture,
      type SaveTextureInput,
    } from "@/lib/userTextureStore";

    export interface UseUserTexturesResult {
      textures: UserTexture[];
      loading: boolean;
      save: (input: SaveTextureInput, sha256: string) => Promise<string>;
      update: (id: string, changes: Partial<Pick<UserTexture, "name" | "tileSizeFt">>) => Promise<void>;
      remove: (id: string) => Promise<void>;
      reload: () => Promise<void>;
    }

    export function useUserTextures(): UseUserTexturesResult {
      const [textures, setTextures] = useState<UserTexture[]>([]);
      const [loading, setLoading] = useState(true);

      const reload = useCallback(async () => {
        const list = await listUserTextures();
        setTextures(list);
      }, []);

      useEffect(() => {
        let cancelled = false;
        (async () => {
          const list = await listUserTextures();
          if (!cancelled) {
            setTextures(list);
            setLoading(false);
          }
        })();
        return () => { cancelled = true; };
      }, []);

      const save = useCallback(async (input: SaveTextureInput, sha256: string) => {
        const { id } = await saveUserTextureWithDedup(input, sha256);
        await reload();
        return id;
      }, [reload]);

      const update = useCallback(async (id: string, changes: Partial<Pick<UserTexture, "name" | "tileSizeFt">>) => {
        const existing = await getUserTexture(id);
        if (!existing) return;
        await set(id, { ...existing, ...changes }, userTextureIdbStore);
        await reload();
      }, [reload]);

      const remove = useCallback(async (id: string) => {
        await deleteUserTexture(id);
        await reload();
      }, [reload]);

      return { textures, loading, save, update, remove, reload };
    }

    // Test driver (gated by test mode — Phase 29/30/31 pattern)
    if (typeof window !== "undefined" && import.meta.env.MODE === "test") {
      (window as any).__getUserTextures = () => listUserTextures();
    }
    ```

    Write `tests/countTextureRefs.test.ts` with >= 5 cases:
    1. Empty snapshot → 0
    2. Single wall side-A with matching userTextureId → 1
    3. Wall with BOTH sides using same id → 2
    4. Floor with kind=user-texture matching → 1
    5. Multi-room snapshot with 3 ceilings + 1 floor + 2 walls all sharing id → correct sum (6)
    6. Mismatched id (different texture in surfaces) → 0

    Write `tests/useUserTextures.test.tsx` using React Testing Library `renderHook` with >= 4 cases:
    1. Initial mount → `loading: true` then `loading: false`, `textures: []`
    2. After save → `textures.length === 1`, returned id starts with `utex_`
    3. After remove → `textures.length === 0`
    4. After update (change name) → subsequent list shows new name
  </action>
  <verify>
    <automated>npx vitest run tests/countTextureRefs.test.ts tests/useUserTextures.test.tsx</automated>
  </verify>
  <acceptance_criteria>
    - [ ] `grep -q "export function countTextureRefs" src/lib/countTextureRefs.ts` succeeds
    - [ ] `grep -q "wall.wallpaper?.A?.userTextureId" src/lib/countTextureRefs.ts` AND `grep -q "wall.wallpaper?.B?.userTextureId" src/lib/countTextureRefs.ts` succeed (both sides counted)
    - [ ] `grep -q "fm?.kind === \"user-texture\"" src/lib/countTextureRefs.ts` succeeds
    - [ ] `grep -q "ceiling.userTextureId === textureId" src/lib/countTextureRefs.ts` succeeds
    - [ ] `grep -q "export function useUserTextures" src/hooks/useUserTextures.ts` succeeds
    - [ ] `grep -q "__getUserTextures" src/hooks/useUserTextures.ts` AND `grep -q "import.meta.env.MODE === \"test\"" src/hooks/useUserTextures.ts` succeed (test driver gated)
    - [ ] `npx vitest run tests/countTextureRefs.test.ts` passes with >= 6 tests green
    - [ ] `npx vitest run tests/useUserTextures.test.tsx` passes with >= 4 tests green
    - [ ] Full suite baseline unchanged: `npx vitest run` passes
  </acceptance_criteria>
  <done>
    Data layer complete. Plans 01 / 02 / 03 can import `useUserTextures` to drive UI, `countTextureRefs` to power the delete-dialog copy, and the type extensions to persist surface references.
  </done>
</task>

</tasks>

<verification>
Phase-level gate for this plan:

1. `npx vitest run tests/userTextureSchema.test.ts tests/userTextureStore.test.ts tests/countTextureRefs.test.ts tests/useUserTextures.test.tsx` — all four test files green
2. `npx vitest run` — full suite remains green (no regressions to existing 50+ test files)
3. `grep -rn "data:image" src/types/cad.ts` returns zero matches (CADSnapshot does not embed data URLs)
4. `npx tsc --noEmit` — no new TypeScript errors
5. Isolation: `listProjects()` (from src/lib/serialization.ts) returns the same result before and after writing to `userTextureIdbStore` (manually verified, or asserted in one of the store tests)
</verification>

<success_criteria>
- UserTexture type, userTextureStore IDB keyspace, countTextureRefs utility, and useUserTextures hook all land
- SHA-256 dedup verified by unit test (same bytes → same id, no duplicate row)
- D-06 most-recent-first sort verified by unit test
- LIB-08 schema foundation in place: Wallpaper/FloorMaterial/Ceiling types accept `userTextureId` references, no Blob fields added to CADSnapshot
- Zero regressions to existing serialization.ts / project save-load path
- `window.__getUserTextures` test driver registered in test mode only
</success_criteria>

<output>
After completion, create `.planning/phases/34-user-uploaded-textures/34-00-data-layer-SUMMARY.md` documenting:
- Named IDB store coordinates (`room-cad-user-textures` / `textures`)
- Exact export surface of userTextureStore.ts
- countTextureRefs scan coverage (which CADSnapshot locations it walks)
- Dedup behavior semantics (SHA-256 hex match → return existing id, no overwrite)
- Any deviation from RESEARCH.md §B/§D/§G (expected: none)
</output>
