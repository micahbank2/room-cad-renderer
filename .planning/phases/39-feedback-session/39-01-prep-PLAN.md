---
phase_number: 39
plan_number: 01
plan_name: prep
phase_dir: .planning/phases/39-feedback-session
objective: >
  Pre-session structure for the Jessica feedback session. Produces (a) the
  session script with open-ended + scripted segments, (b) the observation
  guide listing what to capture, (c) recording setup notes, and (d) the
  empty deliverable doc skeleton with required sections. Committable
  without Jessica being present — independently valuable as a committed
  session protocol.
requirements_addressed: [FEEDBACK-01]
depends_on: []
wave: 1
autonomous: true
files_modified:
  - .planning/phases/39-feedback-session/SESSION-SCRIPT.md
  - .planning/phases/39-feedback-session/OBSERVATION-GUIDE.md
  - .planning/feedback/v1.9-jessica-session.md
must_haves:
  truths:
    - "SESSION-SCRIPT.md exists with: 15-min open-ended segment ('design the master bedroom for our actual house' or similar real task), 30-min scripted segment with 6-10 tasks targeting Phase 35 HUMAN-UAT + known unknowns, explicit silent-vs-probe rules per segment (D-02), and a 5-min wrap question prompt"
    - "OBSERVATION-GUIDE.md exists with: what-to-capture checklist (every 'ugh', every 'I wish', every confused pause, every workaround), HUMAN-UAT verdict template for the 3 items (eye-level pose / easing / highlight contrast), and post-session recording-summary format"
    - "v1.9-jessica-session.md skeleton exists with empty required sections per D-07: friction points, feature wishes, 3 HUMAN-UAT verdicts, top-3 ranked priorities, backlog candidates"
    - "Recording setup documented in SESSION-SCRIPT.md: QuickTime/Loom local-only, link from deliverable doc as local path, NOT committed (D-03)"
    - "All session structure decisions match CONTEXT.md D-01..D-07; no deviations"
---

# Phase 39 Plan 01 — Pre-Session Prep

## Context

Locks the session protocol in the repo so it's reproducible + reviewable. Plan 2 ships the actual feedback synthesis after Jessica's session.

3 files produced (no code; all docs).

---

## Task 1 — SESSION-SCRIPT.md

**Read first:**
- `.planning/phases/39-feedback-session/39-CONTEXT.md` (D-01..D-07)
- `.planning/phases/35-camera-presets/35-VERIFICATION.md` Human Verification Required (3 HUMAN-UAT items)
- `.planning/REQUIREMENTS.md` §FEEDBACK-01

**Write:** `.planning/phases/39-feedback-session/SESSION-SCRIPT.md`

**Required sections:**

