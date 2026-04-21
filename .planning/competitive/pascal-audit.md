# Competitive Audit: Pascal Editor

**Audited:** 2026-04-21
**Source:** [github.com/pascalorg/editor](https://github.com/pascalorg/editor) (Turborepo monorepo)
**Tech stack:** Next.js + React Three Fiber + WebGPU + Zustand + Zundo + Zod + IndexedDB

---

## Executive summary

Pascal Editor is an **architect-oriented** 3D building editor. Our tool is **interior-design oriented**. The two target different buyers with different needs — Pascal thinks in Site → Building → Level → Zone → Items; we think in Rooms → Walls → Finishes (paint, wallpaper, wainscoting, art, furniture).

**Where Pascal is stronger:** UX chrome (keyboard shortcuts UI, context menus, hierarchical sidebar tree), architectural primitives (stairs, slabs, roofs, multi-level buildings with display modes), schema rigor (Zod validation, systems/renderers separation).

**Where we're stronger:** Interior finishes (paint system with Farrow & Ball library, wallpaper kinds, wainscoting styles, crown molding, wall art with framing, custom-element uploads, PBR materials), dimension editing, smart-snap, auto-save UX.

**Recommendation:** Do NOT broaden our scope toward architectural primitives. Do adopt Pascal's UX chrome patterns, schema discipline, and the "level modes" (stacked/exploded/solo) pattern adapted to our room-centric model.

---

## Architecture comparison

| Dimension | Pascal | Ours | Notes |
|-----------|--------|------|-------|
| Rendering | React Three Fiber + WebGPU | R3F + WebGL | WebGPU gives Pascal post-processing upside. For our current scope WebGL is fine; revisit post-v1.7. |
| State | 3 Zustand stores (`useScene`, `useViewer`, `useEditor`) | 2 (`cadStore`, `uiStore`) | Their split `useViewer` (camera/selection) out of `useEditor` (tool/panel) is cleaner. Worth considering if our uiStore bloats. |
| Undo/redo | Zundo (library) | Custom structuredClone snapshots | We already ship; no urgent swap. But Zundo handles branches + time-travel cleanly if we ever want those. |
| Persistence | IndexedDB | IndexedDB (idb-keyval) | Parity. |
| Schema validation | Zod schemas for every node type | TypeScript only (compile-time) | Zod adds runtime safety for deserialized snapshots. Real value when we ship cloud sync (v2) or user-imported files. |
| Architecture pattern | Schemas → Systems (geometry gen) → Renderers (R3F components) | Mostly merged in mesh components | We already have informal split (e.g., `geometry.ts` for math, `CeilingMesh.tsx` for render). Formalizing it would ease testing. |
| Event bus | Dedicated module | Not present | We use Zustand subscriptions. Event bus is nice for cross-system messages (e.g., "node focused" → multiple systems react) but not urgent. |
| Spatial queries | Dedicated module (`spatial-queries`) | Inline in tools / `geometry.ts` | Extracting ours into a dedicated module would help as more tools need snap/hit-test logic. |

---

## Node-graph comparison

### Pascal's hierarchy
```
Site → Building → Level → Zone → Items
```
- **Building** can have multiple levels (floors)
- **Level** can be stacked, exploded, or soloed (display mode)
- **Zone** groups items (like logical rooms)
- **Items** can include: walls, wall-segments, doors, windows, stairs, stair-segments, slabs, roofs, roof-segments, ceilings, fences, scans, guides

### Our hierarchy
```
Project → Room(s) → Walls / Ceilings / Floor / Placed Products / Custom Elements / Wall Art / Wallpaper / Paint
```
- **Project** has multiple rooms (per cadStore.rooms)
- **Room** has 2D wall geometry + a height; ceiling is a separate customElement
- No "building" or "level" concept — single-floor assumption

**Takeaway:** Pascal's multi-level architecture doesn't fit our scope (Jessica plans one home, typically one floor at a time). But the **level display modes (stacked/exploded/solo)** concept adapts beautifully to our rooms: imagine "solo" a single room, "exploded" separate rooms for visual clarity when planning a multi-room project.

---

## Feature-by-feature comparison

### 🟢 We have (Pascal doesn't)

| Feature | Our impl | Why it matters |
|---------|----------|----------------|
| Paint system | 132 Farrow & Ball colors + custom hex + lime wash | Core value prop for Jessica |
| Wallpaper variants | pattern (uploaded) / color / paint kinds | Real-world design flexibility |
| Wainscoting library | 7 built-in styles + custom heights + per-wall overrides | Differentiator vs pure architect tools |
| Crown molding | Per-wall height + color | " |
| Wall art with framing | Frame styles + per-piece art | " |
| Custom element uploads | User-uploaded images → placed objects | Jessica adds real furniture from Pinterest |
| Dimension editing | Double-click wall label → feet+inches input | Phase 29 win |
| Smart snap | Edges + midpoints with purple accent guides + Alt-disable | Phase 30 win |
| Drag-to-resize | Corner uniform + edge per-axis + wall-endpoint | Phase 31 win |
| Auto-save + silent restore | 2000ms debounced, pointer-based restore | Phase 28 win |
| PBR materials | WOOD_PLANK / CONCRETE / PLASTER just shipped | Phase 32 win |

### 🟡 Pascal has, worth adopting

| Feature | Pascal's take | Adopt as |
|---------|---------------|----------|
| **Keyboard shortcuts dialog** | `settings-panel/keyboard-shortcuts-dialog.tsx` — a discoverable cheat sheet for all hotkeys | **GH issue: add `?` hotkey opens a shortcuts overlay** |
| **Node action menu (right-click)** | `components/editor/node-action-menu.tsx` — context menu on selected node (duplicate, delete, lock, focus camera, etc.) | **GH issue: right-click context menu on walls / products / custom-elements** |
| **Node-level saved cameras** | Every node has optional `camera` field; "focus" button tweens to that viewpoint | **GH issue: per-product/wall "focus camera" action; auto-save camera when manually framed** |
| **Level display modes (solo/exploded/stacked)** adapted to rooms | Solo = hide other rooms; Exploded = offset rooms visually; Stacked = default | **GH issue: room display modes — solo/explode for multi-room projects** |
| **Hierarchical sidebar tree** | Site-panel with expandable Level/Building/Roof/Slab/Stair tree nodes | **GH issue: Rooms panel tree — click to select, drag to reorder, visibility toggle per node** |
| **Full PBR map support** | `MaterialMapsSchema` includes albedo, metalness, roughness, normal, displacement, AO, emissive, bump, alpha, lightmap | **GH issue: extend SurfaceMaterial.pbr to support AO + displacement + emissive** (we have albedo/normal/roughness) |
| **MaterialTarget enum** | Materials declare what surface types they can apply to | **GH issue: add compatibility checks so UI only shows valid materials per surface** |
| **Preset thumbnail generator** | `components/editor/preset-thumbnail-generator.tsx` — auto-renders thumbnails for material/product presets from the 3D scene | **GH issue: auto-generate material swatch thumbnails from the actual renderer** |
| **In-app feedback dialog** | `components/feedback-dialog.tsx` — submit feedback without leaving the app | **GH issue: `Help → Send feedback` dialog with screenshot capture** |
| **Reduced motion hook** | `hooks/use-reduced-motion.ts` — disables animations for users who set OS preference | **GH issue: honor `prefers-reduced-motion` for smart-snap guides + camera tweens** |
| **Issue / PR templates** | `.github/ISSUE_TEMPLATE/` with `bug_report.yml` + `feature_request.yml` + PR template | **Do now (below)** |
| **SETUP.md separate from README** | Dev onboarding in its own file | Low priority; adopt if README gets long |
| **`.claude/rules/` subdirectory** | Per-subsystem rule files (events.md, layers.md, node-schemas.md, renderers.md, scene-registry.md, selection-managers.md, spatial-queries.md) | **GH issue: split current CLAUDE.md into `.claude/rules/*.md` for discoverability** |

### 🔴 Pascal has, NOT worth adopting for us

| Feature | Why not |
|---------|---------|
| Multi-building | Out of scope; Jessica plans one home |
| Stairs + stair-segments | Out of scope (interior) |
| Roofs + slabs | Out of scope (we do ceilings, they do roofs) |
| Fence node type | Out of scope |
| 3D scan import | Nice idea but way out of scope for our tool's buyer |
| Audio settings (UI sfx) | Pure polish; not our priority |
| Guide images | Maybe revisit — uploading a floorplan photo as a guide could help Jessica trace an existing room. LOW priority.  |
| WebGPU migration | R3F v9 is already tracked (#56). WebGPU is overkill for our scene complexity. |

---

## UX/UI observations (from code + tree structure)

### Pascal's UI chrome strengths
1. **Tool palette with named tool icons + hotkeys** — clear affordance
2. **Hierarchical sidebar tree** — see all scene nodes at a glance, drill in to edit
3. **Right-click node action menu** — fast contextual ops
4. **Feedback dialog inline** — no leaving to github
5. **Keyboard shortcuts dialog** — discoverability
6. **Pascal-branded radio component** (`pascal-radio.tsx`) — consistent UI kit
7. **Preset thumbnail auto-generation** — thumbnails always in sync with render

### Ours
1. Tool palette with icons — parity ✓
2. No hierarchical tree — we show things in separate panels (Floor Material / Custom Elements / Art Library / Wainscot Library / Product Library). Works but creates panel sprawl as features accumulate.
3. No right-click context menu — right-click does nothing on canvas
4. No in-app feedback
5. No shortcuts dialog (shortcuts live only in CLAUDE.md)
6. Custom CSS classes (obsidian-CAD theme) — consistent but not componentized
7. Custom logos/thumbnails — product images uploaded by user

### Visual / interaction design patterns worth copying
- **Unified tree sidebar** (collapsible per-section): Rooms → Walls → Per-wall wainscot/paint/wallpaper → Items
- **Hotkey cheat sheet overlay** (press `?`)
- **Right-click context menus** on canvas objects
- **Camera focus** action per node (double-click a wall in the tree → camera tweens to frame it)
- **Node visibility toggles** in the tree (hide a wall to see through it)

---

## Prioritized adopt list (to convert into GH issues)

Sorted by **value / effort** ratio for our interior-design tool:

### Tier 1 — Quick wins (each <1 phase, high UX value)
1. **Keyboard shortcuts dialog** — `?` opens modal listing all V/W/D/N/etc. hotkeys
2. **In-app feedback dialog** — Help menu → Send feedback (stores to local or emails Micah)
3. **Right-click context menus** on canvas objects (duplicate / delete / rename / focus camera)
4. **`.github/ISSUE_TEMPLATE/` + PR template** — stop repeating structure in free-form issues
5. **Reduced motion support** — respect `prefers-reduced-motion` in snap guides + camera tweens
6. **Auto-generated material swatch thumbnails** from renderer (replaces manual swatches)

### Tier 2 — Medium effort (1 phase each)
7. **Rooms hierarchy sidebar tree** — collapsible tree, node visibility toggles, click-to-select-and-focus-camera
8. **Per-node saved camera** — each wall / product / custom element remembers where it looked best; Focus action tweens to it
9. **Room display modes** — solo / explode / default (adapt Pascal's level-modes idea to our rooms)
10. **Extended PBR pipeline** — add AO + displacement + emissive maps to SurfaceMaterial.pbr

### Tier 3 — Architectural refactor (consider before v2)
11. **`.claude/rules/` subdirectory** — split CLAUDE.md into per-subsystem rule files
12. **Zod schemas for runtime validation** of serialized CADSnapshot (catches stale-format issues at load time)
13. **Formal systems/renderers separation** — move geometry generation out of mesh components
14. **Store split** — factor camera/selection state out of uiStore into a dedicated useViewer store

### Tier 4 — Nice-to-have / experimental
15. **Guide image** — upload a floorplan photo and trace walls over it
16. **Material compatibility enum** — materials declare which surface types they target (avoid "concrete walls" if that doesn't make sense)
17. **Event bus** — if cross-system messaging becomes needed

---

## What we should defend + keep doing better

Our interior-design depth is the moat:
- Keep adding paint system features (lime wash was a good move)
- Keep the wall art + wainscoting + crown molding systems rich
- Custom-element uploads are a Jessica-specific differentiator
- PBR for interior materials (wood, concrete, plaster) — continue expanding the catalog in Phase 33+

We should NOT:
- Try to add stairs, roofs, multi-floor. Out of scope.
- Adopt WebGPU just because Pascal did. Our scene complexity doesn't need it.
- Imitate Pascal's audio / sound effects. Not our polish priority.

---

## Recommended next actions

1. **Write the Tier 1 items as GH issues** (label: `competitor-insight` + `enhancement`) — they're small, high-value, and can slot into any upcoming phase or become a polish phase of their own (maybe v1.7.5 or v1.8)
2. **Do the GitHub templates setup immediately** — takes 15 min, standardizes future reporting
3. **Mention Tier 2–3 in the v1.8 planning conversation** — not immediate but should shape milestone scope
4. **Revisit this doc** after Phase 33 to see if Zod schemas + systems/renderers split unlock a cleaner Phase 34 (camera presets) implementation
