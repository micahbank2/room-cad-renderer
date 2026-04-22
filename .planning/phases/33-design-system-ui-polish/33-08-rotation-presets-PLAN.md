---
phase: 33-design-system-ui-polish
plan: 08
type: execute
wave: 3
depends_on: [00, 01, 02, 03, 04]
files_modified:
  - src/components/PropertiesPanel.tsx
  - tests/phase33/rotationPresets.test.ts
autonomous: true
requirements:
  - "GH #87"
must_haves:
  truths:
    - "PropertiesPanel renders a chip row with 5 preset buttons (-90, -45, 0, +45, +90) to the right of the rotation numeric input"
    - "Clicking a preset chip sets rotation to that value and pushes exactly one undo entry"
    - "The chip matching the current rotation is highlighted with bg-accent/20 text-accent-light border-accent/30"
    - "Preset chips work for both products AND custom elements"
    - "D-20 single-undo invariant locked by a MANDATORY store-level behavior test (no `.todo` fallback permitted — checker warning 6 fix)"
  artifacts:
    - path: "src/components/PropertiesPanel.tsx"
      provides: "Rotation preset chip row in Rotation section"
      contains: "rotationPreset"
    - path: "tests/phase33/rotationPresets.test.ts"
      provides: "Single-undo invariant test using direct cadStore API (jsdom, no React/Fabric needed)"
      contains: "expect(after - before).toBe(1)"
  key_links:
    - from: "src/components/PropertiesPanel.tsx"
      to: "src/stores/cadStore.ts"
      via: "rotateProduct(id, angle) / updatePlacedCustomElement(id, { rotation })"
      pattern: "rotateProduct"
    - from: "tests/phase33/rotationPresets.test.ts"
      to: "useCADStore.getState().past.length"
      via: "direct store assertion"
      pattern: "past.length"
---

<objective>
Ship GH #87 — rotation preset chip row (-90, -45, 0, +45, +90) right of the existing numeric rotation input in PropertiesPanel. Works for products AND custom elements. Each click = single undo entry, locked by a MANDATORY store-level behavior test (checker warning 6 fix: no `.todo` fallback permitted).

Purpose: Faster than typing. Pascal-parity chip pattern.

Output: Chip row inside PropertiesPanel's Rotation section (Plan 02+04 `id="rotation"` section). Preset count: 5. No fine-tune (D-19). Test suite includes a pure jsdom store-level assertion that does NOT depend on App render or Fabric/R3F.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/33-design-system-ui-polish/33-UI-SPEC.md
@.planning/phases/33-design-system-ui-polish/33-CONTEXT.md
@src/components/PropertiesPanel.tsx
@src/stores/cadStore.ts

<interfaces>
Store actions (verified in research):
- `rotateProduct(id, angle)` at cadStore.ts:340 — history-pushing variant, use this per D-20
- `rotateProductNoHistory(id, angle)` at cadStore.ts:351 — do NOT use (would skip undo)
- For custom elements: `updatePlacedCustomElement(id, { rotation: angle })` (history-pushing)

Presets (D-19): -90, -45, 0, +45, +90

Active chip (D-22): chip.value matches current rotation within ~0.5 degree tolerance
  isActive = Math.abs(currentRotation - preset) < 0.5

Styling (UI-SPEC):
  Chip row container: flex items-center gap-1 (or gap-2 depending on density)
  Chip size: px-2 py-0.5 (8px/2px — canonical), rounded-sm, font-mono text-sm
  Active: bg-accent/20 text-accent-light border-accent/30 border
  Inactive: bg-obsidian-high text-text-dim border-outline-variant/20 border
  Hover inactive: bg-obsidian-highest

Label format: "-90°", "-45°", "0°", "+45°", "+90°" (sign prefix for non-zero)

Placement (D-22): to the RIGHT of the numeric rotation input. PropertiesPanel's Rotation section (id="rotation") already exists (Plan 02) and is wrapped in CollapsibleSection (Plan 04).

