# Technology Stack — v1.3 Color, Polish & Materials

**Project:** Room CAD Renderer
**Researched:** 2026-04-05
**Scope:** Stack additions and integration points for v1.3 only.
         Existing tech (React 18, Fabric.js v6, Three.js/R3F/drei, Zustand v5 + Immer,
         idb-keyval, Tailwind v4) is locked — not re-researched here.

---

## Summary of Net-New Dependencies

| Package | Version | Feature Area | Why |
|---------|---------|-------------|-----|
| `react-colorful` | `^2.7.3` | Color & Paint System | Tiny hex color picker, no runtime deps |

That's it. **One new npm package.** Everything else is implemented using existing stack.

---

## Feature-by-Feature Stack Decisions

### 1. Color & Paint System

#### 1a. Color Picker UI — `react-colorful`

**Add:** `react-colorful ^2.7.3`

**Why react-colorful over alternatives:**
- 2.8 KB gzipped, zero runtime dependencies (confirmed: no peer deps beyond React)
- ~3M weekly downloads — de-facto standard for React hex pickers
- Ships a `HexColorPicker` component that outputs `#rrggbb` strings directly, matching existing hex storage in `Wallpaper`, `WainscotConfig`, `CrownConfig`, and `WallArt`
- Alternative `react-color` is unmaintained (last release 2020), bloated (~70 KB)
- OKLCH pickers (Evil Martians, oklch-picker) are overkill — Jessica thinks in paint names not color math

**Integration:** Drop into `WallSurfacePanel.tsx` and any new paint picker component. HexColorPicker binds directly to the hex string stored in the Wallpaper `color` field and the new PaintSwatch type described below.

**Install:**
```bash
npm install react-colorful
```

#### 1b. Farrow & Ball Color Catalog — Static Data File

**Do NOT add an npm package.** Ship the catalog as a static TypeScript data file at `src/data/paintColors.ts`.

**Rationale:**
- The `jpederson/colornerd` GitHub project contains `farrow-ball.json` with all 132 Farrow & Ball hex codes and names in JSON — freely available to copy and adapt as static data
- 132 colors × ~60 bytes each = ~8 KB of raw data, trivially small
- No CDN, no fetch, no runtime dependency, no license ambiguity when embedded as a lookup table
- Farrow & Ball updated to 132 colors (9 new + 3 archive) in February 2025; the catalog should be manually verified against `convertingcolors.com/list/farrow-ball.html` during implementation

**Data shape (new type in `src/types/paint.ts`):**
```typescript
export interface PaintColor {
  id: string;       // "farrow-ball-001" or "custom-abc123"
  name: string;     // "All White", "Elephant's Breath"
  hex: string;      // "#fdfbfc"
  source: "farrow-ball" | "custom";
  limeWash?: boolean; // toggle stored per color in the palette
}

export interface PaintLibrary {
  colors: PaintColor[];
}
```

**No new Zustand store needed.** The Farrow & Ball catalog is static (data file). Custom user colors are a short list (< 20 in practice) — persist them via a single `idb-keyval` key `room-cad-paint-custom-colors`, loaded once in App.tsx using the same load-gated pattern as `framedArtStore` and `wainscotStyleStore`. Wire state with a lightweight new store at `src/stores/paintStore.ts` that holds `customColors: PaintColor[]`.

#### 1c. Lime Wash Effect — `meshStandardMaterial` Properties Only

**Do NOT add a shader library or custom GLSL.** Lime wash is achievable with existing Three.js `meshStandardMaterial` properties.

**How lime wash looks physically:** Chalky, matte, slightly translucent color variation, visible brush-stroke texture. The key visual cues are:
1. Very high roughness (~0.97)
2. Slightly reduced saturation compared to the base hex
3. Subtle color variation — a noise/grain overlay pass

**Implementation approach — two-tier:**

**Tier 1 (ship first):** Pure material parameters on the existing `<meshStandardMaterial>`.
```tsx
// Lime wash = same color, roughness pushed to 0.97, faint white blend
<meshStandardMaterial
  color={blendWithWhite(hex, 0.12)} // darken slightly — limewash reads lighter in-person
  roughness={0.97}
  metalness={0}
/>
```
`blendWithWhite(hex, t)` is a 10-line pure utility in `src/lib/colorUtils.ts` — no library needed. This is HIGH confidence — existing wall materials already use roughness 0.85; pushing to 0.97 on a matte chalky color visually reads as lime wash.

**Tier 2 (defer to later phase if needed):** Add a procedural noise roughness map via `onBeforeCompile`. This requires no new npm package — Three.js `onBeforeCompile` is a first-class API on `MeshStandardMaterial`. Worth deferring because Tier 1 reads convincingly at room scale and R3F's declarative `<meshStandardMaterial>` JSX does not cleanly support `onBeforeCompile` without a `useEffect` workaround.

