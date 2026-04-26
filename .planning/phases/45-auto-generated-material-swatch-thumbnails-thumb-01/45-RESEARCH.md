# Phase 45: Auto-Generated Material Swatch Thumbnails (THUMB-01) — Research

**Researched:** 2026-04-25
**Domain:** Three.js offscreen rendering, PBR texture pipeline, React crossfade UI, Vitest mocking
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Shared module-level `THREE.WebGLRenderer` + Scene + Camera in new `swatchThumbnailGenerator.ts`. No R3F, no hidden DOM node. Per-material flow: `pbrTextureCache.acquireTexture` → `MeshStandardMaterial` → render onto plane → `renderer.domElement.toDataURL("image/png")` → in-memory cache.
- **D-02:** In-memory `Map<materialId, dataURL>` only. No IndexedDB. 11 materials, regen-on-page-load is target <200ms total cold.
- **D-03:** Lazy on first picker mount. All applicable materials for that surface rendered on first mount. Hex `material.color` placeholder while async renders. Cache key: `material.id`.
- **D-04:** `SurfaceMaterialPicker` grid only. Files to touch: `SurfaceMaterialPicker.tsx`, new `swatchThumbnailGenerator.ts`, new `MaterialThumbnail.tsx`. NOT touched: `MyTexturesList.tsx`, `WallSurfacePanel.tsx`, `SwatchPicker.tsx`.
- **D-05:** Studio lighting — NOT scene-matching. Directional at 45°/30°, ambient ~0.4, optional rim. Camera ~30° off-axis. Transparent background.
- **D-06:** Crossfade 150ms opacity transition. Snap (no transition) when `useReducedMotion()` returns true.
- **D-07:** Flat hex color tile on PBR map load failure. Never expose errors to Jessica.
- **D-08:** Lucide-react for any new icons (D-33 carry-forward). No new `material-symbols-outlined` imports.
- **D-09:** Canonical spacing tokens (4/8/16/24/32px) in new components — no `p-3`, no arbitrary `p-[Npx]` (D-34 carry-forward).
- **D-10:** D-39 reduced-motion gated. Only D-06 crossfade introduced.
- **D-11:** Vitest covering: (a) generator returns dataURL; (b) cache hit returns same object; (c) PBR failure resolves to fallback without exception.
- **D-12:** No Playwright screenshot golden for thumbnails (platform-coupling risk per `feedback_playwright_goldens_ci.md`). Visual correctness via dev-server browser check only.

### Claude's Discretion

- Exact thumbnail render dimensions (recommend 128×128 px DPR-aware up to 2×)
- Plane geometry size + UV repeat count (recommend 1–2 tile repeats visible at swatch size)
- Whether to expose `__resetSwatchThumbnailCache()` test helper
- Public API naming for the generator module

### Deferred Ideas (OUT OF SCOPE)

- Generic "thumbnail provider" architecture for all pickers
- IndexedDB persistence
- Hover preview with larger thumbnail
- Studio lighting user customization
- Wallpaper preset library with thumbnails
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| THUMB-01 | Material picker swatches auto-rendered from PBR/material pipeline. No hand-curated PNG assets. Cached per-material. Loading state graceful (hex placeholder). Failure graceful (hex tile). | D-01–D-12 fully address all acceptance criteria. `pbrTextureCache.acquireTexture` provides shared texture loading. `materialsForSurface()` enumerates the 11 materials. `SurfaceMaterialPicker.tsx` line ~48 is the single insertion point. |
</phase_requirements>

---

## Phase Goal Recap

Replace the flat `<div style={{backgroundColor: m.color}}>` swatch tile inside `SurfaceMaterialPicker`'s grid with auto-rendered PBR thumbnails. A new `swatchThumbnailGenerator.ts` module owns a single `THREE.WebGLRenderer`, renders each material onto a plane mesh, captures `toDataURL`, and caches the data URL in-memory for the session. A new `MaterialThumbnail.tsx` host component reads from that cache, shows the hex color placeholder while the async render completes, and crossfades to the thumbnail on completion. All 11 materials go through the same WebGL path for visual consistency.

