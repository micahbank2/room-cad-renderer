---
phase: 34-user-uploaded-textures
plan: 01
type: execute
wave: 2
depends_on: [34-00]
files_modified:
  - src/lib/processTextureFile.ts
  - src/components/UploadTextureModal.tsx
  - tests/processTextureFile.test.ts
  - tests/uploadTextureModal.test.tsx
autonomous: true
requirements: [LIB-06, LIB-07]
gap_closure: false

must_haves:
  truths:
    - "Jessica can drop a JPEG/PNG/WebP file into the modal, see a preview, enter a name + tile size, and click Upload Texture — the texture persists to userTextureStore"
    - "Non-whitelisted MIME types (e.g. image/svg+xml, image/gif) surface the exact inline copy \"Only JPEG, PNG, and WebP are supported.\" — no save occurs"
    - "A 4000x3000 input downscales to <=2048px on the longest edge before hashing + save (LIB-07)"
    - "SHA-256 is computed on the downscaled JPEG bytes and passed to saveUserTextureWithDedup so identical inputs dedup"
    - "Edit mode (mode=\"edit\") pre-fills name + tile size, hides the drop zone, autoFocuses the Name field, and saves via useUserTextures().update"
    - "Discard button + backdrop click + Escape key all dismiss the modal without saving"
  artifacts:
    - path: "src/lib/processTextureFile.ts"
      provides: "Injectable-seam file processing: MIME gate + downscale + SHA-256 + Blob"
      exports: ["processTextureFile", "ProcessTextureResult", "ProcessTextureError"]
    - path: "src/components/UploadTextureModal.tsx"
      provides: "UploadTextureModal (create + edit modes) per UI-SPEC §1"
      contains: "export function UploadTextureModal"
  key_links:
    - from: "src/components/UploadTextureModal.tsx"
      to: "src/hooks/useUserTextures.ts"
      via: "useUserTextures().save(...) on Upload Texture click"
      pattern: "useUserTextures\\(\\)"
    - from: "src/components/UploadTextureModal.tsx"
      to: "src/canvas/dimensionEditor.ts"
      via: "validateInput(rawTileSize) for feet+inches parsing"
      pattern: "validateInput"
    - from: "src/lib/processTextureFile.ts"
      to: "src/lib/userTextureStore.ts"
      via: "computeSHA256 reuse"
      pattern: "computeSHA256"
    - from: "src/components/UploadTextureModal.tsx"
      to: "src/hooks/useReducedMotion.ts"
      via: "motion guard on open/close transitions + spinner"
      pattern: "useReducedMotion"
---

<objective>
Build the `UploadTextureModal` per 34-UI-SPEC.md §1 — a one-step drop-or-pick → preview → name + tile size → Upload Texture flow. Split the browser-side pipeline into an injectable-seam `processTextureFile(file)` utility (for jsdom-friendly tests) and the React component itself. Covers LIB-06 (upload + name + tile size) and LIB-07 (2048px downscale + SHA-256 dedup + MIME whitelist inline error).

Purpose: This is the single point where Jessica converts a photo-on-disk into a persistent texture entry. The modal also serves as the Edit modal (D-11) via a `mode` prop.

Output: 2 new source files + 2 new test files. Modal can be opened programmatically via `window.__driveTextureUpload` (test driver) and rendered in Plan 02's picker integration.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/34-user-uploaded-textures/34-CONTEXT.md
@.planning/phases/34-user-uploaded-textures/34-RESEARCH.md
@.planning/phases/34-user-uploaded-textures/34-UI-SPEC.md
@.planning/phases/34-user-uploaded-textures/34-00-data-layer-PLAN.md

# Source-of-truth files the executor MUST read before coding
@src/canvas/dimensionEditor.ts
@src/hooks/useReducedMotion.ts

<interfaces>
<!-- From Plan 00 (already landed): -->
```typescript
// src/hooks/useUserTextures.ts
export function useUserTextures(): {
  textures: UserTexture[];
  loading: boolean;
  save: (input: SaveTextureInput, sha256: string) => Promise<string>;
  update: (id: string, changes: Partial<Pick<UserTexture, "name" | "tileSizeFt">>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reload: () => Promise<void>;
};

// src/lib/userTextureStore.ts
export interface SaveTextureInput {
  name: string;
  tileSizeFt: number;
  blob: Blob;
  mimeType: string;
}
export async function computeSHA256(bytes: ArrayBuffer): Promise<string>;
```

