---
gsd_state_version: 1.0
milestone: v1.7.5
milestone_name: Design System & UI Polish
status: executing
stopped_at: Completed 33-03-spacing-and-hook-PLAN.md
last_updated: "2026-04-22T13:58:45.945Z"
last_activity: 2026-04-22
progress:
  total_phases: 1
  completed_phases: 0
  total_plans: 10
  completed_plans: 4
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-20 — v1.6 scoping started)

**Core value:** Jessica can see her future room with her actual furniture before spending money.
**Current focus:** Phase 33 — design-system-ui-polish

## Current Position

Milestone: v1.7.5 Design System & UI Polish
Phase: 33 (design-system-ui-polish) — EXECUTING
Plan: 5 of 10
Status: Ready to execute
Last activity: 2026-04-22

Completed: Phase 32 PBR Foundation (shipped with carry-over → 999.2 wallpaper regression)
Backlog: 999.1 ceiling resize, 999.2 wallpaper view-toggle regression

## Accumulated Context

### Decisions

Full log in PROJECT.md Key Decisions table. Recent milestone decisions summarized in `.planning/RETROSPECTIVE.md § v1.5`.

- [Phase 28]: Phase 28 Plan 01: Created Wave 0 TDD red stubs (6 useAutoSave + 4 App.restore) for SAVE-05/SAVE-06; 6 fail describing Plan 02/03 behavior, 7 pass
- [Phase 28-auto-save]: Phase 28 Plan 02: Extended SaveStatus with 'failed', added try/catch + rename trigger to useAutoSave; 6 red stubs green, Phase 25 drag fast-path filter preserved, no ui-store watching
- [Phase 28-auto-save]: Phase 28 Plan 03: Pointer-based silent restore (D-02/D-02a/D-02b) — single write site in useAutoSave, mount-time read in App.tsx; all 4 App.restore red stubs green; SAVE-05 reload-restore closed
- [Phase 28-auto-save]: Phase 28 Plan 04: Signed VALIDATION.md (nyquist_compliant true, wave_0_complete true); full vitest 201/6pre-existing/3todo; Phase 28 stubs 10/10 green; manual smoke auto-approved per orchestrator auto-mode, deferred to HUMAN-UAT
- [Phase 28]: Option A: inline failed branch in ToolbarSaveStatus; leave orphaned SaveIndicator.tsx for follow-up cleanup
- [Phase 29]: Wave 0 red stubs (4 test files) locked parser grammar, overlay UX, PropertiesPanel LENGTH, and EDIT-21 single-undo guard
- [Phase 29]: Used three-branch ordered regex for feet+inches parser; 'first match wins' cleanly rejects ambiguous forms like '12 6' while accepting liberal spellings.
- [Phase 29]: Added window.__openDimensionEditor(wallId) test driver to bypass jsdom+fabric hit-test fragility (Plan 01 explicitly sanctioned this pattern).
- [Phase 29]: Phase 29 Plan 04: Final gate passed — 37/37 Phase 29 tests green, tsc clean (only pre-existing baseUrl deprecation), human-verify auto-approved, nyquist_compliant flipped true. Phase 29 signed off.
- [Phase 30-smart-snapping]: Plan 30-01 locks SNAP-01/02/03 via 29 red test assertions across unit+Fabric+RTL layers; Plan 03 driver contract (window.__driveSnap / __getSnapGuides) documented in test headers
- [Phase 30-smart-snapping]: Midpoint snap targets require both center.x and center.y within tolerance — preserves "centered on this wall" semantics of midpoint-dot guide
- [Phase 30-smart-snapping]: Diagonal walls contribute endpoint X/Y targets only in v1 (full perpendicular-projection snap deferred)
- [Phase 30]: Wall-endpoint drag path deliberately untouched per D-08b (Phase 31 owns smart snap for wall endpoints)
- [Phase 30]: productTool driver auto-seeds default test product when pendingProductId is unset (gated by import.meta.env.MODE === test)
- [Phase 30-smart-snapping]: Plan 04 gate signed off — nyquist_compliant true, full suite green, Alt/Option documented in CLAUDE.md; perceptual items persisted to 30-HUMAN-UAT.md
- [Phase 31]: Driver bridges (__driveResize/__driveWallEndpoint/__driveLabelOverride) advertised in-file for Wave 2; locked Phase 29/30 TDD shape
- [Phase 31]: Plan 31-02 (Wave 1 pure modules): 5 schema fields + resolver + edge handles + restricted snap scene + 8 store actions. 43 Wave 0 unit tests RED->GREEN; integration tests still RED awaiting Wave 2 drivers
- [Phase 31]: Pitfall 4 separation: updateCustomElement (catalog) + updatePlacedCustomElement (placement) coexist with clear naming; placement actions write to rooms[active].placedCustomElements[id] not root.customElements
- [Phase 31]: Plan 31-03 wired all Wave 1 pure modules into selectTool + PropertiesPanel + fabricSync; all 4 RTL specs green; +27 assertions
- [Phase 31]: Phase 31 closure: VALIDATION signed (nyquist_compliant=true, wave_0_complete=true), 28/28 RTL assertions green, 6 pre-existing LIB-03/04/05 failures documented out-of-scope, EDIT-22/23/24/CUSTOM-06 closed
- [Phase 32-pbr-foundation]: Plan 02: Centralized PBR loader infrastructure — applyColorSpace helper (D-18), refcount acquireTexture/releaseTexture cache with imperative THREE.TextureLoader (D-12/16/17), PbrErrorBoundary (D-15). +14 tests, zero regressions. Plan 03 will wire into meshes and migrate legacy caches.
- [Phase 32-pbr-foundation]: Tests placed in tests/ (not colocated) because vitest.config include pattern only covers tests/** and src/__tests__/** — auto-fixed per Rule 3 (blocking: would be silently skipped otherwise).
- [Phase 32-pbr-foundation]: Chose oak_veneer_01 / concrete_floor_worn_001 / beige_wall_001 from Poly Haven CC0 for PBR texture sets
- [Phase 32-pbr-foundation]: HDR 1.58 MB exceeds plan 700KB ceiling; Poly Haven smallest 1k HDR is 1.2MB — accepted named asset, documented in LICENSE and SUMMARY
- [Phase 32-pbr-foundation]: Plan 03: Wired PBR into CeilingMesh/FloorMesh via new PbrSurface wrapper (Suspense+ErrorBoundary); swapped Environment to bundled /hdr/studio_small_09_1k.hdr; registered renderer with pbrTextureCache for device anisotropy; migrated wallpaper/wallArt/floorTexture caches to shared acquireTexture (D-05). FloorMesh customTextureCache deferred to Phase 33.
- [Phase 32-pbr-foundation]: D-06 fix-not-rollback: wallpaper loader previously defaulted to NoColorSpace (wrong for sRGB JPGs); shared cache now sets SRGBColorSpace — documented as a correctness fix, not reverted.
- [Phase 32-pbr-foundation]: Plan 04: Locked Phase 32 PBR behavior with +12 vitest assertions (9 integration + 3 boundary) + gated __getPbrCacheState test driver. VIZ-07/VIZ-08 closed with automated regression guards. Zero regressions (367 → 379 passing).
- [Phase 33-design-system-ui-polish]: Plan 33-01: installed lucide-react@1.8.0 + added Phase 33 tokens to src/index.css using v4 --text-*/--spacing-* prefix; --radius-lg canonicalized 6px→8px; 6 12px-spacing sites audited for Plan 03
- [Phase 33]: Plan 33-00: 11 RED test scaffolds + driver contract README locking every Wave 1/2/3 plan; baseline 31 failing/13 passing; tokens+spacingAudit already green serve as regression guards
- [Phase 33]: Plan 33-03: Shipped useReducedMotion hook + 6 canonical spacing remaps (5 Toolbar + 1 Sidebar) + CLAUDE.md design system docs; 0 arbitrary p/m/gap/rounded-[Npx] in 4 target files; Plan 02 typography preserved

