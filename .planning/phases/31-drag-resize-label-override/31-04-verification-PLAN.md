---
phase: 31-drag-resize-label-override
plan: 04
type: execute
wave: 3
depends_on: [31-03]
requirements: [EDIT-22, EDIT-23, EDIT-24, CUSTOM-06]
files_modified:
  - .planning/phases/31-drag-resize-label-override/31-VALIDATION.md
  - .planning/phases/31-drag-resize-label-override/31-HUMAN-UAT.md
  - CLAUDE.md
autonomous: false

must_haves:
  truths:
    - "Full vitest suite green (`npm test -- --run` exits 0) with no Phase 31 regressions"
    - "Every EDIT-22/23/24 + CUSTOM-06 success criterion has a passing test"
    - "31-VALIDATION.md is signed off: nyquist_compliant=true, wave_0_complete=true, approval=approved"
    - "CLAUDE.md documents widthFtOverride / depthFtOverride / labelOverride schema fields and the edge-resize + wall-endpoint smart-snap UX"
    - "31-HUMAN-UAT.md captures perceptual items (edge handle visuals, snap guide visibility during wall-endpoint drag, label live-preview latency, Ctrl+Z one-step restoration)"
    - "User has verified (or explicitly deferred) the 4 manual-only items from 31-VALIDATION.md §Manual-Only Verifications"
  artifacts:
    - path: ".planning/phases/31-drag-resize-label-override/31-VALIDATION.md"
      provides: "Sign-off frontmatter + per-task verification map populated"
      contains: "nyquist_compliant: true"
    - path: ".planning/phases/31-drag-resize-label-override/31-HUMAN-UAT.md"
      provides: "Manual verification checklist for Jessica/Micah — items auto-approved in yolo, otherwise awaiting user"
      contains: "# Phase 31 — Human UAT"
    - path: "CLAUDE.md"
      provides: "Documentation of Phase 31 schema additions + UX — widthFtOverride, depthFtOverride, labelOverride, edge handles, wall-endpoint smart-snap"
      contains: "widthFtOverride"
  key_links:
    - from: ".planning/phases/31-drag-resize-label-override/31-VALIDATION.md"
      to: "tests/phase31*.test.tsx + tests/resizeHandles.test.ts + tests/resolveEffectiveDims.test.ts + tests/wallEndpointSnap.test.ts + tests/updatePlacedCustomElement.test.ts"
      via: "Automated commands in per-task verification map"
      pattern: "npx vitest run"
---

<objective>
Final phase gate: run the full regression suite, populate 31-VALIDATION.md per-task verification map, flip `nyquist_compliant` + `wave_0_complete` to true, capture any perceptual items into 31-HUMAN-UAT.md, and update CLAUDE.md with Phase 31 schema + UX documentation.

