# Phase 39: Real-Use Feedback Session — Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Run a scheduled real-use session with Jessica. Capture friction, feature wishes, and Phase 35 HUMAN-UAT verdicts. Synthesize a ranked-priority document at `.planning/feedback/v1.9-jessica-session.md` that informs Phases 40-41 ordering AND seeds the v2.0 scoping discussion.

This is a **process phase**. The "implementation" is a human-led session that Claude cannot perform — Claude's role is pre-session structure, post-session synthesis, and the final deliverable doc. Work proceeds in two acts separated by Jessica's actual session.

**In scope:**
- Pre-session structure: session script, observation guide, recording setup, test-environment prep
- Post-session synthesis: friction points, feature wishes, HUMAN-UAT verdicts, top-3 ranked priorities, backlog candidates
- Single deliverable doc at `.planning/feedback/v1.9-jessica-session.md`

**Out of scope:**
- Implementing anything Jessica asks for (that becomes Phase 40+ or v2.0 scope)
- Adversarial / formal usability testing methodology — this is a friendly partner session, not a research study
- Recording transcripts (recording itself is fine; Claude doesn't transcribe)
</domain>

<decisions>
## Implementation Decisions

### Session format
- **D-01:** Hybrid format. ~45-60 min total: 15 min open-ended exploration ("design a real room you're considering") followed by 30 min of scripted tasks targeting Phase 35 HUMAN-UAT items + specific areas Micah wants signal on.
- **Reason:** Open-ended surfaces genuine workflow pain that scripted tasks miss. Scripted ensures HUMAN-UAT items get a verdict and that we cover known unknowns. Hybrid balances both.

### Probing during session
- **D-02:** Silent observation during the open-ended segment. Probe with "what did you expect?" / "why did you try that?" during the scripted segment.
- **Reason:** Silent gets natural behavior + surfaces unconscious workarounds. Probing during scripted captures mental model where it matters for design decisions. Mixed mode in one segment muddles the data.

### Recording
- **D-03:** Screen recording (QuickTime or Loom) stored locally. Linked from the deliverable doc as a `[Recording: ~/Movies/v1.9-jessica-session.mov]`-style local-path reference — NOT committed to git, NOT uploaded to a third party.
- **Reason:** Recording catches "ugh" moments Micah misses while observing. Storing locally avoids leaking Jessica's voice/screen content to a third party. Local-path link is sufficient for follow-up if Claude needs raw evidence later.

### Phase 35 HUMAN-UAT folding
- **D-04:** Fold the 3 Phase 35 HUMAN-UAT items into the scripted segment, NOT a separate "design review" sub-session. Each item gets explicit verdict: confirmed / adjust / reject.
  - Eye-level preset interpretation (corner-stand at `(0, 5.5, 0)` looking at room center)
  - easeInOutCubic curve at 600ms
  - Active-preset highlight contrast
- **Reason:** Folding is more natural — Jessica encounters them as part of normal use rather than a rubric. Verdicts force a binary call instead of vague "looks fine I guess."

### Synthesis division of labor
- **D-05:** Micah supplies raw notes (or a recording-summary) after the session. Claude drafts the deliverable doc from those notes. Micah reviews and edits the draft.
- **Reason:** Micah was in the room — his memory and judgment of "what mattered" beats Claude inferring from a transcript. Claude's strength is structuring the doc consistently and ensuring the required sections exist.

### Plan structure
- **D-06:** Two plans. Plan 1 ships the session structure + script + recording prep — committable without Jessica being present. Plan 2 ships the synthesized deliverable doc — gated on the session actually happening + Micah supplying notes.
- **Reason:** Plan 1 is independently valuable (committed session script in the repo). Plan 2 captures the actual feedback. Splitting prevents Plan 1 from being blocked indefinitely on Jessica's calendar.

### Acceptance content thresholds
- **D-07:** Deliverable doc must contain ≥3 friction points (with task context), ≥3 feature wishes (in Jessica's framing), 3/3 HUMAN-UAT verdicts, and a top-3 ranked-priority list. Items not in the top 3 captured as backlog candidates (don't lose them).
- **Reason:** Concrete acceptance prevents "we did the session" without producing actionable output. Top-3 forces ranking — without it, every wish becomes "high priority" and the doc is useless for Phase 40-41 ordering.

### Format adaptation: async questionnaire
- **D-08 (added 2026-04-25 during Plan 39-02 execution):** Hybrid in-person session (D-01) was infeasible in v1.9's window due to Micah's calendar. Adapted to a 5-question async questionnaire format. Trade-off accepted: less rich signal (no observation, no probes, no body language) in exchange for real signal that can ship inside the milestone. **Rejected alternative:** Claude roleplaying Jessica — would generate confabulated signal with false confidence. Honest "no friction reported" beats invented friction.
- **Reason:** Time pressure made the choice between (a) skipping FEEDBACK-01, (b) deferring Phase 39 to next milestone, (c) Claude roleplaying, or (d) async questionnaire. Option (d) was the only path that produced real-but-thin signal inside v1.9. Caveat: deliverable doc explicitly flags single-data-point bias and recommends follow-up hybrid session when time permits.

### Claude's Discretion
- Exact wording of the session script's scripted tasks (Plan 1 task)
- Which order to present scripted tasks (Plan 1 task)
- Doc section ordering in the deliverable (Plan 2 task — keep CAM-01 acceptance-style format if it fits)
- Whether to include a "categorize backlog candidates by surface area" sub-table (Plan 2 task — only if there are >5 backlog items worth grouping)

</decisions>

<specifics>
## Specific Ideas

- **Recording-summary instead of full transcript:** if Jessica records, Micah can rewatch, jot timestamps + verbatim quotes in a flat list, and pass that to Claude. Easier than transcribing.
- **Test environment:** use a fresh project, NOT one of Jessica's in-progress designs. Avoids her getting precious about not breaking it. Suggest: "design the master bedroom for our actual house."
- **Forbid pre-session priming:** Micah should NOT walk Jessica through new features before the session. The session is most valuable when she runs into things cold. If she asks "wait, is there a way to…?", note it and let her struggle for ~30s before answering.
- **Capture the workarounds:** when she does something the long way around, that IS the data. Don't correct her — note it.
- **HUMAN-UAT verdict format:** for each of the 3 items, capture: (a) her actual reaction, (b) verdict (confirmed / adjust / reject), (c) what the adjustment would be if "adjust."

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before authoring:**

### Requirements
- `.planning/REQUIREMENTS.md` §FEEDBACK-01 (acceptance criteria)
- `.planning/ROADMAP.md` §Phase 39 (scope statement)

### Phase 35 HUMAN-UAT items (must get verdicts)
- `.planning/phases/35-camera-presets/35-CONTEXT.md` (locked decisions, including Eye-level interpretation per planner)
- `.planning/phases/35-camera-presets/35-02-motion-SUMMARY.md` (HUMAN-UAT items section)
- `.planning/phases/35-camera-presets/35-VERIFICATION.md` (Human Verification Required section)

### Existing backlog already named (so we don't re-discover)
- Phase 999.1 (ceiling resize handles) — already promoted to Phase 40
- Phase 999.3 / [GH #105](https://github.com/micahbank2/room-cad-renderer/issues/105) (per-surface texture tile-size override) — already promoted to Phase 41
- HUMAN-UAT items folded into D-04 above

### Output target
- New file: `.planning/feedback/v1.9-jessica-session.md` (will create this directory)

</canonical_refs>

<deferred>
## Deferred Ideas

- **Multi-session feedback program** — repeat sessions every milestone. Worth doing but not formalized this milestone; Phase 39 is a one-off.
- **Quantitative metrics** (task completion time, click count, etc.) — out of scope. This is qualitative friction-finding, not a usability study.
- **Micah's own feedback as a power user** — Micah has a different mental model than Jessica. His pain points are valuable but separate from FEEDBACK-01's deliverable.
- **External testers** — the app is built for Jessica specifically. Other testers would surface different things; out of scope.

</deferred>

---

*Phase: 39-feedback-session*
*Context gathered: 2026-04-25*
