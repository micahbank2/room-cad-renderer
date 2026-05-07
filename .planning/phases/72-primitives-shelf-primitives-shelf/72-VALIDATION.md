# Phase 72: Primitives Shelf — Validation Strategy

**Derived from:** 72-RESEARCH.md (2026-05-07)

## Test Framework

| Property | Value |
|----------|-------|
| Unit framework | vitest 4.1.2 |
| E2E framework | Playwright 1.59.1 |
| Quick run | `npm run test:quick` |
| Full suite | `npm test && npm run test:e2e` |

## Requirements → Test Map

| Req ID | Behavior | Test Type | Command | New? |
|--------|----------|-----------|---------|------|
| PRIM-01 | Button renders all 6 variants × 6 sizes with correct classes | unit | `npx vitest run tests/primitives/button.test.tsx` | Yes |
| PRIM-02 | cn() merges + deduplicates Tailwind classes | unit | `npx vitest run tests/primitives/cn.test.ts` | Yes |
| PRIM-03 | PanelSection persists open/closed to localStorage | unit | `npx vitest run tests/primitives/panelSection.test.tsx` | Yes |
| PRIM-04 | PanelSection __drivePanelSection test driver API (toggle/getOpen/getPersisted) | unit | `npx vitest run tests/primitives/panelSection.test.tsx` | Yes |
| PRIM-05 | Phase 33 structural test still passes (updated for PanelSection) | unit | `npx vitest run tests/phase33/collapsibleSections.test.ts` | Update |
| PRIM-06 | Existing e2e tests pass after button migration | e2e | `npm run test:e2e` | Existing |
| PRIM-07 | Dialog renders with Radix focus trap + spring entry | unit | `npx vitest run tests/primitives/dialog.test.tsx` | Yes |
| PRIM-08 | Tabs renders active pill with correct aria attributes | unit | `npx vitest run tests/primitives/tabs.test.tsx` | Yes |

## Sampling Rate

- **Per task commit:** `npm run test:quick` (fast vitest subset)
- **Per wave merge:** `npm test && npm run test:e2e` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

## Wave 0 Test Gaps

These tests must be created as part of the primitives build (before migration):

- [ ] `tests/primitives/cn.test.ts` — PRIM-02
- [ ] `tests/primitives/button.test.tsx` — PRIM-01
- [ ] `tests/primitives/panelSection.test.tsx` — PRIM-03, PRIM-04
- [ ] `tests/primitives/dialog.test.tsx` — PRIM-07
- [ ] `tests/primitives/tabs.test.tsx` — PRIM-08
- [ ] Update `tests/phase33/collapsibleSections.test.ts` — PRIM-05

## Regression Guard

All 800+ existing tests must remain green. Key risk areas:
- PropertiesPanel tests after CollapsibleSection → PanelSection swap
- Toolbar tests after raw `<button>` → `<Button>` swap
- Phase 33 structural test after file additions

---

*Phase: 72-primitives-shelf*
*Strategy derived: 2026-05-07*
