---
phase: 45
slug: auto-generated-material-swatch-thumbnails-thumb-01
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-25
---

# Phase 45 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (matches existing `pbrTextureCache.test.ts` setup) |
| **Config file** | `vitest.config.ts` (or inline in `vite.config.ts`) |
| **Quick run command** | `npx vitest run --reporter=basic <single-test-file>` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10–20 seconds full suite |

---

## Sampling Rate

- **After every task commit:** Run quick test for the touched module
- **After every plan wave:** Run full suite (`npx vitest run`)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

> Filled in during planning — planner must populate one row per task with the
> automated command and the requirement it verifies. THUMB-01 is the only
> requirement and ALL tasks must trace back to it.

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 45-XX-XX | TBD | TBD | THUMB-01 | unit / integration | `{command}` | ✅ / ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Per RESEARCH.md, the test environment (happy-dom) has NO WebGL. The thumbnail
renderer module MUST be testable via mocking. Wave 0 must cover:

- [ ] `src/three/thumbnailRenderer.test.ts` — mocks `THREE.WebGLRenderer` (mirror
      the `vi.mock("three", ...)` pattern from `src/three/__tests__/pbrTextureCache.test.ts`)
      and asserts: (a) renderer reused across calls, (b) returns a non-empty
      data URL string for a valid material, (c) returns `"fallback"` sentinel
      for a material whose texture load throws.
- [ ] `src/lib/materialThumbnailCache.test.ts` — asserts: (a) cache hit returns
      same dataURL without re-render, (b) invalidation on material id collision,
      (c) `"fallback"` sentinel can be cached and read back.
- [ ] `src/components/MaterialThumbnail.test.tsx` (or equivalent) — asserts:
      (a) renders `<img>` when cache returns dataURL, (b) renders solid base-color
      tile fallback when cache returns `"fallback"`, (c) Suspense fallback shown
      while pending, (d) opacity-crossfade duration is `0` when
      `useReducedMotion()` returns true (D-39).

*Existing `pbrTextureCache.test.ts` provides the canonical mock pattern.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual parity between thumbnail and in-scene material rendering | THUMB-01 | Pixel-exact equality is fragile across GPUs / drivers; sampling base color is automated, but human eye is final arbiter | Open `FloorMaterialPicker`, select each material, compare swatch vs floor preview in 3D view |
| Suspense fallback feels snappy on first picker open (no jank) | THUMB-01 | Perceived performance is subjective | Cold-load the app, open picker, observe whether base-color tiles flash before thumbnails appear |
| Reduced-motion crossfade actually snaps (no fade) | THUMB-01 / D-39 | OS-level preference; automated check is in unit test but visual confirm matters | macOS: System Settings → Accessibility → Display → Reduce Motion ON, reload app, open picker — thumbnails should appear instantly with no opacity transition |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (3 test files above)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
