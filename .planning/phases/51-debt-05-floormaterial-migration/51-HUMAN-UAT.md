---
status: partial
phase: 51-debt-05-floormaterial-migration
source: [51-VERIFICATION.md]
started: 2026-04-27T22:00:00Z
updated: 2026-04-27T22:00:00Z
---

## How to test

Open the PR's Netlify preview link.

## Tests

### 1. Existing projects still load and look correct
If you have any saved projects, open them. Walls, floors, ceilings, products — everything should look exactly as before. The migration is silent — you shouldn't notice anything different visually.
result: [pending]

### 2. Custom floor textures still work end-to-end
Create a new project. Upload a floor texture image (any JPEG/PNG) via "My Textures." Apply it as a floor. The texture should render correctly. Save (autosave fires). Reload the page. The project should restore with the texture still applied.
result: [pending]

### 3. Wall + ceiling textures unchanged (Phase 49/50 regression check)
Apply a custom wall texture (Phase 49 fix). Toggle 2D ↔ 3D. Apply uploaded wallpaper. Apply uploaded wallArt. All should persist across toggles. None of this is affected by Phase 51's migration.
result: [pending]

### 4. New project creation
Create a brand-new project. Add a wall, place a product. Save. Should work normally.
result: [pending]

### 5. Saved projects look the same in Properties panel
Open a Floor with a custom material. The Properties panel should still show the texture name, scale, rotation — all the controls that worked before still work.
result: [pending]

## Note on testing

This phase is mostly invisible to you. The big change is in saved-project file size: any project that had a custom floor texture in the legacy format now stores a reference instead of an embedded data URL. You won't see this directly unless you export a project's JSON, but the app should behave identically.

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
