# Technology Stack

**Analysis Date:** 2026-04-04

## Languages

**Primary:**
- TypeScript ^6.0.2 - All source files in `src/`

**Secondary:**
- Python 3.x - `generate_guide.py` (doc generation utility, not part of the app)
- CSS - `src/index.css` (design tokens and global styles)

## Runtime

**Environment:**
- Browser (SPA, no server-side runtime)
- Entry point: `index.html` → `src/main.tsx`

**Package Manager:**
- npm (lockfile: `package-lock.json` present)
- `"type": "commonjs"` in package.json but source uses ESNext modules (bundled by Vite)

## Frameworks

**Core:**
- React ^18.3.1 - UI rendering, component model
- React DOM ^18.3.5 - Browser rendering target

**3D Rendering:**
- Three.js ^0.183.2 - 3D geometry, mesh rendering, lighting
- @react-three/fiber ^8.17.14 - React renderer for Three.js (`src/three/ThreeViewport.tsx`)
- @react-three/drei ^9.122.0 - Three.js helpers: `OrbitControls`, camera utilities (`src/three/ThreeViewport.tsx`)

**2D Canvas:**
- Fabric.js ^6.9.1 - 2D interactive canvas, CAD drawing tools (`src/canvas/FabricCanvas.tsx`, `src/canvas/tools/`)

**Styling:**
- Tailwind CSS ^4.2.2 - Utility-first CSS (v4 Vite plugin, `@tailwindcss/vite`)
- Design tokens defined in `src/index.css` via `@theme {}` block (CSS custom properties)
- No shadcn/ui — custom component set only

**State Management:**
- Zustand ^5.0.12 - Client state stores (`src/stores/cadStore.ts`, `src/stores/uiStore.ts`)
- Immer ^11.1.4 - Immutable state updates via `produce()` inside Zustand actions

**Build/Dev:**
- Vite ^8.0.3 - Dev server and bundler
- @vitejs/plugin-react ^6.0.1 - React Fast Refresh + JSX transform

## Key Dependencies

**Critical:**
- `fabric` ^6.9.1 - Powers the entire 2D CAD viewport; all drawing tools depend on it (`src/canvas/FabricCanvas.tsx`)
- `three` + `@react-three/fiber` + `@react-three/drei` - Powers the 3D viewport (`src/three/ThreeViewport.tsx`); loaded lazily via `React.lazy()`
- `zustand` + `immer` - All application state; `cadStore` holds the CAD data model, `uiStore` holds tool and selection state
- `idb-keyval` ^6.2.2 - Browser-native IndexedDB persistence for projects and product library (`src/lib/serialization.ts`, `src/App.tsx`)

**Infrastructure:**
- `@types/react` ^18.3.18 - TypeScript types for React
- `@types/three` ^0.183.1 - TypeScript types for Three.js

## Configuration

**TypeScript:**
- Config: `tsconfig.json`
- Target: ES2020
- Module resolution: `bundler` (Vite-aware)
- Path alias: `@/*` → `./src/*`
- Strict mode: enabled
- JSX: `react-jsx` transform

**Build:**
- Config: `vite.config.ts`
- Plugins: `@vitejs/plugin-react`, `@tailwindcss/vite`
- Path alias: `@` → `./src` (mirrors tsconfig)
- Output: `dist/` (present in repo root)
- No custom build targets or multi-entry configuration

**CSS:**
- Tailwind v4 loaded via Vite plugin (no `tailwind.config.js` file — config is inline in CSS)
- Design system defined entirely in `src/index.css` `@theme {}` block
- Custom CSS classes: `.cad-grid-bg`, `.glass-panel`, `.ghost-border`, `.accent-glow`, `.material-symbols-outlined`
- Color palette: `obsidian-*` surface scale, `accent` purple (#7c5bf0), `text-*` hierarchy

## Platform Requirements

**Development:**
- Node.js (version not pinned; no `.nvmrc` or `.node-version` file)
- npm for package management
- `npm run dev` starts Vite dev server
- `npm run build` produces `dist/`

**Production:**
- Static file hosting (no server required)
- All persistence is browser-side (IndexedDB)
- Fonts loaded from Google Fonts CDN (network required at first load)

---

*Stack analysis: 2026-04-04*
