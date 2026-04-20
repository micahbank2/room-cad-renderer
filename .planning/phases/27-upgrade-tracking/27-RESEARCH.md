# Phase 27: Upgrade Tracking - Research

**Researched:** 2026-04-20
**Domain:** Dependency upgrade planning (R3F v9 / drei v10 / React 19)
**Confidence:** HIGH on current versions and upstream status; MEDIUM on drei v10 specific breaking changes (release notes are sparse)

## Summary

Phase 27 is a **documentation-only** phase. Output is (1) a new `## R3F v9 / React 19 Upgrade` section in `.planning/codebase/CONCERNS.md` and (2) a comment on GitHub issue #56 linking to it. Zero code or `package.json` changes.

As of 2026-04-20 the upgrade path is **clearer than when issue #56 was filed** — R3F v9 is stable (latest 9.6.0), drei v10 is stable (latest 10.7.7), and React 19 is GA (19.2.x). The original blocker (R3F v8 hook errors with React 19) is resolved by R3F v9. The upgrade is now a straightforward sequence, still correctly ordered as **R3F v9 → drei v10 → React 19**, because drei v10 requires R3F v9 as a peer, and the safest migration pattern is to lift the R3F/drei pair before the React core bump.

**Primary recommendation:** Documentation should cite R3F v9.6.0, drei v10.7.7, React 19.2.x as target versions, point at the official R3F v9 migration guide as the canonical source for breaking changes, and keep issue #56 OPEN with an updated plan (execution is still deferred — no code yet).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01** Documentation depth is moderate: current pinned versions, known blockers, upgrade sequence (R3F v9 → drei v10 → React 19), acceptance criteria.
- **D-02** Specify concrete pinned target versions (`@react-three/fiber@^9.0.0`, `@react-three/drei@^10.0.0`, `react@^19.0.0`, `react-dom@^19.0.0`).
- **D-03** Light external research with 1–2 authoritative links cited.
- **D-04** Add a new dedicated `## R3F v9 / React 19 Upgrade` section to `.planning/codebase/CONCERNS.md` **below** the existing Tech Debt bullets. Rewrite the existing "React 18 downgrade" bullet in Tech Debt as a pointer ("see § R3F v9 / React 19 Upgrade below").
- **D-05** Add a **comment** to GitHub issue #56 linking to the new section. Do **not** rewrite the issue body. Issue stays OPEN.
- **D-06** No milestone / label / assignee changes on #56.
- **D-07** Zero `package.json` changes. Verification must assert `git diff package.json` is empty at phase close.
- **D-08** Only two files touched: `.planning/codebase/CONCERNS.md` and GitHub issue #56. No `src/` changes.

### Claude's Discretion
- Exact prose of the new CONCERNS.md section
- Specific headings / subsection breakdown within the new section (required coverage: current versions, blockers, sequence, acceptance)
- Which 1–2 external links to cite
- Format of the issue #56 comment

### Deferred Ideas (OUT OF SCOPE)
- Actually executing the upgrade — future phase after R3F v9 stabilizes (now stable, but execution still deferred this phase)
- Test matrix / rollback runbook
- Breaking-changes table
- Other dependency upgrades (Vite, Tailwind, Zustand)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TRACK-01 | R3F v9 / React 19 upgrade path documented and tracked via GH #56 | Sections 1–7 below give the planner everything needed: current pinned versions, release status of each target, breaking changes to cite, affected files in `src/three/`, upgrade ordering rationale, and peer-dep confirmation. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Root CLAUDE.md mandates GSD workflow for any repo edits — this phase executes via `/gsd:execute-phase`, so that is satisfied.
- Project CLAUDE.md describes R3F as **lazy-loaded** (`React.lazy()`) and lists current usage limited to `src/three/`. Upgrade impact is scoped to that folder for source-code purposes, but Phase 27 is explicitly not touching source.
- Global rule: any `git push` on a non-main branch requires an open PR. Planner must include a PR step after any push.

## 1. Current State

### Pinned versions (`package.json`, verified 2026-04-20)

