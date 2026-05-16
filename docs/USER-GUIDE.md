# Room CAD Renderer — User Guide

A plain-English walk-through of how to use the app. Five minutes, start to finish.

---

## What this app does

Room CAD Renderer lets you draw a real-world-accurate floor plan of a room (in feet and inches), drop in furniture and products you've actually picked out, then flip to a 3D view to see what the space will look like. Think of it as a sketch pad for a room you're planning to design — but every wall, door, window, and couch is sized to scale, so you can tell whether things will actually fit.

The magic moment: you upload a photo of a couch you found online, place it in a room with the real wall lengths, switch to 3D, and feel whether it works *before* spending money.

---

## Starting a new floor plan

When you open the app, you'll see the **Welcome screen** with the title "Design Your Space" and two big tiles in the middle:

1. **CREATE FLOOR PLAN** — click this for a brand-new project. A template picker pops up with four pre-drawn shapes (rectangle, L-shape, etc.) plus a "blank" option. Pick one and you're dropped straight into the 2D editor.
2. **UPLOAD FLOOR PLAN** — click this if you already have a floor-plan image (a screenshot, a builder's PDF page, anything). The app drops it onto the canvas so you can trace walls on top of it.

If you've saved projects before, a third tile appears: **OPEN PROJECT**. Click it and you'll see a list of saved projects with their dates — click any one to reopen it.

---

## The 2D canvas — what each tool does

Once you're in the editor, you'll see a floating toolbar pinned to the bottom-center of the screen. The tools are grouped by what they do:

### Drawing group

- **Select (V)** — the arrow icon. Click any wall or object to select it. Drag to move it. Press Delete to remove it.
- **Wall (W)** — the line icon. Click once to set the wall's start point, click again to set the end point. Hold **Shift** while drawing to lock the wall to a perfectly horizontal or vertical angle.
- **Door (D)** — the door icon. Click on any existing wall to drop in a 3-foot door opening.
- **Window (N)** — the rectangle icon. Click on any existing wall to drop in a 3-foot window opening.
- **Wall cutouts** — the small chevron next to the window tool. Opens a dropdown of extra cutout types (passthrough, etc.).
- **Product** — the box icon. Once you've picked a product from the Library (see "Placing products" below), this tool is what you use to drop it onto the canvas.

### Measure group

- **Measure (M)** — the ruler icon. Click two points on the canvas to draw a measurement line between them. Useful for double-checking distances without permanently placing anything.
- **Label (T)** — the text icon. Click anywhere to drop a text label (e.g. "kitchen", "north wall").

### Structure group

- **Ceiling (C)** — the triangle icon. Adds a ceiling element to the active room.
- **Stairs** — the footprints icon. Click on the canvas to place a staircase. Width and step count can be tweaked in the properties panel after placement.
- **Column** — for placing structural support columns (rectangular pillars).

### View group

Four buttons that switch what you're looking at:

- **2D** — the floor plan (top-down).
- **3D** — the rendered 3D view (use your mouse to orbit the camera).
- **Split** — 2D on the left, 3D on the right, side by side.
- **Library** — the full-screen product and material library, where you upload new products.

### Utility group

- **Snap** dropdown — controls how strongly the cursor "snaps" to a grid. Choose from Off, 3 inch, 6 inch, or 1 foot. Default is 6 inch (most things you'd draw line up cleanly).
- **Display mode** — Normal (all rooms together), Solo (only the active room), or Explode (rooms separated along an axis for inspection).
- **Undo / Redo** — Ctrl+Z and Ctrl+Shift+Z. The app keeps the last 50 changes.

---

## Placing products

Products are things you put *in* the room — furniture, fixtures, appliances, art. To place one:

1. Click the **Library** button in the View group (or the sidebar's "Library" tab). The product library opens.
2. Browse or filter by category. Click any product card and choose "Place".
3. The floating toolbar's **Product** tool becomes active. Move your cursor over the 2D canvas — you'll see a preview of the product shape.
4. Click anywhere on the canvas to drop it. The product is now placed.
5. Switch back to the **Select** tool (V) to drag the product around, rotate it via the rotation handle, or resize it by dragging the edge handles.

To add a brand-new product, click **Add Product** in the Library and fill in: name, category, real-world width / depth / height (in feet), a photo, and an optional material finish. Hit Save — it's now in your library forever and reusable across every project.

---

## Switching to 3D view

Click the **3D** button in the View group. The 2D canvas is replaced by a rendered 3D scene of the same floor plan — walls extruded to their real height, doors and windows cut out, products placed where you put them.

Mouse controls:

- **Left-click + drag** — orbit the camera around the room.
- **Right-click + drag** — pan.
- **Scroll wheel** — zoom in / out.

To see 2D and 3D at the same time (handy for editing while watching the 3D update live), click **Split**.

---

## Saving and re-opening projects

The app **saves automatically**. Every change you make — drawing a wall, placing a product, renaming the project — is saved to your browser about 2 seconds after you stop interacting.

You'll see the save state in the bottom status bar: **SAVED** when everything's safely stored, **SAVING** mid-save, **SAVE_FAILED** if something went wrong. If you ever see SAVE_FAILED, don't close the tab — the message stays up so you can investigate before you lose work.

To re-open a project later: close the browser, come back, and the app will automatically restore the last project you were working on. To switch to a *different* saved project, click the sidebar's Projects section, or close the current project to return to the Welcome screen and pick from the OPEN PROJECT tile.

---

## Light / dark mode toggle

The app supports both light and dark themes. Click the **gear icon** in the top bar to open Settings, then pick Light, Dark, or System (matches your computer's setting). The choice is remembered next time you open the app.

Dark mode is the default and the more polished experience right now. Light mode works but a few screens (the Welcome screen, the Projects list) intentionally stay dark for visual consistency until a future polish pass.

---

That's the whole app in five minutes. If something here doesn't match what you see on screen, the screenshots in this guide may be slightly out of date — the underlying behavior is described accurately.