---

## Touch Surface

### Files Modified
| File | Change |
|------|--------|
| `src/components/SurfaceMaterialPicker.tsx` | Replace `<div style={{backgroundColor: m.color}}>` at line ~48 with `<MaterialThumbnail materialId={m.id} fallbackColor={m.color} />`. Trigger batch generation on mount. |

### Files Created
| File | Purpose |
|------|---------|
| `src/three/swatchThumbnailGenerator.ts` | Module-level `THREE.WebGLRenderer` + Scene + Camera. `generateThumbnail(material: SurfaceMaterial): Promise<string>` (returns dataURL). `getThumbnail(id)` (sync cache read). `generateBatch(materials[])` (sequential render for a surface). In-memory `Map<string, string>` cache. Test-mode `__resetSwatchThumbnailCache()`. |
| `src/components/MaterialThumbnail.tsx` | React host: calls `getThumbnail(materialId)`, triggers batch generation if needed, shows fallbackColor div until dataURL arrives, crossfades (150ms, reduced-motion guarded) on load. |
| `tests/swatchThumbnailGenerator.test.ts` | Vitest covering D-11 assertions. |

### Files Referenced (read-only, not modified)
| File | What to Learn From It |
|------|-----------------------|
| `src/three/pbrTextureCache.ts` | `acquireTexture(url, channel)` and `loadPbrSet(urls)` API. Do NOT call `registerRenderer()` from the thumbnail renderer. |
| `src/three/textureColorSpace.ts` | `applyColorSpace(tex, channel)` — already called inside `acquireTexture`; no direct call needed. |
| `src/data/surfaceMaterials.ts` | `SURFACE_MATERIALS` catalog, `PbrMaps` interface, `materialsForSurface(target)`. Cache key is `material.id`. |
| `src/hooks/useReducedMotion.ts` | D-06 reduced-motion gate. |
| `src/three/Lighting.tsx` | Reference for scene lighting (NOT mirrored — D-05 uses studio setup). |
| `src/three/PbrErrorBoundary.tsx` | Spirit of graceful fallback; not used directly in non-React render path. |
| `src/three/PbrSurface.tsx` | Suspend/ErrorBoundary pattern for reference; thumbnail generator is imperative, not React. |
| `tests/pbrTextureCache.test.ts` | Pattern for mocking `THREE.TextureLoader` in vitest. |
| `tests/setup.ts` | Canvas 2D context stub; WebGL stubs needed for offscreen renderer in tests. |

---

## Technical Approach (Recommended)

### Module: `swatchThumbnailGenerator.ts`

**Renderer initialization (lazy, on first call):**