| Package | Current range | Target (documentation) |
|---------|---------------|------------------------|
| `react` | `^18.3.1` | `^19.0.0` |
| `react-dom` | `^18.3.1` | `^19.0.0` |
| `@types/react` | `^18.3.18` | `^19.0.0` |
| `@types/react-dom` | `^18.3.5` | `^19.0.0` |
| `@react-three/fiber` | `^8.17.14` | `^9.0.0` |
| `@react-three/drei` | `^9.122.0` | `^10.0.0` |
| `three` | `^0.183.2` | unchanged (three is R3F/drei agnostic) |
| `@types/three` | `^0.183.1` | unchanged |

Note the CONTEXT.md line cites `react-dom@^18.3.5` — `package.json` actually shows `^18.3.1`. Planner should use the verified value.

### Files that import from `@react-three/fiber` or `@react-three/drei`

Only two files directly import these packages (confirmed via grep on `src/three/`):

1. `src/three/ThreeViewport.tsx` — imports `Canvas`, `useFrame` from fiber; `OrbitControls`, `Environment`, `PointerLockControls` from drei.
2. `src/three/WalkCameraController.tsx` — imports `useFrame`, `useThree` from fiber.

Other files under `src/three/` (`WallMesh`, `ProductMesh`, `CeilingMesh`, `FloorMesh`, `CustomElementMesh`, `Lighting`, `wainscotStyles`, `productTextureCache`, `floorTexture`, `walkCollision`) use only R3F JSX intrinsics (`<mesh>`, `<group>`, etc.) and `three` directly — they will be affected by the R3F v9 **JSX namespace change** (ThreeElements) but do not import fiber/drei symbols.

Mention in research to help planner: `src/three/ThreeViewport.tsx` is **lazy-loaded** from `src/App.tsx` via `React.lazy()`, so any R3F v9 entry-point tweaks are contained to that module.

## 2. R3F v9 Migration — Breaking Changes Relevant to This Codebase

**Canonical source:** [R3F v9 Migration Guide](https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide) — the official, short, versioned doc. This is the single best link to cite in CONCERNS.md.

### Relevant breaking changes

| Change | Affects our code? | Notes |
|--------|-------------------|-------|
| **JSX namespace deprecated; use `ThreeElements` interface** | Yes — every `src/three/*Mesh.tsx` file uses JSX intrinsics like `<mesh>`, `<group>`, `<planeGeometry>`, `<meshStandardMaterial>`. If we have `declare global { namespace JSX { ... } }` anywhere or strict TS types keyed on the old JSX namespace, they need to switch to `ThreeElements`. | React 19 deprecates global `JSX` namespace merging; R3F v9's `ThreeElements` replaces the old `@react-three/fiber` global-augmentation pattern. |
| **Strict-mode behaviour changes** | Possibly — `Canvas` renders children twice in Strict Mode on React 19. Must verify `useFrame`-driven imperative mutations in `WalkCameraController.tsx` and `ThreeViewport.tsx` (camera lerp at line 84-103) are idempotent. | A re-render that re-runs the lerp setup from stale refs could mis-target the camera on first frame. Not a certain bug — flag for execution-phase testing. |
| **`useLoader` supports external loader re-use** | Not applicable — we don't use `useLoader`. | Our textures are constructed manually in `floorTexture.ts` and `productTextureCache.ts`. |
| **Event-system / raycaster internals** | Low risk — we don't attach custom raycasters. Drei `OrbitControls` / `PointerLockControls` handle all pointer events. | Worth a smoke test post-upgrade. |
| **React 19 peer dep required** | Yes — R3F v9 peer-requires React ≥ 19 (or ≥ 18 in practice per v9.6 compatibility matrix; verify at execution time). | This is why the upgrade **must not** leave R3F v9 installed alongside React 18 long-term. |

### Files in this codebase that will likely need edits during execution

- `src/three/ThreeViewport.tsx` — `OrbitControls` ref typing (currently `useRef<any>`); Strict Mode audit for the useEffect camera restore logic.
- `src/three/WalkCameraController.tsx` — `useFrame` / `useThree` usage remains API-compatible; smoke-test only.
- All `src/three/*Mesh.tsx` files — JSX intrinsics: verify type resolution under `ThreeElements` on strict TS.
- `tsconfig.json` — may need `"types": ["@react-three/fiber"]` or an equivalent reference per v9 types pattern.

