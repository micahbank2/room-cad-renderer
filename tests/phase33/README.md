# Phase 33 Test Contracts

Phase 33 Design System + UI Polish test contracts. Tests start RED; each Wave 1/2/3 plan turns them GREEN as it implements.

## Run

```bash
npm test -- --run phase33
```

Returns ~11 suites. All should be RED until implementation plans complete.

## Driver Contracts

All test drivers are gated by `import.meta.env.MODE === "test"` (Phase 31 convention) and exposed on `window.__drive*`.

| Driver | Signature | Implements In |
|--------|-----------|---------------|
| `__driveCollapsibleSection` | `{ toggle(id: string): void; getOpen(id: string): boolean; getPersisted(): Record<string, boolean> }` | Plan 04 (GH #84) |
| `__driveFloatingToolbar` | `{ isVisible(): boolean; getPosition(): { top: number; left: number } \| null; clickDuplicate(): void; clickDelete(): void }` | Plan 06 (GH #85) |
| `__driveRotationPreset` | `{ click(presetDeg: number): void; getRotation(id: string): number; getHistoryLength(): number }` | Plan 08 (GH #87) |
| `__driveInlineTitleEdit` | `{ type(v: string): void; commit(): void; cancel(): void; getDraft(): string; getCommitted(): string }` — mirrors `__driveLabelOverride` | Plan 09 (GH #88) |
| `__driveGestureChip` | `{ isVisible(): boolean; dismiss(): void; getMode(): "2d" \| "3d"; getPersistedDismissed(): boolean }` | Plan 07 (GH #86) |
| `__driveReducedMotion` | `{ setMatches(v: boolean): void; read(): boolean }` | Plan 03 (D-39) |

## Per-Plan Map

| Plan | Test File | Green Trigger |
|------|-----------|---------------|
| 01 (lucide+tokens) | `tokens.test.ts` | CSS tokens added to `src/index.css` |
| 02 (GH #83 typography) | `typography.test.ts` | Mixed-case section headers land |
| 03 (GH #90 spacing audit) | `spacingAudit.test.ts` | Arbitrary `p-[Npx]` removed from 4 target files |
| 03 (D-39 reduced motion) | `useReducedMotion.test.ts` | `src/hooks/useReducedMotion.ts` created |
| 04 (GH #84) | `collapsibleSections.test.ts` | `CollapsibleSection` component lands |
| 05 (GH #89) | `libraryCard.test.ts` + `phase33LibraryMigration.test.tsx` | `LibraryCard` + `CategoryTabs` land; ProductLibrary migrates |
| 06 (GH #85) | `floatingToolbar.test.ts` | `FloatingSelectionToolbar` + `isDragging` bridge land |
| 07 (GH #86) | `gestureChip.test.ts` | `GestureChip` component lands |
| 08 (GH #87) | `rotationPresets.test.ts` | Rotation preset chips in PropertiesPanel |
| 09 (GH #88) | `inlineTitleEdit.test.ts` | `InlineEditableText` + `draftName`/`renameRoomNoHistory` land |

## TDD Convention

Every test file in this directory follows the Phase 29/30/31 RED-stub pattern:

1. Test asserts the target behavior/artifact that the downstream plan will deliver.
2. Test is RED at Wave 0 commit (artifact does not exist yet).
3. Plan execution flips it to GREEN — no plan is "done" until its test is green.
4. Driver-backed tests use `window.__drive*` handles (gated by `import.meta.env.MODE === "test"`) rather than jsdom + fabric hit-tests.