```typescript
// src/three/swatchThumbnailGenerator.ts
import * as THREE from "three";
import { loadPbrSet } from "./pbrTextureCache";
import type { SurfaceMaterial } from "@/data/surfaceMaterials";

const THUMB_SIZE = 128; // px; DPR-aware caller multiplies by Math.min(2, devicePixelRatio)
const thumbnailCache = new Map<string, string>(); // materialId → dataURL

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let planeMesh: THREE.Mesh | null = null;

function ensureRenderer(): THREE.WebGLRenderer {
  if (renderer) return renderer;
  const canvas = document.createElement("canvas");
  canvas.width = THUMB_SIZE;
  canvas.height = THUMB_SIZE;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(THUMB_SIZE, THUMB_SIZE);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();

  // Studio lighting (D-05)
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(2, 2, 1.5); // 45° elevation, 30° azimuth
  scene.add(dirLight);
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
  rimLight.position.set(-1, 0.5, -1);
  scene.add(rimLight);

  // Camera ~30° off-axis (D-05)
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10);
  camera.position.set(0.6, 0.6, 1.2);
  camera.lookAt(0, 0, 0);

  // Reusable plane geometry (1m × 1m, 2 UV repeats)
  const geo = new THREE.PlaneGeometry(1, 1);
  planeMesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial());
  scene.add(planeMesh);

  return renderer;
}

export async function generateThumbnail(material: SurfaceMaterial): Promise<string> {
  const cached = thumbnailCache.get(material.id);
  if (cached) return cached;

  const r = ensureRenderer();

  let mat: THREE.MeshStandardMaterial;
  try {
    if (material.pbr) {
      const maps = await loadPbrSet({
        albedo: material.pbr.albedo,
        normal: material.pbr.normal,
        roughness: material.pbr.roughness,
      });
      // 1.5 UV repeats so the pattern reads within the swatch
      for (const tex of [maps.albedo, maps.normal, maps.roughness]) {
        tex.repeat.set(1.5, 1.5);
        tex.needsUpdate = true;
      }
      mat = new THREE.MeshStandardMaterial({
        map: maps.albedo,
        normalMap: maps.normal,
        roughnessMap: maps.roughness,
        metalness: 0,
      });
    } else {
      mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(material.color),
        roughness: material.roughness,
        metalness: 0,
      });
    }
  } catch {
    // D-07: failure → return fallback sentinel; caller shows hex div
    thumbnailCache.set(material.id, "fallback");
    return "fallback";
  }

  (planeMesh as THREE.Mesh).material = mat;
  r.render(scene as THREE.Scene, camera as THREE.PerspectiveCamera);
  const dataURL = r.domElement.toDataURL("image/png");
  mat.dispose();
  thumbnailCache.set(material.id, dataURL);
  return dataURL;
}

export function getThumbnail(materialId: string): string | undefined {
  return thumbnailCache.get(materialId);
}

export async function generateBatch(materials: SurfaceMaterial[]): Promise<void> {
  for (const m of materials) {
    await generateThumbnail(m);
  }
}

/** Test-only helper */
export function __resetSwatchThumbnailCache(): void {
  thumbnailCache.clear();
}

if (typeof window !== "undefined" && import.meta.env.MODE === "test") {
  (window as any).__resetSwatchThumbnailCache = __resetSwatchThumbnailCache;
  (window as any).__getMaterialThumbnail = (id: string) => getThumbnail(id);
}
```

**Key design notes:**

- `loadPbrSet` from `pbrTextureCache` is used as-is — textures are shared with the live viewport (no duplicate downloads). Because this renderer never calls `registerRenderer()`, anisotropy stays at the cache's last registered value (from the main viewport), which is acceptable for a 128px swatch.
- The renderer creates its own detached `<canvas>` — it does NOT share a WebGL context with R3F's `<Canvas>`. Two contexts on the same page is standard and universally supported. `OffscreenCanvas` is explicitly NOT used (D-01 rationale: browser-support variability not worth it for 11 materials).
- Sequential rendering via `for...of await` ensures we don't queue 11 simultaneous WebGL renders. At 11 materials, total render time is expected well under 200ms (D-02).
- `"fallback"` sentinel in the cache is how D-07 is enforced: `MaterialThumbnail` checks `dataURL !== "fallback"` before rendering the `<img>`.

### Component: `MaterialThumbnail.tsx`

```typescript
// src/components/MaterialThumbnail.tsx
import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getThumbnail, generateThumbnail } from "@/three/swatchThumbnailGenerator";

interface Props {
  materialId: string;
  fallbackColor: string;
}

export function MaterialThumbnail({ materialId, fallbackColor }: Props) {
  const reducedMotion = useReducedMotion();
  const cached = getThumbnail(materialId);
  const [dataURL, setDataURL] = useState<string | null>(
    cached && cached !== "fallback" ? cached : null
  );

  useEffect(() => {
    if (dataURL) return;
    let alive = true;
    generateThumbnail({ id: materialId } as any).then((url) => {
      if (alive && url !== "fallback") setDataURL(url);
    });
    return () => { alive = false; };
  }, [materialId]);

  return (
    <div className="relative w-full aspect-square rounded-sm overflow-hidden">
      {/* Placeholder — always present, fades out when thumbnail ready */}
      <div
        className="absolute inset-0 rounded-sm"
        style={{ backgroundColor: fallbackColor }}
      />
      {/* Thumbnail — crossfades in (D-06) */}
      {dataURL && (
        <img
          src={dataURL}
          alt=""
          className={[
            "absolute inset-0 w-full h-full object-cover rounded-sm",
            reducedMotion
              ? "opacity-100"
              : "opacity-0 animate-[fadeIn_150ms_ease-out_forwards]",
          ].join(" ")}
        />
      )}
    </div>
  );
}
```