Entity type detection:
  Use existing PropertiesPanel pattern — it already branches on selected entity type.
  For product: call `rotateProduct(id, angle)`.
  For custom element: call `updatePlacedCustomElement(id, { rotation: angle })`.
  For wall: rotation preset chips NOT applicable — omit row for wall selections (D-21 says products + custom elements only).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add rotation preset chip row to PropertiesPanel Rotation section (products + custom elements)</name>
  <files>src/components/PropertiesPanel.tsx</files>
  <read_first>
    - src/components/PropertiesPanel.tsx (full — find the existing rotation numeric input sites for product + custom-element blocks)
    - src/stores/cadStore.ts:340-360 (rotateProduct signature)
    - src/stores/cadStore.ts:728-737 (placedCustomElements rotation update)
    - .planning/phases/33-design-system-ui-polish/33-UI-SPEC.md "Rotation Preset Chips"
    - .planning/phases/33-design-system-ui-polish/33-CONTEXT.md D-19/D-20/D-21/D-22
  </read_first>
  <action>
    Add an inline helper component + presets constant near the top of PropertiesPanel (or extract to a sibling file if preferred):

    ```typescript
    const ROTATION_PRESETS = [-90, -45, 0, 45, 90] as const;

    function RotationPresetChips({
      currentRotation,
      onSelect,
    }: {
      currentRotation: number;
      onSelect: (deg: number) => void;
    }) {
      return (
        <div className="flex items-center gap-1" data-rotation-presets>
          {ROTATION_PRESETS.map((preset) => {
            const isActive = Math.abs(currentRotation - preset) < 0.5;
            const label = preset === 0 ? "0\u00b0" : (preset > 0 ? `+${preset}\u00b0` : `${preset}\u00b0`);
            return (
              <button
                key={preset}
                type="button"
                onClick={() => onSelect(preset)}
                data-rotation-preset={preset}
                className={
                  "px-2 py-0.5 rounded-sm font-mono text-sm border transition-colors " +
                  (isActive
                    ? "bg-accent/20 text-accent-light border-accent/30"
                    : "bg-obsidian-high text-text-dim border-outline-variant/20 hover:bg-obsidian-highest")
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      );
    }
    ```

    Then in each PropertiesPanel entity block that has a rotation input:

    **Product block:**
    ```tsx
    <div className="flex items-center gap-2">
      {/* existing numeric rotation input */}
      <input ... />
      <RotationPresetChips
        currentRotation={product.rotation}
        onSelect={(deg) => useCADStore.getState().rotateProduct(product.id, deg)}
      />
    </div>
    ```

    **Custom element block:**
    ```tsx
    <RotationPresetChips
      currentRotation={ce.rotation}
      onSelect={(deg) => useCADStore.getState().updatePlacedCustomElement(ce.id, { rotation: deg })}
    />
    ```

    **Wall block:** Omit — walls don't have a rotation in the same sense.

    Test driver at bottom of file:
    ```typescript
    if (import.meta.env.MODE === "test") {
      (window as any).__driveRotationPreset = {
        click: (deg: number) => {
          const btn = document.querySelector(`[data-rotation-preset="${deg}"]`) as HTMLButtonElement | null;
          btn?.click();
        },
        getRotation: (id: string): number | null => {
          const state = (useCADStore.getState() as any);
          const room = state.rooms?.[state.activeRoomId];
          if (room?.placedProducts?.[id]) return room.placedProducts[id].rotation;
          if (room?.placedCustomElements?.[id]) return room.placedCustomElements[id].rotation;
          return null;
        },
        getHistoryLength: () => useCADStore.getState().past.length,
      };
    }
    ```

    Uses the EXISTING `rotateProduct` action (history-pushing) per D-20 — a single click = one past[] entry. Do NOT call `rotateProductNoHistory`.
  </action>
  <verify>
    <automated>grep -q "RotationPresetChips\|ROTATION_PRESETS\|data-rotation-preset" src/components/PropertiesPanel.tsx &amp;&amp; grep -q "rotateProduct" src/components/PropertiesPanel.tsx &amp;&amp; npm run build 2>&amp;1 | tail -3</automated>
  </verify>
  <acceptance_criteria>
    - `grep "RotationPresetChips\|data-rotation-preset" src/components/PropertiesPanel.tsx` matches
    - PropertiesPanel imports or defines the chip component
    - `grep "rotateProduct" src/components/PropertiesPanel.tsx` matches (at least one call site)
    - `grep "updatePlacedCustomElement" src/components/PropertiesPanel.tsx` matches (custom element wiring)
    - Test driver `__driveRotationPreset` exposed
    - `tests/phase33/rotationPresets.test.ts` file-level contracts GREEN
  </acceptance_criteria>
  <done>Preset chips wired for products + custom elements.</done>
</task>