### Pending Todos

- Run `/gsd:discuss-phase` in fresh chat to scope v1.7.5 as a proper phase
- Issues #83–#90 assigned to v1.7.5 milestone — 8 UI polish items from Pascal audit
- Pre-existing Pascal insights #72–#81 remain unscheduled (keep separate from v1.7.5)

### Open Blockers/Concerns

None.

### Known Gaps Carried Forward

- **PERF-02 speedup target missed** — `structuredClone(toPlain(...))` contract met but ~1.25× slower than JSON roundtrip at 50W/30P (absolute <0.3ms, non-user-visible). Accepted; documented in `milestones/v1.5-MILESTONE-AUDIT.md` and `25-VERIFICATION.md`. No revisit unless scene scale grows to user-visible impact.
- **R3F v9 / React 19 upgrade execution deferred** — docs shipped (TRACK-01). Upgrade itself waits for R3F v9 to exit beta. Tracked on GH #56.
- **#61 WOOD_PLANK PBR realism** — not in v1.6 scope. Belongs to a future "3D realism" milestone.
- **Traceability table drift (cosmetic)** — v1.5 requirements archive preserves "Pending" strings in 4 rows where checkboxes are `[x]`. Fix at execute-time in v1.6.

## Session Continuity

Last session: 2026-04-22T13:58:45.943Z
Stopped at: Completed 33-03-spacing-and-hook-PLAN.md
Resume file: None
