---
phase: 71-token-foundation-token-foundation
verified: 2026-05-07T16:40:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
carry_overs:
  - test: "tests/SaveIndicator.test.tsx"
    reason: "Imports @/components/SaveIndicator which was deleted in a prior phase — pre-existing, not caused by Phase 71"
  - test: "tests/SidebarProductPicker.test.tsx"
    reason: "idb-keyval mock missing createStore — pre-existing from prior phase, not caused by Phase 71"
---

# Phase 71: Token Foundation Verification Report

**Phase Goal:** Mechanical chrome rewrite from Obsidian dark-blue design system to Pascal flat neutral oklch design system across all 7 plans (71-00 through 71-06 / Waves W0-W4).
**Verified:** 2026-05-07T16:40:00Z
**Status:** PASS-WITH-CARRY-OVER (2 pre-existing test failures unrelated to Phase 71 scope)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Pascal oklch tokens defined in src/index.css | VERIFIED | `--background: oklch(0.998 0 0)`, dark-mode block at line 31+, full semantic token set present |
| 2 | useTheme hook exists and is substantive | VERIFIED | `src/hooks/useTheme.ts` — 55 lines, returns `{ theme, resolved, setTheme }` |
| 3 | `__driveTheme` test driver exists | VERIFIED | `src/test-utils/themeDrivers.ts` — 42 lines, gated by `import.meta.env.MODE === "test"` |
| 4 | Geist Sans / Geist Mono / Barlow fonts registered | VERIFIED | `src/index.css` lines 84-85: `--font-sans: 'Barlow', 'Geist Sans'` / `--font-mono: 'Geist Mono'` |
| 5 | Obsidian token classes purged from src/ | VERIFIED | grep count: 2 survivors — both are **comment strings in test files** explaining the migration, not active class usage |
| 6 | Custom Obsidian classes removed (glass-panel, ghost-border, accent-glow, cad-grid-bg) | VERIFIED | grep count: 0 |
| 7 | Material Symbols removed from src/ | VERIFIED | grep count: 0 |
| 8 | CLAUDE.md updated: D-33, D-34, D-03, Theme System | VERIFIED | All four sections updated; Theme System section present with useTheme, room-cad-theme, __driveTheme documentation |

**Score: 8/8 truths verified**

---

## Grep Audit Results (raw counts)

| Pattern | Count | Target | Status |
|---------|-------|--------|--------|
| `obsidian-\|text-text-\|border-outline-variant\|text-accent-light\|text-accent-dim\|text-accent-deep` | 2 | 0 | PASS — 2 survivors are comment strings in test files (migration notes), not active class usage |
| `glass-panel\|ghost-border\|accent-glow\|cad-grid-bg` | 0 | 0 | PASS |
| `material-symbols-outlined` | 0 | 0 | PASS |
| `font-display` | 0 | 0 | PASS |

**Notes on 2 "obsidian" survivors:**
- `src/components/__tests__/RoomsTreePanel.select.test.tsx:17` — comment: `// Phase 71: text-accent-light → text-foreground (Pascal token sweep)`
- `src/components/__tests__/RoomsTreePanel.savedCamera.test.tsx:86` — comment: `// Phase 71 TOKEN-FOUNDATION: text-accent-light → text-foreground (Pascal token sweep)`

These are migration documentation comments, not active Obsidian token usage. Zero impact on goal achievement.

---

## Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/index.css` (Pascal tokens) | VERIFIED | Full oklch token set, Barlow/Geist font vars, 10px base radius (`--radius: 0.625rem`), dark-mode block |
| `src/hooks/useTheme.ts` | VERIFIED | 55 lines, substantive implementation |
| `src/test-utils/themeDrivers.ts` | VERIFIED | 42 lines, `__driveTheme` exposed, StrictMode-safe |
| CLAUDE.md D-33/D-34/D-03 sections | VERIFIED | All updated to Pascal conventions |
| CLAUDE.md Theme System section | VERIFIED | Present with full documentation |

---

## Token System Details

### Radius Scale

Pascal scale in place (not Obsidian 2px):
- `--radius: 0.625rem` (10px base)
- `--radius-sm: calc(var(--radius) - 4px)` (6px)
- `--radius-md: calc(var(--radius) - 2px)` (8px)
- `--radius-lg: var(--radius)` (10px)
- `--radius-xl: calc(var(--radius) + 4px)` (14px)
- Squircle utilities `.rounded-smooth`, `.rounded-smooth-md`, `.rounded-smooth-lg`, `.rounded-smooth-xl` added

### Font Stack

- Sans (chrome): Barlow → Geist Sans → system-ui
- Mono (data identifiers, 2D canvas labels): Geist Mono → ui-monospace → SFMono-Regular → Menlo
- IBM Plex Mono retained only in Fabric canvas drawing contexts (2D overlay labels in `stairSymbol.ts`, `measureSymbols.ts`, `selectTool.ts`, `wallTool.ts`, `fabricSync.ts`) — these are canvas-rendered text strings, not HTML class usage. Acceptable: Fabric does not consume CSS custom properties.

