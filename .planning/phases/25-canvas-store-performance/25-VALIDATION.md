---
phase: 25
slug: canvas-store-performance
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-19
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.2 |
| **Config file** | `vitest.config.ts` (defaults) |
| **Quick run command** | `npm test -- tests/cadStore.test.ts tests/toolCleanup.test.ts tests/fabricSync.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~1.5s full suite, <1s quick run |
| **Current baseline** | 177 tests total · 168 passing · 6 pre-existing failures · 3 todo (verified 2026-04-19) |

> ROADMAP's "115 tests" success criterion is stale. True regression target is **168 passing preserved, 6 pre-existing failures unchanged, 3 todo unchanged**.

---

## Sampling Rate

- **After every task commit:** `npm test -- tests/cadStore.test.ts tests/toolCleanup.test.ts tests/fabricSync.test.ts`
- **After every plan wave:** `npm test` (full 177-test suite)
- **Before `/gsd:verify-work`:** Full suite green + manual evidence bundle per D-10 assembled
- **Max feedback latency:** 2 seconds (quick run)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 25-00-01 | 00 | 0 | PERF-02 | unit | `npm test -- tests/cadStore.test.ts -t "snapshot is independent"` | ❌ W0 | ⬜ pending |
| 25-00-02 | 00 | 0 | PERF-02 | unit | `npm test -- tests/cadStore.test.ts -t "snapshot preserves all keys"` | ❌ W0 (partial) | ⬜ pending |
| 25-00-03 | 00 | 0 | PERF-02 | unit | `npm test -- tests/cadStore.test.ts -t "snapshot uses structuredClone"` | ❌ W0 | ⬜ pending |
| 25-00-04 | 00 | 0 | PERF-01 | unit | `npm test -- tests/cadStore.test.ts -t "drag produces single history entry"` | ❌ W0 | ⬜ pending |
| 25-00-05 | 00 | 0 | PERF-01 | unit | `npm test -- tests/toolCleanup.test.ts -t "drag interrupted by tool switch"` | ❌ W0 (existing file) | ⬜ pending |
| 25-00-06 | 00 | 0 | PERF-01 | unit | `npm test -- tests/fabricSync.test.ts -t "renderOnAddRemove disabled"` | ❌ W0 | ⬜ pending |
| 25-00-07 | 00 | 0 | PERF-01 | unit | `npm test -- tests/fabricSync.test.ts -t "fast path does not clear canvas during drag"` | ❌ W0 | ⬜ pending |
| 25-01-01 | 01 | 1 | PERF-02 | unit (reuses 25-00-01/02/03) | Quick run | ✅ via W0 | ⬜ pending |
| 25-02-01 | 02 | 2 | PERF-01 | unit (reuses 25-00-04..07) | Quick run | ✅ via W0 | ⬜ pending |
| 25-03-01 | 03 | 3 | PERF-01, PERF-02 | manual (Chrome DevTools + `window.__cadBench()`) | N/A — operator captures evidence | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] **`tests/cadStore.test.ts`** — add cases:
  - `snapshot()` produces independent deep copy (mutate result → original unchanged)
  - `snapshot()` preserves `rooms`, `activeRoomId`, `customElements`, `customPaints`, `recentPaints`
  - `snapshot()` does not invoke `JSON.parse`/`JSON.stringify` (spy-based or source-level assertion)
  - Product drag commits exactly one history entry (simulate mouse:down → N×mouse:move → mouse:up at store level, assert `past.length` delta = 1)
  - Wall drag commits exactly one history entry
- [ ] **`tests/toolCleanup.test.ts`** (existing file) — add case:
  - Drag interrupted mid-flight by tool-switch reverts Fabric object to pre-drag state and produces zero history entries
- [ ] **`tests/fabricSync.test.ts`** — add cases:
  - `canvas.renderOnAddRemove === false` after FabricCanvas mounts
  - Fast-path drag tick invokes `fc.requestRenderAll` (spy-based) and does NOT invoke `fc.clear`
- [ ] **Dev helpers** — install `window.__cadSeed(wallCount, productCount)` and `window.__cadBench()` in `src/stores/cadStore.ts` (or sibling module), gated by `import.meta.env.DEV`. Required artifact for D-10 evidence bundle.
- [ ] **Framework install:** none needed (Vitest already present).

> If Wave 0 finds a pre-existing failure inside the Phase 25 footprint (`cadStore.ts snapshot()`, `FabricCanvas.tsx`, `selectTool.ts` drag handlers), **escalate before editing** — don't entangle a red test with a new refactor.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag sustains 60fps at 50W/30P | PERF-01 | jsdom has no real rendering/fps; Chrome DevTools Performance panel is authoritative | 1. `npm run dev`, open app · 2. In devtools console run `window.__cadSeed(50, 30)` · 3. Open Performance panel, click Record · 4. Drag a product across the canvas for ~5s · 5. Stop recording · 6. Verify Frames lane shows zero frames >16.7ms in the dragging region · 7. Screenshot the trace for D-10 evidence bundle |
| Snapshot ≥2× faster at 50W/30P | PERF-02 | Absolute timing varies by hardware; CI assertion would be flaky | 1. On pre-change baseline: `npm run dev`, open devtools console · 2. Run `window.__cadBench()` — capture mean + p95 · 3. After Wave 1 change: re-run `window.__cadBench()` · 4. Compute ratio (before/after) — must be ≥2.0 · 5. Capture console output for D-10 evidence bundle |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (7 unit tests + 2 dev helpers)
- [ ] No watch-mode flags (use `npm test`, not `npm test -- --watch`)
- [ ] Feedback latency < 2s
- [ ] Baseline 177 tests / 168 passing preserved after all waves
- [ ] Manual evidence bundle (trace + bench output) attached to VERIFICATION.md
- [ ] `nyquist_compliant: true` set in frontmatter after Wave 0 lands

**Approval:** pending
