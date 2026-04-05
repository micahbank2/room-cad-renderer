# Phase 3: 3D Product Rendering - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-04-04
**Phase:** 03-3d-product-rendering
**Mode:** --auto (all decisions Claude's recommended defaults)

---

## Gray Areas Auto-Selected

| Area | Recommended Default Captured |
|------|------------------------------|
| Product texture loading | Migrate to async TextureLoader + module-level cache + error-safe fallback |
| Null-dim products in 3D | Preserve Phase 2 accent-purple placeholder, no texture |
| Floor texture | Procedural wood-plank (Canvas2D), 4 ft tile scale, with normal map |
| Shadow quality | PCF soft shadows, 4096 mapSize on sun |
| Tone mapping | ACES Filmic, exposure 1.0, sRGB output |
| Indirect lighting | drei `<Environment preset="apartment" />` |
| Wall material | Warm off-white PBR, roughness 0.85 (no textures) |
| Product material | roughness 0.55 / metalness 0.05 for real products |
| Export selector fix | `.bg-gray-900 canvas` → `.bg-obsidian-deepest canvas` |
| Export filename | `room-YYYYMMDD-HHmm.png` |
| Export gate | 3D-only; toast if user is in 2D view |
| Export resolution | Current on-screen resolution, no upscaling |
| preserveDrawingBuffer | Enable on Canvas gl prop for reliable toDataURL |

All defaults locked in CONTEXT.md. Deferred ideas captured for future phases.
