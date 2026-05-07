---
phase: 72
plan: 09
subsystem: ui-primitives
tags: [dialog, radix, migration, gap-closure]
dependency_graph:
  requires: [72-04]
  provides: [gap-M5-closed]
  affects: [AddRoomDialog, DeleteTextureDialog]
tech_stack:
  added: []
  patterns: [radix-dialog-primitive, onOpenChange-escape-handling]
key_files:
  created: []
  modified:
    - src/components/AddRoomDialog.tsx
    - src/components/DeleteTextureDialog.tsx
decisions:
  - Used Dialog open={open && !!texture} guard in DeleteTextureDialog to prevent rendering with null texture
  - Removed manual window keydown Escape listener from DeleteTextureDialog — Radix handles via onOpenChange
  - Kept input-level onKeyDown Escape handler in AddRoomDialog (input-level UX, not overlay-level)
metrics:
  duration: 8m
  completed: 2026-05-07
  tasks_completed: 2
  files_modified: 2
---

# Phase 72 Plan 09: Migrate AddRoomDialog + DeleteTextureDialog to Dialog Primitive Summary

Gap M5 closed — both dialogs migrated from manual fixed-overlay pattern to the Radix Dialog primitive with spring animation and native Escape handling.

## What Was Done

**Task 1: AddRoomDialog.tsx**
- Removed `if (!open) return null` guard
- Removed manual `fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm` overlay div
- Removed manual `bg-popover border border-border/60 p-6 w-[480px] font-sans` container div
- Wrapped in `<Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel(); }}>`
- Put content in `<DialogContent className="w-[480px] max-w-[480px]" data-testid="ADD_ROOM">`
- Moved `<h2>ADD ROOM</h2>` into `<DialogHeader><DialogTitle className="text-sm tracking-widest">`
- All form content preserved unchanged

**Task 2: DeleteTextureDialog.tsx**
- Removed `if (!open || !texture) return null` guard
- Removed manual `fixed inset-0 z-50` overlay structure (backdrop div + surface div)
- Removed manual `window.addEventListener("keydown", ...)` Escape handler — Radix now owns this
- Removed unused `useEffect` import
- Wrapped in `<Dialog open={open && !!texture} onOpenChange={(o) => { if (!o && !deleting) onClose(); }}>`
- Used `<DialogHeader><DialogTitle>` for the "DELETE TEXTURE" header
- Preserved all D-07 locked copy, button structure, and Loader2 spinner logic

## Deviations from Plan

None — plan executed exactly as written.

## Validation Results

- TypeScript: no Dialog/AddRoom/DeleteTexture errors
- `fixed inset-0` grep: PASS — manual overlays removed from both files
- `DialogContent` grep: confirmed present in both files

## Self-Check: PASSED

- `c129dbc` commit verified in git log
- Both source files exist and contain DialogContent
