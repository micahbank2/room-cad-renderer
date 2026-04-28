# Requirements — v1.12 Maintenance Pass

Maintenance milestone closing 3 carry-over bugs + 1 small UX polish item. Continues phase numbering from 48 → starts at 49.

## Active Requirements

### Bugs (BUG-)

- [x] **BUG-02** — Wall user-texture (uploaded JPEG/PNG/WebP) must render in 3D on first apply, without requiring a 2D→3D toggle workaround. The texture is correctly stored in IndexedDB; the 3D mesh only picks it up after a view-mode cycle. Source: [#94](https://github.com/micahbank2/room-cad-renderer/issues/94).
  - **Verifiable:** Upload a wall texture via "My Textures" tab, apply it to a wall while in 3D view (or while currently in 2D), switch to 3D — the wall renders the texture immediately. No 2D↔3D toggle required.
  - **Acceptance:** WallMesh resolves the texture from `pbrTextureCache` synchronously on first render after a `userTextureId` change. No regression on Phase 32 PBR pipeline. Existing texture upload flow (LIB-06/07/08) untouched. No new defensive code paths — find the actual cause.
  - **Hypothesis to test:** Likely a missing `useEffect` dependency on `userTextureId` in `WallMesh`, OR `pbrTextureCache.getEntry()` returning stale `null` because the IDB read is async but the React render is sync. Investigate with research phase.

- [x] **BUG-03** — Uploaded wallpaper + wallArt must persist across 2D↔3D view toggles. Currently they disappear on toggle. Source: [#71](https://github.com/micahbank2/room-cad-renderer/issues/71). Originally backlog 999.2, deferred from Phase 32.
  - **Verifiable:** Upload a custom wallpaper texture, apply it to a wall side. Switch to 2D, then back to 3D. The wallpaper still renders. Same for custom-uploaded wallArt placed on a wall.
  - **Acceptance:** WallMesh `materialKey` and `userTextureId` survive the unmount/remount cycle that happens during view-mode switch. Phase 36 VIZ-10 regression harness covers preset-applied textures; this requires extending coverage (or a new spec) for custom-uploaded wallpaper + wallArt specifically.
  - **Hypothesis to test:** The Phase 32 VIZ-10 root-cause document identified Phase 32's defensive code as KEEP. The bug may be a missed code path on first-apply that the regression harness doesn't cover. Confirm with research phase.

### Tech Debt (DEBT-)

- [x] **DEBT-05** — Migrate legacy FloorMaterial `kind: "custom"` entries out of snapshots. They still embed full `data:image/...` URL strings, bloating saved projects. Phase 32 (LIB-08) introduced `userTextureId` references but didn't migrate the legacy path. Source: [#95](https://github.com/micahbank2/room-cad-renderer/issues/95).
  - **Verifiable:** Open a project that has a custom FloorMaterial. The exported snapshot JSON contains a `userTextureId` reference, NOT a `data:image/...` string. Saved JSON size for a project with 5 custom textures should be <50KB (down from potentially MBs).
  - **Acceptance:** One-time migration on `loadSnapshot()` rewrites legacy data-URL FloorMaterial entries → `userTextureId` (using SHA-256 dedup if texture already exists in IDB; storing it if not). Subsequent saves use the new shape. Old projects load cleanly. Document the migration version-bump in cadStore snapshot version. No data loss.

### UX Polish (HOTKEY-)

- [x] **HOTKEY-01** — Pressing `?` opens a keyboard shortcuts cheat sheet overlay. Common SaaS pattern (GitHub, Linear, Notion). Source: [#72](https://github.com/micahbank2/room-cad-renderer/issues/72). Pascal competitor-insight item.
  - **Verifiable:** Press `?` (Shift + /) anywhere in the app — a modal/drawer overlay appears listing all keyboard shortcuts grouped by category (Tools, View, Camera Presets, Selection, etc.). Press Escape or click outside — overlay closes.
  - **Acceptance:** New `KeyboardShortcutsOverlay` component using lucide icons + Phase 33 design tokens. Auto-discovers shortcuts from a single source-of-truth (avoid duplicating the list — read from existing keyboard handler in `App.tsx` or a new shared `shortcuts.ts` registry). Reduced-motion guard on entrance animation. Inert when focus is in a form input (matches CAM-01 active-element guard precedent). Closeable via Escape OR backdrop click.

## Out of Scope (this milestone)

| Item | Reason |
|------|--------|
| Right-click context menus ([#74](https://github.com/micahbank2/room-cad-renderer/issues/74)) | Polish without urgency; pairs better with future canvas-overhaul work |
| In-app feedback dialog ([#73](https://github.com/micahbank2/room-cad-renderer/issues/73)) | Use async questionnaire pattern (v1.9 Phase 39 precedent); in-app dialog speculative |
| Properties panel in 3D ([#97](https://github.com/micahbank2/room-cad-renderer/issues/97)) | Significant refactor; defer to dedicated milestone |
| EXPLODE+saved-camera offset (Phase 999.4, [#127](https://github.com/micahbank2/room-cad-renderer/issues/127)) | Just deferred from v1.11 audit; narrow trigger; let real-use signal accumulate |
| Real GLTF/GLB upload ([#29](https://github.com/micahbank2/room-cad-renderer/issues/29)) | Multi-week scope; major-version territory |
| Material application system ([#27](https://github.com/micahbank2/room-cad-renderer/issues/27)) | Multi-week scope |
| Parametric object controls ([#28](https://github.com/micahbank2/room-cad-renderer/issues/28)) | Multi-week scope |
| PBR extensions ([#81](https://github.com/micahbank2/room-cad-renderer/issues/81)) | Multi-week scope |
| Ceiling resize handles (Phase 999.1, [#70](https://github.com/micahbank2/room-cad-renderer/issues/70)) | Re-deferred from v1.9 cancellation; revisit pending demand signal |
| Per-surface tile-size override (Phase 999.3, [#105](https://github.com/micahbank2/room-cad-renderer/issues/105)) | Re-deferred from v1.9 cancellation |
| R3F v9 / React 19 upgrade ([#56](https://github.com/micahbank2/room-cad-renderer/issues/56)) | Gated on R3F v9 stability |

## Validated Requirements (Earlier Milestones)

See `.planning/milestones/v1.0-REQUIREMENTS.md` through `.planning/milestones/v1.11-REQUIREMENTS.md`. All v1.0–v1.11 requirements shipped or formally deferred to backlog.

## Traceability

| Requirement | Phase | Plans |
|-------------|-------|-------|
| BUG-02 | Phase 49 | TBD |
| BUG-03 | Phase 50 | TBD |
| DEBT-05 | Phase 51 | TBD |
| HOTKEY-01 | Phase 52 | TBD |

---

*Last updated: 2026-04-27*
