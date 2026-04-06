---
phase: 20
slug: advanced-materials
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (if configured) or manual verification |
| **Config file** | none — project uses manual verification |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build && npm run preview` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run build && npm run preview`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 1 | MAT-01 | build | `npm run build` | ✅ | ⬜ pending |
| 20-01-02 | 01 | 1 | MAT-01 | build | `npm run build` | ✅ | ⬜ pending |
| 20-02-01 | 02 | 2 | MAT-02 | build+visual | `npm run build` | ✅ | ⬜ pending |
| 20-02-02 | 02 | 2 | MAT-03 | build | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Unified material picker shows both floor and ceiling presets | MAT-01 | Visual UI verification | Open material picker for floor, verify ceiling presets visible; repeat for ceiling |
| Ceiling texture renders without tile scale corruption in split view | MAT-02 | 3D rendering visual check | Apply ceiling texture, open split view, verify no corruption |
| Legacy projects load without errors | MAT-03 | Data migration check | Load a project saved before v1.3, verify floor materials intact |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
