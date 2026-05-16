// Phase 92 Plan 01 — E2E for FeedbackDialog (FB-01 + FB-04 + FB-06).
//
// Happy path: open Help → click "Send feedback" → fill form → Submit →
// the app POSTs to the (mocked) GitHub Issues API and receives a 201 →
// dialog closes and the user sees the new issue URL via alert.
//
// chromium-dev only (mirrors theme-toggle.spec.ts precedent).

import { test, expect } from "@playwright/test";
import { setupPage } from "../playwright-helpers/setupPage";
import { seedRoom } from "../playwright-helpers/seedRoom";

test.describe("FeedbackDialog — Phase 92 (FB-01 + FB-04 + FB-06)", () => {
  test("FB-01+04+06 — Help → Send feedback → submit → dialog closes + URL surfaced", async ({
    page,
  }) => {
    await setupPage(page);
    await seedRoom(page);

    // Intercept GitHub Issues API — never let the test touch real network.
    await page.route("https://api.github.com/repos/**/issues", (route) =>
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          html_url:
            "https://github.com/micahbank2/room-cad-renderer/issues/999",
          number: 999,
        }),
      }),
    );

    // Capture the alert dialog so we can assert its message.
    const alertMessages: string[] = [];
    page.on("dialog", async (dialog) => {
      alertMessages.push(dialog.message());
      await dialog.accept();
    });

    // Open Help modal via the help button.
    await page.locator('[data-onboarding="help-button"]').click();

    // Send feedback button in HelpModal footer.
    const sendFeedbackButton = page.getByRole("button", {
      name: /send feedback/i,
    });
    await expect(sendFeedbackButton).toBeVisible();
    await sendFeedbackButton.click();

    // HelpModal closes, FeedbackDialog opens. Verify by the dialog Title.
    const titleInput = page.getByLabel(/title/i);
    await expect(titleInput).toBeVisible();
    const descInput = page.getByLabel(/description/i);
    await expect(descInput).toBeVisible();

    await titleInput.fill("E2E test");
    await descInput.fill("Auto-test");

    const submit = page.getByRole("button", { name: /send feedback/i });
    await submit.click();

    // Dialog should close within 2s.
    await expect(titleInput).toBeHidden({ timeout: 2000 });

    // Alert fallback should have fired with the GH issue URL.
    await expect.poll(() => alertMessages.length, { timeout: 2000 }).toBeGreaterThan(0);
    expect(alertMessages.join("\n")).toContain("/issues/999");
  });
});
