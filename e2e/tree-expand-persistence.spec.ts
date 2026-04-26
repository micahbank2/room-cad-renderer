import { test, expect } from "@playwright/test";

test.describe("Tree expand persistence (D-03)", () => {
  test("reload preserves expanded state per room", async ({ page }) => {
    await page.goto("/");
    const roomId = await page.evaluate(() => Object.keys((window as any).__cadStore.getState().rooms)[0]);
    await page.evaluate((id) => (window as any).__driveTreeExpand(id), roomId);
    await page.reload();
    const persisted = await page.evaluate((id) => localStorage.getItem(`gsd:tree:room:${id}:expanded`), roomId);
    expect(persisted).toBeTruthy();
  });
});
