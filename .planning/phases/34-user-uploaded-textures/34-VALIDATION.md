---
phase: 34
slug: user-uploaded-textures
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-22
---

# Phase 34 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Authoritative source: see `34-RESEARCH.md` → `## Validation Architecture` section.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + Playwright (see RESEARCH.md for split) |
| **Config file** | TBD by planner — confirm against existing repo setup |
| **Quick run command** | TBD — planner to specify per Wave 0 |
| **Full suite command** | TBD — planner to specify per Wave 0 |
| **Estimated runtime** | TBD |

---

## Sampling Rate

- **After every task commit:** Run quick suite (planner to fill)
- **After every plan wave:** Run full suite (planner to fill)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** TBD

---

## Per-Task Verification Map

See `34-RESEARCH.md` → `## Validation Architecture` for per-plan validation dimensions.
Populated during planner pass — one row per task generated from PLAN.md files.

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD     | TBD  | TBD  | LIB-06/07/08 | TBD | TBD | ⬜ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Planner to fill from RESEARCH.md test drivers section. Expected drivers (per research):

- [ ] `window.__driveTextureUpload(file: File, name: string, tileSizeFt: number): Promise<string>` — programmatic upload
- [ ] `window.__getUserTextures(): UserTexture[]` — inspect IDB state
- [ ] `window.__driveTextureDelete(id: string): Promise<number>` — returns ref-count at delete time
- [ ] `window.__simulateOrphan(id: string)` — remove from IDB to test fallback path
- [ ] Wave 0 test scaffolding under `src/**/*.test.ts` covering upload / dedup / delete / orphan

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual PBR tiling correctness | LIB-07 | Pixel-exact shader output not reliably diffable in CI | Upload test texture with known 2ft tile; inspect 3D wall at room scale |
| 2D↔3D toggle stability | LIB-07 | Related to VIZ-10 (deferred to Phase 36) | Manual 5x toggle round-trip per RESEARCH.md |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < TBD
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
