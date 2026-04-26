# Phase 45: Auto-Generated Material Swatch Thumbnails (THUMB-01) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 45-auto-generated-material-swatch-thumbnails-thumb-01
**Areas discussed:** Generation approach, Cache + trigger, Lighting/camera setup, Scope confirmation, Reduced-motion handling, PBR failure mode

---

## Generation approach

| Option | Description | Selected |
|--------|-------------|----------|
| Shared raw THREE renderer | One module-level `THREE.WebGLRenderer` + Scene + Camera; per-material render → toDataURL → cache. ~150 LOC, no R3F overhead, full PBR fidelity. | ✓ |
| Offscreen R3F canvas | Hidden `<Canvas>` mounted at app root rendering one material at a time; screenshotted via `gl.domElement.toDataURL`. ~300 LOC. | |
| Hybrid: PBR render, flat CSS | Only the 3 PBR-mapped materials get rendered thumbnails; 8 flat-color materials stay as solid hex divs. Less code, inconsistent visuals. | |

**User's choice:** Shared raw THREE renderer
**Notes:** All 11 materials render through the same pipeline for visual consistency.

---

## Cache + trigger

| Option | Description | Selected |
|--------|-------------|----------|
| In-memory + lazy | `Map<materialId, dataURL>`. First picker mount triggers render. Hex placeholder during render. Regen on every page load. | ✓ |
| In-memory + eager | Pre-render all 11 in App.tsx on mount. No flicker, but +50-200ms initial paint. | |
| IndexedDB persisted | Idb-keyval cache survives reloads. Cache key = id + content hash. ~80 LOC. | |

**User's choice:** In-memory + lazy
**Notes:** 11 materials is small enough that in-memory regen is cheap.

---

## Lighting/camera setup

| Option | Description | Selected |
|--------|-------------|----------|
| Studio | Fixed neutral lighting: 1 directional @ 45°, soft ambient, slight rim. Camera ~30° off-axis. Predictable, doesn't drift with room state. | ✓ |
| Scene-matching | Mirror Lighting.tsx + ThreeViewport defaults. Native feel but normal-map detail can wash out. | |
| Flat (no lighting) | Albedo-only render, no shading. Cheapest, but PBR materials lose depth. | |

**User's choice:** Studio
**Notes:** Picker swatches need to be predictable across all room states.

---

## Scope confirmation

| Option | Description | Selected |
|--------|-------------|----------|
| SurfaceMaterialPicker grid only | Only the 11 preset SurfaceMaterials. MyTexturesList / WallSurfacePanel / SwatchPicker stay as-is. | ✓ |
| Also wallpaper + paint pickers | Extend to wallpaper presets (none exist yet) + SwatchPicker hex colors. Scope creep. | |
| Add a generic "thumbnail provider" utility | Architecturally cleaner but speculative. | |

**User's choice:** SurfaceMaterialPicker grid only
**Notes:** Wallpaper has no preset list (color input only). Paint colors are flat and look fine.

---

## Reduced-motion handling

| Option | Description | Selected |
|--------|-------------|----------|
| Crossfade 150ms, snap if reduced | Subtle opacity fade matches Phase 33 polish. `useReducedMotion()` → instant swap. | ✓ |
| Always snap | No transition. Simplest but jarring. | |

**User's choice:** Crossfade 150ms, snap if reduced
**Notes:** Same pattern as Phase 44 SAVING spinner conditional `animate-spin`.

---

## PBR failure mode

| Option | Description | Selected |
|--------|-------------|----------|
| Flat hex color tile | Fall back to `material.color` div on map load failure. Reuses Phase 32 PbrErrorBoundary spirit. | ✓ |
| Show error state | Red border or warning icon. | |

**User's choice:** Flat hex color tile
**Notes:** Jessica should never see "your texture failed to load" UI — graceful degradation matches Phase 32.

---

## Claude's Discretion

- Exact thumbnail render dimensions (recommend 128×128 px DPR-aware)
- Plane geometry size + UV repeat count for PBR thumbnails
- Whether to expose a `__resetSwatchThumbnailCache()` test helper
- Generator module's public API naming

## Deferred Ideas

- Generic thumbnail provider architecture for all pickers
- IndexedDB persistence of generated thumbnails
- Hover preview with larger thumbnail
- Studio lighting customization (warm/cool)
- Wallpaper preset library with thumbnails
