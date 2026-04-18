# Phase 24: Tool Architecture Refactor - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-17
**Phase:** 24-tool-architecture-refactor
**Areas discussed:** Scope (ceilingTool), Cleanup pattern, Closure state shape, Extra as-any casts, Verification

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Scope: ceilingTool | Requirements list 5 tools but 6 exist; include ceilingTool or defer | ✓ |
| Cleanup pattern choice | Return fn vs. WeakMap vs. typed extension | ✓ |
| Closure state shape | Individual let vars vs. state object | ✓ |
| Extra as-any cleanup | Defer vs. partial vs. all | ✓ |

**User's choice:** All four selected.

---

## Scope: ceilingTool

| Option | Description | Selected |
|--------|-------------|----------|
| Include (Recommended) | Refactor ceilingTool too; update success criteria from 5 to 6 files | ✓ |
| Defer | Leave ceilingTool unchanged; document as carried-over tech debt | |

**User's choice:** Include.
**Notes:** ceilingTool was added during v1.4 after Phase 24 requirements were written. Same `(fc as any)` + module-level `state` patterns. Partial refactor would create inconsistency.

---

## Cleanup pattern choice

| Option | Description | Selected |
|--------|-------------|----------|
| Return cleanup fn from activate() (Recommended) | `() => void` returned from activate; stored by FabricCanvas.tsx | ✓ |
| WeakMap<Canvas, CleanupFn> | Module-owned WeakMap; activate/deactivate signatures unchanged | |
| Typed canvas extension | Module-augmentation interface + scoped cast | |

**User's choice:** Return cleanup fn from activate().
**Notes:** Matches React/useEffect cleanup idiom. No casts remain. FabricCanvas.tsx already uses refs — small API change to consume the return value.

---

## Closure state shape

| Option | Description | Selected |
|--------|-------------|----------|
| Individual `let` vars (Recommended) | Drop wrapper interfaces; declare fields directly in closure | ✓ |
| Keep state object | Move `const state: XToolState = {...}` inside activate() | |

**User's choice:** Individual `let` vars.
**Notes:** More idiomatic for closures. Wrapper interfaces (WallToolState, SelectState, CeilingToolState) add no value once state is closure-scoped.

---

## Extra as-any cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| Defer — stay in scope (Recommended) | Leave selectTool custom-elements + FabricCanvas.tsx event casts alone | ✓ |
| Include selectTool custom elements only | Type cadStore.customElements; fix 4 casts | |
| Fix all as-any in touched files | Widest cleanup; doubles scope | |

**User's choice:** Defer.
**Notes:** Casts outside tools/ belong to different refactor concerns (cadStore typing, fabric.js type-def gaps). Capture as deferred ideas.

---

## Verification

| Option | Description | Selected |
|--------|-------------|----------|
| Manual smoke test (Recommended) | Planner-authored checklist; no test runner exists | ✓ |
| Planner adds tests first | Stand up vitest + regression tests before refactor | |
| Researcher investigates | Let phase-researcher confirm test state | |

**User's choice:** Manual smoke test.
**Notes:** Roadmap's "115 tests" claim looks aspirational — no vitest/jest config in quick scan. Planner confirms during research; if a runner exists, add automated coverage on top.

---

## Claude's Discretion

- Exact shape of cleanup-fn storage in FabricCanvas.tsx (useRef vs. Map)
- Whether `findNearestEndpoint` moves into toolUtils.ts (wallTool-only currently)
- Internal closure variable naming

## Deferred Ideas

- selectTool `(useCADStore.getState() as any).customElements` casts (4) — needs cadStore typing
- FabricCanvas.tsx fabric event `as any` casts (3) — needs fabric.js type-def work
- Automated test coverage for tool activate/deactivate — needs test runner setup (likely v1.6 phase)
