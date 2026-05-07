# Phase 72 — Verification Report

**Phase:** 72-primitives-shelf  
**Verified:** 2026-05-07  
**Verdict:** gaps_found  
**Score:** 3/5 must-haves passing

---

## Must-Have Results

| # | Requirement | Status | Evidence |
|---|-------------|--------|---------|
| M1 | Button primitive with 6 variants × 6 sizes ships in src/components/ui/Button.tsx | PASS | File exists; cva matrix confirmed; 9/9 tests pass |
| M2 | PanelSection replaces CollapsibleSection; localStorage key preserved | PASS | PanelSection.tsx ships; key `ui:propertiesPanel:sections`; CollapsibleSection.tsx deleted |
| M3 | Remaining 7 primitives (Dialog, Tabs, SegmentedControl, Switch, Slider, Tooltip, Input, Popover) ship in barrel | PASS | All 10 components in src/components/ui/index.ts |
| M4 | At least one existing tab site migrated to Tabs primitive | FAIL | **Zero app components use Tabs primitive.** RoomTabs.tsx uses custom div/border-b pattern. Toolbar viewMode uses SegmentedControl (correct). |
| M5 | At least one existing dialog migrated to Dialog primitive | FAIL | **Zero app components use Dialog primitive.** AddRoomDialog, TemplatePickerDialog, HelpModal, DeleteTextureDialog all use manual overlay pattern (fixed inset-0 div + if(!open) return null). |

---

## Gap Detail

### Gap 1 — No tab sites migrated (M4)

**What's missing:** The Tabs primitive (`src/components/ui/Tabs.tsx`) ships and exports correctly, but no existing app component has been migrated to use it.

**Primary candidate:** `src/components/RoomTabs.tsx` — renders room tabs at the top of the canvas with inline-editable active tab. Uses custom div/border styling; compatible with Tabs API but has the InlineEditableText complexity on the active tab.

**Scope decision:** CategoryTabs consumers (SidebarProductPicker, MaterialsSection) are deferred to Phase 75 per CONTEXT.md D-45. Only RoomTabs is in scope for Phase 72 gap closure.

**Risk:** RoomTabs active tab is InlineEditableText — migrating to Tabs primitive requires either composing InlineEditableText inside TabsTrigger or keeping the active tab outside the Tabs component as a fallback.

---

### Gap 2 — No dialog sites migrated (M5)

**What's missing:** The Dialog primitive (`src/components/ui/Dialog.tsx`) ships and exports correctly, but no existing app dialog has been migrated.

**Candidates:**
- `src/components/AddRoomDialog.tsx` — simple controlled dialog with form input; good first migration target
- `src/components/TemplatePickerDialog.tsx` — more complex; has file upload, keyboard handler, Escape key
- `src/components/DeleteTextureDialog.tsx` — simple confirm dialog; ideal candidate
- `src/components/HelpModal.tsx` — larger modal; lower priority

**Scope:** Migrate AddRoomDialog + DeleteTextureDialog (simplest two). TemplatePickerDialog has file-upload complexity; HelpModal is large — both deferred to Phase 75.

---

## Carry-Overs (pre-existing, not Phase 72 regressions)

- `tests/SaveIndicator.test.tsx` — imports non-existent `@/components/SaveIndicator`; Phase 71 carry-over
- `tests/SidebarProductPicker.test.tsx` — 4 failing tests; pre-existing before Phase 72

---

## Gap Closure Plans Required

| Plan ID | Target | Scope |
|---------|--------|-------|
| 72-08 | Migrate RoomTabs to Tabs primitive | Wire RoomTabs.tsx to Tabs/TabsTrigger; preserve InlineEditableText on active tab |
| 72-09 | Migrate AddRoomDialog + DeleteTextureDialog to Dialog primitive | Replace manual overlay pattern with Radix Dialog; preserve controlled open prop API |
