# Making Changes to Room CAD Renderer

A plain-English guide to changing the app without writing code. Aimed at the person who *uses* the app (Jessica, or anyone in her shoes) and wants to make it work better for them.

---

## What you can change without any code

A lot. The app is designed so the day-to-day editing — the parts you'd want to tweak as you design — all happens through the interface, not through code. Here's what's fully under your control via the UI:

- **Room dimensions.** Change width, length, and ceiling height in the **Room Settings** panel in the sidebar. Type new numbers, hit Enter, the room updates instantly.
- **Adding more rooms.** Use the **+ Add Room** button in the sidebar's Rooms section. Each project can have multiple rooms, each with their own walls and products.
- **Walls, doors, windows.** Draw, move, delete, and resize them with the toolbar (see USER-GUIDE.md for the full list).
- **Uploading new products.** Click **Library → Add Product**, fill in the name, category, real-world dimensions, photo, and material finish. Save. The product is now in your library and reusable across every project.
- **Swapping materials and finishes.** Each product has a material finish field (wood / fabric / metal / etc.). Edit it in the product's properties.
- **Labels.** Add text labels anywhere on the canvas with the Label tool (T).
- **Renaming projects.** Click the project name at the top of the sidebar and type a new one. Auto-saves.
- **Switching theme.** Settings gear → Light / Dark / System.

If you find yourself wishing the app behaved differently in any of *those* areas, you can usually just do it in the UI — no code needed.

---

## What requires code changes

"Requires code" means: someone (Claude, or a developer) has to edit the app's source files, test the change, and ship a new version of the app. Examples of things that fall into this bucket:

- **New tools in the toolbar** (e.g. "I want a curved-wall tool").
- **New 3D model formats** (e.g. supporting uploaded GLTF / OBJ furniture models — not built yet).
- **New product categories** beyond the existing list.
- **Different snap behavior** (e.g. snap to a 4-inch grid instead of 3 / 6 / 12).
- **Visual redesign** — colors, fonts, layout, icons.
- **Bug fixes** — anything that's broken or doesn't work as expected.
- **New file types you can export** (PDF, DXF, etc.).
- **Cloud sync, sharing, collaboration** — anything that involves saving outside your own browser.

The good news: you don't need to learn how to code to ask for any of these. Read on.

---

## How to ask Claude for changes

This whole project is built with **Claude Code** — an AI coding assistant. You describe what you want in plain English, Claude proposes a plan, and (if you say go) Claude writes the code, tests it, and ships it. You never have to read or write a line of TypeScript.

The basic flow:

1. **You describe what you want** — in your own words. "I want the door tool to default to a 30-inch door instead of 3 feet." "I want a button that exports the floor plan as a PDF." "When I drag a window, I want it to snap to the center of the wall." The more specific you are about what you'd *see* on screen, the better — but you don't need to know the technical terms.
2. **Claude proposes a plan** — a short writeup of what it would change, where, and what could go wrong. You read it. If anything looks off, you push back ("no, I meant the door tool, not the window tool"). If it looks right, you say go.
3. **Claude ships it** — writes the code, runs tests, opens a Pull Request (PR). You can ignore the technical details. The important part: it gives you a link to a deployed version of the change so you can click around and feel it.
4. **You test it** — actually use the new behavior. Does it do what you wanted? Did it accidentally break something else? Take a few minutes. There's no rush.
5. **You say "merged"** — and Claude finishes the deploy. Now the change is in your main app for good.

If the change doesn't feel right, you say "back it out" and Claude undoes it. No commitment until you're happy.

---

## The GSD workflow (at a high level)

GSD ("Get Stuff Done") is the system this project uses to keep changes organized. You don't need to learn it. But it's helpful to know a few command names so you can drop them in:

- **`/gsd:fast`** — for tiny things. "Change the door default to 30 inches." A two-minute change. Claude just does it.
- **`/gsd:quick`** — for small things that still deserve a proper test. "Add a 4-inch grid option to the snap dropdown." Claude does it, commits cleanly, opens a PR.
- **`/gsd:plan-phase`** — for bigger things. "Add full PDF export." Claude writes a detailed plan first, asks you questions to make sure the design is right, *then* builds. Use this when the change spans more than one screen or touches multiple features.

If you're not sure which to use, just describe what you want — Claude will pick the right workflow.

---

## How to read a PR before merging it

A PR ("Pull Request") is GitHub's name for a proposed code change. Before you say "merged", you can take a quick look. Here's what to actually pay attention to — and what to safely ignore.

### What to look at

- **The PR title.** Should describe in plain English what changed. ("Add 4-inch snap option" — good. "WIP refactor" — ask Claude what that means.)
- **The PR description / body.** This is where Claude explains what it did and why. Read it. It should sound like a normal human explanation.
- **The deployed preview link** (if there is one). This is the magic — click it, you're on a live version of the change. Click around and feel it. Does it work the way you imagined?
- **Screenshots in the PR.** If Claude attached before/after screenshots, look at them. Anything visually off?

### What to safely ignore

- **The "Files Changed" tab.** This shows the raw code diff. Unless you're curious, you don't need to read it. Trust the preview link and the description.
- **The "Checks" section.** Green checks = automated tests passed. Red X = something failed. If anything's red, ask Claude "what does this red check mean?" before merging. If everything's green, you're fine.
- **The branch names** (e.g. `claude/v1.20-phase73`). Internal naming. Doesn't matter.
- **Lines of code statistics** ("+247 / -89"). Doesn't matter.

### Red flags worth pausing on

- The deploy link doesn't load or shows errors.
- The behavior change doesn't match what you asked for.
- Things that *used* to work are now broken (try a few old features).
- Claude's description mentions a side-effect you didn't ask for ("also refactored the sidebar to use a different layout") — that's scope creep. Push back, ask why.

If anything feels off, say so. You don't need to know what's wrong technically — "the canvas is laggy now" or "the doors look weird in 3D" is plenty of information.

---

## TL;DR

- You can change almost everything about *the design itself* through the UI. Try the UI first.
- For everything else, describe what you want in plain English, let Claude propose a plan, click the preview link to test, and say "merged" when it feels right.
- You never need to read code. You do need to actually test the change before merging.