**Note:** The `animate-[fadeIn_...]` requires a `@keyframes fadeIn` entry in `src/index.css`. If Tailwind v4 `@theme {}` block already supports arbitrary animation, use `transition-opacity duration-150` with a state toggle instead — simpler and no keyframe needed:

```tsx
<img
  className={[
    "absolute inset-0 w-full h-full object-cover rounded-sm",
    "transition-opacity",
    reducedMotion ? "duration-0" : "duration-150",
    dataURL ? "opacity-100" : "opacity-0",
  ].join(" ")}
/>
```

This second pattern (state-driven opacity toggle + Tailwind transition) is cleaner and avoids custom keyframes. Recommend it over the animate variant.

### Integration: `SurfaceMaterialPicker.tsx`

The change is surgical — replace lines 47–50 (the `<div style={{backgroundColor: m.color}}>`) and add a `useEffect` to trigger batch generation on mount:

```typescript
import { useEffect } from "react"; // already likely present
import { generateBatch } from "@/three/swatchThumbnailGenerator";
import { MaterialThumbnail } from "@/components/MaterialThumbnail";

// Inside the component, before returning grid:
useEffect(() => {
  generateBatch(materials); // fire-and-forget; component re-renders via MaterialThumbnail state
}, [surface]); // surface key guards re-generation if surface prop changes
```

The `<div ... style={{backgroundColor: m.color}} />` at line ~48 becomes:

```tsx
<MaterialThumbnail materialId={m.id} fallbackColor={m.color} />
```

---

## Alternatives Considered

| Option | Why Rejected |
|--------|-------------|
| Offscreen R3F `<Canvas>` | ~300 LOC, mount/unmount choreography, hidden DOM node, harder to test (D-01) |
| Hybrid: PBR render only for 3 PBR materials | Inconsistent swatch grid (paint-chip vs textured) — breaks visual parity (D-01 specifics) |
| IndexedDB persistence | Unnecessary for 11 materials; regen is <200ms (D-02) |
| Scene-matching lighting | Swatch appearance drifts with room state; unpredictable picker (D-05) |
| CSS `background-image` via data URL | Same result, but `<img>` is semantically correct and easier to crossfade |

---

## Open Questions for Planner

1. **`MaterialThumbnail` receives full `SurfaceMaterial` or just `materialId + fallbackColor`?**
   The generator needs the full `SurfaceMaterial` object to know about `pbr` maps and `color`. Two approaches: (a) the component imports `SURFACE_MATERIALS[materialId]` internally, keeping the parent prop surface thin; or (b) the parent passes the full object. Option (a) couples the component to the catalog import — but simplifies the call site and removes prop drilling. Recommend (a); the planner should confirm.

2. **Renderer disposal on app unmount?**
   Since the renderer is module-level (lives forever), it is never explicitly disposed. For a single-user SPA this is fine. No action required, but the plan should document this decision so future maintainers don't wonder.

3. **`generateThumbnail` signature when component uses option (a)?**
   If `MaterialThumbnail` imports `SURFACE_MATERIALS` internally and calls `generateThumbnail(SURFACE_MATERIALS[materialId])`, the function signature takes `SurfaceMaterial` (current recommendation). The code example above passes `{ id: materialId } as any` which is a shortcut — the plan should use the real lookup.

---

## Validation Architecture (Nyquist)

`nyquist_validation` is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.x (vitest.config.ts present) |
| Config file | `/vitest.config.ts` |
| Quick run command | `npx vitest run tests/swatchThumbnailGenerator.test.ts` |
| Full suite command | `npx vitest run` |

### Test Strategy

Tests run in `happy-dom`. `THREE.WebGLRenderer` requires `canvas.getContext("webgl")` which happy-dom does not provide. Two options:

