# Feature Research — v1.7 3D Realism

**Domain:** Browser interior-design CAD with PBR materials, user-uploaded textures, camera presets
**Researched:** 2026-04-20
**Confidence:** HIGH on Sweet Home 3D / SketchUp / Planner 5D specifics; MEDIUM on Roomstyler/Coohom (sparse public docs); HIGH on Three.js technical numbers

---

## 1. PBR Material Library — Numerical Defaults

### Texture Resolution

Spectrum from real apps and PBR libraries:

| Source | Default ship resolution | Notes |
|--------|------------------------|-------|
| Sweet Home 3D ([docs](https://www.sweethome3d.com/import-textures/)) | **256×256** recommended | "do not import images with a large resolution... 256×256 generally give good results"; Java3D rounds to power of 2 |
| Planner 5D ([docs](https://support.planner5d.com/en/articles/5876729-custom-textures-web)) | **512×512 min, 1024×1024 max** for user uploads | Hard cap |
| 3DTextures.me free tier | **1024×1024** PNG, 4K is paid tier | Industry "free baseline" |
| FreePBR.com ([site](https://freepbr.com/)) | **2048×2048** ships as default | Used by Unity/Unreal devs |
| SketchUp ([guide](https://designerhacks.com/import-sketchup-textures-create-custom-materials/)) | "at least 2000×2000" recommended | Pro audience tolerates larger files |

**Recommended default for Room CAD Renderer: 1024×1024 albedo + 512×512 normal + 512×512 roughness.** Justification: Jessica's room views are typically a single wall at a time at desktop resolution (~1500px wide); 1024 albedo gives visual fidelity without IndexedDB bloat. Normal/roughness can run at half resolution — the eye doesn't resolve them at the same level as color. Total per-material budget: ~1.5–2 MB uncompressed PNG, ~300–500 KB as compressed JPG/WEBP.

### Variants Per Material Category

The existing catalog has 11 surface materials (`surfaceMaterials.ts`). Industry pattern is **1–3 PBR variants per category** at MVP, expanded over time:

| Category | Existing Catalog | Recommended PBR Variants for v1.7 |
|----------|------------------|-----------------------------------|
| WOOD_PLANK | 1 (ceiling-only currently) | **1 default PBR set** (oak-tone planks) |
| CONCRETE | 1 (shared floor/ceiling) | **1 default PBR set** (rough industrial) |
| PLASTER | 1 (ceiling) | **1 default PBR set** (smooth interior) |
| PAINTED_DRYWALL | 1 (ceiling) | **Skip — keep flat per PROJECT.md scope** |

Reason for 1-variant minimum: each PBR set is 3 image files (albedo+normal+roughness). Shipping 3 variants per category = 9 categories × 3 maps × 3 variants = 81 files. Jessica is one user; she does not need 3 wood variants on day one. Add later if she asks.

### Tiling / Repeat Defaults (Real-World Units)

Three.js does not auto-handle real-world units; `texture.repeat` must be computed from geometry size and texture's physical dimension ([three.js forum](https://discourse.threejs.org/t/how-do-i-repeat-texture-with-fixed-size/9158)).

The existing `SurfaceMaterial.defaultScaleFt` field already encodes "one tile = N feet of wall." Recommended PBR defaults aligned with real-world product dimensions:

| Material | `defaultScaleFt` (current) | Recommended (matches real product sizes) | Real-world reference |
|----------|---------------------------|------------------------------------------|---------------------|
| WOOD_PLANK | 0.5 | **0.5 ft (6")** | Standard plank width |
| CONCRETE | 4 | **4 ft** | Poured slab "joint" pattern |
| PLASTER | 4 | **4 ft** | Continuous, no real tile size — large to hide repetition |
| TILE_WHITE / TILE_BLACK (existing flat) | 1 | Keep 1 ft (12" tile) | Standard floor tile |
| MARBLE | 2 | Keep 2 ft (24" slab) | Standard slab |
| WOOD_OAK / WALNUT | 0.5 | Keep 0.5 ft | Standard plank |

**Repeat formula** (already used by floor in v1.2): `texture.repeat.set(roomWidthFt / scaleFt, roomLengthFt / scaleFt)`.

---

## 2. User-Uploaded Textures — UX Pattern

### Single-image vs Full-PBR-Map Upload

| App | Upload model | Source |
|-----|--------------|--------|
| Sweet Home 3D | **Single image** + width OR height (other auto-calculated from aspect) | [import-textures](https://www.sweethome3d.com/import-textures/) |
| Planner 5D | **Single image**, no PBR maps from user | [custom-textures](https://support.planner5d.com/en/articles/5876729-custom-textures-web) |
| SketchUp | **Single image** with width/height tile size in Texture Editor; no PBR import in core | [help.sketchup.com](https://help.sketchup.com/en/sketchup/adding-colors-and-textures-materials) |

**Recommendation: ship single-image albedo upload only.** Defer normal/roughness map upload. Three reasons: (1) every comparable app does this; (2) Jessica's source material is Pinterest screenshots and store photos — she has no normal maps; (3) the v1.7 PROJECT.md explicitly says "single image → albedo, with optional advanced pathway" — keep "optional" as out-of-scope-for-v1.7.

### Real-World Scale Detection

This is the central UX problem. **None of the surveyed apps auto-detect scale** — all require user input:

| App | How user specifies real-world size |
|-----|-----------------------------------|
| Sweet Home 3D | Text inputs for Width or Height in cm at import time; locked aspect ratio | [docs](https://www.sweethome3d.com/import-textures/) |
| SketchUp | Width/Height fields in Texture Editor; chain icon to lock aspect | [help](https://help.sketchup.com/en/sketchup/adding-colors-and-textures-materials) |
| Planner 5D | No explicit scale input — uses default repeat per surface category | [docs](https://support.planner5d.com/en/articles/5876729-custom-textures-web) |

**Recommended UX for Room CAD Renderer:**
1. Upload field (existing `FileReader.readAsDataURL` pattern from `ProductForm.tsx`)
2. Single text input: **"Real-world tile size"** with feet+inches parser (already built in Phase 29 `dimensionParser.ts`)
3. Default value: **1 ft × 1 ft** (matches the most common case — Jessica drops a 12"×12" tile photo)
4. Aspect ratio locked from image natural dimensions (Sweet Home 3D model)
5. Live preview tile in modal at the specified physical size on a 1ft grid swatch

This is **3 inputs total**: image picker, tile size, name. Matches the simplicity bar of `ProductForm.tsx` (which is 4 inputs for products).

### Image Preprocessing

| Feature | Industry behavior | Recommendation for v1.7 |
|---------|-------------------|------------------------|
| Square cropping | None of the surveyed apps auto-crop | **Skip** — accept any aspect, store natural dimensions |
| Seamless tile detection | None auto-detect; SketchUp guidance says "ensure it is seamlessly tiled" ([source](https://designerhacks.com/import-sketchup-textures-create-custom-materials/)) | **Skip detection, document expectation** in upload modal helper text |
| Normal-map auto-generation | None of the surveyed apps; specialized tools (Substance, Materialize) do this | **Skip** — out of scope per PROJECT.md |
| Power-of-two enforcement | Sweet Home 3D auto-rounds (Java3D); WebGL2 + three.js handles NPOT for clamped textures, but `RepeatWrapping` requires POT in WebGL1 ([three.js docs](https://threejs.org/docs/#api/en/textures/Texture)) | **Resize to nearest POT (256/512/1024) at upload** to guarantee `RepeatWrapping` works |

### Persistence Model

| App | Library scope |
|-----|---------------|
| Sweet Home 3D | Per-user library (`.sh3d` preferences file); reusable across all projects |
| Planner 5D | Per-account global (cloud) |
| SketchUp | Per-document by default; can be saved to user library |

**Recommendation: global library**, mirror existing `productStore` pattern. Rationale: PROJECT.md key decision states "Global product library — Jessica uploads once, uses across all projects. ✓ Good." Same logic applies to textures. Storage location: extend existing IndexedDB schema with a new `textureLibrary` store keyed similarly to `productStore`.

---

## 3. Camera Presets — Spec

### Standard Preset Set

SketchUp's Camera > Standard Views menu ([help.sketchup.com](https://help.sketchup.com/en/sketchup/shortcuts)) defines the canonical set: **Top, Bottom, Front, Back, Left, Right, Iso**. Mac shortcuts: Cmd+1 through Cmd+7 (PC has no defaults).

For an interior-design tool, the Bottom/Back/Left/Right views are not useful (you don't look at a room from below). The proposed v1.7 set — **eye-level, top-down, 3/4, corner** — is the right cut. Mapping to industry convention:

| Preset | Industry parallel | Defaults for Room CAD Renderer |
|--------|-------------------|-------------------------------|
| **Eye-level (1)** | Walk-mode / first-person | Already exists per Phase #45 partial; PointerLockControls at 5.5 ft above floor at room center (or last walk position). Camera target: horizon at 5.5 ft, looking +Z |
| **Top-down (2)** | SketchUp "Top" / Plan view | Position: room-center XZ, **Y = 1.5 × max(roomWidth, roomLength) ft** above floor (frames whole room with margin). Look-at: room center at floor level. Up vector: +Z (so room "front" stays at top of screen) |
| **3/4 (3)** | SketchUp "Iso" / current default orbit | Existing app default. Position: ~30° elevation, ~45° azimuth from room center; distance ≈ 1.8 × room diagonal |
| **Corner (4)** | Architectural "perspective" view | Position: at one room corner, ceiling-height (room.ceilingHeight - 0.5 ft), looking diagonally to opposite corner |

### Smooth Tween vs Snap

**Three.js does not provide tweening out of the box.** Standard pattern is `@tweenjs/tween.js` ([three.js forum](https://discourse.threejs.org/t/solved-how-to-add-smooth-transition-to-three-js-orbital-camera/657)) or [yomotsu/camera-controls](https://github.com/yomotsu/camera-controls) which has `setLookAt(...,enableTransition=true)` built in.

**Recommendation: smooth tween, 600ms, easeInOutCubic**, position + lookAt animated together. After tween completes, call `OrbitControls.update()` to re-sync orbit center ([forum](https://discourse.threejs.org/t/orbit-controls-update-after-camera-tween/27812)).

Rationale: snap is jarring when comparing two angles of the same room — Jessica needs spatial continuity to understand "the camera moved from there to here." 600ms is the standard motion duration for spatial transitions (long enough to track, short enough not to feel sluggish).

**Implementation note:** OrbitControls and PointerLockControls cannot both be active simultaneously. When switching INTO eye-level (preset 1), tween OrbitControls camera to eye-level position, then swap controllers. When switching OUT, capture current PointerLock position as the orbit start point.

### Hotkeys

Proposed `1/2/3/4` is consistent with SketchUp Mac (Cmd+1..7). Recommendation: **bare 1/2/3/4** (no modifier) since the app has no modal text inputs that conflict with single-key shortcuts in 3D view (the 2D canvas tool shortcuts V/W/D/N already follow this pattern per CLAUDE.md). Disable when any text input is focused (use existing `document.activeElement` guard pattern from `useKeyboardShortcuts`).

### Visual Indicator

SketchUp shows the active scene tab highlighted. Recommendation: **active toolbar button gets `bg-accent/20 text-accent-light border-accent/30`** styling per the Obsidian CAD theme conventions in CLAUDE.md. No on-canvas indicator needed (would clutter the 3D view).

---

## Feature Dependencies

```
PBR material upgrade
    └──requires──> Three.js TextureLoader + repeat config (already exists for floor in v1.2)

User-uploaded textures
    └──requires──> Single-image upload (pattern already exists in ProductForm.tsx)
    └──requires──> Feet+inches parser (already exists from Phase 29)
    └──requires──> productStore IndexedDB pattern (already exists)
    └──enhances──> PBR material upgrade (uploaded textures slot into the same slot system)

Camera presets
    └──requires──> Tween library (new dep: @tweenjs/tween.js OR camera-controls)
    └──requires──> Existing PointerLockControls + OrbitControls (both exist)
    └──conflicts──> walk-mode active state (need state machine: orbit-mode | walk-mode | tweening)
```

---

## MVP Definition (v1.7 Scope)

### Launch With (v1.7)

- [ ] **PBR maps for WOOD_PLANK, CONCRETE, PLASTER** — 1 variant each, 1024 albedo + 512 normal + 512 roughness, ship as static assets in `src/assets/textures/`
- [ ] **User-upload modal** — single image + tile size input + name + global library persistence (extend `productStore` pattern as `textureLibrary` store)
- [ ] **4 camera presets** — eye-level, top-down, 3/4, corner with `1/2/3/4` hotkeys, 600ms tween, active-state highlight
- [ ] **Tech-debt sweep** per PROJECT.md (orphan files, GH issue closure, resolver migration)

### Add After Validation (v1.8+)

- [ ] Multiple PBR variants per category (oak vs walnut PBR, polished vs rough concrete)
- [ ] User upload of normal/roughness maps (advanced pathway)
- [ ] Custom camera presets (Jessica saves her favorite angle)
- [ ] Camera path animation (record fly-through)

### Future Consideration

- [ ] AI-generated PBR maps from single albedo upload (Materialize-style)
- [ ] Environment map upload (HDRi backdrops)
- [ ] Per-room camera preset memory (different presets per room)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| PBR maps shipped (3 mats) | HIGH | LOW (3 asset triplets, swap material → MeshStandardMaterial map slots) | P1 |
| User texture upload, single image | HIGH | LOW (reuse ProductForm pattern + dim-parser + productStore pattern) | P1 |
| Camera preset top-down | HIGH | LOW (math only, no new lib if we use TWEEN) | P1 |
| Camera preset eye-level | HIGH | MEDIUM (controller swap state machine) | P1 |
| Camera preset 3/4 + corner | MEDIUM | LOW (math only) | P1 |
| Smooth tween animation | MEDIUM | LOW (TWEEN.js or camera-controls — small dep) | P1 |
| User upload normal map | LOW | MEDIUM (Jessica has no normal maps) | P3 |
| Auto-POT resize on upload | MEDIUM | LOW (canvas drawImage to POT canvas, export) | P2 |
| Per-preset hotkey hints in toolbar | LOW | LOW | P2 |
| Custom saved camera angle | MEDIUM | MEDIUM | P3 |

---

## Competitor Feature Analysis

| Feature | Sweet Home 3D | Planner 5D | SketchUp | Recommended for Room CAD Renderer |
|---------|---------------|------------|----------|----------------------------------|
| Texture upload format | Single image | Single image | Single image | **Single image** |
| Tile size input | Width OR height (auto aspect) | None (fixed default) | Width + Height with chain lock | **Single tile-size in feet+inches, locked aspect** |
| Max upload resolution | "256×256 generally good" | 1024×1024 hard cap | "at least 2000×2000" | **1024×1024 cap, auto-resize larger to 1024 POT** |
| PBR variants per category at launch | ~1–2 in built-in library | Many (cloud catalog) | 1 (user adds more) | **1 per category for v1.7** |
| Camera preset count | 4 (Top, Aerial, Virtual visit + free) | Several built-in | 7 standard + custom scenes | **4 (eye, top, 3/4, corner)** |
| Hotkey scheme | None native | None | Cmd+1..7 (Mac) | **1/2/3/4 bare** |
| Transition style | Snap | Snap | Snap (Animate Scenes plugin tweens) | **Tween 600ms easeInOutCubic** |

---

## Sources

**PBR Texture Resolution & Libraries:**
- [Sweet Home 3D — Textures import](https://www.sweethome3d.com/import-textures/) — 256×256 recommended, Java3D POT requirement
- [Planner 5D — Custom Textures (Web)](https://support.planner5d.com/en/articles/5876729-custom-textures-web) — 512–1024 px range
- [3DTextures.me](https://3dtextures.me/) — 1024×1024 default
- [FreePBR.com](https://freepbr.com/) — 2048×2048 standard
- [SketchUp Designer Hacks — Import textures](https://designerhacks.com/import-sketchup-textures-create-custom-materials/) — 2000×2000+ recommendation

**Three.js Texture Tiling:**
- [Three.js forum — How do I repeat texture with fixed size](https://discourse.threejs.org/t/how-do-i-repeat-texture-with-fixed-size/9158)
- [Three.js forum — Real-world dimensions for tile textures](https://discourse.threejs.org/t/how-to-make-a-single-uv-map-work-for-multiple-tile-textures-with-real-world-dimensions/86244)
- [Three.js Texture API docs](https://threejs.org/docs/#api/en/textures/Texture)

**User Upload UX:**
- [Sweet Home 3D — personalizedTexturesGuide.pdf](https://www.sweethome3d.com/personalizedTexturesGuide.pdf)
- [SketchUp Help — Materials, Textures, and Environments](https://help.sketchup.com/en/sketchup/adding-colors-and-textures-materials)
- [Planner 5D — Custom Textures docs](https://support.planner5d.com/en/articles/5876729-custom-textures-web)

**Camera Presets & Tween:**
- [SketchUp Help — Shortcuts (Cmd+1..7 Mac)](https://help.sketchup.com/en/sketchup/shortcuts)
- [SketchUp Community — Keyboard shortcut for Top View](https://forums.sketchup.com/t/keyboard-shortcut-for-top-view-or-any-views/114211)
- [Three.js forum — Smooth transition to orbital camera](https://discourse.threejs.org/t/solved-how-to-add-smooth-transition-to-three-js-orbital-camera/657)
- [yomotsu/camera-controls (GitHub)](https://github.com/yomotsu/camera-controls) — built-in smooth setLookAt
- [Three.js forum — OrbitControls update after Tween](https://discourse.threejs.org/t/orbit-controls-update-after-camera-tween/27812)
- [Animating Camera Movement in Three.js (DEV)](https://dev.to/pahund/animating-camera-movement-in-three-js-17e9) — TWEEN.js patterns

---

*Feature research for: Room CAD Renderer v1.7 3D Realism*
*Researched: 2026-04-20*