**In 2D (Fabric.js):** Paint color on walls renders as the wall's fill color on the 2D canvas polygon. Lime wash in 2D = same hex with a 10% opacity white overlay rendered as a stacked `fabric.Rect` or via Fabric's `fill` opacity — no library change needed.

#### 1d. Applying Paint to Walls and Ceilings — Store Integration

**No new store or new type needed for basic paint-on-walls.** The existing `Wallpaper` interface already supports `kind: "color"` with a hex string. Paint-as-color IS a wallpaper with `kind: "color"`. The paint system extends the existing pathway:

```typescript
// Existing Wallpaper type already handles this
{ kind: "color", color: "#e3c9b4" }  // i.e. "Setting Plaster" applied to wall
```

For lime wash, add an optional flag:
```typescript
export interface Wallpaper {
  kind: "color" | "pattern";
  color?: string;
  imageUrl?: string;
  scaleFt?: number;
  limeWash?: boolean; // NEW — only meaningful when kind="color"
}
```

**For ceilings:** `Ceiling.material` is a bare hex string `"#f5f5f5"`. To support paint + lime wash on ceilings, extend the type:
```typescript
// Option A (minimal change): prefix convention
// material = "#hexcolor" | "limewash:#hexcolor" | "preset-id"
// CeilingMesh parses the prefix — no type migration required

// Option B (clean): expand Ceiling.material to a union type (requires snapshot migration)
```
Option A is recommended for v1.3. It keeps `Ceiling.material` as `string`, requires no `migrateSnapshot` changes, and `CeilingMesh.tsx` already has a `startsWith("#")` guard that the new prefix logic slots into cleanly.

---

### 2. v1.2 Polish Pass

#### 2a. Custom Element Edit Handles — Existing Tool Pattern

**No new dependency.** Extend `selectTool.ts` using the existing drag-type pattern.

The tech debt item from the audit: "Edit-handle wiring: selectTool doesn't hit-test PlacedCustomElement."

The fix follows the exact same pattern used for `PlacedProduct`:
- Add `"custom-element"` and `"custom-element-rotate"` and `"custom-element-resize"` to `DragType` union in selectTool
- Add hit-test block in `mousedown` handler using the same AABB + rotation handle geometry already used for products
- Wire `moveCustomElement` / `rotateCustomElement` / `resizeCustomElementNoHistory` calls in `mousemove`
- `CustomElement` already has `width`, `depth`, `height` in feet — all geometry data is present