<task type="auto">
  <name>Task 2: Finalize mandatory store-level single-undo test (NO `.todo` fallback — checker warning 6 fix)</name>
  <files>tests/phase33/rotationPresets.test.ts</files>
  <read_first>
    - tests/phase33/rotationPresets.test.ts (Plan 00 Wave 0 scaffold — already contains the store-level describe block with `expect(after - before).toBe(1)`)
    - src/stores/cadStore.ts:316-327 (placeProduct — for seeding)
    - src/stores/cadStore.ts:340-360 (rotateProduct + rotateProductNoHistory)
    - src/stores/cadStore.ts (confirm how to reset `past` / clean state between tests)
    - tests/setup.ts (check render helpers / test environment)
  </read_first>
  <action>
    The Plan 00 scaffold already includes the store-level describe block. Task 2 finalizes it with CONCRETE seed logic — NO `.todo` fallback is permitted (checker warning 6).

    **Required shape (must match this invariant):**
    ```typescript
    describe("Rotation preset — single-undo invariant (D-20)", () => {
      let productId: string;

      beforeEach(() => {
        // Seed: reset store (or create a known starting past.length) + one placed product
        const store = useCADStore.getState();
        // If cadStore exposes a reset action, call it. Otherwise, capture past.length baseline
        // and assert deltas (the test below does delta-based assertions anyway).
        productId = store.placeProduct("seed-product-id", { x: 0, y: 0 });
      });

      it("one rotateProduct call increments past.length by exactly 1", () => {
        const before = useCADStore.getState().past.length;
        useCADStore.getState().rotateProduct(productId, 45);
        const after = useCADStore.getState().past.length;
        expect(after - before).toBe(1);
      });

      it("rotateProductNoHistory does NOT increment past.length", () => {
        const before = useCADStore.getState().past.length;
        useCADStore.getState().rotateProductNoHistory(productId, 90);
        const after = useCADStore.getState().past.length;
        expect(after - before).toBe(0);
      });
    });
    ```

    **Key invariants (MUST be present — no `.todo`, no `skip`):**
    1. The test MUST use `expect(after - before).toBe(1)` — literal delta assertion
    2. The test MUST use `expect(after - before).toBe(0)` for the NoHistory counter-test
    3. Both assertions MUST execute (no `.todo`, no `.skip`, no conditional skip wrappers)
    4. The test MUST run in pure jsdom — no React render, no Fabric, no R3F required
    5. Seeding via direct `useCADStore.getState()` calls is sufficient

    If `placeProduct("seed-product-id", ...)` fails in jsdom because product library is empty, use an alternate seed strategy:
    - Option A: Directly mutate `useCADStore.setState((prev) => ({ ...prev, rooms: { ... } }))` to inject a minimal placedProduct record
    - Option B: Verify the test setup initializes at least one room; if not, call `addRoom("Test")` first
    - NEVER skip the behavior test. The assertion MUST run.

    Also keep the existing grep assertion from Plan 00:
    ```typescript
    it("PropertiesPanel uses rotateProduct (history-pushing), NOT rotateProductNoHistory, in the preset block", () => {
      const src = fs.readFileSync(path.resolve("src/components/PropertiesPanel.tsx"), "utf-8");
      const presetBlock = src.match(/RotationPresetChips[\s\S]{0,800}/);
      if (presetBlock) {
        expect(presetBlock[0]).toMatch(/rotateProduct\(/);
        expect(presetBlock[0]).not.toMatch(/rotateProductNoHistory/);
      } else {
        expect(src).toMatch(/rotateProduct\(/);
      }
    });
    ```
  </action>
  <verify>
    <automated>grep -q "expect(after - before).toBe(1)" tests/phase33/rotationPresets.test.ts &amp;&amp; grep -q "expect(after - before).toBe(0)" tests/phase33/rotationPresets.test.ts &amp;&amp; ! grep -qE "\.todo\(|\.skip\(" tests/phase33/rotationPresets.test.ts &amp;&amp; npm test -- --run tests/phase33/rotationPresets.test.ts 2>&amp;1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - `tests/phase33/rotationPresets.test.ts` contains `expect(after - before).toBe(1)` (literal string)
    - `tests/phase33/rotationPresets.test.ts` contains `expect(after - before).toBe(0)` for the NoHistory counter-test
    - `tests/phase33/rotationPresets.test.ts` does NOT contain `.todo(` or `.skip(` (grep returns zero matches)
    - `npm test -- --run tests/phase33/rotationPresets.test.ts` exits 0 (all assertions GREEN, including both delta assertions)
    - Test runs in pure jsdom without Fabric/R3F
  </acceptance_criteria>
  <done>Single-undo contract locked by REAL test — checker warning 6 resolved.</done>
</task>

</tasks>

<verification>
```bash
npm test -- --run tests/phase33/rotationPresets.test.ts
npm run build 2>&1 | tail -3

# Enforce checker warning 6: no .todo / .skip fallback
grep -qE "\.todo\(|\.skip\(" tests/phase33/rotationPresets.test.ts && echo "FAIL: .todo/.skip present" || echo "OK: no fallback"
```
</verification>

<success_criteria>
- [ ] Preset chips visible in PropertiesPanel rotation section for products + custom elements
- [ ] 5 presets: -90/-45/0/+45/+90
- [ ] Active chip highlighted when rotation matches
- [ ] Click = single undo entry
- [ ] `tests/phase33/rotationPresets.test.ts` contains `expect(after - before).toBe(1)` for rotateProduct
- [ ] `tests/phase33/rotationPresets.test.ts` contains `expect(after - before).toBe(0)` for rotateProductNoHistory
- [ ] `tests/phase33/rotationPresets.test.ts` contains NO `.todo` or `.skip` (grep returns zero)
- [ ] `tests/phase33/rotationPresets.test.ts` exits 0 on `npm test -- --run phase33/rotationPresets`
</success_criteria>

<output>
After completion, create `.planning/phases/33-design-system-ui-polish/33-08-SUMMARY.md` documenting:
- Preset chip component (inline or extracted)
- Store action wiring (product + custom element)
- Single-undo contract locked by mandatory store-level test (D-20)
- Confirmation: no `.todo` / `.skip` fallback in the test (checker warning 6 resolved)
- Closes #87
</output>
</output>