Planner does **not** need to make any of these edits in Phase 27 — the research only lists them so the CONCERNS.md section can name the affected areas.

## 3. drei v10 Migration — Breaking Changes

**Canonical sources:**
- [`@react-three/drei` releases](https://github.com/pmndrs/drei/releases) (latest 10.7.7)
- [drei discussion #2213 — React 19 & R3F v9 support](https://github.com/pmndrs/drei/discussions/2213)
- [drei issue #1086 — Deprecate ContextBridge](https://github.com/pmndrs/drei/issues/1086)

### Relevant breaking changes

| Change | Affects our code? | Notes |
|--------|-------------------|-------|
| **Manual context-bridge code removed** | No — we don't use `<ContextBridge>`. We use R3F's automatic context forwarding via R3F v9. | ContextBridge was the drei v9 workaround for React 18's missing context propagation into R3F roots. |
| **Peer dep: requires `@react-three/fiber@^9`** | Yes — this is why the ordering is fixed (see §6). | `drei@^10` will refuse to install with `fiber@^8`. |
| **Peer dep: requires React 19** | Yes — per drei v10 peer range. | Minor historical note: drei 10.0.x had some transitive `use-sync-external-store` conflicts with React 19 (zustand transitive via tunnel-rat); resolved in later patches. |
| **`OrbitControls` API** | No observable change — same props (`target`, `maxPolarAngle`, `minDistance`, `enableDamping`, `onChange`, `ref`) still supported. | Our usage in `ThreeViewport.tsx` lines 168-184 should work unchanged. |
| **`Environment` API** | No observable change — `preset` prop still supported. | Our `preset="apartment"` usage (line 121) should work unchanged. |
| **`PointerLockControls` API** | No observable change — `maxPolarAngle` / `minPolarAngle` props still supported. | Our usage line 187 should work unchanged. |

Confidence: MEDIUM. drei release notes are historically terse and v10 specifically lists only a handful of breaking items. Planner should cite "see drei GitHub releases for v10.x patch-level changes" rather than attempt an exhaustive table.

## 4. React 19 Migration — Relevant to This Codebase

**Canonical source:** [React 19 release blog post](https://react.dev/blog/2024/12/05/react-19)

### Relevant breaking / behavior changes

| Change | Affects our code? | Notes |
|--------|-------------------|-------|
| **`forwardRef` deprecated; ref is a regular prop on function components** | Low impact — we do not currently use `forwardRef` anywhere in `src/` (verified). The R3F `Canvas` internally manages refs; our `OrbitControls` ref usage (line 169) uses drei's ref forwarding, which drei v10 already adapts for us. | Only a concern if we later add wrapper components around Mesh components. |
| **Removed: string refs, `ReactDOM.render`, `module pattern components`, `PropTypes`, default props on function components** | No impact — we don't use any of these. | Confirmed via grep for `propTypes`/`defaultProps`: none in `src/`. |
| **Automatic batching already present in 18** | No impact — we were already on 18's batching behavior. | |
| **JSX transform — global `JSX` namespace conflicts** | Paired with R3F v9's `ThreeElements` — see §2. | Resolved as part of the R3F v9 upgrade, not a separate step. |
| **Ref cleanup functions** | Opportunity, not a break — `useRef` callbacks can now return cleanup fns. Could clean up the manual cleanup pattern in `orbitControlsRef` but not required. | Defer to execution phase. |
| **`useMemo` / `useCallback` behavior** | No change vs React 18; mentioned only because issue #56 implies it may be a concern — it is not. | Skip mention in CONCERNS.md. |
| **Server Components, Actions, `useOptimistic`, Server Actions** | Not applicable — SPA, no server runtime. | Skip mention in CONCERNS.md. |

### React 19 idiosyncrasy to flag

React 19.2 bumped the internal reconciler in a non-backward-compatible way. The R3F team adopted a compat shim; R3F v9.6.0 supports React **19.0 through 19.2**. Planner should cite this in CONCERNS.md as "pin React 19.2.x at execution time to match tested R3F v9 matrix" — do **not** jump to a React 19.3+ preview if one ships.

## 5. Known Blockers (Issue #56 context)

### Original blocker (from CONCERNS.md today)
> "React was pinned to `^18.3.1` to maintain compatibility with `@react-three/fiber` v8 and `@react-three/drei` v9, which do not fully support React 19."

### Upstream status (verified 2026-04-20)
- **R3F v9 is stable.** Latest release **v9.6.0** (approx. 2026-04-14, "6 days ago"). The v9 line explicitly targets React 19.
- **drei v10 is stable.** Latest release **v10.7.7** (published approximately 2025-11; 5 months ago).
- **React 19 is GA.** Latest 19.2.x series.
- The "hook error" class of bugs reported against R3F v8 + React 19 (GH issues [#3268](https://github.com/pmndrs/react-three-fiber/issues/3268), [#3471](https://github.com/pmndrs/react-three-fiber/issues/3471)) were the motivation for v9 and are fixed by upgrading.
- There is a class of **`Invalid hook call` bugs in R3F v9.1 when XR/createStore patterns are used outside component scope** (GH issues [pmndrs/xr#433](https://github.com/pmndrs/xr/issues/433), [pmndrs/xr#441](https://github.com/pmndrs/xr/issues/441)). **Does not affect us** — we do not use `@react-three/xr`.

### Conclusion
Issue #56's blocker is **resolved at the upstream level**. The issue stays OPEN per D-05 because **we have not yet executed the upgrade in this repo**, not because the ecosystem isn't ready. The updated comment should reflect this: "upstream ready, execution deferred to a dedicated phase."

## 6. Upgrade Sequence Verification

**Stated sequence:** R3F v9 → drei v10 → React 19.

### Peer-dep reality
- `@react-three/drei@^10` peer-requires `@react-three/fiber@^9` → **drei v10 cannot be installed before R3F v9.**
- `@react-three/fiber@^9` peer-requires `react@^19` (practical requirement; some early 9.x releases accepted 18 via shim, but v9.6 aligns on 19) → **React 19 must accompany or follow R3F v9.**
- `@react-three/drei@^10` peer-requires `react@^19` → **React 19 must be installed before or alongside drei v10.**

### Resolved install order for a future execution phase

Option A (recommended, single-PR upgrade):
```
npm install react@^19 react-dom@^19 @react-three/fiber@^9 @react-three/drei@^10 @types/react@^19 @types/react-dom@^19
```
All four peer-deps resolve in one lockfile transaction. Matches how the React ecosystem usually upgrades.

Option B (literal sequence from CONTEXT): impossible in a single `npm install` because drei v10 peer-requires React 19. But the **documentation sequence** "R3F v9 → drei v10 → React 19" is still the correct way to describe the upgrade **conceptually** (gatekeeper → dependent helper lib → React core). The CONCERNS.md section should present it as conceptual sequence, not as three literal install steps. Planner: make that distinction explicit in prose.

## 7. Release Status (as of 2026-04-20)

| Package | Latest stable | Status | Suitable target? |
|---------|---------------|--------|------------------|
| `react` | 19.2.x | GA (released 2024-12-05, stable for ~16 months) | Yes |
| `react-dom` | 19.2.x | GA | Yes |
| `@react-three/fiber` | 9.6.0 | GA on v9 line; 9.6.0 is recent (~6 days) | Yes — pin `^9.0.0` per D-02 |
| `@react-three/drei` | 10.7.7 | GA on v10 line; settled (~5 months old) | Yes — pin `^10.0.0` per D-02 |
| `three` | 0.183.2 currently pinned; latest upstream may differ | Unchanged for this phase | No action needed |

**Bottom line:** All three target packages are stable. Issue #56 can continue as a tracking issue for the still-unexecuted upgrade; nothing in the ecosystem is blocking the work.

## 8. Citations

### R3F
- [R3F v9 Migration Guide](https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide) — primary doc to cite in CONCERNS.md
- [R3F Releases (GitHub)](https://github.com/pmndrs/react-three-fiber/releases) — release history, latest 9.6.0
- [R3F Fiber CHANGELOG.md](https://github.com/pmndrs/react-three-fiber/blob/master/packages/fiber/CHANGELOG.md) — per-version breaking-change log
- [R3F GH issue #3268](https://github.com/pmndrs/react-three-fiber/issues/3268) — v8 hook error with React 19 (original blocker class)
- [R3F GH issue #3471](https://github.com/pmndrs/react-three-fiber/issues/3471) — early v9 hook issues (resolved)
- [R3F GH issue #3222](https://github.com/pmndrs/react-three-fiber/issues/3222) — React experimental branch tracking
- [`@react-three/fiber` on npm](https://www.npmjs.com/package/@react-three/fiber) — version confirmation

### drei
- [drei Releases (GitHub)](https://github.com/pmndrs/drei/releases) — release history, latest 10.7.7
- [drei discussion #2213 — React 19 & R3F v9 Supported?](https://github.com/pmndrs/drei/discussions/2213) — confirms v10 stance on React 19
- [drei issue #1086 — Deprecate ContextBridge](https://github.com/pmndrs/drei/issues/1086) — v10 primary breaking change rationale
- [drei issue #2260 — React 19 compatibility](https://github.com/pmndrs/drei/issues/2260) — migration discussion
- [drei issue #2430 — react to ^19, drei to ^10](https://github.com/pmndrs/drei/issues/2430) — peer-dep migration thread

### React 19
- [React 19 release blog post](https://react.dev/blog/2024/12/05/react-19) — primary doc
- [React `forwardRef` reference (deprecation)](https://react.dev/reference/react/forwardRef)
- [React GH issue #31613 — forwardRef props referential stability](https://github.com/facebook/react/issues/31613) — known React 19 behavioral nuance (not blocking for us)

### Community / context
- [Medium: "I Upgraded Three Apps to React 19. Here's What Broke" by Zoe](https://medium.com/@quicksilversel/i-upgraded-three-apps-to-react-19-heres-what-broke-648087c7217b) — real-world R3F + React 19 upgrade gotchas

### Recommended minimum citations in CONCERNS.md (per D-03 "1–2 links")
1. [R3F v9 Migration Guide](https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide)
2. [React 19 release blog post](https://react.dev/blog/2024/12/05/react-19)

## Validation Architecture

Phase 27 is **documentation-only**. Nyquist validation collapses to file-content assertions, not a test-framework run.

### Acceptance checks (for `/gsd:verify-work`)
1. `.planning/codebase/CONCERNS.md` contains a heading matching `## R3F v9 / React 19 Upgrade`.
2. That section mentions **all three** target versions (`^9.0.0`, `^10.0.0`, `^19.0.0`) and the ordering phrase "R3F v9 → drei v10 → React 19".
3. That section cites at least one of the canonical links (R3F v9 migration guide or React 19 blog post).
4. The existing "React 18 downgrade" bullet in Tech Debt has been rewritten as a pointer to the new section.
5. `git diff package.json` produces **no output** at phase close (D-07).
6. `git status -- src/` shows no modifications (D-08).
7. GitHub issue #56 has a new comment (via `gh issue comment 56 --body-file ...`) and state is still `OPEN`.

### Tooling
- Grep/`rg` checks for steps 1–4 (can run from CI or locally).
- `gh issue view 56 --json state,comments` for step 7.
- `git diff` / `git status` for steps 5–6.

### Framework
No unit or integration tests are appropriate for this phase. `vitest` is available in the repo but not exercised here. Existing test suite should still pass (sanity: `npm run test:quick`) but that is a general safeguard, not phase-specific validation.

### Wave 0 gaps
None. All validation is string/file-state matching against artifacts this phase produces.

## Metadata

**Confidence breakdown:**
- Current pinned versions: HIGH — read directly from `package.json`.
- R3F v9 release status & breaking changes: HIGH — official migration guide + release notes.
- drei v10 release status: HIGH — npm + GitHub releases.
- drei v10 specific breaking changes beyond ContextBridge removal: MEDIUM — v10 release notes are thin; relied on discussions and issue threads.
- React 19 breaking changes relevant to SPA: HIGH — official release blog.
- Original R3F v8 + React 19 hook error: HIGH — multiple GitHub issues document it; fixed by v9.
- Ordering rationale (peer-dep verification): HIGH — drei v10 peer-dep on R3F v9 is explicit in release notes / issue #2430.

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (30 days — packages are stable but React / R3F minor releases happen frequently; re-verify specific version numbers at execution time).