<!-- From existing code (unchanged): -->
```typescript
// src/canvas/dimensionEditor.ts
export function validateInput(raw: string): number | null; // returns decimal feet or null

// src/hooks/useReducedMotion.ts
export function useReducedMotion(): boolean;
```

<!-- Locked copy (UI-SPEC §Copywriting Contract): -->
```
Modal title (create):              "UPLOAD TEXTURE"
Modal title (edit):                "EDIT TEXTURE"
Primary CTA (create):              "Upload Texture"
Primary CTA (edit):                "Save Changes"
Dismiss CTA:                       "Discard"
Progress label (create):           "Uploading…"
Progress label (edit):             "Saving Changes…"
MIME error (inline):               "Only JPEG, PNG, and WebP are supported."
Decode/oversize error:             "This file couldn't be processed. Try a different image."
Tile size validation error:        "Enter a valid size like 2', 1'6\", or 0.5"
Name empty error:                  "Name is required."
Success toast:                     "Texture saved."
Drop zone invite:                  "Drag and drop a photo, or click to browse."
Tile size helper:                  "Real-world repeat (e.g. 2'6\")"
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: processTextureFile — MIME gate + createImageBitmap downscale + SHA-256</name>
  <files>src/lib/processTextureFile.ts, tests/processTextureFile.test.ts</files>
  <read_first>
    - src/lib/userTextureStore.ts (from Plan 00 — reuse `computeSHA256`)
    - .planning/phases/34-user-uploaded-textures/34-RESEARCH.md §A (upload pipeline, exact code snippet) and OQ-02 (jsdom mock seam)
    - .planning/phases/34-user-uploaded-textures/34-UI-SPEC.md "MIME error (inline)" and "Decode/oversize error (inline)" copy
  </read_first>
  <behavior>
    - Rejects files with `file.type` NOT in `["image/jpeg", "image/png", "image/webp"]` — throws `ProcessTextureError` with `code: "MIME_REJECTED"`
    - Decodes valid images via injectable `decode` fn (default uses `createImageBitmap`)
    - Downscales so `max(width, height) <= 2048` via injectable `drawToBlob` fn (default uses `OffscreenCanvas.convertToBlob`)
    - Returns `{ blob: Blob, mimeType: "image/jpeg", sha256: string, width: number, height: number }`
    - Downscale preserves aspect ratio; 4000x3000 input produces 2048x1536 output; 1024x768 input passes through unchanged (no upscale)
    - Decode failure (bitmap creation throws) wraps into `ProcessTextureError` with `code: "DECODE_FAILED"`
  </behavior>
  <action>
    Create `src/lib/processTextureFile.ts`:

    ```typescript
    import { computeSHA256 } from "./userTextureStore";

    export const ALLOWED_MIME_TYPES = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
    ] as const);

    export const MAX_EDGE_PX = 2048;

    export type ProcessTextureErrorCode = "MIME_REJECTED" | "DECODE_FAILED";

    export class ProcessTextureError extends Error {
      constructor(public code: ProcessTextureErrorCode, message: string) {
        super(message);
        this.name = "ProcessTextureError";
      }
    }

    export interface ProcessTextureResult {
      blob: Blob;
      mimeType: string;
      sha256: string;
      width: number;
      height: number;
    }

    // Injectable seam for tests (jsdom has no real OffscreenCanvas / createImageBitmap)
    export interface ProcessTextureDeps {
      decode?: (file: File) => Promise<{ width: number; height: number; close: () => void; source: unknown }>;
      drawToBlob?: (src: unknown, w: number, h: number) => Promise<Blob>;
    }

    async function defaultDecode(file: File) {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
        source: bitmap,
      };
    }

    async function defaultDrawToBlob(src: unknown, w: number, h: number): Promise<Blob> {
      const oc = new OffscreenCanvas(w, h);
      const ctx = oc.getContext("2d");
      if (!ctx) throw new Error("2d context unavailable");
      ctx.drawImage(src as CanvasImageSource, 0, 0, w, h);
      return oc.convertToBlob({ type: "image/jpeg", quality: 0.9 });
    }

    export async function processTextureFile(
      file: File,
      deps: ProcessTextureDeps = {},
    ): Promise<ProcessTextureResult> {
      if (!ALLOWED_MIME_TYPES.has(file.type as any)) {
        throw new ProcessTextureError(
          "MIME_REJECTED",
          "Only JPEG, PNG, and WebP are supported.",
        );
      }

      const decode = deps.decode ?? defaultDecode;
      const drawToBlob = deps.drawToBlob ?? defaultDrawToBlob;

      let decoded: Awaited<ReturnType<typeof defaultDecode>>;
      try {
        decoded = await decode(file);
      } catch {
        throw new ProcessTextureError(
          "DECODE_FAILED",
          "This file couldn't be processed. Try a different image.",
        );
      }

      const scale = Math.min(1, MAX_EDGE_PX / Math.max(decoded.width, decoded.height));
      const w = Math.round(decoded.width * scale);
      const h = Math.round(decoded.height * scale);

      let blob: Blob;
      try {
        blob = await drawToBlob(decoded.source, w, h);
      } catch {
        decoded.close();
        throw new ProcessTextureError(
          "DECODE_FAILED",
          "This file couldn't be processed. Try a different image.",
        );
      }
      decoded.close();

      const bytes = await blob.arrayBuffer();
      const sha256 = await computeSHA256(bytes);

      return { blob, mimeType: "image/jpeg", sha256, width: w, height: h };
    }
    ```

    Write `tests/processTextureFile.test.ts` using `vi.stubGlobal` + the injectable-seam params:

    1. MIME reject: `new File([], "x.svg", { type: "image/svg+xml" })` → `ProcessTextureError` with `code === "MIME_REJECTED"` and `.message === "Only JPEG, PNG, and WebP are supported."`
    2. MIME reject: `image/gif` → same error
    3. Each allowed type (jpeg, png, webp) passes through the gate (using mocked decode + drawToBlob)
    4. Downscale: 4000x3000 input → result.width === 2048, result.height === 1536 (aspect preserved)
    5. No upscale: 1024x768 input → result.width === 1024, result.height === 768
    6. Square input 3000x3000 → 2048x2048
    7. SHA-256 is computed on the returned blob bytes; two calls with identical decoded content produce identical sha256
    8. `decode` throwing → `ProcessTextureError` with `code === "DECODE_FAILED"` and message `"This file couldn't be processed. Try a different image."`

    Mock shape: `decode: async () => ({ width: 4000, height: 3000, close: () => {}, source: "fake-bitmap" })` and `drawToBlob: async (_src, w, h) => new Blob([new Uint8Array([w & 0xff, h & 0xff, 0xde, 0xad])], { type: "image/jpeg" })`.
  </action>
  <verify>
    <automated>npx vitest run tests/processTextureFile.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - [ ] `grep -q "ALLOWED_MIME_TYPES = new Set" src/lib/processTextureFile.ts` succeeds
    - [ ] `grep -q "MAX_EDGE_PX = 2048" src/lib/processTextureFile.ts` succeeds
    - [ ] `grep -q "Only JPEG, PNG, and WebP are supported." src/lib/processTextureFile.ts` succeeds (exact UI-SPEC copy)
    - [ ] `grep -q "This file couldn't be processed. Try a different image." src/lib/processTextureFile.ts` succeeds (exact UI-SPEC copy)
    - [ ] `grep -q "ProcessTextureDeps" src/lib/processTextureFile.ts` succeeds (injectable seam present)
    - [ ] `grep -q "createImageBitmap" src/lib/processTextureFile.ts` AND `grep -q "OffscreenCanvas" src/lib/processTextureFile.ts` succeed (default path uses browser APIs)
    - [ ] `grep -q "computeSHA256" src/lib/processTextureFile.ts` succeeds (reuses Plan 00 util)
    - [ ] `npx vitest run tests/processTextureFile.test.ts` passes with >= 8 test cases green
  </acceptance_criteria>
  <done>
    File-to-blob pipeline lives in a pure utility with a mockable seam. LIB-07 MIME and 2048px downscale contracts verified by unit test.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: UploadTextureModal component (create + edit modes) + test driver</name>
  <files>src/components/UploadTextureModal.tsx, tests/uploadTextureModal.test.tsx</files>
  <read_first>
    - .planning/phases/34-user-uploaded-textures/34-UI-SPEC.md §1 (UploadTextureModal — ENTIRE section, including Focal Point, Drop zone states, Name + Tile size input specs, Footer buttons, Progress states, Interaction States tables, Animation/Motion row)
    - src/lib/processTextureFile.ts (from Task 1)
    - src/hooks/useUserTextures.ts (from Plan 00)
    - src/canvas/dimensionEditor.ts (confirm `validateInput` signature — it should return decimal feet or null)
    - src/hooks/useReducedMotion.ts (confirm `useReducedMotion(): boolean`)
    - src/components/AddProductModal.tsx (reference shape for the modal shell — same layout idioms per UI-SPEC)
    - CLAUDE.md §Design System Phase 33 (D-33 icon policy — lucide ONLY for new chrome; D-34 spacing; D-39 reduced motion)
  </read_first>
  <behavior>
    - Renders when `open={true}`; hidden when `open={false}`
    - Props: `{ open: boolean; mode: "create" | "edit"; existing?: UserTexture; onClose(): void; onSaved?(id: string): void }`
    - Create mode: renders drop zone, file input, preview (after file), Name input, Tile Size input, Discard + Upload Texture buttons
    - Edit mode: NO drop zone, Name field autoFocus, pre-filled with `existing.name` + `existing.tileSizeFt`, Discard + Save Changes buttons
    - Primary CTA disabled when: (create) no file OR empty name OR invalid tile size OR processing; (edit) empty name OR invalid tile size OR unchanged from existing OR saving
    - MIME reject: inline red error `"Only JPEG, PNG, and WebP are supported."` under drop zone, drop zone returns to idle
    - Invalid tile size on blur → inline error `"Enter a valid size like 2', 1'6\", or 0.5"` + `border-error`
    - Upload Texture click (create): calls `processTextureFile(file)` → `useUserTextures().save({ name, tileSizeFt, blob, mimeType: "image/jpeg" }, sha256)` → success toast `"Texture saved."` via sonner → calls `onSaved?(id)` → calls `onClose()`
    - Save Changes click (edit): calls `useUserTextures().update(existing.id, { name, tileSizeFt })` → toast `"Texture saved."` → `onSaved?(existing.id)` → `onClose()`
    - Discard button / backdrop click / Escape key → `onClose()` without save
    - Reduced-motion guard: when `useReducedMotion() === true`, skip open/close fade-scale transition, skip spinner spin animation
    - `window.__driveTextureUpload(file, name, tileSizeFt)` registered in `import.meta.env.MODE === "test"` — drives the modal programmatically (bypasses DOM file-input interaction which jsdom cannot simulate cleanly); returns the saved id
  </behavior>
  <action>
    Create `src/components/UploadTextureModal.tsx`. Component shell follows `AddProductModal.tsx` conventions but uses lucide-react icons ONLY (`X`, `Upload`, `Loader2`, `Image` — no material-symbols). Exact structure:

    1. **Root:** `fixed inset-0 z-50 flex items-center justify-center` — backdrop `bg-obsidian-deepest/80 backdrop-blur-sm` — clicking backdrop = Discard.
    2. **Modal surface:** `w-[520px] bg-obsidian-mid/90 backdrop-blur-xl border border-outline-variant/20 rounded-sm shadow-2xl transition-[opacity,transform] duration-150 ease-out` — when reduced motion, drop the transition class.
    3. **Header** (`p-6 pb-4 flex items-center justify-between`): label `UPLOAD TEXTURE` (mode="create") or `EDIT TEXTURE` (mode="edit") in `font-mono text-base font-medium uppercase tracking-widest text-text-primary`. Close button: lucide `X` 16px `text-text-ghost hover:text-text-primary` with `aria-label="Close upload dialog"`.
    4. **Body** (`p-6 pt-0 flex flex-col gap-4`):
       - Create mode only — Drop zone: `rounded-md border-2 border-dashed border-outline-variant/40 bg-obsidian-low p-8 flex flex-col items-center gap-2 cursor-pointer` — drag-over adds `border-accent bg-accent/5`. Contains lucide `Upload` (24px `text-text-dim`) + Inter 13px prose `"Drag and drop a photo, or click to browse."`. Hidden `<input type="file" accept="image/jpeg,image/png,image/webp" />` inside.
       - After file selected: drop zone replaced by preview: `<img>` 160x120 `rounded-sm border border-outline-variant/20 object-cover` sourced from `URL.createObjectURL(result.blob)`. Below: "Change" link `text-accent text-[11px] font-mono` reopens file picker.
       - Inline MIME error (create): `text-error text-[11px] font-mono` under drop zone: `"Only JPEG, PNG, and WebP are supported."`
       - Inline decode error: same style: `"This file couldn't be processed. Try a different image."`
       - Name field: label `NAME` (`font-mono text-sm font-medium uppercase text-text-dim` in create mode; `text-text-primary` in edit mode per Focal Point spec). Input: `bg-obsidian-low border border-outline-variant/20 rounded-sm px-2 py-1 text-sm font-mono text-text-primary w-full placeholder:text-text-ghost maxLength={40}`. Placeholder `"e.g. Oak Floor"`. Edit mode adds `autoFocus`.
       - Tile size field: label `TILE SIZE` (same style). Helper: Inter 11px `text-text-ghost` `"Real-world repeat (e.g. 2'6\")"`. Input: same style, placeholder `"2'"`, default `"2'"`. Validated via `validateInput` on blur + on submit. Invalid → `border-error` + inline error `"Enter a valid size like 2', 1'6\", or 0.5"`.
    5. **Footer** (`flex justify-end gap-2 p-6 pt-4`):
       - Discard: `rounded-sm px-4 py-1 font-mono text-sm text-text-muted hover:text-text-primary bg-obsidian-high hover:bg-obsidian-highest border border-outline-variant/20`.
       - Primary CTA: label `"Upload Texture"` (create) or `"Save Changes"` (edit). `rounded-sm px-4 py-1 font-mono text-sm text-text-primary bg-accent hover:bg-accent/90 border-0 disabled:opacity-50 disabled:cursor-not-allowed`. Min-height 44px (touch target).
       - When in-flight: button shows `<Loader2 className="size-4 animate-spin" />` (or static when `useReducedMotion()`) + label `"Uploading…"` (create) or `"Saving Changes…"` (edit). Discard disabled.

    6. **Keyboard:** Escape → `onClose()`. Enter on primary CTA when enabled → submit.

    7. **Success toast:** import sonner's `toast.success("Texture saved.")` after save resolves.

    8. **Test driver** at bottom of file:
       ```typescript
       if (typeof window !== "undefined" && import.meta.env.MODE === "test") {
         (window as any).__driveTextureUpload = async (file: File, name: string, tileSizeFt: number) => {
           const { save } = /* import useUserTextures imperatively — see below */;
           const { processTextureFile } = await import("@/lib/processTextureFile");
           const result = await processTextureFile(file);
           // Use the non-hook entry point from userTextureStore directly for the driver:
           const { saveUserTextureWithDedup } = await import("@/lib/userTextureStore");
           const { id } = await saveUserTextureWithDedup(
             { name, tileSizeFt, blob: result.blob, mimeType: result.mimeType },
             result.sha256,
           );
           return id;
         };
       }
       ```
       (The driver bypasses the React tree so tests can exercise the persistence path without mounting the modal.)

    Write `tests/uploadTextureModal.test.tsx` using React Testing Library (render the modal with `open={true}` + both modes). Mock `useUserTextures` via `vi.mock`, mock `processTextureFile` via `vi.mock`. >= 7 test cases:
    1. Create mode renders heading `"UPLOAD TEXTURE"`, primary CTA label `"Upload Texture"`, Discard button, drop zone with text `"Drag and drop a photo, or click to browse."`
    2. Edit mode renders heading `"EDIT TEXTURE"`, primary CTA `"Save Changes"`, NO drop zone, Name field has `autoFocus` attribute, pre-filled values match `existing.name` + formatted tile size
    3. MIME reject (simulate by firing change on hidden input with SVG file + mocking `processTextureFile` to throw MIME_REJECTED) → inline error text `"Only JPEG, PNG, and WebP are supported."` visible
    4. Invalid tile size `"foo"` → on blur, inline error `"Enter a valid size like 2', 1'6\", or 0.5"` visible; primary CTA disabled
    5. Discard button click → `onClose` called
    6. Escape key → `onClose` called
    7. Successful upload path (mock processTextureFile + useUserTextures.save) → `onSaved` called with returned id; `onClose` called
    8. Edit mode Save Changes flow → `useUserTextures().update` called with new name + parsed tileSizeFt; `onSaved(existing.id)` + `onClose` called
    9. Close button has `aria-label="Close upload dialog"`
  </action>
  <verify>
    <automated>npx vitest run tests/uploadTextureModal.test.tsx</automated>
  </verify>
  <acceptance_criteria>
    - [ ] `grep -q "UPLOAD TEXTURE" src/components/UploadTextureModal.tsx` succeeds (exact header copy)
    - [ ] `grep -q "EDIT TEXTURE" src/components/UploadTextureModal.tsx` succeeds
    - [ ] `grep -q ">Upload Texture<" src/components/UploadTextureModal.tsx` AND `grep -q ">Save Changes<" src/components/UploadTextureModal.tsx` succeed (exact CTA copy)
    - [ ] `grep -q ">Discard<" src/components/UploadTextureModal.tsx` succeeds
    - [ ] `grep -q "Uploading…" src/components/UploadTextureModal.tsx` AND `grep -q "Saving Changes…" src/components/UploadTextureModal.tsx` succeed
    - [ ] `grep -q "Drag and drop a photo, or click to browse." src/components/UploadTextureModal.tsx` succeeds
    - [ ] `grep -q "Only JPEG, PNG, and WebP are supported." src/components/UploadTextureModal.tsx` succeeds
    - [ ] `grep -q "This file couldn't be processed. Try a different image." src/components/UploadTextureModal.tsx` succeeds
    - [ ] `grep -q "aria-label=\"Close upload dialog\"" src/components/UploadTextureModal.tsx` succeeds
    - [ ] `grep -q "from \"lucide-react\"" src/components/UploadTextureModal.tsx` succeeds AND `grep -cq "material-symbols-outlined" src/components/UploadTextureModal.tsx` returns 0 (icon policy D-33)
    - [ ] `grep -q "useReducedMotion" src/components/UploadTextureModal.tsx` succeeds (D-39 guard)
    - [ ] `grep -q "validateInput" src/components/UploadTextureModal.tsx` succeeds (Phase 29 parser reuse)
    - [ ] `grep -q "__driveTextureUpload" src/components/UploadTextureModal.tsx` AND `grep -q "import.meta.env.MODE === \"test\"" src/components/UploadTextureModal.tsx` succeed
    - [ ] No 12px arbitrary spacing: `! grep -qE "(p|m|gap)-\\[(12|3)px\\]|(p|m|gap)-3[^0-9]" src/components/UploadTextureModal.tsx` (the 4-file D-34 rule applies — use only xs/sm/lg/xl/2xl tokens)
    - [ ] `npx vitest run tests/uploadTextureModal.test.tsx` passes with >= 7 test cases green
    - [ ] Full suite: `npx vitest run` passes
  </acceptance_criteria>
  <done>
    UploadTextureModal is buildable and testable in isolation. Plan 02 consumes it for both create (`+ Upload` tile click) and edit (`⋮ → Edit` menu action) paths.
  </done>
</task>

</tasks>

<verification>
Phase-level gate:
1. `npx vitest run tests/processTextureFile.test.ts tests/uploadTextureModal.test.tsx` — both green
2. `npx vitest run` — full suite green (no regressions)
3. `grep -c "material-symbols-outlined" src/components/UploadTextureModal.tsx src/lib/processTextureFile.ts` returns 0 (D-33 policy)
4. All locked UI-SPEC copy strings grep-verifiable (see acceptance_criteria)
5. Test driver `window.__driveTextureUpload` registered only in test mode
</verification>

<success_criteria>
- processTextureFile pipeline handles MIME reject, downscale to 2048px, and SHA-256 with injectable seam for jsdom tests
- UploadTextureModal renders both create and edit modes per UI-SPEC §1
- All locked copywriting strings (UPLOAD TEXTURE / EDIT TEXTURE / Upload Texture / Save Changes / Discard / Uploading… / Saving Changes… / all errors) appear verbatim
- LIB-07 MIME whitelist + inline error copy verified by unit test
- LIB-07 2048px downscale verified by processTextureFile unit test
- Reduced-motion guard + lucide-react only + no 12px spacing — D-33/D-34/D-39 compliance
</success_criteria>

<output>
After completion, create `.planning/phases/34-user-uploaded-textures/34-01-upload-modal-SUMMARY.md` documenting:
- processTextureFile export surface + injectable-seam pattern (for future jsdom-hostile tests)
- UploadTextureModal prop shape `{ open, mode, existing?, onClose, onSaved? }`
- How Plan 02 is expected to mount it (one instance per picker or hoisted to a common parent)
- `window.__driveTextureUpload` driver semantics (returns the saved id; bypasses React tree)
</output>