1. **Mock `THREE.WebGLRenderer` entirely** (same approach as `pbrTextureCache.test.ts` mocks `THREE.TextureLoader`) — simplest, tests the generator's logic without GPU.
2. **Use `gl-headless` or `headless-gl`** — real WebGL in Node. Not currently in the project; adds a native dependency.

Recommendation: option 1 (mock renderer). The existing `tests/setup.ts` stubs the 2D canvas context; adding a `vi.mock("three", ...)` override for `WebGLRenderer` follows the established pbrTextureCache.test.ts pattern exactly.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| THUMB-01-a | `generateThumbnail(flatMaterial)` resolves to a string starting with `data:image/png` | unit | `npx vitest run tests/swatchThumbnailGenerator.test.ts` | No — Wave 0 |
| THUMB-01-b | Second call with same materialId returns same cached value (cache hit) | unit | same | No — Wave 0 |
| THUMB-01-c | `generateThumbnail(pbrMaterial)` with failing texture resolves to `"fallback"` without throwing | unit | same | No — Wave 0 |
| THUMB-01-d | `generateBatch(materials)` populates cache for all provided materials | unit | same | No — Wave 0 |
| THUMB-01-e | `__resetSwatchThumbnailCache()` clears cache so next call re-generates | unit | same | No — Wave 0 |
| THUMB-01-visual | Swatch grid shows rendered thumbnails (not flat color) within ~500ms of picker mount | manual | Dev server browser check (D-12) | N/A |

### Mock Pattern for `THREE.WebGLRenderer`

```typescript
vi.mock("three", async () => {
  const actual = await vi.importActual<typeof import("three")>("three");
  class MockRenderer {
    domElement = { toDataURL: () => "data:image/png;base64,FAKE" };
    setSize() {}
    render() {}
    outputColorSpace = actual.SRGBColorSpace;
    setClearColor() {}
  }
  return { ...actual, WebGLRenderer: MockRenderer };
});
```

Combined with the existing TextureLoader mock from `pbrTextureCache.test.ts`, this allows full exercise of the generator's logic paths in happy-dom.

### Validation of Visual Correctness (no screenshot diffs, per D-12)

- **Color sampling assertion (alternative to screenshot):** After real browser render, `window.__getMaterialThumbnail("CONCRETE")` returns the dataURL. Can draw onto a 2D canvas and sample center pixel — expects a non-gray, non-black result (confirms texture actually applied). This is manual verification during execution, not an automated CI test.
- **Failure modes to cover in tests:**
  - Texture load failure (URL contains "fail" per existing mock convention) → resolves `"fallback"`, no thrown exception
  - Cache hit after failure → same `"fallback"` sentinel (no retry loop)
  - `generateBatch([])` with empty array → no-op, no error

### Wave 0 Gaps

- [ ] `tests/swatchThumbnailGenerator.test.ts` — all THUMB-01-a through THUMB-01-e cases
- [ ] No framework install needed — Vitest already present
- [ ] No fixture files needed — mocks provide synthetic textures

---

## Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| `THREE.WebGLRenderer` fails in happy-dom environment | HIGH | Mock `WebGLRenderer` via `vi.mock("three", ...)` as done in `pbrTextureCache.test.ts` for `TextureLoader` |
| PBR textures served from `/public/textures/...` not found during dev (404) | MEDIUM | D-07 fallback to hex color — handled by catch in `generateThumbnail`. Test the failure path explicitly. |
| Two `WebGLRenderer` contexts competing on the same GPU (thumbnail + main viewport) | LOW | Browsers support 16+ concurrent contexts. Thumbnail renderer uses a detached canvas; no context loss risk for 11 sequential renders. |
| `pbrTextureCache.acquireTexture` increments refcount but thumbnail never calls `releaseTexture` | LOW | Thumbnails are session-scoped. Textures held for the session lifetime — consistent with the `pbrTextureCache` contract (refcount managed by the live viewport separately). Acceptable trade-off documented in plan. |
| `renderer.domElement.toDataURL()` returns empty/blank on some browser security policies | LOW | Only affects localhost CORS edge cases. Jessica's use is local; accepted. |
| Spacing token violation in new component (12px creeping in as `p-3`) | LOW | D-09 enforcement: planner must specify only `p-1 / p-2 / p-4 / p-6 / p-8` in new component files. |