1. **Pre-session checklist** — fresh project (NOT Jessica's WIP), recording app open, observation guide nearby, browser at clean app URL, no priming about new features.

2. **Segment 1 — Open exploration (15 min)** — single prompt to Jessica: "design the master bedroom for our actual house" (or whichever real room she's currently thinking about). Micah observes silently. Capture every "ugh" / "I wish" / confused pause / workaround. NO probing.

3. **Segment 2 — Scripted tasks (30 min, with probing)** — 6-10 tasks. Each task has: setup (state to land in before the task), task prompt (what to say to Jessica), what to watch for (specific friction), and probe questions ("what did you expect?", "why are you doing it that way?"). Tasks must include:
    - Apply a custom uploaded texture to a wall (LIB-06 path)
    - Switch to top-down preset → eye-level → 3-quarter via hotkeys (CAM-01 + Phase 35 HUMAN-UAT eye-level pose)
    - Trigger a preset mid-tween cancel (CAM-02 + Phase 35 HUMAN-UAT easing feel)
    - Notice the active-preset highlight (Phase 35 HUMAN-UAT contrast)
    - Resize a ceiling (currently can't — captures CEIL-01 ground truth before Phase 40)
    - Apply same texture to a much bigger floor (captures TILE-01 ground truth before Phase 41)
    - 2-3 additional Micah-chosen tasks targeting whatever specific signal he wants

4. **Segment 3 — Wrap (5 min)** — open prompt: "what would make you reach for this app more often?" Micah captures verbatim, no editorializing.

5. **Recording setup** — QuickTime or Loom; record screen (not webcam unless Jessica wants it). Save to `~/Movies/v1.9-jessica-session.{mov,mp4}`. Linked from deliverable doc as local-path reference, NOT committed to git, NOT uploaded to a third party.

6. **Forbid priming note** — explicit: do NOT walk Jessica through new features before the session. If she asks "wait, is there a way to…?", note it and let her struggle for ~30s before answering. The hesitation is data.

**Acceptance:**
- File exists at the named path
- All segments + recording setup + priming-forbid present
- Scripted tasks include the 3 HUMAN-UAT items + ground-truth probes for CEIL-01/TILE-01

**Commit:** `docs(39-01): session script with hybrid open + scripted format`

---

## Task 2 — OBSERVATION-GUIDE.md

**Read first:**
- Task 1's SESSION-SCRIPT.md
- `.planning/phases/39-feedback-session/39-CONTEXT.md` D-04 (HUMAN-UAT verdict format)

**Write:** `.planning/phases/39-feedback-session/OBSERVATION-GUIDE.md`

**Required sections:**

1. **What to capture** (checklist — Micah uses this live during the session):
    - Every "ugh" / sigh / facial reaction
    - Every "I wish it could…" / "why can't I…"
    - Every confused pause (>3 seconds where she's clearly searching)
    - Every workaround (she does something the long way because the direct path didn't occur to her)
    - Every spontaneous question to you ("how do I do X?")
    - Every action she takes that surprises you (didn't expect her to try that)

2. **HUMAN-UAT verdict template** — for each of the 3 Phase 35 items, capture:
    - **Eye-level preset:** Her actual reaction when she pressed `1` (verbatim if possible). Verdict: confirmed / adjust / reject. If adjust: what change?
    - **easeInOutCubic at 600ms:** Did she comment on the glide? Did it feel sluggish or snappy? Verdict + adjustment.
    - **Active-preset highlight contrast:** Did she look at the toolbar to confirm a preset was active? Could she tell which one was highlighted? Verdict + adjustment.

3. **Recording-summary format** — after the session, Micah rewatches (or just reviews live notes) and produces a flat list:
    - `[mm:ss]` `[surface]` `[verbatim quote or ≤1-line description]`
    - Example: `[03:42] [floor texture]` "wait, why is this so small now? oh, I made the room bigger."
    - One line per moment worth capturing. ~20-40 entries for a 45-min session is normal.

4. **Anti-patterns** — what NOT to do:
    - Don't correct her mid-task ("oh, you can just press 1 for that") — that's priming
    - Don't take detailed notes while she's mid-action — focus on watching, jot a single keyword
    - Don't summarize her reaction in your own words — capture verbatim
    - Don't merge multiple observations into one bullet — every "ugh" gets its own entry

**Acceptance:**
- File exists at the named path
- All 4 sections present
- HUMAN-UAT verdict template covers all 3 Phase 35 items by name

**Commit:** `docs(39-01): observation guide with HUMAN-UAT verdict template`

---

## Task 3 — Deliverable skeleton

**Read first:**
- `.planning/phases/39-feedback-session/39-CONTEXT.md` D-07 (acceptance content thresholds)
- `.planning/REQUIREMENTS.md` §FEEDBACK-01 (acceptance criteria)

**Write:** `.planning/feedback/v1.9-jessica-session.md` (creates the `feedback/` directory)

**Required sections (empty for now — Plan 2 fills these in):**

```markdown
# v1.9 Real-Use Feedback Session — Jessica

**Session date:** YYYY-MM-DD
**Duration:** XX min
**Project used:** [room name]
**Recording:** `~/Movies/v1.9-jessica-session.{mov,mp4}` (local; not committed)

## Friction points

(Minimum 3 per FEEDBACK-01 acceptance. Each entry: what she was doing → what she hit → her reaction.)

1. TBD
2. TBD
3. TBD

## Feature wishes

(Minimum 3, in Jessica's framing. Capture verbatim quotes where possible.)

1. TBD
2. TBD
3. TBD

## Phase 35 HUMAN-UAT verdicts

### Eye-level preset interpretation
- **Reaction:** TBD
- **Verdict:** confirmed / adjust / reject
- **Adjustment (if any):** TBD

### easeInOutCubic curve at 600ms
- **Reaction:** TBD
- **Verdict:** confirmed / adjust / reject
- **Adjustment (if any):** TBD

### Active-preset highlight contrast
- **Reaction:** TBD
- **Verdict:** confirmed / adjust / reject
- **Adjustment (if any):** TBD

## Top-3 ranked priorities

(Synthesized from above + your judgment. These reorder Phases 40/41 if needed AND seed v2.0 scope.)

1. TBD — rationale
2. TBD — rationale
3. TBD — rationale

## Backlog candidates

(Everything else worth remembering but not in top-3. Each entry: short title + 1-line context. Group by surface if >5.)

- TBD

## Phase 40/41 reorder decision

(Stated explicitly: do CEIL-01 and TILE-01 stay as-planned, or does the feedback bump them to v2.0+?)

- **CEIL-01 (Phase 40):** keep as-planned / bump to v2.0+ / reorder before Phase 40
- **TILE-01 (Phase 41):** keep as-planned / bump to v2.0+ / reorder before Phase 41
- **Rationale:** TBD

## v2.0 scope seeds

(Items from this session that should inform v2.0 milestone scoping when Micah runs `/gsd:new-milestone` next.)

- TBD

---

*Drafted: YYYY-MM-DD*
*Author: Claude (synthesis from Micah's notes/recording-summary, per Phase 39 D-05)*
```

**Acceptance:**
- File exists at `.planning/feedback/v1.9-jessica-session.md`
- All 7 sections present with TBD placeholders
- Local-path recording reference, NOT committed file

**Commit:** `docs(39-01): deliverable skeleton + complete pre-session prep plan`

The third commit also writes `39-01-prep-SUMMARY.md`, updates STATE.md, and updates ROADMAP.md (39: 0/2 → 1/2).

---

## Plan-level acceptance criteria

- [ ] All 3 files exist at expected paths
- [ ] SESSION-SCRIPT.md covers all CONTEXT.md decisions D-01..D-07
- [ ] OBSERVATION-GUIDE.md HUMAN-UAT template covers all 3 Phase 35 items
- [ ] Deliverable skeleton has all 7 required sections (friction points, wishes, HUMAN-UAT × 3, top-3, backlog, Phase 40/41 decision, v2.0 seeds)
- [ ] No code changes
- [ ] SUMMARY.md created at `.planning/phases/39-feedback-session/39-01-prep-SUMMARY.md`
- [ ] STATE.md + ROADMAP.md updated

---

*Plan: 39-01-prep*
*Author: orchestrator-inline (process phase, no judgment calls deferred)*
