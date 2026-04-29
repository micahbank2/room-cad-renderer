# Requirements — v1.13 UX Polish Bundle

Editor-flow maturity milestone before v1.14's real-3D-models work. Continues phase numbering from 52 → starts at 53.

## Active Requirements

### Editor UX (CTXMENU- + PROPS3D-)

- [x] **CTXMENU-01** — Right-click on a canvas object (wall, product, ceiling, custom element) opens a context menu with relevant actions for that object kind. Mirrors competitor patterns (Pascal Editor, SketchUp). Source: [#74](https://github.com/micahbank2/room-cad-renderer/issues/74).
  - **Verifiable:** Right-click any selected wall in 2D → context menu appears with: Focus camera, Save camera here, Copy, Paste, Hide/Show, Delete. Same for products, ceilings, custom elements. Right-click on empty canvas → menu with Paste (only if clipboard non-empty). Press Escape → menu closes. Click outside → menu closes.
  - **Acceptance:** New `CanvasContextMenu` component using lucide icons + Phase 33 design tokens. Reuses existing `cadStore` actions (no duplicate logic). Reuses Phase 48 saved-camera infra (Save camera here, Focus camera). Reuses Phase 46 hidden-ids (Hide/Show). Inert when typing in a form input. Closes on Escape OR backdrop click. Native browser right-click is suppressed only when over a canvas object — right-click on toolbar/sidebar still works normally.
  - **Hypothesis to test:** Likely needs raycasting for 3D right-click (which mesh did the user click on?) and Fabric.js targetFinder for 2D. Research phase confirms.
  - **Mobile/touch:** out of scope for v1.13. Right-click is desktop-only; touch users get long-press in a future phase if/when demand surfaces.

### 3D / Split View (PROPS3D-)

- [x] **PROPS3D-01** — PropertiesPanel renders the selected object's properties in 3D and split view modes, not just 2D. Source: [#97](https://github.com/micahbank2/room-cad-renderer/issues/97).
  - **Verifiable:** Select a wall in 2D → PropertiesPanel shows wall properties. Switch to 3D → click the same wall in 3D → PropertiesPanel still shows wall properties (currently shows nothing). Same flow for products, ceilings, custom elements. Switch to split view → both 2D click AND 3D click drive the panel.
  - **Acceptance:** PropertiesPanel mounts unconditionally when an object is selected, regardless of viewMode. 3D click handler dispatches selection (raycast → match mesh → call `useUIStore.select([id])`). Split view: clicking in either pane drives same selection. No regression on Phase 31 inline-editing, Phase 48 saved-camera buttons, Phase 47 displayMode interactions.
  - **Hypothesis to test:** Likely a viewMode gate exists somewhere in App.tsx or PropertiesPanel that hides the panel outside 2D. Research confirms with file:line.

## Out of Scope (this milestone)

| Item | Reason |
|------|--------|
| In-app feedback dialog ([#73](https://github.com/micahbank2/room-cad-renderer/issues/73)) | No evidence of demand; Phase 39 async questionnaire path is sufficient |
| Real GLTF/GLB upload ([#29](https://github.com/micahbank2/room-cad-renderer/issues/29)) | v1.14 milestone — confirmed forward commitment |
| Material application system ([#27](https://github.com/micahbank2/room-cad-renderer/issues/27)) | Multi-week scope |
| Parametric object controls ([#28](https://github.com/micahbank2/room-cad-renderer/issues/28)) | Multi-week scope |
| PBR extensions ([#81](https://github.com/micahbank2/room-cad-renderer/issues/81)) | Multi-week scope |
| EXPLODE+saved-camera offset (Phase 999.4, [#127](https://github.com/micahbank2/room-cad-renderer/issues/127)) | Narrow trigger; deferred from v1.11 |
| R3F v9 / React 19 upgrade ([#56](https://github.com/micahbank2/room-cad-renderer/issues/56)) | Gated on R3F v9 stability |
| Ceiling resize handles (Phase 999.1, [#70](https://github.com/micahbank2/room-cad-renderer/issues/70)) | Re-deferred from v1.9 |
| Per-surface tile-size override (Phase 999.3, [#105](https://github.com/micahbank2/room-cad-renderer/issues/105)) | Re-deferred from v1.9 |
| Mobile / touch right-click | No mobile target user; long-press deferred until demand surfaces |

## Validated Requirements (Earlier Milestones)

See `.planning/milestones/v1.0-REQUIREMENTS.md` through `.planning/milestones/v1.12-REQUIREMENTS.md`. All v1.0–v1.12 requirements shipped or formally deferred to backlog.

## Traceability

| Requirement | Phase | Plans |
|-------------|-------|-------|
| CTXMENU-01 | Phase 53 | TBD |
| PROPS3D-01 | Phase 54 | TBD |

---

*Last updated: 2026-04-28*
