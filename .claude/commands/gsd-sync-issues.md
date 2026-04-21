# /gsd:sync-issues

Reconcile GitHub Issues with planning state. Detects and fixes drift between:
- Open issues that actually shipped
- Shipped features that don't have closure comments
- New bugs / UAT gaps that should be issues but aren't
- Orphan phase milestones

Non-destructive by default — shows proposed actions and asks before applying.

---

## When to use

- After a phase ships (catches issues that should have been closed by the PR)
- After a milestone completes (catches stragglers)
- After a big bug-fix session (catches bugs in UAT that never became issues)
- Periodically (once per milestone minimum) to catch generic drift
- Before demos / reviews where the issues list will be seen externally

## What it does (step by step)

### 1. Load planning state

```bash
# Shipped phases
find .planning/phases -name "*-VERIFICATION.md" | sort
# Backlog entries
grep -E "^### Phase 999\." .planning/ROADMAP.md
# UAT gaps (open + deferred)
find .planning/phases -name "*-HUMAN-UAT.md" -exec grep -l "status: failed\|status: partial\|status: deferred" {} \;
# Completed-milestone archives
ls .planning/milestones/
```

### 2. Load GH state

```bash
gh issue list --repo $REPO --limit 500 --state all --json number,title,state,labels,closedAt,body
gh label list --repo $REPO --json name
gh milestone list --repo $REPO --json number,title,state
```

### 3. Cross-reference and compute drift

For each OPEN issue:
- Does its title / body match a shipped feature? → Propose: close with phase reference
- Does it lack a lifecycle label (`planned` / `backlog` / `deferred` / `tech-debt`)? → Propose: add one based on body content
- Is it referenced in ROADMAP.md backlog but has no `backlog` label? → Propose: add label

For each planning entry WITHOUT a GH issue:
- Backlog 999.X without issue → Propose: create issue with `backlog` label
- UAT Gap with `status: failed` or `deferred` without issue → Propose: create issue with `bug` label
- New phase in roadmap without tracking issue → Propose: create tracking issue

For each CLOSED issue:
- Does the close comment reference a phase / PR? → OK
- No reference, closed recently? → Propose: add reference comment (manual verification first)

### 4. Label taxonomy check

Ensure all labels from the CLAUDE.md taxonomy exist. Create missing ones:

```bash
gh label create "backlog" --color "fbca04" --description "Parked in roadmap backlog (999.x) — not yet in active phase"
gh label create "planned" --color "0075ca" --description "Scoped for a future phase in ROADMAP.md"
gh label create "deferred" --color "bfd4f2" --description "Explicitly deferred beyond current milestone"
gh label create "tech-debt" --color "d73a4a" --description "Refactor / upgrade / cleanup item"
gh label create "competitor-insight" --color "5319e7" --description "Idea borrowed from competitor analysis"
# etc — see CLAUDE.md table
```

### 5. Present drift report

Output format:

```
## Issues Drift Report

### Actions ready to apply (safe)
- [ ] Close #61: shipped in Phase 32 — add reference comment
- [ ] Add label `backlog` to #70 (currently missing)
- [ ] Create issue for UAT Gap 1 in 32-HUMAN-UAT.md (wallpaper regression)

### Actions needing human confirmation (risky)
- [ ] #25 labeled `planned` but no phase scheduled — move to `backlog` or drop label?
- [ ] #48 has label `enhancement` only; body references "pending mockups" — add `blocked` label? (label doesn't exist yet)

### No action needed
  ✓ Label taxonomy is complete
  ✓ All shipped phases have closing PRs linked
  ✓ 18 of 20 open issues have proper lifecycle labels
```

### 6. Apply (with user confirmation)

Ask: `Apply all safe actions? [y/N]` — on yes, run the gh commands and report completion.

Never auto-create issues without showing the proposed title + body first.
Never auto-close issues without showing the reason + references.

---

## Arguments

- `--dry-run` (default) — only report drift, don't modify anything
- `--apply` — skip the confirmation prompt and apply all safe actions
- `--scope <area>` — narrow to one area: `backlog`, `shipped`, `uat`, `labels`, `milestones`

## Exit behavior

After running, output:
- Summary of actions taken
- Remaining drift that needs manual attention
- Link to the issues list for visual confirmation

## Implementation notes

- This skill reads ROADMAP.md, all `*-VERIFICATION.md` and `*-HUMAN-UAT.md` files, and calls `gh` CLI
- It must handle rate limiting (gh API has 5000 req/hour, which is plenty but pause if approaching)
- All network calls should be idempotent (closing an already-closed issue is a no-op, not an error)
- Respect the CLAUDE.md label taxonomy — don't invent new labels without explicit user request
