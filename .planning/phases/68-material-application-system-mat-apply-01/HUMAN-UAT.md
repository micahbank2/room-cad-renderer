# Phase 68 — Manual checks (Jessica)

Three things to look at before we ship. Five minutes total.

## 1. Does the new "Material" picker feel snappy?

**What we're checking:** The picker should open instantly, scroll smoothly, and apply your pick the moment you click — no spinner, no lag, no "loading…" pause.

Steps:

1. Open the app. Make a new project (or use any project — it doesn't matter which).
2. Use the wall tool to draw any wall (click two points on the canvas).
3. Click that wall to select it.
4. In the right-side panel, find the "Material" section.
5. If your library is empty, click the "Upload Material" button and add at least one. (Any photo works for this test — wood, fabric, marble, a screenshot of a paint chip, anything. You only need one.)
6. Once you have at least one material in the library, you'll see a grid of small squares in the picker. Click any of them.

**Expected:** The wall changes color or pattern in the top-down view immediately. No "loading…" spinner. No delay over half a second on the first click.

Tell me if it ever feels laggy, if the picker takes more than a second to open, or if you click a material and nothing seems to happen.

## 2. Does the wall actually look right in 3D?

**What we're checking:** Apply a tile-style material (like marble or a wood plank pattern), switch to the 3D view, and confirm the tiles look the right size for a real room — not stretched, not weirdly tiny, not weirdly huge.

Steps:

1. Continuing from check #1, click the "3D View" button in the top toolbar (the cube-shaped icon).
2. Look at the wall you just put a material on.

**Expected:**

- The material covers the whole wall — no white gaps, no untextured patches.
- The pattern looks like real-world tiles. A "1 ft tile" pattern should look about the size of a real 1 ft floor tile when you stand in front of it. Not the size of a postage stamp; not the size of a door.
- No flickering, shimmering, or weird stripes when you orbit around or zoom in.

Tell me if anything looks stretched, blurry, or sized wrong (way too big or way too small for a real room).

## 3. Does an old project still look correct after the update?

**What we're checking:** Any project you saved BEFORE this update should auto-convert to the new system without losing colors, wallpapers, or floor materials.

Steps:

1. Open a project you've worked on before this update — one that already has paint colors or wallpaper applied to walls. (Pick any saved project from the home screen.)
2. Wait for it to load.
3. Look at every wall, floor, and ceiling that previously had a color, wallpaper, or floor material.
4. Save the project (Ctrl+S, or just wait — autosave runs after about 2 seconds).
5. Close the tab and reopen the project.

**Expected:** Every painted wall, every wallpapered wall, every floor pattern that was there before is STILL there. Nothing is plain white. Nothing has reverted to a default. No error pop-ups.

Tell me if ANYTHING looks different from before — even one wall that lost its paint is worth flagging.

---

## Issues found

*(Jessica fills in or speaks aloud; Claude transcribes into the corresponding GitHub issue with `bug` + `phase-68` labels per CLAUDE.md global rules.)*