---

## References

### Primary (HIGH confidence — direct source inspection)

- `src/three/pbrTextureCache.ts` — `acquireTexture`, `loadPbrSet`, `registerRenderer`, test driver pattern
- `src/data/surfaceMaterials.ts` — 11 materials (8 flat, 3 PBR), `materialsForSurface()`, `PbrMaps` interface
- `src/components/SurfaceMaterialPicker.tsx` — exact insertion point at line ~48; `<div style={{backgroundColor: m.color}}>` is the swatch
- `src/three/Lighting.tsx` — reference for what NOT to mirror (D-05 uses studio instead)
- `src/three/textureColorSpace.ts` — color-space assignment already handled inside `pbrTextureCache`
- `src/hooks/useReducedMotion.ts` — D-06 crossfade guard
- `src/three/PbrSurface.tsx` — Suspense/ErrorBoundary spirit; not reused directly in imperative path
- `vitest.config.ts` — test environment (`happy-dom`), include patterns, exclude E2E
- `tests/setup.ts` — canvas 2D stub pattern; needs WebGL mock addition for thumbnail tests
- `tests/pbrTextureCache.test.ts` — `vi.mock("three", ...)` TextureLoader pattern to mirror for WebGLRenderer

### Secondary (MEDIUM confidence — Three.js known behavior)

- `THREE.WebGLRenderer` with detached `<canvas>`: standard usage, no DOM attachment required; `toDataURL()` works on detached elements in all modern browsers
- Two simultaneous `WebGLRenderer` instances: fully supported; Chrome/Firefox/Safari allow 16+ concurrent WebGL contexts per page

---

## RESEARCH COMPLETE

**Phase:** 45 — Auto-Generated Material Swatch Thumbnails (THUMB-01)
**Confidence:** HIGH

### Key Findings

- The integration point is a single line in `SurfaceMaterialPicker.tsx` (~line 48). The hex `<div>` swap to `<MaterialThumbnail>` is surgical and does not restructure the component.
- `pbrTextureCache.acquireTexture` and `loadPbrSet` can be reused directly — texture sharing between thumbnail generator and live viewport avoids duplicate downloads. Only restriction: the thumbnail renderer must NOT call `registerRenderer()`.
- Happy-dom cannot run `THREE.WebGLRenderer`. Tests must mock `WebGLRenderer` (same `vi.mock("three", ...)` pattern as `pbrTextureCache.test.ts` mocks `TextureLoader`). This is low friction given the existing pattern.
- The `"fallback"` sentinel string in the cache is the cleanest D-07 implementation — no extra boolean state, `MaterialThumbnail` checks `dataURL !== "fallback"` before rendering `<img>`.
- Opacity-toggle pattern (`opacity-0` → `opacity-100` via `transition-opacity duration-150`, `duration-0` when `useReducedMotion()`) is cleaner than custom `@keyframes`. Aligns with Phase 44 Toolbar `animate-spin` conditional.
- No new dependencies. Three.js 0.184.0 is already installed.

### Files to Create/Modify

- `src/three/swatchThumbnailGenerator.ts` (new)
- `src/components/MaterialThumbnail.tsx` (new)
- `src/components/SurfaceMaterialPicker.tsx` (modify: 1 import, 1 `useEffect`, swap ~line 48)
- `tests/swatchThumbnailGenerator.test.ts` (new)

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | Three.js already in project; all APIs verified from source |
| Architecture | HIGH | Directly derived from locked CONTEXT.md decisions + source inspection |
| Test patterns | HIGH | `pbrTextureCache.test.ts` provides exact template to follow |
| Pitfalls | HIGH | happy-dom WebGL gap is known; fallback sentinel pattern is clean |

### Ready for Planning

Research complete. Planner can now create PLAN.md files.
