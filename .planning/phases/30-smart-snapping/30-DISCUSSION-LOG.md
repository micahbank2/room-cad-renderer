# Phase 30: Smart Snapping — Discussion Log

> **Audit trail only.** Decisions are captured in `30-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 30-smart-snapping
**Areas discussed:** Architecture, Snap targets, Tolerance, Conflict resolution, Guide visualization, Disable mechanism, Object scope

---

## Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| New pure module `snapEngine.ts` | Testable without Fabric, reusable | ✓ |
| Inline in tools | Tight coupling, harder to test | |
| Other | | |

**User's choice:** 1a

---

## Snap targets

| Option | Description | Selected |
|--------|-------------|----------|
| Wall edges + wall midpoints + object bbox edges | Minimum to hit SNAP-01/02 | ✓ |
| + wall endpoints (corners) | | |
| + object centers | | |
| Other | | |

**User's choice:** 2a

---

## Tolerance

| Option | Description | Selected |
|--------|-------------|----------|
| Pixel-based, zoom-aware (~8px) | Consistent feel across zoom | ✓ |
| Feet-based | Zoom-dependent feel | |
| Hybrid | | |
| Other | | |

**User's choice:** 3a

---

## Conflict resolution

| Option | Description | Selected |
|--------|-------------|----------|
| Per-axis independent | X and Y snap separately | ✓ |
| Single best snap wins | | |
| Strict priority order | | |
| Other | | |

**User's choice:** 4a
**Notes:** Intra-axis tiebreak: midpoint > edge-to-edge > edge-to-wall-face (D-05a).

---

## Guide visualization

| Option | Description | Selected |
|--------|-------------|----------|
| Accent-purple axis line + tick at snap point | Obsidian theme match; Figma/Sketch convention | ✓ |
| Highlight the entire snapped edge | | |
| Corner/crosshair only | | |
| Other | | |

**User's choice:** 5a
**Notes:** Midpoint snap also renders a distinct dot on the wall midline (D-06d) so "centered on this wall" reads differently from axis-snap.

---

## Disable mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Hold Alt / Option | No conflict with Shift orthogonal-constrain | ✓ |
| Shift | Conflicts with wallTool | |
| No disable | | |
| Other | | |

**User's choice:** 6a

---

## Object scope

| Option | Description | Selected |
|--------|-------------|----------|
| Products + custom elements + ceilings | Everything draggable | ✓ |
| Products + custom elements only | | |
| Products only | | |
| Other | | |

**User's choice:** 7a
**Notes:** Walls and openings excluded — they have their own interaction paths.

---

## Claude's Discretion

- SceneGeometry caching location
- SnapGuide union shape
- Whether computeSnap returns debug candidate list
- Fabric render details (dash/solid, 1–2px weight)
- Exclude-self filter ordering

## Deferred Ideas

- Object center snapping
- Wall endpoint / corner snapping (Phase 31 territory)
- Rotation snapping
- Spacing/distribution guides
- Spatial index
- Persistent alignment constraints
- UI toggle for smart snap
- Smart snap in wallTool
- Openings snap
- Metric tolerance
