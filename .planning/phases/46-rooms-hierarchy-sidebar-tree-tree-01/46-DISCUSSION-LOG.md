# Phase 46: Rooms Hierarchy Sidebar Tree (TREE-01) — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-26
**Phase:** 46-rooms-hierarchy-sidebar-tree-tree-01
**Areas discussed:** Sidebar placement & default state, Node labels, Click-to-focus framing, Visibility scope & cascade

---

## Sidebar Placement & Default State

### Where in Sidebar?
| Option | Description | Selected |
|--------|-------------|----------|
| Top — above Room config | Recommended. Spatial navigator before dimension tweaks. | ✓ |
| Bottom — below all panels | Power-user tool, less prominent. | |
| Replace 'System stats' | Reclaim rarely-used real estate. | |

### Default state on first load?
| Option | Description | Selected |
|--------|-------------|----------|
| Open, active room expanded | Recommended. Immediately useful. | ✓ |
| Open, all rooms collapsed | Less noise but always one click to see anything. | |
| Closed by default | Lowest discoverability. | |

### Persist open/closed across sessions?
| Option | Description | Selected |
|--------|-------------|----------|
| Yes — localStorage like Phase 33 | Recommended. Consistent with CollapsibleSection. | ✓ |
| Reset every page load | Always opens with active room expanded. | |

---

## Node Labels

### Wall labels?
| Option | Description | Selected |
|--------|-------------|----------|
| 'Wall 1', 'Wall 2'... (index) | Simplest. Stable. | |
| Cardinal direction — 'North wall' | Recommended. More meaningful at a glance. | ✓ |
| Length-based — 'Wall (12'4")' | Useful but cluttered. | |

### Product / custom-element labels?
| Option | Description | Selected |
|--------|-------------|----------|
| Catalog name + index if duplicates | Recommended. Custom uses labelOverride. | ✓ |
| Full catalog name only | Two sofas show identical. | |
| Catalog name + position | More info but visually busy. | |

### Ceiling representation?
| Option | Description | Selected |
|--------|-------------|----------|
| Single 'Ceiling' node per room | Recommended. Matches data model. | ✓ |
| Skip ceilings | Less clutter, no visibility-toggle. | |
| Per-face ceiling tiles | Overkill for current model. | |

---

## Click-to-Focus Framing

### Wall click?
| Option | Description | Selected |
|--------|-------------|----------|
| Reuse MIC-35 wall-side framing | Recommended. Zero new camera code. | ✓ |
| Bbox-fit preset | New tween target math. | |
| No camera move, just selection | Loses click-to-focus. | |

### Product / custom-element click?
| Option | Description | Selected |
|--------|-------------|----------|
| Bbox-fit tween via Phase 35 infra | Recommended. ~1.5× bbox diagonal. | ✓ |
| Top-down zoom to position | Loses 3D context. | |
| No camera move | Selection only. | |

### Ceiling click?
| Option | Description | Selected |
|--------|-------------|----------|
| Tilt camera up, room-bbox framed | Recommended. Only sensible angle. | ✓ |
| Bbox-fit like products | Less explicit framing. | |

### Room (top-level) click?
| Option | Description | Selected |
|--------|-------------|----------|
| Switch active room + frame bbox | Recommended. Tree as richer RoomTabs. | ✓ |
| Switch active room only | Identical to RoomTab click. | |
| Just expand/collapse | Restrained but loses focus. | |

---

## Visibility Scope & Cascade

### Eye icon hides from?
| Option | Description | Selected |
|--------|-------------|----------|
| 3D only | Recommended. 2D stays as planning surface. | ✓ |
| Both 2D and 3D | Symmetrically simple. | |
| 2D only | Doesn't match REQUIREMENTS language. | |

### Cascade to children?
| Option | Description | Selected |
|--------|-------------|----------|
| Yes — parent hides all children | Recommended. Standard tree behavior. | ✓ |
| No cascade — only clicked node | Predictable but feels broken. | |

### Persist visibility across sessions?
| Option | Description | Selected |
|--------|-------------|----------|
| No — always reset to all-visible | Recommended. Inspection tool, not saved view. | ✓ |
| Yes — persist via localStorage | Risk of "where did my couch go". | |

---

## Claude's Discretion

- Group-level header rendering (collapsible vs plain section labels)
- Empty-state copy for empty rooms
- Hover affordances and parent-hidden eye-icon dim styling
- Indent depth and connector-line styling
- Optional Alt-click "solo-show" polish

## Deferred Ideas

- Per-node bookmarked camera + double-click Focus → Phase 48 (CAM-04)
- Display modes (NORMAL / SOLO / EXPLODE) → Phase 47 (DISPLAY-01)
- Right-click context menu → Phase 48
- Drag-to-reparent nodes
- Tree search / filter
