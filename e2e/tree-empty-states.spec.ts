import { test, expect } from "@playwright/test";

test.describe("Tree empty states (UI-SPEC § Empty States)", () => {
  test("blank room shows 3 empty-state strings verbatim", async ({ page }) => {
    await page.goto("/");
    // Seed blank room then expand; assert literal text.
    await expect(page.getByText("No walls yet")).toBeVisible();
    await expect(page.getByText("No products placed")).toBeVisible();
    await expect(page.getByText("No custom elements placed")).toBeVisible();
  });
});
