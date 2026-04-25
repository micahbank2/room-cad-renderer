# v1.9 Jessica Feedback Session — Script

**Format:** Hybrid — 15 min open-ended exploration + 30 min scripted tasks + 5 min wrap. Total ~50 min.
**Locked decisions:** Phase 39 CONTEXT.md D-01..D-07.

---

## Pre-session checklist

Before Jessica sits down:

- [ ] **Fresh project loaded.** NOT one of her in-progress designs — open a new blank project. Prevents her from being precious about not breaking anything.
- [ ] **Recording running.** QuickTime (macOS: ⇧⌘5 → Record Selected Portion → grab the browser window) or Loom. Save target: `~/Movies/v1.9-jessica-session.mov`. Do NOT upload to a third-party service. Do NOT commit the file.
- [ ] **Observation guide open** on a second screen / phone. Don't share-screen the guide.
- [ ] **Browser at clean app URL.** Latest dev or production preview, whichever Jessica would normally use.
- [ ] **No other apps in foreground.** Notifications off, Slack/email closed.
- [ ] **DO NOT prime her.** Do not walk her through any new features added since she last used the app. Do not say "wait until you see X." She must hit everything cold.

---

## Segment 1 — Open exploration (15 min)

**Prompt to Jessica (verbatim):**

> "Design the master bedroom for our actual house. The room is whatever size you remember it being. Place whatever furniture you'd want there. Take as long as you want — pretend I'm not here."

**Your behavior:** Silent. Take notes only on what's worth noting (every "ugh" / "I wish" / >3-second confused pause / unexpected workaround / spontaneous question). Do NOT answer questions she asks aloud. Do NOT correct her. Do NOT show her shortcuts.

**If she asks "wait, is there a way to…?":** Note the question + its timestamp. Wait ~30 seconds. If she's still stuck, say "yes, here's how" and demo it briefly. The 30-second hesitation IS the data — that's the moment she expected something to be discoverable and it wasn't.

**If she gets visibly frustrated:** Don't intervene. Note the frustration. The point is to surface friction, not to comfort.

**End trigger:** ~15 min, OR when she says she's "done" / "this looks good" — whichever comes first. If she's still actively engaged at 15 min, let it run to 20.

---

## Segment 2 — Scripted tasks (30 min, with probing)

**Probing rules:** Now you can ask "what did you expect?" / "why are you doing it that way?" — but ONLY after she's tried something. Don't probe before she acts. Don't suggest answers.

**Setup between tasks:** If a task requires a specific state, get there for her. Don't make her undo her bedroom design between probes. Tell her "I'm going to load a fresh room for the next thing" and reset.

### Task A — Apply a custom uploaded texture (LIB-06 / texture pipeline)

