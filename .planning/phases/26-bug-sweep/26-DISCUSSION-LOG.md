# Phase 26: Bug Sweep - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 26-bug-sweep
**Areas discussed:** Ceiling preset depth, Product image fix approach, Test strategy, Reload verification scope

---

## Gray Area Selection

**Question:** Which gray areas do you want to discuss for Phase 26?

| Option | Description | Selected |
|--------|-------------|----------|
| Ceiling preset depth | color+roughness vs texture parity vs investigate | ✓ |
| Product image fix approach | Investigate getCachedImage vs rewrite with FabricImage.fromURL | ✓ |
| Test strategy | RED/GREEN unit, manual smoke, or both | ✓ |
| Reload verification scope | IndexedDB round-trip vs snapshot round-trip | ✓ |

**User's choice:** All four areas selected.
**Notes:** Scout report flagged that issue #42's description references code patterns that no longer exist, and `CeilingMesh` already has a Tier-1 preset branch — shifting both bugs toward "investigate before fix" territory.

---

## Ceiling preset depth

### Q1: What's the actual ceiling preset bug?

| Option | Description | Selected |
|--------|-------------|----------|
| Investigate first | Reproduce in 3D viewport before deciding fix. Maybe persistence, maybe tier resolution, maybe indistinguishable presets. | ✓ |
| Fix persistence + visual parity | Assume both symptoms real — fix preset-not-surviving-reload AND visibly-distinct preset colors in one wave. | |
| Add textures to ceiling presets | Go beyond FloorMesh — add texture loading to ceiling presets. | |

**User's choice:** Investigate first (Recommended)
**Notes:** Keeps scope tight. Avoids speculatively fixing the wrong thing.

### Q2: Touch the three overlapping ceiling material fields?

| Option | Description | Selected |
|--------|-------------|----------|
| Leave as-is | Phase 26 is bug sweep, not refactor. Fix FIX-02 inside existing tier resolution. | ✓ |
| Collapse to discriminated union | Mirror FloorMaterial pattern. Adds migration surface. | |

**User's choice:** Leave as-is (Recommended)
**Notes:** Type-model refactor deferred to a future tech-debt phase.

---

## Product image fix approach

### Q1: Issue #42 description may be stale. How to approach FIX-01?

| Option | Description | Selected |
|--------|-------------|----------|
| Reproduce bug against current code first | Place product + reload. Write RED test. Decide fix after. Preserves existing cache. | ✓ |
| Trust issue — rewrite with fabric.FabricImage.fromURL | Replace productImageCache with Fabric's native async loader. Loses Promise dedup. | |
| Close issue as stale | If repro fails, close #42 and mark FIX-01 as no-op verified. | |

**User's choice:** Reproduce bug against current code first (Recommended)
**Notes:** Preserves Phase 24/25 Promise-cache decision. Close-as-stale remains an allowed outcome if repro fails (captured in CONTEXT as D-04).

### Q2: First-paint vs dedup trade-off priority?

| Option | Description | Selected |
|--------|-------------|----------|
| Thumbnail on first paint | SC #1 forbids placeholder-only render. Double-load acceptable. | ✓ |
| Keep dedup, accept placeholder flash | Preserve cache, show placeholder until resolve. | |
| You decide | Trust Claude after seeing repro. | |

**User's choice:** Thumbnail on first paint (Recommended)
**Notes:** Visible correctness beats micro-perf for this bug.

---

## Test strategy

### Q1: What test coverage ships with Phase 26?

| Option | Description | Selected |
|--------|-------------|----------|
| Both: unit tests + manual smoke | RED/GREEN unit for cache + tier logic. Manual visual check for 2D + 3D. | ✓ |
| Unit tests only | Pure automation; misses 3D visual correctness. | |
| Manual smoke only | D-13 style user-approved check; no regression guard. | |

**User's choice:** Both (Recommended)
**Notes:** Phase 24 and Phase 25 each used one of these; combining gives regression guard AND visual truth.

### Q2: RED tests first, or fix + test together?

| Option | Description | Selected |
|--------|-------------|----------|
| RED first, then fix | Mirrors Phase 25 Wave 0 validation-scaffolding. Explicit RED → GREEN commit sequence. | ✓ |
| Fix and test together | Lower ceremony. Still automated. | |

**User's choice:** RED first, then fix (Recommended)
**Notes:** Reviewable evidence of regression-guard intent.

---

## Reload verification scope

### Q1: How to verify SC #2 (product images persist) and SC #4 (ceiling preset persists)?

| Option | Description | Selected |
|--------|-------------|----------|
| Snapshot round-trip (unit) + full IndexedDB (manual) | structuredClone round-trip for fields + actual save/refresh for IDB-layer bugs. | ✓ |
| Full IndexedDB only | Most realistic; no automation. | |
| Snapshot only | Fully automated; misses IDB-layer bugs. | |

**User's choice:** Snapshot + IndexedDB manual (Recommended)
**Notes:** Phase 25 D-07 established snapshot round-trip as reliable. Manual IDB covers the gap.

---

## Claude's Discretion

- Wave structure (Wave 0 scaffolding / Wave 1 FIX-01 / Wave 2 FIX-02 / Wave 3 verification) — planner decides.
- Unit test file paths and naming — planner decides.
- Whether FIX-01 and FIX-02 ship as one commit or separate — planner decides.

## Deferred Ideas

- Ceiling material type collapse to discriminated union (backlog, future tech-debt phase).
- Texture-loading for ceiling presets (backlog, v1.6 polish candidate).
- fabric.FabricImage.fromURL migration (only if repro proves cache is the root cause).
- Automated IndexedDB round-trip testing (separate testing-infrastructure effort).
