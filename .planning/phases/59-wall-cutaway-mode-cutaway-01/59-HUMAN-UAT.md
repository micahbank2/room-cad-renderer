---
status: partial
phase: 59-wall-cutaway-mode-cutaway-01
source: [59-VERIFICATION.md]
started: 2026-05-05T00:00:00Z
updated: 2026-05-05T00:00:00Z
---

## How to test

Open the PR's Netlify preview link.

> 👁️ **The view-from-outside-without-walls-blocking moment.** Right now in 3D, when you orbit to a side angle, the nearest wall blocks the view of the room interior. Phase 59 fixes that — auto-mode ghosts that wall, or you right-click any wall to hide it manually.

## Tests

### 1. The Cutaway button appears in the Toolbar
Open the app. Look at the Toolbar. You should see a new icon button (an eye-with-slash glyph). Hover over it — tooltip should say "Cutaway: Off".
result: [pending]

### 2. Auto-mode ghosts the nearest wall
Open a room with walls. Switch to 3D. Click the Cutaway button — it should turn purple/active, tooltip flips to "Cutaway: Auto". Orbit to a side view (drag the camera around). The wall closest to the camera should become semi-transparent (about 15% opacity) so you can see the room interior. Orbit to a different side — a different wall should ghost.
result: [pending]

### 3. Top-down view turns cutaway off automatically
With auto-mode active, orbit the camera to look nearly straight down (top-down view). All walls should become opaque again — no ghosting from above (since you can already see the interior from up there).
result: [pending]

### 4. Right-click a wall to hide it manually
With cutaway in any mode, right-click on any wall in 3D. The context menu should include a "Hide in 3D" action. Click it. That specific wall should ghost. Right-click the same wall again — the action label should now say "Show in 3D". Click it. The wall returns to opaque.
result: [pending]

### 5. Multiple walls can be manually hidden
Right-click and hide TWO different walls in succession. Both should be ghosted at the same time. Restore both via right-click "Show in 3D". Auto-mode and manual hides can coexist — manual hides on top of auto.
result: [pending]

### 6. Toggle off restores everything
With some walls ghosted (auto OR manual), click the Toolbar Cutaway button to turn it OFF. All walls should become opaque. Click it again to turn auto back on — the auto-detection resumes.
result: [pending]

### 7. EXPLODE mode (Phase 47) — each room gets its own cutaway
Switch displayMode to EXPLODE (the Toolbar mode that spreads rooms apart along the X-axis). Turn on cutaway auto-mode. Orbit around. **Each room should have its own ghosted wall** based on which wall is closest to the camera within that specific room. Each room's interior should be visible independently.
result: [pending]

### 8. Walk mode disables cutaway
Switch to walk mode (first-person camera inside the room). Walls should be fully opaque — cutaway is irrelevant when you're INSIDE the room. Switch back to orbit mode — cutaway resumes its previous setting.
result: [pending]

### 9. Wallpaper, art, and crown molding ghost together with the wall
Apply a wallpaper or hang some wall art on a wall (Phase 36 features). Trigger cutaway on that wall. The wall AND its decorative overlays (wallpaper texture, framed art, crown molding) should ALL ghost together — not the base wall ghosting while the wallpaper stays solid.
result: [pending]

### 10. Saving and reloading: cutaway state is session-only
Toggle cutaway to AUTO, manually hide a wall. Save the project (Ctrl+S or wait for autosave). Reload the page. After reload, cutaway should be **OFF** (default) and no walls hidden. The cutaway state is NOT saved with your project — it's a viewing preference, not part of the room geometry.
result: [pending]

## Note on remaining v1.15 work

After Phase 59, three more architectural features ship:
- Phase 60 — Stairs as a new primitive (rise / run / width / step count)
- Phase 61 — Archway / passthrough / niche openings (extends doors+windows)
- Phase 62 — Measurement + annotation tools (dimension lines, labels, auto room-area)

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0
blocked: 0

## Gaps