**Setup:** Reset to a fresh project with a single 12×12 room and 4 walls. Have a sample image file (a photo of wood / fabric / wallpaper she'd actually use) on the desktop.

**Prompt:** "I want you to put this texture on one of the walls."

**What to watch for:**
- Does she find the upload button?
- Does she figure out the tile-size input?
- Does she try drag-and-drop before the upload button?
- Does the picker tab discovery feel natural?
- Does she trust the texture preview matches what'll render?

**Probe after:** "Did the tile size make sense? Was there a moment you got stuck?"

### Task B — Camera presets via hotkeys (CAM-01 + Phase 35 HUMAN-UAT eye-level pose)

**Setup:** Switch to 3D view in the room from Task A.

**Prompt:** "Press `1`, then `2`, then `3`, then `4`. Tell me what happens and whether each one looks right."

**What to watch for:**
- Eye-level (`1`): Does the pose feel like "standing in the room"? Or does the corner-stand at `(0, 5.5, 0)` feel weirdly cornered? **HUMAN-UAT verdict #1**.
- Top-down (`2`): Reaction.
- 3-quarter (`3`): Reaction (this is the v1.7.5 baseline — should feel familiar).
- Corner (`4`): Reaction.

**Probe after:** "If you had to fix one of those poses, which one and how?" → captures the eye-level adjustment if needed.

### Task C — Mid-tween cancel (CAM-02 + Phase 35 HUMAN-UAT easing feel)

**Prompt:** "Press `1` and as soon as the camera starts moving, press `3`."

**What to watch for:**
- Does the cancel feel smooth or stuttery?
- Does the 600ms duration feel right? (sluggish? snappy? just right?)
- **HUMAN-UAT verdict #2**.

**Probe after:** "Is the glide too fast, too slow, or about right? Would you want to disable it?"

### Task D — Active-preset highlight (Phase 35 HUMAN-UAT highlight contrast)

**Prompt:** "Looking at the toolbar, can you tell which preset is currently active?"

**What to watch for:**
- Does she find the highlight without instruction?
- Is the `bg-accent/20 text-accent-light border-accent/30` triad legible against the obsidian-deepest toolbar background?
- **HUMAN-UAT verdict #3**.

**Probe after:** "Would you make it more obvious or is it fine?"

### Task E — Try to resize a ceiling (CEIL-01 ground truth)

**Setup:** Switch to 2D view. Click the ceiling.

**Prompt:** "Try to resize the ceiling — make it smaller."

**What to watch for:**
- Does she look for edge handles like products / walls have?
- Does she try dragging? Try the properties panel?
- How long until she gives up or asks?
- This is the ground-truth signal for whether Phase 40 (CEIL-01) hits a real pain point.

**Probe after (only after she's struggled or given up):** "What did you expect to be able to do here?"

### Task F — Big floor + same texture (TILE-01 ground truth)

**Setup:** Reset to a fresh project. Set the room to 30×30 (large). Apply `wood-oak` (or any tiled bundled texture) to the floor.

**Prompt:** "Look at the floor. Now imagine you wanted to see what it'd look like with bigger planks."

**What to watch for:**
- Does she immediately try to scale the texture?
- Does she look for a tile-size input on the surface?
- Does she try re-uploading?
- Does she give up?
- This is the ground-truth signal for whether Phase 41 (TILE-01) hits a real pain point.

**Probe after:** "If there was a way to scale just THIS floor's texture, would you want it?"

### Task G — Micah's wildcard

Pick 2-3 additional probes targeting whatever specific signal you want. Suggested candidates:
- Walk-mode UX (does she find it? does she enjoy it?)
- Auto-save trust (does she notice the indicator? does she trust it?)
- Multi-room navigation (if applicable to her workflow)
- Drag-resize a wall endpoint (Phase 31 feature — does it feel natural?)

**Cap total Segment 2 at 30 min.** Skip remaining tasks if running long.

---

## Segment 3 — Wrap (5 min)

**Prompt:** "Two questions:
1. What would make you reach for this app more often?
2. If we could only fix or build ONE thing in the next month, what would you want it to be?"

Capture verbatim. No editorializing. No follow-up unless she asks.

---

## Recording setup details

**macOS QuickTime:**
1. Open QuickTime Player.
2. File → New Screen Recording (or ⇧⌘5 in Big Sur+).
3. Click "Record Selected Portion."
4. Drag a box around the browser window. Click "Record."
5. (Optional) Click the chevron next to the record button → "Microphone" → "Internal Microphone" if you want her audio for verbatim quotes. Otherwise default (no audio) is fine.
6. After session: ⌘ + Control + Esc to stop. Save as `~/Movies/v1.9-jessica-session.mov`.

**Loom:**
1. Loom desktop app → New Recording → Screen + Cam (cam off) or Screen Only.
2. Select browser window. Start.
3. After session: download the .mp4. Save as `~/Movies/v1.9-jessica-session.mp4`.
4. **Do NOT leave it on Loom's cloud** — delete from Loom after downloading.

**Storage:**
- Local path only. Linked from `.planning/feedback/v1.9-jessica-session.md` as `~/Movies/v1.9-jessica-session.{mov,mp4}`.
- Do NOT commit to git (file too large + privacy).
- Do NOT upload to Drive / Slack / etc. — recording stays on Micah's machine.

---

## After session — handoff to synthesis

Once the session ends, Micah:

1. Stops recording, saves the file.
2. Reviews the recording (or live notes) and produces a flat list per OBSERVATION-GUIDE.md "recording-summary format" — `[mm:ss] [surface] [verbatim quote or ≤1-line description]`. Aim for 20-40 entries.
3. Provides the summary to Claude in the next conversation turn.
4. Claude executes Plan 39-02 (synthesis) — drafts the deliverable doc.
5. Micah reviews the draft, edits, commits.

---

*Locked decisions reference: 39-CONTEXT.md D-01..D-07.*
