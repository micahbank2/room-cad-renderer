---
phase: 46
slug: rooms-hierarchy-sidebar-tree-tree-01
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-25
---

# Phase 46 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `46-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 1.x (unit/component) + Playwright (e2e) |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm run test -- --run <file>` |
| **Full suite command** | `npm run test -- --run` |
| **Estimated runtime** | ~30s unit/component; e2e specs ~60s each |

> Note: Vitest CI is disabled per Phase 36-02; 6 pre-existing failures are permanent (Phase 37 D-02). New tests must be green locally; do not regress baseline failure count.

---

## Sampling Rate

- **After every task commit:** Run vitest filtered to changed/related files
- **After every plan wave:** Run full vitest suite (`npm run test -- --run`)
- **Before `/gsd:verify-work`:** Full suite must be green (no new failures vs Phase 37 baseline) + relevant Playwright e2e specs green
- **Max feedback latency:** 30 seconds for unit/component; e2e gated to wave end

---

## Per-Task Verification Map

> Task IDs assigned during planning; this matrix is the contract the planner fills out.
> Every TREE-01 acceptance criterion maps to at least one automated test below.

| Test File | Type | Covers | Wave 0? |
|-----------|------|--------|---------|
| `src/lib/__tests__/buildRoomTree.test.ts` | unit | Pure tree-shape selector from cadStore.rooms | ❌ W0 |
| `src/stores/__tests__/uiStore.hiddenIds.test.ts` | unit | hiddenIds Set actions + transient (no history) | ❌ W0 |
| `src/stores/__tests__/uiStore.pendingCameraTarget.test.ts` | unit | dispatch/clear semantics + seq monotonic | ❌ W0 |
| `src/components/__tests__/RoomsTreePanel.render.test.tsx` | component | Renders rooms + groups + leaves; per-row anatomy | ❌ W0 |
| `src/components/__tests__/RoomsTreePanel.expand.test.tsx` | component | Chevron toggles; localStorage round-trip | ❌ W0 |
| `src/components/__tests__/RoomsTreePanel.visibility.test.tsx` | component | Eye-icon toggles; cascade opacity-50 on children | ❌ W0 |
| `src/components/__tests__/RoomsTreePanel.select.test.tsx` | component | Click-to-focus dispatches selection + camera target | ❌ W0 |
| `src/components/__tests__/RoomsTreePanel.empty.test.tsx` | component | 3 empty-state scenarios from UI-SPEC | ❌ W0 |
| `src/lib/__tests__/isHiddenInTree.test.ts` | unit | Cascade math: leaf hidden iff self/group/room hidden | ❌ W0 |
| `src/lib/__tests__/uiPersistence.tree.test.ts` | unit | Tree key namespace read/write/migrate | ❌ W0 |
| `src/three/__tests__/ThreeViewport.hiddenIds.test.tsx` | integration | hiddenIds filter at 4 render sites (lines 380/389/402/407) | ❌ W0 |
| `src/three/__tests__/ThreeViewport.cameraDispatch.test.tsx` | integration | pendingCameraTarget consumer mirrors pendingPresetRequest | ❌ W0 |
| `e2e/tree-select-roundtrip.spec.ts` | e2e | Click leaf in tree → selection + camera tween | ❌ W0 |
| `e2e/tree-visibility-cascade.spec.ts` | e2e | Hide room → all descendants opacity-50; restore | ❌ W0 |
| `e2e/tree-expand-persistence.spec.ts` | e2e | Reload preserves expanded state per room | ❌ W0 |
| `e2e/tree-empty-states.spec.ts` | e2e | Three empty scenarios visible with correct copy | ❌ W0 |

*Status column populated during execution: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/buildRoomTree.ts` + `__tests__/buildRoomTree.test.ts` stubs (selector + RED tests)
- [ ] `src/lib/isHiddenInTree.ts` + `__tests__/isHiddenInTree.test.ts` stubs (cascade math + RED tests)
- [ ] `src/components/RoomsTreePanel/` directory + render/expand/visibility/select/empty test stubs (RED)
- [ ] `src/stores/__tests__/uiStore.hiddenIds.test.ts` + `uiStore.pendingCameraTarget.test.ts` stubs (RED)
- [ ] `src/three/__tests__/ThreeViewport.hiddenIds.test.tsx` + `ThreeViewport.cameraDispatch.test.tsx` stubs (RED)
- [ ] `src/lib/__tests__/uiPersistence.tree.test.ts` stub (RED)
- [ ] `e2e/tree-*.spec.ts` four Playwright spec stubs (RED) — verify Playwright config picks them up
- [ ] Test drivers `__driveTreeExpand`, `__driveTreeVisibility`, `__driveTreeSelect`, `__getTreeState` declared in `src/test-utils/treeDrivers.ts` and gated by `import.meta.env.MODE === "test"`

> All TREE-01 sub-behaviors have automated coverage; Wave 0 installs the stubs that subsequent waves turn GREEN.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual fidelity vs UI-SPEC.md (chevron 16px, eye 24×24, accent budget, IBM Plex Mono labels) | TREE-01 | Pixel-perfect match requires human eye + reduced-motion comparison | Open dev server; verify against UI-SPEC anatomy diagram; toggle prefers-reduced-motion and confirm snap-not-tween |
| Reduced-motion preference honors expand/collapse | TREE-01 (UI-SPEC D-39 conformance) | OS-level media query interaction | Set OS reduce-motion; reload; expand/collapse — must snap, not animate (150ms gated) |
| Empty-state copy renders correctly | TREE-01 | Copy review | Create blank project; create room with no walls; verify each empty-state scenario shows specified copy |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (16 test files above)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s for unit/component
- [ ] `nyquist_compliant: true` set in frontmatter (planner flips on PLAN.md commit)

**Approval:** pending