Purpose: Lock in Phase 31 completion with a signed validation artifact and user-facing docs. Mirror the Phase 30 Plan 04 gate shape exactly.
Output: Signed 31-VALIDATION.md; 31-HUMAN-UAT.md with manual items listed; CLAUDE.md Phase 31 section appended.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/31-drag-resize-label-override/31-CONTEXT.md
@.planning/phases/31-drag-resize-label-override/31-VALIDATION.md
@.planning/phases/31-drag-resize-label-override/31-01-SUMMARY.md
@.planning/phases/31-drag-resize-label-override/31-02-SUMMARY.md
@.planning/phases/31-drag-resize-label-override/31-03-SUMMARY.md
@.planning/phases/30-smart-snapping/30-HUMAN-UAT.md
@.planning/phases/30-smart-snapping/30-04-PLAN.md
@CLAUDE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Full regression + 31-VALIDATION.md sign-off</name>
  <files>.planning/phases/31-drag-resize-label-override/31-VALIDATION.md</files>
  <read_first>
    - .planning/phases/31-drag-resize-label-override/31-VALIDATION.md (current draft with Wave 0 checklist)
    - .planning/phases/30-smart-snapping/30-VALIDATION.md (signed example to mirror)
    - .planning/phases/31-drag-resize-label-override/31-01-SUMMARY.md (Wave 0 outcomes + it() counts)
    - .planning/phases/31-drag-resize-label-override/31-02-SUMMARY.md (Wave 1 red→green flips)
    - .planning/phases/31-drag-resize-label-override/31-03-SUMMARY.md (Wave 2 integration results)
  </read_first>
  <action>
    1. Run full suite:
       ```bash
       npm test -- --run 2>&1 | tee /tmp/p31-gate-full.log
       ```
       Capture the final "Tests  X passed | Y failed" line.

    2. Run tsc check:
       ```bash
       npx tsc --noEmit 2>&1 | tee /tmp/p31-gate-tsc.log
       ```
       Must exit clean (pre-existing baseUrl deprecation warnings from Phase 29 are acceptable — document if they appear).

    3. Fill in the Per-Task Verification Map table in 31-VALIDATION.md with rows matching the 8 test files and their plan+wave:

       | Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
       |---------|------|------|-------------|-----------|-------------------|-------------|--------|
       | 31-01.1 | 31-01 | 0 | EDIT-22 | unit | `npx vitest run tests/resizeHandles.test.ts` | yes | ✅ green |
       | 31-01.1 | 31-01 | 0 | EDIT-22 | unit | `npx vitest run tests/resolveEffectiveDims.test.ts` | yes | ✅ green |
       | 31-01.1 | 31-01 | 0 | EDIT-23 | unit | `npx vitest run tests/wallEndpointSnap.test.ts` | yes | ✅ green |
       | 31-01.1 | 31-01 | 0 | CUSTOM-06 | unit | `npx vitest run tests/updatePlacedCustomElement.test.ts` | yes | ✅ green |
       | 31-01.2 | 31-01 | 0 | EDIT-22 | integration | `npx vitest run tests/phase31Resize.test.tsx` | yes | ✅ green |
       | 31-01.2 | 31-01 | 0 | EDIT-23 | integration | `npx vitest run tests/phase31WallEndpoint.test.tsx` | yes | ✅ green |
       | 31-01.2 | 31-01 | 0 | EDIT-24 | integration | `npx vitest run tests/phase31Undo.test.tsx` | yes | ✅ green |
       | 31-01.2 | 31-01 | 0 | CUSTOM-06 | integration (RTL) | `npx vitest run tests/phase31LabelOverride.test.tsx` | yes | ✅ green |

    4. Update the checklist under ## Wave 0 Requirements — all boxes checked.

    5. Update the checklist under ## Validation Sign-Off:
       - [x] All tasks have <automated> verify or Wave 0 dependencies
       - [x] Sampling continuity: no 3 consecutive tasks without automated verify
       - [x] Wave 0 covers all MISSING references
       - [x] No watch-mode flags
       - [x] Feedback latency < 30s
       - [x] nyquist_compliant: true set in frontmatter

    6. Edit the frontmatter:
       ```yaml
       ---
       phase: 31
       slug: drag-resize-label-override
       status: approved
       nyquist_compliant: true
       wave_0_complete: true
       created: 2026-04-20
       signed_off: <today's date>
       ---
       ```

    7. Change the bottom of the file:
       ```
       **Approval:** approved — <today's date>
       ```

    8. Record the full-suite pass count in a new section at the bottom:
       ```markdown
       ## Full Suite Result

       ```
       npm test -- --run
       Tests  <N> passed | <M> failed (<total>)
       ```
       tsc --noEmit: clean (only pre-existing baseUrl deprecation, if any)
       ```

       If M > 0 (any failure), STOP — do not sign off. Report the failures and request guidance.
  </action>
  <verify>
    <automated>npm test -- --run 2>&1 | tee /tmp/p31-gate-final.log; grep -qE "^\s*Tests\s+[0-9]+\s+passed" /tmp/p31-gate-final.log && ! grep -qE "[0-9]+\s+failed\s*\(" /tmp/p31-gate-final.log</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "nyquist_compliant: true" .planning/phases/31-drag-resize-label-override/31-VALIDATION.md` succeeds
    - `grep -q "wave_0_complete: true" .planning/phases/31-drag-resize-label-override/31-VALIDATION.md` succeeds
    - `grep -q "status: approved" .planning/phases/31-drag-resize-label-override/31-VALIDATION.md` succeeds
    - `grep -c "✅ green" .planning/phases/31-drag-resize-label-override/31-VALIDATION.md` returns ≥8 (one per test file)
    - `grep -q "Approval:.*approved" .planning/phases/31-drag-resize-label-override/31-VALIDATION.md` succeeds
    - `npm test -- --run` exits ZERO
    - `npx tsc --noEmit` exits ZERO (or only pre-existing Phase 29 baseUrl warnings)
    - Full-suite pass count written into VALIDATION.md
  </acceptance_criteria>
  <done>Full suite green; 31-VALIDATION.md signed off with nyquist_compliant=true, wave_0_complete=true, status=approved. Every Phase 31 test file has a ✅ green row in the per-task verification map.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Human UAT gate — perceptual items</name>
  <files>.planning/phases/31-drag-resize-label-override/31-HUMAN-UAT.md</files>
  <what-built>
    - 4 edge-handle squares render at N/S/E/W midpoints on a selected product/custom-element (match corner style)
    - Dragging a corner handle scales uniformly (sizeScale); dragging an edge handle breaks aspect ratio on one axis
    - Grid-snap applies to edge drag (value rounds to uiStore.gridSnap, default 0.5ft)
    - Wall-endpoint drag shows accent-purple snap guides when near another wall's endpoint/midpoint
    - Shift-drag keeps the wall strictly ortho; Alt-drag has no snap guides but still grid-snaps
    - PropertiesPanel shows LABEL_OVERRIDE input for selected placed custom elements with uppercase catalog name as ghost text
    - Typing updates canvas label in real time (no visible lag)
    - Enter / blur commits (one undo entry); Escape reverts
    - Empty string reverts canvas label to uppercase catalog name
    - Ctrl+Z after a drag-resize restores pre-drag size in ONE step (not per-frame)
    - RESET_SIZE button appears when an override is set; clicking reverts to sizeScale uniform behavior
  </what-built>
  <how-to-verify>
    Run `npm run dev`, open the app at the dev URL.

    1. **Edge handles render correctly (EDIT-22 visual):**
       - Place a product from the library.
       - Click to select. Confirm 4 small squares at N/S/E/W midpoints + existing 4 corners. Styling matches corners.

    2. **Corner vs edge drag (EDIT-22 behavior):**
       - Drag a corner handle outward → product scales uniformly (aspect preserved).
       - Drag the EAST edge handle outward → product gets wider, depth unchanged.
       - Drag the NORTH edge handle outward → product gets deeper (y-axis), width unchanged.

    3. **Grid-snap on edge drag (EDIT-22 grid clause):**
       - With uiStore.gridSnap=0.5 (default), drag edge to ~6.3ft → value snaps to 6.0 or 6.5.

    4. **Wall-endpoint smart-snap (EDIT-23 + D-05):**
       - Draw 2 walls. Grab w1's end; drag near w2's endpoint. Accent-purple guide line appears at the snap. Releasing lands w1.end exactly on w2's endpoint.

    5. **Shift-orthogonal + smart-snap (D-06):**
       - With Shift held, drag w1's end at an angle near w2. Wall stays ortho (horizontal or vertical). Snap applies along the locked axis only.

    6. **Alt disables snap (D-07):**
       - Hold Alt while dragging. No guide lines. Grid-snap still applies.

    7. **Walls don't snap to products (D-05 negative):**
       - Place a product near where you'd drag a wall endpoint. Wall drag ignores the product — no snap to product bbox.

    8. **Custom element label override (CUSTOM-06):**
       - Add a custom element (e.g., name "FRIDGE"). Place it on the canvas. Select it.
       - PropertiesPanel shows LABEL_OVERRIDE input with "FRIDGE" as placeholder.
       - Type "big fridge" — 2D label updates per keystroke.
       - Press Enter — label commits, input loses focus. Ctrl+Z restores previous label in one step.
       - Select again, clear input with delete key, press Enter — label reverts to "FRIDGE".
       - Select again, type "test", press Escape — label goes back to "FRIDGE" or previous override. No history entry from the aborted edit.

    9. **Single-undo regression (EDIT-24):**
       - Resize product via corner drag. Ctrl+Z once → pre-drag size restored exactly.
       - Resize product via edge drag. Ctrl+Z once → pre-drag size restored exactly.
       - Drag wall endpoint (with or without snap). Ctrl+Z once → wall restored to pre-drag start/end.

    10. **RESET_SIZE affordance:**
        - After an edge drag creates an override, PropertiesPanel shows RESET_SIZE button.
        - Click RESET_SIZE. Product returns to uniform sizeScale behavior.

    For each item, either approve (type "approved") or report the issue. Issues → Phase 31 follow-up UAT file.
  </how-to-verify>
  <action>
    Create `.planning/phases/31-drag-resize-label-override/31-HUMAN-UAT.md` with the 10-item checklist from `how-to-verify` above. For each item:
    - Requirement ID
    - Description
    - Pass/fail checkbox
    - Space for comments / issues

    Initial status: items awaiting user verification.

    In yolo/auto mode: stamp each item "auto-approved per orchestrator auto-mode, deferred to HUMAN-UAT" and flag the top of the file clearly.

    In interactive mode: stop here and wait for user to run the app and confirm.
  </action>
  <resume-signal>Type "approved" when all 10 items pass; or describe any that failed (will be tracked as follow-up).</resume-signal>
  <acceptance_criteria>
    - File exists: `.planning/phases/31-drag-resize-label-override/31-HUMAN-UAT.md`
    - Contains 10 checklist items (Edge handles render, Corner vs edge drag, Grid-snap edge, Wall-endpoint smart-snap, Shift-orthogonal, Alt disables, Walls don't snap to products, Custom element label override, Single-undo regression, RESET_SIZE affordance)
    - Each item references its requirement (EDIT-22, EDIT-23, EDIT-24, CUSTOM-06)
    - User has either approved or documented issues (or auto-mode stamp in place)
  </acceptance_criteria>
  <done>Human UAT document exists; user has signed off (or auto-approved with deferral note).</done>
</task>

<task type="auto">
  <name>Task 3: Document Phase 31 in CLAUDE.md</name>
  <files>CLAUDE.md</files>
  <read_first>
    - CLAUDE.md FULL file (current state — note Phase 28 auto-save section, Phase 29 dimension editor, Phase 30 smart snapping coverage)
    - .planning/phases/31-drag-resize-label-override/31-CONTEXT.md §D-01 through §D-17
    - .planning/phases/31-drag-resize-label-override/31-03-SUMMARY.md (Wave 2 outcomes for accurate citations)
  </read_first>
  <action>
    Locate the appropriate section of CLAUDE.md. If there's a ## Remaining Work section with shipped items (like "Auto-save (shipped Phase 28, v1.6)"), append a new subsection for Phase 31:

    ```markdown
    ### Drag-to-Resize + Label Override (shipped Phase 31, v1.6):
    - **Per-axis product resize:** Edge handles (N/S/E/W) write `PlacedProduct.widthFtOverride` or `depthFtOverride` (new optional fields); corner handles continue to update `sizeScale` for uniform resize. Override fields also exist on `PlacedCustomElement`. Effective-dimension resolver: `resolveEffectiveDims(product, placed)` in `src/types/product.ts` — `override ?? (libraryDim × sizeScale)`. All consumers (3D mesh, 2D sync, snap scene, selectTool hit-test) migrated. Legacy `effectiveDimensions(product, scale)` preserved for placement-preview contexts that have no `PlacedProduct`.
    - **Wall-endpoint smart-snap:** Wall-endpoint drag in selectTool invokes `computeSnap()` with a restricted scene (`buildWallEndpointSnapScene` in `src/canvas/wallEndpointSnap.ts`) containing ONLY other-wall endpoints + midpoints — walls do NOT snap to product/custom-element bboxes (D-05). Shift constrains to ortho axis; Alt disables smart-snap and keeps grid-snap (matches Phase 30 convention). Accent-purple guide reuses Phase 30 `snapGuides.ts`.
    - **Single-undo hardening:** Drag-transaction pattern (pushHistory at drag start via empty `update*(id, {})` + `*NoHistory` mid-drag) extended to new `resizeProductAxis` / `resizeCustomElementAxis` pairs. `past.length` increments by exactly 1 per complete drag cycle. Preserves Phase 25 PERF-01 fast-path (`_dragActive` flag + `renderOnAddRemove: false`).
    - **Per-placement label override (custom elements):** `PlacedCustomElement.labelOverride?: string` (max 40 chars). Rendered in 2D via `(placed.labelOverride ?? catalog.name).toUpperCase()` at `src/canvas/fabricSync.ts` custom-element label site. PropertiesPanel input live-previews on keystroke (no debounce), commits on Enter/blur (one history entry), Escape rewinds live-preview. Empty string → reverts to catalog name. RESET_SIZE affordance next to overridden size fields clears `widthFtOverride`/`depthFtOverride` via new `clearProductOverrides` / `clearCustomElementOverrides` store actions.
    - **New store actions (cadStore):** `updatePlacedCustomElement` / `updatePlacedCustomElementNoHistory` (placement mutator — distinct from the catalog-mutating `updateCustomElement`, which is untouched), `resizeProductAxis` / `resizeProductAxisNoHistory`, `resizeCustomElementAxis` / `resizeCustomElementAxisNoHistory`, `clearProductOverrides`, `clearCustomElementOverrides`.
    - **Test drivers:** `window.__driveResize`, `window.__driveWallEndpoint`, `window.__driveLabelOverride`, `window.__getCustomElementLabel` (all gated by `import.meta.env.MODE === "test"`).
    ```

    Also update the `## Keyboard Shortcuts` section — the existing Alt/Option entry from Phase 30 already covers "Disable smart snap during drag/placement (grid snap still applies)". Verify the wording and extend only if it doesn't already mention wall-endpoint drag. If it says "drag/placement" generally, leave as-is. If it limits to product drag, widen to "product drag / wall-endpoint drag / placement".

    In the `## Remaining Work` section, cross out (`~~...~~`) or remove any items now closed by Phase 31. Specifically if CLAUDE.md mentions "per-axis product resize" or "wall endpoint smart-snap" as open, move them to the shipped subsection.

    Run `git diff CLAUDE.md` and sanity-check the diff is additive + minor edits only.
  </action>
  <verify>
    <automated>grep -q "widthFtOverride" CLAUDE.md && grep -q "labelOverride" CLAUDE.md && grep -q "Phase 31" CLAUDE.md && grep -q "wallEndpointSnap\|Wall-endpoint smart-snap" CLAUDE.md</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "Phase 31" CLAUDE.md` succeeds
    - `grep -q "widthFtOverride" CLAUDE.md` succeeds
    - `grep -q "depthFtOverride" CLAUDE.md` succeeds
    - `grep -q "labelOverride" CLAUDE.md` succeeds
    - `grep -q "resolveEffectiveDims" CLAUDE.md` succeeds
    - `grep -q "buildWallEndpointSnapScene\|Wall-endpoint smart-snap" CLAUDE.md` succeeds
    - `grep -q "updatePlacedCustomElement" CLAUDE.md` succeeds
    - `grep -q "clearProductOverrides\|clearCustomElementOverrides" CLAUDE.md` succeeds
    - `git diff --stat CLAUDE.md` shows additions only (no unrelated removals)
  </acceptance_criteria>
  <done>CLAUDE.md documents Phase 31 deliverables: schema additions, resolver pattern, wall-endpoint smart-snap, single-undo contract, label-override UX, new store action set, test drivers.</done>
</task>

</tasks>

<verification>
- `npm test -- --run` exits ZERO with zero failures
- `npx tsc --noEmit` clean
- `.planning/phases/31-drag-resize-label-override/31-VALIDATION.md` frontmatter: `nyquist_compliant: true`, `wave_0_complete: true`, `status: approved`
- `.planning/phases/31-drag-resize-label-override/31-HUMAN-UAT.md` exists with 10 items
- `CLAUDE.md` contains Phase 31 documentation with all new identifiers grep-able
- No code changes in this plan — only docs + VALIDATION artifacts
- Phase 31 closure ready for `/gsd:verify-work`
</verification>

<success_criteria>
- All 4 phase requirements (EDIT-22, EDIT-23, EDIT-24, CUSTOM-06) have automated passing tests AND manual verification or deferral
- VALIDATION.md signed off
- HUMAN-UAT.md captures perceptual items
- CLAUDE.md reflects the new schema fields, resolver function, wall-endpoint smart-snap behavior, single-undo contract, label-override UX
- Full regression green with no new failures
</success_criteria>

<output>
After completion, create `.planning/phases/31-drag-resize-label-override/31-04-SUMMARY.md` documenting:
- Final pass/fail counts from `npm test -- --run` (before + after)
- VALIDATION.md sign-off confirmation (nyquist_compliant: true, wave_0_complete: true, status: approved)
- HUMAN-UAT.md status (approved / auto-approved / issues logged)
- CLAUDE.md diff summary — new lines added, existing lines changed
- Phase 31 closure status — ready for `/gsd:verify-work`
</output>
