---
phase: 33-design-system-ui-polish
plan: 05
type: execute
wave: 2
depends_on: [00, 01, 02, 03]
files_modified:
  - src/components/library/LibraryCard.tsx
  - src/components/library/CategoryTabs.tsx
  - src/components/library/index.ts
  - src/components/ProductLibrary.tsx
  - src/components/CustomElementsPanel.tsx
  - tests/phase33/phase33LibraryMigration.test.tsx
autonomous: true
requirements:
  - "GH #89"
must_haves:
  truths:
    - "LibraryCard primitive accepts thumbnail/label/selected/onClick/onRemove/variant props"
    - "LibraryCard renders with data-testid='library-card' on its root element for count-regression assertion"
    - "CategoryTabs primitive accepts tabs/activeId/onChange props"
    - "ProductLibrary renders via LibraryCard with same product count pre/post migration — enforced by count-regression test (checker blocker 2 fix)"
    - "CustomElementsPanel renders via LibraryCard with same count pre/post migration — enforced by count-regression test"
  artifacts:
    - path: "src/components/library/LibraryCard.tsx"
      provides: "Shared card primitive with data-testid='library-card'"
    - path: "src/components/library/CategoryTabs.tsx"
      provides: "Shared category tab primitive"
    - path: "src/components/library/index.ts"
      provides: "Barrel exports"
    - path: "src/components/ProductLibrary.tsx"
      provides: "Migrated to LibraryCard"
      contains: "LibraryCard"
    - path: "src/components/CustomElementsPanel.tsx"
      provides: "Migrated to LibraryCard"
      contains: "LibraryCard"
    - path: "tests/phase33/phase33LibraryMigration.test.tsx"
      provides: "Count-regression assertion: rendered LibraryCard count === filtered data count"
  key_links:
    - from: "src/components/ProductLibrary.tsx"
      to: "src/components/library/LibraryCard.tsx"
      via: "JSX import + render loop"
      pattern: "LibraryCard"
    - from: "src/components/CustomElementsPanel.tsx"
      to: "src/components/library/LibraryCard.tsx"
      via: "JSX import + render loop"
      pattern: "LibraryCard"
    - from: "tests/phase33/phase33LibraryMigration.test.tsx"
      to: "document.querySelectorAll('[data-testid=\"library-card\"]')"
      via: "render + count assertion"
      pattern: "library-card"
---

<objective>
Ship GH #89 — extract `<LibraryCard>` + `<CategoryTabs>` shared primitives to `src/components/library/`, then migrate ProductLibrary and CustomElementsPanel to consume them. Enforce a count-regression test (checker blocker 2 fix): rendered `LibraryCard` count MUST equal the filtered data count. WainscotLibrary / Paint/Material pickers / FramedArt migration deferred to follow-up PRs under #89 per D-31 (stop on shape mismatch).

Purpose: Stop library-card drift. The 5 library surfaces currently have different card layouts; extracting to a shared primitive prevents re-drift. The count-regression test prevents a silent regression where migration drops cards.