**Fabric.js v6 custom controls API** is available but unnecessary here. The codebase uses imperative hit-testing against store data (not Fabric's built-in selection/controls system) — maintaining this pattern avoids mixing two incompatible selection paradigms.

#### 2b. Library Edit-In-Place UI — React State Only

**No new dependency.** The `wainscotStyleStore.updateItem` action already exists (confirmed in `wainscotStyleStore.ts:44`). Only the UI is missing.

Implementation is a React controlled form inside `WainscotLibrary.tsx`, gated by an edit mode boolean. Pattern matches `ProductForm.tsx`. No new library needed.

#### 2c. Copy-Side Buttons — Zustand Action Only

**No new dependency.** Add `copySideWainscot(wallId, from: WallSide, to: WallSide)` action to `cadStore`. Reads `wall.wainscoting[from]`, deep-copies, writes to `wall.wainscoting[to]`. Same pattern for wallpaper and crown molding copy-side variants.

#### 2d. Per-Placement Frame Override — Type Extension Only

**No new dependency.** Extend `WallArt` with:
```typescript
frameStyle?: FrameStyle;           // already exists
frameColorOverride?: string;       // NEW — hex, overrides preset.color if set
```
`WallMesh.tsx` already reads `FRAME_PRESETS[art.frameStyle]` and applies `preset.color`. Adding an optional override is a one-line conditional.

---

### 3. Advanced Materials — Unified Ceiling/Floor Texture Catalog

#### 3a. Shared Material Preset Type — New Data File Only

**No new dependency.** Create `src/data/materialCatalog.ts` as the single source of truth for all ceiling and floor presets.

Current state:
- Floor presets: `src/data/floorMaterials.ts` — 8 solid-color presets
- Ceiling presets: ad-hoc hex string in `Ceiling.material`

Target state:
```typescript
// src/data/materialCatalog.ts
export interface MaterialPreset {
  id: string;
  label: string;
  color: string;       // base hex
  roughness: number;
  imageUrl?: string;   // bundled texture (optional — future phase)
  category: "floor" | "ceiling" | "both";
}
```

Floor presets migrate from `FLOOR_PRESETS` record format → `MaterialPreset[]`. The `FloorMesh.tsx` and `CeilingMesh.tsx` consumers update their imports. No schema migration needed because preset IDs remain stable strings.

#### 3b. Texture Images — Bundled Static Assets

If real texture images are added to presets (wood grain, marble veining, etc.), place them in `public/textures/` and reference via `/textures/oak.jpg`. Three.js `TextureLoader` resolves from the public root — no import/build pipeline changes needed.

**Vite handles this natively.** No new plugin or loader dependency required. Images in `public/` are served at root. This is the same mechanism the existing floor custom upload uses (data URLs) but with stable URL strings instead.

#### 3c. Shared Picker Component — React Component Only

**No new dependency.** Build a `MaterialPicker.tsx` component in `src/components/` that takes `category: "floor" | "ceiling" | "both"` and renders the filtered `materialCatalog` entries plus the custom upload slot (for floor). This replaces `FloorMaterialPicker.tsx` (currently standalone) with a unified version.

---

## Alternatives Rejected

| Category | Rejected | Why Rejected |
|----------|----------|--------------|
| Color picker | `react-color` | Unmaintained since 2020, 70 KB+ |
| Color picker | Custom `<input type="color">` | Browser chrome varies wildly, no hex text input |
| Lime wash | Custom GLSL shader | Overkill for room-scale rendering; material params sufficient |
| Lime wash | `THREE-CustomShaderMaterial` (CSM) | Adds a dep for a visual effect achievable in ~5 lines |
| Paint catalog | npm package (colornerd) | Entire library is 30K colors; we need 132 — just embed them |
| Paint catalog | API/fetch from remote | Offline-capable tool, no backend, no external fetch |
| Paint store | Separate Zustand store for all colors | Static catalog needs no store; only custom colors need persistence |
| Material catalog | New file format / asset pipeline | Vite's public/ folder handles static textures natively |
| Ceiling material | Proper union type in CADSnapshot | String prefix convention avoids migration for v1.3 scope |

---

## Installation

```bash
# Only new dependency for the entire v1.3 milestone
npm install react-colorful
```

---

## Confidence Assessment

| Claim | Confidence | Basis |
|-------|-----------|-------|
| react-colorful is 2.8 KB, zero deps, ~3M weekly downloads | HIGH | Multiple npm/snyk/npmtrends sources agree |
| react-colorful `HexColorPicker` outputs `#rrggbb` string | HIGH | Official docs + GitHub README |
| Farrow & Ball catalog is 132 colors, JSON available via colornerd | MEDIUM | WebSearch confirms 132 count; colornerd GitHub confirmed to have the file; hex accuracy should be spot-checked at implementation |
| Lime wash via roughness=0.97 reads convincingly at room scale | MEDIUM | Based on Three.js material model understanding + existing codebase roughness values; no direct test, validate during phase |
| `Wallpaper { limeWash: boolean }` extension is backward-compatible | HIGH | `limeWash` is optional — undefined === false for all existing records |
| `Ceiling.material` string prefix approach avoids migration | HIGH | `CeilingMesh.tsx` already guards on `startsWith("#")`; adding `startsWith("limewash:")` follows same pattern |
| Fabric.js v6 custom hit-testing for custom elements needs no new API | HIGH | Confirmed by reading existing selectTool.ts — PlacedProduct hit-testing is identical pattern |
| Vite serves `public/textures/` at root without config changes | HIGH | Standard Vite behavior, documented |

---

## Sources

- [react-colorful npm](https://www.npmjs.com/package/react-colorful) — version, size, downloads
- [react-colorful GitHub](https://github.com/omgovich/react-colorful) — API surface, zero deps claim
- [colornerd GitHub (jpederson)](https://github.com/jpederson/colornerd) — Farrow & Ball JSON source
- [Converting Colors — Farrow & Ball](https://convertingcolors.com/list/farrow-ball.html) — 132 color hex verification
- [Farrow & Ball 2025 new colors](https://www.hirshfields.com/farrow-ball-new-colors-2025/) — confirms Feb 2025 update to 132 total
- [Three.js MeshStandardMaterial docs](https://threejs.org/docs/pages/MeshStandardMaterial.html) — roughness, color, onBeforeCompile
- [Extending Three.js materials with GLSL](https://medium.com/@pailhead011/extending-three-js-materials-with-glsl-78ea7bbb9270) — onBeforeCompile technique reference
- [Fabric.js v6 custom controls](https://fabricjs.com/docs/configuring-controls/) — existing controls API (confirmed no new approach needed)
- [Fabric.js v6 custom controls discussion](https://github.com/fabricjs/fabric.js/discussions/9708) — v6 API stability
