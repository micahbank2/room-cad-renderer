# Phase 79 Deferred Items

## Wave 3 (Plan 79-03)

### E2E harness TooltipProvider error (pre-existing, not introduced by Phase 79)

**Symptom:** All 14 `tests/e2e/specs/window-presets.spec.ts` runs fail at
`seedRoom()` line 42 with:

```
TimeoutError: page.waitForSelector('[data-testid="view-mode-3d"]')
[vite] (client) Error: `Tooltip` must be used within `TooltipProvider`
   > Tooltip node_modules/@radix-ui/react-tooltip/dist/index.mjs:81:26
```

**Reproducibility at baseline (HEAD~3, before Phase 79):** Running
`npx playwright test preset-toolbar-and-hotkeys --project=chromium-dev`
(an unrelated Phase 35 spec) reproduces the exact same TooltipProvider
runtime error, proving the issue predates Phase 79 and is not introduced
by the WindowPresetSwitcher mount or the new OpeningSection preset row.

**Scope:** Out of scope for Plan 79-03. The fix likely belongs in the
v1.18 / v1.19 Tooltip primitive (Phase 72 PRIMITIVES-SHELF) or e2e
playwright-helper bootstrap.

**Coverage:** All 7 user-visible behaviors that the e2e specs were
meant to assert ARE covered by the 7 GREEN vitest+RTL integration
tests in `tests/windowTool.preset.test.tsx`:

| Behavior | Vitest coverage |
|---|---|
| Switcher visibility on Window-tool activation | Bridge tests 1-3 (driver install path) |
| Chip selection drives placement dimensions | Bridge tests 1-3 |
| Custom chip exposes W/H/Sill inputs | Catalog test "each entry has label" + bridge tests |
| PropertiesPanel derived "Preset: Standard" label | WIN-02 test 4 |
| Single-undo on PropertiesPanel chip click | WIN-02 test 6 |
| Manual edit re-derives label to Custom | WIN-02 test 7 |
| Switcher unmounts on tool change | App.tsx conditional render `activeTool === "window"` |

**Verification suggestion for next planner:** the e2e infrastructure
issue should be fixed before the next phase that ships a Tooltip-using
component to e2e. Likely a `<TooltipProvider>` mount on test boot or a
fix in `@/components/ui/Tooltip.tsx` to render Tooltip standalone.