### Icon Policy

Material Symbols: 0 remaining in src/. lucide-react is the sole icon library for HTML chrome.

---

## Test Suite Status

| Suite | Result | Notes |
|-------|--------|-------|
| vitest (unit) | **2 failed / 137 passed / 11 todo** (901 total) | 2 failures are pre-existing, unrelated to Phase 71 |
| Playwright (e2e) | **0 failed / 186 passed** (documented in 71-06 SUMMARY) | All e2e green after stairs.spec.ts fix |

### Pre-Existing Failures (carry-overs, not regressions)

1. **`tests/SaveIndicator.test.tsx`** — imports `@/components/SaveIndicator` which was deleted in a prior phase. Not introduced by Phase 71. No fix in scope.
2. **`tests/SidebarProductPicker.test.tsx`** — idb-keyval mock missing `createStore`. Not introduced by Phase 71. No fix in scope.

Both are documented in 71-06-carry-over-tests-claudemd-SUMMARY.md.

---

## Behavioral Spot-Checks

Step 7b: SKIPPED — Phase 71 is a pure token/chrome rewrite. No new runnable entry points or APIs were added. Behavioral correctness of the CAD engine (Zustand stores, hotkeys, tool system) is unchanged by design. Test suite coverage (137 passing vitest + 186 passing e2e) provides adequate behavioral coverage.

---

## Anti-Patterns Found

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| `src/canvas/stairSymbol.ts:129` | `fontFamily: "IBM Plex Mono, monospace"` hardcoded | Info | Canvas-rendered Fabric text — cannot consume CSS vars. Intentional per D-10 / Phase 71 scope. Not a stub. |
| `src/canvas/measureSymbols.ts` | IBM Plex Mono references | Info | Same as above — Fabric canvas text rendering. Out of Phase 71 scope. Not a stub. |
| `src/canvas/tools/selectTool.ts`, `wallTool.ts`, `fabricSync.ts` | IBM Plex Mono strings | Info | Same — Fabric canvas layer. Intentional carry-over. |

No blockers. No warnings. All anti-patterns are known, intentional Fabric-canvas constraints where CSS custom properties do not apply.

---

## Requirements Coverage

Phase 71 did not declare formal REQ-IDs in REQUIREMENTS.md. Success criteria derived from phase goal and plan frontmatter:

| Criterion | Status |
|-----------|--------|
| Pascal oklch semantic tokens replace Obsidian palette | SATISFIED |
| Barlow + Geist font stack active | SATISFIED |
| 10px base radius (not 2px Obsidian) | SATISFIED |
| lucide-react only for HTML chrome icons | SATISFIED |
| D-09 mixed-case chrome labels applied | SATISFIED (test contracts updated in 71-06) |
| Obsidian custom CSS classes removed | SATISFIED |
| useTheme + __driveTheme infrastructure in place | SATISFIED |
| CLAUDE.md reflects post-71 state | SATISFIED |

---

## Human Verification Required

### 1. Visual Appearance

**Test:** Open the app in browser, check that the UI renders light/neutral Pascal appearance (not dark Obsidian).
**Expected:** White/near-white backgrounds, neutral grays, no dark-blue/purple Obsidian palette visible in chrome.
**Why human:** Cannot verify computed CSS rendering programmatically.

### 2. Dark Mode Toggle

**Test:** Open app, activate dark mode via theme toggle. Verify oklch dark tokens render correctly (dark backgrounds, light foreground text).
**Expected:** Smooth dark/light switch, no flash of unstyled content, `<html class="dark">` applied.
**Why human:** Requires browser rendering verification.

### 3. Font Rendering

**Test:** Check chrome labels render in Barlow (not Inter or Space Grotesk) and data identifiers/canvas overlays in Geist Mono.
**Expected:** Visible typographic difference between chrome text (Barlow sans) and monospace data labels.
**Why human:** Font rendering is a visual check.

---

## Gaps Summary

No gaps found. All 8 must-haves verified. The two remaining vitest failures (`SaveIndicator`, `SidebarProductPicker`) are pre-existing structural issues from prior phase deletions, documented in 71-06 SUMMARY, and explicitly out-of-scope for Phase 71. They do not block the token foundation goal.

IBM Plex Mono references in Fabric canvas drawing code are an intentional architectural constraint (Fabric cannot consume CSS custom properties) and are not Obsidian design system survivors.

---

## Suggested Next Step

Phase 71 goal is achieved. The Pascal oklch token foundation is fully in place. Proceed to the next milestone phase. The 2 pre-existing test failures should be tracked as carry-overs in a future cleanup phase if desired.

---

_Verified: 2026-05-07T16:40:00Z_
_Verifier: Claude (gsd-verifier)_
