---
phase: 71
slug: token-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-07
---

# Phase 71 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: extracted from `71-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (unit / jsdom) + Playwright (e2e) |
| **Config file** | vitest implicit (`package.json` test script); Playwright in `tests/playwright-helpers/` |
| **Quick run command** | `npm run test:quick` (vitest dot reporter) |
| **Full suite command** | `npm run test && npm run test:e2e` |
| **Estimated runtime** | ~60s quick · ~6 min full |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:quick`
- **After every plan wave:** Run `npm run test && npm run test:e2e`
- **Before `/gsd:verify-work`:** Full suite must be green AND the grep-audit gate (no `obsidian-*` / `text-text-*` / `glass-panel` / `ghost-border` / `accent-glow` / `cad-grid-bg` / `material-symbols-outlined` in `src/`) must pass.
- **Max feedback latency:** ~60 seconds per task

---

## Per-Task Verification Map

| Behavior | Requirement | Test Type | Automated Command | File Exists | Status |
|----------|-------------|-----------|-------------------|-------------|--------|
| Zero `obsidian-*` / `text-text-*` references in `src/` | TOKEN-FOUNDATION (token swap) | grep audit | `! grep -rln "obsidian-\|text-text-\|cad-grid-bg\|glass-panel\|accent-glow\|ghost-border\|material-symbols" src/` | ✅ shell, no test file | ⬜ pending |
| `useTheme` resolves system / light / dark correctly | TOKEN-FOUNDATION (theme hook) | unit | `vitest run tests/useTheme.test.tsx` | ❌ W0 | ⬜ pending |
| localStorage round-trip persists theme preference | TOKEN-FOUNDATION (theme persistence) | unit | `vitest run tests/useTheme.test.tsx` | ❌ W0 | ⬜ pending |
| `window.__driveTheme('light')` flips `html` class | TOKEN-FOUNDATION (theme driver) | unit (jsdom) | `vitest run tests/themeDriver.test.tsx` | ❌ W0 | ⬜ pending |
| Driver registration survives StrictMode double-mount | TOKEN-FOUNDATION (StrictMode safety) | unit | included in driver test | ❌ W0 | ⬜ pending |
| `getByText("Select")` mixed-case label succeeds | TOKEN-FOUNDATION (label sweep) | e2e | `playwright test tests/e2e/specs/preset-toolbar-and-hotkeys.spec.ts` | ✅ existing — selectors update | ⬜ pending |
| Snapshot v6 contract | Carry-over: snapshot migration | unit | `vitest run tests/snapshotMigration.test.ts` | ✅ exists — contract fix | ⬜ pending |
| Wallpaper "MY TEXTURES" tab is gone | Carry-over: picker MyTextures | unit | `vitest run tests/pickerMyTexturesIntegration.test.tsx` | ✅ exists — contract fix | ⬜ pending |
| WallMesh cutaway ghost props propagate to all material sites | Carry-over: cutaway audit | unit | `vitest run tests/WallMesh.cutaway.test.tsx` | ✅ exists — contract fix | ⬜ pending |
| ContextMenu action counts no pollution across remounts | Carry-over: ctx menu pollution | unit | `vitest run tests/lib/contextMenuActionCounts.test.ts` | ✅ exists — contract fix | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/useTheme.test.tsx` — theme resolution (system / light / dark), localStorage persistence, OS preference (`prefers-color-scheme`) watcher, StrictMode driver registration cleanup (identity-check pattern per CLAUDE.md item 7)
- [ ] `tests/themeDriver.test.tsx` (may be merged into `useTheme.test.tsx`) — covers `window.__driveTheme('light' | 'dark' | 'system')` integration in test mode only
- [ ] Grep-audit shell command added to phase verification gate — fails CI if any banned token name still appears under `src/`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual parity with Pascal screenshots | TOKEN-FOUNDATION (visual goal) | Subjective; Playwright `toHaveScreenshot` is OS-suffixed and platform-coupled (per memory feedback). Goldens skipped. | `npm run dev` → open app → toggle theme → compare side-by-side with `.planning/ui-audit/` Pascal screenshots. Confirm: neutral grays (no dark blue), 10px corners, Barlow display + Geist body, no purple in chrome. |
| `corner-shape: squircle` progressive enhancement on Safari | Success Criterion 2 | Browser feature flag — Safari only; Chrome/Firefox fall back to `border-radius`. | Open app in Safari → inspect a button → confirm `corner-shape: squircle` applied. Open in Chrome → confirm fallback `border-radius: 10px` works. |
| Theme toggle UX feel | Success Criterion 3 | Subjective smoothness assessment; `prefers-reduced-motion` snap behavior is correct visually only when verified by user. | Toggle theme via `useTheme()` API in dev → confirm no flash, no flicker, no `obsidian-*` artifacts. With OS reduced-motion ON, confirm snap (no animated transition). |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (`useTheme.test.tsx`, `themeDriver.test.tsx`, grep-audit)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
