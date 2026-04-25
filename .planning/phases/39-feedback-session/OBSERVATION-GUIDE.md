# v1.9 Jessica Feedback Session — Observation Guide

**Use this live during the session. Have it on a second screen / phone.**

---

## What to capture

Watch for these. Each one = one note (verbatim where possible, ≤1 line otherwise).

- [ ] **Every "ugh" / sigh / facial reaction.** Even small ones. The face tells you what the words don't.
- [ ] **Every "I wish it could…" / "why can't I…" / "is there a way to…?"** These are pure feature signal. Capture verbatim.
- [ ] **Every confused pause >3 seconds.** Where she's clearly searching for something and it isn't where she expected. Note WHERE in the UI she was looking.
- [ ] **Every workaround.** She does something the long way around because the direct path didn't occur to her. The long way IS the data — don't correct her.
- [ ] **Every spontaneous question to you.** "How do I do X?" / "Where's the thing for…?" Note the question. Don't answer for ~30s during Segment 1; you can answer during Segment 2.
- [ ] **Every action that surprises you.** She tries something you didn't expect. That's a mismatch between your mental model and hers — note it.
- [ ] **Every time she gives up on a goal.** She wanted to do X, couldn't figure out how, moved on. Note what she abandoned.
- [ ] **Every time she discovers something delightful.** Rare but valuable — what made her smile or say "oh cool"?

**Format while live:**
```
[mm:ss] [surface]: <one-line keyword or quote>
```

Don't write paragraphs while she's mid-action. Write keywords; expand later from memory + recording.

---

## HUMAN-UAT verdict template

Three Phase 35 items must get explicit verdicts. Capture during Segment 2 Tasks B / C / D.

### Eye-level preset (Task B `1`)

**Her actual reaction (verbatim if possible):**
> ___

**Verdict:** `confirmed` / `adjust` / `reject`

**If "adjust" — what change would feel right?** (e.g., "she wanted the camera in the center of the room, not the corner")
> ___

**Followup probe answer:** ("If you had to fix one of those poses, which one and how?")
> ___

---

### easeInOutCubic curve at 600ms (Task C)

**Her reaction to the cancel-and-restart:**
> ___

**Did she comment on the glide speed?** (sluggish / snappy / just right / didn't notice)
> ___

**Verdict:** `confirmed` / `adjust` / `reject`

**If "adjust" — what duration / curve?** (e.g., "she wanted it faster, ~300ms")
> ___

**Followup probe answer:** ("Is the glide too fast, too slow, or about right? Would you want to disable it?")
> ___

---

### Active-preset highlight contrast (Task D)

**Did she find the highlight without instruction?** (yes / no / pointed but unsure)
> ___

**Could she tell which preset was active?** (yes / no / had to look closely)
> ___

**Verdict:** `confirmed` / `adjust` / `reject`

**If "adjust" — what would make it more obvious?** (e.g., "make the background more saturated", "add an outline")
> ___

**Followup probe answer:** ("Would you make it more obvious or is it fine?")
> ___

---

## Recording-summary format (post-session)

After the session, rewatch (or just review live notes) and produce a flat list. This goes to Claude for Plan 39-02 synthesis.

**Format — one line per moment worth capturing:**
```
[mm:ss] [surface] <verbatim quote OR ≤1-line description of what happened>
```

**Examples:**
```
[03:42] [floor texture] "wait, why is this so small now? oh, I made the room bigger."
[07:15] [camera presets] pressed 1, leaned forward, said "that's weird, I'm in the corner"
[12:08] [ceiling resize] tried double-clicking the ceiling 3x, gave up, said "I guess you can't"
[18:30] [Loom delight] laughed when texture dropped onto wall — "oh that's slick"
[24:45] [3D toggle] flipped to 3D and back, said "I keep doing this to check things — wish there was just a slider"
```

**Volume:** ~20-40 entries for a 45-minute session is normal. Fewer = you missed things; more = you're including too much trivia.

**Which moments deserve an entry:**
- ✅ Every line from "What to capture" above
- ✅ Every HUMAN-UAT-relevant reaction (Tasks B/C/D)
- ✅ Anything that made you write a keyword on your live notes
- ❌ Every click / scroll / mouse movement (too granular)
- ❌ Successful task completions with no friction (only note the friction-free completion if it's surprising — like "got it on first try, faster than expected")

---

## Anti-patterns

What NOT to do during the session:

- ❌ **Don't correct her mid-task.** "Oh, you can just press 1 for that" = priming. Wait until she's stuck for ~30s, THEN demo (Segment 1) or probe (Segment 2).
- ❌ **Don't take detailed notes while she's mid-action.** Focus on watching. One keyword per moment, not a sentence.
- ❌ **Don't summarize her reaction in your own words.** Capture verbatim. "She seemed confused" is useless; "She said 'where is the thing for textures?'" is data.
- ❌ **Don't merge multiple observations into one bullet.** Every "ugh" gets its own entry — even if they're 10 seconds apart.
- ❌ **Don't compliment / acknowledge during Segment 1.** No "yeah!" / "exactly!" / "good thinking." Silent means silent.
- ❌ **Don't suggest features.** "What if it had X?" → bias. Let HER suggest.
- ❌ **Don't apologize for missing features.** "Sorry, that's not built yet" → makes her stop trying. Just note the attempt.
- ❌ **Don't transcribe the recording word-for-word.** The summary is enough; full transcripts are wasted effort.

---

## After-session checklist

- [ ] Recording stopped + saved at `~/Movies/v1.9-jessica-session.{mov,mp4}`.
- [ ] Live notes consolidated into recording-summary format above.
- [ ] All 3 HUMAN-UAT verdicts have answers (no "pending" / "unclear").
- [ ] Recording-summary handed off to Claude for Plan 39-02 synthesis.

---

*Locked decisions reference: 39-CONTEXT.md D-01..D-07.*
