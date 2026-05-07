# Phase 71: Token Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 71-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-07
**Phase:** 71-token-foundation
**Areas discussed:** Sweep style, Glow & blur, Light mode, Theme toggle, Label sweep

---

## Sweep style

| Option | Description | Selected |
|--------|-------------|----------|
| Sweep all usage sites now | Replace every `bg-obsidian-low` → `bg-card`, `text-text-primary` → `text-foreground`, etc. in this phase. App fully Pascal at the moment Phase 71 ships. | ✓ |
| Keep old names as aliases, sweep later | Leave `obsidian-low`, `text-text-primary` etc. as backwards-compat aliases pointing to new tokens; later phases rename per-panel. | |

**User's choice:** Sweep all usage sites now (Recommended)
**Notes:** Half-swept code (some panels Pascal-gray, others Obsidian-blue) looks broken — committing to all-or-nothing aligns with the one-way "Pascal" commitment.

---

## Glow & blur

| Option | Description | Selected |
|--------|-------------|----------|
| Remove all four classes now | Delete `glass-panel`, `accent-glow`, `cad-grid-bg`, `ghost-border` from index.css and strip 13 file usages. Panels render as flat solid Pascal cards. | ✓ |
| Keep classes, replace effects per panel later | Neutralize them but leave defined; later panel-rework phases delete them as they restyle each surface. | |

**User's choice:** Remove all four classes now (Recommended)
**Notes:** The blur and glow ARE the Obsidian signature; keeping them while swapping colors underneath produces a confused half-old half-new look.

---

## Light mode

| Option | Description | Selected |
|--------|-------------|----------|
| Plumbing only this phase | Phase 71 defines `:root` (light) + `.dark` (dark) blocks, sets `<html class="dark">` on the editor, and that's it. Welcome / ProjectManager / scene-list keep rendering dark. Phase 76 actually does the light-mode restyle. | ✓ |
| Also flip Welcome + ProjectManager to light now | Phase 71 also adds `<html class="">` (light) to welcome/marketing routes and restyles them simultaneously. | |

**User's choice:** Plumbing only this phase (Recommended)
**Notes:** Phase 76 exists specifically for the welcome/marketing surfaces — doing it twice splits the work awkwardly and Phase 71 is already heavy.

---

## Theme toggle

| Option | Description | Selected |
|--------|-------------|----------|
| Hook only, no toggle UI yet | Build `useTheme()` and call from App.tsx so system pref is respected. No toggle button — UI lands in Phase 76 alongside StatusBar/Settings rework. | ✓ |
| Also add a small toggle button this phase | Add a small theme-toggle icon button in the StatusBar or top-right corner. Lets you immediately verify theme switching works end-to-end. | |

**User's choice:** Hook only, no toggle UI yet (Recommended)
**Notes:** Editor stays dark by default anyway, so toggle isn't user-visible value until light surfaces ship in Phase 76. Test driver `__driveTheme` substitutes for the missing UI in e2e tests.

---

## Label sweep

| Option | Description | Selected |
|--------|-------------|----------|
| Sweep all labels + update tests now | Convert every UPPERCASE chrome label (`SELECT` → `Select`, `ROOM_CONFIG` → `Room Config`, etc.) AND update affected Playwright `getByText` selectors in same phase. | ✓ |
| Defer label sweep to per-panel phases | Phase 71 only swaps tokens/fonts/radii/colors. Each panel-rework phase (P73 sidebar, P74 toolbar, P75 properties, P76 modals) flips its own labels and updates its own tests. | |
| Sweep labels but keep dynamic CAD identifiers UPPERCASE | Same as option 1 but explicitly preserves `WALL_SEGMENT_{id}`, status strings, `{PRODUCT_NAME_UPPERCASED}` rendering. | |

**User's choice:** Sweep all labels + update tests now (Recommended)
**Notes:** Matches the color-sweep choice. Dynamic CAD identifiers are explicitly preserved per audit-doc convention even though user picked option 1 — this is captured as **D-10** in CONTEXT.md (preservation allowlist required from planner).

---

## Claude's Discretion

- Exact Tailwind utility class mapping table from old token names to new (researcher produces, planner publishes)
- Order of file sweeps within Phase 71 (likely batched by directory)
- Exact font-weight set to load from Google Fonts for Barlow
- Whether `geist` package brings Geist Sans + Geist Mono together or needs separate installs

## Deferred Ideas

- Visible theme toggle button — Phase 76
- WelcomeScreen / ProjectManager actual light-mode restyle — Phase 76
- Component primitives via `cva` — Phase 72
- Floating two-row action menu — Phase 74
- Sidebar contextual mount — Phase 73
- Pascal's chunky PNG icons — commission only if lucide fallback looks flat in P74
- WallMesh ghost-spread propagation through resolved Material in cutaway audit — researcher recommendation expected in Phase 71
