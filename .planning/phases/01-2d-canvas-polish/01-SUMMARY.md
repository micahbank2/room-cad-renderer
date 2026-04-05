---
phase: 01-2d-canvas-polish
plan: 01
subsystem: canvas
tags: [edit-09, canvas, fabric, image-cache, bug-fix]
requires:
  - 00 (vitest infrastructure + stub test files)
provides:
  - async product image rendering on 2D canvas
  - module-level HTMLImage cache keyed by productId
affects:
  - src/canvas/fabricSync.ts renderProducts pipeline
tech-stack:
  added: []
  patterns: [module-level cache, onReady callback, queueMicrotask stub for jsdom]
key-files:
  created:
    - src/canvas/productImageCache.ts
    - tests/productImageCache.test.ts (real tests replacing stubs)
    - src/canvas/fabricSync.ts (first commit)
  modified: []
decisions:
  - Stub global Image in tests since jsdom does not decode images (naturalWidth stays 0)
  - Cache returns null on miss AND while loading to prevent duplicate fetches
  - onerror removes from loading Set but does NOT cache (lets retry work)
metrics:
  duration: "~3 minutes"
  completed: 2026-04-05
tasks_completed: 2
tasks_total: 2
---

# Phase 01 Plan 01: EDIT-09 Product Image Rendering Summary

Async product image cache wired into Fabric renderProducts — products with imageUrl now visibly render on the 2D canvas within one frame of decode, replacing the broken `imgEl.complete && naturalWidth > 0` sync check that always failed for base64 data URLs from IndexedDB.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create productImageCache module with cache + onReady contract (TDD) | 0907816 | src/canvas/productImageCache.ts (pre-committed as part of 9c59526), tests/productImageCache.test.ts |
| 2 | Integrate getCachedImage into renderProducts | b7a1044 | src/canvas/fabricSync.ts |

## Cache Module API

```typescript
// src/canvas/productImageCache.ts
export function getCachedImage(
  productId: string,
  url: string,
  onReady: () => void
): HTMLImageElement | null

export function invalidateProduct(productId: string): void

// Test-only
export function __resetCache(): void
```

**Contract:**
- First call → returns null, starts async load, stores productId in `loading` Set
- Second call while loading → returns null (no double-fetch)
- After onload fires → caches image, invokes onReady() exactly once
- Third call after load → returns cached HTMLImageElement synchronously
- onerror → removes from loading Set (no cache entry, no onReady)
- `naturalWidth > 0 && naturalHeight > 0` guard prevents caching broken images

## fabricSync Integration

In `renderProducts`, replaced lines 154-168 (raw `new Image()` + sync-complete check) with:

```typescript
if (product.imageUrl) {
  const cachedImg = getCachedImage(product.id, product.imageUrl, () => fc.renderAll());
  if (cachedImg) {
    const fImg = new fabric.FabricImage(cachedImg, {
      scaleX: pw / cachedImg.naturalWidth,
      scaleY: pd / cachedImg.naturalHeight,
      originX: "center",
      originY: "center",
    });
    children.splice(1, 0, fImg); // insert after border, before labels
  }
}
```

On cache miss the group still renders border + labels. When decode completes, `onReady` calls `fc.renderAll()` which triggers a redraw; the subsequent `renderProducts` call hits the cache and splices the FabricImage into the group.

**Old buggy code confirmed removed:** `grep -c imgEl.complete src/canvas/fabricSync.ts` = 0, `grep -c imgEl.naturalWidth` = 0.

## Verification Results

- `bunx vitest run tests/productImageCache.test.ts` — 3/3 passed
- `bunx vitest run` (full suite) — 3 passed, 29 todo (all stubs still pending)
- `bunx tsc --noEmit` — no errors introduced (only pre-existing `baseUrl` deprecation warning)
- Acceptance criteria grep checks — all pass for both tasks

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used bun instead of npm for test install**
- **Found during:** Pre-Task 1 setup
- **Issue:** `npm` not available in environment; only `bun` is installed
- **Fix:** Used `bun add -d vitest @testing-library/jest-dom jsdom` to install test dependencies
- **Impact:** None — vitest works identically via `bunx vitest`
- **Files modified:** package.json, bun.lock (via bun install)

**2. [Rule 3 - Blocking] Stubbed global Image in tests for jsdom**
- **Found during:** Task 1 GREEN phase
- **Issue:** jsdom does not implement image decoding; `naturalWidth` stays 0 and `onload` never fires for data URLs, so tests failed
- **Fix:** Replaced `globalThis.Image` with a MockImage class that synthesizes `onload` via `queueMicrotask` and sets `naturalWidth=1`
- **Files modified:** tests/productImageCache.test.ts (beforeEach/afterEach hooks)

### Parallel-Executor Coordination Note

Wave 0 (plan 00) ran concurrently with this plan. During execution, a parallel agent committed `9c59526` which included an early stub version of `src/canvas/productImageCache.ts` that I had already written locally. The productImageCache.ts content is identical, so no conflict; only the test file needed re-writing from stub to real tests (Task 1 commit `0907816`).

## Known Stubs

None. EDIT-09 is fully wired — real data (product.imageUrl from IndexedDB) flows into the cache and onto the canvas.

## Self-Check

**Files created (verify exist):**
- src/canvas/productImageCache.ts — FOUND
- tests/productImageCache.test.ts — FOUND
- src/canvas/fabricSync.ts — FOUND (committed in b7a1044)

**Commits exist:**
- 0907816 — FOUND
- b7a1044 — FOUND

## Self-Check: PASSED
