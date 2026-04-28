# Phase 53 — Validation Paths

Requirement: CTXMENU-01 (GH #74)

---

## Unit Tests — `tests/lib/contextMenuActions.test.ts`

| # | Assertion | Automated Command |
|---|-----------|-------------------|
| U1 | `hasClipboardContent()` returns false before any copy | `npx vitest run tests/lib/contextMenuActions.test.ts` |
| U2 | Auto-flip: anchor (900,y) + menuWidth 200 in vw 1024 → x flips to 700 | same |
| U3 | Auto-flip: anchor (400,y) + menuWidth 200 in vw 1024 → x stays 400 (no flip) | same |
| U4 | Auto-flip: anchor (x,680) + menuHeight 150 in vh 768 → y flips to 530 | same |
| U5 | Auto-flip: anchor (x,300) + menuHeight 150 in vh 768 → y stays 300 (no flip) | same |

Action count assertions (from D-02 — validated manually or via component render test):

| Kind | Expected count | Verification |
|------|---------------|--------------|
| wall | 5 | E2E scenario 1 asserts `[data-testid="ctx-action"]` count = 5 |
| product | 6 | Manual: right-click product in 3D |
| ceiling | 3 | Manual: right-click ceiling |
| custom element | 6 | Manual: right-click custom element |
| empty (no clipboard) | 0 (menu hidden) | Manual: right-click empty canvas before copying anything |

---

## E2E Tests — `e2e/canvas-context-menu.spec.ts`

Run: `npx playwright test e2e/canvas-context-menu.spec.ts --project=chromium-dev`

| # | Scenario | Expected | CTXMENU-01 clause |
|---|----------|----------|-------------------|
| E1 | Right-click wall in 2D | `[data-testid="context-menu"]` visible + 5 `[data-testid="ctx-action"]` buttons | "Right-click any wall opens context menu with actions" |
| E2 | Press Escape | `[data-testid="context-menu"]` disappears | "Press Escape → menu closes" |
| E3 | Click outside menu | `[data-testid="context-menu"]` disappears | "Click outside → menu closes" |
| E4 | Right-click while input focused | `[data-testid="context-menu"]` NOT visible | "Inert when typing in a form input" |
| E5 | Right-click elsewhere | Old menu gone, new position set (no crash) | "Right-click elsewhere → closes + opens new" |
| E6 | Right-click Toolbar | `[data-testid="context-menu"]` NOT visible | "Right-click on toolbar/sidebar falls through to native" |
| E7 | Window resize | `[data-testid="context-menu"]` disappears | "Resize/scroll closes menu" |
| E8 | Phase 52 regression: `?` opens shortcuts overlay | `getByText("SHORTCUTS")` visible | Zero regressions (D-10) |

---

## Regression Tests

| Phase | Behavior | How to verify |
|-------|----------|---------------|
| Phase 31 | Cmd+C copies selected wall | Select wall in 2D → Cmd+C → Cmd+V → second wall appears offset by 1ft |
| Phase 31 | Cmd+V pastes clipboard | (same as above) |
| Phase 46 | Tree click focuses 3D camera | Click wall row in RoomsTreePanel → 3D camera moves |
| Phase 46 | Hide/Show toggle | Phase 46: `toggleHidden(id)` still works; right-click Hide → wall gone from 3D |
| Phase 47 | Display mode buttons | NORMAL/SOLO/EXPLODE buttons still function |
| Phase 48 | Save camera here in PropertiesPanel | Select wall → Save camera here button → tree shows camera icon |
| Phase 48 | Focus saved camera | Click camera icon in tree → 3D camera jumps to saved pose |
| Phase 51 | loadSnapshot async | Open project → scene loads without error |
| Phase 52 | `?` opens shortcuts overlay | Press `?` → HelpModal shows SHORTCUTS section |
| Phase 52 | 6 pre-existing vitest failures | `npx vitest run` shows exactly same failures as pre-phase baseline |

---

## Acceptance Criteria (from REQUIREMENTS.md CTXMENU-01)

- [x] Right-click wall in 2D → Focus camera, Save camera here, Copy, Hide/Show, Delete
- [x] Right-click product → adds Paste action (6 total)
- [x] Right-click ceiling → Focus camera, Save camera here, Hide/Show (3 total)
- [x] Right-click custom element → Focus camera, Save camera here, Hide/Show, Copy, Delete, Rename label (6 total)
- [x] Right-click empty canvas → Paste (only when clipboard non-empty)
- [x] Press Escape → menu closes
- [x] Click outside → menu closes
- [x] Native browser right-click suppressed over canvas only (Toolbar/Sidebar unaffected)
- [x] Inert when focused in form input
- [x] `CanvasContextMenu` uses lucide icons + Phase 33 design tokens
- [x] Reuses Phase 46 toggleHidden (no duplicate hide logic)
- [x] Reuses Phase 48 setSavedCamera*NoHistory (no duplicate camera logic)
- [x] Reuses Phase 46 focusDispatch helpers (no duplicate focus logic)
- [x] copySelection/pasteSelection shared via clipboardActions.ts (no duplicate clipboard logic)
