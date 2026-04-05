# Milestones — Room CAD Renderer

## v1.0 — Room Visualization MVP ✅

**Shipped:** 2026-04-05
**Timeline:** 2026-04-04 → 2026-04-05 (2 days)
**Phases:** 6 (1, 2, 3, 4, 5, 5.1) — 23 plans
**Files changed:** 155 | **LOC:** ~4,924 TypeScript
**Git range:** `f5da5fb` → `395403a`
**Tag:** `v1.0`

**Delivered:** Jessica can upload her own products, place them in dimensionally accurate multi-room layouts, see real image textures in a 3D scene with PBR materials and soft shadows, walk through the room at eye level, and export the view as PNG — all of it auto-saved and restored on reload.

**Key accomplishments:**

1. **2D canvas made fully interactive** — async product image rendering (EDIT-09), HTML5 drag-drop placement (EDIT-07), rotation handles with 15° snap (EDIT-08), double-click editable wall dimensions (EDIT-06)
2. **Global product library** with nullable dimensions, search, and placeholder rendering — one catalog across all projects (LIB-03/04/05)
3. **3D scene coherence** — ACES tone mapping, soft shadows, procedural wood-plank floor, Environment preset, PBR materials, image-textured products (VIZ-04/06)
4. **Eye-level walkthrough** with PointerLockControls, WASD movement, walls+bounds collision, axis-slide fallback (VIZ-05)
5. **Multi-room model** — CADSnapshot v2 migration, rooms map + activeRoomId, room templates (living/bedroom/kitchen), RoomTabs + Ctrl/Cmd+Tab switching (ROOM-01/02)
6. **Auto-save + startup hydration** — 2s debounce, SaveIndicator, last-saved project restored on page reload, walk camera respawns on room switch, orbit position preserved on mode toggle (SAVE-02/03, closed via 5.1)

**Archives:**

- [v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) — full phase breakdown
- [v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md) — all 14 active requirements validated
- [v1.0-MILESTONE-AUDIT.md](milestones/v1.0-MILESTONE-AUDIT.md) — integration audit + gap closure record