Scope decision (research open question #3 resolved): Extract BOTH `<LibraryCard>` AND `<CategoryTabs>` in this plan. ProductLibrary consumes both; CustomElementsPanel consumes LibraryCard only (plus CategoryTabs if it has category state).

Output: 2 primitives in `src/components/library/`, 2 migrated library surfaces, count-regression test GREEN.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/33-design-system-ui-polish/33-UI-SPEC.md
@.planning/phases/33-design-system-ui-polish/33-CONTEXT.md
@src/components/ProductLibrary.tsx
@src/components/CustomElementsPanel.tsx

<interfaces>
LibraryCard props (D-29):
  thumbnail?: string (image URL; undefined -> placeholder)
  label: string
  selected?: boolean
  onClick?: () => void
  onRemove?: () => void  (optional remove X on hover)
  variant?: "grid" | "list" (default grid)

**data-testid contract (checker blocker 2 fix):**
LibraryCard's root element MUST include `data-testid="library-card"`. This is the selector the count-regression test uses:
```ts
document.querySelectorAll('[data-testid="library-card"]').length === filteredProducts.length
```

Styling (UI-SPEC):
- Label: font-mono text-sm text-text-muted, 1-line truncate
- Default: bg-obsidian-low, ghost-border, rounded-md
- Hover: bg-obsidian-high
- Selected: border-accent/60 + bg-accent/10
- Remove button: lucide X 12px, text-text-ghost hover:text-error, top-right, opacity-0 group-hover:opacity-100
- Grid variant: aspect-square thumbnail top, label below
- List variant: 32x32 thumbnail left, label right

CategoryTabs props (D-30):
  tabs: { id: string; label: string; count?: number }[]
  activeId: string
  onChange: (id: string) => void

Styling: horizontal gap-4, border-b border-outline-variant/20. Active tab: border-b border-accent + text-text-primary + font-medium. Count badge in parentheses: "All (12)" text-text-ghost.

Anti-pattern (research): Keep LibraryCard shape-agnostic. No variant="product"/"wainscot" — per-library logic stays in the library component.

Deferred to follow-up PRs per D-31: WainscotLibrary, Paint/Material, FramedArt.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create library/ primitives (LibraryCard + CategoryTabs + index) with data-testid hook</name>
  <files>src/components/library/LibraryCard.tsx, src/components/library/CategoryTabs.tsx, src/components/library/index.ts</files>
  <read_first>
    - src/components/ProductLibrary.tsx (existing card visual pattern)
    - src/components/CustomElementsPanel.tsx (existing categories if any)
    - .planning/phases/33-design-system-ui-polish/33-UI-SPEC.md sections on LibraryCard + CategoryTabs
    - .planning/phases/33-design-system-ui-polish/33-CONTEXT.md D-28/D-29/D-30/D-32
    - tests/phase33/phase33LibraryMigration.test.tsx (Plan 00 Task 3 scaffold — confirm the data-testid selector it expects)
  </read_first>
  <action>
    Create 3 files:

    **src/components/library/LibraryCard.tsx** — export `LibraryCard` function component + `LibraryCardProps` interface.
    Use `import { X } from "lucide-react"` for the optional remove button.

    **CRITICAL — data-testid on root:**
    ```tsx
    return (
      <div data-testid="library-card" className={...} onClick={onClick}>
        {/* thumbnail + label + remove */}
      </div>
    );
    ```
    This `data-testid="library-card"` on the root MUST exist on every rendered card (both grid and list variants). The count-regression test selects by this attribute.

    Grid variant: `flex flex-col p-2 rounded-md ghost-border` base, thumbnail in `aspect-square rounded-sm bg-obsidian-high overflow-hidden`, label in `font-mono text-sm text-text-muted truncate`. Remove button absolute top-1 right-1 with `opacity-0 group-hover:opacity-100`.
    List variant: `flex items-center gap-2 p-2`, 8x8 (w-8 h-8) thumbnail, label right.
    Selected state: `border-accent/60 bg-accent/10` (replace default bg).
    Use Plan 01 canonical radii (`rounded-md`, `rounded-sm`) — no arbitrary values.

    **src/components/library/CategoryTabs.tsx** — export `CategoryTabs` function component + `CategoryTab` + `CategoryTabsProps` interfaces.
    Container: `flex items-end gap-4 border-b border-outline-variant/20`. Each tab button: `pb-1 font-mono text-sm`. Active tab extra classes: `text-text-primary font-medium border-b border-accent -mb-px`. Inactive: `text-text-dim hover:text-text-muted`. Count badge: `<span className="ml-1 text-text-ghost font-mono text-sm">({count})</span>`.

    **src/components/library/index.ts** — barrel exports both components and their prop types.

    ZERO arbitrary Tailwind values (uses p-2, gap-4, rounded-md, rounded-sm from Plan 01/03 canonical scale).
  </action>
  <verify>
    <automated>test -f src/components/library/LibraryCard.tsx &amp;&amp; test -f src/components/library/CategoryTabs.tsx &amp;&amp; test -f src/components/library/index.ts &amp;&amp; grep -q 'data-testid="library-card"' src/components/library/LibraryCard.tsx &amp;&amp; npm run build 2>&amp;1 | tail -3</automated>
  </verify>
  <acceptance_criteria>
    - All 3 files exist
    - LibraryCard.tsx contains `thumbnail`, `label`, `selected`, `onClick`, `onRemove`, `variant` as prop names
    - LibraryCard.tsx imports `X` from `lucide-react`
    - **LibraryCard.tsx root element has `data-testid="library-card"` attribute (required for count-regression test)**
    - CategoryTabs.tsx contains `tabs`, `activeId`, `onChange` as prop names
    - index.ts re-exports `LibraryCard` and `CategoryTabs`
    - `npm run build` succeeds
    - First 5 tests of `tests/phase33/libraryCard.test.ts` GREEN (including new data-testid assertion)
  </acceptance_criteria>
  <done>Primitives ready; no library consumers yet.</done>
</task>

<task type="auto">
  <name>Task 2: Migrate ProductLibrary to LibraryCard + CategoryTabs + finalize count-regression test</name>
  <files>src/components/ProductLibrary.tsx, tests/phase33/phase33LibraryMigration.test.tsx</files>
  <read_first>
    - src/components/ProductLibrary.tsx (full file — understand how products + filters are wired)
    - src/components/library/LibraryCard.tsx (Task 1 output)
    - src/components/library/CategoryTabs.tsx (Task 1 output)
    - src/types/product.ts (Product interface + PRODUCT_CATEGORIES)
    - tests/phase33/phase33LibraryMigration.test.tsx (Plan 00 scaffold — has ProductLibrary assertion skeleton)
    - src/App.tsx (check how productLibrary state is passed to ProductLibrary — may need to lift seed path)
  </read_first>
  <action>
    **Part A — Refactor ProductLibrary.tsx render:**

    1. Replace existing per-product card JSX with `<LibraryCard ... />` mapping over the filtered product list. Pass: `thumbnail={product.imageData || undefined}`, `label={product.name}`, `selected={selectedProductId === product.id}`, `onClick={() => handleSelectProduct(product.id)}`, `onRemove={canRemove ? () => handleRemoveProduct(product.id) : undefined}`, `variant="grid"`.

    2. Replace existing category filter with `<CategoryTabs tabs={tabList} activeId={activeCategory} onChange={setActiveCategory} />`. Build `tabList` as `[{ id: "all", label: "All", count: products.length }, ...PRODUCT_CATEGORIES.map(cat => ({ id: cat, label: cat, count: products.filter(p => p.category === cat).length }))]`.

    3. Preserve ALL state/callbacks — this is a pure render-layer refactor. Selection, filtering, place/remove actions unchanged.

    4. Handle thumbnail fallback: if `product.imageData` is empty string, pass `undefined`.

    DO NOT migrate WainscotLibrary / FramedArt / Paint picker — D-31 defers those.

    **Part B — Finalize count-regression test (checker blocker 2 fix):**

    Open `tests/phase33/phase33LibraryMigration.test.tsx` (Plan 00 scaffold). Fill in the ProductLibrary assertion block:

    ```tsx
    import { describe, it, expect, beforeEach } from "vitest";
    import { render, cleanup } from "@testing-library/react";
    import { ProductLibrary } from "@/components/ProductLibrary";

    describe("ProductLibrary migration — render count regression (GH #89 checker blocker 2)", () => {
      beforeEach(() => { cleanup(); });

      it("renders exactly one LibraryCard per filtered product (all categories)", () => {
        // Seed 5 known products — exact seed mechanism depends on ProductLibrary props contract.
        // Option A (prop-driven): render <ProductLibrary products={SEED_PRODUCTS} activeCategory="all" ... />
        // Option B (store-driven): useProductStore.setState({ products: SEED_PRODUCTS }), then render <ProductLibrary />
        const SEED_PRODUCTS = [
          { id: "p1", name: "Sofa A", category: "chairs", imageData: "" },
          { id: "p2", name: "Sofa B", category: "chairs", imageData: "" },
          { id: "p3", name: "Chair C", category: "chairs", imageData: "" },
          { id: "p4", name: "Table D", category: "tables", imageData: "" },
          { id: "p5", name: "Table E", category: "tables", imageData: "" },
        ];

        // Implementer must adapt this line to the actual ProductLibrary API signature:
        const { container } = render(
          <ProductLibrary
            productLibrary={SEED_PRODUCTS as any}
            // any other required props — fill in from actual component signature
          />
        );

        const cards = container.querySelectorAll('[data-testid="library-card"]');
        expect(cards.length).toBe(SEED_PRODUCTS.length);
      });

      it("renders exactly one LibraryCard per filtered product (category filter)", () => {
        // Similar seed, set activeCategory to "chairs", assert length === 3
        // (if ProductLibrary manages activeCategory internally, simulate tab click via fireEvent)
      });
    });
    ```

    **If ProductLibrary's API makes seeding impractical in unit-test shape:** fall back to a store-backed assertion that verifies the rendered-card count equals the store-filtered count WITHOUT requiring a manual seed:
    ```tsx
    const filteredLength = /* read from store selector */;
    expect(cards.length).toBe(filteredLength);
    ```
    The invariant must be: `cards rendered === data filtered`. Implementer chooses the most direct path.
  </action>
  <verify>
    <automated>grep -q "LibraryCard" src/components/ProductLibrary.tsx &amp;&amp; grep -q "CategoryTabs" src/components/ProductLibrary.tsx &amp;&amp; grep -q "library-card" tests/phase33/phase33LibraryMigration.test.tsx &amp;&amp; npm test -- --run tests/phase33/phase33LibraryMigration.test.tsx 2>&amp;1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - `grep "LibraryCard" src/components/ProductLibrary.tsx` matches
    - `grep "CategoryTabs" src/components/ProductLibrary.tsx` matches
    - `grep "import.*library" src/components/ProductLibrary.tsx` matches (import statement present)
    - `npm run build` succeeds (no TS errors)
    - `tests/phase33/libraryCard.test.ts` "ProductLibrary migrates" assertion GREEN
    - **`tests/phase33/phase33LibraryMigration.test.tsx` ProductLibrary count-regression test is GREEN: `document.querySelectorAll('[data-testid="library-card"]').length === SEED_PRODUCTS.length` (5) for "all" filter**
  </acceptance_criteria>
  <done>ProductLibrary renders via shared primitives; count regression assertion GREEN.</done>
</task>

<task type="auto">
  <name>Task 3: Migrate CustomElementsPanel to LibraryCard + finalize CustomElementsPanel count-regression test</name>
  <files>src/components/CustomElementsPanel.tsx, tests/phase33/phase33LibraryMigration.test.tsx</files>
  <read_first>
    - src/components/CustomElementsPanel.tsx (full file — ~172 lines per research)
    - src/components/library/LibraryCard.tsx (Task 1 output)
    - src/components/library/CategoryTabs.tsx (Task 1 output — use only if CustomElementsPanel has categories)
    - src/stores/cadStore.ts (grep for customElements state path — needed for test seeding)
  </read_first>
  <action>
    **Part A — Refactor CustomElementsPanel.tsx:**

    1. Replace existing element card JSX with `<LibraryCard />` mapping over custom elements. Pass thumbnail (if element has an image or color preview), label (element name), selected state, onClick (place/select handler), onRemove (delete handler if user-created).

    2. If CustomElementsPanel has a kind/category filter (wainscot/ceiling/etc.), wire it via `<CategoryTabs />` with `tabs=[{ id: "all", label: "All" }, ...]`.

    3. For elements without thumbnails (e.g., color-only custom elements), pass `thumbnail={undefined}` and let the primitive render the placeholder background.

    4. Preserve existing state + callbacks unchanged.

    **Part B — Extend count-regression test for CustomElementsPanel:**

    In `tests/phase33/phase33LibraryMigration.test.tsx`, extend the second describe block with a real assertion (previously `expect(true).toBe(true)` placeholder):

    ```tsx
    describe("CustomElementsPanel migration — render count regression", () => {
      beforeEach(() => {
        cleanup();
        // Seed customElements in cadStore (or whichever store holds them)
        useCADStore.setState((prev) => ({
          ...prev,
          customElements: {
            ce1: { id: "ce1", name: "Wainscot A", kind: "wainscot" },
            ce2: { id: "ce2", name: "Wainscot B", kind: "wainscot" },
            ce3: { id: "ce3", name: "Crown C", kind: "ceiling" },
          },
        }));
      });

      it("renders exactly one LibraryCard per custom element", () => {
        const { container } = render(<CustomElementsPanel />);
        const cards = container.querySelectorAll('[data-testid="library-card"]');
        expect(cards.length).toBe(3);
      });
    });
    ```

    Adapt `useCADStore.setState` call to the actual shape of the customElements slice — inspect cadStore before finalizing the seed.

    Regression invariant: same element count pre/post migration, enforced by the test.
  </action>
  <verify>
    <automated>grep -q "LibraryCard" src/components/CustomElementsPanel.tsx &amp;&amp; grep -q "CustomElementsPanel" tests/phase33/phase33LibraryMigration.test.tsx &amp;&amp; npm test -- --run tests/phase33/phase33LibraryMigration.test.tsx 2>&amp;1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - `grep "LibraryCard" src/components/CustomElementsPanel.tsx` matches
    - `grep "import.*library" src/components/CustomElementsPanel.tsx` matches
    - `npm run build` succeeds
    - If CustomElementsPanel had category state before, `grep "CategoryTabs" src/components/CustomElementsPanel.tsx` also matches
    - **`tests/phase33/phase33LibraryMigration.test.tsx` CustomElementsPanel count-regression test is GREEN: seeded 3 elements → 3 LibraryCards rendered, asserted by `querySelectorAll('[data-testid="library-card"]').length === 3`**
  </acceptance_criteria>
  <done>CustomElementsPanel migrated. Count regression locked by test. Wainscot + Paint + FramedArt deferred to follow-up PRs.</done>
</task>

</tasks>

<verification>
```bash
npm test -- --run tests/phase33/libraryCard.test.ts
npm test -- --run tests/phase33/phase33LibraryMigration.test.tsx   # count-regression blocker-fix test
npm run build 2>&1 | tail -3
```
</verification>

<success_criteria>
- [ ] 3 files in `src/components/library/`
- [ ] LibraryCard root has `data-testid="library-card"`
- [ ] ProductLibrary uses `<LibraryCard>` + `<CategoryTabs>`
- [ ] CustomElementsPanel uses `<LibraryCard>`
- [ ] `tests/phase33/libraryCard.test.ts` GREEN
- [ ] **`tests/phase33/phase33LibraryMigration.test.tsx` GREEN: both ProductLibrary and CustomElementsPanel count-regression assertions pass (rendered card count === seeded/filtered data count)**
- [ ] `npm run build` succeeds
</success_criteria>

<output>
After completion, create `.planning/phases/33-design-system-ui-polish/33-05-SUMMARY.md` documenting:
- Primitives created (2 + barrel)
- Libraries migrated (2 of 5)
- Count-regression test assertion shape (what was seeded, what was asserted)
- Libraries deferred to follow-up PRs (3 of 5)
- Closes #89 partially — follow-up PRs reference this same issue
</output>
</output>
